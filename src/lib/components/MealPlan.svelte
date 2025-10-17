<script lang="ts">
  import type { MealPlan as MealPlanType } from '../types.js'
  import MealCard from './MealCard.svelte'

  export let mealPlan: MealPlanType | null = null
  export let isGenerating = false
  export let expandedMeals: Set<string> = new Set()
  export let onToggleMealExpansion: (mealId: string) => void
  export let onPrintMealPlan: () => void

  const daysOfWeek = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
  ]
</script>

<div class="card print:break-inside-avoid print:mb-8">
  <div class="flex justify-between items-center mb-6">
    <h3 class="text-xl font-medium text-gray-900">This Week's Meals</h3>
    {#if mealPlan}
      <button
        class="btn-secondary text-sm print:hidden"
        onclick={onPrintMealPlan}
      >
        Print
      </button>
    {/if}
  </div>

  {#if isGenerating && !mealPlan}
    <div class="space-y-4">
      {#each Array(3) as _, i}
        <div class="border rounded-lg p-4 animate-pulse">
          <div class="h-6 bg-gray-200 rounded w-24 mb-3"></div>
          <div class="space-y-2">
            {#each Array(2) as _, j}
              <div class="bg-gray-100 rounded-lg p-3">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>
  {:else if mealPlan}
    <div class="space-y-4">
      {#each daysOfWeek as day}
        {@const dayMeals = mealPlan.meals.filter(
          (meal) => meal.dayOfWeek === day
        )}
        {#if dayMeals.length > 0}
          <div class="border rounded-lg p-4">
            <h4 class="font-semibold text-gray-900 mb-3 capitalize">{day}</h4>
            <div class="space-y-2">
              {#each dayMeals as meal}
                <MealCard
                  {meal}
                  isExpanded={expandedMeals.has(meal.id)}
                  onToggleExpansion={onToggleMealExpansion}
                />
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {:else}
    <div class="text-center text-gray-500 py-8">
      <div class="text-4xl mb-2">🍽️</div>
      <p>Your meals will appear here</p>
      <p class="text-sm">Start chatting to create your meal plan!</p>
    </div>
  {/if}
</div>
