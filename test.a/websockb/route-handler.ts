import fs from 'fs';
import http from 'http';
import os from 'os';

import path from 'path';
import { fileURLToPath } from 'url';

// __dirname is a CommonJS-specific global variable, not available in ES module scope
// can replicate the functionality using the `import.meta.url` property (below) and the 
// built-in path and url modules (imported above, used below)

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type HTTPMethod = "GET" // | "POST" | "PUT" | "DELETE" // | etc.

interface URITreeData {
    route: string;
    handlerMap?: { [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void) };
    childRoutes?: { [route: string]: URITree };
}

class URITree implements URITreeData {
    // root: URITreeNode | undefined = undefined;
    route: string = '/';
    handlerMap?: { [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void) };
    childRoutes?: { [route: string]: URITree };

    constructor(data: URITreeData) {
        Object.assign(this, data);
    }

    // fulfillRequest(request: http.IncomingMessage): void {
    fulfillRequest(request: http.IncomingMessage, response: http.ServerResponse): void {
        // console.log(`Node ${this.route} attempting to handle request: ${request.method} ${request.url}`)
        // const requestMethod: HTTPMethod = request.method as HTTPMethod;
        // const requestMethod: string | undefined = request.method;
        const requestPath: string | undefined = request.url;

        if (!requestPath || !requestPath.startsWith(this.route)) {
            console.log(`URITree: 404 at ${this.route} for request: ${request.method} ${request.url}`);
            default404(request, response);
            return;
        }

        const remainingPath = requestPath.substring(this.route.length);
        if (!remainingPath || remainingPath.startsWith('?')) {
            // ignore remaining path (query params) and serve
            // only GET methods supported right now, smh 
            if (!this.handlerMap) {
                console.log(`URITree: serve 404 at ${this.route} for request: ${request.method} ${request.url}`);
                default404(request, response);
                return;
            } else {
                console.log(`URITree: execute handlerMap at ${this.route}`);
                this.handlerMap["GET"]!(request, response); // TODO validate later, for now it's fine and obvious 
                return;
            }
        } else {
            const delimiterIndex = remainingPath.indexOf('/', 1); // first char is usually a slash 
            const delimited = delimiterIndex > -1 ? remainingPath.substring(0, delimiterIndex) : remainingPath;
            // just assume the uri was not something wierd... if it was, just return 404. 
            // there are way too many special/reserved characters in an HTTP URI path to handle all of them 
            if (!this.childRoutes || !(delimited in this.childRoutes)) {
                if (/^\/(setup|lotto-utils)\.[jt]s(\.map)?$/.test(delimited)) { // can be fulfilled from any path in URI?? 
                    console.log(`URITree: serve static file: ${delimited.substring(1)}`)
                    serveStaticFile(request, response, delimited.substring(1));
                    return;
                }
                console.log(`URITree: return 404 after failing to match ${delimited}`);
                default404(request, response);
                return;
            } else {
                console.log(`Node ${this.route} will allow child ${delimited} to fulfill request.`);
                this.childRoutes[delimited]?.fulfillRequest(request, response);
                return;
            }
        }
    }
}

function default404(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/html');
    res.end('<h1>hi from ' + os.hostname() + '</h1>\n' + '<p>the page you requested was not found... bummer!</p>'
        + '<p>this is websockb\'s default 404 page! please go back to the <a href="http://localhost:1313/play">/play homepage</a></p>');
}

function getHostname(req: http.IncomingMessage, res: http.ServerResponse): void {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'plaintext');
    res.end(os.hostname());
}

function serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse, staticFilename?: string): void {
    res.statusCode = 200;
    let subpath = '';
    if (!staticFilename) staticFilename = 'index.html';
    if (staticFilename.endsWith('.html')) {
        res.setHeader('Content-Type', 'text/html');
    } else if (staticFilename.endsWith('.js') || staticFilename.endsWith('.ts') || staticFilename.endsWith('.map')) {
        // res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Type', 'text/javascript');
        subpath = '/client-utils'
    } else {
        // res.statusCode = 404;
        default404(req, res);
        return;
    }
    // fs.createReadStream(__dirname + '/index.html').pipe(res);
    const readStream = fs.createReadStream(__dirname + subpath + '/' + staticFilename);

    readStream.on('error', (err) => {
        console.error(err);
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end(`
            <h1>hi from ${os.hostname()}</h1>
            <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
            <p>Server received request: ${req}</p>
            <p>But there was an error while piping: ${err}</p>
        `);
    });

    readStream.pipe(res);

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
}

export const handlerTree = new URITree({
    route: '/play',
    handlerMap: {
        "GET": serveStaticFile,
    },
    childRoutes: {
        '/hostname': new URITree({
            route: '/play/hostname',
            handlerMap: {
                "GET": getHostname,
            }
        })
    }
})