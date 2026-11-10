// Original synthesised background music and short sound effects.
// No external audio files or third-party music are used.

let ctx = null;
let effectsOn = true;
let musicOn = false;
let musicTimer = null;
let musicGain = null;
let musicStep = 0;
let musicVolume = 0.16;

try {
  const savedVolume = Number(localStorage.getItem('kitchen-chaos-music-volume'));
  if (Number.isFinite(savedVolume) && savedVolume >= 0 && savedVolume <= 1) musicVolume = savedVolume;
} catch {
  // Storage may be unavailable; the in-memory default is still fine.
}

function audio() {
  if (!ctx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) throw new Error('Web Audio is not supported in this browser.');
    ctx = new AudioContextClass();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function ensureMusicBus() {
  const a = audio();
  if (!musicGain) {
    musicGain = a.createGain();
    musicGain.gain.value = musicOn ? musicVolume : 0.0001;
    musicGain.connect(a.destination);
  }
  return musicGain;
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

const melody = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880, 698.46,
  523.25, 659.25, 783.99, 1046.5, 880, 783.99, 659.25, 587.33];
const bass = [130.81, 146.83, 164.81, 146.83];

function playMusicNote() {
  if (!musicOn || !ctx || !musicGain) return;
  const a = ctx;
  const when = a.currentTime + 0.025;
  const note = melody[musicStep % melody.length];
  const low = bass[Math.floor(musicStep / 4) % bass.length];

  const lead = a.createOscillator();
  const leadGain = a.createGain();
  lead.type = 'triangle';
  lead.frequency.setValueAtTime(note, when);
  leadGain.gain.setValueAtTime(0.0001, when);
  leadGain.gain.linearRampToValueAtTime(0.32, when + 0.035);
  leadGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.29);
  lead.connect(leadGain).connect(musicGain);
  lead.start(when);
  lead.stop(when + 0.31);

  if (musicStep % 4 === 0) {
    const pad = a.createOscillator();
    const padGain = a.createGain();
    pad.type = 'sine';
    pad.frequency.setValueAtTime(low, when);
    padGain.gain.setValueAtTime(0.0001, when);
    padGain.gain.linearRampToValueAtTime(0.12, when + 0.05);
    padGain.gain.exponentialRampToValueAtTime(0.0001, when + 1.25);
    pad.connect(padGain).connect(musicGain);
    pad.start(when);
    pad.stop(when + 1.3);
  }
  musicStep += 1;
}

export const music = {
  get enabled() { return musicOn; },
  get volume() { return musicVolume; },
  start() {
    if (musicOn) return;
    try {
      audio();
      ensureMusicBus();
      musicOn = true;
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setTargetAtTime(musicVolume, ctx.currentTime, 0.18);
      musicStep = 0;
      playMusicNote();
      musicTimer = setInterval(playMusicNote, 350);
    } catch (error) {
      console.error('Could not start Kitchen Chaos music:', error);
      musicOn = false;
    }
  },
  stop() {
    musicOn = false;
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
    if (ctx && musicGain) {
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.12);
    }
  },
  toggle() {
    if (musicOn) this.stop();
    else this.start();
    return musicOn;
  },
  setVolume(value) {
    musicVolume = Math.max(0, Math.min(1, Number(value) || 0));
    try { localStorage.setItem('kitchen-chaos-music-volume', String(musicVolume)); } catch { /* optional */ }
    if (ctx && musicGain) {
      musicGain.gain.setTargetAtTime(musicOn ? musicVolume : 0.0001, ctx.currentTime, 0.08);
    }
  },
};

export const sfx = {
  setEnabled(on) { effectsOn = on; },
  get enabled() { return effectsOn; },
  step() {
    if (!effectsOn) return;
    tone(660, 0, 0.18, { type: 'triangle' });
    tone(880, 0.12, 0.25, { type: 'triangle' });
  },
  boing() {
    if (!effectsOn) return;
    tone(220, 0, 0.35, { type: 'square', gain: 0.08, slideTo: 520 });
  },
  timerDone() {
    if (!effectsOn) return;
    for (let i = 0; i < 3; i += 1) {
      tone(1046, i * 0.4, 0.15, { type: 'square', gain: 0.1 });
      tone(1318, i * 0.4 + 0.16, 0.15, { type: 'square', gain: 0.1 });
    }
  },
  victory() {
    if (!effectsOn) return;
    [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.13, 0.3, { type: 'triangle' }));
  },
};
