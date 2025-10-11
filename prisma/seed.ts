import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const sampleRecipes = [
  // VEGETARIAN RECIPES
  {
    name: 'Spaghetti Carbonara',
    description: 'Classic Italian pasta dish with eggs, cheese, and pancetta',
    ingredients: [
      '400g spaghetti',
      '200g pancetta or guanciale',
      '4 large eggs',
      '100g pecorino romano cheese',
      '2 cloves garlic',
      'Black pepper',
      'Salt'
    ],
    instructions: [
      'Cook spaghetti according to package directions',
      'Cut pancetta into small cubes and cook until crispy',
      'Beat eggs with grated cheese and black pepper',
      'Drain pasta and mix with pancetta',
      'Remove from heat and quickly mix in egg mixture',
      'Serve immediately with extra cheese'
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    cuisine: 'Italian',
    dietaryTags: ['vegetarian'],
    difficulty: 'medium'
  },
  {
    name: 'Vegetarian Stir Fry',
    description: 'Quick and healthy vegetable stir fry with tofu',
    ingredients: [
      '400g firm tofu',
      '2 cups mixed vegetables (bell peppers, broccoli, snap peas)',
      '2 cloves garlic',
      '1 tbsp grated ginger',
      '3 tbsp soy sauce',
      '2 tbsp hoisin sauce',
      '1 tbsp sesame oil',
      '2 green onions',
      '1 tbsp cornstarch',
      '2 tbsp vegetable oil'
    ],
    instructions: [
      'Press tofu and cut into cubes',
      'Heat oil in a large pan over high heat',
      'Add tofu and cook until golden brown',
      'Add vegetables and stir-fry for 3-4 minutes',
      'Mix soy sauce, hoisin sauce, and cornstarch',
      'Add sauce to pan and cook until thickened',
      'Garnish with green onions and serve over rice'
    ],
    prepTime: 15,
    cookTime: 10,
    servings: 4,
    cuisine: 'Asian',
    dietaryTags: ['vegetarian', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Mushroom Risotto',
    description: 'Creamy Italian rice dish with mixed mushrooms',
    ingredients: [
      '1.5 cups arborio rice',
      '300g mixed mushrooms',
      '1 onion, diced',
      '3 cloves garlic',
      '1/2 cup white wine',
      '4 cups vegetable broth',
      '1/2 cup parmesan cheese',
      '2 tbsp butter',
      '2 tbsp olive oil',
      'Salt and pepper'
    ],
    instructions: [
      'Heat broth in a saucepan and keep warm',
      'Sauté mushrooms until golden, set aside',
      'Cook onion and garlic until soft',
      'Add rice and stir for 2 minutes',
      'Add wine and stir until absorbed',
      'Add warm broth one ladle at a time',
      'Stir constantly until rice is creamy',
      'Stir in mushrooms, cheese, and butter'
    ],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    cuisine: 'Italian',
    dietaryTags: ['vegetarian'],
    difficulty: 'medium'
  },
  {
    name: 'Vegetarian Pasta Primavera',
    description: 'Fresh pasta with seasonal vegetables',
    ingredients: [
      '400g pasta',
      '2 cups mixed vegetables',
      '1/4 cup olive oil',
      '3 cloves garlic',
      '1/2 cup parmesan cheese',
      '1/4 cup fresh basil',
      'Salt and pepper'
    ],
    instructions: [
      'Cook pasta according to package directions',
      'Sauté vegetables until tender',
      'Add garlic and cook for 1 minute',
      'Toss pasta with vegetables',
      'Add olive oil and parmesan',
      'Garnish with fresh basil',
      'Season with salt and pepper'
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    cuisine: 'Italian',
    dietaryTags: ['vegetarian'],
    difficulty: 'easy'
  },
  {
    name: 'Vegetarian Chili',
    description: 'Hearty chili with beans and vegetables',
    ingredients: [
      '2 cans black beans',
      '1 can kidney beans',
      '1 can diced tomatoes',
      '1 onion, diced',
      '2 cloves garlic',
      '1 bell pepper, diced',
      '2 tbsp chili powder',
      '1 tbsp cumin',
      '2 tbsp olive oil',
      'Fresh cilantro'
    ],
    instructions: [
      'Heat oil in a large pot',
      'Sauté onion, garlic, and bell pepper',
      'Add chili powder and cumin',
      'Add tomatoes and beans',
      'Simmer for 30 minutes',
      'Season with salt and pepper',
      'Garnish with fresh cilantro'
    ],
    prepTime: 10,
    cookTime: 35,
    servings: 6,
    cuisine: 'American',
    dietaryTags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  // VEGAN RECIPES
  {
    name: 'Vegan Buddha Bowl',
    description:
      'Nutritious bowl with quinoa, roasted vegetables, and tahini dressing',
    ingredients: [
      '1 cup quinoa',
      '2 cups mixed vegetables (sweet potato, broccoli, chickpeas)',
      '1 avocado, sliced',
      '1/4 cup tahini',
      '2 tbsp lemon juice',
      '1 tbsp maple syrup',
      '2 tbsp olive oil',
      'Salt and pepper'
    ],
    instructions: [
      'Cook quinoa according to package directions',
      'Roast vegetables at 400°F for 20-25 minutes',
      'Make dressing by whisking tahini, lemon juice, maple syrup, and oil',
      'Assemble bowls with quinoa, vegetables, and avocado',
      'Drizzle with tahini dressing'
    ],
    prepTime: 15,
    cookTime: 25,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['vegan', 'gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Vegan Lentil Curry',
    description: 'Spicy Indian curry with red lentils and coconut milk',
    ingredients: [
      '1 cup red lentils',
      '1 can coconut milk',
      '1 onion, diced',
      '3 cloves garlic',
      '1 tbsp grated ginger',
      '2 tbsp curry powder',
      '1 can diced tomatoes',
      '2 cups vegetable broth',
      '2 tbsp olive oil',
      'Fresh cilantro'
    ],
    instructions: [
      'Rinse lentils until water runs clear',
      'Sauté onion, garlic, and ginger until soft',
      'Add curry powder and cook for 1 minute',
      'Add lentils, tomatoes, coconut milk, and broth',
      'Simmer for 20-25 minutes until lentils are tender',
      'Garnish with fresh cilantro and serve over rice'
    ],
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    cuisine: 'Indian',
    dietaryTags: ['vegan', 'gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Vegan Black Bean Burgers',
    description: 'Homemade black bean patties with avocado and sprouts',
    ingredients: [
      '2 cans black beans, drained',
      '1/2 cup breadcrumbs',
      '1/4 cup diced onion',
      '2 cloves garlic',
      '1 tbsp cumin',
      '1 tsp chili powder',
      '2 tbsp olive oil',
      '4 burger buns',
      '1 avocado, sliced',
      'Fresh sprouts'
    ],
    instructions: [
      'Mash black beans in a large bowl',
      'Add breadcrumbs, onion, garlic, and spices',
      'Form into 4 patties',
      'Heat oil in a pan over medium heat',
      'Cook patties for 4-5 minutes per side',
      'Serve on buns with avocado and sprouts'
    ],
    prepTime: 15,
    cookTime: 10,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['vegan', 'dairy-free'],
    difficulty: 'medium'
  },
  {
    name: 'Vegan Pad Thai',
    description: 'Thai noodle dish with tofu and vegetables',
    ingredients: [
      '200g rice noodles',
      '200g firm tofu',
      '2 cups bean sprouts',
      '2 green onions',
      '1/4 cup peanuts',
      '3 tbsp tamarind paste',
      '2 tbsp soy sauce',
      '2 tbsp brown sugar',
      '2 tbsp vegetable oil',
      'Lime wedges'
    ],
    instructions: [
      'Soak noodles according to package directions',
      'Cut tofu into cubes and pan-fry until golden',
      'Mix tamarind paste, soy sauce, and brown sugar',
      'Heat oil in a large pan',
      'Add noodles and sauce',
      'Toss with tofu, bean sprouts, and green onions',
      'Garnish with peanuts and lime wedges'
    ],
    prepTime: 20,
    cookTime: 15,
    servings: 4,
    cuisine: 'Thai',
    dietaryTags: ['vegan', 'gluten-free', 'dairy-free'],
    difficulty: 'medium'
  },
  {
    name: 'Vegan Mac and Cheese',
    description: 'Creamy mac and cheese made with nutritional yeast',
    ingredients: [
      '400g pasta',
      '2 cups cashews, soaked',
      '1/4 cup nutritional yeast',
      '1/2 cup unsweetened almond milk',
      '2 tbsp olive oil',
      '1 tsp garlic powder',
      '1 tsp onion powder',
      'Salt and pepper'
    ],
    instructions: [
      'Cook pasta according to package directions',
      'Blend soaked cashews with nutritional yeast and almond milk',
      'Add olive oil, garlic powder, and onion powder',
      'Blend until smooth and creamy',
      'Toss pasta with sauce',
      'Season with salt and pepper'
    ],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['vegan', 'dairy-free'],
    difficulty: 'medium'
  },
  // GLUTEN-FREE RECIPES
  {
    name: 'Gluten-Free Chicken Teriyaki Bowl',
    description: 'Japanese-inspired chicken with teriyaki sauce over rice',
    ingredients: [
      '500g chicken breast',
      '2 cups jasmine rice',
      '1/4 cup tamari sauce',
      '2 tbsp honey',
      '2 tbsp rice vinegar',
      '1 tbsp sesame oil',
      '2 cloves garlic',
      '1 tbsp grated ginger',
      '2 green onions',
      '1 tbsp sesame seeds'
    ],
    instructions: [
      'Cook rice according to package directions',
      'Cut chicken into bite-sized pieces',
      'Mix tamari, honey, vinegar, and sesame oil',
      'Cook chicken in a pan until golden',
      'Add garlic and ginger, cook for 1 minute',
      'Add sauce and simmer until thickened',
      'Serve over rice with green onions and sesame seeds'
    ],
    prepTime: 15,
    cookTime: 20,
    servings: 4,
    cuisine: 'Asian',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Gluten-Free Beef Tacos',
    description: 'Classic Mexican tacos with corn tortillas',
    ingredients: [
      '500g ground beef',
      '8 corn tortillas',
      '1 onion, diced',
      '2 cloves garlic',
      '1 packet taco seasoning',
      '1 cup lettuce, shredded',
      '1 cup cheddar cheese, shredded',
      '2 tomatoes, diced',
      '1/2 cup sour cream',
      '1/4 cup salsa'
    ],
    instructions: [
      'Cook ground beef until browned',
      'Add onion and garlic, cook until soft',
      'Add taco seasoning and water, simmer 5 minutes',
      'Warm corn tortillas',
      'Fill tortillas with beef mixture',
      'Top with lettuce, cheese, tomatoes, sour cream, and salsa'
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    cuisine: 'Mexican',
    dietaryTags: ['gluten-free'],
    difficulty: 'easy'
  },
  {
    name: 'Gluten-Free Salmon with Roasted Vegetables',
    description: 'Healthy baked salmon with seasonal vegetables',
    ingredients: [
      '4 salmon fillets',
      '2 cups mixed vegetables (carrots, broccoli, zucchini)',
      '3 tbsp olive oil',
      '2 cloves garlic',
      '1 lemon',
      '1 tsp dried herbs',
      'Salt and pepper'
    ],
    instructions: [
      'Preheat oven to 400°F',
      'Cut vegetables into bite-sized pieces',
      'Toss vegetables with olive oil, garlic, and herbs',
      'Place salmon on a baking sheet',
      'Arrange vegetables around salmon',
      'Bake for 15-20 minutes until salmon flakes easily',
      'Serve with lemon wedges'
    ],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Gluten-Free Quinoa Salad',
    description: 'Fresh salad with quinoa, tomatoes, and feta',
    ingredients: [
      '1 cup quinoa',
      '1 cup cherry tomatoes, halved',
      '1 cucumber, diced',
      '1/2 red onion, diced',
      '1/2 cup kalamata olives',
      '1/2 cup feta cheese, crumbled',
      '1/4 cup olive oil',
      '2 tbsp lemon juice',
      '1 tsp oregano',
      'Salt and pepper'
    ],
    instructions: [
      'Cook quinoa according to package directions',
      'Let quinoa cool completely',
      'Mix quinoa with tomatoes, cucumber, and onion',
      'Add olives and feta cheese',
      'Whisk together olive oil, lemon juice, and oregano',
      'Toss salad with dressing',
      'Season with salt and pepper'
    ],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    cuisine: 'Mediterranean',
    dietaryTags: ['gluten-free', 'vegetarian'],
    difficulty: 'easy'
  },
  {
    name: 'Gluten-Free Chicken and Broccoli Stir Fry',
    description: 'Quick stir fry with chicken and broccoli',
    ingredients: [
      '500g chicken breast, sliced',
      '2 cups broccoli florets',
      '3 tbsp tamari sauce',
      '2 tbsp oyster sauce',
      '1 tbsp cornstarch',
      '2 cloves garlic',
      '1 tbsp grated ginger',
      '2 tbsp vegetable oil',
      '2 green onions'
    ],
    instructions: [
      'Mix tamari sauce, oyster sauce, and cornstarch',
      'Heat oil in a large pan over high heat',
      'Cook chicken until golden, set aside',
      'Add broccoli and stir-fry for 3-4 minutes',
      'Add garlic and ginger, cook for 1 minute',
      'Return chicken to pan with sauce',
      'Cook until sauce thickens',
      'Garnish with green onions'
    ],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    cuisine: 'Asian',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  // DAIRY-FREE RECIPES
  {
    name: 'Dairy-Free Thai Coconut Soup',
    description: 'Aromatic soup with coconut milk, lemongrass, and mushrooms',
    ingredients: [
      '1 can coconut milk',
      '2 cups vegetable broth',
      '200g mushrooms, sliced',
      '2 stalks lemongrass',
      '3 kaffir lime leaves',
      '2 tbsp red curry paste',
      '2 tbsp fish sauce',
      '1 tbsp lime juice',
      'Fresh cilantro'
    ],
    instructions: [
      'Heat coconut milk in a large pot',
      'Add curry paste and cook for 2 minutes',
      'Add broth, lemongrass, and lime leaves',
      'Simmer for 10 minutes',
      'Add mushrooms and cook for 5 minutes',
      'Stir in fish sauce and lime juice',
      'Garnish with fresh cilantro'
    ],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    cuisine: 'Thai',
    dietaryTags: ['dairy-free', 'gluten-free'],
    difficulty: 'easy'
  },
  {
    name: 'Dairy-Free Beef Stir Fry',
    description: 'Quick and flavorful beef with vegetables',
    ingredients: [
      '500g beef strips',
      '2 cups mixed vegetables',
      '3 tbsp soy sauce',
      '2 tbsp oyster sauce',
      '1 tbsp cornstarch',
      '2 cloves garlic',
      '1 tbsp grated ginger',
      '2 tbsp vegetable oil',
      '2 green onions'
    ],
    instructions: [
      'Mix soy sauce, oyster sauce, and cornstarch',
      'Heat oil in a large pan over high heat',
      'Cook beef until browned, set aside',
      'Add vegetables and stir-fry for 3-4 minutes',
      'Add garlic and ginger, cook for 1 minute',
      'Return beef to pan with sauce',
      'Cook until sauce thickens',
      'Garnish with green onions'
    ],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    cuisine: 'Asian',
    dietaryTags: ['dairy-free', 'gluten-free-option'],
    difficulty: 'easy'
  },
  {
    name: 'Dairy-Free Lemon Herb Salmon',
    description: 'Baked salmon with fresh herbs and lemon',
    ingredients: [
      '4 salmon fillets',
      '2 lemons',
      '2 tbsp olive oil',
      '2 cloves garlic',
      '1 tbsp fresh dill',
      '1 tbsp fresh parsley',
      'Salt and pepper'
    ],
    instructions: [
      'Preheat oven to 400°F',
      'Place salmon on a baking sheet',
      'Mix olive oil, garlic, and herbs',
      'Brush mixture over salmon',
      'Slice one lemon and place on salmon',
      'Season with salt and pepper',
      'Bake for 12-15 minutes',
      'Serve with remaining lemon'
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['dairy-free', 'gluten-free'],
    difficulty: 'easy'
  },
  // KETO RECIPES
  {
    name: 'Keto Cauliflower Fried Rice',
    description: 'Low-carb fried rice made with cauliflower',
    ingredients: [
      '1 head cauliflower, riced',
      '2 eggs',
      '1/2 cup diced chicken',
      '1/4 cup diced carrots',
      '1/4 cup frozen peas',
      '2 tbsp soy sauce',
      '1 tbsp sesame oil',
      '2 cloves garlic',
      '1 tbsp grated ginger',
      '2 green onions'
    ],
    instructions: [
      'Rice the cauliflower in a food processor',
      'Scramble eggs in a large pan, set aside',
      'Cook chicken until golden brown',
      'Add carrots and peas, cook for 2 minutes',
      'Add cauliflower rice and cook for 5 minutes',
      'Stir in soy sauce, sesame oil, garlic, and ginger',
      'Add scrambled eggs and green onions'
    ],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    cuisine: 'Asian',
    dietaryTags: ['keto', 'low-carb', 'gluten-free'],
    difficulty: 'medium'
  },
  {
    name: 'Keto Bacon-Wrapped Chicken',
    description: 'Juicy chicken breast wrapped in crispy bacon',
    ingredients: [
      '4 chicken breasts',
      '8 slices bacon',
      '2 tbsp olive oil',
      '1 tsp garlic powder',
      '1 tsp paprika',
      'Salt and pepper',
      'Fresh herbs'
    ],
    instructions: [
      'Preheat oven to 400°F',
      'Season chicken with garlic powder, paprika, salt, and pepper',
      'Wrap each chicken breast with 2 slices of bacon',
      'Heat oil in an oven-safe pan',
      'Sear chicken for 2-3 minutes per side',
      'Transfer to oven and bake for 15-20 minutes',
      'Garnish with fresh herbs'
    ],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['keto', 'low-carb', 'gluten-free'],
    difficulty: 'easy'
  },
  {
    name: 'Keto Zucchini Noodles with Meatballs',
    description: 'Spiralized zucchini with homemade meatballs',
    ingredients: [
      '4 large zucchinis',
      '500g ground beef',
      '1 egg',
      '1/4 cup almond flour',
      '2 cloves garlic',
      '1 tsp oregano',
      '1 can crushed tomatoes',
      '2 tbsp olive oil',
      'Fresh basil'
    ],
    instructions: [
      'Spiralize zucchinis into noodles',
      'Mix ground beef with egg, almond flour, garlic, and oregano',
      'Form into meatballs',
      'Heat oil in a large pan',
      'Cook meatballs until browned',
      'Add tomatoes and simmer for 15 minutes',
      'Sauté zucchini noodles for 2-3 minutes',
      'Serve meatballs and sauce over zucchini noodles'
    ],
    prepTime: 20,
    cookTime: 25,
    servings: 4,
    cuisine: 'Italian',
    dietaryTags: ['keto', 'low-carb', 'gluten-free'],
    difficulty: 'medium'
  },
  // PALEO RECIPES
  {
    name: 'Paleo Sweet Potato Hash',
    description: 'Hearty breakfast hash with sweet potatoes and eggs',
    ingredients: [
      '2 large sweet potatoes, diced',
      '1 onion, diced',
      '1 bell pepper, diced',
      '4 eggs',
      '4 slices bacon',
      '2 tbsp olive oil',
      '1 tsp paprika',
      'Salt and pepper'
    ],
    instructions: [
      'Cook bacon until crispy, set aside',
      'Sauté sweet potatoes in bacon fat for 10 minutes',
      'Add onion and bell pepper, cook for 5 minutes',
      'Season with paprika, salt, and pepper',
      'Make 4 wells in the hash',
      'Crack eggs into wells and cook until set',
      'Crumble bacon on top'
    ],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['paleo', 'gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Paleo Grilled Chicken with Herbs',
    description: 'Simple grilled chicken with fresh herbs',
    ingredients: [
      '4 chicken breasts',
      '2 tbsp olive oil',
      '2 cloves garlic',
      '1 tbsp fresh rosemary',
      '1 tbsp fresh thyme',
      '1 lemon',
      'Salt and pepper'
    ],
    instructions: [
      'Preheat grill to medium-high',
      'Mix olive oil, garlic, and herbs',
      'Brush mixture over chicken',
      'Season with salt and pepper',
      'Grill for 6-7 minutes per side',
      'Squeeze lemon over chicken',
      'Let rest for 5 minutes before serving'
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['paleo', 'gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  // BREAKFAST RECIPES
  {
    name: 'Avocado Toast',
    description: 'Simple and healthy breakfast with mashed avocado',
    ingredients: [
      '4 slices whole grain bread',
      '2 avocados',
      '1 lemon',
      '2 tbsp olive oil',
      'Salt and pepper',
      'Red pepper flakes',
      'Microgreens'
    ],
    instructions: [
      'Toast bread slices',
      'Mash avocados with lemon juice',
      'Season with salt, pepper, and olive oil',
      'Spread avocado mixture on toast',
      'Garnish with red pepper flakes and microgreens'
    ],
    prepTime: 5,
    cookTime: 5,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['vegetarian', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Greek Yogurt Parfait',
    description: 'Layered parfait with Greek yogurt and berries',
    ingredients: [
      '2 cups Greek yogurt',
      '1 cup mixed berries',
      '1/4 cup granola',
      '2 tbsp honey',
      '1 tsp vanilla extract',
      'Fresh mint'
    ],
    instructions: [
      'Mix yogurt with vanilla extract',
      'Layer yogurt, berries, and granola in glasses',
      'Drizzle with honey',
      'Garnish with fresh mint',
      'Serve immediately'
    ],
    prepTime: 10,
    cookTime: 0,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['vegetarian'],
    difficulty: 'easy'
  },
  {
    name: 'Veggie Omelet',
    description: 'Fluffy omelet filled with fresh vegetables',
    ingredients: [
      '6 eggs',
      '1/4 cup diced bell peppers',
      '1/4 cup diced mushrooms',
      '1/4 cup diced onions',
      '1/4 cup spinach',
      '1/2 cup shredded cheese',
      '2 tbsp butter',
      'Salt and pepper'
    ],
    instructions: [
      'Beat eggs with salt and pepper',
      'Sauté vegetables until tender',
      'Melt butter in a large pan',
      'Pour in eggs and cook until set',
      'Add vegetables and cheese to one half',
      'Fold over and cook for 1 minute',
      'Serve immediately'
    ],
    prepTime: 10,
    cookTime: 10,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['vegetarian', 'gluten-free'],
    difficulty: 'medium'
  },
  {
    name: 'Pancakes',
    description: 'Fluffy pancakes with maple syrup',
    ingredients: [
      '2 cups flour',
      '2 tbsp sugar',
      '2 tsp baking powder',
      '1/2 tsp salt',
      '2 eggs',
      '1 3/4 cups milk',
      '1/4 cup melted butter',
      '1 tsp vanilla extract',
      'Maple syrup'
    ],
    instructions: [
      'Mix dry ingredients in a large bowl',
      'Whisk eggs, milk, butter, and vanilla',
      'Pour wet ingredients into dry ingredients',
      'Mix until just combined',
      'Heat a griddle over medium heat',
      'Pour batter onto griddle',
      'Cook until bubbles form, then flip',
      'Serve with maple syrup'
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['vegetarian'],
    difficulty: 'easy'
  },
  {
    name: 'Breakfast Burrito',
    description: 'Hearty breakfast wrap with eggs, bacon, and cheese',
    ingredients: [
      '4 large tortillas',
      '8 eggs',
      '8 slices bacon',
      '1 cup shredded cheese',
      '1/2 cup diced tomatoes',
      '1/4 cup diced onions',
      '1/4 cup sour cream',
      'Salt and pepper'
    ],
    instructions: [
      'Cook bacon until crispy, set aside',
      'Scramble eggs with salt and pepper',
      'Warm tortillas',
      'Fill tortillas with eggs, bacon, cheese, tomatoes, and onions',
      'Add sour cream',
      'Roll up tightly and serve'
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    cuisine: 'Mexican',
    dietaryTags: ['vegetarian-option'],
    difficulty: 'easy'
  },
  // LUNCH RECIPES
  {
    name: 'Mediterranean Quinoa Salad',
    description: 'Fresh salad with quinoa, tomatoes, and feta',
    ingredients: [
      '1 cup quinoa',
      '1 cup cherry tomatoes, halved',
      '1 cucumber, diced',
      '1/2 red onion, diced',
      '1/2 cup kalamata olives',
      '1/2 cup feta cheese, crumbled',
      '1/4 cup olive oil',
      '2 tbsp lemon juice',
      '1 tsp oregano',
      'Salt and pepper'
    ],
    instructions: [
      'Cook quinoa according to package directions',
      'Let quinoa cool completely',
      'Mix quinoa with tomatoes, cucumber, and onion',
      'Add olives and feta cheese',
      'Whisk together olive oil, lemon juice, and oregano',
      'Toss salad with dressing',
      'Season with salt and pepper'
    ],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    cuisine: 'Mediterranean',
    dietaryTags: ['vegetarian', 'gluten-free'],
    difficulty: 'easy'
  },
  {
    name: 'Chicken Caesar Wrap',
    description: 'Classic Caesar salad wrapped in a tortilla',
    ingredients: [
      '4 large tortillas',
      '2 chicken breasts, cooked and sliced',
      '1 head romaine lettuce, chopped',
      '1/2 cup parmesan cheese',
      '1/4 cup croutons',
      '1/2 cup Caesar dressing',
      'Salt and pepper'
    ],
    instructions: [
      'Warm tortillas slightly',
      'Mix lettuce with dressing',
      'Add chicken, cheese, and croutons',
      'Season with salt and pepper',
      'Divide mixture among tortillas',
      'Roll up tightly and slice in half'
    ],
    prepTime: 10,
    cookTime: 0,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free-option'],
    difficulty: 'easy'
  },
  {
    name: 'Turkey and Avocado Sandwich',
    description: 'Fresh sandwich with turkey, avocado, and vegetables',
    ingredients: [
      '8 slices whole grain bread',
      '400g sliced turkey',
      '2 avocados, sliced',
      '1 tomato, sliced',
      '1/2 cucumber, sliced',
      '1/4 cup mayonnaise',
      '1/4 cup mustard',
      'Lettuce leaves',
      'Salt and pepper'
    ],
    instructions: [
      'Mix mayonnaise and mustard',
      'Spread mixture on bread slices',
      'Layer turkey, avocado, tomato, and cucumber',
      'Add lettuce leaves',
      'Season with salt and pepper',
      'Top with remaining bread slices'
    ],
    prepTime: 10,
    cookTime: 0,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free-option'],
    difficulty: 'easy'
  },
  // DINNER RECIPES
  {
    name: 'Beef Stir Fry',
    description: 'Quick and flavorful beef with vegetables',
    ingredients: [
      '500g beef strips',
      '2 cups mixed vegetables',
      '3 tbsp soy sauce',
      '2 tbsp oyster sauce',
      '1 tbsp cornstarch',
      '2 cloves garlic',
      '1 tbsp grated ginger',
      '2 tbsp vegetable oil',
      '2 green onions'
    ],
    instructions: [
      'Mix soy sauce, oyster sauce, and cornstarch',
      'Heat oil in a large pan over high heat',
      'Cook beef until browned, set aside',
      'Add vegetables and stir-fry for 3-4 minutes',
      'Add garlic and ginger, cook for 1 minute',
      'Return beef to pan with sauce',
      'Cook until sauce thickens',
      'Garnish with green onions'
    ],
    prepTime: 15,
    cookTime: 15,
    servings: 4,
    cuisine: 'Asian',
    dietaryTags: ['gluten-free-option', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Lemon Herb Salmon',
    description: 'Baked salmon with fresh herbs and lemon',
    ingredients: [
      '4 salmon fillets',
      '2 lemons',
      '2 tbsp olive oil',
      '2 cloves garlic',
      '1 tbsp fresh dill',
      '1 tbsp fresh parsley',
      'Salt and pepper'
    ],
    instructions: [
      'Preheat oven to 400°F',
      'Place salmon on a baking sheet',
      'Mix olive oil, garlic, and herbs',
      'Brush mixture over salmon',
      'Slice one lemon and place on salmon',
      'Season with salt and pepper',
      'Bake for 12-15 minutes',
      'Serve with remaining lemon'
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Chicken Tikka Masala',
    description: 'Creamy Indian curry with tender chicken',
    ingredients: [
      '500g chicken breast, cubed',
      '1 can coconut milk',
      '1 can diced tomatoes',
      '1 onion, diced',
      '3 cloves garlic',
      '1 tbsp grated ginger',
      '2 tbsp garam masala',
      '1 tbsp turmeric',
      '2 tbsp olive oil',
      'Fresh cilantro'
    ],
    instructions: [
      'Season chicken with garam masala and turmeric',
      'Heat oil in a large pan',
      'Cook chicken until golden, set aside',
      'Sauté onion, garlic, and ginger',
      'Add tomatoes and coconut milk',
      'Simmer for 15 minutes',
      'Return chicken to pan',
      'Garnish with fresh cilantro'
    ],
    prepTime: 15,
    cookTime: 25,
    servings: 4,
    cuisine: 'Indian',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'medium'
  },
  {
    name: 'Mushroom and Spinach Risotto',
    description: 'Creamy risotto with earthy mushrooms',
    ingredients: [
      '1.5 cups arborio rice',
      '300g mixed mushrooms',
      '2 cups fresh spinach',
      '1 onion, diced',
      '3 cloves garlic',
      '1/2 cup white wine',
      '4 cups vegetable broth',
      '1/2 cup parmesan cheese',
      '2 tbsp butter',
      '2 tbsp olive oil'
    ],
    instructions: [
      'Heat broth in a saucepan',
      'Sauté mushrooms until golden',
      'Cook onion and garlic until soft',
      'Add rice and stir for 2 minutes',
      'Add wine and stir until absorbed',
      'Add warm broth one ladle at a time',
      'Stir in mushrooms, spinach, and cheese',
      'Finish with butter'
    ],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    cuisine: 'Italian',
    dietaryTags: ['vegetarian'],
    difficulty: 'medium'
  },
  {
    name: 'Grilled Chicken with Herbs',
    description: 'Simple grilled chicken with fresh herbs',
    ingredients: [
      '4 chicken breasts',
      '2 tbsp olive oil',
      '2 cloves garlic',
      '1 tbsp fresh rosemary',
      '1 tbsp fresh thyme',
      '1 lemon',
      'Salt and pepper'
    ],
    instructions: [
      'Preheat grill to medium-high',
      'Mix olive oil, garlic, and herbs',
      'Brush mixture over chicken',
      'Season with salt and pepper',
      'Grill for 6-7 minutes per side',
      'Squeeze lemon over chicken',
      'Let rest for 5 minutes before serving'
    ],
    prepTime: 10,
    cookTime: 15,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Baked Cod with Vegetables',
    description: 'Light and healthy baked fish with seasonal vegetables',
    ingredients: [
      '4 cod fillets',
      '2 cups mixed vegetables',
      '2 tbsp olive oil',
      '2 cloves garlic',
      '1 lemon',
      '1 tsp dried herbs',
      'Salt and pepper'
    ],
    instructions: [
      'Preheat oven to 400°F',
      'Arrange vegetables on a baking sheet',
      'Place cod on top of vegetables',
      'Drizzle with olive oil and lemon juice',
      'Season with herbs, salt, and pepper',
      'Bake for 15-20 minutes',
      'Serve immediately'
    ],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Vegetarian Stuffed Peppers',
    description: 'Bell peppers stuffed with rice and vegetables',
    ingredients: [
      '4 bell peppers',
      '1 cup cooked rice',
      '1 can black beans',
      '1 onion, diced',
      '2 cloves garlic',
      '1 can diced tomatoes',
      '1/2 cup cheese, shredded',
      '2 tbsp olive oil',
      '1 tsp cumin'
    ],
    instructions: [
      'Preheat oven to 375°F',
      'Cut tops off peppers and remove seeds',
      'Sauté onion and garlic until soft',
      'Add rice, beans, tomatoes, and cumin',
      'Stuff peppers with mixture',
      'Top with cheese',
      'Bake for 25-30 minutes'
    ],
    prepTime: 15,
    cookTime: 30,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['vegetarian', 'gluten-free'],
    difficulty: 'medium'
  },
  {
    name: 'Chicken and Vegetable Skewers',
    description: 'Grilled skewers with marinated chicken and vegetables',
    ingredients: [
      '500g chicken breast, cubed',
      '2 bell peppers, cubed',
      '1 zucchini, sliced',
      '1 red onion, cubed',
      '1/4 cup olive oil',
      '2 cloves garlic',
      '1 lemon',
      '1 tsp oregano',
      'Salt and pepper'
    ],
    instructions: [
      'Mix olive oil, garlic, lemon juice, and oregano',
      'Marinate chicken for 30 minutes',
      'Thread chicken and vegetables onto skewers',
      'Preheat grill to medium-high',
      'Grill skewers for 8-10 minutes',
      'Turn occasionally until cooked through'
    ],
    prepTime: 20,
    cookTime: 10,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Baked Chicken Thighs',
    description: 'Juicy baked chicken thighs with herbs',
    ingredients: [
      '8 chicken thighs',
      '2 tbsp olive oil',
      '2 cloves garlic',
      '1 tbsp fresh rosemary',
      '1 tbsp fresh thyme',
      '1 lemon',
      'Salt and pepper'
    ],
    instructions: [
      'Preheat oven to 425°F',
      'Mix olive oil, garlic, and herbs',
      'Rub mixture over chicken',
      'Season with salt and pepper',
      'Place chicken on a baking sheet',
      'Bake for 25-30 minutes',
      'Squeeze lemon over chicken'
    ],
    prepTime: 10,
    cookTime: 30,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Grilled Salmon with Asparagus',
    description: 'Simple grilled salmon with seasonal asparagus',
    ingredients: [
      '4 salmon fillets',
      '1 bunch asparagus',
      '2 tbsp olive oil',
      '2 cloves garlic',
      '1 lemon',
      '1 tsp dill',
      'Salt and pepper'
    ],
    instructions: [
      'Preheat grill to medium-high',
      'Toss asparagus with olive oil and garlic',
      'Season salmon with dill, salt, and pepper',
      'Grill salmon for 4-5 minutes per side',
      'Grill asparagus for 3-4 minutes',
      'Serve with lemon wedges'
    ],
    prepTime: 10,
    cookTime: 10,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Vegetarian Lentil Soup',
    description: 'Hearty soup with red lentils and vegetables',
    ingredients: [
      '1 cup red lentils',
      '1 onion, diced',
      '2 carrots, diced',
      '2 celery stalks, diced',
      '3 cloves garlic',
      '1 can diced tomatoes',
      '4 cups vegetable broth',
      '2 tbsp olive oil',
      '1 tsp cumin',
      'Fresh parsley'
    ],
    instructions: [
      'Heat oil in a large pot',
      'Sauté onion, carrots, and celery',
      'Add garlic and cumin, cook for 1 minute',
      'Add lentils, tomatoes, and broth',
      'Simmer for 25-30 minutes',
      'Season with salt and pepper',
      'Garnish with fresh parsley'
    ],
    prepTime: 10,
    cookTime: 35,
    servings: 6,
    cuisine: 'American',
    dietaryTags: ['vegetarian', 'vegan', 'gluten-free', 'dairy-free'],
    difficulty: 'easy'
  },
  {
    name: 'Baked Chicken Breast',
    description: 'Simple baked chicken breast with herbs',
    ingredients: [
      '4 chicken breasts',
      '2 tbsp olive oil',
      '2 cloves garlic',
      '1 tsp paprika',
      '1 tsp oregano',
      'Salt and pepper'
    ],
    instructions: [
      'Preheat oven to 400°F',
      'Mix olive oil, garlic, paprika, and oregano',
      'Rub mixture over chicken',
      'Season with salt and pepper',
      'Place chicken on a baking sheet',
      'Bake for 20-25 minutes',
      'Let rest for 5 minutes before serving'
    ],
    prepTime: 10,
    cookTime: 25,
    servings: 4,
    cuisine: 'American',
    dietaryTags: ['gluten-free', 'dairy-free'],
    difficulty: 'easy'
  }
]

async function main() {
  console.log('Starting to seed the database...')

  // Clear existing data in correct order (respecting foreign key constraints)
  await prisma.mealPlanRecipe.deleteMany()
  console.log('Cleared existing meal plan recipes')

  await prisma.mealPlan.deleteMany()
  console.log('Cleared existing meal plans')

  await prisma.recipe.deleteMany()
  console.log('Cleared existing recipes')

  // Create new recipes
  for (const recipe of sampleRecipes) {
    await prisma.recipe.create({
      data: recipe
    })
  }

  console.log(`Successfully seeded ${sampleRecipes.length} recipes`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
