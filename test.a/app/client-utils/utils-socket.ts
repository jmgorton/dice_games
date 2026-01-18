// ES Module (newer) 
// Not CommonJS (old) 

export function browserSupportsWebSockets() {
    const isSupported = Boolean("WebSocket" in window);
    if (!isSupported) alert("WebSockets not supported by browser.");
    return isSupported;
}

export function getWebSocketUrlByURI(uri: string): string {
    const loc = window.location;
    const protocol = loc.protocol === "https:" ? "wss:" : "ws:"; // TODO validate whether to include colon 
    const host = loc.host; // ensure the browser connects to the same port nginx is listening on 
    const URL = `${protocol}//${host}/${uri}`; 
    // // uri: 
    // // pywss = websockc (Python) 
    // // play = /play (JS) 
    // // test = websock (JS) ... NOT a websocket connection yet, just HTTP so far 
    return URL
}

// What I consider necessary listeners: open, close, message, error
// If not provided, use default ones 
// pretty sure i read somewhere that you could add multiple listeners even on the same event type
// and they would all execute, i guess for some reason the ones i'm attaching in utils aren't firing/binding 
export function getSocketWithListenersByURL(
    url: string, 
    listeners?: {
        'open'?: (this: WebSocket, ev: Event) => void;
        'message'?: (this: WebSocket, ev: MessageEvent<any>) => any;
        'close'?: (this: WebSocket, ev: CloseEvent) => any;
        'error'?: (this: WebSocket, ev: Event) => void;
    }
): WebSocket | undefined {
// export function getSocketWithListenersByURL(url: string): WebSocket | undefined {
    if (!url) return undefined;

    const socket = new WebSocket(url);

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

    if (listeners && 'message' in listeners) {
        socket.addEventListener('message', listeners['message']);
    } else {
        socket.addEventListener('message', function (event) {
            console.log('Message from server: ', event.data);
            // socket.close(); // Close connection after receiving one message
        });
    }

    if (listeners && 'close' in listeners) {
        socket.addEventListener('close', listeners['close']);
    } else {
        socket.addEventListener('close', function (event) {
            console.log('Connection closed');
        });
    }

    if (listeners && 'error' in listeners) {
        socket.addEventListener('error', listeners['error']);
    } else {
        socket.addEventListener('error', function (error) {
            console.log('WebSocket Error: ', error);
        });
    }
    // socket.addEventListener('error', listeners['error'] ?? function (error) {
    //     console.error('WebSocket Error: ', error);
    // });
}