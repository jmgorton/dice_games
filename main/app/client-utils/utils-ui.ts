import {
    handleKey,
    sendMessage,
} from './utils.js'

export function enableChatInput() {
    const textEl: HTMLElement | null = document.getElementById("text");
    if (textEl) (textEl as HTMLInputElement).disabled = false;
    const sendEl: HTMLElement | null = document.getElementById("send");
    if (sendEl) (sendEl as HTMLButtonElement).disabled = false;
}

export function addChatInput(clientId?: string) {
    const chatInputContainer = document.getElementById("chat-inputs") as HTMLDivElement;
    // const chatInputText = document.getElementById("text") as HTMLInputElement;
    const newChatInputRow = document.createElement("div");
    newChatInputRow.classList.add('chat-input-row')
    const chatInputText = document.createElement("input");
    chatInputText.classList.add('chat-input-text')
    chatInputText.type = "text";
    chatInputText.name = "text";
    chatInputText.maxLength = 512;
    chatInputText.placeholder = `Say something as ${clientId}...`;
    chatInputText.autocomplete = "on";
    chatInputText.onkeyup = (e) => handleKey(e, clientId);
    // chatInputText.disabled = true;
    newChatInputRow.appendChild(chatInputText);
    // const chatInputSend = document.getElementById("send") as HTMLInputElement;
    const chatInputSend = document.createElement("input");
    chatInputSend.classList.add('chat-input-send');
    chatInputSend.type = "button";
    chatInputSend.name = "send";
    chatInputSend.value = "Send";
    chatInputSend.onclick = (e) => sendMessage(e, clientId);
    // chatInputSend.disabled = true;
    newChatInputRow.appendChild(chatInputSend);
    chatInputContainer.appendChild(newChatInputRow);
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
    newMsgDiv.style.margin = "10px auto";
    newMsgDiv.style.padding = "4px";
    newMsgDiv.innerText = message;
    chatboxEl.appendChild(newMsgDiv);
}