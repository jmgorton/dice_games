import os from 'os';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { 
    setupWebSocketEventHandlers,
    setupHttpServerEventHandlers
//  } from './server-utils/event-handlers.js';
} from '../shared/dist/server-setup.js';

import {
    // serveStaticFile,
    // getHostname,
    wssOnConnectionAlt,
    // wssOnConnectionOld,
    // wssOnConnectionTest,
} from './server-utils/event-handlers.js'
import { URITree } from '../shared/dist/types.js';

// import {
//     connectionArray, // TODO research how importing an array works ... can't assign, but can manipulate it seems 
//     originIsAllowed,
//     isUsernameUnique,
//     getConnectionForID,
//     // makeUserListMessage,
//     sendUserListToAll,
// } from './server-utils/helpers.js'

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
// const indexPathMatcher = /^\/play$/;
const routeHandler = new URITree({
    route: '/play',
    availableAssetsAtRoute: utilFilepathMatcher,
    // assetServerHandler: serveStaticFile,
    serverRootDir: __dirname,
    // handlerMap: {
    //     "GET": serveStaticFile, // will serve index by default 
    // },
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

function getHostname(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'plaintext');
    res.end(os.hostname());
}

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
    'connection': wssOnConnection, // wssOnConnectionOld, wssOnConnectionTest, wssOnConnectionAlt
});

// var appendToMakeUnique = 1;

const clients: {
    // [key: WebSocket]: any;
    // [key: string]: any; // { [key: string]: any };
    [key: string]: { 
        [key: string]: any;
        socket: WebSocket;
        username: string;
    };
    // id: { [key: string]: any };
    // id: string;
    // type: string;
} = {

}

function getConnectionForID(id: number) {
    let cx = Object.keys(clients).find((x: any) => x === id);
    // return cx.ws; 
    return cx ? clients[cx] : undefined;
}

function makeUserListMessage() {
    return {
        type: "userlist",
        users: Object.entries(clients).map(([clientId, clientInfo], index) => clientInfo.username ?? clientId ?? index)
    }
}

function generateClientID() {
    return Math.random().toString(36).substring(6, 15);
}

function getIpFromRequest(request: http.IncomingMessage): string | undefined {
    let ip;
    let headers = request.headers['x-forwarded-for']
    if (headers) {
        if (Array.isArray(headers)) headers = headers[0] ?? ''; // ip at 0, ig? 
        ip = headers.split(',')[0]?.trim();
    }
    if (!ip) ip = request.socket.remoteAddress; // fall back... would this just be nginx ip always? 
    return ip;
}

function wssOnConnection(this: WebSocketServer, ws: WebSocket, request: http.IncomingMessage) {

    const wss = this;

    const clientId = generateClientID();
    const ip = getIpFromRequest(request);

    clients[clientId] = { socket: ws, username: clientId, ip }

    // ws.addEventListener('message', (event: WebSocket.MessageEvent) => {
    //     console.log(`MessageEvent: ${event}`);
    //     ws.send(`Received message: ${event}`);
    // })

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

        // if (typeof data === 'string') {
        //     try {
        //         [messageType, message] = data.split('::');
        //         console.log(messageType, message);
        //     } catch (err: any) {
        //         console.warn('Message was not parsable');
        //     }
        // }

        try {
            message = JSON.parse(data.toString());
            // console.log(`MESSAGE: ${message}`)
            messageType = message["type"];
            Object.assign(messageInfo, message);
            // console.log(messageType, messageInfo);
        } catch (err: any) {
            if (err instanceof SyntaxError) {
                // console.warn('Message was not parsable');
                // console.log("error");
            }

            try {
                [messageType, message] = data.toString().split('::');
                // console.log(messageType, message);
            } catch (err: any) {
                console.warn('Message was not parsable');
            }
        }

        // let messageOut: any
        switch (messageType) {
            case "OPEN":
                // userlistMessage = f"USERS::{';'.join(userlist)}"
                const newUserlist: string = Object.keys(clients).map(client => clients[client]?.username ?? client ?? 'unknown').join(';')
                let messageOut: any = JSON.stringify({
                    type: "userlist",
                    // users: wss.clients.values().map(ws => message)
                    // users: message,
                    users: newUserlist,
                })
                wss.clients.add(this);
                // console.log(`Broadcasting to ${wss.clients.size} client(s)`);
                wss.clients.forEach(function each(client) { // wss.clients not working? 
                    if (client.readyState === WebSocket.OPEN) {
                        // client.send(`USERS::${request.socket.remoteAddress ?? 'Unknown'}`)
                        client.send(messageOut);
                    } else {
                        console.log(`Client ${client} not ready... ${client.readyState}`)
                    }
                });
                // Object.keys(clients).forEach((clientId) => {
                //     // console.log(`ClientId: ${clientId} -> Client: ${JSON.stringify(clients[clientId])}`)
                //     clients[clientId]?.socket?.send(messageOut);
                // });
                this.send(JSON.stringify({ type: "id", id: clientId }));
                break;
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
                wss.clients.forEach(function each(client) { // wss.clients not working? 
                    if (client.readyState === WebSocket.OPEN) {
                        // client.send(`USERS::${request.socket.remoteAddress ?? 'Unknown'}`)
                        client.send(JSON.stringify(msgOut));
                    } else {
                        console.log(`Client ${client} not ready... ${client.readyState}`)
                    }
                });
                break;
            case "ECHO":
            // default:
                console.log(`Failed to determine message type for input message: ${data}`)
                this.send(`ECHO: ${data}`);
                // ws.send(`Server received... ${data}`);
                break;
            default:
                ws.send(`Unrecognized message type: ${data}`);
                break;
        }
    })
};