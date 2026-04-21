# Referencias y Fuentes

> **Modalidad:** reference (Diátaxis) — índice navegable, no se lee linealmente.
> **Última actualización:** 2026-04. **Stack validado:** Vitest 4.x · Stryker 9.x · Angular 17–21 · Vue 3.x · React 19 · Testing Library 16.x · userEvent 14.x · happy-dom 14.x.
> **Idioma:** todas las fuentes en inglés salvo las marcadas `(ES)`.

---

## Cómo usar este archivo

1. **Si buscas una fuente sobre un tema concreto**: usa el [índice por tema](#1-fundamentos-y-filosofía-del-testing) más abajo.
2. **Si vienes de un archivo concreto de la guía**: salta al [índice cruzado por archivo](#índice-cruzado-por-archivo-de-la-guía) para ver qué fuentes amplían ese tema.
3. **Si quieres profundizar en pedagogía** (cómo aprenden los devs): [Meta · Cómo aprenden los developers](#meta--cómo-aprenden-los-developers).
4. **Si buscas material en español**: sección [Fuentes en español](#fuentes-en-español).

Las fuentes prioritarias llevan un asterisco `★` al principio. Empieza por esas.

---

## Índice

1. [Fundamentos y filosofía del testing](#1-fundamentos-y-filosofía-del-testing)
2. [Vitest 4.x — documentación oficial](#2-vitest-4x--documentación-oficial)
3. [Jest 30 (para quien migra desde ahí)](#3-jest-30-para-quien-migra-desde-ahí)
4. [Testing Library (DOM, Angular, Vue, userEvent, jest-dom)](#4-testing-library-dom-angular-vue-userevent-jest-dom)
5. [Angular testing (Vitest, fakeAsync, Signals, HttpTesting, Router)](#5-angular-testing)
6. [Vue testing (Test Utils, Pinia, Vue Router)](#6-vue-testing)
6b. [React testing (RTL, React 19, hooks, state, TanStack)](#6b-react-testing)
7. [RxJS y asincronía](#7-rxjs-y-asincronía)
8. [Mocking avanzado y MSW](#8-mocking-avanzado-y-msw)
9. [Mutation testing y Stryker 9](#9-mutation-testing-y-stryker-9)
10. [Karma: deprecación y migración](#10-karma-deprecación-y-migración)
11. [AnalogJS y stack Vite para Angular](#11-analogjs-y-stack-vite-para-angular)
12. [happy-dom vs jsdom](#12-happy-dom-vs-jsdom)
13. [Accesibilidad (WCAG, axe, jest-axe/vitest-axe)](#13-accesibilidad)
14. [Herramientas complementarias (E2E, coverage, visual, lint)](#14-herramientas-complementarias)
15. [Comunidad y aprendizaje continuo](#15-comunidad-y-aprendizaje-continuo)
16. [Fuentes en español](#fuentes-en-español)
17. [Meta · Cómo aprenden los developers](#meta--cómo-aprenden-los-developers)
18. [Índice cruzado por archivo de la guía](#índice-cruzado-por-archivo-de-la-guía)

---

## 1. Fundamentos y filosofía del testing

Por qué testear, qué testear, cómo pensar tests antes que frameworks.

- ★ **Kent C. Dodds — [Testing Trophy and Testing Classifications](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)**
  El "trofeo" como alternativa a la pirámide. Argumento central: los tests de integración dan la mejor relación confianza/esfuerzo.

- ★ **Testing Library — [Guiding Principles](https://testing-library.com/docs/guiding-principles/)**
  *"The more your tests resemble the way your software is used, the more confidence they can give you."* Si solo lees una página de testing-library, que sea esta.

- ★ **Kent C. Dodds — [Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)**
  Aplicable tal cual a Angular y Vue Testing Library. Anti-patrones frecuentes y cómo evitarlos.

- ★ **Yoni Goldberg — [JavaScript & Node.js Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)**
  50+ buenas prácticas organizadas por categoría (basics, frontend, backend, CI). Cada una con "do" y "don't".

- **Kent C. Dodds — [Testing JavaScript](https://testingjavascript.com/)**
  Curso integral (de pago). Filosofía "test the way your software is used".

- **Martin Fowler — [Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)**
  Definición canónica de TDD. Referenciado en `09-buenas-practicas.md`.

- **Pedro Rijo — [Why Coverage Sucks](https://pedrorijo.com/blog/intro-mutation/)**
  Introducción accesible a las limitaciones del coverage y por qué necesitamos mutation testing.

- **Valentina Jemuovic — [Code Coverage vs Mutation Testing](https://journal.optivem.com/p/code-coverage-vs-mutation-testing)**
  Diferencia conceptual con ejemplos.

- **Valentina Jemuovic — [100% Coverage but 0% Bug Protection](https://journal.optivem.com/p/100-code-coverage-but-0-bug-protection)**
  Caso demostrativo: coverage alto no implica tests útiles.

---

## 2. Vitest 4.x — documentación oficial

Runner principal del curso. Vitest 4 requiere Vite ≥6 y Node ≥20.

### Guía y configuración

- ★ **[Vitest · Guide (Getting Started)](https://vitest.dev/guide/)** — entrada principal de la documentación.
- **[Vitest · Features](https://vitest.dev/guide/features)** — ESM, HMR de tests, TS/JSX nativo, multi-threading, in-source testing.
- **[Vitest · Comparisons](https://vitest.dev/guide/comparisons.html)** — Vitest vs Jest/Mocha/WTR/uvu.
- **[Vitest · Migration Guide](https://vitest.dev/guide/migration.html)** — desde Jest, Mocha, Sinon. Tabla de equivalencias oficial.
- **[Vitest · Blog](https://vitest.dev/blog/)** — changelogs, posts de release.

### API y mocking

- **[Vitest · Test API](https://vitest.dev/api/test)** — `test`, `describe`, `it`, hooks.
- **[Vitest · Vi API Reference](https://vitest.dev/api/vi.html)** — `vi.fn()`, `vi.mock()`, `vi.spyOn()`, `vi.stubGlobal()`, fake timers.
- **[Vitest · Mock API Reference](https://vitest.dev/api/mock.html)** — `mockReturnValue`, `mockResolvedValue`, `mockClear`, `mockReset`, `mockRestore`.
- **[Vitest · Mocking Guide](https://vitest.dev/guide/mocking)** — overview general.
- **[Vitest · Module Mocking](https://vitest.dev/guide/mocking/modules)** — `vi.mock`, hoisting, factories.
- **[Vitest · Mocking Requests](https://vitest.dev/guide/mocking/requests)** — MSW, fetch mock.
- **[Vitest · Timers Guide](https://vitest.dev/guide/mocking/timers)** — fake timers aplicados.
- **[Vitest · Fake Timers Configuration](https://vitest.dev/config/faketimers)** — `shouldAdvanceTime`, `toFake`, `now`.
- **[Vitest · Expect API (incluye `expect.poll`)](https://vitest.dev/api/expect.html)** — matchers y polling asíncrono.
- **[Vitest · Extending Matchers](https://vitest.dev/guide/extending-matchers)** — matchers personalizados.
- **[Vitest · Snapshot](https://vitest.dev/guide/snapshot)** — inline y file snapshots. `toMatchAriaSnapshot`.

### Herramientas Vitest

- **[Vitest UI](https://vitest.dev/guide/ui.html)** — navegador para explorar tests.
- **[Vitest VS Code Extension](https://marketplace.visualstudio.com/items?itemName=vitest.explorer)** — run/debug inline.
- **[Vitest GitHub Discussions](https://github.com/vitest-dev/vitest/discussions)** — foro oficial.

---

## 3. Jest 30 (para quien migra desde ahí)

Muchos equipos aún están en Jest. La documentación de Jest es útil para entender las diferencias de API al migrar.

- **[Jest · Getting Started](https://jestjs.io/docs/getting-started)** — docs oficiales.
- **[Jest · API Reference](https://jestjs.io/docs/api)** — globals, `expect`, mocks.
- **[Jest 30 Release Notes](https://jestjs.io/blog)** — blog oficial con releases.
- **[Jest ↔ Vitest · migración oficial](https://vitest.dev/guide/migration.html#migrating-from-jest)** — diferencias de API.

> **Gotcha típico al migrar:** `jest.fn()` → `vi.fn()` es directo, pero `jest.mock()` tiene hoisting distinto. Usa `vi.hoisted()` cuando la factory necesite capturar variables. Ver archivo 12 de la guía.

---

## 4. Testing Library (DOM, Angular, Vue, userEvent, jest-dom)

### Core DOM

- ★ **[Testing Library · Documentación oficial](https://testing-library.com/docs/)** — hub principal.
- ★ **[Testing Library · Queries](https://testing-library.com/docs/queries/about/)** — `getBy` / `queryBy` / `findBy` y variantes.
- ★ **[Testing Library · Query Priority](https://testing-library.com/docs/queries/about/#priority)** — orden de preferencia (role > label > placeholder > text…).
- **[Testing Library · Cheatsheet](https://testing-library.com/docs/dom-testing-library/cheatsheet/)** — referencia rápida en una página.
- **[Testing Library · Async Methods](https://testing-library.com/docs/dom-testing-library/api-async/)** — `findBy*`, `waitFor`, `waitForElementToBeRemoved`.
- **[Testing Library · ByRole](https://testing-library.com/docs/queries/byrole)** — la query recomendada por defecto.
- **[Testing Playground](https://testing-playground.com/)** — UI interactiva para descubrir qué query usar. Combinar con `screen.logTestingPlaygroundURL()`.

### userEvent v14

- ★ **[user-event · Intro](https://testing-library.com/docs/user-event/intro/)** — simula interacción realista (click, type, hover, tab).
- **[user-event · Setup](https://testing-library.com/docs/user-event/setup/)** — `userEvent.setup()` obligatorio desde v14.
- **[user-event · Options](https://testing-library.com/docs/user-event/options)** — lista completa de opciones de `setup()` (delay, pointerEventsCheck, writeToClipboard, advanceTimers).
- **[user-event · Keyboard](https://testing-library.com/docs/user-event/keyboard)** — sintaxis `{Enter}`, `{Shift>}…{/Shift}`.
- **[user-event · Pointer](https://testing-library.com/docs/user-event/pointer)** — hover, drag, multi-touch.

### jest-dom matchers

- **[@testing-library/jest-dom · Custom Matchers](https://github.com/testing-library/jest-dom#custom-matchers)** — `toBeInTheDocument`, `toBeVisible`, `toHaveClass`, etc.
- **[Markus Oberlehner — Vitest + jest-dom setup](https://markus.oberlehner.net/blog/using-testing-library-jest-dom-with-vitest/)** — config `setupFiles` y tipos TS.

### Wrappers por framework

- **[Angular Testing Library](https://testing-library.com/docs/angular-testing-library/intro/)** — `render` con providers/imports, componentes standalone.
- **[Vue Testing Library](https://testing-library.com/docs/vue-testing-library/intro/)** — props, emits, Pinia/Router.
- ★ **[React Testing Library · Intro](https://testing-library.com/docs/react-testing-library/intro/)** — `render`, `screen`, re-exports de DOM Testing Library. Entrada principal para React.
- **[React Testing Library · Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet)** — referencia rápida específica de RTL.
- **[React Testing Library · `renderHook`](https://testing-library.com/docs/react-testing-library/api/#renderhook)** — testear custom hooks sin componente envolvente.

### Lint

- **[eslint-plugin-testing-library](https://github.com/testing-library/eslint-plugin-testing-library)** — `prefer-screen-queries`, `no-unnecessary-act`, `no-wait-for-empty-callback`.

---

## 5. Angular testing

### Docs oficiales Angular

- ★ **[Angular · Migrating to Vitest](https://angular.dev/guide/testing/migrating-to-vitest)** — guía oficial + schematic `ng generate @angular/core:karma-to-vitest` (v21).
- ★ **[Angular · Testing Services](https://angular.dev/guide/testing/services)** — inyección de dependencias, mocking, servicios HTTP.
- ★ **[Angular · HTTP Testing](https://angular.dev/guide/http/testing)** — `HttpClientTesting`, `HttpTestingController`.
- ★ **[Angular · Routing Testing](https://angular.dev/guide/routing/testing)** — `RouterTestingHarness`, `provideRouter`, `provideLocationMocks`.
- **[Angular · `fakeAsync`](https://angular.dev/api/core/testing/fakeAsync)** — control de tiempo en tests con Zone.js testing.
- **[Angular · `tick`](https://angular.dev/api/core/testing/tick)** — avanza reloj virtual dentro de `fakeAsync`.
- **[Angular · `waitForAsync`](https://angular.dev/api/core/testing/waitForAsync)** — alternativa con asincronía real.
- **[Angular · `flushMicrotasks`](https://angular.dev/api/core/testing/flushMicrotasks)** — procesa Promises pendientes.
- **[Angular · `ComponentFixture`](https://angular.dev/api/core/testing/ComponentFixture)** — `detectChanges`, `whenStable`, `nativeElement`.
- **[Angular · Zoneless Guide](https://angular.dev/guide/zoneless)** — implicaciones para el testing sin Zone.js.

### Angular Blog y roadmap

- **[Angular Blog](https://blog.angular.dev/)** — anuncios oficiales.
- **[Announcing Angular v21](https://blog.angular.dev/announcing-angular-v21-57946c34f14b)** — Vitest por defecto.
- **[Moving Angular CLI to Jest and Web Test Runner](https://blog.angular.dev/moving-angular-cli-to-jest-and-web-test-runner-ef85ef69ceca)** — contexto histórico (2023).
- **[Future of fake timer testing in zoneless Angular (issue #55295)](https://github.com/angular/angular/issues/55295)** — discusión abierta.

### Artículos prácticos

- **[Rainer Hahnekamp — Angular's Testing Revolution: Vitest, Fake Timers & Testronaut](https://dev.to/rainerhahnekamp/angulars-testing-revolution-vitest-fake-timers-testronaut-2bnj)** — visión del ecosistema actual.
- **[Olayean Carh — Testing Angular 21 Components with Vitest](https://dev.to/olayeancarh/testing-angular-21-components-with-vitest-a-complete-guide-8l2)** — setup completo.
- **[Telerik — Unit Testing Angular with Vitest](https://www.telerik.com/blogs/unit-testing-angular-modern-testing-vitest)** — ejemplos detallados.
- **[Angular University — Modern Angular Testing with Vitest](https://blog.angular-university.io/angular-testing-vitest/)** — standalone components, signals, `inject()`.
- **[Rajat — Migrating Jasmine/Karma to Vitest in Angular 21](https://dev.to/codewithrajat/migrating-from-jasminekarma-to-vitest-in-angular-21-a-step-by-step-guide-developers-complete-3g9l)** — paso a paso.
- **[Marmicode Cookbook · Migrating to Vitest](https://cookbook.marmicode.io/angular/testing/migrating-to-vitest)** — formato receta.
- **[Brandon Roberts — Faster Testing with Angular and Vitest](https://dev.to/brandontroberts/faster-testing-with-angular-and-vitest-274n)** — del creador de AnalogJS.
- **[Angular Architects — Migrate from Karma to Vitest](https://www.angulararchitects.io/blog/migrate-from-karma-to-vitest/)** — enfoque enterprise, monorepos.
- **[Testing Angular Routing with RouterTestingHarness](https://dev.to/this-is-angular/testing-angular-routing-components-with-routertestingharness-providelocationmocks-and-providerouter-oi8)** — APIs nuevas.
- **[Damir's Corner — flush vs flushMicrotasks](https://www.damirscorner.com/blog/posts/20210702-AngularTestingFlushVsFlushMicrotasks.html)** — diferencia macrotasks vs microtasks.
- **[DigitalOcean — waitForAsync vs fakeAsync](https://www.digitalocean.com/community/tutorials/angular-testing-async-fakeasync)** — comparativa práctica.
- **[DEV · Understanding async tests in Angular](https://dev.to/angular/understanding-async-tests-in-angular-f8n)** — conceptual.
- **[Ninja Squad — Angular tests with Vitest Browser Mode (2025)](https://blog.ninja-squad.com/2025/11/18/angular-tests-with-vitest-browser-mode)** — browser mode experimental.

### NgRx

- **[NgRx v18 · Store Testing](https://v18.ngrx.io/guide/store/testing)** — `provideMockStore`, overrideSelectors, reducers.
- **[NgRx v18 · `provideMockStore` API](https://v18.ngrx.io/api/store/testing/provideMockStore)** — estado inicial y override de selectors.
- **[Tim Deschryver — Testing an NgRx Project](https://timdeschryver.dev/blog/testing-an-ngrx-project)** — stores, effects, selectors.
- **[NgRx · `provideMockActions` Vitest issue #4708](https://github.com/ngrx/platform/issues/4708)** — compatibilidad con Vitest.

> ⚠ **URL de NgRx:** `ngrx.io/guide/store/testing` redirige a la home. Usa `v18.ngrx.io/...` (o la versión que corresponda a tu proyecto) hasta que NgRx estabilice sus URLs versionadas.

---

## 6. Vue testing

### Vue Test Utils y oficial

- ★ **[Vue Test Utils · Getting Started](https://test-utils.vuejs.org/guide/)** — montaje, props, emits, aserciones.
- **[Vue Test Utils · Async Suspense Guide](https://test-utils.vuejs.org/guide/advanced/async-suspense)** — componentes asíncronos en Vue 3.
- **[Vue Test Utils · Testing Vue Router](https://test-utils.vuejs.org/guide/advanced/vue-router)** — guía oficial.

### Pinia

- ★ **[Pinia · Testing Cookbook](https://pinia.vuejs.org/cookbook/testing.html)** — `createTestingPinia`, mocking de actions/getters.
- **[Run That Line — Test Pinia Stores with Vitest](https://runthatline.com/vitest-test-pinia-store-actions-getters/)** — actions, getters, state.

> ⚠ **Vitest + Pinia:** `createTestingPinia({ createSpy: vi.fn, stubActions: false })` — `createSpy: vi.fn` es obligatorio con Vitest. Sin él, falla con `jest is not defined`.

### Vue Router

- **[Run That Line — Mock Vue Router with Vitest](https://runthatline.com/vitest-mock-vue-router/)** — varias estrategias.
- **[Eduardo San Martín — `vue-router-mock`](https://github.com/posva/vue-router-mock)** — del creador de Vue Router.

### Artículos prácticos Vue

- **[Maya Shavin — Testing Vue Components the Right Way](https://mayashavin.com/articles/testing-components-with-vitest)** — async, mocking, best practices.
- **[Alex Op — How to Test Vue Composables](https://alexop.dev/posts/how-to-test-vue-composables/)** — composables asíncronos.
- **[Mastering Flush Promises](https://medium.com/heybooster/mastering-flush-promises-with-vue-test-utils-vitest-and-typescript-7384e4ec9946)** — `flushPromises()` correctamente.
- **[Oneuptime — Configure Vue Testing with Vitest (2026)](https://oneuptime.com/blog/post/2026-01-24-vue-testing-vitest/view)** — setup actualizado.

---

## 6b. React testing

### Docs oficiales React 19

- ★ **[React · Docs oficiales](https://react.dev/)** — hub principal.
- ★ **[React 19 · Release notes (dic 2024)](https://react.dev/blog/2024/12/05/react-19)** — Actions, `use()`, nuevas hooks, cambios en hydration.
- **[React · `use()` hook](https://react.dev/reference/react/use)** — consume promises y contextos dentro del render.
- **[React · `useActionState`](https://react.dev/reference/react/useActionState)** — estado de formularios con Server Actions.
- **[React · `useOptimistic`](https://react.dev/reference/react/useOptimistic)** — UI optimista durante mutaciones pendientes.

### Testing Library React y hooks

- ★ **[React Testing Library · Intro](https://testing-library.com/docs/react-testing-library/intro/)** — la misma filosofía de queries por rol, `findBy` para async, `userEvent` v14.
- **[React Testing Library · Cheatsheet](https://testing-library.com/docs/react-testing-library/cheatsheet)** — referencia rápida.
- **[React Testing Library · `renderHook`](https://testing-library.com/docs/react-testing-library/api/#renderhook)** — custom hooks aislados; el wrapper se pasa para inyectar providers.
- ★ **[Kent C. Dodds — Common Mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)** — anti-patrones del creador de la librería: `wrapper` mal usado, `cleanup` manual, `act()` innecesario. Aplicable también a Angular/Vue Testing Library.
- **[Kent C. Dodds — Fix the "not wrapped in act" Warning](https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning)** — ya citado en §7; relevante sobre todo en React.

### Kent C. Dodds (el creador de Testing Library)

- **[Epic React](https://www.epicreact.dev/)** — curso integral de React (de pago). Cubre testing con RTL entre otras cosas.
- **[Testing JavaScript](https://testingjavascript.com/)** — curso específico de testing, muy centrado en React. Ya citado en §1.
- **[Kent C. Dodds · Blog (tag testing)](https://kentcdodds.com/blog?q=testing)** — posts sobre RTL, mocking, integración. Ya citado en §15.

### State management (React)

- ★ **[Redux Toolkit · Writing Tests](https://redux.js.org/usage/writing-tests)** — testear slices, thunks, y componentes conectados. Usa el store real en tests de integración; mockearlo rara vez compensa.
- **[Zustand · Testing](https://zustand.docs.pmnd.rs/learn/guides/testing)** — patrones para resetear el store entre tests y mockear stores completos.
- **[TanStack Query · Testing](https://tanstack.com/query/latest/docs/framework/react/guides/testing)** — `QueryClientProvider` en tests, silenciar logs, controlar `retry` y `gcTime` para evitar flakiness.

### Routing

- **[React Router · Testing](https://reactrouter.com/en/main/guides/testing)** — `MemoryRouter`, `createMemoryRouter`, tests de loaders y actions.

---

## 7. RxJS y asincronía

### RxJS oficial

- ★ **[RxJS · Documentation](https://rxjs.dev/)** — hub oficial.
- ★ **[RxJS · `firstValueFrom`](https://rxjs.dev/api/index/function/firstValueFrom)** — sustituto de `toPromise()` (deprecado). Obligatorio en tests lineales.
- **[RxJS · `lastValueFrom`](https://rxjs.dev/api/index/function/lastValueFrom)** — cuando necesitas el último valor antes del `complete`.
- **[RxJS · Marble Testing](https://rxjs.dev/guide/testing/marble-testing)** — `TestScheduler`, marble diagrams.

### Artículos asincronía

- **[DEV — Beginners Guide to RxJS Marble Testing](https://dev.to/this-is-learning/beginners-guide-to-rxjs-marble-testing-2e88)** — sintaxis de diagrams.
- **[Angular Love — Effective RxJS Marble Testing](https://angular.love/effective-rxjs-marble-testing/)** — hot vs cold, errores.
- **[Nicholas Jamieson — Testing with Fake Time](https://ncjamieson.com/testing-with-fake-time/)** — observables con tiempo controlado sin marbles.
- **[William Huey — Vitest Testing Observables](https://williamhuey.github.io/posts/vitest-testing-observables/)** — observables directos en Vitest.
- **[DigitalOcean — Marble Testing RxJS](https://www.digitalocean.com/community/tutorials/rxjs-marble-testing)** — tutorial completo.
- **[The Candid Startup — Asynchronous Unit Tests with Vitest (2026)](https://www.thecandidstartup.org/2026/03/23/asynchronous-unit-tests-vitest.html)** — patrones generales.
- **[hy2k — Vitest fake timers + debounced search (2025)](https://hy2k.dev/en/blog/2025/10-03-vitest-fake-timers-debounced-solidjs-search/)** — caso práctico.
- **[DEV — Flaky Tests from Race Conditions](https://dev.to/devassure/flaky-tests-from-race-conditions-root-causes-and-fixes-1j5f)** — diagnóstico.

### Testing Library async

- **[Testing Library · Async Methods](https://testing-library.com/docs/dom-testing-library/api-async/)** — `findBy*`, `waitFor`.
- **[DEV — Better Async Tests with Testing Library](https://dev.to/tipsy_dev/testing-library-writing-better-async-tests-c67)** — errores comunes.
- **[Kent C. Dodds — Fix the "not wrapped in act" Warning](https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning)** — act() en React/Angular.

---

## 8. Mocking avanzado y MSW

### Patrones Vitest

- **[LogRocket — Advanced Guide to Vitest Testing and Mocking](https://blog.logrocket.com/advanced-guide-vitest-testing-mocking/)** — deep mocking, factories, auto-mocking.
- **[DEV — Mock vs SpyOn in Vitest with TypeScript](https://dev.to/axsh/mock-vs-spyon-in-vitest-with-typescript-a-guide-for-unit-and-integration-tests-2ge6)** — cuándo usar cada uno.
- **[DeepWiki — Mocking and Spying Internals](https://deepwiki.com/vitest-dev/vitest/3.3-mocking-and-spying)** — cómo funciona por dentro.
- **[Epic Web Dev — Clearing vs Resetting vs Restoring Mocks](https://www.epicweb.dev/the-difference-between-clearing-resetting-and-restoring-mocks)** — diferencia entre `mockClear` / `mockReset` / `mockRestore`.
- **[vitest-mock-extended](https://github.com/eratio08/vitest-mock-extended)** — deep mocking tipado.

### MSW (Mock Service Worker)

- ★ **[MSW · Quick Start](https://mswjs.io/docs/quick-start/)** — handlers, setup Node/browser. (MSW 2.x)
- **[MSW · Node.js Integration](https://mswjs.io/docs/integrations/node/)** — Vitest, Jest.

---

## 9. Mutation testing y Stryker 9

### Stryker oficial

- ★ **[Stryker Mutator · Docs](https://stryker-mutator.io/docs/)** — entrada principal.
- ★ **[StrykerJS · Configuration Reference](https://stryker-mutator.io/docs/stryker-js/configuration/)** — todas las opciones (mutate, reporters, thresholds, concurrency).
- ★ **[StrykerJS · Vitest Runner](https://stryker-mutator.io/docs/stryker-js/vitest-runner/)** — restricciones y configuración específica.
- **[StrykerJS · Angular Guide](https://stryker-mutator.io/docs/stryker-js/guides/angular/)** — ignorers, config Karma y Vitest.
- **[StrykerJS · Vue.js Guide](https://stryker-mutator.io/docs/stryker-js/guides/vuejs/)** — SFC y runner.
- **[StrykerJS · Incremental Mode](https://stryker-mutator.io/docs/stryker-js/incremental/)** — caché entre runs.
- **[StrykerJS · Disable Mutants](https://stryker-mutator.io/docs/stryker-js/disable-mutants/)** — `// Stryker disable ...`.
- **[StrykerJS · Config File Formats](https://stryker-mutator.io/docs/stryker-js/config-file/)** — JSON, MJS, CJS, TS.
- **[StrykerJS · Karma Runner](https://stryker-mutator.io/docs/stryker-js/karma-runner/)** — legacy.
- **[Stryker · Equivalent Mutants](https://stryker-mutator.io/docs/mutation-testing-elements/equivalent-mutants/)** — qué son, cómo manejarlos.
- **[Stryker · Mutant States and Metrics](https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/)** — Killed, Survived, NoCoverage, Timeout.
- **[Stryker · Supported Mutators](https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/)** — lista completa con ejemplos.
- **[Stryker · Dashboard](https://stryker-mutator.io/docs/General/dashboard/)** — tracking histórico.

### Blog Stryker

- **[Announcing StrykerJS 7.0 (Vitest support)](https://stryker-mutator.io/blog/announcing-stryker-js-7/)** — histórico: añadido soporte Vitest.
- **[Announcing Incremental Mode](https://stryker-mutator.io/blog/announcing-incremental-mode/)** — diseño y benchmarks.
- **[Stryker Mutator · Blog](https://stryker-mutator.io/blog/)** — releases posteriores (v8, v9).

### Código y conceptos

- **[StrykerJS · GitHub](https://github.com/stryker-mutator/stryker-js)** — issues, contribuir.
- **[@stryker-mutator/core · npm](https://www.npmjs.com/package/@stryker-mutator/core)** — versiones y changelog.
- **[Mutation Testing · Wikipedia](https://en.wikipedia.org/wiki/Mutation_testing)** — historia y fundamentos.
- **[Codecov — Mutation Testing as Quality Metric](https://about.codecov.io/blog/mutation-testing-how-to-ensure-code-coverage-isnt-a-vanity-metric/)** — perspectiva industrial.

### Guías prácticas

- **[Oneuptime — Configure Mutation Testing with Stryker (2026)](https://oneuptime.com/blog/post/2026-01-25-mutation-testing-with-stryker/view)** — guía actualizada.
- **[Nicolas Dos Santos — Vue + StrykerJS Example](https://medium.com/accor-digital-and-tech/introducing-mutation-testing-in-vue-js-with-strykerjs-e1083afe7326)** — ejemplo práctico Vue.

### Investigación académica

- **[Mutation Testing in CI (Petrovic et al.)](https://greg4cr.github.io/pdf/23mutationci.pdf)** — paper sobre integración en pipelines.
- **[Mutation Testing in the Wild (Empirical Software Engineering)](https://link.springer.com/article/10.1007/s10664-022-10177-8)** — estudio empírico.

---

## 10. Karma: deprecación y migración

- ★ **[Karma · Repositorio GitHub (aviso de deprecación)](https://github.com/karma-runner/karma)** — oficialmente deprecado desde **27 abril 2023**.
- **[Announcing Angular v21](https://blog.angular.dev/announcing-angular-v21-57946c34f14b)** — Vitest por defecto; Karma eliminado del CLI.
- **[Angular · Migrating to Vitest](https://angular.dev/guide/testing/migrating-to-vitest)** — schematic oficial.

### Benchmarks comparativos

- **[EvHaus/test-runner-benchmarks](https://github.com/EvHaus/test-runner-benchmarks)** — Jest/Vitest/uvu/AVA con metodología transparente.
- **[Jared Wilcurt — Vitest vs Jest en SPA real de 5 años](https://dev.to/thejaredwilcurt/vitest-vs-jest-benchmarks-on-a-5-year-old-real-work-spa-4mf1)** — startup, execution, watch.
- **[SitePoint — Vitest vs Jest 2026](https://www.sitepoint.com/vitest-vs-jest-2026-migration-benchmark/)** — datos recientes.

---

## 11. AnalogJS y stack Vite para Angular

- **[AnalogJS · Vitest Angular Setup](https://analogjs.org/docs/features/testing/vitest)** — Vitest para Angular 17–20 vía AnalogJS.
- **[AnalogJS · Home](https://analogjs.org/)** — meta-framework sobre Vite para Angular.
- **[analogjs/vitest-angular · GitHub](https://github.com/analogjs/analog/tree/main/packages/vitest-angular)** — plugin Vite/Angular.

> Para Angular 21+ el flujo oficial es el schematic de Angular CLI. AnalogJS sigue siendo la opción estándar para Angular 17–20.

---

## 12. happy-dom vs jsdom

- **[happy-dom · GitHub](https://github.com/capricorn86/happy-dom)** — implementación ligera, 2-5× más rápida que jsdom para la mayoría de tests.
- **[jsdom · GitHub](https://github.com/jsdom/jsdom)** — implementación más completa (CSS layout, Range, algunas APIs exóticas).
- **[Vitest · Test Environment](https://vitest.dev/guide/environment.html)** — cómo elegir entorno por archivo/proyecto.

> Recomendación del curso: **happy-dom por defecto**. Cambiar a jsdom solo si un test concreto lo necesita (usar `// @vitest-environment jsdom` en la cabecera del archivo).

---

## 13. Accesibilidad

### Estándares y reglas

- ★ **[WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)** — criterios oficiales, checkeable.
- **[axe-core · Rules](https://dequeuniversity.com/rules/axe/)** — lista completa de reglas de axe con explicación y fix.
- **[axe-core · GitHub](https://github.com/dequelabs/axe-core)** — motor de accesibilidad.

### Integración con tests

- **[`jest-axe` (compatible con Vitest)](https://github.com/nickcolley/jest-axe)** — expose `toHaveNoViolations()`.
- **[`vitest-axe` (npm)](https://www.npmjs.com/package/vitest-axe)** — wrapper nativo Vitest.
- **[Vitest · `toMatchAriaSnapshot`](https://vitest.dev/api/expect#tomatchariasnapshot)** — snapshots de árbol de accesibilidad.

---

## 14. Herramientas complementarias

### E2E

- **[Playwright](https://playwright.dev/)** — E2E de Microsoft, multi-browser, auto-wait, trace viewer.
- **[Cypress](https://www.cypress.io/)** — E2E con time-travel debugging.

### Desarrollo de componentes

- **[Storybook](https://storybook.js.org/)** — componentes aislados.
- **[Storybook · Testing](https://storybook.js.org/docs/writing-tests)** — interaction, a11y, visual.

### Visual regression

- **[Chromatic](https://www.chromatic.com/)** — visual diff para Storybook.
- **[Percy (BrowserStack)](https://percy.io/)** — alternativa multi-framework.

### Coverage tracking

- **[Codecov](https://codecov.io/)** — reportes y comentarios en PRs.
- **[Coveralls](https://coveralls.io/)** — alternativa simple.

### Linting

- **[eslint-plugin-testing-library](https://github.com/testing-library/eslint-plugin-testing-library)** — reglas específicas.
- **[eslint-plugin-vitest](https://github.com/vitest-dev/eslint-plugin-vitest)** — detecta tests sin aserciones, describes vacíos, mal uso de hooks.

---

## 15. Comunidad y aprendizaje continuo

### Comunidades

- **[Testing Library · Discord](https://discord.gg/testing-library)** — los mantenedores participan.
- **[Vitest · GitHub Discussions](https://github.com/vitest-dev/vitest/discussions)** — RFCs y dudas.
- **[Stryker · Slack](https://join.slack.com/t/stryker-mutator/shared_invite/enQtOTUyMTYyNTg1NDQ0LTU4ODNmZDlmN2I3MmEyMTVhYjZlYmJkOThlNTY3NTM1M2QxYmM5YTM3ODQxYmJjY2YyYzllM2RkMmM1NjNjZjM)** — soporte directo.

### Blogs recomendados

- **[Kent C. Dodds · Blog (tag testing)](https://kentcdodds.com/blog?q=testing)** — filosofía y patrones; referencia obligada para React.
- **[Tim Deschryver · Blog](https://timdeschryver.dev/blog)** — Angular/NgRx testing de referencia.
- **[Angular Blog](https://blog.angular.dev/)** — releases oficiales.
- **[React · Blog](https://react.dev/blog)** — releases y RFCs del equipo de React.
- **[Vitest · Blog](https://vitest.dev/blog/)** — releases y migrations.
- **[DEV · Tag Testing](https://dev.to/t/testing)** — filtrar por `vitest`, `angular`, `vue`, `react`.

### Video

- **[YouTube · Vitest](https://www.youtube.com/results?search_query=vitest)** — ViteConf, VueConf.
- **[YouTube · Testing Library](https://www.youtube.com/results?search_query=testing+library)** — conferencias y tutoriales.

### Listas curadas

- **[Awesome Testing](https://github.com/TheJambo/awesome-testing)** — lista curada.

---

## Fuentes en español

Material en castellano para la audiencia hispanohablante. Complementan (no reemplazan) las fuentes oficiales en inglés.

- **[MDN Web Docs · Testing (ES)](https://developer.mozilla.org/es/docs/Learn_web_development/Extensions/Testing)** — fundamentos generales de testing web.
- **[Angular · Guía de Testing (ES)](https://v17.angular.io/guide/testing)** — docs de Angular en español, versión 17 (la v20+ está solo en inglés en `angular.dev`).
- **[Alberto TD — Angular + Testing Library + Jest (ES)](https://dev.to/albertotdev/angular-testing-library-jest-14o2)** — artículo en castellano sobre setup de Angular Testing Library con Jest.
- **[Jorge Baumann — Testing en Vue (ES, charlas)](https://www.youtube.com/@baumannzone)** — charlas técnicas en español.
- **[midu.dev — Miguel Ángel Durán (ES)](https://midu.dev/)** — blog y charlas con mucho contenido React; toca testing en varios vídeos.
- **[ManzDev — lenguajejs.com (ES)](https://lenguajejs.com/)** — referencia en español para JS/TS y React; explicaciones detalladas de hooks y patrones.
- **[Fazt — YouTube (ES)](https://www.youtube.com/@FaztCode)** — tutoriales en español de React y stack JS; útil para audiencia LatAm.
- **[Adictos al Trabajo · Testing JavaScript (ES)](https://www.adictosaltrabajo.com/)** — tutoriales en español (buscar "testing", "Jest", "Vitest", "React").

> **Nota:** la mayoría de documentación canónica (Vitest, Stryker, Testing Library) está solo en inglés. Las fuentes en español son útiles como apoyo, pero para detalles precisos siempre ir a la fuente oficial.

---

## Meta · Cómo aprenden los developers

Fuentes académicas y de diseño pedagógico que fundamentan la estructura de esta guía. Útiles si vas a **escribir material técnico** para tu equipo, no para escribir tests.

### Estructura de documentación

- ★ **[Diátaxis · Framework de documentación técnica](https://diataxis.fr/)** — Daniele Procida. Separa tutorial / how-to / reference / explanation. Base de la organización de esta guía.
- **[Google Developer Style Guide](https://developers.google.com/style)** — voz activa, segunda persona, títulos con verbos.
- **[Write the Docs · Guide](https://www.writethedocs.org/guide/)** — comunidad y best practices.

### Teoría del aprendizaje (adultos)

- **Malcolm Knowles — [*The Adult Learner* (andragogy)](https://www.sciencedirect.com/book/9780128117583)** — seis principios del aprendizaje adulto: necesidad de saber el porqué, autonomía, experiencia previa, orientación a problemas, motivación interna, just-in-time.
- **John Sweller — [Cognitive Load Theory (review)](https://link.springer.com/article/10.1007/s10648-019-09465-5)** — carga intrínseca, extraña y germana. Minimizar la extraña, maximizar la germana.
- **Richard Mayer — [*Multimedia Learning*](https://www.cambridge.org/core/books/multimedia-learning/7A62F072A71289E1E262980CB026A3F9)** — principios de diseño de material multimedia (contigüidad, señalización, modalidad).
- **Renkl & Atkinson — [Worked Examples and Fading](https://doi.org/10.1207/S15326985EP3801_2)** — scaffold con ejemplos completos que van desapareciendo (backward fading).

### Práctica aplicada al código

- **[Kent C. Dodds · Blog](https://kentcdodds.com/blog)** — buena referencia de técnico que enseña bien. Estilo directo, ejemplos reales, "why before what".

> Si sólo puedes leer una cosa de esta sección, lee **Diátaxis** (15 min). Te cambia la forma de organizar cualquier documentación técnica.

---

## Índice cruzado por archivo de la guía

Qué fuentes de este archivo amplían cada tema específico de los otros 14 archivos.

| Archivo | Fuentes clave en este documento |
|---|---|
| `01-por-que-testear.md` | §1 (Trophy, Guiding Principles, Yoni Goldberg) |
| `02-anatomia-de-un-test.md` | §1 (Yoni Goldberg), §2 (Vitest Test API) |
| `03-jest-y-vitest.md` | §2 (Vitest), §3 (Jest), §10 (benchmarks) |
| `04-primer-componente.md` | §4 (Testing Library intro), §5/§6/§6b (wrappers) |
| `05-queries-testing-library.md` | §4 (Queries, Priority, ByRole, Testing Playground) |
| `06-eventos-de-usuario.md` | §4 (user-event v14, keyboard, pointer) |
| `07-mocking-basico.md` | §2 (Vi API, Mock API), §8 (patrones) |
| `08-snapshots-y-accesibilidad.md` | §2 (Snapshot, toMatchAriaSnapshot), §13 (a11y) |
| `09-buenas-practicas.md` | §1 (toda la sección), §15 (blogs) |
| `10-migracion-karma-vitest.md` | §5 (Angular migration), §10 (Karma deprecación), §11 (AnalogJS) |
| `11-sintaxis-jasmine-vitest.md` | §2 (Vitest API), §5 (Rajat migration guide) |
| `12-mocking-avanzado.md` | §8 (mocking + MSW), §5 (NgRx), §6 (Pinia, Router), §6b (Redux Toolkit, Zustand, TanStack Query) |
| `13-dominio-asincronia.md` | §5 (fakeAsync, tick, ComponentFixture), §6 (nextTick, Suspense), §6b (`renderHook`, TanStack Query), §7 (RxJS + marbles) |
| `14-mutation-testing-stryker.md` | §9 (todo), §1 (coverage vs mutation) |
| `16-ejercicios.md` | §11 (AnalogJS), §9 (Stryker playground) |

---

## Mantenimiento de este archivo

- **Última revisión:** 2026-04-19.
- **Próxima revisión sugerida:** al release de Vitest 5, Stryker 10 o Angular 22 (lo que ocurra antes).
- **Si encuentras un enlace roto:** abre issue con el ancla de la sección + URL rota + URL correcta si la conoces.
- **Criterio de inclusión:** fuentes oficiales siempre; blogs solo si (a) el autor es reconocido en el ecosistema, (b) la fecha es ≤ 24 meses, o (c) cubre un caso que las oficiales no cubren.
