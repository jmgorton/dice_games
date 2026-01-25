import {
    handleKey,
    sendMessage,
} from './utils.js'

// import {
//     hiddenSendButtons,
//     toggleShowSendOptions,
// } from './setup.js';

import type {
    MessageIn,
} from './utils.js'

let showSendOptions: boolean = false;
const hiddenSendButtons: HTMLInputElement[] = [];
const toggleShowSendOptions = (show?: boolean) => {
    showSendOptions = !showSendOptions;
    if (show === undefined) show = showSendOptions;
    // console.log(`Number of hidden buttons toggling: ${hiddenSendButtons.length}`)
    for (const button of hiddenSendButtons) {
        button.style.display = show ? 'flex' : 'none';
        // console.log(button.offsetWidth, button.offsetHeight, button.style.bottom, button.style.right);
    }
}

export function enableChatInput(clientId: string, username?: string) {
    const chatInputEls = document.getElementById("chat-inputs");
    // console.log(`chatInputEls: ${chatInputEls}`)
    if (!chatInputEls) return;
    // const textEl: HTMLElement | null = document.getElementById("text");
    const textEl: Element | null = chatInputEls.firstElementChild;
    // console.log(`textEl: ${textEl}`)
    if (!textEl || !(textEl instanceof HTMLInputElement)) return
    textEl.disabled = false;

    const sendOptionsEl: HTMLElement | null = document.getElementById("chat-input-send-options");
    // console.log(`sendOptionsEl: ${sendOptionsEl}`)
    if (!sendOptionsEl || !(sendOptionsEl instanceof HTMLDivElement)) return;
    const sendEl: Element | null = sendOptionsEl.firstElementChild;
    // console.log(`sendEl: ${sendEl}`)
    if (!sendEl || !(sendEl instanceof HTMLInputElement)) return;
    sendEl.disabled = false;
    sendEl.onmouseover = () => {toggleShowSendOptions()}; // console.log(`MouseOver`); 
    sendEl.onclick = () => {toggleShowSendOptions(true)}; // console.log(`Click`); 
    const sendOption = document.createElement("input");
    sendOption.type = "button";
    sendOption.value = `...as ${username ?? clientId ?? 'unknown user'}`;
    sendOption.style.position = "absolute";
    sendOption.style.right = "0";
    sendOption.style.bottom = `${sendEl.offsetHeight * (hiddenSendButtons.length + 1)}px`;

    // console.log(`sendEl.offsetHeight:`, sendEl.offsetHeight);
    // console.log(`hiddenSendButtons.length:`, hiddenSendButtons.length);
    // console.log(`sendOption.style.bottom:`, sendOption.style.bottom);

    // console.log(`sendOption styles:`, {
    //     position: sendOption.style.position,
    //     right: sendOption.style.right,
    //     bottom: sendOption.style.bottom,
    //     width: sendOption.style.width,
    //     display: sendOption.style.display,
    //     zIndex: sendOption.style.zIndex
    // });

    sendOption.onclick = (e) => {sendMessage(e, clientId); toggleShowSendOptions(false);}
    sendOption.style.display = "hidden";
    hiddenSendButtons.push(sendOption);
    sendOptionsEl.appendChild(sendOption);

    const maxWidth = Math.max(sendEl.offsetWidth, sendOption.offsetWidth); 
    // sendOption.style.width = `${maxWidth}px`;
    hiddenSendButtons.forEach(button => button.style.width = `${maxWidth}px`)
    sendEl.style.width = `${maxWidth}px`;
    sendOption.style.display = "none"; // do this after getting calculated size 
}

// export function addChatInput(clientId?: string) {
//     const chatInputContainer = document.getElementById("chat-inputs") as HTMLDivElement;
//     // const chatInputText = document.getElementById("text") as HTMLInputElement;
//     const newChatInputRow = document.createElement("div");
//     newChatInputRow.classList.add('chat-input-row')
//     const chatInputText = document.createElement("input");
//     chatInputText.classList.add('chat-input-text')
//     chatInputText.type = "text";
//     chatInputText.name = "text";
//     chatInputText.maxLength = 512;
//     chatInputText.placeholder = `Say something as ${clientId}...`;
//     chatInputText.autocomplete = "on";
//     chatInputText.onkeyup = (e) => handleKey(e, clientId);
//     // chatInputText.disabled = true;
//     newChatInputRow.appendChild(chatInputText);
//     // const chatInputSend = document.getElementById("send") as HTMLInputElement;
//     const chatInputSend = document.createElement("input");
//     chatInputSend.classList.add('chat-input-send');
//     chatInputSend.type = "button";
//     chatInputSend.name = "send";
//     chatInputSend.value = "Send";
//     chatInputSend.onclick = (e) => sendMessage(e, clientId);
//     // chatInputSend.disabled = true;
//     newChatInputRow.appendChild(chatInputSend);
//     chatInputContainer.appendChild(newChatInputRow);
// }

function generateRandomHexColor(): string {
  // Generate a random number between 0 and 16777215 (0xFFFFFF)
  const randomColor = Math.floor(Math.random() * 16777215);

  // Convert the number to a hexadecimal string
  const hexColor = randomColor.toString(16);

  // Pad the string with leading zeros if necessary to ensure it's 6 digits long
  const fullHexColor = "#" + hexColor.padStart(6, '0');

  return fullHexColor;
}

const colors: string[] = [];
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
        const thisColorHex: string = (argIndex < colors.length) ? (colors[argIndex] ?? generateRandomHexColor()) : generateRandomHexColor();
        if (argIndex === colors.length) colors.push(thisColorHex);
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
    const itemsToSort = Array.from(userlistEl.children) as HTMLLIElement[]; 
    itemsToSort.sort((a, b) => {
        const keyA = a.innerText;
        const keyB = b.innerText;
        // if (!keyA || !keyB) return 0;
        if (keyA > keyB) return 1;
        else if (keyB > keyA) return -1;
        else return 0;
    })
    // appending existing DOM elements moves them to the new position
    // userlistBoxEl.replaceChildren(itemsToSort);
    itemsToSort.forEach(item => userlistEl.appendChild(item));
    userlistBoxEl.replaceChildren(userlistEl);
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