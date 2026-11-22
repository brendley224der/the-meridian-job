// cameras.js — wall-mounted security cameras. Each sweeps its cone back
// and forth; being caught in a live camera's cone raises the alarm fast.
// The security console in the office silences every camera for a while.
import { CFG } from './config.js';
import { dist, lineOfSight, sightBlockers } from './level.js';
import { conePolygon } from './guards.js';

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export class Camera {
  constructor(def) {
    this.id = def.id;
    this.x = def.x;
    this.y = def.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep; // radians either side of the base angle
    this.angle = def.baseAngle;
    this.t = Math.random() * 10;
    this.seeing = false;
  }

  update(dt, game) {
    if (game.camerasDisabled > 0) {
      this.seeing = false;
      return;
    }
    this.t += dt;
    this.angle = this.baseAngle + Math.sin(this.t * CFG.cameraSweepSpeed) * this.sweep;
    const p = game.player;
    this.seeing = false;
    if (p.hidden) return;
    const d = dist(this.x, this.y, p.x, p.y);
    if (d > CFG.cameraSight) return;
    const toPlayer = Math.atan2(p.y - this.y, p.x - this.x);
    if (Math.abs(angleDiff(toPlayer, this.angle)) > CFG.cameraHalfAngle) return;
    if (!lineOfSight(this.x, this.y, p.x, p.y, sightBlockers(game.level))) return;
    this.seeing = true;
    game.alarm = Math.min(100, game.alarm + CFG.cameraAlarmGain * dt);
    game.cameraSeen = true;
  }

  conePoints(game) {
    return conePolygon(this.x, this.y, this.angle, CFG.cameraHalfAngle,
      CFG.cameraSight, sightBlockers(game.level));
  }
}
