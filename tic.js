const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

let gameBoard = Array(9).fill(null); // 9 cells
let currentPlayer = Math.random() < 0.5 ? 'X' : 'O'; // Randomly decide who starts
let isGameOver = false;
let gameMoves = []; // Store the moves

// AI makes its move using the minimax algorithm
const aiMove = () => {
    const bestMove = minimax(gameBoard, 'O');
    gameBoard[bestMove.index] = 'O'; // AI places 'O'
    currentPlayer = 'X'; // Switch back to player
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

    const filePath = path.join(__dirname, 'tictactoe-board.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);

    return filePath;
};

// Command to execute the game
module.exports = {
    name: 'tictactoe',
    description: 'Play Tic-Tac-Toe with AI!',
    category: 'Fun',
    async execute(conn, chatId, args) {
        try {
            if (args[0] === 'move') {
                if (isGameOver) {
                    await conn.sendMessage(chatId, { text: 'The game is over. Type !tictactoe to start a new game.' });
                    return;
                }

                const move = parseInt(args[1]) - 1;
                if (move < 0 || move > 8 || gameBoard[move]) {
                    await conn.sendMessage(chatId, { text: 'Invalid move. Please choose a number between 1-9 that is not already taken.' });
                    return;
                }

                gameBoard[move] = 'X';
                currentPlayer = 'O';
                gameMoves.push(move + 1);

                const winner = checkWinner(gameBoard, 'X');
                if (winner) {
                    const filePath = await renderBoard();
                    await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'You win!' });
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

                aiMove(); // AI plays after player

                const aiWinner = checkWinner(gameBoard, 'O');
                if (aiWinner) {
                    const filePath = await renderBoard();
                    await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'AI wins!' });
                    isGameOver = true;
                    fs.unlinkSync(filePath);  // Delete the image after sending
                    return;
                }

                const filePath = await renderBoard();
                await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'Your move!' });
                fs.unlinkSync(filePath);  // Delete the image after sending
            } else {
                // Start a new game
                gameBoard = Array(9).fill(null);
                currentPlayer = Math.random() < 0.5 ? 'X' : 'O'; // Randomly decide who starts
                gameMoves = [];
                isGameOver = false;
                await conn.sendMessage(chatId, { text: `New game started! ${currentPlayer === 'X' ? 'You' : 'AI'} start! Make your move using !tictactoe move <1-9>` });
            }
        } catch (error) {
            console.error('Error in Tic-Tac-Toe game:', error);
            await conn.sendMessage(chatId, { text: 'An error occurred while starting the game.' });
        }
    }
};
