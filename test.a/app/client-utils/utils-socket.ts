// ES Module (newer) 
// Not CommonJS (old) 

export function browserSupportsWebSockets() {
    const isSupported = Boolean("WebSocket" in window);
    if (!isSupported) alert("WebSockets not supported by browser.");
    return isSupported;
}

// What I consider necessary listeners: open, close, message, error
// If not provided, use default ones 
export function getSocketWithListenersByURL(url: string, listeners?: {}): WebSocket | undefined {
// export function getSocketWithListenersByURL(url: string): WebSocket | undefined {
    if (!url) return undefined;

    const socket = new WebSocket(url);

    // (method) WebSocket.addEventListener<"open">(
    //      type: "open", 
    //      listener: (this: WebSocket, ev: Event) => any, options?: boolean | AddEventListenerOptions | undefined): void (+1 overload)

    socket.addEventListener('open', function (event) {
        console.log('Connected to server');
        socket.send('`socket` says Hello Server!');
        this.send('`this` says Hello Server!');
    });

    socket.addEventListener('message', function (event) {
        console.log('Message from server: ', event.data);
        // socket.close(); // Close connection after receiving one message
    });

    socket.addEventListener('close', function (event) {
        console.log('Connection closed');
    });

    socket.addEventListener('error', function (error) {
        console.error('WebSocket Error: ', error);
    });
}