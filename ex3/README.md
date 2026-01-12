# Example 3

## About

Uses the `https`, `fs`, `os`, and `websocket` modules to create a very simple WebSocket server/client connection ... 

Server details:
- `https`: Used to create the HTTPS server listening on 8080, which is in turn used to create the WebSocketServer as part of the IServerConfig argument object
- `fs`: May be used to supply https options when creating the HTTPS server through `https`
- `os`: Only used to log the `os.hostname` from the HTTPS server currently.
- `websocket`: Used to create the WebSocketServer to handle connection requests from clients.

Client details:
- Uses the `WebSocket` object's API for handling connections to the specified WebSocketServer (ours defined in chatserver.js) and sending/receiving messages. 
- Used by index.html to bind event handlers to events triggered from the UI. 

## How to Run Locally

1. run the startup script: `sh startup.sh` (or, if you already have the npm `websocket` package installed, just run `node chatserver`. Note: not necessary to run `node chatclient`; these actions are triggered by the UI through index.html) 
2. open the index.html file (just go to file:///Users/jaredgorton/Documents/GitHub/dice_games/index.html unless there's something wrong with that? are we not serving this file?) ... and enter your name, click "Log in" - BROKEN on local

## Notes

having a hard time getting this to work on local, already had to fix some typos in the code too