// App entry: switches between screens and wires the pieces together.

import { RECIPES, getRecipe } from './recipes.js';
import { recipeCardHtml, recipeDetailsHtml } from './views.js';
import { chefSvg, foodSvg, HOWTO_ART } from './art.js';
import { createExpressionService } from './expressions.js';
import { createSetupScreen } from './setup-screen.js';
import { createCookingScreen } from './cooking-screen.js';
import { sfx } from './sound.js';
import { music } from './music.js';
import { loadSettings, saveSettings } from './settings.js';
import { $ } from './ui-bits.js';

const state = { screen: 'welcome', recipe: null };
// The settings bridge only exists inside the Electron app (see preload.cjs).
const getConfig = async () => (window.kitchenChaos ? window.kitchenChaos.getConfig() : { apiKey: '', telemetry: false });
const expressions = createExpressionService(getConfig);
const settings = loadSettings();

expressions.setBackGesture(settings.backGesture);
const setup = createSetupScreen({
  expressions,
  onBegin: () => show('cooking'),
  onBackGesture: (mode) => { settings.backGesture = mode; saveSettings(settings); },
});
const cooking = createCookingScreen({
  expressions,
  onFinish: (recipe) => showDone(recipe),
  onExit: () => show('details'),
});
const screens = { setup, cooking };

async function show(screen) {
  const from = state.screen;
  if (from === screen) return;
  screens[from]?.leave();
  // The camera only runs on the setup and cooking screens.
  if (!['setup', 'cooking'].includes(screen) && expressions.isRunning()) await expressions.stop();
  state.screen = screen;
  for (const el of document.querySelectorAll('[data-screen]')) el.hidden = el.dataset.screen !== screen;
  $('appbar').hidden = screen === 'welcome' || screen === 'cooking';
  window.scrollTo(0, 0);
  music.setDucked(screen === 'cooking');
  if (screen === 'setup') setup.enter(state.recipe);
  if (screen === 'cooking') cooking.enter(state.recipe);
}

function openRecipe(id) {
  const recipe = getRecipe(id);
  if (!recipe) return;
  state.recipe = recipe;
  $('details').innerHTML = recipeDetailsHtml(recipe);
  show('details');
}

function showDone(recipe) {
  $('done-food').innerHTML = foodSvg(recipe.image);
  $('done-chef').innerHTML = chefSvg('victory');
  $('done-title').textContent = `${recipe.name}: done!`;
  $('done-text').textContent = recipe.id === 'pancakes'
    ? 'Golden, fluffy and hands-free. Grab a fork and enjoy your pancakes!'
    : 'A big bowl of spaghetti bolognese, cooked without touching the screen. Buon appetito!';
  sfx.victory();
  show('done');
}

function initSound() {
  sfx.setEnabled(settings.sfxOn);
  music.setVolume(settings.musicVolume);
  $('opt-music').checked = settings.musicOn;
  $('opt-volume').value = String(Math.round(settings.musicVolume * 100));
  $('opt-sfx').checked = settings.sfxOn;
  const icon = () => { $('btn-sound').textContent = settings.musicOn || settings.sfxOn ? '🎵' : '🔇'; };
  icon();

  $('btn-sound').addEventListener('click', () => {
    const open = $('sound-pop').hidden;
    $('sound-pop').hidden = !open;
    $('btn-sound').setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#sound-panel')) { $('sound-pop').hidden = true; $('btn-sound').setAttribute('aria-expanded', 'false'); }
  });
  $('opt-music').addEventListener('change', (e) => {
    settings.musicOn = e.target.checked;
    if (settings.musicOn) music.start(); else music.stop();
    saveSettings(settings); icon();
  });
  $('opt-volume').addEventListener('input', (e) => {
    settings.musicVolume = Number(e.target.value) / 100;
    music.setVolume(settings.musicVolume);
    saveSettings(settings);
  });
  $('opt-sfx').addEventListener('change', (e) => {
    settings.sfxOn = e.target.checked;
    sfx.setEnabled(settings.sfxOn);
    if (settings.sfxOn) sfx.step();
    saveSettings(settings); icon();
  });

  // Browsers only allow sound after the first click or key press.
  const firstGesture = () => {
    if (settings.musicOn) music.start();
    window.removeEventListener('pointerdown', firstGesture);
    window.removeEventListener('keydown', firstGesture);
  };
  window.addEventListener('pointerdown', firstGesture);
  window.addEventListener('keydown', firstGesture);
  if (settings.musicOn) music.start(); // works straight away in the Electron app
}

function init() {
  initSound();
  $('welcome-chef').innerHTML = chefSvg('happy');
  for (const el of document.querySelectorAll('[data-art]')) el.innerHTML = HOWTO_ART[el.dataset.art] ?? '';
  $('recipe-grid').innerHTML = RECIPES.map(recipeCardHtml).join('');

  document.addEventListener('click', (event) => {
    const go = event.target.closest('[data-go]');
    if (go) return show(go.dataset.go);
    const recipe = event.target.closest('[data-recipe]');
    if (recipe) return openRecipe(recipe.dataset.recipe);
    const start = event.target.closest('[data-start]');
    if (start) {
      state.recipe = getRecipe(start.dataset.start);
      return show('setup');
    }
    return undefined;
  });
  $('btn-again').addEventListener('click', () => show('setup'));
  window.addEventListener('beforeunload', () => expressions.stop());
}

init();
