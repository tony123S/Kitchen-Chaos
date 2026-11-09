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

test('surprise fires "repeat"', () => {
  const c = createExpressionControls();
  feed(c, face({ NEUTRAL: 90 }), 0, 1000);
  const actions = feed(c, face({ SURPRISE: 85, NEUTRAL: 10 }), 1033, 3000);
  assert.deepEqual(actions.map((a) => a.action), ['repeat']);
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
