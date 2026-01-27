/**
 * Auth Client for distributed multi-server architecture
 * 
 * This module handles token validation against the central auth server
 * with local caching to minimize auth server traffic.
 * 
 * Architecture:
 * - Auth server (central source of truth) validates credentials and issues tokens
 * - Other services (app, play, collab) validate tokens via auth server
 * - Local cache stores validation results with configurable TTL
 * - Stale tokens are invalidated on cache miss or explicit revocation
 */

import http from 'http';

export interface TokenValidationResponse {
    valid: boolean;
    expiresAt?: number;
    issuedAt?: number;
    error?: string;
}

interface CachedToken {
    valid: boolean;
    expiresAt: number;
    validatedAt: number;
    cacheTTL: number;
}

/**
 * Configuration for auth client
 */
export interface AuthClientConfig {
    authServerUrl: string;        // e.g., 'http://auth:6502'
    cacheTTL?: number;            // Local cache TTL in milliseconds (default: 5 minutes)
    validationTimeout?: number;   // Request timeout in milliseconds (default: 5 seconds)
}

class AuthClient {
    private authServerUrl: string;
    private cacheTTL: number;
    private validationTimeout: number;
    private localCache: Map<string, CachedToken> = new Map();
    private revokedTokens: Set<string> = new Set();

    constructor(config: AuthClientConfig) {
        this.authServerUrl = config.authServerUrl.replace(/\/$/, ''); // Remove trailing slash
        this.cacheTTL = config.cacheTTL || 5 * 60 * 1000; // 5 minutes default
        this.validationTimeout = config.validationTimeout || 5000; // 5 seconds default
    }

    /**
     * Check if a token is cached and still valid
     */
    private isCachValid(cachedToken: CachedToken): boolean {
        const now = Date.now();
        return now < cachedToken.validatedAt + cachedToken.cacheTTL;
    }

    /**
     * Validate a token against the central auth server
     * Uses local cache to avoid excessive network calls
     */
    async validateToken(token: string): Promise<boolean> {
        // Check if token is explicitly revoked
        if (this.revokedTokens.has(token)) {
            return false;
        }

        // Check local cache
        const cached = this.localCache.get(token);
        if (cached && this.isCachValid(cached)) {
            console.log(`[AuthClient] Cache hit for token: ${token.substring(0, 20)}...`);
            return cached.valid;
        }

        // Cache miss or expired - validate against auth server
        console.log(`[AuthClient] Cache miss/expired for token: ${token.substring(0, 20)}... Validating against auth server`);
        try {
            const isValid = await this.queryAuthServer(token);
            
            // Cache the result
            this.localCache.set(token, {
                valid: isValid,
                expiresAt: Date.now() + this.cacheTTL,
                validatedAt: Date.now(),
                cacheTTL: this.cacheTTL,
            });

            return isValid;
        } catch (err) {
            console.error(`[AuthClient] Failed to validate token against auth server:`, err);
            
            // Fail-open: if auth server is down, check if we have cached data
            if (cached) {
                console.warn(`[AuthClient] Auth server unavailable, using stale cache for token: ${token.substring(0, 20)}...`);
                return cached.valid;
            }
            
            // Fail-closed: no cache available, deny access
            return false;
        }
    }

    /**
     * Query the central auth server to validate a token
     * @param token The token to validate
     * @returns true if token is valid, false otherwise
     */
    private queryAuthServer(token: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const url = new URL(`${this.authServerUrl}/auth/validate`);
            
            const requestBody = JSON.stringify({ token });
            
            const options = {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(requestBody),
                },
                timeout: this.validationTimeout,
            };

            const req = http.request(url, options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    try {
                        const response: TokenValidationResponse = JSON.parse(data);
                        resolve(response.valid === true);
                    } catch (err) {
                        console.error(`[AuthClient] Failed to parse auth server response:`, err);
                        reject(err);
                    }
                });
            });

            req.on('error', (err) => {
                console.error(`[AuthClient] Request error:`, err);
                reject(err);
            });

            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Auth server validation timeout'));
            });

            req.write(requestBody);
            req.end();
        });
    }

    /**
     * Manually revoke a token (call this when user logs out)
     * Removes from cache and marks as revoked
     */
    revokeToken(token: string): void {
        this.revokedTokens.add(token);
        this.localCache.delete(token);
        console.log(`[AuthClient] Token revoked: ${token.substring(0, 20)}...`);
    }

    /**
     * Clear local cache (useful for testing or cache invalidation)
     */
    clearCache(): void {
        this.localCache.clear();
        this.revokedTokens.clear();
    }

    /**
     * Get cache stats for monitoring
     */
    getCacheStats(): { cacheSize: number; revokedCount: number } {
        return {
            cacheSize: this.localCache.size,
            revokedCount: this.revokedTokens.size,
        };
    }
}

export default AuthClient;
