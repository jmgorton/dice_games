// /** start helper methods */

// var connectionArray: any[] = []; // TODO remove, use wss.clients and if (client.readyState === WebSocket.OPEN)
// // See: https://www.npmjs.com/package/ws # Server broadcast 
// // var nextID = Date.now();

// function originIsAllowed(origin: any) {
//     // This is where you put code to ensure the connection should
//     // be accepted. Return false if it shouldn't be.
//     return true;
// }

// function isUsernameUnique(name: string) {
//     var isUnique = true;
//     var i;

//     for (i = 0; i < connectionArray.length; i++) {
//         if (connectionArray[i].username === name) {
//             isUnique = false;
//             break;
//         }
//     }
//     return isUnique;
// }

// function getConnectionForID(id: number) {
//     var connect = null;
//     var i;

//     for (i = 0; i < connectionArray.length; i++) {
//         if (connectionArray[i].clientID === id) {
//             connect = connectionArray[i];
//             break;
//         }
//     }

//     return connect;
// }

// function makeUserListMessage() {
//     var userListMsg = {
//         type: "userlist",
//         users: [] as string[],
//     };
//     var i;

//     // Add the users to the list

//     for (i = 0; i < connectionArray.length; i++) {
//         userListMsg.users.push(connectionArray[i].username);
//     }

//     return userListMsg;
// }

// function sendUserListToAll() {
//     var userListMsg = makeUserListMessage();
//     var userListMsgStr = JSON.stringify(userListMsg);
//     var i;

//     for (i = 0; i < connectionArray.length; i++) {
//         connectionArray[i].sendUTF(userListMsgStr);
//     }
// }