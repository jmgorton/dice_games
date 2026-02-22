// export {};

import http from 'http';
import fs from 'fs';
import WebSocket, { WebSocketServer } from 'ws';
import { Stream } from 'stream';

export type WebSocketServerEvents = 'close' | 'error' | 'connection' | 
    'headers' | 'wsClientError';

export type WebSocketServerEventListenerMap = {
    'close': (this: WebSocketServer) => void;
    'error': (this: WebSocketServer, error: Error) => void;
    'connection': (
        this: WebSocketServer, 
        ws: WebSocket, 
        request: http.IncomingMessage,
        wsListeners?: {
            [K in keyof WebSocketEventListenerMap]?: WebSocketEventListenerMap[K];
        }
    ) => void;
    'headers': (this: WebSocketServer, headers: string[], request: http.IncomingMessage) => void;
    'wsClientError': (this: WebSocketServer, error: Error, socket: Stream.Duplex, request: http.IncomingMessage) => void;
}

export type WebSocketEvents = 'open' | 'redirect' | 'upgrade' | 'error' | 
    'unexpected-response' | 'ping' | 'pong' | 'message' | 'close';

    // addEventListener<K extends keyof WebSocket.WebSocketEventMap>(
    //     type: K,
    //     listener:
    //         | ((event: WebSocket.WebSocketEventMap[K]) => void)
    //         | { handleEvent(event: WebSocket.WebSocketEventMap[K]): void },
    //     options?: WebSocket.EventListenerOptions,
    // ): void;

export type WebSocketEventListenerMap = {
    'open': (this: WebSocket) => void;
    'redirect': (this: WebSocket, url: string, request: http.ClientRequest) => void;
    'upgrade': (this: WebSocket, request: http.IncomingMessage) => void;
    'error': (this: WebSocket, error: Error) => void;
    'unexpected-response': (this: WebSocket, request: http.ClientRequest, response: http.IncomingMessage) => void;
    'ping': (this: WebSocket, data: Buffer) => void;
    'pong': (this: WebSocket, data: Buffer) => void;
    'message': (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) => void;
    'close': (code: number, reason: Buffer) => void;
}

export type HTTPMethod = "GET" // | "POST" | "PUT" | "DELETE" // | etc.

export interface URITreeData {
    route: string;
    availableAssetsAtRoute?: RegExp;
    // assetServerHandler?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
    serverRootDir?: string;
    handlerMap?: { [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void) };
    childRoutes?: { [route: string]: URITree };
    default404Response?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
}

export class URITree implements URITreeData {
// export class URITree<T extends URITreeData = URITreeData> {
    // root: URITreeNode | undefined = undefined;
    route: string = '';
    availableAssetsAtRoute?: RegExp;
    // assetServerHandler?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
    serverRootDir?: string;
    handlerMap?: { [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void) };
    childRoutes?: { [route: string]: URITree };
    default404Response?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
    // RegExp can't be an intermediate part of a route URI
    // in other words, if route is a RegExp, that URITree can have no child routes...
    // for now, the purpose is serving static files (html, js, css) 
    // and an index signature on childRoutes can't contain regex as the key 
    // also, if route is a RegExp, handlerMap must at least have a GET key and handler 

    private defaultNotFound(request: http.IncomingMessage, response: http.ServerResponse): void {
        console.log(`Serving default 404 for ${request.method} ${request.url}`);
        response.statusCode = 404;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ err: 'Not Found' }));
    }

    // static serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse) {
    // }

    private serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse, staticFilename?: string, staticFilepath?: string): void {
        if (!staticFilename) {
            const fileMatcher = this.availableAssetsAtRoute;
            if (!fileMatcher) staticFilename = 'index.html';
            else {
                const parsedRequestURL = req.url?.match(fileMatcher);
                if (!parsedRequestURL || !parsedRequestURL[1]) {
                    // set staticFilename as index.html and try to serve it, 
                    // it'll throw 404 anyway if not there... we can add this to the URITree class 
                    // TODO use the request URL as a second subpath for potential nested index.htmls ??
                    staticFilename = 'index.html';
                } else {
                    staticFilename = parsedRequestURL[1];
                }
            }
        }
    
        res.statusCode = 200;
        let subpath = '';
        if (staticFilename.endsWith('.html')) {
            res.setHeader('Content-Type', 'text/html');
        } else if (staticFilename.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        } else if (staticFilename.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
        } else if (staticFilename.endsWith('.js') || staticFilename.endsWith('.ts') || staticFilename.endsWith('.map')) {
            // res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Type', 'text/javascript');
            subpath = '/client-utils'
        } else {
            // res.statusCode = 404;
            // default404(req, res);
            res.writeHead(404, 'Not Found', { "content-type": 'application/json' });
            res.end(JSON.stringify({ err: 'Not Found' }));
            return;
        }
        // fs.createReadStream(__dirname + '/index.html').pipe(res);
        // import or pass in __dirname ?? 
        const readStream = fs.createReadStream((staticFilepath ?? this.serverRootDir) + subpath + '/' + staticFilename);
    
        readStream.on('error', (err) => {
            console.error(err);
            if (this.default404Response) return this.default404Response(req, res);
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            // res.end(`
            //     <h1>hi from ${os.hostname()}</h1>
            //     <h3>fs.createReadStream('${__dirname}' + '/index.html') did not work.</h3>
            //     <p>Server received request: ${req}</p>
            //     <p>But there was an error while piping: ${err}</p>
            // `);
            res.end('Not Found');
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
    };

    constructor(data: URITreeData) {
        Object.assign(this, data);
        this.default404Response ??= this.defaultNotFound;
        // this.assetServerHandler ??= this.serveStaticFile;
    }
    // constructor(data: T) {
    //     Object.assign(this, data);
    // }

    handleRequest(request: http.IncomingMessage, response: http.ServerResponse): void {
        // weird request, just return 404 i guess
        if (!request || !request.url || !request.method) {
            console.log(`Received a weird request! ${request}`);
            return this.default404Response!(request, response);
        }

        // if we somehow got to the wrong URITree node, serve a 404
        if (!request.url.startsWith(this.route)) return this.default404Response!(request, response);
        // if this is the end of the url that the browser is requesting,
        // return true if we are set up to handle a request like this 
        let remainingURI = request.url.substring(this.route.length);
        const charactersToIgnore = '!#$%&\'()*+,:;=?@[]'; // also /, in that case we pass to child
        if (!remainingURI || remainingURI.length === 0 || charactersToIgnore.includes(remainingURI.charAt(0))) {
            // return this.handlerMap === undefined || !((request.method as HTTPMethod) in this.handlerMap);
            if (!this.handlerMap || !((request.method as HTTPMethod) in this.handlerMap)) {
                // console.log(`Could not serve request of type ${request.method} at ${this.route}
                //     because available options include: ${Object.keys(this.handlerMap ?? {})}`)
                return this.serveStaticFile(request, response, 'index.html'); // attempt to serve index.html?? 
                // return this.default404Response!(request, response);
            }
            // maybe unsafe-ish, since we're passing request on to the handlerMap and
            // expecting it to execute safely... maybe only execute if remainingURI is actually empty 
            return this.handlerMap[request.method as HTTPMethod]!(request, response);
        }
        // find out if we should pass this to a child or serve 404
        // console.log(`Resolving remaining URI: ${remainingURI}`);
        if (remainingURI.charAt(0) == '/') remainingURI = remainingURI.substring(1);
        const delimiterIndex = remainingURI.indexOf('/');
        const childToLookFor = delimiterIndex > -1 ? remainingURI.substring(0, delimiterIndex) : remainingURI;
        // console.log(`Looking for child route handler: ${childToLookFor}`);
        if (!this.childRoutes || !(childToLookFor in this.childRoutes)) {
            // console.log(`No children can service this request. We can still try to serve assets here using this pattern: ${this.availableAssetsAtRoute}`);
            if (this.availableAssetsAtRoute && this.availableAssetsAtRoute.test(request.url)) {
                // if (!this.assetServerHandler) return this.default404Response!(request, response);
                // return this.assetServerHandler(request, response);
                // if (!this.serveStaticFile) return this.default404Response!(request, response);
                return this.serveStaticFile(request, response);
            }
            return this.default404Response!(request, response);
        }
        return this.childRoutes[childToLookFor]?.handleRequest(request, response);
    }
}