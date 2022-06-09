'use strict'

const os = require('os');
const fs = require('fs');

function getRoot(req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    fs.createReadStream(__dirname + '/index.html').pipe(res);
}

function getUtils(req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
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