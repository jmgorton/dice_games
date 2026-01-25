import os from 'os';
import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

import { 
    setupWebSocketEventHandlers,
    setupHttpServerEventHandlers
//  } from './server-utils/event-handlers.js';
} from '../shared/dist/server-setup.js';

import { URITree } from '../shared/dist/types.js';

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
        // users: Object.entries(clients).map(([clientId, clientInfo], index) => clientInfo.username ?? clientId ?? index)
        users: Object.keys(clients).map(client => clients[client]?.username ?? client ?? 'unknown').join(';')
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



// type MessageTypeFromClient = "OPEN" | "MESSAGE" | "ECHO";
const validInputMessageTypes = ["OPEN", "MESSAGE", "ECHO"];
type MessageTypeFromClient = typeof validInputMessageTypes[number];

interface MessageIn {
    [key: string]: any;
    type: MessageTypeFromClient;
}

function wssOnConnection(this: WebSocketServer, ws: WebSocket, request: http.IncomingMessage) {

    const wss = this;

    const clientId = generateClientID();
    const ip = getIpFromRequest(request);

    clients[clientId] = { socket: ws, username: clientId, ip }

    const broadcast = (msg: any) => {
        
        console.log(`Broadcasting to ${wss.clients.size} client(s)`);
        wss.clients.forEach(function each(client) { 
            if (client.readyState === WebSocket.OPEN) {
                // client.send(`USERS::${request.socket.remoteAddress ?? 'Unknown'}`)
                client.send(msg);
            } else {
                // console.log(`Client ${client} not ready... ${client.readyState}`)
            }
        });
        // Object.keys(clients).forEach((clientId) => {
        //     // console.log(`ClientId: ${clientId} -> Client: ${JSON.stringify(clients[clientId])}`)
        //     clients[clientId]?.socket?.send(messageOut);
        // });
    }

    const broadcastExcludeSelf = (msg: any) => {
        console.log(`Broadcasting (excluding self) to ${wss.clients.size - 1} client(s)`);
        wss.clients.forEach(function each(client) { 
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                // client.send(`USERS::${request.socket.remoteAddress ?? 'Unknown'}`)
                client.send(msg);
            } else {
                // console.log(`Client ${client} not ready... ${client.readyState}`)
            }
        });
    }

    // listener for message of expected format: `{{type}}::{{data}}` 
    const stringMessageParser = (event: WebSocket.MessageEvent): MessageIn | undefined => {
        // console.log(`MessageEvent: ${event}`);
        // ws.send(`Received message: ${event}`);
        // const { target, data, type}: { 
        //     target: WebSocket, 
        //     data: WebSocket.Data, data = [79,80,69,78,58,58,74,97,...]
        //     type: string // type = Buffer
        // } = {...event};
        const data = event;
        // let message, messageType: string | undefined;
        let message: MessageIn = {
            type: 'ECHO'
        }
        try {
            const dataEls = data.toString().split('::');
            // console.log(messageType, message);
            if (!dataEls || dataEls.length !== 2 || !dataEls[0]) return undefined;
            if (validInputMessageTypes.includes(dataEls[0])) {
                message.type = dataEls[0];
                switch (message.type) {
                    case "MESSAGE":
                        message.text = dataEls[1];
                        break;
                    case "OPEN":
                        message.username = dataEls[1];
                        break;
                    default: // ECHO 
                        message.content = dataEls[1];
                }
            } else {
                message.content = data;
            }
            return message;
        } catch (err: any) {
            // console.warn('Message was not parsable');
            return undefined;
        }
    };
    // ws.addEventListener('message', stringMessageHandler);

    // TODO make WebSocket target or keep as `this`? 
    const jsonMessageParser = function (this: WebSocket, data: WebSocket.RawData, isBinary: boolean): MessageIn | undefined {
        let message: WebSocket.RawData = data;
        // console.log(`DATA: ${data}`);
        let messageInfo: MessageIn = {
            id: undefined,
            type: 'ECHO',
            name: undefined,
            text: undefined,
        }

        try {
            message = JSON.parse(data.toString());
            // console.log(`MESSAGE: ${message}`)
            Object.assign(messageInfo, message);
            return messageInfo;
        } catch (err: any) {
            if (err instanceof SyntaxError) {
                // console.warn('Message was not parsable');
            }
            return undefined;
        }
    };

    // const echoMessage = (event: WebSocket.MessageEvent) => {
    //     // console.log(`MessageEvent: ${event}`);
    //     ws.send(`ECHO: ${event}`);
    // }

    // const parsers = [stringMessageParser, jsonMessageParser];
    const parseMessageFromEvent = (event: WebSocket.MessageEvent): MessageIn => {
        // const { target, data, type}: { 
        //     target: WebSocket, 
        //     data: WebSocket.Data, // need WebSocket.RawData
        //     type: string 
        // } = {...event};
        const data = event;
        // console.log(`Attempting to parse ${data}`);
        if (!data) return { type: "ECHO", content: data };
        // WebSocket.Data: a broad union type 
        //  (often string | Buffer | ArrayBuffer | Buffer[]) 
        //  string | ArrayBuffer | Buffer<ArrayBufferLike> | Buffer<ArrayBufferLike>[]
        // WebSocket.RawData: a union of Buffer | ArrayBuffer | Buffer[] 
        // because the library treats raw incoming frames as binary buffers
        //      before they are optionally decoded.

        const isBinary = false; // TODO does this relate to type? How to find? 
        // const possibleArgs = {event, data: event.data, isBinary};
        let messageIn = stringMessageParser(event);
        // for (const parser of parsers) {
        //     messageIn = parser(this: event.target, {...possibleArgs})
        // }
        let dataBuffer = undefined;
        if (Buffer.isBuffer(data)) dataBuffer = data;
        else if (Array.isArray(data)) dataBuffer = Buffer.from(data.join())
        else if (typeof data === 'string') dataBuffer = Buffer.from(data)
        // else dataBuffer = Buffer.from(data) // data instanceof ArrayBuffer
        if (!dataBuffer) {
            console.log(`Could not build data buffer from data: ${data}`);
            return {
                type: "ECHO",
                content: data,
            }
        }

        // console.log(`About to call JSON Parser with args: ${target}, ${dataBuffer}`)
        if (!messageIn) messageIn = jsonMessageParser.call(event.target, dataBuffer, isBinary);
        if (!messageIn) {
            console.log(`Unparsable message received: ${event}`);
            // return undefined;
            return {
                type: "ECHO",
                content: data,
            }
        }
        return messageIn;
    }


    ws.on('message', (event: WebSocket.MessageEvent) => {
        // console.log(`MessageEvent: ${event} ... ${JSON.stringify(event)}`);
        // ws.send(`Received message: ${event}`);
        const messageIn: MessageIn = parseMessageFromEvent(event);
        // const { target, data, type}: { 
        //     target: WebSocket, 
        //     data: WebSocket.Data, // need WebSocket.RawData ... for RawData, just pass in event 
        //     type: string 
        // } = {...event};
        const data = event;
        // console.log(`Parsed event and got ${JSON.stringify(messageIn)}`);

        // let messageOut: any
        switch (messageIn.type) {
            case "OPEN":
                if (clients && clientId in clients) clients[clientId]!.username = messageIn.username; 
                // let messageOut: any = JSON.stringify({
                //     type: "userlist",
                //     users: makeUserListMessage(),
                // });
                let messageOut = JSON.stringify(makeUserListMessage());
                // wss.clients.add(this);
                ws.send(JSON.stringify({ type: "id", id: clientId, name: messageIn.username })); // target undefined ??? 
                broadcast(messageOut);
                break;
            case "MESSAGE":
                const sender = clients[messageIn.id]; //  ?? clients[clientId];
                let msgOut = {
                    type: 'message',
                    text: messageIn.text,
                    name: sender?.username ?? 'unknown', // ?? 
                    // date: Date.now(),
                    date: messageIn.date ?? Date.now(),
                }
                broadcastExcludeSelf(JSON.stringify(msgOut));
                ws.send(JSON.stringify({ ...msgOut, id: messageIn.id }))
                break;
            case "ECHO":
                // console.log(`Failed to determine message type for input message: ${data}`)
                ws.send(`ECHO: ${messageIn?.content ?? data}`); // target is undefined ??? 
                break;
            default:
                console.log(`Unrecognized message type: ${data}`);
                break;
        }
    });
};