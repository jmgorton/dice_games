// ES Module (newer) 
// Not CommonJS (old) 
// import { WebSocket } from 'ws';

export function browserSupportsWebSockets() {
    const isSupported = Boolean("WebSocket" in window);
    if (!isSupported) alert("WebSockets not supported by browser.");
    return isSupported;
}

export function getWebSocketUrlByURI(uri: string): string {
    const loc = window.location;
    const protocol = loc.protocol === "https:" ? "wss:" : "ws:"; // TODO validate whether to include colon when on https
    const host = loc.host; // ensure the browser connects to the same port nginx is listening on 
    const URL = `${protocol}//${host}/${uri}`; 
    // // uri: 
    // // /collab = collab (Python) 
    // // /play = play (JS) 
    // // /auth = auth (JS) ... NOT a websocket connection yet, just HTTP so far 
    return URL
}

function defaultWsOnOpen (this: WebSocket, ev: Event): void {
    console.log('Connected to server');
    // socket.send('`socket` says Hello Server!');
    this.send('`this` says Hello Server!');
}

function defaultWsOnMessage (this: WebSocket, ev: MessageEvent<any>): any {
    console.log('Message from server: ', ev.data);
    // socket.close(); // Close connection after receiving one message
}

function defaultWsOnClose (this: WebSocket, ev: CloseEvent): any {
    console.log('Connection closed');
}

function defaultWsOnError (this: WebSocket, ev: Event): void {
    console.log('WebSocket Error: ', ev);
}

const defaultWsHandlers: {
    [K in keyof WebSocketEventMap]?: (this: WebSocket, ev: WebSocketEventMap[K]) => any;
} = {
    'open': defaultWsOnOpen,
    'message': defaultWsOnMessage,
    'close': defaultWsOnClose,
    'error': defaultWsOnError,
}

// What I consider necessary listeners: open, close, message, error
// If not provided, use default ones 
// i guess for some reason the ones i'm attaching in utils aren't firing/binding ??
export function getSocketWithListenersByURL(
    url: string, 
    listeners?: {
        // 'open'?: (this: WebSocket, ev: Event) => void;
        // 'message'?: (this: WebSocket, ev: MessageEvent<any>) => any;
        // 'close'?: (this: WebSocket, ev: CloseEvent) => any;
        // 'error'?: (this: WebSocket, ev: Event) => void;
        [K in keyof WebSocketEventMap]?: (this: WebSocket, ev: WebSocketEventMap[K]) => any; // void | any...
    }
): WebSocket | undefined {
// export function getSocketWithListenersByURL(url: string): WebSocket | undefined {
    if (!url) return undefined;

    const socket = new WebSocket(url);
    // options?: WebSocket.ClientOptions | ClientRequestArgs
    // interface ClientOptions extends SecureContextOptions {
    //     protocol?: string | undefined;
    //     followRedirects?: boolean | undefined;
    //     generateMask?(mask: Buffer): void;
    //     handshakeTimeout?: number | undefined;
    //     maxRedirects?: number | undefined;
    //     perMessageDeflate?: boolean | PerMessageDeflateOptions | undefined;
    //     localAddress?: string | undefined;
    //     protocolVersion?: number | undefined;
    //     headers?: { [key: string]: string } | undefined;
    //     origin?: string | undefined;
    //     agent?: Agent | undefined;
    //     host?: string | undefined;
    //     family?: number | undefined;
    //     checkServerIdentity?(servername: string, cert: CertMeta): boolean;
    //     rejectUnauthorized?: boolean | undefined;
    //     allowSynchronousEvents?: boolean | undefined;
    //     autoPong?: boolean | undefined;
    //     maxPayload?: number | undefined;
    //     skipUTF8Validation?: boolean | undefined;
    //     createConnection?: typeof createConnection | undefined;
    //     finishRequest?: FinishRequestCallback | undefined;
    // }

    // (method) WebSocket.addEventListener<"open">(
    //      type: "open", 
    //      listener: (this: WebSocket, ev: Event) => any, options?: boolean | AddEventListenerOptions | undefined): void (+1 overload)

    
    if (listeners && 'open' in listeners) {
        socket.addEventListener('open', listeners['open']);
    } else {
        socket.addEventListener('open', function (event) {
            console.log('Connected to server');
            socket.send('`socket` says Hello Server!');
            this.send('`this` says Hello Server!');
        });
    }
    
    // if (!listeners) listeners = defaultWsHandlers;
    // for (const event of Object.keys(listeners)) {
    //     const eventKey = event as keyof WebSocketEventMap;
    //     socket.addEventListener(eventKey, listeners[eventKey] ?? defaultWsHandlers[eventKey])
    // }


    // if (listeners && 'error' in listeners) {
    //     socket.addEventListener('error', listeners['error']);
    // } else {
    //     socket.addEventListener('error', function (error) {
    //         console.log('WebSocket Error: ', error);
    //     });
    // }

    // socket.addEventListener('error', listeners['error'] ?? function (error) {
    //     console.error('WebSocket Error: ', error);
    // });
}