// Face controls: turns live SmartSpectra readings into "next" and "back"
// actions. Pure logic with no camera or DOM code, so it can be unit-tested
// with plain numbers.
//
// - Next: a smile. HAPPY scores (0 to 100, from the SDK) are smoothed over
//   about half a second. HAPPY counts when its smoothed score passes the
//   threshold and no other expression is clearly stronger, and it must be
//   held for a short time before the action fires.
// - Back: tilting the head to the side for about a second (head roll angle
//   from the SDK face landmarks, compared with the cook's normal angle).
// - After any action there is a cooldown, and the smile must relax (or the
//   head straighten up) before it can fire again. Holding a smile never skips
//   several steps.
// - No face, or no clear winner, means "not sure", and nothing happens.

const ACTIONS = { HAPPY: 'next' };
export const TILT = 'TILT';

export const DEFAULT_SETTINGS = Object.freeze({
  smoothingMs: 350,
  thresholds: { HAPPY: 35 },
  holdMs: { HAPPY: 500 },
  // HAPPY still counts if another emotion (not NEUTRAL) is ahead by less than this.
  // NEUTRAL is ignored here: a real smile often scores lower than NEUTRAL.
  winMargin: 20,
  cooldownMs: 1500,
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
  const armed = { HAPPY: true, TILT: true };
  let tiltSince = null; // start of the current head tilt
  let lastTiltedAt = 0;
  let rollBaseline = null; // the cook's normal head angle, learned slowly

  // Clears the expression smoothing (used when the face is lost).
  function resetExpression() {
    smoothed = {};
    lastTime = null;
    candidate = null;
    candidateSince = 0;
  }

  function reset() {
    resetExpression();
    tiltSince = null;
    rollBaseline = null;
  }

  /** Is the head tilted right now? null when the reading has no head angle. */
  function tiltedNow(reading) {
    if (!reading || typeof reading.roll !== 'number') return null;
    if (rollBaseline === null) rollBaseline = reading.roll;
    // Difference wrapped to -180..180, so a camera image that puts the angle
    // near +/-180 degrees does not look like a huge tilt.
    const diff = ((((reading.roll - rollBaseline) % 360) + 540) % 360) - 180;
    const tilted = Math.abs(diff) >= settings.tiltDegrees;
    // Learn the normal upright angle only while the head is not tilted.
    if (!tilted) rollBaseline += 0.05 * diff;
    return tilted;
  }

  // The tilt must last about a second; short gaps under 300 ms are tolerated.
  // Quick natural head movements are far shorter and are ignored.
  function updateTilt(tilted, now) {
    if (tilted) {
      lastTiltedAt = now;
      if (tiltSince === null) tiltSince = now;
    } else if (tiltSince === null || now - lastTiltedAt > 300) {
      tiltSince = null;
      armed.TILT = true;
    }
    if (tiltSince !== null && armed.TILT && now >= cooldownUntil && now - tiltSince >= settings.tiltMs) {
      armed.TILT = false;
      cooldownUntil = now + settings.cooldownMs;
      tiltSince = null;
      return tiltSnapshot(now, 'back');
    }
    return null;
  }

  /**
   * @param {{faceOk: boolean, scores: Record<string, number>|null, roll?: number|null} | null} reading
   * @param {number} now time in milliseconds
   */
  function update(reading, now) {
    const tilted = tiltedNow(reading);
    if (tilted !== null) {
      const fired = updateTilt(tilted, now);
      if (fired) return fired;
    }

    // Scores in the packet mean the SDK found a face, even if it is a little
    // off-centre, so only a packet without scores resets the smile.
    if (!reading || !reading.scores) {
      resetExpression();
      return tiltSince !== null ? tiltSnapshot(now, null) : snapshot(now, null);
    }

    const dt = lastTime === null ? Infinity : Math.max(0, now - lastTime);
    const alpha = dt === Infinity ? 1 : 1 - Math.exp(-dt / settings.smoothingMs);
    lastTime = now;
    for (const [name, value] of Object.entries(reading.scores)) {
      const previous = smoothed[name] ?? value;
      smoothed[name] = previous + alpha * (value - previous);
    }

    // While the head is tilted, ignore expressions.
    if (tiltSince !== null) return tiltSnapshot(now, null);

    const others = Object.fromEntries(Object.entries(smoothed).filter(([n]) => n !== 'HAPPY' && n !== 'NEUTRAL'));
    const rival = strongest(others)?.value ?? 0;
    const happy = smoothed.HAPPY ?? 0;
    const next = happy >= settings.thresholds.HAPPY && rival - happy < settings.winMargin ? 'HAPPY' : null;
    // Re-arm once the smile has stopped counting. A fixed "relax below N"
    // never re-armed for faces whose resting HAPPY score is a bit high.
    if (next === null) armed.HAPPY = true;
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

  function tiltSnapshot(now, action) {
    const ready = armed.TILT && now >= cooldownUntil;
    return {
      action,
      expression: action ? TILT : null,
      candidate: TILT,
      holdProgress: action ? 1 : ready && tiltSince !== null ? Math.min(1, (now - tiltSince) / settings.tiltMs) : 0,
      coolingDown: now < cooldownUntil,
      waitingToRelax: !armed.TILT,
      smoothed: { ...smoothed },
    };
  }

  function snapshot(now, action) {
    const holdMs = candidate ? settings.holdMs[candidate] : 0;
    const ready = Boolean(candidate && armed[candidate] && now >= cooldownUntil);
    return {
      action,
      expression: action ? 'HAPPY' : null,
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
