// Wellbeing Quest - simple game logic
// Author: Year 9 Health Promotion (example)

const gameArea = document.getElementById('gameArea');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const msgEl = document.getElementById('message');
const wellbeingFill = document.getElementById('wellbeing-fill');

let state = {
  running: false,
  paused: false,
  score: 0,
  time: 60, // seconds
  wellbeing: 70, // 0 - 100
  player: { x: 50, y: 50, el: null },
  items: [], // active items on screen
  tick: null,
  spawnTimer: 0
};

const settings = {
  spawnInterval: 1.2, // seconds
  maxItems: 8,
  speed: 140 // px/s for moving stressors
};

// utilities
function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
function rand(min, max){ return Math.random()*(max-min)+min; }

// create DOM element helper
function makeEntity(icon, cls){
  const d = document.createElement('div');
  d.className = 'entity ' + (cls || '');
  d.textContent = icon;
  gameArea.appendChild(d);
  return d;
}

// init player
function createPlayer(){
  const p = makeEntity('🙂','player');
  state.player.el = p;
  // start near center
  state.player.x = gameArea.clientWidth/2;
  state.player.y = gameArea.clientHeight/2;
  updateEntityPos(p, state.player.x, state.player.y);
}

// place/move DOM element
function updateEntityPos(el, x, y){
  el.style.left = x + 'px';
  el.style.top = y + 'px';
}

// spawn either heart (good) or rock (bad)
function spawnItem(){
  if(state.items.length >= settings.maxItems) return;
  const w = gameArea.clientWidth;
  const h = gameArea.clientHeight;
  const x = rand(30, w-30);
  const y = rand(30, h-30);
  const isGood = Math.random() < 0.6; // more hearts than rocks
  const item = {
    x, y,
    vx: isGood ? 0 : (Math.random()<0.5? -settings.speed : settings.speed),
    vy: isGood ? 0 : rand(-30,30),
    good: isGood,
    el: makeEntity(isGood ? '💚' : '⚫', isGood ? 'chip heart' : 'chip rock'),
  };
  updateEntityPos(item.el, x, y);
  state.items.push(item);
}

// remove item
function removeItem(idx){
  const it = state.items[idx];
  if(it){
    if(it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el);
    state.items.splice(idx,1);
  }
}

// collision test (circle-ish)
function collides(aX,aY,bX,bY,rad){
  const dx = aX-bX, dy = aY-bY;
  return (dx*dx+dy*dy) < (rad*rad);
}

// keyboard movement
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

// update loop
function update(dt){
  if(!state.running || state.paused) return;

  // timer
  state.time = clamp(state.time - dt, 0, 999);
  timeEl.textContent = Math.ceil(state.time);

  // spawn
  state.spawnTimer += dt;
  if(state.spawnTimer >= settings.spawnInterval){
    spawnItem();
    state.spawnTimer = 0;
  }

  // move stressors
  for(let i = state.items.length-1; i>=0; i--){
    const it = state.items[i];
    if(!it.good){
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      // bounce off edges
      if(it.x < 20){ it.x = 20; it.vx *= -1; }
      if(it.x > gameArea.clientWidth-20){ it.x = gameArea.clientWidth-20; it.vx *= -1; }
      if(it.y < 20){ it.y = 20; it.vy *= -1; }
      if(it.y > gameArea.clientHeight-20){ it.y = gameArea.clientHeight-20; it.vy *= -1; }
      updateEntityPos(it.el, it.x, it.y);
    }
  }

  // player movement
  const speed = 220;
  let dx = 0, dy = 0;
  if(keys['arrowup'] || keys['w']) dy -= 1;
  if(keys['arrowdown'] || keys['s']) dy += 1;
  if(keys['arrowleft'] || keys['a']) dx -= 1;
  if(keys['arrowright'] || keys['d']) dx += 1;
  // normalize
  if(dx!==0 || dy!==0){
    const len = Math.hypot(dx,dy); dx /= len; dy /= len;
    state.player.x = clamp(state.player.x + dx*speed*dt, 10, gameArea.clientWidth-10);
    state.player.y = clamp(state.player.y + dy*speed*dt, 10, gameArea.clientHeight-10);
    updateEntityPos(state.player.el, state.player.x, state.player.y);
  }

  // collisions with items
  for(let i = state.items.length-1; i>=0; i--){
    const it = state.items[i];
    if(collides(state.player.x, state.player.y, it.x, it.y, 34)){
      if(it.good){
        state.score += 10;
        state.wellbeing = clamp(state.wellbeing + 12, 0, 100);
        msgEl.textContent = "Nice! You practiced self-care ✨";
      } else {
        state.score = Math.max(0, state.score - 6);
        state.wellbeing = clamp(state.wellbeing - 18, 0, 100);
        msgEl.textContent = "Ouch — that was stressful. Try to avoid stressors!";
      }
      scoreEl.textContent = state.score;
      wellbeingFill.style.width = state.wellbeing + '%';
      removeItem(i);
    }
  }

  // check end conditions
  if(state.wellbeing <= 0){
    endGame(false, "Your wellbeing fell too low. Take a break and try again.");
  } else if(state.time <= 0){
    // win if score high enough
    const winScore = 60;
    const won = state.score >= winScore;
    endGame(won, won ? "Great job — you kept your wellbeing up!" : "Time's up. You can try again to increase your score.");
  }
}

// start/pause/reset controls
function startGame(){
  if(state.running) return;
  // initialize
  state.running = true;
  state.paused = false;
  state.score = 0;
  state.time = 60;
  state.wellbeing = 70;
  state.items.forEach(it => { if(it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el); });
  state.items = [];
  state.spawnTimer = 0;
  scoreEl.textContent = state.score;
  wellbeingFill.style.width = state.wellbeing + '%';
  msgEl.textContent = "Go! Collect hearts and avoid stressors.";
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  resetBtn.disabled = false;
  // player
  if(!state.player.el) createPlayer(); // create element
  state.player.x = gameArea.clientWidth/2;
  state.player.y = gameArea.clientHeight/2;
  updateEntityPos(state.player.el, state.player.x, state.player.y);
  // game loop
  let last = performance.now();
  function frame(now){
    if(!state.running) return;
    const dt = (now - last)/1000;
    last = now;
    update(dt);
    state.tick = requestAnimationFrame(frame);
  }
  state.tick = requestAnimationFrame(frame);
}

function pauseGame(){
  if(!state.running) return;
  state.paused = !state.paused;
  pauseBtn.textContent = state.paused ? 'Resume' : 'Pause';
  msgEl.textContent = state.paused ? 'Paused' : 'Game resumed';
}

function resetGame(){
  if(state.tick) cancelAnimationFrame(state.tick);
  state.running = false;
  state.paused = false;
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  resetBtn.disabled = true;
  pauseBtn.textContent = 'Pause';
  // clear items and player
  if(state.player.el && state.player.el.parentNode) state.player.el.parentNode.removeChild(state.player.el);
  state.player.el = null;
  state.items.forEach(it => { if(it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el); });
  state.items = [];
  state.score = 0;
  state.time = 60;
  state.wellbeing = 70;
  scoreEl.textContent = state.score;
  timeEl.textContent = state.time;
  wellbeingFill.style.width = state.wellbeing + '%';
  msgEl.textContent = 'Press Start to play';
}

// end game
function endGame(won, message){
  state.running = false;
  if(state.tick) cancelAnimationFrame(state.tick);
  msgEl.textContent = message;
  // show simple overlay
  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.left=0; overlay.style.top=0;
  overlay.style.width='100%'; overlay.style.height='100%';
  overlay.style.background='rgba(0,0,0,0.45)';
  overlay.style.display='flex'; overlay.style.alignItems='center'; overlay.style.justifyContent='center';
  overlay.style.color='white'; overlay.style.fontSize='20px';
  overlay.style.zIndex = 9999;
  overlay.innerHTML = `<div style="padding:22px;background:rgba(0,0,0,0.6);border-radius:12px;text-align:center;">
    <div style="font-size:22px;margin-bottom:10px">${won ? 'You win! 🎉' : 'Game Over'}</div>
    <div style="margin-bottom:12px">${message}</div>
    <button id="overlayRetry" style="padding:10px 12px;border-radius:8px;border:0;background:#4caf50;color:white;cursor:pointer">Play Again</button>
  </div>`;
  gameArea.appendChild(overlay);
  document.getElementById('overlayRetry').addEventListener('click', () => {
    overlay.remove();
    resetGame();
    startGame();
  });
}

// hook buttons
startBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', pauseGame);
resetBtn.addEventListener('click', resetGame);

// update time display every second while running
setInterval(() => {
  if(state.running && !state.paused){
    timeEl.textContent = Math.ceil(state.time);
  }
}, 250);

// show initial message
msgEl.textContent = 'Press Start to play';

// focus game area for keyboard
gameArea.addEventListener('click', ()=> gameArea.focus());

// responsive: reposition player/entities if container size changes
window.addEventListener('resize', () => {
  if(state.player.el) {
    state.player.x = clamp(state.player.x, 10, gameArea.clientWidth - 10);
    state.player.y = clamp(state.player.y, 10, gameArea.clientHeight - 10);
    updateEntityPos(state.player.el, state.player.x, state.player.y);
  }
});
