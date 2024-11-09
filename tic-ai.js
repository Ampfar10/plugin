const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

let gameBoard = Array(9).fill(null); // 9 cells
let currentPlayer = 'X'; // AI1 starts
let isGameOver = false;
let gameMoves = []; // Store the moves
let aiPlaying = true; // Control the AI playing state

// AI makes its move using the minimax algorithm
const aiMove = (player) => {
    const bestMove = minimax(gameBoard, player);
    gameBoard[bestMove.index] = player; // AI places the marker
    currentPlayer = player === 'X' ? 'O' : 'X'; // Switch to the other AI
    gameMoves.push(bestMove.index + 1);
};

// Minimax Algorithm to make optimal AI moves
function minimax(board, player) {
    const availableMoves = getAvailableMoves(board);
    if (checkWinner(board, 'X')) return { score: -10 };
    if (checkWinner(board, 'O')) return { score: 10 };
    if (availableMoves.length === 0) return { score: 0 };

    let moves = [];
    for (let i = 0; i < availableMoves.length; i++) {
        const move = availableMoves[i];
        const newBoard = board.slice();
        newBoard[move] = player;
        const score = minimax(newBoard, player === 'O' ? 'X' : 'O').score;
        moves.push({ index: move, score });
    }
    return player === 'O' ? bestMove(moves) : worstMove(moves);
}

function bestMove(moves) {
    return moves.reduce((best, move) => best.score > move.score ? best : move);
}

function worstMove(moves) {
    return moves.reduce((worst, move) => worst.score < move.score ? worst : move);
}

function getAvailableMoves(board) {
    return board.map((cell, index) => cell === null ? index : null).filter(cell => cell !== null);
}

function checkWinner(board, player) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]  // diagonals
    ];

    for (const pattern of winPatterns) {
        if (pattern.every(index => board[index] === player)) {
            return pattern;  // Return the winning combination
        }
    }
    return null;
}

// Function to render the board with canvas
const renderBoard = async () => {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    const cellSize = 133;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(canvas.width, i * cellSize);
        ctx.stroke();
    }

    // Draw X's, O's, and numbers
    gameBoard.forEach((cell, index) => {
        const x = (index % 3) * cellSize + cellSize / 2;
        const y = Math.floor(index / 3) * cellSize + cellSize / 2;

        if (cell === 'X') {
            ctx.font = '100px sans-serif';
            ctx.fillStyle = '#ff0000'; // red color
            ctx.fillText('X', x - 35, y + 35);
        } else if (cell === 'O') {
            ctx.font = '100px sans-serif';
            ctx.fillStyle = '#0000ff'; // blue color
            ctx.fillText('O', x - 35, y + 35);
        } else {
            ctx.font = '30px sans-serif';
            ctx.fillStyle = '#000'; // black color
            ctx.fillText(index + 1, x - 15, y + 35); // Draw numbers 1-9 on empty cells
        }
    });

    // Draw line if there's a winner
    const winningLine = checkWinner(gameBoard, 'X') || checkWinner(gameBoard, 'O');
    if (winningLine) {
        ctx.strokeStyle = '#00FF00'; // Green color for the winning line
        ctx.lineWidth = 5;
        const [a, b, c] = winningLine;
        const ax = (a % 3) * cellSize + cellSize / 2;
        const ay = Math.floor(a / 3) * cellSize + cellSize / 2;
        const bx = (b % 3) * cellSize + cellSize / 2;
        const by = Math.floor(b / 3) * cellSize + cellSize / 2;
        const cx = (c % 3) * cellSize + cellSize / 2;
        const cy = Math.floor(c / 3) * cellSize + cellSize / 2;

        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.stroke();
    }

    const filePath = path.join(__dirname, 'tictactoe-ai-board.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);

    return filePath;
};

// Command to execute the game
module.exports = {
    name: 'tictactoe-ai',
    description: 'AI vs AI Tic-Tac-Toe game!',
    category: 'Fun',
    async execute(conn, chatId, args) {
        try {
            if (args[0] === 'stop') {
                aiPlaying = false;
                await conn.sendMessage(chatId, { text: 'AI vs AI game has been stopped.' });
                return;
            }

            if (!aiPlaying) {
                await conn.sendMessage(chatId, { text: 'The game has already been stopped.' });
                return;
            }

            // AI vs AI game loop
            while (!isGameOver && aiPlaying) {
                aiMove(currentPlayer);

                const winner = checkWinner(gameBoard, 'X');
                if (winner) {
                    const filePath = await renderBoard();
                    await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'AI X wins!' });
                    isGameOver = true;
                    fs.unlinkSync(filePath);  // Delete the image after sending
                    return;
                }

                const aiWinner = checkWinner(gameBoard, 'O');
                if (aiWinner) {
                    const filePath = await renderBoard();
                    await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'AI O wins!' });
                    isGameOver = true;
                    fs.unlinkSync(filePath);  // Delete the image after sending
                    return;
                }

                if (gameMoves.length === 9) {
                    const filePath = await renderBoard();
                    await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'It\'s a tie!' });
                    isGameOver = true;
                    fs.unlinkSync(filePath);  // Delete the image after sending
                    return;
                }

                const filePath = await renderBoard();
                await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'AI is playing, wait for the next move!' });
                fs.unlinkSync(filePath);  // Delete the image after sending
            }
        } catch (error) {
            console.error('Error in AI vs AI Tic-Tac-Toe game:', error);
            await conn.sendMessage(chatId, { text: 'An error occurred while running the AI vs AI game.' });
        }
    }
};
