const ROWS = 6;
const COLS = 7;
let board = [];
let currentPlayer = 'red'; 
let gameActive = false;
let mode = ''; 
let totalMoves = 0; // Track moves to know when board is full

// NEW: Score Variables
let scores = { red: 0, yellow: 0 };

const boardEl = document.getElementById('game-board');
const statusEl = document.getElementById('status-display');
const menuScreen = document.getElementById('menu-screen');
const gameScreen = document.getElementById('game-screen');
const canvas = document.getElementById('confetti-canvas');
const modal = document.getElementById('game-over-modal');
const modalTitle = document.getElementById('modal-title');
const modalMsg = document.getElementById('modal-msg');
const scoreRedEl = document.getElementById('score-red');
const scoreYellowEl = document.getElementById('score-yellow');

// --- UI NAVIGATION ---
function startGame(selectedMode) {
    mode = selectedMode;
    scores = { red: 0, yellow: 0 }; 
    totalMoves = 0;
    updateScoreUI();
    
    menuScreen.style.transform = 'translateX(-100%)';
    gameScreen.style.transform = 'translateX(0)';
    initBoard();
}

function backToMenu() {
    modal.classList.add('hidden');
    gameActive = false;
    menuScreen.style.transform = 'translateX(0)';
    gameScreen.style.transform = 'translateX(100%)';
}

function resetBoard() {
    modal.classList.add('hidden');
    canvas.style.display = 'none';
    initBoard();
}

// --- GAME LOGIC ---
function initBoard() {
    board = Array(ROWS).fill().map(() => Array(COLS).fill(null));
    boardEl.innerHTML = '';
    currentPlayer = 'red';
    gameActive = true;
    totalMoves = 0;
    scores = { red: 0, yellow: 0 };
    updateScoreUI();
    statusEl.innerText = (mode === 'ai') ? "Your Turn" : "Red's Turn";
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.onclick = () => handleInput(c);
            boardEl.appendChild(cell);
        }
    }
}

function handleInput(col) {
    if (!gameActive) return;
    if (mode === 'ai' && currentPlayer === 'yellow') return; 
    dropPiece(col);
}

function dropPiece(col) {
    for (let r = ROWS - 1; r >= 0; r--) {
        if (!board[r][col]) {
            board[r][col] = currentPlayer;
            animateMove(r, col, currentPlayer);
            totalMoves++;

            // 1. Calculate and Update Score immediately
            calculateScores(); 

            // 2. Check if Board is Full (Game Over Condition)
            if (totalMoves >= ROWS * COLS) {
                handleGameOver();
                return;
            }

            // 3. Switch Turn
            currentPlayer = currentPlayer === 'red' ? 'yellow' : 'red';
            updateStatus();

            if (mode === 'ai' && currentPlayer === 'yellow' && gameActive) {
                setTimeout(aiMove, 600);
            }
            return;
        }
    }
}

function updateStatus() {
    if (mode === 'friend') {
        statusEl.innerText = (currentPlayer === 'red' ? "Red" : "Yellow") + "'s Turn";
    } else {
        statusEl.innerText = (currentPlayer === 'red' ? "Your Turn" : "AI is thinking...");
    }
}

function animateMove(r, c, color) {
    const cell = document.querySelector(`.cell[data-row='${r}'][data-col='${c}']`);
    cell.classList.add(color);
}

// --- NEW SCORING ENGINE ---
// This scans the whole board every move to find ALL 4-connections
function calculateScores() {
    let newScores = { red: 0, yellow: 0 };
    
    // Helper to check a window of 4 cells
    function checkWindow(cells) {
        if (cells.every(c => c === 'red')) newScores.red++;
        if (cells.every(c => c === 'yellow')) newScores.yellow++;
    }

    // Horizontal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            checkWindow([board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]]);
        }
    }
    // Vertical
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS; c++) {
            checkWindow([board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]]);
        }
    }
    // Diagonal (Down-Right)
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 0; c < COLS - 3; c++) {
            checkWindow([board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]]);
        }
    }
    // Diagonal (Down-Left)
    for (let r = 0; r < ROWS - 3; r++) {
        for (let c = 3; c < COLS; c++) {
            checkWindow([board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3]]);
        }
    }

    // Update Global Scores and UI
    scores = newScores;
    updateScoreUI();
}

// --- AI LOGIC (Point Hunter) ---
function aiMove() {
    if (!gameActive) return;

    // Simple AI: Try to make a move that increases AI score, otherwise random
    let bestCol = -1;
    let maxPoints = -1;

    let validCols = [];
    for (let c = 0; c < COLS; c++) {
        if (!board[0][c]) validCols.push(c);
    }

    // Simulate all moves to see which gives most points
    for (let col of validCols) {
        // Find row
        let r = -1;
        for (let i = ROWS - 1; i >= 0; i--) { if (!board[i][col]) { r = i; break; } }
        
        // Sim move
        board[r][col] = 'yellow';
        
        // Calculate temp score gain
        // (We can cheat and use a simplified check or just random for now to keep it fast)
        // For this version, let's keep it semi-random but smart enough to take a free point
        if (checkWinSim(r, col, 'yellow')) {
            bestCol = col;
        }
        
        board[r][col] = null; // Undo
    }

    // If no immediate point found, pick random
    if (bestCol === -1) {
        bestCol = validCols[Math.floor(Math.random() * validCols.length)];
    }

    dropPiece(bestCol);
}

// Helper to check if a specific move ADDS a point (used by AI)
function checkWinSim(r, c, color) {
    const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
    for (let [dr, dc] of directions) {
        let count = 1;
        for (let i = 1; i < 4; i++) {
            let nr = r + dr * i, nc = c + dc * i;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === color) count++; else break;
        }
        for (let i = 1; i < 4; i++) {
            let nr = r - dr * i, nc = c - dc * i;
            if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && board[nr][nc] === color) count++; else break;
        }
        if (count >= 4) return true;
    }
    return false;
}

// --- GAME OVER LOGIC ---
function handleGameOver() {
    gameActive = false;
    startConfetti();

    if (scores.red > scores.yellow) {
        modalTitle.innerText = "Red Wins!";
        modalMsg.innerText = `Final Score: Red (${scores.red}) - Yellow (${scores.yellow})`;
    } else if (scores.yellow > scores.red) {
        modalTitle.innerText = "Yellow Wins!";
        modalMsg.innerText = `Final Score: Yellow (${scores.yellow}) - Red (${scores.red})`;
    } else {
        modalTitle.innerText = "It's a Draw!";
        modalMsg.innerText = `Both players scored ${scores.red} points.`;
    }

    setTimeout(() => {
        modal.classList.remove('hidden');
    }, 500);
}

function updateScoreUI() {
    scoreRedEl.innerText = `Red: ${scores.red}`;
    scoreYellowEl.innerText = `Yel: ${scores.yellow}`;
    
    // Highlight who is leading
    if(scores.red > scores.yellow) {
        scoreRedEl.style.transform = "scale(1.1)";
        scoreYellowEl.style.transform = "scale(1)";
        scoreRedEl.style.border = "2px solid white";
        scoreYellowEl.style.border = "none";
    } else if (scores.yellow > scores.red) {
        scoreYellowEl.style.transform = "scale(1.1)";
        scoreRedEl.style.transform = "scale(1)";
        scoreYellowEl.style.border = "2px solid white";
        scoreRedEl.style.border = "none";
    }
}

// --- CONFETTI ---
function startConfetti() {
    canvas.style.display = 'block';
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const pieces = [];
    for(let i=0; i<150; i++) { // More confetti for final winner
        pieces.push({
            x: Math.random() * canvas.width, y: Math.random() * canvas.height - canvas.height,
            color: `hsl(${Math.random() * 360}, 100%, 50%)`, size: Math.random() * 8 + 4, speed: Math.random() * 5 + 2
        });
    }
    function animate() {
        if (canvas.style.display !== 'none') {
             ctx.clearRect(0,0, canvas.width, canvas.height);
             pieces.forEach(p => {
                 ctx.fillStyle = p.color; ctx.fillRect(p.x, p.y, p.size, p.size);
                 p.y += p.speed; if(p.y > canvas.height) p.y = -10;
             });
             requestAnimationFrame(animate);
        }
    }
    animate();
}