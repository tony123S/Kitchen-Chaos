import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSettings, saveSettings } from '../src/settings.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('settings default to music on, moderate volume, effects on', () => {
  assert.deepEqual(loadSettings(memory()), { musicOn: true, musicVolume: 0.35, sfxOn: true });
});

test('settings are remembered and cleaned', () => {
  const store = memory();
  saveSettings({ musicOn: false, musicVolume: 3, sfxOn: false }, store);
  assert.deepEqual(loadSettings(store), { musicOn: false, musicVolume: 1, sfxOn: false });
});

test('broken or missing storage falls back to defaults', () => {
  const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('blocked'); } };
  assert.equal(loadSettings(broken).musicOn, true);
  assert.doesNotThrow(() => saveSettings({ musicOn: true }, broken));
  assert.equal(loadSettings(undefined).sfxOn, true);
});
