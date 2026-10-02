# Database Migrations

This directory contains SQL migration files for the RAG PAF Studio database.

## Available Migrations

### 001_create_auth_tables.sql
Creates the authentication schema including:
- `users` table for user accounts
- `sessions` table for active sessions
- `email_verification_tokens` table for email verification flow
- `password_reset_tokens` table for password reset flow
- Appropriate indexes for performance
- Foreign keys with CASCADE delete
- Updated_at trigger for users table

## Running Migrations

### Apply migration:
```bash
npm run migrate
```

### Rollback migration:
```bash
npm run migrate:rollback
```

### Check database schema:
```bash
npm run db:check
```

## Migration Safety

All migrations are designed to:
- Preserve existing tables (documents, document_chunks)
- Use transactions (automatic rollback on error)
- Include IF NOT EXISTS clauses where appropriate
- Maintain data integrity with proper constraints

## Schema Design

### Security Features
- Passwords stored as bcrypt hashes (never plaintext)
- Tokens stored as SHA-256 hashes (never raw tokens)
- Email uniqueness enforced at database level
- Foreign keys with CASCADE delete for cleanup

### Performance Optimizations
- Composite index on sessions for active session lookup
- Indexes on token_hash columns for fast verification
- Indexes on expires_at for efficient cleanup queries
- Index on users.email for login lookup

### Data Integrity
- Foreign keys ensure referential integrity
- NOT NULL constraints on critical fields
- Unique constraints on email and token hashes
- Automatic updated_at timestamp maintenance
