import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest'
import { POST } from '../+server.js'
import { prisma } from '$lib/prisma.js'

// Mock OpenAI to force heuristic fallback in scoring
vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: async () => ({
            choices: [{ message: { content: 'not json' } }]
          })
        }
      }
    }
  }
})

// Mock LLM preference parser to avoid calling OpenAI
vi.mock('$lib/openai.js', async (orig) => {
  const actual = await (orig as any)()
  return {
    ...actual,
    parsePreferencesWithLLM: vi.fn(async (msg: string) => {
      const m = msg.toLowerCase()
      const out: any = {
        mealTypes: ['dinner'],
        maxMinutes: 60,
        difficulty: 'easy',
        goals: [],
        dietaryRestrictions: [],
        proteinPreferences: {},
        disallowedTags: []
      }
      // Extract counts like "3 chicken", "2 beef"
      const re =
        /(\d+)\s+(chicken|beef|fish|pork|turkey|tofu|beans?|lentils?|chickpeas?)/g
      let mm: RegExpExecArray | null
      let found = false
      while ((mm = re.exec(m)) !== null) {
        const n = Number(mm[1])
        const k = mm[2]
        out.proteinPreferences[
          k.includes('lentil') || k.includes('bean') || k.includes('chickpea')
            ? 'legume'
            : k
        ] = n
        found = true
      }
      if (!found && /only\s+(\w+)/.test(m)) {
        const ex = m.match(/only\s+(\w+)/)![1]
        out.proteinPreferences[ex] = 5
      }
      if (/don['’]?t\s+like\s+lentils/.test(m))
        out.disallowedTags.push('lentils')
      return out
    })
  }
})

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
  for (const r of data)
    await prisma.recipe.upsert({
      where: { name: r.name },
      update: { ...r, description: '', instructions: [] },
      create: { ...r, description: '', instructions: [] }
    })
}

describe('HTTP: /api/chat', () => {
  beforeAll(async () => {
    await prisma.mealPlanRecipe.deleteMany({})
    await prisma.mealPlan.deleteMany({})
    await prisma.recipe.deleteMany({})
    await seedRecipes()
  })
  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('creates 5 dinners with ≥3 chicken via HTTP', async () => {
    const payload = {
      preferences: {
        dietaryRestrictions: [],
        cuisinePreferences: [],
        mealTypes: ['dinner'],
        cookingTime: '30-60 minutes',
        difficulty: 'easy',
        servingSize: 2,
        specialRequests: 'require-protein-counts:chicken=3'
      },
      userMessage: 'Create 5 dinners with at least 3 chicken meals',
      currentMealPlanId: null
    }
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const res = await POST({ request: req } as any)
    const body = await (res as Response).json()
    expect(res.status).toBe(200)
    expect(body.mealPlan.meals.length).toBe(5)
    const names = body.mealPlan.meals.map((m: any) => m.recipe.name)
    const chickenCount = names.filter((n: string) => /chicken/i.test(n)).length
    expect(chickenCount).toBeGreaterThanOrEqual(3)
    // Store plan id for next test via env on process
    ;(globalThis as any).__PLAN_ID__ = body.mealPlan.id
  })

  it('amends to exactly 3 chicken and 2 beef via HTTP', async () => {
    const planId = (globalThis as any).__PLAN_ID__
    expect(planId).toBeTruthy()
    const payload = {
      preferences: {
        dietaryRestrictions: [],
        cuisinePreferences: [],
        mealTypes: ['dinner'],
        cookingTime: '30-60 minutes',
        difficulty: 'easy',
        servingSize: 2,
        specialRequests: ''
      },
      userMessage: 'Update to 3 chicken and 2 beef',
      currentMealPlanId: planId
    }
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const res = await POST({ request: req } as any)
    const body = await (res as Response).json()
    expect(res.status).toBe(200)
    const names = body.mealPlan.meals.map((m: any) => m.recipe.name)
    const chickenCount = names.filter((n: string) => /chicken/i.test(n)).length
    const beefCount = names.filter((n: string) => /beef/i.test(n)).length
    expect(chickenCount).toBe(3)
    expect(beefCount).toBe(2)
  })

  it('replaces disliked ingredient via HTTP', async () => {
    const planId = (globalThis as any).__PLAN_ID__
    const payload = {
      preferences: {
        dietaryRestrictions: [],
        cuisinePreferences: [],
        mealTypes: ['dinner'],
        cookingTime: '30-60 minutes',
        difficulty: 'easy',
        servingSize: 2,
        specialRequests: ''
      },
      userMessage: "I don't like lentils",
      currentMealPlanId: planId
    }
    const req = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const res = await POST({ request: req } as any)
    const body = await (res as Response).json()
    expect(res.status).toBe(200)
    const names = body.mealPlan.meals.map((m: any) => m.recipe.name)
    for (const n of names) expect(/lentil/i.test(n)).toBe(false)
  })
})
