# Multi-Server Authentication Architecture

## Overview

This document describes the new distributed authentication system designed for a multi-container architecture where separate services (app, play, collab) run in different Docker containers and need to securely validate authentication tokens issued by a central auth server.

## Problem Statement

The previous authentication system assumed a single host with shared in-memory token storage. This doesn't work in a containerized environment because:

- **Token Isolation**: Each container has its own isolated memory space
- **No Shared State**: The `/auth` container's token store is not accessible to `/app`, `/play`, or `/collab` containers
- **Scalability**: Cannot easily scale services horizontally
- **Token Propagation**: No mechanism for other services to validate tokens issued by the auth server

## Solution: OAuth-like Distributed Authentication

We implement a system inspired by OAuth 2.0 and similar patterns used in distributed systems:

```
┌──────────────────────────────────────────────────────────────┐
│                    Client Application                        │
│                  (Browser / Mobile App)                       │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       │ 1. Request token with password
                       ▼
┌──────────────────────────────────────────────────────────────┐
│              /auth Container (Auth Server)                   │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  POST /auth/login - Issues tokens                       │  │
│  │  POST /auth/validate - Validates tokens (for services)  │  │
│  │  POST /auth/logout - Revokes tokens                     │  │
│  │                                                          │  │
│  │  Central Token Store: Source of Truth                   │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
                       ▲
         ┌─────────────┼─────────────┬──────────────┐
         │             │             │              │
         │ 2. Validate │ 2. Validate │ 2. Validate  │
         │    tokens   │    tokens   │    tokens    │
         │ (with cache)│ (with cache)│ (with cache) │
         │             │             │              │
    ┌────┴─────┐  ┌────┴─────┐  ┌───┴──────┐  ┌────┴──────┐
    │   /app   │  │  /play   │  │ /collab  │  │  Other    │
    │Container │  │Container │  │Container │  │ Services  │
    │          │  │          │  │          │  │           │
    │AuthClient│  │AuthClient│  │AuthClient│  │AuthClient │
    │+ Cache   │  │+ Cache   │  │+ Cache   │  │+ Cache    │
    └──────────┘  └──────────┘  └──────────┘  └───────────┘

         ▲ 3. Client includes token in request
         │
         └─ All requests include: Authorization: Bearer <token>
```

## Architecture Components

### 1. Central Auth Server (`/auth`)

**Responsibilities:**
- Issue tokens after password authentication (`POST /auth/login`)
- Validate tokens for other services (`POST /auth/validate`)
- Revoke tokens on logout (`POST /auth/logout`)
- Maintain authoritative token store

**Key Endpoints:**

#### POST /auth/login
```json
Request:
{
  "password": "family-password"
}

Response (200):
{
  "token": "token_1234567890_abc123..."
}

Response (401):
{
  "error": "Invalid password"
}
```

#### POST /auth/validate
Called by resource servers to validate tokens. Used with local caching to avoid overwhelming the auth server.

```json
Request:
{
  "token": "token_1234567890_abc123..."
}

Response (200):
{
  "valid": true,
  "issuedAt": 1234567890000,
  "expiresAt": 1234567890000
}

Response (200 - Invalid):
{
  "valid": false,
  "error": "Token not found or expired"
}
```

#### POST /auth/logout
```json
Request:
{
  "token": "token_1234567890_abc123..."
}

Response (200):
{
  "success": true
}
```

### 2. Auth Client (`auth-client.ts`)

Runs in each service container and handles token validation with intelligent caching.

**Key Features:**

- **Remote Validation**: Queries auth server for token validity
- **Local Caching**: Caches validation results to avoid excessive network calls
- **Configurable TTL**: Cache entries expire after configured time (default: 5 minutes)
- **Graceful Degradation**: Falls back to stale cache if auth server is temporarily unavailable
- **Token Revocation**: Maintains a revocation list for immediately invalidated tokens
- **Timeout Handling**: Configurable request timeout to fail fast if auth server is slow

**Configuration:**
```typescript
const authClient = new AuthClient({
  authServerUrl: 'http://auth:6502',  // Docker service name or URL
  cacheTTL: 5 * 60 * 1000,            // 5 minutes
  validationTimeout: 5000             // 5 seconds
});
```

**Usage:**
```typescript
const isValid = await authClient.validateToken(token);
if (isValid) {
  // Allow request to proceed
}
```

### 3. Resource Servers (app, play, collab)

Each resource server uses the auth client to validate tokens.

**Initialization:**
```typescript
import AuthClient from '../shared/dist/auth-client.js';

const authClient = new AuthClient({
  authServerUrl: process.env.AUTH_SERVER_URL || 'http://auth:6502',
  cacheTTL: parseInt(process.env.AUTH_CACHE_TTL || '300000'),
});

initializeAuthClient({ 
  authServerUrl: authClient.authServerUrl 
});
```

**Middleware Integration:**
The existing authenticator middleware in `server-setup.ts` now:
1. Checks if auth client is initialized
2. Uses distributed validation if available
3. Falls back to local validation for backward compatibility

## Security Considerations

### 1. Token Format and Generation

**Current Implementation:**
```
token_<timestamp>_<random_string>
```

**Recommendations for Production:**
- Use cryptographically secure random token generation
- Consider JWT (JSON Web Tokens) with signatures
- Add token expiration and refresh token mechanism

**Upgrade Path:**
```typescript
// Current: Simple random token
"token_1704067200000_abc123xyz..."

// Recommended: JWT with claims
{
  "alg": "HS256",
  "typ": "JWT"
}
{
  "sub": "user",
  "iat": 1704067200,
  "exp": 1704070800,
  "aud": "all-services"
}
// Signature validates token authenticity
```

### 2. Communication Security

**Current Status (Development):**
- HTTP communication between containers
- No encryption (assuming private Docker network)

**Production Recommendations:**
- Use HTTPS/TLS for inter-service communication
- Implement service-to-service authentication (e.g., mTLS)
- Docker Swarm secrets or Kubernetes secrets for credentials
- Network policies to restrict service-to-service communication

**Implementation:**
```typescript
// For HTTPS between services
const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-service-id': 'app-service',  // Identify requesting service
    'x-request-id': generateRequestId(), // For audit trail
  },
  // In production, use HTTPS and verify certificates
  rejectUnauthorized: process.env.NODE_ENV === 'production',
};
```

### 3. Cache Security

**Token Validation Cache:**
- Cache stores only validation results (valid/invalid), not token content
- Cache TTL limits exposure window
- Revocation list ensures immediate invalidation of logged-out tokens
- Cache is in-memory, isolated per container

**Attack Scenarios Mitigated:**
- **Expired Token Reuse**: Cache expires after TTL, forcing re-validation
- **Revoked Token Reuse**: Explicit revocation list prevents use after logout
- **Stolen Token**: Token format prevents meaningless reuse; auth server can revoke
- **Auth Server Downtime**: Graceful degradation with stale cache (configurable)

### 4. Cross-Origin and Service-to-Service Validation

**Current Implementation:**
- Auth server has CORS headers allowing all origins (development)
- Services communicate via Docker network (private)

**Production Recommendations:**
```typescript
// Restrict CORS to known service origins
const allowedOrigins = [
  'https://app.example.com',
  'https://play.example.com',
  'https://collab.example.com'
];

if (allowedOrigins.includes(req.headers.origin)) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
}
```

### 5. Rate Limiting

**Current Implementation:**
- No rate limiting on auth endpoints

**Production Recommendations:**
```typescript
// Add rate limiting to prevent brute force and DDoS
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5 // 5 login attempts per IP
});

const validateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100 // 100 validation requests per IP per minute
});
```

## Caching Strategy

### Why Cache?

1. **Performance**: Reduces latency for token validation (local vs. network call)
2. **Reliability**: Reduces load on auth server
3. **Scalability**: Allows services to validate tokens independently
4. **Availability**: Graceful degradation if auth server is temporarily unavailable

### Cache Behavior

**Cache Hit (Token Valid in Cache):**
```
Client Request → Service → AuthClient checks cache → 
Cache hit (valid) → Allow request (no network call)
```
Latency: ~1ms

**Cache Miss (Token Not in Cache):**
```
Client Request → Service → AuthClient checks cache → 
Cache miss → Query Auth Server → Cache result → 
Allow/Deny request
```
Latency: ~50-200ms (depends on network and server)

**Cache Expiry:**
```
After 5 minutes (default TTL), cache entry is considered stale.
Next validation query will hit the auth server.
```

**Explicit Revocation:**
```
User logout: POST /auth/logout
Auth server invalidates token
Service calls authClient.revokeToken(token)
Token immediately invalid across service
```

### Cache Statistics

Monitor cache effectiveness:
```typescript
const stats = authClient.getCacheStats();
console.log(`Cache size: ${stats.cacheSize} entries`);
console.log(`Revoked tokens: ${stats.revokedCount}`);
```

## Data Flow Examples

### Example 1: Initial Login

```
1. Client: POST /auth/login { password: "family-password" }
   ↓
2. Auth Server: Validates password → Generates token → Stores in token store
   ↓
3. Response: { token: "token_1704067200000_xyz..." }
   ↓
4. Client: Stores token (localStorage/cookie)
```

### Example 2: Accessing Protected Resource

```
1. Client: GET /app/data 
   Headers: { Authorization: Bearer token_1704067200000_xyz... }
   ↓
2. /app Service receives request
   ↓
3. Authenticator middleware extracts token
   ↓
4. authClient.validateToken(token)
   - Check revocation list: Not revoked ✓
   - Check local cache:
     - First time: Cache miss
     - Query auth server: POST /auth/validate
     - Auth server: Token found in store → Returns { valid: true }
     - Cache result for 5 minutes
   ↓
5. If valid: Attach token to request, pass to next middleware
   ↓
6. Request handler executes: GET /app/data → Returns data
```

### Example 3: Token Validation with Cache Hit

```
1. Client: GET /app/user
   Headers: { Authorization: Bearer token_1704067200000_xyz... }
   ↓
2. /app Service receives request
   ↓
3. Authenticator middleware extracts token
   ↓
4. authClient.validateToken(token)
   - Check revocation list: Not revoked ✓
   - Check local cache: FOUND (cached < 5 minutes ago)
   - Return cached result: true
   (No network call to auth server!)
   ↓
5. Valid, allow request, return user data
```

### Example 4: Logout and Token Revocation

```
1. Client: POST /app/logout with token
   ↓
2. /app Service: authClient.revokeToken(token)
   - Add to revocation list
   - Remove from cache
   ↓
3. Auth Server: POST /auth/logout
   - Remove token from central store
   ↓
4. Client: Clears stored token
   ↓
5. Subsequent request with old token:
   - Check revocation list: REVOKED
   - Deny access
```

## Deployment and Configuration

### Environment Variables

```bash
# Auth Server
AUTH_SERVER_URL=http://auth:6502
AUTH_PASSWORD=family-password  # Move to secrets in production

# Resource Servers
AUTH_SERVER_URL=http://auth:6502
AUTH_CACHE_TTL=300000  # 5 minutes in milliseconds
AUTH_VALIDATION_TIMEOUT=5000  # 5 seconds
```

### Docker Compose Setup

```yaml
version: '3.8'

services:
  auth:
    build:
      context: .
      dockerfile: Dockerfile.auth
    ports:
      - "6502:6502"
    environment:
      - AUTH_PASSWORD=${AUTH_PASSWORD}

  app:
    build:
      context: .
      dockerfile: Dockerfile.app
    ports:
      - "3000:3000"
    environment:
      - AUTH_SERVER_URL=http://auth:6502
      - AUTH_CACHE_TTL=300000

  play:
    build:
      context: .
      dockerfile: Dockerfile.play
    ports:
      - "3001:3001"
    environment:
      - AUTH_SERVER_URL=http://auth:6502
      - AUTH_CACHE_TTL=300000

  collab:
    build:
      context: .
      dockerfile: Dockerfile.collab
    ports:
      - "3002:3002"
    environment:
      - AUTH_SERVER_URL=http://auth:6502
      - AUTH_CACHE_TTL=300000
```

## Migration Path

### Phase 1: Current State
- Old token-store.ts still works for backward compatibility
- Authenticator detects if auth client is initialized
- Falls back to local validation if not

### Phase 2: Gradual Rollout
1. Deploy auth server with `/auth/validate` endpoint
2. Optionally enable distributed auth in each service
3. Monitor cache hit rates and auth server load
4. Tune cache TTL based on observations

### Phase 3: Full Adoption
- All services use AuthClient
- Deprecate local token validation
- Implement token expiration and refresh mechanism

## Monitoring and Observability

### Key Metrics to Track

1. **Cache Hit Rate**
   ```typescript
   const totalRequests = successCount + cacheHitCount;
   const hitRate = cacheHitCount / totalRequests * 100;
   ```

2. **Auth Server Response Time**
   - Average response time for `/auth/validate`
   - Percentile latencies (p50, p95, p99)

3. **Token Validity**
   - Valid tokens accepted
   - Invalid tokens rejected
   - Revoked tokens properly blocked

4. **Cache Size**
   - Monitor in-memory cache growth
   - Alert if cache grows unexpectedly

### Logging

```typescript
// In auth-client.ts
console.log(`[AuthClient] Cache hit for token: ${token.substring(0, 20)}...`);
console.log(`[AuthClient] Cache miss, querying auth server...`);
console.error(`[AuthClient] Auth server unavailable, using stale cache`);
```

## Troubleshooting

### Issue: Tokens Valid on Auth Server but Invalid on Services

**Cause:** Auth server and service not communicating
**Solution:**
1. Check network connectivity: `docker network ls`
2. Verify auth server URL in service config
3. Test endpoint: `curl http://auth:6502/auth/health`

### Issue: High Latency on Token Validation

**Cause:** Auth server overloaded or network slow
**Solution:**
1. Increase cache TTL (if security acceptable)
2. Add more auth server replicas
3. Optimize auth server database queries
4. Use a CDN or caching layer

### Issue: Stale Cache Causing Invalid Tokens to Be Accepted

**Cause:** Token invalidated but cache not expired
**Solution:**
1. Reduce cache TTL on logout
2. Explicitly call `authClient.revokeToken()` on logout
3. Implement push-based invalidation instead of TTL
4. Monitor stale cache hit rate

## Future Enhancements

1. **JWT-based Tokens**
   - Self-contained tokens with cryptographic signatures
   - No need for auth server validation on every request
   - Stateless validation

2. **Token Refresh**
   - Short-lived access tokens (15 minutes)
   - Long-lived refresh tokens (7 days)
   - Refresh endpoint to get new access token

3. **Multi-user Support**
   - Currently password-based (single user)
   - Add username/userid claim to token
   - Per-user token management

4. **Audit Logging**
   - Log all token operations
   - Track token usage across services
   - Detect suspicious patterns

5. **Push-based Invalidation**
   - Websocket or event bus for token revocation
   - Immediate invalidation instead of waiting for TTL
   - Reduced latency on logout

## References

- OAuth 2.0: https://tools.ietf.org/html/rfc6749
- JWT: https://tools.ietf.org/html/rfc7519
- OWASP Token Security: https://owasp.org/www-community/attacks/Token_Attacks
- Docker Networking: https://docs.docker.com/network/
