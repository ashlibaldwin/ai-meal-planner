import { prisma } from '../prisma.js'
import { RecipeUtils } from './recipe.js'

export class MealPlanUtils {
  // Common Prisma query for fetching meal plan with recipes
  static async getMealPlanWithRecipes(mealPlanId: string) {
    return prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: { meals: { include: { recipe: true } } }
    })
  }

  // Common recipe filtering helper
  static filterRecipesByDislikes(recipes: any[], dislikeTerms: string[]) {
    return recipes.filter(
      (r) =>
        !dislikeTerms.some((d) =>
          [r.name, ...(r.ingredients || [])].join(' ').toLowerCase().includes(d)
        )
    )
  }

  // Common database operation for replacing a meal
  static async replaceMealInPlan(
    mealPlanId: string,
    dayOfWeek: string,
    mealType: string,
    recipeId: string
  ) {
    await prisma.mealPlanRecipe.deleteMany({
      where: { mealPlanId, dayOfWeek, mealType }
    })
    await prisma.mealPlanRecipe.create({
      data: { mealPlanId, recipeId, dayOfWeek, mealType }
    })
  }
  static async saveMealPlanToDB(mealPlanResponse: any, preferences: any) {
    const recipeNames = mealPlanResponse.meals.map(
      (meal: any) => meal.recipeName
    )
    const recipeData = await prisma.recipe.findMany({
      where: { name: { in: recipeNames } },
      select: { id: true, name: true }
    })

    const recipeMap = new Map(
      recipeData.map((recipe) => [recipe.name, recipe.id])
    )

    const validMeals = mealPlanResponse.meals.filter((meal: any) => {
      const recipeId = recipeMap.get(meal.recipeName)
      if (!recipeId) {
        console.warn(`Recipe not found in database: "${meal.recipeName}"`)
        return false
      }
      return true
    })

    if (validMeals.length === 0) {
      throw new Error('No valid recipes found for the generated meal plan')
    }

    return prisma.mealPlan.create({
      data: {
        preferences: JSON.stringify(preferences),
        meals: {
          create: validMeals.map((meal: any) => ({
            dayOfWeek: meal.dayOfWeek,
            mealType: meal.mealType,
            recipe: {
              connect: { id: recipeMap.get(meal.recipeName) }
            }
          }))
        }
      },
      include: {
        meals: {
          include: {
            recipe: true
          }
        }
      }
    })
  }

  static async replaceMealsInPlan(
    mealPlanId: string,
    desiredMeals: Map<string, string>
  ) {
    const names = Array.from(new Set(Array.from(desiredMeals.values())))
    const recipeData = await prisma.recipe.findMany({
      where: { name: { in: names } },
      select: { id: true, name: true }
    })
    const recipeMap = new Map(recipeData.map((r) => [r.name, r.id]))

    for (const [key, name] of desiredMeals.entries()) {
      const [dayOfWeek, mealType] = key.split('|')
      const recipeId = recipeMap.get(name)
      if (!recipeId) {
        console.warn(`Recipe not found for replacement: ${name}`)
        continue
      }
      await this.replaceMealInPlan(mealPlanId, dayOfWeek, mealType, recipeId)
    }
  }

  static async enforceDislikeConstraints(
    mealPlanId: string,
    dislikeTerms: string[],
    recipes: any[],
    preferences: any
  ) {
    if (dislikeTerms.length === 0) return

    const prefs = RecipeUtils.safeParsePreferences(preferences)
    const idByName = new Map(recipes.map((r) => [r.name, r.id]))
    let safetyPass = 0

    while (safetyPass < 2) {
      const updated = await this.getMealPlanWithRecipes(mealPlanId)
      if (!updated) break

      const badKeys: { key: string; dayOfWeek: string; mealType: string }[] = []
      for (const m of updated.meals) {
        const hay = [m.recipe.name, ...(m.recipe.ingredients || [])]
          .join(' ')
          .toLowerCase()
        if (dislikeTerms.some((d) => hay.includes(d))) {
          badKeys.push({
            key: `${m.dayOfWeek}|${m.mealType}`,
            dayOfWeek: m.dayOfWeek,
            mealType: m.mealType
          })
        }
      }

      if (badKeys.length === 0) break

      let candidates = recipes
        .filter((r) => RecipeUtils.passesConstraints(r, prefs))
        .filter(
          (r) => this.filterRecipesByDislikes([r], dislikeTerms).length > 0
        )

      if (candidates.length === 0) {
        candidates = this.filterRecipesByDislikes(recipes, dislikeTerms)
      }

      const usedNames = new Set(updated.meals.map((m) => m.recipe.name))
      for (const slot of badKeys) {
        const pick =
          candidates.find((r) => !usedNames.has(r.name)) || candidates[0]
        if (pick) {
          usedNames.add(pick.name)
          const rid = idByName.get(pick.name)
          if (rid) {
            await this.replaceMealInPlan(
              mealPlanId,
              slot.dayOfWeek,
              slot.mealType,
              rid
            )
          }
        }
      }
      safetyPass++
    }
  }

  static async enforceProteinCounts(
    mealPlanId: string,
    desiredCounts: Map<string, number>,
    recipes: any[],
    preferences: any,
    dislikeTerms: string[]
  ) {
    if (desiredCounts.size === 0) return

    const prefs = RecipeUtils.safeParsePreferences(preferences)
    const usedNames = new Set<string>()

    const getCandidate = (
      protein: string
    ): { id: string; name: string } | null => {
      const candidates = recipes
        .filter((r) => RecipeUtils.passesConstraints(r, prefs))
        .filter((r) => RecipeUtils.inferProteinFromRecipe(r) === protein)
        .filter(
          (r) =>
            !dislikeTerms.some((d) =>
              [r.name, ...(r.ingredients || [])]
                .join(' ')
                .toLowerCase()
                .includes(d)
            )
        )
      for (const r of candidates) {
        if (!usedNames.has(r.name)) {
          const id = r.id
          if (id) return { id, name: r.name }
        }
      }
      return null
    }

    const deficits: Array<{ protein: string; need: number }> = []
    const currentCounts = new Map<string, number>()

    const updated = await this.getMealPlanWithRecipes(mealPlanId)

    if (!updated) return

    for (const m of updated.meals) {
      const p = RecipeUtils.inferProteinFromRecipe(m.recipe)
      currentCounts.set(p, (currentCounts.get(p) || 0) + 1)
    }

    for (const [p, want] of desiredCounts.entries()) {
      const have = currentCounts.get(p) || 0
      if (want > have) deficits.push({ protein: p, need: want - have })
    }

    const slots = updated.meals.map((m) => ({
      dayOfWeek: m.dayOfWeek,
      mealType: m.mealType,
      name: m.recipe.name,
      protein: RecipeUtils.inferProteinFromRecipe(m.recipe)
    }))

    for (const def of deficits) {
      let remaining = def.need
      while (remaining > 0) {
        const pick = getCandidate(def.protein)
        if (!pick) break

        let replaceIdx = slots.findIndex((s) => {
          const desired = desiredCounts.get(s.protein) || 0
          const have = currentCounts.get(s.protein) || 0
          if (s.protein === def.protein) return false
          if (!desiredCounts.has(s.protein)) return true
          return have > desired
        })

        if (replaceIdx === -1) {
          replaceIdx = slots.findIndex((s) => s.protein !== def.protein)
        }
        if (replaceIdx === -1) break

        const slot = slots[replaceIdx]
        await this.replaceMealInPlan(
          mealPlanId,
          slot.dayOfWeek,
          slot.mealType,
          pick.id
        )

        usedNames.add(pick.name)
        currentCounts.set(
          slot.protein,
          Math.max(0, (currentCounts.get(slot.protein) || 1) - 1)
        )
        currentCounts.set(
          def.protein,
          (currentCounts.get(def.protein) || 0) + 1
        )
        slots[replaceIdx] = {
          ...slot,
          name: pick.name,
          protein: def.protein
        }
        remaining--
      }
    }
  }
}
