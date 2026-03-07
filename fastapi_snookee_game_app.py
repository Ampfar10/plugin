from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Arcade Pool AI")

HTML = r'''
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Arcade Pool AI</title>
  <style>
    :root {
      --bg1: #0a1632;
      --bg2: #0c1020;
      --panel: #16264f;
      --gold: #f6c54f;
      --teal: #83e6f5;
      --felt: #4a9aa2;
      --felt2: #2d6f76;
      --rail: #7b1d12;
      --rail-dark: #31100b;
      --pocket: #120c0c;
      --white: #f8fafc;
      --ink: #0f172a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, Arial, sans-serif;
      background: radial-gradient(circle at top, #1b3778, #091225 70%);
      color: white;
      overflow: hidden;
    }
    .shell {
      width: 100vw;
      height: 100vh;
      display: grid;
      grid-template-rows: 86px 1fr;
      gap: 6px;
      padding: 6px;
    }
    .topbar {
      background: linear-gradient(180deg, rgba(6,17,45,.96), rgba(12,25,59,.96));
      border-radius: 18px;
      border: 2px solid rgba(255,255,255,.12);
      display: grid;
      grid-template-columns: 64px 1fr 120px 1fr 64px;
      align-items: center;
      padding: 8px 10px;
      gap: 10px;
      box-shadow: 0 10px 24px rgba(0,0,0,.35);
    }
    .menuBtn, .settingsBtn {
      width: 48px;
      height: 48px;
      border-radius: 14px;
      border: 0;
      background: linear-gradient(180deg, #38d933, #179b1d);
      color: white;
      font-size: 28px;
      font-weight: 900;
      display: grid;
      place-items: center;
    }
    .settingsBtn {
      background: radial-gradient(circle at 35% 35%, #ffffff, #d7d9e5 70%);
      color: #e23a3a;
      font-size: 22px;
    }
    .playerBox {
      height: 100%;
      display: grid;
      grid-template-columns: 60px 1fr;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .avatar {
      width: 58px;
      height: 58px;
      border-radius: 14px;
      border: 4px solid #2ae04b;
      background: linear-gradient(135deg, #f5d0a9, #8f5e3f);
      display: grid;
      place-items: center;
      font-size: 24px;
      font-weight: 900;
      color: #15203a;
    }
    .avatar.ai {
      border-color: #4ea0ff;
      background: linear-gradient(135deg, #d2dbe7, #866d54);
    }
    .nameRow {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 18px;
    }
    .stars {
      color: #9bf45b;
      font-size: 16px;
      font-weight: 900;
    }
    .ballSlots {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 6px;
      margin-top: 8px;
    }
    .slot {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 999px;
      background: #0d1224;
      border: 2px solid rgba(255,255,255,.12);
    }
    .pot.solids { background: linear-gradient(180deg, #ffd45a, #f59e0b); }
    .pot.stripes { background: linear-gradient(180deg, #fff, #e5e7eb); border-color: #f59e0b; }
    .centerPot {
      height: 64px;
      border-radius: 18px;
      background: linear-gradient(180deg, #281800, #533300);
      border: 2px solid rgba(255,214,94,.4);
      display: grid;
      place-items: center;
      box-shadow: inset 0 3px 10px rgba(255,208,94,.18);
    }
    .stake {
      font-size: 26px;
      font-weight: 900;
      color: var(--gold);
      text-shadow: 0 2px 0 rgba(0,0,0,.4);
    }
    .board {
      position: relative;
      width: 100%;
      height: 100%;
      display: grid;
      grid-template-columns: 54px 1fr 54px;
      gap: 8px;
      align-items: stretch;
    }
    .powerCol, .ballCol {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .powerMeter {
      width: 38px;
      height: min(72vh, 560px);
      border-radius: 12px;
      background: linear-gradient(180deg, #ffd84d, #fd8d17 55%, #db1e13);
      border: 3px solid rgba(255,255,255,.28);
      box-shadow: inset 0 0 0 3px rgba(0,0,0,.18);
      position: relative;
      overflow: hidden;
    }
    .powerFill {
      position: absolute;
      left: 0;
      bottom: 0;
      width: 100%;
      height: 18%;
      background: rgba(255,255,255,.15);
    }
    .powerKnob {
      position: absolute;
      left: 5px;
      bottom: calc(18% - 12px);
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: white;
      border: 3px solid #222;
    }
    .rightTray {
      width: 38px;
      height: min(72vh, 560px);
      border-radius: 12px;
      background: linear-gradient(180deg, rgba(18,35,78,.95), rgba(8,18,45,.95));
      border: 3px solid rgba(255,255,255,.16);
      position: relative;
      overflow: hidden;
    }
    .miniBall {
      position: absolute;
      left: 7px;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: 2px solid rgba(255,255,255,.5);
    }
    .gameWrap {
      position: relative;
      height: 100%;
      min-height: 0;
    }
    canvas {
      width: 100%;
      height: 100%;
      display: block;
      border-radius: 26px;
      touch-action: none;
      box-shadow: 0 18px 40px rgba(0,0,0,.35);
    }
    .toast {
      position: absolute;
      left: 50%; top: 18px;
      transform: translateX(-50%);
      background: rgba(5,10,23,.88);
      border: 2px solid rgba(255,255,255,.14);
      border-radius: 999px;
      padding: 10px 16px;
      font-weight: 900;
      opacity: 0;
      transition: .2s;
      pointer-events: none;
    }
    .toast.show { opacity: 1; }
    .hud {
      position: absolute;
      right: 18px;
      top: 18px;
      display: grid;
      gap: 8px;
      z-index: 3;
    }
    .hudBtn {
      width: 52px;
      height: 52px;
      border-radius: 14px;
      border: 2px solid rgba(255,255,255,.18);
      background: linear-gradient(180deg, #1c77dd, #0c4ca6);
      display: grid;
      place-items: center;
      font-size: 26px;
      font-weight: 900;
      color: white;
    }
    .bottomNote {
      position: absolute;
      left: 18px;
      bottom: 16px;
      background: rgba(8,17,38,.76);
      border: 2px solid rgba(255,255,255,.12);
      border-radius: 14px;
      padding: 8px 12px;
      font-weight: 700;
      z-index: 3;
    }
    @media (max-width: 900px) {
      .shell { grid-template-rows: 72px 1fr; }
      .topbar { grid-template-columns: 54px 1fr 92px 1fr 54px; }
      .avatar { width: 48px; height: 48px; font-size: 20px; }
      .nameRow { font-size: 14px; }
      .stake { font-size: 20px; }
      .ballSlots { gap: 4px; }
      .powerMeter, .rightTray { height: min(68vh, 440px); }
    }
  </style>
</head>
<body>
  <div class="shell">
    <div class="topbar">
      <button class="menuBtn">☰</button>
      <div class="playerBox">
        <div class="avatar">P</div>
        <div>
          <div class="nameRow"><span>Player</span><span class="stars">72★</span></div>
          <div class="ballSlots" id="playerSlots"></div>
        </div>
      </div>
      <div class="centerPot"><div class="stake">5M</div></div>
      <div class="playerBox">
        <div class="avatar ai">A</div>
        <div>
          <div class="nameRow"><span>AI Harry</span><span class="stars">94★</span></div>
          <div class="ballSlots" id="aiSlots"></div>
        </div>
      </div>
      <button class="settingsBtn">○</button>
    </div>

    <div class="board">
      <div class="powerCol">
        <div class="powerMeter">
          <div class="powerFill" id="powerFill"></div>
          <div class="powerKnob" id="powerKnob"></div>
        </div>
      </div>

      <div class="gameWrap">
        <canvas id="gameCanvas" width="1400" height="760"></canvas>
        <div class="toast" id="toast">Pocketed</div>
        <div class="hud">
          <button class="hudBtn" id="restartBtn">↺</button>
          <button class="hudBtn" id="assistBtn">🎯</button>
        </div>
        <div class="bottomNote" id="statusText">Your turn</div>
      </div>

      <div class="ballCol">
        <div class="rightTray">
          <div class="miniBall" style="top:12px;background:#22c55e"></div>
          <div class="miniBall" style="bottom:12px;background:#3b82f6"></div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const toast = document.getElementById('toast');
    const statusText = document.getElementById('statusText');
    const playerSlots = document.getElementById('playerSlots');
    const aiSlots = document.getElementById('aiSlots');
    const powerFill = document.getElementById('powerFill');
    const powerKnob = document.getElementById('powerKnob');

    const W = canvas.width, H = canvas.height;
    const table = { x: 80, y: 56, w: W - 160, h: H - 112, rail: 30 };
    const pocketR = 28;
    const ballR = 14;
    const pockets = [
      {x: table.x, y: table.y},
      {x: table.x + table.w/2, y: table.y},
      {x: table.x + table.w, y: table.y},
      {x: table.x, y: table.y + table.h},
      {x: table.x + table.w/2, y: table.y + table.h},
      {x: table.x + table.w, y: table.y + table.h},
    ];

    const BALLS = {
      1:{color:'#facc15',stripe:false},2:{color:'#2563eb',stripe:false},3:{color:'#ef4444',stripe:false},4:{color:'#9333ea',stripe:false},5:{color:'#fb923c',stripe:false},6:{color:'#22c55e',stripe:false},7:{color:'#7f1d1d',stripe:false},8:{color:'#111827',stripe:false},
      9:{color:'#facc15',stripe:true},10:{color:'#2563eb',stripe:true},11:{color:'#ef4444',stripe:true},12:{color:'#9333ea',stripe:true},13:{color:'#fb923c',stripe:true},14:{color:'#22c55e',stripe:true},15:{color:'#7f1d1d',stripe:true}
    };

    let balls = [], cueBall = null;
    let dragging = false, dragCurrent = null, dragStart = null;
    let aimAssist = true, currentTurn = 'player', playerGroup = null, aiGroup = null;
    let gameOver = false, turnPocketed = [], shotInProgress = false, aiScheduled = false;
    let shotPower = 0.18;

    function showToast(text) {
      toast.textContent = text;
      toast.classList.add('show');
      clearTimeout(showToast.t);
      showToast.t = setTimeout(() => toast.classList.remove('show'), 1100);
    }

    function renderSlots() {
      const playerCount = 7 - remaining(playerGroup || 'solids', true);
      const aiCount = 7 - remaining(aiGroup || 'stripes', true);
      playerSlots.innerHTML = Array.from({length:7}, (_,i)=>`<div class="slot ${i<playerCount ? (playerGroup||'solids') : ''}"></div>`).join('');
      aiSlots.innerHTML = Array.from({length:7}, (_,i)=>`<div class="slot ${i<aiCount ? (aiGroup||'stripes') : ''}"></div>`).join('');
    }

    function makeBall(x,y,n){ return {x,y,vx:0,vy:0,r:ballR,n,alive:true,isCue:false}; }
    function makeCue(x,y){ return {x,y,vx:0,vy:0,r:ballR,n:0,alive:true,isCue:true}; }

    function resetRack() {
      balls = [];
      cueBall = makeCue(table.x + table.w*0.25, table.y + table.h*0.5);
      balls.push(cueBall);
      currentTurn = 'player';
      playerGroup = null; aiGroup = null; gameOver = false; turnPocketed = []; shotInProgress = false; aiScheduled = false;
      const apexX = table.x + table.w*0.72;
      const apexY = table.y + table.h*0.5;
      const rowGap = ballR * 2.15;
      const nums = [1,10,2,11,8,3,12,4,13,5,14,6,15,7,9];
      let idx = 0;
      for (let row=0; row<5; row++) {
        for (let col=0; col<=row; col++) {
          const x = apexX + row * rowGap * 0.88;
          const y = apexY + (col - row/2) * rowGap;
          balls.push(makeBall(x,y,nums[idx++]));
        }
      }
      updateUI();
    }

    function updateUI() {
      let t = currentTurn === 'player' ? 'Your turn' : 'AI is shooting';
      if (gameOver) t = 'Game over';
      else if (moving()) t = currentTurn === 'player' ? 'Balls rolling...' : 'AI turn';
      else if (playerGroup) t += ` • You: ${playerGroup}`;
      statusText.textContent = t;
      powerFill.style.height = `${Math.max(10, shotPower * 100)}%`;
      powerKnob.style.bottom = `calc(${Math.max(10, shotPower * 100)}% - 12px)`;
      renderSlots();
    }

    function moving(){ return balls.some(b=>b.alive && (Math.abs(b.vx)>0.03 || Math.abs(b.vy)>0.03)); }

    function roundRect(x,y,w,h,r,fill=true){
      ctx.beginPath(); ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); if(fill) ctx.fill();
    }

    function drawTable() {
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle = '#2f100c';
      roundRect(table.x-table.rail, table.y-table.rail, table.w+table.rail*2, table.h+table.rail*2, 34);
      ctx.fillStyle = '#9cecf4';
      roundRect(table.x-table.rail+10, table.y-table.rail+10, table.w+table.rail*2-20, table.h+table.rail*2-20, 28);
      ctx.fillStyle = '#7a1209';
      roundRect(table.x-table.rail+18, table.y-table.rail+18, table.w+table.rail*2-36, table.h+table.rail*2-36, 24);
      ctx.fillStyle = '#5eaab0';
      roundRect(table.x, table.y, table.w, table.h, 18);

      const pat = 44;
      ctx.save();
      ctx.beginPath(); roundRect(table.x, table.y, table.w, table.h, 18, false); ctx.clip();
      for(let i=0;i<18;i++){
        for(let j=0;j<10;j++){
          ctx.strokeStyle = 'rgba(255,255,255,.035)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(table.x + i*pat + 10, table.y + j*pat + 10, 12, 0, Math.PI*1.5);
          ctx.stroke();
        }
      }
      ctx.restore();

      ctx.strokeStyle = 'rgba(255,255,255,.28)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(table.x + table.w*0.26, table.y+8);
      ctx.lineTo(table.x + table.w*0.26, table.y + table.h-8);
      ctx.stroke();

      for (const p of pockets) {
        ctx.beginPath();
        ctx.fillStyle = '#120c0c';
        ctx.arc(p.x, p.y, pocketR, 0, Math.PI*2);
        ctx.fill();
      }
    }

    function drawBall(b) {
      ctx.save();
      ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
      if (b.isCue) {
        ctx.fillStyle = '#f8fafc'; ctx.fill();
      } else {
        const meta = BALLS[b.n];
        ctx.fillStyle = meta.color; ctx.fill();
        if (meta.stripe) {
          ctx.save();
          ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.clip();
          ctx.fillStyle = '#fff'; ctx.fillRect(b.x-b.r, b.y-b.r*0.45, b.r*2, b.r*0.9);
          ctx.restore();
          ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.strokeStyle = meta.color; ctx.lineWidth = 1.5; ctx.stroke();
        }
        ctx.beginPath(); ctx.fillStyle = '#fff'; ctx.arc(b.x,b.y,b.r*0.42,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = '#111827'; ctx.font = 'bold 11px Arial'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(String(b.n), b.x, b.y+0.5);
      }
      ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=1.4; ctx.arc(b.x-b.r*.22,b.y-b.r*.22,b.r*.34,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }

    function drawCueStick() {
      if (moving() || gameOver) return;
      if (currentTurn !== 'player' && !dragging) return;
      const dx = (dragging ? dragCurrent.x : cueBall.x - 120) - cueBall.x;
      const dy = (dragging ? dragCurrent.y : cueBall.y) - cueBall.y;
      const ang = Math.atan2(dy, dx) + Math.PI;
      const back = 72 + (dragging ? Math.min(90, Math.hypot(dx,dy)*0.35) : 74);
      const len = 250;
      const x1 = cueBall.x + Math.cos(ang) * back;
      const y1 = cueBall.y + Math.sin(ang) * back;
      const x2 = cueBall.x + Math.cos(ang) * (back + len);
      const y2 = cueBall.y + Math.sin(ang) * (back + len);

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = 10;
      const grad = ctx.createLinearGradient(x1,y1,x2,y2);
      grad.addColorStop(0,'#d7b26f');
      grad.addColorStop(0.22,'#8fd1ef');
      grad.addColorStop(0.4,'#d39d47');
      grad.addColorStop(0.7,'#84511d');
      grad.addColorStop(1,'#f6e3b4');
      ctx.strokeStyle = grad;
      ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#19d2ff';
      ctx.beginPath(); ctx.moveTo(x1+18*Math.cos(ang), y1+18*Math.sin(ang)); ctx.lineTo(x1+36*Math.cos(ang), y1+36*Math.sin(ang)); ctx.stroke();
      ctx.restore();
    }

    function drawAimGuides() {
      if (!dragging || moving() || currentTurn !== 'player' || gameOver) return;
      const dx = dragCurrent.x - cueBall.x;
      const dy = dragCurrent.y - cueBall.y;
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 4;
      ctx.moveTo(cueBall.x, cueBall.y);
      ctx.lineTo(cueBall.x - dx, cueBall.y - dy);
      ctx.stroke();
      if (aimAssist) {
        ctx.setLineDash([12,10]);
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.moveTo(cueBall.x, cueBall.y);
        ctx.lineTo(cueBall.x + dx*1.7, cueBall.y + dy*1.7);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    function stepPhysics() {
      const friction = 0.989;
      for (const b of balls) {
        if (!b.alive) continue;
        b.x += b.vx; b.y += b.vy; b.vx *= friction; b.vy *= friction;
        if (Math.abs(b.vx) < 0.03) b.vx = 0;
        if (Math.abs(b.vy) < 0.03) b.vy = 0;
        const left = table.x + b.r, right = table.x + table.w - b.r, top = table.y + b.r, bottom = table.y + table.h - b.r;
        if (b.x < left) { b.x = left; b.vx *= -0.98; }
        if (b.x > right) { b.x = right; b.vx *= -0.98; }
        if (b.y < top) { b.y = top; b.vy *= -0.98; }
        if (b.y > bottom) { b.y = bottom; b.vy *= -0.98; }
      }
      for (let i=0;i<balls.length;i++) for (let j=i+1;j<balls.length;j++) {
        const a=balls[i], b=balls[j]; if (!a.alive||!b.alive) continue;
        const dx=b.x-a.x, dy=b.y-a.y, dist=Math.hypot(dx,dy), minDist=a.r+b.r;
        if (dist>0 && dist<minDist) {
          const nx=dx/dist, ny=dy/dist, overlap=minDist-dist;
          a.x -= nx*overlap/2; a.y -= ny*overlap/2; b.x += nx*overlap/2; b.y += ny*overlap/2;
          const tx=-ny, ty=nx;
          const dpTanA=a.vx*tx+a.vy*ty, dpTanB=b.vx*tx+b.vy*ty, dpNormA=a.vx*nx+a.vy*ny, dpNormB=b.vx*nx+b.vy*ny;
          a.vx = tx*dpTanA + nx*dpNormB; a.vy = ty*dpTanA + ny*dpNormB;
          b.vx = tx*dpTanB + nx*dpNormA; b.vy = ty*dpTanB + ny*dpNormA;
        }
      }
      for (const b of balls) {
        if (!b.alive) continue;
        for (const p of pockets) {
          if (Math.hypot(b.x-p.x,b.y-p.y) < pocketR-1) { handlePocket(b); break; }
        }
      }
      if (shotInProgress && !moving()) endTurn();
      updateUI();
    }

    function handlePocket(ball) {
      if (ball.isCue) {
        ball.x = table.x + table.w*0.25; ball.y = table.y + table.h*0.5; ball.vx = 0; ball.vy = 0;
        turnPocketed.push({type:'scratch'}); showToast('Scratch'); return;
      }
      ball.alive = false; ball.vx = 0; ball.vy = 0;
      turnPocketed.push({type:'ball', n:ball.n, group: ball.n===8 ? 'eight' : (BALLS[ball.n].stripe ? 'stripes' : 'solids')});
      showToast(`Pocketed ${ball.n}`);
    }

    function remaining(group, openMode=false) {
      if (!group && openMode) return balls.filter(b=>b.alive && !b.isCue && b.n!==8 && !BALLS[b.n].stripe).length;
      return balls.filter(b=>b.alive && !b.isCue && b.n!==8 && ((group==='stripes'&&BALLS[b.n].stripe)||(group==='solids'&&!BALLS[b.n].stripe))).length;
    }

    function assignGroups(firstGroup) {
      if (!playerGroup && !aiGroup) {
        if (currentTurn==='player') { playerGroup=firstGroup; aiGroup=firstGroup==='solids' ? 'stripes' : 'solids'; }
        else { aiGroup=firstGroup; playerGroup=firstGroup==='solids' ? 'stripes' : 'solids'; }
      }
    }

    function endTurn() {
      shotInProgress = false;
      const scratch = turnPocketed.some(x=>x.type==='scratch');
      const potted = turnPocketed.filter(x=>x.type==='ball');
      const pottedEight = potted.find(x=>x.group==='eight');
      const activeGroup = currentTurn==='player' ? playerGroup : aiGroup;
      let keepTurn = false;
      const firstColored = potted.find(x=>x.group==='solids' || x.group==='stripes');
      if (firstColored) assignGroups(firstColored.group);
      if (pottedEight) {
        const canWin = activeGroup && remaining(activeGroup)===0 && !scratch;
        gameOver = true;
        showToast(canWin ? (currentTurn==='player' ? 'You win!' : 'AI wins!') : (currentTurn==='player' ? 'You lose on 8-ball' : 'AI loses on 8-ball'));
        updateUI(); return;
      }
      if (!scratch) {
        if (activeGroup) keepTurn = potted.some(x=>x.group===activeGroup);
        else keepTurn = potted.some(x=>x.group==='solids' || x.group==='stripes');
      }
      if (!keepTurn) currentTurn = currentTurn==='player' ? 'ai' : 'player';
      turnPocketed = [];
      updateUI();
      if (currentTurn==='ai' && !gameOver && !aiScheduled) {
        aiScheduled = true;
        setTimeout(()=>{ aiScheduled = false; aiShoot(); }, 850);
      }
    }

    function render() {
      drawTable();
      for (const b of balls) if (b.alive) drawBall(b);
      drawAimGuides();
      drawCueStick();
    }

    function loop() { stepPhysics(); render(); requestAnimationFrame(loop); }

    function getPos(e) {
      const rect = canvas.getBoundingClientRect();
      const src = e.touches ? e.touches[0] : e;
      const scaleX = canvas.width / rect.width, scaleY = canvas.height / rect.height;
      return {x:(src.clientX-rect.left)*scaleX, y:(src.clientY-rect.top)*scaleY};
    }

    function canShoot(pos) {
      return !gameOver && currentTurn==='player' && !moving() && Math.hypot(pos.x-cueBall.x,pos.y-cueBall.y) <= cueBall.r + 20;
    }
    function startDrag(e) { const pos=getPos(e); if(!canShoot(pos)) return; dragging=true; dragStart=pos; dragCurrent=pos; }
    function moveDrag(e) { if(!dragging) return; dragCurrent=getPos(e); const d=Math.min(1, Math.hypot(dragCurrent.x-cueBall.x, dragCurrent.y-cueBall.y)/180); shotPower = Math.max(.12, d*.34); updateUI(); }
    function endDrag() {
      if(!dragging) return; dragging=false;
      const dx=dragCurrent.x-cueBall.x, dy=dragCurrent.y-cueBall.y, mag=Math.min(Math.hypot(dx,dy),220);
      if(mag<8) return;
      cueBall.vx = -dx * shotPower; cueBall.vy = -dy * shotPower;
      turnPocketed=[]; shotInProgress=true; updateUI();
    }

    function aiShoot() {
      if (gameOver || currentTurn!=='ai' || moving()) return;
      const targets = balls.filter(b => b.alive && !b.isCue && (!aiGroup ? b.n!==8 : (remaining(aiGroup)===0 ? b.n===8 : (b.n!==8 && ((aiGroup==='stripes'&&BALLS[b.n].stripe)||(aiGroup==='solids'&&!BALLS[b.n].stripe))))));
      let target = targets[0], best = Infinity;
      for (const t of targets) { const d=Math.hypot(t.x-cueBall.x,t.y-cueBall.y); if(d<best){best=d; target=t;} }
      if (!target) { currentTurn='player'; updateUI(); return; }
      const dx=target.x-cueBall.x, dy=target.y-cueBall.y, ang=Math.atan2(dy,dx) + (Math.random()-.5)*0.16;
      const power=Math.min(12, Math.max(6.8, best/32));
      cueBall.vx = Math.cos(ang)*power; cueBall.vy = Math.sin(ang)*power;
      turnPocketed=[]; shotInProgress=true; showToast('AI shoots'); updateUI();
    }

    canvas.addEventListener('mousedown', startDrag);
    canvas.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); startDrag(e); }, {passive:false});
    canvas.addEventListener('touchmove', e => { e.preventDefault(); moveDrag(e); }, {passive:false});
    window.addEventListener('touchend', endDrag);
    document.getElementById('restartBtn').addEventListener('click', resetRack);
    document.getElementById('assistBtn').addEventListener('click', ()=>{ aimAssist=!aimAssist; showToast(aimAssist ? 'Aim assist on' : 'Aim assist off'); });

    resetRack();
    loop();
  </script>
</body>
</html>
'''

@app.get('/', response_class=HTMLResponse)
def home() -> str:
    return HTML

@app.get('/health')
def health() -> dict:
    return {'status': 'ok', 'game': 'arcade-pool-ai'}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=2712)
