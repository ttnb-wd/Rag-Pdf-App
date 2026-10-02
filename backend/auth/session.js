import crypto from 'crypto';
import pg from 'pg';

const { Pool } = pg;

/**
 * Generate cryptographically secure session ID
 * Uses gen_random_uuid() from PostgreSQL for proper UUID generation
 * @param {Pool} pool - PostgreSQL connection pool
 * @returns {Promise<string>} - Secure random session ID (UUID)
 */
export async function generateSessionId(pool) {
  const result = await pool.query('SELECT gen_random_uuid() as id');
  return result.rows[0].id;
}

/**
 * Create a new session for a user
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {string} userId - User ID
 * @returns {Promise<{id: string, expiresAt: Date}>} - Session details
 */
export async function createSession(pool, userId) {
  const sessionId = await generateSessionId(pool);
  
  // Session expires in 7 days (reasonable default for web app)
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  
  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [sessionId, userId, expiresAt]
  );
  
  return {
    id: sessionId,
    expiresAt,
  };
}

/**
 * Validate a session and return the authenticated user
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {string} sessionId - Session ID to validate
 * @returns {Promise<{user: object|null, session: object|null}>}
 */
export async function validateSession(pool, sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return { user: null, session: null };
  }
  
  try {
    // Find session with user in one query
    const result = await pool.query(
      `SELECT 
         s.id as session_id,
         s.expires_at,
         s.revoked_at,
         u.id as user_id,
         u.email,
         u.name,
         u.email_verified
       FROM sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [sessionId]
    );
    
    if (result.rows.length === 0) {
      return { user: null, session: null };
    }
    
    const row = result.rows[0];
    
    // Check if session is revoked
    if (row.revoked_at !== null) {
      return { user: null, session: null };
    }
    
    // Check if session has expired
    const now = new Date();
    const expiresAt = new Date(row.expires_at);
    if (now > expiresAt) {
      return { user: null, session: null };
    }
    
    // Return safe user data (never include password_hash)
    const user = {
      id: row.user_id,
      email: row.email,
      name: row.name,
      emailVerified: row.email_verified,
    };
    
    const session = {
      id: row.session_id,
      expiresAt: row.expires_at,
    };
    
    return { user, session };
  } catch (error) {
    console.error('[Auth] Session validation error:', error.message);
    return { user: null, session: null };
  }
}

/**
 * Revoke a session (logout)
 * @param {Pool} pool - PostgreSQL connection pool
 * @param {string} sessionId - Session ID to revoke
 * @returns {Promise<boolean>} - True if session was revoked
 */
export async function revokeSession(pool, sessionId) {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }
  
  try {
    const result = await pool.query(
      `UPDATE sessions
       SET revoked_at = NOW()
       WHERE id = $1 AND revoked_at IS NULL
       RETURNING id`,
      [sessionId]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('[Auth] Session revocation error:', error.message);
    return false;
  }
}
