// ============================================================
// karma.stryker.conf.cjs
//
// Variante del karma.conf.cjs pensada para Stryker.
//
// Carga la suite entera de `.old.test.{js,jsx}` (hooks, servicios,
// utils, componentes, store). Para esto hace falta que los tests
// esten escritos en Jasmine puro — nada de @testing-library — ya
// que la instrumentacion de Stryker + webpack tenia friccion con
// los modulos ESM de `user-event 14`. Ese bloqueador ya no aplica.
// ============================================================

const webpackConfig = require('./webpack.test.config.cjs')

module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', 'webpack'],

    files: [
      { pattern: 'src/**/*.old.test.js', watched: false },
      { pattern: 'src/**/*.old.test.jsx', watched: false },
    ],

    preprocessors: {
      'src/**/*.old.test.js': ['webpack', 'sourcemap'],
      'src/**/*.old.test.jsx': ['webpack', 'sourcemap'],
    },

    webpack: webpackConfig,
    webpackMiddleware: { stats: 'errors-only' },

    reporters: ['spec'],
    browsers: ['ChromeHeadless'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: false,
    singleRun: false,

    captureTimeout: 60000,
    browserDisconnectTimeout: 10000,
    browserNoActivityTimeout: 60000,
    restartOnFileChange: false,
  })
}
