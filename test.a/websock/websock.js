const http = require('http');
const os = require('os');
const fs = require('fs');
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
    // res.statusCode = 200;
    // res.setHeader('Content-Type', 'text/html');
    // res.end('<h1>hi from websock! ' + os.hostname() + '</h1>\n' + '<a href="http://localhost:1313">Home</a>');

    if (/^\/$/.test(req.url)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        fs.createReadStream(__dirname + '/index.html').pipe(res);
    } else if (/^\/chat$/.test(req.url)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        fs.createReadStream(__dirname + '/index.html').pipe(res);
    } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
        + '<p>please go back to the <a href="http://localhost:1313">homepage</a></p>');
    }
});

server.listen(port, hostname, () => {
    console.log(`Websock server running at http://${hostname}:${port}/ :)`);
});
