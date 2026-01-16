// const http = require('http');
// const os = require('os');
// const websocket = require('ws');

import fs, { read } from 'fs';
import http from 'http';
import os from 'os';
// import websocket from 'ws';
import { WebSocketServer } from 'ws';

import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is a CommonJS-specific global variable, not available in ES module scope
// can replicate the functionality using the `import.meta.url` property and the 
// built-in path and url modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hostname = '0.0.0.0';
const port = 9090;

var connectionArray: any[] = [];
var nextID = Date.now();
var appendToMakeUnique = 1;

// const wsserver = new websocket.Server({ port: port });

// wsserver.on('connection', ws => {
//     ws.on('message', message => {
//         console.log(`Received message: ${message}`);
//     });

//     ws.send('Hello from the websocket server...');
// });

// You can serve both HTTP (like REST) and WebSocket (WS) traffic 
// from the same server, even on the same port, because WebSockets 
// start as an HTTP request with an Upgrade header, allowing a 
// single server application to differentiate and handle both 
// protocols using the same port. The server identifies WebSocket 
// connections by looking for the initial HTTP Upgrade request and 
// then switches to the persistent WebSocket protocol, while 
// regular HTTP requests are handled as normal.

type HTTPMethod = "GET" // | "POST" | "PUT" | "DELETE" // | etc.

interface URITreeData {
    route: string;
    handlerMap?: { [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void) };
    childRoutes?: { [route: string]: URITree };
}

class URITree implements URITreeData {
    // root: URITreeNode | undefined = undefined;
    route: string = '/';
    handlerMap?: { [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void) };
    childRoutes?: { [route: string]: URITree };

    constructor(data: URITreeData) {
        Object.assign(this, data);
    }

    // fulfillRequest(request: http.IncomingMessage): void {
    fulfillRequest(request: http.IncomingMessage, response: http.ServerResponse): void {
        // console.log(`Node ${this.route} attempting to handle request: ${request.method} ${request.url}`)
        // const requestMethod: HTTPMethod = request.method as HTTPMethod;
        // const requestMethod: string | undefined = request.method;
        const requestPath: string | undefined = request.url;

        if (!requestPath || !requestPath.startsWith(this.route)) {
            console.log(`URITree: 404 at ${this.route} for request: ${request.method} ${request.url}`);
            default404(request, response);
            return;
        }

        const remainingPath = requestPath.substring(this.route.length);
        if (!remainingPath || remainingPath.startsWith('?')) {
            // ignore remaining path (query params) and serve
            // only GET methods supported right now, smh 
            if (!this.handlerMap) {
                console.log(`URITree: serve 404 at ${this.route} for request: ${request.method} ${request.url}`);
                default404(request, response);
                return;
            } else {
                console.log(`URITree: execute handlerMap at ${this.route}`);
                this.handlerMap["GET"]!(request, response); // TODO validate later, for now it's fine and obvious 
                return;
            }
        } else {
            const delimiterIndex = remainingPath.indexOf('/', 1); // first char is usually a slash 
            const delimited = delimiterIndex > -1 ? remainingPath.substring(0, delimiterIndex) : remainingPath;
            // just assume the uri was not something wierd... if it was, just return 404. 
            // there are way too many special/reserved characters in an HTTP URI path to handle all of them 
            if (!this.childRoutes || !(delimited in this.childRoutes)) {
                if (/^\/(setup|lotto-utils)\.[jt]s(\.map)?$/.test(delimited)) { // can be fulfilled from any path in URI?? 
                    console.log(`URITree: serve static file: ${delimited.substring(1)}`)
                    serveStaticFile(request, response, delimited.substring(1));
                    return;
                }
                console.log(`URITree: return 404 after failing to match ${delimited}`);
                default404(request, response);
                return;
            } else {
                console.log(`Node ${this.route} will allow child ${delimited} to fulfill request.`);
                this.childRoutes[delimited]?.fulfillRequest(request, response);
                return;
            }
        }
    }
}

function default404(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<p>the page you requested was not found... bummer!</p>'
        + '<p>this is websockb\'s default 404 page! please go back to the <a href="http://localhost:1313/test">/test homepage</a></p>');
}

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
        default404(req, res);
        return;
    }
    // fs.createReadStream(__dirname + '/index.html').pipe(res);
    const readStream = fs.createReadStream(__dirname + subpath + '/' + staticFilename);

    readStream.on('error', (err) => {
        console.error(err);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>hi from ${os.hostname()}</h1>
            <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
            <p>Server received request: ${req}</p>
            <p>But there was an error while piping: ${err}</p>
        `);
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

const handlerTree = new URITree({
    route: '/test',
    handlerMap: {
        "GET": serveStaticFile,
    },
    childRoutes: {
        '/hostname': new URITree({
            route: '/test/hostname',
            handlerMap: {
                "GET": getHostname,
            }
        })
    }
})

const server = http.createServer((req, res) => {

    if (!req || !req.method || !req.url) return;
    console.log(`Received request: ${req.method} ${req.url}`);
    // res.statusCode = 200;
    // res.setHeader('Content-Type', 'text/html');
    // res.end('<h1>hi from websock! ' + os.hostname() + '</h1>\n' + '<a href="http://localhost:1313">Home</a>');

    handlerTree.fulfillRequest(req, res);

    // // all req.url values here should start with /test (thanks to nginx)
    // if (/^\/test$/.test(req.url)) {
    //     // console.log(`Serving assets for /test`);
    //     // res.statusCode = 200;
    //     // res.setHeader('Content-Type', 'text/html');
    //     // fs.createReadStream(__dirname + '/index.html').pipe(res);
    //     serveStaticFile(req, res);
    // } else if (/^\/test\/hostname$/.test(req.url)) {
    //     getHostname(req, res);
    // } else if (/^\/test\/(lotto-utils|setups)\..*.[jt]s$/.test(req.url)) {
    //     const staticFilename = req.url?.substring(6);
    //     serveStaticFile(req, res, staticFilename);
    // } else {
    //     default404(req, res);
    // }
});

server.listen(port, hostname, () => {
    console.log(`HTTP server running at http://${hostname}:${port}/ :)`);
});

// this is CommonJS syntax (`websocket.Server`)
// after migrating to TS and ES modules: Property 'Server' does not exist on type 'typeof WebSocket'.
// fix: import { WebSocketServer } from 'ws';
// var WebSocketServer = websocket.Server, wss = new WebSocketServer({ port: port }); // was 8010 in example
// var wss = new websocket.Server({ server: server });
const wss: WebSocketServer = new WebSocketServer({ server: server }); // ES module syntax 

// The two servers can't both bind to the same port independently. Use the same server object
// and implement the protocols from within, allowing one server at the point to handle both types of requests
// WebSocket connections start as an HTTP request with an `Upgrade` header. The server handles regular
// HTTP requests normally, and upgrades matching WS requests to use the persistent websocket protocol. 

// if (wss) console.log("websocket Server started");

// (method) Server<typeof WebSocket, typeof IncomingMessage>.on(
//      event: "connection", 
//      cb: (
//          this: Server<typeof WebSocket, 
//          typeof http.IncomingMessage>, 
//          websocket: WebSocket, 
//          request: http.IncomingMessage
//      ) => void
// ): Server<typeof WebSocket, typeof http.IncomingMessage> (+5 overloads)
wss.on('connection', function (ws: any) { // TODO figure out this type ... 
    // Property 'on' does not exist on type 'WebSocket'.
    // Property 'send' does not exist on type 'WebSocketServer'.
    // maybe ws is somehow a reference to `this`? that is the first arg expected... 
    // (method) WebSocket.on(
    //      event: "message", 
    //      listener: (
    //          this: WebSocket, 
    //          data: WebSocket.RawData, 
    //          isBinary: boolean
    //      ) => void
    // ): WebSocket (+8 overloads)
    ws.on('message', function (message: any) {
        console.log('Received from client: %s', message);
        ws.send(JSON.stringify('Server received from client: ' + message));
    });

    ws.on('message', function (message: any) { // TODO type this later 
        console.log("***MESSAGE: %s", message);
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
});

/** start helper methods */

function originIsAllowed(origin: any) {
    // This is where you put code to ensure the connection should
    // be accepted. Return false if it shouldn't be.
    return true;
}

function isUsernameUnique(name: string) {
    var isUnique = true;
    var i;

    for (i = 0; i < connectionArray.length; i++) {
        if (connectionArray[i].username === name) {
            isUnique = false;
            break;
        }
    }
    return isUnique;
}

function getConnectionForID(id: number) {
    var connect = null;
    var i;

    for (i = 0; i < connectionArray.length; i++) {
        if (connectionArray[i].clientID === id) {
            connect = connectionArray[i];
            break;
        }
    }

    return connect;
}

function makeUserListMessage() {
    var userListMsg = {
        type: "userlist",
        users: [] as string[],
    };
    var i;

    // Add the users to the list

    for (i = 0; i < connectionArray.length; i++) {
        userListMsg.users.push(connectionArray[i].username);
    }

    return userListMsg;
}

function sendUserListToAll() {
    var userListMsg = makeUserListMessage();
    var userListMsgStr = JSON.stringify(userListMsg);
    var i;

    for (i = 0; i < connectionArray.length; i++) {
        connectionArray[i].sendUTF(userListMsgStr);
    }
}

/** end helper methods */
// req: http.IncomingMessage, res: http.ServerResponse
wss.on('request', function (request) {
    console.log("Handling request from " + request.origin);
    if (!originIsAllowed(request.origin)) {
        request.reject();
        console.log("Connection from " + request.origin + " rejected.");
        return;
    }

    // Accept the request and get a connection.
    var connection = request.accept("json", request.origin);

    // Add the new connection to our list of connections.
    console.log((new Date()) + " Connection accepted.");
    connectionArray.push(connection);

    // Send the new client its token; it will
    // respond with its login username.
    connection.clientID = nextID;
    nextID++;

    var msg = {
        type: "id",
        id: connection.clientID
    };
    connection.sendUTF(JSON.stringify(msg));

    // Handle the "message" event received over WebSocket. This
    // is a message sent by a client, and may be text to share with
    // other users or a command to the server.

    connection.on('message', function (message: any) { // TODO type this later
        console.log("***MESSAGE");
        if (message.type === 'utf8') {
            console.log("Received Message: " + message.utf8Data);

            // Process messages
            var sendToClients = true;
            msg = JSON.parse(message.utf8Data);
            var connect = getConnectionForID(msg.id);
            if (!connect || !('name' in msg)) return;

            // Look at the received message type and
            // handle it appropriately.
            switch (msg.type) {
                // Public text message in the chat room
                case "message":
                    if (!('text' in msg)) return;
                    msg.name = connect.username;
                    msg.text = (msg.text as string).replace(/(<([^>]+)>)/ig, "");
                    break;

                // Username change request
                case "username":
                    var nameChanged = false;
                    var origName = msg.name;

                    // Force a unique username by appending
                    // increasing digits until it's unique.
                    while (!isUsernameUnique(msg.name as string)) {
                        msg.name = origName as string + appendToMakeUnique;
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

    // Handle the WebSocket "close" event; this means a user has logged off
    // or has been disconnected.

    connection.on('close', function (connection: any) {
        connectionArray = connectionArray.filter(function (el, idx, ar) {
            return el.connected;
        });
        sendUserListToAll();  // Update the user lists
        console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
    });
});
