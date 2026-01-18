import {
    connectPyWSS,
    connectWS,
    connectPlay,
    send,
    handleKey
} from './utils.js'

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
            // hostnameEl.innerText = await hostnameResponse.text();
            if (hostnameResponse.ok || hostnameResponse.status == 200) {
                hostnameEl.innerText = await hostnameResponse.text();
            }
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

