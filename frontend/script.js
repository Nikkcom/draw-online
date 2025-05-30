import {getWebSocketInstance} from "./websocket.js";

// Global Variables
let selectedColor = "#2c2c2c";
let isDrawing = false;

// Initialization when the page loads.
document.addEventListener('DOMContentLoaded', () => {

    const ws = getWebSocketInstance();
    ws.onmessage = handleWebSocketMessage;

    initializeGrid();
    initializeColorPicker();

    // drag drawing
    document.addEventListener('mousedown', () => {
        isDrawing = true;
    })
    document.addEventListener('mouseup', () => {
        isDrawing = false;
    })
    document.addEventListener("touchstart", (e) => {
        isDrawing = true;
    });

    document.addEventListener("touchend", (e) => {
        isDrawing = false;
    });

    document.addEventListener("touchcancel", (e) => {
        isDrawing = false;
    });

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

            // Set individual mouse events for drawing
            cell.addEventListener("mousedown", () => {
                handleCellClick(row, col);
            });

            cell.addEventListener("mouseover", () => {
                if (isDrawing) {
                    handleCellClick(row, col);
                }
            });
            cell.addEventListener("touchstart", (e) => {
                e.preventDefault(); // prevent scrolling
                handleCellClick(row, col);
            });

            cell.addEventListener("touchmove", (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const target = document.elementFromPoint(touch.clientX, touch.clientY);

                if (target && target.classList.contains('cell')) {
                    const row = target.dataset.row;
                    const col = target.dataset.col;
                    handleCellClick(parseInt(row), parseInt(col));
                }
            });
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

    const currentColor = cell.dataset.color

    if (currentColor === selectedColor) {
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
    cell.style.backgroundColor = selectedColor;
    cell.dataset.color = selectedColor;
}


function updateGridCell(row, col, color) {
    const cell = document.querySelector(`[data-row='${row}'][data-col='${col}']`);

    if (cell) {
        cell.style.backgroundColor = color;
        cell.dataset.color = color;
        console.log(`Cell updated. Set (${row}, ${col}) to ${color}`);
    } else {
        console.warn("WARN: Cell (${row}, ${col}) not found!")
    }
}

