# Eventos de Usuario

> Taller 1 — Fundamentos del Testing Frontend | Sección 6
>
> **Modalidad Diátaxis:** *Tutorial + Reference*. La primera parte (decisión `userEvent` vs `fireEvent` + `setup()`) es tutorial lineal — léela en orden. El "Catálogo de interacciones" y la "Tabla de decisión con fake timers" son reference — vuelve cuando tengas la duda concreta.
>
> **Por qué importa para tu mutation score:** esto conecta con el principio rector de Testing Library, *"the more your tests resemble the way your software is used, the more confidence they can give you"*. `userEvent` lleva esa idea al nivel del evento: dispara la secuencia completa `pointerdown` → `mousedown` → `focus` → `pointerup` → `mouseup` → `click`, mientras que `fireEvent.click` lanza únicamente `click`. Si un mutante mueve un handler de `mousedown` a `click`, `userEvent` lo mata y `fireEvent` lo deja pasar. Con `user.type` ocurre lo mismo: emite `keydown`, `keypress`, `input` y `keyup` por cada carácter, de modo que las mutaciones sobre handlers de teclado sí se ven. Migrar de `fireEvent` a `userEvent` tiende a subir el mutation score en formularios, sobre todo cuando los componentes reaccionan a más de un evento en la misma interacción.
>
> > **Fuente:** Testing Library — *Guiding Principles* (<https://testing-library.com/docs/guiding-principles/>) y *user-event · Intro* (<https://testing-library.com/docs/user-event/intro>). La comparación con `fireEvent` está en la sección "*Differences from `fireEvent`*" de la intro de user-event.
>
> **Versiones validadas (2026-04):** `@testing-library/user-event` 14.x, Vitest 4.x, `@testing-library/angular` 16.x, `@testing-library/vue` 8.x, `@testing-library/react` 16.x, Angular 17–21, Vue 3.x, React 19, happy-dom 15.x.

### Decisión rápida: `userEvent` vs `fireEvent`

| Característica         | `fireEvent`                           | `userEvent` v14+                        |
|------------------------|---------------------------------------|-----------------------------------------|
| Nivel                  | Bajo nivel                            | Alto nivel                              |
| Realismo               | Dispara un evento DOM aislado         | Simula la secuencia completa de eventos |
| API                    | Síncrona                              | **Asíncrona** (requiere `await`)        |
| Requiere `setup()`     | No                                    | Sí, una vez por test                    |
| Click                  | Solo `click`                          | `pointerdown` + `mousedown` + `focus` + `pointerup` + `mouseup` + `click` |
| Type                   | Establece `value` directamente        | `keydown` + `keypress` + `input` + `keyup` por cada tecla |
| Respeta `disabled`     | No                                    | Sí (un `disabled` no recibe `click`)    |
| Respeta `pointer-events: none` | No                            | Sí (por defecto — ver `pointerEventsCheck`) |

**Regla:** usa `userEvent` por defecto. `fireEvent` queda para 4 casos muy concretos (ver más abajo).

### El patrón `setup()` de v14 (obligatorio)

En `user-event` v14+, **no llames a métodos estáticos** (`userEvent.click(...)`). Crea una instancia con `setup()` al inicio de cada test. Así aíslas el estado del teclado y del puntero entre tests, y tienes un sitio donde configurar opciones.

**Angular — `@testing-library/angular`:**

```typescript
// counter.component.spec.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { CounterComponent } from './counter.component';

it('incrementa al hacer click', async () => {
  const user = userEvent.setup();            // ← una vez por test
  await render(CounterComponent);

  await user.click(screen.getByRole('button', { name: /sumar/i }));

  expect(screen.getByRole('status')).toHaveTextContent('1');
});
```

**Vue — `@testing-library/vue`:**

```typescript
// Counter.spec.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import Counter from './Counter.vue';

it('incrementa al hacer click', async () => {
  const user = userEvent.setup();
  render(Counter);

  await user.click(screen.getByRole('button', { name: /sumar/i }));

  expect(screen.getByRole('status')).toHaveTextContent('1');
});
```

**React — `@testing-library/react`:**

```tsx
// Counter.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Counter } from './Counter';

it('incrementa al hacer click', async () => {
  const user = userEvent.setup();
  render(<Counter />);

  await user.click(screen.getByRole('button', { name: /sumar/i }));

  expect(screen.getByRole('status')).toHaveTextContent('1');
});
```

La única diferencia entre los tres stacks está en el mounting: Angular monta con `render(CounterComponent)`, Vue con `render(Counter)` y React con `render(<Counter />)`. A partir de ahí, el `user` que devuelve `setup()` y todas sus APIs (`click`, `type`, `keyboard`, `hover`…) se comportan igual.

> **⚠ Olvidar el `await`** es el error número uno con `userEvent`. El test pasa sin haber ejecutado la interacción y los asserts corren antes de que el componente actualice. El resultado es siempre el mismo: tests verdes que no verifican nada, y mutantes que sobreviven en masa.

### Opciones útiles de `setup()`

```typescript
const user = userEvent.setup({
  delay: null,                                  // sin delay entre teclas (tests más rápidos)
  advanceTimers: (ms) => vi.advanceTimersByTime(ms), // combinar con fake timers
  pointerEventsCheck: PointerEventsCheckLevel.Never, // desactivar check pointer-events
  skipHover: true,                              // saltar eventos de hover implícitos
});
```

Los más usados en la práctica:

- **`delay: null`**: por defecto, `user.type` espera unos 0 ms entre teclas, pero aun así devuelve el control al event loop. Con `null` la simulación es síncrona por dentro. Te sirve en tests con mucha entrada de texto.
- **`advanceTimers`**: si tu test usa `vi.useFakeTimers()`, `userEvent` se cuelga porque sus propios delays usan `setTimeout`. Pásale `vi.advanceTimersByTime` y adelantará el reloj solo cuando lo necesite. Lo ves con detalle en "Combinando con fake timers".
- **`pointerEventsCheck`**: v14 comprueba que el elemento no tenga `pointer-events: none` antes de hacer click. Con happy-dom aparecen falsos positivos, y `PointerEventsCheckLevel.Never` los silencia. No abuses de esta opción, porque también tapa bugs reales.

### Catálogo de interacciones (reference)

Todas las APIs de instancia de `user-event` v14 devuelven `Promise<void>`, así que siempre van con `await`.

```typescript
const user = userEvent.setup();

// ── click ────────────────────────────────────────────
await user.click(element);                // clic simple
await user.dblClick(element);             // doble clic
await user.tripleClick(element);          // triple clic (selecciona línea)

// ── type — escribir texto en inputs ──────────────────
await user.type(input, 'Hola mundo');
await user.type(input, 'texto{Enter}');   // Enter al final
await user.type(input, '{Backspace}');    // borrar un carácter
await user.type(input, '{Shift>}AB{/Shift}'); // Shift+A+B (mayúsculas)

// ── clear — borrar contenido de un input ─────────────
await user.clear(input);

// ── keyboard — secuencias sin target específico ──────
await user.keyboard('{Escape}');
await user.keyboard('{Control>}a{/Control}');       // Ctrl+A
await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

// ── hover / unhover ──────────────────────────────────
await user.hover(element);
await user.unhover(element);

// ── tab — navegación por teclado ─────────────────────
await user.tab();                         // siguiente elemento focusable
await user.tab({ shift: true });          // anterior

// ── selectOptions — <select> ─────────────────────────
await user.selectOptions(selectEl, 'ES');            // por value
await user.selectOptions(selectEl, ['ES', 'FR']);    // multi-select
await user.deselectOptions(selectEl, 'ES');

// ── upload — <input type="file"> ─────────────────────
const file = new File(['contenido'], 'foto.png', { type: 'image/png' });
await user.upload(fileInput, file);
await user.upload(fileInput, [file1, file2]);        // múltiples

// ── pointer — gestos de puntero avanzados ────────────
await user.pointer({ keys: '[MouseRight]', target: element }); // clic derecho
await user.pointer([                                 // drag de A a B
  { keys: '[MouseLeft>]', target: a },
  { target: b },
  { keys: '[/MouseLeft]' },
]);

// ── copy / cut / paste ───────────────────────────────
await user.copy();
await user.cut();
await user.paste();
```

> **Tip:** la sintaxis del teclado usa llaves para teclas especiales (`{Enter}`, `{Escape}`) y la forma `{Key>}…{/Key}` para mantener una tecla pulsada durante una secuencia. Docs completas: <https://testing-library.com/docs/user-event/keyboard>.

### Cuándo `fireEvent` sigue siendo correcto

`userEvent` no cubre todo. Estos cuatro casos son territorio legítimo de `fireEvent`:

1. **Eventos sin equivalente de "gesto humano".** Por ejemplo `scroll`, `resize`, `load`, `error` de imagen, `animationend` o `transitionend`.

   ```typescript
   import { fireEvent, screen } from '@testing-library/angular';

   fireEvent.scroll(window, { target: { scrollY: 500 } });
   fireEvent.load(screen.getByRole('img'));
   ```

2. **Eventos custom (`CustomEvent`).** Los emiten Web Components o tu propio código.

   ```typescript
   fireEvent(
     element,
     new CustomEvent('cart:updated', { detail: { total: 42 } })
   );
   ```

3. **`submit` directo a un `<form>`.** `userEvent` envía el formulario a través de un click en el botón o de un Enter. Si necesitas disparar `submit` sin botón, por ejemplo en tests de lógica pura del handler, usa `fireEvent.submit(form)`.

4. **Cambios programáticos donde no modelas al usuario.** Piensa en inyectar un valor en un input controlado desde otro sitio: testear un directive o un composable que reacciona a eventos `input` sin UI real.

> **⚠ No uses `fireEvent.click`** "porque es más rápido". La pérdida de realismo la acabas pagando en el mutation score. `fireEvent.click` no dispara `mousedown` ni `focus`, y muchos componentes reales reaccionan a esos eventos.

### Combinando con fake timers

Este es el gotcha más repetido del taller. Con `vi.useFakeTimers()`, **cualquier** `setTimeout` queda congelado. Eso incluye el que `user-event` usa por dentro para simular los delays entre teclas. Si no ajustas nada, `user.type` se cuelga para siempre.

```typescript
// ❌ se cuelga: fake timers detienen los delays internos de user-event
beforeEach(() => vi.useFakeTimers());

it('debounce de búsqueda', async () => {
  const user = userEvent.setup();               // sin advanceTimers
  render(SearchBox);
  await user.type(screen.getByRole('searchbox'), 'query'); // ← timeout
});
```

```typescript
// ✅ userEvent sabe cómo adelantar el reloj cuando necesita esperar
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('debounce de búsqueda dispara la query tras 300 ms', async () => {
  const user = userEvent.setup({
    advanceTimers: (ms) => vi.advanceTimersByTime(ms),
  });
  render(SearchBox);

  await user.type(screen.getByRole('searchbox'), 'query');

  // Adelantar los 300 ms del debounce manualmente:
  await vi.advanceTimersByTimeAsync(300);

  expect(screen.getByRole('status')).toHaveTextContent(/resultados: 3/i);
});
```

**Reglas:**

- `advanceTimers` en `setup()` cubre los delays internos de `user-event`.
- Los delays de TU componente (debounce, throttle, `setTimeout` de negocio) los adelantas tú con `advanceTimersByTimeAsync`. La versión `*Async` es obligatoria cuando hay microtasks (promises) encadenadas al timer.
- Llama siempre a `vi.useRealTimers()` en `afterEach`. Si no, el siguiente test hereda los fake timers y falla de forma críptica.

### Ejemplo completo (Angular): formulario del Carrito

Dominio consistente con el resto de la guía (`Cart` aparece también en archivos 02 y 09).

```html
<!-- add-to-cart.component.html -->
<form (ngSubmit)="add()" aria-label="Añadir al carrito">
  <label for="qty">Cantidad</label>
  <input id="qty" type="number" min="1" [(ngModel)]="qty" name="qty" />

  <label for="country">País de envío</label>
  <select id="country" [(ngModel)]="country" name="country">
    <option value="ES">España</option>
    <option value="FR">Francia</option>
  </select>

  <button type="submit" [disabled]="qty < 1">Añadir</button>
</form>
```

```typescript
// add-to-cart.component.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { AddToCartComponent } from './add-to-cart.component';

describe('AddToCartComponent', () => {
  const setup = async () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    await render(AddToCartComponent, { componentInputs: { onAdd } });
    return { user, onAdd };
  };

  it('emite el ítem con cantidad y país seleccionado', async () => {
    const { user, onAdd } = await setup();

    await user.clear(screen.getByLabelText(/cantidad/i));
    await user.type(screen.getByLabelText(/cantidad/i), '3');
    await user.selectOptions(screen.getByLabelText(/país/i), 'FR');
    await user.click(screen.getByRole('button', { name: /añadir/i }));

    expect(onAdd).toHaveBeenCalledWith({ qty: 3, country: 'FR' });
  });

  it('el botón respeta disabled cuando la cantidad es 0', async () => {
    const { user, onAdd } = await setup();

    await user.clear(screen.getByLabelText(/cantidad/i));
    await user.type(screen.getByLabelText(/cantidad/i), '0');
    await user.click(screen.getByRole('button', { name: /añadir/i }));

    expect(onAdd).not.toHaveBeenCalled();   // userEvent respeta [disabled]
  });
});
```

### Ejemplo completo (Vue): mismo carrito

```vue
<!-- AddToCart.vue -->
<script setup lang="ts">
import { ref } from 'vue';
const emit = defineEmits<{ add: [{ qty: number; country: string }] }>();
const qty = ref(1);
const country = ref('ES');
const submit = () => emit('add', { qty: qty.value, country: country.value });
</script>

<template>
  <form aria-label="Añadir al carrito" @submit.prevent="submit">
    <label for="qty">Cantidad</label>
    <input id="qty" type="number" min="1" v-model.number="qty" />

    <label for="country">País de envío</label>
    <select id="country" v-model="country">
      <option value="ES">España</option>
      <option value="FR">Francia</option>
    </select>

    <button type="submit" :disabled="qty < 1">Añadir</button>
  </form>
</template>
```

```typescript
// AddToCart.spec.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';
import AddToCart from './AddToCart.vue';

it('emite add con qty y country', async () => {
  const user = userEvent.setup();
  const { emitted } = render(AddToCart);

  await user.clear(screen.getByLabelText(/cantidad/i));
  await user.type(screen.getByLabelText(/cantidad/i), '3');
  await user.selectOptions(screen.getByLabelText(/país/i), 'FR');
  await user.click(screen.getByRole('button', { name: /añadir/i }));

  expect(emitted('add')).toEqual([[{ qty: 3, country: 'FR' }]]);
});
```

### Ejemplo completo (React): mismo carrito

```tsx
// AddToCart.tsx
import { useState } from 'react';

type Payload = { qty: number; country: string };

export function AddToCart({ onAdd }: { onAdd: (p: Payload) => void }) {
  const [qty, setQty] = useState(1);
  const [country, setCountry] = useState('ES');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({ qty, country });
  };

  return (
    <form aria-label="Añadir al carrito" onSubmit={submit}>
      <label htmlFor="qty">Cantidad</label>
      <input
        id="qty"
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
      />

      <label htmlFor="country">País de envío</label>
      <select
        id="country"
        value={country}
        onChange={(e) => setCountry(e.target.value)}
      >
        <option value="ES">España</option>
        <option value="FR">Francia</option>
      </select>

      <button type="submit" disabled={qty < 1}>Añadir</button>
    </form>
  );
}
```

```tsx
// AddToCart.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddToCart } from './AddToCart';

describe('AddToCart', () => {
  const setup = () => {
    const onAdd = vi.fn();
    const user = userEvent.setup();
    render(<AddToCart onAdd={onAdd} />);
    return { user, onAdd };
  };

  it('llama onAdd con qty y country seleccionado', async () => {
    const { user, onAdd } = setup();

    await user.clear(screen.getByLabelText(/cantidad/i));
    await user.type(screen.getByLabelText(/cantidad/i), '3');
    await user.selectOptions(screen.getByLabelText(/país/i), 'FR');
    await user.click(screen.getByRole('button', { name: /añadir/i }));

    expect(onAdd).toHaveBeenCalledWith({ qty: 3, country: 'FR' });
  });

  it('el botón respeta disabled cuando la cantidad es 0', async () => {
    const { user, onAdd } = setup();

    await user.clear(screen.getByLabelText(/cantidad/i));
    await user.type(screen.getByLabelText(/cantidad/i), '0');
    await user.click(screen.getByRole('button', { name: /añadir/i }));

    expect(onAdd).not.toHaveBeenCalled();   // userEvent respeta disabled
  });
});
```

Fíjate en que las tres suites (Angular, Vue, React) hacen exactamente las mismas llamadas a `user.*`. Cambian el mounting y la forma de comprobar el efecto —`componentInputs` y spies en Angular, `emitted` en Vue, callbacks vía props en React—, pero el guion de la interacción es el mismo.

### Conexión con mutation score (Stryker)

Ejemplo concreto. Dado este handler:

```typescript
onMouseDown() { this.cart.highlight = true; }
onClick()     { this.cart.add(this.item); }
```

Si un test hace:

```typescript
fireEvent.click(button);   // solo dispara 'click'
expect(addSpy).toHaveBeenCalled();
```

Stryker muta `onMouseDown` a `() => {}` (MethodExpression). La mutación **sobrevive** porque el test no ha tocado `mousedown`. Con `await user.click(button)` la secuencia incluye `mousedown`, y cualquier aserción sobre el highlight o sobre el orden de llamadas mata la mutación.

| Mutación que Stryker aplica                          | `fireEvent.click` | `await user.click` |
|------------------------------------------------------|:----------------:|:------------------:|
| Eliminar handler de `mousedown`                      | Sobrevive        | Muere (si asserteas el efecto) |
| Cambiar `disabled` de `true` a `false`               | Sobrevive        | Muere (el click no debería ocurrir) |
| Quitar `focus` en el input al clickar una label      | Sobrevive        | Muere              |
| Cambiar `onInput` por `onChange`                     | Sobrevive con `fireEvent.change` | Muere con `user.type` |

**Regla práctica:** antes de usar `fireEvent`, pregúntate *"¿esto es un gesto humano?"*. Si lo es, usa `userEvent`. Si es un evento del sistema (scroll, load, custom), usa `fireEvent`.

### Troubleshooting

| Síntoma                                              | Causa probable                                 |
|------------------------------------------------------|------------------------------------------------|
| Test pasa sin verificar nada                         | Falta `await` en `user.*`                      |
| `user.type` se cuelga / timeout                      | `vi.useFakeTimers()` sin `advanceTimers` en `setup()` |
| `unable to click on element` en happy-dom            | `pointer-events: none` heredado — usa `pointerEventsCheck: Never` con precaución |
| `fireEvent.change` no dispara el handler del componente | En formularios Angular/Vue usa `user.type` o `user.clear`+`user.type`, no `change` |
| `selectOptions` no cambia el valor en Vue            | El `<select>` necesita `v-model`. Si usas eventos custom, expón el value accesible |
| Emitted array vacío en Vue tras click                | El click pasó antes del render — falta `await` en el click, no en el assert |

### Anti-patrones comunes

| Anti-patrón                                     | Por qué                                                  | Alternativa                           |
|-------------------------------------------------|----------------------------------------------------------|---------------------------------------|
| `userEvent.click(...)` sin `setup()`            | API v13 deprecada. En v14 lanza warning o falla.         | `const user = userEvent.setup()`      |
| `fireEvent.click` por defecto                   | Pierde realismo, baja mutation score                     | `await user.click`                    |
| Falta `await`                                   | Assertions corren antes del render                       | Siempre `await user.*`                |
| `fireEvent.change(input, { target: { value }})` para simular escritura | No dispara `keydown`/`keyup`; pierde mutantes | `await user.clear(input); await user.type(input, 'x')` |
| Usar `userEvent` para `scroll`/`resize`/`load`  | No existe — `userEvent` modela gestos humanos            | `fireEvent.scroll(window, {...})`     |
| `pointerEventsCheck: Never` global              | Oculta bugs reales de `pointer-events: none`             | Usarlo solo en el test concreto si se justifica |

### Referencias

- Testing Library — user-event intro: <https://testing-library.com/docs/user-event/intro>
- Testing Library — setup: <https://testing-library.com/docs/user-event/setup>
- Testing Library — keyboard syntax: <https://testing-library.com/docs/user-event/keyboard>
- Testing Library — pointer API: <https://testing-library.com/docs/user-event/pointer>
- Vitest — fake timers: <https://vitest.dev/api/vi.html#vi-usefaketimers>
- Kent C. Dodds — *Common mistakes with React Testing Library* (válido para Angular/Vue): <https://kentcdodds.com/blog/common-mistakes-with-react-testing-library>

### Fuentes

- **Testing Library — *Guiding Principles*.** El principio *"the more your tests resemble the way your software is used, the more confidence they can give you"*, que sustenta la preferencia por `userEvent`. <https://testing-library.com/docs/guiding-principles/>
- **Testing Library — *user-event · Intro*.** Diferencias entre `userEvent` y `fireEvent`, secuencia completa de eventos al hacer click y al escribir, y por qué `fireEvent.click` no cubre `mousedown` ni `focus`. <https://testing-library.com/docs/user-event/intro>
- **Testing Library — *user-event · Setup*.** El patrón `userEvent.setup()` obligatorio desde v14 y opciones como `delay`, `advanceTimers` y `pointerEventsCheck`. <https://testing-library.com/docs/user-event/setup>
- **Testing Library — *user-event · Keyboard* y *Pointer*.** Sintaxis de teclas especiales (`{Enter}`, `{Shift>}…{/Shift}`) y gestos de puntero. <https://testing-library.com/docs/user-event/keyboard> · <https://testing-library.com/docs/user-event/pointer>
- **Vitest — *Fake Timers*.** Cómo `vi.useFakeTimers()` interfiere con los delays internos de user-event y por qué hace falta `advanceTimers` en `setup()`. <https://vitest.dev/api/vi.html#vi-usefaketimers>
- **Kent C. Dodds — *Common mistakes with React Testing Library*.** Aplicable tal cual a Angular y Vue: anti-patrones de `fireEvent` y olvido de `await`. <https://kentcdodds.com/blog/common-mistakes-with-react-testing-library>

> Bibliografía completa del taller en [`15-referencias.md`](./15-referencias.md).

---
