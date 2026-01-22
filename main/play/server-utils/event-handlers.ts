import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';


// use wss.clients and if (client.readyState === WebSocket.OPEN)
// See: https://www.npmjs.com/package/ws # Server broadcast 
// const ip = req.socket.remoteAddress; to get ip of client...
// "When the server runs behind a proxy like NGINX, the de-facto standard
// is to use the X-Forwarded-For header."
// const ip = req.headers['x-forwarded-for'].split(',')[0].trim();

const clients: {
    // [key: WebSocket]: any;
    // [key: string]: any; // { [key: string]: any };
    [key: string]: { 
        [key: string]: any;
        socket: WebSocket;
        username: string;
    };
    // id: { [key: string]: any };
    // id: string;
    // type: string;
} = {

}

function getConnectionForID(id: number) {
    let cx = Object.keys(clients).find((x: any) => x === id);
    // return cx.ws; 
    return cx ? clients[cx] : undefined;
}

function makeUserListMessage() {
    return {
        type: "userlist",
        users: Object.entries(clients).map(([clientId, clientInfo], index) => clientInfo.username ?? clientId ?? index)
    }
}

function generateClientID() {
    return Math.random().toString(36).substring(6, 15);
}

function getIpFromRequest(request: http.IncomingMessage): string | undefined {
    let ip;
    let headers = request.headers['x-forwarded-for']
    if (headers) {
        if (Array.isArray(headers)) headers = headers[0] ?? ''; // ip at 0, ig? 
        ip = headers.split(',')[0]?.trim();
    }
    if (!ip) ip = request.socket.remoteAddress; // fall back... would this just be nginx ip always? 
    return ip;
}

// export function wssOnConnectionTest(this: WebSocketServer, ws: WebSocket, request: http.IncomingMessage) {

//     ws.on('message', function (this: WebSocket, data: WebSocket.RawData, isBinary: boolean) {
//         let message = data;
//         console.log(`DATA (Test listener): ${data}`);
//         if (!data) return;
//         try {
//             message = JSON.parse(data.toString());
//             console.log(`MESSAGE (Test listener): ${message}`)
//         } catch (err: any) {
//             if (err instanceof SyntaxError) {
//                 console.warn('Message was not parsable');
//             }
//         }
//     })

//     ws.on('close', (code: number, reason: Buffer) => {
//         // // connectionArray = connectionArray.filter(function (el, idx, ar) {
//         // //     return el.connected;
//         // // });
//         // const toRemoveIndex = connectionArray.findIndex(el => !el.connected);
//         // connectionArray.splice(toRemoveIndex, 1);
//         // sendUserListToAll();  // Update the user lists
//         // console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
//     });
// };

export const wssOnConnectionAlt = function (this: WebSocketServer, ws: WebSocket, request: http.IncomingMessage) {

    const clientId = generateClientID();
    const ip = getIpFromRequest(request);

    clients[clientId] = { socket: ws, username: clientId, ip }
    // TODO assign clientId, username, 

    // function originIsAllowed(origin: any) {
    //     // This is where you put code to ensure the connection should
    //     // be accepted. Return false if it shouldn't be.
    //     return true;
    // }

    // function isUsernameUnique(name: string): boolean {
    //     // return connectionArray.every(x => x.username !== name);
    //     return clients.every((x: any) => !('username' in x) || x.username !== name);
    // }

    const broadcast = (msg: any) => {
        this.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(msg);
            }
        });
    }

    ws.addEventListener('message', function (message: any) { // TODO type this later ??? MessageEvent? 
        console.log("***ALT RECEIVED MESSAGE: %s", message);
        ws.send(`Server (Alt listener) received: ${message}`);
        // this.send(`Server received something: ${message}`);
        if (!message) return;
        // console.log("UTF-8 Message: " + message.utf8Data);

        let msg: any
        try {
            msg = JSON.parse(message);
        } catch (err) {
            // console.log(err);
        }

        if (!msg) {
            if (typeof message !== 'string') message = String(message);
            msg = message.split('::');
            if (msg && msg.length > 1) {
                msg = {
                    type: msg[0],
                    content: msg.slice(1),
                }
                if (msg.type === "OPEN") {
                    msg.username = msg.content.join('')
                } else if (msg.type === "MESSAGE") {
                    msg.text = msg.content.join('').replace(/(<([^>]+)>)/ig);
                }
            } else {
                msg = { type: "ECHO", content: message };
                return;
            }
        }

        var connect = getConnectionForID(msg.id) 
            ?? clients[clientId] 
            ?? { socket: ws, username: msg.username ?? clientId };

        switch (msg.type) {
            case "OPEN":
            case "username":
                connect.username = msg.username
                broadcast(JSON.stringify(makeUserListMessage()));
                break;
            case "message":
            case "MESSAGE":
                msg.name = connect.username;
                msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
                broadcast(JSON.stringify(msg));
                break;
            case "ECHO":
                ws.send(`ECHO: ${msg.content}`)
            default:
                ws.send(`Received unknown message type: ${msg.type} from message: ${message}`);
        }

        // broadcast(JSON.stringify(msg));
    });
};

// export function wssOnConnectionOld (this: WebSocketServer, ws: WebSocket, request: http.IncomingMessage) {

//     const broadcast = (msg: any) => {
//         this.clients.forEach(function each(client) {
//             if (client.readyState === WebSocket.OPEN) {
//                 client.send(msg);
//             }
//         });
//     }

//     ws.on('message', function (message: any) { // TODO type this later ???
//         console.log("***MESSAGE (Old listener): %s", message);
//         ws.send(`Server received (Old listener): ${message}`);
//         // console.log("Received Message: " + message);
//         if (!message) return;

//         // Process messages
//         // var sendToClients = true;
//         let msg: any;
//         try {
//             msg = JSON.parse(message);
//         } catch (err: any) {
//             if (err instanceof SyntaxError) {
//                 console.warn(`Syntax error: ${err}`)
//             }
//             if (typeof message !== 'string') message = message.toString();
//             msg = message.split('::');
//             msg.type = msg[0];
//             if (msg.type == 'OPEN') {
//                 msg.name = msg[1];
//             } else if (msg.type == 'MESSAGE') {
//                 msg.text = msg[1];
//             }
//         }
//         var connect = getConnectionForID(msg.id);
//         if (!connect) {
//             console.warn(`Unable to find a valid connection for id: ${msg.id} from message: ${message}`)
//             // return;
//             connect = {
//                 socket: ws,
//                 username: '', // clientId,
//             }
//         }

//         // Look at the received message type and
//         // handle it appropriately.
//         switch (msg.type) {
//             // Public text message in the chat room
//             case "message":
//                 msg.name = connect.username;
//                 msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
//                 break;

//             // Username change request
//             case "username":
//                 // var nameChanged = false;
//                 // var origName = msg.name;

//                 // // Force a unique username by appending
//                 // // increasing digits until it's unique.
//                 // while (!isUsernameUnique(msg.name)) {
//                 //     msg.name = origName + appendToMakeUnique;
//                 //     appendToMakeUnique++;
//                 //     nameChanged = true;
//                 // }

//                 // // If the name had to be changed, reject the
//                 // // original username and let the other user
//                 // // know their revised name.
//                 // if (nameChanged) {
//                 //     var changeMsg = {
//                 //         id: msg.id,
//                 //         type: "rejectusername",
//                 //         name: msg.name
//                 //     };
//                 //     connect.sendUTF(JSON.stringify(changeMsg));
//                 // }

//                 connect.username = msg.name;
//                 // sendUserListToAll();
//                 broadcast(makeUserListMessage());
//                 break;
//         }

//         // // Convert the message back to JSON and send it out
//         // // to all clients.
//         // if (sendToClients) {
//         //     var msgString = JSON.stringify(msg);
//         //     var i;

//         //     for (i = 0; i < clients.length; i++) {
//         //         clients[i].sendUTF(msgString);
//         //     }
//         // }
//     });
// };
