from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Arcade 8 Ball Mobile")

HTML = r'''
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
  <title>Arcade 8 Ball Mobile</title>
  <style>
    :root {
      --bg1: #102554;
      --bg2: #091326;
      --feltA: #5ba6b0;
      --feltB: #317d87;
      --railA: #7d130d;
      --railB: #2d0907;
      --trim: #9ef0fa;
      --gold: #f3c85a;
      --panel: rgba(6, 16, 40, 0.88);
      --white: #f8fafc;
    }
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    html, body {
      margin: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: radial-gradient(circle at top, #254897, #091326 68%);
      font-family: Arial, Helvetica, sans-serif;
      color: white;
    }
    body { touch-action: manipulation; }
    #app {
      position: fixed;
      inset: 0;
      overflow: hidden;
    }
    #rotateOverlay, #startOverlay {
      position: fixed;
      inset: 0;
      z-index: 50;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: linear-gradient(180deg, rgba(6,16,40,.96), rgba(8,10,18,.96));
      text-align: center;
    }
    #rotateOverlay.show, #startOverlay.show {
      display: flex;
    }
    .overlayCard {
      width: min(92vw, 520px);
      border-radius: 22px;
      padding: 22px;
      background: rgba(18, 30, 66, 0.96);
      border: 2px solid rgba(255,255,255,.14);
      box-shadow: 0 20px 44px rgba(0,0,0,.4);
    }
    .overlayTitle {
      font-size: 30px;
      font-weight: 900;
      margin-bottom: 10px;
    }
    .overlayText {
      font-size: 18px;
      line-height: 1.45;
      color: #d6e4ff;
    }
    .overlayBtn {
      margin-top: 18px;
      border: 0;
      border-radius: 16px;
      padding: 14px 18px;
      font-size: 18px;
      font-weight: 900;
      color: white;
      background: linear-gradient(180deg, #23cf49, #138a23);
      min-width: 220px;
    }
    .shell {
      position: absolute;
      inset: 0;
      display: grid;
      grid-template-rows: 84px 1fr;
      gap: 6px;
      padding: env(safe-area-inset-top, 0px) 6px env(safe-area-inset-bottom, 0px) 6px;
    }
    .topbar {
      display: grid;
      grid-template-columns: 58px 1fr 100px 1fr 58px;
      align-items: center;
      gap: 8px;
      padding: 8px 10px;
      background: linear-gradient(180deg, rgba(5,15,38,.95), rgba(14,27,64,.95));
      border-radius: 18px;
      border: 2px solid rgba(255,255,255,.1);
      box-shadow: 0 10px 24px rgba(0,0,0,.32);
    }
    .iconBtn {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      border: 0;
      font-size: 24px;
      font-weight: 900;
      color: white;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, #31d53a, #167f1b);
    }
    .iconBtn.alt {
      background: radial-gradient(circle at 35% 35%, #fff, #d9dde9 70%);
      color: #d92b2b;
      font-size: 20px;
    }
    .playerCard {
      min-width: 0;
      display: grid;
      grid-template-columns: 52px 1fr;
      gap: 8px;
      align-items: center;
    }
    .avatar {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      border: 3px solid #28e049;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #f4cfaa, #8a5f41);
      color: #15203a;
      font-size: 22px;
      font-weight: 900;
    }
    .avatar.ai {
      border-color: #57b2ff;
      background: linear-gradient(135deg, #e1e8ef, #8a6b54);
    }
    .nameRow {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      font-weight: 900;
      font-size: 16px;
      white-space: nowrap;
      overflow: hidden;
    }
    .rank {
      color: #9bf55e;
      font-size: 14px;
      flex: 0 0 auto;
    }
    .pots {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 5px;
      margin-top: 7px;
    }
    .potDot {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 999px;
      background: #0c1122;
      border: 2px solid rgba(255,255,255,.12);
    }
    .potDot.solid { background: linear-gradient(180deg, #ffd95c, #f59e0b); }
    .potDot.stripe { background: linear-gradient(180deg, #ffffff, #eef2f7); border-color: #f59e0b; }
    .stakeCard {
      height: 60px;
      border-radius: 18px;
      display: grid;
      place-items: center;
      background: linear-gradient(180deg, #2e1b00, #5b3800);
      border: 2px solid rgba(255,213,97,.35);
      box-shadow: inset 0 2px 8px rgba(255,219,127,.18);
    }
    .stake {
      color: var(--gold);
      font-size: 26px;
      font-weight: 900;
      text-shadow: 0 2px 0 rgba(0,0,0,.35);
    }
    .boardWrap {
      min-height: 0;
      display: grid;
      grid-template-columns: 46px 1fr 46px;
      gap: 8px;
      align-items: center;
    }
    .sideCol {
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .powerBar {
      width: 34px;
      height: min(70vh, 500px);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      background: linear-gradient(180deg, #ffe35f, #fd9920 52%, #dd1c11);
      border: 3px solid rgba(255,255,255,.24);
      box-shadow: inset 0 0 0 3px rgba(0,0,0,.15);
    }
    .powerMask {
      position: absolute;
      inset: 0 0 auto 0;
      background: rgba(10,10,10,.35);
      height: 72%;
    }
    .powerHandle {
      position: absolute;
      left: 4px;
      width: 24px;
      height: 26px;
      border-radius: 8px;
      background: white;
      border: 3px solid #2c2c2c;
      top: calc(72% - 13px);
    }
    .tray {
      width: 34px;
      height: min(70vh, 500px);
      border-radius: 12px;
      position: relative;
      background: linear-gradient(180deg, rgba(18,34,73,.96), rgba(7,15,35,.96));
      border: 3px solid rgba(255,255,255,.14);
    }
    .trayBall {
      position: absolute;
      left: 5px;
      width: 20px;
      height: 20px;
      border-radius: 999px;
      border: 2px solid rgba(255,255,255,.55);
    }
    .gameArea {
      position: relative;
      min-width: 0;
      min-height: 0;
      height: 100%;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 26px;
      touch-action: none;
      box-shadow: 0 18px 40px rgba(0,0,0,.38);
    }
    .floatingHud {
      position: absolute;
      right: 14px;
      top: 14px;
      display: grid;
      gap: 8px;
      z-index: 4;
    }
    .hudBtn {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      border: 2px solid rgba(255,255,255,.16);
      display: grid;
      place-items: center;
      font-size: 22px;
      font-weight: 900;
      color: white;
      background: linear-gradient(180deg, #1b76db, #0c48a3);
    }
    .status {
      position: absolute;
      left: 14px;
      bottom: 14px;
      z-index: 4;
      padding: 8px 12px;
      border-radius: 14px;
      background: rgba(9,17,39,.8);
      border: 2px solid rgba(255,255,255,.12);
      font-weight: 800;
      font-size: 15px;
      max-width: 52%;
    }
    .toast {
      position: absolute;
      left: 50%;
      top: 16px;
      transform: translateX(-50%);
      z-index: 5;
      padding: 10px 16px;
      border-radius: 999px;
      background: rgba(5,10,22,.9);
      border: 2px solid rgba(255,255,255,.14);
      font-weight: 900;
      opacity: 0;
      pointer-events: none;
      transition: opacity .18s ease;
    }
    .toast.show { opacity: 1; }
    @media (max-width: 900px) {
      .shell { grid-template-rows: 74px 1fr; }
      .topbar { grid-template-columns: 50px 1fr 86px 1fr 50px; }
      .iconBtn, .iconBtn.alt { width: 40px; height: 40px; font-size: 20px; }
      .playerCard { grid-template-columns: 44px 1fr; }
      .avatar { width: 44px; height: 44px; font-size: 18px; }
      .nameRow { font-size: 13px; }
      .rank { font-size: 12px; }
      .stake { font-size: 20px; }
      .boardWrap { grid-template-columns: 38px 1fr 38px; gap: 5px; }
      .powerBar, .tray { height: min(68vh, 430px); width: 28px; }
      .powerHandle { width: 18px; left: 2px; }
      .trayBall { width: 16px; height: 16px; left: 4px; }
      .hudBtn { width: 42px; height: 42px; }
      .status { font-size: 13px; max-width: 58%; }
    }
  </style>
</head>
<body>
  <div id="app">
    <div id="startOverlay" class="show">
      <div class="overlayCard">
        <div class="overlayTitle">🎱 Start Match</div>
        <div class="overlayText">Tap once to enter fullscreen and play in landscape like a proper mobile pool game.</div>
        <button id="startBtn" class="overlayBtn">Play Fullscreen</button>
      </div>
    </div>

    <div id="rotateOverlay">
      <div class="overlayCard">
        <div class="overlayTitle">↔ Rotate Phone</div>
        <div class="overlayText">This table is made for landscape play. Turn your phone sideways.</div>
      </div>
    </div>

    <div class="shell">
      <div class="topbar">
        <button class="iconBtn" id="menuBtn">☰</button>
        <div class="playerCard">
          <div class="avatar">P</div>
          <div>
            <div class="nameRow"><span>Player</span><span class="rank">72★</span></div>
            <div class="pots" id="playerPots"></div>
          </div>
        </div>
        <div class="stakeCard"><div class="stake">5M</div></div>
        <div class="playerCard">
          <div class="avatar ai">A</div>
          <div>
            <div class="nameRow"><span>AI Harry</span><span class="rank">94★</span></div>
            <div class="pots" id="aiPots"></div>
          </div>
        </div>
        <button class="iconBtn alt" id="fullscreenBtn">⛶</button>
      </div>

      <div class="boardWrap">
        <div class="sideCol">
          <div class="powerBar">
            <div class="powerMask" id="powerMask"></div>
            <div class="powerHandle" id="powerHandle"></div>
          </div>
        </div>

        <div class="gameArea">
          <canvas id="gameCanvas" width="1600" height="860"></canvas>
          <div class="floatingHud">
            <button class="hudBtn" id="restartBtn">↺</button>
            <button class="hudBtn" id="assistBtn">🎯</button>
          </div>
          <div class="status" id="statusText">Your turn</div>
          <div class="toast" id="toast">Pocketed</div>
        </div>

        <div class="sideCol">
          <div class="tray">
            <div class="trayBall" style="top:10px;background:#22c55e"></div>
            <div class="trayBall" style="bottom:10px;background:#3b82f6"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

<script>
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const toast = document.getElementById('toast');
const statusText = document.getElementById('statusText');
const powerMask = document.getElementById('powerMask');
const powerHandle = document.getElementById('powerHandle');
const playerPots = document.getElementById('playerPots');
const aiPots = document.getElementById('aiPots');
const rotateOverlay = document.getElementById('rotateOverlay');
const startOverlay = document.getElementById('startOverlay');

const W = canvas.width;
const H = canvas.height;
const table = { x: 100, y: 72, w: W - 200, h: H - 144, rail: 34 };
const pocketR = 30;
const ballR = 15;
const pockets = [
  {x: table.x, y: table.y},
  {x: table.x + table.w/2, y: table.y},
  {x: table.x + table.w, y: table.y},
  {x: table.x, y: table.y + table.h},
  {x: table.x + table.w/2, y: table.y + table.h},
  {x: table.x + table.w, y: table.y + table.h},
];

const BALLS = {
  1:{color:'#facc15',stripe:false}, 2:{color:'#2563eb',stripe:false}, 3:{color:'#ef4444',stripe:false}, 4:{color:'#9333ea',stripe:false},
  5:{color:'#fb923c',stripe:false}, 6:{color:'#22c55e',stripe:false}, 7:{color:'#7f1d1d',stripe:false}, 8:{color:'#111827',stripe:false},
  9:{color:'#facc15',stripe:true}, 10:{color:'#2563eb',stripe:true}, 11:{color:'#ef4444',stripe:true}, 12:{color:'#9333ea',stripe:true},
  13:{color:'#fb923c',stripe:true}, 14:{color:'#22c55e',stripe:true}, 15:{color:'#7f1d1d',stripe:true}
};

let balls = [];
let cueBall = null;
let dragging = false;
let dragCurrent = null;
let aimAssist = true;
let currentTurn = 'player';
let playerGroup = null;
let aiGroup = null;
let gameOver = false;
let turnPocketed = [];
let shotInProgress = false;
let aiScheduled = false;
let shotPower = 0.22;

function showToast(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove('show'), 1000);
}

async function enterFullscreen() {
  const el = document.documentElement;
  try {
    if (!document.fullscreenElement && el.requestFullscreen) await el.requestFullscreen();
  } catch (e) {}
}

function updateOrientation() {
  const isPortrait = window.innerHeight > window.innerWidth;
  rotateOverlay.classList.toggle('show', isPortrait);
}

function renderPotDots(el, count, groupClass) {
  el.innerHTML = Array.from({length: 7}, (_, i) => `<div class="potDot ${i < count ? groupClass : ''}"></div>`).join('');
}

function makeBall(x, y, n) { return {x, y, vx:0, vy:0, r:ballR, n, alive:true, isCue:false}; }
function makeCue(x, y) { return {x, y, vx:0, vy:0, r:ballR, n:0, alive:true, isCue:true}; }

function remaining(group) {
  return balls.filter(b => b.alive && !b.isCue && b.n !== 8 && ((group === 'stripes' && BALLS[b.n].stripe) || (group === 'solids' && !BALLS[b.n].stripe))).length;
}

function resetRack() {
  balls = [];
  cueBall = makeCue(table.x + table.w * 0.25, table.y + table.h * 0.5);
  balls.push(cueBall);
  currentTurn = 'player';
  playerGroup = null;
  aiGroup = null;
  gameOver = false;
  turnPocketed = [];
  shotInProgress = false;
  aiScheduled = false;
  shotPower = 0.22;

  const apexX = table.x + table.w * 0.70;
  const apexY = table.y + table.h * 0.5;
  const rowGap = ballR * 2.12;
  const rack = [1,10,2,11,8,3,12,4,13,5,14,6,15,7,9];
  let idx = 0;

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col <= row; col++) {
      const x = apexX + row * rowGap * 0.88;
      const y = apexY + (col - row/2) * rowGap;
      balls.push(makeBall(x, y, rack[idx++]));
    }
  }
  updateUI();
}

function updateUI() {
  let text = currentTurn === 'player' ? 'Your turn' : 'AI turn';
  if (gameOver) text = 'Game over';
  else if (moving()) text = currentTurn === 'player' ? 'Balls rolling...' : 'AI shooting...';
  else if (playerGroup) text += ` • You: ${playerGroup}`;
  statusText.textContent = text;

  const pGroupClass = playerGroup === 'stripes' ? 'stripe' : 'solid';
  const aGroupClass = aiGroup === 'stripes' ? 'stripe' : 'solid';
  const pPotted = playerGroup ? 7 - remaining(playerGroup) : 0;
  const aPotted = aiGroup ? 7 - remaining(aiGroup) : 0;
  renderPotDots(playerPots, pPotted, pGroupClass);
  renderPotDots(aiPots, aPotted, aGroupClass);

  const emptyTop = Math.max(8, 100 - shotPower * 100);
  powerMask.style.height = `${emptyTop}%`;
  powerHandle.style.top = `calc(${emptyTop}% - 13px)`;
}

function moving() {
  return balls.some(b => b.alive && (Math.abs(b.vx) > 0.03 || Math.abs(b.vy) > 0.03));
}

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTable() {
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#2c0d09';
  roundRect(table.x - table.rail, table.y - table.rail, table.w + table.rail*2, table.h + table.rail*2, 40);
  ctx.fill();

  ctx.fillStyle = '#9ef0fa';
  roundRect(table.x - table.rail + 12, table.y - table.rail + 12, table.w + table.rail*2 - 24, table.h + table.rail*2 - 24, 32);
  ctx.fill();

  ctx.fillStyle = '#7d130d';
  roundRect(table.x - table.rail + 20, table.y - table.rail + 20, table.w + table.rail*2 - 40, table.h + table.rail*2 - 40, 28);
  ctx.fill();

  const feltGrad = ctx.createLinearGradient(table.x, table.y, table.x + table.w, table.y + table.h);
  feltGrad.addColorStop(0, '#68b4bb');
  feltGrad.addColorStop(0.5, '#4b98a2');
  feltGrad.addColorStop(1, '#2e7279');
  ctx.fillStyle = feltGrad;
  roundRect(table.x, table.y, table.w, table.h, 20);
  ctx.fill();

  ctx.save();
  roundRect(table.x, table.y, table.w, table.h, 20);
  ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,.035)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 22; i++) {
    for (let j = 0; j < 12; j++) {
      ctx.beginPath();
      ctx.arc(table.x + i*56 + 12, table.y + j*56 + 12, 14, 0, Math.PI*1.5);
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,.25)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(table.x + table.w * 0.26, table.y + 10);
  ctx.lineTo(table.x + table.w * 0.26, table.y + table.h - 10);
  ctx.stroke();

  for (const p of pockets) {
    ctx.beginPath();
    ctx.fillStyle = '#120c0c';
    ctx.arc(p.x, p.y, pocketR, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawBallShadow(b) {
  ctx.beginPath();
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.ellipse(b.x + 5, b.y + 6, b.r * 0.92, b.r * 0.74, 0, 0, Math.PI*2);
  ctx.fill();
}

function drawBall(b) {
  drawBallShadow(b);
  ctx.save();
  ctx.beginPath();
  ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);

  if (b.isCue) {
    ctx.fillStyle = '#f8fafc';
    ctx.fill();
  } else {
    const meta = BALLS[b.n];
    ctx.fillStyle = meta.color;
    ctx.fill();

    if (meta.stripe) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.clip();
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.x - b.r, b.y - b.r*0.48, b.r*2, b.r*0.96);
      ctx.restore();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI*2);
      ctx.strokeStyle = meta.color;
      ctx.lineWidth = 1.6;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.fillStyle = '#fff';
    ctx.arc(b.x, b.y, b.r*0.44, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 11px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(b.n), b.x, b.y + 0.5);
  }

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,.36)';
  ctx.lineWidth = 1.4;
  ctx.arc(b.x - b.r*.25, b.y - b.r*.25, b.r*.34, 0, Math.PI*2);
  ctx.stroke();
  ctx.restore();
}

function drawCueStick() {
  if (moving() || gameOver) return;
  if (currentTurn !== 'player' && !dragging) return;

  const targetX = dragging ? dragCurrent.x : cueBall.x - 120;
  const targetY = dragging ? dragCurrent.y : cueBall.y;
  const dx = targetX - cueBall.x;
  const dy = targetY - cueBall.y;
  const ang = Math.atan2(dy, dx) + Math.PI;
  const back = 76 + (dragging ? Math.min(95, Math.hypot(dx, dy) * 0.35) : 76);
  const len = 320;
  const x1 = cueBall.x + Math.cos(ang) * back;
  const y1 = cueBall.y + Math.sin(ang) * back;
  const x2 = cueBall.x + Math.cos(ang) * (back + len);
  const y2 = cueBall.y + Math.sin(ang) * (back + len);

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 11;
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  g.addColorStop(0, '#d8b36a');
  g.addColorStop(0.18, '#83e5f4');
  g.addColorStop(0.36, '#d79b46');
  g.addColorStop(0.75, '#6d3d15');
  g.addColorStop(1, '#f8e2ac');
  ctx.strokeStyle = g;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#19d2ff';
  ctx.beginPath();
  ctx.moveTo(x1 + Math.cos(ang) * 22, y1 + Math.sin(ang) * 22);
  ctx.lineTo(x1 + Math.cos(ang) * 44, y1 + Math.sin(ang) * 44);
  ctx.stroke();
  ctx.restore();
}

function drawAimGuides() {
  if (!dragging || moving() || currentTurn !== 'player' || gameOver) return;
  const dx = dragCurrent.x - cueBall.x;
  const dy = dragCurrent.y - cueBall.y;

  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255,255,255,.92)';
  ctx.lineWidth = 4;
  ctx.moveTo(cueBall.x, cueBall.y);
  ctx.lineTo(cueBall.x - dx, cueBall.y - dy);
  ctx.stroke();

  if (aimAssist) {
    ctx.setLineDash([12, 10]);
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,.52)';
    ctx.moveTo(cueBall.x, cueBall.y);
    ctx.lineTo(cueBall.x + dx*1.8, cueBall.y + dy*1.8);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function stepPhysics() {
  const friction = 0.989;

  for (const b of balls) {
    if (!b.alive) continue;
    b.x += b.vx;
    b.y += b.vy;
    b.vx *= friction;
    b.vy *= friction;
    if (Math.abs(b.vx) < 0.03) b.vx = 0;
    if (Math.abs(b.vy) < 0.03) b.vy = 0;

    const left = table.x + b.r;
    const right = table.x + table.w - b.r;
    const top = table.y + b.r;
    const bottom = table.y + table.h - b.r;

    if (b.x < left) { b.x = left; b.vx *= -0.98; }
    if (b.x > right) { b.x = right; b.vx *= -0.98; }
    if (b.y < top) { b.y = top; b.vy *= -0.98; }
    if (b.y > bottom) { b.y = bottom; b.vy *= -0.98; }
  }

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      const a = balls[i], b = balls[j];
      if (!a.alive || !b.alive) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.hypot(dx, dy), minDist = a.r + b.r;
      if (dist > 0 && dist < minDist) {
        const nx = dx / dist, ny = dy / dist, overlap = minDist - dist;
        a.x -= nx * overlap / 2; a.y -= ny * overlap / 2;
        b.x += nx * overlap / 2; b.y += ny * overlap / 2;
        const tx = -ny, ty = nx;
        const dpTanA = a.vx*tx + a.vy*ty;
        const dpTanB = b.vx*tx + b.vy*ty;
        const dpNormA = a.vx*nx + a.vy*ny;
        const dpNormB = b.vx*nx + b.vy*ny;
        a.vx = tx*dpTanA + nx*dpNormB;
        a.vy = ty*dpTanA + ny*dpNormB;
        b.vx = tx*dpTanB + nx*dpNormA;
        b.vy = ty*dpTanB + ny*dpNormA;
      }
    }
  }

  for (const b of balls) {
    if (!b.alive) continue;
    for (const p of pockets) {
      if (Math.hypot(b.x - p.x, b.y - p.y) < pocketR - 1) {
        handlePocket(b);
        break;
      }
    }
  }

  if (shotInProgress && !moving()) endTurn();
  updateUI();
}

function handlePocket(ball) {
  if (ball.isCue) {
    ball.x = table.x + table.w * 0.25;
    ball.y = table.y + table.h * 0.5;
    ball.vx = 0;
    ball.vy = 0;
    turnPocketed.push({type:'scratch'});
    showToast('Scratch');
    return;
  }
  ball.alive = false;
  ball.vx = 0;
  ball.vy = 0;
  turnPocketed.push({type:'ball', n:ball.n, group: ball.n === 8 ? 'eight' : (BALLS[ball.n].stripe ? 'stripes' : 'solids')});
  showToast(`Pocketed ${ball.n}`);
}

function assignGroups(firstGroup) {
  if (!playerGroup && !aiGroup) {
    if (currentTurn === 'player') {
      playerGroup = firstGroup;
      aiGroup = firstGroup === 'solids' ? 'stripes' : 'solids';
    } else {
      aiGroup = firstGroup;
      playerGroup = firstGroup === 'solids' ? 'stripes' : 'solids';
    }
  }
}

function endTurn() {
  shotInProgress = false;
  const scratch = turnPocketed.some(x => x.type === 'scratch');
  const potted = turnPocketed.filter(x => x.type === 'ball');
  const pottedEight = potted.find(x => x.group === 'eight');
  const activeGroup = currentTurn === 'player' ? playerGroup : aiGroup;
  let keepTurn = false;
  const firstColored = potted.find(x => x.group === 'solids' || x.group === 'stripes');
  if (firstColored) assignGroups(firstColored.group);

  if (pottedEight) {
    const canWin = activeGroup && remaining(activeGroup) === 0 && !scratch;
    gameOver = true;
    showToast(canWin ? (currentTurn === 'player' ? 'You win!' : 'AI wins!') : (currentTurn === 'player' ? 'You lose on 8-ball' : 'AI loses on 8-ball'));
    updateUI();
    return;
  }

  if (!scratch) {
    if (activeGroup) keepTurn = potted.some(x => x.group === activeGroup);
    else keepTurn = potted.some(x => x.group === 'solids' || x.group === 'stripes');
  }

  if (!keepTurn) currentTurn = currentTurn === 'player' ? 'ai' : 'player';
  turnPocketed = [];
  updateUI();

  if (currentTurn === 'ai' && !gameOver && !aiScheduled) {
    aiScheduled = true;
    setTimeout(() => {
      aiScheduled = false;
      aiShoot();
    }, 850);
  }
}

function render() {
  drawTable();
  for (const b of balls) if (b.alive) drawBall(b);
  drawAimGuides();
  drawCueStick();
}

function loop() {
  stepPhysics();
  render();
  requestAnimationFrame(loop);
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * (canvas.width / rect.width),
    y: (src.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function canShoot(pos) {
  return !gameOver && currentTurn === 'player' && !moving() && Math.hypot(pos.x - cueBall.x, pos.y - cueBall.y) <= cueBall.r + 22;
}

function startDrag(e) {
  const pos = getPos(e);
  if (!canShoot(pos)) return;
  dragging = true;
  dragCurrent = pos;
}

function moveDrag(e) {
  if (!dragging) return;
  dragCurrent = getPos(e);
  const d = Math.min(1, Math.hypot(dragCurrent.x - cueBall.x, dragCurrent.y - cueBall.y) / 220);
  shotPower = Math.max(0.14, d * 0.42);
  updateUI();
}

function endDrag() {
  if (!dragging) return;
  dragging = false;
  const dx = dragCurrent.x - cueBall.x;
  const dy = dragCurrent.y - cueBall.y;
  const mag = Math.min(Math.hypot(dx, dy), 220);
  if (mag < 8) return;
  cueBall.vx = -dx * shotPower;
  cueBall.vy = -dy * shotPower;
  turnPocketed = [];
  shotInProgress = true;
  updateUI();
}

function aiShoot() {
  if (gameOver || currentTurn !== 'ai' || moving()) return;
  const targets = balls.filter(b => b.alive && !b.isCue && (!aiGroup ? b.n !== 8 : (remaining(aiGroup) === 0 ? b.n === 8 : (b.n !== 8 && ((aiGroup === 'stripes' && BALLS[b.n].stripe) || (aiGroup === 'solids' && !BALLS[b.n].stripe))))));
  let target = targets[0];
  let best = Infinity;
  for (const t of targets) {
    const d = Math.hypot(t.x - cueBall.x, t.y - cueBall.y);
    if (d < best) { best = d; target = t; }
  }
  if (!target) {
    currentTurn = 'player';
    updateUI();
    return;
  }
  const dx = target.x - cueBall.x;
  const dy = target.y - cueBall.y;
  const ang = Math.atan2(dy, dx) + (Math.random() - 0.5) * 0.18;
  const power = Math.min(12, Math.max(7, best / 32));
  cueBall.vx = Math.cos(ang) * power;
  cueBall.vy = Math.sin(ang) * power;
  turnPocketed = [];
  shotInProgress = true;
  showToast('AI shoots');
  updateUI();
}

canvas.addEventListener('mousedown', startDrag);
canvas.addEventListener('mousemove', moveDrag);
window.addEventListener('mouseup', endDrag);
canvas.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e); }, {passive:false});
canvas.addEventListener('touchmove', e => { e.preventDefault(); moveDrag(e); }, {passive:false});
window.addEventListener('touchend', endDrag);
window.addEventListener('resize', updateOrientation);
document.getElementById('restartBtn').addEventListener('click', resetRack);
document.getElementById('assistBtn').addEventListener('click', () => { aimAssist = !aimAssist; showToast(aimAssist ? 'Aim assist on' : 'Aim assist off'); });
document.getElementById('fullscreenBtn').addEventListener('click', enterFullscreen);
document.getElementById('startBtn').addEventListener('click', async () => {
  await enterFullscreen();
  startOverlay.classList.remove('show');
  updateOrientation();
});
document.getElementById('menuBtn').addEventListener('click', () => showToast('Menu coming soon'));

document.addEventListener('fullscreenchange', updateOrientation);
updateOrientation();
resetRack();
loop();
</script>
</body>
</html>
'''

@app.get('/', response_class=HTMLResponse)
def home():
    return HTML

@app.get('/health')
def health():
    return {'status': 'ok', 'game': 'arcade-8-ball-mobile'}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=2712)
