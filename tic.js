const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

let gameBoard = Array(9).fill(null); // 9 cells
let currentPlayer = Math.random() < 0.5 ? 'X' : 'O';
let isGameOver = false;
let gameMoves = []; 
let leaderboard = { playerWins: 0, aiWins: 0, ties: 0 };

const aiMove = () => {
    const bestMove = minimax(gameBoard, 'O');
    gameBoard[bestMove.index] = 'O';
    currentPlayer = 'X';
    gameMoves.push(bestMove.index + 1);
};

function minimax(board, player) {
    const availableMoves = getAvailableMoves(board);
    if (checkWinner(board, 'X')) return { score: -10 };
    if (checkWinner(board, 'O')) return { score: 10 };
    if (availableMoves.length === 0) return { score: 0 };

    let moves = [];
    for (const move of availableMoves) {
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
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (const pattern of winPatterns) {
        if (pattern.every(index => board[index] === player)) {
            return pattern;
        }
    }
    return null;
}

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

        ctx.font = cell ? '100px sans-serif' : '30px sans-serif';
        ctx.fillStyle = cell ? (cell === 'X' ? '#ff0000' : '#0000ff') : '#000';
        ctx.fillText(cell || index + 1, x - 15, y + 35);
    });

    const winningLine = checkWinner(gameBoard, 'X') || checkWinner(gameBoard, 'O');
    if (winningLine) {
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 5;
        const [a, b, c] = winningLine;
        ctx.beginPath();
        ctx.moveTo((a % 3) * cellSize + cellSize / 2, Math.floor(a / 3) * cellSize + cellSize / 2);
        ctx.lineTo((c % 3) * cellSize + cellSize / 2, Math.floor(c / 3) * cellSize + cellSize / 2);
        ctx.stroke();
    }

    const filePath = path.join(__dirname, 'tictactoe-board.png');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filePath, buffer);
    return filePath;
};

const updateLeaderboard = (result) => {
    const lbPath = path.join(__dirname, '../ttt-lb.json');
    try {
        const data = fs.readFileSync(lbPath, 'utf-8');
        leaderboard = JSON.parse(data);
    } catch {
        leaderboard = { playerWins: 0, aiWins: 0, ties: 0 };
    }

    if (result === 'player') leaderboard.playerWins++;
    else if (result === 'ai') leaderboard.aiWins++;
    else leaderboard.ties++;

    fs.writeFileSync(lbPath, JSON.stringify(leaderboard));
};

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
                    await conn.sendMessage(chatId, { text: 'Invalid move. Choose a number between 1-9 that isn\'t taken.' });
                    return;
                }

                gameBoard[move] = 'X';
                currentPlayer = 'O';
                gameMoves.push(move + 1);

                const winner = checkWinner(gameBoard, 'X');
                if (winner) {
                    const filePath = await renderBoard();
                    await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'You win!' });
                    updateLeaderboard('player');
                    isGameOver = true;
                    fs.unlinkSync(filePath);
                    return;
                }

                if (gameMoves.length === 9) {
                    const filePath = await renderBoard();
                    await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'It\'s a tie!' });
                    updateLeaderboard('tie');
                    isGameOver = true;
                    fs.unlinkSync(filePath);
                    return;
                }

                aiMove();

                const aiWinner = checkWinner(gameBoard, 'O');
                if (aiWinner) {
                    const filePath = await renderBoard();
                    await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'AI wins!' });
                    updateLeaderboard('ai');
                    isGameOver = true;
                    fs.unlinkSync(filePath);
                    return;
                }

                const filePath = await renderBoard();
                await conn.sendMessage(chatId, { image: { url: filePath }, caption: 'Your move!' });
                fs.unlinkSync(filePath);
            } else if (args[0] === 'leaderboard') {
                const lbPath = path.join(__dirname, 'ttt-lb.json');
                let data;
                try {
                    data = fs.readFileSync(lbPath, 'utf-8');
                } catch {
                    data = JSON.stringify(leaderboard);
                }
                const lb = JSON.parse(data);
                await conn.sendMessage(chatId, {
                    text: `Leaderboard:\n\nAI: ${lb.aiWins}\nYou: ${lb.playerWins}\nTies: ${lb.ties}`
                });
            } else {
                gameBoard = Array(9).fill(null);
                currentPlayer = Math.random() < 0.5 ? 'X' : 'O';
                gameMoves = [];
                isGameOver = false;
                await conn.sendMessage(chatId, { text: `New game! ${currentPlayer === 'X' ? 'You' : 'AI'} start! Type !tictactoe move <1-9>` });
            }
        } catch (error) {
            console.error('Error in Tic-Tac-Toe game:', error);
            await conn.sendMessage(chatId, { text: 'An error occurred while starting the game.' });
        }
    }
};
