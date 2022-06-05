const http = require('http');
const os = require('os');
const fs = require('fs');

const hostname = '0.0.0.0';
const port = 3000;

const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    fs.createReadStream(__dirname + '/index.html').pipe(res);
    // res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<a href="http://localhost:1313/chat">Link to chat</a>\t<a href="http://localhost:1313/test">Link to test</a>');

    // console.log(process.cwd());
    // fs.readdir(process.cwd(), function (err, data) {
    //     if (err) {
    //         console.log(err);
    //         return;
    //     } 

    //     console.log(data);
    // });

    // console.log(__dirname);
    // fs.readdir(__dirname, function (err, data) {
    //     if (err) {
    //         console.log(err);
    //         return;
    //     } 

    //     console.log(data);
    // });
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/ :)`);
});
