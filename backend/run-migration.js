import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function runMigration(migrationFile) {
  const client = await pool.connect();
  
  try {
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    console.log(`\n📦 Running migration: ${migrationFile}`);
    console.log('─'.repeat(60));
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Execute migration
    await client.query(sql);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('✅ Migration completed successfully\n');
    
    // Verify tables were created
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('📋 Current database tables:');
    tablesResult.rows.forEach(row => {
      console.log(`   • ${row.tablename}`);
    });
    
    console.log('\n🔍 Verifying new auth tables...');
    
    const authTables = ['users', 'sessions', 'email_verification_tokens', 'password_reset_tokens'];
    const existingTables = tablesResult.rows.map(r => r.tablename);
    
    authTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✓ ${table} exists`);
      } else {
        console.log(`   ✗ ${table} missing`);
      }
    });
    
    // Verify existing RAG tables are intact
    console.log('\n🔍 Verifying existing RAG tables...');
    const ragTables = ['documents', 'document_chunks'];
    
    ragTables.forEach(table => {
      if (existingTables.includes(table)) {
        console.log(`   ✓ ${table} intact`);
      } else {
        console.log(`   ✗ ${table} missing (CRITICAL!)`);
      }
    });
    
    // Get row counts
    console.log('\n📊 Table row counts:');
    for (const table of existingTables) {
      const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`   ${table}: ${countResult.rows[0].count} rows`);
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Get migration file from command line or use default
const migrationFile = process.argv[2] || '001_create_auth_tables.sql';

runMigration(migrationFile).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
