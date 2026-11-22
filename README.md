# The Meridian Job

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/brendley224der/the-meridian-job/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/brendley224der/the-meridian-job/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist in the Meridian Bank after closing. You are Rook, a thief with one night: cross the banking hall under patrolling guards and sweeping security cameras, time the laser grid in the vault corridor, pick the vault lock, lift the Meridian Diamond — and be in the getaway van before the 90-second clock runs out.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

## How it plays

- **WASD / arrows** — move. **Shift** — sneak (slower, harder to spot). **Space** — sprint (fast, loud: guards hear it).
- **E** — lift loot, hold to pick the vault lock, hold at the security console to kill the cameras for 22 seconds.
- **Q or click** — toss a coin; guards walk over to check the noise.
- **P** — pause. **R** — restart the night. **M** — mute.
- Guards patrol with raycast-clipped vision cones; suspicion climbs in the cone and drains out of sight. A full meter means a chase — and a touch while the alarm is up means busted.
- The alarm has four stages: CALM, WARY, ALERT, LOCKDOWN. At LOCKDOWN the vault seals for 10 seconds and the guards speed up.
- Every item you lift adds weight and slows you down. The Diamond starts the getaway clock: 90 seconds to the van.
- Plants hide you outright. The security console silences every camera. The laser corridor runs on a cycle: dark, warning glow, live beam.

## Files

- `game/` — the playable game, plain static files (canvas, ES modules, no library, no network).
- `game/src/` — one job per file: `config.js` (balance), `level.js` (the bank), `guards.js` (patrol AI + vision cones), `cameras.js` (sweeping cameras), `lasers.js` (the grid), `player.js` (Rook), `audio.js` (synthesized WebAudio), `render.js` (drawing + HUD), `shots.js` (staged screenshot scenes), `main.js` (loop + alarm + state machine).
- `screenshots/` — real renders of the game's own code: the cover heist, the LOCKDOWN laser corridor, the title, the getaway.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes the dossier.

---

<sub>Entered on [make.fun](https://make.fun/?ref=amsc6jjj&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
