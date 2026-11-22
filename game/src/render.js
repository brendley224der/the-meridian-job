// render.js — draws the bank. The static shell (floors, walls, furniture)
// is painted once to an offscreen canvas; every frame adds the live layer:
// vision cones, lasers, loot, guards, the thief, particles and the HUD.
// The HUD carries the alarm meter, the loot, the coins and the getaway
// clock, so one frame shows the whole heist at a glance.
import { CFG } from './config.js';
import { conePolygon } from './guards.js';
import { laserState } from './lasers.js';
import { sightBlockers } from './level.js';

const C = CFG.colors;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function buildStatic(level) {
  const cv = document.createElement('canvas');
  cv.width = CFG.W;
  cv.height = CFG.H;
  const ctx = cv.getContext('2d');

  // --- floor: checkerboard marble tiles ---
  const t = CFG.TILE;
  for (let y = 0; y < CFG.H; y += t) {
    for (let x = 0; x < CFG.W; x += t) {
      ctx.fillStyle = ((x / t + y / t) % 2 === 0) ? C.floorA : C.floorB;
      ctx.fillRect(x, y, t, t);
    }
  }
  // Vault wing floor: darker steel tiles.
  ctx.fillStyle = '#1b1e26';
  ctx.fillRect(964, 26, 290, 234);
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  for (let x = 964; x < 1254; x += 29) {
    ctx.beginPath(); ctx.moveTo(x, 26); ctx.lineTo(x, 260); ctx.stroke();
  }
  for (let y = 26; y < 260; y += 29) {
    ctx.beginPath(); ctx.moveTo(964, y); ctx.lineTo(1254, y); ctx.stroke();
  }
  // Security office floor: green felt carpet.
  ctx.fillStyle = '#24382a';
  ctx.fillRect(26, 26, 304, 234);

  // --- red carpet from the entrance to the corridor doors ---
  const cp = level.carpet;
  ctx.fillStyle = C.carpet;
  ctx.fillRect(cp.x, cp.y, cp.w, cp.h);
  ctx.fillStyle = C.carpetEdge;
  ctx.fillRect(cp.x, cp.y, 4, cp.h);
  ctx.fillRect(cp.x + cp.w - 4, cp.y, 4, cp.h);
  // Gold diamond pattern down the carpet.
  ctx.fillStyle = C.brassDim;
  for (let y = cp.y + 30; y < cp.y + cp.h; y += 60) {
    ctx.beginPath();
    ctx.moveTo(cp.x + cp.w / 2, y - 10);
    ctx.lineTo(cp.x + cp.w / 2 + 10, y);
    ctx.lineTo(cp.x + cp.w / 2, y + 10);
    ctx.lineTo(cp.x + cp.w / 2 - 10, y);
    ctx.closePath();
    ctx.fill();
  }

  // --- street outside the exit door ---
  ctx.fillStyle = '#14161c';
  ctx.fillRect(560, CFG.H - 26, 160, 26);
  ctx.fillStyle = '#2a2d36';
  ctx.fillRect(600, CFG.H - 14, 80, 4);

  // --- furniture (cover) ---
  for (const b of level.cover) {
    if (b.kind === 'counter') {
      ctx.fillStyle = C.marble;
      roundRect(ctx, b.x, b.y, b.w, b.h, 4);
      ctx.fill();
      ctx.fillStyle = C.brass;
      ctx.fillRect(b.x, b.y, b.w, 4);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w - 12, 4);
    } else if (b.kind === 'desk') {
      ctx.fillStyle = C.wood;
      roundRect(ctx, b.x, b.y, b.w, b.h, 5);
      ctx.fill();
      ctx.fillStyle = C.woodDark;
      ctx.fillRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
      // Brass banker's lamp on every desk.
      ctx.fillStyle = C.brass;
      ctx.beginPath();
      ctx.arc(b.x + b.w - 18, b.y + 16, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 130, 0.5)';
      ctx.beginPath();
      ctx.arc(b.x + b.w - 18, b.y + 16, 13, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'pillar') {
      ctx.fillStyle = C.marble;
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.brass;
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 - 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.marble;
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 - 10, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.kind === 'safe') {
      ctx.fillStyle = '#3a3f4c';
      roundRect(ctx, b.x, b.y, b.w, b.h, 3);
      ctx.fill();
      ctx.fillStyle = C.brass;
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- walls (drawn last so they cap the furniture edges) ---
  for (const w of level.walls) {
    ctx.fillStyle = C.wall;
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = C.wallTop;
    if (w.h <= 26) ctx.fillRect(w.x, w.y, w.w, 4);
    else ctx.fillRect(w.x, w.y, 4, w.h);
  }

  // --- vault door frame ---
  const d = level.vaultDoor;
  ctx.fillStyle = '#20242e';
  ctx.fillRect(d.x - 4, d.y - 6, d.w + 8, d.h + 12);
  return cv;
}

function drawCone(ctx, pts, fill, edge) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGuard(ctx, g, blockers) {
  // Vision cone, clipped by the walls.
  const pts = conePolygon(g.x, g.y, g.angle, CFG.guardHalfAngle,
    CFG.guardSight, blockers);
  drawCone(ctx, pts, C.cone, C.coneEdge);
  // Body: navy uniform, brass visor, direction tick.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(g.x + 3, g.y + 4, 14, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.guard;
  ctx.beginPath();
  ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.brass;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(g.x, g.y, 13, 0, Math.PI * 2);
  ctx.stroke();
  const fx = g.x + Math.cos(g.angle) * 13;
  const fy = g.y + Math.sin(g.angle) * 13;
  ctx.strokeStyle = C.guardVisor;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(g.x, g.y);
  ctx.lineTo(fx, fy);
  ctx.stroke();
  // Suspicion: a ring that fills, then a "!" when the chase starts.
  if (g.suspicion > 0.05) {
    ctx.strokeStyle = g.state === 'chase' ? '#ff4040' : '#ffd65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(g.x, g.y - 24, 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * g.suspicion);
    ctx.stroke();
  }
  if (g.state === 'chase') {
    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 30);
  } else if (g.state === 'investigate') {
    ctx.fillStyle = '#ffd65a';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', g.x, g.y - 30);
  }
  // Name tag.
  ctx.fillStyle = 'rgba(232,228,216,0.75)';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(g.name, g.x, g.y + 26);
}

function drawPlayer(ctx, p, time) {
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(p.x + 3, p.y + 4, 13, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.playerCoat;
  ctx.beginPath();
  ctx.arc(p.x, p.y, CFG.playerRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = p.sneaking ? '#7fe7ff' : C.player;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(p.x, p.y, CFG.playerRadius, 0, Math.PI * 2);
  ctx.stroke();
  // Hooded head and facing tick.
  ctx.fillStyle = C.player;
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = C.playerCoat;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16);
  ctx.stroke();
  if (p.weight > 0) {
    // A bulging loot sack on the thief's back.
    ctx.fillStyle = C.brass;
    ctx.beginPath();
    ctx.arc(p.x - Math.cos(p.angle) * 12, p.y - Math.sin(p.angle) * 12, 5 + p.weight, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLoot(ctx, item, time) {
  const bob = Math.sin(time * 3 + item.x) * 2;
  if (item.kind === 'cash') {
    ctx.fillStyle = '#3f9e4d';
    roundRect(ctx, item.x - 11, item.y - 7 + bob, 22, 14, 2);
    ctx.fill();
    ctx.fillStyle = '#d8f0dc';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', item.x, item.y + 3 + bob);
  } else if (item.kind === 'gold') {
    ctx.fillStyle = C.brass;
    ctx.beginPath();
    ctx.moveTo(item.x - 11, item.y + 5 + bob);
    ctx.lineTo(item.x - 7, item.y - 6 + bob);
    ctx.lineTo(item.x + 7, item.y - 6 + bob);
    ctx.lineTo(item.x + 11, item.y + 5 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillRect(item.x - 5, item.y - 4 + bob, 10, 2);
  } else {
    // The Meridian Diamond: a pulsing cyan gem on its pedestal.
    const pulse = 0.6 + 0.4 * Math.sin(time * 4);
    ctx.fillStyle = `rgba(127, 231, 255, ${0.25 + 0.3 * pulse})`;
    ctx.beginPath();
    ctx.arc(item.x, item.y + bob, 26 + 6 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5a4a2a';
    ctx.fillRect(item.x - 12, item.y + 8 + bob, 24, 6);
    ctx.fillStyle = C.diamond;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - 14 + bob);
    ctx.lineTo(item.x + 10, item.y - 2 + bob);
    ctx.lineTo(item.x, item.y + 8 + bob);
    ctx.lineTo(item.x - 10, item.y - 2 + bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(item.x, item.y - 14 + bob);
    ctx.lineTo(item.x + 5, item.y - 2 + bob);
    ctx.lineTo(item.x, item.y + 2 + bob);
    ctx.lineTo(item.x - 5, item.y - 2 + bob);
    ctx.closePath();
    ctx.fill();
  }
}

function alarmStage(alarm) {
  if (alarm >= CFG.stageLockdown) return { name: 'LOCKDOWN', color: C.alarmLockdown };
  if (alarm >= CFG.stageAlert) return { name: 'ALERT', color: C.alarmAlert };
  if (alarm >= CFG.stageWary) return { name: 'WARY', color: C.alarmWary };
  return { name: 'CALM', color: C.alarmCalm };
}

function drawHUD(ctx, game) {
  const { W } = CFG;
  ctx.fillStyle = C.hudBg;
  roundRect(ctx, 10, 8, W - 20, 46, 8);
  ctx.fill();

  // Loot, left.
  ctx.fillStyle = C.hudText;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`LOOT  $${game.player.lootValue.toLocaleString('en-US')}`, 24, 28);
  ctx.fillStyle = C.hudDim;
  ctx.font = '12px sans-serif';
  const names = game.player.loot.map((i) => i.kind).join(' · ') || 'nothing yet';
  ctx.fillText(names, 24, 45);

  // Alarm meter, centre: the number the whole heist turns on.
  const stage = alarmStage(game.alarm);
  const bw = 340;
  const bx = W / 2 - bw / 2;
  ctx.fillStyle = C.hudDim;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ALARM', W / 2, 20);
  ctx.fillStyle = '#1a1d26';
  roundRect(ctx, bx, 26, bw, 12, 6);
  ctx.fill();
  ctx.fillStyle = stage.color;
  roundRect(ctx, bx, 26, bw * (game.alarm / 100), 12, 6);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  roundRect(ctx, bx, 26, bw, 12, 6);
  ctx.stroke();
  // Stage ticks.
  for (const t of [30, 60, 90]) {
    ctx.beginPath();
    ctx.moveTo(bx + (bw * t) / 100, 26);
    ctx.lineTo(bx + (bw * t) / 100, 38);
    ctx.stroke();
  }
  ctx.fillStyle = stage.color;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(stage.name, W / 2, 50);

  // Coins and getaway clock, right.
  ctx.textAlign = 'right';
  ctx.fillStyle = C.hudText;
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`◉ ${game.player.coins} coins`, W - 24, 27);
  if (game.getaway > 0) {
    const urgent = game.getaway < 20;
    ctx.fillStyle = urgent && Math.floor(game.time * 4) % 2 === 0 ? '#ff4040' : '#ffd65a';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`GETAWAY ${Math.ceil(game.getaway)}s`, W - 24, 47);
  } else {
    ctx.fillStyle = C.hudDim;
    ctx.font = '12px sans-serif';
    ctx.fillText('lift the Diamond to start the getaway clock', W - 24, 46);
  }

  // Objective, bottom left.
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(232,228,216,0.9)';
  ctx.font = '13px sans-serif';
  ctx.fillText(game.objective(), 16, CFG.H - 14);
  // Controls, bottom right.
  ctx.textAlign = 'right';
  ctx.fillStyle = C.hudDim;
  ctx.font = '12px sans-serif';
  ctx.fillText('WASD move · Shift sneak · Space sprint · E use · Q/click coin · P pause · M mute', W - 16, CFG.H - 14);
}

function drawPrompt(ctx, game) {
  const p = game.player;
  let text = null;
  const loot = p.nearestLoot(game, 46);
  const door = game.level.vaultDoor;
  const nearDoor = door.locked && Math.hypot(p.x - (door.x + 7), p.y - (door.y + 25)) < 60;
  const nearConsole = Math.hypot(p.x - game.level.console.x, p.y - game.level.console.y) < 64;
  if (nearDoor && game.lockdownSeal > 0) text = 'VAULT SEALED — lockdown!';
  else if (nearDoor) text = p.lockpick > 0 ? 'Picking the lock…' : 'Hold E — pick the vault lock';
  else if (nearConsole && game.camerasDisabled <= 0) text = p.consoleUse > 0 ? 'Cutting the cameras…' : 'Hold E — kill the cameras';
  else if (loot) text = `E — lift the ${loot.kind === 'diamond' ? 'Meridian Diamond' : loot.kind}`;
  if (!text) return;
  ctx.font = 'bold 13px sans-serif';
  const w = ctx.measureText(text).width + 18;
  const x = Math.max(8, Math.min(CFG.W - w - 8, p.x - w / 2));
  const y = p.y - 52;
  ctx.fillStyle = 'rgba(10,12,18,0.85)';
  roundRect(ctx, x, y, w, 24, 6);
  ctx.fill();
  ctx.fillStyle = '#ffd65a';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + 16);
  // Progress ring for hold-E actions.
  const prog = Math.max(p.lockpick, p.consoleUse);
  if (prog > 0) {
    ctx.strokeStyle = '#ffd65a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y - 30, 12, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * prog);
    ctx.stroke();
  }
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(8, 10, 16, 0.78)';
  ctx.fillRect(0, 0, CFG.W, CFG.H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent;
  ctx.font = 'bold 54px sans-serif';
  ctx.fillText(title, CFG.W / 2, 250);
  ctx.fillStyle = C.hudText;
  ctx.font = '17px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, CFG.W / 2, 310 + i * 30));
}

export function draw(game) {
  const ctx = game.ctx;
  const level = game.level;
  ctx.clearRect(0, 0, CFG.W, CFG.H);
  ctx.drawImage(game.staticCanvas, 0, 0);

  // Exit door and the getaway van waiting on the street.
  const e = level.exit;
  ctx.fillStyle = game.player.loot.some((i) => i.kind === 'diamond') ? C.exit : '#3a3f4c';
  ctx.fillRect(e.x, e.y - 6, e.w, 10);
  ctx.fillStyle = '#1f6f4a';
  roundRect(ctx, 596, CFG.H - 24, 88, 20, 5);
  ctx.fill();
  ctx.fillStyle = '#e8e4d8';
  ctx.font = 'bold 9px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GETAWAY VAN', 640, CFG.H - 11);

  // Security console in the office.
  const c = level.console;
  ctx.fillStyle = game.camerasDisabled > 0 ? '#2e5d3a' : '#4a3220';
  roundRect(ctx, c.x - 22, c.y - 14, 44, 28, 4);
  ctx.fill();
  ctx.fillStyle = game.camerasDisabled > 0 ? '#39d98a' : '#ff4040';
  ctx.beginPath();
  ctx.arc(c.x, c.y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.hudDim;
  ctx.font = '10px sans-serif';
  ctx.fillText(game.camerasDisabled > 0 ? `CAMERAS OFF ${Math.ceil(game.camerasDisabled)}s` : 'SECURITY', c.x, c.y + 28);

  // Vault door: brass wheel while locked, open gap once picked.
  const d = level.vaultDoor;
  if (d.locked) {
    ctx.fillStyle = game.lockdownSeal > 0 ? '#5d2020' : '#6b5a1e';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = C.brass;
    ctx.beginPath();
    ctx.arc(d.x + 7, d.y + 25, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(d.x + 7, d.y + 25, 4, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#20242e';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.fillStyle = C.brass;
    ctx.font = '9px sans-serif';
    ctx.fillText('OPEN', d.x + 7, d.y - 6);
  }

  // Plants (hide zones) as dark leafy blobs.
  for (const pl of level.plants) {
    ctx.fillStyle = 'rgba(46, 93, 58, 0.85)';
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, pl.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.plantDark;
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.arc(pl.x + Math.cos(a) * pl.r * 0.45, pl.y + Math.sin(a) * pl.r * 0.45, pl.r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Lasers.
  for (const beam of level.lasers) {
    const st = laserState(beam, game.time);
    if (st === 'off') continue;
    ctx.strokeStyle = st === 'warn' ? C.laserWarn : C.laserLive;
    ctx.lineWidth = st === 'warn' ? 2 : 4;
    ctx.beginPath();
    ctx.moveTo(beam.x1, beam.y1);
    ctx.lineTo(beam.x2, beam.y2);
    ctx.stroke();
    // Emitter posts.
    ctx.fillStyle = '#3a3f4c';
    ctx.fillRect(beam.x1 - 4, beam.y1 - 6, 8, 12);
    ctx.fillRect(beam.x2 - 4, beam.y2 - 6, 8, 12);
    if (st === 'live') {
      ctx.fillStyle = 'rgba(255,40,40,0.25)';
      ctx.beginPath();
      ctx.arc((beam.x1 + beam.x2) / 2, (beam.y1 + beam.y2) / 2, 14, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Loot still on the floor.
  for (const item of level.loot) {
    if (!item.taken) drawLoot(ctx, item, game.time);
  }

  // Tossed coins, ringing on the marble.
  for (const coin of game.coins) {
    ctx.fillStyle = C.brass;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(201,162,39,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 10 + ((game.time * 20) % 12), 0, Math.PI * 2);
    ctx.stroke();
  }

  // Camera cones (under the cameras themselves).
  for (const cam of game.cameras) {
    if (game.camerasDisabled > 0) continue;
    const pts = cam.conePoints(game);
    drawCone(ctx, pts, cam.seeing ? 'rgba(255,60,60,0.28)' : C.camCone, C.camConeEdge);
  }
  // Camera bodies.
  for (const cam of game.cameras) {
    ctx.fillStyle = '#2a2d36';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = game.camerasDisabled > 0 ? '#3a3f4c' : (cam.seeing ? '#ff4040' : '#ff9a3d');
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 6, cam.y + Math.sin(cam.angle) * 6, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // Guards and their cones.
  const blockers = sightBlockers(level);
  for (const g of game.guards) drawGuard(ctx, g, blockers);

  // The thief, unless tucked inside a plant's leaves.
  const p = game.player;
  drawPlayer(ctx, p, game.time);
  if (p.hidden) {
    ctx.fillStyle = 'rgba(30, 64, 40, 0.55)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#9aa3b2';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HIDDEN', p.x, p.y - 24);
  }

  // Floating event text.
  ctx.textAlign = 'center';
  for (const ev of game.floaters) {
    ctx.globalAlpha = Math.max(0, ev.ttl / 1.4);
    ctx.fillStyle = ev.color;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(ev.text, ev.x, ev.y - (1.4 - ev.ttl) * 30);
  }
  ctx.globalAlpha = 1;

  // Red flash when a laser trips.
  if (game.flash > 0) {
    ctx.fillStyle = `rgba(255, 40, 40, ${game.flash * 0.5})`;
    ctx.fillRect(0, 0, CFG.W, CFG.H);
  }

  drawHUD(ctx, game);
  if (game.state === 'play') drawPrompt(ctx, game);

  // --- screens ---
  if (game.state === 'title') {
    drawOverlay(ctx, 'THE MERIDIAN JOB', [
      'Midnight at the Meridian Bank. Lift the Diamond, dodge the cones,',
      'time the lasers — and be in the van before the getaway clock runs out.',
      '',
      'WASD / arrows — move      Shift — sneak      Space — sprint',
      'E — lift loot / pick the lock / cut the cameras      Q or click — toss a coin',
      'Plants hide you. Cameras raise the alarm. The Diamond starts a 90-second clock.',
      '',
      'Press ENTER or click to begin the heist.',
    ], '#ffd65a');
  } else if (game.state === 'paused') {
    drawOverlay(ctx, 'PAUSED', ['The bank holds its breath.', 'P — resume      R — restart the night'], '#e8e4d8');
  } else if (game.state === 'caught') {
    drawOverlay(ctx, 'BUSTED', [
      `Caught by ${game.caughtBy || 'the night watch'}. The Meridian keeps its Diamond.`,
      `Loot lifted: $${game.player.lootValue.toLocaleString('en-US')}`,
      '',
      'R — try the night again',
    ], '#ff4040');
  } else if (game.state === 'timeout') {
    drawOverlay(ctx, 'THE VAN LEFT', [
      'The getaway clock hit zero. Sirens on the street, no van at the kerb.',
      `Loot lifted: $${game.player.lootValue.toLocaleString('en-US')}`,
      '',
      'R — try the night again',
    ], '#ff9a3d');
  } else if (game.state === 'coldfeet') {
    drawOverlay(ctx, 'COLD FEET', [
      'You slipped out before the Diamond — alive, but the job is undone.',
      `Loot lifted: $${game.player.lootValue.toLocaleString('en-US')}`,
      '',
      'R — go back in for the Diamond',
    ], '#9aa3b2');
  } else if (game.state === 'win') {
    const rating = game.rating();
    drawOverlay(ctx, 'CLEAN GETAWAY', [
      `The Meridian Diamond is yours. Rating: ${rating}`,
      `Loot: $${game.player.lootValue.toLocaleString('en-US')}   Time to spare: ${Math.ceil(Math.max(0, game.getaway))}s   Peak alarm: ${Math.round(game.peakAlarm)}`,
      '',
      'R — run the job again',
    ], '#39d98a');
  }
}
