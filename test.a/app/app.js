const http = require('http');
const os = require('os');
const fs = require('fs');

const res = require('./res.js');

const hostname = '0.0.0.0';
const port = 3000;

let routes = [
    {
        method: 'GET',
        url: /^\/$/,
        run: getRoot
    },
    {
        method: 'GET',
        url: /^\/utils\.js$/,
        run: getUtils
    },
    {
        method: 'GET',
        url: /^.*$/,
        run: res.getNotFound
    }
];

const server = http.createServer((req, res) => {

    // console.log(req);

    // let route = routes.find(route => {
    //     route.url.test(req.url) && route.method === req.method
    // });

    // route.run(req, res);

    if (/^\/$/.test(req.url)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html');
        fs.createReadStream(__dirname + '/index.html').pipe(res);
    } else if (/^\/utils\.js$/.test(req.url)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/javascript');
        fs.createReadStream(__dirname + '/utils.js').pipe(res);
    } else if (/^\/hostname$/.test(req.url)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html'); 
        res.end('<p>' + os.hostname() + '</p>');
    } else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
        + '<p>please go back to the <a href="http://localhost:1313">homepage</a></p>');
    }

    // res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<a href="http://localhost:1313/chat">Link to chat</a>\t<a href="http://localhost:1313/test">Link to test</a>');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/ :)`);
});


function getRoot(req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    fs.createReadStream(__dirname + '/index.html').pipe(res);
}

function getUtils(req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/javascript');
    fs.createReadStream(__dirname + '/utils.js').pipe(res);
}

function getNotFound(req, res) {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html');
    // fs.createReadStream(__dirname + '/index.html').pipe(res);
    // res.end();
    res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
    + '<p>please go back to the <a href="http://localhost:1313">homepage</a></p>');
}
