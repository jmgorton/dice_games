import http from 'http';
import os from 'os';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { URITree } from '@shared/types.js';
// server entrypoint for base uri
// hosts a simple http server listening on internal port 3000
// receives requests and returns static assets such as html/js
// including index.html, utils.ts, and utils-socket.ts to the 
// client, those assets are served on subsequent requests
// const res = require('./res.js'); // todo rename 
// __dirname is a CommonJS-specific global variable, not available in ES module scope
// can replicate the functionality using the `import.meta.url` property and the 
// built-in path and url modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// import { URITree } from '../common/types.js'
const hostname = '0.0.0.0';
const port = 3000;
const availableAssetsRegex = /^\/((?:setup|utils(?:-(?:ui|socket))?)\.(?:.*)[jt]s(?:\.map)?)$/;
const routeHandler = new URITree({
    route: '/',
    availableAssetsAtRoute: availableAssetsRegex,
    assetServerHandler: serveStaticAsset,
    handlerMap: {
        'GET': getRoot,
    },
    default404Response: getNotFound,
    childRoutes: {
        'hostname': new URITree({
            route: '/hostname',
            handlerMap: {
                'GET': getHostname,
            }
        }),
        'uptime': new URITree({
            route: '/uptime',
            handlerMap: {
                GET: getUptime,
            }
        }),
    }
});
const assetServer = new URITree({
    // route matches: {setup,utils,utils-ui,utils-socket}.<maybe-something>{js,ts}<maybe .map>
    // route: new RegExp('')
    route: '', // availableAssetsRegex,
    handlerMap: {
        GET: serveStaticAsset,
    }
});
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
        url: /^\/utils\.js/, // remove EOL char, return file based on req path
        run: getUtils,
    },
    {
        method: 'GET',
        url: /^\/utils-socket\.js/, // remove EOL char, return file based on req path
        run: getSocketUtils,
    },
    {
        method: 'GET',
        url: /^\/utils-ui\.js/, // remove EOL char, return file based on req path
        run: getUIUtils,
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
    if (!req.url || req.url === undefined) {
        getNotFound(req, res);
        return;
    }
    console.log(`Searching for route for ${req.method} ${req.url}`);
    let route = routes.find(route => {
        // console.log(`Comparing to route ${route.method} ${route.url}`)
        return route.url.test(req.url) && route.method === req.method;
    });
    console.log(`${route ? 'Found route' : 'No route found'} for ${req.method} ${req.url}... ${route}`);
    try {
        // try catch is pointless here, serving a 404 is not considered an application error 
        routeHandler.handleRequest(req, res);
        // assetServer.handleRequest(req, res);
    }
    catch (err) {
        if (route)
            route.run(req, res);
        else {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/html');
            res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
                + '<p>this is the default route not found catcher. please go back to the <a href="http://localhost:1313">homepage</a>.</p>');
        }
    }
});
server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/ :)`);
});
function getRoot(req, res) {
    console.log(`Getting root for req: ${req.method} ${req.url}`);
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
    });
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
    console.log(`Getting hostname for req: ${req.method} ${req.url}`);
    res.statusCode = 200;
    // res.setHeader('Content-Type', 'text/html'); 
    // res.end('<h1 style="margin: 0; padding: 0;">' + os.hostname() + '</h1>');
    res.setHeader('Content-Type', 'plaintext');
    res.end(os.hostname());
}
function getUptime(req, res) {
    res.writeHead(200, { 'content-type': 'plaintext' }); // application/json
    res.end(os.uptime());
}
function getActiveServices(req, res) {
    // TODO implement... use built-in docker DNS to ref containers on same bridge network via service name? 
    const serviceServerNames = ['app', 'websock', 'play', 'pywss', 'nginx'];
    for (const service of serviceServerNames) {
        try {
            fetch(`http://${service}`);
        }
        catch (err) {
        }
    }
}
function serveStaticAsset(req, res) {
    console.log(`Serving static asset for ${req.method} ${req.url}`);
    const fileMatcher = availableAssetsRegex;
    const parsedRequestURL = req.url?.match(fileMatcher);
    if (!parsedRequestURL || !parsedRequestURL[1]) {
        console.log(`No match for ${parsedRequestURL}`);
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
    else {
        console.log(`From ${parsedRequestURL[0]}, found asset ${parsedRequestURL[1]}`);
        getUtilByName(req, res, parsedRequestURL[1]);
    }
}
function getUtilByName(req, res, name) {
    // if (!name) return;
    console.log(`Getting util ${name} for req: ${req.method} ${req.url}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/javascript');
    const clientUtilsDirname = "/client-utils";
    fs.createReadStream(__dirname + `${clientUtilsDirname}/${name}`).pipe(res);
}
function getUtils(req, res) {
    console.log(`Getting utils for req: ${req.method} ${req.url}`);
    const nameInUrlPattern = /\/([a-zA-Z.\-]+)/;
    const nameMatch = req.url.match(nameInUrlPattern);
    const name = nameMatch ? nameMatch[1] : '';
    if (!name)
        return;
    console.log(`Getting util file: ${name}`);
    getUtilByName(req, res, name);
}
function getSocketUtils(req, res) {
    console.log(`Getting socket utils for req: ${req.method} ${req.url}`);
    const nameInUrlPattern = /\/([a-zA-Z.\-]+)/;
    const nameMatch = req.url.match(nameInUrlPattern);
    const name = nameMatch ? nameMatch[1] : '';
    if (!name)
        return;
    console.log(`Getting socket util file: ${name}`);
    getUtilByName(req, res, name);
}
function getUIUtils(req, res) {
    console.log(`Getting ui utils for req: ${req.method} ${req.url}`);
    const nameInUrlPattern = /\/([a-zA-Z.\-]+)/;
    const nameMatch = req.url.match(nameInUrlPattern);
    const name = nameMatch ? nameMatch[1] : '';
    if (!name)
        return;
    console.log(`Getting ui util file: ${name}`);
    getUtilByName(req, res, name);
}
function getNotFound(req, res) {
    console.log(`Path not found for req: ${req.method} ${req.url}`);
    // console.debug(`${req.statusCode} ${req.statusMessage}`);
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html');
    // fs.createReadStream(__dirname + '/index.html').pipe(res);
    // res.end();
    res.end('<h1>hi from ' + os.hostname() + '\'s getNotFound page...</h1>\n' + '<h3>the page you requested was not found... bummer!</h3>'
        + '<p>please go back to the <a href="http://localhost:1313">homepage</a></p>');
}
//# sourceMappingURL=app.js.map