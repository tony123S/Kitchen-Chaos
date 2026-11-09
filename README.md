# Kitchen Chaos: Hands-Free Cooking Assistant

**Cook Without Touching Your Screen!**

Kitchen Chaos lets you follow a recipe without touching your computer. Smile to go to the
next step, look surprised to see the step again. Expressions are detected live by the
[Presage SmartSpectra SDK](https://smartspectra.presagetech.com/docs/nodejs).

Built for the Presage SmartSpectra Challenge (#presagechallenge).

> **Status: Phase 1 (SDK check).** This version is a single screen that proves the SDK
> integration works: live camera, SDK status, the real expression scores, and what the
> expression controls would do. The cooking screens come in the next phases.

## Requirements

| What | Version |
| --- | --- |
| Computer | macOS Apple Silicon, Windows x64, or Linux x64/ARM64 (glibc 2.35+, e.g. Ubuntu 22.04+) |
| Node.js | 20 or newer (22 or 24 LTS recommended) |
| Webcam | Any built-in or USB camera |
| Internet | Needed so the SDK can check your API key |
| SmartSpectra API key | Free from [physiology.presagetech.com](https://physiology.presagetech.com/auth/login) |

## Run it

```bash
git clone https://github.com/tony123S/kitchen-chaos.git
cd kitchen-chaos
npm install          # also downloads the SDK's native runtime (a few hundred MB)
cp .env.example .env # Windows: copy .env.example .env
# open .env and paste your key after SMARTSPECTRA_API_KEY=
npm start
```

Then press **Start camera**, look at the camera and smile.

VS Code terminal on macOS/Linux: if the window never opens, run `env -u ELECTRON_RUN_AS_NODE npm start`.

## Tests

```bash
npm test
```

The tests cover the expression controls (smoothing, hold time, cooldown, re-arm) and the
decoding of real SDK metrics packets. They need no camera.

## How SmartSpectra is used

| Piece | SDK feature |
| --- | --- |
| Package | `@smartspectra/node-sdk` 3.4.0 (official Node.js/Electron SDK) |
| Main process | `bindSmartSpectraIpc(window)` from `@smartspectra/node-sdk/main` |
| Preload | `@smartspectra/node-sdk/preload` (bundled into our own preload) |
| Window | `SmartSpectraSDK` from `@smartspectra/node-sdk/renderer` |
| Requested metrics | `faceMetrics` (face landmarks, blinking, talking, expressions) |
| Live signal used | `metrics.face.expression[].scores`: HAPPY, SURPRISE, NEUTRAL confidence (0 to 100) |
| Camera preview | `streamAvailable` event |
| Face position help | `validationStatus` event (no face, too far, too close, and so on) |
| Errors | `error` event (bad key, no internet, camera unavailable) |

### Expression controls

| Expression | Action | Rule |
| --- | --- | --- |
| 😊 HAPPY | Next step | Smoothed score at least 60, strongest expression, held 0.8 s |
| 😲 SURPRISE | Repeat step | Smoothed score at least 55, strongest expression, held 0.6 s |
| 😐 NEUTRAL | Stay | Never triggers anything; relaxing re-arms the controls |

After an action there is a 2 second cooldown, and the same expression must relax before it
can fire again. No face or an unclear expression does nothing. Buttons always work too.

## Project layout

| File | Job |
| --- | --- |
| `main.cjs` | Opens the window, allows the camera only for our own page, connects the SDK bridge, reads `.env` |
| `preload.cjs` | Loads the official SDK preload and exposes the app settings |
| `src/camera.js` | The only file that talks to SmartSpectra |
| `src/reading.js` | Turns one SDK metrics packet into expression scores |
| `src/controls.js` | Turns scores into "next" / "repeat" (pure logic, unit-tested) |
| `src/app.js` | The screen |
| `build.mjs` | Bundles the window code and preload with esbuild |

## Privacy

- The camera only starts when you press **Start camera**, and stops when you press **Stop camera** or close the app.
- Kitchen Chaos does not record, save or upload video, and keeps no expression history.
- According to Presage's documentation, all SmartSpectra metric computation runs on your
  device; the SDK contacts Presage's server to authenticate the API key and validate the subscription.
- SmartSpectra SDK telemetry is **off** in Kitchen Chaos (`enableTelemetry: false`). If you
  set `SMARTSPECTRA_TELEMETRY=true` in `.env`, the SDK sends one aggregate summary per session
  (SDK version, platform, frame counts, error codes) and never video frames, metric values or
  user identifiers. See [SDK Telemetry & Privacy](https://smartspectra.presagetech.com/docs/telemetry-and-privacy).
- Your API key stays in your local `.env` file, which is never committed.

Kitchen Chaos is not a medical device and makes no health or emotion claims. Expressions are used only as buttons.
