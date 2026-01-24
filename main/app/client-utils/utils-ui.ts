import {
    handleKey,
    sendMessage,
} from './utils.js'

import type {
    MessageIn,
    MessageTypeFromClient,
} from './utils.js'

// function enableChatInput() {
//     const textEl: HTMLElement | null = document.getElementById("text");
//     if (textEl) (textEl as HTMLInputElement).disabled = false;
//     const sendEl: HTMLElement | null = document.getElementById("send");
//     if (sendEl) (sendEl as HTMLButtonElement).disabled = false;
// }

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

function generateRandomHexColor(): string {
  // Generate a random number between 0 and 16777215 (0xFFFFFF)
  const randomColor = Math.floor(Math.random() * 16777215);

  // Convert the number to a hexadecimal string
  const hexColor = randomColor.toString(16);

  // Pad the string with leading zeros if necessary to ensure it's 6 digits long
  const fullHexColor = "#" + hexColor.padStart(6, '0');

  return fullHexColor;
}

export function updateUserlistBox(...users: (string | string[])[]) {
    const userlistBoxEl = document.getElementById("userlistbox");
    if (!userlistBoxEl) return;
    const userlistEl = document.createElement("ul");
    
    // let userlist; // = users;
    // if (typeof users === 'string') {
    //     userlist = users.split(';');
    // } else {
    //     userlist = users;
    // }
    users.forEach((usersArg, argIndex) => {
        // assign each argument supplied a different color 
        const thisColorHex = generateRandomHexColor();
        if (typeof usersArg === 'string') {
            usersArg = [usersArg]
        }
        usersArg.forEach((user, subIndex) => {
            const userlistItemEl = document.createElement("li")
            userlistItemEl.style.color = thisColorHex;
            userlistItemEl.innerText = user;
            userlistEl.appendChild(userlistItemEl);
        })
    })
    // const newUserListHTMLItems: string[] = userlist.map((user, index) => {
    //     const userItem = document.createElement("li");
    //     // return (`<li key=${index}>${user}</li>`)
    // })
    userlistBoxEl.replaceChildren(userlistEl); // appendChild, no 
    // userlistBoxEl.innerHTML = `<ul>${newUserListHTMLItems.join('')}</ul>`;
}

export function addChatMessageToChatBox(message: string | MessageIn) {
    const chatboxEl = document.getElementById("chatbox");
    if (!chatboxEl) return;
    const newMsgDiv = document.createElement("div");

    let messageContent;
    if (typeof message !== 'string') {
        const messageSender = message.name ?? 'unknown user';
        let messageDate = 'unknown time';
        if (message.date) messageDate = new Date(message.date).toLocaleTimeString();
        messageContent = message.text ?? message.content ?? 'unknown';
        newMsgDiv.innerText = `(${messageSender} at ${messageDate}): ${messageContent}`;
        if ('id' in message && message.id) newMsgDiv.classList.add('sender-self');
        else newMsgDiv.classList.add('sender-other');
    } else {
        newMsgDiv.innerText = message;
    }

    // newMsgDiv.innerText = messageContent;
    chatboxEl.appendChild(newMsgDiv);
}