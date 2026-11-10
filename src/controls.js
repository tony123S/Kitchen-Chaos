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
// HAPPY always means "next". "Back" is one of:
//   sad  - a sad pout (SAD expression score)
//   tilt - tilting the head to the side for about a second (SDK face landmarks)
//   eyes - keeping the eyes closed for about a second (SDK blink signal)
export const BACK_GESTURES = Object.freeze(['sad', 'tilt', 'eyes']);
const GESTURE_NAME = { tilt: 'TILT', eyes: 'EYES' };

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
  tiltMs: 1000,
  tiltDegrees: 15,
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
  const armed = { HAPPY: true, SAD: true, GESTURE: true };
  let eyesSince = null; // start of the current held gesture (eyes closed or head tilted)
  let rollBaseline = null; // the cook's normal head angle, learned slowly

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
    rollBaseline = null;
  }

  const gestureName = () => GESTURE_NAME[settings.backGesture] ?? null;

  /** Turns a reading into "is the back gesture being held right now?" (or null if unknown). */
  function gestureOn(reading) {
    if (!reading) return null;
    if (settings.backGesture === 'eyes') return typeof reading.eyesClosed === 'boolean' ? reading.eyesClosed : null;
    if (settings.backGesture === 'tilt') {
      if (typeof reading.roll !== 'number') return null;
      if (rollBaseline === null) rollBaseline = reading.roll;
      const tilted = Math.abs(reading.roll - rollBaseline) >= settings.tiltDegrees;
      // Learn the normal upright angle only while the head is not tilted.
      if (!tilted) rollBaseline += 0.05 * (reading.roll - rollBaseline);
      return tilted;
    }
    return null;
  }

  // Held gesture (eyes closed or head tilted) must last about a second; short
  // gaps under 300 ms are tolerated. Quick natural blinks or head movements are
  // far shorter and are ignored. Returns a snapshot only when it fires.
  function updateGesture(closed, now) {
    if (closed) {
      lastClosedAt = now;
      if (eyesSince === null) eyesSince = now;
    } else if (eyesSince === null || now - lastClosedAt > 300) {
      eyesSince = null;
      armed.GESTURE = true;
    }
    const holdMs = settings.backGesture === 'tilt' ? settings.tiltMs : settings.eyesClosedMs;
    if (eyesSince !== null && armed.GESTURE && now >= cooldownUntil && now - eyesSince >= holdMs) {
      armed.GESTURE = false;
      cooldownUntil = now + settings.cooldownMs;
      eyesSince = null;
      return snapshot(now, 'back', gestureName());
    }
    return null;
  }

  /**
   * @param {{faceOk: boolean, scores: Record<string, number>|null, eyesClosed?: boolean|null, roll?: number|null} | null} reading
   * @param {number} now time in milliseconds
   */
  function update(reading, now) {
    const gestureMode = gestureName() !== null;
    const on = gestureMode ? gestureOn(reading) : null;
    if (on !== null) {
      const fired = updateGesture(on, now);
      if (fired) return fired;
    }

    if (!reading || !reading.faceOk || !reading.scores) {
      resetExpression();
      return snapshot(now, null, gestureMode && eyesSince !== null ? gestureName() : null);
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

    // While the back gesture is being held, ignore expressions.
    if (gestureMode && eyesSince !== null) return snapshot(now, null, gestureName());

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
      const ready = armed.GESTURE && now >= cooldownUntil;
      const holdMs = settings.backGesture === 'tilt' ? settings.tiltMs : settings.eyesClosedMs;
      return {
        action,
        expression: action ? eyes : null,
        candidate: eyes,
        holdProgress: action ? 1 : ready && eyesSince !== null ? Math.min(1, (now - eyesSince) / holdMs) : 0,
        coolingDown: now < cooldownUntil,
        waitingToRelax: !armed.GESTURE,
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
