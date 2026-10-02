import bcrypt from 'bcryptjs';

// Production-appropriate bcrypt cost factor
// 12 rounds = ~250ms per hash (good balance of security and UX)
const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string');
  }
  
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash using bcrypt's secure comparison
 * @param {string} password - Plain text password
 * @param {string} hash - Bcrypt hash
 * @returns {Promise<boolean>} - True if password matches
 */
export async function verifyPassword(password, hash) {
  if (!password || typeof password !== 'string') {
    return false;
  }
  
  if (!hash || typeof hash !== 'string') {
    return false;
  }
  
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    // Log error but don't expose details
    console.error('[Auth] Password verification error:', error.message);
    return false;
  }
}
