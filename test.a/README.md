# Example test.a

## About

Uses Docker and Docker Compose to create a network of services, including the following: app (app/), websock (websock/), test (websockb/), and nginx (nginx/).

Service details:
- app: Implements a basic UI (index.html) for the user to interact with backend services; an HTTP server (app.js) handling requests and returning responses; and a WebSocket client object for accessing the API to interact with WebSocketServers in connected backend services.
- websock: Right now it's some silly little lottery simulator... Not built with Dockerfile, basic image, volumes, and command specified in root docker-compose.yml... probably will scrap/rework this entirely (found at /chat endpoint).
- websockb (test): This is a simple functioning websocket server that can receive requests and respond 
- websockc (pywss): A simple Python WebSocket server using asyncio ... use .venv3.13 for local testing 
- nginx: Provides a simple load-balancing configuration (lb.conf) for receiving requests on port 8080 and routing based on request path to the appropriate service and port (app as /:3000; websock as chat/:6502; test as test/:9090) as configured in the respective directories' sourcecode. The docker-compose.yml file attaches the external port 1313 to the nginx container's 8080, meaning navigating to localhost:1313 hits the Nginx LB and gets routed to the appropriate backend container based on path (app/ by default). 

## How to Run Locally

1. from the test.a directory, run `docker-compose up -d` (or also acceptable: `docker compose up -d` now)
2. go to localhost:1313 in a browser 

## Notes

- taken from docker test which was a bare-bones expo from engineerman (youtube)
- res.write was just not working for me for some reason, but res.createReadStream worked and is apparently better to use anyway
- if changes are made to the websocket server, must rebuild the docker image before redeploying- `docker-compose up -d --build`
- [helpful info](https://stackoverflow.com/questions/51939855/node-js-server-responding-with-javascript-file-not-main-html) for writing a framework
- use logger.info (not print) with async logging queue to remain non-blocking with asyncio and buffered python server execution