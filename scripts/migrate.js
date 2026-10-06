const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres' });

async function migrate() {
  await pool.query('ALTER TABLE categories ALTER COLUMN user_id DROP NOT NULL');
  await pool.query('ALTER TABLE budgets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await pool.query('ALTER TABLE goals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  await pool.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_user_name ON categories(COALESCE(user_id, \'00000000-0000-0000-0000-000000000000\'::uuid), name)');
  
  const defaultCats = [
    ['Salary', 'income'],
    ['Investments', 'income'],
    ['Freelance & Side Hustles', 'income'],
    ['Food & Dining', 'expense'],
    ['Groceries', 'expense'],
    ['Transport & Fuel', 'expense'],
    ['Rent & Utilities', 'expense'],
    ['Shopping', 'expense'],
    ['Entertainment', 'expense'],
    ['Healthcare', 'expense']
  ];

  for (const [name, type] of defaultCats) {
    await pool.query(
      'INSERT INTO categories (name, type, user_id) VALUES ($1, $2, NULL) ON CONFLICT DO NOTHING',
      [name, type]
    );
  }

  const cats = await pool.query('SELECT id, name, type, user_id FROM categories');
  console.log('Categories count in PG:', cats.rows.length);
  await pool.end();
}

migrate().catch(console.error);
