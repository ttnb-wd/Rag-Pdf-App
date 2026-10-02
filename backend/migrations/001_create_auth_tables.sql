-- Migration: 001_create_auth_tables
-- Description: Create authentication tables for user management
-- Date: 2026-10-01
-- IMPORTANT: This migration preserves all existing tables (documents, document_chunks)

-- ============================================
-- Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name VARCHAR(255) NULL,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast email lookup during login
CREATE INDEX idx_users_email ON users(email);

-- Index for filtering verified users
CREATE INDEX idx_users_email_verified ON users(email_verified);

-- ============================================
-- Sessions Table
-- ============================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE NULL
);

-- Index for fast user session lookup
CREATE INDEX idx_sessions_user_id ON sessions(user_id);

-- Composite index for active session lookup (most common query)
CREATE INDEX idx_sessions_active ON sessions(id, expires_at, revoked_at) 
  WHERE revoked_at IS NULL;

-- Index for cleanup of expired sessions
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ============================================
-- Email Verification Tokens Table
-- ============================================
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast token lookup during verification
CREATE INDEX idx_email_verification_tokens_token_hash ON email_verification_tokens(token_hash);

-- Index for user's pending verifications
CREATE INDEX idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);

-- Index for cleanup of expired tokens
CREATE INDEX idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- Composite index for finding valid tokens
CREATE INDEX idx_email_verification_tokens_valid ON email_verification_tokens(token_hash, expires_at, consumed_at)
  WHERE consumed_at IS NULL;

-- ============================================
-- Password Reset Tokens Table
-- ============================================
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  consumed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for fast token lookup during reset
CREATE INDEX idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);

-- Index for user's pending resets
CREATE INDEX idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);

-- Index for cleanup of expired tokens
CREATE INDEX idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Composite index for finding valid tokens
CREATE INDEX idx_password_reset_tokens_valid ON password_reset_tokens(token_hash, expires_at, consumed_at)
  WHERE consumed_at IS NULL;

-- ============================================
-- Triggers for updated_at
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Comments for documentation
-- ============================================

COMMENT ON TABLE users IS 'User accounts with authentication credentials';
COMMENT ON COLUMN users.email IS 'Unique email address for login';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password (never store plaintext)';
COMMENT ON COLUMN users.email_verified IS 'Whether user has verified their email address';

COMMENT ON TABLE sessions IS 'Active user sessions for authentication';
COMMENT ON COLUMN sessions.expires_at IS 'When this session expires';
COMMENT ON COLUMN sessions.revoked_at IS 'When this session was manually revoked (logout)';

COMMENT ON TABLE email_verification_tokens IS 'Tokens for email verification flow';
COMMENT ON COLUMN email_verification_tokens.token_hash IS 'SHA-256 hash of verification token';
COMMENT ON COLUMN email_verification_tokens.consumed_at IS 'When this token was used';

COMMENT ON TABLE password_reset_tokens IS 'Tokens for password reset flow';
COMMENT ON COLUMN password_reset_tokens.token_hash IS 'SHA-256 hash of reset token';
COMMENT ON COLUMN password_reset_tokens.consumed_at IS 'When this token was used';
