import { prisma } from './prisma.js'
import {
  generateMealPlan,
  modifyMealPlan,
  type MealPreferences
} from './openai.js'
import { GroceryListUtils } from './utils/grocery-list.js'
import { RecipeUtils } from './utils/recipe.js'
import { MealPlanUtils } from './utils/meal-plan.js'

export class MealPlanService {
  async createMealPlan(
    preferences: MealPreferences,
    requestedCount?: number | null,
    excludeRecipeNames?: string[] | null,
    mode?: 'createNewPlan' | 'updateExistingPlan'
  ) {
    const recipes = await prisma.recipe.findMany({
      orderBy: { name: 'asc' }
    })
    const mealPlanResponse = await generateMealPlan(
      preferences,
      recipes,
      requestedCount,
      excludeRecipeNames,
      mode
    )

    const groceryList = await GroceryListUtils.generateGroceryListFromMeals(
      mealPlanResponse.meals
    )

    const mealPlanId = await MealPlanUtils.saveMealPlanToDB(
      mealPlanResponse,
      preferences
    )

    const fullMealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId.id },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    return {
      id: mealPlanId.id,
      preferences: fullMealPlan!.preferences,
      groceryList: GroceryListUtils.deduplicateGroceryList(groceryList),
      meals: fullMealPlan!.meals
    }
  }

  async addToExistingMealPlan(mealPlanId: string) {
    const currentMealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    if (!currentMealPlan) {
      throw new Error('Meal plan not found')
    }

    // Generate grocery list from all meals in the plan
    const allMeals = currentMealPlan.meals.map((meal) => ({
      recipeName: meal.recipe.name
    }))
    const groceryList =
      await GroceryListUtils.generateGroceryListFromMeals(allMeals)

    return {
      id: currentMealPlan.id,
      preferences: currentMealPlan.preferences,
      meals: currentMealPlan.meals,
      groceryList: GroceryListUtils.deduplicateGroceryList(groceryList)
    }
  }

  async replaceInMealPlan(
    mealPlanId: string,
    modificationRequest: string
  ): Promise<any> {
    const currentMealPlan = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })

    if (!currentMealPlan) {
      throw new Error('Meal plan not found')
    }

    const recipes = await prisma.recipe.findMany({
      orderBy: { name: 'asc' }
    })
    const response = await modifyMealPlan(
      currentMealPlan,
      modificationRequest,
      recipes
    )

    const desired = new Map<string, string>()
    for (const m of response.meals) {
      desired.set(`${m.dayOfWeek}|${m.mealType}`, m.recipeName)
    }

    await MealPlanUtils.replaceMealsInPlan(mealPlanId, desired, recipes)

    let updated = await MealPlanUtils.getMealPlanWithRecipes(mealPlanId)

    const dislikeTerms = RecipeUtils.extractDislikedTerms(modificationRequest)
    if (dislikeTerms.length > 0 && updated) {
      await MealPlanUtils.enforceDislikeConstraints(
        mealPlanId,
        dislikeTerms,
        recipes,
        updated.preferences
      )
      updated = await MealPlanUtils.getMealPlanWithRecipes(mealPlanId)
    }

    if (updated) {
      const desiredCounts =
        RecipeUtils.getDesiredProteinCounts(modificationRequest)
      if (desiredCounts.size > 0) {
        await MealPlanUtils.enforceProteinCounts(
          mealPlanId,
          desiredCounts,
          recipes,
          updated.preferences,
          dislikeTerms
        )
        updated = await MealPlanUtils.getMealPlanWithRecipes(mealPlanId)
      }
    }
    const updatedMealsInput = updated!.meals.map((m) => ({
      recipeName: m.recipe.name
    }))
    const groceryListRaw =
      await GroceryListUtils.generateGroceryListFromMeals(updatedMealsInput)
    const groceryList = GroceryListUtils.deduplicateGroceryList(groceryListRaw)
    return {
      id: updated!.id,
      preferences: updated!.preferences,
      meals: updated!.meals,
      groceryList
    }
  }
}

export const mealPlanService = new MealPlanService()
