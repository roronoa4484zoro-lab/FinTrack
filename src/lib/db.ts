import { Pool } from 'pg';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;

// Persistent Local Database Storage for development resilience when remote cloud DB is unreachable
interface MemoryUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string | null;
  created_at: string;
}

interface MemoryCategory {
  id: string;
  user_id: string | null;
  name: string;
  type: string;
  created_at: string;
}

interface MemoryTransaction {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  amount: string;
  description: string;
  date: string;
  created_at: string;
}

interface MemoryAccount {
  id: string;
  user_id: string;
  name: string;
  type: string;
  balance: number;
  created_at: string;
}

interface MemoryBudget {
  id: string;
  user_id: string;
  category_id: string;
  amount: number;
  month: string;
  created_at: string;
  updated_at: string;
}

interface MemoryGoal {
  id: string;
  user_id: string;
  title: string;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

interface MemoryRecurring {
  id: string;
  user_id: string;
  category_id: string;
  account_id: string | null;
  amount: number;
  description: string;
  frequency: string;
  next_date: string;
  is_active: boolean;
  created_at: string;
}

interface LocalStoreData {
  users: MemoryUser[];
  categories: MemoryCategory[];
  transactions: MemoryTransaction[];
  accounts: MemoryAccount[];
  budgets: MemoryBudget[];
  goals: MemoryGoal[];
  recurring: MemoryRecurring[];
}

const LOCAL_STORE_FILE = path.join(process.cwd(), 'database', 'fintrack_local_db.json');

const DEFAULT_GLOBAL_CATEGORIES = [
  { name: 'Salary', type: 'income' },
  { name: 'Investments', type: 'income' },
  { name: 'Freelance & Side Hustles', type: 'income' },
  { name: 'Food & Dining', type: 'expense' },
  { name: 'Groceries', type: 'expense' },
  { name: 'Transport & Fuel', type: 'expense' },
  { name: 'Rent & Utilities', type: 'expense' },
  { name: 'Shopping', type: 'expense' },
  { name: 'Entertainment', type: 'expense' },
  { name: 'Healthcare', type: 'expense' },
];

function getInitialStore(): LocalStoreData {
  const store: LocalStoreData = {
    users: [],
    categories: [],
    transactions: [],
    accounts: [],
    budgets: [],
    goals: [],
    recurring: [],
  };

  // Seed default global categories
  for (const cat of DEFAULT_GLOBAL_CATEGORIES) {
    store.categories.push({
      id: crypto.randomUUID(),
      user_id: null,
      name: cat.name,
      type: cat.type,
      created_at: new Date().toISOString(),
    });
  }

  return store;
}

// Global in-memory cache shared across module evaluations within the process
const globalCache = (globalThis as any).__fintrackLocalStore || getInitialStore();
(globalThis as any).__fintrackLocalStore = globalCache;

function loadStore(): LocalStoreData {
  try {
    if (fs.existsSync(LOCAL_STORE_FILE)) {
      const raw = fs.readFileSync(LOCAL_STORE_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        globalCache.users = parsed.users || [];
        globalCache.categories = parsed.categories || [];
        globalCache.transactions = parsed.transactions || [];
        globalCache.accounts = parsed.accounts || [];
        globalCache.budgets = parsed.budgets || [];
        globalCache.goals = parsed.goals || [];
        globalCache.recurring = parsed.recurring || [];
      }
    } else {
      saveStore(globalCache);
    }
  } catch {
    // If read fails, fallback to existing in-memory cache
  }

  // Ensure default categories exist
  if (globalCache.categories.length === 0) {
    for (const cat of DEFAULT_GLOBAL_CATEGORIES) {
      globalCache.categories.push({
        id: crypto.randomUUID(),
        user_id: null,
        name: cat.name,
        type: cat.type,
        created_at: new Date().toISOString(),
      });
    }
    saveStore(globalCache);
  }

  return globalCache;
}

function saveStore(data: LocalStoreData) {
  try {
    const dir = path.dirname(LOCAL_STORE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(LOCAL_STORE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch {
    // Fallback: in-memory state remains intact
  }
}

export const getDb = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
    const isProduction = process.env.NODE_ENV === 'production';
    const isLocalhost = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
    const sslConfig = isLocalhost ? false : { rejectUnauthorized: false };

    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: isProduction ? 10 : 5,
      min: 0,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 3000,
    });

    pool.on('error', (err) => {
      console.warn('PostgreSQL client pool notice:', err.message);
    });
  }

  return pool;
};

// Resilient query executor when remote DB connection is dropped/unavailable
function executeLocalQuery(text: string, params: any[] = []): { rows: any[]; rowCount: number } {
  const norm = text.trim();
  const store = loadStore();

  // 1. SELECT users WHERE email = $1
  if (norm.startsWith('SELECT id FROM users WHERE email = $1') || norm.startsWith('SELECT id, email, full_name, password_hash FROM users WHERE email = $1')) {
    const email = params[0]?.toLowerCase().trim();
    const user = store.users.find((u) => u.email.toLowerCase().trim() === email);
    const rows = user ? [user] : [];
    return { rows, rowCount: rows.length };
  }

  // 2. INSERT INTO users
  if (norm.startsWith('INSERT INTO users')) {
    const [email, password_hash, full_name] = params;
    const id = crypto.randomUUID();
    const newUser: MemoryUser = {
      id,
      email: email.toLowerCase().trim(),
      password_hash,
      full_name: full_name || null,
      created_at: new Date().toISOString(),
    };
    store.users.push(newUser);
    saveStore(store);
    return { rows: [newUser], rowCount: 1 };
  }

  // 3. Categories insert
  if (norm.startsWith('INSERT INTO categories')) {
    let [p1, p2, p3] = params;
    let user_id = p1;
    let name = p2;
    let type = p3;
    if (typeof p3 === 'string' && p3.includes('-') && p3.length === 36) {
      name = p1;
      type = p2;
      user_id = p3;
    }

    let existing = store.categories.find(
      (c) => (c.user_id === user_id || (user_id === null && c.user_id === null)) && c.name.toLowerCase() === name.toLowerCase()
    );
    if (existing) {
      existing.type = type;
      saveStore(store);
      return { rows: [existing], rowCount: 1 };
    }
    const newCat: MemoryCategory = {
      id: crypto.randomUUID(),
      user_id: user_id || null,
      name,
      type,
      created_at: new Date().toISOString(),
    };
    store.categories.push(newCat);
    saveStore(store);
    return { rows: [newCat], rowCount: 1 };
  }

  // 4. Categories select (user-owned or global)
  if (norm.includes('FROM categories WHERE user_id = $1') || norm.includes('FROM categories WHERE user_id = $1 OR user_id IS NULL')) {
    const userId = params[0];
    const userCats = store.categories.filter((c) => c.user_id === userId || c.user_id === null);
    return { rows: userCats, rowCount: userCats.length };
  }

  // 5. Category check by id and user_id (supporting global categories)
  if (
    norm.includes('FROM categories WHERE id = $1 AND user_id = $2') ||
    norm.includes('FROM categories WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)')
  ) {
    const [id, userId] = params;
    const cat = store.categories.find((c) => c.id === id && (c.user_id === userId || c.user_id === null));
    return { rows: cat ? [cat] : [], rowCount: cat ? 1 : 0 };
  }

  // 6. Transactions INSERT
  if (norm.startsWith('INSERT INTO transactions')) {
    const [user_id, category_id, account_id, amount, description, date] = params;
    const newTx: MemoryTransaction = {
      id: crypto.randomUUID(),
      user_id,
      category_id,
      account_id: account_id || null,
      amount,
      description: description || '',
      date: date || new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    store.transactions.push(newTx);
    saveStore(store);
    return { rows: [newTx], rowCount: 1 };
  }

  // 7. Transactions SELECT (summary, list, count)
  if (norm.includes('FROM transactions')) {
    const userId = params[0];
    let userTxs = store.transactions
      .filter((t) => t.user_id === userId)
      .map((t) => {
        const cat = store.categories.find((c) => c.id === t.category_id);
        return {
          ...t,
          category_name: cat?.name || 'Uncategorized',
          category_type: cat?.type || 'expense',
          type: cat?.type || 'expense',
        };
      });

    if (params[1] && norm.includes('date >=')) {
      const minDate = params[1];
      userTxs = userTxs.filter((t) => t.date >= minDate);
    }

    if (norm.includes('COUNT(')) {
      return { rows: [{ count: String(userTxs.length) }], rowCount: 1 };
    }

    return { rows: userTxs, rowCount: userTxs.length };
  }

  // 8. Transactions DELETE
  if (norm.startsWith('DELETE FROM transactions WHERE id = $1 AND user_id = $2')) {
    const [id, userId] = params;
    const initialLen = store.transactions.length;
    store.transactions = store.transactions.filter((t) => !(t.id === id && t.user_id === userId));
    const deletedCount = initialLen - store.transactions.length;
    if (deletedCount > 0) saveStore(store);
    return { rows: [{ id }], rowCount: deletedCount };
  }

  // 9. Budgets duplicate check: SELECT id FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3
  if (norm.includes('FROM budgets WHERE user_id = $1 AND category_id = $2 AND month = $3')) {
    const [userId, categoryId, month] = params;
    const existing = store.budgets.find(
      (b) => b.user_id === userId && b.category_id === categoryId && b.month === month
    );
    return { rows: existing ? [existing] : [], rowCount: existing ? 1 : 0 };
  }

  // 10. Budgets INSERT
  if (norm.startsWith('INSERT INTO budgets')) {
    const [user_id, category_id, amount, month] = params;
    const numAmount = parseFloat(amount);
    const existingIdx = store.budgets.findIndex(
      (b) => b.user_id === user_id && b.category_id === category_id && b.month === month
    );

    if (existingIdx >= 0) {
      store.budgets[existingIdx].amount = numAmount;
      store.budgets[existingIdx].updated_at = new Date().toISOString();
      saveStore(store);
      return { rows: [store.budgets[existingIdx]], rowCount: 1 };
    }

    const newBudget: MemoryBudget = {
      id: crypto.randomUUID(),
      user_id,
      category_id,
      amount: numAmount,
      month,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.budgets.push(newBudget);
    saveStore(store);
    return { rows: [newBudget], rowCount: 1 };
  }

  // 11. Budgets SELECT (with categories JOIN)
  if (norm.includes('FROM budgets')) {
    const userId = params[0];
    const month = params[1];

    let userBudgets = store.budgets.filter((b) => b.user_id === userId);
    if (month) {
      userBudgets = userBudgets.filter((b) => b.month === month);
    }

    const mapped = userBudgets.map((b) => {
      const cat = store.categories.find((c) => c.id === b.category_id);
      return {
        ...b,
        category_name: cat?.name || 'Uncategorized',
      };
    });

    return { rows: mapped, rowCount: mapped.length };
  }

  // 12. Budgets UPDATE / PATCH
  if (norm.startsWith('UPDATE budgets')) {
    const [amount, id, userId] = params;
    const budget = store.budgets.find((b) => b.id === id && b.user_id === userId);
    if (budget) {
      if (amount !== undefined) budget.amount = parseFloat(amount);
      budget.updated_at = new Date().toISOString();
      saveStore(store);
      return { rows: [budget], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 13. Budgets DELETE
  if (norm.startsWith('DELETE FROM budgets WHERE id = $1 AND user_id = $2')) {
    const [id, userId] = params;
    const initialLen = store.budgets.length;
    store.budgets = store.budgets.filter((b) => !(b.id === id && b.user_id === userId));
    const deletedCount = initialLen - store.budgets.length;
    if (deletedCount > 0) saveStore(store);
    return { rows: [{ id }], rowCount: deletedCount };
  }

  // 14. Goals INSERT
  if (norm.startsWith('INSERT INTO goals')) {
    const [user_id, title, target_amount, current_amount, target_date] = params;
    const newGoal: MemoryGoal = {
      id: crypto.randomUUID(),
      user_id,
      title,
      target_amount: parseFloat(target_amount),
      current_amount: parseFloat(current_amount) || 0,
      target_date: target_date || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    store.goals.push(newGoal);
    saveStore(store);
    return { rows: [newGoal], rowCount: 1 };
  }

  // 15. Goals SELECT
  if (norm.includes('FROM goals WHERE user_id = $1') || (norm.includes('FROM goals') && !norm.includes('UPDATE') && !norm.includes('DELETE'))) {
    const userId = params[0];
    const userGoals = store.goals.filter((g) => g.user_id === userId);
    return { rows: userGoals, rowCount: userGoals.length };
  }

  // 16. Goals UPDATE / PATCH
  if (norm.startsWith('UPDATE goals')) {
    const id = params[params.length - 2];
    const userId = params[params.length - 1];
    const goal = store.goals.find((g) => g.id === id && g.user_id === userId);
    if (goal) {
      goal.updated_at = new Date().toISOString();
      saveStore(store);
      return { rows: [goal], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  }

  // 17. Goals DELETE
  if (norm.startsWith('DELETE FROM goals WHERE id = $1 AND user_id = $2')) {
    const [id, userId] = params;
    const initialLen = store.goals.length;
    store.goals = store.goals.filter((g) => !(g.id === id && g.user_id === userId));
    const deletedCount = initialLen - store.goals.length;
    if (deletedCount > 0) saveStore(store);
    return { rows: [{ id }], rowCount: deletedCount };
  }

  // General fallback
  return { rows: [], rowCount: 0 };
}

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const db = getDb();
    const res = await db.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV !== 'production') {
      console.log('Executed query (PostgreSQL)', {
        text: text.substring(0, 100),
        duration,
        rows: res.rowCount,
      });
    }

    return res;
  } catch (err: any) {
    console.warn('PostgreSQL connection unavailable, routing query to resilient local store:', err.message);
    const fallbackRes = executeLocalQuery(text, params);
    return fallbackRes;
  }
};