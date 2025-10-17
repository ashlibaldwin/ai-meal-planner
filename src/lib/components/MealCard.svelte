<script lang="ts">
  import type { Meal } from '../types.js'

  export let meal: Meal
  export let isExpanded = false
  export let onToggleExpansion: (mealId: string) => void

  function handleToggle() {
    onToggleExpansion(meal.id)
  }
</script>

<div
  class="bg-gray-50 rounded-lg print:break-inside-avoid print:mb-6 print:border print:border-gray-300 print:p-4 shadow-sm"
>
  <div class="flex justify-between items-start p-3">
    <div class="flex-1">
      <h5 class="font-medium text-gray-900">{meal.recipe.name}</h5>
      <p class="text-sm text-gray-600">{meal.recipe.description}</p>
      <div class="flex items-center space-x-2 mt-2 text-xs text-gray-500">
        {#if meal.recipe.prepTime}
          <span>Prep: {meal.recipe.prepTime}min</span>
        {/if}
        {#if meal.recipe.cookTime}
          <span>Cook: {meal.recipe.cookTime}min</span>
        {/if}
        {#if meal.recipe.servings}
          <span>Serves: {meal.recipe.servings}</span>
        {/if}
      </div>
    </div>
    <div class="flex flex-col items-end space-y-2">
      <div class="flex space-x-1">
        <span
          class="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded-full capitalize"
        >
          {meal.mealType}
        </span>
        <span class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
          {meal.recipe.cuisine}
        </span>
        <span
          class="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full capitalize"
        >
          {meal.recipe.difficulty}
        </span>
      </div>
      <button
        class="text-xs text-primary-600 hover:text-primary-800 font-medium"
        onclick={handleToggle}
      >
        {isExpanded ? 'Hide Instructions' : 'View Instructions'}
      </button>
    </div>
  </div>

  {#if isExpanded}
    <div class="border-t border-gray-200 p-3 space-y-4">
      <!-- Ingredients -->
      <div>
        <h6 class="font-medium text-gray-900 mb-2">Ingredients:</h6>
        <ul class="text-sm text-gray-700 space-y-1 print:columns-2 print:gap-4">
          {#each meal.recipe.ingredients as ingredient}
            <li class="flex items-start print:break-inside-avoid print:mb-2">
              <span
                class="w-2 h-2 bg-primary-500 rounded-full mt-2 mr-2 flex-shrink-0"
              ></span>
              <span>{ingredient}</span>
            </li>
          {/each}
        </ul>
      </div>

      <!-- Instructions -->
      <div class="print:mt-4">
        <h6 class="font-medium text-gray-900 mb-2">Instructions:</h6>
        <ol class="text-sm text-gray-700 space-y-2">
          {#each meal.recipe.instructions as instruction, index}
            <li class="flex items-start">
              <span
                class="bg-primary-100 text-primary-800 text-xs font-medium rounded-full w-6 h-6 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5"
              >
                {index + 1}
              </span>
              <span>{instruction}</span>
            </li>
          {/each}
        </ol>
      </div>
    </div>
  {/if}
</div>
