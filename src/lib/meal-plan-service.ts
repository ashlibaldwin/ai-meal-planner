import { prisma } from './prisma.js'
import {
  generateMealPlan,
  modifyMealPlan,
  type MealPreferences
} from './openai.js'

export class MealPlanService {
  async createMealPlan(
    preferences: MealPreferences,
    requestedCount?: number | null,
    excludeRecipeNames?: string[] | null,
    mode?: 'createNewPlan' | 'updateExistingPlan'
  ) {
    const recipes = await prisma.recipe.findMany()
    const mealPlanResponse = await generateMealPlan(
      preferences,
      recipes,
      requestedCount,
      excludeRecipeNames,
      mode
    )

    // Generate grocery list from the selected recipes
    const groceryList = await this.generateGroceryListFromMeals(
      mealPlanResponse.meals
    )

    const mealPlanId = await this.saveMealPlanToDB(
      mealPlanResponse,
      preferences
    )

    // Get the full meal plan with recipes from the database
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
      groceryList: this.deduplicateGroceryList(groceryList),
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
    const groceryList = await this.generateGroceryListFromMeals(allMeals)

    return {
      id: currentMealPlan.id,
      preferences: currentMealPlan.preferences,
      meals: currentMealPlan.meals,
      groceryList: this.deduplicateGroceryList(groceryList)
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

    const recipes = await prisma.recipe.findMany()
    const response = await modifyMealPlan(
      currentMealPlan,
      modificationRequest,
      recipes
    )

    // Upsert the modified plan in DB: replace meals per day/mealType
    // Build a map from (dayOfWeek, mealType) to recipe name
    const desired = new Map<string, string>()
    for (const m of response.meals) {
      desired.set(`${m.dayOfWeek}|${m.mealType}`, m.recipeName)
    }

    // Resolve recipe IDs
    const names = Array.from(new Set(response.meals.map((m) => m.recipeName)))
    const recipeData = await prisma.recipe.findMany({
      where: { name: { in: names } },
      select: { id: true, name: true }
    })
    const recipeMap = new Map(recipeData.map((r) => [r.name, r.id]))

    // Update or create each meal
    for (const key of desired.keys()) {
      const [dayOfWeek, mealType] = key.split('|')
      const name = desired.get(key)!
      const recipeId = recipeMap.get(name)
      if (!recipeId) {
        console.warn(`Recipe not found for replacement: ${name}`)
        continue
      }
      // Delete existing entry for that slot (unique constraint) then insert
      await prisma.mealPlanRecipe.deleteMany({
        where: { mealPlanId: mealPlanId, dayOfWeek, mealType }
      })
      await prisma.mealPlanRecipe.create({
        data: { mealPlanId, recipeId, dayOfWeek, mealType }
      })
    }

    // Return updated plan
    let updated = await prisma.mealPlan.findUnique({
      where: { id: mealPlanId },
      include: { meals: { include: { recipe: true } } }
    })

    // Fallback: if the request expressed dislikes, ensure no meals contain them
    const dislikeTerms = this.extractDislikedTerms(modificationRequest)
    if (dislikeTerms.length > 0 && updated) {
      const prefs = this.safeParsePreferences(updated.preferences)
      const idByName = new Map(recipes.map((r) => [r.name, r.id]))
      let safetyPass = 0
      while (safetyPass < 2 && updated) {
        const badKeys: { key: string; dayOfWeek: string; mealType: string }[] =
          []
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
          .filter((r) => this.passesConstraints(r, prefs))
          .filter(
            (r) =>
              !dislikeTerms.some((d) =>
                [r.name, ...(r.ingredients || [])]
                  .join(' ')
                  .toLowerCase()
                  .includes(d)
              )
          )
        if (candidates.length === 0) {
          // Relax constraints if too strict; at minimum avoid disliked items
          candidates = recipes.filter(
            (r) =>
              !dislikeTerms.some((d) =>
                [r.name, ...(r.ingredients || [])]
                  .join(' ')
                  .toLowerCase()
                  .includes(d)
              )
          )
        }
        const usedNames = new Set(updated.meals.map((m) => m.recipe.name))
        for (const slot of badKeys) {
          const pick =
            candidates.find((r) => !usedNames.has(r.name)) || candidates[0]
          if (pick) {
            usedNames.add(pick.name)
            const rid = idByName.get(pick.name)
            if (rid) {
              await prisma.mealPlanRecipe.deleteMany({
                where: {
                  mealPlanId,
                  dayOfWeek: slot.dayOfWeek,
                  mealType: slot.mealType
                }
              })
              await prisma.mealPlanRecipe.create({
                data: {
                  mealPlanId,
                  recipeId: rid,
                  dayOfWeek: slot.dayOfWeek,
                  mealType: slot.mealType
                }
              })
            }
          }
        }
        updated = await prisma.mealPlan.findUnique({
          where: { id: mealPlanId },
          include: { meals: { include: { recipe: true } } }
        })
        safetyPass++
      }
    }

    // Enforce required protein counts if specified in the request (either explicit counts or tokens)
    if (updated) {
      const prefs = this.safeParsePreferences(updated.preferences)
      const desiredCounts = this.getDesiredProteinCounts(modificationRequest)
      if (desiredCounts.size > 0) {
        const dislikeTerms = this.extractDislikedTerms(modificationRequest)
        const usedNames = new Set(updated.meals.map((m) => m.recipe.name))
        const currentCounts = new Map<string, number>()
        for (const m of updated.meals) {
          const p = this.inferProteinFromRecipe(m.recipe)
          currentCounts.set(p, (currentCounts.get(p) || 0) + 1)
        }
        const slots = updated.meals.map((m) => ({
          dayOfWeek: m.dayOfWeek,
          mealType: m.mealType,
          name: m.recipe.name,
          protein: this.inferProteinFromRecipe(m.recipe)
        }))
        // Helper to fetch a candidate for a protein
        const getCandidate = (
          protein: string
        ): { id: string; name: string } | null => {
          const candidates = recipes
            .filter((r) => this.passesConstraints(r, prefs))
            .filter((r) => this.inferProteinFromRecipe(r) === protein)
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
        // Compute deficits
        const deficits: Array<{ protein: string; need: number }> = []
        for (const [p, want] of desiredCounts.entries()) {
          const have = currentCounts.get(p) || 0
          if (want > have) deficits.push({ protein: p, need: want - have })
        }
        // Replace from surplus or non-required slots
        for (const def of deficits) {
          let remaining = def.need
          while (remaining > 0) {
            const pick = getCandidate(def.protein)
            if (!pick) break
            // find a slot to replace: prefer slots whose protein is not in desiredCounts OR exceeds desired
            let replaceIdx = slots.findIndex((s) => {
              const desired = desiredCounts.get(s.protein) || 0
              const have = currentCounts.get(s.protein) || 0
              if (s.protein === def.protein) return false
              if (!desiredCounts.has(s.protein)) return true
              return have > desired
            })
            if (replaceIdx === -1) {
              // fallback: any slot not of the target protein
              replaceIdx = slots.findIndex((s) => s.protein !== def.protein)
            }
            if (replaceIdx === -1) break
            const slot = slots[replaceIdx]
            await prisma.mealPlanRecipe.deleteMany({
              where: {
                mealPlanId,
                dayOfWeek: slot.dayOfWeek,
                mealType: slot.mealType
              }
            })
            await prisma.mealPlanRecipe.create({
              data: {
                mealPlanId,
                recipeId: pick.id,
                dayOfWeek: slot.dayOfWeek,
                mealType: slot.mealType
              }
            })
            // update bookkeeping
            usedNames.add(pick.name)
            currentCounts.set(
              slot.protein,
              Math.max(0, (currentCounts.get(slot.protein) || 1) - 1)
            )
            currentCounts.set(
              def.protein,
              (currentCounts.get(def.protein) || 0) + 1
            )
            // reflect new slot protein
            slots[replaceIdx] = {
              ...slot,
              name: pick.name,
              protein: def.protein
            }
            remaining--
          }
        }
        updated = await prisma.mealPlan.findUnique({
          where: { id: mealPlanId },
          include: { meals: { include: { recipe: true } } }
        })
      }
    }
    // Recompute grocery list from updated meals
    const updatedMealsInput = updated!.meals.map((m) => ({
      recipeName: m.recipe.name
    }))
    const groceryListRaw =
      await this.generateGroceryListFromMeals(updatedMealsInput)
    const groceryList = this.deduplicateGroceryList(groceryListRaw)
    return {
      id: updated!.id,
      preferences: updated!.preferences,
      meals: updated!.meals,
      groceryList
    }
  }

  private async saveMealPlanToDB(
    mealPlanResponse: any,
    preferences: MealPreferences
  ) {
    const recipeNames = mealPlanResponse.meals.map((meal) => meal.recipeName)
    const recipeData = await prisma.recipe.findMany({
      where: { name: { in: recipeNames } },
      select: { id: true, name: true }
    })

    const recipeMap = new Map(
      recipeData.map((recipe) => [recipe.name, recipe.id])
    )

    // Filter out meals with missing recipes and log warnings
    const validMeals = mealPlanResponse.meals.filter((meal) => {
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

    // Note: Grocery list will be generated separately after saving the meal plan

    return prisma.mealPlan.create({
      data: {
        preferences: JSON.stringify(preferences),
        meals: {
          create: validMeals.map((meal) => ({
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

  private deduplicateGroceryList(groceryList: string[]): string[] {
    // Parse and combine quantities for similar ingredients
    const ingredientMap = new Map<
      string,
      {
        totalQuantity: number
        unit: string
        baseName: string
        originalItem: string
        allItems: string[]
      }
    >()

    for (const item of groceryList) {
      const parsed = this.parseIngredient(item)

      // Convert to a common unit for comparison (tbsp)
      const converted = this.convertToCommonUnit(parsed)

      // Use baseName only as key to combine different units of the same ingredient
      const key = converted.baseName.toLowerCase()

      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!
        // Combine quantities for the same ingredient (now in common unit)
        existing.totalQuantity += converted.quantity
        existing.allItems.push(item)
      } else {
        // Initialize with totalQuantity set to the converted quantity
        ingredientMap.set(key, {
          ...converted,
          totalQuantity: converted.quantity,
          allItems: [item]
        })
      }
    }

    // Convert back to ingredient strings
    return Array.from(ingredientMap.values())
      .map((ingredient) => this.formatIngredient(ingredient))
      .sort()
  }

  private extractDislikedTerms(message: string): string[] {
    const lower = (message || '').toLowerCase()
    const terms: string[] = []
    const patterns = [
      /no\s+(\w+)/gi,
      /avoid\s+(\w+)/gi,
      /don['’]?t\s+like\s+(\w+)/gi,
      /do\s+not\s+like\s+(\w+)/gi,
      /dislike\s+(\w+)/gi,
      /allergic\s+to\s+(\w+)/gi
    ]
    patterns.forEach((re) => {
      let m: RegExpExecArray | null
      while ((m = re.exec(lower)) !== null) {
        terms.push(m[1])
      }
    })
    return Array.from(new Set(terms))
  }

  private safeParsePreferences(prefs: any): any {
    try {
      return typeof prefs === 'string' ? JSON.parse(prefs) : prefs
    } catch {
      return {}
    }
  }

  private passesConstraints(recipe: any, preferences: any): boolean {
    const tags = (recipe.dietaryTags || []).map((t: string) => t.toLowerCase())
    if (preferences?.dietaryRestrictions?.length) {
      for (const need of preferences.dietaryRestrictions) {
        if (!tags.includes(String(need).toLowerCase())) return false
      }
    }
    const difficulty = String(preferences?.difficulty || '').toLowerCase()
    if (
      difficulty &&
      difficulty !== 'any' &&
      recipe.difficulty &&
      recipe.difficulty.toLowerCase() !== difficulty
    )
      return false
    const toMax = (s: string) => {
      const x = (s || '').toLowerCase()
      if (
        x.includes('under 30') ||
        x.includes('0-30') ||
        x.includes('0-20') ||
        x.includes('quick')
      )
        return 30
      if (x.includes('30-60') || (x.includes('30') && x.includes('60')))
        return 60
      if (x.includes('60+') || x.includes('over 60') || x.includes('long'))
        return 120
      return null
    }
    const max = toMax(preferences?.cookingTime || '')
    const prep = recipe.prepTime || 0
    const cook = recipe.cookTime || 0
    if (max && prep + cook > max) return false
    return true
  }

  private parseIngredient(item: string): {
    quantity: number
    unit: string
    baseName: string
    originalItem: string
  } {
    // Extract quantity and unit from strings like "2 cloves garlic", "1 cup flour", "1/2 tsp salt"
    const match = item.match(/^(\d+(?:\/\d+)?)\s*([a-zA-Z]+)\s+(.+)$/)

    if (match) {
      const [, quantityStr, unit, name] = match
      const quantity = this.parseQuantity(quantityStr)
      const baseName = this.normalizeIngredientName(name)

      return {
        quantity,
        unit: unit.toLowerCase(),
        baseName,
        originalItem: item
      }
    }

    // Try to parse quantity without unit (e.g., "1 onion, diced")
    const noUnitMatch = item.match(/^(\d+(?:\/\d+)?)\s+(.+)$/)
    if (noUnitMatch) {
      const [, quantityStr, name] = noUnitMatch
      const quantity = this.parseQuantity(quantityStr)
      const baseName = this.normalizeIngredientName(name)

      return { quantity, unit: 'item', baseName, originalItem: item }
    }

    // If no quantity pattern, treat as base ingredient
    return {
      quantity: 1,
      unit: 'item',
      baseName: this.normalizeIngredientName(item),
      originalItem: item
    }
  }

  private inferProteinFromRecipe(recipe: any): string {
    const hay = [recipe.name, ...(recipe.ingredients || [])]
      .join(' ')
      .toLowerCase()
    if (/(chicken|thigh|breast)/.test(hay)) return 'chicken'
    if (/(beef|steak|ground\s+beef)/.test(hay)) return 'beef'
    if (/(pork|bacon)/.test(hay)) return 'pork'
    if (/(salmon|cod|tilapia|fish|seafood|shrimp|prawn|scallop)/.test(hay))
      return 'fish'
    if (/(turkey)/.test(hay)) return 'turkey'
    if (/(tofu|tempeh)/.test(hay)) return 'tofu'
    if (/(bean|lentil|chickpea|legume)/.test(hay)) return 'legume'
    return 'unknown'
  }

  private getDesiredProteinCounts(input: string): Map<string, number> {
    const out = new Map<string, number>()
    // parse tokens: require-protein-counts:a=1|b=2
    const t = input.toLowerCase()
    const m = t.match(/require-protein-counts:([a-z0-9=|]+)/)
    if (m) {
      for (const pair of m[1].split('|')) {
        const [k, v] = pair.split('=')
        const n = Number(v)
        if (k && n > 0)
          out.set(
            this.normalizeProteinToken(k),
            (out.get(this.normalizeProteinToken(k)) || 0) + n
          )
      }
    }
    // parse inline counts like "3 chicken", "2 beef"
    const re =
      /(\d+)\s+(chicken|beef|fish|pork|turkey|salmon|shrimp|tofu|beans?|lentils?|chickpeas?|legumes?)/g
    let mm: RegExpExecArray | null
    while ((mm = re.exec(t)) !== null) {
      const n = Number(mm[1])
      const k = this.normalizeProteinToken(mm[2])
      if (n > 0) out.set(k, (out.get(k) || 0) + n)
    }
    return out
  }

  private normalizeProteinToken(k: string): string {
    const s = String(k || '').toLowerCase()
    if (
      [
        'salmon',
        'cod',
        'tilapia',
        'fish',
        'seafood',
        'shrimp',
        'prawn',
        'scallop'
      ].includes(s)
    )
      return 'fish'
    if (
      [
        'bean',
        'beans',
        'lentil',
        'lentils',
        'chickpea',
        'chickpeas',
        'legume',
        'legumes'
      ].includes(s)
    )
      return 'legume'
    if (['tempeh'].includes(s)) return 'tofu'
    return s
  }

  private parseQuantity(quantityStr: string): number {
    if (quantityStr.includes('/')) {
      const [numerator, denominator] = quantityStr.split('/').map(Number)
      return numerator / denominator
    }
    return Number(quantityStr)
  }

  private normalizeIngredientName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*\(.*?\)/g, '') // Remove parentheses
      .replace(/\s*-\s*/g, ' ') // Replace hyphens
      .replace(/\s*,\s*/g, ' ') // Replace commas with spaces
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/\b(diced|chopped|sliced|minced|grated|shredded)(\s+|$)/g, '') // Remove preparation methods
      .replace(/\b(fresh|dried|frozen|canned|drained|soaked)(\s+|$)/g, '') // Remove preparation states
      .trim()
  }

  private convertToCommonUnit(parsed: {
    quantity: number
    unit: string
    baseName: string
    originalItem: string
  }): {
    quantity: number
    unit: string
    baseName: string
    originalItem: string
  } {
    const { quantity, unit, baseName, originalItem } = parsed

    // Special handling for diced/chopped ingredients - convert to weight/volume equivalents
    if (baseName.includes('onion') && unit === 'item') {
      // 1 medium onion ≈ 1 cup diced ≈ 16 tbsp
      return { quantity: quantity * 16, unit: 'tbsp', baseName, originalItem }
    }

    // Convert to tablespoons (tbsp) as the common unit
    const conversions: { [key: string]: number } = {
      tsp: 1 / 3, // 1 tsp = 1/3 tbsp
      tbsp: 1, // 1 tbsp = 1 tbsp
      cup: 16, // 1 cup = 16 tbsp
      pint: 32, // 1 pint = 32 tbsp
      quart: 64, // 1 quart = 64 tbsp
      gallon: 256, // 1 gallon = 256 tbsp
      ml: 1 / 14.787, // 1 ml = ~0.0676 tbsp
      liter: 67.628, // 1 liter = ~67.628 tbsp
      'fl oz': 2, // 1 fl oz = 2 tbsp
      clove: 1, // Keep cloves as-is (not a volume unit)
      item: 1, // Keep items as-is
      piece: 1, // Keep pieces as-is
      slice: 1, // Keep slices as-is
      can: 1, // Keep cans as-is
      package: 1, // Keep packages as-is
      bunch: 1, // Keep bunches as-is
      head: 1, // Keep heads as-is
      stalk: 1, // Keep stalks as-is
      sprig: 1, // Keep sprigs as-is
      leaf: 1, // Keep leaves as-is
      pinch: 1, // Keep pinches as-is
      dash: 1, // Keep dashes as-is
      handful: 1, // Keep handfuls as-is
      g: 1, // Keep grams as-is (weight unit)
      kg: 1, // Keep kg as-is (weight unit)
      lb: 1, // Keep pounds as-is (weight unit)
      oz: 1 // Keep ounces as-is (weight unit)
    }

    const conversionFactor = conversions[unit.toLowerCase()] || 1
    const convertedQuantity = quantity * conversionFactor

    // For volume units, convert to tbsp; for others, keep original unit
    const isVolumeUnit = [
      'tsp',
      'tbsp',
      'cup',
      'pint',
      'quart',
      'gallon',
      'ml',
      'liter',
      'fl oz'
    ].includes(unit.toLowerCase())
    const finalUnit = isVolumeUnit ? 'tbsp' : unit

    return {
      quantity: convertedQuantity,
      unit: finalUnit,
      baseName,
      originalItem
    }
  }

  private formatIngredient(ingredient: {
    totalQuantity: number
    unit: string
    baseName: string
  }): string {
    const { totalQuantity, unit, baseName } = ingredient

    // Debug logging

    if (unit === 'item') {
      return baseName
    }

    // Handle undefined, null, or NaN values
    if (
      totalQuantity === undefined ||
      totalQuantity === null ||
      isNaN(totalQuantity)
    ) {
      console.warn('totalQuantity is invalid for ingredient:', ingredient)
      return baseName
    }

    // For volume units converted to tbsp, try to convert back to more readable units
    if (unit === 'tbsp' && totalQuantity >= 16) {
      // Convert back to cups if >= 1 cup
      const cups = totalQuantity / 16
      if (cups % 1 === 0) {
        return `${cups} cup${cups > 1 ? 's' : ''} ${baseName}`
      } else if (cups >= 0.5) {
        return `${cups} cup${cups > 1 ? 's' : ''} ${baseName}`
      }
    }

    if (unit === 'tbsp' && totalQuantity >= 3 && totalQuantity < 16) {
      // Convert back to tbsp if >= 3 tbsp
      return `${Math.round(totalQuantity * 10) / 10} tbsp ${baseName}`
    }

    if (unit === 'tbsp' && totalQuantity < 3) {
      // Convert back to tsp if < 3 tbsp
      const tsp = totalQuantity * 3
      if (tsp % 1 === 0) {
        return `${tsp} tsp ${baseName}`
      } else {
        return `${Math.round(tsp * 10) / 10} tsp ${baseName}`
      }
    }

    // Format quantity nicely for other units
    let formattedQuantity = totalQuantity.toString()
    if (totalQuantity % 1 !== 0) {
      // Convert decimal to fraction for common cases
      if (totalQuantity === 0.5) formattedQuantity = '1/2'
      else if (totalQuantity === 0.25) formattedQuantity = '1/4'
      else if (totalQuantity === 0.75) formattedQuantity = '3/4'
      else if (totalQuantity === 1.5) formattedQuantity = '1 1/2'
      else if (totalQuantity === 2.5) formattedQuantity = '2 1/2'
      else {
        formattedQuantity = Math.round(totalQuantity * 10) / 10
      }
    }

    return `${formattedQuantity} ${unit} ${baseName}`
  }

  private async generateGroceryListFromMeals(meals: any[]): Promise<string[]> {
    const allIngredients: string[] = []

    for (const meal of meals) {
      // Find the recipe in the database
      const recipe = await prisma.recipe.findUnique({
        where: { name: meal.recipeName }
      })

      if (recipe) {
        // Add all ingredients from this recipe
        allIngredients.push(...recipe.ingredients)
      } else {
        console.warn(`Recipe not found in database: ${meal.recipeName}`)
      }
    }

    return allIngredients
  }
}

export const mealPlanService = new MealPlanService()
