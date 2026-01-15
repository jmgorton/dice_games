// "use strict";
// not necessary when moving from CommonJS to ES modules
// because ES modules are strict by default

// import "./eventhandlers";
// const handlers = require('./utils-socket.ts');
// transpile .ts files to .js, import .js from the browser 
// ensure utils-socket.js is present in the served folder 
// import handlers from './utils-socket.js';
import { 
    browserSupportsWebSockets, 
    getSocketWithListenersByURL 
} from "./utils-socket.js";

// import os from 'os'; // os is a Node module, not available in browser
// this is a browser module


var ws: WebSocket | undefined = undefined;
var clientID: number = 0;

// function browserSupportsWebSockets() {
//     const isSupported = Boolean("WebSocket" in window);
//     if (!isSupported) alert("WebSockets not supported by browser.");
//     return isSupported;
// }

function enableChatInput() {
    const textEl: HTMLElement | null = document.getElementById("text");
    if (textEl) (textEl as HTMLInputElement).disabled = false;
    const sendEl: HTMLElement | null = document.getElementById("send");
    if (sendEl) (sendEl as HTMLButtonElement).disabled = false;
}

export function connectPyWSS() {
    if (!browserSupportsWebSockets()) return;

    const loc = window.location;
    const protocol = loc.protocol === "https:" ? "wss:" : "ws:";
    const host = loc.host; // ensure the browser connects to the same port nginx is listening on 
    const pywssURL = `${protocol}//${host}/pywss`; // pywss = websockc (Python) 

    // const socket = handlers.getSocketWithListenersByURL(pywssURL);
    // const socket = getSocketWithListenersByURL(pywssURL); // maintain reference to socket 

    const socket = new WebSocket(pywssURL);

    socket.addEventListener('open', function (event) {
        console.log('Connected to server');
        // socket.send('Hello Server!');

        // ****** Add me to user list *******
        const nameEl = document.getElementById("namePy");
        if (!nameEl) return;
        const name = (nameEl as HTMLInputElement).value;
        socket.send(`OPEN::${name}`);
        enableChatInput();
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
        } else if (msgType === "MESSAGE") {
            const chatboxEl = document.getElementById("chatbox");
            if (!chatboxEl) return;
            const newMsgDiv = document.createElement("div");
            newMsgDiv.style.borderRadius = "12px";
            newMsgDiv.style.backgroundColor = "blue";
            newMsgDiv.style.maxWidth = "fit-content";
            newMsgDiv.innerText = msgContent;
            chatboxEl.appendChild(newMsgDiv);
        }
    });

    socket.addEventListener('close', function (event) {
        console.log('Connection closed');
    });

    socket.addEventListener('error', function (error) {
        console.error('WebSocket Error: ', error);
    });

    ws = socket;

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
        enableChatInput();
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
        enableChatInput();
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

    // ws.send(`MESSAGE::${JSON.stringify(msg)}`);
    ws.send(`MESSAGE::${textEl.value}`);
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
//     if (jswsbLogin) jswsbLogin.addEventListener("click", connect);
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
    const routes: string[] = ["/chat", "/test", "/pywss"];
    const labels: string[] = ["/chat (websock) Lotto Sim", "/test (websockb) JS", "/pywss (websockc) PY"];
    const navButtonDiv = document.getElementById("nav-buttons") as HTMLDivElement;
    navButtonDiv.style.display = "flex";
    navButtonDiv.style.flexDirection = "column";
    navButtonDiv.style.justifyContent = "center";
    for (let i = 0; i < 3; i++) {
        const navButton = document.createElement("a");
        navButton.href = routes[i]!; // why do i have to assert not undefined??
        navButton.innerText = labels[i]!; // is it because i might be outside the range? 
        navButton.classList.add("dynamic-link");
        navButtonDiv.appendChild(navButton);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const textInputIds: string[] = ["name-ws", "name", "namePy"];
    const buttonInputIds: string[] = ["test-ws-login", "test-wsb-login", "pywss-login"];
    const buttonInputLabels: string[] = ["Connect (/chat websock)", "Connect (/test websockb)", "Connect (/pywss websockc"];
    const buttonOnClickListeners = [connectWS, connect, connectPyWSS];
    const loginButtonDiv = document.getElementById("login-inputs") as HTMLDivElement;
    loginButtonDiv.style.display = "flex";
    // loginButtonDiv.style.gap = "10px";
    loginButtonDiv.style.flexDirection = "column";
    loginButtonDiv.style.justifyContent = "center";
    loginButtonDiv.style.alignItems = "center";
    for (let i = 0; i < 3; i++) {
        const loginInput = document.createElement("p");
        // loginInput.innerText = "Enter a username: ";
        const textInput = document.createElement("input");
        textInput.type = "text";
        textInput.maxLength = 20;
        textInput.placeholder = "Enter a username...";
        textInput.id = textInputIds[i]!;
        loginInput.append(textInput); // append vs appendChild?? 
        const buttonInput = document.createElement("input") // button? or input type=button?
        buttonInput.type = "button";
        buttonInput.name = "login";
        buttonInput.id = buttonInputIds[i]!;
        buttonInput.value = buttonInputLabels[i]!; // value works with "input" el, not sure what "button" equiv is 
        buttonInput.addEventListener("click", buttonOnClickListeners[i]!);
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

