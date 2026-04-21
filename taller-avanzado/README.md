# Taller de Testing Frontend Avanzado · App "El Tiempo"

> Proyecto de prácticas para el **Taller 2 · Testing Frontend Avanzado**. Una app real
> de El Tiempo en React 18 que consume la API pública de Open-Meteo, diseñada para
> que puedas ver, comparar y practicar los patrones avanzados de testing en código
> de verdad.
>
> **La característica clave:** mantiene dos suites de tests en paralelo —
> Karma/Jasmine (legacy) y Vitest (moderna) — **espejadas 1:1**. Cada `.old.test.*`
> tiene su gemelo `.test.*` probando exactamente la misma funcionalidad. Eso
> convierte al repo en un **catálogo comparativo**: cuando te encuentres un caso
> en tu proyecto, busca su gemelo aquí.

---

## Tabla de contenidos

1. [Qué vas a aprender](#qué-vas-a-aprender)
2. [Requisitos previos](#requisitos-previos)
3. [Puesta en marcha](#puesta-en-marcha)
4. [Los comandos que más vas a usar](#los-comandos-que-más-vas-a-usar)
5. [Arquitectura del proyecto](#arquitectura-del-proyecto)
6. [Guía paso a paso · Migrar de Karma a Vitest](#guía-paso-a-paso--migrar-de-karma-a-vitest)
7. [Mutation testing con Stryker](#mutation-testing-con-stryker)
8. [Ejercicios propuestos](#ejercicios-propuestos)
9. [Troubleshooting](#troubleshooting)
10. [Recursos para profundizar](#recursos-para-profundizar)

---

## Qué vas a aprender

En una hora de sesión síncrona + unas horas de práctica autónoma, este proyecto te
enseña cinco cosas que aparecen en producción y duelen:

| # | Palanca | Qué vas a ver en el repo |
|---|---|---|
| 1 | **Dominar la asincronía** | `useGeocoding` con debounce, race conditions y cleanup al desmontar |
| 2 | **Mocking avanzado** | `vi.mock` + `vi.hoisted` para aislar hooks (`useWeather`) y componentes (`WeatherApp`) |
| 3 | **Migración Jasmine → Vitest** | Pares de tests espejados archivo por archivo con las dos sintaxis |
| 4 | **Mutation testing con Stryker** | Dos Strykers configurados (uno con Vitest, otro con Karma) para comparar |
| 5 | **Testear state management (Context + reducer)** | `src/store/FavoritesContext.jsx` + `favoritesReducer.js` — el patrón "reducer puro + hook + componente" con sus tres capas de tests |

No es teoría. Todo está en código ejecutable, con tests en verde en los dos runners.

---

## Requisitos previos

- **Node.js 20+** (lo verifica `npm install`)
- **Google Chrome instalado** (Karma usa ChromeHeadless; sin Chrome no arranca la suite
  legacy, aunque Vitest sí funciona)
- **Un editor con soporte de TypeScript/JSX** — recomendado VS Code con la extensión
  oficial de Vitest para ver los tests en el gutter
- **Conexión a Internet** en la primera ejecución (para descargar dependencias)

> No necesitas conocimientos previos de Vitest. Este proyecto es justamente para
> adquirirlos comparándolos con lo que ya sabes de Jasmine/Karma.

---

## Puesta en marcha

Clona el repo, instala dependencias y verifica que todo funciona:

```bash
# 1. Clonar
git clone <url-del-repo>
cd taller-testing-frontend-avanzado

# 2. Instalar dependencias (tarda ~30-60 s la primera vez)
npm install

# 3. Verificar la suite moderna (Vitest)
npm run test:run
#    → 266 tests passing · ~2.5 s

# 4. Verificar la suite legacy (Karma + ChromeHeadless)
npm run test:karma
#    → 262 tests passing · ~8 s arranque + 0.5 s tests

# 5. Arrancar la app en el navegador
npm run dev
#    → abre http://localhost:5173
```

Si los dos `test` pasan y la app carga, estás listo. Si falla algo, salta a la sección
[Troubleshooting](#troubleshooting).

---

## Los comandos que más vas a usar

El `package.json` define 11 scripts de npm. Aquí están agrupados por lo que hacen:

### Desarrollo

```bash
npm run dev             # Arranca Vite en modo dev (http://localhost:5173)
npm run build           # Build de producción en dist/
npm run preview         # Sirve el build para previsualizar
```

### Tests — Vitest (moderno)

```bash
npm test                # Modo watch · recomendado durante desarrollo
npm run test:run        # Single run · usado en CI
npm run test:ui         # Abre Vitest UI en el navegador (muy útil para debugging)
npm run test:coverage   # Single run con coverage report en dist/coverage/
```

### Tests — Karma (legacy)

```bash
npm run test:karma         # Single run · lanza ChromeHeadless
npm run test:karma:watch   # Modo watch · tarda ~8 s por cada re-ejecución
```

### Mutation testing (Stryker)

```bash
# Con Vitest runner (recomendado, 10-50× más rápido)
npm run test:mutation           # = :vitest, alias por defecto
npm run test:mutation:vitest
npm run test:mutation:vitest:file -- --mutate "src/utils/weatherCodes.js"

# Con Karma runner (para comparar en el bloque 4 del taller)
npm run test:mutation:karma
npm run test:mutation:karma:file -- --mutate "src/utils/temperatureConverter.js"
```

> **Tip:** el argumento `--mutate "<ruta>"` limita Stryker a un solo archivo. Útil
> para pruebas rápidas: ejecutar Stryker sobre TODO el `src/` tarda varios minutos;
> sobre un archivo tarda segundos.

---

## Arquitectura del proyecto

### La estructura dual de tests

El proyecto tiene una convención clave que lo diferencia de un proyecto normal:

```
Cada archivo fuente tiene DOS tests en paralelo:

src/hooks/useWeather.js           ← código fuente
src/hooks/useWeather.old.test.js  ← test LEGACY con Jasmine (Karma lo ejecuta)
src/hooks/useWeather.test.js      ← test MODERNO con Vitest (Vitest lo ejecuta)
```

Los dos runners están configurados para **no pisarse**:

- `karma.conf.cjs` solo carga archivos con patrón `**/*.old.test.{js,jsx}`.
- `vite.config.js` tiene `exclude: ['**/*.old.test.*', ...]`, así Vitest solo ejecuta
  `**/*.test.{js,jsx}`.

Esto te deja ver **la misma intención expresada en las dos sintaxis**. Abre cualquier
par en VS Code con panel dividido y verás las equivalencias idiomáticas línea por
línea.

> **Nota sobre los `.old.test`:** aquí la suite legacy usa **Jasmine puro**, sin
> `@testing-library/*`. Es el escenario más habitual en proyectos Karma de verdad
> (la mayoría no adoptaron Testing Library sobre Karma nunca). Para que los tests
> de componentes y hooks sigan siendo legibles, el repo incluye un helper propio
> en `src/test-utils/jasmine-dom.jsx` con lo mínimo necesario: `mountComponent`,
> `runHook`, `clickEl`, `setInputValue`, `focusEl`/`blurEl`, `flushMicrotasks` y
> `sleepInAct`. No es una reimplementación de Testing Library — las búsquedas en
> el DOM se hacen con `container.querySelector`. Precisamente ese verbalismo es
> parte de la lección sobre qué te ahorra Testing Library.

### Mapa de archivos

```
taller-testing-frontend-avanzado/
├── src/
│   ├── App.jsx · main.jsx              ← entry points (excluidos de coverage)
│   ├── components/                     ← 8 componentes con su par de tests
│   │   ├── CityCard/
│   │   ├── CurrentWeather/
│   │   ├── DailyForecast/
│   │   ├── FavoriteButton/             ← ⭐ consume Context (FavoritesProvider)
│   │   ├── HourlyForecast/
│   │   ├── SearchBar/                  ← ⭐ fireEvent.demo.test.jsx (comparativa)
│   │   ├── UnitToggle/
│   │   └── WeatherApp/                 ← ⭐ integración con vi.hoisted + 2 mocks
│   ├── hooks/                          ← 3 custom hooks
│   │   ├── useGeocoding.js             ← ⭐ debounce + race condition
│   │   ├── useUnit.js
│   │   └── useWeather.js               ← ⭐ vi.hoisted canónico
│   ├── services/                       ← 2 fetchers
│   │   ├── geocodingService.js
│   │   └── weatherService.js
│   ├── store/                          ← ⭐ Context + reducer + persistencia
│   │   ├── FavoritesContext.jsx        ← Provider + useFavorites con inyección de storage
│   │   └── favoritesReducer.js         ← reducer puro (ADD/REMOVE/TOGGLE/CLEAR/HYDRATE)
│   ├── test-utils/
│   │   └── jasmine-dom.jsx             ← helper mínimo para los .old.test
│   │                                     (mountComponent, runHook, clickEl, setInputValue…)
│   └── utils/
│       ├── weatherCodes.js             ← tabla WMO
│       └── temperatureConverter.js     ← ⭐ 5 mutantes de libro para Stryker
│
├── vite.config.js                      ← config Vitest (suite moderna)
├── vitest.setup.js                     ← setup global de Vitest
├── karma.conf.cjs                      ← config Karma (suite legacy)
├── karma.stryker.conf.cjs              ← Karma filtrado para Stryker-Karma
├── webpack.test.config.cjs             ← bundler de Karma (solo para Jasmine)
├── stryker.vitest.config.json          ← Stryker con runner Vitest
├── stryker.karma.config.json           ← Stryker con runner Karma (comparativa)
└── reports/
    ├── mutation/
    │   ├── vitest/mutation.html        ← reporte tras `test:mutation:vitest`
    │   └── karma/mutation.html         ← reporte tras `test:mutation:karma`
    └── stryker-incremental.*.json      ← caché incremental
```

Los archivos marcados con ⭐ son los **ejemplos canónicos** que se proyectan en la
sesión síncrona del taller.

---

## Guía paso a paso · Migrar de Karma a Vitest

Esta es la guía que seguirías **en tu proyecto real** para migrar de Karma a Vitest.
Cada paso está pensado para ser **no destructivo**: al terminarlo, los tests antiguos
siguen funcionando, y los nuevos conviven en paralelo. Migras gradualmente a tu ritmo.

### Paso 1 · Instalar Vitest y sus dependencias

```bash
# Core de Vitest
npm install -D vitest @vitejs/plugin-react

# Testing Library (si tu proyecto es React)
npm install -D @testing-library/react @testing-library/jest-dom @testing-library/user-event

# Entorno DOM (happy-dom o jsdom · happy-dom es 2-5× más rápido)
npm install -D jsdom

# Coverage
npm install -D @vitest/coverage-v8
```

> Para Vue o Angular, los plugins cambian. Ver la sección correspondiente del
> material escrito (`material/10-migracion-karma-vitest.md`).

### Paso 2 · Crear `vite.config.js` (o añadir config a `vitest.config.js`)

Crea un archivo en la raíz con la configuración mínima:

```js
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,                              // expone vi, describe, it, expect sin importar
    environment: 'jsdom',                       // o 'happy-dom'
    setupFiles: './vitest.setup.js',            // jest-dom matchers, etc.
    css: true,                                  // procesar CSS en tests
    exclude: ['**/*.old.test.*', '**/node_modules/**'], // CLAVE para coexistir con Karma
    clearMocks: true,                           // higiene automática de mocks
    restoreMocks: true,
  },
})
```

El punto clave es **`exclude: ['**/*.old.test.*']`**: sin esto, Vitest intentará
ejecutar también los tests antiguos y fallará porque no entienden `jasmine.*`.

### Paso 3 · Crear el archivo de setup

```js
// vitest.setup.js
import '@testing-library/jest-dom'
```

Un solo import. El paquete `@testing-library/jest-dom` añade los matchers como
`.toBeInTheDocument()`, `.toHaveTextContent(...)`, etc., que son los que van a usar
tus tests.

### Paso 4 · Ajustar `karma.conf.cjs` para que solo lea los `.old.test`

Modifica tu `karma.conf.cjs` existente para que **solo** cargue los tests con el
sufijo `.old.test`. Así, los tests nuevos que escribirás con Vitest no confundirán a
Karma:

```js
// karma.conf.cjs
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
    // ...resto de tu config
  })
}
```

### Paso 5 · Añadir scripts al `package.json`

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:karma": "karma start karma.conf.cjs --single-run"
  }
}
```

Verifica que los dos runners funcionan:

```bash
npm run test:run     # Vitest (no debe encontrar tests .test.js nuevos todavía)
npm run test:karma   # Karma sigue funcionando como siempre
```

### Paso 6 · Renombrar tus tests existentes a `.old.test`

Para **cada** archivo de test actual, renómbralo añadiendo `.old` antes de `.test`:

```bash
# Antes
src/hooks/useWeather.test.js

# Después (renombrado)
src/hooks/useWeather.old.test.js
```

Los tests renombrados siguen funcionando con Karma exactamente igual. Esto **no es
destructivo**. Solo se trata de convención para distinguirlos de los nuevos.

### Paso 7 · Traducir tu primer test

Elige uno sencillo (una utilidad pura, sin DOM). Crea el archivo `.test.js` nuevo al
lado del `.old.test.js` y aplica las equivalencias de la tabla:

**Tabla de equivalencias idiomáticas (las más comunes):**

| Jasmine (`.old.test.js`) | Vitest (`.test.js`) |
|---|---|
| `jasmine.createSpy('x')` | `vi.fn()` |
| `spyOn(obj, 'm').and.returnValue(v)` | `vi.spyOn(obj, 'm').mockReturnValue(v)` |
| `spyOn(obj, 'm').and.callFake(fn)` | `vi.spyOn(obj, 'm').mockImplementation(fn)` |
| `spyOn(obj, 'm').and.callThrough()` | `vi.spyOn(obj, 'm')` *(callThrough es el default)* |
| `spyOn(window, 'fetch').and.returnValue(p)` | `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(...))` |
| `jasmine.objectContaining({...})` | `expect.objectContaining({...})` |
| `jasmine.any(Number)` | `expect.any(Number)` |
| `jasmine.arrayContaining([...])` | `expect.arrayContaining([...])` |
| `.calls.count()` → `.toBe(n)` | `.toHaveBeenCalledTimes(n)` |
| `.calls.mostRecent().args[0]` | `.mock.lastCall[0]` |
| `expectAsync(p).toBeRejectedWithError('...')` | `await expect(p).rejects.toThrow('...')` |
| `jasmine.clock().install()` | `vi.useFakeTimers()` |
| `jasmine.clock().tick(ms)` | `vi.advanceTimersByTime(ms)` *(o `Async` si hay Promises)* |
| `.toBeTruthy()` *(sobre elemento DOM)* | `.toBeInTheDocument()` *(con jest-dom)* |
| `forEach([...]).forEach(c => it(...))` | `it.each([...])('...', c => ...)` |

**Ejemplo práctico.** Antes (Jasmine):

```js
// src/utils/weatherCodes.old.test.js
describe('getWeatherDescription', () => {
  it('devuelve "Despejado" para el código 0', () => {
    expect(getWeatherDescription(0, true)).toBe('Despejado')
  })
  it('devuelve "Lluvia" para el código 63', () => {
    expect(getWeatherDescription(63)).toBe('Lluvia')
  })
})
```

Después (Vitest, con `it.each` para reducir duplicación):

```js
// src/utils/weatherCodes.test.js
describe('getWeatherDescription', () => {
  it.each([
    [0, true, 'Despejado'],
    [63, undefined, 'Lluvia'],
  ])('código %i (isDay=%s) → %s', (code, isDay, expected) => {
    expect(getWeatherDescription(code, isDay)).toBe(expected)
  })
})
```

Ejecuta los dos:

```bash
npm run test:run          # el nuevo
npm run test:karma        # el antiguo sigue pasando
```

Ambos en verde. Has migrado tu primer test **sin tocar el legacy**.

### Paso 8 · Migrar el resto gradualmente

Repite el paso 7 para cada archivo. El orden recomendado de fácil a difícil:

1. **Utilidades puras** (sin DOM) · directo como el ejemplo anterior.
2. **Servicios** · cambiar `spyOn(window, 'fetch')` por `vi.stubGlobal('fetch', ...)`.
3. **Hooks** · usar `vi.mock` + `vi.hoisted` para aislar servicios (ver
   `src/hooks/useWeather.test.js` como referencia canónica).
4. **Componentes** · si tu proyecto ya usa Testing Library sobre Karma, el cambio es
   mínimo (solo spies y matchers). Si no — como en este repo — pasas de `querySelector`
   + `dispatchEvent` manual a `screen.getByRole` + `userEvent`. Ese salto de
   ergonomía **es la gran razón para migrar**.
5. **Tests de integración** · aplican todos los patrones anteriores; son los más
   trabajosos pero los que más retorno dan.

### Paso 9 · Adoptar Stryker sobre Vitest (manteniendo el de Karma)

Si tu proyecto ya usa Stryker con el runner de Karma, este paso añade un segundo
Stryker apuntando a Vitest. Durante la transición los dos conviven y puedes
compararlos; cuando la migración esté cerrada, el de Karma se retira junto al
resto de dependencias legacy en el paso 10.

Si aún no tienes Stryker, este es también el momento de introducirlo: el runner
de Vitest es rápido y se configura en un archivo.

**Instalar:**

```bash
npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner

# Si ya tenías Stryker-Karma, deja sus paquetes instalados hasta el paso 10:
#   @stryker-mutator/karma-runner
```

**Crear `stryker.vitest.config.json`:**

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.js",
    "src/**/*.jsx",
    "!src/**/*.test.*",
    "!src/**/*.old.test.*",
    "!src/test-utils/**",
    "!src/main.jsx",
    "!src/App.jsx"
  ],
  "reporters": ["html", "clear-text", "progress"],
  "htmlReporter": { "fileName": "reports/mutation/vitest/mutation.html" },
  "thresholds": { "high": 80, "low": 60, "break": 0 }
}
```

La línea clave es **`"coverageAnalysis": "perTest"`**. El runner de Vitest soporta
este modo (el de Karma no): Stryker ejecuta, por cada mutante, solo los tests que
cubren la línea mutada, en vez de la suite entera. En proyectos grandes es la
diferencia entre minutos y horas.

Los `exclude` bajo `mutate` son tan importantes como los includes: si dejas que
Stryker mute `App.jsx`, `main.jsx` o `test-utils/`, todos esos mutantes saldrán
como "NoCoverage" y te ensuciarán el score.

**Añadir los scripts:**

```json
{
  "scripts": {
    "test:mutation:vitest": "npx stryker run stryker.vitest.config.json",
    "test:mutation:karma":  "npx stryker run stryker.karma.config.json"
  }
}
```

**Validar la paridad.** Ejecuta los dos y compara el mutation score total:

```bash
npm run test:mutation:karma    # ~minutos, toda la suite por mutante
npm run test:mutation:vitest   # ~segundos, solo los tests que cubren la línea
```

Ambos deberían dar un score **muy similar** (en este repo: Karma 77.57% vs
Vitest 78.19%). Si divergen por más de 2-3 puntos, es señal de que algún test
depende del orden de ejecución o de un mock que se filtra entre archivos — el
dual run descubre esa clase de bug latente.

### Paso 10 · Cuando todo esté en Vitest, retirar Karma

Cuando no queden archivos `.old.test.*` y el `test:mutation:vitest` esté
funcionando, puedes retirar todo lo legacy:

```bash
# Desinstalar Karma, Stryker-Karma y sus plugins
npm uninstall karma karma-chrome-launcher karma-jasmine \
              karma-jasmine-html-reporter karma-coverage \
              karma-webpack karma-spec-reporter karma-sourcemap-loader \
              jasmine-core webpack null-loader babel-loader \
              @babel/core @babel/preset-env @babel/preset-react \
              @stryker-mutator/karma-runner

# Eliminar archivos de config
rm karma.conf.cjs karma.stryker.conf.cjs webpack.test.config.cjs \
   stryker.karma.config.json

# Quitar los scripts obsoletos del package.json
#   (test:karma, test:karma:watch, test:mutation:karma, test:mutation:karma:file)
```

Renombra también `stryker.vitest.config.json` → `stryker.config.json` para que
`npx stryker run` lo encuentre sin flags.

Adiós, Karma. Hola, Vitest.

---

## Mutation testing con Stryker

Stryker muta tu código (cambia operadores, vacía condiciones, etc.) y ejecuta los
tests contra cada mutante. Si los tests pasan a pesar del cambio, el mutante ha
**sobrevivido** → tus tests son débiles en esa zona. Si algún test falla, el mutante
ha sido **killed** → tus tests cazan ese tipo de error.

### Stryker con Vitest (el que usarás en el día a día)

Config en `stryker.vitest.config.json`. Ejecución:

```bash
# Todo src/ (tarda varios minutos)
npm run test:mutation:vitest

# Solo un archivo (tarda segundos)
npm run test:mutation:vitest:file -- --mutate "src/utils/temperatureConverter.js"
```

Tras ejecutar, abre `reports/mutation/vitest/mutation.html` en tu navegador. Verás:

- Mutation score total.
- Desglose por archivo.
- Por cada mutante: categoría (ConditionalExpression, EqualityOperator, ...),
  línea del código, estado (Killed / Survived / NoCoverage / Timeout) y los tests
  que se ejecutaron contra él.

**Clave:** `stryker.vitest.config.json` tiene `"coverageAnalysis": "perTest"`. Esto
hace que Stryker solo ejecute los tests que realmente tocan la línea mutada, en vez
de la suite entera por cada mutante. En proyectos grandes es la diferencia entre
5 minutos y 5 horas.

### Stryker con Karma (comparativa didáctica)

Config en `stryker.karma.config.json` + `karma.stryker.conf.cjs`. Ejecución:

```bash
npm run test:mutation:karma -- --mutate "src/utils/temperatureConverter.js"
```

El reporte va a `reports/mutation/karma/mutation.html`.

Stryker-Karma ejecuta sobre **toda** la suite legacy (`src/**/*.old.test.*`) y muta
todo el código de producción bajo `src/` — excepto bootstrap (`main.jsx`, `App.jsx`)
y helpers de test (`test-utils/**`).

**Diferencia práctica frente a Vitest**: sin `coverageAnalysis: "perTest"`, Karma
ejecuta **todos** los tests contra cada mutante. En la suite actual son
≈150 tests/mutante, con Vitest bajan a ≈3. El resultado final es comparable
(mutation score similar), pero Karma tarda minutos donde Vitest tarda segundos.
Ese gap de rendimiento **es el argumento concreto para migrar**: en proyectos
grandes, `perTest` de Vitest es la diferencia entre integrar Stryker en CI o no.

### Interpretar el reporte HTML

Los cinco estados principales de un mutante:

| Estado | Significa | Qué hacer |
|---|---|---|
| 💀 **Killed** | Un test falló cuando el código fue mutado (bueno) | Nada, tu test funciona |
| 🧟 **Survived** | Todos los tests pasaron a pesar de la mutación (malo) | Reforzar el test |
| 🚫 **NoCoverage** | Ningún test cubre esta línea (peor) | Escribir test desde cero |
| ⏰ **Timeout** | La mutación causó un bucle infinito (cuenta como killed) | Ignorar |
| ❌ **RuntimeError** | La mutación produjo código inválido (se descarta) | Ignorar |

### Los 5 mutantes de libro (`src/utils/temperatureConverter.js`)

Este archivo contiene **cinco mutantes intencionales** marcados con `MUTANT_DEMO_1`
a `MUTANT_DEMO_5` en comentarios del código. Cubren las categorías más comunes:

1. `ConditionalExpression` — `if (from === to)` → `if (true)`
2. `EqualityOperator` — `celsius <= 0` → `celsius < 0` (boundary)
3. `ArithmeticOperator` — `value * 9 / 5` → `value / 9 / 5`
4. `LogicalOperator` — `celsius >= 25 && isSunny` → `celsius >= 25 || isSunny`
5. `BlockStatement` — el cuerpo del `if` se vacía

El archivo `temperatureConverter.test.js` tiene **dos suites**:

- `tests débiles` — matchers blandos (`toBeGreaterThan`, `toBeTruthy`). **Dejan los
  5 mutantes vivos.**
- `tests fuertes` — `it.each` con boundaries + valores exactos. **Matan los 5.**

Ambas suites pasan en verde (coverage 100 %). La diferencia se revela al ejecutar
Stryker: una suite da mutation score de ~30 %, la otra de ~100 %. Ese gap es
exactamente lo que Stryker descubre que tu coverage no ve.

**Experimento recomendado:**

1. Ejecuta `npm run test:mutation:vitest -- --mutate "src/utils/temperatureConverter.js"`.
2. Anota el score (debería ser 90 %+ con ambas suites activas).
3. Comenta temporalmente el `describe('tests fuertes')`.
4. Ejecuta de nuevo. El score cae a ~30 %.
5. Restaura la suite y confirma que vuelve a subir.

Esta es la lección sobre por qué coverage miente en una demo de 3 minutos.

---

## Ejercicios propuestos

El repo es el **catálogo de soluciones** de los ejercicios de `material/16-ejercicios.md`.
Cada ejercicio tiene archivos específicos del repo como referencia:

| # | Ejercicio | Archivos de referencia |
|:---:|---|---|
| E01 | Arrancar el proyecto y entender las dos suites | `package.json`, `vite.config.js`, `karma.conf.cjs` |
| E02 | Queries semánticas vs selectores CSS | `HourlyForecast.test.jsx`, `DailyForecast.test.jsx` |
| E03 | Migrar `fireEvent` a `userEvent` + medir delta mutation | `SearchBar.fireEvent.demo.test.jsx` |
| E04 | Traducir un test Jasmine a Vitest | `weatherService.{old.test,test}.js` (par espejo) |
| E05 | Aislar un hook con `vi.mock` + `vi.hoisted` | `useWeather.test.js` |
| E06 | Asincronía: debounce + race + cleanup | `useGeocoding.test.js` |
| E07 | Test de integración con múltiples mocks | `WeatherApp.test.jsx` |
| E08 | Matar los 5 mutantes supervivientes | `utils/temperatureConverter.{js,test.js}` |
| E09 | Testear Context + reducer + componente consumidor | `store/`, `FavoriteButton.test.jsx` |

Flujo recomendado:

1. Elige un ejercicio.
2. Crea una rama `ejercicio-XX-<tu-nombre>`.
3. Intenta resolverlo SIN mirar la solución.
4. Cuando termines (o te atasques), abre el archivo de referencia y compara.
5. Anota las diferencias y pasa al siguiente.

---

## Troubleshooting

### `npm run test:karma` falla con "Chrome not found"

Karma necesita Google Chrome instalado. En macOS/Linux:

```bash
# Verifica que Chrome está accesible
which google-chrome || which chromium

# Si no lo está, instálalo (macOS con Homebrew)
brew install --cask google-chrome
```

En CI puedes usar `puppeteer` como alternativa a una instalación sistema de Chrome
(requiere ajustar `karma.conf.cjs`, no cubierto aquí).

### Stryker-Karma tarda varios minutos

Es normal. Karma lanza un navegador headless y ejecuta **toda** la suite contra
cada mutante (no hay `coverageAnalysis: "perTest"` en Karma como sí en Vitest).
Para iterar rápido sobre un archivo, filtra con `--mutate`:

```bash
npm run test:mutation:karma -- --mutate "src/utils/temperatureConverter.js"
```

### Tests async de Vitest hacen timeout sin explicación

Lo más probable es que tengas `vi.useFakeTimers()` activo y estés usando
`userEvent` sin avisarle del avance del reloj. Solución:

```js
const user = userEvent.setup({
  advanceTimers: vi.advanceTimersByTime,
})
```

### `vi.mock` lanza `ReferenceError: Cannot access 'X' before initialization`

Intuitivamente tienes algo así:

```js
const mockData = { name: 'Ana' }
vi.mock('./api', () => ({ getUser: vi.fn().mockResolvedValue(mockData) }))
// ← ReferenceError en la factory
```

`vi.mock` se hoistea al inicio del archivo. Cuando se ejecuta, `mockData` todavía
no existe. Solución con `vi.hoisted`:

```js
const { mockData, getUser } = vi.hoisted(() => ({
  mockData: { name: 'Ana' },
  getUser: vi.fn(),
}))
vi.mock('./api', () => ({ getUser }))

beforeEach(() => getUser.mockResolvedValue(mockData))
```

Ver `src/hooks/useWeather.test.js` para el patrón completo.

### Vitest dice "Module not found" con alguna ruta relativa

Asegúrate de que `vite.config.js` tiene la config de resolver correcta. Si usas
alias como `@/components/...`, configura el `resolve.alias` tanto para Vite como
para Vitest.

---

## Recursos para profundizar

### Guía interactiva (teoría con ejemplos)

La **SPA** con las 14 secciones del taller (fundamentos + avanzado). Se proyecta
durante la sesión síncrona y queda como referencia navegable. Las secciones 10-14
corresponden al Taller 2, en este mismo orden:

1. 🗺️ Bienvenida al Taller Avanzado
2. ⏱️ Dominio de la Asincronía
3. 🎯 Mocking Avanzado
4. 🚀 Migración Karma/Jasmine a Vitest
5. 🧬 Mutation Testing con Stryker

Repositorio: `guia-interactiva-talleg-testing-frontend`.

### Material escrito (profundización técnica)

Archivos Markdown con detalle exhaustivo por tema. Útiles cuando necesitas
referenciar un patrón concreto:

- `material/10-migracion-karma-vitest.md` — cronología + pasos detallados.
- `material/11-sintaxis-jasmine-vitest.md` — tabla con 60+ equivalencias.
- `material/12-mocking-avanzado.md` — `vi.mock`, `vi.hoisted`, MSW, stores.
- `material/13-dominio-asincronia.md` — event loop, marble testing, patrones async.
- `material/14-mutation-testing-stryker.md` — config completa, operadores, CI.
- `material/16-ejercicios.md` — los 8 ejercicios con pistas.

Repositorio: `taller-testing-frontend-material`.

### Enlaces externos

- [Vitest docs](https://vitest.dev/)
- [Testing Library · Guiding Principles](https://testing-library.com/docs/guiding-principles)
- [userEvent 14](https://testing-library.com/docs/user-event/intro/)
- [Stryker Mutator](https://stryker-mutator.io/)
- [MSW v2](https://mswjs.io/docs/)
- [Kent C. Dodds · Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Yoni Goldberg · JS Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## Licencia y atribución

Proyecto pedagógico interno. La app consume la [API pública de Open-Meteo](https://open-meteo.com/)
(sin autenticación, uso comercial permitido según sus términos).
