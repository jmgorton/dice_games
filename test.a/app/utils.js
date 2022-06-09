function connect() {
    if (!("WebSocket" in window)) {
        alert("WebSocket NOT supported by your Browser!");
        return;
    }

    // Let us open a web socket
    // var ws = new WebSocket("ws://localhost:1313/test");
    var ws = new WebSocket("ws://localhost:1313/test", "json");

    ws.onopen = function () {
        // Web Socket is connected, send data using send()
        ws.send(JSON.stringify("Connection successful!"));
        document.getElementById("text").disabled = false;
        document.getElementById("send").disabled = false;
    };

    ws.onmessage = function (evt) {
        // var msg = evt.data;
        // alert('Message is received... "' + msg + '"');

        var f = document.getElementById("chatbox").contentDocument;
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

function send() {
    console.log("***SEND");
    var msg = {
        text: document.getElementById("text").value,
        type: "message",
        id: clientID,
        date: Date.now()
    };
    connection.send(JSON.stringify(msg));
    document.getElementById("text").value = "";
}

function handleKey(evt) {
    if (evt.keyCode === 13 || evt.keyCode === 14) {
        if (!document.getElementById("send").disabled) {
            send();
        }
    }
}
