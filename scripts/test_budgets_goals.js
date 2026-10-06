const { Pool } = require('pg');

async function runTests() {
  const baseUrl = 'http://localhost:3000';
  console.log('=== STARTING COMPLETE VERIFICATION SUITE ===');

  // Helper for requests
  async function api(path, opts = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return { status: res.status, ok: res.ok, headers: res.headers, data: json, text };
  }

  // 1. REGISTER USER A
  const emailA = `user_a_${Date.now()}@example.com`;
  console.log(`\n--- 1. Registering User A (${emailA}) ---`);
  const regA = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password: 'Password123!', full_name: 'User A' }),
  });
  console.log('Register User A Status:', regA.status);
  if (!regA.ok) throw new Error('Failed to register User A: ' + regA.text);
  const cookieA = regA.headers.get('set-cookie');
  console.log('User A Cookie acquired.');

  // 2. FETCH USER A CATEGORIES
  console.log('\n--- 2. Fetching User A Categories ---');
  const catResA = await api('/api/transactions/category', { headers: { cookie: cookieA } });
  console.log('Category GET Status:', catResA.status, 'Total categories:', catResA.data?.length);
  const categories = catResA.data || [];
  if (categories.length === 0) throw new Error('No categories returned for User A');

  // 3. TEST TRANSACTION CREATION FOR EVERY CATEGORY
  console.log('\n--- 3. Testing Transaction Creation Across All Available Categories ---');
  for (const cat of categories) {
    const txRes = await api('/api/transactions', {
      method: 'POST',
      headers: { cookie: cookieA },
      body: JSON.stringify({
        amount: '150.00',
        category_id: cat.id,
        type: cat.type,
        description: `Tx for ${cat.name}`,
        date: new Date().toISOString().slice(0, 10),
      }),
    });
    console.log(`Category: "${cat.name}" (${cat.type}) -> Status: ${txRes.status} (${txRes.ok ? 'SUCCESS' : 'FAILED'})`);
    if (!txRes.ok) {
      throw new Error(`Transaction creation failed for category "${cat.name}": ${txRes.text}`);
    }
  }

  // 4. TEST INVALID CATEGORY REJECTION
  console.log('\n--- 4. Testing Nonexistent Category Rejection ---');
  const fakeCatRes = await api('/api/transactions', {
    method: 'POST',
    headers: { cookie: cookieA },
    body: JSON.stringify({
      amount: '100.00',
      category_id: '00000000-0000-0000-0000-000000000000',
      type: 'expense',
      description: 'Invalid Cat Test',
      date: new Date().toISOString().slice(0, 10),
    }),
  });
  console.log('Nonexistent Category Status:', fakeCatRes.status, '(Expected 403/404)');
  if (fakeCatRes.status !== 403 && fakeCatRes.status !== 404) {
    throw new Error('Expected 403/404 for invalid category, got: ' + fakeCatRes.status);
  }

  // 5. REGISTER USER B & CROSS-USER IDOR TEST
  const emailB = `user_b_${Date.now()}@example.com`;
  console.log(`\n--- 5. Registering User B (${emailB}) for IDOR Checks ---`);
  const regB = await api('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: emailB, password: 'Password123!', full_name: 'User B' }),
  });
  const cookieB = regB.headers.get('set-cookie');

  // User B creates a private custom category
  console.log('User B creates private category...');
  const customCatRes = await api('/api/transactions/category', {
    method: 'POST',
    headers: { cookie: cookieB },
    body: JSON.stringify({ name: 'User B Private Vault', type: 'expense' }),
  });
  const userBCatId = customCatRes.data?.category?.id;
  console.log('User B Private Category ID:', userBCatId);

  // User A tries to create transaction with User B's category
  console.log('User A attempts to use User B private category...');
  const idorTx = await api('/api/transactions', {
    method: 'POST',
    headers: { cookie: cookieA },
    body: JSON.stringify({
      amount: '500.00',
      category_id: userBCatId,
      type: 'expense',
      description: 'IDOR attempt',
      date: new Date().toISOString().slice(0, 10),
    }),
  });
  console.log('User A using User B category Status:', idorTx.status, '(Expected 403 Forbidden)');
  if (idorTx.status !== 403) throw new Error('IDOR vulnerability: User A used User B category!');

  // 6. BUDGETS FULL LIFECYCLE & DUPLICATE PREVENTION
  console.log('\n--- 6. Budgets Lifecycle & Duplicate Prevention ---');
  const foodCat = categories.find((c) => c.name.toLowerCase().includes('food') || c.type === 'expense') || categories[0];
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Create Budget
  const createBudgetRes = await api('/api/budgets', {
    method: 'POST',
    headers: { cookie: cookieA },
    body: JSON.stringify({
      category_id: foodCat.id,
      amount: '5000',
      month: currentMonth,
    }),
  });
  console.log('Create Budget Status:', createBudgetRes.status, 'Message:', createBudgetRes.data?.message);
  if (createBudgetRes.status !== 201) throw new Error('Failed to create budget: ' + createBudgetRes.text);
  const budgetId = createBudgetRes.data?.budget?.id;

  // Duplicate Budget Creation Check
  console.log('Attempting duplicate budget creation for same category and month...');
  const dupBudgetRes = await api('/api/budgets', {
    method: 'POST',
    headers: { cookie: cookieA },
    body: JSON.stringify({
      category_id: foodCat.id,
      amount: '6000',
      month: currentMonth,
    }),
  });
  console.log('Duplicate Budget Status:', dupBudgetRes.status, '(Expected 409 Conflict)');
  if (dupBudgetRes.status !== 409) throw new Error('Expected 409 Conflict for duplicate budget, got: ' + dupBudgetRes.status);

  // List Budgets
  const listBudgetsRes = await api(`/api/budgets?month=${currentMonth}`, { headers: { cookie: cookieA } });
  console.log('List Budgets Status:', listBudgetsRes.status, 'Count:', listBudgetsRes.data?.budgets?.length);
  const budgetItem = listBudgetsRes.data?.budgets?.find((b) => b.id === budgetId);
  console.log('Budget Details:', budgetItem);
  if (!budgetItem || budgetItem.amount !== 5000) throw new Error('Budget not found or amount incorrect in GET /api/budgets');

  // Update Budget (5000 -> 7000)
  console.log('Updating Budget (5000 -> 7000)...');
  const updateBudgetRes = await api(`/api/budgets/${budgetId}`, {
    method: 'PATCH',
    headers: { cookie: cookieA },
    body: JSON.stringify({ amount: '7000' }),
  });
  console.log('Update Budget Status:', updateBudgetRes.status);
  if (updateBudgetRes.status !== 200) throw new Error('Failed to update budget: ' + updateBudgetRes.text);

  // Cross-user IDOR on Budget
  console.log('User B attempts to modify User A budget...');
  const idorBudgetRes = await api(`/api/budgets/${budgetId}`, {
    method: 'PATCH',
    headers: { cookie: cookieB },
    body: JSON.stringify({ amount: '9999' }),
  });
  console.log('User B patching User A budget Status:', idorBudgetRes.status, '(Expected 404/403)');
  if (idorBudgetRes.status !== 404 && idorBudgetRes.status !== 403) throw new Error('IDOR: User B modified User A budget!');

  // 7. SAVINGS GOALS FULL LIFECYCLE
  console.log('\n--- 7. Savings Goals Lifecycle ---');
  const createGoalRes = await api('/api/goals', {
    method: 'POST',
    headers: { cookie: cookieA },
    body: JSON.stringify({
      title: 'New Laptop',
      target_amount: '60000',
      current_amount: '10000',
      target_date: '2026-12-31',
    }),
  });
  console.log('Create Goal Status:', createGoalRes.status, 'Goal:', createGoalRes.data?.goal?.title);
  if (createGoalRes.status !== 201) throw new Error('Failed to create goal: ' + createGoalRes.text);
  const goalId = createGoalRes.data?.goal?.id;

  // List Goals
  const listGoalsRes = await api('/api/goals', { headers: { cookie: cookieA } });
  console.log('List Goals Status:', listGoalsRes.status, 'Count:', listGoalsRes.data?.length);
  const goalItem = listGoalsRes.data?.find((g) => g.id === goalId);
  console.log('Goal progress percentage:', goalItem?.progress_percentage + '%');
  if (!goalItem || goalItem.progress_percentage !== 17) {
    throw new Error('Goal progress percentage calculation incorrect (expected 17%)');
  }

  // Update Goal Progress (10000 -> 15000)
  console.log('Updating Goal progress (saved: 10000 -> 15000)...');
  const updateGoalRes = await api(`/api/goals/${goalId}`, {
    method: 'PATCH',
    headers: { cookie: cookieA },
    body: JSON.stringify({ current_amount: '15000' }),
  });
  console.log('Update Goal Status:', updateGoalRes.status);
  if (updateGoalRes.status !== 200) throw new Error('Failed to update goal: ' + updateGoalRes.text);

  const updatedGoalsList = await api('/api/goals', { headers: { cookie: cookieA } });
  const updatedGoal = updatedGoalsList.data?.find((g) => g.id === goalId);
  console.log('Updated Goal Progress:', updatedGoal?.progress_percentage + '%');
  if (updatedGoal?.progress_percentage !== 25) {
    throw new Error('Updated goal progress percentage incorrect (expected 25%)');
  }

  // Cross-user IDOR on Goal
  console.log('User B attempts to modify User A goal...');
  const idorGoalRes = await api(`/api/goals/${goalId}`, {
    method: 'PATCH',
    headers: { cookie: cookieB },
    body: JSON.stringify({ current_amount: '0' }),
  });
  console.log('User B patching User A goal Status:', idorGoalRes.status, '(Expected 404/403)');
  if (idorGoalRes.status !== 404 && idorGoalRes.status !== 403) throw new Error('IDOR: User B modified User A goal!');

  // 8. DIRECT POSTGRESQL VERIFICATION
  console.log('\n--- 8. Verifying Records Directly in PostgreSQL ---');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres' });
  const pgBudgets = await pool.query('SELECT id, amount, month FROM budgets WHERE id = $1', [budgetId]);
  const pgGoals = await pool.query('SELECT id, title, target_amount, current_amount FROM goals WHERE id = $1', [goalId]);
  console.log('PostgreSQL Budget row:', pgBudgets.rows[0]);
  console.log('PostgreSQL Goal row:', pgGoals.rows[0]);
  if (pgBudgets.rows.length === 0 || pgGoals.rows.length === 0) {
    throw new Error('Database persistence verification failed! Rows not found in PostgreSQL.');
  }

  // 9. CLEANUP DELETION TEST
  console.log('\n--- 9. Delete Endpoints Verification ---');
  const delBudgetRes = await api(`/api/budgets/${budgetId}`, { method: 'DELETE', headers: { cookie: cookieA } });
  console.log('Delete Budget Status:', delBudgetRes.status);
  if (delBudgetRes.status !== 200) throw new Error('Failed to delete budget');

  const delGoalRes = await api(`/api/goals/${goalId}`, { method: 'DELETE', headers: { cookie: cookieA } });
  console.log('Delete Goal Status:', delGoalRes.status);
  if (delGoalRes.status !== 200) throw new Error('Failed to delete goal');

  const postDeleteBudgets = await api(`/api/budgets?month=${currentMonth}`, { headers: { cookie: cookieA } });
  const postDeleteGoals = await api('/api/goals', { headers: { cookie: cookieA } });
  console.log('Budgets remaining for User A:', postDeleteBudgets.data?.budgets?.length);
  console.log('Goals remaining for User A:', postDeleteGoals.data?.length);

  await pool.end();
  console.log('\n=== ALL VERIFICATION TESTS PASSED FLAWLESSLY! ===');
}

runTests().catch((err) => {
  console.error('\nTEST SUITE FAILED:', err);
  process.exit(1);
});
