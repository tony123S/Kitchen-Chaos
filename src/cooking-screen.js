// Screen 6 and 7: cooking mode and the cooking timer.
// Expressions and buttons both call the same next / repeat / back functions,
// so the face controls and the manual fallback always behave the same way.

import { $, statusText, showPreview, setBar } from './ui-bits.js';
import { createCookingSession } from './cooking.js';
import { createTimer, formatTime } from './timer.js';
import { chefSvg, foodSvg } from './art.js';
import { sfx } from './sound.js';

const CHEF_LINES = {
  next: ['Yum, next step!', 'Great job, chef!', 'Onwards!', 'You are a natural!'],
  repeat: ['Whoa! Let me say that again.', 'Surprise! Here it is once more.', 'Oops, rewinding!'],
  confused: ['Where did you go?', 'I can\'t see you. Use the buttons if you like.'],
  timer: ['Ding! Time\'s up!'],
};
const pick = (list) => list[Math.floor(Math.random() * list.length)];

export function createCookingScreen({ expressions, onFinish, onExit }) {
  let session = null;
  let unsubscribe = null;
  let activeTimer = null; // { stepIndex, label, timer }
  let chefTimer = null;
  let statusFlash = null;
  let lastFaceOk = true;

  // ---------- chef ----------
  function chef(mood, line) {
    $('cook-chef').innerHTML = chefSvg(mood);
    $('cook-chef').dataset.mood = mood;
    if (line) $('chef-says').textContent = line;
    clearTimeout(chefTimer);
    if (mood !== 'idle') chefTimer = setTimeout(() => chef('idle'), 1800);
  }

  // ---------- step rendering ----------
  function renderStep({ again = false } = {}) {
    const { recipe, step, index, total } = session;
    $('cook-recipe').textContent = `Recipe: ${recipe.name}`;
    $('cook-stepno').textContent = `Step ${index + 1} of ${total}`;
    $('cook-progress').innerHTML = recipe.steps.map((s, i) =>
      `<li class="${i < index ? 'done' : i === index ? 'current' : ''}" title="${s.title}"><span>${i + 1}</span></li>`).join('');
    $('step-pic').innerHTML = foodSvg(recipe.image);
    $('step-title').textContent = step.title;
    $('step-instruction').textContent = step.instruction;
    $('step-amounts').innerHTML = step.amounts.length
      ? `<span class="amounts-label">You need:</span>${step.amounts.map((a) => `<span class="chip">${a}</span>`).join('')}`
      : '';
    $('step-tip').hidden = !step.tip;
    $('step-tip').textContent = step.tip ? `💡 ${step.tip}` : '';
    $('step-safety').hidden = !step.safety;
    $('step-safety').textContent = step.safety ? `⚠️ ${step.safety}` : '';
    $('btn-back').disabled = session.isFirst;
    $('btn-next').textContent = session.isLast ? 'Finish ✔' : 'Next ▶';
    renderTimer();

    const card = $('step-card');
    card.classList.remove('enter', 'again');
    void card.offsetWidth; // restart the CSS animation
    card.classList.add(again ? 'again' : 'enter');
  }

  // ---------- timer ----------
  function renderTimer() {
    const step = session.step;
    const here = activeTimer && activeTimer.stepIndex === session.index;
    $('timer').hidden = !step.timer;
    if (step.timer) {
      const t = here ? activeTimer.timer : null;
      $('timer-label').textContent = `⏲ ${step.timer.label}`;
      $('timer-time').textContent = formatTime(t ? t.secondsLeft : step.timer.minutes * 60);
      $('timer').classList.toggle('finished', Boolean(t && t.done));
      $('btn-timer-start').hidden = Boolean(t && (t.running || t.done));
      $('btn-timer-start').textContent = t && !t.running && t.secondsLeft < t.totalSeconds ? 'Resume' : 'Start timer';
      $('btn-timer-pause').hidden = !(t && t.running);
      $('btn-timer-reset').hidden = !t;
    }
    $('timer-done').hidden = !(here && activeTimer.timer.done);
    // A timer from another step keeps running and shows as a small chip.
    const elsewhere = activeTimer && !here && !activeTimer.timer.done;
    $('timer-chip').hidden = !elsewhere;
    if (elsewhere) {
      $('timer-chip').textContent =
        `⏲ Step ${activeTimer.stepIndex + 1} timer: ${formatTime(activeTimer.timer.secondsLeft)} left (${activeTimer.timer.running ? 'running' : 'paused'})`;
    }
  }

  function startTimer() {
    const step = session.step;
    if (!step.timer) return;
    if (!activeTimer || activeTimer.stepIndex !== session.index) {
      if (activeTimer) activeTimer.timer.dispose();
      const stepIndex = session.index;
      activeTimer = {
        stepIndex,
        timer: createTimer({
          seconds: step.timer.minutes * 60,
          onTick: () => renderTimer(),
          onDone: () => {
            sfx.timerDone();
            chef('surprised', pick(CHEF_LINES.timer));
            if (session.index !== stepIndex) {
              $('timer-chip').hidden = false;
              $('timer-chip').textContent = `⏰ Step ${stepIndex + 1} timer is done!`;
            }
            renderTimer();
          },
        }),
      };
    }
    activeTimer.timer.start();
    renderTimer();
  }

  $('btn-timer-start').addEventListener('click', startTimer);
  $('btn-timer-pause').addEventListener('click', () => { activeTimer?.timer.pause(); renderTimer(); });
  $('btn-timer-reset').addEventListener('click', () => { activeTimer?.timer.reset(); renderTimer(); });

  // ---------- actions (shared by face and buttons) ----------
  function next(source) {
    const result = session.next();
    sfx.step();
    if (result === 'finished') return finish();
    chef('happy', source === 'face' ? 'Happy expression detected! Next step.' : pick(CHEF_LINES.next));
    renderStep();
    return undefined;
  }
  function repeat(source) {
    sfx.boing();
    chef('surprised', source === 'face' ? 'Surprise detected! Here is this step again.' : pick(CHEF_LINES.repeat));
    renderStep({ again: true });
  }
  function back() {
    if (session.back() === 'moved') { chef('idle', 'Going back one step.'); renderStep(); }
  }
  async function finish() {
    if (activeTimer) activeTimer.timer.dispose();
    activeTimer = null;
    await expressions.stop();
    onFinish(session.recipe);
  }

  $('btn-next').addEventListener('click', () => next('button'));
  $('btn-repeat').addEventListener('click', () => repeat('button'));
  $('btn-back').addEventListener('click', back);
  $('btn-exit').addEventListener('click', async () => {
    if (activeTimer) activeTimer.timer.dispose();
    activeTimer = null;
    await expressions.stop();
    onExit(session.recipe);
  });
  $('btn-cam-toggle').addEventListener('click', async () => {
    if (expressions.isRunning()) await expressions.stop();
    else await expressions.start();
  });

  document.addEventListener('keydown', (event) => {
    if (!session || $('screen-cooking').hidden) return;
    if (event.target.closest('input, textarea')) return;
    if (event.key === 'ArrowRight' || event.key === ' ') { event.preventDefault(); next('button'); }
    else if (event.key === 'ArrowLeft') back();
    else if (event.key.toLowerCase() === 'r') repeat('button');
  });

  // ---------- live expression status ----------
  function renderStatus(status) {
    const { faceOk, errorKind, error } = expressions.state;
    const shown = status === 'running' && statusFlash ? 'detected' : status;
    $('cook-status').textContent = statusText(shown, { faceOk, errorKind });
    $('cook-status').dataset.state = shown;
    const on = status === 'running' || status === 'starting';
    $('btn-cam-toggle').textContent = on ? 'Stop camera' : 'Turn camera on';
    if (status === 'error' && error) $('cook-hint').textContent = `${error} You can keep cooking with the buttons.`;
    if (!on) for (const el of document.querySelectorAll('.expr .meter span')) setBar(el, 0);
    document.querySelector('.expr-controls').classList.toggle('off', !on);
  }

  function flashDetected(expr) {
    for (const el of document.querySelectorAll('.expr')) el.classList.toggle('fired', el.dataset.expr === expr);
    clearTimeout(statusFlash);
    statusFlash = setTimeout(() => {
      statusFlash = null;
      for (const el of document.querySelectorAll('.expr')) el.classList.remove('fired');
      renderStatus(expressions.state.status);
    }, 1500);
    renderStatus(expressions.state.status);
  }

  return {
    enter(recipe, { restart = true } = {}) {
      if (restart || !session || session.recipe.id !== recipe.id) session = createCookingSession(recipe);
      expressions.resetControls();
      chef('idle', `Let's make ${recipe.name}!`);
      renderStep();
      unsubscribe = expressions.subscribe({
        status: renderStatus,
        preview: (stream) => showPreview('cook-preview', 'cook-preview-empty', stream, 'Camera off. Use the buttons below.'),
        hint: (hint, faceOk) => {
          $('cook-hint').textContent = hint;
          $('cook-hint').dataset.ok = String(faceOk);
          if (lastFaceOk && !faceOk) chef('confused', pick(CHEF_LINES.confused));
          lastFaceOk = faceOk;
          renderStatus(expressions.state.status);
        },
        error: () => renderStatus(expressions.state.status),
        reading: (reading, result) => {
          for (const el of document.querySelectorAll('.expr')) {
            const name = el.dataset.expr;
            setBar(el.querySelector('.meter span'), result.smoothed[name]);
            el.classList.toggle('holding', result.candidate === name && result.holdProgress > 0 && !result.action);
          }
          if (result.action === 'next') { flashDetected('HAPPY'); next('face'); }
          else if (result.action === 'repeat') { flashDetected('SURPRISE'); repeat('face'); }
        },
      });
    },
    leave() {
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    },
  };
}
