// import fs from 'fs';
import http from 'http';
import { WebSocketServer } from 'ws';

// import { URITree } from '../shared/types.js';

import { 
    routeHandler,
    setupWebSocketEventHandlers,
    setupHttpServerEventHandlers
 } from './server-utils/event-handlers.js';

const protocol = 'http';
const hostname = '0.0.0.0';
const port = 9090;
const uriBase = '/play';

import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is a CommonJS-specific global variable, not available in ES module scope
// can replicate the functionality using the `import.meta.url` property (below) and the 
// built-in path and url modules (imported above, used below)

const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

// export function serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse, staticFilename?: string): void {
//     res.statusCode = 200;
//     let subpath = '';
//     if (!staticFilename) staticFilename = 'index.html';
//     if (staticFilename.endsWith('.html')) {
//         res.setHeader('Content-Type', 'text/html');
//     } else if (staticFilename.endsWith('.js') || staticFilename.endsWith('.ts') || staticFilename.endsWith('.map')) {
//         // res.setHeader('Content-Type', 'application/json');
//         res.setHeader('Content-Type', 'text/javascript');
//         subpath = '/client-utils'
//     } else {
//         // res.statusCode = 404;
//         // default404(req, res);
//         res.writeHead(404, 'Not Found', { "content-type": 'application/json' });
//         res.end(JSON.stringify({ err: 'Not Found' }));
//         return;
//     }
//     // fs.createReadStream(__dirname + '/index.html').pipe(res);
//     const readStream = fs.createReadStream(__dirname + subpath + '/' + staticFilename);

//     readStream.on('error', (err) => {
//         console.error(err);
//         res.writeHead(404, { 'Content-Type': 'text/plain' });
//         // res.end(`
//         //     <h1>hi from ${os.hostname()}</h1>
//         //     <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
//         //     <p>Server received request: ${req}</p>
//         //     <p>But there was an error while piping: ${err}</p>
//         // `);
//         res.end('Not Found');
//     });

//     readStream.pipe(res);

//     setTimeout(() => {
//         readStream.close(); // This may not close the stream.
//         // Artificially marking end-of-stream, as if the underlying resource had
//         // indicated end-of-file by itself, allows the stream to close.
//         // This does not cancel pending read operations, and if there is such an
//         // operation, the process may still not be able to exit successfully
//         // until it finishes.
//         readStream.push(null);
//         readStream.read(0);
//     }, 100);
// }

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
    routeHandler.handleRequest(req, res);
});
// TODO attaching those event handlers doesn't seem to work right now 
// const server = setupHttpServerEventHandlers(http.createServer());

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


