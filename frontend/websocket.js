let ws = null;
let pingInterval = null;
let isClosing = false;

// PING interval in seconds.
const PING_INTERVAL = 30;

// The delay in seconds after a connection is lost
// before it tries to reconnect.
const RECONNECTION_DELAY = 3;

function getWebSocketServer() {
    const host = window.location.host;
    if (host === "nikolausbrock.no") {
        return "ws://draw.nikolausbrock.no/ws/"
    } else if (host.startsWith("localhost")) {
        return "ws://192.168.247.133:8001";
    } else {
        console.error("Unknown host. Could not connect to WebSocket Server.");
        return null;
    }
}

export function getWebSocketInstance() {

    // If there already is an open connection
    if (ws && ws.readyState === WebSocket.OPEN) {
        return ws;
    }

    console.log("Creating a new WebSocket connection.");
    const wsServer = getWebSocketServer();
    if (!wsServer) return null;

    ws = new WebSocket(wsServer);

    ws.onopen = () => {
        console.log("WebSocket connection established. " + ws.url);
        keepConnectionAlive(PING_INTERVAL);
    };

    ws.onerror = (error) => {console.error(error)}

    ws.onclose = () => {
        if (isClosing) return;

        console.log("WebSocket connection closed. Reconnecting...");
        clearInterval(pingInterval);
        pingInterval = null;

        setTimeout(getWebSocketInstance, 1000 * RECONNECTION_DELAY)
    };

    return ws;
}

// Sends a PING message to the WebSocket server every X seconds.
function keepConnectionAlive(interval) {
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
    }

    pingInterval = setInterval(() => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.warn("WebSocket is not open. Stopping PING interval.");
            clearInterval(pingInterval);
            pingInterval = null;
            return;
        }
        ws.send(JSON.stringify({type: "PING"}));
        console.log("Sent a PING to the server.");
    }, 1000 * interval);
}

// Close the WebSocket connection when the tab is closed.
window.addEventListener("beforeunload", () => {
    isClosing = true;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({type: "DISCONNECT"}));
        ws.close();
    }
});