import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/hungoverman/',
  test: {
    include: ['test/**/*.test.ts'],
  },
})
