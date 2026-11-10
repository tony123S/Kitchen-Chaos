// App entry: switches between screens and wires the pieces together.

import { RECIPES, getRecipe } from './recipes.js';
import { recipeCardHtml, recipeDetailsHtml } from './views.js';
import { chefSvg, foodSvg, HOWTO_ART } from './art.js';
import { createExpressionService } from './expressions.js';
import { createSetupScreen } from './setup-screen.js';
import { createCookingScreen } from './cooking-screen.js';
import { sfx } from './sound.js';
import { $ } from './ui-bits.js';

const state = { screen: 'welcome', recipe: null };
const expressions = createExpressionService(() => window.kitchenChaos.getConfig());

const setup = createSetupScreen({
  expressions,
  onBegin: () => show('cooking'),
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

function init() {
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
