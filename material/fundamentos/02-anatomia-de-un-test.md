# Anatomía de un test

> Taller 1 — Fundamentos del Testing Frontend | Sección 1
> Modalidad: **explicación** (conceptos transversales antes de pisar el runner). Los ejemplos ejecutables llegan en `04-primer-componente.md`.
> **Prerrequisitos:** `01-por-que-testear.md` (por qué merece la pena invertir en tests).
> **Tiempo estimado:** 15 min de lectura.
> **Stack de referencia:** Vitest 4.x · TypeScript 5.x · Node 20+. Validado 2026-04.

En esta sección fijamos el vocabulario común del resto del taller. Vamos a ver cómo se nombra un test, cómo se estructura por dentro y por qué puede llegar al 100% de coverage sin matar un solo mutante. Si vuestro mutation score está estancado, la causa casi siempre está en uno de estos cuatro puntos: el nombre, el patrón AAA, los asserts y la granularidad.

### Convención de nombres en 3 partes

Un buen nombre de test responde a tres preguntas encadenadas:

```
[Unidad bajo test] — [Escenario] — [Resultado esperado]
```

Ejemplos:

```typescript
// Bueno: claro y específico
it('Counter - al hacer clic en incrementar - muestra el valor 1')
it('LoginForm - con credenciales vacías - muestra errores de validación')
it('useCart - al añadir un producto duplicado - incrementa la cantidad en vez de duplicar')

// Malo: vago e impreciso
it('funciona correctamente')
it('debería renderizar')
it('test del componente')
```

La idea es sencilla: cuando el test falle en CI, el nombre solo debería decirte qué se rompió. Si necesitas abrir el `it` para entender el fallo, el nombre no está haciendo su trabajo.

> **Idioma:** en este taller los `it('...')` van en español. Acerca la descripción al dominio del producto y hace que cualquiera del equipo lea los nombres como frases naturales. Elijáis lo que elijáis, manteneldo en todo el repo; mezclar español e inglés dentro de la misma suite es una fuente gratuita de fricción.

En la práctica conviven varias convenciones y todas son válidas. Cada equipo elige una y se queda con ella:

| Patrón | Ejemplo | Cuándo encaja |
|---|---|---|
| `Unidad - escenario - resultado` | `Cart - con producto duplicado - incrementa cantidad` | Recomendada en este taller |
| `should_X_when_Y` | `should_increment_quantity_when_product_duplicated` | Equipos con histórico Java/Kotlin |
| **Given-When-Then** (bloques `describe` anidados) | `describe('Cart') → describe('when adding duplicated product') → it('increments quantity')` | Equipos que ya practican BDD |

Given-When-Then y AAA describen lo mismo (contexto, acción y resultado) con distinto vocabulario. La diferencia está en dónde vive cada fase. AAA se escribe dentro del cuerpo del test; Given-When-Then suele repartirse entre los `describe` anidados y el `it`.

### Patrón AAA: Arrange, Act, Assert

Todo test se estructura por dentro en tres fases. Para verlas sin ruido, empezamos con una función pura, sin framework ni render: así queda la estructura sola.

```typescript
// cart.ts
export function addToCart(cart: CartItem[], product: Product): CartItem[] {
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    return cart.map(item =>
      item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
    );
  }
  return [...cart, { ...product, quantity: 1 }];
}

// cart.test.ts
import { describe, it, expect } from 'vitest';
import { addToCart } from './cart';

describe('addToCart', () => {
  it('con producto duplicado - incrementa la cantidad en vez de duplicar', () => {
    // ── Arrange ───────────────────────────────────────
    // Preparar datos, mocks, estado previo
    const product = { id: 'p1', name: 'Café', price: 3 };
    const cart = [{ ...product, quantity: 1 }];

    // ── Act ───────────────────────────────────────────
    // Ejecutar UNA sola acción: la que da nombre al test
    const result = addToCart(cart, product);

    // ── Assert ────────────────────────────────────────
    // Verificar el efecto observable de esa acción
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2);
  });
});
```

Cuando pasamos a un componente Angular, Vue o React la estructura es la misma. La única diferencia es que el Arrange incluye ahora la llamada a `render` (la de `@testing-library/angular`, `@testing-library/vue` o `@testing-library/react`, según el stack). En `04-primer-componente.md` aplicamos este esquema a un componente real.

Algunas pautas para que AAA siga rindiendo cuando los tests crecen:

- Separa visualmente las tres fases con comentarios o líneas en blanco. Se lee mejor y, sobre todo, se detectan a simple vista los tests que se han vuelto desmedidos.
- Si el Arrange crece demasiado, extrae una función `setup()` local al `describe` y llámala desde cada `it`. Evita en cambio las abstracciones compartidas entre archivos: rompen la regla de oro de Goldberg (*"Test code is not like production code — design it to be short, flat and duplicated"*) y hacen los tests difíciles de leer en frío.
- **Un solo Act por test.** Si para reproducir el caso necesitas varios clicks o llamadas encadenadas, esas interacciones son Arrange. El Act es la acción concreta que da nombre al test. Si de verdad tienes dos Acts distintos, tienes dos tests.
- Varios `expect` están bien mientras todos verifiquen facetas del mismo comportamiento, como la longitud y el contenido del array que devuelve una función. Lo que tiene que ser único es la razón por la que el test puede fallar.

### Asserts específicos: la diferencia entre matar mutantes y no matarlos

Vitest hereda de Jest y Jasmine la API fluida `expect(actual).matcher(expected)`, así que la sintaxis la conoce todo el mundo. Lo que no es trivial es elegir bien el matcher. Ahí empieza casi todo el trabajo de subir el mutation score.

```typescript
// La estructura siempre es:
expect(valorReal).matcher(valorEsperado);

// Ejemplos canónicos:
expect(result).toBe(42);                    // igualdad estricta (===), primitivos
expect(user).toEqual({ name: 'María' });    // igualdad profunda, objetos y arrays
expect(cart).toHaveLength(3);
expect(cart.items).toContainEqual({ id: 'p1', quantity: 2 });
expect(() => divide(1, 0)).toThrow('División por cero');
```

La regla que mueve el mutation score es simple: el matcher tiene que ser tan específico como la verdad que quieres proteger. Si conoces el valor exacto, asértalo. Si te conformas con "algo positivo" o "algo definido", dejas margen para que una mutación pase desapercibida.

```typescript
// ❌ Débil: cualquier número positivo pasa.
// Stryker mutará `total * 0.1` a `total * 0.2` y el test NO lo detectará.
expect(getDiscount(200, true)).toBeTruthy();
expect(getDiscount(200, true)).toBeGreaterThan(0);

// ✅ Fuerte: el valor exacto. Cualquier mutación en la fórmula falla el test.
expect(getDiscount(200, true)).toBe(20);
```

| Evita… | Porque… | Usa en su lugar |
|---|---|---|
| `toBeTruthy()` / `toBeFalsy()` | Coerción laxa: `"0"`, `[]`, `{}` son truthy; el matcher casi no filtra | `toBe(true)`, `toBe(expected)` |
| `toBeGreaterThan(0)` | No detecta cambios de coeficiente ni de signo cuando el resultado sigue siendo positivo | Valor exacto con `toBe` o `toBeCloseTo` |
| `toEqual(expect.any(Number))` | Solo verifica el tipo, no el valor | Valor concreto siempre que lo conozcas |
| `toBeDefined()` como único assert | No detecta mutaciones dentro del valor | Assert sobre la forma/contenido |
| `not.toBe(null)` aislado | Igual: protege contra `null` pero no contra valores incorrectos | Valor esperado completo |

Volveremos a esta tabla en `14-mutation-testing-stryker.md`, ya conectada con ejemplos del reporte de Stryker. Veréis qué mutantes concretos se escapaban por cada matcher laxo.

### Un assert ≠ un `expect`

La máxima clásica de "un assert por test" se malinterpreta a menudo. No habla de `expect`, habla de comportamiento. La regla pide que cada test verifique un solo comportamiento, y ese comportamiento puede requerir varios `expect` coordinados si cada uno mira una faceta distinta del mismo resultado:

```typescript
it('addToCart - producto nuevo - lo añade con cantidad 1', () => {
  const result = addToCart([], { id: 'p1', name: 'Café', price: 3 });

  // Tres expect, un solo comportamiento: "añadir producto nuevo"
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe('p1');
  expect(result[0].quantity).toBe(1);
});
```

Hay en cambio cosas que conviene dejar fuera del cuerpo del test:

- Lógica condicional con `if` o `switch`. Si tu test tiene ramas, en la práctica estás testeando dos casos distintos; mejor partirlo en dos `it`.
- Bucles sobre casos de prueba con asserts que cambian por iteración. Para eso está `it.each` (o `test.each`) de Vitest: genera un test con nombre propio por cada caso y te deja ver en el reporte cuál falló.
- Bloques try/catch silenciosos. Si el código puede lanzar, exprésalo con `expect(() => …).toThrow(…)`. Así el test falla cuando no lanza, en lugar de pasar sin enterarse.
- Datos no deterministas como `Math.random` o `Date.now` sin mockear. Provocan flakiness en CI, y Stryker los marca como inestables y los descarta del análisis (ver *Mutant States and Metrics* en la doc oficial).

```typescript
// ❌ Un test con un bucle oculta qué caso falla cuando falla.
it('greet - devuelve saludo según la hora', () => {
  for (const { hour, expected } of [
    { hour: 8, expected: 'Buenos días' },
    { hour: 15, expected: 'Buenas tardes' },
    { hour: 22, expected: 'Buenas noches' },
  ]) {
    expect(greet('Ana', hour)).toContain(expected);
  }
});

// ✅ it.each genera un test por caso, con nombre propio en el reporte.
it.each([
  { hour: 8,  expected: 'Buenos días' },
  { hour: 15, expected: 'Buenas tardes' },
  { hour: 22, expected: 'Buenas noches' },
])('greet - a las $hour devuelve "$expected"', ({ hour, expected }) => {
  expect(greet('Ana', hour)).toContain(expected);
});
```

### Granularidad: cuándo partir un test en dos

Cuando dudas si un test debería partirse, hay tres señales fiables:

1. El nombre contiene una conjunción del tipo "y" (por ejemplo, `... añade al carrito y actualiza el total`). Casi siempre son dos tests embutidos en uno.
2. Dentro del cuerpo hay dos Acts reales, separados por asserts intermedios. Parte justo después del primer bloque de asserts.
3. Al describir el fallo solo sabes hacerlo enumerando varios comportamientos (`el carrito no se actualiza o el descuento no se aplica`). El test mezcla responsabilidades y no vas a poder diagnosticarlo cuando se rompa.

La regla inversa importa lo mismo: no partas por partir. Un test que verifica "el carrito refleja el producto añadido" y usa tres `expect` para describir ese estado sigue siendo un solo test, no tres.

### Independencia entre tests

Cada test tiene que ser independiente de los demás. En la práctica, eso significa dos cosas: ni estado mutable compartido entre tests, ni dependencias del orden de ejecución. Un test tiene que pasar igual si es el primero de la suite, si es el último o si corre aislado con `.only`.

```typescript
// MAL: estado compartido entre tests
let counter = 0;

it('incrementa', () => {
  counter++;
  expect(counter).toBe(1); // Funciona si se ejecuta primero
});

it('incrementa de nuevo', () => {
  counter++;
  expect(counter).toBe(2); // Falla si el test anterior no se ejecutó antes
});

// BIEN: cada test tiene su propio estado
it('incrementa desde 0', () => {
  let counter = 0;
  counter++;
  expect(counter).toBe(1);
});

it('incrementa desde 0 de nuevo', () => {
  let counter = 0;
  counter++;
  expect(counter).toBe(1);
});
```

Cuando el setup empieza a repetirse, el sitio natural para extraerlo es un `beforeEach`. Corre antes de cada `it` y deja el estado recién construido. Su pareja `afterEach` sirve para limpiar lo que haya quedado vivo (timers, spies, suscripciones); en tests de funciones puras rara vez hace falta. La regla práctica es construir el estado desde cero, en el hook o dentro del `it`, nunca a nivel de módulo. Si lo subes al módulo, vuelves al problema del ejemplo anterior.

### `describe` e `it`: agrupar y nombrar

Vitest expone la API BDD clásica, casi idéntica a la de Jest. Conviene tener a mano qué hace cada pieza:

- `describe(nombre, fn)` agrupa tests relacionados. Se puede anidar si queréis modelar Given-When-Then con bloques.
- `it(nombre, fn)` (con alias `test`) define un caso concreto. Usa `it` cuando el nombre se lea como frase del tipo "debería…"; `test` encaja mejor con un tono neutro.
- `it.each(tabla)(nombre, fn)` genera un test por fila y compone el nombre con los valores. Es el patrón que acabamos de ver con los rangos horarios.
- `it.skip`, `it.only` e `it.todo` son útiles mientras desarrollas, pero nunca deben llegar a `main`. Un `.only` mergeado se traga el resto de la suite en CI y no os vais a enterar hasta que rompa otra cosa.

### Ejemplo completo de un test bien estructurado

```typescript
// greeting.ts
export function greet(name: string, hour: number): string {
  if (hour < 12)  return `Buenos días, ${name}`;
  if (hour < 20)  return `Buenas tardes, ${name}`;
  return `Buenas noches, ${name}`;
}

// greeting.test.ts
import { describe, it, expect } from 'vitest';
import { greet } from './greeting';

describe('greet', () => {
  it.each([
    { hour: 0,  saludo: 'Buenos días' },
    { hour: 11, saludo: 'Buenos días' },     // límite inferior del rango matutino
    { hour: 12, saludo: 'Buenas tardes' },   // límite exacto — mata mutante `<` vs `<=`
    { hour: 19, saludo: 'Buenas tardes' },
    { hour: 20, saludo: 'Buenas noches' },   // límite exacto — mata mutante `<` vs `<=`
    { hour: 23, saludo: 'Buenas noches' },
  ])('a las $hour devuelve "$saludo"', ({ hour, saludo }) => {
    expect(greet('Ana', hour)).toBe(`${saludo}, Ana`);
  });

  it('interpola el nombre recibido en el saludo', () => {
    expect(greet('Carlos', 10)).toBe('Buenos días, Carlos');
  });
});
```

Fijaos en los casos de frontera exactos (11, 12, 19, 20): son los que matan las mutaciones que Stryker introduce sobre operadores de comparación (`<` por `<=`, `<` por `>`). Con una terna cómoda tipo `(8, 15, 22)` el test pasa en verde, pero deja mutantes vivos porque nunca toca los bordes. Volvemos a este patrón en `14-mutation-testing-stryker.md` con ejemplos reales.

### Checklist de autoevaluación

Antes de dar un test por cerrado, pásalo por esta checklist corta:

- [ ] El nombre dice *unidad + escenario + resultado* sin ambigüedad.
- [ ] Las tres fases AAA son identificables de un vistazo.
- [ ] Hay **un único Act**; los `expect` verifican **un solo comportamiento**.
- [ ] Ningún `expect` es `toBeTruthy`, `toBeDefined` o `toBeGreaterThan(0)` cuando conoces el valor exacto.
- [ ] Los casos límite (`0`, `12`, `20`, array vacío, string vacío…) están cubiertos.
- [ ] El test no tiene lógica (if, loops, try/catch silenciosos).
- [ ] No comparte estado mutable con otros tests.
- [ ] Si el test falla, el nombre y el mensaje del matcher bastan para diagnosticar sin abrir el SUT.

### Siguiente paso

Con la anatomía clara, seguimos así. En `03-jest-y-vitest.md` explicamos por qué el runner del taller es Vitest 4 y no Jest. En `04-primer-componente.md` aplicamos este mismo patrón AAA a un componente real, en Angular, Vue y React. Los antipatrones que han asomado por aquí (nombres ambiguos, asserts laxos, tests acoplados) los retomamos de forma sistemática en `09-buenas-practicas.md`; la conexión con el mutation score se cierra en `14-mutation-testing-stryker.md`.

---

## Fuentes

Las referencias que sostienen los claims de este archivo. La bibliografía completa del taller vive en [`15-referencias.md`](./15-referencias.md).

- Yoni Goldberg — *JavaScript & Node.js Testing Best Practices*, sección "Test code is not like production code". https://github.com/goldbergyoni/javascript-testing-best-practices
- Vitest — *Test API* (`it.each`, `describe`, hooks). https://vitest.dev/api/test
- Stryker Mutator — *Mutant States and Metrics* (criterio de descarte por inestabilidad). https://stryker-mutator.io/docs/mutation-testing-elements/mutant-states-and-metrics/
- Given-When-Then: convención BDD estándar, acuñada por Dan North en torno a 2006. https://dannorth.net/introducing-bdd/

