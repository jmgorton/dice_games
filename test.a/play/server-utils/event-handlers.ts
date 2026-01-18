import http from 'http';
import os from 'os';
import fs from 'fs';
// import websocket from 'ws';
import WebSocket, { WebSocketServer } from 'ws';
import { Stream } from 'stream';

import {
    connectionArray, // TODO research how importing an array works ... can't assign, but can manipulate it seems 
    originIsAllowed,
    isUsernameUnique,
    getConnectionForID,
    // makeUserListMessage,
    sendUserListToAll,
} from './helpers.js'

import { __dirname } from '../server.js';
import { URITree } from '../../shared/dist/types.js';

// var connectionArray: any[] = []; // TODO remove, use wss.clients and if (client.readyState === WebSocket.OPEN)
// See: https://www.npmjs.com/package/ws # Server broadcast 
var nextID = Date.now();
// const ip = req.socket.remoteAddress; to get ip of client...
// "When the server runs behind a proxy like NGINX, the de-facto standard
// is to use the X-Forwarded-For header."
// const ip = req.headers['x-forwarded-for'].split(',')[0].trim();
var appendToMakeUnique = 1;

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

// what in the python self syntax ... but i'll continue, 
// it's in the spec and `this` is not allowed here 
const wssOnClose = (self: WebSocketServer) => {

};

const wssOnError = (self: WebSocketServer, error: Error) => {

};

const wssOnHeaders = (self: WebSocketServer, headers: string[], request: http.IncomingMessage) => {

};

// // // Stream not found, not in ws? But createWebSocketStream is in ws (Node.js streams) 
// const wssOnWsClientError = (self: WebSocketServer, error: Error, socket: Stream.Duplex, request: http.IncomingMessage) => {

// };



const wssOnConnection = (ws: WebSocket, request: http.IncomingMessage) => {
    ws.on('open', (self: WebSocket) => {
        // implicitly handled server-side 
    });

    ws.on('redirect', (self: WebSocket, url: string, request: http.ClientRequest) => {

    });

    // this is an event that should (maybe) be bound to the http server ... as well? or instead? 
    // i guess both servers might do something different on this event 
    ws.on('upgrade', (self: WebSocket, request: http.IncomingMessage) => {

    });

    ws.on('error', (self: WebSocket, error: Error) => {

    });

    ws.on('unexpected-response', (self: WebSocket, request: http.ClientRequest, response: http.IncomingMessage) => {

    });

    ws.on('ping', (self: WebSocket, data: Buffer) => {

    });

    ws.on('pong', (self: WebSocket, data: Buffer) => {
        
    });

    ws.on('message', (self: WebSocket, data: WebSocket.RawData, isBinary: boolean) => {

    })

    ws.on('close', (code: number, reason: Buffer) => {

    });
};

const wssOnConnectionOld = function (ws: WebSocket, request: http.IncomingMessage) {

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
    // wss.houldHandle(request: InstanceType<U>): boolean | Promise<boolean>;

    // (method) WebSocket.on(
    //      event: "message", 
    //      listener: (
    //          this: WebSocket, 
    //          data: WebSocket.RawData, 
    //          isBinary: boolean
    //      ) => void
    // ): WebSocket (+8 overloads)
    

    ws.on('message', function (message: any) { // TODO type this later 
        console.log("***MESSAGE: %s", message);
        ws.send(`Server received: ${message}`);
        if (message.type === 'utf8') {
            console.log("Received Message: " + message.utf8Data);

            // Process messages
            var sendToClients = true;
            let msg: any = JSON.parse(message.utf8Data);
            var connect = getConnectionForID(msg.id);

            // Look at the received message type and
            // handle it appropriately.
            switch (msg.type) {
                // Public text message in the chat room
                case "message":
                    msg.name = connect.username;
                    msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
                    break;

                // Username change request
                case "username":
                    var nameChanged = false;
                    var origName = msg.name;

                    // Force a unique username by appending
                    // increasing digits until it's unique.
                    while (!isUsernameUnique(msg.name)) {
                        msg.name = origName + appendToMakeUnique;
                        appendToMakeUnique++;
                        nameChanged = true;
                    }

                    // If the name had to be changed, reject the
                    // original username and let the other user
                    // know their revised name.
                    if (nameChanged) {
                        var changeMsg = {
                            id: msg.id,
                            type: "rejectusername",
                            name: msg.name
                        };
                        connect.sendUTF(JSON.stringify(changeMsg));
                    }

                    connect.username = msg.name;
                    sendUserListToAll();
                    break;
            }

            // Convert the message back to JSON and send it out
            // to all clients.
            if (sendToClients) {
                var msgString = JSON.stringify(msg);
                var i;

                for (i = 0; i < connectionArray.length; i++) {
                    connectionArray[i].sendUTF(msgString);
                }
            }
        }
    });
};

// TODO research: is this correct? well, i guess this was from before we created an explicit http server... 
//      maybe is this trying to handle the on('upgrade') logic from a standard HTTP request, and provide 
//      additional validation before creating a full-duplex connection to the wss server
// is there any difference between http.Server.on('request') and ws.WebSocketServer.on('request')
// "the http.Server.on('request') and ws.WebSocketServer.on('request') events do not bind to the same 
//      'request' event, and in fact, the ws library's WebSocketServer does not emit a 'request' event 
//      for standard HTTP requests. The http.Server handles the initial HTTP part of the handshake. 
//      If you are using the same server instance for both, you should handle standard HTTP requests 
//      using the request event and the WebSocket upgrade requests using the upgrade event."

// // req: http.IncomingMessage, res: http.ServerResponse
// const wssOnRequestFIXTHIS = function (request: any) { // TODO what is the request type??
//     console.log("Handling request from " + request.origin);

//     // The origin property doesn't exist directly on Node.js's built-in http.IncomingMessage 
//     //  because it's a low-level stream representing raw HTTP data; you'll find origin information 
//     //  (like req.headers.origin or req.headers.host) within the headers object, but frameworks 
//     //  like Express or Koa enhance req (often an IncomingMessage) with convenience properties 
//     //  like .query, .body, or origin. To get the origin, access req.headers.origin (for CORS) 
//     //  or req.headers.host and parse the URL, or use a framework for easier access. 

//     if (!originIsAllowed(request.origin)) {
//         request.reject();
//         console.log("Connection from " + request.origin + " rejected.");
//         return;
//     }

//     // Accept the request and get a connection.
//     var connection = request.accept("json", request.origin);

//     // Add the new connection to our list of connections.
//     console.log((new Date()) + " Connection accepted.");
//     connectionArray.push(connection);

//     // Send the new client its token; it will
//     // respond with its login username.
//     connection.clientID = nextID;
//     nextID++;

//     var msg = {
//         type: "id",
//         id: connection.clientID
//     };
//     connection.sendUTF(JSON.stringify(msg));

//     // Handle the "message" event received over WebSocket. This
//     // is a message sent by a client, and may be text to share with
//     // other users or a command to the server.

//     connection.on('message', function (message: any) { // TODO type this later
//         console.log("***MESSAGE");
//         if (message.type === 'utf8') {
//             console.log("Received Message: " + message.utf8Data);

//             // Process messages
//             var sendToClients = true;
//             msg = JSON.parse(message.utf8Data);
//             var connect = getConnectionForID(msg.id);
//             if (!connect || !('name' in msg)) return;

//             // Look at the received message type and
//             // handle it appropriately.
//             switch (msg.type) {
//                 // Public text message in the chat room
//                 case "message":
//                     if (!('text' in msg)) return;
//                     msg.name = connect.username;
//                     msg.text = (msg.text as string).replace(/(<([^>]+)>)/ig, "");
//                     break;

//                 // Username change request
//                 case "username":
//                     var nameChanged = false;
//                     var origName = msg.name;

//                     // Force a unique username by appending
//                     // increasing digits until it's unique.
//                     while (!isUsernameUnique(msg.name as string)) {
//                         msg.name = origName as string + appendToMakeUnique;
//                         appendToMakeUnique++;
//                         nameChanged = true;
//                     }

//                     // If the name had to be changed, reject the
//                     // original username and let the other user
//                     // know their revised name.
//                     if (nameChanged) {
//                         var changeMsg = {
//                             id: msg.id,
//                             type: "rejectusername",
//                             name: msg.name
//                         };
//                         connect.sendUTF(JSON.stringify(changeMsg));
//                     }

//                     connect.username = msg.name;
//                     sendUserListToAll();
//                     break;
//             }

//             // Convert the message back to JSON and send it out
//             // to all clients.
//             if (sendToClients) {
//                 var msgString = JSON.stringify(msg);
//                 var i;

//                 for (i = 0; i < connectionArray.length; i++) {
//                     connectionArray[i].sendUTF(msgString);
//                 }
//             }
//         }
//     });

//     // Handle the WebSocket "close" event; this means a user has logged off
//     // or has been disconnected.

//     connection.on('close', function (connection: any) {
//         // connectionArray = connectionArray.filter(function (el, idx, ar) {
//         //     return el.connected;
//         // });
//         const toRemoveIndex = connectionArray.findIndex(el => !el.connected);
//         connectionArray.splice(toRemoveIndex, 1);
//         sendUserListToAll();  // Update the user lists
//         console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
//     });
// };


export const setupWebSocketEventHandlers = (wss: WebSocketServer) => {
    wss.on('close', () => wssOnClose(wss));
    wss.on('error', (error: Error) => wssOnError(wss, error));
    wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => wssOnConnection(ws, request));
    wss.on('connection', (ws: WebSocket, request: http.IncomingMessage) => wssOnConnectionOld(ws, request));
    wss.on('headers', wssOnHeaders);
    // wss.on('request', wssOnRequestFIXTHIS); // does this even do anything?? no
    return wss;
};

// ******* Creating a very simple middle-ware stack to emulate basic features from other frameworks like Express ********

const logger = (request: http.IncomingMessage, response: http.ServerResponse, next: (err?: Error) => void) => {
    console.log(`[${new Date().toISOString()}] Received ${request.method} ${request.url} from ${request.headers.origin}`);
    next();
}

const validator = (request: http.IncomingMessage, response: http.ServerResponse, next: (err?: Error) => void) => {
    // console.log("Handling request from " + request.headers.origin);
    if (!request || !request.method || !request.url) return; 
    // ping? what would this situation possibly be? 

    // The origin property doesn't exist directly on Node.js's built-in http.IncomingMessage 
    //  because it's a low-level stream representing raw HTTP data; you'll find origin information 
    //  (like req.headers.origin or req.headers.host) within the headers object, but frameworks 
    //  like Express or Koa enhance req (often an IncomingMessage) with convenience properties 
    //  like .query, .body, or origin. To get the origin, access req.headers.origin (for CORS) 
    //  or req.headers.host and parse the URL, or use a framework for easier access. 

    if (!originIsAllowed(request.headers.origin)) {
        // // request.reject();
        // console.log("Connection from " + request.headers.origin + " rejected.");
        // return;
        return next(new Error(`Rejected request from ${request.headers.origin}.`));
    }
    return next();
}

const authenticator = (request: http.IncomingMessage, response: http.ServerResponse, next: (err?: Error) => void) => {
    const possibleAuthHeaderIDK = ['x-auth', 'authorization', 'proxy-authenticate', 'proxy-authorization', 'www-authenticate'];
    if (request.url === '/play/admin' && !possibleAuthHeaderIDK.some(header => header in request.headers)) {
        // checking for at least one of those headers, idk what will happen 
        return next(new Error('Unauthorized'));
    }
    return next();
}

const errorHandler = (err: Error, request: http.IncomingMessage, response: http.ServerResponse, next: (err?: Error) => void) => {
    console.error(`Caught error: ${err.name}: ${err.message}: ${err.cause}`);
    response.writeHead(500, 'Internal Server Error', { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
}

const middlewareStack = [logger, validator, authenticator];

function getHostname(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'plaintext');
    res.end(os.hostname());
}

function serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse, staticFilename?: string): void {
    res.statusCode = 200;
    let subpath = '';
    if (!staticFilename) staticFilename = 'index.html';
    if (staticFilename.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
    } else if (staticFilename.endsWith('.js') || staticFilename.endsWith('.ts') || staticFilename.endsWith('.map')) {
        // res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Type', 'text/javascript');
        subpath = '/client-utils'
    } else {
        // res.statusCode = 404;
        // default404(req, res);
        res.writeHead(404, 'Not Found', { "content-type": 'application/json' });
        res.end(JSON.stringify({ err: 'Not Found' }));
        return;
    }
    // fs.createReadStream(__dirname + '/index.html').pipe(res);
    const readStream = fs.createReadStream(__dirname + subpath + '/' + staticFilename);

    readStream.on('error', (err) => {
        console.error(err);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        // res.end(`
        //     <h1>hi from ${os.hostname()}</h1>
        //     <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
        //     <p>Server received request: ${req}</p>
        //     <p>But there was an error while piping: ${err}</p>
        // `);
        res.end('Not Found');
    });

    readStream.pipe(res);

    setTimeout(() => {
        readStream.close(); // This may not close the stream.
        // Artificially marking end-of-stream, as if the underlying resource had
        // indicated end-of-file by itself, allows the stream to close.
        // This does not cancel pending read operations, and if there is such an
        // operation, the process may still not be able to exit successfully
        // until it finishes.
        readStream.push(null);
        readStream.read(0);
    }, 100);
}

export const routeHandler = new URITree({
    route: '/play',
    availableAssetsAtRoute: /^\/(setup|lotto-utils)\.[jt]s(\.map)?$/,
    assetServerHandler: () => {},
    handlerMap: {
        "GET": serveStaticFile,
    },
    childRoutes: {
        '/hostname': new URITree({
            route: '/play/hostname',
            handlerMap: {
                "GET": getHostname,
            }
        })
    }
})

const httpServerOnRequest = (request: http.IncomingMessage, response: http.ServerResponse<http.IncomingMessage> & { req: http.IncomingMessage; }) => {
    // putting similar logic to wssOnRequestFIXTHIS in here... actually can't really do that 
    // but refactoring and creating a middleware stack, loosely based on 
    // what Gemini told me Express's arch would be like at a very basic level 

    let index = 0; // the stage of the stack each request being handled is at 
    const next = (err?: Error) => {
        if (err) {
            errorHandler(err, request, response, next);
        } else if (index < middlewareStack.length) {
            // TODO validate... Cannot invoke an object which is possibly 'undefined'. It's defined as const above?? 
            // need to understand that error on a deeper level 
            middlewareStack[index++]!(request, response, next); 
        } else {
            routeHandler.handleRequest(request, response);
        }
    }
}

const httpServerOnUpgrade = (req: http.IncomingMessage, socket: Stream.Duplex, head: NonSharedBuffer) => {
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
}

export const setupHttpServerEventHandlers = (server: http.Server) => {
    // http.Server.on(eventName: keyof http.ServerEventMap<typeof http.IncomingMessage, typeof http.ServerResponse>
    server.on('request', httpServerOnRequest)
    server.on('upgrade', httpServerOnUpgrade)
    return server;
}