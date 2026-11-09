import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RECIPES, getRecipe } from '../src/recipes.js';
import { recipeCardHtml, recipeDetailsHtml } from '../src/views.js';

test('there are exactly two recipes with the required step counts', () => {
  assert.equal(RECIPES.length, 2);
  assert.equal(getRecipe('pancakes').steps.length, 5);
  assert.equal(getRecipe('bolognese').steps.length, 6);
  assert.equal(getRecipe('pancakes').difficulty, 'Beginner');
  assert.equal(getRecipe('bolognese').difficulty, 'Intermediate');
});

test('every recipe has the details the Recipe Details screen needs', () => {
  for (const r of RECIPES) {
    assert.ok(r.name && r.description && r.image, r.id);
    assert.ok(r.ingredients.length > 0 && r.ingredients.every((i) => i.item && i.amount), r.id);
    assert.ok(r.equipment.length > 0 && r.safety.length > 0, r.id);
    assert.equal(r.prepMinutes + r.cookMinutes, r.totalMinutes, r.id);
  }
});

test('every step has a clear instruction and valid timer', () => {
  for (const r of RECIPES) {
    for (const s of r.steps) {
      assert.ok(s.title && s.instruction.length > 40, `${r.id}: ${s.title}`);
      assert.ok(Array.isArray(s.amounts));
      if (s.timer) assert.ok(s.timer.minutes > 0 && s.timer.label, `${r.id}: ${s.title}`);
    }
  }
});

test('recipe screens render the recipe content', () => {
  const r = getRecipe('pancakes');
  assert.match(recipeCardHtml(r), /Fluffy Pancakes/);
  assert.match(recipeCardHtml(r), /View Recipe/);
  const details = recipeDetailsHtml(r);
  assert.match(details, /1 cup \(125 g\)/);
  assert.match(details, /Start Cooking/);
  assert.match(details, /Safety reminders/);
});
