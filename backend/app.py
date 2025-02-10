import asyncio
import json

import websockets
from websockets.exceptions import ConnectionClosed
from websockets.asyncio.server import broadcast

# A Set to store active connections
connected_clients = set()

# Stores the Grid state
# key is tuple (row, col)
# value is string with hex color.
draw_events = {}


async def handler(websocket):
    """
    Handles the connection.
    """

    connected_clients.add(websocket)
    print(f'[+] New connection. Total connections: {len(connected_clients)}')

    await broadcast_connection_count()

    # Sends all the stored draw events so the new client is synced with existing drawing.
    await send_stored_draw_events(websocket)

    try:
        async for message in websocket:
            event = json.loads(message)

            if event['type'] == 'DRAW':
                print(f'[+] Draw event received: {event}')
                row = event['row']
                col = event['col']
                draw_events[(row, col)] = event
                broadcast(connected_clients, json.dumps(event))

    except ConnectionClosed:
        pass
    finally:
        connected_clients.remove(websocket)
        print(f'[-] Client disconnected. Total connections: {len(connected_clients)}')
        await broadcast_connection_count()

async def send_stored_draw_events(websocket):
    """
    Sends all the stored draw events to the new client.
    """

    if draw_events:
        total = len(draw_events)

        # Sends the event if only one cell is drawn.
        if total == 1:
            await websocket.send(json.dumps(draw_events[0]))
            return

        # Calculates the delay between events. Distributes it over 2 seconds.
        delay = 0.25 / max(1, total - 1)

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
    async with websockets.serve(handler, "localhost", 8001):
        await asyncio.Future()


if __name__ == "__main__":
    print(f"[=] Starting websocket server...")
    asyncio.run(main())