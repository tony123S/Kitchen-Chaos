// Phase 1: SmartSpectra SDK check screen.
// Shows the live camera, SDK status, the real expression scores, and what
// the expression controls would do. No simulated data anywhere.

import { createCamera } from './camera.js';
import { createExpressionControls } from './controls.js';

const $ = (id) => document.getElementById(id);
const SHOWN = ['HAPPY', 'SURPRISE', 'NEUTRAL', 'SAD', 'ANGRY', 'FEAR', 'DISGUST', 'CONTEMPT'];
const STATUS_TEXT = {
  idle: 'Camera off',
  starting: 'Starting camera...',
  running: 'Camera ready: detecting expression',
  detected: 'Expression detected!',
  stopped: 'Camera off',
  error: 'Camera unavailable',
};
const ACTION_TEXT = {
  next: '😊 Happy expression detected! Next step.',
  repeat: '😲 Surprise detected! Showing the instruction again.',
};

const controls = createExpressionControls();
let packets = 0;
let detectedTimer = null;

function setStatus(status) {
  $('status').textContent = STATUS_TEXT[status] ?? status;
  $('status').dataset.state = status;
  $('btn-start').disabled = status === 'starting' || status === 'running' || status === 'detected';
  $('btn-stop').disabled = !(status === 'starting' || status === 'running' || status === 'detected');
}

function buildBars() {
  $('bars').innerHTML = SHOWN.map((name) => `
    <div class="bar-row" data-name="${name}">
      <span class="bar-label">${name}</span>
      <span class="bar"><span class="bar-fill" id="fill-${name}"></span></span>
      <span class="bar-value" id="value-${name}">-</span>
    </div>`).join('');
}

const camera = createCamera({
  onStatus: setStatus,
  onPreview: (stream) => {
    const video = $('preview');
    video.srcObject = stream;
    video.hidden = !stream;
    if (stream) video.play().catch(() => {});
    $('preview-empty').hidden = Boolean(stream);
  },
  onHint: (hint, faceOk) => {
    $('hint').textContent = hint;
    $('hint').dataset.ok = String(faceOk);
  },
  onError: (message) => {
    $('error').textContent = message;
    $('error').hidden = false;
  },
  onReading: (reading) => {
    packets += 1;
    $('packets').textContent = String(packets);
    $('stable').textContent = reading.stable ? 'yes' : 'no';
    for (const name of SHOWN) {
      const value = reading.scores[name];
      $(`fill-${name}`).style.width = `${Math.max(0, Math.min(100, value ?? 0))}%`;
      $(`value-${name}`).textContent = value === undefined ? '-' : value.toFixed(0);
    }
    const out = controls.update(reading, performance.now());
    $('hold').style.width = `${Math.round(out.holdProgress * 100)}%`;
    $('candidate').textContent = out.candidate
      ? `${out.candidate}${out.waitingToRelax ? ' (relax your face to use it again)' : ''}`
      : 'none (staying on this step)';
    if (out.action) showAction(out.action);
  },
});

function showAction(action) {
  const log = $('log');
  const item = document.createElement('li');
  item.textContent = `${new Date().toLocaleTimeString()}  ${ACTION_TEXT[action]}`;
  log.prepend(item);
  $('banner').textContent = ACTION_TEXT[action];
  $('banner').hidden = false;
  setStatus('detected');
  clearTimeout(detectedTimer);
  detectedTimer = setTimeout(() => {
    $('banner').hidden = true;
    if (camera.isRunning()) setStatus('running');
  }, 1800);
}

$('btn-start').addEventListener('click', async () => {
  $('error').hidden = true;
  packets = 0;
  controls.reset();
  const config = await window.kitchenChaos.getConfig();
  $('telemetry').textContent = config.telemetry ? 'on' : 'off';
  await camera.start(config);
});
$('btn-stop').addEventListener('click', () => camera.stop());
window.addEventListener('beforeunload', () => camera.stop());

buildBars();
setStatus('idle');
