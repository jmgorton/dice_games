import asyncio
# from urllib.parse import parse_qs
# from urllib.parse import urlparse, parse_qs
import websockets # websockets uses an async send ...
# websockets is built on asyncio 
import logging
import queue
from logging.handlers import QueueHandler, QueueListener

from typing import List
from collections import defaultdict
from uuid import uuid4
import json

# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)
# logger.info("WebSocket server started")

# enqueue log records synchronously (very fast) with QueueHandler, 
# any actual blocking i/o performed in separate thread
#   run by QueueListener, event loop remains responsive
q = queue.Queue()
stream_handler = logging.StreamHandler()
listener = QueueListener(q, stream_handler)
listener.start()

logger = logging.getLogger("collab")
logger.setLevel(logging.INFO)
logger.addHandler(QueueHandler(q))

# userlist: List[str] = []
# userConnections = {} # defaultdict(None) # {} # does every entry point to the same websocket??? 
connections = defaultdict(None)

# def addUserToUserlist(user: str):
#     userlist.append(user)

# def saveUserWebSocketConnection(user, ws):
#     userConnections[user] = ws

# def saveUserInfo(id: str, info: dict):
#     connections[id].update(info)

async def broadcast(message: str):
    sendTasks = [connection["socket"].send(message) for connection in connections.values()]
    await asyncio.gather(*sendTasks)

async def handleOpen(username, ws):
    newId = str(uuid4())[:10]
    connections[newId] = { "name": username, "socket": ws }
    idMessageOut = json.dumps({"type": "id", "id": newId})
    await ws.send(idMessageOut)
    usersMessageOut = json.dumps({ "type": "userlist", "users": ';'.join([connection["name"] for connection in connections.values()])})
    await broadcast(usersMessageOut)

async def handleMessage(message, ws):
    sentBy = "unknown user"

    # for user, ws in userConnections.items():
    #     sentBy = "Unknown User: "
    #     if (ws == websocket):
    #         sentBy = f"{user}: "
    newMessage = f"MESSAGE::{sentBy}{message}"
    await broadcast(newMessage)

# This function is the handler for each client connection
async def echo_handler(websocket):

    # don't use sync print, blocking i/o, on the event loop thread 
    # blocking logging i/o to stdout handled by worker thread 
    # parsed = urlparse(websocket.request.path)
    # print("path:", parsed.path)
    # print("query params:", parse_qs(parsed.query))
    # logger.info(f"Received new connection request: {websocket.request}") 
    logger.info(f"Client connected from path: {websocket.request.path}")
    try:
        # Loop indefinitely to receive messages from the client
        async for message in websocket:
            logger.info(f"Received message: {message}")

            try:
                [messageType, messageContent] = message.split("::")
            except ValueError:
                try:
                    messageJson = json.loads(message)
                    messageType = messageJson["type"]
                except ValueError:
                    messageType = "ECHO"
                    
                # messageContent = message

            if (messageType == "OPEN"):
                await handleOpen(messageContent, websocket)
            elif (messageType == "MESSAGE"):
                await handleMessage(messageContent, websocket)

            # # Send the received message back to the client
            else:
                await websocket.send(f"Server echoed: {message}")
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Connection closed: {e}")
    finally:
        logger.info("Client disconnected")

# Define the main function to start the server
async def main():
    # Start the server on localhost, port 8765
    # The 'echo_handler' function will be called for every new connection
    # to listen on all interfaces inside the docker container, don't bind to localhost in container 
    async with websockets.serve(echo_handler, "0.0.0.0", 8765): # changed localhost to 0.0.0.0
        logger.info("WebSocket server started at ws://localhost:8765")
        # The server runs forever until interrupted (e.g., Ctrl+C)
        await asyncio.Future()  # Keeps the server running indefinitely

if __name__ == "__main__":
    # Run the main asynchronous function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")

