import http from 'http';
import { WebSocketServer } from 'ws';

import { handlerTree } from './route-handler.js';
import { setupWebSocketEventHandlers } from './server-utils/event-handlers.js';

const protocol = 'http';
const hostname = '0.0.0.0';
const port = 9090;
const uriBase = '/play';

// You can serve both HTTP (like REST) and WebSocket (WS) traffic 
// from the same server, even on the same port, because WebSockets 
// start as an HTTP request with an Upgrade header, allowing a 
// single server application to differentiate and handle both 
// protocols using the same port. The server identifies WebSocket 
// connections by looking for the initial HTTP Upgrade request and 
// then switches to the persistent WebSocket protocol, while 
// regular HTTP requests are handled as normal.

const server = http.createServer((req, res) => {
    // callback binds to the http 'request' event 
    if (!req || !req.method || !req.url) return; // ping? what would this situation be? 
    console.log(`Received request: ${req.method} ${req.url}`);
    handlerTree.fulfillRequest(req, res);
});

server.listen(port, hostname, () => {
    // binds to the 'listening' event for HTTP requests 
    console.log(`HTTP server running at ${protocol}://${hostname}:${port}${uriBase} :)`);
});

// this (in the comment) is CommonJS syntax (`websocket.Server`)
// after migrating to TS and ES modules: Property 'Server' does not exist on type 'typeof WebSocket'.
// var WebSocketServer = websocket.Server, wss = new WebSocketServer({ port: port });
// var wss = new websocket.Server({ server: server });
// this is the correct ES module syntax
// fix: import { WebSocketServer } from 'ws';
const wss: WebSocketServer = new WebSocketServer({ server: server }, () => {
    // the callback specified here is added as a listener for the same 'listening' event
    // we bound to above, on the underlying/internal HTTP server 
    console.log(`WebSocketServer bound and listening on ${protocol}://${hostname}:${port}${uriBase} :)`);
});
// The two servers can't both bind to the same port independently. Use the same server object
// and implement the protocols from within, allowing one server at the point to handle both types of requests
// WebSocket connections start as an HTTP request with an `Upgrade` header. The server handles regular
// HTTP requests normally, and upgrades matching WS requests to use the persistent websocket protocol. 

setupWebSocketEventHandlers(wss);

