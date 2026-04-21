import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    css: true,
    exclude: ['**/*.old.test.*', '**/node_modules/**', '**/.stryker-tmp/**'],
    // Higiene automática entre tests (regla 10 del checklist del taller).
    // clearMocks: resetea historial de llamadas.
    // restoreMocks: devuelve los spies originales tras cada test.
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Solo medimos el código de producción bajo `src/`.
      // Excluimos bootstrap de la app, helpers de test, cualquier
      // archivo de test y configuración del runner.
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/App.jsx',
        'src/test-utils/**',
        'src/**/*.test.{js,jsx}',
        'src/**/*.old.test.{js,jsx}',
      ],
    },
  },
})
