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


var ws = null;
var clientID = 0;

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
    const pywssURL = `${protocol}//${host}/pywss`;

    // const socket = handlers.getSocketWithListenersByURL(pywssURL);
    // const socket = getSocketWithListenersByURL(pywssURL);

    const socket = new WebSocket(pywssURL);

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

export function connect() {
    if (!browserSupportsWebSockets()) return;

    // Let us open a web socket
    // var ws = new WebSocket("ws://localhost:1313/test");
    ws = new WebSocket("ws://localhost:1313/test", "json"); 

    ws.onopen = function () {
        // Web Socket is connected, send data using send()
        ws.send(JSON.stringify("Connection successful!"));
        document.getElementById("text").disabled = false;
        document.getElementById("send").disabled = false;
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
                document.getElementById("userlistbox").innerHTML = ul;
                break;
        }

        if (text.length) {
            var f = document.getElementById("chatbox").contentDocument;
            f.write(text);
            document.getElementById("chatbox").contentWindow.scrollByPages(1);
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
    var msg = {
        name: document.getElementById("name").value,
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

    var msg = {
        text: document.getElementById("text").value,
        type: "message",
        id: clientID,
        date: Date.now()
    };
    console.log("***SEND: " + JSON.stringify(msg));

    ws.send(JSON.stringify(msg));
    document.getElementById("text").value = "";
}

function handleKey(evt) {
    if (evt.keyCode === 13 || evt.keyCode === 14) {
        if (!document.getElementById("send").disabled) {
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
    console.log(`Document loaded from utils.js module in browser.`);
    const pyLogin = document.getElementById("pywss-login")
    if (pyLogin) pyLogin.addEventListener("click", connectPyWSS);
    else console.log("Py WS Login not found.")
    const jswsLogin = document.getElementById("test-login")
    if (jswsLogin) jswsLogin.addEventListener("click", connect);
    else console.log("JS WS Login not found.")
    
    if (document) {
        const hostnameEl = document.getElementById("hostname")
        if (hostnameEl) {
            // hostnameEl.innerHTML = os.hostname();
            const hostnamePromise = fetch('http://localhost:1313/hostname');
            console.log(hostnamePromise);
            // hostnameEl.innerText = hostname;
            hostnamePromise.then((res) => {
                console.log(res);
                // hostnameEl.innerText = res.body.pipeTo;
                res.body.pipeTo(hostnameEl.innerText);
            })
        }
    } else {
        console.log("Document not found.");
    }
})
