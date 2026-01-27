# Visual Architecture Guide

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Client Application                              │
│                    (Web Browser / Mobile App)                           │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    ┌───────────┴──────────┐
                    │                      │
         ┌──────────▼────────┐  ┌──────────▼──────────┐
         │  1. Login Request │  │ 2. Authenticated    │
         │                   │  │    Requests         │
         └─────────┬─────────┘  └──────────┬──────────┘
                   │                       │
                   │ POST /auth/login      │ GET /app/data
                   │ {password}            │ Authorization: Bearer token_...
                   │                       │
                   ▼                       ▼
        ┌──────────────────────────────────────────────────────────┐
        │          /auth Container (Central Auth Server)           │
        │                                                            │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │  POST /auth/login                                │   │
        │  │  - Validate password                             │   │
        │  │  - Generate token_TIMESTAMP_RANDOM               │   │
        │  │  - Store in Central Token Store                  │   │
        │  │  - Return { token: "..." }                       │   │
        │  └──────────────────────────────────────────────────┘   │
        │                                                            │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │  POST /auth/validate ← Called by other services │   │
        │  │  - Check if token exists in store              │   │
        │  │  - Return { valid: true/false }                │   │
        │  │  - Used with service-side caching              │   │
        │  └──────────────────────────────────────────────────┘   │
        │                                                            │
        │  ┌──────────────────────────────────────────────────┐   │
        │  │  Central Token Store (Source of Truth)          │   │
        │  │  - Map<token, {createdAt, lastActivity}>        │   │
        │  │  - Single location for all tokens               │   │
        │  └──────────────────────────────────────────────────┘   │
        └──────────┬──────────────────────────────┬──────────────┘
                   │ 3a. Validate token           │ 3b. Return result
                   │ (POST /auth/validate)        │ ({ valid: true })
                   │                              │
         ┌─────────┴──────────────────────────────┴─────────┐
         │                                                   │
    ┌────▼─────┐  ┌────────┐  ┌────────┐  ┌──────────┐
    │  /app    │  │ /play  │  │/collab │  │ Other    │
    │Container │  │Container│  │Container│  │Services  │
    │          │  │        │  │        │  │          │
    │┌────────┐│  │┌──────┐│  │┌──────┐│  │┌────────┐│
    ││AuthC   ││  ││AuthC ││  ││AuthC ││  ││AuthC   ││
    ││lient  ││  ││lient ││  ││lient ││  ││lient  ││
    │└────────┘│  │└──────┘│  │└──────┘│  │└────────┘│
    │          │  │        │  │        │  │          │
    │┌────────┐│  │┌──────┐│  │┌──────┐│  │┌────────┐│
    ││ Cache  ││  ││Cache ││  ││Cache ││  ││Cache   ││
    ││(5 min) ││  ││(5 min)││  ││(5 min)││  ││(5 min) ││
    │└────────┘│  │└──────┘│  │└──────┘│  │└────────┘│
    │          │  │        │  │        │  │          │
    └──────────┘  └────────┘  └────────┘  └──────────┘
         ▲             ▲           ▲           ▲
         │             │           │           │
         └─────────────┼───────────┼───────────┘
                       │
              All requests validated here!
```

## Request Flow: Login

```
CLIENT                          AUTH SERVER                      SERVICE
  │                                  │                              │
  ├──────────────────────────────────>│                              │
  │   POST /auth/login               │                              │
  │   {password: "family-pwd"}        │                              │
  │                                  │                              │
  │                      Validate password                          │
  │                      Generate token_1234567890_abc              │
  │                      Store in central store                     │
  │                                  │                              │
  │<──────────────────────────────────┤                              │
  │   {token: "token_1234567890_abc"} │                              │
  │                                  │                              │
  │                                  │                              │
  │  (Store token in localStorage/cookie)                           │
```

## Request Flow: Authenticated Request (First Time - Cache Miss)

```
CLIENT                    SERVICE (/app)                      AUTH SERVER
  │                            │                                   │
  ├───────────────────────────>│                                   │
  │  GET /data                 │                                   │
  │  Authorization: Bearer ... │                                   │
  │                            │                                   │
  │                  Check revocation list: ✓ Not revoked         │
  │                  Check local cache: ✗ Cache miss               │
  │                            │                                   │
  │                            ├──────────────────────────────────>│
  │                            │  POST /auth/validate              │
  │                            │  {token: "token_..."}             │
  │                            │                                   │
  │                            │       Check central store         │
  │                            │       Token found: ✓ Valid        │
  │                            │                                   │
  │                            │<──────────────────────────────────┤
  │                            │  {valid: true}                    │
  │                            │                                   │
  │                  Cache result for 5 minutes                    │
  │                  Allow request to proceed                      │
  │<───────────────────────────┤                                   │
  │  {data: [...]}             │                                   │
  │                            │                                   │
  
  Latency: ~100ms (network call to auth server)
```

## Request Flow: Authenticated Request (Subsequent - Cache Hit)

```
CLIENT                    SERVICE (/app)                      AUTH SERVER
  │                            │                                   │
  ├───────────────────────────>│                                   │
  │  GET /user                 │                                   │
  │  Authorization: Bearer ... │                                   │
  │                            │                                   │
  │                  Check revocation list: ✓ Not revoked         │
  │                  Check local cache: ✓ Found!                   │
  │                  Cache still valid: ✓ (cached 2 min ago)       │
  │                            │                                   │
  │              (NO NETWORK CALL - Use cached result!)            │
  │                            │                                   │
  │                  Allow request to proceed                      │
  │<───────────────────────────┤                                   │
  │  {user: {...}}             │                                   │
  │                            │                                   │
  
  Latency: ~1-5ms (in-memory lookup only!)
```

## Request Flow: Logout

```
CLIENT                    SERVICE (/app)                      AUTH SERVER
  │                            │                                   │
  ├───────────────────────────>│                                   │
  │  POST /logout              │                                   │
  │  {token: "token_..."}      │                                   │
  │                            │                                   │
  │        authClient.revokeToken(token)                           │
  │        - Add to revocation list                                │
  │        - Remove from cache                                     │
  │                            │                                   │
  │                            ├──────────────────────────────────>│
  │                            │  POST /auth/logout                │
  │                            │  {token: "token_..."}             │
  │                            │                                   │
  │                            │    Delete from central store      │
  │                            │                                   │
  │                            │<──────────────────────────────────┤
  │                            │  {success: true}                  │
  │<───────────────────────────┤                                   │
  │  {success: true}           │                                   │
  │                            │                                   │
```

## Cache Behavior Timeline

```
Timeline:
0 min     - User logs in, receives token
          - Token sent to /app service

2 min     - Client makes request with token
          - Service: Check cache → Miss
          - Query auth server → Valid
          - Cache result (expires at 7 min)
          - Latency: ~100ms

4 min     - Client makes another request
          - Service: Check cache → Hit! (cached 2 min ago)
          - No network call
          - Latency: ~1ms

7 min     - Cache expires (5 min TTL)

8 min     - Client makes request
          - Service: Check cache → Expired
          - Query auth server → Still valid
          - Cache result (expires at 13 min)
          - Latency: ~100ms

9 min     - Client logs out
          - Service: Add to revocation list
          - Call /auth/logout

10 min    - Client tries to use old token
          - Service: Check revocation list → REVOKED!
          - Deny immediately
          - Latency: ~1ms
```

## Cache Hit Rate Over Time

```
Percentage of requests served from cache:
100% ├─────────────────────────────────────
     │
 90% ├──────────┐
     │          │  Stabilizes at 80-95%
 80% ├──────────┼─────────────────────────
     │          │
 70% ├──────────┘
     │
 60% ├────────────────────────────────────
     │
 50% ├────────────────────────────────────
     │    ╱─────────╲  (spikes on TTL expiry
 40% ├──╱           ╲──────────────────────
     │ ╱ (cold cache)│
 30% ├
     │
 20% ├────────────────────────────────────
     │
 10% ├────────────────────────────────────
     │
  0% └────────────────────────────────────
     0   5   10  15  20  25  30  35  40  min
       │   │   │   │   │   │   │   │   │
       Cache TTL: 5 min (resets here)
```

## Service Communication Pattern

```
┌─────────────────────────────────────────────────────┐
│              Docker Network                         │
│                                                      │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐  │
│  │  /auth   │─────>│  /app    │─────>│ /play    │  │
│  │          │      │          │      │          │  │
│  └──────────┘      └──────────┘      └──────────┘  │
│       ▲                ▲                   │        │
│       │                │                   │        │
│       └────────────────┴───────────────────┘        │
│        All validate tokens via /auth                │
│                                                      │
│  Isolated networks per service:                     │
│  ✓ /app cannot access /play's token cache          │
│  ✓ Each service has independent cache              │
│  ✓ Central auth is single source of truth          │
└─────────────────────────────────────────────────────┘
```

## Token Validation Decision Tree

```
Request arrives with token
    │
    ├─> Is token in revocation list?
    │   ├─ YES: DENY (token was logged out)
    │   └─ NO: Continue
    │
    ├─> Is token in local cache AND cache still valid?
    │   ├─ YES: ALLOW (cache hit, ~1ms)
    │   └─ NO: Continue
    │
    ├─> Query auth server: POST /auth/validate
    │   ├─ Server responds VALID:
    │   │   ├─ Store in cache (expires in 5 min)
    │   │   └─ ALLOW
    │   │
    │   ├─ Server responds INVALID:
    │   │   ├─ Remove from cache
    │   │   └─ DENY
    │   │
    │   └─ Server unreachable/timeout:
    │       ├─ Have stale cache?
    │       │  ├─ YES: Use stale cache (graceful degradation)
    │       │  └─ NO: DENY (fail closed)
```

## Performance Comparison

```
Request Latency Comparison:

100ms ├────────────────────────────────────────
      │ First request (cache miss)
      │ ├─ Network call to auth server
      │ ├─ Auth server processing
      │ └─ Cache result
      │
      ├──────────────────────────────────────── Cache miss
      │                                        latency
 50ms ├────────────────────────────────────────
      │
      │
      ├────────────────────────────────────────
      │ Subsequent requests (cache hit)
      │ ├─ Local memory lookup
 10ms ├─ Return result
      │
      ├────────────────────────────────────────Cache hit
      │                                        latency
  1ms └────────────────────────────────────────

      With 90% cache hit rate:
      - 90% of requests: 1-5ms
      - 10% of requests: 50-100ms
      - Average: ~14ms (vs 100ms without caching!)
```

## Failure Scenario: Auth Server Down

```
Request arrives with token
    │
    ├─> Is token in revocation list? NO
    ├─> Is token in cache and valid? YES
    │
    └─> ALLOW (use cached result)
        Auth server status: IRRELEVANT

    If token NOT in cache:
    ├─> Query auth server: ...connecting...
    │   Timeout after 5 seconds
    │
    ├─> Have any stale cache? NO
    │
    └─> DENY (fail closed for security)

    Degradation: High → Medium
    Still functional, but new tokens can't be validated
```

---

**Key Insight:** The cache is both a performance optimization AND a reliability feature!
