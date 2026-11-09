// App entry: switches between screens and wires the pieces together.

import { RECIPES, getRecipe } from './recipes.js';
import { recipeCardHtml, recipeDetailsHtml } from './views.js';
import { chefSvg, HOWTO_ART } from './art.js';
import { initSdkCheck } from './sdk-check.js';

const $ = (id) => document.getElementById(id);
const state = { screen: 'welcome', recipeId: null };
let camera = null;

export async function show(screen) {
  // Leaving the camera screen always switches the camera off.
  if (state.screen === 'camera' && screen !== 'camera' && camera) await camera.stop();
  state.screen = screen;
  for (const el of document.querySelectorAll('[data-screen]')) el.hidden = el.dataset.screen !== screen;
  $('appbar').hidden = screen === 'welcome';
  window.scrollTo(0, 0);
}

function openRecipe(id) {
  const recipe = getRecipe(id);
  if (!recipe) return;
  state.recipeId = id;
  $('details').innerHTML = recipeDetailsHtml(recipe);
  show('details');
}

function init() {
  $('welcome-chef').innerHTML = chefSvg('happy');
  for (const el of document.querySelectorAll('[data-art]')) el.innerHTML = HOWTO_ART[el.dataset.art] ?? '';
  $('recipe-grid').innerHTML = RECIPES.map(recipeCardHtml).join('');
  camera = initSdkCheck();

  document.addEventListener('click', (event) => {
    const go = event.target.closest('[data-go]');
    if (go) return show(go.dataset.go);
    const recipe = event.target.closest('[data-recipe]');
    if (recipe) return openRecipe(recipe.dataset.recipe);
    const start = event.target.closest('[data-start]');
    if (start) {
      const r = getRecipe(start.dataset.start);
      $('camera-recipe-note').textContent =
        `Next up: ${r.name}. First, confirm SmartSpectra can see your expressions. Cooking mode arrives in the next update.`;
      return show('camera');
    }
    return undefined;
  });
  window.addEventListener('beforeunload', () => camera && camera.stop());
}

init();
