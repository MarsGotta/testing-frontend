# Tu primer componente

> Taller 1 — Fundamentos del Testing Frontend | Sección 4
> **Modalidad:** Tutorial (learning by doing)
> **Prerrequisitos:** [`02-anatomia-de-un-test.md`](./02-anatomia-de-un-test.md) (AAA, `describe`/`it`) · [`03-jest-y-vitest.md`](./03-jest-y-vitest.md) (Vitest corriendo)
> **Tiempo estimado:** 20 min
> **Stack validado (2026-04):** Vitest 4.x · `@testing-library/angular` 16.x · `@testing-library/vue` 8.x · `@testing-library/react` 16.x · `@testing-library/user-event` 14.x · Angular 17–21 · Vue 3.x · React 19

En esta sección renderizas un componente, localizas un elemento dentro de él y afirmas algo sobre ese elemento. Nada de mocks ni de eventos rebuscados todavía. El flujo mínimo tiene que quedarte claro antes de meter complejidad por encima.

De [`02-anatomia-de-un-test.md`](./02-anatomia-de-un-test.md) ya traes la estructura AAA y sabes cómo Vitest organiza los tests. Falta la capa de componente: montarlo, consultar el DOM que produce y aseverar sobre lo que encuentras.

Para que no te distraigas con el dominio, el taller gira siempre en torno al mismo ejemplo: un `Counter`. Aquí lo ves en su versión más simple. En las secciones [`05-queries`](./05-queries-testing-library.md), [`06-eventos`](./06-eventos-de-usuario.md) y [`07-mocking`](./07-mocking-basico.md) ese mismo contador va ganando capas según las necesites.

---

### `render()` de Testing Library

Testing Library publica un paquete por framework. La firma de `render()` varía entre ellos, pero por dentro todos hacen lo mismo. Montan el componente en un contenedor colgado de `document.body`, con el DOM que aporta jsdom o happy-dom según tu configuración de Vitest. Luego ejecutan el ciclo de vida real del framework (en Angular pasa por `ApplicationRef`; en Vue, por `createApp`) y te devuelven un objeto con utilidades para trabajar contra el DOM recién renderizado.

Dentro de ese objeto siempre encuentras las mismas piezas:

- `container`: el nodo raíz donde se montó el componente.
- `baseElement`: por defecto es el propio `document.body` y funciona como punto de partida para las queries.
- `unmount()`: destruye la instancia y limpia el DOM cuando lo necesites.
- `rerender(...)`: vuelve a pintar el componente con props o inputs distintos, sin recrearlo de cero.
- Un conjunto de queries ligadas a `baseElement` que vemos justo debajo.

Un apunte que conviene dejar claro desde ya. La limpieza entre tests es automática en cuanto el runner importa el adaptador del framework. Con Vitest 4 no necesitas llamar a `cleanup()` a mano.

> **Fuente:** Testing Library registra su `afterEach(cleanup)` cuando el entorno de test tiene globals activos. En Vitest la condición se cumple con `globals: true`. Ver [Vitest · Migration Guide](https://vitest.dev/guide/migration.html) y el adaptador de cada framework en [testing-library.com/docs](https://testing-library.com/docs/).

---

### `screen`, el objeto global para queries

`screen` es una fachada sobre `document.body` que expone las mismas queries que te devuelve `render()`. En el día a día te da tres ventajas concretas:

- Te ahorra destructurar media docena de queries en cada test.
- Siempre apunta a `document.body`, así que sigue funcionando tal cual después de un `rerender`, sin volver a capturar nada.
- Uniformiza la forma del test. `screen.getByRole(...)` se escribe igual en Angular, en Vue o en cualquier otro entorno de Testing Library, y saltar entre bases de código cuesta mucho menos.

La regla práctica: usa `screen` siempre. Reserva `container` solo cuando necesites acotar la búsqueda a un subárbol concreto.

---

### Flujo básico: render, query y assert

```
render(Componente)  →  screen.getByXxx(...)  →  expect(...).toMatcher()
```

Vas a ver este patrón en todos los tests de componente del taller. Interiorízalo desde el primero.

---

## Parte A, Angular

### Setup mínimo

```bash
npm install --save-dev @testing-library/angular @testing-library/dom \
                       @testing-library/jest-dom @testing-library/user-event
```

En `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
import '@analogjs/vitest-angular/setup-zone'; // o 'zone.js/testing' según setup
```

> `render()` de `@testing-library/angular` es asíncrono: por debajo espera al primer ciclo de detección de cambios antes de devolverte el control. En la práctica, todos los tests de componentes Angular del taller los escribes como `async`. Ver [Angular Testing Library · Intro](https://testing-library.com/docs/angular-testing-library/intro/).

### Primer test: scaffolding completo

```typescript
// counter.component.ts
import { Component, input, model } from '@angular/core';

@Component({
  selector: 'app-counter',
  standalone: true,
  template: `
    <h2>Contador</h2>
    <p aria-label="valor actual">{{ count() }}</p>
    <button (click)="count.set(count() - 1)">Decrementar</button>
    <button (click)="count.set(count() + 1)">Incrementar</button>
    <button (click)="count.set(0)">Resetear</button>
  `,
})
export class CounterComponent {
  initialValue = input(0);
  count = model(0);

  ngOnInit() {
    this.count.set(this.initialValue());
  }
}
```

```typescript
// counter.component.spec.ts
import { render, screen } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  it('muestra el valor inicial por defecto (0)', async () => {
    // 1. render
    await render(CounterComponent);

    // 2. query
    const valor = screen.getByLabelText('valor actual');

    // 3. assert
    expect(valor).toHaveTextContent('0');
  });
});
```

Fíjate en los tres pasos marcados con comentarios. Cualquier test de componente que escribas en el taller tiene esa misma forma por debajo.

### Segundo test: scaffolding parcial

Un paso más: pásale un `input()` al componente en el momento del render. En Angular Testing Library, los `inputs` entran como segundo parámetro de `render()`:

```typescript
it('muestra el valor inicial personalizado', async () => {
  await render(CounterComponent, {
    inputs: { initialValue: 10 },
  });

  expect(screen.getByLabelText('valor actual')).toHaveTextContent('10');
});
```

> Si el `input()` está declarado con alias (`input('Hi', { alias: 'greeting' })`), en el test no lo pasas como clave literal: lo enchufas con `aliasedInput('greeting', 'Hello')`.

### Tercer test: mínimo scaffolding

```typescript
import userEvent from '@testing-library/user-event';

it('incrementa al hacer clic', async () => {
  const user = userEvent.setup();
  await render(CounterComponent, { inputs: { initialValue: 0 } });

  await user.click(screen.getByRole('button', { name: /incrementar/i }));

  expect(screen.getByLabelText('valor actual')).toHaveTextContent('1');
});
```

La diferencia entre `userEvent` y `fireEvent` la vemos a fondo en [`06-eventos`](./06-eventos-de-usuario.md). Por ahora te vale la regla operativa: un `userEvent.setup()` al principio de cada test y, de ahí en adelante, `await user.click(elemento)` cada vez que dispares una interacción.

---

## Parte B, Vue 3

### Setup mínimo

```bash
npm install --save-dev @testing-library/vue @testing-library/jest-dom \
                       @testing-library/user-event @vue/test-utils
```

En `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

A diferencia de Angular, `@testing-library/vue` monta el componente con el `createApp` real y te devuelve el control de inmediato. El render en sí no te obliga a hacer el test asíncrono. El `async/await` solo aparece cuando hay eventos de por medio: `fireEvent` y `userEvent` sí devuelven promesas que tienes que esperar.

### Primer test: scaffolding completo

```vue
<!-- Counter.vue -->
<script setup lang="ts">
import { ref } from 'vue';

const props = withDefaults(defineProps<{ initialValue?: number }>(), {
  initialValue: 0,
});

const count = ref(props.initialValue);
</script>

<template>
  <h2>Contador</h2>
  <p aria-label="valor actual">{{ count }}</p>
  <button @click="count--">Decrementar</button>
  <button @click="count++">Incrementar</button>
  <button @click="count = 0">Resetear</button>
</template>
```

```typescript
// Counter.spec.ts
import { render, screen } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import Counter from './Counter.vue';

describe('Counter', () => {
  it('muestra el valor inicial por defecto (0)', () => {
    // 1. render
    render(Counter);

    // 2. query
    const valor = screen.getByLabelText('valor actual');

    // 3. assert
    expect(valor).toHaveTextContent('0');
  });
});
```

### Segundo test: scaffolding parcial

Las props entran por el segundo parámetro de `render()`, con la misma lógica que en Angular, pero bajo la clave `props`:

```typescript
it('muestra el valor inicial personalizado', () => {
  render(Counter, {
    props: { initialValue: 10 },
  });

  expect(screen.getByLabelText('valor actual')).toHaveTextContent('10');
});
```

### Tercer test: mínimo scaffolding

```typescript
import userEvent from '@testing-library/user-event';

it('incrementa al hacer clic', async () => {
  const user = userEvent.setup();
  render(Counter, { props: { initialValue: 0 } });

  await user.click(screen.getByRole('button', { name: /incrementar/i }));

  expect(screen.getByLabelText('valor actual')).toHaveTextContent('1');
});
```

---

## Parte C, React 19

A diferencia de Angular y Vue, React no arrastra plugin de Vitest ni zona de detección de cambios. Cuando añades `@testing-library/react` al proyecto, ya tienes todo lo que necesitas. Es el test más compacto de los tres y quizá por eso se usa tanto como ejemplo canónico en la documentación de Testing Library. No es que React sea "mejor" para testear; es que el runtime es más plano y el setup se nota.

### Setup mínimo

```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom \
                       @testing-library/user-event
```

En `vitest.setup.ts`:

```typescript
import '@testing-library/jest-dom/vitest';
```

Tu `vitest.config.ts` necesita `environment: 'happy-dom'` (o `'jsdom'`) y el plugin oficial de React para que Vitest compile JSX y TSX. Con React 19 no hay nada más que tocar: `render()` es síncrono, no pide `act()` explícito para la mayoría de flujos, y la limpieza entre tests viene activa desde que importas el paquete.

> **Fuente:** [React 19 release notes](https://react.dev/blog/2024/12/05/react-19) y [React Testing Library · Intro](https://testing-library.com/docs/react-testing-library/intro/). El detalle de cuándo sí hace falta `act()` lo repasa Kent C. Dodds en [*Fix the "not wrapped in act" Warning*](https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning).

### Primer test: scaffolding completo

Las props en React entran como atributos JSX al instanciar el componente en el propio `render()`. No hay clave `inputs` ni `props` en el segundo parámetro: le pasas el elemento ya construido.

```tsx
// Counter.tsx
import { useState } from 'react';

type CounterProps = {
  initialValue?: number;
};

export function Counter({ initialValue = 0 }: CounterProps) {
  const [count, setCount] = useState(initialValue);

  return (
    <>
      <h2>Contador</h2>
      <p aria-label="valor actual">{count}</p>
      <button onClick={() => setCount((c) => c - 1)}>Decrementar</button>
      <button onClick={() => setCount((c) => c + 1)}>Incrementar</button>
      <button onClick={() => setCount(0)}>Resetear</button>
    </>
  );
}
```

```tsx
// Counter.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Counter } from './Counter';

describe('Counter', () => {
  it('muestra el valor inicial por defecto (0)', () => {
    // 1. render
    render(<Counter />);

    // 2. query
    const valor = screen.getByLabelText('valor actual');

    // 3. assert
    expect(valor).toHaveTextContent('0');
  });
});
```

Los tres pasos siguen siendo los mismos. Lo único que cambia es la sintaxis del render: `<Counter />` en vez de pasar la clase Angular o el componente Vue como argumento.

### Segundo test: scaffolding parcial

```tsx
it('muestra el valor inicial personalizado', () => {
  render(<Counter initialValue={10} />);

  expect(screen.getByLabelText('valor actual')).toHaveTextContent('10');
});
```

El contraste con los otros dos frameworks es directo. Angular pide `{ inputs: { initialValue: 10 } }`, Vue pide `{ props: { initialValue: 10 } }`, React se queda con la prop como atributo JSX. La ergonomía la notas sobre todo cuando un componente tiene seis o siete props: en React escribes el mismo JSX que escribirías en producción.

### Tercer test: mínimo scaffolding

```tsx
import userEvent from '@testing-library/user-event';

it('incrementa al hacer clic', async () => {
  const user = userEvent.setup();
  render(<Counter initialValue={0} />);

  await user.click(screen.getByRole('button', { name: /incrementar/i }));

  expect(screen.getByLabelText('valor actual')).toHaveTextContent('1');
});
```

El patrón `userEvent.setup()` al principio del test es idéntico al de Angular y al de Vue. Cambia el framework, cambia la sintaxis del render, pero la interacción con el DOM la escribes igual. Esa es la promesa real de Testing Library: una vez aprendes las queries y `userEvent`, el conocimiento se traslada entre stacks sin fricción.

---

### Utilidades del objeto devuelto por `render()`

La recomendación general es tirar de `screen` para las queries. Aun así, el objeto que te devuelve `render()` trae algunas piezas que conviene tener fichadas desde ya, aunque todavía no las uses en cada test:

| Propiedad      | Cuándo la usas                                                                  |
| -------------- | ------------------------------------------------------------------------------- |
| `container`    | Acotar una query a un subárbol (`within(container).getByRole(...)`).            |
| `baseElement`  | Raro; cuando el componente portal-iza contenido fuera del container.            |
| `unmount()`    | Tests de desuscripción, cleanup de efectos, verificación de `ngOnDestroy`.      |
| `rerender()`   | Cambiar props/inputs sin desmontar para probar reactividad.                     |
| `debug()`      | Imprimir el DOM actual en consola (útil mientras escribes el test).             |

En el caso de Vue, `render()` te expone además un `emitted()` para inspeccionar los eventos que ha disparado el componente. Lo vemos con calma en [`06-eventos`](./06-eventos-de-usuario.md).

---

### Patrón de lectura, componente y test lado a lado

Un hábito que te ahorra tiempo: abre el componente y su fichero de test en un split del editor, y léelos a la vez. Cada aserción del test debería mapear de forma evidente con una línea del template que diga eso mismo desde el lado del componente. Si una aserción no encaja contra ninguna línea del template, probablemente estés testeando implementación, no comportamiento. Ese es buen momento para replantear el test.

---

### Checklist antes de pasar a `05-queries`

- [ ] Has renderizado un componente con `render()` (Angular, Vue o React).
- [ ] Has usado `screen.getByRole` o `screen.getByLabelText` al menos una vez.
- [ ] Has aseverado con un matcher de `jest-dom` (`toHaveTextContent`, `toBeVisible`, `toBeDisabled`...).
- [ ] Sabes qué hacen `rerender`, `unmount` y `container`, aunque todavía no los uses.
- [ ] Si trabajas con React: has pasado una prop vía JSX (`<Counter initialValue={10} />`) en vez de un segundo parámetro.

Con los cuatro marcados puedes saltar a [`05-queries`](./05-queries-testing-library.md). Esa sección entra en el detalle de las queries: la prioridad que Testing Library recomienda entre ellas y cuándo toca echar mano de `query*`, `find*` o `getAllBy*` en lugar del `getBy*` que has usado aquí.

---

## Fuentes

Las referencias que sostienen los claims de este archivo. La bibliografía completa del taller vive en [`15-referencias.md`](./15-referencias.md).

- Testing Library — *Documentación oficial* (hub, queries, `screen`). https://testing-library.com/docs/
- Angular Testing Library — *Intro* (`render` asíncrono, `aliasedInput`, providers). https://testing-library.com/docs/angular-testing-library/intro/
- Vue Testing Library — *Intro* (`render`, `props`, `emitted`). https://testing-library.com/docs/vue-testing-library/intro/
- React Testing Library — *Intro* y *Cheatsheet* (`render` síncrono con React 19). https://testing-library.com/docs/react-testing-library/intro/
- React — *Release notes de React 19*. https://react.dev/blog/2024/12/05/react-19
- user-event v14 — *Setup* y *API*. https://testing-library.com/docs/user-event/setup/
- Vitest — *Migration Guide* (adaptadores de Testing Library y auto-cleanup con `globals: true`). https://vitest.dev/guide/migration.html
- Kent C. Dodds — *Fix the "not wrapped in act" Warning*. https://kentcdodds.com/blog/fix-the-not-wrapped-in-act-warning
