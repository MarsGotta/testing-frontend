# Jest y Vitest

> Taller 1 — Fundamentos del Testing Frontend | Sección 2

- **Modalidad:** explicación + referencia (por qué Vitest, y tabla comparativa para consulta).
- **Prerrequisitos:** haber leído [`02-anatomia-de-un-test.md`](./02-anatomia-de-un-test.md). Familiaridad con Jest o Karma/Jasmine ayuda, pero no es obligatoria.
- **Tiempo estimado:** 15 min.
- **Versiones de referencia:** Jest 30, Vitest 4.0.x, Angular 17–21, Vue 3.x, React 19. **Validado 2026-04.**
- **Qué sacarás:** criterio para defender la elección de runner en tu equipo y saber qué te vas a encontrar al migrar.

### Por qué importa esto

Si tu equipo todavía arrastra Karma o un Jest antiguo, cada test tarda segundos en arrancar. El watch reejecuta la suite entera cada vez que tocas un archivo. El final del camino es predecible: la gente deja de correr los tests en local y la CI acaba siendo el primer sitio donde te enteras de que algo se ha roto.

Vitest cambia esa dinámica. Arranca en menos de un segundo, solo reejecuta lo que ha cambiado y, desde Angular 21, viene por defecto. El runner no es un detalle de tooling; condiciona cuántas veces al día tu equipo corre los tests, que es lo que acaba moviendo la aguja de la calidad.

### Rutas según de dónde vienes

- **Si vienes de Jest** → salta a [Gotchas al migrar de Jest a Vitest](#gotchas-al-migrar-de-jest-a-vitest). La API es casi idéntica; el foco está en las diferencias silenciosas.
- **Si vienes de Karma/Jasmine** → la comparativa Jest↔Vitest de abajo es contexto útil, pero tu camino real es [`10-migracion-karma-vitest.md`](./10-migracion-karma-vitest.md) y la tabla de equivalencias Jasmine→Vitest en [`11-sintaxis-jasmine-vitest.md`](./11-sintaxis-jasmine-vitest.md).
- **Si vienes de cero** → lee toda la sección en orden.

### Comparativa Jest vs Vitest

| Característica         | Jest                                     | Vitest                                       |
|------------------------|------------------------------------------|----------------------------------------------|
| Versión estable (2026) | **Jest 30** (jun 2025)                   | **Vitest 4.0.x** (oct 2025)                  |
| Velocidad              | Rápido                                   | Muy rápido (Vite bajo el capó)               |
| Soporte ESM            | Mejorado en v30 (config TS, `.mts`/`.cts`) pero `unstable_unmockModule` aún experimental | Nativo                                       |
| Configuración          | `jest.config.{js,ts}` (TS desde v30)     | Dentro de `vite.config` o `vitest.config`    |
| Hot Module Replacement | No                                       | Sí (modo watch inteligente)                  |
| Compatibilidad API     | API propia                               | Compatible con Jest API (con diferencias)    |
| TypeScript             | Requiere `ts-jest` / `@swc/jest` / Babel | Nativo vía Vite                              |
| Snapshot               | Sí                                       | Sí (serialización ligeramente distinta)      |
| Coverage               | Sí (istanbul / v8)                       | Sí (istanbul / v8, v8 usa AST desde v3)      |
| Browser mode           | No (solo jsdom / node)                   | Sí, **estable en v4** (`@vitest/browser-*`)  |
| Worker pool            | `workers`                                | `threads` / `forks` / `vmThreads` / `vmForks`|
| Ecosistema             | Maduro, enorme                           | Creciente, compatible con Jest               |
| Default en Angular     | —                                        | **Sí desde Angular 21** (`@angular/build:unit-test`) |
| Default en Vue / React | —                                        | Sí (Vue CLI con Vite; React con Vite, Next.js App Router compatible) |

**¿Por qué elegimos Vitest?**

La razón más pragmática es la configuración compartida. Si ya usas Vite como bundler, Vitest reutiliza esa misma configuración y te ahorras mantener dos pipelines de transformación en paralelo. Es un dolor silencioso pero constante. A eso se suma ESM nativo: te olvidas de los workarounds para `import/export` que todos hemos sufrido en Jest. Y el modo watch reejecuta solo los tests afectados por tus cambios, lo bastante rápido como para dejarlo corriendo en segundo plano mientras programas.

La API es casi idéntica a la de Jest. Migrar suele reducirse a cambiar `jest` por `vi` y a resolver el puñado de gotchas que verás en la siguiente sección. En 2026 encaja además con el resto del ecosistema: Angular 21 lo trae por defecto con `@angular/build:unit-test`, en Vue 3 con Vite es el caso natural, en React con Vite es ya la ruta estándar desde que Create React App quedó deprecado, y Nuxt, SvelteKit y Astro también lo han adoptado.

> **Fuente:** Angular Blog — [*Announcing Angular v21*](https://blog.angular.dev/announcing-angular-v21-57946c34f14b) confirma Vitest como runner por defecto y el schematic `ng generate @angular/core:karma-to-vitest`. Las versiones concretas de Jest y Vitest se recogen en sus respectivos changelogs ([Jest](https://jestjs.io/blog), [Vitest](https://vitest.dev/blog/)).

> **Cuándo Jest sigue teniendo sentido:** proyectos con React Native (Metro bundler), Next.js legacy con Pages Router, o monorepos con mucha inversión previa en `jest.setup` y transformers custom donde migrar no te compensa el trabajo.

#### Gotchas al migrar de Jest a Vitest

La API es casi idéntica, pero hay un puñado de diferencias silenciosas que conviene tener fichadas antes de migrar. Son las que te hacen perder una tarde buscando por qué un test que funcionaba en Jest falla en Vitest sin mensaje claro.

- El hoisting de `vi.mock` eleva la factory al top del archivo, así que no puede capturar variables externas. Cuando necesites compartir estado entre el mock y el test, usa `vi.hoisted()`. Lo cubrimos en el archivo 12.
- Los globals son opt-in. Sin `globals: true`, Testing Library no registra su `afterEach(cleanup)` automático: acabas con memory leaks entre tests y las aserciones se envenenan. La guía oficial de migración lo recoge, pero es fácil pasarlo por alto.
- La traducción de las funciones principales es mecánica: `jest.fn` pasa a `vi.fn` y `jest.spyOn` a `vi.spyOn`. El único que cambia de forma es `jest.requireActual`. Era síncrono; ahora es `vi.importActual`, devuelve una `Promise` y necesita `await` donde antes no hacía falta.
- Los timeouts se configuran distinto: `jest.setTimeout(n)` pasa a `vi.setConfig({ testTimeout: n })`.
- No existe el namespace global `jest`, así que los tipos se importan con `import type { Mock } from 'vitest'`.
- En la v4 hay además tres cambios de configuración que conviene conocer: `workspace` pasa a llamarse `projects`, `poolOptions` se aplana un nivel y `vi.restoreAllMocks()` deja de revertir los automocks (solo toca los spies manuales).

> **Fuente:** [Vitest Migration Guide](https://vitest.dev/guide/migration.html) y notas de release v4 en [Vitest Blog](https://vitest.dev/blog/).

> La tabla completa de equivalencias Jasmine → Vitest está en el archivo 11, y la migración guiada paso a paso en el 10.

### Configuración básica de Vitest

El ejemplo que sigue es agnóstico del framework para que puedas leer la configuración sin ruido de Angular, Vue o React encima. Los pasos completos con los plugins específicos (`@analogjs/vite-plugin-angular` para Angular, `@vitejs/plugin-vue` para Vue y `@vitejs/plugin-react` o `@vitejs/plugin-react-swc` para React) los tienes en el archivo 10, que es el de migración.

```typescript
// vitest.config.ts  — versiones: vitest 4.0.x
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Entorno DOM simulado: happy-dom (rápido, suficiente) o jsdom (más completo).
    // En Angular 21+ el CLI auto-detecta el que esté instalado.
    environment: 'happy-dom',

    // Globals: sin esto, Testing Library NO hace auto-cleanup (memory leaks).
    globals: true,

    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.{test,spec}.ts'],

    // Worker pool (v4). Cambiar si ves segfaults o "Failed to terminate worker":
    //   'threads'   → rápido (default), Tinypool
    //   'forks'     → más compatible (Zone.js, módulos nativos)
    //   'vmThreads' → aislamiento vía VM, experimental
    //   'vmForks'   → aislamiento vía VM + forks
    pool: 'threads',

    coverage: {
      // 'v8' usa el profiler nativo de Node (rápido, desde v3 análisis AST).
      // 'istanbul' instrumenta el código (más lento, conteo de branches más fiel).
      // Para Stryker recomendamos 'v8': Stryker mide mutantes, no líneas.
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.{test,spec}.ts', 'src/**/*.d.ts', 'src/main.ts'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
```

### Archivo de setup

```typescript
// vitest.setup.ts
import '@testing-library/jest-dom/vitest';
// Matchers: toBeInTheDocument, toBeVisible, toHaveTextContent, toHaveAttribute, ...
```

> Con `globals: true`, Testing Library (Angular/Vue/React v14+) registra su `afterEach(cleanup)` automáticamente, así que no hace falta añadirlo a mano.

### Matchers fundamentales de Vitest

```typescript
import { describe, it, expect } from 'vitest';

describe('Matchers fundamentales', () => {
  // ── Igualdad ───────────────────────────────────────
  it('toBe — igualdad estricta (===)', () => {
    expect(1 + 1).toBe(2);
    expect('hola').toBe('hola');

    // Cuidado: toBe usa ===, no sirve para objetos
    // expect({ a: 1 }).toBe({ a: 1 }); // FALLA
  });

  it('toEqual — igualdad profunda de objetos/arrays', () => {
    expect({ a: 1, b: { c: 2 } }).toEqual({ a: 1, b: { c: 2 } });
    expect([1, 2, 3]).toEqual([1, 2, 3]);
  });

  // ── Valores truthy/falsy ───────────────────────────
  it('toBeTruthy / toBeFalsy', () => {
    expect('texto').toBeTruthy();
    expect(1).toBeTruthy();
    expect(0).toBeFalsy();
    expect(null).toBeFalsy();
    expect(undefined).toBeFalsy();
    expect('').toBeFalsy();
  });

  it('toBeNull / toBeUndefined / toBeDefined', () => {
    expect(null).toBeNull();
    expect(undefined).toBeUndefined();
    expect('algo').toBeDefined();
  });

  // ── Colecciones ────────────────────────────────────
  it('toContain — el array/string contiene el valor', () => {
    expect([1, 2, 3]).toContain(2);
    expect('Hola mundo').toContain('mundo');
  });

  it('toHaveLength — longitud de array o string', () => {
    expect([1, 2, 3]).toHaveLength(3);
    expect('abc').toHaveLength(3);
  });

  // ── Strings ────────────────────────────────────────
  it('toMatch — coincide con regex o substring', () => {
    expect('Hola mundo').toMatch(/mundo/);
    expect('test@email.com').toMatch(/@/);
  });

  // ── Números ────────────────────────────────────────
  it('toBeGreaterThan / toBeLessThan', () => {
    expect(10).toBeGreaterThan(5);
    expect(3).toBeLessThan(7);
    expect(5).toBeGreaterThanOrEqual(5);
  });

  it('toBeCloseTo — para comparar floats', () => {
    expect(0.1 + 0.2).toBeCloseTo(0.3);
  });

  // ── Excepciones ────────────────────────────────────
  it('toThrow — la función lanza un error', () => {
    const divide = (a: number, b: number) => {
      if (b === 0) throw new Error('División por cero');
      return a / b;
    };

    expect(() => divide(1, 0)).toThrow('División por cero');
    expect(() => divide(1, 0)).toThrow(/cero/);
  });

  // ── Negación ───────────────────────────────────────
  it('.not — negar cualquier matcher', () => {
    expect(1).not.toBe(2);
    expect([1, 2]).not.toContain(3);
    expect('hola').not.toMatch(/mundo/);
  });
});
```

### Matchers de Testing Library (`@testing-library/jest-dom`)

Estos matchers extienden `expect()` con aserciones específicas para el DOM. Los mismos funcionan igual en Angular (`@testing-library/angular`), Vue (`@testing-library/vue`) y React, porque todos operan por debajo sobre `HTMLElement`. En el ejemplo de abajo uso DOM nativo a propósito: así se ve que la dependencia es con el elemento, no con el framework que lo renderiza.

```typescript
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom/vitest';

describe('matchers de Testing Library', () => {
  it('assertions sobre HTMLElement', () => {
    document.body.innerHTML = `
      <form>
        <label for="email">Email</label>
        <input id="email" type="email" value="test@example.com" readonly />
        <input type="checkbox" checked aria-label="Aceptar términos" />
        <button disabled>Enviar</button>
        <p style="display:none">Texto oculto</p>
        <p class="lead">Texto visible</p>
      </form>
    `;

    const email = document.getElementById('email')!;
    const check = document.querySelector<HTMLInputElement>('[type="checkbox"]')!;
    const btn   = document.querySelector('button')!;
    const lead  = document.querySelector('.lead')!;
    const oculto= document.querySelector('p[style]')!;

    expect(email).toBeInTheDocument();           // existe en el DOM
    expect(email).toHaveValue('test@example.com');
    expect(email).toHaveAttribute('type', 'email');
    expect(check).toBeChecked();
    expect(btn).toBeDisabled();                  // y .toBeEnabled()
    expect(lead).toBeVisible();                  // no display:none, etc.
    expect(oculto).not.toBeVisible();
    expect(lead).toHaveTextContent('Texto visible');
    expect(lead).toHaveClass('lead');            // y toHaveFocus(), toContainElement(child)
  });
});
```

### Ciclo de vida

Vitest expone cuatro hooks para ejecutar código alrededor de tus tests. Cada uno responde a una pregunta distinta: qué preparar una sola vez para todo el bloque, qué resetear entre un test y el siguiente, qué limpiar después de cada uno y qué cerrar cuando la suite acaba. El orden en que se disparan es el que ves en el bloque de logs de más abajo.

```typescript
import { describe, it, expect, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';

describe('Ciclo de vida', () => {
  // ── beforeAll ──────────────────────────────────────
  // Se ejecuta UNA vez antes de TODOS los tests del describe.
  // Uso: inicializar recursos costosos (conexión a BD de test, servidor MSW).
  beforeAll(() => {
    console.log('Inicio de la suite');
    // Ejemplo: server.listen();
  });

  // ── beforeEach ─────────────────────────────────────
  // Se ejecuta antes de CADA test.
  // Uso: resetear estado, limpiar mocks, preparar datos frescos.
  beforeEach(() => {
    console.log('Antes de cada test');
    // Ejemplo: vi.clearAllMocks();
  });

  // ── afterEach ──────────────────────────────────────
  // Se ejecuta después de CADA test.
  // Uso: limpiar efectos secundarios, restaurar mocks.
  afterEach(() => {
    console.log('Después de cada test');
    // Ejemplo: server.resetHandlers();
  });

  // ── afterAll ───────────────────────────────────────
  // Se ejecuta UNA vez después de TODOS los tests del describe.
  // Uso: liberar recursos (cerrar servidor, limpiar BD).
  afterAll(() => {
    console.log('Fin de la suite');
    // Ejemplo: server.close();
  });

  it('test 1', () => {
    expect(true).toBe(true);
  });

  it('test 2', () => {
    expect(true).toBe(true);
  });
});
```

**Orden de ejecución para el ejemplo anterior:**

```
Inicio de la suite        (beforeAll)
Antes de cada test        (beforeEach)
  test 1
Después de cada test      (afterEach)
Antes de cada test        (beforeEach)
  test 2
Después de cada test      (afterEach)
Fin de la suite           (afterAll)
```

**¿Cuándo usar cada uno?**

| Hook         | Cuándo usarlo                                                |
|-------------|--------------------------------------------------------------|
| `beforeAll` | Recursos costosos compartidos: iniciar servidor MSW, etc.    |
| `beforeEach`| Resetear estado mutable: limpiar mocks, reiniciar variables  |
| `afterEach` | Limpiar efectos: restaurar handlers de MSW, cleanup del DOM  |
| `afterAll`  | Liberar recursos: cerrar conexiones, parar servidores        |

---

## Fuentes

Las referencias que sostienen los claims de este archivo. La bibliografía completa del taller vive en [`15-referencias.md`](./15-referencias.md).

- Vitest — *Getting Started* y *Migration Guide*. https://vitest.dev/guide/ y https://vitest.dev/guide/migration.html
- Vitest — *Blog* (changelog de la v4, browser mode estable, `workspace`→`projects`, cambios en `restoreAllMocks`). https://vitest.dev/blog/
- Vitest — *Vi API* y *Module Mocking* (hoisting, `vi.hoisted()`, `vi.importActual`). https://vitest.dev/api/vi.html y https://vitest.dev/guide/mocking/modules
- Jest — *Release Notes* (Jest 30, config TS, `.mts`/`.cts`). https://jestjs.io/blog
- Angular Blog — *Announcing Angular v21* (Vitest por defecto con `@angular/build:unit-test`). https://blog.angular.dev/announcing-angular-v21-57946c34f14b
- Testing Library — matchers `@testing-library/jest-dom`. https://github.com/testing-library/jest-dom

