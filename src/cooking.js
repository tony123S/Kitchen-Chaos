// Recipe navigation. Knows nothing about cameras or faces: it only moves
// between steps when asked to.

export function createCookingSession(recipe) {
  let index = 0;
  let finished = false;

  return {
    recipe,
    get index() { return index; },
    get step() { return recipe.steps[index]; },
    get total() { return recipe.steps.length; },
    get isFirst() { return index === 0; },
    get isLast() { return index === recipe.steps.length - 1; },
    get finished() { return finished; },
    /** Moves forward one step. On the last step it marks the recipe finished. */
    next() {
      if (finished) return 'finished';
      if (index < recipe.steps.length - 1) { index += 1; return 'moved'; }
      finished = true;
      return 'finished';
    },
    back() {
      if (index === 0) return 'stayed';
      index -= 1;
      return 'moved';
    },
    goTo(i) {
      if (i >= 0 && i < recipe.steps.length) { index = i; finished = false; }
    },
    restart() { index = 0; finished = false; },
  };
}
