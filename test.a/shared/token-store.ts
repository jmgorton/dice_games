/**
 * Simple in-memory token store for managing authentication tokens.
 * Tokens are mapped to session metadata (creation time, last activity).
 * 
 * This is a minimal implementation. Future improvements could include:
 * - Token expiry/TTL (with cleanup)
 * - Persistent storage
 * - Per-user token limits
 */

const tokenStore = new Map();

/**
 * Generate a random token
 * Uses Math.random() + timestamp for simplicity (not cryptographically secure for production)
 */
function generateToken() {
    return `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Create a new token and store it
 * @returns {string} The generated token
 */
export function createToken() {
    const token = generateToken();
    tokenStore.set(token, {
        createdAt: new Date(),
        lastActivity: new Date(),
    });
    return token;
}

/**
 * Validate if a token exists and is active
 * @param {string} token - The token to validate
 * @returns {boolean} True if token is valid
 */
export function validateToken(token: string) {
    if (!token || typeof token !== 'string') {
        return false;
    }
    return tokenStore.has(token);
}

/**
 * Update the last activity time for a token
 * @param {string} token - The token to update
 */
export function updateTokenActivity(token: string) {
    if (tokenStore.has(token)) {
        const session = tokenStore.get(token);
        session.lastActivity = new Date();
    }
}

/**
 * Revoke (delete) a token
 * @param {string} token - The token to revoke
 * @returns {boolean} True if token existed and was revoked
 */
export function revokeToken(token: string) {
    return tokenStore.delete(token);
}

/**
 * Get session info for a token (for debugging/monitoring)
 * @param {string} token - The token to query
 * @returns {object|null} Session metadata or null if not found
 */
export function getTokenInfo(token: string) {
    return tokenStore.get(token) || null;
}

/**
 * Get all active tokens (for debugging/monitoring)
 * @returns {array} Array of token strings
 */
export function getAllTokens() {
    return Array.from(tokenStore.keys());
}

/**
 * Clear all tokens (for testing/reset)
 */
export function clearAllTokens() {
    tokenStore.clear();
}
