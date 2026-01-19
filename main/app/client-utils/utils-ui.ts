export function enableChatInput() {
    const textEl: HTMLElement | null = document.getElementById("text");
    if (textEl) (textEl as HTMLInputElement).disabled = false;
    const sendEl: HTMLElement | null = document.getElementById("send");
    if (sendEl) (sendEl as HTMLButtonElement).disabled = false;
}

export function updateUserlistBox(users: string) {
    const userlistBoxEl = document.getElementById("userlistbox");
    if (!userlistBoxEl) return;
    const userlist: string[] = users.split(';');
    const newUserListHTMLItems: string[] = userlist.map((user, index) => {
        return (`<li key=${index}>${user}</li>`)
    })
    userlistBoxEl.innerHTML = `<ul>${newUserListHTMLItems.join('')}</ul>`;
}

export function addChatMessageToChatBox(message: string) {
    const chatboxEl = document.getElementById("chatbox");
    if (!chatboxEl) return;
    const newMsgDiv = document.createElement("div");
    newMsgDiv.style.borderRadius = "12px";
    newMsgDiv.style.backgroundColor = "blue";
    newMsgDiv.style.maxWidth = "fit-content";
    newMsgDiv.innerText = message;
    chatboxEl.appendChild(newMsgDiv);
}