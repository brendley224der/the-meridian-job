// lasers.js — the vault corridor's laser grid. Each beam runs on its own
// phase of one shared cycle: dark, then a dim warning glow, then a live
// red beam. Cross a live beam and the alarm jumps; cross it dark and
// nothing happens. Timing the gaps is the whole puzzle of the corridor.
import { CFG } from './config.js';

export function laserState(beam, time) {
  const cycle = CFG.laserCycle;
  const phase = ((time / cycle) + beam.phase) % 1;
  if (phase < 1 - CFG.laserOnFraction - CFG.laserWarnFraction) return 'off';
  if (phase < 1 - CFG.laserOnFraction) return 'warn';
  return 'live';
}

// Segment vs segment intersection, for the thief crossing a beam.
function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  const d2 = (x2 - x1) * (y4 - y1) - (y2 - y1) * (x4 - x1);
  const d3 = (x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3);
  const d4 = (x4 - x3) * (y2 - y3) - (y4 - y3) * (x2 - x3);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
    ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function checkLasers(game, prevX, prevY) {
  const p = game.player;
  for (const beam of game.level.lasers) {
    if (laserState(beam, game.time) !== 'live') continue;
    if (game.laserCooldown > 0) continue;
    if (segmentsCross(prevX, prevY, p.x, p.y, beam.x1, beam.y1, beam.x2, beam.y2)) {
      game.alarm = Math.min(100, game.alarm + CFG.laserTripAlarm);
      game.laserCooldown = 1.2;
      game.events.push({ type: 'laser', x: (beam.x1 + beam.x2) / 2, y: (beam.y1 + beam.y2) / 2 });
      game.flash = 0.35;
    }
  }
}
