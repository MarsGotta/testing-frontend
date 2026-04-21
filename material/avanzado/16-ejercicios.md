---
modalidad: tutorial + how-to (scaffolding decreciente)
proyecto de referencia: taller-testing-frontend-avanzado (app "El Tiempo" · React 18 + Vite)
prerrequisitos:
  - Haber cursado el Taller 1 (o leído al menos los archivos 01, 02, 05, 06 y 07 de esta guía)
  - Node 20+ instalado, repo `taller-testing-frontend-avanzado` clonado y con `npm install` hecho
  - Editor con buen soporte TS/JSX (VS Code recomendado, con extensión Vitest)
tiempo_total: 4-6 horas (8 ejercicios × 25-45 min)
stack_validado:
  - React 18 · Vite 6
  - Vitest 2.1 · Testing Library React 16 · userEvent 14
  - Karma 6.4 · Jasmine 5.5 (legacy · coexiste con Vitest)
  - Stryker 9.5 (dual: vitest-runner + karma-runner)
fecha_validacion: 2026-04
---

# Ejercicios Prácticos

> Ocho ejercicios para consolidar los conceptos del Taller 2 sobre el proyecto weather app.
> **Scaffolding decreciente (ZPD + backward fading)**: los primeros son guiados paso a paso;
> los últimos exigen decisiones autónomas.
>
> **El orden sigue el flujo real del taller síncrono** (problem-first): empiezas por el dolor
> del día a día (asincronía), sigues con aislamiento (mocks), consolidas con migración y
> cierras midiendo calidad con Stryker. Los dos primeros ejercicios son de arranque y
> traducción — fáciles para entrar en calor antes de los temas profundos.
>
> **Proyecto de referencia**: `taller-testing-frontend-avanzado/`. Mantiene dos suites de tests
> en paralelo (Karma legacy + Vitest moderna, **espejadas 1:1**), lo que convierte al repo en
> un catálogo de soluciones canónicas: cada ejercicio tiene su "solución verificada" ya
> escrita en el propio repo. La idea no es que escribas desde cero, sino que **leas, compares
> y experimentes**.

---

## Cómo usar esta guía

Cada ejercicio tiene la misma estructura:

1. **Objetivo** — qué vas a interiorizar haciéndolo.
2. **Contexto** — qué archivos del repo son relevantes.
3. **Pasos** — qué hacer en orden.
4. **Criterios de éxito** — cómo sabes que has terminado (verificables).
5. **Pistas** — cosas que suelen atascar.
6. **Solución de referencia** — el archivo del repo donde está ya resuelto.

### Progresión de autonomía

| # | Modalidad | Nivel de scaffolding |
|---|---|---|
| 01 | Tutorial | **Guiado** — pasos literales |
| 02 | Tutorial | **Guiado** — pasos literales + decisiones pequeñas |
| 03 | Tutorial | **Semi-guiado** — pasos marcados, decisiones propias |
| 04 | How-to | **Semi-guiado** — tabla de equivalencias como apoyo |
| 05 | How-to | **Semi-guiado** — patrón conocido, aplicarlo a otro caso |
| 06 | How-to | **Autónomo** — diagnóstico propio |
| 07 | How-to | **Autónomo** — combinación de técnicas |
| 08 | How-to | **Autónomo** — ownership total (roadmap de mutation score) |

Cada ejercicio **introduce un concepto nuevo y reutiliza los anteriores**. Si te saltas uno,
anótalo: probablemente tengas que volver.

> **Formato recomendado**: crea una rama `ejercicio-XX-<tu-nombre>` en el repo. Al terminar,
> compara tu solución con la del repo (`main`) y anota las diferencias. Las soluciones son
> públicas y ejecutables: si te atascas, abre el archivo gemelo, entiéndelo, cierra y
> repite. El objetivo es dominar el patrón, no sufrir.

---

## Ejercicio 01 · Arrancar el proyecto y entender las dos suites

> **Modalidad:** Tutorial · **Scaffolding:** Guiado · **Tiempo:** 20-30 min

**Objetivo:** familiarizarte con la estructura dual del repo (Karma + Vitest en paralelo),
ver la diferencia de velocidad en tu máquina y saber qué scripts usar para cada situación.

**Contexto:**
- `vite.config.js` → config de Vitest; excluye `**/*.old.test.*`.
- `karma.conf.cjs` → config de Karma; solo carga `**/*.old.test.*`.
- `package.json` → 8 scripts de test definidos.

**Pasos:**

1. Clonar el repo y ejecutar `npm install`.
2. Ejecutar las dos suites en paralelo y apuntar el tiempo real de cada una:
   ```bash
   time npm run test:run       # Vitest
   time npm run test:karma     # Karma
   ```
3. Abrir en VS Code dos archivos lado a lado:
   - `src/utils/weatherCodes.test.js`
   - `src/utils/weatherCodes.old.test.js`
   Leer los dos en paralelo. Identificar 3 diferencias idiomáticas.
4. Ejecutar Vitest en modo watch con la extensión de VS Code o con:
   ```bash
   npm run test:ui
   ```
   Tocar una assertion de `CityCard.test.jsx`, guardar, ver el test re-ejecutarse en <100 ms.

**Criterios de éxito:**

- Tienes apuntado el tiempo de cada suite en tu máquina (ej.: Vitest 2.5 s, Karma 8 s).
- Sabes responder: *"¿qué tests ejecuta cada runner?"* (`.test.*` → Vitest, `.old.test.*` → Karma).
- El watch mode de Vitest responde en tiempo real tras tocar un test.

**Pistas:**

- Si Karma falla al arrancar, verifica que tienes Chrome instalado (Karma usa ChromeHeadless).
- El script `npm test` sin argumentos arranca Vitest en watch (por el `"test": "vitest"` en `package.json`). Usa `npm run test:run` para ejecutarlo una vez.

**Solución de referencia:** el propio `package.json` del repo — los 8 scripts están listos y documentados.

**Apuntar a:** [`10-migracion-karma-vitest.md`](./10-migracion-karma-vitest.md) sección 3 (decisión de runner).

---

## Ejercicio 02 · Queries semánticas en lugar de selectores CSS

> **Modalidad:** Tutorial · **Scaffolding:** Guiado · **Tiempo:** 25-35 min

**Objetivo:** refactorizar un test que usa `document.querySelector` con clases CSS para que
use queries semánticas (`getByRole`, `getByLabelText`, `getByText`).

**Contexto:**
- Mira `src/components/HourlyForecast/HourlyForecast.test.jsx` — ya está limpio. Usa
  `screen.getAllByRole('listitem')` en vez de `querySelectorAll('.hourly-forecast__card')`.
- Mira el componente `src/components/HourlyForecast/HourlyForecast.jsx` — las cards
  exponen `role="listitem"` precisamente para permitir la query semántica.

**Pasos:**

1. Crea una copia de `DailyForecast.test.jsx` en `DailyForecast.practice.test.jsx`.
2. Modifícala para que use `document.querySelector('.daily-forecast__row')` en vez de
   `screen.getAllByRole('listitem')`. Ejecuta el test — debe seguir en verde.
3. Ahora abre `src/components/DailyForecast/DailyForecast.jsx` y **cámbiale la clase CSS**
   del row de `daily-forecast__row` a `weekly-row`. Ejecuta los dos tests:
   - El test original (`DailyForecast.test.jsx`) sigue en verde.
   - Tu copia (`DailyForecast.practice.test.jsx`) falla.
4. Revierte el cambio del componente y borra el archivo `.practice.test.jsx`.

**Criterios de éxito:**

- Viste con tus ojos que un test basado en CSS es frágil ante refactors que no cambian
  comportamiento.
- Puedes listar mentalmente la jerarquía de queries: `getByRole` > `getByLabelText` >
  `getByText` > `getByTestId` > `querySelector`.
- Cuando `getByRole` no encuentra algo, tu primer reflejo es mirar si al **componente** le
  falta un `role` accesible.

**Pistas:**

- Si `getByRole('button', { name: /.../ })` falla, abre React DevTools y mira si el elemento
  es un `<button>` real. Un `<div onClick={...}>` no tiene rol de botón.
- `screen.debug()` imprime el DOM actual — útil cuando no sabes qué query usar.

**Solución de referencia:** `src/components/HourlyForecast/HourlyForecast.test.jsx` (versión
limpia) y `src/components/DailyForecast/DailyForecast.test.jsx` (idem).

**Apuntar a:** [`05-queries-testing-library.md`](./05-queries-testing-library.md) (jerarquía
oficial de queries) y [`09-buenas-practicas.md`](./09-buenas-practicas.md) sección 2
(antipatrones con selectores CSS).

---

## Ejercicio 03 · Migrar `fireEvent` a `userEvent` y medir delta mutation score

> **Modalidad:** Tutorial · **Scaffolding:** Semi-guiado · **Tiempo:** 30-45 min

**Objetivo:** reescribir un test que simula al usuario con `fireEvent` para que use
`userEvent.setup()`, y **medir el delta** en el mutation score antes/después.

**Contexto:**
- `src/components/SearchBar/SearchBar.fireEvent.demo.test.jsx` — archivo de demo que ya
  contrasta ambos enfoques lado a lado. Ésta es tu referencia.
- El componente `SearchBar.jsx` tiene un debounce implícito (a través de `useGeocoding`)
  y un `handleBlur` con `setTimeout(200)`. Los handlers de teclado son donde `fireEvent`
  se queda corto.

**Pasos:**

1. Ejecuta Stryker sobre `SearchBar` con la suite actual y anota el mutation score:
   ```bash
   npm run test:mutation:vitest -- --mutate "src/components/SearchBar/SearchBar.jsx"
   ```
2. Crea una copia de `SearchBar.test.jsx` llamada `SearchBar.fireEvent.practice.test.jsx` y
   sustituye TODOS los `user.click(...)` y `user.type(...)` por `fireEvent.click(...)` y
   `fireEvent.change(input, { target: { value: '…' } })`.
3. Verifica que los tests siguen en verde.
4. Re-ejecuta Stryker con la suite modificada:
   ```bash
   npm run test:mutation:vitest -- --mutate "src/components/SearchBar/SearchBar.jsx"
   ```
5. Compara las dos puntuaciones. Anota: `score_con_userEvent = X%`,
   `score_con_fireEvent = Y%`, `delta = Y - X%`.
6. Borra el archivo `.practice.*` y restaura la suite original.

**Criterios de éxito:**

- Delta negativo: el score con `fireEvent` debería ser igual o **inferior** al de
  `userEvent` (típicamente 3-8 puntos menos).
- Identificas al menos un mutante que **sobrevive con `fireEvent` y muere con
  `userEvent`**. Revisa el reporte HTML para encontrarlo.
- Entiendes por qué: `userEvent.type` dispara `keydown` → `keypress` → `input` → `keyup`
  por cada carácter; `fireEvent.change` salta directo al valor final.

**Pistas:**

- `userEvent` v14 es async: `await user.type(...)`. Olvidarse del `await` hace que el test
  pase sin haber tipeado nada.
- Si tu proyecto tiene handlers `onKeyDown`/`onKeyPress`/`onInput`, `fireEvent.change` no
  los dispara → los mutantes en esos handlers sobreviven.

**Solución de referencia:** `src/components/SearchBar/SearchBar.fireEvent.demo.test.jsx`.

**Apuntar a:** [`06-eventos-de-usuario.md`](./06-eventos-de-usuario.md) (API completa de
userEvent 14) y [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md)
sección 11 (cómo interpretar el reporte HTML).

---

## Ejercicio 04 · Traducir un test Jasmine a Vitest

> **Modalidad:** How-to · **Scaffolding:** Semi-guiado · **Tiempo:** 30-45 min

**Objetivo:** ganar fluidez con las equivalencias Jasmine → Vitest traduciendo un test
real del repo sin mirar la solución.

**Contexto:** elige uno de estos pares (de menor a mayor dificultad):

| Par | Dificultad | Lo que cubre |
|---|---|---|
| `weatherCodes.old.test.js` → `weatherCodes.test.js` | Baja | Funciones puras, `forEach` vs `it.each` |
| `geocodingService.old.test.js` → `geocodingService.test.js` | Media | `spyOn(window, 'fetch')` → `vi.stubGlobal` |
| `useUnit.old.test.js` → `useUnit.test.js` | Baja | Hook puro con `renderHook + act` (casi idéntico) |

**Pasos:**

1. Elige un par. Abre solo el `.old.test.*` (Jasmine).
2. Crea un archivo `<nombre>.translated.test.*` (para Vitest) vacío.
3. Traduce cada `describe`/`it` aplicando la tabla de equivalencias:

   | Jasmine | Vitest |
   |---|---|
   | `jasmine.createSpy('x')` | `vi.fn()` |
   | `spyOn(obj, 'm').and.returnValue(v)` | `vi.spyOn(obj, 'm').mockReturnValue(v)` |
   | `spyOn(obj, 'm').and.callFake(fn)` | `vi.spyOn(obj, 'm').mockImplementation(fn)` |
   | `spyOn(obj, 'm').and.callThrough()` | `vi.spyOn(obj, 'm')` (callThrough es el default) |
   | `spyOn(window, 'fetch').and.returnValue(Promise.resolve(x))` | `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(x))` |
   | `jasmine.objectContaining / any / arrayContaining` | `expect.objectContaining / any / arrayContaining` |
   | `.calls.count()` + `.toBe(n)` | `.toHaveBeenCalledTimes(n)` |
   | `.calls.mostRecent().args[0]` | `.mock.lastCall[0]` |
   | `expectAsync(p).toBeRejectedWithError('…')` | `await expect(p).rejects.toThrow('…')` |
   | `.toBeTruthy()` (para elementos DOM) | `.toBeInTheDocument()` (con `@testing-library/jest-dom`) |
   | `forEach([...]).forEach(c => it(...))` | `it.each([...])('…', c => ...)` |

4. Ejecuta `npm run test:run -- <tu-archivo>` hasta que todos los tests pasen.
5. **Solo entonces** abre el `.test.*` del repo y compara con tu traducción. Anota qué
   patrones has resuelto distinto.

**Criterios de éxito:**

- Todos tus tests pasan.
- Cero `import 'jasmine'` o referencias a `jasmine.*`.
- Cero `spyOn(window, 'fetch')` si elegiste `geocodingService` (debes haber usado
  `vi.stubGlobal`).
- Tu `it.each` (si aplica) se lee igual de claro que el de referencia.

**Pistas:**

- `jasmine.createSpyObj('S', ['a','b'])` no tiene equivalente 1:1. Úsalo como objeto literal:
  ```ts
  const svc = { a: vi.fn(), b: vi.fn() }
  ```
- En Vitest, `afterEach` con `mockReset()` no hace falta si tienes `clearMocks: true` en
  `vite.config.js`. Nuestro repo lo tiene activo.

**Solución de referencia:** cualquier `.test.*` del par elegido. Compara patrón por
patrón.

**Apuntar a:** [`11-sintaxis-jasmine-vitest.md`](./11-sintaxis-jasmine-vitest.md) (tabla
exhaustiva con 60+ patrones).

---

## Ejercicio 05 · Aislar un hook con `vi.mock` + `vi.hoisted`

> **Modalidad:** How-to · **Scaffolding:** Semi-guiado · **Tiempo:** 35-45 min

**Objetivo:** aislar un custom hook de su dependencia (un servicio HTTP) usando
`vi.mock` con `vi.hoisted` para compartir referencias entre la factory y los tests.

**Contexto:** el hook `useWeather` depende de `getWeather` del servicio
`weatherService.js`. Sin `vi.mock`, cada test haría una petición real a Open-Meteo.
Nuestra solución actual usa el patrón canónico: `vi.hoisted` para declarar la función
espía y los datos mock en el mismo scope que la factory de `vi.mock`.

**Pasos:**

1. Lee `src/hooks/useWeather.test.js` completo (la solución). Identifica:
   - El bloque `vi.hoisted(() => ({ ... }))` al principio.
   - Cómo se usa `getWeather` (el mock) dentro de `vi.mock('../services/weatherService', () => ({ getWeather }))`.
   - Cómo se usa `mockWeatherData` dentro de los tests.
2. Ahora aplica el mismo patrón a **`useGeocoding`**:
   - Crea `src/hooks/useGeocoding.practice.test.js`.
   - Usa `vi.hoisted` para declarar una función espía `searchCities` y un mock de datos.
   - `vi.mock('../services/geocodingService', () => ({ searchCities }))`.
   - Escribe **un test mínimo** que verifique que `useGeocoding('Madrid')` llama a
     `searchCities` tras el debounce.
3. Ejecuta el test. Debe pasar.
4. **Experimento didáctico:** quita `vi.hoisted` y declara las variables con `const`
   normal al principio del archivo. Intenta ejecutar. ¿Qué pasa?

**Criterios de éxito:**

- Tu test del paso 2 pasa.
- En el paso 4, ves el error `ReferenceError: Cannot access 'searchCities' before initialization`.
  Esto demuestra por qué `vi.hoisted` es necesario: `vi.mock` se mueve al inicio del archivo
  por transformación AST, y las variables normales no están aún inicializadas cuando
  corre la factory.

**Pistas:**

- `vi.hoisted()` acepta una función que devuelve un objeto. Las claves de ese objeto quedan
  disponibles en todo el archivo, **incluida la factory de `vi.mock`**.
- Si el hook tiene debounce (useGeocoding tiene 300 ms), combina `vi.useFakeTimers()` +
  `await vi.advanceTimersByTimeAsync(300)` como en el siguiente ejercicio.

**Solución de referencia:** `src/hooks/useGeocoding.test.js` (suite completa con los 9
tests, incluyendo casos de race condition y cleanup).

**Apuntar a:** [`12-mocking-avanzado.md`](./12-mocking-avanzado.md) secciones 2 (vi.mock
hoisting) y 3 (vi.hoisted).

---

## Ejercicio 06 · Asincronía · debounce + race condition + cleanup

> **Modalidad:** How-to · **Scaffolding:** Autónomo · **Tiempo:** 35-45 min

**Objetivo:** dominar `vi.useFakeTimers` + `advanceTimersByTimeAsync` sobre un hook con
debounce, y cubrir dos escenarios que típicamente se olvidan: race conditions y cleanup
al desmontar.

**Contexto:** `useGeocoding` tiene tres comportamientos críticos que TODOS hay que testear:

1. Respeta el debounce (no dispara fetch hasta los 300 ms).
2. Si el query cambia rápido, solo usa el último (cancela el timer anterior).
3. Al desmontar el componente, limpia el timer pendiente (previene memory leaks).

**Pasos:**

1. Cierra cualquier archivo de test del repo. Trabaja solo con el hook fuente
   (`src/hooks/useGeocoding.js`) y la API `renderHook` de `@testing-library/react`.
2. Crea `src/hooks/useGeocoding.mytests.js` y escribe los siguientes tres tests:

   **Test A — debounce básico:**
   - Monta el hook con query = 'Madrid'.
   - Verifica que `searchCities` NO se ha llamado inmediatamente.
   - Avanza el reloj 299 ms. Sigue sin llamarse.
   - Avanza 1 ms más. Ahora sí se llama, exactamente UNA vez, con 'Madrid'.

   **Test B — race condition:**
   - Monta el hook con query = 'Ma'.
   - Avanza 100 ms (no llega al debounce).
   - Re-renderiza con query = 'Mad'.
   - Avanza 100 ms más.
   - Re-renderiza con query = 'Madrid'.
   - Avanza 300 ms.
   - Verifica que `searchCities` se llamó **exactamente una vez** y con 'Madrid'.

   **Test C — cleanup al desmontar:**
   - Monta el hook con query = 'Madrid'.
   - Desmonta el hook ANTES de que pasen los 300 ms.
   - Avanza el reloj 1 segundo.
   - Verifica que `searchCities` NUNCA se llamó.

3. Ejecuta tus tres tests. Todos deben pasar.

**Criterios de éxito:**

- Los tres tests pasan.
- Usas `await act(async () => { await vi.advanceTimersByTimeAsync(ms) })` para drenar
  microtasks tras avanzar el reloj.
- El Test B verifica `toHaveBeenCalledTimes(1)` y `toHaveBeenCalledWith('Madrid')` —
  si fallaras uno de los dos, el test es débil.
- El Test C ejecuta `unmount()` de forma explícita y después avanza el reloj.

**Pistas:**

- `vi.advanceTimersByTime(ms)` es síncrono y **no drena Promises** del callback del
  setTimeout. Si tu fetch falla silenciosamente, es porque usaste la variante sync.
  Usa siempre la `*Async`.
- `renderHook` de `@testing-library/react` devuelve `{ result, rerender, unmount }`.
  `rerender` acepta nuevos props si pasaste `initialProps`.

**Solución de referencia:** `src/hooks/useGeocoding.test.js` — busca los describes "race
condition" y "limpiar el timeout al desmontar".

**Apuntar a:** [`13-dominio-asincronia.md`](./13-dominio-asincronia.md) sección 4 (fake
timers) y sección 7 (React + `renderHook` con async).

---

## Ejercicio 07 · Test de integración con múltiples mocks

> **Modalidad:** How-to · **Scaffolding:** Autónomo · **Tiempo:** 40-50 min

**Objetivo:** escribir un test de integración del componente raíz `WeatherApp` que mockea
DOS servicios distintos (`weatherService` + `geocodingService`) con `vi.hoisted` y
verifica comportamientos end-to-end con `findByRole` / `waitFor`.

**Contexto:** `WeatherApp` orquesta cinco piezas: `SearchBar`, `UnitToggle`,
`CurrentWeather`, `HourlyForecast`, `DailyForecast` + tres `CityCard`s. Al montarse,
llama a `weatherService.getWeather` para Madrid + las otras 3 ciudades. Al buscar, llama
a `geocodingService.searchCities`. Al cambiar unidad, re-llama a `getWeather`.

**Pasos:**

1. Lee `src/components/WeatherApp/WeatherApp.test.jsx` **por encima** — familiarízate con
   la estructura, pero no copies.
2. En un archivo nuevo `WeatherApp.mytests.jsx`, escribe los siguientes cuatro tests desde
   cero, usando `vi.hoisted` para los dos mocks:

   - **T1 · Carga inicial**: al montar, aparece el heading con "Madrid" y la temperatura.
   - **T2 · Búsqueda**: escribes "Barcelona" en el input, eliges la opción Barcelona del
     dropdown, el heading cambia a "Barcelona".
   - **T3 · Cambio de unidad**: click en `°F` → `getWeather` se vuelve a llamar con
     `'fahrenheit'`.
   - **T4 · Error en la API**: `getWeather` rechaza → aparece un `role="alert"` con el
     mensaje "Error al obtener el clima".

3. Usa `const user = userEvent.setup()` al inicio de cada test que necesite interacción.
4. Prefiere `await screen.findByRole(...)` sobre `waitFor(() => expect(getByRole(...)))`.

**Criterios de éxito:**

- Los cuatro tests pasan.
- Usas `vi.hoisted` una sola vez al inicio, declarando `getWeather`, `searchCities`,
  `mockWeatherData` y `barcelonaCity`.
- Las interacciones con el DOM usan queries semánticas: `getByRole('heading', { name: '...' })`,
  `getByLabelText('Buscar ciudad')`, `getByRole('option', { name: /barcelona/i })`.
- No hay `document.querySelector` en todo el archivo.

**Pistas:**

- El componente usa `useGeocoding` con debounce de 300 ms. Si no usas fake timers,
  `findByRole('option', ...)` espera automáticamente hasta 1 s (default). Debería bastar.
  Si quieres evitar la latencia: fake timers + `advanceTimersByTimeAsync` antes del click.
- La búsqueda llama `searchCities` pero NO esperes a inspeccionar llamadas; espera al
  **efecto visible** (dropdown abierto, heading cambiado). Es más robusto.

**Solución de referencia:** `src/components/WeatherApp/WeatherApp.test.jsx`.

**Apuntar a:** [`12-mocking-avanzado.md`](./12-mocking-avanzado.md) (mocks múltiples) +
[`13-dominio-asincronia.md`](./13-dominio-asincronia.md) sección 7 (React async con
`findBy*`).

---

## Ejercicio 08 · Matar los 5 mutantes supervivientes

> **Modalidad:** How-to · **Scaffolding:** Autónomo (ownership completo) · **Tiempo:** 45-60 min

**Objetivo:** aplicar las técnicas del roadmap de mutation score (boundaries, valores
exactos, operadores lógicos divergentes) sobre un archivo real y verificar que tu delta
aparece en el reporte de Stryker.

**Contexto:** `src/utils/temperatureConverter.js` contiene tres funciones con CINCO
mutantes de libro intencionalmente marcados como `MUTANT_DEMO_1..5`. El archivo de tests
`temperatureConverter.test.js` tiene DOS suites:

- `temperatureConverter · tests débiles` — dejan los mutantes VIVOS (coverage 100 %, score ~30 %).
- `temperatureConverter · tests fuertes` — los MATAN con `it.each` de boundaries y valores exactos.

**Pasos:**

1. Ejecuta Stryker solo con la suite débil (comenta temporalmente la suite fuerte):
   ```bash
   npm run test:mutation:vitest -- --mutate "src/utils/temperatureConverter.js"
   ```
   Abre `reports/mutation/vitest/mutation.html`. Anota qué mutantes aparecen como
   `Survived` (deberían ser ~5).
2. Para cada mutante `Survived`, identifica su categoría:
   - `ConditionalExpression` — un `if` se mutó a `if (true)` o `if (false)`.
   - `EqualityOperator` — un `<` se mutó a `<=`, o `===` a `!==`, etc.
   - `ArithmeticOperator` — un `*` se mutó a `/`, etc.
   - `LogicalOperator` — un `&&` se mutó a `||`, etc.
   - `BlockStatement` — el contenido de un `if` o `catch` se vació.
3. Añade los tests necesarios para matar cada uno. Estrategias:
   - Condicional: test con el valor que hace el `if` ser **falso**.
   - Equality: `it.each` con `[boundary - 1, boundary, boundary + 1]`.
   - Arithmetic: assertion con valor EXACTO (`toBe(212)`, no `toBeGreaterThan(32)`).
   - Logical: DOS tests con los operandos divergentes (uno true/uno false).
   - BlockStatement: test que verifica el side-effect del bloque (ej. un `logger.error`
     fue llamado).
4. Re-ejecuta Stryker. Score objetivo: ≥ 95 %.
5. Bonus: repite el ejercicio sobre `src/utils/weatherCodes.js` (tiene ~25 mutantes
   sobrevivientes en la suite actual).

**Criterios de éxito:**

- Los 5 mutantes `MUTANT_DEMO_*` aparecen como `Killed`.
- Score de `temperatureConverter.js` ≥ 95 %.
- Tus tests nuevos son **independientes** (no comparten estado, no usan `beforeEach`
  para montar el SUT — eso es antipatrón según `09-buenas-practicas.md`).

**Pistas:**

- Si un test nuevo NO mata el mutante, abre el reporte y mira **qué tests se ejecutaron
  contra ese mutante**. Si el tuyo no aparece ahí, Stryker cree que no cubre esa línea —
  probablemente el mutante está en una rama de código que tu test no llega a ejecutar.
- `it.each` con boundaries es la técnica más rentable para subir score rápido. Un `it.each`
  de 10 filas mata a menudo 5-8 mutantes de una vez.
- El roadmap por fases (NoCoverage → Survived en EqualityOperator → error paths) está
  documentado en [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md)
  sección 15.2.1.

**Solución de referencia:** la propia suite `tests fuertes` de
`src/utils/temperatureConverter.test.js` mata los 5. Lee cada test y confirma la técnica
que aplica.

**Apuntar a:** [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md)
completo (especialmente secciones 11 — interpretar el reporte — y 15.2.1 — roadmap
por fases).

---

## Comparativa bonus · Stryker con Karma vs Stryker con Vitest

> **Modalidad:** How-to exploratorio · **Tiempo:** 15 min

El repo tiene los **dos Strykers configurados**. Ejecuta los dos sobre el mismo archivo
y compara:

```bash
# Stryker con Vitest runner (perTest activo)
time npm run test:mutation:vitest -- --mutate "src/utils/temperatureConverter.js"

# Stryker con Karma runner (suite reducida a src/utils/)
time npm run test:mutation:karma -- --mutate "src/utils/temperatureConverter.js"
```

Apunta:
- Tiempo total de cada uno.
- `Ran N.NN tests per mutant on average` (aparece al final de cada run).
- Mutation score (debe ser idéntico).

**Lo que aprendes:** la paridad de mutation score valida el espejo funcional entre las
dos suites. La diferencia de tiempos te enseña por qué `coverageAnalysis: "perTest"` (solo
disponible con Vitest) es la palanca nº 1 de rendimiento.

**Matiz importante:** el Stryker-Karma del repo usa un `karma.stryker.conf.cjs` que
**carga solo los tests de `src/utils/`**. Con la suite completa (237 tests), el
instrumenter de Stryker + webpack choca con los módulos ESM de `@testing-library/user-event`
y el dry-run falla. Es precisamente la razón por la que Stryker-Karma no escala a proyectos
modernos reales — y un argumento potente para migrar a Vitest.

---

## Checklist global

Al completar los 8 ejercicios deberías poder, **sin consultar**:

- [ ] Ejecutar Vitest y Karma en el repo y explicar qué tests corre cada uno.
- [ ] Traducir al menos 10 patrones Jasmine → Vitest de memoria.
- [ ] Aplicar el patrón `vi.hoisted` + `vi.mock` para aislar un hook de su servicio.
- [ ] Testear un hook con debounce cubriendo: caso feliz, race condition y cleanup al desmontar.
- [ ] Escribir un test de integración de un componente raíz con múltiples servicios mockeados,
      usando queries semánticas exclusivamente.
- [ ] Mirar un reporte de Stryker, identificar los 5 tipos de mutantes más comunes y saber
      qué técnica aplicar a cada uno.
- [ ] Explicar en una frase por qué `coverageAnalysis: "perTest"` acelera 10-50× y por qué
      Karma no puede tenerlo.
- [ ] Elegir entre `findByText`, `waitFor`, `vi.advanceTimersByTimeAsync` y
      `await act(...)` según la situación async que tengas delante.

---

## Soluciones (todas en el propio repo)

El repositorio `taller-testing-frontend-avanzado/` **es** el manual de soluciones. Cada
`.test.*` es la versión moderna y resuelta; cada `.old.test.*` es el contraejemplo legacy
que el ejercicio correspondiente mejora.

| Ejercicio | Archivos de referencia en el repo |
|---|---|
| E01 | `package.json` (scripts), `vite.config.js`, `karma.conf.cjs` |
| E02 | `src/components/HourlyForecast/HourlyForecast.test.jsx`, `DailyForecast.test.jsx` |
| E03 | `src/components/SearchBar/SearchBar.fireEvent.demo.test.jsx` |
| E04 | Cualquier par `.old.test.* ↔ .test.*` (ver tabla del E04) |
| E05 | `src/hooks/useWeather.test.js`, `src/hooks/useGeocoding.test.js` |
| E06 | `src/hooks/useGeocoding.test.js` (describes de race y cleanup) |
| E07 | `src/components/WeatherApp/WeatherApp.test.jsx` |
| E08 | `src/utils/temperatureConverter.js` + `.test.js` (suite fuerte) |

Las soluciones no se bloquean: si te atascas, consúltalas. El objetivo del taller es que
salgas dominando el material, no que sufras.

---

## Recursos para ir más allá

- **Extensión Vitest de VS Code** — tests en gutter en tiempo real.
- **Vitest UI** — `npm run test:ui` abre una interfaz web con el árbol de tests,
  coverage y logs.
- **Stryker Playground** — probar mutation testing sin instalar nada:
  <https://stryker-mutator.io/docs/stryker-js/introduction/>.
- **Testing Library playground** — <https://testing-playground.com/> pega HTML y obtén
  la query recomendada.
- **MSW v2** — para cuando llegues a proyectos con múltiples endpoints:
  <https://mswjs.io/docs/>.

---

## Fuentes

Los conceptos de cada ejercicio se apoyan en los archivos 01-14 de esta guía, que ya llevan
su propia bibliografía. Aquí solo citamos las fuentes directamente referenciadas en los
ejercicios:

- **Scaffolding decreciente (ZPD + backward fading)** — Vygotsky, *Mind in Society*;
  Collins, Brown y Newman, *Cognitive Apprenticeship*; Renkl y Atkinson, *Worked Examples
  and Fading*. Base pedagógica de la progresión 01 → 08.
- **Orden de queries en Testing Library** —
  [Testing Library · Query Priority](https://testing-library.com/docs/queries/about/#priority).
  Referenciado en E02.
- **`userEvent` v14 async** —
  [user-event · Intro y Setup](https://testing-library.com/docs/user-event/intro/).
  Referenciado en E03.
- **`waitFor` timeout por defecto (1 s)** —
  [Testing Library · Async Methods](https://testing-library.com/docs/dom-testing-library/api-async/).
  Referenciado en E06 y E07.
- **`vi.hoisted` · scope compartido con `vi.mock`** —
  [Vitest · Mocking Modules](https://vitest.dev/guide/mocking.html#modules).
  Referenciado en E05.
- **`coverageAnalysis: "perTest"`** —
  [Stryker · Vitest Runner](https://stryker-mutator.io/docs/stryker-js/vitest-runner/).
  Referenciado en la comparativa bonus.
- **Roadmap de mutation score** — métricas internas del proyecto cliente; el desglose por
  fases vive en [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md)
  sección 15.2.1. Referenciado en E08.

Para el resto (anti-patrones, trofeo de Kent C. Dodds, AAA, etc.), consulta
[`15-referencias.md`](./15-referencias.md).
