// main.js — The Meridian Job: the game loop, the state machine and the
// alarm. Title → play → (caught | timeout | cold feet | win). The alarm
// decays while the thief is unseen and jumps when guards, cameras or
// lasers spot him; at LOCKDOWN the vault seals and the guards speed up.
// The Diamond starts a 90-second getaway clock; the van is the only way out.
import { CFG } from './config.js';
import { mulberry32 } from './random.js';
import { buildLevel, moveBlockers } from './level.js';
import { Guard } from './guards.js';
import { Camera } from './cameras.js';
import { checkLasers } from './lasers.js';
import { Player } from './player.js';
import { AudioEngine } from './audio.js';
import { buildStatic, draw } from './render.js';
import { createInput } from './input.js';
import { applyShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '7');
const shot = params.get('shot');
const rng = mulberry32(seed);

const canvas = document.getElementById('game');
canvas.width = CFG.W;
canvas.height = CFG.H;
const ctx = canvas.getContext('2d');

const level = buildLevel(seed);
const game = {
  ctx,
  level,
  time: 0,
  state: 'title', // title | play | paused | caught | timeout | coldfeet | win
  alarm: 0,
  peakAlarm: 0,
  lockdownSeal: 0,
  laserCooldown: 0,
  camerasDisabled: 0,
  getaway: 0, // seconds left once the Diamond is lifted, 0 = not started
  spotted: false, // any guard reached full suspicion this run
  caughtBy: null,
  flash: 0,
  cameraSeen: false,
  events: [],
  floaters: [],
  coins: [],
  moveBlockers: moveBlockers(level),
  player: new Player(level.playerStart),
  guards: level.guards.map((def) => new Guard(def)),
  cameras: level.cameras.map((def) => new Camera(def)),
  audio: new AudioEngine(),
  staticCanvas: buildStatic(level),

  objective() {
    const p = this.player;
    if (this.state === 'title') return 'Press ENTER to begin the heist.';
    if (this.level.vaultDoor.locked) {
      const hasDiamond = p.loot.some((i) => i.kind === 'diamond');
      if (hasDiamond) return 'Get to the van — the clock is running.';
      return 'Reach the vault: cross the lasers, pick the lock, lift the Diamond.';
    }
    if (this.getaway > 0) return 'Diamond secured — get to the getaway van!';
    return 'The vault is open. Lift the Meridian Diamond.';
  },

  rating() {
    // GHOST: never spotted and the alarm never passed WARY.
    // SHADOW: spotted at most in passing, alarm stayed under ALERT.
    // LOUD: the whole bank knows.
    if (!this.spotted && this.peakAlarm < CFG.stageWary) return 'GHOST';
    if (this.peakAlarm < CFG.stageAlert) return 'SHADOW';
    return 'LOUD';
  },

  setState(next) {
    if (this.state === 'win' || this.state === 'caught') return;
    if (next === 'caught') {
      this.state = 'caught';
      this.audio.caught();
    } else {
      this.state = next;
    }
  },

  finish(kind) {
    if (this.state !== 'play') return;
    if (kind === 'win') {
      this.state = 'win';
      this.audio.win();
    } else if (kind === 'coldfeet') {
      this.state = 'coldfeet';
      this.audio.deny();
    }
  },

  reset() {
    const fresh = buildLevel(seed);
    this.level = fresh;
    this.moveBlockers = moveBlockers(fresh);
    this.player = new Player(fresh.playerStart);
    this.guards = fresh.guards.map((def) => new Guard(def));
    this.cameras = fresh.cameras.map((def) => new Camera(def));
    this.staticCanvas = buildStatic(fresh);
    this.alarm = 0;
    this.peakAlarm = 0;
    this.lockdownSeal = 0;
    this.laserCooldown = 0;
    this.camerasDisabled = 0;
    this.getaway = 0;
    this.spotted = false;
    this.caughtBy = null;
    this.flash = 0;
    this.events = [];
    this.floaters = [];
    this.coins = [];
    this.state = 'title';
    this.time = 0;
  },
};

const input = createInput(canvas);

function addFloater(text, x, y, color) {
  game.floaters.push({ text, x, y, color, ttl: 1.4 });
}

function drainEvents() {
  for (const ev of game.events) {
    if (ev.type === 'spotted') {
      game.spotted = true;
      game.audio.spotted();
      addFloater('SPOTTED!', ev.x, ev.y - 40, '#ff4040');
    } else if (ev.type === 'laser') {
      game.audio.laser();
      addFloater('LASER TRIPPED!', ev.x, ev.y - 20, '#ff4040');
    } else if (ev.type === 'loot') {
      const v = CFG.lootValues[ev.kind];
      addFloater(`+$${v.toLocaleString('en-US')}`, ev.x, ev.y - 18, '#ffd65a');
    } else if (ev.type === 'diamond') {
      addFloater('THE DIAMOND IS YOURS — RUN!', ev.x, ev.y - 30, '#7fe7ff');
      game.audio.alarm();
    } else if (ev.type === 'unlock') {
      addFloater('VAULT OPEN', ev.x, ev.y - 20, '#39d98a');
    } else if (ev.type === 'console') {
      addFloater('CAMERAS OFF', ev.x, ev.y - 20, '#39d98a');
    }
  }
  game.events.length = 0;
}

function update(dt) {
  game.time += dt;
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt);
  for (const f of game.floaters) f.ttl -= dt;
  game.floaters = game.floaters.filter((f) => f.ttl > 0);
  for (const c of game.coins) c.t += dt;
  game.coins = game.coins.filter((c) => c.t < 6);

  if (game.state !== 'play') return;

  // --- alarm: decays while unseen, stages drive lockdown ---
  const anySeen = game.guards.some((g) => g.suspicion > 0.05) || game.cameraSeen;
  if (!anySeen) game.alarm = Math.max(0, game.alarm - CFG.alarmDecay * dt);
  game.cameraSeen = false;
  game.peakAlarm = Math.max(game.peakAlarm, game.alarm);
  const wasLockdown = game.alarm >= CFG.stageLockdown;
  if (wasLockdown && game.lockdownSeal <= 0 && game._lockdownAnnounced !== true) {
    game._lockdownAnnounced = true;
    game.lockdownSeal = CFG.lockdownSealSeconds;
    for (const g of game.guards) g.speedMul = 1.35;
    addFloater('LOCKDOWN — VAULT SEALED', CFG.W / 2, 120, '#ff4040');
    game.audio.alarm();
  }
  if (!wasLockdown) game._lockdownAnnounced = false;
  if (game.lockdownSeal > 0) {
    game.lockdownSeal -= dt;
    if (game.lockdownSeal <= 0) {
      for (const g of game.guards) g.speedMul = 1;
    }
  }
  if (game.laserCooldown > 0) game.laserCooldown -= dt;
  if (game.camerasDisabled > 0) game.camerasDisabled -= dt;

  // --- getaway clock ---
  if (game.getaway > 0) {
    game.getaway -= dt;
    if (game.getaway <= 0) {
      game.getaway = 0;
      game.state = 'timeout';
      game.audio.caught();
      return;
    }
  }

  // --- the world ---
  const { prevX, prevY } = game.player.update(dt, game, input);
  checkLasers(game, prevX, prevY);
  for (const g of game.guards) g.update(dt, game);
  for (const cam of game.cameras) cam.update(dt, game);
  drainEvents();
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - (frame._last || now)) / 1000 || 0.016);
  frame._last = now;

  // Global keys, available on every screen.
  if (input.wasPressed('KeyM')) {
    game.audio.ensure();
    game.audio.setMuted(!game.audio.muted);
  }
  if (input.wasPressed('KeyP') && (game.state === 'play' || game.state === 'paused')) {
    game.state = game.state === 'play' ? 'paused' : 'play';
  }
  if (input.wasPressed('KeyR') && game.state !== 'title') {
    game.reset();
    if (shot) applyShot(game, shot);
  }
  if (game.state === 'title' && (input.wasPressed('Enter') || input.clickQueue.length > 0)) {
    game.audio.ensure();
    game.state = 'play';
  }

  update(dt);
  draw(game);
  input.endFrame();
}

// A staged screenshot scene starts posed and stays still: no input, no
// ticking clock beyond the frozen pose.
if (shot) {
  applyShot(game, shot);
  // Render a few frames so the canvas settles, then hold the pose.
  draw(game);
  draw(game);
} else {
  requestAnimationFrame(frame);
}

// Expose a tiny handle for headless play-tests.
window.__game = game;
window.__input = input;
