// config.js — every tunable number for The Meridian Job lives here.
// One place to balance the heist: speeds, sight, alarm, loot and timers.
export const CFG = {
  // Canvas and world
  W: 1280,
  H: 800,
  TILE: 40,
  WALL: 26, // wall thickness

  // Player
  playerRadius: 13,
  walkSpeed: 168, // px per second
  sneakSpeed: 96,
  sprintSpeed: 205,
  // Each loot item slows the thief a little: heavy pockets, slow feet.
  weightPerLoot: 0.055, // fractional speed loss per item carried
  maxWeightSlow: 0.38,

  // Guard senses
  guardSight: 250, // cone length
  guardHalfAngle: 0.46, // radians either side of facing
  suspicionGain: 0.62, // per second, thief in cone at mid range
  suspicionGainClose: 1.35, // per second, thief very close
  suspicionGainSneak: 0.45, // multiplier while sneaking
  suspicionDecay: 0.30, // per second, thief out of sight
  guardWalkSpeed: 74,
  guardChaseSpeed: 158,
  guardCatchRadius: 22,
  investigateTime: 4.5, // seconds a guard stares at a noise point

  // Cameras
  cameraSight: 215,
  cameraHalfAngle: 0.42,
  cameraSweepSpeed: 0.55, // radians per second
  cameraAlarmGain: 0.85, // alarm per second while the camera sees you
  consoleDisableSeconds: 22, // how long the security console silences cameras

  // Lasers (vault corridor)
  laserCycle: 3.4, // seconds per full on/off cycle
  laserOnFraction: 0.52, // share of the cycle a beam is live
  laserWarnFraction: 0.16, // share before live when the beam glows dim
  laserTripAlarm: 26, // alarm added when a live beam is crossed

  // Alarm (0..100) and its stages
  alarmDecay: 1.6, // per second while unseen
  alarmGuardSeenGain: 0.9, // per second while any guard sees you
  stageWary: 30,
  stageAlert: 60,
  stageLockdown: 90,
  lockdownSealSeconds: 10, // vault door seals this long at lockdown

  // Lockpick and getaway
  lockpickSeconds: 3.0,
  getawaySeconds: 90, // clock starts the moment the Diamond is lifted
  coinsStart: 5,
  coinLureRadius: 190, // guards inside this hear the coin land

  // Loot values (USDC-flavoured fiction, not real money)
  lootValues: { cash: 4000, gold: 12000, diamond: 50000 },

  // Palette — midnight bank: deep blues, warm brass, marble cream
  colors: {
    floorA: '#20242e',
    floorB: '#232833',
    marble: '#3a3f4c',
    carpet: '#5d2f38',
    carpetEdge: '#7a3b46',
    wall: '#4b5261',
    wallTop: '#6b7488',
    brass: '#c9a227',
    brassDim: '#8a6d1d',
    wood: '#6b4a2f',
    woodDark: '#4a3220',
    plant: '#2e5d3a',
    plantDark: '#1e4028',
    shadow: '#10131a',
    cone: 'rgba(255, 214, 90, 0.20)',
    coneEdge: 'rgba(255, 214, 90, 0.55)',
    camCone: 'rgba(255, 96, 96, 0.16)',
    camConeEdge: 'rgba(255, 96, 96, 0.5)',
    laserWarn: 'rgba(255, 80, 80, 0.35)',
    laserLive: 'rgba(255, 40, 40, 0.95)',
    loot: '#ffd94d',
    diamond: '#7fe7ff',
    player: '#e8e4d8',
    playerCoat: '#2b3a55',
    guard: '#3d4a68',
    guardVisor: '#ffd65a',
    exit: '#39d98a',
    hudBg: 'rgba(10, 12, 18, 0.82)',
    hudText: '#e8e4d8',
    hudDim: '#9aa3b2',
    alarmCalm: '#39d98a',
    alarmWary: '#ffd65a',
    alarmAlert: '#ff9a3d',
    alarmLockdown: '#ff4040',
  },
};
