import asyncio
import json
import websockets
import os

from dotenv import load_dotenv
from websockets.exceptions import ConnectionClosed
from websockets.asyncio.server import broadcast, ServerConnection

# Load environment variables.
load_dotenv()

# WebSocket settings
PORT = int(os.getenv("PORT", 8001)) # Defaults to 8001
HOST = os.getenv("HOST", "localhost")



# A Set to store active connections
connected_clients = set()

# Stores the Grid state .
# key is tuple (row, col)
# value is string with hex color.
draw_events = {}


async def handler(websocket: ServerConnection):
    """Handles new WebSocket connections."""

    connected_clients.add(websocket)
    print(f'[+] New connection. Total: {len(connected_clients)}')

    # Broadcasts the changed count.
    await broadcast_connection_count()

    # Send all the stored draw events so new client is synced with existing drawing.
    await send_stored_draw_events(websocket)

    try:
        async for message in websocket:
            await process_message(websocket, message)
    except ConnectionClosed:
        pass
    finally:

        if websocket in connected_clients:
            connected_clients.remove(websocket)
            print(f'[-] Client disconnected. Total connections: {len(connected_clients)}')
        await broadcast_connection_count()

async def process_message(websocket: ServerConnection, message: str):
    """Processes incoming messages from clients."""
    event = json.loads(message)

    if event['type'] == 'DRAW':
        print(f'[+] Draw event received: {event}')
        draw_events[(event['row'], event['col'])] = event
        broadcast(connected_clients, json.dumps(event))

    elif event['type'] == 'DISCONNECT':
        print("[-] Client sent DISCONNECT message.")
        await websocket.close()

    elif event['type'] == 'PING':
        print("[+] Client sent PING message.")
        await websocket.send(json.dumps({'type': 'PONG'}))

async def send_stored_draw_events(websocket):
    """Sends all the stored draw events to the new client."""

    if not draw_events:
        print('[=] No stored draw events found.')
        return

    events = list(draw_events.values())
    delay = 1 / max(1, len(events) - 1)

    for event in events:
        await websocket.send(json.dumps(event))
        await asyncio.sleep(delay)

async def broadcast_connection_count():
    """Broadcasts the connection count to all connected clients."""
    event = {
        'type': 'ACTIVE_CONNECTIONS',
        'count': len(connected_clients),
    }
    broadcast(connected_clients, json.dumps(event))

async def main():
    """Starts the WebSocket server."""
    print(f"[+] Starting WebSocket server on {HOST}:{PORT}")
    server = await websockets.serve(handler, HOST, PORT)
    print(f"[+] WebSocket server is running...")

    await server.serve_forever()


if __name__ == "__main__":
    asyncio.run(main())