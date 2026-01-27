import http from 'http';
import os from 'os';
import fs from 'fs';
// import websocket from 'ws';
import WebSocket, { WebSocketServer } from 'ws';
import { Stream } from 'stream';

import { URITree } from './types.js';
import type { 
    WebSocketEvents, 
    WebSocketEventListenerMap, 
    WebSocketServerEvents, 
    WebSocketServerEventListenerMap 
} from './types.js';
import AuthClient from './auth-client.js';
import { validateToken, updateTokenActivity } from './token-store.js';

// Initialize the auth client for distributed authentication
// Should be configured via environment variables or server setup
let authClient: AuthClient | null = null;

// const loc = window.location;
// const protocol = loc.protocol; // === "https:" ? "wss:" : "ws:"; 
// const host = loc.host; // ensure the browser connects to the same port nginx is listening on 
// const authURL = `${protocol}//${host}`; 

try {
    initializeAuthClient({
        // authServerUrl: process.env.AUTH_SERVER_URL || 'http://localhost:1313',
        authServerUrl: 'http://auth:6502', // Docker service name and port ... 
        // cacheTTL: process.env.AUTH_CACHE_TTL ? parseInt(process.env.AUTH_CACHE_TTL) : undefined,
        // validationTimeout: process.env.AUTH_VALIDATION_TIMEOUT ? parseInt(process.env.AUTH_VALIDATION_TIMEOUT) : undefined
    });
} catch (err) {
    console.error('[Server] Failed to initialize auth client:', err);
}

export function initializeAuthClient(config: { authServerUrl: string; cacheTTL?: number; validationTimeout?: number }) {
    authClient = new AuthClient(config);
    console.log(`[Server] Auth client initialized with auth server: ${config.authServerUrl}`);
}


// Two main categories of events (and listeners): those on the WebSocketServer instance 
//      and those on the individual WebSocket connection instances. 
// WebSocketServer Instance Events: The primary event for the server instance (wss) is connection. 
// connection: Fired when a client successfully connects to the server. The callback function 
//      for this event is typically passed the individual WebSocket instance (ws) representing 
//      the new connection, which is then used to set up further communication with that specific client. 
// Individual WebSocket Connection Events: Once a connection is established on the server, 
//      the individual ws instance (which represents the connection to a specific client) emits the following events:
//          open: Fired when the connection is established and ready for communication 
//              (though on the server side, this is implicitly handled by the connection event).
//          message: Fired when data is received from the other end of the connection. The callback 
//              receives the message data as an argument.
//          error: Fired if an error occurs, such as a connection failure or protocol error.
//          close: Fired when the connection is closed.
//          ping: Fired when a ping frame is received from the client (useful for heartbeat mechanisms).
//          pong: Fired when a pong frame is received, usually in response to a ping. 
// See: https://www.npmjs.com/package/ws


// ********* default web socket event listeners *************

// TODO hmmm... might have to move these back inside the defaultWssOnConnection method
// if we have to access the websocket server for some of these 
// or could pass it as an optional argument as a kind of way to attach them 
// or put those handlers that need it in the specific server config maybe 

export function defaultWsOnOpen (this: WebSocket) {
    // implicitly handled server-side 
};

export function defaultWsOnRedirect (this: WebSocket, url: string, request: http.ClientRequest) {

}

// this is an event that should (maybe) be bound to the http server ... as well? or instead? 
// i guess both servers might do something different on this event 
export function defaultWsOnUpgrade (this: WebSocket, request: http.IncomingMessage) {

}

export function defaultWsOnError (this: WebSocket, error: Error) {

}

export function defaultWsOnUnexpectedResponse (this: WebSocket, request: http.ClientRequest, response: http.IncomingMessage) {

}

export function defaultWsOnPing (this: WebSocket, data: Buffer) {

}

export function defaultWsOnPong (this: WebSocket, data: Buffer) {

}

export function defaultWsOnMessage (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) {
    console.log(`MESSAGE RECEIVED: (isBinary:${isBinary}) RawData:${data}`);
    this.send(`Server received: ${data}`, (err) => err ? defaultWsOnError.call(this, err) : () => {});
    let expected: {
        [key: string]: any;
        type: string;
    } = {
        type: 'ECHO',
    }

    // console.log(`${data.valueOf()}`)

    try {
        console.log(data.toString());
        expected = {...JSON.parse(data.toString())};
        console.log(expected);
    } catch (err) {
        if (err instanceof SyntaxError) {
            console.warn(`Could not parse message as JSON: ${err}`);
        } else {
            console.warn(err);
        }
    }
}

export const defaultWsOnClose = (code: number, reason: Buffer) => {
    // // connectionArray = connectionArray.filter(function (el, idx, ar) {
    // //     return el.connected;
    // // });
    // const toRemoveIndex = connectionArray.findIndex(el => !el.connected);
    // connectionArray.splice(toRemoveIndex, 1);
    // sendUserListToAll();  // Update the user lists
    // console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
}

export const defaultWebSocketListeners = {
    'open': defaultWsOnOpen,
    'redirect': defaultWsOnRedirect,
    'upgrade': defaultWsOnUpgrade,
    'error': defaultWsOnError,
    'unexpected-response': defaultWsOnUnexpectedResponse,
    'ping': defaultWsOnPing,
    'pong': defaultWsOnPong,
    'message': defaultWsOnMessage,
    'close': defaultWsOnClose,
}

// // ********** default websocket server event listeners ************** 

export function defaultWssOnClose (this: WebSocketServer) {

};

export function defaultWssOnError (this: WebSocketServer, error: Error) {

};

export function defaultWssOnHeaders (this: WebSocketServer, headers: string[], request: http.IncomingMessage) {

};

export function defaultWssOnWsClientError (this: WebSocketServer, error: Error, socket: Stream.Duplex, request: http.IncomingMessage) {

};

export function defaultWssOnConnection(
    this: WebSocketServer, 
    ws: WebSocket, 
    request: http.IncomingMessage,
    wsListeners?: {
        [K in keyof WebSocketEventListenerMap]?: WebSocketEventListenerMap[K];
    }
) {

    // properties i see in index.d.mts (drill into wss.on)
    // wss.options: WebSocket.ServerOptions<T, U>;
    // wss.path: string;
    // wss.clients: Set<InstanceType<T>>;

    // wss.address(): WebSocket.AddressInfo | string | null;
    // wss.close(cb?: (err?: Error) => void): void;
    // wss.handleUpgrade(
    //     request: InstanceType<U>,
    //     socket: Duplex,
    //     upgradeHead: Buffer,
    //     callback: (client: InstanceType<T>, request: InstanceType<U>) => void,
    // ): void;
    // wss.shouldHandle(request: InstanceType<U>): boolean | Promise<boolean>;

    // (method) WebSocket.on(
    //      event: "message", 
    //      listener: (
    //          this: WebSocket, 
    //          data: WebSocket.RawData, 
    //          isBinary: boolean
    //      ) => void
    // ): WebSocket (+8 overloads)

    // ws.on('open', defaultWsOnOpen);
    // ws.on('redirect', defaultWsOnRedirect);
    // ws.on('upgrade', defaultWsOnUpgrade);
    // ws.on('error', defaultWsOnError);
    // ws.on('unexpected-response', defaultWsOnUnexpectedResponse);
    // ws.on('ping', defaultWsOnPing);
    // ws.on('pong', defaultWsOnPong);
    // ws.on('message', defaultWsOnMessage)
    // ws.on('close', defaultWsOnClose);

    if (!wsListeners) wsListeners = defaultWebSocketListeners;
    for (const wsEventType of Object.keys(wsListeners)) {
        const wsEventTypeKey = wsEventType as WebSocketEvents;
        // console.log(`Adding ${wsListeners[wsEventTypeKey]} to event:${wsEventType}`)
        ws.on(wsEventType, wsListeners[wsEventTypeKey] ?? defaultWebSocketListeners[wsEventTypeKey])
    }
};

export const defaultWebSocketServerListeners = {
    'close': defaultWssOnClose,
    'error': defaultWssOnError,
    'connection': defaultWssOnConnection,
    'headers': defaultWssOnHeaders,
    'wsClientError': defaultWssOnWsClientError,
}

export const setupWebSocketEventHandlers = (
    wss: WebSocketServer,
    wssListeners?: {
        [K in keyof WebSocketServerEventListenerMap]?: WebSocketServerEventListenerMap[K] | WebSocketServerEventListenerMap[K][];
    }
): WebSocketServer => {
    // wss.on('close', () => defaultWssOnClose.call(wss));
    // wss.on('error', (error: Error) => defaultWssOnError.call(wss, error));
    // wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => defaultWssOnConnection.call(wss, ws, request));
    // wss.on('headers', defaultWssOnHeaders);
    // wss.on('wsClientError', defaultWssOnWsClientError);

    if (!wssListeners) wssListeners = defaultWebSocketServerListeners;
    for (const wsEventType of Object.keys(wssListeners)) {
        const wsEventTypeKey = wsEventType as WebSocketServerEvents;
        if (Array.isArray(wssListeners[wsEventTypeKey])) {
            for (const wssListener of wssListeners[wsEventTypeKey]) {
                // console.log(`Adding listener ${wssListener} to event: ${wsEventType}`)
                // wss.on(wsEventType, wssListener)
                wss.addListener(wsEventType, wssListener);
            }
        } else {
            // console.log(`Adding listener ${wssListeners[wsEventTypeKey]} to event: ${wsEventType}`)
            wss.on(wsEventType, wssListeners[wsEventTypeKey] ?? defaultWebSocketServerListeners[wsEventTypeKey])
        }
    }
    return wss;
};

// // ******************* HTTP Logic ******************

// // ******* Creating a very simple middle-ware stack to emulate basic features from other frameworks like Express ********

const logger = (request: http.IncomingMessage, response: http.ServerResponse, next: (err?: Error) => void) => {
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url} from Origin: ${request.headers.origin}`);
    next();
}

const validator = (request: http.IncomingMessage, response: http.ServerResponse, next: (err?: Error) => void) => {
    // console.log("Handling request from " + request.headers.origin);
    if (!request || !request.method || !request.url) return; 
    // what would this situation possibly be? ping, idts??

    // The origin property doesn't exist directly on Node.js's built-in http.IncomingMessage 
    //  because it's a low-level stream representing raw HTTP data; you'll find origin information 
    //  (like req.headers.origin or req.headers.host) within the headers object, but frameworks 
    //  like Express or Koa enhance req (often an IncomingMessage) with convenience properties 
    //  like .query, .body, or origin. To get the origin, access req.headers.origin (for CORS) 
    //  or req.headers.host and parse the URL, or use a framework for easier access. 

    // if (!originIsAllowed(request.headers.origin)) {
    //     // // request.reject();
    //     // console.log("Connection from " + request.headers.origin + " rejected.");
    //     // return;
    //     return next(new Error(`Rejected request from ${request.headers.origin}.`));
    // }
    return next();
}

const authenticator = (request: http.IncomingMessage, response: http.ServerResponse, next: (err?: Error) => void) => {
    // Extract token from cookie, authorization header, or query parameter
    // Priority: Cookie > Authorization Header > Query Parameter

    // 1. Try cookie first (most secure)
    let token: string | null = null;
    const cookies = request.headers.cookie;
    if (cookies) {
        const authCookie = cookies.split(';').find(c => c.trim().startsWith('authToken='));
        if (authCookie) {
            let authCookieSplit = authCookie.split('=');
            if (authCookieSplit && authCookieSplit[1]) token = authCookieSplit[1].trim();
        }
    }

    // 2. Fall back to Authorization Header format: "Bearer <token>" or custom "x-auth-token"
    if (!token) {
        let authHeader = request.headers.authorization || request.headers['x-auth-token'];
        if (Array.isArray(authHeader)) {
            if (authHeader.length > 1) return next(new Error('Too many auth tokens...??'));
            else authHeader = authHeader[0];
        }
        token = authHeader?.replace('Bearer ', '') || null;
    }

    // 3. Fall back to query parameter (least secure) 
    if (!token) {
        token = new URL(request.url || '', `http://${request.headers.host}`).searchParams.get('token');
    }

    // Validate token using distributed auth if available, otherwise fall back to local validation
    async function validateTokenAsync() {
        if (!token) {
            return next(new Error('Unauthorized: Missing authentication token'));
        }

        try {
            let isValid: boolean;

            if (authClient) {
                // Use distributed auth client (queries auth server with local caching)
                console.log(`[Authenticator] Using distributed auth client`);
                isValid = await authClient.validateToken(token as string);
            } else {
                // Fall back to local token validation (single-host mode)
                console.log(`[Authenticator] Using local token validation (auth client not initialized)`);
                isValid = validateToken(token as string);
                if (isValid) {
                    updateTokenActivity(token as string);
                }
            }

            if (!isValid) {
                return next(new Error('Unauthorized: Invalid or expired authentication token'));
            }

            // Attach token to request for downstream handlers
            (request as any).authToken = token;
            return next();
        } catch (err: any) {
            console.error(`[Authenticator] Error validating token:`, err);
            return next(new Error(`Authorization failed: ${err.message}`));
        }
    }

    // Call the async validation
    validateTokenAsync();
}

const errorHandler = (err: Error, request: http.IncomingMessage, response: http.ServerResponse, next: (err?: Error) => void) => {
    console.error(`Caught error: ${err.name}: ${err.message}: ${err.cause}`);
    // TODO if unauth error, redirect to /auth/login 
    response.writeHead(500, 'Internal Server Error', { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
}

const middlewareStack = [logger, validator, authenticator];

// // ********** functions to facilitate the handling of requests after they've passed through the middleware ************** 

const utilFilepathMatcher = /^\/$/;

// TODO pass __dirname in as Server arg ... 

// function serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse, staticFilename?: string, staticFilepath?: string): void {
//     if (!staticFilename) {
//         const fileMatcher = utilFilepathMatcher;
//         const parsedRequestURL = req.url?.match(fileMatcher);
//         if (!parsedRequestURL || !parsedRequestURL[1]) {
//             // set staticFilename as index.html and try to serve it, 
//             // it'll throw 404 anyway if not there... we can add this to the URITree class 
//             // TODO use the request URL as a second subpath for potential nested index.htmls ??
//             staticFilename = 'index.html';
//         } else {
//             staticFilename = parsedRequestURL[1];
//         }
//     }

//     res.statusCode = 200;
//     let subpath = '';
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
//     const readStream = fs.createReadStream((staticFilepath ?? __dirname) + subpath + '/' + staticFilename);

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
// };

const routeHandler = new URITree({
    route: '/',
    availableAssetsAtRoute: utilFilepathMatcher,
    // assetServerHandler: () => {},
    // handlerMap: {
    //     "GET": () => {}, // will attempt to serve index by default... 
    //              // without a serverBasePath it will attempt to serve /index.html
    // }
})

// // ********** default http event listeners ************** 

// // ************** passes requests through the middleware logic before attempting to serve ***************

// needs host and port ... 
const httpServerOnListen = (port?: number, hostname?: string) => {
}

function httpServerOnRequest (
    request: http.IncomingMessage, 
    response: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage; },
    options?: {
        routeHandler?: URITree | undefined,
        // __dirname?: string,
    }
): void {
    // console.log(`HTTP Server on request: ${request.url}`);
    // putting similar logic to wssOnRequestFIXTHIS in here... actually can't really do that 
    // but refactoring and creating a middleware stack, loosely based on 
    // what Gemini told me Express's arch would be like at a very basic level 

    let index = 0; // the stage of the stack each request being handled is at 
    const next = (err?: Error) => {
        if (err) {
            // console.log(`Hoping there's no error... ${err}`);
            errorHandler(err, request, response, next);
        } else if (index < middlewareStack.length) {
            // console.log(`In the middleware stack at index: ${index}`);
            // TODO validate... Cannot invoke an object which is possibly 'undefined'. It's defined as const above?? 
            // need to understand that error on a deeper level 
            middlewareStack[index++]!(request, response, next); 
        } else {
            // console.log(`About to handle request after middleware executed.`);
            (options?.routeHandler ?? routeHandler).handleRequest(request, response);
        }
    }
    next();
}

const httpServerOnUpgrade = (req: http.IncomingMessage, socket: Stream.Duplex, head: NonSharedBuffer) => {
    // started as an HTTP onRequest event that included the Upgrade header,
    // our HTTP server responds with a 101 Switching Protocols and then 
    // transitions to the websocket protocol on the underlying TCP socket (onUpgrade)

    // socket.on('error', onSocketError);

    // // This function is not defined on purpose. Implement it with your own logic.
    // authenticate(request, function next(err, client) {
    //     if (err || !client) {
    //     socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
    //     socket.destroy();
    //     return;
    //     }

    //     socket.removeListener('error', onSocketError);

    //     wss.handleUpgrade(request, socket, head, function done(ws) {
    //     wss.emit('connection', ws, request, client);
    //     });
    // });

    // Can we have access to the WSS/HTTP servers here?? 

    // // Accept the request and get a connection.
    // var connection = req.accept("json", req.headers.origin);

    // // Add the new connection to our list of connections.
    // console.log((new Date()) + " Connection accepted.");
    // connectionArray.push(connection);

    // // Send the new client its token; it will
    // // respond with its login username.
    // connection.clientID = nextID;
    // nextID++;

    // var msg = {
    //     type: "id",
    //     id: connection.clientID
    // };
    // connection.sendUTF(JSON.stringify(msg));
}

// handle the on('upgrade') logic from a standard HTTP request, and provide 
//      additional validation before creating a full-duplex connection to the wss server
// is there any difference between http.Server.on('request') and ws.WebSocketServer.on('request')
// "the http.Server.on('request') and ws.WebSocketServer.on('request') events do not bind to the same 
//      'request' event, and in fact, the ws library's WebSocketServer does not emit a 'request' event 
//      for standard HTTP requests. The http.Server handles the initial HTTP part of the handshake. 
//      If you are using the same server instance for both, you should handle standard HTTP requests 
//      using the request event and the WebSocket upgrade requests using the upgrade event."
    
// import ServerEventMap from 'http';
// interface httpListeners {
//     [K in keyof ServerEventMap]: ServerEventMap[K];
// }

export const setupHttpServerEventHandlers = (
    server: http.Server,
    // handlers?: ,
    routeHandler?: URITree,
) => {
    // console.log(`Setting up http server event handlers...`);
    // http.Server.on(eventName: keyof http.ServerEventMap<typeof http.IncomingMessage, typeof http.ServerResponse>
    // server.on('listening', httpServerOnListen);
    server.on('request', (
        request: http.IncomingMessage, 
        response: http.ServerResponse
    ) => httpServerOnRequest(request, response, { routeHandler }))
    // server.on('request', httpServerOnRequest);
    // server.on('upgrade', httpServerOnUpgrade)
    // console.log(`Set up server with event listeners...`);
    return server;
}

// // simple wrapper class to set default options/listeners used across this project 
// export class Server {
//     wsServer: WebSocketServer;
//     httpServer: http.Server;


//     constructor(options: any) {
//         // Object.assign(this, this.defaults);
//         this.wsServer = options.wss ?? setupWebSocketEventHandlers(new WebSocketServer());
//         this.httpServer = options.httpServer ?? setupHttpServerEventHandlers()
//     }
// }

class DiceGamesServer<T extends http.Server | WebSocketServer> {
    routeHandler ?= undefined;

    constructor() {
        // this.super();
        // super();
    }
}