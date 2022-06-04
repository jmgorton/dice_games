const http = require('http');
const os = require('os');
// const websocket = require('ws');

const hostname = '0.0.0.0';
const port = 6502;

// const wsserver = new websocket.Server({ port: port });

// wsserver.on('connection', ws => {
//     ws.on('message', message => {
//         console.log(`Received message: ${message}`);
//     });

//     ws.send('Hello from the websocket server...');
// });


const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>hi from websock! ' + os.hostname() + '</h1>\n' + '<a href="http://localhost:1313">Home</a>');
});

server.listen(port, hostname, () => {
    console.log(`Websock server running at http://${hostname}:${port}/ :)`);
});
