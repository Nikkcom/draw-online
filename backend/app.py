import asyncio
import json
import signal
import http

import websockets
import os
import logging

from dotenv import load_dotenv
from websockets.exceptions import ConnectionClosed
from websockets.asyncio.server import broadcast

# A Set to store active connections
connected_clients = set()

# Stores the Grid state.
# key is tuple (row, col)
# value is string with hex color.
draw_events = {}


# Set logging level and format
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


async def handler(websocket):
    """
    Handles the connection.
    """

    connected_clients.add(websocket)
    logging.info(f'New connection. Total connections: {len(connected_clients)}')

    # Broadcasts the new connection count to all connections.
    #await broadcast_connection_count()

    # Sends all the stored draw events so the new client is synced with existing drawing.
    await send_stored_draw_events(websocket)

    try:
        async for message in websocket:

            # Validates received message as JSON
            try:
                event = json.loads(message)
            except json.decoder.JSONDecodeError:
                logging.warning('Received invalid JSON message')
                continue


            if event['type'] == 'DRAW':
                logging.info(f'Received draw event: {event}')
                row = event['row']
                col = event['col']
                draw_events[(row, col)] = event
                broadcast(connected_clients, json.dumps(event))

            # Handle browser disconnection
            elif event['type'] == 'DISCONNECT':
                logging.info(f'Client sent a DISCONNECT event: {event}')
                break

            elif event['type'] == 'PING':
                logging.info(f'Client sent a PING event: {event}')
                await websocket.send(json.dumps({'type': 'PONG'}))
    except ConnectionClosed:
        pass
    finally:

        if websocket in connected_clients:
            connected_clients.remove(websocket)
            logging.info(f'Client disconnected. Total connections: {len(connected_clients)}')
        await broadcast_connection_count()

async def send_stored_draw_events(websocket):
    """
    Sends all the stored draw events to the new client.
    """
    if not draw_events:
        logging.info(f'No stored draw events found.')
        return

    draw_event_list = list(draw_events.values())
    total = len(draw_event_list)

    # Sends the first event if only one cell exists.
    if total == 1:
        await websocket.send(json.dumps(draw_event_list[0]))
        return

    # Calculates the delay between events. Distributes it over 2 seconds.
    delay = 2 / max(1, total - 1)

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

async def process_request(path, request):
    """
    Called for every HTTP request before the WebSocket handshake.
    """

    if path == "/health":
        return http.HTTPStatus.OK, [("Content-Type", "text/plain")], b"OK\n"

    upgrade = request.headers.get('Upgrade')
    if upgrade is None or upgrade.lower() != "websocket":
        logging.warning(f'Received non-WebSocket request to: {path}. Returning 400.')
        return http.HTTPStatus.BAD_REQUEST, [], b"This server only handles WebSocket connections\n"

    return None

async def main():

    # Load .env file.
    load_dotenv()

    PORT = int(os.getenv("PORT", 8001))
    logging.info(f'Starting websocket server on port {PORT}')

    # Create an asyncio Event for shutdown signaling.
    shutdown_event = asyncio.Event()


    def signal_handler():
        logging.info("Shutdown signal received.")
        shutdown_event.set()

    loop = asyncio.get_running_loop()

    # Register handlers for SIGINT and SIGTERM
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, signal_handler)

    # Start the WebSocket server
    async with websockets.serve(
            handler,
            "0.0.0.0",
            PORT,
            process_request=process_request
    ):
        logging.info('WebSocket server is running. Waiting for shutdown signal...')
        await shutdown_event.wait()
        logging.info('Initiating graceful shutdown...')

    # Close all active client connections.
    for ws in connected_clients.copy():
        await ws.close()

    logging.info('WebSocket server is stopped.')


if __name__ == "__main__":
    asyncio.run(main())