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
  const actions = feed(c, face({ HAPPY: 62, SURPRISE: 70 }), 0, 5000);
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

const tilt = (roll) => ({ faceOk: true, roll, scores: { HAPPY: 0, NEUTRAL: 80 } });

test('head tilt: holding a head tilt for a second fires "back" once', () => {
  const c = createExpressionControls();
  feed(c, tilt(2), 0, 1500); // upright, slightly crooked camera
  const actions = feed(c, tilt(24), 1533, 6000);
  assert.deepEqual(actions.map((a) => a.action), ['back']);
});

test('head tilt: small or quick head movements do nothing', () => {
  const c = createExpressionControls();
  assert.equal(feed(c, tilt(8), 0, 4000).length, 0);
  let fired = 0;
  for (let t = 4000; t < 20000; t += 33) {
    if (c.update(tilt(t % 3000 < 300 ? 25 : 0), t).action) fired += 1; // 0.3 s nods
  }
  assert.equal(fired, 0);
});

test('head tilt: must straighten up before it can fire again', () => {
  const c = createExpressionControls();
  feed(c, tilt(0), 0, 1000);
  assert.equal(feed(c, tilt(25), 1033, 8000).length, 1);
  feed(c, tilt(0), 8033, 9000);
  assert.equal(feed(c, tilt(25), 9033, 11000).length, 1);
});

test('a sad pout no longer does anything', () => {
  const c = createExpressionControls();
  assert.equal(feed(c, face({ SAD: 90 }), 0, 5000).length, 0);
});

test('a head tilt still counts when the SDK sends only landmarks', () => {
  const c = createExpressionControls();
  feed(c, tilt(0), 0, 1000);
  const actions = feed(c, { faceOk: true, scores: null, roll: 25 }, 1033, 3000);
  assert.deepEqual(actions.map((a) => a.action), ['back']);
});
