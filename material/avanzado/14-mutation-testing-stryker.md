# Mutation Testing con Stryker

> Taller 2 — Avanzado | Sección 14
> **Modalidad:** explanation (qué/por qué) + how-to (config, optimización) + reference (operadores, métricas).
> **Prerrequisitos:** haber leído `09-buenas-practicas.md` (anti-patrones → señal en mutation report) y `13-dominio-asincronia.md` (tests async que no assertan). Se asume experiencia previa con Stryker (audiencia con 6 meses corriéndolo).
> **Tiempo estimado:** 60 min de lectura + aplicación iterativa.
> **Stack validado:** Stryker 9.6.x, `@stryker-mutator/vitest-runner` 9.x, Vitest 4.x, Angular 17–21, Vue 3, React 19, Node 20+.
> **Última validación:** 2026-04.

Esta guía asume el concepto base de mutation testing. El foco está en ejecutar Stryker bien. Aprendes a interpretar el reporte, a optimizar para una suite de 20+ squads y a mover un mutation score real de 22 % a 60 %+ (sección 15.2.1), sacado de una suite grande en producción. Complementa los anti-patrones de `09-buenas-practicas.md`: cada fila de aquella tabla tiene su correlato en un operador de mutación aquí.

Stryker trabaja a nivel de herramienta y le da igual qué framework uses encima. El setup `@stryker-mutator/vitest-runner` + Vitest 4 funciona igual para Angular, Vue y React: misma config, mismos operadores de mutación, mismo reporte HTML. Lo que cambia es el array `mutate` (qué extensiones incluir) y, en Angular, el `ignorer` específico. El resto de la guía (score, tipos de mutantes, roadmap, optimización) vale para los tres por igual.

## 1. Qué es el mutation testing

### 1.1 Concepto

El mutation testing mide la calidad de tu suite de tests. Introduce pequeños fallos deliberados (mutantes) en el código fuente y comprueba si los tests los detectan.

**Pregunta fundamental:** ¿tus tests capturan bugs o solo ejecutan código?

El code coverage mide cuánto código se ejecuta. El mutation testing mide cuánto se verifica de verdad. Es la diferencia entre pasar por una habitación y revisar cada rincón.

### 1.2 Cómo funciona

1. Stryker analiza tu código fuente y genera mutantes (cambios sintácticos pequeños).
2. Por cada mutante, ejecuta la suite de tests.
3. Si al menos un test falla, el mutante queda `killed` (tus tests lo detectaron).
4. Si todos los tests pasan, el mutante sobrevive (tus tests no lo detectaron).

```
Codigo Original          Mutante                    Tests
+-----------------+     +------------------+     +----------------+
| return a + b;   | --> | return a - b;    | --> | test('sum')    |
+-----------------+     +------------------+     | expect(sum(    |
                                                  |   2, 3)        |
                                                  | ).toBe(5)     |
                                                  +----------------+
                                                         |
                                                  sum(2,3) = -1
                                                  -1 !== 5
                                                  TEST FALLA
                                                         |
                                                  Mutante KILLED
```

### 1.3 Por qué el code coverage miente

El coverage mide si el código se ejecutó, no si se verificó. Puedes tener 100% de coverage con 0% de mutation score.

**Ejemplo clásico:**

```typescript
// Función a testar
function add(a: number, b: number): number {
  return a + b;
}

// Test con 100% de coverage... pero inútil
test('add ejecuta', () => {
  add(2, 3); // ejecuta la línea, pero NO verifica el resultado
});
```

- Coverage: 100% (todas las líneas ejecutadas).
- Stryker muta `+` a `-`: `return a - b`.
- El test sigue pasando (no hay assert).
- Mutation score: 0%.

En la práctica, es habitual que equipos con coverage alto (80-90 %) descubran un mutation score notablemente más bajo al ejecutar Stryker por primera vez. El propio equipo de Stryker documenta en [Mutation testing in the small](https://stryker-mutator.io/docs/) que la diferencia entre "línea ejecutada" y "línea verificada" es justo lo que abre ese hueco.

**Otro ejemplo más sutil:**

```typescript
function getDiscount(total: number, isMember: boolean): number {
  if (total > 100 && isMember) {
    return total * 0.1;
  }
  return 0;
}

// Test con 100% branch coverage
test('aplica descuento a miembros con compra grande', () => {
  const result = getDiscount(200, true);
  expect(result).toBeGreaterThan(0); // débil: solo verifica "algo"
});

test('no aplica descuento a no miembros', () => {
  const result = getDiscount(200, false);
  expect(result).toBe(0);
});
```

Stryker muta `total * 0.1` a `total * 0` o `total / 0.1`. El primer test sigue pasando porque `toBeGreaterThan(0)` no verifica el valor exacto. El mutation score expone esta debilidad que el coverage oculta.

---

## 2. Analogía para entender mutation testing

### 2.1 El sistema de alarmas

Imagina que tus tests son un sistema de seguridad que protege un edificio (tu código). El mutation testing es como contratar a un equipo de ladrones profesionales para comprobar si las alarmas detectan los robos.

```
Tu Codigo  = El edificio a proteger
Tus Tests  = El sistema de alarmas
Mutantes   = Los ladrones contratados
Killed     = El ladron fue detectado (la alarma sono)
Survived   = El ladron entro y salio sin ser detectado (fallo de seguridad)
```

### 2.2 Escenarios

**Escenario 1. Ladrón detectado (mutante killed).** Un ladrón intenta entrar por la ventana y la alarma suena. El sistema funciona. Stryker muta `a + b` a `a - b`. Tu test `expect(add(2,3)).toBe(5)` falla y el mutante muere.

**Escenario 2. Ladrón no detectado (mutante survived).** Un ladrón entra por la puerta trasera y ninguna alarma suena. Tienes un punto ciego. Stryker muta `>=` a `>`. Tu test solo prueba con valores lejos del límite, así que sigue pasando. El mutante sobrevive.

**Escenario 3. Sin cobertura (No Coverage).** Una habitación del edificio ni siquiera tiene alarma. Un trozo de código no tiene ningún test y Stryker lo marca como `No Coverage`.

**Escenario 4. Ladrón equivalente (mutante equivalente).** La mutación no cambia nada observable. `return x * 1` mutado a `return x / 1` devuelve lo mismo, así que ningún test puede distinguirlos.

### 2.3 La lección

- Alto mutation score (>80%): el sistema de alarmas es sólido. La mayoría de intrusiones se detectan.
- Bajo mutation score (<60%): hay muchos puntos ciegos. Los ladrones entran sin ser detectados.
- 100% coverage con bajo mutation score: tienes cámaras en todas las habitaciones, pero nadie las mira. La suite se ejecuta, pero no protege.

---

## 3. Tipos de mutaciones con ejemplos

Stryker aplica mutaciones agrupadas por categoría. Cada tipo aparece con código real y su versión mutada.

### 3.1 Mutaciones aritméticas

Cambian operadores matemáticos.

```typescript
// ORIGINAL                          // MUTADO
function calculateTotal(price, qty) { function calculateTotal(price, qty) {
  return price * qty;                   return price / qty;     // * -> /
}                                     }

function applyTax(amount, rate) {     function applyTax(amount, rate) {
  return amount + (amount * rate);      return amount - (amount * rate); // + -> -
}                                     }

function calculateRemainder(a, b) {   function calculateRemainder(a, b) {
  return a % b;                         return a * b;           // % -> *
}                                     }
```

| Original | Mutaciones posibles |
|----------|-------------------|
| `a + b` | `a - b` |
| `a - b` | `a + b` |
| `a * b` | `a / b` |
| `a / b` | `a * b` |
| `a % b` | `a * b` |

### 3.2 Mutaciones relacionales (igualdad y comparación)

Cambian operadores de comparación.

```typescript
// ORIGINAL                          // MUTADO
function canVote(age: number) {      function canVote(age: number) {
  return age >= 18;                    return age > 18;        // >= -> >
}                                    }
                                     // También puede mutar a:
                                     //   age < 18    (>= -> <)
                                     //   age <= 18   (>= -> <=)

function isEqual(a: number, b: number) { function isEqual(a: number, b: number) {
  return a === b;                          return a !== b;     // === -> !==
}                                        }
```

| Original | Mutaciones posibles |
|----------|-------------------|
| `a < b` | `a <= b`, `a >= b` |
| `a <= b` | `a < b`, `a > b` |
| `a > b` | `a >= b`, `a <= b` |
| `a >= b` | `a > b`, `a < b` |
| `a === b` | `a !== b` |
| `a !== b` | `a === b` |

### 3.3 Mutaciones lógicas

Cambian operadores lógicos.

```typescript
// ORIGINAL                              // MUTADO
function canAccess(isAdmin, isOwner) {   function canAccess(isAdmin, isOwner) {
  return isAdmin || isOwner;               return isAdmin && isOwner; // || -> &&
}                                        }

function validateInput(name, email) {    function validateInput(name, email) {
  return name && email;                    return name || email;     // && -> ||
}                                        }

function getDefault(value) {             function getDefault(value) {
  return value ?? 'fallback';              return value && 'fallback'; // ?? -> &&
}                                        }

function negate(condition) {             function negate(condition) {
  return !condition;                       return condition;          // ! eliminado
}                                        }
```

| Original | Mutaciones posibles |
|----------|-------------------|
| `a && b` | `a \|\| b` |
| `a \|\| b` | `a && b` |
| `a ?? b` | `a && b` |
| `!a` | `a` |

### 3.4 Mutaciones condicionales

Reemplazan condiciones completas por valores fijos.

```typescript
// ORIGINAL                              // MUTADO (version 1)
function getPrice(isPremium: boolean) {  function getPrice(isPremium: boolean) {
  if (isPremium) {                         if (true) {           // condición -> true
    return 99;                               return 99;
  }                                        }
  return 49;                               return 49;
}                                        }

// ORIGINAL                              // MUTADO (version 2)
function getPrice(isPremium: boolean) {  function getPrice(isPremium: boolean) {
  if (isPremium) {                         if (false) {          // condición -> false
    return 99;                               return 99;
  }                                        }
  return 49;                               return 49;
}                                        }
```

**También aplica a operadores ternarios y `switch`:**

```typescript
// ORIGINAL
const label = isActive ? 'Activo' : 'Inactivo';

// MUTADO
const label = true ? 'Activo' : 'Inactivo';     // siempre 'Activo'
const label = false ? 'Activo' : 'Inactivo';    // siempre 'Inactivo'
```

### 3.5 Mutaciones de strings

```typescript
// ORIGINAL                              // MUTADO
function greet(name: string) {           function greet(name: string) {
  return `Hola, ${name}!`;                return ``;            // string -> ""
}                                        }

function getDefault() {                  function getDefault() {
  return '';                               return 'Stryker was here!'; // "" -> string
}                                        }

function getTemplate() {                 function getTemplate() {
  return `Hello ${name}`;                  return ``;            // template -> ""
}                                        }
```

| Original | Mutación |
|----------|----------|
| `"cualquier string"` | `""` |
| `""` | `"Stryker was here!"` |
| `` `template ${expr}` `` | `""` |

### 3.6 Mutaciones de arrays

```typescript
// ORIGINAL                              // MUTADO
function getDefaults() {                 function getDefaults() {
  return [1, 2, 3];                        return [];            // array -> []
}                                        }

function getFirst(arr: number[]) {       function getFirst(arr: number[]) {
  return arr[0];                           // Sin mutación directa en acceso
}                                        }
```

### 3.7 Mutaciones de bloque (block statement)

Eliminan el cuerpo de un bloque de código.

```typescript
// ORIGINAL
function processOrder(order: Order) {
  validateOrder(order);
  calculateTotal(order);
  saveToDatabase(order);
  sendConfirmationEmail(order);
}

// MUTADO (todo el cuerpo eliminado)
function processOrder(order: Order) {
  // vacío: todos los side effects eliminados
}
```

Este tipo de mutación revela mucho. Si tu test no detecta que el cuerpo de una función queda vacío, no está comprobando que la función haga su trabajo.

### 3.8 Mutaciones unarias y de update

```typescript
// ORIGINAL          // MUTADO
let x = +a;          let x = -a;          // + unario -> - unario
let y = -a;          let y = +a;          // - unario -> + unario

counter++;           counter--;           // ++ -> --
counter--;           counter++;           // -- -> ++
```

### 3.9 Mutaciones de optional chaining

```typescript
// ORIGINAL                    // MUTADO
const name = user?.name;       const name = user.name;    // ?. -> .
const result = obj?.method();  const result = obj.method(); // ?. -> .
```

Esta mutación comprueba dos cosas: que el código necesita de verdad el optional chaining y que los tests cubren el caso en que el objeto es `null` o `undefined`.

### 3.10 Mutaciones de objetos

```typescript
// ORIGINAL                    // MUTADO
const config = {               const config = {};         // objeto -> {}
  timeout: 5000,
  retries: 3,
  verbose: true
};
```

### 3.11 Mutaciones de métodos de string

```typescript
// ORIGINAL                        // MUTADO
const upper = name.toUpperCase();  const upper = name.toLowerCase(); // toUpper -> toLower
const lower = name.toLowerCase();  const lower = name.toUpperCase(); // toLower -> toUpper
const trimmed = input.trim();      const trimmed = input;            // trim eliminado
const start = s.startsWith('a');   const start = s.endsWith('a');    // startsWith -> endsWith
```

### 3.12 Mutaciones de boolean

```typescript
// ORIGINAL             // MUTADO
const active = true;    const active = false;   // true -> false
const valid = false;    const valid = true;     // false -> true
```

### 3.13 Mutaciones de asignación (AssignmentOperator)

Cambian los operadores de asignación compuesta.

```typescript
// ORIGINAL                 // MUTADO
counter += 1;               counter -= 1;       // += -> -=
total *= rate;              total /= rate;      // *= -> /=
bits &= mask;               bits |= mask;       // &= -> |=
```

Estos mutantes suelen sobrevivir en acumuladores sin tests sobre el valor final.

### 3.14 Mutaciones de regex (RegexLiteral)

Stryker muta las expresiones regulares usando `weapon-regex` (incluido en Stryker 9 por defecto). Es crítico en validadores de formularios, parseo y sanitización.

> **weapon-regex en Stryker 9.**
>
> > **Fuente:** Stryker — Supported Mutators. https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/

```typescript
// ORIGINAL                           // MUTANTES posibles
const email = /^[a-z]+@[a-z]+\.[a-z]+$/;
// Mutaciones: cambiar `+` a `*`, negar grupos, eliminar anclas ^ y $,
//             intercambiar clases [a-z] con [^a-z], etc.

const phone = /\d{9,}/;
// Mutantes: \d{8,}, \d{10,}, \d{9}, [^\d]{9,}...
```

Si tu mutation score en validadores es alto pero Stryker survived muestra mutantes de `RegexLiteral`, añade tests con:

- Cadenas justo en el límite (9 dígitos, 10 dígitos).
- Caracteres **fuera** del set permitido.
- Entrada vacía y con separadores parciales (`"@"`, `"test@"`, `"test@x"`).

### 3.15 Tabla resumen de todos los tipos

| Categoría | Nombre Stryker | Original | Mutado |
|-----------|----------------|----------|--------|
| Aritmético | `ArithmeticOperator` | `a + b` | `a - b` |
| Aritmético | `ArithmeticOperator` | `a * b` | `a / b` |
| Aritmético | `ArithmeticOperator` | `a % b` | `a * b` |
| Relacional | `EqualityOperator` | `a === b` | `a !== b` |
| Relacional | `EqualityOperator` | `a < b` | `a <= b`, `a >= b` |
| Relacional | `EqualityOperator` | `a >= b` | `a > b`, `a < b` |
| Lógico | `LogicalOperator` | `a && b` | `a \|\| b` |
| Lógico | `LogicalOperator` | `a \|\| b` | `a && b` |
| Lógico | `LogicalOperator` | `a ?? b` | `a && b` |
| Lógico | `BooleanLiteral` (negación) | `!a` | `a` |
| Condicional | `ConditionalExpression` | `if (cond)` | `if (true)` / `if (false)` |
| Boolean | `BooleanLiteral` | `true` | `false` |
| String | `StringLiteral` | `"foo"` | `""` |
| String | `StringLiteral` | `""` | `"Stryker was here!"` |
| Bloque | `BlockStatement` | `{ code }` | `{ }` |
| Array | `ArrayDeclaration` | `[1, 2, 3]` | `[]` |
| Unario | `UnaryOperator` | `+a` | `-a` |
| Update | `UpdateOperator` | `a++` | `a--` |
| Optional chaining | `OptionalChaining` | `foo?.bar` | `foo.bar` |
| Objeto | `ObjectLiteral` | `{ foo: 'bar' }` | `{ }` |
| Método | `MethodExpression` | `s.toUpperCase()` | `s.toLowerCase()` |
| Método | `MethodExpression` | `s.startsWith(x)` | `s.endsWith(x)` |
| Método | `MethodExpression` | `s.trim()` | `s` |
| Asignación | `AssignmentOperator` | `a += b` | `a -= b` |
| Regex | `RegexLiteral` | `/^[a-z]+$/` | `/^[a-z]*$/`, `/[^a-z]+$/`, ... |

---

## 4. Estados de un mutante

| Estado | Significado | Cuenta como |
|--------|-------------|-------------|
| **Killed** | Al menos un test falló | Detectado |
| **Survived** | Todos los tests pasaron | NO detectado |
| **No Coverage** | Ningún test cubre ese código | NO detectado |
| **Timeout** | Los tests se colgaron (p. ej., bucle infinito) | Detectado |
| **Compile Error** | La mutación causó error de compilación | Inválido (excluido) |
| **Runtime Error** | Error durante la ejecución | Inválido (excluido) |
| **Ignored** | Excluido por configuración | Excluido |

### 4.1 Mutation score

```
Mutation Score = (Detectados / Validos) x 100

Detectados = killed + timeout
Validos    = detectados + survived + no coverage
```

**Rangos de referencia:**

| Rango | Interpretación |
|-------|----------------|
| 90-100% | Excelente. Tests muy sólidos. |
| 80-89% | Muy bueno. Objetivo recomendado para código crítico. |
| 60-79% | Aceptable. Hay áreas claras de mejora. |
| 40-59% | Débil. Los tests tienen muchos puntos ciegos. |
| < 40% | Crítico. Los tests dan falsa confianza. |

---

## 5. Stryker Mutator

### 5.1 Arquitectura: mutant schemata

En vez de crear N copias del proyecto (una por mutante), Stryker inserta todas las mutaciones en el código con condicionales:

```javascript
// Stryker inserta esto internamente
if (globalActiveMutant === 42) {
  i--;  // código mutado
} else {
  i++;  // código original
}
```

Cada mutante se activa cambiando una variable, no recompilando. Es mucho más rápido que crear una copia del proyecto por cada mutante.

**Ventajas del enfoque mutant schemata:**
- Se compila y transpila una sola vez.
- Los tests se ejecutan en el mismo proceso.
- El cambio entre mutantes es instantáneo: un flag.
- Funciona con cualquier bundler o transpilador.

### 5.2 Versión actual

- `@stryker-mutator/core`: **v9.6.x** (v9.6.1 publicada en abril 2026).
- `@stryker-mutator/vitest-runner`: **v9.x** — compatible con **Vitest 4** (browser mode, `test.extend` fixtures).
- Soporte para Vitest desde **StrykerJS v7.0**.
- Modo incremental desde **StrykerJS v6.2**.
- Requiere **Node 20+** (Stryker 9 dejó de soportar Node 18).
- Mutation Server Protocol (MSP) desde v9 para integraciones con IDE y dashboards.

> Stryker 9.6.1 es la versión estable en abril de 2026; el soporte a Vitest se añadió en la v7 (anuncio del propio equipo de Stryker) y la v9 retiró Node 18.
>
> > **Fuente:** Stryker — releases y notas de versión. https://github.com/stryker-mutator/stryker-js/releases
> >
> > **Fuente:** Announcing StrykerJS 7.0 (Vitest support). https://stryker-mutator.io/blog/announcing-stryker-js-7/

### 5.3 Flujo de ejecución interno

```
1. Stryker lee los archivos fuente
      |
2. El Instrumenter genera mutantes y los inserta como schemata
      |
3. (Opcional) El Checker valida que los mutantes compilan
      |
4. El Sandbox crea un directorio temporal con el codigo instrumentado
      |
5. El TestRunner ejecuta los tests con cada mutante activado
      |
6. Los resultados se agregan y se generan los reportes
```

---

## 6. Configuración: Stryker + Vitest

### 6.1 Instalación

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/vitest-runner

# O usar el inicializador interactivo:
npm init stryker@latest
```

El inicializador interactivo detecta tu proyecto (framework, test runner) y genera la configuración adecuada.

### 6.2 Configuración básica

**stryker.config.json:**
```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts"
  ],
  "reporters": ["html", "clear-text", "progress"],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 0
  }
}
```

**stryker.conf.mjs (formato ESM):**
```javascript
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
const config = {
  testRunner: 'vitest',
  plugins: ['@stryker-mutator/vitest-runner'],
  mutate: ['src/**/*.ts', '!src/**/*.spec.ts'],
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: {
    high: 80,
    low: 60,
    break: 0,
  },
};
export default config;
```

### 6.3 Ejecutar

```bash
npx stryker run
```

Script en package.json:
```json
{
  "scripts": {
    "test:mutation": "stryker run",
    "test:mutation:incremental": "stryker run --incremental",
    "test:mutation:changed": "stryker run --incremental --mutate $(git diff --name-only origin/main...HEAD -- 'src/**/*.ts' | grep -v '.spec.ts' | tr '\\n' ',')"
  }
}
```

### 6.4 Restricciones del Vitest runner

- `coverageAnalysis` efectivo es siempre `perTest` con el runner de Vitest. Aparece en la config por documentación y portabilidad, pero el runner lo fuerza por dentro. Esto es lo que, según la propia guía de Stryker para el runner de Vitest, da una aceleración dentro del rango **de un orden de magnitud a varias decenas** respecto al runner de Jest sobre la misma suite (los valores concretos dependen del proyecto y de la configuración).
- Solo soporta `threads: true`; Stryker gestiona su propio paralelismo.
- Browser mode soportado desde Stryker 9 + Vitest 4 (antes no lo estaba).
- Stryker desactiva el coverage reporting y activa bail-on-first-failure de forma automática.
- Admite la configuración de workspaces y projects de Vitest.
- `test.extend` (fixtures) es compatible desde Stryker 9.

### 6.5 Con Jest (breve)

Para proyectos que aún no han migrado a Vitest:

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/jest-runner
```

```json
{
  "testRunner": "jest",
  "plugins": ["@stryker-mutator/jest-runner"],
  "jest": {
    "projectType": "custom",
    "configFile": "jest.config.js"
  },
  "coverageAnalysis": "perTest"
}
```

El runner de Jest soporta `coverageAnalysis: "perTest"`, pero es notablemente más lento que el de Vitest por el coste de arranque de cada worker. Si ya tienes Vitest (aunque sea parcial en el monorepo), usa el runner de Vitest allí.

---

## 7. Configuración para Angular

### 7.1 Con Vitest (recomendado)

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/test.ts",
    "!src/environments/*.ts"
  ],
  "ignorers": ["angular"],
  "reporters": ["progress", "clear-text", "html"],
  "concurrency": 4
}
```

`"ignorers": ["angular"]` es crítico. Evita mutar código que debe ser estático para el compilador de Angular:
- objetos de opciones de `input()`, `output()`, `model()`;
- metadatos de decoradores;
- constantes de configuración de módulos.

### 7.2 Con Karma (legacy)

```bash
npm install --save-dev @stryker-mutator/core @stryker-mutator/karma-runner
```

```json
{
  "testRunner": "karma",
  "karma": {
    "configFile": "karma.conf.js",
    "projectType": "angular-cli",
    "config": {
      "browsers": ["ChromeHeadless"]
    }
  },
  "ignorers": ["angular"],
  "concurrency": 4
}
```

### 7.3 TypeScript checker (opcional pero recomendado)

```bash
npm install --save-dev @stryker-mutator/typescript-checker
```

```json
{
  "checkers": ["typescript"],
  "tsconfigFile": "tsconfig.json"
}
```

Detecta mutantes con errores de compilación antes de ejecutar tests. Ahorras bastante tiempo.

---

## 8. Configuración para Vue

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "mutate": [
    "src/**/*.ts",
    "src/**/*.vue",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts"
  ],
  "reporters": ["html", "clear-text", "progress"]
}
```

**Nota:** incluye `"src/**/*.vue"` en el array `mutate` para que Stryker mute las secciones `<script>` de los Single File Components.

---

## 8 bis. Configuración para React

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "mutate": [
    "src/**/*.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/main.tsx"
  ],
  "reporters": ["html", "clear-text", "progress"]
}
```

Para React la configuración es la misma que para Vue: Stryker + Vitest, sin plugin específico de framework. Lo único que cambia es el patrón de extensiones (`*.tsx` en vez de `*.vue`) y excluir el punto de entrada (`main.tsx` o `index.tsx`).

No necesitas `ignorers` para React. El ignorer `angular` existe porque Angular usa metadatos en decoradores que no deben mutarse; React y Vue no tienen ese problema.

---

## 9. Opciones de configuración completas

### 9.1 Thresholds

```json
{
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": 50
  }
}
```

| Condición | Resultado |
|-----------|-----------|
| Score >= `high` (80) | VERDE: tests sólidos |
| `low` (60) <= Score < `high` | AMARILLO: necesita mejora |
| Score < `low` (60) | ROJO: tests débiles |
| Score < `break` (50) | EXIT CODE 1: CI falla |

Si `break` es `null`, Stryker no falla el proceso nunca (modo informativo).

### 9.2 Excluir tipos de mutación

```json
{
  "mutator": {
    "excludedMutations": ["ObjectLiteral", "StringLiteral"]
  }
}
```

**Tipos de mutación disponibles para excluir:**

| Nombre | Qué muta |
|--------|----------|
| `ArithmeticOperator` | `+`, `-`, `*`, `/`, `%` |
| `ArrayDeclaration` | Literales de array |
| `AssignmentOperator` | `+=`, `-=`, `*=`, `/=`, `&=`, `\|=` |
| `BlockStatement` | Cuerpos de funciones/bloques |
| `BooleanLiteral` | `true`, `false`, `!x` |
| `ConditionalExpression` | Condiciones en `if`/ternarios |
| `EqualityOperator` | `===`, `!==`, `==`, `!=`, `<`, `>`, `<=`, `>=` |
| `LogicalOperator` | `&&`, `\|\|`, `??` |
| `MethodExpression` | Métodos de string/array (`trim`, `startsWith`, etc.) |
| `ObjectLiteral` | Literales de objeto |
| `OptionalChaining` | `?.` |
| `RegexLiteral` | Expresiones regulares (`weapon-regex`) |
| `StringLiteral` | Literales de string |
| `UnaryOperator` | `+`, `-` unarios |
| `UpdateOperator` | `++`, `--` |

> **Nota:** El antiguo `RelationalOperator` está unificado dentro de `EqualityOperator` en los mutators actuales; usa `EqualityOperator` para excluir cualquier operador de comparación.

### 9.3 Mutar archivos o líneas específicos (CLI)

```bash
# Archivo específico
npx stryker run --mutate "src/services/auth.service.ts"

# Múltiples archivos
npx stryker run --mutate "src/services/auth.service.ts,src/services/payment.service.ts"

# Rango de líneas
npx stryker run --mutate "src/app.ts:1-50"

# Patrón glob
npx stryker run --mutate "src/core/**/*.ts"
```

### 9.4 Concurrencia

```json
{
  "concurrency": 4
}
```

- Por defecto: `cpuCoreCount - 1`.
- Angular compila pesado: usa la mitad de los cores.
- Demasiada concurrencia provoca thrashing de memoria.
- En CI con runners limitados: `"concurrency": 2`.

**Recomendaciones según la máquina:**

| Specs de la máquina | Concurrencia recomendada |
|---------------------|--------------------------|
| 4 cores, 8GB RAM | 2 |
| 8 cores, 16GB RAM | 4-6 |
| 16 cores, 32GB RAM | 8-12 |
| CI runner (2 cores) | 1-2 |

### 9.5 Timeouts

```json
{
  "timeoutMS": 5000,
  "timeoutFactor": 1.5
}
```

Fórmula: timeout por mutante = `tiempoOriginalDelTest * timeoutFactor + timeoutMS`.

Con timeouts más ajustados, los mutantes de bucle infinito mueren antes.

### 9.6 Log level

```json
{
  "logLevel": "info"
}
```

Opciones: `off`, `fatal`, `error`, `warn`, `info`, `debug`, `trace`. Usa `debug` o `trace` solo para diagnosticar problemas.

### 9.7 Reporters disponibles

```json
{
  "reporters": ["html", "clear-text", "progress", "dashboard", "json", "event-recorder"]
}
```

| Reporter | Descripción |
|----------|-------------|
| `html` | Reporte interactivo HTML en `reports/mutation.html` |
| `clear-text` | Resumen en la terminal al finalizar |
| `progress` | Barra de progreso durante la ejecución |
| `dashboard` | Envía resultados al Stryker Dashboard |
| `json` | Archivo JSON con todos los resultados |
| `event-recorder` | Registra los eventos internos (debugging) |
| `dots` | Progreso mínimo (un punto por mutante) |

### 9.8 Ignorers

```json
{
  "ignorers": ["angular"]
}
```

Los ignorers son plugins que marcan nodos del AST como "no mutar". El ignorer `angular` sabe qué partes del código de Angular deben quedarse intactas: metadatos de decoradores, configuración de signals, opciones de `input()`, `output()` y `model()`, etc.

### 9.9 disableTypeChecks

```json
{
  "disableTypeChecks": "{src,test}/**/*.{ts,tsx}"
}
```

- Default: `true` (se aplica al mismo patrón que `mutate`).
- Stryker inyecta `// @ts-nocheck` en la cabecera de cada archivo antes de mutar y elimina otros `// @ts-xxx` para que no interfieran. Sin esto, muchos mutantes dispararían errores de compilación TypeScript y se marcarían `CompileError` sin llegar a ejecutar tests.
- Ponerlo a `false` sólo si se usa `checkers: ["typescript"]` y se prefiere que el checker filtre los mutantes inválidos (ver 12.7). Los dos enfoques son complementarios: `disableTypeChecks` acelera, `typescript-checker` filtra; úsalos juntos sólo con criterio.

### 9.10 ignorePatterns

```json
{
  "ignorePatterns": ["dist", "coverage", ".angular", "node_modules", ".next"]
}
```

Patrones de archivos/carpetas que **no se copian al sandbox** (`.stryker-tmp/`). Diferente de `mutate`:

- `mutate` → qué se muta.
- `ignorePatterns` → qué se **excluye del sandbox**, ahorrando I/O cuando copia el proyecto.

Con 20+ equipos y repos grandes esto reduce dramáticamente el tiempo de setup por run. Por defecto Stryker respeta `.gitignore`, pero patrones adicionales (artefactos de build, caches de frameworks) aceleran notablemente.

### 9.11 tempDirName y cleanTempDir

```json
{
  "tempDirName": ".stryker-tmp",
  "cleanTempDir": true
}
```

- `tempDirName` — directorio sandbox. Cambiarlo si tienes conflictos con watchers (por ejemplo, `.angular/cache`).
- `cleanTempDir` — `true` (default), `false` (conservar) o `'always'` (limpiar incluso si Stryker cashea). Para **cachear `.stryker-tmp/` en CI** (ver sección 14.2), conviene `false` y pasar el directorio como paso explícito de `actions/cache`.

### 9.12 Configuración completa de referencia

```json
{
  "$schema": "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  "testRunner": "vitest",
  "plugins": ["@stryker-mutator/vitest-runner"],
  "coverageAnalysis": "perTest",
  "mutate": [
    "src/**/*.ts",
    "src/**/*.vue",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/**/*.d.ts",
    "!src/environments/**",
    "!src/main.ts",
    "!src/polyfills.ts"
  ],
  "disableTypeChecks": "{src,test}/**/*.{ts,tsx}",
  "ignorePatterns": ["dist", "coverage", ".angular", ".next"],
  "ignorers": ["angular"],
  "reporters": ["html", "clear-text", "progress"],
  "thresholds": {
    "high": 80,
    "low": 60,
    "break": null
  },
  "concurrency": "50%",
  "timeoutMS": 5000,
  "timeoutFactor": 1.5,
  "incremental": true,
  "incrementalFile": "reports/stryker-incremental.json",
  "ignoreStatic": true,
  "tempDirName": ".stryker-tmp",
  "logLevel": "info",
  "mutator": {
    "excludedMutations": []
  },
  "htmlReporter": {
    "fileName": "reports/mutation.html"
  }
}
```

> **`concurrency: "50%"`**: Stryker 9 acepta porcentaje sobre los cores disponibles. Más portable entre máquinas de desarrollo y runners de CI que fijar un número.

---

## 10. Interpretar el reporte HTML de Stryker

El reporte HTML es la herramienta principal para entender los resultados. Se genera por defecto en `reports/mutation.html`.

### 10.1 Abrir el reporte

```bash
# Después de ejecutar Stryker
npx stryker run

# Abrir el reporte (macOS)
open reports/mutation.html

# Linux
xdg-open reports/mutation.html

# O arrastra el archivo al navegador
```

### 10.2 Vista del directorio (nivel superior)

Al abrir el reporte verás un árbol de directorios con la estructura del proyecto y los scores por carpeta y archivo.

```
src/                           75.00% (150/200)
  components/                  80.00% (40/50)
    Button.tsx                 90.00% (9/10)
    Modal.tsx                  70.00% (7/10)
  services/                    65.00% (26/40)
    auth.service.ts            50.00% (5/10)    <-- ROJO
    payment.service.ts         80.00% (16/20)
  utils/                       85.00% (34/40)
    validators.ts              90.00% (18/20)
    formatters.ts              80.00% (16/20)
```

**Navegación:**
- Haz clic en una carpeta para expandirla y ver sus archivos.
- Haz clic en un archivo para abrir la vista detallada con los mutantes inline.
- La barra de color junto a cada entrada muestra el score visualmente.

### 10.3 Código de colores

| Color | Significado | Acción |
|-------|-------------|--------|
| Verde | Score >= threshold `high` | Mantener |
| Amarillo | Score entre `low` y `high` | Revisar; hay margen |
| Rojo | Score < threshold `low` | Prioridad de mejora |

### 10.4 Vista de archivo (detalle inline)

Al hacer clic en un archivo verás el código fuente con anotaciones inline de cada mutante.

Cada mutante aparece como un marcador sobre el código. Al pasar el cursor o hacer clic se despliegan los detalles:

```
 1 | function calculateDiscount(total: number, isMember: boolean): number {
 2 |   if (total > 100 && isMember) {
   |       ^^^^^^^^^^^
   |       [#1] Survived: RelationalOperator
   |       total > 100 -> total < 100
   |
   |              ^^
   |       [#2] Killed: LogicalOperator  
   |       && -> ||
   |
 3 |     return total * 0.1;
   |                 ^^^^^
   |       [#3] Survived: ArithmeticOperator
   |       total * 0.1 -> total / 0.1
   |
 4 |   }
 5 |   return 0;
 6 | }
```

**Información de cada mutante:**
- ID numérico (#1, #2, etc.).
- Estado (Killed, Survived, No Coverage, Timeout).
- Tipo de mutación (RelationalOperator, ArithmeticOperator, etc.).
- Código original frente al mutado.
- Test o tests que lo mataron (si fue killed).

### 10.5 Filtros por estado

En la parte superior del reporte hay botones para mostrar u ocultar mutantes según su estado:

- Killed (verde): ocúltalos para centrarte en los problemas.
- Survived (rojo): muéstralos para ver los tests a mejorar.
- No Coverage (amarillo): muéstralos para localizar código sin tests.
- Timeout (naranja): normalmente se ignoran.
- Ignored (gris): mutantes excluidos por configuración.

**Flujo de trabajo recomendado:**
1. Oculta los `Killed` para limpiar la vista.
2. Revisa los `Survived`. Son los tests débiles.
3. Revisa los `No Coverage`. Ahí faltan tests enteros.
4. Ignora los `Timeout` salvo que sean muchos.

### 10.6 Métricas del reporte

En la parte superior de cada vista verás un resumen:

```
Mutation Score: 75.00%
  Killed: 150   Survived: 30   No Coverage: 15   Timeout: 5
  Total detected: 155   Total undetected: 45   Total valid: 200
```

---

## 11. Casos prácticos: cómo matar mutantes supervivientes

### 11.1 Caso 1: condición de límite (boundary condition)

**Código original:**
```typescript
function canDrive(age: number): boolean {
  return age >= 16;
}
```

**Mutante generado:**
```typescript
// Stryker muta >= a >
function canDrive(age: number): boolean {
  return age > 16;  // MUTANTE: >= -> >
}
```

**Test actual (débil). El mutante sobrevive:**
```typescript
test('puede conducir con 20 años', () => {
  expect(canDrive(20)).toBe(true);
});

test('no puede conducir con 10 años', () => {
  expect(canDrive(10)).toBe(false);
});
```

**Por qué sobrevive.** Ningún test prueba con `age = 16`, el valor límite. Con `>` en vez de `>=`, el resultado para 20 y 10 es el mismo. Solo el valor exacto 16 cambia.

**Test mejorado. El mutante muere:**
```typescript
test('puede conducir con exactamente 16 años', () => {
  expect(canDrive(16)).toBe(true);  // Con >= devuelve true; con >, false
});

test('no puede conducir con 15 años', () => {
  expect(canDrive(15)).toBe(false);
});

test('puede conducir con 17 años', () => {
  expect(canDrive(17)).toBe(true);
});
```

**Lección.** Prueba siempre los valores límite (boundary values): el exacto, uno por debajo y uno por encima.

---

### 11.2 Caso 2: boolean flip (inversión de booleano)

**Código original:**
```typescript
function isEligible(age: number, hasLicense: boolean): boolean {
  if (age >= 18 && hasLicense) {
    return true;
  }
  return false;
}
```

**Mutante generado:**
```typescript
function isEligible(age: number, hasLicense: boolean): boolean {
  if (age >= 18 && hasLicense) {
    return false;  // MUTANTE: true -> false
  }
  return false;
}
```

**Test actual (débil). El mutante sobrevive:**
```typescript
test('no es elegible sin licencia', () => {
  expect(isEligible(20, false)).toBe(false);
});

test('no es elegible siendo menor', () => {
  expect(isEligible(15, true)).toBe(false);
});
```

**Por qué sobrevive.** Solo se prueba el camino `false`. Nadie comprueba que la función devuelva `true` cuando las condiciones se cumplen.

**Test mejorado. El mutante muere:**
```typescript
test('es elegible con 18+ años y licencia', () => {
  expect(isEligible(20, true)).toBe(true);  // Mata el flip true -> false
});

test('no es elegible sin licencia', () => {
  expect(isEligible(20, false)).toBe(false);
});

test('no es elegible siendo menor', () => {
  expect(isEligible(15, true)).toBe(false);
});
```

**Lección.** Prueba las dos ramas de cada condición. Si una función puede devolver `true` o `false`, ten tests para ambos resultados.

---

### 11.3 Caso 3: mutación de string

**Codigo original:**
```typescript
function getErrorMessage(code: number): string {
  if (code === 404) {
    return 'Not Found';
  }
  if (code === 500) {
    return 'Internal Server Error';
  }
  return 'Unknown Error';
}
```

**Mutante generado:**
```typescript
function getErrorMessage(code: number): string {
  if (code === 404) {
    return '';  // MUTANTE: "Not Found" -> ""
  }
  // ...
}
```

**Test actual (débil). El mutante sobrevive:**
```typescript
test('devuelve mensaje para 404', () => {
  const result = getErrorMessage(404);
  expect(result).toBeTruthy();  // solo verifica que no sea vacío/null/undefined
});
```

**Por qué sobrevive.** `toBeTruthy()` comprueba que el valor sea "truthy", pero `""` es falsy... espera, aquí sí detectaría el mutante. Veamos un caso más realista:

```typescript
test('devuelve mensaje para 404', () => {
  const result = getErrorMessage(404);
  expect(result).toBeDefined();  // '' está definido, así que el mutante pasa
});
```

**Test mejorado. El mutante muere:**
```typescript
test('devuelve "Not Found" para código 404', () => {
  expect(getErrorMessage(404)).toBe('Not Found');  // string exacto
});

test('devuelve "Internal Server Error" para código 500', () => {
  expect(getErrorMessage(500)).toBe('Internal Server Error');
});

test('devuelve "Unknown Error" para códigos no mapeados', () => {
  expect(getErrorMessage(418)).toBe('Unknown Error');
});
```

**Lección.** Aserta el valor exacto de los strings, no solo que existan o sean truthy. Usa `toBe()` o `toEqual()` en vez de `toBeTruthy()` o `toBeDefined()`.

---

### 11.4 Caso 4: eliminación de bloque (block removal)

**Código original:**
```typescript
class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    this.validateUser(user);
    this.users.push(user);
    this.notifyAdmins(user);
  }
}
```

**Mutante generado:**
```typescript
class UserService {
  private users: User[] = [];

  addUser(user: User): void {
    // MUTANTE: cuerpo del método eliminado
  }
}
```

**Test actual (débil). El mutante sobrevive:**
```typescript
test('addUser no lanza error', () => {
  const service = new UserService();
  expect(() => service.addUser({ name: 'Ana', email: 'ana@test.com' })).not.toThrow();
});
```

**Por qué sobrevive.** El test solo comprueba que no se lance un error. Una función vacía tampoco lanza. El test no verifica ningún efecto secundario.

**Test mejorado. El mutante muere:**
```typescript
test('addUser añade el usuario a la lista', () => {
  const service = new UserService();
  const user = { name: 'Ana', email: 'ana@test.com' };

  service.addUser(user);

  expect(service.getUsers()).toContainEqual(user);  // Verifica el side effect
});

test('addUser valida el usuario', () => {
  const service = new UserService();
  const invalidUser = { name: '', email: '' };

  expect(() => service.addUser(invalidUser)).toThrow('Invalid user');
});

test('addUser notifica a los admins', () => {
  const service = new UserService();
  const notifySpy = vi.spyOn(service as any, 'notifyAdmins');
  const user = { name: 'Ana', email: 'ana@test.com' };

  service.addUser(user);

  expect(notifySpy).toHaveBeenCalledWith(user);
});
```

**Lección.** Verifica los efectos secundarios de cada función: cambios de estado, llamadas a otros métodos, datos persistidos. No basta con asegurar que "no falla".

---

### 11.5 Caso 5: intercambio aritmético (arithmetic swap)

**Codigo original:**
```typescript
function calculateFinalPrice(price: number, taxRate: number, discount: number): number {
  const taxAmount = price * taxRate;
  const discountAmount = price * discount;
  return price + taxAmount - discountAmount;
}
```

**Mutante generado:**
```typescript
function calculateFinalPrice(price: number, taxRate: number, discount: number): number {
  const taxAmount = price * taxRate;
  const discountAmount = price * discount;
  return price - taxAmount - discountAmount;  // MUTANTE: + -> -
}
```

**Test actual (débil). El mutante sobrevive:**
```typescript
test('calcula el precio final', () => {
  const result = calculateFinalPrice(100, 0.1, 0.1);
  expect(result).toBeGreaterThan(0);  // solo verifica que sea positivo
});
```

**Por qué sobrevive.** Con `price = 100`, `taxRate = 0.1` y `discount = 0.1`:
- Original: `100 + 10 - 10 = 100`.
- Mutante: `100 - 10 - 10 = 80`.

Ambos son mayores que cero; el test no ve la diferencia.

**Test mejorado. El mutante muere:**
```typescript
test('calcula correctamente precio con impuesto y descuento', () => {
  // price=100, tax=21%, discount=10%
  // 100 + 21 - 10 = 111
  expect(calculateFinalPrice(100, 0.21, 0.1)).toBe(111);
});

test('calcula correctamente sin descuento', () => {
  // 100 + 21 - 0 = 121
  expect(calculateFinalPrice(100, 0.21, 0)).toBe(121);
});

test('calcula correctamente sin impuesto', () => {
  // 100 + 0 - 10 = 90
  expect(calculateFinalPrice(100, 0, 0.1)).toBe(90);
});
```

**Lección.** Aserta valores calculados exactos, no rangos ni signos. Elige inputs que produzcan resultados distintos para cada mutación posible.

---

### 11.6 El mismo análisis en un componente React

Los ejemplos anteriores son funciones puras para que el principio se vea limpio. En un componente de UI (React, Vue o Angular) la mecánica es idéntica: Stryker muta la condición y el test tiene que notar la diferencia.

**Componente original:**
```tsx
export function PriceDisplay({ price }: { price: number }) {
  if (price > 100) {
    return <span className="high">Precio alto: {price}€</span>;
  }
  return <span>Precio: {price}€</span>;
}
```

**Mutantes que genera Stryker en este bloque:**
- `EqualityOperator`: `price > 100` → `price >= 100`, `price < 100`.
- `ConditionalExpression`: `if (price > 100)` → `if (true)`, `if (false)`.
- `StringLiteral`: `"high"` → `""`, `"Precio alto: "` → `""`.
- `BlockStatement`: cuerpo del `if` vaciado.

**Test débil. Los mutantes sobreviven:**
```tsx
it('renderiza el precio', () => {
  render(<PriceDisplay price={150} />);
  expect(screen.getByText(/150/)).toBeInTheDocument();
});
```

Este test solo comprueba que aparece el número. Da igual si Stryker muta `>` por `>=` o si elimina la clase `"high"`. La aserción pasa igual.

**Test sólido. El mutante `>` → `>=` muere:**
```tsx
it.each([
  [99, false],   // justo por debajo del límite
  [100, false],  // el valor exacto (mata `>` → `>=`)
  [101, true],   // justo por encima
])('price=%d, aplica clase high=%s', (price, expected) => {
  const { container } = render(<PriceDisplay price={price} />);
  const span = container.querySelector('span');
  expect(span?.classList.contains('high')).toBe(expected);
  expect(span?.textContent).toContain(`${price}`);
});
```

El test con `price={100}` es el que mata el mutante boundary. Con el código original, `100 > 100` es `false` y no se aplica la clase. Con el mutante `100 >= 100` es `true` y sí se aplica. El test lo ve.

**Lección.** El análisis (boundary, flip booleano, string literal, bloque vaciado) es el mismo en una función de dominio y en un componente. El único cambio es cómo lees la salida: aserciones sobre el DOM renderizado en vez de sobre un valor de retorno.

### 11.7 Resumen de patrones

| Tipo de mutante | Causa raíz | Solución |
|-----------------|------------|----------|
| Boundary (`>=` -> `>`) | No se testean valores límite | Añadir tests en el boundary exacto |
| Boolean flip (`true` -> `false`) | Solo se testea una rama | Probar ambos caminos |
| String (`"error"` -> `""`) | Se verifica "truthy", no el valor exacto | Asertar el string exacto |
| Block removal (`{ code }` -> `{}`) | El test verifica que no lanza, no qué hace | Verificar efectos secundarios |
| Aritmético (`+` -> `-`) | Se verifica non-null, no el valor | Asertar el valor calculado exacto |
| Lógico (`&&` -> `\|\|`) | No se testean todas las combinaciones | Probar combinaciones distintas de inputs |
| Negación (`!a` -> `a`) | Solo se prueba un caso | Probar con `true` y `false` |

---

## 12. Optimización de rendimiento (crítico)

El mutation testing es lento por naturaleza. Un proyecto con 2.000 mutantes y una suite de 5 s puede tardar más de 2,8 horas.

### 12.1 Benchmarks de referencia

**Tiempos aproximados según el tamaño del proyecto:**

| Tamaño del proyecto | Mutantes | Tiempo sin optimizar | Tiempo con incremental |
|---------------------|----------|---------------------|----------------------|
| Pequeño (< 50 archivos) | 200-500 | 5-15 min | 1-3 min |
| Mediano (50-200 archivos) | 500-2000 | 15 min - 1,5 h | 3-10 min |
| Grande (200-500 archivos) | 2000-5000 | 1,5 - 4 h | 10-30 min |
| Muy grande (500+ archivos) | 5000+ | 4+ h | 30 min - 1 h |

**Factores que afectan al tiempo:**
- Número de mutantes generados.
- Velocidad de la suite de tests.
- Número de tests.
- Concurrencia disponible (cores y RAM).
- Uso del TypeScript checker.

### 12.2 Modo incremental (mayor impacto)

```bash
npx stryker run --incremental
```

**Cómo funciona por dentro:**

1. **Primera ejecución:** corre todos los mutantes y guarda los resultados en `reports/stryker-incremental.json`.
2. **Ejecuciones posteriores:**
   - Lee el archivo incremental anterior.
   - Compara cada archivo fuente y cada test con un algoritmo de diff.
   - Identifica qué mutantes han cambiado (porque cambió el archivo donde viven).
   - Identifica qué tests han cambiado.
   - Solo re-ejecuta los mutantes afectados.
   - Reutiliza del caché los resultados de los mutantes sin cambios.

**El algoritmo de diff:**
- Stryker guarda un hash de cada archivo fuente y de cada test.
- Si cambia un archivo fuente, todos sus mutantes se re-ejecutan.
- Si cambia un archivo de test, los mutantes que cubría se re-ejecutan.
- Los mutantes en archivos intactos mantienen su resultado anterior.

**Impacto real.** El caso que documenta el propio equipo de Stryker en su guía oficial (el mismo proyecto sobre el que se diseñó la feature) arroja un reparto muy gráfico: **de 3.965 mutantes, solo 234 se re-testean** tras un cambio pequeño. Reducción cercana al 94 %.

> Ejemplo tomado de la documentación oficial de StrykerJS: en la ejecución incremental, "3.731 of 3.965 mutant result(s)" se reutilizan del run anterior.
>
> > **Fuente:** Stryker — Incremental mode. https://stryker-mutator.io/docs/stryker-js/incremental/
> >
> > **Fuente:** Announcing StrykerJS incremental mode. https://stryker-mutator.io/blog/announcing-incremental-mode/

```json
{
  "incremental": true,
  "incrementalFile": "reports/stryker-incremental.json"
}
```

Forzar re-ejecución completa:
```bash
npx stryker run --incremental --force
```

**Importante.** Añade `reports/stryker-incremental.json` a tu `.gitignore`, salvo que quieras compartirlo entre desarrolladores.

### 12.3 Análisis de coverage perTest

Stryker usa la información de coverage para saber qué tests cubren qué mutantes. En vez de ejecutar toda la suite para cada mutante, lanza solo los tests relevantes.

**Cómo funciona:**
1. Stryker ejecuta todos los tests una vez con coverage instrumentado.
2. Registra qué líneas de código cubre cada test.
3. Para cada mutante, solo ejecuta los tests que cubren la línea mutada.
4. Si un mutante está en la línea 42 y solo 3 de 200 tests pasan por ahí, solo corren esos 3 tests.

Con el Vitest runner, el análisis perTest es automático y no se puede desactivar.

### 12.4 Ignorar mutantes estáticos

```json
{
  "ignoreStatic": true
}
```

Los mutantes estáticos están en código que se ejecuta al cargar el módulo (top-level):

```typescript
// Estos son mutantes estáticos:
const MAX_RETRIES = 3;           // top-level
const TIMEOUT = 5000;            // top-level
const REGEX = /^[a-z]+$/;        // top-level

export function validate(input: string): boolean {
  // Los mutantes DENTRO de funciones NO son estáticos
  return REGEX.test(input) && input.length > MAX_RETRIES;
}
```

Los mutantes estáticos obligan a ejecutar todos los tests, porque cualquiera podría importar el módulo. Ignorarlos recorta mucho tiempo.

### 12.5 Cuándo usar `--mutate` para archivos específicos

> **Aclaración importante.** Stryker no tiene un flag `--since` como Jest o Vitest. Para restringirlo a los archivos cambiados, pasa el resultado de `git diff --name-only` a `--mutate`. El modo "PR-only" es exactamente la composición que aparece abajo.

```bash
# Durante desarrollo: solo el archivo en el que estás trabajando
npx stryker run --mutate "src/services/auth.service.ts"

# Antes de un PR: solo los archivos cambiados (equivalente al "--since" que no existe)
CHANGED=$(git diff --name-only origin/main...HEAD -- 'src/**/*.ts' | grep -v '.spec.ts' | tr '\n' ',')
npx stryker run --incremental --mutate "$CHANGED"

# Para un módulo completo
npx stryker run --mutate "src/core/**/*.ts"

# Para un rango de líneas específico (debug de un mutante)
npx stryker run --mutate "src/services/auth.service.ts:45-60"
```

### 12.6 Configurar la concurrencia según la máquina

```json
{
  "concurrency": 4
}
```

**Regla general:** `cores - 1`, o `cores / 2` si la compilación es pesada.

**Monitorizar el uso de recursos:**
```bash
# Antes de ejecutar Stryker, en otra terminal:
# macOS
top -l 0 -s 2

# Linux
htop
```

Si la máquina se queda sin memoria y empieza a hacer swap, baja la concurrencia. Si los cores no están al 100%, súbela.

### 12.7 TypeScript checker

```bash
npm install --save-dev @stryker-mutator/typescript-checker
```

```json
{
  "checkers": ["typescript"],
  "tsconfigFile": "tsconfig.json"
}
```

El checker valida que cada mutante compila antes de ejecutar los tests. Los mutantes con errores de compilación se marcan como `Compile Error` y se saltan, así que no gastas tiempo corriendo tests destinados a fallar.

**Impacto típico:** descarta un 10-20% de mutantes inválidos en proyectos TypeScript estrictos.

### 12.8 Resumen de estrategias

| Estrategia | Impacto | Esfuerzo |
|------------|---------|----------|
| Modo incremental | ALTO | Bajo (1 flag) |
| Solo archivos cambiados (CI) | ALTO | Medio |
| Ignorar mutantes estáticos | MEDIO-ALTO | Bajo (1 flag) |
| TypeScript checker | MEDIO | Bajo |
| Selección dirigida de archivos | MEDIO | Bajo |
| Excluir mutaciones de bajo valor | BAJO-MEDIO | Bajo |
| Ajustar concurrencia | BAJO-MEDIO | Bajo |

---

## 13. Mutantes equivalentes y falsos positivos

### 13.1 Qué son los mutantes equivalentes

Un mutante equivalente es una mutación que no cambia el comportamiento observable del programa. Da igual cuántos tests escribas: nunca podrás "matarlo", porque se comporta igual que el original.

**Ejemplo 1. Matemáticamente equivalente.**
```typescript
// ORIGINAL
function absolute(x: number): number {
  return x >= 0 ? x : -x;
}

// MUTANTE: >= mutado a >
function absolute(x: number): number {
  return x > 0 ? x : -x;  // Cuando x === 0, -0 === 0 en JavaScript
}
```

Con `x = 0`, el original devuelve `0` y el mutante devuelve `-0`. Pero en JavaScript, `0 === -0` es `true`. El mutante es equivalente.

**Ejemplo 2. Código muerto.**
```typescript
function process(items: string[]): string[] {
  const result = items.filter(item => item.length > 0);
  return result;
  // ORIGINAL: console.log('done');  <- código inalcanzable
  // MUTANTE: { } (bloque eliminado)
}
```

Si hay código después de un `return`, eliminarlo no cambia nada.

**Ejemplo 3. Redundancia lógica.**
```typescript
// Si `value` siempre es un número positivo por el contexto de uso:
function isPositive(value: number): boolean {
  return value > 0;  // Mutante: value >= 0
}
// Si value nunca es 0 en la práctica, el mutante es equivalente
```

### 13.2 Cómo identificar mutantes equivalentes

1. Revisa el reporte y busca mutantes survived que parezcan imposibles de matar.
2. Piensa en el dominio: ¿el valor mutado nunca ocurre en la práctica (por ejemplo, siempre positivo)?
3. Ten en cuenta la semántica del lenguaje: `0 === -0`, `NaN !== NaN`, etc.
4. Comprueba si el código mutado es inalcanzable.
5. Intenta manualmente escribir un test que falle. Si no puedes, probablemente sea equivalente.

### 13.3 Cómo suprimir mutantes con comentarios

Stryker permite desactivar mutantes concretos con comentarios:

```typescript
// Desactivar UN tipo de mutación en la siguiente línea
// Stryker disable next-line EqualityOperator: mutante equivalente, x siempre >= 0
return x >= 0 ? x : -x;

// Desactivar TODOS los mutantes en la siguiente línea
// Stryker disable next-line all: mutante equivalente
return x >= 0 ? x : -x;

// Desactivar un bloque completo
// Stryker disable all: configuración estática, no necesita mutation testing
const CONFIG = {
  timeout: 5000,
  retries: 3,
  baseUrl: 'https://api.example.com',
};
// Stryker restore all

// Desactivar un tipo específico en todo el archivo (al inicio del archivo)
// Stryker disable StringLiteral: este archivo tiene muchas constantes de texto
```

**Tipos de mutación para los comentarios.** Usa el nombre exacto del tipo: `EqualityOperator`, `ArithmeticOperator`, `LogicalOperator`, `ConditionalExpression`, `BooleanLiteral`, `StringLiteral`, `BlockStatement`, `ArrayDeclaration`, `ObjectLiteral`, `UnaryOperator`, `UpdateOperator`, `OptionalChaining`, `MethodExpression`, `AssignmentOperator`, `RegexLiteral`.

### 13.4 Cuándo aceptar un score imperfecto

No persigas el 100%. Un mutation score perfecto no es realista ni deseable:

- 75-85% es un objetivo excelente para la mayoría de proyectos.
- 85-95% encaja en código crítico (autenticación, pagos, lógica core).
- 100% suele indicar que estás suprimiendo mutantes o que el código es muy simple.

**Razones para aceptar mutantes survived:**
1. Mutantes equivalentes: no se pueden matar por definición.
2. Bajo impacto de negocio: el código mutado no es crítico.
3. Coste desproporcionado: el test sería muy complejo para un beneficio mínimo.
4. Configuración y constantes: timeouts, URLs y similares se cubren en tests de integración.

---

## 14. Stryker en el flujo de trabajo del equipo

> **Contexto del equipo.** Si todavía no tienes CI/CD (objetivo para junio según el plan actual), la tabla 14.1 sigue valiendo en local. "Desarrollo local" y "pre-commit manual" son los puntos de entrada hasta que exista runner. La sección 14.2 (GitHub Actions) es la receta *para cuando la infra esté disponible*, no un prerrequisito para empezar a subir el score.

### 14.1 Cuándo ejecutar mutation testing

| Momento | Qué ejecutar | Por qué |
|---------|-------------|---------|
| **Desarrollo local** | `--mutate "archivo.ts"` | Feedback rápido del archivo actual |
| **Pre-commit** | No recomendado | Demasiado lento para un hook |
| **Pull Request** | `--incremental --mutate "archivos cambiados"` | Validar la calidad de los tests nuevos |
| **Nightly CI** | Ejecución completa con `--incremental` | Baseline actualizado del proyecto |
| **Release** | Ejecución completa (opcional) | Verificación final |

### 14.2 Integración con GitHub Actions (ejemplo completo)

```yaml
name: Mutation Testing

on:
  pull_request:
    branches: [main, develop]
    paths:
      - 'src/**/*.ts'
      - 'src/**/*.vue'
  schedule:
    # Ejecucion nocturna completa de lunes a viernes a las 2 AM UTC
    - cron: '0 2 * * 1-5'

jobs:
  mutation-test-pr:
    # Solo para PRs: ejecutar solo sobre archivos cambiados
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Necesario para git diff

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Get changed source files
        id: changed
        run: |
          CHANGED=$(git diff --name-only origin/main...HEAD -- 'src/**/*.ts' 'src/**/*.vue' | grep -v -E '\.(spec|test)\.' | tr '\n' ',' | sed 's/,$//')
          echo "files=$CHANGED" >> $GITHUB_OUTPUT
          echo "Changed files: $CHANGED"

      - name: Run Stryker on changed files
        if: steps.changed.outputs.files != ''
        run: npx stryker run --incremental --mutate "${{ steps.changed.outputs.files }}"

      - name: Upload mutation report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report
          path: reports/mutation.html
          retention-days: 14

  mutation-test-nightly:
    # Ejecucion nocturna completa
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    timeout-minutes: 120
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Cache Stryker incremental + sandbox
        uses: actions/cache@v4
        with:
          # stryker-incremental.json → evita re-ejecutar mutantes sin cambios.
          # .stryker-tmp/ → reutiliza el sandbox (transpilación + instrumentación).
          path: |
            reports/stryker-incremental.json
            .stryker-tmp
          key: stryker-${{ github.ref }}-${{ hashFiles('package-lock.json') }}
          restore-keys: |
            stryker-${{ github.ref }}-
            stryker-

      - name: Run Stryker (full)
        run: npx stryker run --incremental
        env:
          STRYKER_DASHBOARD_API_KEY: ${{ secrets.STRYKER_DASHBOARD_API_KEY }}

      - name: Upload mutation report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: mutation-report-nightly
          path: reports/mutation.html
          retention-days: 30
```

### 14.3 Stryker Dashboard para tracking histórico

El Stryker Dashboard permite visualizar cómo evoluciona el mutation score con el tiempo.

**Configuración:**

1. Regístrate en https://dashboard.stryker-mutator.io (autenticación con GitHub).
2. Obtén el API key del dashboard.
3. Configura el secreto en GitHub: Settings → Secrets → `STRYKER_DASHBOARD_API_KEY`.
4. Añade el reporter a la configuración:

```json
{
  "reporters": ["html", "clear-text", "progress", "dashboard"],
  "dashboard": {
    "project": "github.com/tu-org/tu-repo",
    "version": "main",
    "module": "frontend",
    "baseUrl": "https://dashboard.stryker-mutator.io/api/reports"
  }
}
```

**Para monorepos,** usa `dashboard.module` para distinguir cada paquete:
```json
{
  "dashboard": {
    "module": "packages/web-app"
  }
}
```

**Badge para el README:**
```markdown
[![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2Ftu-org%2Ftu-repo%2Fmain)](https://dashboard.stryker-mutator.io/reports/github.com/tu-org/tu-repo/main)
```

### 14.4 Comentarios de PR con Mutation Score (delta)

Lo útil no es el score absoluto del PR — es el **delta** contra main. Añade `"json"` a los reporters (genera `reports/mutation.json`) y compara con la última corrida de `main` (artefacto o Dashboard).

```yaml
      - name: Download main baseline
        uses: dawidd6/action-download-artifact@v6
        with:
          branch: main
          name: mutation-report-nightly
          path: baseline/
          if_no_artifact_found: warn

      - name: Comment PR with mutation score delta
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const current = JSON.parse(fs.readFileSync('reports/mutation.json', 'utf8'));
            const curScore = current.metrics?.mutationScore ?? 0;

            let baseScore = null;
            try {
              const base = JSON.parse(fs.readFileSync('baseline/mutation.json', 'utf8'));
              baseScore = base.metrics?.mutationScore ?? null;
            } catch (_) { /* sin baseline todavía */ }

            const delta = baseScore !== null ? (curScore - baseScore).toFixed(2) : 'n/a';
            const emoji = baseScore === null ? 'ℹ️' : (curScore >= baseScore ? '✅' : '⚠️');

            const body = `## ${emoji} Mutation Score

            - **PR**: ${curScore.toFixed(2)}%
            - **main (baseline)**: ${baseScore === null ? 'n/a' : baseScore.toFixed(2) + '%'}
            - **Δ**: ${delta}%

            Reporte HTML completo en los artefactos del workflow.`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body,
            });
```

Si el delta es negativo, el PR está empeorando la calidad real de los tests. Es una señal directa de que se añadió código sin asserts sólidos.

---

## 15. Workflow real de desarrollo

### 15.1 Desarrollo local

```bash
# 1. Trabaja en un módulo
# 2. Ejecuta mutation testing sobre ese módulo
npx stryker run --mutate "src/services/order.service.ts"

# 3. Abre el reporte
open reports/mutation.html

# 4. Revisa los mutantes supervivientes
# 5. Mejora los tests
# 6. Re-ejecuta (con incremental, para que sea rápido)
npx stryker run --incremental --mutate "src/services/order.service.ts"

# 7. Commit cuando el score sea aceptable
```

### 15.2 Adopción progresiva

1. **Empieza pequeño.** Un módulo crítico (autenticación, pagos, validación).
2. **Modo informativo.** `"break": null` al principio: solo observas.
3. **Revisa.** Localiza los mutantes supervivientes con más impacto.
4. **Mejora.** Arregla primero los tests más débiles.
5. **Baseline.** Cuando esté estable, pon `"break"` al score actual menos cinco puntos.
6. **Expande.** Suma más módulos al array `mutate`.
7. **Trackea.** Sigue la tendencia: importa más la mejora que el número absoluto.

### 15.2.1 Roadmap de mutation score: de 22 % a 60 %+

Un proyecto típico no pasa de 20 % a 80 % de forma lineal. Hay tres fases y cada una tiene sus propias palancas. Atacarlas en el orden correcto es lo que diferencia a los equipos que se estancan en el 30 % de los que llegan al 60 %+.

> El itinerario que aparece a continuación está calibrado sobre una suite grande en producción (equipo de 20+ squads) que pasó de **10,29 % → 22,59 %** en cuatro meses y que ahora apunta al **60 %+**. Los porcentajes son reales; el contexto se describe genérico a propósito.

| Fase | Score | Qué atacar | Palanca principal |
|---|---|---|---|
| **1** | 22 % → 35 % | **NoCoverage** — archivos sin ningún test | Añadir tests mínimos (incluso "happy path") a los archivos huérfanos |
| **2** | 35 % → 50 % | **Survived en `ConditionalExpression` y `EqualityOperator`** | Boundary testing: off-by-one, `<` vs `<=`, `==` vs `===` |
| **3** | 50 % → 60 %+ | **Error paths y short-circuits** | Tests de ramas de error, `LogicalOperator` con null/undefined, rejected promises |

**Fase 1 (22 % → 35 %). Atacar NoCoverage**

Los mutantes `NoCoverage` son peores que los `Survived`. Aquí no es que haya un test débil: es que no hay test. Cualquier assertion en esa ruta sube el score.

- Abre el reporte HTML y filtra por `NoCoverage`.
- Ordena por archivo. Los que más mutantes tienen son los que más impacto dan.
- Un test "happy path" básico (`expect(result).toBeDefined()`) ya mata un porcentaje sustancial.
- No busques perfección aquí. Busca cobertura.

**Fase 2 (35 % → 50 %). Boundary testing**

Los dos operadores que más mutantes generan son `ConditionalExpression` (if/ternary) y `EqualityOperator` (`>`, `>=`, `<`, `<=`, `===`, `!==`). Stryker los muta de forma constante porque son la base de la lógica de negocio.

Patrón de ataque:

```typescript
// Código
function canVote(age: number): boolean {
  return age >= 18;
}

// Test débil: sobreviven muchos mutantes
it('permite votar', () => {
  expect(canVote(25)).toBe(true);
  expect(canVote(10)).toBe(false);
});

// Test sólido: mata boundary mutants (>, >=, >)
it.each([
  [17, false], // justo por debajo
  [18, true],  // el límite exacto
  [19, true],  // justo por encima
])('edad %d → %s', (age, expected) => {
  expect(canVote(age)).toBe(expected);
});
```

Si `canVote` tiene `>=` y Stryker muta a `>`, el test débil pasa: 25 > 18 sigue siendo `true`. El test sólido falla porque `canVote(18)` devuelve `false` con el mutante.

**Fase 3 (50 % → 60 %+). Error paths y short-circuits**

A partir del 50%, los mutantes "fáciles" se acaban. Los que quedan están en:

- Bloques `catch` que nadie testea (rejected promises, errores HTTP).
- Short-circuits en `LogicalOperator`: `user && user.name` mutado a `user || user.name`.
- Chequeos de null/undefined: `value ?? default` mutado a `value`.
- Guards tempranos: `if (!input) return;`. ¿Qué pasa cuando `input` es falsy?

```typescript
// Test de error path
it('lanza si el servicio falla', async () => {
  vi.spyOn(api, 'getUser').mockRejectedValueOnce(new Error('500'));

  await expect(service.loadUser(1)).rejects.toThrow('500');
  expect(logger.error).toHaveBeenCalled();
});

// Test de short-circuit
it.each([
  [null, 'Guest'],
  [undefined, 'Guest'],
  [{ name: '' }, 'Guest'], // edge case: string vacío
  [{ name: 'Ana' }, 'Ana'],
])('getName(%o) → %s', (user, expected) => {
  expect(getName(user)).toBe(expected);
});
```

#### Patrones que suben el score más rápido

1. `it.each` parametrizado: explora varias combinaciones sin duplicar código.
2. Asserts sobre valores específicos, no sobre "truthy". `expect(x).toBe(42)` mata más mutantes que `expect(x).toBeTruthy()`.
3. Tests de ramas de error: `try/catch`, `rejectedValueOnce`, HTTP 4xx y 5xx.
4. Property-based testing con `fast-check` para lógica crítica (validadores, parsers).
5. Tests de contratos de API cuando el código depende de una forma exacta de respuesta.

#### Antipatrones que frenan el score

- Perseguir el 100%. Tras 75-80% los retornos decrecen y los mutantes equivalentes son inevitables.
- Excluir archivos para inflar el score. Revisa los diffs de `stryker.conf.js` en el PR review.
- Tests sin assert (`render(<X/>)` sin `expect`). Pasan coverage pero fallan mutation testing. Eso es bueno: lo expone.
- Snapshots gigantes. Matan mutantes por accidente y se rompen con cualquier cambio menor.

#### Cadencia sugerida por equipo

- **Primer trimestre** (arrancando en torno al 22 %): foco en la fase 1 (NoCoverage). Objetivo: 35 %.
- **Segundo trimestre** (cuando entre la ejecución en CI/CD): foco en la fase 2. Objetivo: 50 %. Integra en los PR la ejecución solo sobre archivos cambiados vía `git diff --name-only origin/main...HEAD` + `--incremental --mutate` (ver sección 12.5).
- **Tercer trimestre** (una vez consolidado): fase 3. Objetivo: 60 %+ en módulos críticos.

Subir `thresholds.break` +5 % cada quarter evita regresiones y empuja la adopción sin asfixiar al equipo.

### 15.3 Dónde enfocar el mutation testing

**Prioridad alta:**
- Lógica de autenticación y autorización.
- Cálculos financieros y de pagos.
- Validación y sanitización de datos.
- Reglas de negocio.
- Lógica de stores y reducers.
- Utilidades con lógica compleja.

**Prioridad baja:**
- Renderizado de UI (templates).
- Archivos de configuración.
- Código generado.
- Getters y setters simples.
- Wrappers sobre librerías de terceros.

---

## 16. Desactivar mutantes específicos

Cuando un mutante es equivalente o irrelevante:

```typescript
// Desactivar un tipo de mutación en la siguiente línea
// Stryker disable next-line EqualityOperator: mutante equivalente, a siempre >= 0
return a >= 0 ? a : -a;

// Desactivar todos los mutantes en un bloque
// Stryker disable all: este bloque genera solo mutantes equivalentes
const CONFIG = {
  timeout: 5000,
  retries: 3,
};
// Stryker restore all

// Desactivar en la misma línea
return value; // Stryker disable line StringLiteral
```

---

## 17. FAQ: preguntas frecuentes sobre Stryker

### ¿Por qué tarda tanto?

El mutation testing tiene una complejidad computacional inherente: `O(M x T)`, donde M es el número de mutantes y T el tiempo de la suite de tests. Si tienes 1.000 mutantes y la suite tarda 3 s, te vas a 3.000 s (50 min) sin optimizaciones.

**Stryker lo mitiga con:**
- perTest coverage: solo ejecuta los tests relevantes para cada mutante.
- Modo incremental: reutiliza resultados anteriores.
- Mutant schemata: evita recompilar para cada mutante.
- Concurrencia: ejecuta varios mutantes en paralelo.
- Bail on first failure: corta los tests en cuanto uno falla.

**Consejo.** Ejecuta Stryker solo sobre los archivos que has cambiado. La ejecución completa es para el CI nocturno.

### ¿Necesito el 100% de mutation score?

No. Un mutation score del 100% no es realista ni deseable:

- 80%+ es excelente para la mayoría de proyectos.
- 85-90% es un muy buen objetivo para código crítico.
- Perseguir el 100% lleva a tests frágiles que se rompen con cualquier refactor, a tiempo desproporcionado en mutantes de bajo valor y a suprimir mutantes equivalentes en exceso.

Lo importante es la tendencia. Si tu score sube de 60% a 75% en un trimestre, eso vale más que mantener un 95% artificial.

### ¿Puedo usarlo en CI?

Sí, y es muy recomendable. Con estas consideraciones:

- En PRs: usa `--incremental` y `--mutate` solo sobre archivos cambiados.
- Nightly: ejecución completa con `--incremental` para mantener el caché.
- Timeout: configura un timeout razonable en el job de CI (30-60 min para PRs).
- No bloquees los PRs al principio: empieza con `"break": null` y ajusta gradualmente.

```bash
# Ejemplo para CI en PRs
npx stryker run --incremental --mutate "$(git diff --name-only origin/main...HEAD -- 'src/**/*.ts' | grep -v '.spec.ts' | tr '\n' ',')"
```

### ¿Funciona con monorepos?

Sí. Usa `dashboard.module` para diferenciar cada paquete:

```json
// packages/web-app/stryker.config.json
{
  "dashboard": {
    "module": "packages/web-app"
  },
  "mutate": ["src/**/*.ts", "!src/**/*.spec.ts"]
}

// packages/api/stryker.config.json
{
  "dashboard": {
    "module": "packages/api"
  },
  "mutate": ["src/**/*.ts", "!src/**/*.spec.ts"]
}
```

Cada paquete tendrá su propio reporte y su score en el Dashboard. Ejecuta Stryker desde el directorio de cada paquete:

```bash
cd packages/web-app && npx stryker run
cd packages/api && npx stryker run
```

### ¿Qué pasa con los tests de integración?

Los tests de integración ayudan a matar mutantes porque:
- Cubren flujos completos que los unit tests se pierden.
- Verifican la interacción entre módulos.
- Detectan mutantes en el código "de pegamento".

A cambio:
- Son más lentos y alargan la ejecución de Stryker.
- Con Vitest, Stryker ejecuta todos los tests que cubren un mutante, incluidos los de integración.
- Si tienes tests de integración muy lentos, puedes excluirlos desde la configuración de Vitest.

**Recomendación.** Mantén los tests de integración en la suite. Stryker ya sabe ejecutar solo los relevantes.

### ¿Puedo ignorar ciertos archivos o carpetas?

Sí, con patrones de exclusión en `mutate`:

```json
{
  "mutate": [
    "src/**/*.ts",
    "!src/**/*.spec.ts",
    "!src/**/*.test.ts",
    "!src/**/*.d.ts",
    "!src/environments/**",
    "!src/main.ts",
    "!src/polyfills.ts",
    "!src/**/*.module.ts",
    "!src/**/*.routes.ts"
  ]
}
```

### ¿Cómo comparo mi score con otros proyectos?

No los compares. El score depende de:
- Los tipos de mutaciones habilitados.
- El tipo de código (lógica, UI, configuración).
- Las exclusiones configuradas.
- La complejidad del dominio.

Compara tu score consigo mismo a lo largo del tiempo. Importa la tendencia.

---

## 18. Conexión con los antipatrones de test

Cada antipatrón de [`09-buenas-practicas.md`](./09-buenas-practicas.md) deja huella concreta en el reporte de Stryker. Usa esta tabla para ir del síntoma al remedio:

| Mutante survived con este nombre... | Normalmente indica... | Antipatrón relacionado |
|---|---|---|
| `ConditionalExpression`, `EqualityOperator` | Falta boundary testing | #7 Asserts genéricos |
| `BlockStatement` con cuerpo vaciado | Test verifica "no throw", no side-effects | #1 Testar implementación / #4 Promesa sin await |
| `StringLiteral` → `""` | Assert con `toBeTruthy` en vez de `toBe("valor")` | #7 Asserts genéricos |
| `BooleanLiteral` → flip | Sólo se testea una rama | #8 Test bola de nieve |
| `LogicalOperator` && ↔ \|\| | Falta cubrir combinaciones edge (null/undefined) | #7 + #4 |
| `OptionalChaining` `?.` → `.` | No hay test con objeto `null`/`undefined` | #4 Sin await + #7 |
| `RegexLiteral` | Validador sin tests en los límites del patrón | #7 + falta de `it.each` |
| `NoCoverage` masivo en un módulo | Archivo sin `*.spec.ts` asociado | Ninguno — es fase 1 del roadmap |

Fase del roadmap 15.2.1 ↔ antipatrón dominante:

- **Fase 1 (22 → 35%):** antipatrón #4 (tests sin assertar) y archivos huérfanos.
- **Fase 2 (35 → 50%):** antipatrón #7 (asserts genéricos).
- **Fase 3 (50 → 60%+):** antipatrones #4 y #10 (mocks residuales), más la falta de tests de error paths.

---

## 19. Referencias

- Documentación oficial: https://stryker-mutator.io/docs/stryker-js/introduction/
- Configuración completa: https://stryker-mutator.io/docs/stryker-js/configuration/
- Modo incremental: https://stryker-mutator.io/docs/stryker-js/incremental/
- Lista de mutators: https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/
- Dashboard público: https://dashboard.stryker-mutator.io/
- Repo GitHub: https://github.com/stryker-mutator/stryker-js
- Artículo original mutation testing: DeMillo, Lipton & Sayward, "Hints on Test Data Selection" (IEEE Computer, 1978).

---

## Fuentes

Las fuentes que sostienen los datos numéricos y las afirmaciones sobre herramientas a lo largo de esta sección.

- **Stryker — documentación oficial.** https://stryker-mutator.io/docs/ — concepto, configuración y operadores.
- **Stryker — Incremental mode (guía oficial).** https://stryker-mutator.io/docs/stryker-js/incremental/ — origen del ejemplo "3.965 mutantes, 234 re-testean".
- **Stryker — Announcing incremental mode (blog).** https://stryker-mutator.io/blog/announcing-incremental-mode/ — contexto y diseño.
- **Stryker — Announcing StrykerJS 7.0 (soporte Vitest).** https://stryker-mutator.io/blog/announcing-stryker-js-7/
- **Stryker — releases y notas de versión.** https://github.com/stryker-mutator/stryker-js/releases — versionado (v9.6.x, retirada de Node 18).
- **Stryker — Vitest runner.** https://stryker-mutator.io/docs/stryker-js/vitest-runner/ — `perTest` forzado y aceleración respecto al runner de Jest.
- **Stryker — Supported Mutators.** https://stryker-mutator.io/docs/mutation-testing-elements/supported-mutators/ — incluye `weapon-regex` para `RegexLiteral`.
- **Stryker — Mutant states and metrics.** https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/ — definición de Killed/Survived/NoCoverage/Timeout.
- **Stryker — Equivalent mutants.** https://stryker-mutator.io/docs/mutation-testing-elements/equivalent-mutants/
- **DeMillo, Lipton & Sayward (1978).** *Hints on Test Data Selection*. IEEE Computer — origen académico del mutation testing.
- **Offutt & Untch (2001).** *Mutation 2000: Uniting the Orthogonal* — revisión del estado del arte de la técnica, base conceptual de los operadores que usa Stryker.
- **KPIs "10,29 % → 22,59 % → 60 %+".** Datos reales de una suite grande en producción (equipo de 20+ squads) utilizada como caso de referencia en el taller. Se muestran anonimizados.
