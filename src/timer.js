// Countdown timer with pause and resume. It never changes the recipe step:
// when time is up it only calls onDone, so the cook decides when to move on.
// `now` can be swapped out in tests.

export function createTimer({ seconds, onTick = () => {}, onDone = () => {}, now = () => Date.now() }) {
  let remainingMs = seconds * 1000;
  let startedAt = null; // set while running
  let interval = null;
  let done = false;

  function remaining() {
    if (startedAt === null) return remainingMs;
    return Math.max(0, remainingMs - (now() - startedAt));
  }

  function tick() {
    const left = remaining();
    onTick(Math.ceil(left / 1000));
    if (left <= 0 && !done) {
      done = true;
      stopInterval();
      remainingMs = 0;
      startedAt = null;
      onDone();
    }
  }

  function stopInterval() {
    if (interval !== null) clearInterval(interval);
    interval = null;
  }

  return {
    start() {
      if (done || startedAt !== null) return;
      startedAt = now();
      interval = setInterval(tick, 250);
      tick();
    },
    pause() {
      if (startedAt === null) return;
      remainingMs = remaining();
      startedAt = null;
      stopInterval();
      tick();
    },
    reset() {
      stopInterval();
      startedAt = null;
      done = false;
      remainingMs = seconds * 1000;
      tick();
    },
    dispose() { stopInterval(); },
    tick,
    get running() { return startedAt !== null; },
    get done() { return done; },
    get secondsLeft() { return Math.ceil(remaining() / 1000); },
    get totalSeconds() { return seconds; },
  };
}

export function formatTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
