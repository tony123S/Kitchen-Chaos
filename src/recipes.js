// Recipe data only. No UI code lives here.
// To add a recipe, add another object to RECIPES with the same shape.
//
// Step shape:
//   title        short name shown in the progress bar
//   instruction  the main sentence, shown large
//   amounts      ingredient quantities needed in this step (may be empty)
//   timer        { minutes, label } when the step involves waiting, else null
//   tip          optional extra help
//   safety       optional safety reminder for this step

export const RECIPES = [
  {
    id: 'pancakes',
    name: 'Fluffy Pancakes',
    image: 'pancakes',
    difficulty: 'Beginner',
    serves: '2 people (about 8 small pancakes)',
    prepMinutes: 5,
    cookMinutes: 15,
    totalMinutes: 20,
    description:
      'Soft, golden pancakes made from simple cupboard ingredients. A great first recipe: one bowl, one pan, and a fun flip.',
    ingredients: [
      { item: 'Plain (all-purpose) flour', amount: '1 cup (125 g)' },
      { item: 'Sugar', amount: '1 tablespoon' },
      { item: 'Baking powder', amount: '1 teaspoon' },
      { item: 'Salt', amount: '1 pinch' },
      { item: 'Milk', amount: '3/4 cup (180 ml)' },
      { item: 'Egg', amount: '1 large' },
      { item: 'Butter, melted', amount: '1 tablespoon' },
      { item: 'Vegetable oil or butter, for the pan', amount: '1 to 2 teaspoons' },
      { item: 'Maple syrup, to serve', amount: '2 tablespoons' },
      { item: 'Fresh fruit, to serve (banana or berries)', amount: '1 banana or 1 handful of berries' },
    ],
    equipment: [
      'Mixing bowl',
      'Whisk or fork',
      'Measuring cups and spoons',
      'Non-stick frying pan',
      'Spatula (flipper)',
      '1/4 cup measure or small ladle',
      'Serving plate',
    ],
    safety: [
      'Wash your hands before you start and after cracking the egg.',
      'Turn the pan handle inward so it cannot be knocked off the hob.',
      'The pan and oil get very hot. Keep children at a safe distance.',
      'Turn the hob off as soon as you finish cooking.',
    ],
    steps: [
      {
        title: 'Get ready',
        instruction:
          'Wash your hands. Put the mixing bowl, whisk, measuring cups and spoons on the counter, and take out all the ingredients.',
        amounts: [],
        timer: null,
        tip: 'Melt the 1 tablespoon of butter now (about 20 seconds in the microwave) so it is ready for step 3.',
        safety: null,
      },
      {
        title: 'Mix the dry ingredients',
        instruction:
          'Add the flour, sugar, baking powder and salt to the mixing bowl. Whisk for about 30 seconds until evenly mixed.',
        amounts: ['1 cup (125 g) flour', '1 tablespoon sugar', '1 teaspoon baking powder', '1 pinch of salt'],
        timer: null,
        tip: 'Level off each spoonful with the back of a knife for accurate amounts.',
        safety: null,
      },
      {
        title: 'Add milk and egg',
        instruction:
          'Make a dip in the middle of the flour. Crack in the egg, pour in the milk and melted butter, then whisk until just combined. A few small lumps are fine.',
        amounts: ['1 large egg', '3/4 cup (180 ml) milk', '1 tablespoon melted butter'],
        timer: null,
        tip: 'Do not over-mix. Stopping while a few lumps remain keeps the pancakes fluffy.',
        safety: 'Wash your hands after handling the raw egg.',
      },
      {
        title: 'Cook the pancakes',
        instruction:
          'Heat the frying pan on medium for 1 to 2 minutes, then add 1/2 teaspoon of oil. Pour in 1/4 cup of batter per pancake. Cook for about 2 minutes until bubbles appear on top, flip, and cook 1 to 2 minutes more until golden. Repeat with the rest of the batter, adding a little oil each time.',
        amounts: ['1/4 cup batter per pancake', '1/2 teaspoon oil per batch'],
        timer: { minutes: 2, label: 'First side: wait for bubbles, then flip' },
        tip: 'If the pancakes brown too fast, turn the heat down a little.',
        safety: 'Hot pan and oil. Keep your hand away from splashes and use the spatula to flip.',
      },
      {
        title: 'Serve',
        instruction:
          'Turn off the hob. Stack the pancakes on a plate, drizzle with maple syrup and top with sliced banana or berries.',
        amounts: ['2 tablespoons maple syrup', '1 sliced banana or 1 handful of berries'],
        timer: null,
        tip: 'Keep finished pancakes warm on a plate covered with a clean tea towel.',
        safety: 'Check the hob is switched off.',
      },
    ],
  },
  {
    id: 'bolognese',
    name: 'Spaghetti Bolognese',
    image: 'spaghetti',
    difficulty: 'Intermediate',
    serves: '4 people',
    prepMinutes: 10,
    cookMinutes: 30,
    totalMinutes: 40,
    description:
      'A rich tomato and beef sauce tossed with spaghetti. A classic family dinner that teaches chopping, browning meat safely and simmering a sauce.',
    ingredients: [
      { item: 'Dried spaghetti', amount: '400 g' },
      { item: 'Minced (ground) beef', amount: '500 g' },
      { item: 'Onion, medium', amount: '1' },
      { item: 'Carrot, medium', amount: '1' },
      { item: 'Garlic cloves', amount: '2' },
      { item: 'Chopped tomatoes, tinned', amount: '1 tin (400 g)' },
      { item: 'Tomato paste (purée)', amount: '2 tablespoons' },
      { item: 'Olive oil', amount: '1 tablespoon + 1 teaspoon' },
      { item: 'Dried oregano or Italian herbs', amount: '1 teaspoon' },
      { item: 'Salt', amount: '1 tablespoon (pasta water) + 1 teaspoon (sauce)' },
      { item: 'Black pepper', amount: '1/2 teaspoon' },
      { item: 'Water', amount: '1/2 cup (120 ml)' },
      { item: 'Grated Parmesan cheese, to serve (optional)', amount: '1/2 cup (about 40 g)' },
    ],
    equipment: [
      'Large pot (at least 4 litres)',
      'Large frying pan or saucepan',
      'Chopping board',
      'Sharp knife',
      'Wooden spoon',
      'Colander',
      'Tongs',
      'Measuring cups and spoons',
      'Tin opener',
    ],
    safety: [
      'Raw mince can carry harmful bacteria. Cook it until no pink remains (71 °C / 160 °F if you have a thermometer).',
      'Wash your hands, knife and board with hot soapy water after touching raw meat.',
      'Drain the boiling pasta water away from your body to avoid steam burns.',
      'Curl your fingertips under when chopping, and keep the knife pointing down when you carry it.',
      'Put leftovers in the fridge within 2 hours and eat them within 3 days.',
    ],
    steps: [
      {
        title: 'Get ready',
        instruction:
          'Wash your hands. Fill the large pot with about 4 litres of water, cover it with a lid and put it on high heat to boil. While it heats, set out the ingredients, chopping board, knife and colander.',
        amounts: ['About 4 litres of water'],
        timer: null,
        tip: 'A lid helps the water boil faster.',
        safety: 'Turn pot handles inward so they cannot be knocked.',
      },
      {
        title: 'Boil the spaghetti',
        instruction:
          'When the water is bubbling hard, add the salt and the spaghetti. Stir for the first minute so it does not stick. Cook for the time on the packet (usually 9 to 11 minutes) until tender with a slight bite. Scoop out 1/2 cup of the cooking water, then drain the spaghetti in the colander and toss it with 1 teaspoon of olive oil.',
        amounts: ['1 tablespoon salt', '400 g spaghetti', '1 teaspoon olive oil'],
        timer: { minutes: 10, label: 'Spaghetti cooking (check the packet time)' },
        tip: 'Keep the 1/2 cup of pasta water. It helps loosen the sauce in step 5.',
        safety: 'Pour the boiling water away from you, and keep your face away from the steam.',
      },
      {
        title: 'Chop the vegetables',
        instruction:
          'Peel the onion and chop it into small pieces about 1 cm across. Peel and grate the carrot. Peel the garlic cloves and chop them very finely.',
        amounts: ['1 onion', '1 carrot', '2 garlic cloves'],
        timer: null,
        tip: 'Cut the onion in half from top to root first. The flat side keeps it steady on the board.',
        safety: 'Curl your fingertips under and keep them behind the knife blade.',
      },
      {
        title: 'Cook the mince and add the tomatoes',
        instruction:
          'Heat 1 tablespoon of olive oil in the frying pan on medium. Cook the onion and carrot for 5 minutes until soft, then add the garlic for 1 minute. Add the mince, break it up with the wooden spoon, and cook for 6 to 8 minutes until no pink remains. Stir in the tomato paste, chopped tomatoes, water, oregano, salt and pepper.',
        amounts: [
          '1 tablespoon olive oil',
          '500 g minced beef',
          '2 tablespoons tomato paste',
          '1 tin (400 g) chopped tomatoes',
          '1/2 cup (120 ml) water',
          '1 teaspoon oregano',
          '1 teaspoon salt',
          '1/2 teaspoon black pepper',
        ],
        timer: { minutes: 8, label: 'Browning the mince until no pink remains' },
        tip: 'Spread the mince out flat so it browns instead of steaming.',
        safety: 'Mince must be fully cooked with no pink inside. Wash your hands after touching raw meat.',
      },
      {
        title: 'Simmer and combine',
        instruction:
          'Bring the sauce to a gentle bubble, then turn the heat to low and simmer for 10 minutes, stirring every few minutes. Taste and add a pinch more salt if needed. Add the drained spaghetti to the pan and toss with tongs for 1 to 2 minutes until hot, adding a splash of the saved pasta water if it looks dry.',
        amounts: ['Drained spaghetti', 'Saved pasta water, a splash at a time'],
        timer: { minutes: 10, label: 'Sauce simmering on low' },
        tip: 'If the sauce spits, partly cover the pan with a lid.',
        safety: 'Bubbling tomato sauce can splash. Stir gently with a long spoon.',
      },
      {
        title: 'Serve',
        instruction:
          'Turn off the hob. Divide the spaghetti between 4 plates and sprinkle with grated Parmesan if you like.',
        amounts: ['1/2 cup (about 40 g) grated Parmesan, optional'],
        timer: null,
        tip: 'Add a few fresh basil leaves on top for colour.',
        safety: 'Check the hob is switched off. Refrigerate leftovers within 2 hours.',
      },
    ],
  },
];

export function getRecipe(id) {
  return RECIPES.find((recipe) => recipe.id === id) ?? null;
}
