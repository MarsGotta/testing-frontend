# Migración de Karma/Jasmine a Vitest

> **Modalidad:** how-to (resolver un problema concreto: migrar Karma/Jasmine → Vitest) con algo de explanation al inicio (por qué migrar). Las equivalencias exhaustivas están en [`11-sintaxis-jasmine-vitest.md`](./11-sintaxis-jasmine-vitest.md). La parte profunda de asincronía está en [`13-dominio-asincronia.md`](./13-dominio-asincronia.md).
>
> **Stack de referencia:** el punto de partida de este archivo es **Angular + Karma + Jasmine**. Objetivo: Angular 17–21 sobre Vitest 4.0.x (oct 2025), con Vue 3.x como apoyo, Stryker 9.x, happy-dom 14.x / jsdom 25.x, Node.js >= 20. Validado 2026-04.

> **Nota para lectores de React y Vue.** Este archivo es específico de Angular. Karma fue el runner tradicional del ecosistema Angular; React y Vue no lo usaron. Si vienes de React o Vue, tu migración parte casi siempre de **Jest** (o de Jasmine + Karma en proyectos Vue muy antiguos), y esa ruta la tienes en [`03-jest-y-vitest.md`](./03-jest-y-vitest.md) con la comparativa Jest 30 vs Vitest 4 y en [`11-sintaxis-jasmine-vitest.md`](./11-sintaxis-jasmine-vitest.md) para las equivalencias de matchers. Los principios de fondo (setup de Vitest, elección de entorno DOM con happy-dom o jsdom, configuración de plugins de Vite, aliases) son transferibles: lo único que cambia es el punto de partida. Los equipos React que ya usan Vitest pueden saltar este archivo entero.

## 1. Historia y contexto

### 1.1 La evolución del testing en Angular

El testing en Angular ha pasado por cuatro eras bien diferenciadas.

**Era 1: Karma + Jasmine (2012-2022).** Karma nació en 2012 como Testacular, creado por Vojta Jina en Google para AngularJS. La idea era lanzar un navegador real (Chrome, Firefox, IE), inyectar los tests y ejecutarlos contra el DOM auténtico. Jasmine es un framework BDD (Behavior-Driven Development) que Pivotal Labs publicó en 2010.

La combinación se consolidó como estándar durante más de una década. Cuando llegó Angular 2 en 2016, `ng new` generaba la configuración de Karma + Jasmine por defecto y cada componente traía su `.spec.ts` listo para `ng test`.

El problema llegó con el tamaño de las suites. Karma necesita levantar un navegador completo y eso introduce bastante overhead. En proyectos con miles de tests, el arranque tarda 30 segundos o más antes de ejecutar un solo test. Karma tampoco entiende módulos ES nativos (ESM); necesita transpilación previa a través de Webpack.

**Era 2: Jest como alternativa experimental (2018-2022).** Jest, creado por Facebook para React, ganó popularidad por su velocidad, su sistema de mocks integrado y su experiencia de desarrollo (snapshots, watch mode inteligente). Algunos equipos Angular lo adoptaron vía `jest-preset-angular`, pero nunca tuvo soporte oficial del equipo de Angular. En React y en Vue con Vue CLI, en cambio, Jest fue el runner por defecto durante años: por eso la migración Jest → Vitest —cubierta en [`03-jest-y-vitest.md`](./03-jest-y-vitest.md)— es el camino habitual en esos dos ecosistemas, no el de Karma.

Los problemas de Jest en Angular eran conocidos:
- Configuración manual extensa.
- Sin ESM estable (el flag `--experimental-vm-modules` sigue siendo experimental).
- Transpilación lenta con `ts-jest` o `@swc/jest`.
- Integración frágil con Zone.js.

**Era 3: Web Test Runner (2023).** Angular 16 introdujo soporte experimental para Web Test Runner. WTR ejecuta tests en un navegador real pero con arquitectura moderna. Su adopción fue limitada por varios motivos: solo estaba disponible como developer preview, requería configuración adicional, el ecosistema de plugins era reducido y el equipo de Angular ya estaba evaluando Vitest internamente.

**Era 4: Vitest (2024-presente).** Vitest nació dentro del equipo de Vite, impulsado por Anthony Fu, y se consolidó rápidamente como el runner más usado del ecosistema JavaScript. Angular 17 adoptó Vite/esbuild como build system y desde ahí la integración con Vitest fue directa. Angular 19 introdujo soporte experimental y, en Angular 21, Vitest quedó como runner por defecto para proyectos nuevos, según anunció el equipo de Angular en [el blog oficial](https://blog.angular.dev/announcing-angular-v21-57946c34f14b).

```
2012        2016        2018        2022        2023        2024        2025
  │           │           │           │           │           │           │
  ▼           ▼           ▼           ▼           ▼           ▼           ▼
Karma       Angular 2   Jest        Karma      Angular 16  Angular 19  Angular 21
nace        adopta      gana        deprecado  WTR         Vitest      Vitest
(Testacular) Karma      tracción    (Abril)    experimental experimental oficial
              +Jasmine   en Angular                          support    por defecto
```

### 1.2 Contexto en Vue

Vue siguió un camino más directo. Vue 2 no tenía runner oficial; la comunidad usaba Jest o Mocha+Chai. Con Vue 3 y Vite como build system por defecto en `create-vue`, Vitest quedó como la opción natural. Hoy `npm create vue@latest` configura Vitest sin tocar nada.

### 1.3 Contexto en React

React nunca tuvo un vínculo fuerte con Karma. Create React App usaba Jest. Cuando Vite ganó tracción como alternativa a CRA (vía plantillas tipo Vite + React), Vitest se adoptó por inercia. Frameworks como Remix y Astro también lo recomiendan.

---

## 2. Por qué migrar

### 2.1 Karma está deprecado

Karma quedó oficialmente deprecado el 27 de abril de 2023. El aviso en el repositorio [karma-runner/karma](https://github.com/karma-runner/karma) dice:

> "El espacio de testing web ha evolucionado significativamente en los más de 10 años desde la creación de Karma... nuevos test runners ofrecen alternativas más eficientes, y Karma ya no aporta un valor único claro."

- Última release: v6.4.4 (julio 2024).
- Solo se parchean vulnerabilidades de seguridad críticas.
- No se aceptan nuevas funcionalidades ni correcciones de bugs.

En la práctica, tu suite de tests depende de una herramienta que ya no va a mejorar. Karma no se adaptará a las nuevas APIs de Angular, ni a los navegadores más recientes, ni a los estándares web que vengan.

### 2.2 Comparativa de rendimiento

El equipo de SitePoint publicó en febrero de 2026 un benchmark sobre un monorepo real de 12 paquetes y cerca de 50 000 tests. Las cifras de Jest y Vitest que aparecen abajo vienen de ahí. Karma no entró en ese estudio, pero su arranque arrastra el coste añadido de levantar un navegador, así que en la práctica parte por detrás de Jest.

| Métrica | Karma | Jest | Vitest |
|---------|-------|------|--------|
| Arranque en frío (50k tests) | N/A | ~214 s | ~38 s |
| Re-ejecución en watch mode | Suite completa | ~8,4 s | ~0,3 s |
| Uso de memoria | Alto (navegador) | Base | ~30 % menos que Jest |
| Overhead de arranque | 30+ segundos | Segundos | <100 ms |
| Soporte ESM nativo | No | Experimental | Sí |
| Resolución de módulos | Webpack | Custom (haste) | Vite (ESM) |
| Mocking de módulos | No nativo | Sí | Sí (mejorado) |

> Vitest completa el arranque en frío aproximadamente 5,6 veces más rápido que Jest (38 s frente a 214 s) y re-ejecuta en watch mode unas 28 veces más rápido (0,3 s frente a 8,4 s) sobre ese mismo monorepo.
>
> > **Fuente:** SitePoint, *Vitest vs Jest 2026: Performance Benchmarks and Migration Guide* (feb. 2026). <https://www.sitepoint.com/vitest-vs-jest-2026-migration-benchmark/>

La diferencia se nota aún más en watch mode. Karma re-ejecuta toda la suite, o pide configuración compleja para tests individuales. Vitest mira qué archivos han cambiado, reconstruye el grafo de dependencias y solo re-corre los tests afectados, normalmente en unos 300 ms.

### 2.3 Ventajas clave de Vitest

- **ESM nativo**: sin transpilación ni flags experimentales. Los imports se resuelven igual que en tu app.
- **Integración con Vite**: comparte config, plugins y resolución de módulos. Si tu app usa un alias `@/` en Vite, los tests también.
- **API compatible con Jest**: `describe`, `it`, `expect`, `vi.fn()`. La migración desde Jest es casi trivial.
- **Features incluidos**: coverage (v8 o istanbul), UI visual en navegador, type testing, sharding para CI y benchmarking.
- **Watch mode inteligente**: solo re-ejecuta tests afectados por el cambio, como si fuera HMR para tests.
- **Mocking de módulos**: `vi.mock()` mockea cualquier módulo ES con hoisting automático.
- **Snapshot testing**: soporte integrado para snapshots inline y en archivo.
- **Multi-threading**: ejecuta archivos de test en workers paralelos con Tinypool.
- **Browser mode**: para tests que piden un navegador real, `@vitest/browser` con Playwright.

### 2.4 Alineación con el ecosistema

- **Angular 17+**: Build system basado en Vite/esbuild
- **Angular 21**: Vitest es el runner por defecto para `ng new`
- **Vue 3**: Vite es el builder por defecto desde `create-vue`
- **React (Vite)**: Vitest es la elección natural para proyectos con Vite
- **Nuxt 3**: Vitest integrado vía `@nuxt/test-utils`
- **SvelteKit**: Vitest como runner por defecto
- **Astro**: Vitest recomendado

---

## 3. Migración en Angular

### 3.1 Caminos posibles según versión

| Versión Angular | Camino recomendado | Estado |
|-----------------|-------------------|--------|
| Angular 21+ | `@angular/build:unit-test` (builder oficial) + schematic `ng g @angular/core:karma-to-vitest` | Vitest por defecto en `ng new`. Retirada total de Karma prevista en Angular 22 |
| Angular 20 | `@angular/build:unit-test` (builder experimental) — funciona, pero la documentación lo marca como no estable | Karma deprecated en el CLI |
| Angular 17–19 | AnalogJS: `@analogjs/vitest-angular` + `@analogjs/vite-plugin-angular` | Camino no oficial, pero probado en producción |
| Angular < 17 | Actualiza Angular primero, luego migra tests | — |

> **Contexto histórico útil:** Karma quedó oficialmente deprecado el 27 de abril de 2023. Angular 16 estrenó un builder experimental de Jest; Angular 19 un preview de Vitest; Angular 20 el builder de Vitest experimental con Karma ya deprecated en el CLI; Angular 21 convierte a Vitest en el default.

### 3.2 Camino A: Angular 21+ (oficial)

#### Paso 1: instalar dependencias

```bash
npm install --save-dev vitest jsdom
# o con happy-dom (más ligero, auto-detectado por CLI):
npm install --save-dev vitest happy-dom
```

#### Paso 2: actualizar angular.json

**Antes (Karma):**
```json
"test": {
  "builder": "@angular-devkit/build-angular:karma",
  "options": {
    "karmaConfig": "karma.conf.js",
    "polyfills": ["zone.js", "zone.js/testing"],
    "tsConfig": "tsconfig.spec.json"
  }
}
```

**Después (Vitest):**
```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "tsConfig": "tsconfig.spec.json"
  }
}
```

#### Paso 3: actualizar tsconfig.spec.json

```diff
- "types": ["jasmine"]
+ "types": ["vitest/globals"]
```

#### Paso 4: ejecutar el schematic de refactoring automático

```bash
ng g @schematics/angular:refactor-jasmine-vitest
```

Este es el paso clave de la migración automática. En la sección 3.3 verás qué hace exactamente y dónde se queda corto.

#### Paso 5: limpiar paquetes legacy

```bash
# Eliminar archivos
rm karma.conf.js src/test.ts

# Desinstalar paquetes de Karma
npm uninstall karma karma-chrome-launcher karma-coverage \
  karma-jasmine karma-jasmine-html-reporter jasmine-core @types/jasmine
```

#### Paso 6: ejecutar tests

```bash
ng test
```

#### Paso opcional: config personalizada de Vitest

En `angular.json`:
```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "runnerConfig": "vitest.config.ts"
  }
}
```

---

### 3.3 El schematic de migración automática al detalle

El comando `ng g @schematics/angular:refactor-jasmine-vitest` analiza todos los `.spec.ts` del proyecto y aplica transformaciones AST (Abstract Syntax Tree) automáticas. No es un find-and-replace de texto: parsea el código TypeScript y aplica cambios semánticos.

#### Transformaciones que realiza

**1. Focus y skip de tests:**
```typescript
// ANTES                          // DESPUÉS
fdescribe('mi suite', () => {})   describe.only('mi suite', () => {})
fit('mi test', () => {})          it.only('mi test', () => {})
xdescribe('mi suite', () => {})   describe.skip('mi suite', () => {})
xit('mi test', () => {})          it.skip('mi test', () => {})
```

**2. Spies - spyOn:**
```typescript
// ANTES
spyOn(service, 'getUser');
spyOn(service, 'getUser').and.returnValue(of(user));
spyOn(service, 'getUser').and.callFake(() => of(user));
spyOn(service, 'getUser').and.throwError(new Error('fail'));

// DESPUÉS
vi.spyOn(service, 'getUser');
vi.spyOn(service, 'getUser').mockReturnValue(of(user));
vi.spyOn(service, 'getUser').mockImplementation(() => of(user));
vi.spyOn(service, 'getUser').mockImplementation(() => { throw new Error('fail'); });
```

**3. Spy method chaining (`.and.returnValue`, `.and.callFake`, etc.):**
```typescript
// ANTES
spy.and.returnValue(42);
spy.and.returnValues(1, 2, 3);
spy.and.callFake((x) => x * 2);
spy.and.callThrough();
spy.and.stub();

// DESPUÉS
spy.mockReturnValue(42);
spy.mockReturnValueOnce(1).mockReturnValueOnce(2).mockReturnValueOnce(3);
spy.mockImplementation((x) => x * 2);
// callThrough se elimina (es el comportamiento por defecto de vi.spyOn)
spy.mockImplementation(() => {});
```

**4. Spy call tracking:**
```typescript
// ANTES
spy.calls.count();
spy.calls.argsFor(0);
spy.calls.allArgs();
spy.calls.mostRecent().args;
spy.calls.first().args;
spy.calls.reset();

// DESPUÉS
spy.mock.calls.length;
spy.mock.calls[0];
spy.mock.calls;
spy.mock.lastCall;
spy.mock.calls[0];
spy.mockClear();
```

**5. Creación de spies standalone:**
```typescript
// ANTES
const spy = jasmine.createSpy('mySpy');
const spy = jasmine.createSpy('mySpy').and.returnValue(42);

// DESPUÉS
const spy = vi.fn();
const spy = vi.fn().mockReturnValue(42);
```

**6. Asymmetric matchers (cambio de namespace):**
```typescript
// ANTES
jasmine.objectContaining({ key: 'value' });
jasmine.arrayContaining([1, 2, 3]);
jasmine.any(Number);
jasmine.anything();
jasmine.stringMatching(/pattern/);

// DESPUÉS
expect.objectContaining({ key: 'value' });
expect.arrayContaining([1, 2, 3]);
expect.any(Number);
expect.anything();
expect.stringMatching(/pattern/);
```

**7. Timers (jasmine.clock):**
```typescript
// ANTES
jasmine.clock().install();
jasmine.clock().tick(1000);
jasmine.clock().uninstall();
jasmine.clock().mockDate(new Date('2025-01-01'));

// DESPUÉS
vi.useFakeTimers();
vi.advanceTimersByTime(1000);
vi.useRealTimers();
vi.setSystemTime(new Date('2025-01-01'));
```

**8. Control de tests:**
```typescript
// ANTES
pending('motivo');
fail('mensaje de error');

// DESPUÉS
it.skip('motivo');
expect.unreachable('mensaje de error');
```

**9. Eliminación de imports innecesarios:**
- Elimina `import 'jasmine';` si existe
- Elimina `/// <reference types="jasmine" />` si existe

#### Lo que no convierte automáticamente

El schematic deja fuera algunos patrones que piden refactor estructural:

**1. `jasmine.createSpyObj()`.** Hay que crear el objeto a mano:
```typescript
// ANTES (el schematic NO toca esto)
const service = jasmine.createSpyObj('UserService', ['getUser', 'saveUser']);

// MIGRACIÓN MANUAL
const service = {
  getUser: vi.fn(),
  saveUser: vi.fn(),
};
```

**2. `fakeAsync` / `tick` / `flush`.** Solo en setup zoneless: en ese caso, migrar a timers de Vitest (ver § 5.5 y 7.1):
```typescript
// ANTES (el schematic NO toca esto)
it('debounce', fakeAsync(() => {
  component.search('test');
  tick(300);
  expect(service.search).toHaveBeenCalledWith('test');
}));

// MIGRACIÓN MANUAL
it('debounce', () => {
  vi.useFakeTimers();
  component.search('test');
  vi.advanceTimersByTime(300);
  expect(service.search).toHaveBeenCalledWith('test');
  vi.useRealTimers();
});
```

**3. `waitForAsync()`.** Pasa a async/await:
```typescript
// ANTES (el schematic NO toca esto)
it('carga datos', waitForAsync(() => {
  service.getData().subscribe(data => {
    expect(data).toBeTruthy();
  });
}));

// MIGRACIÓN MANUAL
it('carga datos', async () => {
  const data = await firstValueFrom(service.getData());
  expect(data).toBeTruthy();
});
```

**4. Custom matchers complejos.** Se reescriben con `expect.extend()`.

**5. Spies anidados o con lógica condicional compleja.** Patrones que combinan varios `.and.callFake()` con lógica interna.

**6. Configuración de Jasmine personalizada.** Por ejemplo, si tienes `jasmine.getEnv().addReporter()` o ajustes en `test.ts`.

---

### 3.4 Camino B: Angular 17-19 (AnalogJS)

> Para Angular 20 puedes tirar del builder oficial experimental (mismo esquema que el camino A). El camino AnalogJS solo hace falta en versiones sin builder oficial.

#### Paso 1: instalar dependencias

```bash
npm install --save-dev @analogjs/vite-plugin-angular @analogjs/vitest-angular jsdom vitest
```

#### Paso 2: crear vite.config.ts

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(({ mode }) => ({
  plugins: [angular()],
  test: {
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    reporters: ['default'],
  },
}));
```

#### Paso 3: crear src/test-setup.ts

**Para proyectos zoneless (Angular 21+ o proyectos que no usan Zone.js):**
```typescript
import '@angular/compiler';
import '@analogjs/vitest-angular/setup-snapshots';
import '@analogjs/vitest-angular/setup-serializers';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed();
```

**Para proyectos con Zone.js:**
```typescript
import '@angular/compiler';
import '@analogjs/vitest-angular/setup-zone';
import { setupTestBed } from '@analogjs/vitest-angular/setup-testbed';

setupTestBed({ zoneless: false });
```

#### Paso 4: actualizar angular.json

```json
"test": {
  "builder": "@analogjs/vitest-angular:test"
}
```

#### Paso 5: actualizar tsconfig.spec.json

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "target": "es2022",
    "types": ["vitest/globals", "node"]
  },
  "files": ["src/test-setup.ts"],
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

---

## 4. Migración en Vue

Vue + Vite es el camino más directo, porque Vue 3 ya usa Vite por defecto.

### 4.1 Si vienes de Jest + Vue CLI

Muchos proyectos Vue 2 (o Vue 3 con Vue CLI) usaban Jest vía `@vue/cli-plugin-unit-jest`. La migración tiene tres bloques:

1. Migrar de Vue CLI a Vite (si no lo has hecho ya).
2. Reemplazar Jest por Vitest.
3. Actualizar la sintaxis de mocks.

La API de Vitest es casi idéntica a la de Jest, así que la sintaxis apenas cambia.

### 4.2 Si vienes de Mocha + Chai

Algunos proyectos Vue usaban Mocha + Chai (sobre todo con `@vue/cli-plugin-unit-mocha`). Las diferencias principales son estas:
- `chai.expect(x).to.equal(y)` pasa a `expect(x).toBe(y)` o `expect(x).toEqual(y)`.
- `sinon.stub()` pasa a `vi.fn()` o `vi.spyOn()`.
- `sinon.useFakeTimers()` pasa a `vi.useFakeTimers()`.

### 4.3 Instalar dependencias

```bash
npm install -D vitest @vue/test-utils happy-dom
# Opcionales pero recomendados:
npm install -D @vitest/coverage-v8 @vitest/ui
```

### 4.4 Configurar vite.config.ts

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
});
```

### 4.5 Archivo de setup

```typescript
// src/test/setup.ts
import { config } from '@vue/test-utils';

// Mock global de i18n si se usa
config.global.mocks = {
  $t: (key: string) => key,
};

// Stub de router-link para evitar warnings
config.global.stubs = {
  'router-link': true,
};
```

### 4.6 Actualizar tsconfig.json

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

### 4.7 Scripts en package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### 4.8 Migración de mocks de Jest a Vitest en Vue

La mayoría son renombramientos directos:

```typescript
// JEST                                    // VITEST
jest.fn()                                  vi.fn()
jest.spyOn(obj, 'method')                  vi.spyOn(obj, 'method')
jest.mock('./module')                      vi.mock('./module')
jest.useFakeTimers()                       vi.useFakeTimers()
jest.advanceTimersByTime(1000)             vi.advanceTimersByTime(1000)
jest.clearAllMocks()                       vi.clearAllMocks()
jest.restoreAllMocks()                     vi.restoreAllMocks()
jest.requireActual('./module')             // usar vi.importActual('./module')
```

### 4.9 Ejemplo completo de migración de un test en Vue

**Antes (Jest):**
```typescript
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import UserProfile from '@/components/UserProfile.vue';

jest.mock('@/api/users', () => ({
  fetchUser: jest.fn().mockResolvedValue({ name: 'John' })
}));

describe('UserProfile', () => {
  it('renders user name', async () => {
    const wrapper = mount(UserProfile, {
      global: {
        plugins: [createTestingPinia()]
      },
      props: { userId: '123' }
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('John');
  });
});
```

**Después (Vitest):**
```typescript
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import UserProfile from '@/components/UserProfile.vue';

vi.mock('@/api/users', () => ({
  fetchUser: vi.fn().mockResolvedValue({ name: 'John' })
}));

describe('UserProfile', () => {
  it('renders user name', async () => {
    const wrapper = mount(UserProfile, {
      global: {
        plugins: [createTestingPinia({ createSpy: vi.fn })]
      },
      props: { userId: '123' }
    });

    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('John');
  });
});
```

Nota: con `@pinia/testing` tienes que pasar `createSpy: vi.fn` para que Pinia use Vitest al crear spies y no intente tirar de Jest.

---

## 5. Errores comunes durante la migración

### 5.1 "Cannot find name 'vi'"

**Síntoma:** TypeScript marca errores en todos los archivos de test donde usas `vi.fn()`, `vi.spyOn()`, etc.

**Causa:** el `tsconfig.spec.json` no incluye los tipos de Vitest.

**Solución:**
```json
// tsconfig.spec.json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

Asegúrate también de que no queda un `"types": ["jasmine"]` en ningún tsconfig que afecte a los tests. Si tienes los dos, TypeScript se lía con los tipos duplicados de `describe`, `it` y `expect`.

Si usas un `vitest.config.ts` separado en lugar de `vite.config.ts`, comprueba que tenga `globals: true`:
```typescript
export default defineConfig({
  test: {
    globals: true  // esto habilita describe, it, expect, vi como globales
  }
});
```

### 5.2 Error "ProxyZone" o "Expected to be running in ProxyZone"

**Síntoma:**
```
Error: Expected to be running in 'ProxyZone', but it was not found.
```

**Causa:** estás importando `describe`, `it` o `expect` directamente de `vitest` en un proyecto que todavía usa Zone.js. Zone.js parchea esas funciones globalmente; cuando las importas de `vitest`, los patches se pisan.

**Solución:** no importes `describe`, `it` ni `expect` de `vitest`. Usa las versiones globales (las que proporciona Zone.js o Vitest con `globals: true`):

```typescript
// MAL - causa conflicto con Zone.js
import { describe, it, expect, vi } from 'vitest';

// BIEN - usar globales
// No importar describe/it/expect
// Solo importar vi si no está como global:
import { vi } from 'vitest';

// MEJOR - configurar globals: true y no importar nada
// vi, describe, it, expect estarán disponibles globalmente
```

Si necesitas `vi` pero quieres evitar conflictos, importa solo `vi`:
```typescript
import { vi } from 'vitest';
// describe, it, expect vienen de los globales
```

### 5.3 Tests se cuelgan (nunca terminan)

**Síntoma:** los tests arrancan pero no acaban. Vitest dispara el timeout a los 5 segundos por defecto.

**Causa más común:** `HttpTestingController` con requests sin verificar ni flushear.

**Solución:** llama a `httpCtrl.verify()` en `afterEach`:

```typescript
describe('UserService', () => {
  let httpCtrl: HttpTestingController;
  let service: UserService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ]
    });
    service = TestBed.inject(UserService);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    // CRÍTICO: verificar que no hay requests pendientes
    httpCtrl.verify();
  });

  it('obtiene usuario', () => {
    service.getUser(1).subscribe(user => {
      expect(user.name).toBe('John');
    });

    const req = httpCtrl.expectOne('/api/users/1');
    req.flush({ name: 'John' });
  });
});
```

**Otra causa:** Observables que nunca se completan. Si un Observable emite pero no completa (por ejemplo, un `BehaviorSubject`), `firstValueFrom()` y `lastValueFrom()` se quedan colgados. Para streams infinitos, usa `firstValueFrom()` o combínalo con `take(1)`:

```typescript
// CUELGA si el observable nunca completa
const data = await lastValueFrom(service.data$);

// CORRECTO
const data = await firstValueFrom(service.data$);
```

### 5.4 "No provider for HttpClient!" o "NullInjectorError"

**Síntoma:**
```
NullInjectorError: R3InjectorError(DynamicTestModule)[UserService -> HttpClient -> HttpClient]:
  NullInjectorError: No provider for HttpClient!
```

**Causa:** el orden de los providers importa. `provideHttpClientTesting()` va DESPUÉS de `provideHttpClient()`, porque sobrescribe el backend HTTP.

**Solución:**
```typescript
// MAL - el orden está invertido
TestBed.configureTestingModule({
  providers: [
    provideHttpClientTesting(),  // error: no hay HttpClient para sobrescribir
    provideHttpClient(),
  ]
});

// BIEN - primero registrar HttpClient, luego sobrescribirlo
TestBed.configureTestingModule({
  providers: [
    provideHttpClient(),          // PRIMERO: registra HttpClient
    provideHttpClientTesting(),   // DESPUÉS: sobrescribe el backend
  ]
});
```

Nota: la API antigua con `HttpClientTestingModule` ya importaba los dos providers en el orden correcto. Con la API standalone, el orden lo pones tú.

### 5.5 fakeAsync: dos escenarios (no es todo-o-nada)

> Error de concepto muy común. El detalle completo está en [`13-dominio-asincronia.md § 4`](./13-dominio-asincronia.md); aquí, el resumen operativo.

**Escenario A — setup con Zone.js testing cargado.** Es el caso de AnalogJS con `setupTestBed({ zoneless: false })` y del builder oficial de Angular cuando mantienes `zone.js/testing` en el setup. Aquí `fakeAsync`, `tick`, `flush` y `waitForAsync` siguen funcionando tal cual; vienen de `@angular/core/testing`, no de Jasmine. No hay que migrar nada.

**Escenario B — setup zoneless.** Angular 21+ usa zoneless por defecto y AnalogJS lo fuerza con `setupTestBed()` (sin `zoneless: false`). En este caso `fakeAsync`, `tick` y `flush` no funcionan y hay que moverlos a los fake timers nativos de Vitest.

**Cómo saber en cuál estás:** mira `src/test-setup.ts`. Si importa `zone.js/testing` (o `@analogjs/vitest-angular/setup-zone`), estás en A; si no, en B.

**Síntomas del escenario B:** `"fakeAsync is not a function"`, `"Unknown zone"`, o el test se queda colgado en `tick(...)`.

**Migración (solo hace falta en el escenario B):**

```typescript
// ANTES (Zone.js testing cargado)
import { fakeAsync, tick, flush } from '@angular/core/testing';

it('debounce search', fakeAsync(() => {
  component.searchControl.setValue('angular');
  tick(300);
  flush();
  expect(mockSearchService.search).toHaveBeenCalledWith('angular');
}));

// DESPUÉS (zoneless)
it('debounce search', () => {
  vi.useFakeTimers();
  component.searchControl.setValue('angular');
  vi.advanceTimersByTime(300);  // equivalente a tick(300)
  vi.runAllTimers();            // equivalente a flush()
  expect(mockSearchService.search).toHaveBeenCalledWith('angular');
  vi.useRealTimers();           // CRUCIAL: restaurar
});
```

Si tienes muchos tests con timers, centraliza el setup en `beforeEach`/`afterEach`:

```typescript
describe('ComponentWithTimers', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // tests usan vi.advanceTimersByTime() sin setup individual
});
```

> **Gotcha:** `advanceTimersByTime` (síncrono) no drena las microtasks que se crean dentro del callback. Si hay un `fetch().then()` dentro del `setTimeout`, tira de `advanceTimersByTimeAsync` con `await`.

### 5.6 Diferencias en el formato de snapshots

**Síntoma:** si migras tests con snapshots de Jest o Jasmine (`toMatchSnapshot()`), los archivos existentes pueden no cuadrar.

**Causa:** Vitest serializa los objetos de forma ligeramente distinta a Jest. Además, con Angular + AnalogJS, los serializers de componentes también cambian.

**Solución:**

1. **Elimina los snapshots viejos** y regenéralos:
```bash
# Eliminar todos los snapshots existentes
find src -name "*.snap" -delete

# Regenerar ejecutando los tests
npx vitest run --update
```

2. **Configura los serializers** de Angular si usas AnalogJS:
```typescript
// test-setup.ts
import '@analogjs/vitest-angular/setup-snapshots';
import '@analogjs/vitest-angular/setup-serializers';
```

3. **Tira de snapshots inline** cuando puedas. Son más fáciles de mantener y no dependen de archivos externos:
```typescript
// En lugar de:
expect(component).toMatchSnapshot();

// Usar:
expect(component.title).toMatchInlineSnapshot('"Mi Título"');
```

### 5.7 "Cannot find module" o errores de resolución de paths

**Síntoma:** imports que funcionaban en Karma/Webpack ahora no resuelven en Vitest.

**Causa:** Vitest usa la resolución de Vite (ESM-first), no la de Webpack. Los path aliases de `webpack.config.js` o `angular.json` no están disponibles sin más.

**Solución:** configura los aliases en `vite.config.ts` o `vitest.config.ts`:
```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@env': path.resolve(__dirname, './src/environments'),
    }
  }
});
```

En Angular 21+ con el builder oficial, los aliases de `tsconfig.json` (paths) se resuelven solos.

---

## 6. Estrategia de migración gradual

No hace falta migrar todos los tests de golpe. Una estrategia por fases reduce el riesgo y da aire al equipo para adaptarse.

### 6.1 Fase 1: instalación y coexistencia (1-2 días)

**Objetivo:** Vitest instalado y funcionando junto a Karma. Los tests nuevos se escriben en Vitest; los existentes siguen en Karma.

**Pasos:**
1. Instala Vitest y las dependencias necesarias.
2. Crea la configuración de Vitest (`vitest.config.ts` o dentro de `angular.json`).
3. Crea el archivo de setup (`test-setup.ts`).
4. Usa un patrón de archivos distinto para Vitest (por ejemplo, `*.vtest.ts` o una carpeta separada).
5. Añade scripts separados en `package.json`:

```json
{
  "scripts": {
    "test:karma": "ng test --runner=karma",
    "test:vitest": "npx vitest run",
    "test:all": "npm run test:karma && npm run test:vitest"
  }
}
```

6. El CI ejecuta los dos runners.

**Criterio de avance:** Vitest arranca y puedes escribir un test simple que pase.

### 6.2 Fase 2: migrar tests simples (1-2 semanas)

**Objetivo:** migrar los tests que no usan `fakeAsync`, `createSpyObj` ni patrones async complejos.

**Qué migrar primero:**
- Tests de servicios puros (sin dependencias Angular complejas).
- Tests de pipes.
- Tests de utilidades y funciones helper.
- Tests de componentes simples (sin timers ni HTTP).
- Tests de guards y resolvers simples.

**Cómo identificar los tests simples:**
```bash
# Tests que NO usan fakeAsync (candidatos a migración fácil)
grep -rL "fakeAsync\|createSpyObj\|jasmine.clock\|waitForAsync" src/**/*.spec.ts

# Tests que SÍ usan fakeAsync (migrar después)
grep -rl "fakeAsync\|createSpyObj\|jasmine.clock\|waitForAsync" src/**/*.spec.ts
```

**Proceso por archivo:**
1. Ejecuta el schematic automático (Angular 21+) o haz los cambios a mano.
2. Mueve el archivo al patrón de Vitest.
3. Ejecuta el test y confirma que pasa.
4. Commit.

### 6.3 Fase 3: migrar tests complejos (2-4 semanas)

**Objetivo:** migrar los tests con `fakeAsync`, `createSpyObj`, timers, HTTP complejo y async avanzado.

**Qué migrar:**
- Tests con `fakeAsync` / `tick` / `flush` → `vi.useFakeTimers()` + `vi.advanceTimersByTime()`.
- Tests con `jasmine.createSpyObj()` → objetos literales con `vi.fn()`.
- Tests con `jasmine.clock()` → `vi.useFakeTimers()` + `vi.setSystemTime()`.
- Tests con `waitForAsync()` → `async/await`.
- Tests con callback `done()` → `async/await`.
- Tests con Observables complejos (marble testing).

**Estrategia para `createSpyObj`:**
```typescript
import type { Mocked } from 'vitest';

// Si tienes MUCHOS createSpyObj, crea una utilidad helper:
function createMockService<T>(methods: (keyof T)[]): Mocked<T> {
  const mock = {} as Mocked<T>;
  methods.forEach(method => {
    (mock as any)[method] = vi.fn();
  });
  return mock;
}

// Uso:
const service = createMockService<UserService>(['getUser', 'saveUser', 'deleteUser']);
```

### 6.4 Fase 4: eliminar Karma (1 día)

**Objetivo:** quitar Karma y sus dependencias del proyecto.

**Pasos:**
1. Verifica que TODOS los tests pasan en Vitest.
2. Elimina los archivos de configuración:
   ```bash
   rm karma.conf.js
   rm src/test.ts
   ```
3. Desinstala los paquetes:
   ```bash
   npm uninstall karma karma-chrome-launcher karma-coverage \
     karma-jasmine karma-jasmine-html-reporter jasmine-core @types/jasmine
   ```
4. Deja `angular.json` apuntando solo al builder de Vitest.
5. Actualiza los scripts de `package.json`.
6. Ajusta el pipeline de CI/CD.
7. Actualiza la documentación del proyecto.
8. Celebra.

### 6.5 Métricas de progreso

Para seguir la migración, un script corto basta:

```bash
#!/bin/bash
TOTAL=$(find src -name "*.spec.ts" | wc -l)
KARMA=$(grep -rl "jasmine\|createSpy\b" src/**/*.spec.ts 2>/dev/null | wc -l)
VITEST=$((TOTAL - KARMA))
echo "Total: $TOTAL | Migrados: $VITEST | Pendientes: $KARMA"
echo "Progreso: $(( VITEST * 100 / TOTAL ))%"
```

---

## 7. Desafíos comunes de la migración

### 7.1 Zone.js (el mayor reto en Angular)

El matiz que la mayoría se salta: `fakeAsync`, `tick`, `flush` y `waitForAsync` vienen de `@angular/core/testing` y solo dejan de funcionar si el setup es zoneless (sin `zone.js/testing` cargado). Si mantienes Zone.js testing en el setup de Vitest, puedes migrar sin tocar los `fakeAsync` existentes. Este detalle es clave cuando planificas un rollout incremental con 20 equipos.

| Escenario | fakeAsync/tick/flush | Estrategia |
|-----------|---------------------|-----------|
| Zone.js testing cargado (AnalogJS `zoneless: false`, Angular 17–20 con zone) | **Funcionan tal cual** | No migrar — migra solo Jasmine→Vitest |
| Zoneless (Angular 21+ default, AnalogJS `zoneless: true`) | **No funcionan** | Migrar a `vi.useFakeTimers()` |

Tabla de migración (solo aplica al escenario zoneless):

| Zone.js | Vitest |
|---------|--------|
| `fakeAsync(() => { ... })` | `vi.useFakeTimers()` en `beforeEach` |
| `tick(ms)` | `vi.advanceTimersByTime(ms)` |
| `flush()` | `vi.runAllTimers()` |
| `waitForAsync(() => { ... })` | `async/await` nativo |
| `flushMicrotasks()` | `await vi.advanceTimersByTimeAsync(0)` |

> Ver [`13-dominio-asincronia.md § 4`](./13-dominio-asincronia.md) para el tratamiento completo (event loop, microtasks, Signals `effect`, patrones RxJS).

### 7.2 Resolución de módulos

- Vitest usa la resolución de Vite (ESM-first), no la de Webpack (CommonJS-first).
- Los path aliases de `vite.config.ts` están disponibles sin más pasos.
- Algunas librerías que solo exportan CommonJS piden configuración en `server.deps.inline`.
- El compilador JIT de Angular pide importar `@angular/compiler` en el archivo de setup.

### 7.3 Variables globales y entorno

- Con `globals: true`, `describe`, `it` y `expect` están disponibles sin importar, como en Jasmine.
- El entorno DOM se configura a mano (`jsdom` o `happy-dom`); Karma, en cambio, lanzaba un navegador real.
- `window`, `document` y `navigator` están simulados; no son APIs reales del navegador.

### 7.4 TestBed y ComponentFixture

Buena noticia: `TestBed` y `ComponentFixture` funcionan igual en Vitest. Las APIs vienen de `@angular/core/testing` y son agnósticas del runner:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent]  // componentes standalone
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### 7.5 HttpClientTestingModule y HttpTestingController

Funcionan sin cambios. Basta con actualizar a la API moderna:

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),          // DEBE ir primero
      provideHttpClientTesting(),   // override del HttpClient
    ]
  });
});
```

### 7.6 Librerías de terceros

| Librería | Compatibilidad con Vitest |
|----------|--------------------------|
| `@testing-library/angular` | Compatible (via AnalogJS o soporte oficial) |
| `ng-mocks` | Compatible con configuración adecuada |
| `jasmine-marbles` | Sin equivalente directo -- usar `TestScheduler` de RxJS |
| `@testing-library/vue` | Compatible nativamente |
| `@pinia/testing` | Compatible nativamente (pasar `createSpy: vi.fn`) |
| `msw` (Mock Service Worker) | Compatible nativamente |
| `@faker-js/faker` | Compatible nativamente |

---

## 8. Checklist de migración

### Pre-migración

- [ ] Verificar versión de Angular (17+ para AnalogJS, 21+ para oficial)
- [ ] Asegurar que el proyecto usa el builder `application` (no `browser`)
- [ ] Hacer backup o commit de los tests actuales
- [ ] Documentar tests que usan `fakeAsync`/`tick` (requerirán refactoring manual)
- [ ] Identificar tests con `jasmine.createSpyObj` (requerirán refactoring manual)
- [ ] Revisar si hay custom matchers de Jasmine que deban migrarse
- [ ] Verificar compatibilidad de librerías de terceros usadas en tests

### Migración

- [ ] Instalar dependencias de Vitest
- [ ] Crear/actualizar archivo de configuración
- [ ] Crear archivo de setup
- [ ] Actualizar `angular.json` (o equivalente)
- [ ] Actualizar `tsconfig.spec.json`
- [ ] Ejecutar schematic automático (Angular 21+)
- [ ] Migrar manualmente `jasmine.createSpyObj` -> objetos con `vi.fn()`
- [ ] Migrar manualmente `fakeAsync`/`tick` -> `vi.useFakeTimers()`
- [ ] Migrar `jasmine.clock()` -> `vi.useFakeTimers()`
- [ ] Migrar `waitForAsync()` -> `async/await`
- [ ] Migrar `done()` callbacks -> `async/await`
- [ ] Migrar custom matchers -> `expect.extend()`
- [ ] Actualizar snapshots si se usan

### Post-migración

- [ ] Eliminar `karma.conf.js` y `src/test.ts`
- [ ] Desinstalar paquetes de Karma/Jasmine
- [ ] Verificar que todos los tests pasan
- [ ] Actualizar scripts en `package.json`
- [ ] Actualizar CI/CD pipeline
- [ ] Configurar coverage thresholds
- [ ] Actualizar documentación del proyecto

---

## 9. Entorno DOM: jsdom vs happy-dom

| Característica | jsdom | happy-dom |
|----------------|-------|-----------|
| Completitud DOM | Más completo | Suficiente para la mayoría |
| Velocidad | Más lento | **2 a 5× más rápido** (según [happy-dom](https://github.com/capricorn86/happy-dom)) |
| Tamaño | Mayor | Menor |
| Casos de uso | Tests que requieren APIs avanzadas | La mayoría de tests de componentes |
| Canvas/WebGL | Soporte parcial | No |
| Web Components | Sí | Parcial |
| fetch API | Sí (con polyfill) | Sí |
| Recomendación | Para edge cases | **Por defecto** |

Si necesitas APIs reales del navegador (Canvas, WebGL, Web Workers), considera el **browser mode** de Vitest:

```bash
npm install -D @vitest/browser-playwright
```

---

## 10. Vitest 4.x: cambios importantes

Vitest 4.0.x es estable desde el 22 de octubre de 2025. Si te pasas a la última versión, ten en cuenta:

- Requiere Vite >= 6 y Node.js >= 20.
- `workspace` pasa a llamarse `projects`.
- `poolOptions` queda simplificado con opciones de nivel superior.
- `vi.fn().getMockName()` devuelve `'vi.fn()'` por defecto (antes: `'spy'`).
- `vi.restoreAllMocks()` solo restaura spies manuales, no automocks.
- Coverage V8 usa análisis basado en AST, más fiel para branches.
- Browser mode estable (`@vitest/browser-playwright`, `@vitest/browser-webdriverio`).

> Comparativa completa Jest 30 vs Vitest 4 en [`03-jest-y-vitest.md`](./03-jest-y-vitest.md).

---

## 11. Post-migración: Stryker

Cuando Vitest corre verde, integrar Stryker 9 es directo. El runner dedicado `@stryker-mutator/vitest-runner` aprovecha el grafo de dependencias de Vite para ejecutar solo los tests que tocan cada mutante (`coverageAnalysis: "perTest"`). El equipo de Stryker documenta aceleraciones del orden de 10 a 50 veces frente al runner de Jest, según la configuración y el tamaño del proyecto.

> Aceleración típica del mutation testing con `@stryker-mutator/vitest-runner` y `coverageAnalysis: "perTest"`: entre 10× y 50× más rápido que el runner de Jest.
>
> > **Fuente:** Stryker Mutator, *StrykerJS Vitest Runner* (docs). <https://stryker-mutator.io/docs/stryker-js/vitest-runner/>

```bash
npm install -D @stryker-mutator/core @stryker-mutator/vitest-runner
npx stryker init  # selecciona vitest como runner
```

Config mínima (`stryker.config.json`):

```json
{
  "testRunner": "vitest",
  "coverageAnalysis": "perTest",
  "reporters": ["html", "progress", "clear-text"],
  "mutate": ["src/**/*.ts", "!src/**/*.spec.ts", "!src/main.ts"]
}
```

> Configuración, interpretación del reporte y el roadmap 22 % → 60 %+ en [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md).

---

## 12. Ganancias esperables tras la migración

Conviene medir antes y después con los mismos escenarios para justificar el esfuerzo. Los rangos de abajo son ejemplos de referencia: dependen del tamaño de la suite, el hardware de CI y el entorno DOM. Mide sobre tu propio proyecto antes de prometer cifras.

| Métrica | Karma | Vitest | Típico (cifras de ejemplo) |
|---------|-------|--------|--------|
| Tiempo a primer test (`npm test` en frío) | 25-40 s | < 3 s | ~10× más rápido |
| Suite completa en CI | baseline | — | 3-10× más rápido |
| Watch mode tras guardar 1 archivo | Suite completa | Solo afectados | 20-100× más rápido |
| Memoria pico en CI | Alta (Chromium) | Base (Node) | 30-50 % menos |
| Mutation testing (Stryker, `perTest`) | baseline | — | 10-50× más rápido |

Si tu ganancia en suite completa es menor de 3×, revisa cuatro puntos:

- ¿Estás en `happy-dom` o te quedaste en `jsdom`? happy-dom anuncia márgenes del orden de 2 a 5 veces, verificables en [su README](https://github.com/capricorn86/happy-dom) y en el [banco de pruebas de Vitest](https://vitest.dev/guide/environment.html).
- ¿Has eliminado `karma-coverage`? Deja solo `@vitest/coverage-v8`.
- ¿El `pool` es `threads` (default)? `forks` es más compatible, pero más lento.
- ¿Los `beforeEach` montan un `TestBed` enorme? El cuello de botella puede estar ahí, no en el runner.

---

## 13. Preguntas frecuentes

- **¿Por qué Vitest y no Jest?** Jest no tiene ESM estable (el flag `--experimental-vm-modules` sigue siendo experimental incluso en Jest 30). Angular usa Vite como build system desde la v17, así que Vitest comparte infraestructura. Comparativa completa en [`03-jest-y-vitest.md`](./03-jest-y-vitest.md).

- **¿Los tests e2e migran también?** No. Cypress y Playwright son independientes del runner unitario.

- **¿Puedo mantener matchers de Jasmine?** No directamente. La mayoría tienen equivalente exacto (ver [`11-sintaxis-jasmine-vitest.md`](./11-sintaxis-jasmine-vitest.md)). Los custom se reescriben con `expect.extend()`.

- **¿Tests con Angular Material?** Funcionan igual. `TestBed` e imports de Material no cambian.

- **¿NX o monorepos?** Soporte oficial vía `@nx/vite`.

- **¿Vue + Vitest?** Plug-and-play desde `npm create vue@latest`. Si ya tiras de Jest, la migración es renombrar `jest.*` → `vi.*` y pasar `createSpy: vi.fn` a `createTestingPinia`.

- **¿Convivencia Karma + Vitest en el mismo repo?** Sí, dos targets en `angular.json`. En repos grandes es lo recomendado durante las fases 1-3 (ver § 6).

- **¿Migrar snapshots?** El formato es compatible en casos simples. Con AnalogJS los serializers de componentes difieren; regenerar con `vitest run --update` y revisar los diffs suele ser lo más rápido.

---

## 14. Referencias

- [Angular · Migrating to Vitest](https://angular.dev/guide/testing/migrating-to-vitest)
- [Vitest · Migration guide](https://vitest.dev/guide/migration.html)
- [AnalogJS · vitest-angular](https://github.com/analogjs/analog/tree/main/packages/vitest-angular)
- [Karma deprecation notice](https://github.com/karma-runner/karma) (abril 2023)
- [Angular blog · announcements](https://blog.angular.dev/)

---

## Fuentes

- SitePoint, *Vitest vs Jest 2026: Performance Benchmarks and Migration Guide* (feb. 2026). Origen del benchmark 38 s / 214 s en frío y 0,3 s / 8,4 s en watch mode sobre un monorepo de ~50 000 tests. <https://www.sitepoint.com/vitest-vs-jest-2026-migration-benchmark/>
- Stryker Mutator, *StrykerJS Vitest Runner* (documentación oficial). Base de la aceleración 10× a 50× de mutation testing. <https://stryker-mutator.io/docs/stryker-js/vitest-runner/>
- happy-dom, *README del repositorio*. Base del margen 2× a 5× frente a jsdom. <https://github.com/capricorn86/happy-dom>
- Angular Team, *Announcing Angular v21* (blog oficial). Confirma que Vitest queda como runner por defecto. <https://blog.angular.dev/announcing-angular-v21-57946c34f14b>
- Karma Project, *Repositorio y aviso de deprecación* (abril 2023). <https://github.com/karma-runner/karma>
- Angular Team, *Migrating to Vitest* (guía oficial). Schematic `ng generate @angular/core:karma-to-vitest`. <https://angular.dev/guide/testing/migrating-to-vitest>
- Vitest, *Test Environment guide*. Comparativa happy-dom vs jsdom. <https://vitest.dev/guide/environment.html>
