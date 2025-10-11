export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface MealPlan {
  id: string
  preferences: string
  groceryList: string[]
  meals: Meal[]
}

export interface Meal {
  id: string
  dayOfWeek: string
  mealType: string
  recipe: Recipe
}

export interface Recipe {
  id: string
  name: string
  description: string
  ingredients: string[]
  instructions: string[]
  prepTime: number
  cookTime: number
  servings: number
  cuisine: string
  dietaryTags: string[]
  difficulty: string
}
