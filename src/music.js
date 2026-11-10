// Cheerful background cooking music, composed in code with the Web Audio API.
// No audio files, so there is nothing to license. It loops a gentle 8-bar
// tune: soft bass, warm chords and a plucky melody at a relaxed tempo.

import { audio } from './sound.js';

const BPM = 100;
const BEAT = 60 / BPM;
// Chord roots and triads (MIDI notes) for 8 bars: C  Am  F  G  C  Em  F  G
const BARS = [
  [48, [60, 64, 67]], [45, [57, 60, 64]], [41, [57, 60, 65]], [43, [59, 62, 67]],
  [48, [60, 64, 67]], [40, [59, 64, 67]], [41, [57, 60, 65]], [43, [59, 62, 67]],
];
// Melody: [beat offset within the bar, MIDI note, length in beats]
const MELODY = [
  [[0, 72, 1], [1, 76, 0.5], [1.5, 74, 0.5], [2, 72, 1], [3, 67, 1]],
  [[0, 69, 1.5], [1.5, 72, 0.5], [2, 76, 1], [3, 74, 1]],
  [[0, 72, 1], [1, 69, 1], [2, 65, 1], [3, 69, 1]],
  [[0, 71, 1.5], [1.5, 74, 0.5], [2, 79, 2]],
  [[0, 76, 1], [1, 74, 0.5], [1.5, 72, 0.5], [2, 76, 1], [3, 79, 1]],
  [[0, 76, 1.5], [1.5, 74, 0.5], [2, 71, 2]],
  [[0, 69, 1], [1, 72, 1], [2, 77, 1], [3, 76, 0.5], [3.5, 74, 0.5]],
  [[0, 74, 1], [1, 71, 1], [2, 67, 2]],
];

const freq = (midi) => 440 * 2 ** ((midi - 69) / 12);

let master = null;
let playing = false;
let nextBarTime = 0;
let bar = 0;
let scheduler = null;
let volume = 0.35;
let duck = 1;

function note(midi, time, length, { type = 'triangle', gain = 0.2, attack = 0.01 } = {}) {
  const a = audio();
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.value = freq(midi);
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(gain, time + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, time + length);
  osc.connect(g).connect(master);
  osc.start(time);
  osc.stop(time + length + 0.05);
}

function scheduleBar(time, index) {
  const [root, chord] = BARS[index];
  for (let b = 0; b < 4; b += 1) note(root, time + b * BEAT, BEAT * 0.9, { type: 'sine', gain: 0.28 });
  for (const n of chord) {
    note(n, time, BEAT * 1.8, { type: 'sine', gain: 0.05, attack: 0.08 });
    note(n, time + 2 * BEAT, BEAT * 1.8, { type: 'sine', gain: 0.05, attack: 0.08 });
  }
  for (const [offset, n, len] of MELODY[index]) {
    note(n, time + offset * BEAT, len * BEAT * 0.95, { type: 'triangle', gain: 0.12 });
  }
}

function tick() {
  const a = audio();
  while (nextBarTime < a.currentTime + 1.5) {
    scheduleBar(nextBarTime, bar);
    nextBarTime += 4 * BEAT;
    bar = (bar + 1) % BARS.length;
  }
}

function applyVolume() {
  if (master) master.gain.setTargetAtTime(volume * duck * 0.6, audio().currentTime, 0.3);
}

export const music = {
  start() {
    if (playing) return;
    const a = audio();
    if (!master) { master = a.createGain(); master.gain.value = 0; master.connect(a.destination); }
    playing = true;
    nextBarTime = a.currentTime + 0.1;
    bar = 0;
    applyVolume();
    tick();
    scheduler = setInterval(tick, 400);
  },
  stop() {
    if (!playing) return;
    playing = false;
    clearInterval(scheduler);
    if (master) {
      // Fade out, then swap in a fresh gain node so already-scheduled notes go silent.
      const old = master;
      old.gain.setTargetAtTime(0, audio().currentTime, 0.15);
      setTimeout(() => old.disconnect(), 800);
      master = null;
    }
  },
  setVolume(v) { volume = v; applyVolume(); },
  /** Quieter music while cooking, so it never competes with the recipe. */
  setDucked(on) { duck = on ? 0.55 : 1; applyVolume(); },
  get playing() { return playing; },
};
