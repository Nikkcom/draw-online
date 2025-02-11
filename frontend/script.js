// Called when the page is loaded.
document.addEventListener('DOMContentLoaded', () => {

    console.log('[+] DOMContentLoaded');

    initializeWebSocket();
    initializeGrid();
    initializeColorPicker();
})

let selectedColor = "#206ba0";

function getWebSocketServer() {
    if ( window.location.host === "nikolausbrock.no") {
        console.error("[+] Deployed. Returned remote WebSocket Server.");
        return "wss://draw-online-6daf0e4b3b2d.herokuapp.com/";
    } else if (window.location.host === "localhost:8000") {
        console.error("[+] Localhost. Returned Localhost WebSocket Server.");
        return "ws://localhost:8001"
    } else {
        console.error("[-] Unknown host. Could not connect to WebSocket Server.");
        return null;
    }
}

/*
    WebSocket Initialization
*/
function initializeWebSocket() {

    wsServer = getWebSocketServer();
    if (!wsServer) {
        console.error(`[-] ERROR: WebSocket Server URL is undefined.`);
    }


    const ws = new WebSocket(wsServer);
    ws.onopen = () => console.log("[+] WebSocket connection established.");
    ws.onerror = (error) => console.error("[-] WebSocket Error:", error);
    ws.onclose = () => console.log("[-] WebSocket closed.");
    ws.onmessage = handleWebSocketMessage;

    window.ws = ws;
}

/*
    Color Picker Initialization
 */
function initializeColorPicker() {
    const colorPicker = document.getElementById('color-picker');

    if (!colorPicker) {
        console.error("[-] ERROR: Color picker not found in the HTML!");
        return;
    }

    colorPicker.value = selectedColor;

    colorPicker.addEventListener('change', (event) => {
        selectedColor = event.target.value;
        console.log(`[+] Selected color changed to: ${selectedColor}`);
    });
}

/*
    Handles WebSocket Messages
 */
function handleWebSocketMessage(event) {
    const message = JSON.parse(event.data);

    if (message.type === "ACTIVE_CONNECTIONS") {
        updateConnectionCount(message.count)
    } else if (message.type === "DRAW") {
        updateGridCell(message.row, message.col, message.color);
    }
}

/*
    Updates the Connection Count in the UI
 */
function updateConnectionCount(count) {
    const connectionCount = document.getElementById("connection-count");

    if (!connectionCount) {
        console.log("[-] ERROR: #connection-count not found in the HTML!");
        return;
    }

    connectionCount.textContent = count;
}

/*
    Initializes the drawable Grid
 */

function initializeGrid() {
    const gridContainer = document.querySelector('.grid-container');

    if (!gridContainer) {
        console.error("[-] GridContainer not found in the HTML!");
        return;
    }

    console.log("[+] Grid container found. Creating Grid...");

    // Create the Grid wrapper
    const grid = document.createElement('div');
    grid.classList.add("grid");
    gridContainer.appendChild(grid);

    // Creates the Grid.
    createGrid(grid);
}

/*
    Create a 20x20 Grid Structure.
 */
function createGrid(gridElement) {

    // Clear existing grid.
    gridElement.innerHTML = '';

    // Create div elements
    for (let row = 0; row < 20; row++) {
        const rowDiv = document.createElement("div");
        rowDiv.classList.add('row');

        for (let col = 0; col < 20; col++) {
            const cell = document.createElement("div");

            // Set .cell
            cell.classList.add('cell');

            // Assign data attributes
            cell.dataset.row = row;
            cell.dataset.col = col;

            // Sets the Click Event Listener
            cell.onclick = () => handleCellClick(row, col);

            rowDiv.appendChild(cell);
        }
        gridElement.appendChild(rowDiv);
    }
    console.log("[+] Grid created successfully.");
}

/*
    Handle Cell Click Event
 */
function handleCellClick(row, col) {
    if (!window.ws || window.ws.readyState !== WebSocket.OPEN) {
        console.warn("[-] WARN: WebSocket not open. Click has been ignored.");
        return;
    }

    console.log(`[+] User clicked at (${row}, ${col})`);

    window.ws.send(
        JSON.stringify({
            type: "DRAW",
            row: row,
            col: col,
            color: selectedColor,
        })
    );
}

function updateGridCell(row, col, color) {
    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);

    if (cell) {
        cell.style.backgroundColor = color;
        console.log(`[+] Cell updated. Set (${row}, ${col}) to ${color}`);
    } else {
        console.warn(`[-] WARN: Cell (${row}, ${col}) not found!`)
    }

}

