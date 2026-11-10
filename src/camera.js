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
export function createCamera(handlers) {
  let sdk = null;
  let faceOk = false;

  async function start({ apiKey, telemetry = false }) {
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
    sdk = new SmartSpectraSDK({
      apiKey,
      requestedMetrics: [...faceMetrics],
      enableTelemetry: telemetry,
    });

    sdk.on('streamAvailable', (stream) => handlers.onPreview(stream));
    sdk.on('processingStatus', (status) => {
      if (status === ProcessingStatus.kRunning) handlers.onStatus('running');
      else if (status === ProcessingStatus.kError) handlers.onStatus('error');
    });
    sdk.on('validationStatus', (code, _ts, hint) => {
      faceOk = !FACE_PROBLEMS.has(code);
      handlers.onHint(HINTS[code] ?? hint ?? '', faceOk);
    });
    sdk.on('metrics', (buf) => {
      const reading = readExpression(buf, faceOk);
      if (reading) handlers.onReading(reading);
    });
    sdk.on('error', async (code, message, retryable) => {
      handlers.onError(ERROR_TEXT[code] ?? `SDK error: ${message}`, code === SmartSpectraErrorCode.kInputUnavailable ? 'camera' : 'sdk');
      // A failed key, no internet or a lost camera cannot recover by itself:
      // switch the camera off so it is not left running in the background.
      if (!retryable || code in ERROR_TEXT) {
        await stop();
        handlers.onStatus('error');
      }
    });

    try {
      await sdk.start();
      return true;
    } catch (err) {
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

  async function stop() {
    if (!sdk) return;
    const current = sdk;
    sdk = null;
    try { await current.stop(); } catch { /* already stopped */ }
    try { current.destroy(); } catch { /* already destroyed */ }
    faceOk = false;
    handlers.onPreview(null);
    handlers.onStatus('stopped');
  }

  return { start, stop, isRunning: () => sdk !== null };
}
