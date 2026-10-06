import { Pool } from 'pg';

let pool: Pool | null = null;

export const getDb = () => {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    const isProduction = process.env.NODE_ENV === 'production';

    // In Render or cloud providers, SSL is required unless local dev without SSL is configured
    const isLocalhost = connectionString?.includes('localhost') || connectionString?.includes('127.0.0.1');
    const sslConfig = isLocalhost ? false : { rejectUnauthorized: false };

    pool = new Pool({
      connectionString,
      ssl: sslConfig,
      max: isProduction ? 10 : 5,
      min: 0,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 10000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('PostgreSQL client pool idle error:', err.message);
    });
  }

  return pool;
};

export const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  const db = getDb();
  const res = await db.query(text, params);
  const duration = Date.now() - start;

  if (process.env.NODE_ENV !== 'production') {
    console.log('Executed query', {
      text: text.substring(0, 100),
      duration,
      rows: res.rowCount,
    });
  }

  return res;
};