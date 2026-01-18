import http from 'http';
export type HTTPMethod = "GET";
export interface URITreeData {
    route: string;
    availableAssetsAtRoute?: RegExp;
    assetServerHandler?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
    handlerMap?: {
        [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void);
    };
    childRoutes?: {
        [route: string]: URITree;
    };
    default404Response?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
}
export declare class URITree implements URITreeData {
    route: string;
    availableAssetsAtRoute?: RegExp;
    assetServerHandler?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
    handlerMap?: {
        [method in HTTPMethod]?: ((request: http.IncomingMessage, response: http.ServerResponse) => void);
    };
    childRoutes?: {
        [route: string]: URITree;
    };
    default404Response?: (request: http.IncomingMessage, response: http.ServerResponse) => void;
    defaultNotFound(request: http.IncomingMessage, response: http.ServerResponse): void;
    constructor(data: URITreeData);
    handleRequest(request: http.IncomingMessage, response: http.ServerResponse): void;
}
//# sourceMappingURL=types.d.ts.map