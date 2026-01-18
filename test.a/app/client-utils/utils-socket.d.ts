export declare function browserSupportsWebSockets(): boolean;
export declare function getWebSocketUrlByURI(uri: string): string;
export declare function getSocketWithListenersByURL(url: string, listeners?: {
    'open'?: (this: WebSocket, ev: Event) => void;
    'message'?: (this: WebSocket, ev: MessageEvent<any>) => any;
    'close'?: (this: WebSocket, ev: CloseEvent) => any;
    'error'?: (this: WebSocket, ev: Event) => void;
}): WebSocket | undefined;
//# sourceMappingURL=utils-socket.d.ts.map