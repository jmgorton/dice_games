import http from 'http';
import os from 'os';
import fs from 'fs';

import path from 'path';
import { fileURLToPath } from 'url';

// import { URITree } from '@shared/types.js'
import { URITree } from '../shared/dist/types.js'
import {
    getHostname,
    getUptime,
    getNotFound,
} from './server-utils/responses.js'

// __dirname is a CommonJS-specific global variable, not available in ES module scope
// can replicate the functionality using the `import.meta.url` property and the 
// built-in path and url modules

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
                'GET': getUptime,
            }
        }),
    }
});

// server entrypoint for base uri
// hosts a simple http server listening on internal port 3000
// receives requests and returns static assets such as html/js
// including index.html, utils.ts, and utils-socket.ts to the 
// client, those assets are served on subsequent requests

const server = http.createServer((req, res) => {
    // function createServer<typeof http.IncomingMessage, typeof http.ServerResponse>
    // (requestListener?: 
    //  http.RequestListener<typeof http.IncomingMessage, typeof http.ServerResponse> | undefined): 
    //  http.Server<typeof http.IncomingMessage, typeof http.ServerResponse>
    // req = http.IncomingMessage
    // res = http.ServerResponse 

    routeHandler.handleRequest(req, res);
});

server.listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/ :)`);
});

export function getRoot(req: http.IncomingMessage, res: http.ServerResponse) {
    // console.log(`Getting root for req: ${req.method} ${req.url}`);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/html');
    const readStream = fs.createReadStream(__dirname + '/index.html');

    readStream.pipe(res);

    readStream.on('error', (err) => {
        console.error(err);
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        // res.end(`
        //     <h1>hi from ${os.hostname()}</h1>
        //     <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
        //     <p>Server received request: ${req}</p>
        //     <p>But there was an error while piping: ${err}</p>
        // `);
        res.end(`Error fetching file.`);
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
}

function serveStaticAsset(req: http.IncomingMessage, res: http.ServerResponse) {
    // console.log(`Serving static asset for ${req.method} ${req.url}`)
    const fileMatcher = availableAssetsRegex;
    const parsedRequestURL = req.url?.match(fileMatcher);
    if (!parsedRequestURL || !parsedRequestURL[1]) {
        // console.log(`No match for ${parsedRequestURL}`);
        res.writeHead(404, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: 'Not Found' }));
    } else {
        // console.log(`From ${parsedRequestURL[0]}, found asset ${parsedRequestURL[1]}`);
        // getUtilByName(req, res, parsedRequestURL[1]);
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/javascript'); // TODO assets that aren't js 
        // const clientUtilsDirname = "/client-utils";
        const utilFilePath = `${__dirname}/client-utils/${parsedRequestURL[1]}`;
        // console.log(`About to serve file: ${utilFilePath}`)
        // fs.createReadStream(utilFilePath).pipe(res);
        const readStream = fs.createReadStream(utilFilePath);

        readStream.pipe(res);

        readStream.on('error', (err) => {
            console.error(err);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            // res.end(`
            //     <h1>hi from ${os.hostname()}</h1>
            //     <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
            //     <p>Server received request: ${req}</p>
            //     <p>But there was an error while piping: ${err}</p>
            // `);
            res.end('Error fetching file.');
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
    }
}
