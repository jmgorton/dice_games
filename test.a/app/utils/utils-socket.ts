// ES Module (newer) 
// Not CommonJS (old) 

export function getSocketWithListenersByURL(url: string): WebSocket | undefined {
    if (!url) return undefined;

    const socket = new WebSocket(url);

    socket.addEventListener('open', function (event) {
        console.log('Connected to server');
        socket.send('Hello Server!');
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