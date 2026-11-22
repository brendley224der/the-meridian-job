// guards.js — the night watch: patrol, suspicion, chase, investigate.
// A guard sees the thief only inside a raycast-clipped vision cone with a
// clear line of sight. Suspicion climbs while the thief is seen and drains
// when hidden; a full meter means the guard gives chase. A tossed coin (or
// a sprinting thief) is a noise a guard walks over to check.
import { CFG } from './config.js';
import { dist, lineOfSight, resolveCircle, sightBlockers } from './level.js';

// Cast one ray; returns how far it travels before hitting a blocker.
export function castRay(x, y, angle, maxDist, blockers) {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  let best = maxDist;
  for (const b of blockers) {
    // Slab test, keeping the entry distance.
    let tmin = 0;
    let tmax = maxDist;
    if (Math.abs(dx) < 1e-9) {
      if (x < b.x || x > b.x + b.w) continue;
    } else {
      let t1 = (b.x - x) / dx;
      let t2 = (b.x + b.w - x) / dx;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (Math.abs(dy) < 1e-9) {
      if (y < b.y || y > b.y + b.h) continue;
    } else {
      let t1 = (b.y - y) / dy;
      let t2 = (b.y + b.h - y) / dy;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) continue;
    }
    if (tmin >= 0 && tmin < best) best = tmin;
  }
  return best;
}

// The cone's outline as a fan of ray endpoints, clipped by the walls.
export function conePolygon(x, y, angle, halfAngle, length, blockers, steps = 22) {
  const pts = [{ x, y }];
  for (let i = 0; i <= steps; i++) {
    const a = angle - halfAngle + (2 * halfAngle * i) / steps;
    const d = castRay(x, y, a, length, blockers);
    pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return pts;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Guard {
  constructor(def) {
    this.name = def.name;
    this.x = def.x;
    this.y = def.y;
    this.waypoints = def.waypoints;
    this.wp = 1 % def.waypoints.length;
    this.angle = 0;
    this.state = 'patrol'; // patrol | chase | investigate | stare
    this.suspicion = 0;
    this.loseSight = 0; // seconds since the thief was last seen
    this.investigateX = 0;
    this.investigateY = 0;
    this.investigateTimer = 0;
    this.stareTimer = 0;
    this.speedMul = 1; // lockdown makes guards faster
    this.pauseTimer = 0; // brief stop at each waypoint
  }

  canSeePlayer(game) {
    const p = game.player;
    if (p.hidden) return false;
    const d = dist(this.x, this.y, p.x, p.y);
    if (d > CFG.guardSight) return false;
    const toPlayer = Math.atan2(p.y - this.y, p.x - this.x);
    if (Math.abs(angleDiff(toPlayer, this.angle)) > CFG.guardHalfAngle) return false;
    return lineOfSight(this.x, this.y, p.x, p.y, sightBlockers(game.level));
  }

  hearNoise(x, y, game) {
    if (this.state === 'chase') return;
    const d = dist(this.x, this.y, x, y);
    if (d < CFG.coinLureRadius) {
      this.state = 'investigate';
      this.investigateX = x;
      this.investigateY = y;
      this.investigateTimer = CFG.investigateTime;
    }
  }

  update(dt, game) {
    const p = game.player;
    const seen = this.canSeePlayer(game);
    const d = dist(this.x, this.y, p.x, p.y);

    // --- suspicion ---
    if (seen) {
      this.loseSight = 0;
      let gain = d < 110 ? CFG.suspicionGainClose : CFG.suspicionGain;
      if (p.sneaking) gain *= CFG.suspicionGainSneak;
      this.suspicion = Math.min(1, this.suspicion + gain * dt);
      game.alarm = Math.min(100, game.alarm + CFG.alarmGuardSeenGain * dt);
      if (this.suspicion >= 1 && this.state !== 'chase') {
        this.state = 'chase';
        game.events.push({ type: 'spotted', x: this.x, y: this.y });
      }
    } else {
      this.loseSight += dt;
      this.suspicion = Math.max(0, this.suspicion - CFG.suspicionDecay * dt);
    }

    // --- movement by state ---
    const blockers = game.moveBlockers;
    if (this.state === 'patrol') {
      if (this.pauseTimer > 0) {
        this.pauseTimer -= dt;
      } else {
        const [tx, ty] = this.waypoints[this.wp];
        const td = dist(this.x, this.y, tx, ty);
        if (td < 8) {
          this.wp = (this.wp + 1) % this.waypoints.length;
          this.pauseTimer = 0.7;
        } else {
          this.angle = Math.atan2(ty - this.y, tx - this.x);
          const sp = CFG.guardWalkSpeed * this.speedMul;
          const nx = this.x + Math.cos(this.angle) * sp * dt;
          const ny = this.y + Math.sin(this.angle) * sp * dt;
          const r = resolveCircle(nx, ny, 13, blockers);
          this.x = r.x;
          this.y = r.y;
        }
      }
    } else if (this.state === 'chase') {
      if (!seen && this.loseSight > 2.5) {
        this.state = 'investigate';
        this.investigateX = p.x;
        this.investigateY = p.y;
        this.investigateTimer = CFG.investigateTime;
      } else {
        this.angle = Math.atan2(p.y - this.y, p.x - this.x);
        const sp = CFG.guardChaseSpeed * this.speedMul;
        const nx = this.x + Math.cos(this.angle) * sp * dt;
        const ny = this.y + Math.sin(this.angle) * sp * dt;
        const r = resolveCircle(nx, ny, 13, blockers);
        this.x = r.x;
        this.y = r.y;
        if (dist(this.x, this.y, p.x, p.y) < CFG.guardCatchRadius) {
          game.caughtBy = this.name;
          game.setState('caught');
        }
      }
    } else if (this.state === 'investigate') {
      const td = dist(this.x, this.y, this.investigateX, this.investigateY);
      if (td > 10) {
        this.angle = Math.atan2(this.investigateY - this.y, this.investigateX - this.x);
        const sp = CFG.guardWalkSpeed * 1.5 * this.speedMul;
        const nx = this.x + Math.cos(this.angle) * sp * dt;
        const ny = this.y + Math.sin(this.angle) * sp * dt;
        const r = resolveCircle(nx, ny, 13, blockers);
        this.x = r.x;
        this.y = r.y;
      } else {
        this.investigateTimer -= dt;
        this.angle += dt * 1.8; // look around the noise point
        if (this.investigateTimer <= 0) this.state = 'patrol';
      }
    }
  }
}
