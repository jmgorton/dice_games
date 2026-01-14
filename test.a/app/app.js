// const http = require('http');
// const os = require('os');
// const fs = require('fs');

import http from 'http';
import os from 'os';
import fs from 'fs';

import path from 'path';
import { fileURLToPath } from 'url';

// const res = require('./res.js'); // todo rename 

// __dirname is a CommonJS-specific global variable, not available in ES module scope
// can replicate the functionality using the `import.meta.url` property and the 
// built-in path and url modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const hostname = '0.0.0.0';
const port = 3000;



let routes = [
    {
        method: 'GET',
        url: /^\/$/,
        run: getRoot,
    },
    {
        method: 'GET',
        url: /^\/hostname$/,
        run: getHostname,
    },
    {
        method: 'GET',
        url: /^\/utils\.js$/,
        run: getUtils,
    },
    {
        method: 'GET',
        url: /^\/utils-socket\.js$/,
        run: getSocketUtils,
    },
    {
        method: 'GET',
        url: /^\.\*$/,
        run: getNotFound,
    }
];

const server = http.createServer((req, res) => {
    // function createServer<typeof http.IncomingMessage, typeof http.ServerResponse>
    // (requestListener?: 
    //  http.RequestListener<typeof http.IncomingMessage, typeof http.ServerResponse> | undefined): 
    //  http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
    // req = http.IncomingMessage
    // res = http.ServerResponse 

    // console.log(req);

    console.log(`Searching for route for ${req.method} ${req.url}`);
    let route = routes.find(route => {
        console.log(`Comparing to route ${route.method} ${route.url}`)
        return route.url.test(req.url) && route.method === req.method
    });
    console.log(`${route ? 'Found route' : 'No route found'} for ${req.method} ${req.url}... ${route}`)

    if (route) route.run(req, res);
    else {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>hi from ' + os.hostname() + '\'s default route not found catcher</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
        + '<p>please go back to the <a href="http://localhost:1313">homepage</a></p>');
    }

    // if (/^\/$/.test(req.url)) {
    //     res.statusCode = 200;
    //     res.setHeader('Content-Type', 'text/html');
    //     fs.createReadStream(__dirname + '/index.html').pipe(res);
    // } else if (/^\/utils\.js$/.test(req.url)) {
    //     res.statusCode = 200;
    //     res.setHeader('Content-Type', 'text/javascript');
    //     fs.createReadStream(__dirname + '/utils.js').pipe(res);
    // } else if (/^\/hostname$/.test(req.url)) {
    //     res.statusCode = 200;
    //     res.setHeader('Content-Type', 'text/html'); 
    //     res.end('<p>' + os.hostname() + '</p>');
    // } else {
    //     res.statusCode = 404;
    //     res.setHeader('Content-Type', 'text/html');
    //     res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
    //     + '<p>please go back to the <a href="http://localhost:1313">homepage</a></p>');
    // }

    // res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<a href="http://localhost:1313/chat">Link to chat</a>\t<a href="http://localhost:1313/test">Link to test</a>');
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/ :)`);
});


function getRoot(req, res) {
    console.log(`Getting root for req: ${req}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    // fs.createReadStream(__dirname + '/index.html').pipe(res);
    const readStream = fs.createReadStream(__dirname + '/index.html');
    // if (readStream) console.log(readStream);
    // else {
    //     console.log('Unable to create readStream');
    // }

    readStream.pipe(res);

    readStream.on('error', (err) => {
        console.error(err);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`
            <h1>hi from ${os.hostname()}</h1>
            <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
            <p>Server received request: ${req}</p>
            <p>But there was an error while piping: ${err}</p>
        `);
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

    // res.end(
    //     `
    //         <h1>hi from ${os.hostname()}</h1>
    //         <h3>fs.createReadStream('${__dirname}' + '/index.html') is not working.</h3>
    //         <p>Server received request: ${req}</p>
    //     `
    // )
}

function getHostname(req, res) {
    console.log(`Getting hostname for req: ${req}`);
    res.statusCode = 200;
    // res.setHeader('Content-Type', 'text/html'); 
    // res.end('<h1 style="margin: 0; padding: 0;">' + os.hostname() + '</h1>');
    res.setHeader('Content-Type', 'plaintext');
    res.end(os.hostname());
}

function getUtils(req, res) {
    console.log(`Getting utils for req: ${req}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/javascript');
    fs.createReadStream(__dirname + '/utils.js').pipe(res);
}

function getSocketUtils(req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/javascript');
    fs.createReadStream(__dirname + '/utils-socket.js').pipe(res);
}

function getNotFound(req, res) {
    console.log(`Path not found for req: ${req}`);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html');
    // fs.createReadStream(__dirname + '/index.html').pipe(res);
    // res.end();
    res.end('<h1>hi from ' + os.hostname() + '\'s getNotFound page...</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
    + '<p>please go back to the <a href="http://localhost:1313">homepage</a></p>');
}
