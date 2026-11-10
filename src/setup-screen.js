// Screen 5: camera consent, SmartSpectra start-up and a short expression test.

import { $, statusText, showPreview, setBar } from './ui-bits.js';

const TEST_EXPRESSIONS = ['HAPPY', 'SAD', 'NEUTRAL'];
const BACK_TEXT = {
  sad: 'Optional: make a sad pout 🙁 (turn the corners of your mouth down) to go back',
  eyes: 'Optional: close your eyes for about 1 second 😌 to go back',
};

export function createSetupScreen({ expressions, onBegin, onBackGesture }) {
  let unsubscribe = null;
  let passed = { camera: false, face: false, smile: false, back: false };
  let bannerTimer = null;

  $('setup-bars').innerHTML = TEST_EXPRESSIONS.map((n) => `
    <div class="bar-row" data-name="${n}"><span class="bar-label">${n}</span>
    <span class="bar"><span class="bar-fill" id="setup-fill-${n}"></span></span>
    <span class="bar-value" id="setup-val-${n}">-</span></div>`).join('');

  function mark(key) {
    passed[key] = true;
    const li = document.querySelector(`#test-list [data-check="${key}"]`);
    if (li) li.classList.add('ok');
    $('btn-begin').disabled = !passed.smile;
  }

  function render(status) {
    const { faceOk, errorKind, error } = expressions.state;
    const shown = status === 'running' && bannerTimer ? 'detected' : status;
    $('setup-status').textContent = statusText(shown, { faceOk, errorKind });
    $('setup-status').dataset.state = shown;
    $('setup-error').hidden = !(status === 'error' && error);
    $('setup-error').textContent = error ?? '';
    $('btn-setup-retry').hidden = status !== 'error' && status !== 'stopped';
    $('btn-setup-stop').hidden = !(status === 'running' || status === 'starting');
    if (status === 'running') mark('camera');
  }

  function flash(text) {
    $('setup-banner').textContent = text;
    $('setup-banner').hidden = false;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => { bannerTimer = null; $('setup-banner').hidden = true; render(expressions.state.status); }, 2000);
    render(expressions.state.status);
  }

  async function startCamera() {
    $('consent').hidden = true;
    $('setup-live').hidden = false;
    await expressions.start();
  }

  function showBackChoice() {
    const mode = expressions.backGesture;
    for (const r of document.querySelectorAll('input[name="back-gesture"]')) r.checked = r.value === mode;
    $('test-back').textContent = BACK_TEXT[mode];
  }
  for (const r of document.querySelectorAll('input[name="back-gesture"]')) {
    r.addEventListener('change', () => {
      expressions.setBackGesture(r.value);
      onBackGesture?.(r.value);
      passed.back = false;
      $('test-back').classList.remove('ok');
      showBackChoice();
    });
  }

  $('btn-allow').addEventListener('click', startCamera);
  $('btn-setup-retry').addEventListener('click', startCamera);
  $('btn-setup-stop').addEventListener('click', () => expressions.stop());
  $('btn-skip-camera').addEventListener('click', async () => { await expressions.stop(); onBegin(); });
  $('btn-begin').addEventListener('click', () => onBegin());
  $('btn-begin-anyway').addEventListener('click', () => onBegin());

  return {
    enter(recipe) {
      $('setup-recipe').textContent = `Next up: ${recipe.name}. First, let's make sure SmartSpectra can see your expressions.`;
      showBackChoice();
      const running = expressions.isRunning();
      $('consent').hidden = running;
      $('setup-live').hidden = !running;
      unsubscribe = expressions.subscribe({
        status: render,
        preview: (stream) => showPreview('setup-preview', 'setup-preview-empty', stream,
          expressions.state.status === 'error' ? 'Camera off.' : 'Starting camera...'),
        hint: (hint, faceOk) => {
          $('setup-hint').textContent = hint;
          $('setup-hint').dataset.ok = String(faceOk);
          if (faceOk) mark('face');
          render(expressions.state.status);
        },
        error: () => render(expressions.state.status),
        reading: (reading, result) => {
          if (reading.faceOk) mark('face');
          for (const n of TEST_EXPRESSIONS) {
            const v = reading.scores[n];
            setBar($(`setup-fill-${n}`), v);
            $(`setup-val-${n}`).textContent = v === undefined ? '-' : v.toFixed(0);
          }
          $('setup-hold').style.width = `${Math.round(result.holdProgress * 100)}%`;
          if (result.action === 'next') { mark('smile'); flash('😊 Happy expression detected! Great smile.'); }
          $('setup-eyes').textContent = reading.eyesClosed === null ? 'no data' : reading.eyesClosed ? 'yes' : 'no';
          if (result.action === 'back') {
            mark('back');
            flash(expressions.backGesture === 'eyes'
              ? '😌 Eyes closed detected! That is how you go back.'
              : '🙁 Sad face detected! That is how you go back.');
          }
        },
      });
    },
    leave() {
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    },
  };
}
