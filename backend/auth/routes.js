import { hashPassword, verifyPassword } from './password.js';
import { validateEmail, validatePassword, validateName } from './validation.js';
import { createSession, validateSession, revokeSession } from './session.js';

/**
 * Setup authentication routes
 * @param {Express} app - Express application
 * @param {Pool} pool - PostgreSQL connection pool
 */
export function setupAuthRoutes(app, pool) {
  console.log('[Auth] Setting up authentication routes...');
  
  // ======================================================
  // POST /api/auth/signup
  // ======================================================
  app.post('/api/auth/signup', async (req, res) => {
    console.log('[Auth] Signup endpoint hit, body:', req.body);
    try {
      console.log('[Auth] Inside signup try block');
      const { email, password, name } = req.body;
      
      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        return res.status(400).json({
          success: false,
          error: emailValidation.error,
        });
      }
      
      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({
          success: false,
          error: passwordValidation.error,
        });
      }
      
      // Validate name (optional)
      const nameValidation = validateName(name);
      if (!nameValidation.valid) {
        return res.status(400).json({
          success: false,
          error: nameValidation.error,
        });
      }
      
      const normalizedEmail = emailValidation.email;
      const normalizedName = nameValidation.name;
      
      // Check if email already exists
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [normalizedEmail]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(409).json({
          success: false,
          error: 'An account with this email already exists',
        });
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);
      
      // Create user
      const userResult = await pool.query(
        `INSERT INTO users (email, password_hash, name, email_verified)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, name, email_verified, created_at`,
        [normalizedEmail, passwordHash, normalizedName, false]
      );
      
      const user = userResult.rows[0];
      
      // Create session for the new user
      const session = await createSession(pool, user.id);
      
      console.log('[Auth] New user signup:', normalizedEmail);
      
      // Return safe user data (never include password_hash)
      return res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.email_verified,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      });
      
    } catch (error) {
      console.error('[Auth] Signup error:', error.message);
      console.error('[Auth] Signup error stack:', error.stack);
      return res.status(500).json({
        success: false,
        error: 'An error occurred during signup',
      });
    }
  });
  
  // ======================================================
  // POST /api/auth/login
  // ======================================================
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Validate email
      const emailValidation = validateEmail(email);
      if (!emailValidation.valid) {
        // Use generic error to avoid revealing account existence
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }
      
      // Validate password format (but don't reveal what's wrong)
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }
      
      const normalizedEmail = emailValidation.email;
      
      // Find user by email
      const userResult = await pool.query(
        `SELECT id, email, password_hash, name, email_verified
         FROM users
         WHERE email = $1`,
        [normalizedEmail]
      );
      
      // User not found - use generic error
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }
      
      const user = userResult.rows[0];
      
      // Verify password using bcrypt secure comparison
      const isValidPassword = await verifyPassword(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
      }
      
      // Create session
      const session = await createSession(pool, user.id);
      
      console.log('[Auth] User login:', normalizedEmail);
      
      // Return safe user data (never include password_hash)
      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          emailVerified: user.email_verified,
        },
        session: {
          id: session.id,
          expiresAt: session.expiresAt,
        },
      });
      
    } catch (error) {
      console.error('[Auth] Login error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'An error occurred during login',
      });
    }
  });
  
  // ======================================================
  // POST /api/auth/logout
  // ======================================================
  app.post('/api/auth/logout', async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
      }
      
      // Revoke the session
      const revoked = await revokeSession(pool, sessionId);
      
      if (revoked) {
        console.log('[Auth] Session revoked');
      }
      
      // Return success even if session was already revoked (idempotent)
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
      
    } catch (error) {
      console.error('[Auth] Logout error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'An error occurred during logout',
      });
    }
  });
  
  // ======================================================
  // POST /api/auth/validate
  // ======================================================
  // Helper endpoint to validate a session (useful for frontend)
  app.post('/api/auth/validate', async (req, res) => {
    try {
      const { sessionId } = req.body;
      
      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'Session ID is required',
        });
      }
      
      const { user, session } = await validateSession(pool, sessionId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Invalid or expired session',
        });
      }
      
      return res.status(200).json({
        success: true,
        user,
        session,
      });
      
    } catch (error) {
      console.error('[Auth] Validation error:', error.message);
      return res.status(500).json({
        success: false,
        error: 'An error occurred during validation',
      });
    }
  });
}
