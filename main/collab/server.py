import asyncio
# import websockets # websockets uses async send, built on asyncio 
import logging
import queue
from logging.handlers import QueueHandler, QueueListener
from collections import defaultdict
from uuid import uuid4
import json
import datetime
import os

import websockets
from websockets.legacy.server import serve

# Enqueue log records synchronously with QueueHandler,
# any blocking I/O performed in separate thread via QueueListener
q = queue.Queue()
stream_handler = logging.StreamHandler()
listener = QueueListener(q, stream_handler)
listener.start()

logger = logging.getLogger("collab")
logger.setLevel(logging.INFO)
logger.addHandler(QueueHandler(q))

connections = defaultdict(None)
# connections structure: key: clientId with {"name": username, "socket": websocket}

async def broadcast(message: str):
    sendTasks = [connection["socket"].send(message) for connection in connections.values()]
    await asyncio.gather(*sendTasks)

async def broadcastExceptMe(message: str, ws):
    sendTasks = []
    for connection in connections.values():
        if connection["socket"] == ws: continue
        sendTasks.push(connection["socket"].send(message))
    await asyncio.gather(*sendTasks)


async def handleOpen(messageIn, ws):
    if "username" in messageIn: username = messageIn["username"]
    else: username = messageIn["content"]
    newId = str(uuid4())[:17]
    connections[newId] = { "name": username, "socket": ws }
    idMessageOut = json.dumps({"type": "id", "id": newId, "name": username })
    await ws.send(idMessageOut)
    usersMessageOut = json.dumps({ "type": "userlist", "users": ';'.join([connection["name"] for connection in connections.values()])})
    await broadcast(usersMessageOut)

async def handleMessage(messageIn, ws):
    sender = "unknown user"
    sentAt = "unknown time"
    clientId = messageIn["id"]
    if clientId and connections[clientId]: # "id" in messageIn and 
        sender = connections[clientId]["name"]
    if messageIn["date"]:
        sentAt = datetime.datetime.fromtimestamp(messageIn["date"] // 1000).strftime('%Y-%m-%d %H:%M:%S')
    messageOut = {
        "type": "message",
        "text": messageIn["text"] if messageIn["text"] else messageIn["content"],
        "name": sender,
        "date": sentAt,
    }
    # await broadcast(messageOut)
    await broadcastExceptMe(json.dumps(messageOut), ws)
    messageOut["id"] = clientId
    await ws.send(json.dumps(messageOut))

def parseMessage(message):
    try:
        messageIn = json.loads(message)
        return messageIn
    except json.JSONDecodeError:
        try:
            splitMessage = message.split("::")
            if not splitMessage or len(splitMessage) != 2:
                return {
                    "type": "ECHO",
                    "content": message,
                }
            return {
                "type": splitMessage[0],
                "content": splitMessage[1],
            }
        except ValueError:
            return {
                "type": "ECHO",
                "content": message,
            }
    except TypeError:
        # input not a str, bytes, or bytearray object 
        return {
            "type": "ECHO",
            "content": message,
        }

async def echo_handler(websocket):
    """WebSocket handler for each client connection."""
    # don't use sync print, blocking i/o handled by worker thread
    logger.info(f"Client connected from path: {websocket.request.path}")
    try:
        # Loop indefinitely to receive messages from the client
        async for message in websocket:
            logger.info(f"Received message: {message}")
            messageIn = parseMessage(message)
            if not messageIn:
                return

            if (messageIn["type"] == "OPEN"):
                await handleOpen(messageIn, websocket)
            elif (messageIn["type"] == "MESSAGE"):
                await handleMessage(messageIn, websocket)
            else:
                await websocket.send(f"Server echoed: {message}")
    except websockets.exceptions.ConnectionClosed as e:
        logger.info(f"Connection closed: {e}")
    finally:
        logger.info("Client disconnected")

def load_html_file(filename: str) -> bytes:
    """Load HTML file from disk."""
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        file_path = os.path.join(script_dir, filename)
        with open(file_path, 'rb') as f:
            return f.read()
    except Exception as e:
        logger.error(f"Failed to load {filename}: {e}")
        return b"<html><body>Error loading page</body></html>"

async def process_request(path, request_headers):
    """Serve the collab HTML for normal HTTP requests on the WS port."""
    if path in ("/", "/collab", "/collab/"):
        body = load_html_file("index.html")
        headers = [
            ("Content-Type", "text/html; charset=utf-8"),
            ("Content-Length", str(len(body))),
            ("Cache-Control", "no-store"),
            ("Connection", "close"),
        ]
        return 200, headers, body

    body = b"Not Found"
    headers = [
        ("Content-Type", "text/plain"),
        ("Content-Length", str(len(body))),
        ("Connection", "close"),
    ]
    return 404, headers, body

# Define the main function to start the server
async def main():
    # Start a single server that handles HTTP and WebSocket on port 8765
    async with serve(
        echo_handler,
        "0.0.0.0",
        8765,
        process_request=process_request,
    ):
        logger.info("Collab server started at http://0.0.0.0:8765 (HTTP + WS)")
        await asyncio.Future()  # Keeps the server running indefinitely

if __name__ == "__main__":
    # Run the main asynchronous function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server stopped by user")

