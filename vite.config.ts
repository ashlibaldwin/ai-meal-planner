import { sveltekit } from '@sveltejs/kit/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [sveltekit()],
  // Vitest config
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8'
    }
  }
})
