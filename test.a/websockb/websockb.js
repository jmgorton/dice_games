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
// console.log("Server started");
// var Msg = '';
// var WebSocketServer = websocket.Server
//     , wss = new WebSocketServer({port: port}); // was 8010 in example
//     wss.on('connection', function(ws) {
//         ws.on('message', function(message) {
//         console.log('Received from client: %s', message);
//         ws.send('Server received from client: ' + message);
//     });
//  });


const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>hi from websockb! ' + os.hostname() + '</h1>\n' + '<a href="http://localhost:1313">Home</a>');
});

server.listen(port, hostname, () => {
    console.log(`Websockb server running at http://${hostname}:${port}/ :)`);
});