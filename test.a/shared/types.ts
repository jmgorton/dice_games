// export {};

import http from 'http';

export type HTTPMethod = "GET" // | "POST" | "PUT" | "DELETE" // | etc.

export interface URITreeData {
    route: string;
    availableAssetsAtRoute?: RegExp;
    assetServerHandler?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
    handlerMap?: { [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void) };
    childRoutes?: { [route: string]: URITree };
    default404Response?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
}

export class URITree implements URITreeData {
    // root: URITreeNode | undefined = undefined;
    route: string = '';
    availableAssetsAtRoute?: RegExp;
    assetServerHandler?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
    handlerMap?: { [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void) };
    childRoutes?: { [route: string]: URITree };
    default404Response?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
    // RegExp can't be an intermediate part of a route URI
    // in other words, if route is a RegExp, that URITree can have no child routes...
    // for now, the purpose is serving static files (html, js, css) 
    // and an index signature on childRoutes can't contain regex as the key 
    // also, if route is a RegExp, handlerMap must at least have a GET key and handler 

    defaultNotFound(request: http.IncomingMessage, response: http.ServerResponse): void {
        console.log(`Serving default 404 for ${request.method} ${request.url}`);
        response.statusCode = 404;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ err: 'Not Found' }));
    }

    constructor(data: URITreeData) {
        Object.assign(this, data);
        if (!this.default404Response) {
            this.default404Response = this.defaultNotFound
        }
    }

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
                return this.default404Response!(request, response);
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
                if (!this.assetServerHandler) return this.default404Response!(request, response);
                return this.assetServerHandler(request, response);
            }
            return this.default404Response!(request, response);
        }
        return this.childRoutes[childToLookFor]?.handleRequest(request, response);
    }
}