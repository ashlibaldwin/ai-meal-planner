import { json } from '@sveltejs/kit'
import { mealPlanService } from '$lib/meal-plan-service.js'
import { messageParser } from '$lib/message-parser.js'
import { parsePreferencesWithLLM } from '$lib/openai.js'
import { prisma } from '$lib/prisma.js'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { preferences, userMessage, currentMealPlanId } = await request.json()

    // Try LLM-based parsing first
    const parsed = await parsePreferencesWithLLM(userMessage)
    const updatedPreferences = parsed
      ? {
          ...preferences,
          dietaryRestrictions:
            parsed.dietaryRestrictions ?? preferences.dietaryRestrictions,
          cuisinePreferences: preferences.cuisinePreferences,
          mealTypes:
            parsed.mealTypes && parsed.mealTypes.length
              ? parsed.mealTypes
              : ['dinner'],
          cookingTime: preferences.cookingTime,
          difficulty: parsed.difficulty ?? preferences.difficulty,
          servingSize: preferences.servingSize,
          specialRequests: buildSpecialFromParsed(
            parsed,
            preferences.specialRequests,
            userMessage
          )
        }
      : messageParser.parseUserMessage(userMessage, preferences)
    const isFirstMessage = !currentMealPlanId
    const shouldGenerateMealPlan = messageParser.shouldGenerateMealPlan(
      userMessage,
      isFirstMessage
    )

    let response = ''
    let mealPlan = null

    if (shouldGenerateMealPlan) {
      const requestedCount = messageParser.extractRequestedCount(userMessage)
      const addProteinCounts =
        messageParser.extractAddProteinCounts(userMessage)
      const shouldAddToExisting =
        messageParser.shouldAddToExistingMealPlan(userMessage)
      const shouldModifyExisting =
        messageParser.shouldModifyExistingMealPlan(userMessage)
      const wantsNewPlan = messageParser.wantsNewPlan(userMessage)

      if (shouldModifyExisting && currentMealPlanId) {
        mealPlan = await mealPlanService.replaceInMealPlan(
          currentMealPlanId,
          userMessage
        )
        const parsedSummary = parsed ? buildParsedSummary(parsed) : null
        response = parsedSummary
          ? `Got it — ${parsedSummary}\n\nI updated your plan accordingly.`
          : `Done! I replaced the requested items and kept the rest the same.`
      } else if (shouldAddToExisting && currentMealPlanId) {
        mealPlan =
          await mealPlanService.addToExistingMealPlan(currentMealPlanId)
        const parsedSummary = parsed ? buildParsedSummary(parsed) : null
        response = parsedSummary
          ? `Got it — ${parsedSummary}\n\nI've added new meals to your existing plan.`
          : `Great! I've added new meals to your existing plan. You now have a complete meal plan for the week!`
      } else {
        // If the user explicitly wants a new plan and we have an existing plan id, exclude prior recipes
        let exclude: string[] | null = null
        if (wantsNewPlan && currentMealPlanId) {
          const existing = await prisma.mealPlan.findUnique({
            where: { id: currentMealPlanId },
            include: { meals: { include: { recipe: true } } }
          })
          exclude = existing ? existing.meals.map((m) => m.recipe.name) : null
        }
        // Merge in additive protein counts by appending to specialRequests so the model enforces counts
        const addCountsTag =
          messageParser.buildRequireProteinCountsTag(addProteinCounts)
        const mergedPrefs = addCountsTag
          ? {
              ...updatedPreferences,
              specialRequests: [
                updatedPreferences.specialRequests,
                addCountsTag
              ]
                .filter(Boolean)
                .join(', ')
            }
          : updatedPreferences
        const mode = wantsNewPlan ? 'createNewPlan' : 'updateExistingPlan'
        mealPlan = await mealPlanService.createMealPlan(
          mergedPrefs,
          requestedCount,
          exclude,
          mode
        )
        const parsedSummary = parsed ? buildParsedSummary(parsed) : null
        const base = generateMealPlanResponse(
          mealPlan,
          updatedPreferences,
          isFirstMessage
        )
        response = parsedSummary ? `Got it — ${parsedSummary}\n\n${base}` : base
      }
    } else {
      // Preferences-only update: if a plan exists, attempt a minimal modification to match new prefs
      if (currentMealPlanId) {
        const modReq = buildPreferenceModificationRequest(updatedPreferences)
        mealPlan = await mealPlanService.replaceInMealPlan(
          currentMealPlanId,
          modReq
        )
        response = `I've updated your preferences and adjusted your plan to match.`
      } else {
        response = `I've updated your preferences! ${getPreferenceUpdateMessage(updatedPreferences, preferences)}`
      }
    }

    return json({
      response,
      preferences: updatedPreferences,
      shouldGenerateMealPlan,
      mealPlan
    })
  } catch (error) {
    console.error('Error in chat API:', error)
    return json(
      {
        response:
          'Sorry, I encountered an error processing your request. Please try again.',
        error: 'Failed to process chat message'
      },
      { status: 500 }
    )
  }
}

function generateMealPlanResponse(
  mealPlan: any,
  preferences: any,
  isFirstMessage: boolean
): string {
  const mealCount = mealPlan.meals.length
  const mealTypes = [...new Set(mealPlan.meals.map((meal) => meal.mealType))]
  const dietaryInfo =
    preferences.dietaryRestrictions.length > 0
      ? ` (${preferences.dietaryRestrictions.join(', ')} friendly)`
      : ''

  let baseResponse = ''
  if (mealTypes.length === 1) {
    baseResponse = `Perfect! I've created ${mealCount} ${mealTypes[0]}s${dietaryInfo} for your meal plan. Here's what I've planned for you:`
  } else {
    baseResponse = `Great! I've created a complete meal plan with ${mealCount} meals${dietaryInfo} covering ${mealTypes.join(', ')}. Here's your weekly plan:`
  }

  // Add follow-up questions for first messages
  if (isFirstMessage) {
    const followUpQuestions = []

    // Scope restriction: dinners only (do not suggest other meal types)

    followUpQuestions.push(
      'Would you like me to modify any of these meals or add more variety?'
    )
    followUpQuestions.push(
      "Any specific cuisines or ingredients you'd like to include?"
    )

    return `${baseResponse}\n\n${followUpQuestions.join(' ')}`
  }

  return baseResponse
}

function getPreferenceUpdateMessage(newPrefs: any, oldPrefs: any): string {
  const changes = []

  if (
    newPrefs.dietaryRestrictions.join(',') !==
    oldPrefs.dietaryRestrictions.join(',')
  ) {
    changes.push(
      `dietary restrictions to ${newPrefs.dietaryRestrictions.join(', ') || 'none'}`
    )
  }
  if (
    newPrefs.cuisinePreferences.join(',') !==
    oldPrefs.cuisinePreferences.join(',')
  ) {
    changes.push(
      `cuisine preferences to ${newPrefs.cuisinePreferences.join(', ') || 'any'}`
    )
  }
  if (newPrefs.mealTypes.join(',') !== oldPrefs.mealTypes.join(',')) {
    changes.push(`meal types to ${newPrefs.mealTypes.join(', ')}`)
  }
  if (newPrefs.cookingTime !== oldPrefs.cookingTime) {
    changes.push(`cooking time to ${newPrefs.cookingTime}`)
  }
  if (newPrefs.difficulty !== oldPrefs.difficulty) {
    changes.push(`difficulty to ${newPrefs.difficulty}`)
  }
  if (newPrefs.servingSize !== oldPrefs.servingSize) {
    changes.push(`serving size to ${newPrefs.servingSize}`)
  }
  if (newPrefs.specialRequests !== oldPrefs.specialRequests) {
    changes.push(`special requests to "${newPrefs.specialRequests || 'none'}"`)
  }

  if (changes.length === 0) {
    return 'No significant changes detected.'
  } else if (changes.length === 1) {
    return `Updated: ${changes[0]}.`
  } else {
    return `Updated: ${changes.slice(0, -1).join(', ')} and ${changes[changes.length - 1]}.`
  }
}

function buildParsedSummary(parsed: any): string | null {
  if (!parsed) return null
  const parts: string[] = []
  if (Array.isArray(parsed.mealTypes) && parsed.mealTypes.length)
    parts.push(`${parsed.mealTypes.join(' & ')}s`)
  if (typeof parsed.maxMinutes === 'number')
    parts.push(`~${parsed.maxMinutes} min`)
  if (parsed.difficulty) parts.push(`${parsed.difficulty} difficulty`)
  if (
    parsed.proteinPreferences &&
    Object.keys(parsed.proteinPreferences).length
  ) {
    const prefs = Object.entries(parsed.proteinPreferences)
      .filter(([, n]) => Number(n) > 0)
      .map(([k, n]) => `${n} ${k}`)
    if (prefs.length) parts.push(prefs.join(', '))
  }
  if (
    Array.isArray(parsed.dietaryRestrictions) &&
    parsed.dietaryRestrictions.length
  )
    parts.push(parsed.dietaryRestrictions.join(', '))
  if (Array.isArray(parsed.disallowedTags) && parsed.disallowedTags.length)
    parts.push(`avoid ${parsed.disallowedTags.join(', ')}`)
  if (Array.isArray(parsed.goals) && parsed.goals.length)
    parts.push(parsed.goals.join(', '))
  if (!parts.length) return null
  return parts.join(' • ')
}

function buildSpecialFromParsed(
  parsed: any,
  baseSpecial: string | undefined,
  userMessage?: string
): string {
  const tokens: string[] = []
  const base = (baseSpecial || '')
    .replace(/exclusive-protein:\w+/gi, '')
    .replace(/require-proteins?:[^,]+/gi, '')
    .replace(/require-protein-counts?:[^,]+/gi, '')
    .replace(/\s*,\s*,/g, ',')
    .replace(/^\s*,|,\s*$/g, '')
    .trim()
  if (base) tokens.push(base)
  // goals as freeform hints
  if (Array.isArray(parsed.goals))
    tokens.push(...parsed.goals.map((g: string) => String(g).toLowerCase()))
  // disallowed tags
  if (Array.isArray(parsed.disallowedTags))
    tokens.push(
      ...parsed.disallowedTags.map(
        (g: string) => `avoid ${String(g).toLowerCase()}`
      )
    )
  // protein counts
  if (
    parsed.proteinPreferences &&
    typeof parsed.proteinPreferences === 'object'
  ) {
    const pairs = Object.entries(parsed.proteinPreferences)
      .filter(([, n]) => typeof n === 'number' && Number(n) > 0)
      .map(([k, n]) => `${normalizeProteinName(k)}=${Number(n)}`)
    if (pairs.length) tokens.push(`require-protein-counts:${pairs.join('|')}`)
    const nonZero = Object.entries(parsed.proteinPreferences)
      .filter(([, n]) => Number(n) > 0)
      .map(([k]) => normalizeProteinName(k))
    if (nonZero.length && nonZero.length <= 3 && !pairs.length)
      tokens.push(`require-proteins:${nonZero.join('|')}`)
  }
  // exclusive: ONLY if user explicitly says only/just/exclusive/all X in raw message
  if (userMessage) {
    const m = userMessage
      .toLowerCase()
      .match(
        /(?:only|just|exclusive(?:ly)?|all)\s+(chicken|beef|fish|pork|turkey|salmon|shrimp|tofu|beans?|lentils?|chickpeas?|legumes?)/
      )
    if (m && m[1])
      tokens.push(`exclusive-protein:${normalizeProteinName(m[1])}`)
  }
  // cleanup
  const cleaned = tokens
    .join(', ')
    .replace(/\s*,\s*,/g, ',')
    .replace(/^\s*,|,\s*$/g, '')
    .trim()
  // dedupe by token
  const parts = cleaned
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const dedup = Array.from(new Set(parts))
  return dedup.join(', ')
}

function normalizeProteinName(k: string): string {
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

function buildPreferenceModificationRequest(prefs: any): string {
  const lines: string[] = []
  if (prefs.dietaryRestrictions?.length) {
    lines.push(
      `Ensure all meals are ${prefs.dietaryRestrictions.join(', ')} compliant.`
    )
  }
  if (prefs.difficulty && prefs.difficulty !== 'any') {
    lines.push(`Prefer ${prefs.difficulty} difficulty recipes.`)
  }
  if (prefs.cookingTime) {
    lines.push(`Respect cooking time: ${prefs.cookingTime}.`)
  }
  if (prefs.specialRequests) {
    lines.push(`Apply special requests: ${prefs.specialRequests}.`)
  }
  if (prefs.cuisinePreferences?.length) {
    lines.push(`Prefer cuisines: ${prefs.cuisinePreferences.join(', ')}.`)
  }
  return `Update the current plan minimally to satisfy new preferences. Preserve day and meal types where possible. ${lines.join(' ')}`
}
