# Token-Based Authentication Implementation

## Overview

A minimal, family-friendly token-based authentication system using:
- **Auth Service** (`auth/auth.js`): Validates hardcoded password, issues tokens
- **Token Store** (`shared/token-store.js`): In-memory token management
- **Middleware** (`play/server-utils/event-handlers.ts`): Validates tokens on protected routes

## Authentication Flow

```
1. Client POSTs password to /auth/login
2. Auth service validates password
3. Server returns token if valid
4. Client includes token in subsequent requests
5. Middleware validates token before allowing access
```

## Usage

### 1. Login (Get Token)

```bash
curl -X POST http://localhost:1313/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password": "family-password"}'
```

Response:
```json
{
  "token": "token_1705598400123_abc123def456"
}
```

### 2. Use Token in Protected Routes

Include token in one of these ways:

**Option A: Authorization header (recommended)**
```bash
curl http://localhost:1313/play \
  -H "Authorization: Bearer token_1705598400123_abc123def456"
```

**Option B: Custom header**
```bash
curl http://localhost:1313/play \
  -H "x-auth-token: token_1705598400123_abc123def456"
```

**Option C: Query parameter**
```bash
curl "http://localhost:1313/play?token=token_1705598400123_abc123def456"
```

### 3. WebSocket Connection

For WebSocket connections, include the token in the initial HTTP upgrade request headers:

```javascript
const ws = new WebSocket('ws://localhost:1313/play', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

Or via URL:
```javascript
const ws = new WebSocket('ws://localhost:1313/play?token=' + token);
```

### 4. Logout (Optional)

```bash
curl -X POST http://localhost:1313/auth/logout \
  -H "Content-Type: application/json" \
  -d '{"token": "token_1705598400123_abc123def456"}'
```

Response:
```json
{
  "success": true
}
```

## Configuration

### Change the Password

Edit `auth/auth.js`, line 24:

```javascript
const EXPECTED_PASSWORD = 'your-new-password';
```

**Future**: Move to environment variable:
```javascript
const EXPECTED_PASSWORD = process.env.AUTH_PASSWORD || 'family-password';
```

## Current Architecture

- **Token Generation**: Random string + timestamp
- **Storage**: In-memory Map (cleared on server restart)
- **Validation**: O(1) lookup by token
- **Activity Tracking**: Last activity timestamp per token

## Security Notes (Current State)

✅ Tokens are unique per session  
✅ Password is never exposed in responses  
✅ Tokens are mapped server-side (can't forge without access to token store)  

⚠️ **For Local/Family Use**: Current implementation is suitable  
⚠️ **For Production**: Would need:
- HTTPS (tokens in transit are plain text)
- Token expiry with refresh mechanism
- Cryptographically secure random generation
- Token signing/verification (JWT-like)
- Rate limiting on auth endpoint
- Persistent token storage

## Future Improvements

1. **Token Expiry**: Automatic invalidation after X minutes
2. **Persistent Storage**: Redis or database backup
3. **Cryptographic Signing**: Prevent tampering (JWT)
4. **Per-User Tokens**: Track which family member is logged in
5. **Rate Limiting**: Prevent brute force attacks
6. **Activity Logs**: Audit trail of who accessed what when
