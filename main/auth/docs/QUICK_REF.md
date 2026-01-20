# Quick Reference Card

## Core Files

| File | Purpose | Size |
|------|---------|------|
| `shared/token-store.js` | Token generation & validation | 2.2 KB |
| `auth/auth.js` | Auth service endpoints | 4.6 KB |
| `play/server-utils/event-handlers.ts` | Updated middleware (import + authenticator) | Modified |
| `shared/client-auth.js` | Client-side auth helper | 3.7 KB |

## API Endpoints

### POST /auth/login
```bash
curl -X POST http://localhost:1313/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"family-password"}'
```
**Response:** `{"token":"token_..."}`

### POST /auth/logout
```bash
curl -X POST http://localhost:1313/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"token":"token_..."}'
```
**Response:** `{"success":true}`

### GET /auth/health
```bash
curl http://localhost:1313/auth/health
```
**Response:** `{"status":"ok","service":"auth"}`

## Using Tokens

### HTTP Request with Token
```bash
# Option 1: Authorization header (recommended)
curl http://localhost:1313/play \
  -H "Authorization: Bearer token_..."

# Option 2: Custom header
curl http://localhost:1313/play \
  -H "x-auth-token: token_..."

# Option 3: Query parameter
curl "http://localhost:1313/play?token=token_..."
```

### JavaScript Fetch
```javascript
const auth = new DiceGamesAuth('http://localhost:1313');
await auth.login('family-password');

// Option 1: Using helper
const response = await auth.authenticatedFetch('/play');

// Option 2: Manual headers
const token = auth.getToken();
fetch('/play', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### WebSocket Connection
```javascript
const auth = new DiceGamesAuth('http://localhost:1313');
await auth.login('family-password');

const ws = auth.createAuthenticatedWebSocket('ws://localhost:1313/play');
```

## Configuration

### Change Password
File: `auth/auth.js` line 26
```javascript
const EXPECTED_PASSWORD = 'your-new-password';
```

### Token Store Functions
```javascript
import { 
  createToken,           // Generate new token
  validateToken,         // Check if token exists
  updateTokenActivity,   // Update lastActivity timestamp
  revokeToken,          // Delete token
  getTokenInfo,         // Get token metadata
  getAllTokens,         // List all active tokens
  clearAllTokens        // Reset store (testing only)
} from '../shared/token-store.js';
```

## Middleware Integration

The `authenticator` middleware in `play/server-utils/event-handlers.ts`:

```typescript
const authenticator = (request, response, next) => {
  // Extract token from headers or query params
  const token = /* extract from request */;
  
  // Validate token
  if (!token || !validateToken(token)) {
    return next(new Error('Unauthorized: Invalid or missing token'));
  }
  
  // Update activity
  updateTokenActivity(token);
  
  // Continue to next middleware
  return next();
}
```

## Flow: Complete Example

```
1. Client login
   POST /auth/login {"password":"family-password"}
   Response: {"token":"token_xyz123..."}

2. Client stores token
   localStorage.setItem('token', 'token_xyz123...')

3. Client requests protected resource
   GET /play
   Header: Authorization: Bearer token_xyz123...

4. Server middleware validates
   - Extracts token from header
   - Checks if token exists in store
   - Updates lastActivity
   - Allows request to proceed

5. Client receives response
   Status 200 + page content
```

## Testing

### Run Test Script
```bash
chmod +x test-auth.sh
./test-auth.sh
```

### Manual Tests
```bash
# 1. Get token
TOKEN=$(curl -s -X POST http://localhost:1313/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"family-password"}' | jq -r '.token')

# 2. Use token
curl -H "Authorization: Bearer $TOKEN" http://localhost:1313/play

# 3. Revoke token
curl -X POST http://localhost:1313/auth/logout \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}"

# 4. Try with revoked token (should fail)
curl -H "Authorization: Bearer $TOKEN" http://localhost:1313/play
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Ensure `.js` extensions in ES module imports |
| CORS errors | nginx should proxy auth endpoint correctly |
| Token not validating | Check password matches `EXPECTED_PASSWORD` |
| "Unauthorized" on GET requests | Ensure token is included in Authorization header |

## Future Enhancements

- [ ] Add token expiry (TTL)
- [ ] Add rate limiting on login
- [ ] Use environment variables for password
- [ ] Add activity logging
- [ ] Persist tokens to database
- [ ] Add per-user session tracking
- [ ] Implement refresh tokens
- [ ] Add audit trail

## Files to Review

1. [AUTH.md](AUTH.md) - Full authentication documentation
2. [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Implementation details
3. [ARCHITECTURE.md](ARCHITECTURE.md) - Architecture diagrams and flows
4. `shared/token-store.js` - Token storage implementation
5. `auth/auth.js` - Auth service endpoints
6. `play/server-utils/event-handlers.ts` - Middleware integration
7. `shared/client-auth.js` - Client helper class
