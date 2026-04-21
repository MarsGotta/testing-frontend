// ============================================================
// Configuración Karma + Jasmine (LEGACY)
//
// Ejecutar:  npm run test:karma        (single run)
//            npm run test:karma:watch   (watch mode)
//
// Comparar con vite.config.js → sección "test" (11 líneas)
// ============================================================

const webpackConfig = require('./webpack.test.config.cjs')

module.exports = function (config) {
  config.set({
    // Frameworks de testing
    frameworks: ['jasmine', 'webpack'],

    // Archivos de test: solo los .old.test
    files: [
      { pattern: 'src/**/*.old.test.js', watched: false },
      { pattern: 'src/**/*.old.test.jsx', watched: false },
    ],

    // Preprocesadores: webpack para bundlear JSX/ESM
    preprocessors: {
      'src/**/*.old.test.js': ['webpack', 'sourcemap'],
      'src/**/*.old.test.jsx': ['webpack', 'sourcemap'],
    },

    // Configuración de webpack
    webpack: webpackConfig,

    // Suprimir ruido del webpack en la consola
    webpackMiddleware: {
      stats: 'errors-only',
    },

    // Reporters — 'spec' muestra cada test individual (como Vitest)
    reporters: ['spec'],

    // Navegador — ChromeHeadless para no abrir ventana
    browsers: ['ChromeHeadless'],

    // Puerto del servidor Karma
    port: 9876,

    // Colores en la salida
    colors: true,

    // Nivel de logging
    logLevel: config.LOG_INFO,

    // Auto-watch
    autoWatch: true,

    // Ejecutar una vez y salir (override con --single-run)
    singleRun: false,

    // Timeouts
    captureTimeout: 60000,
    browserDisconnectTimeout: 10000,
    browserNoActivityTimeout: 60000,

    // Restart on file changes
    restartOnFileChange: true,
  })
}
