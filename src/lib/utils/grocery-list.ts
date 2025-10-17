import { prisma } from '../prisma.js'

export interface ParsedIngredient {
  quantity: number
  unit: string
  baseName: string
  originalItem: string
}

export interface IngredientMapEntry {
  totalQuantity: number
  unit: string
  baseName: string
  originalItem: string
  allItems: string[]
}

export class GroceryListUtils {
  static async generateGroceryListFromMeals(meals: any[]): Promise<string[]> {
    const allIngredients: string[] = []

    for (const meal of meals) {
      const recipe = await prisma.recipe.findUnique({
        where: { name: meal.recipeName }
      })

      if (recipe) {
        allIngredients.push(...recipe.ingredients)
      } else {
        console.warn(`Recipe not found in database: ${meal.recipeName}`)
      }
    }

    return allIngredients
  }

  static deduplicateGroceryList(groceryList: string[]): string[] {
    const ingredientMap = new Map<string, IngredientMapEntry>()

    for (const item of groceryList) {
      const parsed = this.parseIngredient(item)
      const converted = this.convertToCommonUnit(parsed)
      const key = converted.baseName.toLowerCase()

      if (ingredientMap.has(key)) {
        const existing = ingredientMap.get(key)!
        existing.totalQuantity += converted.quantity
        existing.allItems.push(item)
      } else {
        ingredientMap.set(key, {
          ...converted,
          totalQuantity: converted.quantity,
          allItems: [item]
        })
      }
    }

    return Array.from(ingredientMap.values())
      .map((ingredient) => this.formatIngredient(ingredient))
      .sort()
  }

  private static parseIngredient(item: string): ParsedIngredient {
    // Try parsing with unit first
    const withUnitMatch = item.match(/^(\d+(?:\/\d+)?)\s*([a-zA-Z]+)\s+(.+)$/)
    if (withUnitMatch) {
      const [, quantityStr, unit, name] = withUnitMatch
      return this.createParsedIngredient(
        quantityStr,
        unit.toLowerCase(),
        name,
        item
      )
    }

    // Try parsing without unit
    const noUnitMatch = item.match(/^(\d+(?:\/\d+)?)\s+(.+)$/)
    if (noUnitMatch) {
      const [, quantityStr, name] = noUnitMatch
      return this.createParsedIngredient(quantityStr, 'item', name, item)
    }

    // Default case - no quantity found
    return this.createParsedIngredient('1', 'item', item, item)
  }

  private static createParsedIngredient(
    quantityStr: string,
    unit: string,
    name: string,
    originalItem: string
  ): ParsedIngredient {
    return {
      quantity: this.parseQuantity(quantityStr),
      unit,
      baseName: this.normalizeIngredientName(name),
      originalItem
    }
  }

  private static parseQuantity(quantityStr: string): number {
    if (quantityStr.includes('/')) {
      const [numerator, denominator] = quantityStr.split('/').map(Number)
      return numerator / denominator
    }
    return Number(quantityStr)
  }

  private static normalizeIngredientName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s*\(.*?\)/g, '')
      .replace(/\s*-\s*/g, ' ')
      .replace(/\s*,\s*/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\b(diced|chopped|sliced|minced|grated|shredded)(\s+|$)/g, '')
      .replace(/\b(fresh|dried|frozen|canned|drained|soaked)(\s+|$)/g, '')
      .trim()
  }

  private static convertToCommonUnit(
    parsed: ParsedIngredient
  ): ParsedIngredient {
    const { quantity, unit, baseName, originalItem } = parsed

    if (baseName.includes('onion') && unit === 'item') {
      return { quantity: quantity * 16, unit: 'tbsp', baseName, originalItem }
    }

    const conversions: { [key: string]: number } = {
      tsp: 1 / 3,
      tbsp: 1,
      cup: 16,
      pint: 32,
      quart: 64,
      gallon: 256,
      ml: 1 / 14.787,
      liter: 67.628,
      'fl oz': 2,
      clove: 1,
      item: 1,
      piece: 1,
      slice: 1,
      can: 1,
      package: 1,
      bunch: 1,
      head: 1,
      stalk: 1,
      sprig: 1,
      leaf: 1,
      pinch: 1,
      dash: 1,
      handful: 1,
      g: 1,
      kg: 1,
      lb: 1,
      oz: 1
    }

    const conversionFactor = conversions[unit.toLowerCase()] || 1
    const convertedQuantity = quantity * conversionFactor

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

  private static formatIngredient(ingredient: IngredientMapEntry): string {
    const { totalQuantity, unit, baseName } = ingredient

    if (unit === 'item') {
      return baseName
    }

    if (
      totalQuantity === undefined ||
      totalQuantity === null ||
      isNaN(totalQuantity)
    ) {
      console.warn('totalQuantity is invalid for ingredient:', ingredient)
      return baseName
    }

    if (unit === 'tbsp' && totalQuantity >= 16) {
      const cups = totalQuantity / 16
      if (cups % 1 === 0) {
        return `${cups} cup${cups > 1 ? 's' : ''} ${baseName}`
      } else if (cups >= 0.5) {
        return `${cups} cup${cups > 1 ? 's' : ''} ${baseName}`
      }
    }

    if (unit === 'tbsp' && totalQuantity >= 3 && totalQuantity < 16) {
      return `${Math.round(totalQuantity * 10) / 10} tbsp ${baseName}`
    }

    if (unit === 'tbsp' && totalQuantity < 3) {
      const tsp = totalQuantity * 3
      if (tsp % 1 === 0) {
        return `${tsp} tsp ${baseName}`
      } else {
        return `${Math.round(tsp * 10) / 10} tsp ${baseName}`
      }
    }

    let formattedQuantity = totalQuantity.toString()
    if (totalQuantity % 1 !== 0) {
      if (totalQuantity === 0.5) formattedQuantity = '1/2'
      else if (totalQuantity === 0.25) formattedQuantity = '1/4'
      else if (totalQuantity === 0.75) formattedQuantity = '3/4'
      else if (totalQuantity === 1.5) formattedQuantity = '1 1/2'
      else if (totalQuantity === 2.5) formattedQuantity = '2 1/2'
      else {
        formattedQuantity = (Math.round(totalQuantity * 10) / 10).toString()
      }
    }

    return `${formattedQuantity} ${unit} ${baseName}`
  }
}
