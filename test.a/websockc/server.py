import asyncio
from urllib.parse import parse_qs
import websockets

# from urllib.parse import urlparse, parse_qs

# This function is the handler for each client connection
async def echo_handler(websocket):

    # parsed = urlparse(websocket.request.path)
    # print("path:", parsed.path)
    # print("query params:", parse_qs(parsed.query))

    print(f"Received new connection request: {websocket.request}")
    print(f"Client connected from path: {websocket.request.path}")
    try:
        # Loop indefinitely to receive messages from the client
        async for message in websocket:
            print(f"Received message: {message}")
            # Send the received message back to the client
            await websocket.send(f"Server echoed: {message}")
    except websockets.exceptions.ConnectionClosed as e:
        print(f"Connection closed: {e}")
    finally:
        print("Client disconnected")

# Define the main function to start the server
async def main():
    # Start the server on localhost, port 8765
    # The 'echo_handler' function will be called for every new connection
    async with websockets.serve(echo_handler, "0.0.0.0", 8765): # changed localhost to 0.0.0.0
        # to listen on all interfaces inside the docker container
        print("WebSocket server started at ws://localhost:8765")
        # The server runs forever until interrupted (e.g., Ctrl+C)
        await asyncio.Future()  # Keeps the server running indefinitely

if __name__ == "__main__":
    # Run the main asynchronous function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user")

