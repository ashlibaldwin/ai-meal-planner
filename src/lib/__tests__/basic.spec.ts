import { describe, it, expect } from 'vitest'
import { prisma } from '../prisma.js'

describe('Basic functionality tests', () => {
  it('can connect to database', async () => {
    // Simple test to verify database connection works
    const result = await prisma.$queryRaw`SELECT 1 as test`
    expect(result).toBeDefined()
  })

  it('can create and read a recipe', async () => {
    // Test basic CRUD operations without fixtures
    const testRecipe = {
      name: 'Test Recipe',
      ingredients: ['test ingredient'],
      dietaryTags: ['test-tag'],
      difficulty: 'easy',
      prepTime: 10,
      cookTime: 20,
      cuisine: 'Test'
    }

    const created = await prisma.recipe.create({
      data: testRecipe
    })
    expect(created.name).toBe('Test Recipe')

    const found = await prisma.recipe.findUnique({
      where: { id: created.id }
    })
    expect(found).toBeTruthy()
    expect(found?.name).toBe('Test Recipe')

    await prisma.recipe.delete({
      where: { id: created.id }
    })
  })

  it('can create and read a meal plan', async () => {
    // Test meal plan CRUD operations
    const testMealPlan = {
      preferences: JSON.stringify({ test: 'preferences' }),
      groceryList: ['test item']
    }

    const created = await prisma.mealPlan.create({
      data: testMealPlan
    })
    expect(created.preferences).toBe(testMealPlan.preferences)

    const found = await prisma.mealPlan.findUnique({
      where: { id: created.id }
    })
    expect(found).toBeTruthy()
    expect(found?.preferences).toBe(testMealPlan.preferences)

    await prisma.mealPlan.delete({
      where: { id: created.id }
    })
  })
})
