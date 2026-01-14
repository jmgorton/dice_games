// "use strict";
// not necessary when moving from CommonJS to ES modules
// because ES modules are strict by default

// import "./eventhandlers";
// const handlers = require('./utils-socket.ts');
// transpile .ts files to .js, import .js from the browser 
// ensure utils-socket.js is present in the served folder 
// import handlers from './utils-socket.js';
// import { getSocketWithListenersByURL } from "./utils-socket.js";

// import os from 'os'; // os is a Node module, not available in browser
// this is a browser module


var ws: WebSocket | undefined = undefined;
var clientID: number = 0;

function browserSupportsWebSockets() {
    const isSupported = Boolean("WebSocket" in window);
    if (!isSupported) alert("WebSockets not supported by browser.");
    return isSupported;
}

export function connectPyWSS() {
    if (!browserSupportsWebSockets()) return;

    const loc = window.location;
    const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
    const host = loc.host; // ensure the browser connects to the same port nginx is listening on 
    const pywssURL = `${protocol}//${host}/pywss`; // pywss = websockc (Python) 

    // const socket = handlers.getSocketWithListenersByURL(pywssURL);
    // const socket = getSocketWithListenersByURL(pywssURL);

    const socket = new WebSocket(pywssURL);

    socket.addEventListener('open', function (event) {
        console.log('Connected to server');
        // socket.send('Hello Server!');

        // ****** Add me to user list *******
        const nameEl = document.getElementById("namePy");
        if (!nameEl) return;
        const name = (nameEl as HTMLInputElement).value;
        socket.send(`OPEN::${name}`);
    });

    socket.addEventListener('message', function (event) {
        console.log('Message from server: ', event.data);
        // socket.close(); // Close connection after receiving one message

        const [msgType, msgContent] = event.data.split('::');
        if (msgType === "USERS") {
            const userlistBoxEl = document.getElementById("userlistbox");
            if (!userlistBoxEl) return;
            const userlist: string[] = msgContent.split(';');
            const newUserListHTMLItems: string[] = userlist.map((user, index) => {
                return (`<li key=${index}>${user}</li>`)
            })
            userlistBoxEl.innerHTML = `<ul>${newUserListHTMLItems.join('')}</ul>`;
        }
    });

    socket.addEventListener('close', function (event) {
        console.log('Connection closed');
    });

    socket.addEventListener('error', function (error) {
        console.error('WebSocket Error: ', error);
    });

}

export function connectWS() {
    if (!browserSupportsWebSockets()) return;

    // Let us open a web socket
    // var ws = new WebSocket("ws://localhost:1313/test");
    // ws = new WebSocket("ws://localhost:1313/chat", "json"); // chat = websock (JS) // protocols was json??
    // ws = new WebSocket("ws://localhost:1313/chat");
    const loc = window.location;
    const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
    const host = loc.host; // ensure the browser connects to the same port nginx is listening on 
    const websockURL = `${protocol}//${host}/chat`; // chat = websock (JS) 

    ws = new WebSocket(websockURL);

    ws.onopen = function () {
        if (!ws || !document) return; // ??? 

        // Web Socket is connected, send data using send()
        ws.send(JSON.stringify("Connection successful!"));
        const textEl: HTMLElement | null = document.getElementById("text");
        if (textEl) (textEl as HTMLInputElement).disabled = false;
        const sendEl: HTMLElement | null = document.getElementById("send");
        if (sendEl) (sendEl as HTMLButtonElement).disabled = false;
    };

    ws.onmessage = function (evt) {
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

    ws.onclose = function () {
        // websocket is closed.
        console.log("Connection was closed...");
    };

    ws.onerror = function (err) {
        console.log(`WebSocket error: ${err}`);
    };
}

export function connect() {
    if (!browserSupportsWebSockets()) return;

    // Let us open a web socket
    // var ws = new WebSocket("ws://localhost:1313/test");
    ws = new WebSocket("ws://localhost:1313/test", "json"); // test = websockb (JS) 

    ws.onopen = function () {
        if (!ws || !document) return; // ??? 

        // Web Socket is connected, send data using send()
        ws.send(JSON.stringify("Connection successful!"));
        const textEl: HTMLElement | null = document.getElementById("text");
        if (textEl) (textEl as HTMLInputElement).disabled = false;
        const sendEl: HTMLElement | null = document.getElementById("send");
        if (sendEl) (sendEl as HTMLButtonElement).disabled = false;
    };

    ws.onmessage = function (evt) {
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

    ws.onclose = function () {
        // websocket is closed.
        console.log("Connection was closed...");
    };

    ws.onerror = function (err) {
        console.log(`WebSocket error: ${err}`);
    };
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
    ws.send(JSON.stringify(msg));
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

    ws.send(JSON.stringify(msg));
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
// onclick="connect()" (or connectPyWSS()) run in the page global scope (window)
// and can't see the module-scoped names

// approach 1: expose module functions onto global window scope
// window.connectPyWSS = connectPyWSS;

// approach 2 (better): remove inline onclick attribute, attach event listener here
document.addEventListener("DOMContentLoaded", () => {
    // console.log(`Document loaded from utils.js module in browser.`);
    const pyLogin = document.getElementById("pywss-login")
    if (pyLogin) pyLogin.addEventListener("click", connectPyWSS);
    else console.log("Py WS Login Element not found.")
    const jswsLogin = document.getElementById("test-ws-login")
    if (jswsLogin) jswsLogin.addEventListener("click", connectWS);
    else console.log("JS WS Login Element not found.")
    const jswsbLogin = document.getElementById("test-wsb-login")
    if (jswsbLogin) jswsbLogin.addEventListener("click", connect);
    else console.log("JS WSB Login Element not found.")
})

document.addEventListener("DOMContentLoaded", async () => {
    if (document) {
        const hostnameEl = document.getElementById("hostname")
        if (hostnameEl) {
            const hostnameResponse = await fetch('http://localhost:1313/hostname');
            hostnameEl.innerText = await hostnameResponse.text();
            // const hostnamePromise = fetch('http://localhost:1313/hostname');
            // console.log(hostnamePromise);
            // // hostnameEl.innerText = hostname;
            // hostnamePromise.then((res: Response) => {
            //     console.log(res);
            //     // hostnameEl.innerText = res.body.pipeTo;
            //     if (!res || !res.body) return;
            //     res.body.pipeTo(hostnameEl.innerText as unknown as WritableStream);
            // })
        }
    } else {
        console.log("Document not found.");
    }
})
