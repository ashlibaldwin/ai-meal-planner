import { describe, it, expect, beforeAll } from 'vitest'
import { mealPlanService } from '../meal-plan-service.js'
import { prisma } from '../prisma.js'

async function resetDb() {
  await prisma.mealPlanRecipe.deleteMany({})
  await prisma.mealPlan.deleteMany({})
  await prisma.recipe.deleteMany({})
}

async function seedRecipes() {
  const data = [
    {
      name: 'Baked Chicken Thighs',
      ingredients: ['chicken thigh', 'garlic'],
      dietaryTags: ['gluten-free'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 30,
      cuisine: 'American'
    },
    {
      name: 'Chicken and Veg Skewers',
      ingredients: ['chicken breast', 'bell pepper'],
      dietaryTags: ['gluten-free', 'dairy-free'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 20,
      cuisine: 'American'
    },
    {
      name: 'Gluten-Free Chicken Stir Fry',
      ingredients: ['chicken breast', 'broccoli'],
      dietaryTags: ['gluten-free'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 20,
      cuisine: 'Asian'
    },
    {
      name: 'Grilled Chicken Salad',
      ingredients: ['chicken breast', 'lettuce'],
      dietaryTags: ['gluten-free'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 10,
      cuisine: 'American'
    },
    {
      name: 'Chicken Fajitas',
      ingredients: ['chicken breast', 'tortillas'],
      dietaryTags: ['gluten-free-option'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 15,
      cuisine: 'Mexican'
    },
    {
      name: 'Beef Stir Fry',
      ingredients: ['beef', 'broccoli'],
      dietaryTags: ['gluten-free-option', 'dairy-free'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 20,
      cuisine: 'Asian'
    },
    {
      name: 'Gluten-Free Beef Tacos',
      ingredients: ['beef', 'tortillas'],
      dietaryTags: ['gluten-free'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 15,
      cuisine: 'Mexican'
    },
    {
      name: 'Beef Chili',
      ingredients: ['beef', 'tomato'],
      dietaryTags: ['gluten-free'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 40,
      cuisine: 'American'
    },
    {
      name: 'Vegan Lentil Curry',
      ingredients: ['lentils', 'curry'],
      dietaryTags: ['vegan', 'gluten-free'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 30,
      cuisine: 'Indian'
    },
    {
      name: 'Vegetarian Lentil Soup',
      ingredients: ['lentils', 'vegetables'],
      dietaryTags: ['vegetarian', 'gluten-free'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 35,
      cuisine: 'American'
    }
  ]
  for (const r of data) {
    await prisma.recipe.upsert({
      where: { name: r.name },
      update: { ...r, description: '', instructions: [] },
      create: { ...r, description: '', instructions: [] }
    })
  }
}

describe('Meal planner scenarios', () => {
  beforeAll(async () => {
    await resetDb()
    await seedRecipes()
  })

  it('creates 5 meals with at least 3 chicken', async () => {
    const prefs = {
      dietaryRestrictions: [],
      cuisinePreferences: [],
      mealTypes: ['dinner'],
      cookingTime: '30-60 minutes',
      difficulty: 'easy',
      servingSize: 2,
      specialRequests: 'require-protein-counts:chicken=3'
    }
    const res = await mealPlanService.createMealPlan(prefs as any, 5)
    expect(res.meals.length).toBe(5)
    const names = res.meals.map((m) => m.recipe.name)
    const chickenCount = names.filter((n) => /chicken/i.test(n)).length
    expect(chickenCount).toBeGreaterThanOrEqual(3)
  })

  it('amends to 3 chicken and 2 beef', async () => {
    const plan = await prisma.mealPlan.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { meals: { include: { recipe: true } } }
    })
    expect(plan).toBeTruthy()
    const msg = 'Update to 3 chicken and 2 beef'
    const updated = await mealPlanService.replaceInMealPlan(plan!.id, msg)
    const names = updated.meals.map((m: any) => m.recipe.name)
    const chickenCount = names.filter((n: string) => /chicken/i.test(n)).length
    const beefCount = names.filter((n: string) => /beef/i.test(n)).length
    expect(chickenCount).toBe(3)
    expect(beefCount).toBe(2)
  })

  it('handles dislikes replacement (no lentils)', async () => {
    const plan = await prisma.mealPlan.findFirst({
      orderBy: { createdAt: 'desc' },
      include: { meals: { include: { recipe: true } } }
    })
    const updated = await mealPlanService.replaceInMealPlan(
      plan!.id,
      "I don't like lentils"
    )
    const names = updated.meals.map((m: any) => m.recipe.name)
    for (const n of names) expect(/lentil/i.test(n)).toBe(false)
  })
})
