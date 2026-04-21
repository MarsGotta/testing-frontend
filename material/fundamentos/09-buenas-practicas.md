# Buenas Prácticas

> Taller 1 — Fundamentos del Testing Frontend | Sección 9
> Modalidad: **explicación** (por qué cada práctica, con contraejemplos). Cierre del Taller 1 antes de entrar al avanzado.
> **Stack validado (2026-04):** Vitest 4.x · `@testing-library/angular` 16.x · `@testing-library/vue` 8.x · `@testing-library/react` 16.x · `@testing-library/user-event` 14.x · Angular 17–21 · Vue 3.x · React 19 · happy-dom

Este archivo consolida los anti-patrones que, en la práctica, explican por qué una suite con alto coverage de líneas puede quedarse en un mutation score bajo —el patrón recurrente que vemos en equipos de 20+ squads con suites grandes—. No repasa conceptos ya cubiertos, solo los enlaza: AAA, naming, granularidad y asserts específicos quedan para sus archivos. Lo que añade aquí es el mapa de qué evitar y cómo conecta con el roadmap de mejora del mutation score que está en [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md).

### La regla de oro del código de tests

Yoni Goldberg mantiene *JavaScript & Node.js Testing Best Practices*, un repositorio en GitHub con más de treinta mil estrellas donde recoge más de cincuenta patrones y anti-patrones. De ahí sale la regla que resume este archivo.

> *"Test code is not like production code — design it to be short, flat and duplicated, with minimal abstractions."*
>
> > **Fuente:** Yoni Goldberg, *JavaScript & Node.js Testing Best Practices*. <https://github.com/goldbergyoni/javascript-testing-best-practices>

Un buen test cumple tres propiedades que no son negociables:

- **Lineal**: se lee de arriba a abajo sin saltar a helpers, mixins ni archivos `spec-utils/`.
- **Autocontenido**: todo el Arrange está a la vista en el propio `it`. Como mucho, una `setup()` local al `describe`.
- **Evidente**: si falla, el nombre y el mensaje del matcher bastan para diagnosticar sin abrir el SUT.

Refactorizar los tests como si fueran código de producción (DRY, herencia, helpers profundos) es la causa número uno de suites frágiles e ilegibles. En testing se prefiere el principio **DAMP** (*Descriptive And Meaningful Phrases*), que la comunidad de Google Testing Blog popularizó frente al DRY clásico de Andy Hunt y Dave Thomas. En el código de tests conviene duplicar antes que abstraer.

Los fundamentos estructurales están en [`02-anatomia-de-un-test.md`](./02-anatomia-de-un-test.md): AAA, convención de nombres, granularidad y asserts específicos frente a genéricos. Aquí asumimos ese vocabulario.

---

### Mapa de anti-patrones

Tabla resumen. Cada fila se expande en las secciones siguientes con ejemplos en Angular, Vue y React cuando el código cambia entre frameworks. Donde el principio es puramente conceptual, vale igual para los tres.

| # | Anti-patrón | Por qué duele | Señal en el mutation report |
|---|---|---|---|
| 1 | Testar implementación (`componentInstance`, `vm.$data`, hooks internos, métodos privados) | Refactor rompe tests sin que el comportamiento cambie | Mutantes de método privado **killed** pero flujo público ignorado |
| 2 | Selectores CSS acoplados al DOM (`.card > span:nth-child(2)`) | Cualquier cambio de marcado rompe el test | No aplica — problema de mantenimiento, no de detección |
| 3 | `data-testid` cuando hay rol semántico | Oculta problemas de accesibilidad, no escala | No aplica |
| 4 | Tests sin `await` / `subscribe` sin esperar | El test pasa aunque la aserción no corra | Mutantes en el callback async **survived** |
| 5 | `beforeEach` con lógica compleja | Esconde el Arrange, acopla tests entre sí | Depuración costosa al caer uno |
| 6 | Fixtures globales mutables | Orden de ejecución cambia el resultado | Tests intermitentes marcados como flakey |
| 7 | Asserts genéricos (`toBeTruthy`, `toBeDefined`) | No verifican el valor, solo su existencia | Mutantes aritméticos y relacionales **survived** |
| 8 | Tests bola-de-nieve (flujo completo en un `it`) | Al fallar, no sabes qué paso rompió | Dificulta localizar mutantes vivos |
| 9 | Snapshots gigantes | Nadie los revisa, se aprueban a ciegas | Ver [`08-snapshots-y-accesibilidad.md`](./08-snapshots-y-accesibilidad.md) |
| 10 | Mocks que no se resetean entre tests | Estado residual entre `it` contiguos | Ver [`07-mocking-basico.md`](./07-mocking-basico.md) y [`12-mocking-avanzado.md`](./12-mocking-avanzado.md) |

---

### 1. Testar implementación en lugar de comportamiento

Es el error más costoso en frameworks que exponen el interior con facilidad. Angular da acceso a `fixture.componentInstance` y Vue 2 da acceso a `wrapper.vm`. React no tiene un punto de entrada tan directo, pero el mismo anti-patrón aparece cuando el test monta un hook con `renderHook` solo para leer su estado, o cuando pasa un `ref` para espiar el valor interno. Si el test conoce esas variables internas, cualquier refactor que conserve el comportamiento rompe la suite.

```typescript
// ❌ Angular: acoplado al nombre de la propiedad del componente
it('abre el modal al hacer clic', () => {
  const fixture = TestBed.createComponent(CartDialogComponent);
  fixture.componentInstance.openDialog();         // invoca método directamente
  expect(fixture.componentInstance.isOpen).toBe(true); // lee estado interno
});

// ❌ Vue: inspecciona datos reactivos del componente
it('abre el modal al hacer clic', () => {
  const wrapper = mount(CartDialog);
  wrapper.vm.openDialog();
  expect(wrapper.vm.isOpen).toBe(true);
});

// ❌ React: prueba el hook en aislamiento y lee su estado sin pasar por el DOM
import { renderHook, act } from '@testing-library/react';

it('abre el modal al hacer clic', () => {
  const { result } = renderHook(() => useCartDialog());
  act(() => result.current.openDialog());
  expect(result.current.isOpen).toBe(true); // comprueba el flag, no lo que ve el usuario
});
```

Los tres rompen si renombras `isOpen` a `isVisible`, si migras de `ref` a `computed`, o si sustituyes `useState` por `useReducer`, sin que el usuario note nada.

```typescript
// ✅ Angular con Testing Library: interactúa como el usuario
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';

it('abre el modal al pulsar "Ver carrito"', async () => {
  const user = userEvent.setup();
  await render(CartDialogComponent);

  await user.click(screen.getByRole('button', { name: /ver carrito/i }));

  expect(screen.getByRole('dialog', { name: /tu carrito/i })).toBeVisible();
});

// ✅ Vue con Testing Library
import { render, screen } from '@testing-library/vue';
import userEvent from '@testing-library/user-event';

it('abre el modal al pulsar "Ver carrito"', async () => {
  const user = userEvent.setup();
  render(CartDialog);

  await user.click(screen.getByRole('button', { name: /ver carrito/i }));

  expect(screen.getByRole('dialog', { name: /tu carrito/i })).toBeVisible();
});

// ✅ React con Testing Library
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('abre el modal al pulsar "Ver carrito"', async () => {
  const user = userEvent.setup();
  render(<CartDialog />);

  await user.click(screen.getByRole('button', { name: /ver carrito/i }));

  expect(screen.getByRole('dialog', { name: /tu carrito/i })).toBeVisible();
});
```

Como regla práctica: si puedes hacer el mismo test desde las teclas del usuario, hazlo desde ahí. Reserva `componentInstance`, `vm` y `renderHook` para casos justificados, como los tests unitarios de un servicio Angular expuesto vía DI o un hook React reutilizable publicado como librería.

> Esta disciplina también sube el mutation score. Los mutantes que sobreviven suelen esconderse en ramas de comportamiento observable. Si tus tests solo inspeccionan el estado interno, no detectan que ese estado haya dejado de traducirse en el DOM.

---

### 2. Selectores acoplados a la estructura DOM

```typescript
// ❌ Rompe si cambias de <span> a <p>, si añades un wrapper, si reordenas
const { container } = render(CartSummary, { props: { items } });
const total = container.querySelector('.cart-summary > footer > span.total');
expect(total?.textContent).toBe('12,99 €');

// ❌ Aún peor: posición en el árbol
expect(container.children[0].children[1].textContent).toBe('12,99 €');
```

```typescript
// ✅ Query semántica estable frente a refactors de marcado
render(CartSummary, { props: { items } });
expect(screen.getByRole('status', { name: /total del carrito/i })).toHaveTextContent('12,99 €');
```

Las queries de Testing Library aguantan bien los cambios visuales: `getByRole`, `getByLabelText` y `getByText` siguen funcionando aunque reordenes el marcado. La jerarquía de prioridad está en [`05-queries-testing-library.md`](./05-queries-testing-library.md).

---

### 3. `data-testid` como último recurso

Ponle `data-testid` a un elemento solo cuando no hay forma semántica razonable de localizarlo. No lo uses como atajo para saltarte el trabajo de accesibilidad.

```html
<!-- ❌ Forzar data-testid cuando hay rol -->
<button data-testid="add-to-cart-btn">Añadir al carrito</button>

<!-- ✅ El rol y el nombre accesible ya lo localizan -->
<button>Añadir al carrito</button>
```

```typescript
// ❌
screen.getByTestId('add-to-cart-btn');
// ✅
screen.getByRole('button', { name: /añadir al carrito/i });
```

Usa `data-testid` sólo cuando:

- El elemento no tiene rol semántico natural (un wrapper genérico imprescindible).
- El nombre accesible es dinámico y poco fiable.
- Convives con una librería de terceros que no te deja controlar el marcado.

Kent C. Dodds lo explica en [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library). El consejo vale tal cual para Angular y Vue Testing Library.

---

### 4. Tests que pasan sin assertar

Es el patrón más insidioso. El test aparece verde en CI, pero la aserción nunca llega a evaluarse.

```typescript
// ❌ Angular: Observable sin await, el expect nunca corre
it('carga el carrito del usuario', () => {
  cartService.getCart().subscribe(cart => {
    expect(cart.items).toHaveLength(2); // puede no ejecutarse jamás
  });
});

// ❌ Vue: promise colgada
it('actualiza el total al añadir', () => {
  cartStore.addItem(coffee); // retorna Promise, no se espera
  expect(cartStore.total).toBe(3); // evaluado antes de la actualización
});

// ❌ React: asserción antes de que el efecto termine
it('muestra los productos cargados', () => {
  render(<Cart userId="u1" />); // useEffect dispara un fetch
  expect(screen.getByText(/café/i)).toBeInTheDocument(); // todavía no está
});
```

```typescript
// ✅ Angular: firstValueFrom + async
import { firstValueFrom } from 'rxjs';

it('carga el carrito del usuario', async () => {
  const cart = await firstValueFrom(cartService.getCart());
  expect(cart.items).toHaveLength(2);
});

// ✅ Vue: esperar la promesa y el tick reactivo
import { nextTick } from 'vue';

it('actualiza el total al añadir', async () => {
  await cartStore.addItem(coffee);
  await nextTick();
  expect(cartStore.total).toBe(3);
});

// ✅ React: findBy espera a que el DOM refleje el efecto
it('muestra los productos cargados', async () => {
  render(<Cart userId="u1" />);
  expect(await screen.findByText(/café/i)).toBeInTheDocument();
});
```

Un truco extra. Configura `expect.hasAssertions()` en los tests async y Vitest fallará si no llegó a correr ningún `expect`:

```typescript
beforeEach(() => expect.hasAssertions());
```

El tratamiento completo de asincronía está en [`13-dominio-asincronia.md`](./13-dominio-asincronia.md): Observables, `fakeAsync`, Signals, `nextTick` y fake timers.

---

### 5. `beforeEach` con lógica compleja

Un `beforeEach` que supera cinco líneas o ramifica con `if`, bucles o `try/catch` convierte cada test en un misterio. Para entender qué hay en el estado inicial, tienes que saltar al hook. El Arrange deja de estar en el test.

```typescript
// ❌ El test ya no se explica por sí mismo
describe('CartComponent', () => {
  let fixture: ComponentFixture<CartComponent>;

  beforeEach(async () => {
    const items = await loadFixturesFromDisk();
    const user = buildUserFromEnv();
    TestBed.configureTestingModule({
      providers: [
        { provide: CartService, useValue: buildCartWithItems(items, user) },
        { provide: AuthService, useValue: makeAuth(user) },
      ],
    });
    fixture = TestBed.createComponent(CartComponent);
    fixture.componentInstance.user = user;
    fixture.componentInstance.items = items;
    fixture.detectChanges();
  });

  it('muestra el total', () => {
    // ¿De dónde salen los items? ¿Qué user? Hay que saltar al hook.
    expect(screen.getByText(/12,99 €/)).toBeInTheDocument();
  });
});
```

```typescript
// ✅ Angular: factory local + Arrange explícito en cada test
function renderCart(overrides: Partial<CartProps> = {}) {
  const defaults = {
    items: [{ id: 'p1', name: 'Café', price: 3, quantity: 1 }],
    user: { id: 'u1', name: 'Ana' },
  };
  return render(CartComponent, { componentProperties: { ...defaults, ...overrides } });
}

it('muestra el total de un carrito con un producto', async () => {
  await renderCart();
  expect(screen.getByRole('status', { name: /total/i })).toHaveTextContent('3,00 €');
});

it('muestra el total de un carrito con varios productos', async () => {
  await renderCart({
    items: [
      { id: 'p1', name: 'Café', price: 3, quantity: 2 },
      { id: 'p2', name: 'Té', price: 2, quantity: 3 },
    ],
  });
  expect(screen.getByRole('status', { name: /total/i })).toHaveTextContent('12,00 €');
});
```

```tsx
// ✅ React: misma idea, los defaults van como props del JSX
function renderCart(overrides: Partial<CartProps> = {}) {
  const defaults: CartProps = {
    items: [{ id: 'p1', name: 'Café', price: 3, quantity: 1 }],
    user: { id: 'u1', name: 'Ana' },
  };
  return render(<Cart {...defaults} {...overrides} />);
}

it('muestra el total de un carrito con un producto', () => {
  renderCart();
  expect(screen.getByRole('status', { name: /total/i })).toHaveTextContent('3,00 €');
});

it('muestra el total de un carrito con varios productos', () => {
  renderCart({
    items: [
      { id: 'p1', name: 'Café', price: 3, quantity: 2 },
      { id: 'p2', name: 'Té', price: 2, quantity: 3 },
    ],
  });
  expect(screen.getByRole('status', { name: /total/i })).toHaveTextContent('12,00 €');
});
```

Como regla práctica, usa `beforeEach` para el reset, no para construir el SUT. Ahí limpias mocks y reinicias timers. El SUT se construye dentro de cada test con una factory que acepta overrides.

---

### 6. Fixtures globales mutables

```typescript
// ❌ Un objeto compartido que cada test muta
const cart = { items: [], total: 0 };

it('añade un producto', () => {
  cart.items.push({ id: 'p1', price: 3, quantity: 1 });
  cart.total = 3;
  expect(cart.items).toHaveLength(1);
});

it('aplica descuento', () => {
  // ¿En qué estado está `cart`? Depende del orden de ejecución.
  expect(cart.total).toBe(3 * 0.9);
});
```

```typescript
// ✅ Factory: cada test pide su fixture fresco
function buildCart(overrides: Partial<Cart> = {}): Cart {
  return { items: [], total: 0, ...overrides };
}

it('añade un producto', () => {
  const cart = buildCart();
  addItem(cart, { id: 'p1', price: 3, quantity: 1 });
  expect(cart.items).toHaveLength(1);
});

it('aplica descuento del 10 % a miembros', () => {
  const cart = buildCart({ items: [coffeeItem()], total: 3 });
  applyMemberDiscount(cart);
  expect(cart.total).toBe(2.7);
});
```

Factory más overrides es el patrón que escala. Parte de un default sensato y deja que cada test ajuste lo que le importa. Nada de `let` en el `describe`.

---

### 7. Asserts genéricos que no matan mutantes

El tema está desarrollado en [`02-anatomia-de-un-test.md`](./02-anatomia-de-un-test.md#asserts-específicos-la-diferencia-entre-matar-mutantes-y-no-matarlos). Lo recordamos aquí porque es la palanca más directa sobre el mutation score:

| Evita | Prefiere |
|---|---|
| `toBeTruthy()` / `toBeFalsy()` | `toBe(valorEsperado)` |
| `toBeGreaterThan(0)` | `toBe(20)` (valor exacto) |
| `toBeDefined()` como único assert | Assert sobre forma y contenido |
| `toEqual(expect.any(Number))` | Valor concreto cuando lo conoces |

Cuando sobrevive un mutante que cambia `* 0.1` por `* 0.2`, la causa casi siempre está aquí.

---

### 8. Tests "bola de nieve"

```typescript
// ❌ Un it que recorre el flujo entero — si falla, no sabes dónde
it('flujo completo de compra', async () => {
  const user = userEvent.setup();
  await render(CheckoutPage);

  await user.click(screen.getByRole('button', { name: /añadir café/i }));
  expect(screen.getByText(/1 producto/)).toBeInTheDocument();

  await user.type(screen.getByLabelText(/cupón/i), 'SNGULAR10');
  await user.click(screen.getByRole('button', { name: /aplicar/i }));
  expect(screen.getByText(/-10 %/)).toBeInTheDocument();

  await user.click(screen.getByRole('button', { name: /pagar/i }));
  expect(screen.getByText(/pedido confirmado/i)).toBeInTheDocument();
});
```

La granularidad está explicada en [`02-anatomia-de-un-test.md`](./02-anatomia-de-un-test.md#granularidad-cuándo-partir-un-test-en-dos). El recordatorio operativo es sencillo: un comportamiento por `it`, y cuatro pasos se convierten en cuatro tests. El Arrange se comparte con una factory, no con un `beforeEach` de 40 líneas.

---

### 9. Snapshots gigantes

Un snapshot de 400 líneas se aprueba sin leerlo. Ya no protege contra regresiones; protege contra cambios, que es lo contrario de lo que quieres.

La práctica está en [`08-snapshots-y-accesibilidad.md`](./08-snapshots-y-accesibilidad.md). Resumen: snapshots inline de menos de 10 líneas, o ninguno.

---

### 10. Mocks sin reset entre tests

Las llamadas registradas, las implementaciones mock y los timers persisten entre un `it` y el siguiente si no los limpias. El tratamiento completo está en [`07-mocking-basico.md`](./07-mocking-basico.md) y [`12-mocking-avanzado.md`](./12-mocking-avanzado.md), incluida la diferencia entre `vi.clearAllMocks()`, `vi.resetAllMocks()` y `vi.restoreAllMocks()`.

La configuración mínima recomendada en `vitest.config.ts` es esta:

```typescript
export default defineConfig({
  test: {
    clearMocks: true,   // resetea llamadas entre tests
    restoreMocks: true, // restaura implementaciones originales tras spyOn
  },
});
```

---

### Conexión con el mutation score: qué corregir primero

El roadmap por fases —observado en un equipo de 20+ squads con suites grandes— está en [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md#1521-roadmap-de-mutation-score-de-22-a-60). Este archivo y aquel se leen en paralelo. Los anti-patrones de arriba son, casi uno a uno, la causa de los mutantes que sobreviven en cada fase.

| Fase del roadmap | Anti-patrón que más contribuye | Dónde se fija |
|---|---|---|
| **Fase 1** · NoCoverage | Tests que no asseran nada (#4) y archivos sin tests | #4 arriba + [`04-primer-componente.md`](./04-primer-componente.md) |
| **Fase 2** · Boundary | Asserts genéricos (#7) | #7 arriba + [`02-anatomia-de-un-test.md`](./02-anatomia-de-un-test.md) |
| **Fase 3** · Error paths | Promises/Observables sin esperar (#4), mocks residuales (#10) | #4 y #10 arriba + [`13-dominio-asincronia.md`](./13-dominio-asincronia.md) |

El orden de inversión es claro. Primero arregla los tests que no assertan, porque la ganancia es inmediata. Después endurece los asserts existentes para atacar los mutantes de frontera. Por último cubre los error paths. No te saltes el orden, porque endurecer asserts en un test que no corre no mueve el score.

---

### Checklist operativo antes de hacer merge

- [ ] ¿Ningún test accede a `componentInstance` / `vm` salvo justificación explícita?
- [ ] ¿Todos los selectores son semánticos (`getByRole` / `getByLabelText` / `getByText`)?
- [ ] ¿`data-testid` sólo donde no hay alternativa semántica?
- [ ] ¿Cada test `async` tiene `await` en cada acción asíncrona y al menos un `expect` garantizado?
- [ ] ¿El `beforeEach` se limita a reset, no construye el SUT?
- [ ] ¿El SUT se monta con una factory local que admite overrides?
- [ ] ¿Los asserts son específicos (valor exacto) cuando el valor se conoce?
- [ ] ¿Cada `it` verifica un único comportamiento?
- [ ] ¿`clearMocks`/`restoreMocks` activos en la config?
- [ ] ¿El nombre del test describiría el fallo sin necesidad de abrir el SUT?

---

### Referencias

- Yoni Goldberg — [JavaScript & Node.js Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices).
- Kent C. Dodds — [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library) (aplicable a Angular/Vue Testing Library).
- Martin Fowler — [Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html).
- Testing Library — [Guiding principle](https://testing-library.com/docs/guiding-principles).
- Testing Library — [Queries by priority](https://testing-library.com/docs/queries/about#priority).

---

## Fuentes

- Yoni Goldberg, *JavaScript & Node.js Testing Best Practices*. Origen de la regla de oro (*"short, flat and duplicated"*) y de la mayoría de anti-patrones del archivo. <https://github.com/goldbergyoni/javascript-testing-best-practices>
- Kent C. Dodds, *Common Mistakes with React Testing Library*. Base del criterio sobre `data-testid` como último recurso. <https://kentcdodds.com/blog/common-mistakes-with-react-testing-library>
- Martin Fowler, *Test Driven Development*. Referencia canónica del ciclo red-green-refactor. <https://martinfowler.com/bliki/TestDrivenDevelopment.html>
- Testing Library, *Guiding Principles* y *Queries by priority*. Fundamento del criterio "test the user, not the implementation". <https://testing-library.com/docs/guiding-principles> y <https://testing-library.com/docs/queries/about/#priority>
- Andy Hunt y Dave Thomas, *The Pragmatic Programmer*. Origen del principio DRY, matizado en testing como DAMP (*Descriptive And Meaningful Phrases*) por la comunidad de Google Testing Blog. <https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/>

---

### Siguiente paso

Con las bases del Taller 1 asentadas, el [`10-migracion-karma-vitest.md`](./10-migracion-karma-vitest.md) arranca el Taller 2. Ahí migras desde Karma y Jasmine a Vitest en proyectos Angular reales, y de ahí entras en mocking avanzado, asincronía y Stryker.
