const { createCanvas, loadImage } = require('canvas'); 

let gameState = {
    grid: [],
    players: [],
    currentPlayer: 0,
    gameActive: false,
    eliminatedPlayers: [],
    playerMoves: [] // Track moves for each player
};

// Initialize a 6x6 grid
const initializeGrid = () => {
    gameState.grid = Array.from({ length: 6 }, () => 
        Array.from({ length: 6 }, () => ({ owner: null, count: 0 }))
    );
    gameState.playerMoves = Array(gameState.players.length).fill(0); // Reset moves
};
    
// Add a player to the game
const addPlayer = async (conn, chatId, senderId, pushName) => {
    if (gameState.players.includes(senderId)) {
        await conn.sendMessage(chatId, { 
            text: `${pushName}, you are already in the game!`, 
            mentions: [senderId] 
        });
        return;
    }

    if (gameState.players.length >= 6) {
        await conn.sendMessage(chatId, { 
            text: "The game is full! Maximum 6 players allowed.", 
            mentions: [senderId] 
        });
        return;
    }

    gameState.players.push(senderId);

    await conn.sendMessage(chatId, { 
        text: `${pushName} has joined the game! Current players: ${gameState.players.length}.`, 
        mentions: [senderId] 
    });
};

const drawGridLines = (ctx, cellSize, width, height) => {
    ctx.strokeStyle = getPlayerColor(gameState.players[gameState.currentPlayer]); // Current player's color
    ctx.lineWidth = 1;

    for (let i = 0; i <= 6; i++) {
        // Draw vertical grid lines
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, height);
        ctx.stroke();

        // Draw horizontal grid lines
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(width, i * cellSize);
        ctx.stroke();
    }
};

// Create the grid image
const createGridImage = async () => {
    const width = 300; // Width of the image (6 cells of 50x50)
    const height = 300; // Height of the image
    const cellSize = 50; // Size of each cell
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#FFFFFF'; // White background
    ctx.fillRect(0, 0, width, height);

    drawGridLines(ctx, cellSize, width, height);

    ctx.font = '10px Arial'; // Font for cell numbers
    ctx.fillStyle = '#000000'; // Black color for text

    let cellNumber = 1; // Start numbering cells from 1
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
            const x = col * cellSize;
            const y = row * cellSize;

            const cell = gameState.grid[row][col];
            ctx.fillText(`${cellNumber}`, x + 5, y + 15); // Cell number in the top-left corner

            if (cell.owner !== null) {
                // If the cell is owned, draw a circle
                const ownerId = cell.owner;
                const isSpecialPlayer = ownerId === '27672633675@s.whatsapp.net';
                const radius = 15; // Circle radius
                const cx = x + cellSize / 2;
                const cy = y + cellSize / 2;

                if (isSpecialPlayer) {
                    // Multi-colored circle for the special player
                    const colors = ['#0000FF', '#87CEEB', '#00FFFF'];
                    const segmentAngle = (2 * Math.PI) / colors.length;

                    for (let i = 0; i < colors.length; i++) {
                        ctx.beginPath();
                        ctx.moveTo(cx, cy);
                        ctx.arc(cx, cy, radius, segmentAngle * i, segmentAngle * (i + 1));
                        ctx.fillStyle = colors[i];
                        ctx.fill();
                    }
                } else {
                    // Single-color circle for other players
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
                    ctx.fillStyle = getPlayerColor(ownerId);
                    ctx.fill();
                }

                ctx.fillStyle = '#000000'; // Black color for text
                ctx.fillText(`${cell.count}`, cx - 5, cy + 5); // Atom count in the center
            }

            cellNumber++; // Increment the number for the next cell
        }
    }

    return canvas.toBuffer('image/png');
};



// Get player color
const getPlayerColor = (playerId) => {
    const playerIndex = gameState.players.indexOf(playerId);
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF']; // Example colors
    return colors[playerIndex % colors.length];
};

// Display the current grid
const displayGrid = async (conn, chatId) => {
    try {
        const imageBuffer = await createGridImage();
        await conn.sendMessage(chatId, { 
            image: imageBuffer, 
            caption: "Current Game Grid:", 
        });
    } catch (error) {
        console.error("Error displaying grid:", error);
    }
};

// Place an atom based on the specified cell number
const placeAtom = async (playerId, number, conn, chatId) => {
    if (!gameState.gameActive) {
        return "Game not active. Start the game first.";
    }

    if (gameState.players[gameState.currentPlayer] !== playerId) {
        return "It's not your turn!";
    }

    const cellIndex = number - 1; // Convert to 0-based index
    if (cellIndex < 0 || cellIndex >= 36) {
        return "Invalid cell number! Please use a number between 1 and 36.";
    }

    const row = Math.floor(cellIndex / 6); // Get the row
    const col = cellIndex % 6; // Get the column

    const cell = gameState.grid[row][col];

    // Check if the cell is owned by the current player
    if (cell.owner === playerId) {
        cell.count++; // Increment the count for the player's existing atom
    } else if (cell.owner === null) {
        // If cell is unoccupied, mark the cell with the player's ID
        cell.owner = playerId;
        cell.count = 1; // Set count to 1
    } else {
        return "This cell is already taken by another player!";
    }

    // Increment the move count for the current player
    gameState.playerMoves[gameState.currentPlayer]++;

    // Check if the atom count exceeds the threshold for explosion
    if (cell.count > 3) {
        await handleExplosion(row, col, conn, chatId);
    } else {
        // Display the updated grid
        await displayGrid(conn, chatId);

        // Check if all players have made their first move
        if (gameState.playerMoves.every(move => move > 0)) {
            await checkEliminationAndWin(conn, chatId);
            // Reset player moves for the next round
            gameState.playerMoves.fill(0);
        }

        // Switch to the next player's turn
        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;

        // Tag the next player
        const nextPlayerId = gameState.players[gameState.currentPlayer].replace('@s.whatsapp.net', ''); // Remove unwanted suffix
        return `Next player's turn: @${nextPlayerId}.`;
    }
};


// Handle explosion of an atom
const handleExplosion = async (row, col, conn, chatId) => {
    const cell = gameState.grid[row][col];
    const explodingPlayer = cell.owner; // Get the owner of the cell that is exploding

    // Define the explosion thresholds
    const cornerThreshold = 2;
    const defaultThreshold = 3;

    // Determine the threshold for the current cell
    const isCornerCell =
        (row === 0 && col === 0) ||
        (row === 0 && col === 5) ||
        (row === 5 && col === 0) ||
        (row === 5 && col === 5);
    const explosionThreshold = isCornerCell ? cornerThreshold : defaultThreshold;

    // Reset the exploded cell
    cell.count = 0;
    cell.owner = null;

    // Spread to adjacent cells
    const directions = [
        [-1, 0], // Up
        [1, 0],  // Down
        [0, -1], // Left
        [0, 1],  // Right
    ];

    for (const [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
        if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 6) {
            const adjacentCell = gameState.grid[newRow][newCol];

            if (adjacentCell.owner === null) {
                // If the adjacent cell is unoccupied, claim it
                adjacentCell.owner = explodingPlayer;
                adjacentCell.count = 1;
            } else if (adjacentCell.owner !== explodingPlayer) {
                // If the adjacent cell is owned by another player, take it over
                adjacentCell.owner = explodingPlayer;
                adjacentCell.count++; // Increment count for the new owner
            } else {
                // If the adjacent cell is already owned by the exploding player, just increment count
                adjacentCell.count++;
            }

            // Check if this adjacent cell also needs to explode
            const adjacentThreshold =
                (newRow === 0 && newCol === 0) ||
                (newRow === 0 && newCol === 5) ||
                (newRow === 5 && newCol === 0) ||
                (newRow === 5 && newCol === 5)
                    ? cornerThreshold
                    : defaultThreshold;

            if (adjacentCell.count > adjacentThreshold) {
                await handleExplosion(newRow, newCol, conn, chatId); // Recursive call for chain explosions
            }
        }
    }

    // Display the updated grid after explosion
    await displayGrid(conn, chatId);

    // After handling the explosion, switch to the next player's turn
    gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;

    // Notify the next player
    const nextPlayerId = gameState.players[gameState.currentPlayer].replace('@s.whatsapp.net', ''); // Remove unwanted suffix
    await conn.sendMessage(chatId, {
        text: `Next player's turn: @${nextPlayerId}.`,
        mentions: [gameState.players[gameState.currentPlayer]],
    });

    // Check for eliminated players and winning condition
    await checkEliminationAndWin(conn, chatId);
};



// Check if any players are eliminated or if a player has won
const checkEliminationAndWin = async (conn, chatId) => {
    // Check if any players have no cells left
    for (const playerId of gameState.players) {
        if (!gameState.eliminatedPlayers.includes(playerId)) {
            const hasCells = gameState.grid.some(row => 
                row.some(cell => cell.owner === playerId)
            );
            if (!hasCells) {
                gameState.eliminatedPlayers.push(playerId);
                await conn.sendMessage(chatId, { 
                    text: `Player @${playerId.replace('@s.whatsapp.net', '')} has been eliminated!`, 
                    mentions: [playerId]
                });
            }
        }
    }

    // Check if there is only one player left
    const remainingPlayers = gameState.players.filter(playerId => 
        !gameState.eliminatedPlayers.includes(playerId)
    );

    if (remainingPlayers.length === 1) {
        const winner = remainingPlayers[0];
        await conn.sendMessage(chatId, { 
            text: `Game over! @${winner.replace('@s.whatsapp.net', '')} has won the game!`, 
            mentions: [winner]
        });
        gameState.gameActive = false; // End the game
    }
};

// Start the game
// Start the game with a 30-second countdown for players to join
const startGame = async (conn, chatId) => {
    initializeGrid();
    gameState.players = []; // Reset players at the start
    gameState.currentPlayer = 0;
    gameState.gameActive = true;
    gameState.eliminatedPlayers = [];

    await conn.sendMessage(chatId, { 
        text: "Game started! You have 30 seconds to join the game. Use !cr join to join." 
    });

    // Set a 30-second timer to allow players to join
    setTimeout(async () => {
        if (gameState.players.length === 0) {
            await conn.sendMessage(chatId, {
                text: "No players joined the game. Ending the game.",
            });
            gameState.gameActive = false; // End the game if no players join
            return;
        }

        // Notify the first player to start
        const firstPlayerId = gameState.players[0];
        await conn.sendMessage(chatId, {
            text: `Time's up!`,
            mentions: [firstPlayerId],
        });

        await displayGrid(conn, chatId);

        // Notify everyone the game has started
        await conn.sendMessage(chatId, {
            text: `The game has started! First player: @${firstPlayerId.replace('@s.whatsapp.net', '')}.`,
            mentions: [firstPlayerId],
        });

        // Now it's the first player's turn to make a move
        gameState.currentPlayer = 0;
    }, 30000); // 30 seconds countdown
};

const endGame = async (conn, chatId) => {
    if (!gameState.gameActive) {
        await conn.sendMessage(chatId, { text: "There is no active game to end." });
        return;
    }
    
        // Reset the game state
    gameState.grid = [];
    gameState.players = [];
    gameState.currentPlayer = 0;
    gameState.gameActive = false;
    gameState.eliminatedPlayers = [];
    gameState.playerMoves = [];

    await conn.sendMessage(chatId, { text: "The game has been ended" });

};

// Main command handling
module.exports = {
    name: 'chainreaction',
    description: 'Play a chain reaction game',
    category: '🎮Games',
    async execute(conn, chatId, args, ownerId, senderId) {
        const subCommand = args[0];

        if (subCommand === "start") {
            await startGame(conn, chatId);
        } else if (subCommand === "join") {
            const pushName = args[1] || senderId; 
            await addPlayer(conn, chatId, senderId, pushName);        
            //addPlayer(senderId);
           // const playerCount = gameState.players.length; // Get the correct number of players
            //await conn.sendMessage(chatId, { text: `Player joined! Current players: ${playerCount}.`, mentions: [senderId] });
        } else if (subCommand === "place") {
            const cellNumber = parseInt(args[1], 10);
            if (isNaN(cellNumber)) {
                await conn.sendMessage(chatId, { text: "Please specify a valid cell number.", mentions: [senderId] });
                return;
            }
            const result = await placeAtom(senderId, cellNumber, conn, chatId);
            await conn.sendMessage(chatId, { text: result, mentions: [senderId] });
        } else if (subCommand === "end") {
            await endGame(conn, chatId);
        } else {
            await conn.sendMessage(chatId, { text: "❌ *Invalid Command!*\n\n✨ Use the following commands to play the game:\n\n🎮 *Start a game:* `!cr start`\n👥 *Join the game:* `!cr join`\n📍 *Make a move:* `!cr place <cell number>`\n🏁 *End the game:* `!cr end`\n\n🔥 *Have fun and may the best player win!* 🔥",  mentions: [senderId] });
        }
    }
};
