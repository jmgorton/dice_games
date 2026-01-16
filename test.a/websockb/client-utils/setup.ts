import { playUntilJackpot } from "./lotto-utils.js";

// display server hostname as heading on main page
document.addEventListener("DOMContentLoaded", async () => {
    const hostnameEl = document.getElementById("hostname")
    if (hostnameEl) {
        // window.location.origin
        const hostnameResponse = await fetch(`/play/hostname`); // // http://localhost:1313/play/hostname 
        hostnameEl.innerText = await hostnameResponse.text();
    }
});

// dark mode 
document.body.style.backgroundColor = '#333';
document.body.style.color = 'white';

// flex 
document.body.style.display = 'flex';
document.body.style.flexDirection = 'column';
// document.body.style.justifyContent = 'center';
document.body.style.textAlign = 'center';

// event listeners
document.addEventListener("DOMContentLoaded", () => {
    const calcButton = document.getElementById("calculate") as HTMLButtonElement;
    if (!calcButton) return;
    calcButton.onclick = playUntilJackpot;
})