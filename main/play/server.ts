import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { 
    setupWebSocketEventHandlers,
    setupHttpServerEventHandlers
//  } from './server-utils/event-handlers.js';
} from '../shared/dist/server-setup.js';

import {
    serveStaticFile,
    getHostname,
} from './server-utils/event-handlers.js'
import { URITree } from '../shared/dist/types.js';

import {
    connectionArray, // TODO research how importing an array works ... can't assign, but can manipulate it seems 
    originIsAllowed,
    isUsernameUnique,
    getConnectionForID,
    // makeUserListMessage,
    sendUserListToAll,
} from './server-utils/helpers.js'

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

// You can serve both HTTP (like REST) and WebSocket (WS) traffic 
// from the same server, even on the same port, because WebSockets 
// start as an HTTP request with an Upgrade header, allowing a 
// single server application to differentiate and handle both 
// protocols using the same port. The server identifies WebSocket 
// connections by looking for the initial HTTP Upgrade request and 
// then switches to the persistent WebSocket protocol, while 
// regular HTTP requests are handled as normal.

const utilFilepathMatcher = /^\/play\/((?:setup|lotto-utils)\.[jt]s(?:\.map)?)$/;
const routeHandler = new URITree({
    route: '/play',
    availableAssetsAtRoute: utilFilepathMatcher,
    // assetServerHandler: serveStaticFile,
    handlerMap: {
        "GET": serveStaticFile,
    },
    childRoutes: {
        'hostname': new URITree({
            route: '/play/hostname',
            handlerMap: {
                "GET": getHostname,
            }
        })
    }
})

const server = setupHttpServerEventHandlers(
    http.createServer(),
    routeHandler,
);

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
    console.log(`WS server bound and listening on ${protocol}://${hostname}:${port}${uriBase} :)`);
});
// The two servers can't both bind to the same port independently. Use the same server object
// and implement the protocols from within, allowing one server at the point to handle both types of requests
// WebSocket connections start as an HTTP request with an `Upgrade` header. The server handles regular
// HTTP requests normally, and upgrades matching WS requests to use the persistent websocket protocol. 



setupWebSocketEventHandlers(wss, {
    'connection': [wssOnConnection, wssOnConnectionOld],
});

var appendToMakeUnique = 1;

function wssOnConnection(this: WebSocketServer, ws: WebSocket, request: http.IncomingMessage) {

    const wss = this;

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

    ws.on('open', function (this: WebSocket) {
        // implicitly handled server-side 
    });

    ws.on('redirect', function (this: WebSocket, url: string, request: http.ClientRequest) {

    });

    // this is an event that should (maybe) be bound to the http server ... as well? or instead? 
    // i guess both servers might do something different on this event 
    ws.on('upgrade', function (this: WebSocket, request: http.IncomingMessage) {

    });

    ws.on('error', function (this: WebSocket, error: Error) {

    });

    ws.on('unexpected-response', function (this: WebSocket, request: http.ClientRequest, response: http.IncomingMessage) {

    });

    ws.on('ping', function (this: WebSocket, data: Buffer) {

    });

    ws.on('pong', function (this: WebSocket, data: Buffer) {
        
    });

    ws.on('message', function (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) {
        let message: WebSocket.RawData | any = data;
        console.log(`DATA: ${data}`);
        let messageType: string | any = 'ECHO';
        let messageInfo = {
            id: undefined,
            type: undefined,
            name: undefined,
            text: undefined,
        }
        try {
            message = JSON.parse(data.toString());
            console.log(`MESSAGE: ${message}`)
            messageType = message.type;
            Object.assign(messageInfo, message);
        } catch (err: any) {
            if (err instanceof SyntaxError) {
                // console.warn('Message was not parsable');
            }

            try {
                [messageType, message] = data.toString().split('::');
            } catch (err: any) {
                console.warn('Message was not parsable');
            }
        }

        // let messageOut: any
        switch (messageType) {
            case "OPEN":
                // userlistMessage = f"USERS::{';'.join(userlist)}"
                let messageOut: any = JSON.stringify({
                    type: "userlist",
                    // users: wss.clients.values().map(ws => message)
                    users: [message],
                })
                wss.clients.forEach(function each(client) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        // client.send(`USERS::${request.socket.remoteAddress ?? 'Unknown'}`)
                        client.send(messageOut);
                    }
                })
            case "MESSAGE":
                // var msg = {
                //     text: textEl.value,
                //     type: "message",
                //     id: clientID,
                //     date: Date.now()
                // };
                let msgOut = {
                    type: 'message',
                    text: message.text,
                    name: 'Jeff',
                    date: Date.now(),
                }
        }
        // if (message.type === 'utf8') {
        //     console.log("Received Message: " + message.utf8Data);

        //     // Process messages
        //     var sendToClients = true;
        //     msg = JSON.parse(message.utf8Data);
        //     var connect = getConnectionForID(msg.id);
        //     if (!connect || !('name' in msg)) return;

        //     // Look at the received message type and
        //     // handle it appropriately.
        //     switch (msg.type) {
        //         // Public text message in the chat room
        //         case "message":
        //             if (!('text' in msg)) return;
        //             msg.name = connect.username;
        //             msg.text = (msg.text as string).replace(/(<([^>]+)>)/ig, "");
        //             break;

        //         // Username change request
        //         case "username":
        //             var nameChanged = false;
        //             var origName = msg.name;

        //             // Force a unique username by appending
        //             // increasing digits until it's unique.
        //             while (!isUsernameUnique(msg.name as string)) {
        //                 msg.name = origName as string + appendToMakeUnique;
        //                 appendToMakeUnique++;
        //                 nameChanged = true;
        //             }

        //             // If the name had to be changed, reject the
        //             // original username and let the other user
        //             // know their revised name.
        //             if (nameChanged) {
        //                 var changeMsg = {
        //                     id: msg.id,
        //                     type: "rejectusername",
        //                     name: msg.name
        //                 };
        //                 connect.sendUTF(JSON.stringify(changeMsg));
        //             }

        //             connect.username = msg.name;
        //             sendUserListToAll();
        //             break;
        //     }

        //     // Convert the message back to JSON and send it out
        //     // to all clients.
        //     if (sendToClients) {
        //         var msgString = JSON.stringify(msg);
        //         var i;

        //         for (i = 0; i < connectionArray.length; i++) {
        //             connectionArray[i].sendUTF(msgString);
        //         }
        //     }
        // }
    })

    ws.on('close', (code: number, reason: Buffer) => {
        // // connectionArray = connectionArray.filter(function (el, idx, ar) {
        // //     return el.connected;
        // // });
        // const toRemoveIndex = connectionArray.findIndex(el => !el.connected);
        // connectionArray.splice(toRemoveIndex, 1);
        // sendUserListToAll();  // Update the user lists
        // console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
    });
};

function wssOnConnectionOld (this: WebSocketServer, ws: WebSocket, request: http.IncomingMessage) {

    ws.on('message', function (message: any) { // TODO type this later ???
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