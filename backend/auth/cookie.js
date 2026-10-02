/**
 * Cookie configuration for session management
 * Environment-aware configuration for development and production
 */

const COOKIE_NAME = 'session';

// 7 days in milliseconds (matches database session expiration)
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/**
 * Get cookie options based on environment
 * @returns {object} Cookie options for res.cookie()
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,           // Cannot be accessed via JavaScript
    secure: isProduction,     // HTTPS only in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
    path: '/',                // Available across entire domain
    maxAge: MAX_AGE,          // 7 days
  };
}

/**
 * Get cookie clear options (for logout)
 * Must match the same path and domain as the original cookie
 * @returns {object} Cookie options for res.clearCookie()
 */
export function getClearCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  };
}

/**
 * Extract session ID from request cookies
 * @param {Request} req - Express request object
 * @returns {string|null} Session ID or null if not found
 */
export function extractSessionFromCookie(req) {
  if (!req.cookies || !req.cookies[COOKIE_NAME]) {
    return null;
  }
  
  return req.cookies[COOKIE_NAME];
}

/**
 * Set session cookie on response
 * @param {Response} res - Express response object
 * @param {string} sessionId - Session ID to set
 */
export function setSessionCookie(res, sessionId) {
  res.cookie(COOKIE_NAME, sessionId, getCookieOptions());
}

/**
 * Clear session cookie on response
 * @param {Response} res - Express response object
 */
export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, getClearCookieOptions());
}

export { COOKIE_NAME };
