import type { MealPreferences } from './openai.js'

export class MessageParser {
  parseUserMessage(
    message: string,
    currentPreferences: MealPreferences
  ): MealPreferences {
    const lowerMessage = message.toLowerCase()

    const base = currentPreferences.specialRequests ?? ''
    const counts = this.extractProteinCounts(lowerMessage)
    const countsTag = this.buildRequireProteinCountsTag(counts)
    const exclusive = this.extractExclusiveProtein(lowerMessage)
    const exclusiveTag = exclusive ? `exclusive-protein:${exclusive}` : ''
    // Remove stale tokens (exclusive/require) from the base before merging new ones
    const baseClean = base
      .replace(/exclusive-protein:\w+/gi, '')
      .replace(/require-proteins?:[^,]+/gi, '')
      .replace(/require-protein-counts?:[^,]+/gi, '')
      .replace(/\s*,\s*,/g, ',')
      .replace(/^\s*,|,\s*$/g, '')
      .trim()
    const mergedSpecial = [baseClean, countsTag].filter(Boolean).join(', ')
    const mergedWithExclusive = [mergedSpecial, exclusiveTag]
      .filter(Boolean)
      .join(', ')

    const extractedRestrictions = this.extractDietaryRestrictions(
      lowerMessage,
      currentPreferences.dietaryRestrictions
    )
    const dietaryRestrictions = exclusive ? [] : extractedRestrictions

    const specialCombined = this.extractSpecialRequests(
      lowerMessage,
      mergedWithExclusive
    )
    const finalSpecial = exclusive
      ? this.cleanSpecialRequestsForExclusive(specialCombined, exclusive)
      : specialCombined

    return {
      dietaryRestrictions,
      cuisinePreferences: this.extractCuisinePreferences(
        lowerMessage,
        currentPreferences.cuisinePreferences
      ),
      mealTypes: this.extractMealTypes(
        lowerMessage,
        currentPreferences.mealTypes
      ),
      cookingTime: this.extractCookingTime(
        lowerMessage,
        currentPreferences.cookingTime
      ),
      difficulty: this.extractDifficulty(
        lowerMessage,
        currentPreferences.difficulty
      ),
      servingSize: this.extractServingSize(
        lowerMessage,
        currentPreferences.servingSize
      ),
      specialRequests: finalSpecial
    }
  }

  shouldGenerateMealPlan(
    message: string,
    isFirstMessage: boolean = false
  ): boolean {
    // Always generate a meal plan on the first message
    if (isFirstMessage) {
      return true
    }

    const lowerMessage = message.toLowerCase()

    // If the user is asking to add meals (e.g., "add lunches"), we should generate
    if (this.shouldAddToExistingMealPlan(message)) {
      return true
    }
    if (this.shouldModifyExistingMealPlan(message)) {
      return true
    }
    if (this.containsDislikeIntent(message)) {
      return true
    }
    const generateKeywords = [
      'create',
      'generate',
      'make',
      'plan',
      'provide',
      'meal plan',
      'meals',
      'cook',
      'recipe',
      'what should i eat',
      'what to cook',
      'meal ideas',
      'dinner ideas'
    ]

    if (generateKeywords.some((keyword) => lowerMessage.includes(keyword))) {
      return true
    }

    const mealTypeWithNumber =
      /\b\d+\s+(dinner|dinners|breakfast|breakfasts|lunch|lunches|meal|meals)\b/.test(
        lowerMessage
      )
    if (mealTypeWithNumber) return true

    const mealTypeWithDietary =
      /(dinner|breakfast|lunch|meal|meals).*(vegetarian|vegan|gluten-free|gluten free|dairy-free|dairy free|keto|paleo|low-carb|low carb|high-protein|high protein)/.test(
        lowerMessage
      )
    if (mealTypeWithDietary) return true

    const dietaryWithMealContext =
      /(vegetarian|vegan|gluten-free|gluten free|dairy-free|dairy free|keto|paleo|low-carb|low carb|high-protein|high protein).*(dinner|breakfast|lunch|meal|meals)/.test(
        lowerMessage
      )
    if (dietaryWithMealContext) return true

    const multipleMealTypes = ['breakfast', 'lunch', 'dinner'].filter((type) =>
      lowerMessage.includes(type)
    ).length
    if (multipleMealTypes >= 2) return true

    return false
  }

  shouldAddToExistingMealPlan(message: string): boolean {
    const lowerMessage = message.toLowerCase()
    const addKeywords = ['add', 'also', 'too', 'additionally', 'plus', 'more']
    const replaceKeywords = ['replace', 'change', 'new', 'different', 'instead']
    const createKeywords = [
      'create',
      'generate',
      'make',
      'plan',
      'meal plan',
      'meals'
    ]

    const hasAddKeywords = addKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    )
    const hasReplaceKeywords = replaceKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    )
    const hasCreateKeywords = createKeywords.some((keyword) =>
      lowerMessage.includes(keyword)
    )

    if (
      message.includes('add') &&
      (message.includes('lunch') ||
        message.includes('breakfast') ||
        message.includes('dinner'))
    ) {
      return true
    }

    if (hasReplaceKeywords) return false
    if (hasCreateKeywords) return false

    const mealTypeCount = ['breakfast', 'lunch', 'dinner'].filter((type) =>
      lowerMessage.includes(type)
    ).length
    if (mealTypeCount >= 2 && !hasAddKeywords) return false

    return hasAddKeywords
  }

  shouldModifyExistingMealPlan(message: string): boolean {
    const lowerMessage = message.toLowerCase()
    const modifyKeywords = [
      'replace',
      'swap',
      'change',
      'instead of',
      'make it',
      'switch'
    ]
    const hasModify = modifyKeywords.some((k) => lowerMessage.includes(k))
    // Must mention a protein or a recipe keyword to avoid false positives
    const contextKeywords = [
      'chicken',
      'beef',
      'fish',
      'pork',
      'turkey',
      'salmon',
      'shrimp',
      'tofu',
      'beans',
      'lentils',
      'taco',
      'soup',
      'salad',
      'pasta',
      'curry',
      'dish',
      'recipe',
      'meal'
    ]
    const hasContext = contextKeywords.some((k) => lowerMessage.includes(k))
    return (hasModify && hasContext) || this.containsDislikeIntent(lowerMessage)
  }

  private containsDislikeIntent(message: string): boolean {
    const m = message.toLowerCase()
    const patterns = [
      /don['’]?t\s+like\s+\w+/i,
      /do\s+not\s+like\s+\w+/i,
      /dislike\s+\w+/i,
      /allergic\s+to\s+\w+/i,
      /avoid\s+\w+/i,
      /no\s+\w+/i
    ]
    return patterns.some((re) => re.test(m))
  }

  wantsNewPlan(message: string): boolean {
    const m = message.toLowerCase()
    const keywords = [
      'new plan',
      'new menu',
      'another plan',
      'another menu',
      'different plan',
      'different menu',
      'refresh plan',
      'start over'
    ]
    return keywords.some((k) => m.includes(k))
  }

  extractProteinCounts(message: string): Record<string, number> {
    const counts: Record<string, number> = {}
    const regex =
      /(\d+)\s+(chicken|beef|fish|pork|turkey|salmon|shrimp|tofu|beans|lentils)\b/g
    let m: RegExpExecArray | null
    while ((m = regex.exec(message)) !== null) {
      const n = parseInt(m[1])
      const p = m[2]
      counts[p] = (counts[p] || 0) + (isNaN(n) ? 0 : n)
    }
    // Also handle phrases like "3 chicken dishes" (already covered) or "4 beef meals" (covered)
    // No-op for unspecified counts here
    return counts
  }

  extractAddProteinCounts(message: string): Record<string, number> {
    const lower = message.toLowerCase()
    const hasAdd = this.shouldAddToExistingMealPlan(lower)
    const counts = this.extractProteinCounts(lower)
    if (!hasAdd) return {}
    if (Object.keys(counts).length > 0) return counts
    const proteins = [
      'chicken',
      'beef',
      'fish',
      'pork',
      'turkey',
      'salmon',
      'shrimp',
      'tofu',
      'beans',
      'lentils'
    ]
    const mentioned = proteins.filter((p) => lower.includes(p))
    const out: Record<string, number> = {}
    mentioned.forEach((p) => {
      out[p] = (out[p] || 0) + 1
    })
    return out
  }

  buildRequireProteinCountsTag(counts: Record<string, number>): string | null {
    const entries = Object.entries(counts).filter(([, n]) => n && n > 0)
    if (!entries.length) return null
    return `require-protein-counts:${entries.map(([k, n]) => `${k}=${n}`).join('|')}`
  }

  extractExclusiveProtein(message: string): string | null {
    const patterns = [
      /only\s+(chicken|beef|fish|pork|turkey|salmon|shrimp|tofu|bean|beans|lentil|lentils|chickpea|chickpeas|legume|legumes)/i,
      /(chicken|beef|fish|pork|turkey|salmon|shrimp|tofu|bean|beans|lentil|lentils|chickpea|chickpeas|legume|legumes)\s+only/i,
      /just\s+(chicken|beef|fish|pork|turkey|salmon|shrimp|tofu|bean|beans|lentil|lentils|chickpea|chickpeas|legume|legumes)/i,
      /exclusiv\w*\s+(chicken|beef|fish|pork|turkey|salmon|shrimp|tofu|bean|beans|lentil|lentils|chickpea|chickpeas|legume|legumes)/i,
      /all\s+(chicken|beef|fish|pork|turkey|salmon|shrimp|tofu|bean|beans|lentil|lentils|chickpea|chickpeas|legume|legumes)/i
    ]
    for (const re of patterns) {
      const m = message.match(re)
      if (m && m[1]) return m[1].toLowerCase()
    }
    return null
  }

  private cleanSpecialRequestsForExclusive(
    special: string,
    exclusiveRaw: string
  ): string {
    let s = special || ''
    // Drop require-* tokens which conflict with exclusivity
    s = s
      .replace(/require-proteins?:[^,]+/gi, '')
      .replace(/require-protein-counts?:[^,]+/gi, '')

    // Remove dislike/avoid tokens that conflict with the exclusive category
    const synonyms = this.exclusiveSynonyms(exclusiveRaw)
    for (const word of synonyms) {
      const w = word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
      s = s
        .replace(new RegExp(`(?:^|,\s*)no\s+${w}(?=\b|,|$)`, 'gi'), '')
        .replace(new RegExp(`(?:^|,\s*)avoid\s+${w}(?=\b|,|$)`, 'gi'), '')
        .replace(
          new RegExp(`(?:^|,\s*)don['’]?t\s+like\s+${w}(?=\b|,|$)`, 'gi'),
          ''
        )
        .replace(
          new RegExp(`(?:^|,\s*)do\s+not\s+like\s+${w}(?=\b|,|$)`, 'gi'),
          ''
        )
        .replace(new RegExp(`(?:^|,\s*)dislike\s+${w}(?=\b|,|$)`, 'gi'), '')
        .replace(
          new RegExp(`(?:^|,\s*)allergic\s+to\s+${w}(?=\b|,|$)`, 'gi'),
          ''
        )
    }

    // Cleanup duplicates/extra commas
    s = s
      .replace(/\s*,\s*,/g, ',')
      .replace(/^\s*,|,\s*$/g, '')
      .trim()
    return s
  }

  private exclusiveSynonyms(exclusiveRaw: string): string[] {
    const t = (exclusiveRaw || '').toLowerCase()
    if (
      [
        'fish',
        'salmon',
        'cod',
        'tilapia',
        'seafood',
        'shrimp',
        'prawn',
        'scallop'
      ].includes(t)
    ) {
      return [
        'fish',
        'salmon',
        'cod',
        'tilapia',
        'seafood',
        'shrimp',
        'prawn',
        'scallop'
      ]
    }
    if (
      [
        'lentil',
        'lentils',
        'bean',
        'beans',
        'chickpea',
        'chickpeas',
        'legume',
        'legumes'
      ].includes(t)
    ) {
      return [
        'lentil',
        'lentils',
        'bean',
        'beans',
        'chickpea',
        'chickpeas',
        'legume',
        'legumes'
      ]
    }
    if (['tofu', 'tempeh'].includes(t)) {
      return ['tofu', 'tempeh']
    }
    return [t]
  }

  extractRequestedCount(message: string): number | null {
    const numberMatch = message.match(
      /(\d+)\s+(dinner|breakfast|lunch|meal|meals)/i
    )
    return numberMatch ? parseInt(numberMatch[1]) : null
  }

  private extractDietaryRestrictions(
    message: string,
    current: string[]
  ): string[] {
    const dietaryKeywords = [
      'vegetarian',
      'vegan',
      'gluten-free',
      'gluten free',
      'dairy-free',
      'dairy free',
      'keto',
      'paleo',
      'low-carb',
      'low carb',
      'high-protein',
      'high protein'
    ]
    const found = dietaryKeywords.filter((keyword) => message.includes(keyword))
    return found.length > 0 ? found : current
  }

  private extractCuisinePreferences(
    message: string,
    current: string[]
  ): string[] {
    const cuisineKeywords = [
      'italian',
      'mexican',
      'asian',
      'indian',
      'mediterranean',
      'american',
      'thai',
      'chinese',
      'japanese'
    ]
    const found = cuisineKeywords.filter((keyword) => message.includes(keyword))
    return found.length > 0 ? found : current
  }

  private extractMealTypes(message: string, current: string[]): string[] {
    // Scope restriction: dinners only
    return ['dinner']
  }

  private extractCookingTime(message: string, current: string): string {
    if (message.includes('quick') || message.includes('fast'))
      return '15-30 minutes'
    if (message.includes('long') || message.includes('slow'))
      return '60+ minutes'
    if (message.includes('medium')) return '30-60 minutes'
    return current
  }

  private extractDifficulty(message: string, current: string): string {
    if (message.includes('easy') || message.includes('simple')) return 'easy'
    if (
      message.includes('hard') ||
      message.includes('difficult') ||
      message.includes('advanced')
    )
      return 'hard'
    if (message.includes('medium') || message.includes('intermediate'))
      return 'medium'
    return current
  }

  private extractServingSize(message: string, current: number): number {
    const servingMatch = message.match(/(\d+)\s+(people|servings|serves)/i)
    return servingMatch ? parseInt(servingMatch[1]) : current
  }

  private extractSpecialRequests(message: string, current: string): string {
    // Extract any special requests that aren't covered by other categories
    const patternsWithPrefix: Array<[RegExp, string]> = [
      [/no\s+(\w+)/gi, 'no'],
      [/avoid\s+(\w+)/gi, 'avoid'],
      [/don['’]?t\s+like\s+(\w+)/gi, "don't like"],
      [/do\s+not\s+like\s+(\w+)/gi, 'do not like'],
      [/dislike\s+(\w+)/gi, 'dislike'],
      [/allergic\s+to\s+(\w+)/gi, 'allergic to'],
      [/prefer\s+(\w+)/gi, 'prefer'],
      [/want\s+(\w+)/gi, 'want'],
      [/with\s+(\w+)/gi, 'with'],
      [/high\s+(\w+)/gi, 'high'],
      [/low\s+(\w+)/gi, 'low'],
      [/more\s+(\w+)/gi, 'more']
    ]
    const stopwords = new Set(['only', 'just', 'all'])
    const requests: string[] = []
    const disliked: string[] = []
    for (const [re, prefix] of patternsWithPrefix) {
      let m: RegExpExecArray | null
      while ((m = re.exec(message)) !== null) {
        const term = (m[1] || '').toLowerCase()
        if (!term || stopwords.has(term)) continue
        const token = `${prefix} ${term}`
        requests.push(token)
      }
    }
    // Capture disliked/avoid terms for filtering protein requirements
    const dislikeOnlyPatterns = [
      /no\s+(\w+)/gi,
      /avoid\s+(\w+)/gi,
      /don['’]?t\s+like\s+(\w+)/gi,
      /do\s+not\s+like\s+(\w+)/gi,
      /dislike\s+(\w+)/gi,
      /allergic\s+to\s+(\w+)/gi
    ]
    dislikeOnlyPatterns.forEach((re) => {
      let m: RegExpExecArray | null
      while ((m = re.exec(message)) !== null) {
        disliked.push(m[1])
      }
    })

    // Detect explicit protein category requirements (e.g., "1 chicken, 1 fish, 1 beef")
    const proteinWords = [
      'chicken',
      'beef',
      'fish',
      'pork',
      'turkey',
      'salmon',
      'shrimp',
      'tofu',
      'beans',
      'lentils'
    ]
    const dislikeSet = new Set(disliked.map((w) => w.toLowerCase()))
    const requiredProteins = Array.from(
      new Set(
        proteinWords.filter((p) => message.includes(p) && !dislikeSet.has(p))
      )
    )

    const base = requests.length > 0 ? requests.join(', ') : current
    if (requiredProteins.length > 0) {
      const tag = `require-proteins:${requiredProteins.join('|')}`
      return base ? `${base}, ${tag}` : tag
    }
    return base
  }
}

export const messageParser = new MessageParser()
