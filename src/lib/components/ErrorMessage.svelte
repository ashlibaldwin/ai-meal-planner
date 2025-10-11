<script lang="ts">
  export let error: string = ''
  export let onClear: () => void
</script>

{#if error}
  <div
    class="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg"
  >
    <div class="flex items-center justify-between">
      <span class="text-sm">{error}</span>
      <button
        class="ml-2 text-red-400 hover:text-red-600 text-lg leading-none"
        onclick={onClear}
        aria-label="Close error message"
      >
        ×
      </button>
    </div>
  </div>
{/if}
