// const http = require('http');
// const os = require('os');
// const fs = require('fs');

import http from 'http';
import os from 'os';
import fs from 'fs';
// import { WebSocketServer as websocket } from 'ws';

// const websocket = require('ws');

import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is a CommonJS-specific global variable, not available in ES module scope
// can replicate the functionality using the `import.meta.url` property and the 
// built-in path and url modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hostname = '0.0.0.0';
const port = 6502;


const server = http.createServer((req, res) => {

    console.log(`Received request: ${req.method} ${req.url}`);
    // res.statusCode = 200;
    // res.setHeader('Content-Type', 'text/html');
    // res.end('<h1>hi from websock! ' + os.hostname() + '</h1>\n' + '<a href="http://localhost:1313">Home</a>');

    if (/^\/$/.test(req.url)) { // not used maybe? routing done by Nginx 
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        fs.createReadStream(__dirname + '/index.html').pipe(res);
    } else if (/^\/test$/.test(req.url)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        fs.createReadStream(__dirname + '/index.html').pipe(res);
    } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>hi from ' + os.hostname() + '\s http route not found page!</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
        + '<p>please go back to the <a href="http://localhost:1313">homepage</a></p>');
    }
});

server.listen(port, hostname, () => {
    console.log(`Simple HTTP server running at http://${hostname}:${port}/ :)`);
});

// const wsserver = new websocket.Server({ server: server });

// wsserver.on('connection', ws => {
//     ws.on('message', message => {
//         console.log(`Received message: ${message}`);
//     });

//     ws.send('Hello from the websocket server...');
// });