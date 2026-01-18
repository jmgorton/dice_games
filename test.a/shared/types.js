// export {};
import http from 'http';
export class URITree {
    // root: URITreeNode | undefined = undefined;
    route = '';
    availableAssetsAtRoute;
    assetServerHandler;
    handlerMap;
    childRoutes;
    default404Response;
    // RegExp can't be an intermediate part of a route URI
    // in other words, if route is a RegExp, that URITree can have no child routes...
    // for now, the purpose is serving static files (html, js, css) 
    // and an index signature on childRoutes can't contain regex as the key 
    // also, if route is a RegExp, handlerMap must at least have a GET key and handler 
    defaultNotFound(request, response) {
        console.log(`Serving default 404 for ${request.method} ${request.url}`);
        response.statusCode = 404;
        response.setHeader('Content-Type', 'text/html');
        response.end('<h1>hi there</h1>\n' + '<p>the page you requested was not found... bummer!</p>'
            + '<p>this is the default 404 page! please go back to the <a href="http://localhost:1313">homepage</a></p>');
    }
    constructor(data) {
        Object.assign(this, data);
        if (!this.default404Response) {
            this.default404Response = this.defaultNotFound;
        }
    }
    handleRequest(request, response) {
        // weird request, just return 404 i guess
        if (!request || !request.url || !request.method)
            return this.default404Response(request, response);
        if (typeof this.route === 'string') {
            // if we somehow got to the wrong URITree node, serve a 404
            if (!request.url.startsWith(this.route))
                return this.default404Response(request, response);
            // if this is the end of the url that the browser is requesting,
            // return true if we are set up to handle a request like this 
            const remainingURI = request.url.substring(this.route.length);
            const charactersToIgnore = '!#$%&\'()*+,:;=?@[]'; // also /, in that case we pass to child
            if (!remainingURI || remainingURI.length === 0 || charactersToIgnore.includes(remainingURI.charAt(0))) {
                // return this.handlerMap === undefined || !((request.method as HTTPMethod) in this.handlerMap);
                if (!this.handlerMap || !(request.method in this.handlerMap))
                    return this.default404Response(request, response);
                // maybe unsafe-ish, since we're passing request on to the handlerMap and
                // expecting it to execute safely... maybe only execute if remainingURI is actually empty 
                return this.handlerMap[request.method](request, response);
            }
            // find out if we should pass this to a child or serve 404
            if (remainingURI[0] !== '/') {
                if (this.availableAssetsAtRoute && this.availableAssetsAtRoute.test(request.url)) {
                    if (!this.assetServerHandler)
                        return this.default404Response(request, response);
                    return this.assetServerHandler(request, response);
                }
                return this.default404Response(request, response);
            }
            const delimiterIndex = remainingURI.indexOf('/', 1);
            const childToLookFor = delimiterIndex > -1 ? remainingURI.substring(0, delimiterIndex) : remainingURI;
            if (!this.childRoutes || !(childToLookFor in this.childRoutes))
                return this.default404Response(request, response);
            return this.childRoutes[childToLookFor]?.handleRequest(request, response);
            // } else if (typeof this.route === 'object' && this.route instanceof RegExp) {
            //     // we have no way to serve this type of request
            //     if (!this.handlerMap || !(request.method in this.handlerMap)) return this.default404Response!(request, response);
            //     // this request doesn't match our pattern at the leaf node, and no further children can try it 
            //     if (!this.route.test(request.url)) return this.default404Response!(request, response);
            //     // the request matches our pattern, so handle the request 
            //     return this.handlerMap[request.method as HTTPMethod]!(request, response);
        }
        else {
            return this.default404Response(request, response);
        }
    }
}
//# sourceMappingURL=types.js.map