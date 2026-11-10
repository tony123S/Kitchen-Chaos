// Short sound effects made with the Web Audio API (no audio files, so no
// licensing questions). Background music and the volume controls are
// added in Phase 4.

let ctx = null;
let effectsOn = true;

function audio() {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, duration, { type = 'sine', gain = 0.18, slideTo = null } = {}) {
  const a = audio();
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, a.currentTime + start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, a.currentTime + start + duration);
  g.gain.setValueAtTime(0.0001, a.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, a.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + start + duration);
  osc.connect(g).connect(a.destination);
  osc.start(a.currentTime + start);
  osc.stop(a.currentTime + start + duration + 0.05);
}

export const sfx = {
  setEnabled(on) { effectsOn = on; },
  get enabled() { return effectsOn; },
  /** Happy little chime when a step is completed. */
  step() {
    if (!effectsOn) return;
    tone(660, 0, 0.18, { type: 'triangle' });
    tone(880, 0.12, 0.25, { type: 'triangle' });
  },
  /** Cartoon "boing" for the surprised chef. */
  boing() {
    if (!effectsOn) return;
    tone(220, 0, 0.35, { type: 'square', gain: 0.08, slideTo: 520 });
  },
  /** Kitchen-timer ring when a countdown ends. */
  timerDone() {
    if (!effectsOn) return;
    for (let i = 0; i < 3; i += 1) {
      tone(1046, i * 0.4, 0.15, { type: 'square', gain: 0.1 });
      tone(1318, i * 0.4 + 0.16, 0.15, { type: 'square', gain: 0.1 });
    }
  },
  /** Little fanfare for the finished dish. */
  victory() {
    if (!effectsOn) return;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.3, { type: 'triangle' }));
  },
};
