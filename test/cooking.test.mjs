import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCookingSession } from '../src/cooking.js';
import { createTimer, formatTime } from '../src/timer.js';
import { getRecipe } from '../src/recipes.js';

test('cooking moves through every step then finishes', () => {
  const s = createCookingSession(getRecipe('pancakes'));
  assert.equal(s.index, 0);
  assert.equal(s.back(), 'stayed');
  for (let i = 1; i < 5; i += 1) assert.equal(s.next(), 'moved');
  assert.ok(s.isLast);
  assert.equal(s.next(), 'finished');
  assert.ok(s.finished);
  s.restart();
  assert.equal(s.index, 0);
  assert.equal(s.finished, false);
});

test('timer counts down, pauses, resumes and never advances the recipe', () => {
  let clock = 0;
  const ticks = [];
  let doneCalls = 0;
  const t = createTimer({ seconds: 10, now: () => clock, onTick: (s) => ticks.push(s), onDone: () => { doneCalls += 1; } });
  t.start();
  clock = 4000; t.tick();
  assert.equal(t.secondsLeft, 6);
  t.pause();
  clock = 60000; t.tick();
  assert.equal(t.secondsLeft, 6, 'paused timer does not move');
  t.start();
  clock = 66000; t.tick();
  assert.equal(t.done, true);
  assert.equal(doneCalls, 1);
  t.tick();
  assert.equal(doneCalls, 1, 'done fires once');
  t.reset();
  assert.equal(t.secondsLeft, 10);
  t.dispose();
});

test('formatTime shows minutes and seconds', () => {
  assert.equal(formatTime(600), '10:00');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(0), '0:00');
});
