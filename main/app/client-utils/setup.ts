import {
    connect,
    // sendMessage,
    // handleKey
} from './utils.js'
// import { uptime } from 'process';

// type="module" in index.html makes this an ES module 
// top-level functions are module-scoped, not globals
// onclick="connectPlay()" (or connectPyWSS()) run in the page global scope (window)
// and can't see the module-scoped names

// // approach 1: expose module functions onto global window scope
// // window.connectPyWSS = connectPyWSS;
// // approach 2 (better): remove inline onclick attribute, attach event listener here

const loc = window.location;
const protocol = loc.protocol; // === "https:" ? "wss:" : "ws:"; 
const host = loc.host; // ensure the browser connects to the same port nginx is listening on 
const URL = `${protocol}//${host}`; 
const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
const wsUrl = `${wsProtocol}//${host}`;

/**
 * Helper to add auth token to fetch requests
 */
function getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('diceGamesAuthToken');
    if (!token) return {};
    return {
        'Authorization': `Bearer ${token}`
    };
}

document.addEventListener("DOMContentLoaded", async () => {
    const hostnameEl = document.getElementById("hostname")
    if (hostnameEl) {
        const hostnameResponse = await fetch(`${URL}/hostname`, {
            headers: getAuthHeaders()
        });
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

const uptimeEl = document.getElementById("uptime");

const formatDuration = (value: number): string => {
    if (typeof value !== 'number' || Number.isNaN(value)) return 'Unknown';
    const totalSeconds = Math.max(0, Math.floor(value));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    let formatted = '';
    if (hours > 0) formatted += `${hours}h `;
    if (minutes > 0 || hours > 0) formatted += `${minutes}m `;
    formatted += `${seconds}s`;
    return formatted.trim();
}

let uptimeSocket: WebSocket | undefined;
let uptimePingInterval: number | undefined;
let uptimeReconnectTimeout: number | undefined;

const updateUptimeFromPayload = (payload: any) => {
    if (!payload || payload.type !== 'PONG') return;
    if (!uptimeEl) return;
    uptimeEl.innerText = formatDuration(payload.uptime);
}

const sendUptimePing = () => {
    if (!uptimeSocket || uptimeSocket.readyState !== WebSocket.OPEN) return;
    uptimeSocket.send(JSON.stringify({ type: 'PING', sentAt: Date.now() }));
}

const connectUptimeSocket = () => {
    if (uptimeSocket && (uptimeSocket.readyState === WebSocket.OPEN || uptimeSocket.readyState === WebSocket.CONNECTING)) {
        return;
    }
    uptimeSocket = new WebSocket(wsUrl);

    uptimeSocket.addEventListener('open', () => {
        sendUptimePing();
        if (uptimePingInterval) window.clearInterval(uptimePingInterval);
        uptimePingInterval = window.setInterval(sendUptimePing, 1000);
    });

    uptimeSocket.addEventListener('message', (event) => {
        if (typeof event.data !== 'string') return;
        let payload;
        try {
            payload = JSON.parse(event.data);
        } catch (err) {
            return;
        }
        updateUptimeFromPayload(payload);
    });

    uptimeSocket.addEventListener('close', () => {
        if (uptimePingInterval) window.clearInterval(uptimePingInterval);
        uptimePingInterval = undefined;
        if (!uptimeReconnectTimeout) {
            uptimeReconnectTimeout = window.setTimeout(() => {
                uptimeReconnectTimeout = undefined;
                connectUptimeSocket();
            }, 2000);
        }
    });

    uptimeSocket.addEventListener('error', () => {
        if (uptimeSocket) uptimeSocket.close();
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    connectUptimeSocket();
})

document.addEventListener('visibilitychange', () => {
    // let intervalId: number | undefined;
    // only two options are visible/hidden
    if (document.visibilityState === 'visible') {
        if (!uptimePingInterval && uptimeSocket?.readyState === WebSocket.OPEN) {
            uptimePingInterval = window.setInterval(sendUptimePing, 1000);
        }
        if (!uptimeSocket || uptimeSocket.readyState === WebSocket.CLOSED) {
            connectUptimeSocket();
        }
    }
    else if (document.visibilityState === 'hidden') {
        if (uptimePingInterval) clearInterval(uptimePingInterval);
        uptimePingInterval = undefined;
    }
})

let showConnOptions: boolean = false;
const hiddenConnButtons: HTMLInputElement[] = [];
const toggleShowConnectionOptions = (show?: boolean) => {
    showConnOptions = !showConnOptions;
    if (show === undefined) show = showConnOptions;
    for (const button of hiddenConnButtons) {
        button.style.display = show ? 'flex' : 'none';
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const connectionInputName = document.getElementById("connection-input-text");
    if (!(connectionInputName instanceof HTMLInputElement)) return;
    connectionInputName.maxLength = 20;
    connectionInputName.placeholder = 'Enter a username...';
    // connectionInputName.onkeyup // TODO 
    const connectionInputSend = document.getElementById("connection-input-send");
    if (!(connectionInputSend instanceof HTMLInputElement)) return;
    connectionInputSend.value = 'Connect';
    connectionInputSend.onclick = () => toggleShowConnectionOptions(true); // alert('click'); 
    connectionInputSend.onmouseover = () => toggleShowConnectionOptions(); // console.log('mouseover');
    // connectionInputSend.onmouseout = () => toggleShowConnectionOptions(false); // LOL 
    // connectionInputSend.onmouseenter // does not bubble from children (this el has no children, so no diff)
    const connInputOptions = document.getElementById('connection-input-options');
    if (!(connInputOptions instanceof HTMLDivElement)) return;
    // const optionPlay = document.getElementById('connection-input-send')?.cloneNode();
    // for (const target of ["play","collab"]) {
    const targets: string[] = ["play","collab"];
    for (let i = 0; i < targets.length; i++) {
        const target: string = targets[i] ?? '';
        const option = document.createElement("input");
        option.type = "button";
        option.value = `/${target}`;
        option.style.position = "absolute";
        option.style.right = "0";
        option.style.width = `${connectionInputSend.offsetWidth}px`;
        option.style.bottom = `${connectionInputSend.offsetHeight * (i + 1)}px`;
        option.onclick = () => {connect(target); toggleShowConnectionOptions(false);};
        option.style.display = "none";
        connInputOptions.appendChild(option);
        // connInputOptions.prepend(option); // use column-reverse flex-direction instead 
        hiddenConnButtons.push(option);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const toggleNav = document.getElementById("toggle-nav");
    if (!toggleNav) return;
    toggleNav.onclick = function (this: GlobalEventHandlers, ev: PointerEvent): any {
        // if (toggleNav.style.width = "20%") {
        if (toggleNav.classList.contains('visible')) {
            // console.log(`Hiding nav`);
            toggleNav.classList.remove('visible');
            toggleNav.classList.add('hidden');
            toggleNav.innerText = ' 🫣 '; // 🫣 &#129763;
        } else {
            console.log(`Showing nav`);
            toggleNav.classList.remove('hidden');
            toggleNav.classList.add('visible');
            toggleNav.innerText = ' 🤔💭 '; // 🤔💭
        }

        const navParent = toggleNav.parentElement;
        if (!navParent) return;
        const navElements = navParent.children;
        if (!navElements) return;
        let leaveFirstChildVisible = true;
        for (const navChild of navElements) {
            if (!(navChild instanceof HTMLElement)) return;
            navChild.style.display = (toggleNav.classList.contains('visible') || leaveFirstChildVisible) ? "flex" : "none";
            leaveFirstChildVisible = false;
        }
        // (navParent.firstChild as HTMLElement).style.display = "flex"
    }
})

// document.addEventListener("DOMContentLoaded", () => {
//     const chatInputText = document.getElementById("text") as HTMLInputElement;
//     chatInputText.type = "text";
//     chatInputText.name = "text";
//     chatInputText.maxLength = 512;
//     chatInputText.placeholder = "Say something...";
//     chatInputText.autocomplete = "on";
//     chatInputText.onkeyup = handleKey;
//     chatInputText.disabled = true;
//     const chatInputSend = document.getElementById("send") as HTMLInputElement;
//     chatInputSend.type = "button";
//     chatInputSend.name = "send";
//     chatInputSend.value = "Send";
//     chatInputSend.onclick = sendMessage;
//     chatInputSend.disabled = true;
// })

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

