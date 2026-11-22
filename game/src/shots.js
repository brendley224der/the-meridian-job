// shots.js — deterministic staged scenes for the screenshots, driven by
// ?shot=<name>&seed=<n>. Each scene poses the same game in a real state
// the player can reach: no mock UI, the game itself, frozen mid-heist.
//   start — the title screen over the bank at night
//   play  — the cover: the thief crossing the hall under a guard's cone,
//           a camera sweeping, loot on the desks and the alarm at WARY
//   alert — LOCKDOWN in the laser corridor, a guard giving chase
//   win   — the getaway screen with the loot tally
import { CFG } from './config.js';

export function applyShot(game, shot) {
  const level = game.level;
  const p = game.player;
  if (shot === 'start') {
    game.state = 'title';
    game.time = 2.0;
    return;
  }
  if (shot === 'play') {
    game.state = 'play';
    game.time = 6.0;
    // The thief mid-hall, slipping between the counter and a desk.
    p.x = 600;
    p.y = 430;
    p.angle = Math.PI / 2;
    p.sneaking = true;
    // One guard's cone sweeping right across the thief's path.
    const g = game.guards[0];
    g.x = 700;
    g.y = 380;
    g.angle = Math.PI * 0.85;
    g.suspicion = 0.55;
    g.state = 'patrol';
    // A second guard patrolling the far side of the hall.
    const g2 = game.guards[1];
    g2.x = 420;
    g2.y = 150;
    g2.angle = 0;
    // The vault guard inside the vault room, cone on the Diamond.
    const g3 = game.guards[2];
    g3.x = 1030;
    g3.y = 100;
    g3.angle = 0.3;
    // Cameras mid-sweep, one of them looking at the hall.
    game.cameras[0].angle = Math.PI / 2 + 0.4;
    game.cameras[0].t = 3.0;
    game.cameras[1].angle = Math.PI / 2 - 0.3;
    game.cameras[2].angle = Math.PI - 0.5;
    // The thief already lifted the counter cash: a sack, a story.
    const cash = level.loot.find((i) => i.id === 'cash3');
    cash.taken = true;
    p.loot.push(cash);
    game.alarm = 38; // WARY: the night is watching
    game.peakAlarm = 38;
    return;
  }
  if (shot === 'alert') {
    game.state = 'play';
    game.time = 8.4; // lasers live in this slice of the cycle
    // The thief caught between the laser beams, a guard on his heels.
    p.x = 830;
    p.y = 150;
    p.angle = 0;
    const g = game.guards[1];
    g.x = 700;
    g.y = 150;
    g.angle = 0;
    g.suspicion = 1;
    g.state = 'chase';
    game.guards[0].x = 640;
    game.guards[0].y = 380;
    game.guards[0].angle = -Math.PI / 2;
    game.guards[2].x = 1100;
    game.guards[2].y = 100;
    game.guards[2].angle = Math.PI;
    game.cameras[0].angle = Math.PI / 2;
    game.cameras[1].angle = Math.PI / 2 + 0.5;
    game.cameras[2].angle = Math.PI;
    // The Diamond is lifted: the getaway clock is burning.
    const diamond = level.loot.find((i) => i.kind === 'diamond');
    diamond.taken = true;
    p.loot.push(diamond);
    const gold = level.loot.find((i) => i.id === 'gold1');
    gold.taken = true;
    p.loot.push(gold);
    game.getaway = 47;
    game.alarm = 92; // LOCKDOWN: the vault just sealed
    game.peakAlarm = 92;
    game.lockdownSeal = 6;
    game.flash = 0.12;
    return;
  }
  if (shot === 'win') {
    game.state = 'win';
    game.time = 12.0;
    const diamond = level.loot.find((i) => i.kind === 'diamond');
    diamond.taken = true;
    p.loot.push(diamond);
    for (const id of ['cash1', 'cash2', 'gold1', 'gold2']) {
      const item = level.loot.find((i) => i.id === id);
      item.taken = true;
      p.loot.push(item);
    }
    p.x = 640;
    p.y = 730;
    game.getaway = 34;
    game.alarm = 22;
    game.peakAlarm = 41;
    game.spotted = false;
    return;
  }
}
