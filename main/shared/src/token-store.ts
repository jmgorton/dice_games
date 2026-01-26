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
 */
export function createToken(): string {
    const token = generateToken();
    tokenStore.set(token, {
        createdAt: new Date(),
        lastActivity: new Date(),
    });
    return token;
}

/**
 * Validate if a token exists and is active
 */
export function validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') {
        return false;
    }
    console.log(`Validating token: ${token}...`)
    console.log(`Valid options: ${getAllTokens()}`);
    return tokenStore.has(token);
}

/**
 * Update the last activity time for a token
 */
export function updateTokenActivity(token: string) {
    if (tokenStore.has(token)) {
        const session = tokenStore.get(token);
        session.lastActivity = new Date();
    }
}

/**
 * Revoke (delete) a token
 */
export function revokeToken(token: string): boolean {
    return tokenStore.delete(token);
}

/**
 * Get session info for a token (for debugging/monitoring)
 * @param {string} token - The token to query
 * @returns {object|null} Session metadata or null if not found
 */
export function getTokenInfo(token: string): object | null {
    return tokenStore.get(token) || null;
}

/**
 * Get all active tokens (for debugging/monitoring)
 * @returns {array} Array of token strings
 */
export function getAllTokens(): string[] {
    return Array.from(tokenStore.keys());
}

/**
 * Clear all tokens (for testing/reset)
 */
export function clearAllTokens() {
    tokenStore.clear();
}
