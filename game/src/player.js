// player.js — Rook, the thief. Moves with WASD or arrows, sneaks with
// Shift (slower, harder to spot), sprints with Space (fast, loud), tosses
// coins with Q or a mouse click, and holds E to lift loot, pick the vault
// lock or work the security console. Every item lifted adds weight and
// slows the getaway a little.
import { CFG } from './config.js';
import { dist, inHideZone, resolveCircle } from './level.js';

export class Player {
  constructor(start) {
    this.x = start.x;
    this.y = start.y;
    this.angle = -Math.PI / 2; // faces up the hall at the start
    this.sneaking = false;
    this.sprinting = false;
    this.moving = false;
    this.hidden = false; // inside a plant's dark leaves
    this.loot = []; // lifted loot items
    this.coins = CFG.coinsStart;
    this.lockpick = 0; // 0..1 progress on the vault door
    this.consoleUse = 0; // 0..1 progress on the security console
    this.stepTimer = 0;
  }

  get weight() {
    return this.loot.length;
  }

  get lootValue() {
    return this.loot.reduce((sum, item) => sum + CFG.lootValues[item.kind], 0);
  }

  speed() {
    let sp = CFG.walkSpeed;
    if (this.sneaking) sp = CFG.sneakSpeed;
    if (this.sprinting) sp = CFG.sprintSpeed;
    const slow = Math.min(CFG.maxWeightSlow, this.weight * CFG.weightPerLoot);
    return sp * (1 - slow);
  }

  update(dt, game, input) {
    const prevX = this.x;
    const prevY = this.y;
    this.sneaking = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    this.sprinting = input.isDown('Space') && !this.sneaking;
    const mv = input.moveVector();
    this.moving = mv.x !== 0 || mv.y !== 0;
    if (this.moving) {
      this.angle = Math.atan2(mv.y, mv.x);
      const sp = this.speed();
      const nx = this.x + mv.x * sp * dt;
      const ny = this.y + mv.y * sp * dt;
      const r = resolveCircle(nx, ny, CFG.playerRadius, game.moveBlockers);
      this.x = r.x;
      this.y = r.y;
      // Footsteps: guards hear a sprint from across the hall.
      this.stepTimer -= dt;
      if (this.stepTimer <= 0) {
        this.stepTimer = this.sneaking ? 0.55 : 0.34;
        game.audio.step(this.sneaking, this.sprinting);
        if (this.sprinting) {
          for (const g of game.guards) g.hearNoise(this.x, this.y, game);
        }
      }
    }

    this.hidden = inHideZone(game.level, this.x, this.y);

    // --- interactions, all on hold-E except loot (tap E) and coins (Q/click) ---
    this.handleLoot(game, input);
    this.handleVaultDoor(game, input, dt);
    this.handleConsole(game, input, dt);
    this.handleCoins(game, input);
    this.handleExit(game);

    return { prevX, prevY };
  }

  nearestLoot(game, maxD) {
    let best = null;
    let bestD = maxD;
    for (const item of game.level.loot) {
      if (item.taken) continue;
      const d = dist(this.x, this.y, item.x, item.y);
      if (d < bestD) {
        best = item;
        bestD = d;
      }
    }
    return best;
  }

  handleLoot(game, input) {
    if (!input.wasPressed('KeyE')) return;
    const item = this.nearestLoot(game, 42);
    if (!item) return;
    item.taken = true;
    this.loot.push(item);
    game.audio.pickup(item.kind);
    game.events.push({ type: 'loot', kind: item.kind, x: item.x, y: item.y });
    if (item.kind === 'diamond') {
      game.getaway = CFG.getawaySeconds;
      game.events.push({ type: 'diamond', x: item.x, y: item.y });
    }
  }

  handleVaultDoor(game, input, dt) {
    const door = game.level.vaultDoor;
    const near = dist(this.x, this.y, door.x + 7, door.y + 25) < 60;
    if (!door.locked || !near) {
      this.lockpick = 0;
      return;
    }
    if (game.lockdownSeal > 0) return; // sealed during lockdown
    if (input.isDown('KeyE')) {
      this.lockpick += dt / CFG.lockpickSeconds;
      if (Math.random() < dt * 6) game.audio.pick();
      if (this.lockpick >= 1) {
        door.locked = false;
        this.lockpick = 0;
        game.audio.unlock();
        game.events.push({ type: 'unlock', x: door.x, y: door.y + 25 });
      }
    } else {
      this.lockpick = Math.max(0, this.lockpick - dt * 2);
    }
  }

  handleConsole(game, input, dt) {
    const c = game.level.console;
    const near = dist(this.x, this.y, c.x, c.y) < 64;
    if (!near || game.camerasDisabled > 0) {
      this.consoleUse = 0;
      return;
    }
    if (input.isDown('KeyE')) {
      this.consoleUse += dt / 1.2;
      if (this.consoleUse >= 1) {
        game.camerasDisabled = CFG.consoleDisableSeconds;
        this.consoleUse = 0;
        game.audio.console();
        game.events.push({ type: 'console', x: c.x, y: c.y });
      }
    } else {
      this.consoleUse = Math.max(0, this.consoleUse - dt * 2);
    }
  }

  handleCoins(game, input) {
    const clicked = input.clickQueue.length > 0;
    if (!input.wasPressed('KeyQ') && !clicked) return;
    if (this.coins <= 0) {
      game.audio.deny();
      return;
    }
    const target = clicked
      ? input.clickQueue[input.clickQueue.length - 1]
      : { x: this.x + Math.cos(this.angle) * 130, y: this.y + Math.sin(this.angle) * 130 };
    this.coins -= 1;
    game.coins.push({ x: target.x, y: target.y, t: 0 });
    game.audio.coin();
    for (const g of game.guards) g.hearNoise(target.x, target.y, game);
  }

  handleExit(game) {
    const e = game.level.exit;
    if (this.x > e.x - 6 && this.x < e.x + e.w + 6 && this.y > e.y - 4) {
      const hasDiamond = this.loot.some((item) => item.kind === 'diamond');
      game.finish(hasDiamond ? 'win' : 'coldfeet');
    }
  }
}
