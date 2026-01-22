import {
    connectPyWSS,
    // connectWS,
    connectPlay,
    sendMessage,
    handleKey
} from './utils.js'
// import { uptime } from 'process';

// type="module" in index.html makes this an ES module 
// top-level functions are module-scoped, not globals
// onclick="connectPlay()" (or connectPyWSS()) run in the page global scope (window)
// and can't see the module-scoped names

// // approach 1: expose module functions onto global window scope
// // window.connectPyWSS = connectPyWSS;
// // approach 2 (better): remove inline onclick attribute, attach event listener here

document.addEventListener("DOMContentLoaded", async () => {
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
});

let intervalId: number | undefined;
const uptimeEl = document.getElementById("uptime");

const updateUptime = async () => {
    if (!uptimeEl) return;
    // TODO use window.loc or something
    const uptimeResponse = await fetch('http://localhost:1313/uptime');
    if (uptimeResponse.status == 200) uptimeEl.innerText = await uptimeResponse.text();
}

document.addEventListener('DOMContentLoaded', async () => {
    await updateUptime();
    if (intervalId) window.clearInterval(intervalId);
    intervalId = window.setInterval(updateUptime, 1000);
})

document.addEventListener('visibilitychange', () => {
    // let intervalId: number | undefined;
    // only two options are visible/hidden
    if (document.visibilityState === 'visible') {
        // const uptimeEl = document.getElementById("uptime");
        if (!intervalId) intervalId = window.setInterval(updateUptime, 1000);
    }
    else if (document.visibilityState === 'hidden') {
        if (intervalId) clearInterval(intervalId);
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
    const buttonAttrs = [
        { href: "/auth", innerText: "/auth (JS)" },
        { href: "/play", innerText: "/play (JS Lotto Sim)" },
        { href: "/collab", innerText: "/collab (Python)" },
    ]
    const navButtonDiv = document.getElementById("nav-buttons") as HTMLDivElement;
    navButtonDiv.style.display = "flex";
    navButtonDiv.style.flexDirection = "column";
    navButtonDiv.style.justifyContent = "center";
    for (let i = 0; i < 3; i++) {
        const navButton = document.createElement("a");
        Object.assign(navButton, buttonAttrs[i]);
        navButton.classList.add("dynamic-link");
        navButtonDiv.appendChild(navButton);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const websockButtonAttrs = {
        "textInput": {
            id: "name-auth",
            // disabled: true,
        },
        "buttonInput": {
            id: "auth-login",
            value: "Connect (/auth)",
            // onclick: connectWS,
            // disabled: true,
        },
    };
    const playWsButtonAttrs = {
        "textInput": {
            id: "name-play",
        },
        "buttonInput": {
            id: "play-login",
            value: "Connect (/play)",
            onclick: connectPlay,
        },
    };
    const pyWsButtonAttrs = {
        "textInput": {
            id: "name-collab",
        },
        "buttonInput": {
            id: "collab-login",
            value: "Connect (/collab)",
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
        const buttonInput = Object.assign(document.createElement("input"), buttonAttrs[i]["buttonInput"]);
        Object.assign(buttonInput, commonAttrs["buttonInput"]);
        loginInput.append(buttonInput);
        loginButtonDiv.appendChild(loginInput);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const chatInputText = document.getElementById("text") as HTMLInputElement;
    chatInputText.type = "text";
    chatInputText.name = "text";
    chatInputText.maxLength = 512;
    chatInputText.placeholder = "Say something...";
    chatInputText.autocomplete = "on";
    chatInputText.onkeyup = handleKey;
    chatInputText.disabled = true;
    const chatInputSend = document.getElementById("send") as HTMLInputElement;
    chatInputSend.type = "button";
    chatInputSend.name = "send";
    chatInputSend.value = "Send";
    chatInputSend.onclick = sendMessage;
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

