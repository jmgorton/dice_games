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
    enableChatInput,
    updateUserlistBox,
    addChatMessageToChatBox,
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

function commonOnClose(this: WebSocket, ev: CloseEvent): any {
    // websocket is closed.
    console.log("From connectPlay(): `ws.onclose`: Connection was closed...");
};

// function commonOnError(this: WebSocket, err: Error): any{
function commonOnError(this: WebSocket, ev: Event): void {
    // console.log(`From connectPlay(): \`ws.onerror\`: WebSocket error: ${err}`);
    console.log(`From commonOnError(): Websocket error event: ${ev}`);
};

const commonEventHandlers = { // type annotations TODO
    'close': commonOnClose,
    'error': commonOnError,
}

// const pyOnOpen: EventListenerOrEventListenerObject = (caller: WebSocket, ev: Event) => { 
function pyOnOpen (this: WebSocket, event: Event) {
// const pyOnOpen = function (self: WebSocket, event: Event): any {
    this.send(JSON.stringify("Connection successful!"));
    console.log('Connected to server');
    // socket.send('Hello Server!');

    // ****** Add me to user list *******
    const nameEl = document.getElementById("name-collab");
    if (!nameEl) return;
    const name = (nameEl as HTMLInputElement).value;
    this.send(`OPEN::${name}`); 
    // in the context of this function, `this` should refer to WebSocket 
    enableChatInput();
}

function pyOnMessage(this: WebSocket, event: MessageEvent<any>) { // : any 
    console.log('Message from server: ', event.data);

    const [msgType, msgContent] = event.data.split('::');
    if (msgType === "USERS") {
        updateUserlistBox(msgContent);
    } else if (msgType === "MESSAGE") {
        addChatMessageToChatBox(msgContent);
    }
};

const pyWsEventHandlers = { // type annotations TODO
    'open': pyOnOpen,
    'message': pyOnMessage,
}

// const ws: WebSocket[] = [];
// var clientID: number = 0;
const connections: {
    [key: string]: WebSocket;
} = {};

export function connectPyWSS() {
    if (!browserSupportsWebSockets()) return;

    const pywssURL = getWebSocketUrlByURI("collab");

    // const socket = new WebSocket(pywssURL);
    const socket = getSocketWithListenersByURL(pywssURL, {
        ...pyWsEventHandlers,
        ...commonEventHandlers,
    });

    if (!socket) return;

    // ws.push(socket);

}

// export function connectWS() {
//     if (!browserSupportsWebSockets()) return;

//     // const loc = window.location;
//     // const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
//     // const host = loc.host; // ensure the browser connects to the same port nginx is listening on 
//     // const websockURL = `${protocol}//${host}/auth`; // auth = auth (JS) 
//     const authURL = getWebSocketUrlByURI("auth")

//     const socket = new WebSocket(authURL); // "json" protocols ?? 

//     // socket.onopen = jsOnOpen; // getElementById wrong 
//     // socket.onmessage = jsOnMessage;
//     // socket.onclose = commonOnClose;
//     // socket.onerror = commonOnError;

//     ws.push(socket);
// }

function jsOnOpen (this: WebSocket, event: Event) {
    // if (!ws || !document) return; // ??? 

    // Web Socket is connected, send data using send()
    this.send(JSON.stringify("Connection successful!"));
    console.log('Connected to server');

    // ****** Add me to user list *******
    const nameEl = document.getElementById("name-play");
    if (!nameEl) return;
    const name = (nameEl as HTMLInputElement).value;
    this.send(`OPEN::${name}`); 
    this.send(JSON.stringify({ type: "OPEN", username: name }))
    // in the context of this function, `this` should refer to WebSocket 
    enableChatInput();
}

function jsOnMessage(this: WebSocket, evt: MessageEvent<any>) {
    // var msg = evt.data;
    // alert('Message is received... "' + msg + '"');

    var text = "";
    // console.log(evt.data);
    var msg = evt.data;
    // console.dir(msg);
    console.log("Message received: %s", msg);
    var timeStr = 'unknown'
    try {
        var msg = JSON.parse(evt.data);
        if ('date' in msg) {
            var time = new Date(msg.date);
            timeStr = time.toLocaleTimeString();
        }

        if ('type' in msg) {
            switch (msg.type) {
                case "id":
                    // clientID = msg.id;
                    connections[msg.id] = this;
                    // setUsername();
                    break;
                case "username":
                    // text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
                    updateUserlistBox(msg.userlist);
                    break;
                case "message":
                    text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
                    addChatMessageToChatBox(text);
                    break;
                // case "rejectusername":
                //     text = "<b>Your username has been set to <em>" + msg.name + "</em> because the name you chose is in use.</b><br>";
                //     break;
                case "userlist":
                    // var ul = "";
                    // var i;

                    // for (i = 0; i < msg.users.length; i++) {
                    //     ul += msg.users[i] + "<br>";
                    // }
                    // const userlistEl = document.getElementById("userlistbox");
                    // if (userlistEl) userlistEl.innerHTML = ul;
                    // break;
                    updateUserlistBox(msg.users ?? msg.userlist);
                    break;
            }
        } else {
            console.log(`Could not find type in parsed message: ${msg}`);
        }
    } catch (err: any) { // type must be unknown or any in catch block 
        if (err instanceof SyntaxError) {
            // console.log(err);
            console.log(`Could not parse message from server: ${evt.data}`);
        }
    }

    // if (text.length) {
    //     // const chatboxEl = document.getElementById("chatbox");
    //     // if (!chatboxEl) return;
    //     // var f = (chatboxEl as HTMLIFrameElement).contentDocument; // TODO no longer using iframes... or should i? 
    //     // if (!f) return;
    //     // f.write(text); // TODO deprecated, replace 
    //     // var w = (chatboxEl as HTMLIFrameElement).contentWindow // TODO no longer using iframes... or should i? 
    //     // if (!w) return;
    //     // // w.scrollByPages(1); // non-standard, not included in TS Window interface
    //     // // use scrollBy() instead
    //     // w.scrollBy(0, window.innerHeight) // scroll up one "page" (approx) 
    //     // // w.scrollBy(0, -window.innerHeight) // scroll down

    //     addChatMessageToChatBox(text);
    // }
};

const jsWsEventHandlers = { // type annotations TODO
    'open': jsOnOpen,
    'message': jsOnMessage,
}

export function connectPlay() {
    if (!browserSupportsWebSockets()) return;

    const playWSUrl = getWebSocketUrlByURI("play");
    // var ws = new WebSocket("ws://localhost:1313/play");
    // ws = new WebSocket(playWSUrl, "json"); // test = play (JS) 
    const socket = getSocketWithListenersByURL(playWSUrl, {
        ...jsWsEventHandlers,
        ...commonEventHandlers,
    });
    if (!socket) return;

    // ws.push(socket);
}

// function setUsername() {
//     console.log("***SETUSERNAME");
//     const nameEl = document.getElementById("name");
//     if (!nameEl || !ws) return;
//     var msg = {
//         name: (nameEl as HTMLInputElement).value,
//         date: Date.now(),
//         id: clientID,
//         type: "username"
//     };
//     // ws.send(JSON.stringify(msg));
//     for (const conn of ws) {
//         conn.send(JSON.stringify(msg));
//     }
// }

export function sendMessage() {
    // if (!ws) {
    if (!connections) {
        console.error("(All) WebSocket connection(s) is (are) null. Can't send message.");
    }

    const textEl: HTMLInputElement | null = document.getElementById("text") as HTMLInputElement
    if (!textEl) return;
    var msg = {
        text: textEl.value,
        type: "message",
        // id: clientID,
        date: Date.now()
    };
    console.log("***SEND: " + JSON.stringify(msg));

    // ws.send(`MESSAGE::${JSON.stringify(msg)}`);
    // ws.send(`MESSAGE::${textEl.value}`);
    for (const [clientId, conn] of Object.entries(connections)) {
        conn.send(`MESSAGE::${textEl.value}`);
        conn.send(JSON.stringify({ ...msg, id: clientId }));
    }
    textEl.value = "";
}

export function handleKey(evt: any) {
    if (evt.keyCode === 13 || evt.keyCode === 14) {
        const sendEl = document.getElementById("send");
        // const sendEl = evt.currentTarget ?? 
        if (sendEl && sendEl instanceof HTMLButtonElement && !sendEl.disabled) {
            sendMessage();
        }
    }
}
