import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function cleanup() {
  try {
    const result = await pool.query(
      `DELETE FROM users 
       WHERE email LIKE '%test%' 
          OR email LIKE '%example.com'
       RETURNING email`
    );
    
    console.log(`Cleaned ${result.rows.length} test users:`);
    result.rows.forEach(row => console.log(`  - ${row.email}`));
    
    await pool.end();
  } catch (error) {
    console.error('Cleanup error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

cleanup();
