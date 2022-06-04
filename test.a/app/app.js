const http = require('http');
const os = require('os');

const hostname = '0.0.0.0';
const port = 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<a href="http://localhost:1313/chat">Link to chat</a>\t' + '<a href="http://localhost:1313/test">Link to test</a>');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/ :)`);
});
