import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const { Client } = pg;

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

try {
  await client.connect();

  const result = await client.query(`
    SELECT
      current_database() AS database,
      current_user AS user,
      version() AS version;
  `);

  console.log('✅ PostgreSQL connected successfully!');
  console.log(result.rows[0]);

  await client.end();
} catch (error) {
  console.error('❌ PostgreSQL connection failed:');
  console.error(error.message);

  process.exit(1);
}