import asyncio
import websockets

# This function is the handler for each client connection
async def echo_handler(websocket, path):
    print(f"Client connected from path: {path}")
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
    async with websockets.serve(echo_handler, "localhost", 8765):
        print("WebSocket server started at ws://localhost:8765")
        # The server runs forever until interrupted (e.g., Ctrl+C)
        await asyncio.Future()  # Keeps the server running indefinitely

if __name__ == "__main__":
    # Run the main asynchronous function
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("Server stopped by user")

