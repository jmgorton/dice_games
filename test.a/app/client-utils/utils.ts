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

    const pywssURL = getWebSocketUrlByURI("pywss");

    // const socket = new WebSocket(pywssURL);
    const socket = getSocketWithListenersByURL(pywssURL, {
        ...pyWsEventHandlers,
        ...commonEventHandlers,
    });
    if (!socket) return;

    // socket.addEventListener('open', function (event) {
    //     console.log('Connected to server');
    //     // socket.send('Hello Server!');

    //     // ****** Add me to user list *******
    //     const nameEl = document.getElementById("namePy");
    //     if (!nameEl) return;
    //     const name = (nameEl as HTMLInputElement).value;
    //     socket.send(`OPEN::${name}`);
    //     enableChatInput();
    // });

    // socket.addEventListener('')
    // socket.addEventListener('open', pyOnOpen);

    // socket.addEventListener('message', function (event) {
    //     console.log('Message from server: ', event.data);
    //     // socket.close(); // Close connection after receiving one message

    //     const [msgType, msgContent] = event.data.split('::');
    //     if (msgType === "USERS") {
    //         updateUserlistBox(msgContent);
    //     } else if (msgType === "MESSAGE") {
    //         addChatMessageToChatBox(msgContent);
    //     }
    // });
    // socket.addEventListener('message', pyOnMessage);

    // ws = socket;
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
    console.log(evt.data);
    var msg = JSON.parse(evt.data);
    console.log("Message received: %s", msg);
    // console.dir(msg);
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
        var f = (chatboxEl as HTMLIFrameElement).contentDocument; // TODO no longer using iframes... or should i? 
        if (!f) return;
        f.write(text); // TODO deprecated, replace 
        var w = (chatboxEl as HTMLIFrameElement).contentWindow // TODO no longer using iframes... or should i? 
        if (!w) return;
        // w.scrollByPages(1); // non-standard, not included in TS Window interface
        // use scrollBy() instead
        w.scrollBy(0, window.innerHeight) // scroll up one "page" (approx) 
        // w.scrollBy(0, -window.innerHeight) // scroll down
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
    // ws = new WebSocket(playWSUrl, "json"); // test = websockb (JS) 
    const socket = getSocketWithListenersByURL(playWSUrl, {
        ...jsWsEventHandlers,
        ...commonEventHandlers,
    });
    if (!socket) return;

    // ws.onopen = function () {
    //     if (!ws || !document) return; // ??? 

    //     // Web Socket is connected, send data using send()
    //     ws.send(JSON.stringify("Connection successful!"));
    //     enableChatInput();
    // };

    // ws.onmessage = jsOnMessage;

    // ws.onmessage = function (evt) {
    //     // var msg = evt.data;
    //     // alert('Message is received... "' + msg + '"');

    //     var text = "";
    //     console.log(evt.data);
    //     var msg = JSON.parse(evt.data);
    //     console.log("Message received: %s", msg);
    //     // console.dir(msg);
    //     var time = new Date(msg.date);
    //     var timeStr = time.toLocaleTimeString();

    //     switch (msg.type) {
    //         case "id":
    //             clientID = msg.id;
    //             setUsername();
    //             break;
    //         case "username":
    //             text = "<b>User <em>" + msg.name + "</em> signed in at " + timeStr + "</b><br>";
    //             break;
    //         case "message":
    //             text = "(" + timeStr + ") <b>" + msg.name + "</b>: " + msg.text + "<br>";
    //             break;
    //         case "rejectusername":
    //             text = "<b>Your username has been set to <em>" + msg.name + "</em> because the name you chose is in use.</b><br>";
    //             break;
    //         case "userlist":
    //             var ul = "";
    //             var i;

    //             for (i = 0; i < msg.users.length; i++) {
    //                 ul += msg.users[i] + "<br>";
    //             }
    //             const userlistEl = document.getElementById("userlistbox");
    //             if (userlistEl) userlistEl.innerHTML = ul;
    //             break;
    //     }

    //     if (text.length) {
    //         const chatboxEl = document.getElementById("chatbox");
    //         if (!chatboxEl) return;
    //         var f = (chatboxEl as HTMLIFrameElement).contentDocument; // TODO no longer using iframes... or should i? 
    //         if (!f) return;
    //         f.write(text); // TODO deprecated, replace 
    //         var w = (chatboxEl as HTMLIFrameElement).contentWindow // TODO no longer using iframes... or should i? 
    //         if (!w) return;
    //         // w.scrollByPages(1); // non-standard, not included in TS Window interface
    //         // use scrollBy() instead
    //         w.scrollBy(0, window.innerHeight) // scroll up one "page" (approx) 
    //         // w.scrollBy(0, -window.innerHeight) // scroll down
    //     }
    // };

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

function send() {
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

function handleKey(evt: any) {
    if (evt.keyCode === 13 || evt.keyCode === 14) {
        const sendEl = document.getElementById("send");
        if (sendEl && sendEl instanceof HTMLButtonElement && !sendEl.disabled) {
            send();
        }
    }
}

// type="module" in index.html makes this an ES module 
// top-level functions are module-scoped, not globals
// onclick="connectPlay()" (or connectPyWSS()) run in the page global scope (window)
// and can't see the module-scoped names

// // approach 1: expose module functions onto global window scope
// // window.connectPyWSS = connectPyWSS;
// // approach 2 (better): remove inline onclick attribute, attach event listener here
// document.addEventListener("DOMContentLoaded", () => {
//     // console.log(`Document loaded from utils.js module in browser.`);
//     const pyLogin = document.getElementById("pywss-login")
//     if (pyLogin) pyLogin.addEventListener("click", connectPyWSS);
//     else console.log("Py WS Login Element not found.")
//     const jswsLogin = document.getElementById("test-ws-login")
//     if (jswsLogin) jswsLogin.addEventListener("click", connectWS);
//     else console.log("JS WS Login Element not found.")
//     const jswsbLogin = document.getElementById("test-wsb-login")
//     if (jswsbLogin) jswsbLogin.addEventListener("click", connectPlay);
//     else console.log("JS WSB Login Element not found.")
// })

document.addEventListener("DOMContentLoaded", async () => {
    if (document) {
        const hostnameEl = document.getElementById("hostname")
        if (hostnameEl) {
            const hostnameResponse = await fetch('http://localhost:1313/hostname');
            hostnameEl.innerText = await hostnameResponse.text();
            // const hostnamePromise = fetch('http://localhost:1313/hostname');
            // hostnamePromise.then((res: Response) => {
            //     if (!res || !res.body) return;
            //     res.body.pipeTo(hostnameEl.innerText as unknown as WritableStream);
            // })
        }
    } else {
        console.log("Document not found.");
    }
})

// dark mode 
document.body.style.backgroundColor = '#333';
document.body.style.color = 'white';

const style = document.createElement('style');
style.innerHTML = `
    .dynamic-link:link { color: cyan; }
    .dynamic-link:visited { color: limegreen; }
    .dynamic-link:hover { color: orange; }
    .dynamic-link:active { color: hotpink; }
    .dynamic-link { margin: 8px; }
`;
document.head.appendChild(style);
// const elements = document.getElementsByTagName("a");
// for (const element of elements) {
//     element.classList.add('dynamic-link');
// }

// generic styling 
// document.body.style.display = 'flex';
// document.body.style.flexDirection = 'column';
// document.body.style.alignContent = 'center';
// document.body.style.justifyContent = 'center';

document.addEventListener("DOMContentLoaded", () => {
    // const routes: string[] = ["/test", "/play", "/pywss"];
    // const labels: string[] = ["/test (websock) JS", "/play (websockb) Lotto Sim", "/pywss (websockc) PY"];
    const buttonAttrs = [
        { href: "/test", innerText: "/test (websock) JS" },
        { href: "/play", innerText: "/play (websockb) Lotto Sim" },
        { href: "/pywss", innerText: "/pywss (websockc) Python" },
    ]
    const navButtonDiv = document.getElementById("nav-buttons") as HTMLDivElement;
    navButtonDiv.style.display = "flex";
    navButtonDiv.style.flexDirection = "column";
    navButtonDiv.style.justifyContent = "center";
    for (let i = 0; i < 3; i++) {
        const navButton = document.createElement("a");
        Object.assign(navButton, buttonAttrs[i]);
        // navButton.href = routes[i]!; // why do i have to assert not undefined??
        // navButton.innerText = labels[i]!; // is it because i might be outside the range? 
        navButton.classList.add("dynamic-link");
        navButtonDiv.appendChild(navButton);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const websockButtonAttrs = {
        "textInput": {
            id: "name-ws",
            disabled: true,
        },
        "buttonInput": {
            id: "test-ws-login",
            value: "Connect (/test websock)",
            onclick: connectWS,
            disabled: true,
        },
    };
    const playWsButtonAttrs = {
        "textInput": {
            id: "name",
        },
        "buttonInput": {
            id: "test-wsb-login",
            value: "Connect (/play websockb)",
            onclick: connectPlay,
        },
    };
    const pyWsButtonAttrs = {
        "textInput": {
            id: "namePy",
        },
        "buttonInput": {
            id: "pywss-login",
            value: "Connect (/pywss websockc)",
            onclick: connectPyWSS,
        },
    };
    const buttonAttrs: any[] = [websockButtonAttrs, playWsButtonAttrs, pyWsButtonAttrs];
    const commonAttrs = {
        "textInput": {
            type: "text",
            maxLength: 20,
            placeholder: "Enter a username...",
        },
        "buttonInput": {
            type: "button",
            name: "login",
        }
    }

    const loginButtonDiv = document.getElementById("login-inputs") as HTMLDivElement;
    loginButtonDiv.style.display = "flex";
    loginButtonDiv.style.flexDirection = "column";
    loginButtonDiv.style.justifyContent = "center";
    loginButtonDiv.style.alignItems = "center";
    for (let i = 0; i < 3; i++) {
        const loginInput = document.createElement("p");
        const textInput = Object.assign(document.createElement("input"), buttonAttrs[i]["textInput"]);
        Object.assign(textInput, commonAttrs["textInput"]);
        loginInput.append(textInput); // append vs appendChild?? 
        const buttonInput = Object.assign(document.createElement("input"), buttonAttrs[i]["buttonInput"]); // button? or input type=button?
        Object.assign(buttonInput, commonAttrs["buttonInput"]);
        loginInput.append(buttonInput);
        loginButtonDiv.appendChild(loginInput);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const chatInputText = document.getElementById("text") as HTMLInputElement;
    chatInputText.type = "text";
    chatInputText.name = "text";
    // chatInputText.size = 80;
    chatInputText.maxLength = 512;
    chatInputText.placeholder = "Say something...";
    chatInputText.autocomplete = "on";
    chatInputText.onkeyup = handleKey;
    chatInputText.disabled = true;
    const chatInputSend = document.getElementById("send") as HTMLInputElement;
    chatInputSend.type = "button";
    chatInputSend.name = "send";
    chatInputSend.value = "Send";
    chatInputSend.onclick = send;
    chatInputSend.disabled = true;
})

// window.onload (older syntax)
// window.addEventListener('load') (more modern approach)

// window: the entire browser window or tab; the top-level global object 
//      in the browser's JS environment; good for managing browser-level
//      features, like history, location, storage, timers, etc.
// document the HTML content displayed within that window; a property of 
//      the window object and the root node of the DOM; good for managing
//      web page content, structure, and style (the DOM) 

// document events: onload vs. DOMContentLoaded
//      DOMContentLoaded fires when the initial HTML doc has been loaded
//      and parsed, and the DOM is built; does not wait for stylesheets,
//      images, or subframes to finish loading
//      onload (technically window.onload) fires when the entire page has
//      finished loading, including images, CSS, and subframes; 

