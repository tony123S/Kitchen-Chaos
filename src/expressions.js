// One shared camera + expression-controls service for the whole app.
// Screens subscribe to it while they are visible and unsubscribe when they
// leave, so the camera can stay on from the setup screen into cooking mode.

import { createCamera } from './camera.js';
import { createExpressionControls } from './controls.js';

export function createExpressionService(getConfig) {
  const listeners = new Set();
  const controls = createExpressionControls();
  const state = { status: 'idle', hint: '', faceOk: false, error: null, errorKind: null, stream: null };

  const emit = (type, ...args) => {
    for (const l of listeners) if (typeof l[type] === 'function') l[type](...args);
  };

  const camera = createCamera({
    onStatus: (status) => { state.status = status; emit('status', status); },
    onPreview: (stream) => { state.stream = stream; emit('preview', stream); },
    onHint: (hint, faceOk) => {
      state.hint = hint;
      state.faceOk = faceOk;
      if (!faceOk) controls.update(null, performance.now());
      emit('hint', hint, faceOk);
    },
    onError: (message, kind) => { state.error = message; state.errorKind = kind; emit('error', message, kind); },
    onReading: (reading) => {
      const result = controls.update(reading, performance.now());
      emit('reading', reading, result);
    },
  });

  return {
    state,
    async start() {
      state.error = null;
      controls.reset();
      return camera.start(await getConfig());
    },
    stop: () => camera.stop(),
    isRunning: () => camera.isRunning(),
    resetControls: () => controls.reset(),
    /** Subscribe with any of: status, preview, hint, error, reading. Returns an unsubscribe function. */
    subscribe(handlers) {
      listeners.add(handlers);
      handlers.status?.(state.status);
      handlers.preview?.(state.stream);
      if (state.hint) handlers.hint?.(state.hint, state.faceOk);
      return () => listeners.delete(handlers);
    },
  };
}
