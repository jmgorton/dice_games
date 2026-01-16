import http from 'http';
// import websocket from 'ws';
import WebSocket, { WebSocketServer } from 'ws';

import {
    connectionArray, // TODO research how importing an array works ... can't assign, but can manipulate it seems 
    originIsAllowed,
    isUsernameUnique,
    getConnectionForID,
    // makeUserListMessage,
    sendUserListToAll,
} from './helpers.js'

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
        // implicitly handled 
    });

    ws.on('redirect', (self: WebSocket, url: string, request: http.ClientRequest) => {

    });

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
};