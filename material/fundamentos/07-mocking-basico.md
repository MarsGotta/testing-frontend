# Mocking básico

> Taller 1 — Fundamentos del Testing Frontend | Sección 7
>
> **Modalidad:** tutorial + explanation (conceptos stub/spy/mock + APIs de Vitest para aplicarlos).
> **Tiempo estimado:** 30 min.
> **Prerrequisitos:** secciones 04–06. Conocer `render()`, queries y `userEvent`.
> **Stack validado:** Vitest 4.x, Angular 17–21, Vue 3.x, React 19 (abril 2026).
>
> Este archivo cubre **solo los fundamentos**: qué es un doble de prueba, cómo se crea con `vi.fn()` / `vi.spyOn()` y cómo se verifica. Todo lo relativo a `vi.mock()` (hoisting, módulos, MSW, stores, router) vive en [`12-mocking-avanzado.md`](./12-mocking-avanzado.md).

---

## Por qué mockear

Cuando testeas un componente o un servicio, casi nunca vive en aislamiento. Suele depender de un `ApiService`, un store, un temporizador, `Date.now()`… Si dejas que esas dependencias corran de verdad, pasan tres cosas:

- los tests pegan a red, así que se vuelven flakey y lentos,
- el resultado depende del reloj, así que mañana a otra hora falla,
- el test deja de probar tu código y pasa a probar el de otros.

Un doble de prueba sustituye esas colaboraciones por una versión controlada. Tú decides qué devuelve, qué observa y cuándo.

> **Regla práctica:** mockea las fronteras del sistema (red, tiempo, estado global, módulos pesados). No mockees el SUT (System Under Test) ni la lógica que quieres verificar. Si la mockeas, el test no prueba nada. El diagrama de decisión completo está en [`12-mocking-avanzado.md` §1](./12-mocking-avanzado.md#1-cuando-mockear-y-cuando-no-diagrama-de-decision).

---

## Stub, spy, mock, fake

Todos son dobles de prueba en la terminología que fijó Gerard Meszaros en *xUnit Test Patterns* (2007), pero la intención cambia según el caso. Mezclar los términos es fuente habitual de confusión. Con Vitest los construyes todos a partir de `vi.fn()` o `vi.spyOn()`, y aun así conviene tener claro qué estás montando: la aserción que escribes después depende de ello.

> **Fuente:** Gerard Meszaros — *xUnit Test Patterns: Refactoring Test Code* (Addison-Wesley, 2007). Resumen online de la taxonomía en <http://xunitpatterns.com/Test%20Double.html>. Martin Fowler la divulga en *Mocks Aren't Stubs*: <https://martinfowler.com/articles/mocksArentStubs.html>.

| Tipo      | Intención                                           | Ejemplo Vitest                                  |
|-----------|-----------------------------------------------------|-------------------------------------------------|
| **Stub**  | Devolver un valor fijo predefinido                  | `vi.fn().mockReturnValue(9.99)`                 |
| **Spy**   | Observar llamadas sin cambiar comportamiento        | `vi.spyOn(obj, 'method')` sin `.mockReturnValue`|
| **Mock**  | Reemplazar una dependencia completa y verificar uso | `vi.fn()` que además valida con `toHaveBeenCalledWith` |
| **Fake**  | Implementación alternativa ligera y funcional       | `InMemoryCartRepository` (clase real simplificada) |

> **Nota:** los *fakes* son útiles para integración (p.ej. un repositorio en memoria), pero la mayoría de tests unitarios que verás usan stub/spy/mock. Este archivo se centra en esos tres.

### Qué diferencia a un spy de un mock

- Un spy deja que el método real siga ejecutándose y solo le añade observabilidad. Lo quieres cuando el efecto te importa tanto como la llamada: por ejemplo, verificar que `logger.error` se llamó sin silenciarlo.
- Un mock reemplaza la implementación. El método real no corre. Lo quieres cuando el efecto es indeseable (red, escritura a disco, etc.).

En Vitest, `vi.spyOn(obj, 'm')` arranca como spy puro. En cuanto encadenas `.mockReturnValue()` o `.mockImplementation()`, el spy se convierte en mock.

---

## `vi.fn()` — crear una función mock

`vi.fn()` devuelve una función que registra sus llamadas y te deja configurar qué hace cuando la invocas.

```ts
import { vi, describe, it, expect } from 'vitest';

describe('vi.fn() — fundamentos', () => {
  it('registra llamadas y argumentos', () => {
    const addToCart = vi.fn();

    addToCart('sku-001', 2);
    addToCart('sku-002', 1);

    expect(addToCart).toHaveBeenCalledTimes(2);
    expect(addToCart).toHaveBeenCalledWith('sku-001', 2);
    expect(addToCart).toHaveBeenLastCalledWith('sku-002', 1);
    expect(addToCart.mock.calls).toEqual([
      ['sku-001', 2],
      ['sku-002', 1],
    ]);
  });

  it('actúa como stub devolviendo un valor fijo', () => {
    const getPrice = vi.fn().mockReturnValue(9.99);

    expect(getPrice('sku-001')).toBe(9.99);
    expect(getPrice('sku-999')).toBe(9.99); // siempre lo mismo
  });

  it('devuelve valores distintos en cada llamada', () => {
    const nextId = vi.fn()
      .mockReturnValueOnce('id-1')
      .mockReturnValueOnce('id-2')
      .mockReturnValue('id-default');

    expect(nextId()).toBe('id-1');
    expect(nextId()).toBe('id-2');
    expect(nextId()).toBe('id-default'); // todas las siguientes
  });

  it('stub asíncrono (resolved)', async () => {
    const fetchCart = vi.fn().mockResolvedValue({ items: [], total: 0 });

    await expect(fetchCart()).resolves.toEqual({ items: [], total: 0 });
  });

  it('stub asíncrono (rejected)', async () => {
    const fetchCart = vi.fn().mockRejectedValue(new Error('network'));

    await expect(fetchCart()).rejects.toThrow('network');
  });

  it('implementación con lógica propia', () => {
    const applyDiscount = vi.fn().mockImplementation(
      (price: number, pct: number) => price * (1 - pct)
    );

    expect(applyDiscount(100, 0.2)).toBe(80);
    expect(applyDiscount).toHaveBeenCalledWith(100, 0.2);
  });
});
```

### `mockReturnValue` vs `mockResolvedValue` vs `mockImplementation`

| Método                    | Cuándo usarlo                                                                 |
|---------------------------|-------------------------------------------------------------------------------|
| `mockReturnValue(v)`      | La función devuelve un valor **síncrono** y constante.                        |
| `mockResolvedValue(v)`    | La función devuelve una `Promise` resuelta con `v`. Atajo de `mockImplementation(() => Promise.resolve(v))`. |
| `mockRejectedValue(e)`    | La función devuelve una `Promise` que rechaza con `e`.                        |
| `mockImplementation(fn)`  | Necesitas lógica (condicionales, cálculos, efectos colaterales controlados).  |

Las variantes `...Once` (`mockReturnValueOnce`, `mockResolvedValueOnce`, etc.) consumen una respuesta por llamada y, cuando se agotan, caen al valor por defecto. Son útiles para simular secuencias: el primer intento falla, el reintento resuelve.

---

## `vi.spyOn()` — espiar métodos existentes

`vi.spyOn(obj, 'method')` envuelve un método sin sustituirlo. Te da observabilidad por defecto. Si además quieres cambiar qué devuelve, encadena `.mockReturnValue()` o `.mockImplementation()`.

```ts
import { vi, describe, it, expect, afterEach } from 'vitest';

const cartPricing = {
  unitPrice: (sku: string) => (sku === 'sku-001' ? 9.99 : 0),
  vatRate: () => 0.21,
};

describe('vi.spyOn() — fundamentos', () => {
  afterEach(() => vi.restoreAllMocks()); // ← restaura los originales

  it('observa sin alterar el comportamiento', () => {
    const spy = vi.spyOn(cartPricing, 'unitPrice');

    const price = cartPricing.unitPrice('sku-001');

    expect(price).toBe(9.99);                   // original funciona
    expect(spy).toHaveBeenCalledWith('sku-001');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('puede reemplazar el retorno temporalmente', () => {
    const spy = vi.spyOn(cartPricing, 'vatRate').mockReturnValue(0);

    expect(cartPricing.vatRate()).toBe(0); // mockeado
    expect(spy).toHaveBeenCalled();
  });

  it('silencia y verifica un logger', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    console.error('precio negativo');

    expect(spy).toHaveBeenCalledWith('precio negativo');
  });
});
```

> **Cuándo preferir `spyOn` a `vi.fn()`:** cuando el método ya existe en un objeto real que vas a inyectar. Te ahorras construir un doble a mano y, si la firma del original cambia, el test se entera.

---

## Matchers esenciales

Estos son los que vas a usar en el 90 % de los tests.

| Matcher                          | Comprueba                                                       |
|----------------------------------|-----------------------------------------------------------------|
| `toHaveBeenCalled()`             | Se invocó al menos una vez.                                     |
| `toHaveBeenCalledTimes(n)`       | Se invocó exactamente `n` veces.                                |
| `toHaveBeenCalledWith(...args)`  | **Alguna** llamada recibió esos argumentos exactos.             |
| `toHaveBeenLastCalledWith(...)`  | La **última** llamada recibió esos argumentos.                  |
| `toHaveBeenNthCalledWith(n, ...)`| La llamada número `n` recibió esos argumentos.                  |
| `toHaveReturnedWith(v)`          | Alguna llamada devolvió `v`.                                    |

Para argumentos parciales, combina con `expect.objectContaining`, `expect.arrayContaining`, `expect.stringMatching` o `expect.any(Constructor)`.

```ts
expect(addToCart).toHaveBeenCalledWith(
  expect.objectContaining({ sku: 'sku-001' }),
  expect.any(Number),
);
```

> ⚠ **Mutation score: cuidado con asserts demasiado laxos.** Un `expect(addToCart).toHaveBeenCalled()` pasa igual si le pasas un SKU correcto o `undefined`. Stryker mutará los argumentos y tu test no se va a enterar. Verifica argumentos específicos siempre que sea razonable. En los reportes de Stryker que hemos revisado con un cliente del sector (un equipo con 20+ squads), buena parte de los mutantes supervivientes viene justo de este patrón.

---

## Parte A — Angular

El patrón habitual es inyectar el servicio colaborador y sustituirlo por un doble en la configuración del `TestBed`.

```ts
// cart.service.ts
import { Injectable } from '@angular/core';
import { PricingService } from './pricing.service';

@Injectable({ providedIn: 'root' })
export class CartService {
  constructor(private pricing: PricingService) {}

  totalFor(skus: string[]): number {
    return skus.reduce((acc, sku) => acc + this.pricing.unitPrice(sku), 0);
  }
}
```

```ts
// cart.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CartService } from './cart.service';
import { PricingService } from './pricing.service';

describe('CartService', () => {
  let service: CartService;
  let pricing: { unitPrice: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    pricing = { unitPrice: vi.fn() }; // ← mock del colaborador

    TestBed.configureTestingModule({
      providers: [
        CartService,
        { provide: PricingService, useValue: pricing }, // ← inyectado
      ],
    });
    service = TestBed.inject(CartService);
  });

  it('suma el precio unitario de cada SKU', () => {
    pricing.unitPrice
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(5);

    const total = service.totalFor(['sku-001', 'sku-002']);

    expect(total).toBe(15);
    expect(pricing.unitPrice).toHaveBeenCalledTimes(2);
    expect(pricing.unitPrice).toHaveBeenNthCalledWith(1, 'sku-001');
    expect(pricing.unitPrice).toHaveBeenNthCalledWith(2, 'sku-002');
  });
});
```

> **Alternativas para casos más complejos:** mockear un servicio HTTP real, `HttpTestingController`, `provideHttpClientTesting`, stores NgRx o Router. Todo eso está en [`12-mocking-avanzado.md` §3 y §7](./12-mocking-avanzado.md#3-mocking-de-servicios-http).

---

## Parte B — Vue 3

En Vue 3 tienes tres vías habituales: pasar la dependencia como prop, inyectarla con `provide`/`inject`, o desestructurar un composable mockeado.

```ts
// useCart.ts
export function useCart(pricing: { unitPrice: (sku: string) => number }) {
  function totalFor(skus: string[]): number {
    return skus.reduce((acc, sku) => acc + pricing.unitPrice(sku), 0);
  }
  return { totalFor };
}
```

```ts
// useCart.spec.ts
import { describe, it, expect, vi } from 'vitest';
import { useCart } from './useCart';

describe('useCart', () => {
  it('suma el precio unitario de cada SKU', () => {
    const unitPrice = vi.fn()
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(5);

    const { totalFor } = useCart({ unitPrice });

    expect(totalFor(['sku-001', 'sku-002'])).toBe(15);
    expect(unitPrice).toHaveBeenCalledTimes(2);
    expect(unitPrice).toHaveBeenNthCalledWith(1, 'sku-001');
  });
});
```

Si la dependencia llega por un composable global (`useI18n`, `useRouter`, una store de Pinia), tira de `vi.mock('vue-router', …)` o de `createTestingPinia`. Ambos casos están cubiertos en [`12-mocking-avanzado.md` §7.2 y §8.2](./12-mocking-avanzado.md#72-pinia-store-vue).

---

## Parte C — React

En React tienes tres vías para inyectar un doble: pasarlo como prop (o argumento del hook), montarlo en un Context, o mockear el módulo entero con `vi.mock()`. Las dos primeras las ves aquí; el mock de módulo vive en [`12` §2.3](./12-mocking-avanzado.md#23-vimock---mocking-de-modulos).

### Inyección por argumento del hook

Igual que el composable de Vue, un custom hook que recibe la dependencia como parámetro se testea sin montar nada.

```ts
// useCart.ts
export function useCart(pricing: { unitPrice: (sku: string) => number }) {
  function totalFor(skus: string[]): number {
    return skus.reduce((acc, sku) => acc + pricing.unitPrice(sku), 0);
  }
  return { totalFor };
}
```

```ts
// useCart.test.ts
import { describe, it, expect, vi } from 'vitest';
import { useCart } from './useCart';

describe('useCart', () => {
  it('suma el precio unitario de cada SKU', () => {
    const unitPrice = vi.fn()
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(5);

    const { totalFor } = useCart({ unitPrice });

    expect(totalFor(['sku-001', 'sku-002'])).toBe(15);
    expect(unitPrice).toHaveBeenCalledTimes(2);
    expect(unitPrice).toHaveBeenNthCalledWith(1, 'sku-001');
  });
});
```

> **Nota:** si el hook no toca DOM ni hooks de React (estado, efectos), lo invocas como una función normal. Para hooks con `useState` o `useEffect`, usa `renderHook` de Testing Library.

### Inyección por Context

Cuando el componente consume la dependencia con `useContext`, el test monta un `Provider` con el doble. Es el equivalente funcional a `providers: [{ provide, useValue }]` de Angular.

```tsx
// PricingContext.tsx
import { createContext, useContext } from 'react';

export type Pricing = { unitPrice: (sku: string) => number };

const PricingContext = createContext<Pricing | null>(null);

export const PricingProvider = PricingContext.Provider;

export function usePricing(): Pricing {
  const ctx = useContext(PricingContext);
  if (!ctx) throw new Error('PricingProvider falta en el árbol');
  return ctx;
}
```

```tsx
// CartSummary.tsx
import { usePricing } from './PricingContext';

export function CartSummary({ skus }: { skus: string[] }) {
  const pricing = usePricing();
  const total = skus.reduce((acc, sku) => acc + pricing.unitPrice(sku), 0);
  return <p>Total: {total.toFixed(2)} €</p>;
}
```

```tsx
// CartSummary.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PricingProvider } from './PricingContext';
import { CartSummary } from './CartSummary';

describe('<CartSummary>', () => {
  it('pinta el total usando el pricing inyectado', () => {
    const unitPrice = vi.fn()
      .mockReturnValueOnce(10)
      .mockReturnValueOnce(5);

    render(
      <PricingProvider value={{ unitPrice }}>
        <CartSummary skus={['sku-001', 'sku-002']} />
      </PricingProvider>,
    );

    expect(screen.getByText(/total:\s*15\.00/i)).toBeInTheDocument();
    expect(unitPrice).toHaveBeenCalledTimes(2);
    expect(unitPrice).toHaveBeenNthCalledWith(1, 'sku-001');
  });
});
```

> **Cuándo elegir cada vía:** si la dependencia la comparte medio árbol (auth, i18n, tema), Context. Si la usan uno o dos componentes, props o hook con argumento. Si la dependencia llega por `import`, mock de módulo con `vi.mock()` ([`12` §2.3](./12-mocking-avanzado.md#23-vimock---mocking-de-modulos)).

---

## Inspeccionar un mock: `.mock.calls` y `.mock.results`

Cuando los matchers de alto nivel no te dan la granularidad que necesitas, o cuando estás depurando, accede al estado bruto del mock:

```ts
const addToCart = vi.fn();
addToCart('sku-001', 2);
addToCart('sku-002', 1);

addToCart.mock.calls;
// [ ['sku-001', 2], ['sku-002', 1] ]

addToCart.mock.calls[0][0]; // 'sku-001'
addToCart.mock.results;
// [ { type: 'return', value: undefined }, { type: 'return', value: undefined } ]
```

`mock.results` también captura las excepciones (`type: 'throw'`). Viene bien cuando un `mockImplementation` lanza para ciertos inputs y el resto de llamadas resuelven con normalidad.

---

## Limpiar mocks entre tests

Es fácil que el estado de un mock se filtre entre tests y acabe causando falsos positivos o negativos. Vitest ofrece tres APIs con efectos distintos:

| API                         | Limpia historial | Resetea implementación | Restaura original (solo `spyOn`) |
|-----------------------------|:----------------:|:----------------------:|:--------------------------------:|
| `vi.clearAllMocks()`        | sí               | no                     | no                               |
| `vi.resetAllMocks()`        | sí               | sí (→ `undefined`)     | no                               |
| `vi.restoreAllMocks()`      | sí               | sí                     | sí                               |

> **Preferencia:** activa `restoreMocks: true` en `vitest.config.ts` para que `restoreAllMocks` corra automáticamente entre tests. Los detalles y los casos borde están en [`12-mocking-avanzado.md` §9.1](./12-mocking-avanzado.md#91-limpiar-mocks-clear-vs-reset-vs-restore).

---

## Checklist de revisión

Antes de dar por bueno un test con mocks, repasa:

- [ ] El SUT no está mockeado.
- [ ] Mockeas solo fronteras: red, tiempo, estado global, módulos pesados.
- [ ] Verificas argumentos específicos con `toHaveBeenCalledWith`, no solo con `toHaveBeenCalled`.
- [ ] Si usas `spyOn`, restauras con `mockRestore` o `restoreAllMocks`.
- [ ] Los mocks no se filtran entre tests (`clear`/`reset`/`restore` configurado).
- [ ] El test falla si cambias la implementación del SUT. Introduce un `return 0` a mano y comprueba que rompe.

---

## Qué viene en el Taller 2

Cuando te encuentres con:

- un módulo que importa 200 KB de UI → [`12` §2.3 — `vi.mock()` y hoisting](./12-mocking-avanzado.md#23-vimock---mocking-de-modulos),
- una petición HTTP real que no quieres lanzar → [`12` §3–§4 — `HttpTestingController` y MSW](./12-mocking-avanzado.md#3-mocking-de-servicios-http),
- un store NgRx/Pinia → [`12` §7](./12-mocking-avanzado.md#7-mocking-de-state-management-stores),
- un `Router` que navega en mitad del test → [`12` §8](./12-mocking-avanzado.md#8-mocking-de-routernavegacion),
- un `setTimeout` o un Observable colgado → [`13-dominio-asincronia.md`](./13-dominio-asincronia.md).

---

## Fuentes

- **Gerard Meszaros — *xUnit Test Patterns: Refactoring Test Code* (Addison-Wesley, 2007).** Origen de la taxonomía stub / spy / mock / fake / dummy. Catálogo abreviado en <http://xunitpatterns.com/Test%20Double.html>.
- **Martin Fowler — *Mocks Aren't Stubs*.** Divulgación accesible de la distinción entre dobles que verifican estado y dobles que verifican comportamiento. <https://martinfowler.com/articles/mocksArentStubs.html>
- **Vitest — *Vi API Reference*.** `vi.fn()`, `vi.spyOn()`, `mockReturnValue`, `mockResolvedValue`, `mockImplementation` y variantes `*Once`. <https://vitest.dev/api/vi.html>
- **Vitest — *Mock API Reference*.** Matchers como `toHaveBeenCalledWith`, acceso a `mock.calls` / `mock.results` y las diferencias entre `mockClear` / `mockReset` / `mockRestore`. <https://vitest.dev/api/mock.html>
- **Epic Web Dev — *The Difference Between Clearing, Resetting, and Restoring Mocks*.** Referencia práctica para elegir la API adecuada entre tests. <https://www.epicweb.dev/the-difference-between-clearing-resetting-and-restoring-mocks>

> Bibliografía completa del taller en [`15-referencias.md`](./15-referencias.md).

---
