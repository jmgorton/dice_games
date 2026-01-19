// "use strict";
// not necessary when moving from CommonJS to ES modules
// because ES modules are strict by default


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
    console.log('Connected to server');
    // socket.send('Hello Server!');

    // ****** Add me to user list *******
    const nameEl = document.getElementById("namePy");
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

const ws: WebSocket[] = [];
var clientID: number = 0;

export function connectPyWSS() {
    if (!browserSupportsWebSockets()) return;

    const pywssURL = getWebSocketUrlByURI("collab");

    // const socket = new WebSocket(pywssURL);
    const socket = getSocketWithListenersByURL(pywssURL, {
        ...pyWsEventHandlers,
        ...commonEventHandlers,
    });
    if (!socket) return;

    ws.push(socket);

}

export function connectWS() {
    if (!browserSupportsWebSockets()) return;

    // Let us open a web socket
    // var ws = new WebSocket("ws://localhost:1313/test");
    // ws = new WebSocket("ws://localhost:1313/test", "json"); // test = websock (JS) // protocols was json??
    // ws = new WebSocket("ws://localhost:1313/test");
    const loc = window.location;
    const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
    const host = loc.host; // ensure the browser connects to the same port nginx is listening on 
    const websockURL = `${protocol}//${host}/test`; // test = websock (JS) 

    const socket = new WebSocket(websockURL);

    socket.onopen = function () {
        // if (!ws || !document) return; // ??? 

        // Web Socket is connected, send data using send()
        socket.send(JSON.stringify("Connection successful!"));
        enableChatInput();
    };

    socket.onmessage = function (evt) {
        // var msg = evt.data;
        // alert('Message is received... "' + msg + '"');

        var text = "";
        console.log(evt.data);
        var msg = JSON.parse(evt.data);
        console.log("Message received: ");
        console.dir(msg);
        var time = new Date(msg.date);
        var timeStr = time.toLocaleTimeString();

        switch (msg.type) {
            case "id":
                clientID = msg.id;
                setUsername();
                break;
            case "username":
                text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
                break;
            case "message":
                text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
                break;
            case "rejectusername":
                text = "<b>Your username has been set to <em>" + msg.name + "</em> because the name you chose is in use.</b><br>";
                break;
            case "userlist":
                var ul = "";
                var i;

                for (i = 0; i < msg.users.length; i++) {
                    ul += msg.users[i] + "<br>";
                }
                const userlistEl = document.getElementById("userlistbox");
                if (userlistEl) userlistEl.innerHTML = ul;
                break;
        }

        if (text.length) {
            const chatboxEl = document.getElementById("chatbox");
            if (!chatboxEl) return;
            var f = (chatboxEl as HTMLIFrameElement).contentDocument;
            if (!f) return;
            f.write(text); // TODO deprecated, replace 
            var w = (chatboxEl as HTMLIFrameElement).contentWindow
            if (!w) return;
            // w.scrollByPages(1); // non-standard, not included in TS Window interface
            // use scrollBy() instead
            w.scrollBy(0, window.innerHeight) // scroll up one "page" (approx) 
            // w.scrollBy(0, -window.innerHeight) // scroll down
        }
    };

    socket.onclose = function () {
        // websocket is closed.
        console.log("Connection was closed...");
    };

    socket.onerror = function (err) {
        console.log(`WebSocket error: ${err}`);
    };

    ws.push(socket);
}

function jsOnOpen (this: WebSocket, event: Event) {
    // if (!ws || !document) return; // ??? 

    // Web Socket is connected, send data using send()
    this.send(JSON.stringify("Connection successful!"));
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
                    clientID = msg.id;
                    setUsername();
                    break;
                case "username":
                    text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
                    break;
                case "message":
                    text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
                    break;
                case "rejectusername":
                    text = "<b>Your username has been set to <em>" + msg.name + "</em> because the name you chose is in use.</b><br>";
                    break;
                case "userlist":
                    var ul = "";
                    var i;

                    for (i = 0; i < msg.users.length; i++) {
                        ul += msg.users[i] + "<br>";
                    }
                    const userlistEl = document.getElementById("userlistbox");
                    if (userlistEl) userlistEl.innerHTML = ul;
                    break;
            }
        }
    } catch (err: unknown) { // type must be unknown or any in catch block 
        if (err instanceof SyntaxError) {

        }
    }

    if (text.length) {
        // const chatboxEl = document.getElementById("chatbox");
        // if (!chatboxEl) return;
        // var f = (chatboxEl as HTMLIFrameElement).contentDocument; // TODO no longer using iframes... or should i? 
        // if (!f) return;
        // f.write(text); // TODO deprecated, replace 
        // var w = (chatboxEl as HTMLIFrameElement).contentWindow // TODO no longer using iframes... or should i? 
        // if (!w) return;
        // // w.scrollByPages(1); // non-standard, not included in TS Window interface
        // // use scrollBy() instead
        // w.scrollBy(0, window.innerHeight) // scroll up one "page" (approx) 
        // // w.scrollBy(0, -window.innerHeight) // scroll down

        addChatMessageToChatBox(text);
    }
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

    ws.push(socket);
}

function setUsername() {
    console.log("***SETUSERNAME");
    const nameEl = document.getElementById("name");
    if (!nameEl || !ws) return;
    var msg = {
        name: (nameEl as HTMLInputElement).value,
        date: Date.now(),
        id: clientID,
        type: "username"
    };
    // ws.send(JSON.stringify(msg));
    for (const conn of ws) {
        conn.send(JSON.stringify(msg));
    }
}

export function send() {
    if (!ws) {
        console.error("WebSocket connection is null. Can't send message.");
    }

    const textEl: HTMLInputElement | null = document.getElementById("text") as HTMLInputElement
    if (!textEl || !ws) return;
    var msg = {
        text: textEl.value,
        type: "message",
        id: clientID,
        date: Date.now()
    };
    console.log("***SEND: " + JSON.stringify(msg));

    // ws.send(`MESSAGE::${JSON.stringify(msg)}`);
    // ws.send(`MESSAGE::${textEl.value}`);
    for (const conn of ws) {
        conn.send(`MESSAGE::${textEl.value}`);
    }
    textEl.value = "";
}

export function handleKey(evt: any) {
    if (evt.keyCode === 13 || evt.keyCode === 14) {
        const sendEl = document.getElementById("send");
        // const sendEl = evt.currentTarget ?? 
        if (sendEl && sendEl instanceof HTMLButtonElement && !sendEl.disabled) {
            send();
        }
    }
}
