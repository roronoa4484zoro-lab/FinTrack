import { Pool } from 'pg';

// Singleton pattern to prevent connection exhaustion in serverless environments
let pool: Pool;

export const getDb = () => {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10, // Limit max connections per instance
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const res = await getDb().query(text, params);
  const duration = Date.now() - start;

  // Log query for debugging (disable in production)
  if (process.env.NODE_ENV !== 'production') {
    console.log('Executed query', { text, duration, rows: res.rowCount });
  }

  return res;
};
