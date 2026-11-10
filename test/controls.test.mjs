import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExpressionControls } from '../src/controls.js';

const face = (scores) => ({ faceOk: true, scores: { HAPPY: 0, SURPRISE: 0, NEUTRAL: 0, ...scores } });

// Feeds the same reading every 33 ms (about 30 fps) and returns all actions.
function feed(controls, reading, fromMs, toMs) {
  const actions = [];
  for (let t = fromMs; t <= toMs; t += 33) {
    const out = controls.update(reading, t);
    if (out.action) actions.push({ t, action: out.action });
  }
  return actions;
}

test('a held smile fires "next" exactly once', () => {
  const c = createExpressionControls();
  feed(c, face({ NEUTRAL: 90 }), 0, 1000);
  const actions = feed(c, face({ HAPPY: 90, NEUTRAL: 5 }), 1033, 8000);
  assert.equal(actions.length, 1);
  assert.equal(actions[0].action, 'next');
});

test('a smile must be held before it fires', () => {
  const c = createExpressionControls();
  feed(c, face({ NEUTRAL: 90 }), 0, 1000);
  const quick = feed(c, face({ HAPPY: 90, NEUTRAL: 5 }), 1033, 1400);
  assert.equal(quick.length, 0);
});

test('relaxing then smiling again fires a second time after the cooldown', () => {
  const c = createExpressionControls();
  feed(c, face({ NEUTRAL: 90 }), 0, 1000);
  const first = feed(c, face({ HAPPY: 90, NEUTRAL: 5 }), 1033, 3000);
  feed(c, face({ NEUTRAL: 95 }), 3033, 5000);
  const second = feed(c, face({ HAPPY: 90, NEUTRAL: 5 }), 5033, 7000);
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
});

test('a sad pout fires "back"', () => {
  const c = createExpressionControls();
  feed(c, face({ NEUTRAL: 90 }), 0, 1000);
  const actions = feed(c, face({ SAD: 80, NEUTRAL: 10 }), 1033, 3000);
  assert.deepEqual(actions.map((a) => a.action), ['back']);
});

test('surprise no longer triggers anything', () => {
  const c = createExpressionControls();
  assert.equal(feed(c, face({ SURPRISE: 95 }), 0, 5000).length, 0);
});

test('neutral never fires anything', () => {
  const c = createExpressionControls();
  assert.equal(feed(c, face({ NEUTRAL: 95 }), 0, 10000).length, 0);
});

test('an uncertain expression below threshold does nothing', () => {
  const c = createExpressionControls();
  assert.equal(feed(c, face({ HAPPY: 45, NEUTRAL: 40 }), 0, 5000).length, 0);
});

test('happy that is not the strongest expression does nothing', () => {
  const c = createExpressionControls();
  const actions = feed(c, face({ HAPPY: 62, SAD: 70 }), 0, 5000);
  assert.ok(!actions.some((a) => a.action === 'next'));
  const c2 = createExpressionControls();
  assert.equal(feed(c2, face({ HAPPY: 65, NEUTRAL: 80 }), 0, 5000).length, 0);
});

test('losing the face resets the hold', () => {
  const c = createExpressionControls();
  feed(c, face({ HAPPY: 90 }), 0, 600);
  c.update({ faceOk: false, scores: null }, 633);
  const actions = feed(c, face({ HAPPY: 90 }), 666, 1200);
  assert.equal(actions.length, 0);
});

test('one noisy frame does not trigger anything', () => {
  const c = createExpressionControls();
  feed(c, face({ NEUTRAL: 90 }), 0, 1000);
  c.update(face({ HAPPY: 100, NEUTRAL: 0 }), 1033);
  const actions = feed(c, face({ NEUTRAL: 90 }), 1066, 4000);
  assert.equal(actions.length, 0);
});

const eyes = (closed) => ({ faceOk: true, eyesClosed: closed, scores: { HAPPY: 0, SAD: 0, NEUTRAL: 80 } });

test('eyes mode: keeping eyes closed for a second fires "back" once', () => {
  const c = createExpressionControls({ backGesture: 'eyes' });
  feed(c, eyes(false), 0, 1000);
  const actions = feed(c, eyes(true), 1033, 5000);
  assert.deepEqual(actions.map((a) => a.action), ['back']);
});

test('eyes mode: normal quick blinks never fire', () => {
  const c = createExpressionControls({ backGesture: 'eyes' });
  let fired = 0;
  for (let t = 0; t < 20000; t += 33) {
    const blinking = t % 3000 < 200; // a 0.2 s blink every 3 s
    if (c.update(eyes(blinking), t).action) fired += 1;
  }
  assert.equal(fired, 0);
});

test('eyes mode: sad pout does nothing, and sad mode ignores closed eyes', () => {
  const c = createExpressionControls({ backGesture: 'eyes' });
  assert.equal(feed(c, face({ SAD: 90 }), 0, 4000).length, 0);
  const c2 = createExpressionControls({ backGesture: 'sad' });
  assert.equal(feed(c2, eyes(true), 0, 4000).length, 0);
});

test('eyes mode: closed eyes still count when the SDK only sends blink data or loses the face', () => {
  const c = createExpressionControls({ backGesture: 'eyes' });
  feed(c, eyes(false), 0, 500);
  const actions = feed(c, { faceOk: false, scores: null, eyesClosed: true }, 533, 3000);
  assert.deepEqual(actions.map((a) => a.action), ['back']);
});

test('eyes mode: brief flicker in the blink signal is tolerated', () => {
  const c = createExpressionControls({ backGesture: 'eyes' });
  feed(c, eyes(false), 0, 500);
  let fired = 0;
  for (let t = 533; t < 3000; t += 33) {
    const flicker = Math.floor(t / 100) % 3 === 0; // signal drops for ~100 ms now and then
    if (c.update(eyes(!flicker), t).action === 'back') fired += 1;
  }
  assert.equal(fired, 1);
});
