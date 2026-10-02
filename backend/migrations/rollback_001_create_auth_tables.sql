-- Rollback Migration: 001_create_auth_tables
-- Description: Remove authentication tables
-- IMPORTANT: This rollback does NOT touch existing tables (documents, document_chunks)

-- Drop triggers first
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS email_verification_tokens;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;
