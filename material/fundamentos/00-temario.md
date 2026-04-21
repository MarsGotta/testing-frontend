# Temario · Guía escrita de Testing Frontend

## Contexto del curso

- **Audiencia:** developers Angular, Vue y React de un cliente del sector con 20+ squads, con al menos 6 meses de experiencia testeando en producción. Pares, no principiantes. Se asume que sabes JavaScript/TypeScript y has escrito tests antes (Jasmine, Jest o similar).
- **Taller 1 · Fundamentos:** anatomía de un test, queries accesibles, eventos, mocking básico. Asienta el *por qué* y el vocabulario antes de entrar a casos reales. Cubre archivos **01–09**.
- **Taller 2 · Avanzado:** migración desde Karma/Jasmine, mocking de stores y HTTP, asincronía (RxJS, Signals, Vue reactivity) y mutation testing con Stryker. Es donde se ataca el KPI real del cliente: **mover el mutation score de ~22 % a 60 %+**. Cubre archivos **10–14**, con ejercicios en 16 y referencias en 15.
- **Modalidad mixta:** sesión síncrona (motivación, debate, demo en vivo) + guía escrita asíncrona (profundidad, reference, relectura). Ambas son complementarias: la guía es autosuficiente si te perdiste la sesión.

---

## Cómo usar esta guía

1. **Si acabas de terminar el Taller 1 o 2**: los archivos están numerados en el orden recomendado de lectura.
2. **Si buscas un tema concreto**: usa el índice por módulo más abajo.
3. **Si tienes poco tiempo o un problema concreto**: ve directo al bloque "Rutas sugeridas por situación" y elige la que encaje. No tienes por qué leer en orden — cada archivo tiene su propio mapa de prerrequisitos.
4. **Si ya dominas un tema**: sáltalo. Los archivos avanzados (10–14) asumen los fundamentos y enlazan hacia atrás cuando hace falta.
---

## Parte 1 · Fundamentos (Taller 1)

Material base. Cubre el *qué* y el *por qué* del testing frontend antes de entrar en casos avanzados.

| # | Archivo | Qué aprendes | Tiempo estimado |
|---|---|---|---|
| 1 | [`01-por-que-testear.md`](./01-por-que-testear.md) | Valor de los tests, pirámide vs trofeo, coste de no testear | 10 min |
| 2 | [`02-anatomia-de-un-test.md`](./02-anatomia-de-un-test.md) | Estructura AAA, naming, granularidad, `describe` / `it` | 15 min |
| 3 | [`03-jest-y-vitest.md`](./03-jest-y-vitest.md) | Comparativa de runners, configuración básica de Vitest, por qué Vitest | 15 min |
| 4 | [`04-primer-componente.md`](./04-primer-componente.md) | `render()`, `screen`, primer test de un componente real. Partes A (Angular), B (Vue) y C (React con `@testing-library/react` 16) | 20 min |
| 5 | [`05-queries-testing-library.md`](./05-queries-testing-library.md) | `getBy` / `queryBy` / `findBy`, jerarquía de queries, accesibilidad | 25 min |
| 6 | [`06-eventos-de-usuario.md`](./06-eventos-de-usuario.md) | `fireEvent` vs `userEvent` v14, `setup()`, eventos de teclado y puntero | 20 min |
| 7 | [`07-mocking-basico.md`](./07-mocking-basico.md) | `vi.fn()`, `vi.spyOn()`, stubs, fakes, diferencia entre spy/mock/stub. Partes A, B y C: ejemplos en Angular, Vue y React | 30 min |
| 8 | [`08-snapshots-y-accesibilidad.md`](./08-snapshots-y-accesibilidad.md) | Las 3 APIs de snapshot en Vitest 4 (inline / file / toMatchFileSnapshot), cuándo usarlas, auditoría con `jest-axe`/`vitest-axe` | 15 min |
| 9 | [`09-buenas-practicas.md`](./09-buenas-practicas.md) | Anti-patrones que explican por qué un coverage alto puede convivir con un mutation score bajo. Regla de oro (lineal, autocontenido, evidente), conexión con el roadmap del archivo 14 | 20 min |

---

## Parte 2 · Avanzado (Taller 2)

Casos reales que aparecen en producción: migración desde runners legacy, mocking complejo, asincronía y calidad real de los tests.

| # | Archivo | Qué aprendes | Tiempo estimado |
|---|---|---|---|
| 10 | [`10-migracion-karma-vitest.md`](./10-migracion-karma-vitest.md) | Historia del testing en Angular, pasos de migración paso a paso, happy-dom vs jsdom | 60 min |
| 11 | [`11-sintaxis-jasmine-vitest.md`](./11-sintaxis-jasmine-vitest.md) | Tabla exhaustiva de equivalencias, patrones sin equivalente directo, casos difíciles | 45 min |
| 12 | [`12-mocking-avanzado.md`](./12-mocking-avanzado.md) | `vi.mock` hoisting, servicios HTTP, stores (Pinia/NgRx; en la Parte C, Redux Toolkit, Zustand y TanStack Query para React), router, módulos pesados | 75 min |
| 13 | [`13-dominio-asincronia.md`](./13-dominio-asincronia.md) | Event loop, fake timers, Observables, Signals, Vue reactivity y (Parte C) async en React: `act`, `waitFor`, hooks con Suspense | 75 min |
| 14 | [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md) | Concepto, config Stryker 9.6.x con `@stryker-mutator/vitest-runner`, interpretación del reporte HTML, optimización en suites de 20+ squads, CI, roadmap **~22 % → 60 %+** por fases. Parte C con ejemplos de mutation testing sobre código React | 60 min |
| 15 | [`15-referencias.md`](./15-referencias.md) | Fuentes, docs oficiales, libros, charlas, repositorios de ejemplo | consulta |
| 16 | [`16-ejercicios.md`](./16-ejercicios.md) | 8 ejercicios prácticos progresivos para consolidar los conceptos del Taller 2 | 30-60 min cada uno |

---

## Rutas sugeridas por situación

Elige la ruta que resuelve tu problema actual. La guía está pensada para consulta no lineal: si ya dominas un archivo, sáltalo.

### "Acabo de empezar con testing frontend"
Leer en orden: **1 → 2 → 3 → 4 → 5 → 6 → 7 → 9**. Saltar el 8 en primera pasada.

### "Sé testear, pero mi equipo sigue en Karma/Jasmine y queremos migrar"
**10 → 11 → 13** (en ese orden). El 12 solo cuando te topes con mocks complejos.

### "Vengo de React con Jest o Create React App"
**3 → 4 (Parte C) → 6 → 12 → 13**. El 3 compara Jest y Vitest, el 4 Parte C monta tu primer test con `@testing-library/react` 16, y el 6 cubre `userEvent` (igual en los tres frameworks). Para el mocking de estado, el 12 entra en Redux Toolkit, Zustand y TanStack Query; el 13 trata `act`, `waitFor` y hooks asíncronos.

### "Ya tengo Vitest, pero mis tests son lentos o débiles"
**9 → 12 → 14**. El 9 para detectar anti-patrones, el 12 para aislar dependencias pesadas, el 14 para medir calidad real.

### "Quiero subir el mutation score de mi proyecto"
**14** directo, con especial atención al roadmap de fases (~22 % → 60 %+). Complementar con **13** si tienes tests async flakey.

### "Trabajo con Signals de Angular 17+ y no sé cómo testearlos"
**13** — sección "Angular Signals en tests". Luego **12** si tienes stores basados en Signal Store.

### "Me toca testear un componente Vue con Pinia"
**7** (si vienes de cero) → **12** sección Pinia (`createSpy: vi.fn` obligatorio con Vitest) → **13** sección `nextTick`.

---

## Prerrequisitos técnicos

- **Node.js 20** o superior.
- **Editor** con buen soporte de TypeScript (VS Code recomendado, con extensión oficial de Vitest).
- Un repo propio (Angular 17+, Vue 3 o React 19) donde practicar, o el repo de ejercicios del taller.
- Para el Taller 2: haber cursado el Taller 1 o leído al menos los archivos 01, 02, 05, 06 y 07 de esta guía.

---

## Stack de referencia (versiones usadas en la guía)

| Herramienta | Versión | Dónde se usa |
|---|---|---|
| Vitest | 4.x | Test runner principal en toda la guía |
| `@vitest/coverage-v8` | 4.x | Coverage con V8 |
| Testing Library (`@testing-library/*`) | 16.x | Queries y render (Angular, Vue, React, DOM) |
| `@testing-library/react` | 16.x | Render y queries para componentes React |
| `@testing-library/user-event` | 14.x | Interacción realista con async |
| `@testing-library/jest-dom` | 6.x | Matchers de DOM (`toBeInTheDocument`, etc.) |
| Stryker Mutator | 9.6.x | Mutation testing |
| `@stryker-mutator/vitest-runner` | 9.x | Integración Stryker ↔ Vitest |
| happy-dom | 14.x | Entorno DOM (más rápido que jsdom) |
| Angular | 17–21 | Framework — v21 trae Vitest por defecto |
| `@analogjs/vitest-angular` | latest | Plugin Vite para Angular 17–20 |
| Vue | 3.x | Framework |
| `@vue/test-utils` | 2.x | Utilidades de test para Vue |
| `createTestingPinia` (`@pinia/testing`) | 0.x | Mock de stores Pinia |
| NgRx (`@ngrx/store`, `@ngrx/signals`) | 17+ | Gestión de estado en Angular |
| React | 19.x | Framework — ejemplos de la Parte C en 04, 07, 12, 13 y 14 |
| Redux Toolkit (`@reduxjs/toolkit`) | 2.x | Gestión de estado en React (archivo 12) |
| Zustand | 5.x | Store ligero en React (archivo 12) |
| TanStack Query (`@tanstack/react-query`) | 5.x | Cache y fetching en React (archivos 12 y 13) |
| TypeScript | 5.x | Todo el código está tipado |
| Node.js | 20+ | Entorno de ejecución |

---

## Glosario rápido

| Término | Qué significa |
|---|---|
| **SUT** (System Under Test) | El módulo/función/componente que estás probando. Nunca mockearlo. |
| **Mutation score** | % de mutantes matados por los tests. Calidad real de la suite. |
| **Mutante** | Variación sintáctica del código (ej. `+` → `-`) que Stryker introduce. |
| **Killed** | Un test falló con la mutación (bueno). |
| **Survived** | Los tests pasaron con la mutación (malo: test débil). |
| **NoCoverage** | Ningún test tocó el mutante (peor: no hay test). |
| **fakeAsync / tick** | Utilidades Angular para tests con tiempo simulado (requieren Zone.js testing). |
| **firstValueFrom** | Convierte un Observable en Promise con el primer valor emitido (RxJS 7+). |
| **`vi.hoisted`** | Helper para usar variables dentro de una factory de `vi.mock` (que es hoisted). |
| **happy-dom / jsdom** | Entornos DOM simulados. happy-dom es más rápido, jsdom más completo. |
| **RTL / VTL / ATL** | React / Vue / Angular Testing Library. |

---

## Convenciones de la guía

- Ejemplos en **TypeScript** (no JavaScript puro).
- Los **tips** útiles aparecen como `> **Preferencia:** ...` o `> **Cuidado:** ...`.
- Los **gotchas** o cosas que rompen silenciosamente van marcados con `⚠`.
- Las **tablas de equivalencia** siempre tienen la forma `origen → destino`.
- Los enlaces internos entre archivos son relativos y funcionan en GitHub, VS Code y cualquier visor Markdown.

---

## Feedback y contribuciones

Si detectas algo desactualizado, roto o poco claro:

1. Abre un issue en el repo del taller con el número de archivo y sección.
2. O ponlo en el canal de comunicación del taller.
3. O trae el caso a la siguiente sesión síncrona — es exactamente el tipo de material que queremos refinar con feedback real.

---

## Fuentes

Este archivo es navegación pura: los claims técnicos viven en los archivos 01–14 y cada uno lleva sus propias referencias. La bibliografía completa (Diátaxis, Testing Library, Vitest, Stryker, Kent C. Dodds, Yoni Goldberg, WCAG y demás) está consolidada en [`15-referencias.md`](./15-referencias.md), ordenada por tema y con índice cruzado por archivo.

Los KPIs de mutation score que se citan aquí (`~22 % → 60 %+`) provienen de métricas internas del proyecto.
