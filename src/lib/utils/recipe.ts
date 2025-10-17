export class RecipeUtils {
  static inferProteinFromRecipe(recipe: any): string {
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

  static passesConstraints(recipe: any, preferences: any): boolean {
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

  static extractDislikedTerms(message: string): string[] {
    const lower = (message || '').toLowerCase()
    const terms: string[] = []
    const patterns = [
      /no\s+(\w+)/gi,
      /avoid\s+(\w+)/gi,
      /don['']?t\s+like\s+(\w+)/gi,
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

  static getDesiredProteinCounts(input: string): Map<string, number> {
    const out = new Map<string, number>()
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

  static normalizeProteinToken(k: string): string {
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

  static safeParsePreferences(prefs: any): any {
    try {
      return typeof prefs === 'string' ? JSON.parse(prefs) : prefs
    } catch {
      return {}
    }
  }
}
