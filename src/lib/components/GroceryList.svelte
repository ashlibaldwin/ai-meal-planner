<script lang="ts">
  import type { MealPlan } from '../types.js'

  export let mealPlan: MealPlan | null = null
</script>

{#if mealPlan}
  <div class="card print:break-inside-avoid print:mb-8">
    <h3 class="text-lg font-semibold text-gray-900 mb-4">🛒 Grocery List</h3>
    <div
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 print:columns-3 print:gap-4"
    >
      {#each mealPlan.groceryList as item}
        <div
          class="flex items-center p-2 bg-gray-50 rounded-lg print:break-inside-avoid print:mb-2 shadow-sm"
        >
          <input
            type="checkbox"
            class="mr-3 rounded border-gray-300 text-primary-600"
          />
          <span class="text-sm text-gray-700">{item}</span>
        </div>
      {/each}
    </div>
  </div>
{/if}
