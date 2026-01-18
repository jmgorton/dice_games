export function enableChatInput() {
    const textEl = document.getElementById("text");
    if (textEl)
        textEl.disabled = false;
    const sendEl = document.getElementById("send");
    if (sendEl)
        sendEl.disabled = false;
}
export function updateUserlistBox(users) {
    const userlistBoxEl = document.getElementById("userlistbox");
    if (!userlistBoxEl)
        return;
    const userlist = users.split(';');
    const newUserListHTMLItems = userlist.map((user, index) => {
        return (`<li key=${index}>${user}</li>`);
    });
    userlistBoxEl.innerHTML = `<ul>${newUserListHTMLItems.join('')}</ul>`;
}
export function addChatMessageToChatBox(message) {
    const chatboxEl = document.getElementById("chatbox");
    if (!chatboxEl)
        return;
    const newMsgDiv = document.createElement("div");
    newMsgDiv.style.borderRadius = "12px";
    newMsgDiv.style.backgroundColor = "blue";
    newMsgDiv.style.maxWidth = "fit-content";
    newMsgDiv.innerText = message;
    chatboxEl.appendChild(newMsgDiv);
}
//# sourceMappingURL=utils-ui.js.map