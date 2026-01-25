// "use strict";
// not necessary when moving from CommonJS to ES modules
// because ES modules are strict by default
// import WebSocket, { WebSocketServer } from 'ws';

// transpile .ts files to .js, import .js from the browser 
import { 
    browserSupportsWebSockets, 
    getSocketWithListenersByURL,
    getWebSocketUrlByURI,
} from "./utils-socket.js";

import {
    // enableChatInput,
    // addChatInput,
    updateUserlistBox,
    addChatMessageToChatBox,
    enableChatInput,
} from "./utils-ui.js"

// import os from 'os'; // os is a Node module, not available in browser
// this is a browser module

// WebSocket.addEventListener(
//  type: keyof WebSocketEventMap, 
//  listener: (
//      this: WebSocket, 
//      ev: Event | CloseEvent | MessageEvent<any>
//  ) => any, 
//  options?: boolean | AddEventListenerOptions
// ): void
// **** OR *****
// WebSocket.addEventListener(
//  type: string, 
//  listener: EventListenerOrEventListenerObject, 
//  options?: boolean | AddEventListenerOptions
// ): void

// const pyOnOpen: EventListenerOrEventListenerObject = (caller: WebSocket, ev: Event) => { 
function pyOnOpen (this: WebSocket, event: Event) {
    onOpen.call(this, event, "collab");
}

function jsOnOpen (this: WebSocket, event: Event) {
    onOpen.call(this, event, "play");
}

function onOpen (this: WebSocket, event: Event, target: string) {
    if (!target || !["play", "collab"].includes(target)) {
        console.log(`Not set up to handle target "${target}"...`);
        return;
    }

    // console.log(`Generic onOpen successfully connected: ${event}`);
    // we're connected, so set my username (and get a clientID back)
    // const nameEl = document.getElementById(`name-${target}`) 
    const nameEl = document.getElementById('connection-input-text');
    if (!nameEl || !(nameEl instanceof HTMLInputElement)) return;
    const name = nameEl.value;

    this.send(`OPEN::${name}`);
    // this.send(JSON.stringify({ type: "OPEN", username: name })) // only works on /play JS server so far 
    // enableChatInput();
    // addChatInput();
}

function pyOnMessage(this: WebSocket, event: MessageEvent<any>) { // : any 
    console.log('Message from PY server: ', event.data);
    onMessage.call(this, event, "collab");
};


function jsOnMessage(this: WebSocket, evt: MessageEvent<any>) {
    console.log(`Message from JS server: ${evt}`);
    onMessage.call(this, evt, "play");
};

export const validInputMessageTypes = ["ID", "USERS", "USERLIST", "MESSAGE", "ECHO"];
type MessageTypeFromClient = typeof validInputMessageTypes[number];

export interface MessageIn {
    [key: string]: any;
    type: MessageTypeFromClient;
    content?: string;
    users?: string;
    id?: string;
    name?: string;
    date?: string | number;
    text?: string;
}

const parseMessage = (message: any): MessageIn | undefined => {
    if (!message) return undefined;
    let msgContent = message.split('::');
    if (msgContent && msgContent.length === 2) {
        return {
            type: msgContent[0],
            content: msgContent[1]
        }
    }

    try {
        msgContent = JSON.parse(message);
        return msgContent;
    } catch (error: any) {
        console.warn(`Could not parse message: ${message}`);
        return undefined;
    }
}

function onMessage(this: WebSocket, event: MessageEvent<any>, source: string) {
    console.log('Message from server: ', event);
    // event has
    //  .origin = "ws://localhost:1313"
    //  .{target,srcElement}.url = "ws://localhost:1313/play"
    //  .timestamp 
    // but alternatively, can just pass in source 
    console.log(`Message Data: ${event.data}`);
    const messageIn = parseMessage(event.data);
    if (!messageIn || !('type' in messageIn)) return;

    switch (messageIn.type.toUpperCase()) {
        case "ID":
            if (!('id' in messageIn)) break;
            connections[messageIn.id] = { socket: this, target: source, name: messageIn.name };
            targetToClientId[source]?.add(messageIn.id)
            // addChatInput(messageIn.id);
            enableChatInput(messageIn.id, messageIn.name); // link username... 
            break;
        case 'USERS':
        case "USERLIST":
            // console.log(`Updating users for ${source} with ${messageIn.users}`)
            if (!(source in targetUserLists) || !targetUserLists[source as keyof typeof targetUserLists]) return;
            targetUserLists[source as keyof typeof targetUserLists] = messageIn.users?.split(';') ?? messageIn.content?.split(';') ?? [];
            // if (!(source in targetToClientId) || !targetToClientId[source]) return;
            // for (const clientId of targetToClientId[source]) {
            //     if (connections[clientId]) {
            //         // connections[clientId].users = messageIn.users ?? messageIn.userlist;
            //         // connections[clientId].users = messageIn.users ?? messageIn.content;
            //         targetUserLists[source as keyof typeof targetUserLists] = messageIn.users?.split(';') ?? messageIn.content?.split(';') ?? [];
            //         // console.log(`New userlist at ${clientId}: ${connections[clientId].users}`)
            //     }
            // }
            // updateUserlistBox(zipUserlists());
            updateUserlistBox(...Object.values(targetUserLists))
            break;
        case 'MESSAGE':
            // if ('date' in messageIn || 'name' in messageIn || 'text' in messageIn) {
            //     addChatMessageToChatBox(`(${messageIn.name ?? 'unknown user'} at ${messageIn.date ? new Date(messageIn.date).toLocaleTimeString() : 'unknown time'}): ${messageIn.text ?? messageIn.content ?? 'unknown'}`);
            // } else if ('content' in messageIn) {
            //     addChatMessageToChatBox(messageIn.content);
            // }
            addChatMessageToChatBox(messageIn);
            break;
        default:
            console.log(`Unknown type on message: ${messageIn}`)
    };
}

const jsWsEventHandlers = { // type annotations TODO
    'open': jsOnOpen,
    'message': jsOnMessage,
}

const pyWsEventHandlers = { // type annotations TODO
    'open': pyOnOpen,
    'message': pyOnMessage,
}

const connections: {
    // [key: string]: WebSocket;
    [target: string]: { // clientId? or move to server target ("play","collab") ?? 
        [key: string]: any;
        socket: WebSocket;
        // users?: string[];
        username?: string;
        clientId?: string;
        target?: string;
    }
} = {};

const targetToClientId: {
    [target: string]: Set<string>; // string | 
} = {
    "play": new Set(),
    "collab": new Set(),
}

let targetUserLists: {
    "play": string[];
    "collab": string[];
} = {
    "play": [],
    "collab": [],
}

// const zipUserlists = (): string[][] => {
//     let userlist: string[][] = [[],[]]
    
//     // console.log(`Zipping ${Object.keys(connections).length} userlists`);
//     for (const [clientId, connection] of Object.entries(connections)) {
//         // userlist = userlist.concat(connections[clientId]?.users ?? []);
//         if (connection.users) {
//             // userlist = userlist.concat(connection.users)
//             userlist.push(connection.users)
//         } else {
//             // console.log(`No users for connection: ${clientId}`)
//         }
//     }
//     return userlist;
// }

const targetToHandlersMap: {
    [target: string]: object;
} = {
    "collab": pyWsEventHandlers,
    "play": jsWsEventHandlers,
}

// target in Object.keys(targetToHandlersMap)
// ❌ WRONG: Object.keys() returns an array ["collab", "play"]
// Arrays are objects with numeric keys: 0, 1, 2, etc.
// So "play" in ["collab", "play"] checks if "play" is a key (it's not - "0" and "1" are)

// target in targetToHandlersMap
// ✅ CORRECT: targetToHandlersMap is { "collab": ..., "play": ... }
// So "play" in targetToHandlersMap checks if "play" is a key (it is!)

export function connect(target: string) {
    // console.log(`connect(${target})`);
    if (!browserSupportsWebSockets()) return;
    // const accepted = ["play","collab"];
    // if (!accepted.includes(target)) return;
    // if (!Object.keys(targetToHandlersMap).includes(target)) {
    if (!(target in targetToHandlersMap)) {
        console.log(`Invalid target: ${target}. Valid options are ${Object.keys(targetToHandlersMap)}`);
        return;
    }
    console.log(`Setting up sockets...`);
    const socketURL = getWebSocketUrlByURI(target);
    const socket = getSocketWithListenersByURL(socketURL, {...targetToHandlersMap[target]});
    if (!socket) {
        console.log(`Failed to configure socket.`);
        return;
    } else {
        console.log(`Configured valid socket with event listeners.`);
    }
    // store socket in lookup by target?? store id, username, etc. as subfields? 
    // curr key is id, only stored later after socket conn gives us one 
}

export function sendMessage(evt?: Event, clientId?: string) {
    console.log('SendMessage: Event...');
    if (evt) console.log(evt);
    // if (!ws) {
    if (!connections) {
        console.error("(All) WebSocket connection(s) is (are) null. Can't send message.");
    }

    // const thisEl = evt?.currentTarget;
    // let nameOrMessageEl;
    // let textEl;
    // if (thisEl instanceof HTMLInputElement) {
    //     if (thisEl.type === 'text') nameOrMessageEl = thisEl;
    //     else nameOrMessageEl = thisEl.parentElement?.firstChild;
    // }
    // if (nameOrMessageEl) {
    //     textEl = nameOrMessageEl as HTMLInputElement;
    // }

    const textEl = document.getElementById("chat-input-text");
    if (!textEl || !(textEl instanceof HTMLInputElement)) return;
    var msg = {
        text: textEl.value,
        type: "MESSAGE",
        // id: clientID,
        date: Date.now()
    };
    console.log("***SEND: " + JSON.stringify(msg));

    // ws.send(`MESSAGE::${JSON.stringify(msg)}`);
    // ws.send(`MESSAGE::${textEl.value}`);
    if (clientId) { // && connections && clientId in connections) {
        console.log(`Sending directly to socket w clientId: ${clientId}`);
        // connections[clientId]?.socket.send(`MESSAGE::${textEl.value}`);
        connections[clientId]?.socket.send(JSON.stringify({ ...msg, id: clientId }));
    } else {
        console.log(`Sending to all ${connections.length} connections.`);
        for (const [clientId, conn] of Object.entries(connections)) {
            // conn.socket.send(`MESSAGE::${textEl.value}`);
            conn.send(JSON.stringify({ ...msg, id: clientId }));
        }
    }
    textEl.value = "";
}

export function handleKey(evt: any, clientId?: string) {
    if (!(evt instanceof KeyboardEvent)) return;
    // console.log(`HandleKey: Event...`);
    // console.log(evt);
    // if (evt.keyCode === 13 || evt.keyCode === 14) {
    if (evt.key === 'Enter') {
        // const sendEl = document.getElementById("send");
        const sendEl = evt.currentTarget;
        // const sendEl = evt.currentTarget ?? 
        if (sendEl && sendEl instanceof HTMLButtonElement && !sendEl.disabled) {
            sendMessage(evt, clientId);
        }
    }
}
