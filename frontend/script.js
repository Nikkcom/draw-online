import {getWebSocketInstance} from "./websocket.js";

// Global Variables
let selectedColor = "#206ba0";

// Initialization when the page loads.
document.addEventListener('DOMContentLoaded', () => {

    const ws = getWebSocketInstance();
    ws.onmessage = handleWebSocketMessage;

    initializeGrid();
    initializeColorPicker();

    console.log('DOMContentLoaded');
});


/*
    Color Picker Initialization
 */
function initializeColorPicker() {
    const colorPicker = document.getElementById('color-picker');

    if (!colorPicker) {
        console.error("ERROR: Color picker not found in the HTML!");
        return;
    }

    colorPicker.value = selectedColor;

    colorPicker.addEventListener('change', (event) => {
        selectedColor = event.target.value;
        console.log(`Selected color changed to: ${selectedColor}`);
    });
}

/*
    Handles WebSocket Messages
 */
function handleWebSocketMessage(event) {

    try {
        const message = JSON.parse(event.data);

        switch (message.type) {
            case "DRAW":
                updateGridCell(message.row, message.col, message.color);
                break;
            case "PONG":
                console.log("Received PONG from server.");
                break;
            case "ACTIVE_CONNECTIONS":
                updateActiveConnections(message.amount);
                break;
            default:
                console.warn(`Unknown WebSocket message type: ${message.type}`);
        }
    } catch (error) {
        console.error("Error parsing WebSocket message: ", error);
    }
}

/*
    Initializes the drawable Grid
 */

function updateActiveConnections(amount) {
    const counter = document.getElementById("connection-count");
    if (counter) {
        counter.textContent = amount;
    }
}

function initializeGrid() {
    const gridContainer = document.querySelector('.grid-container');

    if (!gridContainer) {
        console.error("GridContainer not found in the HTML!");
        return;
    }

    console.log("Grid container found. Creating Grid...");

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
    console.log("Grid created successfully.");
}

/*
    Handle Cell Click Event
 */
function handleCellClick(row, col) {
    const ws = getWebSocketInstance();

    if (!ws || ws.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket connection not open. Click has been ignored.");
        return;
    }
    const cell = document.querySelector(`.grid .row .cell[data-row='${row}'][data-col='${col}']`)
    if (!cell) return null;

    const currentColor = getComputedStyle(cell).backgroundColor;

    const selectedRgb = hexToRgbString(selectedColor);

    if (currentColor === selectedRgb) {
        console.log(`Cell already has color ${selectedColor}, skipping...`);
        return;
    }

    console.log(`User clicked at (${row}, ${col})`);

    ws.send(
        JSON.stringify({
            type: "DRAW",
            row: row,
            col: col,
            color: selectedColor,
        })
    );
}

function hexToRgbString(hex) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgb(${r}, ${g}, ${b})`;
}


function updateGridCell(row, col, color) {
    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);

    if (cell) {
        cell.style.backgroundColor = color;
        console.log(`Cell updated. Set (${row}, ${col}) to ${color}`);
    } else {
        console.warn("WARN: Cell (${row}, ${col}) not found!")
    }

}

