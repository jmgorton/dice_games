const http = require('http');
const os = require('os');
const websocket = require('ws');

const hostname = '0.0.0.0';
const port = 9090;

// const wsserver = new websocket.Server({ port: port });

// wsserver.on('connection', ws => {
//     ws.on('message', message => {
//         console.log(`Received message: ${message}`);
//     });

//     ws.send('Hello from the websocket server...');
// });


// // nginx example code...
console.log("Server started");
var Msg = '';
var WebSocketServer = websocket.Server
    , wss = new WebSocketServer({port: port}); // was 8010 in example
    wss.on('connection', function(ws) {
        ws.on('message', function(message) {
        console.log('Received from client: %s', message);
        ws.send('Server received from client: ' + message);
    });
 });
