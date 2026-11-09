// HTML builders for the recipe screens. They only turn recipe data into
// markup; they never read the camera or change app state.

import { foodSvg } from './art.js';

const escape = (text) => String(text)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function recipeCardHtml(recipe) {
  return `
<article class="card recipe-card">
  <div class="food-pic">${foodSvg(recipe.image)}</div>
  <h2>${escape(recipe.name)}</h2>
  <ul class="facts">
    <li><span class="badge ${recipe.difficulty.toLowerCase()}">${escape(recipe.difficulty)}</span></li>
    <li>⏱ ${recipe.totalMinutes} minutes</li>
    <li>📋 ${recipe.steps.length} steps</li>
  </ul>
  <button class="btn primary" data-recipe="${escape(recipe.id)}">View Recipe</button>
</article>`;
}

export function recipeDetailsHtml(recipe) {
  const ingredients = recipe.ingredients
    .map((i) => `<tr><td>${escape(i.item)}</td><td class="amount">${escape(i.amount)}</td></tr>`).join('');
  const equipment = recipe.equipment.map((e) => `<li>${escape(e)}</li>`).join('');
  const safety = recipe.safety.map((s) => `<li>${escape(s)}</li>`).join('');
  const steps = recipe.steps.map((s) => `<li>${escape(s.title)}${s.timer ? ` <span class="small">(⏲ ${s.timer.minutes} min)</span>` : ''}</li>`).join('');
  return `
<div class="details-top">
  <div class="food-pic big">${foodSvg(recipe.image)}</div>
  <div>
    <h1>${escape(recipe.name)}</h1>
    <p class="lead">${escape(recipe.description)}</p>
    <ul class="facts">
      <li><span class="badge ${recipe.difficulty.toLowerCase()}">${escape(recipe.difficulty)}</span></li>
      <li>🍽 Serves ${escape(recipe.serves)}</li>
      <li>🔪 Prep ${recipe.prepMinutes} min</li>
      <li>🔥 Cook ${recipe.cookMinutes} min</li>
      <li>⏱ Total about ${recipe.totalMinutes} min</li>
    </ul>
    <button class="btn primary big" data-start="${escape(recipe.id)}">Start Cooking</button>
  </div>
</div>
<div class="details-grid">
  <section class="card">
    <h2>Ingredients</h2>
    <table class="ingredients"><thead><tr><th>Ingredient</th><th>Amount</th></tr></thead><tbody>${ingredients}</tbody></table>
  </section>
  <div class="details-side">
    <section class="card">
      <h2>Equipment</h2>
      <ul class="ticks">${equipment}</ul>
    </section>
    <section class="card">
      <h2>The ${recipe.steps.length} steps</h2>
      <ol>${steps}</ol>
    </section>
    <section class="card safety">
      <h2>⚠️ Safety reminders</h2>
      <ul>${safety}</ul>
    </section>
  </div>
</div>`;
}
