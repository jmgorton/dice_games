/**
 * Simple auth helper for client-side JavaScript
 * Demonstrates how to login and use tokens in the dice_games project
 */

class DiceGamesAuth {
    authServerUrl: string = '';
    token: string | null;
    // constructor(authServerUrl = 'http://localhost:8080') {
    constructor(authServerUrl = 'http://localhost:1313') {
        this.authServerUrl = authServerUrl;
        this.token = localStorage.getItem('diceGamesAuthToken') || null;
    }

    /**
     * Login with password and store token
     */
    async login(password: string): Promise<string> {
        try {
            const response = await fetch(`${this.authServerUrl}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Login failed');
            }

            const data = await response.json();
            this.token = data.token;

            if (!this.token) {
                // const error = await response.json();
                throw new Error('Unable to fetch token.');
            }

            localStorage.setItem('diceGamesAuthToken', this.token);
            console.log('Login successful');
            return this.token;
        } catch (err) {
            console.error('Login error:', err);
            throw err;
        }
    }

    /**
     * Logout and revoke token
     */
    async logout(): Promise<boolean> {
        if (!this.token) return false;

        try {
            const response = await fetch(`${this.authServerUrl}/auth/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: this.token })
            });

            if (response.ok) {
                localStorage.removeItem('diceGamesAuthToken');
                this.token = null;
                console.log('Logout successful');
                return true;
            }
        } catch (err) {
            console.error('Logout error:', err);
        }
        return false;
    }

    /**
     * Get current token
     */
    getToken(): string | null {
        return this.token;
    }

    /**
     * Create headers with auth token
     * @returns {object} Headers object
     */
    getAuthHeaders(): object { // object? Headers? OutgoingHttpHeaders? 
        return {
            'Authorization': `Bearer ${this.token}`
        };
    }

    /**
     * Make authenticated fetch request
     */
    async authenticatedFetch(url: string, options = { headers: {} }): Promise<Response> {
        if (!this.token) {
            throw new Error('Not authenticated. Call login() first.');
        }

        // if (!('headers' in options)) {
        //     options = {
        //         ...options,
        //         headers: {}
        //     }
        // }

        return fetch(url, {
            ...options,
            headers: {
                ...options.headers,
                ...this.getAuthHeaders()
            }
        });
    }

    /**
     * Create WebSocket with auth token
     */
    createAuthenticatedWebSocket(wsUrl: string): WebSocket {
        if (!this.token) {
            throw new Error('Not authenticated. Call login() first.');
        }

        // If WebSocket doesn't support custom headers (browser limitation),
        // append token as query parameter instead
        const url = new URL(wsUrl);
        url.searchParams.set('token', this.token);
        
        const ws = new WebSocket(url.toString());
        return ws;
    }

    /**
     * Check if authenticated
     */
    isAuthenticated(): boolean {
        return !!this.token;
    }
}

// Export for use in HTML or other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DiceGamesAuth;
}
