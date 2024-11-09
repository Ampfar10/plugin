const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

let gameBoard = Array(9).fill(null);
let currentPlayer = Math.random() < 0.5 ? 'X' : 'O';
let isGameOver = false;
let aiPlaying = false;

// AI move using minimax (simplified for alternating moves)
const aiMove = () => {
    const bestMove = minimax(gameBoard, currentPlayer);
    gameBoard[bestMove.index] = currentPlayer;
    currentPlayer = currentPlayer === 'X' ? 'O' : 'X'; // Alternate between 'X' and 'O'
};

// Minimax for optimal moves
function minimax(board, player) {
    const availableMoves = getAvailableMoves(board);
    if (checkWinner(board, 'X')) return { score: -10 };
    if (checkWinner(board, 'O')) return { score: 10 };
    if (availableMoves.length === 0) return { score: 0 };

    let moves = [];
    for (let move of availableMoves) {
        let newBoard = [...board];
        newBoard[move] = player;
        const score = minimax(newBoard, player === 'O' ? 'X' : 'O').score;
        moves.push({ index: move, score });
    }
    return player === 'O' ? bestMove(moves) : worstMove(moves);
}

function bestMove(moves) { return moves.reduce((best, move) => best.score > move.score ? best : move); }
function worstMove(moves) { return moves.reduce((worst, move) => worst.score < move.score ? worst : move); }
function getAvailableMoves(board) { return board.map((c, i) => c === null ? i : null).filter(i => i !== null); }

function checkWinner(board, player) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6] // diagonals
    ];
    for (const pattern of winPatterns) {
        if (pattern.every(index => board[index] === player)) return pattern;
    }
    return null;
}

// Render the board with canvas
const renderBoard = async () => {
    const canvas = createCanvas(400, 400);
    const ctx = canvas.getContext('2d');
    const cellSize = 133;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
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
    gameBoard.forEach((cell, index) => {
        const x = (index % 3) * cellSize + cellSize / 2;
        const y = Math.floor(index / 3) * cellSize + cellSize / 2;
        if (cell === 'X' || cell === 'O') {
            ctx.font = '100px sans-serif';
            ctx.fillStyle = cell === 'X' ? '#ff0000' : '#0000ff';
            ctx.fillText(cell, x - 35, y + 35);
        }
    });

    const filePath = path.join(__dirname, 'tictactoe-board.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);

    return filePath;
};

// Command to start/stop AI vs AI game
module.exports = {
    name: 'tictactoe-ai',
    description: 'AI plays Tic-Tac-Toe against itself until one wins!',
    category: 'Fun',
    async execute(conn, chatId, args) {
        if (args[0] === 'stop') {
            aiPlaying = false;
            isGameOver = true;
            await conn.sendMessage(chatId, { text: 'Tic-Tac-Toe AI game stopped!' });
            return;
        }

        if (aiPlaying) {
            await conn.sendMessage(chatId, { text: 'An AI game is already in progress!' });
            return;
        }

        aiPlaying = true;
        isGameOver = false;
        gameBoard = Array(9).fill(null);
        currentPlayer = Math.random() < 0.5 ? 'X' : 'O';
        await conn.sendMessage(chatId, { text: `Starting AI Tic-Tac-Toe! ${currentPlayer} goes first.` });

        while (aiPlaying && !isGameOver) {
            aiMove();

            const winner = checkWinner(gameBoard, 'X') || checkWinner(gameBoard, 'O');
            if (winner) {
                const filePath = await renderBoard();
                await conn.sendMessage(chatId, { image: { url: filePath }, caption: `${currentPlayer === 'X' ? 'O' : 'X'} wins!` });
                fs.unlinkSync(filePath); // Clean up image
                isGameOver = true;
                break;
            }

            if (!winner && getAvailableMoves(gameBoard).length === 0) {
                gameBoard = Array(9).fill(null); // Reset for a new game
                currentPlayer = Math.random() < 0.5 ? 'X' : 'O';
                await conn.sendMessage(chatId, { text: 'It\'s a tie! Restarting...' });
            } else {
                const filePath = await renderBoard();
                await conn.sendMessage(chatId, { image: { url: filePath }, caption: `AI playing... ${currentPlayer}'s move!` });
                fs.unlinkSync(filePath); // Clean up image
            }
        }
    }
};
