// input.js — keyboard and mouse state, one object the game loop reads.
// WASD / arrows move, Shift sneaks, E interacts, Q or click tosses a coin,
// Space sprints, P pauses, R restarts, M mutes.
export function createInput(canvas) {
  const keys = new Set();
  const input = {
    keys,
    mouseX: 0,
    mouseY: 0,
    mouseClicked: null, // {x, y} consumed by the loop each frame
    clickQueue: [],
    pressed: new Set(), // keys pressed since last frame (edge-triggered)
    isDown(code) {
      return keys.has(code);
    },
    wasPressed(code) {
      return this.pressed.has(code);
    },
    moveVector() {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    endFrame() {
      this.pressed.clear();
      this.clickQueue.length = 0;
    },
  };

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) {
      keys.add(e.code);
      input.pressed.add(e.code);
    }
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * canvas.width;
    const y = ((e.clientY - r.top) / r.height) * canvas.height;
    input.clickQueue.push({ x, y, button: e.button });
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return input;
}
