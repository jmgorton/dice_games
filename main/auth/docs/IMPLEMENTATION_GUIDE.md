# Implementation Guide: Enabling Distributed Authentication

This guide walks through how to enable the new distributed authentication system in each service.

## Step 1: Update Service Entry Point

For each service (app, play, collab), update the server startup code to initialize the auth client.

### Example: app/app.ts

```typescript
import AuthClient from '../shared/dist/auth-client.js';
import { initializeAuthClient } from '../shared/dist/server-setup.js';

// Initialize distributed auth client
const authServerUrl = process.env.AUTH_SERVER_URL || 'http://auth:6502';
const authCacheTTL = parseInt(process.env.AUTH_CACHE_TTL || '300000'); // 5 minutes

console.log(`[App] Initializing auth client with server: ${authServerUrl}`);
initializeAuthClient({
  authServerUrl: authServerUrl,
  cacheTTL: authCacheTTL
});

// Rest of server setup...
```

### Example: play/server.ts

```typescript
import AuthClient from '../shared/dist/auth-client.js';
import { initializeAuthClient } from '../shared/dist/server-setup.js';

const authServerUrl = process.env.AUTH_SERVER_URL || 'http://auth:6502';
const authCacheTTL = parseInt(process.env.AUTH_CACHE_TTL || '300000');

console.log(`[Play] Initializing auth client with server: ${authServerUrl}`);
initializeAuthClient({
  authServerUrl: authServerUrl,
  cacheTTL: authCacheTTL
});

// Rest of server setup...
```

### Example: collab/server.py (Python Service)

If using Python for collab, implement similar logic:

```python
import os
import httpx

class AuthClient:
    def __init__(self, auth_server_url: str, cache_ttl: int = 300000):
        self.auth_server_url = auth_server_url.rstrip('/')
        self.cache_ttl = cache_ttl
        self.cache = {}
        self.revoked_tokens = set()
    
    async def validate_token(self, token: str) -> bool:
        if token in self.revoked_tokens:
            return False
        
        if token in self.cache:
            if time.time() * 1000 < self.cache[token]['validated_at'] + self.cache_ttl:
                return self.cache[token]['valid']
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.auth_server_url}/auth/validate",
                    json={"token": token}
                )
                result = response.json()
                self.cache[token] = {
                    'valid': result.get('valid', False),
                    'validated_at': time.time() * 1000
                }
                return result.get('valid', False)
        except Exception as e:
            print(f"Auth validation error: {e}")
            return False

# Initialize in main app
auth_client = AuthClient(os.getenv('AUTH_SERVER_URL', 'http://auth:6502'))
```

## Step 2: Update Environment Variables

### docker-compose.yml

Add AUTH_SERVER_URL and AUTH_CACHE_TTL to each service:

```yaml
services:
  app:
    environment:
      - AUTH_SERVER_URL=http://auth:6502
      - AUTH_CACHE_TTL=300000  # 5 minutes
  
  play:
    environment:
      - AUTH_SERVER_URL=http://auth:6502
      - AUTH_CACHE_TTL=300000
  
  collab:
    environment:
      - AUTH_SERVER_URL=http://auth:6502
      - AUTH_CACHE_TTL=300000
```

### .env file (for local development)

```bash
AUTH_SERVER_URL=http://localhost:6502
AUTH_CACHE_TTL=300000
AUTH_VALIDATION_TIMEOUT=5000
```

## Step 3: Compilation and Deployment

### Build shared library

```bash
cd main/shared
npm run build
```

### Build each service

```bash
cd main/app
npm run build

cd main/play
npm run build
```

### Update Dockerfiles

Ensure each service Dockerfile runs the build and includes shared dependencies:

```dockerfile
# Dockerfile.app
FROM node:20

WORKDIR /app

# Copy shared library
COPY main/shared ./shared
RUN cd shared && npm install && npm run build

# Copy app
COPY main/app ./app
WORKDIR /app/app
RUN npm install && npm run build

CMD ["npm", "start"]
```

## Step 4: Testing the Setup

### Test 1: Verify Auth Server is Running

```bash
curl -s http://localhost:6502/auth/health | jq .
# Expected: { "status": "ok", "service": "auth" }
```

### Test 2: Test Login Flow

```bash
# Get token
curl -X POST http://localhost:6502/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"family-password"}' | jq .

# Should return: { "token": "token_..." }
```

### Test 3: Test Validation Endpoint

```bash
# Use token from previous test
TOKEN="token_1234567890_xyz..."

curl -X POST http://localhost:6502/auth/validate \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\"}" | jq .

# Should return: { "valid": true, "issuedAt": ..., "expiresAt": ... }
```

### Test 4: Test Service with Token

```bash
# Get token from auth server
TOKEN=$(curl -X POST http://localhost:6502/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"family-password"}' | jq -r '.token')

# Use token to access protected resource
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/protected-endpoint

# Should allow access with token, deny without
curl http://localhost:3000/protected-endpoint
# Should return: 401 Unauthorized
```

### Test 5: Monitor Cache Effectiveness

Look for logs showing cache hits:

```
[AuthClient] Cache hit for token: token_1704067200000_...
[AuthClient] Cache miss/expired for token: token_1704067200000_... Validating against auth server
```

## Step 6: Troubleshooting Checklist

- [ ] Auth server is running and healthy (`/auth/health`)
- [ ] Services can reach auth server (check network connectivity)
- [ ] Auth server URL is correctly set in environment variables
- [ ] Shared library is compiled and up to date
- [ ] `initializeAuthClient` is called before setting up middleware
- [ ] TypeScript compilation succeeds
- [ ] No import errors in service logs

## Step 7: Monitoring and Verification

### Check logs for successful initialization

```bash
# Watch app service logs
docker logs -f dice_games_app_1

# Should see:
# [App] Initializing auth client with server: http://auth:6502
# [Server] Auth client initialized with auth server: http://auth:6502
```

### Monitor cache performance

Track the following metrics:
- Number of cache hits vs. misses
- Cache size growth over time
- Auth server response times
- Token validation latency

### Load test the system

```bash
# Generate multiple concurrent requests with valid token
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/endpoint

# Monitor:
# - Cache hit rate (should be high for repeated token)
# - Auth server load (should be low due to caching)
# - Response times from service (should be fast)
```

## Rollback Plan

If issues arise, you can easily revert:

1. **Temporary Disable**: Comment out `initializeAuthClient()` call
   - Services fall back to local token validation
   - Auth server not queried, but only tokens created locally are valid

2. **Permanent Rollback**: Use old token-store directly
   - Update imports to use old token-store
   - Redeploy services

## Performance Expectations

With proper configuration:
- **Cache hit latency**: ~1-5ms (in-memory lookup)
- **Cache miss latency**: ~50-200ms (network + auth server processing)
- **Cache hit rate**: 80-95% (for typical usage patterns)
- **Auth server CPU**: Low (most validation done at services)

Adjusting cache TTL:
- **Shorter TTL (1-2 min)**: More secure, higher auth server load
- **Longer TTL (10-30 min)**: Better performance, longer revocation window
- **Default (5 min)**: Good balance for family app
