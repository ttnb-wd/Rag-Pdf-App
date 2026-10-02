/**
 * Validate and normalize email address
 * @param {string} email - Email to validate
 * @returns {{valid: boolean, email: string|null, error: string|null}}
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, email: null, error: 'Email is required' };
  }
  
  // Trim and lowercase for consistent storage
  const normalized = email.trim().toLowerCase();
  
  if (normalized.length === 0) {
    return { valid: false, email: null, error: 'Email is required' };
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalized)) {
    return { valid: false, email: null, error: 'Invalid email format' };
  }
  
  // Check reasonable length
  if (normalized.length > 255) {
    return { valid: false, email: null, error: 'Email is too long' };
  }
  
  return { valid: true, email: normalized, error: null };
}

/**
 * Validate password requirements
 * @param {string} password - Password to validate
 * @returns {{valid: boolean, error: string|null}}
 */
export function validatePassword(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  
  // Minimum 8 characters (reasonable for production)
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  // Maximum length to prevent DoS via long bcrypt input
  if (password.length > 72) {
    return { valid: false, error: 'Password is too long (max 72 characters)' };
  }
  
  return { valid: true, error: null };
}

/**
 * Validate and normalize name
 * @param {string|null|undefined} name - Name to validate
 * @returns {{valid: boolean, name: string|null, error: string|null}}
 */
export function validateName(name) {
  // Name is optional
  if (!name) {
    return { valid: true, name: null, error: null };
  }
  
  if (typeof name !== 'string') {
    return { valid: false, name: null, error: 'Name must be a string' };
  }
  
  // Trim whitespace
  const normalized = name.trim();
  
  // Allow empty string as equivalent to null
  if (normalized.length === 0) {
    return { valid: true, name: null, error: null };
  }
  
  // Reasonable maximum length
  if (normalized.length > 255) {
    return { valid: false, name: null, error: 'Name is too long' };
  }
  
  return { valid: true, name: normalized, error: null };
}
