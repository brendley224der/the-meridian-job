// level.js — the Meridian Bank after closing: one floor, three zones.
//   * the banking hall (tellers, desks, pillars, plants to hide in)
//   * the upper corridor (security office left, vault wing right)
//   * the vault itself, past a laser corridor and a lockpicked door
// Walls and counters block movement and sight; plants hide the thief;
// lasers, cameras and guards are placed by the other modules from here.
import { CFG } from './config.js';

function rect(x, y, w, h, kind = 'wall') {
  return { x, y, w, h, kind };
}

export function buildLevel(seed) {
  const { W, H, WALL } = CFG;
  const walls = [];
  const cover = []; // furniture: blocks movement AND sight
  const plants = []; // hide zones: block neither, but conceal the thief

  // --- outer shell (with a gap at the bottom for the exit door) ---
  walls.push(rect(0, 0, W, WALL)); // top
  walls.push(rect(0, 0, WALL, H)); // left
  walls.push(rect(W - WALL, 0, WALL, H)); // right
  walls.push(rect(0, H - WALL, 600 - WALL, WALL)); // bottom, left of exit
  walls.push(rect(680, H - WALL, W - 680, WALL)); // bottom, right of exit

  // --- wall between the hall and the upper corridor (two door gaps) ---
  walls.push(rect(WALL, 260, 174, 14)); // 26..200
  walls.push(rect(260, 260, 760, 14)); // 260..1020 (gap 200..260, 1020..1080)
  walls.push(rect(1080, 260, 148, 14)); // 1080..1228

  // --- security office: left room, wall at x=330 with a door gap ---
  walls.push(rect(330, WALL, 14, 104)); // 26..130
  walls.push(rect(330, 180, 14, 80)); // 180..260 (gap 130..180)

  // --- vault wing: right room, wall at x=950 with the locked vault door ---
  walls.push(rect(950, WALL, 14, 94)); // 26..120
  walls.push(rect(950, 170, 14, 90)); // 170..260 (gap 120..170 = vault door)

  // --- banking hall furniture (cover) ---
  // Teller counter, three segments with two gaps to slip through.
  cover.push(rect(300, 330, 200, 26, 'counter'));
  cover.push(rect(560, 330, 120, 26, 'counter'));
  cover.push(rect(740, 330, 200, 26, 'counter'));
  // Desks with brass lamps.
  cover.push(rect(400, 420, 110, 56, 'desk'));
  cover.push(rect(770, 420, 110, 56, 'desk'));
  cover.push(rect(560, 560, 160, 56, 'desk'));
  // Marble pillars.
  cover.push(rect(330, 470, 34, 34, 'pillar'));
  cover.push(rect(916, 470, 34, 34, 'pillar'));
  cover.push(rect(330, 640, 34, 34, 'pillar'));
  cover.push(rect(916, 640, 34, 34, 'pillar'));
  // Vault-room furniture: display plinths and a safe cabinet.
  cover.push(rect(1000, 60, 60, 30, 'safe'));
  cover.push(rect(1000, 200, 60, 30, 'safe'));

  // --- plants: stand inside one and guards cannot spot you ---
  plants.push({ x: 150, y: 420, r: 42 });
  plants.push({ x: 1130, y: 420, r: 42 });
  plants.push({ x: 150, y: 660, r: 42 });
  plants.push({ x: 1130, y: 660, r: 42 });
  plants.push({ x: 640, y: 700, r: 46 });

  // --- laser corridor: three vertical beams across the upper hallway ---
  const lasers = [
    { x1: 760, y1: 100, x2: 760, y2: 180, phase: 0.0 },
    { x1: 830, y1: 100, x2: 830, y2: 180, phase: 0.33 },
    { x1: 900, y1: 100, x2: 900, y2: 180, phase: 0.66 },
  ];

  // --- loot: cash on the desks and counter, gold and the Diamond in the vault ---
  const loot = [
    { id: 'cash1', kind: 'cash', x: 455, y: 448, taken: false },
    { id: 'cash2', kind: 'cash', x: 825, y: 448, taken: false },
    { id: 'cash3', kind: 'cash', x: 620, y: 343, taken: false },
    { id: 'gold1', kind: 'gold', x: 1080, y: 90, taken: false },
    { id: 'gold2', kind: 'gold', x: 1180, y: 200, taken: false },
    { id: 'diamond', kind: 'diamond', x: 1150, y: 130, taken: false },
  ];

  // --- guards and their patrol loops ---
  const guards = [
    {
      name: 'Booth', x: 350, y: 380,
      waypoints: [[350, 380], [640, 380], [930, 380], [930, 540], [640, 540], [350, 540]],
    },
    {
      name: 'Marsh', x: 420, y: 140,
      waypoints: [[420, 140], [900, 140], [900, 210], [420, 210]],
    },
    {
      name: 'Voss', x: 1030, y: 100,
      waypoints: [[1030, 100], [1200, 100], [1200, 200], [1030, 200]],
    },
  ];

  // --- security cameras on the walls, sweeping their cones ---
  const cameras = [
    { id: 'cam1', x: 640, y: 274, baseAngle: Math.PI / 2, sweep: 0.7 },
    { id: 'cam2', x: 700, y: 40, baseAngle: Math.PI / 2, sweep: 0.6 },
    { id: 'cam3', x: 1228, y: 145, baseAngle: Math.PI, sweep: 0.65 },
  ];

  return {
    seed,
    walls,
    cover,
    plants,
    lasers,
    loot,
    guards,
    cameras,
    console: { x: 150, y: 130, r: 26 }, // security console in the office
    vaultDoor: { x: 950, y: 120, w: 14, h: 50, locked: true, lockpick: 0 },
    exit: { x: 600, y: H - WALL, w: 80, h: WALL },
    playerStart: { x: 640, y: 730 },
    // The red carpet runs from the entrance up to the corridor doors.
    carpet: { x: 600, y: 274, w: 80, h: 500 },
  };
}

// All rectangles that block sight: walls, cover and the (closed) vault door.
export function sightBlockers(level) {
  const list = level.walls.concat(level.cover);
  if (level.vaultDoor.locked) {
    list.push({
      x: level.vaultDoor.x, y: level.vaultDoor.y,
      w: level.vaultDoor.w, h: level.vaultDoor.h, kind: 'door',
    });
  }
  return list;
}

// All rectangles that block movement: sight blockers plus the vault door
// (locked or not — an open door is a gap you walk through, handled by
// treating the door rect as passable once unlocked).
export function moveBlockers(level) {
  const list = level.walls.concat(level.cover);
  if (level.vaultDoor.locked) {
    list.push({
      x: level.vaultDoor.x, y: level.vaultDoor.y,
      w: level.vaultDoor.w, h: level.vaultDoor.h, kind: 'door',
    });
  }
  return list;
}

// Segment vs axis-aligned rectangle: true when the segment touches the rect.
function segmentHitsRect(x1, y1, x2, y2, r) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let tmin = 0;
  let tmax = 1;
  if (Math.abs(dx) < 1e-9) {
    if (x1 < r.x || x1 > r.x + r.w) return false;
  } else {
    let t1 = (r.x - x1) / dx;
    let t2 = (r.x + r.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  if (Math.abs(dy) < 1e-9) {
    if (y1 < r.y || y1 > r.y + r.h) return false;
  } else {
    let t1 = (r.y - y1) / dy;
    let t2 = (r.y + r.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1);
    tmax = Math.min(tmax, t2);
    if (tmin > tmax) return false;
  }
  return true;
}

export function lineOfSight(x1, y1, x2, y2, blockers) {
  for (const b of blockers) {
    if (segmentHitsRect(x1, y1, x2, y2, b)) return false;
  }
  return true;
}

// Circle vs rectangle resolution: push the circle out of every rect it
// overlaps. Returns the corrected position.
export function resolveCircle(x, y, radius, blockers) {
  for (const b of blockers) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 < 1e-6) {
        // Centre inside the rect: push out along the smallest penetration.
        const left = x - b.x;
        const right = b.x + b.w - x;
        const top = y - b.y;
        const bottom = b.y + b.h - y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) x = b.x - radius;
        else if (m === right) x = b.x + b.w + radius;
        else if (m === top) y = b.y - radius;
        else y = b.y + b.h + radius;
      } else {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * radius;
        y = cy + (dy / d) * radius;
      }
    }
  }
  return { x, y };
}

export function inHideZone(level, x, y) {
  for (const p of level.plants) {
    const dx = x - p.x;
    const dy = y - p.y;
    if (dx * dx + dy * dy < p.r * p.r) return true;
  }
  return false;
}

export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}
