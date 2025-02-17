import asyncio
import json
import websockets
import os

from dotenv import load_dotenv
from websockets.exceptions import ConnectionClosed
from websockets.asyncio.server import broadcast

# A Set to store active connections
connected_clients = set()

# Stores the Grid state .
# key is tuple (row, col)
# value is string with hex color.
draw_events = {}


async def handler(websocket):
    """
    Handles the connection.
    """

    connected_clients.add(websocket)
    print(f'New connection. Total connections: {len(connected_clients)}')

    # Broadcasts the new connection count to all connections.
    #await broadcast_connection_count()

    # Sends all the stored draw events so the new client is synced with existing drawing.
    await send_stored_draw_events(websocket)

    try:
        async for message in websocket:
            event = json.loads(message)

            if event['type'] == 'DRAW':
                print(f'Draw event received: {event}')
                row = event['row']
                col = event['col']
                draw_events[(row, col)] = event
                broadcast(connected_clients, json.dumps(event))

            # Handle browser disconnection
            elif event['type'] == 'DISCONNECT':
                print("Client send DISCONNECT message")
                break

            elif event['type'] == 'PING':
                print("Client send PING message")
                websocket.send(json.dumps({'type': 'PONG'}))
    except ConnectionClosed:
        pass
    finally:

        if websocket in connected_clients:
            connected_clients.remove(websocket)
            print(f'Client disconnected. Total connections: {len(connected_clients)}')
        await broadcast_connection_count()

async def send_stored_draw_events(websocket):
    """
    Sends all the stored draw events to the new client.
    """
    if not draw_events:
        print('No stored draw events found.')
        return

    draw_event_list = list(draw_events.values())
    total = len(draw_event_list)

    # Sends the first event if only one cell exists.
    if total == 1:
        await websocket.send(json.dumps(draw_event_list[0]))
        return

    # Calculates the delay between events. Distributes it over 2 seconds.
    delay = 1 / max(1, total - 1)

    for i , event in enumerate(draw_events.values()):
        await websocket.send(json.dumps(event))
        if i < total - 1:
            await asyncio.sleep(delay)

async def broadcast_connection_count():
    """
    Broadcasts the connection count to all connected clients.
    """
    event = {
        'type': 'ACTIVE_CONNECTIONS',
        'count': len(connected_clients),
    }
    broadcast(connected_clients, json.dumps(event))

async def main():

    # Load .env file.
    load_dotenv()

    PORT = int(os.getenv("PORT", 8001))
    print(f"Starting WebSocket server on port {PORT}")
    async with websockets.serve(handler, "0.0.0.0", PORT):
        await asyncio.Future()


if __name__ == "__main__":
    print(f"Starting websocket server...")
    asyncio.run(main())