// The only file that talks to the SmartSpectra SDK.
// It starts and stops the official renderer-side SDK, shows the live camera
// preview, and turns each metrics packet into a simple reading:
//   { faceOk, stable, scores: { HAPPY, SURPRISE, NEUTRAL, ... } }
// Scores are the SDK's own expression confidences (0 to 100).

import {
  SmartSpectraSDK,
  ProcessingStatus,
  ValidationCode,
  SmartSpectraErrorCode,
  faceMetrics,
} from '@smartspectra/node-sdk/renderer';
import { readExpression } from './reading.js';

// Validation codes that mean "we cannot trust the face reading right now".
const FACE_PROBLEMS = new Set([
  ValidationCode.kNoFaceFound,
  ValidationCode.kMultipleFacesFound,
  ValidationCode.kFaceNotCentered,
  ValidationCode.kFaceSizeOutOfRange,
  ValidationCode.kExcessiveMotion,
  ValidationCode.kFaceTooClose,
  ValidationCode.kFaceTooFar,
  ValidationCode.kFaceTooHigh,
  ValidationCode.kFaceTooLow,
  ValidationCode.kFaceNotForward,
]);

// Friendly words for the validation hints the SDK sends.
const HINTS = {
  [ValidationCode.kOk]: 'Face found. Looking good!',
  [ValidationCode.kNoFaceFound]: 'Look at the camera. No face found yet.',
  [ValidationCode.kMultipleFacesFound]: 'Only one face at a time, please.',
  [ValidationCode.kFaceNotCentered]: 'Move your face to the middle of the frame.',
  [ValidationCode.kFaceSizeOutOfRange]: 'Move a little closer or further away.',
  [ValidationCode.kTooDark]: 'It is a bit dark. Try turning on a light.',
  [ValidationCode.kTooBright]: 'It is very bright. Try moving away from the window.',
  [ValidationCode.kCameraTuning]: 'Camera is adjusting...',
  [ValidationCode.kFrameRateTooLow]: 'The camera is running slowly.',
  [ValidationCode.kExcessiveMotion]: 'Try to keep your head still for a moment.',
  [ValidationCode.kFaceTooClose]: 'A little too close. Lean back slightly.',
  [ValidationCode.kFaceTooFar]: 'A little too far. Come closer.',
  [ValidationCode.kFaceTooHigh]: 'Move down a little.',
  [ValidationCode.kFaceTooLow]: 'Move up a little.',
  [ValidationCode.kFaceNotForward]: 'Face the camera straight on.',
};

const ERROR_TEXT = {
  [SmartSpectraErrorCode.kAuthenticationFailed]: 'SDK connection error: the API key was not accepted.',
  [SmartSpectraErrorCode.kCreditExhausted]: 'SDK connection error: this API key has no credit left.',
  [SmartSpectraErrorCode.kNetworkError]: 'SDK connection error: no internet connection to check the API key.',
  [SmartSpectraErrorCode.kServerError]: 'SDK connection error: the SmartSpectra server had a problem.',
  [SmartSpectraErrorCode.kInputUnavailable]: 'Camera unavailable. Is another app using it?',
};

/**
 * @param {object} handlers
 * @param {(status: string) => void} handlers.onStatus  'starting' | 'running' | 'stopped' | 'error'
 * @param {(reading: object) => void} handlers.onReading
 * @param {(stream: MediaStream|null) => void} handlers.onPreview
 * @param {(hint: string, faceOk: boolean) => void} handlers.onHint
 * @param {(message: string, kind: 'camera'|'sdk') => void} handlers.onError
 */
// Short internet or server hiccups: try again by ourselves a few times.
const RETRY_CODES = new Set([SmartSpectraErrorCode.kNetworkError, SmartSpectraErrorCode.kServerError]);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 3000;

export function createCamera(handlers) {
  let sdk = null;
  let faceOk = false;
  let stopping = Promise.resolve(); // the previous session's shutdown
  let lastConfig = null;
  let retries = 0;
  let retryTimer = null;
  let wanted = false; // true while the cook wants the camera on
  let retryPending = false;

  function scheduleRetry(code) {
    if (!wanted || !RETRY_CODES.has(code) || retries >= MAX_RETRIES) return false;
    retries += 1;
    retryPending = true;
    handlers.onStatus('starting');
    handlers.onHint(`Connection to SmartSpectra dropped. Reconnecting (try ${retries} of ${MAX_RETRIES})...`, false);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { retryPending = false; if (wanted) start(lastConfig, { retry: true }); }, RETRY_DELAY_MS);
    return true;
  }

  async function start(config, { retry = false } = {}) {
    const { apiKey, telemetry = false } = config;
    if (sdk) return true; // already running or starting
    if (!retry) retries = 0;
    wanted = true;
    lastConfig = config;
    // Starting a new session while the last one is still shutting down can
    // make the SDK fail, so always wait for the previous stop to finish.
    await stopping;
    if (sdk || !wanted) return Boolean(sdk);
    if (!apiKey) {
      handlers.onError('SDK connection error: no API key. Add SMARTSPECTRA_API_KEY to your .env file.', 'sdk');
      handlers.onStatus('error');
      return false;
    }
    if (typeof MediaStreamTrackProcessor === 'undefined' || !navigator.mediaDevices) {
      handlers.onError('Camera unavailable: this window cannot read camera frames. Please run Kitchen Chaos with `npm start` (Electron).', 'camera');
      handlers.onStatus('error');
      return false;
    }
    handlers.onStatus('starting');
    const me = new SmartSpectraSDK({
      apiKey,
      requestedMetrics: [...faceMetrics],
      enableTelemetry: telemetry,
    });
    sdk = me;
    const current = () => sdk === me; // ignore events from an older session

    me.on('streamAvailable', (stream) => { if (current()) handlers.onPreview(stream); });
    me.on('processingStatus', (status) => {
      if (!current()) return;
      if (status === ProcessingStatus.kRunning) handlers.onStatus('running');
      else if (status === ProcessingStatus.kError) handlers.onStatus('error');
    });
    me.on('validationStatus', (code, _ts, hint) => {
      if (!current()) return;
      faceOk = !FACE_PROBLEMS.has(code);
      handlers.onHint(HINTS[code] ?? hint ?? '', faceOk);
    });
    me.on('metrics', (buf) => {
      if (!current()) return;
      const reading = readExpression(buf, faceOk);
      if (reading) handlers.onReading(reading);
    });
    me.on('error', async (code, message, retryable) => {
      console.warn('SmartSpectra error', code, message, retryable);
      if (!current()) return;
      // Internet or server hiccup: shut this session down cleanly and try again.
      if (RETRY_CODES.has(code) && wanted) {
        await shutdown();
        if (scheduleRetry(code)) return;
      }
      handlers.onError(ERROR_TEXT[code] ?? `SDK error: ${message}`, code === SmartSpectraErrorCode.kInputUnavailable ? 'camera' : 'sdk');
      // A failed key or a lost camera cannot recover by itself:
      // switch the camera off so it is not left running in the background.
      if (!retryable || code in ERROR_TEXT) {
        await stop();
        handlers.onStatus('error');
      }
    });

    try {
      await me.start();
      retries = 0;
      return true;
    } catch (err) {
      console.warn('SmartSpectra start failed', err);
      if (!current()) return false;
      if (RETRY_CODES.has(err.code)) {
        await shutdown();
        if (scheduleRetry(err.code)) return false;
      }
      const text = ERROR_TEXT[err.code] ?? (err.name === 'NotAllowedError'
        ? 'Camera unavailable: permission was denied.'
        : `Camera unavailable: ${err.message}`);
      const kind = ERROR_TEXT[err.code] && err.code !== SmartSpectraErrorCode.kInputUnavailable ? 'sdk' : 'camera';
      handlers.onError(text, kind);
      await stop();
      handlers.onStatus('error');
      return false;
    }
  }

  // Ends the current SDK session without changing what the cook asked for.
  async function shutdown() {
    if (!sdk) return stopping;
    const current = sdk;
    sdk = null;
    faceOk = false;
    stopping = (async () => {
      try { await current.stop(); } catch { /* already stopped */ }
      try { current.destroy(); } catch { /* already destroyed */ }
    })();
    await stopping;
    handlers.onPreview(null);
    return stopping;
  }

  async function stop() {
    const had = sdk !== null || retryPending;
    wanted = false;
    retryPending = false;
    clearTimeout(retryTimer);
    await shutdown();
    if (had) handlers.onStatus('stopped');
  }

  return { start, stop, isRunning: () => sdk !== null || retryPending };
}
