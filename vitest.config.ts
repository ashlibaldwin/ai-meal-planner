import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  resolve: {
    alias: {
      $lib: resolve(__dirname, 'src/lib')
    }
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: { provider: 'v8' },
    sequence: { concurrent: false },
    testTimeout: 20000
  }
})
