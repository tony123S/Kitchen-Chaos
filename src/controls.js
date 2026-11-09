// Expression controls: turns live SmartSpectra expression scores into
// "next" and "repeat" actions. Pure logic with no camera or DOM code, so it
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

export const ACTIONS = Object.freeze({
  HAPPY: 'next',
  SURPRISE: 'repeat',
});

export const DEFAULT_SETTINGS = Object.freeze({
  smoothingMs: 500,
  thresholds: { HAPPY: 60, SURPRISE: 55 },
  holdMs: { HAPPY: 800, SURPRISE: 600 },
  rearmBelow: 30,
  cooldownMs: 2000,
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
  const armed = { HAPPY: true, SURPRISE: true };

  function reset() {
    smoothed = {};
    lastTime = null;
    candidate = null;
    candidateSince = 0;
  }

  /**
   * @param {{faceOk: boolean, scores: Record<string, number>} | null} reading
   * @param {number} now time in milliseconds
   */
  function update(reading, now) {
    if (!reading || !reading.faceOk || !reading.scores) {
      reset();
      return snapshot(now, null);
    }

    const dt = lastTime === null ? Infinity : Math.max(0, now - lastTime);
    const alpha = dt === Infinity ? 1 : 1 - Math.exp(-dt / settings.smoothingMs);
    lastTime = now;
    for (const [name, value] of Object.entries(reading.scores)) {
      const previous = smoothed[name] ?? value;
      smoothed[name] = previous + alpha * (value - previous);
    }

    // Re-arm any expression that has relaxed.
    for (const name of Object.keys(armed)) {
      if ((smoothed[name] ?? 0) < settings.rearmBelow) armed[name] = true;
    }

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

  function snapshot(now, action) {
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

  return { update, reset, settings };
}

function strongest(scores) {
  let best = null;
  for (const [name, value] of Object.entries(scores)) {
    if (!best || value > best.value) best = { name, value };
  }
  return best;
}
