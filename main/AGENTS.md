## Repo Overview
- The main/ directory is where the entirety of the app lives. The app is a docker compose cluster of services, which have been broken down into parts detailed below. For now, this repo will purely be hosted locally, and during the rare instances when it needs to be exposed to the internet, a simple ngrok tunnel from localhost:1313 will be exposed securely to an ephemeral web endpoint via Docker. 

- Service Structure
    - 3 Primary Execution Services (incl. WebSockets): 
        - app (Node)
        - play (Node)
        - collab (Python)
    - Auth, Login, Logout Service
        - auth (Node)
        - Distributed auth (Each service has a local cache of valid tokens.)
    - Nginx Reverse Proxy + Edge Auth + Error CDN 
        - nginx
    - Shared Resources + Static Asset Serving
        - shared (Node) 
    - Docker Compose orchestration

## Repo Priorities
- Only import or require the minimum possible amount of external dependencies.
- Use the existing style and practices of the repo where applicable. 

## Testing Instructions


## Testing Strategy
- Unit: Token store functions, cache logic
- Integration: Service A creates token → Service B validates it
- End-to-end: Full login → protected endpoint → logout flow

## Key Concepts for Testing
- Token lifecycle (create → validate → revoke)
- Cache hit/miss behavior (5-min TTL)
- Service-to-service validation
- WebSocket auth with query params

## Service Dependencies
- All services depend on `shared/token-store.js`
- `auth` service is source of truth
- Services can validate locally (cached) or remotely