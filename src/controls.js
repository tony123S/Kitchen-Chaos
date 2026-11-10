// Expression controls: turns live SmartSpectra expression scores into
// "next" and "back" actions. Pure logic with no camera or DOM code, so it
// can be unit-tested with plain numbers.
//
// Rules:
// - Scores (0 to 100, from the SDK) are smoothed over about half a second.
// - An expression only counts when its smoothed score passes its threshold
//   AND it is the strongest expression on the face.
// - It must be held for a short time before the action fires.
// - After any action there is a cooldown, and that expression must relax
//   (drop below the re-arm level) before it can fire again. Holding a smile
//   never skips several steps.
// - No face, or no clear winner, means "not sure", and nothing happens.

// Which SDK signal does what. Change it here and the whole app follows.
// HAPPY always means "next". "Back" is either a sad pout (SAD expression)
// or keeping your eyes closed for about a second (SDK blink signal).
export const BACK_GESTURES = Object.freeze(['sad', 'eyes']);

export function actionsFor(backGesture) {
  return backGesture === 'sad' ? { HAPPY: 'next', SAD: 'back' } : { HAPPY: 'next' };
}

export const DEFAULT_SETTINGS = Object.freeze({
  smoothingMs: 500,
  thresholds: { HAPPY: 60, SAD: 50 },
  holdMs: { HAPPY: 800, SAD: 800 },
  rearmBelow: 30,
  cooldownMs: 2000,
  backGesture: 'sad',
  eyesClosedMs: 1000,
});

export function createExpressionControls(overrides = {}) {
  const settings = {
    ...DEFAULT_SETTINGS,
    ...overrides,
    thresholds: { ...DEFAULT_SETTINGS.thresholds, ...overrides.thresholds },
    holdMs: { ...DEFAULT_SETTINGS.holdMs, ...overrides.holdMs },
  };

  let smoothed = {};
  let lastTime = null;
  let candidate = null;
  let candidateSince = 0;
  let cooldownUntil = 0;
  let ACTIONS = actionsFor(settings.backGesture);
  const armed = { HAPPY: true, SAD: true, EYES: true };
  let eyesSince = null;

  function setBackGesture(mode) {
    settings.backGesture = BACK_GESTURES.includes(mode) ? mode : 'sad';
    ACTIONS = actionsFor(settings.backGesture);
    reset();
  }

  let lastClosedAt = 0;

  // Clears the expression smoothing (used when the face is lost).
  function resetExpression() {
    smoothed = {};
    lastTime = null;
    candidate = null;
    candidateSince = 0;
  }

  function reset() {
    resetExpression();
    eyesSince = null;
  }

  // Eyes-closed gesture: the SDK blink signal must stay "detected" for about
  // a second (short gaps under 300 ms are tolerated). Normal quick blinks are
  // far shorter and are ignored. Returns a snapshot only when it fires.
  function updateEyes(closed, now) {
    if (closed) {
      lastClosedAt = now;
      if (eyesSince === null) eyesSince = now;
    } else if (eyesSince === null || now - lastClosedAt > 300) {
      eyesSince = null;
      armed.EYES = true;
    }
    if (eyesSince !== null && armed.EYES && now >= cooldownUntil && now - eyesSince >= settings.eyesClosedMs) {
      armed.EYES = false;
      cooldownUntil = now + settings.cooldownMs;
      eyesSince = null;
      return snapshot(now, 'back', 'EYES');
    }
    return null;
  }

  /**
   * @param {{faceOk: boolean, scores: Record<string, number>|null, eyesClosed?: boolean|null} | null} reading
   * @param {number} now time in milliseconds
   */
  function update(reading, now) {
    const eyesMode = settings.backGesture === 'eyes';
    if (eyesMode && reading && typeof reading.eyesClosed === 'boolean') {
      const fired = updateEyes(reading.eyesClosed, now);
      if (fired) return fired;
    }

    if (!reading || !reading.faceOk || !reading.scores) {
      resetExpression();
      return snapshot(now, null, eyesMode && eyesSince !== null ? 'EYES' : null);
    }

    const dt = lastTime === null ? Infinity : Math.max(0, now - lastTime);
    const alpha = dt === Infinity ? 1 : 1 - Math.exp(-dt / settings.smoothingMs);
    lastTime = now;
    for (const [name, value] of Object.entries(reading.scores)) {
      const previous = smoothed[name] ?? value;
      smoothed[name] = previous + alpha * (value - previous);
    }

    // Re-arm any expression that has relaxed.
    for (const name of Object.keys(ACTIONS)) {
      if ((smoothed[name] ?? 0) < settings.rearmBelow) armed[name] = true;
    }

    // While the eyes are closed, ignore expressions.
    if (eyesMode && eyesSince !== null) return snapshot(now, null, 'EYES');

    const top = strongest(smoothed);
    const next = top && top.name in ACTIONS && top.value >= settings.thresholds[top.name] ? top.name : null;
    if (next !== candidate) {
      candidate = next;
      candidateSince = now;
    }

    let action = null;
    if (candidate && armed[candidate] && now >= cooldownUntil && now - candidateSince >= settings.holdMs[candidate]) {
      action = ACTIONS[candidate];
      armed[candidate] = false;
      cooldownUntil = now + settings.cooldownMs;
    }
    return snapshot(now, action);
  }

  function snapshot(now, action, eyes = null) {
    if (eyes) {
      const ready = armed.EYES && now >= cooldownUntil;
      return {
        action,
        expression: action ? 'EYES' : null,
        candidate: 'EYES',
        holdProgress: action ? 1 : ready && eyesSince !== null ? Math.min(1, (now - eyesSince) / settings.eyesClosedMs) : 0,
        coolingDown: now < cooldownUntil,
        waitingToRelax: !armed.EYES,
        smoothed: { ...smoothed },
      };
    }
    const holdMs = candidate ? settings.holdMs[candidate] : 0;
    const ready = Boolean(candidate && armed[candidate] && now >= cooldownUntil);
    return {
      action,
      expression: action ? Object.keys(ACTIONS).find((k) => ACTIONS[k] === action) : null,
      candidate,
      holdProgress: ready ? Math.min(1, (now - candidateSince) / holdMs) : 0,
      coolingDown: now < cooldownUntil,
      waitingToRelax: Boolean(candidate && !armed[candidate]),
      smoothed: { ...smoothed },
    };
  }

  return { update, reset, setBackGesture, settings };
}

function strongest(scores) {
  let best = null;
  for (const [name, value] of Object.entries(scores)) {
    if (!best || value > best.value) best = { name, value };
  }
  return best;
}
