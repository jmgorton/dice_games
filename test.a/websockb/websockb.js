const http = require('http');
const os = require('os');
const websocket = require('ws');

const hostname = '0.0.0.0';
const port = 9090;

var connectionArray = [];
var nextID = Date.now();
var appendToMakeUnique = 1;

// const wsserver = new websocket.Server({ port: port });

// wsserver.on('connection', ws => {
//     ws.on('message', message => {
//         console.log(`Received message: ${message}`);
//     });

//     ws.send('Hello from the websocket server...');
// });


// // nginx example code...
console.log("websocket Server started");

var WebSocketServer = websocket.Server, wss = new WebSocketServer({ port: port }); // was 8010 in example

wss.on('connection', function (ws) {
    ws.on('message', function (message) {
        console.log('Received from client: %s', message);
        ws.send(JSON.stringify('Server received from client: ' + message));
    });

    ws.on('message', function (message) {
        console.log("***MESSAGE");
        if (message.type === 'utf8') {
            console.log("Received Message: " + message.utf8Data);

            // Process messages
            var sendToClients = true;
            msg = JSON.parse(message.utf8Data);
            var connect = getConnectionForID(msg.id);

            // Look at the received message type and
            // handle it appropriately.
            switch (msg.type) {
                // Public text message in the chat room
                case "message":
                    msg.name = connect.username;
                    msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
                    break;

                // Username change request
                case "username":
                    var nameChanged = false;
                    var origName = msg.name;

                    // Force a unique username by appending
                    // increasing digits until it's unique.
                    while (!isUsernameUnique(msg.name)) {
                        msg.name = origName + appendToMakeUnique;
                        appendToMakeUnique++;
                        nameChanged = true;
                    }

                    // If the name had to be changed, reject the
                    // original username and let the other user
                    // know their revised name.
                    if (nameChanged) {
                        var changeMsg = {
                            id: msg.id,
                            type: "rejectusername",
                            name: msg.name
                        };
                        connect.sendUTF(JSON.stringify(changeMsg));
                    }

                    connect.username = msg.name;
                    sendUserListToAll();
                    break;
            }

            // Convert the message back to JSON and send it out
            // to all clients.
            if (sendToClients) {
                var msgString = JSON.stringify(msg);
                var i;

                for (i = 0; i < connectionArray.length; i++) {
                    connectionArray[i].sendUTF(msgString);
                }
            }
        }
    });
});

/** start helper methods */

function originIsAllowed(origin) {
    // This is where you put code to ensure the connection should
    // be accepted. Return false if it shouldn't be.
    return true;
}

function isUsernameUnique(name) {
    var isUnique = true;
    var i;

    for (i = 0; i < connectionArray.length; i++) {
        if (connectionArray[i].username === name) {
            isUnique = false;
            break;
        }
    }
    return isUnique;
}

function getConnectionForID(id) {
    var connect = null;
    var i;

    for (i = 0; i < connectionArray.length; i++) {
        if (connectionArray[i].clientID === id) {
            connect = connectionArray[i];
            break;
        }
    }

    return connect;
}

function makeUserListMessage() {
    var userListMsg = {
        type: "userlist",
        users: []
    };
    var i;

    // Add the users to the list

    for (i = 0; i < connectionArray.length; i++) {
        userListMsg.users.push(connectionArray[i].username);
    }

    return userListMsg;
}

function sendUserListToAll() {
    var userListMsg = makeUserListMessage();
    var userListMsgStr = JSON.stringify(userListMsg);
    var i;

    for (i = 0; i < connectionArray.length; i++) {
        connectionArray[i].sendUTF(userListMsgStr);
    }
}

/** end helper methods */

wss.on('request', function (request) {
    console.log("Handling request from " + request.origin);
    if (!originIsAllowed(request.origin)) {
        request.reject();
        console.log("Connection from " + request.origin + " rejected.");
        return;
    }

    // Accept the request and get a connection.
    var connection = request.accept("json", request.origin);

    // Add the new connection to our list of connections.
    console.log((new Date()) + " Connection accepted.");
    connectionArray.push(connection);

    // Send the new client its token; it will
    // respond with its login username.
    connection.clientID = nextID;
    nextID++;

    var msg = {
        type: "id",
        id: connection.clientID
    };
    connection.sendUTF(JSON.stringify(msg));

    // Handle the "message" event received over WebSocket. This
    // is a message sent by a client, and may be text to share with
    // other users or a command to the server.

    connection.on('message', function (message) {
        console.log("***MESSAGE");
        if (message.type === 'utf8') {
            console.log("Received Message: " + message.utf8Data);

            // Process messages
            var sendToClients = true;
            msg = JSON.parse(message.utf8Data);
            var connect = getConnectionForID(msg.id);

            // Look at the received message type and
            // handle it appropriately.
            switch (msg.type) {
                // Public text message in the chat room
                case "message":
                    msg.name = connect.username;
                    msg.text = msg.text.replace(/(<([^>]+)>)/ig, "");
                    break;

                // Username change request
                case "username":
                    var nameChanged = false;
                    var origName = msg.name;

                    // Force a unique username by appending
                    // increasing digits until it's unique.
                    while (!isUsernameUnique(msg.name)) {
                        msg.name = origName + appendToMakeUnique;
                        appendToMakeUnique++;
                        nameChanged = true;
                    }

                    // If the name had to be changed, reject the
                    // original username and let the other user
                    // know their revised name.
                    if (nameChanged) {
                        var changeMsg = {
                            id: msg.id,
                            type: "rejectusername",
                            name: msg.name
                        };
                        connect.sendUTF(JSON.stringify(changeMsg));
                    }

                    connect.username = msg.name;
                    sendUserListToAll();
                    break;
            }

            // Convert the message back to JSON and send it out
            // to all clients.
            if (sendToClients) {
                var msgString = JSON.stringify(msg);
                var i;

                for (i = 0; i < connectionArray.length; i++) {
                    connectionArray[i].sendUTF(msgString);
                }
            }
        }
    });

    // Handle the WebSocket "close" event; this means a user has logged off
    // or has been disconnected.

    connection.on('close', function (connection) {
        connectionArray = connectionArray.filter(function (el, idx, ar) {
            return el.connected;
        });
        sendUserListToAll();  // Update the user lists
        console.log((new Date()) + " Peer " + connection.remoteAddress + " disconnected.");
    });
});
