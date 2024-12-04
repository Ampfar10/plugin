const Jimp = require('jimp');

let gameState = {
    grid: [],
    players: [],
    currentPlayer: 0,
    gameActive: false,
    eliminatedPlayers: [],
    playerMoves: [] 
};


const initializeGrid = () => {
    gameState.grid = Array.from({ length: 6 }, () => 
        Array.from({ length: 6 }, () => ({ owner: null, count: 0 }))
    );
    gameState.playerMoves = Array(gameState.players.length).fill(0); 
};

//Add player
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

//Grid lines
const drawGridLines = async (img, cellSize) => {
    const playerColor = getPlayerColor(gameState.players[gameState.currentPlayer]); 
    const lineColor = Jimp.cssColorToHex(playerColor); 

    for (let i = 0; i <= 6; i++) {
        img.scan(i * cellSize, 0, 1, img.bitmap.height, (x, y) => {
            img.setPixelColor(lineColor, x, y);
        });

        img.scan(0, i * cellSize, img.bitmap.width, 1, (x, y) => {
            img.setPixelColor(lineColor, x, y);
        });
    }
};


// Create the grid image
const createGridImage = async () => {
    const width = 300; 
    const height = 300; 
    const cellSize = 50; 
    const img = new Jimp(width, height, 0xffffffff); 

    await drawGridLines(img, cellSize); 

    const font = await Jimp.loadFont(Jimp.FONT_SANS_8_BLACK); 
    const font1 = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

    let cellNumber = 1; 
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
            const x = col * cellSize;
            const y = row * cellSize;

            const cell = gameState.grid[row][col];
            img.print(font, x + 5, y + 5, `${cellNumber}`); 

            if (cell.owner !== null) {
               
                const ownerId = cell.owner;
                const isSpecialPlayer = ownerId === '27672633675@s.whatsapp.net';
                const radius = 15; 
                const cx = x + cellSize / 2;
                const cy = y + cellSize / 2;

                if (isSpecialPlayer) {
                    const colors = ['#0000FF', '#87CEEB', '#00FFFF']; 
                    const segmentAngle = (2 * Math.PI) / colors.length;

                    for (let i = 0; i < colors.length; i++) {
                        const color = Jimp.cssColorToHex(colors[i]);
                        const startAngle = segmentAngle * i;
                        const endAngle = segmentAngle * (i + 1);

                        img.scanCircleSegment(cx, cy, radius, startAngle, endAngle, color);
                    }
                } else {
                    const color = Jimp.cssColorToHex(getPlayerColor(ownerId));
                    img.scanCircle(cx, cy, radius, color);
                }

                img.print(font1, x + 15, y + 15, `${cell.count}`); 
            }

            cellNumber++; 
        }
    }

    const buffer = await img.getBufferAsync(Jimp.MIME_PNG);
    return buffer;
};

// Draw a full circle
Jimp.prototype.scanCircle = function (cx, cy, radius, color) {
    this.scan(cx - radius, cy - radius, radius * 2, radius * 2, (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy <= radius * radius) {
            this.setPixelColor(color, x, y);
        }
    });
};

// Draw a circle segment
Jimp.prototype.scanCircleSegment = function (cx, cy, radius, startAngle, endAngle, color) {
    this.scan(cx - radius, cy - radius, radius * 2, radius * 2, (x, y) => {
        const dx = x - cx;
        const dy = y - cy;
        const angle = Math.atan2(dy, dx);
        if (
            dx * dx + dy * dy <= radius * radius &&
            angle >= startAngle &&
            angle < endAngle
        ) {
            this.setPixelColor(color, x, y);
        }
    });
};



// Get player color
const getPlayerColor = (playerId) => {
    const playerIndex = gameState.players.indexOf(playerId);
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
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

    const cellIndex = number - 1; 
    if (cellIndex < 0 || cellIndex >= 36) {
        return "Invalid cell number! Please use a number between 1 and 36.";
    }

    const row = Math.floor(cellIndex / 6); 
    const col = cellIndex % 6; 
    if (cell.owner === playerId) {
        cell.count++; 
    } else if (cell.owner === null) {
        cell.owner = playerId;
        cell.count = 1; 
    } else {
        return "This cell is already taken by another player!";
    }

    gameState.playerMoves[gameState.currentPlayer]++;

    if (cell.count > 3) {
        await handleExplosion(row, col, conn, chatId);
    } else {

        await displayGrid(conn, chatId);

        if (gameState.playerMoves.every(move => move > 0)) {
            await checkEliminationAndWin(conn, chatId);

            gameState.playerMoves.fill(0);
        }

        gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;

        const nextPlayerId = gameState.players[gameState.currentPlayer].replace('@s.whatsapp.net', ''); // Remove unwanted suffix
        return `Next player's turn: @${nextPlayerId}.`;
    }
};


// Handle explosion of an atom
const handleExplosion = async (row, col, conn, chatId) => {
    const cell = gameState.grid[row][col];
    const explodingPlayer = cell.owner; 

    const cornerThreshold = 2;
    const defaultThreshold = 3;

    const isCornerCell =
        (row === 0 && col === 0) ||
        (row === 0 && col === 5) ||
        (row === 5 && col === 0) ||
        (row === 5 && col === 5);
    const explosionThreshold = isCornerCell ? cornerThreshold : defaultThreshold;

    cell.count = 0;
    cell.owner = null;

    const directions = [
        [-1, 0], 
        [1, 0],  
        [0, -1], 
        [0, 1],  
    ];

    for (const [dx, dy] of directions) {
        const newRow = row + dx;
        const newCol = col + dy;
        if (newRow >= 0 && newRow < 6 && newCol >= 0 && newCol < 6) {
            const adjacentCell = gameState.grid[newRow][newCol];

            if (adjacentCell.owner === null) {
                adjacentCell.owner = explodingPlayer;
                adjacentCell.count = 1;
            } else if (adjacentCell.owner !== explodingPlayer) {
                adjacentCell.owner = explodingPlayer;
                adjacentCell.count++; 
            } else {
                adjacentCell.count++;
            }

            const adjacentThreshold =
                (newRow === 0 && newCol === 0) ||
                (newRow === 0 && newCol === 5) ||
                (newRow === 5 && newCol === 0) ||
                (newRow === 5 && newCol === 5)
                    ? cornerThreshold
                    : defaultThreshold;

            if (adjacentCell.count > adjacentThreshold) {
                await handleExplosion(newRow, newCol, conn, chatId); 
            }
        }
    }

    await displayGrid(conn, chatId);

    gameState.currentPlayer = (gameState.currentPlayer + 1) % gameState.players.length;

    const nextPlayerId = gameState.players[gameState.currentPlayer].replace('@s.whatsapp.net', ''); 
    await conn.sendMessage(chatId, {
        text: `Next player's turn: @${nextPlayerId}.`,
        mentions: [gameState.players[gameState.currentPlayer]],
    });

    await checkEliminationAndWin(conn, chatId);
};

// Check if any players are eliminated or if a player has won
const checkEliminationAndWin = async (conn, chatId) => {
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

    const remainingPlayers = gameState.players.filter(playerId => 
        !gameState.eliminatedPlayers.includes(playerId)
    );

    if (remainingPlayers.length === 1) {
        const winner = remainingPlayers[0];
        await conn.sendMessage(chatId, { 
            text: `Game over! @${winner.replace('@s.whatsapp.net', '')} has won the game!`, 
            mentions: [winner]
        });
        gameState.gameActive = false;
    }
};

// Start the game
const startGame = async (conn, chatId) => {
    initializeGrid();
    gameState.players = [];
    gameState.currentPlayer = 0;
    gameState.gameActive = true;
    gameState.eliminatedPlayers = [];

    await conn.sendMessage(chatId, { 
        text: "Game started! You have 30 seconds to join the game. Use !cr join to join." 
    });
    setTimeout(async () => {
        if (gameState.players.length === 2) {
            await conn.sendMessage(chatId, {
                text: "The game needs at least 2 players to start...",
            });
            gameState.gameActive = false; 
            return;
        }

        const firstPlayerId = gameState.players[0];
        await conn.sendMessage(chatId, {
            text: `Time's up!`,
            mentions: [firstPlayerId],
        });

        await displayGrid(conn, chatId);

        await conn.sendMessage(chatId, {
            text: `The game has started! First player: @${firstPlayerId.replace('@s.whatsapp.net', '')}.`,
            mentions: [firstPlayerId],
        });

        gameState.currentPlayer = 0;
    }, 30000); 
};

const endGame = async (conn, chatId) => {
    if (!gameState.gameActive) {
        await conn.sendMessage(chatId, { text: "There is no active game to end." });
        return;
    }
    
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
