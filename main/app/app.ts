import http from 'http';
// import os from 'os';
import fs from 'fs';
import WebSocket, { WebSocketServer } from 'ws';

import path from 'path';
import { fileURLToPath } from 'url';

// import { URITree } from '@shared/types.js'
import { URITree } from '../shared/dist/types.js'
import { setupHttpServerEventHandlers, setupWebSocketEventHandlers } from '../shared/dist/server-setup.js';
import {
    getHostname,
    getUptime,
    getNotFound,
} from './server-utils/responses.js'

// __dirname is a CommonJS-specific global variable, not available in ES module scope
// can replicate the functionality using the `import.meta.url` property and the 
// built-in path and url modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hostname = '0.0.0.0';
const port = 3000;

const availableAssetsRegex = /^\/((?:app\.css|(?:setup|utils(?:-(?:ui|socket))?)\.(?:.*)[jt]s(?:\.map)?))$/;

const routeHandler = new URITree({
    route: '/',
    availableAssetsAtRoute: availableAssetsRegex,
    // assetServerHandler: serveStaticAsset,
    serverRootDir: __dirname,
    // handlerMap: {
    //     'GET': getRoot, // will serve index by default 
    // },
    default404Response: getNotFound,
    childRoutes: {
        'chat': new URITree({
            route: '/chat',
            serverRootDir: path.join(__dirname, 'chat'),
        }),
        'hostname': new URITree({
            route: '/hostname',
            handlerMap: {
                'GET': getHostname,
            }
        }),
        'uptime': new URITree({
            route: '/uptime',
            handlerMap: {
                'GET': getUptime,
            }
        }),
    }
});

// server entrypoint for base uri
// hosts a simple http server listening on internal port 3000
// receives requests and returns static assets such as html/js
// including index.html, utils.ts, and utils-socket.ts to the 
// client, those assets are served on subsequent requests

// const server = http.createServer((req, res) => {
//     // function createServer<typeof http.IncomingMessage, typeof http.ServerResponse>
//     // (requestListener?: 
//     //  http.RequestListener<typeof http.IncomingMessage, typeof http.ServerResponse> | undefined): 
//     //  http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
//     // req = http.IncomingMessage
//     // res = http.ServerResponse 

//     routeHandler.handleRequest(req, res);
// });
const server = setupHttpServerEventHandlers(http.createServer(), routeHandler);

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/ :)`);
});

const wss: WebSocketServer = new WebSocketServer({ server: server }, () => {
    console.log(`WS server bound and listening on http://${hostname}:${port}/ :)`);
});

setupWebSocketEventHandlers(wss, {
    'connection': wssOnConnection,
});

const validInputMessageTypes = ["OPEN", "MESSAGE", "PING", "ECHO"];
type MessageTypeFromClient = typeof validInputMessageTypes[number];

interface MessageIn {
    [key: string]: any;
    type: MessageTypeFromClient;
}

function getContainerUptimeSeconds(): number {
    try {
        return process.uptime();
    } catch (error) {
        console.error("Error fetching process uptime:", error);
        try {
            console.error("Error reading /proc files:", error);
            const statData = fs.readFileSync('/proc/1/stat', 'utf8');
            const statFields = statData.split(' ');
            const startTimeJiffies = parseInt(statFields[21] ?? "0", 10);
            const uptimeData = fs.readFileSync('/proc/uptime', 'utf8');
            const uptimeFields = uptimeData.split(' ');
            const containerSystemUptimeSeconds = parseFloat(uptimeFields[0] ?? "0");
            const HZ = 100;
            const containerUptimeSeconds = containerSystemUptimeSeconds - (startTimeJiffies / HZ);
            return Math.max(0, containerUptimeSeconds);
        } catch (error) {
            console.error("Error reading /proc files for uptime:", error);
            return -1; // Indicate an error in fetching uptime
        }
        // return process.uptime();
    }
}

const clients: {
    [key: string]: {
        [key: string]: any;
        socket: WebSocket;
        username: string;
    };
} = {};

function makeUserListMessage() {
    return {
        type: "userlist",
        users: Object.keys(clients).map(client => clients[client]?.username ?? client ?? 'unknown').join(';')
    }
}

function generateClientID() {
    return Math.random().toString(36).substring(6, 15);
}

function wssOnConnection(this: WebSocketServer, ws: WebSocket) {
    const wss = this;
    const clientId = generateClientID();

    // clients[clientId] = { socket: ws, username: clientId };

    const broadcast = (msg: any) => {
        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    };

    const broadcastExcludeSelf = (msg: any) => {
        wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    };

    const stringMessageParser = (event: WebSocket.MessageEvent): MessageIn | undefined => {
        const data = event;
        let message: MessageIn = {
            type: 'ECHO'
        };
        try {
            const dataEls = data.toString().split('::');
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
                    default:
                        message.content = dataEls[1];
                }
            } else {
                message.content = data;
            }
            return message;
        } catch (err: any) {
            return undefined;
        }
    };

    const jsonMessageParser = function (this: WebSocket, data: WebSocket.RawData, isBinary: boolean): MessageIn | undefined {
        let message: WebSocket.RawData = data;
        let messageInfo: MessageIn = {
            id: undefined,
            type: 'ECHO',
            name: undefined,
            text: undefined,
        };

        try {
            message = JSON.parse(data.toString());
            Object.assign(messageInfo, message);
            return messageInfo;
        } catch (err: any) {
            if (err instanceof SyntaxError) {
                // Ignore parse errors
            }
            return undefined;
        }
    };

    const parseMessageFromEvent = (event: WebSocket.MessageEvent): MessageIn => {
        const data = event;
        if (!data) return { type: "ECHO", content: data };

        const isBinary = false;
        let messageIn = stringMessageParser(event);
        let dataBuffer = undefined;
        if (Buffer.isBuffer(data)) dataBuffer = data;
        else if (Array.isArray(data)) dataBuffer = Buffer.from(data.join());
        else if (typeof data === 'string') dataBuffer = Buffer.from(data);
        if (!dataBuffer) {
            return {
                type: "ECHO",
                content: data,
            };
        }

        if (!messageIn) messageIn = jsonMessageParser.call(event.target, dataBuffer, isBinary);
        if (!messageIn) {
            return {
                type: "ECHO",
                content: data,
            };
        }
        return messageIn;
    };

    ws.on('message', (event: WebSocket.MessageEvent) => {
        const messageIn: MessageIn = parseMessageFromEvent(event);

        switch (messageIn.type) {
            case "OPEN":
                const username = messageIn.username || clientId;
                clients[clientId] = { socket: ws, username };
                ws.send(JSON.stringify({ type: "id", id: clientId, name: username }));
                broadcast(JSON.stringify(makeUserListMessage()));
                break;
            case "MESSAGE":
                const sender = clients[messageIn.id];
                const msgOut = {
                    type: 'message',
                    text: messageIn.text,
                    name: sender?.username ?? 'unknown',
                    date: messageIn.date ?? Date.now(),
                };
                broadcastExcludeSelf(JSON.stringify(msgOut));
                ws.send(JSON.stringify({ ...msgOut, id: messageIn.id }));
                break;
            case "PING":
                const sentAt = typeof messageIn.sentAt === 'number' ? messageIn.sentAt : Date.now();
                ws.send(JSON.stringify({
                    type: "PONG",
                    sentAt,
                    serverTime: Date.now(),
                    uptime: getContainerUptimeSeconds(),
                }));
                break;
            case "ECHO":
                ws.send(`ECHO: ${messageIn?.content ?? event}`);
                break;
            default:
                break;
        }
    });
}

export function getRoot(req: http.IncomingMessage, res: http.ServerResponse) {
    // console.log(`Getting root for req: ${req.method} ${req.url}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    const readStream = fs.createReadStream(__dirname + '/index.html');

    readStream.pipe(res);

    readStream.on('error', (err) => {
        console.error(err);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        // res.end(`
        //     <h1>hi from ${os.hostname()}</h1>
        //     <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
        //     <p>Server received request: ${req}</p>
        //     <p>But there was an error while piping: ${err}</p>
        // `);
        res.end(`Error fetching file.`);
    })

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

// function serveStaticAsset(req: http.IncomingMessage, res: http.ServerResponse) {
//     // console.log(`Serving static asset for ${req.method} ${req.url}`)
//     const fileMatcher = availableAssetsRegex;
//     const parsedRequestURL = req.url?.match(fileMatcher);
//     if (!parsedRequestURL || !parsedRequestURL[1]) {
//         // console.log(`No match for ${parsedRequestURL}`);
//         res.writeHead(404, { "content-type": "application/json" });
//         res.end(JSON.stringify({ error: 'Not Found' }));
//     } else {
//         // console.log(`From ${parsedRequestURL[0]}, found asset ${parsedRequestURL[1]}`);
//         // getUtilByName(req, res, parsedRequestURL[1]);
//         res.statusCode = 200;
//         res.setHeader('Content-Type', 'text/javascript'); // TODO assets that aren't js 
//         // const clientUtilsDirname = "/client-utils";
//         const utilFilePath = `${__dirname}/client-utils/${parsedRequestURL[1]}`;
//         // console.log(`About to serve file: ${utilFilePath}`)
//         // fs.createReadStream(utilFilePath).pipe(res);
//         const readStream = fs.createReadStream(utilFilePath);

//         readStream.pipe(res);

//         readStream.on('error', (err) => {
//             console.error(err);
//             res.writeHead(404, { 'Content-Type': 'text/plain' });
//             // res.end(`
//             //     <h1>hi from ${os.hostname()}</h1>
//             //     <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
//             //     <p>Server received request: ${req}</p>
//             //     <p>But there was an error while piping: ${err}</p>
//             // `);
//             res.end('Error fetching file.');
//         })

//         setTimeout(() => {
//             readStream.close(); // This may not close the stream.
//             // Artificially marking end-of-stream, as if the underlying resource had
//             // indicated end-of-file by itself, allows the stream to close.
//             // This does not cancel pending read operations, and if there is such an
//             // operation, the process may still not be able to exit successfully
//             // until it finishes.
//             readStream.push(null);
//             readStream.read(0);
//         }, 100);
//     }
// }
