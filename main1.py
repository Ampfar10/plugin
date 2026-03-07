from fastapi import FastAPI
from fastapi.responses import HTMLResponse

app = FastAPI(title="Mobile Landscape Pool")

HTML = r'''
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<title>Mobile Pool</title>
<style>
body{
margin:0;
background:#0f172a;
overflow:hidden;
font-family:Arial;
}

#game{
position:fixed;
top:0;
left:0;
width:100vw;
height:100vh;
display:flex;
justify-content:center;
align-items:center;
}

canvas{
width:100vw;
height:100vh;
touch-action:none;
}

#ui{
position:fixed;
top:10px;
left:0;
right:0;
display:flex;
justify-content:space-between;
padding:10px;
color:white;
font-weight:bold;
}

#power{
position:fixed;
left:10px;
bottom:50px;
width:30px;
height:200px;
background:#333;
border-radius:8px;
overflow:hidden;
}

#powerFill{
position:absolute;
bottom:0;
width:100%;
height:30%;
background:linear-gradient(red,orange,yellow);
}
</style>
</head>
<body>

<div id="ui">
<div>Player</div>
<div>AI</div>
</div>

<div id="game">
<canvas id="c" width="1600" height="800"></canvas>
</div>

<div id="power"><div id="powerFill"></div></div>

<script>

// FORCE LANDSCAPE
if(window.innerHeight>window.innerWidth){
document.body.innerHTML="<div style='color:white;text-align:center;margin-top:40vh;font-size:24px'>Rotate phone to landscape</div>"
}

const canvas=document.getElementById("c")
const ctx=canvas.getContext("2d")

const W=canvas.width
const H=canvas.height

const table={x:100,y:80,w:W-200,h:H-160}

const balls=[]
const r=14

function ball(x,y,color){
return{x,y,vx:0,vy:0,color,alive:true}
}

balls.push(ball(400,400,"white"))

for(let i=0;i<10;i++){
balls.push(ball(900+i*25,380+(i%2)*30,"orange"))
}

let drag=false
let mx=0,my=0

canvas.ontouchstart=e=>{
let t=e.touches[0]
mx=t.clientX
my=t.clientY

drag=true
}

canvas.ontouchmove=e=>{
let t=e.touches[0]
mx=t.clientX
my=t.clientY
}

canvas.ontouchend=e=>{
drag=false
let cue=balls[0]
let dx=mx-cue.x
let dy=my-cue.y
cue.vx=-dx*0.05
cue.vy=-dy*0.05
}

function physics(){
for(let b of balls){
if(!b.alive)continue

b.x+=b.vx
b.y+=b.vy

b.vx*=0.99
b.vy*=0.99

if(b.x<table.x+r||b.x>table.x+table.w-r)b.vx*=-1
if(b.y<table.y+r||b.y>table.y+table.h-r)b.vy*=-1
}
}

function drawTable(){
ctx.fillStyle="#3b2f2f"
ctx.fillRect(table.x-30,table.y-30,table.w+60,table.h+60)

ctx.fillStyle="#2d9c9c"
ctx.fillRect(table.x,table.y,table.w,table.h)
}

function drawBalls(){
for(let b of balls){
if(!b.alive)continue

ctx.beginPath()
ctx.fillStyle=b.color
ctx.arc(b.x,b.y,r,0,Math.PI*2)
ctx.fill()
}
}

function drawCue(){
if(!drag)return

let cue=balls[0]

ctx.strokeStyle="brown"
ctx.lineWidth=8
ctx.beginPath()
ctx.moveTo(cue.x,cue.y)
ctx.lineTo(mx,my)
ctx.stroke()
}

function loop(){
ctx.clearRect(0,0,W,H)

physics()

drawTable()
drawBalls()
drawCue()

requestAnimationFrame(loop)
}

loop()

</script>
</body>
</html>
'''

@app.get('/', response_class=HTMLResponse)
def home():
    return HTML

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=2712)
