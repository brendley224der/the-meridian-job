// audio.js — every sound is synthesized with WebAudio: no audio files,
// no network, just oscillators and filtered noise. Created lazily on the
// first user gesture so browsers allow it; M mutes everything.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.hum = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    // The bank at night: a low, barely-there mains hum.
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.012;
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    this.hum = { osc, gain };
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.hum) this.hum.gain.gain.value = muted ? 0 : 0.012;
  }

  tone(freq, dur, type = 'sine', vol = 0.08, slideTo = null, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, vol = 0.06, freq = 1200, delay = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter).connect(gain).connect(this.ctx.destination);
    src.start(t0);
  }

  step(sneaking, sprinting) {
    this.noise(0.05, sneaking ? 0.012 : sprinting ? 0.05 : 0.028, 300);
  }

  coin() {
    this.tone(2400, 0.09, 'sine', 0.07);
    this.tone(3200, 0.12, 'sine', 0.05, null, 0.05);
    this.noise(0.04, 0.03, 5000, 0.12);
  }

  pickup(kind) {
    if (kind === 'diamond') {
      this.tone(880, 0.14, 'sine', 0.09);
      this.tone(1174, 0.16, 'sine', 0.09, null, 0.09);
      this.tone(1568, 0.3, 'sine', 0.1, null, 0.18);
    } else if (kind === 'gold') {
      this.tone(660, 0.12, 'triangle', 0.08);
      this.tone(990, 0.2, 'triangle', 0.07, null, 0.08);
    } else {
      this.tone(520, 0.08, 'triangle', 0.07);
      this.tone(780, 0.14, 'triangle', 0.06, null, 0.06);
    }
  }

  pick() {
    this.tone(1800 + Math.random() * 600, 0.03, 'square', 0.025);
  }

  unlock() {
    this.tone(300, 0.1, 'square', 0.06, 900);
    this.tone(900, 0.18, 'sine', 0.07, null, 0.1);
  }

  console() {
    this.tone(440, 0.08, 'square', 0.05);
    this.tone(660, 0.08, 'square', 0.05, null, 0.09);
    this.tone(880, 0.16, 'square', 0.05, null, 0.18);
  }

  spotted() {
    this.tone(220, 0.35, 'sawtooth', 0.09, 440);
    this.noise(0.25, 0.05, 900);
  }

  laser() {
    this.tone(1400, 0.22, 'sawtooth', 0.08, 300);
  }

  alarm() {
    this.tone(620, 0.28, 'square', 0.06, 620);
    this.tone(620, 0.28, 'square', 0.06, 620, 0.36);
  }

  caught() {
    this.tone(392, 0.3, 'sawtooth', 0.1, 196);
    this.tone(196, 0.6, 'sawtooth', 0.1, 98, 0.3);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.09, null, i * 0.14));
  }

  deny() {
    this.tone(160, 0.12, 'square', 0.05);
  }
}
