import { test } from 'node:test';
import assert from 'node:assert/strict';
import messages from '@smartspectra/node-sdk/messages';
import { readExpression, expressionName, headRoll } from '../src/reading.js';

const { Metrics } = messages;
const encode = (obj) => Metrics.encode(obj).finish();

test('maps SDK expression types to names', () => {
  assert.equal(expressionName(5), 'HAPPY');
  assert.equal(expressionName(8), 'SURPRISE');
  assert.equal(expressionName(6), 'NEUTRAL');
});

test('reads the newest expression scores from a packet', () => {
  const buf = encode({ face: { expression: [
    { stable: false, scores: [{ type: 5, confidence: 20 }] },
    { stable: true, scores: [{ type: 5, confidence: 82.5 }, { type: 6, confidence: 10 }, { type: 8, confidence: 3 }] },
  ] } });
  assert.deepEqual(readExpression(buf, true), {
    faceOk: true, stable: true, scores: { HAPPY: 82.5, NEUTRAL: 10, SURPRISE: 3 }, eyesClosed: null, roll: null,
  });
});

test('reads the newest blink status', () => {
  const buf = encode({ face: {
    blinking: [{ detected: false }, { detected: true }],
    expression: [{ scores: [{ type: 6, confidence: 90 }] }],
  } });
  assert.equal(readExpression(buf, true).eyesClosed, true);
});

test('blink-only packets are kept for the eyes-closed control', () => {
  assert.deepEqual(readExpression(encode({ face: { blinking: [{ detected: true }] } }), true),
    { faceOk: true, stable: false, scores: null, eyesClosed: true, roll: null });
});

test('returns null when a packet has no face data', () => {
  assert.equal(readExpression(encode({}), true), null);
});

const mesh = (a, b) => { const pts = Array.from({ length: 478 }, () => ({ x: 0, y: 0 })); pts[33] = a; pts[263] = b; return pts; };

test('head roll comes from the outer eye corners in the face landmarks', () => {
  assert.equal(headRoll(mesh({ x: 100, y: 100 }, { x: 200, y: 100 })), 0);
  assert.ok(Math.abs(headRoll(mesh({ x: 100, y: 100 }, { x: 200, y: 136 })) - 19.8) < 0.1);
  assert.equal(headRoll([]), null);
  const buf = encode({ face: { landmarks: [{ value: mesh({ x: 100, y: 100 }, { x: 200, y: 150 }) }] } });
  assert.ok(readExpression(buf, true).roll > 25);
});
