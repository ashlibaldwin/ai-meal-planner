// Use recording OpenAI wrapper in tests to allow record/replay of real responses
// Falls back to real OpenAI in normal runs
// @ts-ignore
import RecordingOpenAI from './__tests__/recording-openai.js'
import OpenAI from 'openai'
import { config } from './config.js'

const openai = process.env.VITEST
  ? new (RecordingOpenAI as any)()
  : new OpenAI({ apiKey: config.openaiApiKey })

export interface MealPreferences {
  dietaryRestrictions: string[]
  cuisinePreferences: string[]
  mealTypes: string[]
  cookingTime: string
  difficulty: string
  servingSize: number
  specialRequests?: string
}

export interface MealPlanResponse {
  meals: {
    dayOfWeek: string
    mealType: string
    recipeName: string
    description: string
  }[]
  reasoning: string
}

export interface ParsedPreferences {
  mealTypes?: string[]
  maxMinutes?: number | null
  difficulty?: 'easy' | 'medium' | 'hard' | null
  goals?: string[]
  dietaryRestrictions?: string[]
  proteinPreferences?: Record<string, number>
  disallowedTags?: string[]
}

export async function parsePreferencesWithLLM(
  userMessage: string
): Promise<ParsedPreferences | null> {
  const prompt = `Extract structured meal planning preferences from the user's message. Return strict JSON only with keys: mealTypes (string[]), maxMinutes (number|null), difficulty ("easy"|"medium"|"hard"|null), goals (string[]), dietaryRestrictions (string[]), proteinPreferences (object of counts), disallowedTags (string[]). If unknown, use null or empty structures. Do not include commentary.`
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a meal planning assistant that outputs strict JSON only.'
        },
        {
          role: 'user',
          content: `${prompt}\n\nUser message: ${JSON.stringify(userMessage)}`
        }
      ],
      temperature: 0,
      max_tokens: 400
    })
    const content = completion.choices[0]?.message?.content || '{}'
    const m = content.match(/\{[\s\S]*\}/)
    const json = m ? m[0] : content
    return JSON.parse(json)
  } catch (e) {
    console.warn('LLM preference parsing failed, falling back:', e)
    return null
  }
}

export async function generateMealPlan(
  preferences: MealPreferences,
  availableRecipes: any[],
  requestedCount?: number | null,
  excludeRecipeNames?: string[] | null,
  mode?: 'createNewPlan' | 'updateExistingPlan'
): Promise<MealPlanResponse> {
  type Recipe = {
    name: string
    description?: string
    ingredients: string[]
    cuisine?: string
    dietaryTags?: string[]
    difficulty?: string
    prepTime?: number
    cookTime?: number
  }

  const MINUTES = (r: Recipe) => (r.prepTime ?? 0) + (r.cookTime ?? 0)

  function toMaxMinutes(cookingTime: string): number | null {
    const s = (cookingTime || '').toLowerCase()
    if (
      s.includes('under 30') ||
      s.includes('0-30') ||
      s.includes('0-20') ||
      s.includes('quick')
    )
      return 30
    if (s.includes('30-60') || (s.includes('30') && s.includes('60'))) return 60
    if (s.includes('60+') || s.includes('over 60') || s.includes('long'))
      return 120
    return null
  }

  function passesHardConstraints(r: Recipe): boolean {
    if (preferences.dietaryRestrictions?.length) {
      const tags = (r.dietaryTags || []).map((t) => t.toLowerCase())
      for (const need of preferences.dietaryRestrictions) {
        if (!tags.includes(need.toLowerCase())) return false
      }
    }
    if (
      preferences.difficulty &&
      r.difficulty &&
      preferences.difficulty !== 'any'
    ) {
      if (r.difficulty.toLowerCase() !== preferences.difficulty.toLowerCase())
        return false
    }
    const maxMins = toMaxMinutes(preferences.cookingTime)
    if (maxMins && MINUTES(r) > maxMins) return false
    return true
  }

  function inferVarietyKey(r: Recipe): string {
    if (r.cuisine) return r.cuisine
    const text = (r.ingredients || []).join(' ').toLowerCase()
    if (/(chicken)/.test(text)) return 'chicken'
    if (/(beef)/.test(text)) return 'beef'
    if (/(pork|bacon)/.test(text)) return 'pork'
    if (/(salmon|cod|tilapia|fish)/.test(text)) return 'fish'
    if (/(shrimp|prawn|scallop|seafood)/.test(text)) return 'seafood'
    if (/(tofu|tempeh)/.test(text)) return 'tofu'
    if (/(bean|lentil|chickpea)/.test(text)) return 'legume'
    return 'unknown'
  }

  function inferProtein(r: Recipe): string {
    const text = (r.ingredients || []).join(' ').toLowerCase()
    if (/(chicken|thigh|breast)/.test(text)) return 'chicken'
    if (/(beef|steak|ground\s+beef)/.test(text)) return 'beef'
    if (/(pork|bacon)/.test(text)) return 'pork'
    if (/(salmon|cod|tilapia|fish)/.test(text)) return 'fish'
    if (/(shrimp|prawn|scallop|seafood)/.test(text)) return 'seafood'
    if (/(turkey)/.test(text)) return 'turkey'
    if (/(tofu|tempeh)/.test(text)) return 'tofu'
    if (/(bean|lentil|chickpea)/.test(text)) return 'legume'
    return 'unknown'
  }

  function normalizeProteinForCounts(key: string): string {
    const k = (key || '').toLowerCase()
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
      ].includes(k)
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
      ].includes(k)
    )
      return 'legume'
    if (['tempeh'].includes(k)) return 'tofu'
    return k
  }

  function normalizeExclusiveToken(token: string | null): string | null {
    if (!token) return null
    const t = token.toLowerCase()
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
      ].includes(t)
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
      ].includes(t)
    )
      return 'legume'
    if (['tempeh'].includes(t)) return 'tofu'
    return t
  }

  function exclusiveSynonyms(token: string): string[] {
    const t = (token || '').toLowerCase()
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
    )
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
    if (
      [
        'legume',
        'lentil',
        'lentils',
        'bean',
        'beans',
        'chickpea',
        'chickpeas',
        'legumes'
      ].includes(t)
    )
      return [
        'legume',
        'lentil',
        'lentils',
        'bean',
        'beans',
        'chickpea',
        'chickpeas',
        'legumes'
      ]
    if (['tofu', 'tempeh'].includes(t)) return ['tofu', 'tempeh']
    return [t]
  }

  function cleanSpecialForExclusive(
    special: string | undefined,
    exclusive: string | null
  ): string | undefined {
    if (!special) return special
    if (!exclusive) return special
    const words = exclusiveSynonyms(exclusive)
    let s = special
    for (const wRaw of words) {
      const w = wRaw.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')
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
    // remove double commas and trim
    s = s
      .replace(/\s*,\s*,/g, ',')
      .replace(/^\s*,|,\s*$/g, '')
      .trim()
    // dedupe tokens
    const parts = s
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    const dedup = Array.from(new Set(parts))
    return dedup.join(', ')
  }

  function parseDislikedTermsFromSpecial(
    special: string | undefined
  ): Set<string> {
    const out = new Set<string>()
    const s = (special || '').toLowerCase()
    const patterns = [
      /no\s+(\w+)/g,
      /avoid\s+(\w+)/g,
      /don['’]?t\s+like\s+(\w+)/g,
      /do\s+not\s+like\s+(\w+)/g,
      /dislike\s+(\w+)/g,
      /allergic\s+to\s+(\w+)/g
    ]
    for (const re of patterns) {
      let m: RegExpExecArray | null
      while ((m = re.exec(s)) !== null) {
        out.add(m[1])
      }
    }
    return out
  }

  function parseRequireProteinCounts(
    special: string | undefined
  ): Map<string, number> {
    const result = new Map<string, number>()
    if (!special) return result
    const m = special.toLowerCase().match(/require-protein-counts:([a-z=|]+)/)
    if (!m) return result
    const pairs = m[1].split('|')
    for (const p of pairs) {
      const [name, numStr] = p.split('=')
      const n = Number(numStr)
      if (name && !isNaN(n) && n > 0) {
        result.set(name, (result.get(name) || 0) + n)
      }
    }
    return result
  }

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  function samplePool(recipes: Recipe[], target = 30): Recipe[] {
    if (recipes.length <= target) return shuffle(recipes)
    // Stratify by varietyKey, pick round-robin to avoid the same front slice
    const byKey = new Map<string, Recipe[]>()
    for (const r of recipes) {
      const key = inferVarietyKey(r)
      const list = byKey.get(key) || []
      list.push(r)
      byKey.set(key, list)
    }
    for (const [k, list] of byKey) byKey.set(k, shuffle(list))
    const keys = shuffle(Array.from(byKey.keys()))
    const out: Recipe[] = []
    let idx = 0
    while (out.length < target && keys.length > 0) {
      const key = keys[idx % keys.length]
      const list = byKey.get(key)!
      const picked = list.pop()
      if (picked) out.push(picked)
      if (!list.length) {
        byKey.delete(key)
        keys.splice(idx % keys.length, 1)
        idx = 0
      } else {
        idx++
      }
    }
    // Top up randomly from remaining
    if (out.length < target) {
      const remaining: Recipe[] = []
      for (const list of byKey.values()) remaining.push(...list)
      out.push(...shuffle(remaining).slice(0, target - out.length))
    }
    return out
  }

  // Step 1: pre-filter and cap pool size
  const excludeSet = new Set(
    (excludeRecipeNames || []).map((n) => n.toLowerCase())
  )
  // Respect the latest exclusive-protein token early to avoid sending irrelevant candidates
  const specials = (preferences.specialRequests || '').toLowerCase()
  const exclusiveTokens = Array.from(
    specials.matchAll(/exclusive-protein:(\w+)/g)
  ).map((m) => m[1])
  const exclusiveProteinPre = exclusiveTokens.length
    ? exclusiveTokens[exclusiveTokens.length - 1]
    : null
  let filtered: Recipe[] = availableRecipes
    .filter(passesHardConstraints)
    .filter((r) => !excludeSet.has((r.name || '').toLowerCase()))
    .filter((r) => {
      const exclusiveNorm = normalizeExclusiveToken(exclusiveProteinPre)
      return (
        !exclusiveNorm ||
        normalizeProteinForCounts(inferProtein(r)) === exclusiveNorm
      )
    })
  // Remove disliked items at the pool stage
  const disliked = parseDislikedTermsFromSpecial(preferences.specialRequests)
  if (disliked.size > 0) {
    // If exclusive conflicts with dislikes (e.g., exclusive=legume and dislike includes lentils), drop conflicting dislikes
    const exclusiveNorm = normalizeExclusiveToken(exclusiveProteinPre)
    if (exclusiveNorm === 'legume') {
      for (const w of [
        'lentil',
        'lentils',
        'bean',
        'beans',
        'chickpea',
        'chickpeas',
        'legume',
        'legumes'
      ])
        disliked.delete(w)
    }
    if (exclusiveNorm === 'fish') {
      for (const w of [
        'fish',
        'salmon',
        'cod',
        'tilapia',
        'seafood',
        'shrimp',
        'prawn',
        'scallop'
      ])
        disliked.delete(w)
    }
    if (exclusiveNorm === 'tofu') {
      for (const w of ['tofu', 'tempeh']) disliked.delete(w)
    }
    filtered = filtered.filter((r) => {
      const hay = [r.name, ...(r.ingredients || [])].join(' ').toLowerCase()
      for (const d of disliked) if (hay.includes(d)) return false
      return true
    })
  }
  // Soft-filter by cuisine preferences if we still have sufficient candidates
  const prefCuisines = (preferences.cuisinePreferences || []).map((c) =>
    (c || '').toLowerCase()
  )
  if (prefCuisines.length > 0) {
    const byCuisine = filtered.filter(
      (r) => r.cuisine && prefCuisines.includes(String(r.cuisine).toLowerCase())
    )
    if (byCuisine.length >= 10) {
      filtered = byCuisine
    }
  }
  // Fallback: if over-filtering yields zero candidates, relax dislikes first (but keep exclusive if present)
  let poolSource = filtered
  if (poolSource.length === 0) {
    const exclusiveNorm = normalizeExclusiveToken(exclusiveProteinPre)
    poolSource = availableRecipes
      .filter(passesHardConstraints)
      .filter((r) => !excludeSet.has((r.name || '').toLowerCase()))
      .filter(
        (r) =>
          !exclusiveNorm ||
          normalizeProteinForCounts(inferProtein(r)) === exclusiveNorm
      )
  }
  // Final fallback: if still empty, drop exclusive and proceed (to avoid total failure)
  if (poolSource.length === 0) {
    poolSource = availableRecipes
      .filter(passesHardConstraints)
      .filter((r) => !excludeSet.has((r.name || '').toLowerCase()))
  }
  const pool: Recipe[] = samplePool(poolSource, 20)
  // Explicitly shuffle to eliminate any residual positional bias in prompt presentation
  const poolForPrompt: Recipe[] = shuffle(pool)

  // Step 2: ask the model to score candidates
  const prefMax = toMaxMinutes(preferences.cookingTime) || undefined
  const specials2 = preferences.specialRequests || ''
  const exclusiveTokens2a = Array.from(
    specials2.toLowerCase().matchAll(/exclusive-protein:(\w+)/g)
  ).map((m) => m[1])
  const latestExclusive = exclusiveTokens2a.length
    ? normalizeExclusiveToken(exclusiveTokens2a[exclusiveTokens2a.length - 1])
    : null
  const cleanedSpecialForExclusive = cleanSpecialForExclusive(
    preferences.specialRequests,
    latestExclusive
  )
  const reqCounts = parseRequireProteinCounts(cleanedSpecialForExclusive)
  const proteinPreferences: Record<string, { requiredCount: number }> = {}
  for (const [k, v] of reqCounts.entries())
    proteinPreferences[normalizeProteinForCounts(k)] = { requiredCount: v }
  const structuredPrefs = {
    mealTypes: preferences.mealTypes,
    maxMinutes: prefMax,
    difficulty:
      preferences.difficulty === 'any' ? undefined : preferences.difficulty,
    goal: (cleanedSpecialForExclusive || '').toLowerCase() || undefined,
    proteinPreferences: Object.keys(proteinPreferences).length
      ? proteinPreferences
      : undefined,
    baseDiets: preferences.dietaryRestrictions?.length
      ? preferences.dietaryRestrictions
      : undefined,
    mode: mode || 'createNewPlan',
    instructions:
      mode === 'updateExistingPlan'
        ? 'Preserve existing meals unless needed to satisfy counts or new constraints.'
        : 'Create a new plan that satisfies all constraints.'
  }

  // Exclusive protein constraint via specialRequests tag
  const specialsLower = (cleanedSpecialForExclusive || '').toLowerCase()
  const exclusiveTokens2 = Array.from(
    specialsLower.matchAll(/exclusive-protein:(\w+)/g)
  ).map((m) => m[1])
  const exclusiveProtein = exclusiveTokens2.length
    ? exclusiveTokens2[exclusiveTokens2.length - 1]
    : null

  const scoringPrompt = `You are scoring recipes for a meal plan.

PREFERENCES (JSON):
${JSON.stringify(structuredPrefs)}

CANDIDATES (array):
${JSON.stringify(
  poolForPrompt.map((r, i) => ({
    idx: i,
    name: r.name,
    minutes: MINUTES(r),
    difficulty: r.difficulty,
    cuisine: r.cuisine,
    dietaryTags: r.dietaryTags
  }))
)}

Rules:
- Score each candidate 0–100 for FIT with preferences.
- Hard violations (e.g., exceeds maxMinutes or missing required base diet) must be scored 0.
- Consider fuzzy goals like "high-fiber", "high-protein", "low-carb" using available fields (dietaryTags, cuisine, difficulty, minutes).
 - Consider fuzzy goals like "high-fiber", "high-protein", "low-carb" using available fields (dietaryTags, cuisine, difficulty, minutes).
- If goals include a token like "require-proteins:chicken|fish|beef", you MUST ensure the top N picks cover those categories. Reflect coverage in scores and reasons.
- If goals include a token like "require-protein-counts:chicken=3|beef=4", ensure the final top N includes at least those counts; favor candidates that help meet the remaining required counts, and reflect it in scores and reasons.
 - If goals include a token like "exclusive-protein:chicken", you MUST choose only recipes whose primary protein is that type (normalize salmon/cod/shrimp to fish). Score all others 0.
- You must generate or edit a weekly meal plan that satisfies all required protein counts exactly. Each protein type with a requiredCount field must appear that many times. If you cannot meet the count, explicitly state which requirements were unmet.
- Penalize time > maxMinutes if present.
- VarietyKey = cuisine if present, else primary protein inferred from ingredients (beef, chicken, tofu, beans, fish, etc.).
- IMPORTANT: The candidate array index (idx) is arbitrary; IGNORE order and idx except for reporting.
- IMPORTANT: Do NOT default to first items. Treat every candidate independently.

Return strict JSON:
{"scores":[{"idx":0,"score":87,"why":"...","varietyKey":"Mexican"}]}
`

  // Debug: log scoring prompt
  console.log('=== AI SCORING PROMPT START ===')
  console.log(scoringPrompt)
  console.log('=== AI SCORING PROMPT END ===')

  const scoringCompletion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are an expert meal plan recipe scorer. First, internalize these rules: (1) Obey hard constraints (dietary restrictions and max minutes) with zero tolerance; (2) Score EACH candidate independently without considering list order; (3) Encourage variety across cuisines/proteins; (4) Avoid positional bias and do NOT favor earlier items; (5) Be deterministic and consistent. Keep reasoning concise.'
      },
      {
        role: 'system',
        content:
          'You are a meticulous scoring engine that outputs strict JSON only.'
      },
      { role: 'user', content: scoringPrompt }
    ],
    temperature: 0,
    top_p: 1,
    max_tokens: 600
  })

  const scoringText = scoringCompletion.choices[0]?.message?.content || '{}'
  let scoresObj: any = {}
  // Try strict JSON parse; if it fails, try to extract a JSON block via regex
  try {
    scoresObj = JSON.parse(scoringText)
  } catch {
    const match = scoringText.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        scoresObj = JSON.parse(match[0])
      } catch {}
    }
  }
  const byIdx = new Map<number, any>(
    (scoresObj.scores || []).map((s: any) => [s.idx, s])
  )

  type Scored = Recipe & {
    _idx: number
    _minutes: number
    _score: number
    _why: string
    _varietyKey: string
  }
  let scored: Scored[] = poolForPrompt.map((r, i) => ({
    ...r,
    _idx: i,
    _minutes: MINUTES(r),
    _score: Math.max(0, Math.min(100, Number(byIdx.get(i)?.score ?? 0))),
    _why: byIdx.get(i)?.why ?? '',
    _varietyKey: byIdx.get(i)?.varietyKey ?? inferVarietyKey(r)
  }))

  // If model returned empty/zero scores, apply heuristic scoring as fallback
  const allZero =
    scored.length > 0 && scored.every((s) => !s._score || s._score === 0)
  if (byIdx.size === 0 || allZero) {
    const goals = (preferences.specialRequests || '').toLowerCase()
    const wantsHighProtein =
      goals.includes('high-protein') ||
      goals.includes('high protein') ||
      goals.includes('protein')
    const wantsHighFiber =
      goals.includes('high-fiber') ||
      goals.includes('high fiber') ||
      goals.includes('fiber')
    const wantsLowCarb =
      goals.includes('low-carb') || goals.includes('low carb')
    const maxMins = toMaxMinutes(preferences.cookingTime)

    function contains(words: string[], hay: string) {
      return words.some((w) => hay.includes(w))
    }

    scored = poolForPrompt.map((r, i) => {
      const ing = (r.ingredients || []).join(' ').toLowerCase()
      let score = 50
      const mins = MINUTES(r)
      if (typeof maxMins === 'number') {
        // Reward being under time, penalize being over
        score += Math.max(-30, Math.min(20, maxMins - mins))
      }
      if (wantsHighProtein) {
        const proteinWords = [
          'chicken',
          'beef',
          'pork',
          'turkey',
          'salmon',
          'fish',
          'shrimp',
          'egg',
          'eggs',
          'tofu',
          'tempeh',
          'beans',
          'lentils',
          'chickpeas',
          'greek yogurt',
          'cottage cheese'
        ]
        if (contains(proteinWords, ing)) score += 20
      }
      if (wantsHighFiber) {
        const fiberWords = [
          'beans',
          'lentils',
          'chickpeas',
          'broccoli',
          'oats',
          'quinoa',
          'brown rice',
          'whole wheat',
          'barley',
          'peas',
          'berries',
          'avocado',
          'bran',
          'spinach'
        ]
        if (contains(fiberWords, ing)) score += 15
      }
      if (wantsLowCarb) {
        const carbWords = [
          'rice',
          'pasta',
          'noodle',
          'bread',
          'tortilla',
          'potato',
          'potatoes'
        ]
        if (contains(carbWords, ing)) score -= 15
      }
      score = Math.max(0, Math.min(100, score))
      return {
        ...r,
        _idx: i,
        _minutes: mins,
        _score: score,
        _why: byIdx.get(i)?.why ?? 'heuristic fallback scoring',
        _varietyKey: inferVarietyKey(r)
      }
    })
  }

  // If scores collapse (e.g., all ~same), request a strict ranking reroll
  function needsRerank(scores: number[]): boolean {
    if (scores.length === 0) return false
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    const sd = Math.sqrt(
      scores.reduce((a, b) => a + (b - mean) ** 2, 0) / scores.length
    )
    const freq = new Map<number, number>()
    for (const s of scores) freq.set(s, (freq.get(s) || 0) + 1)
    const maxTie = Math.max(...Array.from(freq.values()))
    return sd < 3 || maxTie > scores.length / 2
  }

  if (needsRerank(scored.map((s) => s._score))) {
    const rankPrompt = `Rank these recipe indices from best to worst fit for the preferences. No ties. The presented array order and idx values are arbitrary—ignore them. Return JSON: {"order":[indices...]}

PREFERENCES:\n${JSON.stringify(structuredPrefs)}

CANDIDATES:\n${JSON.stringify(
      poolForPrompt.map((r, i) => ({
        idx: i,
        name: r.name,
        minutes: MINUTES(r),
        difficulty: r.difficulty,
        cuisine: r.cuisine,
        dietaryTags: r.dietaryTags
      }))
    )}
`
    try {
      const rankResp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert meal plan recipe ranker. Rank strictly by best fit to preferences, ignoring input order, maximizing variety when ties are close, and respecting any require-protein-counts constraints.'
          },
          { role: 'system', content: 'Return strict JSON only.' },
          { role: 'user', content: rankPrompt }
        ],
        temperature: 0,
        max_tokens: 200
      })
      const rankText = rankResp.choices[0]?.message?.content || '{}'
      let orderObj: any = {}
      try {
        orderObj = JSON.parse(rankText)
      } catch {
        const m = rankText.match(/\{[\s\S]*\}/)
        if (m) {
          try {
            orderObj = JSON.parse(m[0])
          } catch {}
        }
      }
      const order: number[] = Array.isArray(orderObj.order)
        ? orderObj.order
        : []
      const scale = [
        100, 96, 93, 90, 88, 86, 84, 82, 80, 78, 76, 74, 72, 70, 68, 66, 64, 62,
        60, 58, 56, 54, 52, 50, 48, 46, 44, 42, 40, 38
      ]
      if (order.length) {
        order.forEach((idx: number, i: number) => {
          if (idx >= 0 && idx < scored.length) {
            scored[idx]._score = scale[i] ?? 35
            if (!scored[idx]._why) scored[idx]._why = 'ranked reroll'
          }
        })
      }
    } catch (e) {
      console.warn('Rank reroll failed:', e)
    }
  }

  // Step 3: pick a diverse top set
  // If exclusiveProtein is present, zero out scores for non-matching recipes
  const scoredAdj = scored.map((s) => {
    if (!exclusiveProtein) return s
    const p = normalizeProteinForCounts(inferProtein(s))
    if (p !== exclusiveProtein) return { ...s, _score: 0 }
    return s
  })
  const jittered = scoredAdj.map((s) => ({
    ...s,
    j: s._score * 100 - s._minutes + Math.random() * 3
  }))
  jittered.sort((a, b) => b.j - a.j)

  const out: Scored[] = []
  const seen = new Set<string>()
  const target = requestedCount && requestedCount > 0 ? requestedCount : 7
  // Hard enforce protein requirements if present
  const requireTag = (cleanedSpecialForExclusive || '')
    .toLowerCase()
    .match(/require-proteins:([a-z|]+)/)
  const requiredProteins = requireTag
    ? new Set(requireTag[1].split('|'))
    : new Set<string>()
  const requiredCounts = parseRequireProteinCounts(cleanedSpecialForExclusive)

  // Phase A: satisfy explicit protein COUNT quotas first
  if (requiredCounts.size > 0) {
    const remaining = new Map(requiredCounts)
    for (const r of jittered) {
      if (out.length === target) break
      const proteinKey = normalizeProteinForCounts(inferProtein(r))
      const need = remaining.get(proteinKey) || 0
      if (need > 0 && r._score > 0) {
        out.push(r)
        remaining.set(proteinKey, need - 1)
      }
      // exit early if all quotas met
      if (Array.from(remaining.values()).every((v) => v <= 0)) break
    }
    // If still missing quotas, try again allowing zero scores
    if (
      Array.from(remaining.values()).some((v) => v > 0) &&
      out.length < target
    ) {
      for (const r of jittered) {
        if (out.length === target) break
        if (out.includes(r)) continue
        const proteinKey = normalizeProteinForCounts(inferProtein(r))
        const need = remaining.get(proteinKey) || 0
        if (need > 0) {
          out.push(r)
          remaining.set(proteinKey, need - 1)
        }
        if (Array.from(remaining.values()).every((v) => v <= 0)) break
      }
    }
  }

  // Phase B: if explicit protein categories are required (no counts), satisfy each once
  if (requiredCounts.size === 0) {
    for (const r of jittered) {
      if (out.length === target) break
      const key = r._varietyKey
      const want = out.length < 4 ? !seen.has(key) : true
      const proteinKey = inferProtein(r)
      const satisfiesProtein = requiredProteins.size
        ? requiredProteins.has(proteinKey)
        : true
      if (r._score > 0 && want && satisfiesProtein) {
        out.push(r)
        seen.add(key)
        if (requiredProteins.has(proteinKey))
          requiredProteins.delete(proteinKey)
      }
    }
  }

  // Phase C: if target not reached, fill remaining slots by score while avoiding duplicates
  if (out.length < target) {
    for (const r of jittered) {
      if (out.length === target) break
      if (out.includes(r)) continue
      const key = r._varietyKey
      const want = out.length < 4 ? !seen.has(key) : true
      if (r._score > 0 && want) {
        out.push(r)
        seen.add(key)
      }
    }
  }
  // Fallback phase 1: top-up allowing zero scores
  for (const r of jittered) {
    if (out.length === target) break
    if (!out.includes(r)) out.push(r)
  }

  // Fallback phase 2: if still empty (e.g., scoring failed), use time-based + randomized picks from pool
  if (out.length === 0) {
    const byTime = [...pool]
      .map((r) => ({ r, t: MINUTES(r) + Math.random() * 5 }))
      .sort((a, b) => a.t - b.t)
      .map((x) => x.r)
    for (const r of byTime) {
      out.push({
        ...r,
        _idx: -1,
        _minutes: MINUTES(r),
        _score: 50 + Math.random() * 10,
        _why: 'fallback: quick + randomized',
        _varietyKey: inferVarietyKey(r)
      })
      if (out.length === target) break
    }
  }

  const days = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ]
  const finalMeals = out.slice(0, target).map((r, i) => ({
    dayOfWeek: days[i % days.length],
    mealType: preferences.mealTypes[0] || 'dinner',
    recipeName: r.name,
    description: r.description || ''
  }))

  // Build human-readable audit of scoring (top candidates with reasons)
  const auditTop = jittered.slice(0, 10).map((s) => ({
    name: s.name,
    score: s._score,
    minutes: s._minutes,
    why: s._why,
    varietyKey: s._varietyKey
  }))
  const reasoning =
    `Selected to fit ${JSON.stringify(structuredPrefs)} with variety across ${[...new Set(out.map((p) => p._varietyKey))].join(', ')}.` +
    `\n\nAudit (top candidates):\n` +
    auditTop
      .map(
        (a) =>
          `- ${a.name} [${a.score}] (${a.minutes} min, ${a.varietyKey}) – ${a.why || 'no reason provided'}`
      )
      .join('\n')

  // Also log full scored set for debugging
  console.log('=== SCORING RESULTS ===')
  console.table(
    jittered.map((s) => ({
      name: s.name,
      score: s._score,
      minutes: s._minutes,
      varietyKey: s._varietyKey
    }))
  )
  console.log('=======================')

  return { meals: finalMeals, reasoning }
}

export async function modifyMealPlan(
  currentMealPlan: any,
  modificationRequest: string,
  availableRecipes: any[]
): Promise<MealPlanResponse> {
  const recipeList = availableRecipes.map((recipe) => ({
    name: recipe.name,
    description: recipe.description,
    ingredients: recipe.ingredients,
    cuisine: recipe.cuisine,
    dietaryTags: recipe.dietaryTags,
    difficulty: recipe.difficulty,
    prepTime: recipe.prepTime,
    cookTime: recipe.cookTime
  }))

  const prompt = `
The user wants to modify their current meal plan. Here's the current plan:

Current Meal Plan:
${JSON.stringify(currentMealPlan, null, 2)}

Modification Request: ${modificationRequest}

Available Recipes:
${JSON.stringify(recipeList, null, 2)}

Please modify the meal plan according to the user's request. Respond with a JSON object in this exact format:
{
  "meals": [
    {
      "dayOfWeek": "Monday",
      "mealType": "dinner",
      "recipeName": "Recipe Name",
      "description": "Brief description"
    }
  ],
  "reasoning": "Brief explanation of the changes made"
}

STRICT RULES:
- Preserve ALL meals unless the user explicitly requests a change.
- If the user references a recipe by NAME, locate that exact recipe in Current Meal Plan and replace ONLY that meal. Keep its dayOfWeek and mealType unchanged.
- If the user references a position (e.g., "second recipe"), interpret it relative to the order of the meals as provided in Current Meal Plan and replace ONLY that position. Keep dayOfWeek and mealType for that position unchanged.
- Do NOT reorder meals. Do NOT change dayOfWeek or mealType for unchanged meals.
- If a dietary restriction is requested for the replacement (e.g., vegan), ensure the replacement recipe meets it.
- If the user expresses a dislike or avoidance (e.g., "I don't like quinoa", "avoid peanuts"), replace ONLY meals that contain the disliked ingredient, preserving dayOfWeek and mealType for those slots.
`

  try {
    console.log('=== AI MODIFY PROMPT START ===')
    console.log(prompt)
    console.log('=== AI MODIFY PROMPT END ===')
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful meal planning assistant. Always respond with valid JSON in the exact format requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      throw new Error('No response from OpenAI')
    }

    return JSON.parse(response)
  } catch (error) {
    console.error('Error modifying meal plan:', error)
    throw new Error('Failed to modify meal plan')
  }
}
