---
titulo: Dominio de la asincronía en testing
modalidad: explanation + how-to + reference
prerrequisitos:
  - 03-jest-y-vitest.md (fundamentos de Vitest)
  - 10-migracion-karma-vitest.md (escenarios fakeAsync A/B)
  - Familiaridad con Promises y async/await
tiempo_estimado: 75 min (lectura completa) · 15–20 min (bloque 3b sesión síncrona)
stack_validado:
  - Vitest 4.x
  - Angular 17–21
  - Vue 3.x
  - React 19
  - RxJS 7.8+
  - '@testing-library/* 16.x'
  - '@vue/test-utils 2.x'
  - '@tanstack/react-query 5.x'
fecha_validacion: 2026-04-19
conecta_con:
  - 14-mutation-testing-stryker.md (tests async débiles dejan mutantes vivos)
  - 12-mocking-avanzado.md (mocks HTTP, stores, módulos pesados)
---

# Dominio de la asincronía en testing

> **Para quién es esta guía.** Has migrado de Karma a Vitest. Los tests pasan, pero los async flaky te sangran el mutation score. Aquí tienes tres cosas: (a) *explanation* — el modelo mental del event loop; (b) *how-to* — patrones concretos por escenario; (c) *reference* — tablas y árbol de decisión final.
>
> **Conexión con el mutation score (22,59 % → objetivo 60 %+).** Los tests async mal escritos son la principal fuente de mutantes supervivientes. Un `subscribe` sin `expect`, un `await` olvidado, un `waitFor` que retorna demasiado pronto. Cada patrón marcado `❌` en esta guía corresponde a un test que pasa pero **no mata mutantes**. Si subes la fiabilidad async, el mutation score sube detrás. Los porcentajes vienen de una suite grande en producción que usamos como caso de referencia (ver archivo 14).

---

## 1. Diagrama del event loop: cómo ejecuta JavaScript tu código async

Para testear código asíncrono con criterio, primero tienes que tener claro cómo JavaScript ejecuta el código:

```
  ┌──────────────────────────────────────────────────────────┐
  │                    CALL STACK                             │
  │  (Ejecuta codigo sincrono, una cosa a la vez)            │
  │  Ejemplo: function calls, asignaciones, if/else          │
  └─────────────────────────┬────────────────────────────────┘
                            │
                    ¿El Call Stack esta vacio?
                            │
                   ┌────────┴────────┐
                   │ NO              │ SI
                   │ Sigue           │
                   │ ejecutando      ▼
                   │           ┌─────────────────────────────┐
                   │           │   MICROTASK QUEUE            │
                   │           │   (Mayor prioridad)          │
                   │           │                              │
                   │           │   - Promise.then/catch       │
                   │           │   - queueMicrotask()         │
                   │           │   - MutationObserver         │
                   │           │   - process.nextTick (Node)  │
                   │           │                              │
                   │           │   Se ejecutan TODAS antes    │
                   │           │   de pasar a macrotasks      │
                   │           └──────────────┬───────────────┘
                   │                          │
                   │                ¿Queue vacia?
                   │                          │
                   │                 ┌────────┴────────┐
                   │                 │ NO              │ SI
                   │                 │ Ejecuta         │
                   │                 │ siguiente       ▼
                   │                 │ microtask  ┌─────────────────────────┐
                   │                 │            │   MACROTASK QUEUE       │
                   │                 │            │   (Menor prioridad)     │
                   │                 │            │                         │
                   │                 │            │   - setTimeout          │
                   │                 │            │   - setInterval         │
                   │                 │            │   - setImmediate (Node) │
                   │                 │            │   - I/O callbacks       │
                   │                 │            │   - UI rendering        │
                   │                 │            │                         │
                   │                 │            │   Se ejecuta UNA, luego │
                   │                 │            │   vuelve a microtasks   │
                   │                 │            └─────────────────────────┘
                   └─────────────────┘
```

### Por qué importa esto para testing

```typescript
console.log('1 - sincrono');

setTimeout(() => console.log('2 - macrotask'), 0);

Promise.resolve().then(() => console.log('3 - microtask'));

console.log('4 - sincrono');

// Orden de ejecucion: 1, 4, 3, 2
// Las Promises (microtask) se ejecutan ANTES que setTimeout (macrotask)
// aunque setTimeout tenga delay 0
```

Cuando usas `vi.advanceTimersByTime()` (sync), solo avanza los macrotasks. Las Promises que hay dentro de esos timers no se resuelven: son microtasks y necesitan un tick del event loop. De ahí las variantes `*Async()`.

### Más allá de micro/macrotasks: RAF y schedulers

Aparte de las dos colas principales, en frontend vas a tropezar con otras cuatro fuentes de asincronía:

- **`requestAnimationFrame` (RAF)**: corre antes del siguiente repintado del navegador (~16 ms a 60 fps). No es micro ni macro estricto; vive en la fase de rendering del event loop. Vitest mockea RAF con `vi.useFakeTimers()` desde la v1. Para avanzar exactamente un frame, usa `vi.advanceTimersToNextFrame()` (v1.3+). La API de fake timers de Vitest está documentada en la propia guía del runner.

> `vi.advanceTimersToNextFrame()` apareció en Vitest 1.3 y sigue activa en la rama 4.x.
>
> > **Fuente:** Vitest — Timers Guide. https://vitest.dev/guide/mocking/timers
> >
> > **Fuente:** Vitest — Vi API Reference. https://vitest.dev/api/vi.html
- **Schedulers de RxJS** (`asyncScheduler`, `asapScheduler`, `animationFrameScheduler`, `queueScheduler`): cada uno elige una cola distinta. `asyncScheduler` → macrotask, `asapScheduler` → microtask, `animationFrameScheduler` → RAF. El `TestScheduler` (§7) solo controla `asyncScheduler`. Para los demás, fake timers o mocks explícitos.
- **Zone.js** (Angular con `zoneless: false`): intercepta todo (timers, Promises, RAF) y lo convierte en eventos observables por `fixture.whenStable()` y `fakeAsync`. Por eso en el escenario A los patrones legacy siguen funcionando.
- **Signals (Angular 17+)**: sus `effect()` se programan con un scheduler interno propio. No caen en la cola de microtasks estándar, así que hace falta `TestBed.tick()` para drenarlos (§4.5).

> `vi.useFakeTimers()` **no** mockea `queueMicrotask` ni `process.nextTick` por defecto. Si tu código los usa, actívalos explícitamente: `vi.useFakeTimers({ toFake: ['nextTick', 'queueMicrotask'] })`.

---

## 2. Fundamentos async en Vitest

### 2.1 async/await en tests

```typescript
it('deberia obtener datos', async () => {
  const data = await fetchData();
  expect(data).toBe('valor esperado');
});
```

**Trampa clásica.** Si olvidas el `await`, el test pasa sin ejecutar las aserciones:

```typescript
// MAL - el test pasa SIEMPRE porque la promesa no se espera
it('deberia fallar', () => {
  expect(fetchData()).resolves.toBe('valor incorrecto');
  // Sin await, el test termina antes de que la promesa se resuelva
});

// BIEN
it('deberia fallar', async () => {
  await expect(fetchData()).resolves.toBe('valor correcto');
});
```

### 2.2 Matchers .resolves / .rejects

```typescript
// Promesa que se resuelve
await expect(fetchUser(1)).resolves.toEqual({ name: 'Ana' });

// Promesa que se rechaza
await expect(fetchUser(-1)).rejects.toThrow('User not found');

// Con matcher mas especifico
await expect(fetchUser(-1)).rejects.toThrowError(
  expect.objectContaining({
    message: 'User not found',
    code: 'NOT_FOUND',
  })
);
```

### 2.3 vi.waitFor() — espera con polling

Ejecuta un callback una y otra vez hasta que no lance error o se agote el timeout:

```typescript
await vi.waitFor(() => {
  expect(element.textContent).toBe('Cargado');
}, {
  timeout: 1000,   // ms (default: 1000)
  interval: 50,    // ms entre reintentos (default: 50)
});
```

### 2.4 expect.poll() — aserciones con retry

```typescript
await expect.poll(() => document.querySelector('.loaded')).toBeTruthy();

// Con opciones
await expect.poll(() => fetchStatus(), {
  timeout: 5000,
  interval: 100,
}).toBe('completed');
```

### 2.5 Timeouts

```typescript
// Por test individual
test('operacion lenta', async () => { /* ... */ }, 30000);

// En configuracion global (vitest.config.ts)
export default defineConfig({
  test: {
    testTimeout: 10000,
    hookTimeout: 5000,
  }
});
```

---

## 3. La trampa crítica: sync vs async en tres escenarios

### Escenario 1: setTimeout con callback simple (sync funciona)

Si el callback del timer es síncrono puro, `vi.advanceTimersByTime()` basta:

```typescript
function delayedGreeting(callback: (msg: string) => void) {
  setTimeout(() => {
    callback('Hello!'); // operacion sincrona dentro del timer
  }, 1000);
}

it('callback sincrono - sync funciona', () => {
  vi.useFakeTimers();
  const callback = vi.fn();

  delayedGreeting(callback);

  expect(callback).not.toHaveBeenCalled(); // aun no paso 1 segundo
  vi.advanceTimersByTime(1000);            // avanzar el reloj (sync)
  expect(callback).toHaveBeenCalledWith('Hello!'); // funciona

  vi.useRealTimers();
});
```

### Escenario 2: setTimeout con Promise dentro (sync falla)

Cuando el callback del timer contiene Promises, la versión síncrona no puede resolverlas:

```typescript
function delayedComputation(callback: (result: number) => void) {
  setTimeout(() => {
    // Promise dentro del timer!
    Promise.resolve(42).then(result => {
      callback(result);
    });
  }, 1000);
}

// MAL - sync no resuelve la Promise interna
it('falla silenciosamente con sync', () => {
  vi.useFakeTimers();
  const callback = vi.fn();

  delayedComputation(callback);
  vi.advanceTimersByTime(1000);

  // El setTimeout se ejecuto, pero el Promise.then() no!
  expect(callback).toHaveBeenCalled(); // FALLA - callback nunca fue llamado
  vi.useRealTimers();
});

// BIEN - async resuelve el timer Y la Promise
it('funciona con async', async () => {
  vi.useFakeTimers();
  const callback = vi.fn();

  delayedComputation(callback);
  await vi.advanceTimersByTimeAsync(1000); // async: resuelve timers + Promises

  expect(callback).toHaveBeenCalledWith(42); // funciona
  vi.useRealTimers();
});
```

### Escenario 3: setTimeout con fetch dentro (async obligatorio + mock)

El caso más difícil: timers que disparan peticiones HTTP.

```typescript
function scheduledSync() {
  return new Promise<string[]>((resolve) => {
    setTimeout(async () => {
      try {
        const response = await fetch('/api/sync');
        const data = await response.json();
        resolve(data.items);
      } catch (error) {
        resolve([]);
      }
    }, 5000);
  });
}

it('ejecuta sync programado', async () => {
  vi.useFakeTimers();

  // Mock de fetch (necesario porque fake timers no afectan a fetch)
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ items: ['a', 'b', 'c'] }),
  });
  vi.stubGlobal('fetch', mockFetch);

  const promise = scheduledSync();

  // Avanzar el timer Y resolver las Promises (fetch + json)
  await vi.advanceTimersByTimeAsync(5000);

  const result = await promise;
  expect(result).toEqual(['a', 'b', 'c']);
  expect(mockFetch).toHaveBeenCalledWith('/api/sync');

  vi.useRealTimers();
  vi.unstubAllGlobals();
});
```

**Resumen de la regla:**

```
¿Hay Promises dentro del timer?
│
├── NO (callback puro) ──────► vi.advanceTimersByTime()     (sync, más rápido)
│
└── SÍ (async/await, .then,
        fetch, Promise.resolve) ► vi.advanceTimersByTimeAsync() (async, obligatorio)
```

---

## 4. Async en Angular: migración de Zone.js a Vitest

### 4.1 El problema: Zone.js y Vitest

Hay dos escenarios posibles según cómo esté configurado tu setup de Vitest.

**Escenario A — setup con Zone.js testing cargado** (AnalogJS vitest-angular con `setupTestBed({ zoneless: false })`, o builder oficial de Angular 20 con Zone.js).

`fakeAsync()`, `tick()`, `flush()` y `waitForAsync()` **siguen funcionando tal cual**. Vienen de `@angular/core/testing`, no de Jasmine, así que no hay que migrarlos. La mayoría de equipos en Angular 17–20 está en este escenario.

**Escenario B — setup zoneless** (Angular 21+ por defecto, o AnalogJS con `zoneless: true`).

`fakeAsync`, `tick`, `flush` y `waitForAsync` **no funcionan**. Toca migrarlos a los equivalentes de Vitest (tabla en 4.2). Angular 21 pone zoneless como modo por defecto, según el anuncio oficial del equipo de Angular.

> El modo zoneless pasó a ser el default en Angular 21.
>
> > **Fuente:** Announcing Angular v21. https://blog.angular.dev/announcing-angular-v21-57946c34f14b
> >
> > **Fuente:** Angular — Zoneless Guide. https://angular.dev/guide/zoneless

**Cómo saber en cuál estás.** Mira tu `src/test-setup.ts`. Si importa `zone.js/testing`, estás en el escenario A; si no, en el B.

### 4.2 Tabla de migración (solo escenario B · zoneless)

> Aplica solo si tu setup NO carga `zone.js/testing`. En el escenario A, estas APIs siguen funcionando y **no hay que migrarlas**.

| Zone.js (Jasmine/Karma) | Vitest | Notas |
|--------------------------|--------|-------|
| `fakeAsync(() => { ... })` | `vi.useFakeTimers()` en `beforeEach` | Activar fake timers |
| `tick(ms)` | `vi.advanceTimersByTime(ms)` | Avanzar reloj (sync, sólo si no hay Promises dentro) |
| `tick()` sin argumento | `await Promise.resolve()` o `await vi.advanceTimersByTimeAsync(0)` | Flush microtasks pendientes |
| `flush()` | `await vi.runAllTimersAsync()` | Ejecutar todos los timers + microtasks encadenadas |
| `flushMicrotasks()` | `await vi.advanceTimersByTimeAsync(0)` | Solo microtasks |
| `waitForAsync(() => { ... })` | `async () => { await ... }` | Usar async/await nativo |
| `fixture.whenStable()` | `await fixture.whenStable()` | Funciona igual |
| `fixture.autoDetectChanges()` | `fixture.autoDetectChanges()` | Funciona igual |

### 4.3 Ejemplo: migrar fakeAsync/tick

```typescript
// ANTES (Karma + Zone.js)
it('deberia actualizar tras delay', fakeAsync(() => {
  component.startCountdown();
  expect(component.count).toBe(10);

  tick(1000);
  expect(component.count).toBe(9);

  tick(9000);
  expect(component.count).toBe(0);
}));

// DESPUES (Vitest)
it('deberia actualizar tras delay', () => {
  vi.useFakeTimers();

  component.startCountdown();
  expect(component.count).toBe(10);

  vi.advanceTimersByTime(1000);
  expect(component.count).toBe(9);

  vi.advanceTimersByTime(9000);
  expect(component.count).toBe(0);

  vi.useRealTimers();
});
```

### 4.4 detectChanges() y whenStable()

```typescript
it('deberia mostrar datos tras carga', async () => {
  fixture.detectChanges();            // trigger ngOnInit
  await fixture.whenStable();         // esperar operaciones async
  fixture.detectChanges();            // actualizar DOM con nuevos valores

  expect(compiled.textContent).toContain('datos cargados');
});
```

### 4.5 Signals en Angular (17+)

Los Signals tienen su propio modelo de asincronía. No dependen de Zone.js.

**`computed()` — siempre síncrono**:

```typescript
it('deriva el total correctamente', () => {
  const price = signal(100);
  const qty = signal(3);
  const total = computed(() => price() * qty());

  expect(total()).toBe(300); // lectura directa, no hace falta flush

  price.set(50);
  expect(total()).toBe(150);
});
```

**`effect()` — corre en microtask**:

Los effects se ejecutan en microtask. Si no drenas la cola en el test, no llegan a correr. Por eso hay que lanzar un flush explícito.

```typescript
// Angular 19+
it('ejecuta el effect cuando cambia el signal', () => {
  TestBed.runInInjectionContext(() => {
    const count = signal(0);
    const spy = vi.fn();

    effect(() => spy(count()));

    TestBed.tick(); // flush inicial del effect
    expect(spy).toHaveBeenCalledWith(0);

    count.set(5);
    TestBed.tick(); // flush tras el cambio
    expect(spy).toHaveBeenCalledWith(5);
  });
});
```

En Angular 17-18, sustituye `TestBed.tick()` por `TestBed.inject(ApplicationRef).tick()`. La guía oficial de Signals del equipo de Angular recoge este cambio y el scheduler propio que usan los `effect()`.

> `TestBed.tick()` está disponible desde Angular 19; en 17-18 se llegaba al mismo comportamiento con `ApplicationRef.tick()`.
>
> > **Fuente:** Angular — Signals guide. https://angular.dev/guide/signals
> >
> > **Fuente:** Angular — `ApplicationRef`. https://angular.dev/api/core/ApplicationRef

**Signal inputs** (Angular 17.1+):

```typescript
it('actualiza el input del componente', () => {
  const fixture = TestBed.createComponent(UserCardComponent);
  fixture.componentRef.setInput('userId', 42); // API correcta
  fixture.detectChanges();

  expect(fixture.nativeElement.textContent).toContain('User 42');
});
```

**Interop Signal ↔ Observable**:

- `toSignal(obs$, { initialValue })` requiere injection context. Envuelve la llamada en `TestBed.runInInjectionContext(() => ...)`.
- `toObservable(sig)` emite en microtask. Para leerlo, `await Promise.resolve()` o `firstValueFrom`.

```typescript
it('toSignal con valor inicial', () => {
  TestBed.runInInjectionContext(() => {
    const data$ = of({ name: 'Ana' });
    const user = toSignal(data$, { initialValue: null });

    expect(user()).toEqual({ name: 'Ana' });
  });
});
```

**Paralelo en React.** Los Signals son cosa de Angular. En React el equivalente se escribe con `useState` y `useEffect`, y para testearlo aislado tienes `renderHook` de `@testing-library/react`:

```tsx
import { renderHook, act } from '@testing-library/react'
import { useState, useEffect } from 'react'

it('dispara el effect cuando cambia el estado', () => {
  const logEffect = vi.fn()

  const { result } = renderHook(() => {
    const [count, setCount] = useState(0)
    useEffect(() => { if (count > 0) logEffect(count) }, [count])
    return { count, setCount }
  })

  expect(logEffect).not.toHaveBeenCalled()

  act(() => result.current.setCount(5))
  expect(logEffect).toHaveBeenCalledWith(5)
})
```

Para server state (datos de API que en Angular resolverías con `toSignal(httpCall$)`), el patrón idiomático de React 19 es **TanStack Query** o el hook nuevo `use()`, no RxJS. El equipo de React documenta `use()` como la vía oficial para consumir promesas y contextos dentro del render.

> `use()` se presentó con React 19 (diciembre de 2024).
>
> > **Fuente:** React — *React 19 release notes*. https://react.dev/blog/2024/12/05/react-19
> >
> > **Fuente:** React — Reference de `use()`. https://react.dev/reference/react/use

---

## 5. Control de timers (fake timers)

Los fake timers de Vitest son transversales: los tres frameworks comparten API. En Angular escenario A, `fakeAsync` + `tick` sigue funcionando (y está bien usarlo). En React no hay equivalente conceptual a `fakeAsync` porque no hay Zone.js, así que vas directo a `vi.useFakeTimers()`.

### 5.1 Setup básico

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers(); // SIEMPRE restaurar
});
```

### 5.2 Métodos principales

| Método | Descripción |
|--------|-------------|
| `vi.advanceTimersByTime(ms)` | Avanza el reloj N milisegundos |
| `vi.advanceTimersByTimeAsync(ms)` | Igual, pero drena Promises entre timers |
| `vi.runAllTimers()` | Ejecuta todos los timers hasta vaciar la cola |
| `vi.runAllTimersAsync()` | Igual, pero drena Promises |
| `vi.runOnlyPendingTimers()` | Solo los timers ya programados, no los nuevos |
| `vi.runOnlyPendingTimersAsync()` | Igual, pero drena Promises |
| `vi.advanceTimersToNextTimer()` | Avanza al siguiente timer |
| `vi.advanceTimersToNextTimerAsync()` | Igual, pero drena Promises |
| `vi.setSystemTime(date)` | Cambia lo que devuelve `new Date()` |
| `vi.getMockedSystemTime()` | Obtiene el tiempo actual mockeado |
| `vi.getTimerCount()` | Número de timers pendientes en la cola |

### 5.3 Testar debounce/throttle

```typescript
it('busqueda con debounce de 300ms', async () => {
  vi.useFakeTimers();
  const searchFn = vi.fn();
  const debouncedSearch = debounce(searchFn, 300);

  // Multiples llamadas rapidas
  debouncedSearch('h');
  debouncedSearch('ho');
  debouncedSearch('hol');
  debouncedSearch('hola');

  // Aun no ha pasado el debounce
  expect(searchFn).not.toHaveBeenCalled();

  // Avanzar 200ms -- aun no
  vi.advanceTimersByTime(200);
  expect(searchFn).not.toHaveBeenCalled();

  // Avanzar 100ms mas (total 300ms desde la ultima llamada)
  vi.advanceTimersByTime(100);
  expect(searchFn).toHaveBeenCalledTimes(1);
  expect(searchFn).toHaveBeenCalledWith('hola'); // solo la ultima

  vi.useRealTimers();
});

it('throttle limita a una llamada por intervalo', () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  const throttled = throttle(callback, 1000);

  throttled(); // primera: ejecuta inmediatamente
  expect(callback).toHaveBeenCalledTimes(1);

  throttled(); // segunda: ignorada (dentro del intervalo)
  throttled(); // tercera: ignorada
  expect(callback).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(1000);
  throttled(); // ahora si: nuevo intervalo
  expect(callback).toHaveBeenCalledTimes(2);

  vi.useRealTimers();
});
```

### 5.4 Testar setInterval

```typescript
it('polling cada segundo', () => {
  vi.useFakeTimers();
  const callback = vi.fn();
  setInterval(callback, 1000);

  vi.advanceTimersByTime(3500);
  expect(callback).toHaveBeenCalledTimes(3); // a los 1000, 2000, 3000

  // NO usar vi.runAllTimers() con setInterval - loop infinito!
  // Usar vi.runOnlyPendingTimers() en su lugar
  vi.useRealTimers();
});

it('auto-save que se detiene', () => {
  vi.useFakeTimers();
  const saveFn = vi.fn();
  let intervalId: ReturnType<typeof setInterval>;

  // Iniciar auto-save
  intervalId = setInterval(() => {
    saveFn();
    if (saveFn.mock.calls.length >= 3) {
      clearInterval(intervalId);
    }
  }, 2000);

  vi.advanceTimersByTime(10000);
  expect(saveFn).toHaveBeenCalledTimes(3); // se detuvo tras 3 saves

  vi.useRealTimers();
});
```

### 5.5 Mock de fechas

```typescript
it('muestra saludo segun hora del dia', () => {
  vi.useFakeTimers();

  // Manana
  vi.setSystemTime(new Date(2026, 3, 8, 9, 0, 0)); // 9:00 AM
  expect(getGreeting()).toBe('Buenos dias');

  // Tarde
  vi.setSystemTime(new Date(2026, 3, 8, 15, 0, 0)); // 3:00 PM
  expect(getGreeting()).toBe('Buenas tardes');

  // Noche
  vi.setSystemTime(new Date(2026, 3, 8, 22, 0, 0)); // 10:00 PM
  expect(getGreeting()).toBe('Buenas noches');

  vi.useRealTimers();
});

it('calcula dias hasta expiracion', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-08'));

  const subscription = { expiresAt: new Date('2026-04-18') };
  expect(daysUntilExpiration(subscription)).toBe(10);

  const expired = { expiresAt: new Date('2026-04-01') };
  expect(daysUntilExpiration(expired)).toBe(-7); // expirado hace 7 dias

  vi.useRealTimers();
});
```

---

## 6. Testing de observables (RxJS)

> **Nota para React.** RxJS y el marble testing son, en la práctica, territorio Angular. En React puedes usarlos (con libs tipo `observable-hooks` o envolviendo en un `useEffect`), pero no es idiomático. El patrón React para async es distinto: hooks + Promises + TanStack Query para server state. Las secciones 6 y 7 son útiles si trabajas con RxJS desde React, pero si tu stack es puramente React moderno, puedes saltártelas.

### 6.1 Tres enfoques básicos

#### Enfoque 1: convertir a Promise (recomendado para emisiones simples)

```typescript
import { firstValueFrom, lastValueFrom } from 'rxjs';

it('deberia devolver usuario', async () => {
  const user = await firstValueFrom(service.getUser(1));
  expect(user).toEqual({ id: 1, name: 'Ana' });
});

it('deberia emitir todos los valores y completar', async () => {
  const result = await lastValueFrom(
    of(1, 2, 3).pipe(
      reduce((acc, val) => acc + val, 0)
    )
  );
  expect(result).toBe(6);
});
```

| Método | Uso |
|--------|-----|
| `firstValueFrom(obs$)` | Primera emisión |
| `lastValueFrom(obs$)` | Última emisión (espera complete) |

#### Enfoque 2: subscribe en el test (para varias emisiones)

```typescript
it('deberia emitir valores', async () => {
  const values: number[] = [];

  service.getStream().subscribe(v => values.push(v));

  // trigger o esperar...
  await vi.advanceTimersByTimeAsync(3000);

  expect(values).toEqual([1, 2, 3]);
});
```

#### Enfoque 3: marble testing (para streams complejos)

```typescript
import { TestScheduler } from 'rxjs/testing';

let scheduler: TestScheduler;

beforeEach(() => {
  scheduler = new TestScheduler((actual, expected) => {
    expect(actual).toEqual(expected);
  });
});
```

### 6.2 Testing avanzado de observables

#### Testing de switchMap chains

```typescript
// Servicio que busca un usuario y luego sus pedidos
getUserWithOrders(userId: number) {
  return this.http.get<User>(`/users/${userId}`).pipe(
    switchMap(user =>
      this.http.get<Order[]>(`/users/${user.id}/orders`).pipe(
        map(orders => ({ ...user, orders }))
      )
    )
  );
}

// Test
it('deberia obtener usuario con sus pedidos', async () => {
  const mockUser = { id: 1, name: 'Ana' };
  const mockOrders = [{ id: 101, total: 50 }, { id: 102, total: 30 }];

  // Con HttpTestingController
  service.getUserWithOrders(1).subscribe(result => {
    expect(result).toEqual({
      id: 1,
      name: 'Ana',
      orders: mockOrders,
    });
  });

  // Primer request: usuario
  const userReq = httpCtrl.expectOne('/users/1');
  userReq.flush(mockUser);

  // Segundo request: pedidos (se dispara tras el primero por switchMap)
  const ordersReq = httpCtrl.expectOne('/users/1/orders');
  ordersReq.flush(mockOrders);
});
```

#### Testing de retry/retryWhen patterns

```typescript
// Servicio con retry automatico
fetchWithRetry(url: string) {
  return this.http.get(url).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) => {
        if (error.status === 404) {
          throw error; // no reintentar 404
        }
        return timer(1000 * retryCount); // backoff: 1s, 2s, 3s
      }
    })
  );
}

// Test: exito en el primer intento
it('deberia devolver datos sin retry', async () => {
  const result$ = service.fetchWithRetry('/api/data');
  const promise = firstValueFrom(result$);

  httpCtrl.expectOne('/api/data').flush({ value: 42 });

  expect(await promise).toEqual({ value: 42 });
});

// Test: fallo y luego exito
it('deberia reintentar en error 500', async () => {
  vi.useFakeTimers();

  const values: any[] = [];
  const errors: any[] = [];

  service.fetchWithRetry('/api/data').subscribe({
    next: v => values.push(v),
    error: e => errors.push(e),
  });

  // Primer intento: 500
  httpCtrl.expectOne('/api/data').flush('Error', { status: 500, statusText: 'Server Error' });

  // Esperar el delay del retry (1 segundo para el primer retry)
  await vi.advanceTimersByTimeAsync(1000);

  // Segundo intento: exito
  httpCtrl.expectOne('/api/data').flush({ value: 42 });

  expect(values).toEqual([{ value: 42 }]);
  expect(errors).toHaveLength(0);

  vi.useRealTimers();
});

// Test: 404 no se reintenta
it('no deberia reintentar en error 404', (done) => {
  service.fetchWithRetry('/api/data').subscribe({
    next: () => done(new Error('no deberia emitir')),
    error: (err) => {
      expect(err.status).toBe(404);
      done();
    },
  });

  httpCtrl.expectOne('/api/data').flush('Not Found', { status: 404, statusText: 'Not Found' });

  // No deberia haber mas requests (no retry)
  httpCtrl.verify();
});
```

#### Testing de combineLatest

```typescript
// Componente que combina multiples fuentes
dashboard$ = combineLatest([
  this.userService.getCurrentUser(),
  this.orderService.getRecentOrders(),
  this.notificationService.getUnreadCount(),
]).pipe(
  map(([user, orders, unread]) => ({
    userName: user.name,
    orderCount: orders.length,
    unreadNotifications: unread,
  }))
);

// Test
it('deberia combinar usuario, pedidos y notificaciones', async () => {
  const user$ = new BehaviorSubject({ name: 'Ana' });
  const orders$ = new BehaviorSubject([{ id: 1 }, { id: 2 }]);
  const unread$ = new BehaviorSubject(5);

  vi.spyOn(userService, 'getCurrentUser').mockReturnValue(user$);
  vi.spyOn(orderService, 'getRecentOrders').mockReturnValue(orders$);
  vi.spyOn(notificationService, 'getUnreadCount').mockReturnValue(unread$);

  const result = await firstValueFrom(component.dashboard$);

  expect(result).toEqual({
    userName: 'Ana',
    orderCount: 2,
    unreadNotifications: 5,
  });

  // Simular cambio en tiempo real
  unread$.next(3);
  const updated = await firstValueFrom(component.dashboard$);
  expect(updated.unreadNotifications).toBe(3);
});
```

#### Testing de Subjects y BehaviorSubjects

```typescript
// Servicio con estado reactivo
class AuthStore {
  private userSubject = new BehaviorSubject<User | null>(null);
  user$ = this.userSubject.asObservable();

  private loadingSubject = new Subject<boolean>();
  loading$ = this.loadingSubject.asObservable();

  login(credentials: Credentials) {
    this.loadingSubject.next(true);
    return this.http.post<User>('/auth/login', credentials).pipe(
      tap(user => {
        this.userSubject.next(user);
        this.loadingSubject.next(false);
      }),
      catchError(err => {
        this.loadingSubject.next(false);
        throw err;
      })
    );
  }

  logout() {
    this.userSubject.next(null);
  }
}

// Tests
describe('AuthStore', () => {
  let store: AuthStore;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AuthStore, provideHttpClient(), provideHttpClientTesting()]
    });
    store = TestBed.inject(AuthStore);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  it('deberia empezar con usuario null', async () => {
    const user = await firstValueFrom(store.user$);
    expect(user).toBeNull();
  });

  it('deberia emitir usuario tras login', async () => {
    const mockUser = { id: 1, name: 'Ana' };

    // Subscribir al observable ANTES del login
    const userPromise = firstValueFrom(
      store.user$.pipe(
        skip(1) // saltar el null inicial del BehaviorSubject
      )
    );

    store.login({ email: 'ana@test.com', password: '123' }).subscribe();
    httpCtrl.expectOne('/auth/login').flush(mockUser);

    const user = await userPromise;
    expect(user).toEqual(mockUser);
  });

  it('deberia emitir loading true y luego false', async () => {
    const loadingValues: boolean[] = [];
    store.loading$.subscribe(v => loadingValues.push(v));

    store.login({ email: 'ana@test.com', password: '123' }).subscribe();

    // Antes del flush: loading deberia ser true
    expect(loadingValues).toEqual([true]);

    httpCtrl.expectOne('/auth/login').flush({ id: 1, name: 'Ana' });

    // Despues del flush: loading deberia ser false
    expect(loadingValues).toEqual([true, false]);
  });

  it('deberia limpiar usuario tras logout', async () => {
    // Primero, simular que hay un usuario
    const userValues: (User | null)[] = [];
    store.user$.subscribe(u => userValues.push(u));

    store.login({ email: 'ana@test.com', password: '123' }).subscribe();
    httpCtrl.expectOne('/auth/login').flush({ id: 1, name: 'Ana' });

    // Ahora logout
    store.logout();

    expect(userValues).toEqual([
      null,                           // BehaviorSubject initial
      { id: 1, name: 'Ana' },        // tras login
      null,                           // tras logout
    ]);
  });
});
```

#### Pitfall: no completar observables en tests

```typescript
// MAL: el Subject nunca completa, lastValueFrom cuelga para siempre
const subject = new Subject<number>();
subject.next(1);
subject.next(2);
// const result = await lastValueFrom(subject); // CUELGA!

// BIEN: limitar emisiones con take()
const result = await lastValueFrom(subject.pipe(take(2)));

// BIEN: completar el subject
subject.next(1);
subject.next(2);
subject.complete();
const result2 = await lastValueFrom(subject);

// BIEN: usar firstValueFrom si solo necesitas la primera emision
const result3 = await firstValueFrom(subject);
```

---

## 7. Marble testing en detalle

### 7.1 Referencia completa de sintaxis marble

| Símbolo | Significado | Ejemplo |
|---------|-------------|---------|
| `-` | Un frame virtual de tiempo (1ms por defecto) | `---` = 3ms |
| `a-z, 0-9` | Valor emitido | `--a--b--` emite 'a' en 2ms, 'b' en 5ms |
| `\|` | `complete()` | `--a--\|` emite 'a' y completa |
| `#` | `error()` | `--a--#` emite 'a' y luego error |
| `()` | Emisiones síncronas (agrupadas) | `(abc)` emite a, b, c en el mismo frame |
| `^` | Punto de suscripción (solo hot observables) | `--^--a--` |
| `!` | Punto de desuscripción | `--a--!` |
| ` ` (espacio) | Ignorado, sirve para alinear visualmente | `-- a -- b --` = `--a--b--` |

#### Valores con objetos

```typescript
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('-a-b-|', {
    a: { id: 1, name: 'Ana' },
    b: { id: 2, name: 'Luis' },
  });

  const result = source.pipe(map(user => user.name));

  expectObservable(result).toBe('-a-b-|', {
    a: 'Ana',
    b: 'Luis',
  });
});
```

### 7.2 Hot vs cold observables

**Cold observable.** Crea una ejecución nueva por cada suscripción. Empieza a emitir cuando te suscribes.

**Hot observable.** Emite al margen de las suscripciones. El punto `^` marca cuándo empieza la suscripción.

```typescript
scheduler.run(({ hot, cold, expectObservable }) => {
  // COLD: el observer recibe TODOS los valores desde el inicio
  const cold$ = cold('--a--b--c--|');
  // suscripcion empieza con el test, recibe a, b, c

  // HOT: el observer solo recibe valores desde el punto ^
  const hot$ = hot('--a--b--^--c--d--|');
  //                         ^-- suscripcion empieza aqui
  // Solo recibe c y d, NO a ni b

  expectObservable(hot$).toBe('---c--d--|');
});
```

### 7.3 Testing de errores con #

```typescript
scheduler.run(({ cold, expectObservable }) => {
  // Simular un observable que emite y luego falla
  const source = cold('--a--b--#', { a: 1, b: 2 }, new Error('boom'));

  const result = source.pipe(
    catchError(() => of(-1)) // manejar el error
  );

  // Tras el error, emite -1 y completa
  expectObservable(result).toBe('--a--b--(c|)', { a: 1, b: 2, c: -1 });
});

// Testing de retry con marble
scheduler.run(({ cold, expectObservable }) => {
  const source = cold('--a--#', { a: 1 }, new Error('fail'));

  const result = source.pipe(retry(2));

  // Intento 1: emite a, error, reintenta
  // Intento 2: emite a, error, reintenta
  // Intento 3: emite a, error, propaga el error
  expectObservable(result).toBe('--a----a----a--#', { a: 1 }, new Error('fail'));
});
```

### 7.4 Progresión temporal (time frames)

Dentro de `scheduler.run()`, cada `-` es 1ms virtual. Para tiempos mayores:

```typescript
scheduler.run(({ cold, expectObservable, time }) => {
  // Usar time() para calcular duraciones
  const delay = time('---|');   // 3ms
  const period = time('-----|'); // 5ms

  // Ejemplo: testar un timer de 3ms
  const source = cold('-a|');
  const result = source.pipe(delayWhen(() => timer(delay)));

  expectObservable(result).toBe('----a|');
  //                              ^^^-- 3ms de delay
});
```

#### Testar debounceTime con marbles

```typescript
it('deberia hacer debounce de 3 frames', () => {
  scheduler.run(({ hot, expectObservable }) => {
    // Simular input del usuario
    const input    = hot('--a-b-----c---|');
    const expected =     '--------b--------c---|';
    //                          ^-- 3 frames despues de b (porque c aun no paso)

    // NOTA: dentro de scheduler.run(), los operadores de tiempo
    // usan el TestScheduler automaticamente
    const result = input.pipe(debounceTime(3));

    expectObservable(result).toBe('-----b--------c---|');
  });
});
```

### 7.5 Testar debounceTime + switchMap (búsqueda)

```typescript
it('busqueda con debounce y switchMap', () => {
  scheduler.run(({ hot, cold, expectObservable }) => {
    // Simular escritura del usuario
    const input    = hot('--a--ab----abc----|');
    //                      ^  ^^      ^^^
    //                      |  ||      |||
    //                      a  ab      abc

    // Servicio de busqueda que tarda 2 frames en responder
    const searchResult = (term: string) => cold('--r|', { r: `result:${term}` });

    const result = input.pipe(
      debounceTime(3),
      switchMap(term => searchResult(term))
    );

    // Solo la ultima busqueda "abc" deberia producir resultado
    // porque "a" y "ab" son canceladas por switchMap
    expectObservable(result).toBe('---------------------r|', {
      r: 'result:abc'
    });
  });
});
```

### 7.6 Limitaciones del marble testing

- **No puede controlar Promises nativas.** Si el código convierte Promises a Observables con `from()`, el marble testing no sincroniza el timing.
- **No funciona con `AsapScheduler` ni `AnimationFrameScheduler`.** Solo cubre `AsyncScheduler`.
- **El `TestScheduler` guarda referencias a objetos, no snapshots.** Si mutas datos dentro de operadores, te comes falsos positivos.
- **Difícil de leer para streams muy largos.** En flujos complejos, `subscribe` + aserciones suele quedar más claro.
- **No verifica tiempos reales.** Si necesitas comprobar que algo tarda exactamente 100 ms reales, tira por otro camino.

**Cuándo usar marble testing y cuándo no:**

| Escenario | Mejor enfoque |
|-----------|---------------|
| Operador simple (filter, map, take) | Marble testing |
| Operadores de tiempo (debounce, throttle, delay) | Marble testing |
| Combinaciones (merge, combineLatest, zip) | Marble testing |
| Un solo valor (HTTP call) | `firstValueFrom` + async/await |
| Flujo con Promises dentro | `subscribe` + async/await |
| Testing de errores simples | `firstValueFrom` + `.rejects` |
| Subjects/BehaviorSubjects | `subscribe` + aserciones |

---

## 8. Testing de estados de transición

Muchos componentes pasan por estados: idle → loading → success/error. Conviene testar cada estado por separado y también la transición completa.

### 8.1 Testar cada estado por separado

```typescript
// Componente que carga datos
// Estados posibles: idle, loading, success, error

describe('DataComponent estados', () => {
  let mockFetch: Mock;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Estado: IDLE (antes de cargar)
  it('estado idle: muestra boton de cargar', () => {
    const wrapper = mount(DataComponent);

    expect(wrapper.find('[data-testid="load-btn"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="data"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="error"]').exists()).toBe(false);
  });

  // Estado: LOADING (durante la carga)
  it('estado loading: muestra spinner', async () => {
    // Mock que nunca resuelve (mantiene loading)
    mockFetch.mockReturnValue(new Promise(() => {}));

    const wrapper = mount(DataComponent);
    await wrapper.find('[data-testid="load-btn"]').trigger('click');

    expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="load-btn"]').exists()).toBe(false);
    expect(wrapper.find('[data-testid="data"]').exists()).toBe(false);
  });

  // Estado: SUCCESS (datos cargados)
  it('estado success: muestra datos', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ items: ['A', 'B', 'C'] }),
    });

    const wrapper = mount(DataComponent);
    await wrapper.find('[data-testid="load-btn"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="data"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('A');
    expect(wrapper.text()).toContain('B');
    expect(wrapper.text()).toContain('C');
  });

  // Estado: ERROR (fallo en la carga)
  it('estado error: muestra mensaje de error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const wrapper = mount(DataComponent);
    await wrapper.find('[data-testid="load-btn"]').trigger('click');
    await flushPromises();

    expect(wrapper.find('[data-testid="error"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false);
    expect(wrapper.text()).toContain('Error al cargar');
  });
});
```

### 8.2 Testar la transición completa

```typescript
it('transicion completa: idle -> loading -> success', async () => {
  let resolvePromise!: (value: any) => void;
  const controlledPromise = new Promise(resolve => {
    resolvePromise = resolve;
  });

  mockFetch.mockReturnValue(controlledPromise);
  const wrapper = mount(DataComponent);

  // 1. Estado IDLE
  expect(wrapper.find('[data-testid="load-btn"]').exists()).toBe(true);
  expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false);

  // 2. Click: transicion a LOADING
  await wrapper.find('[data-testid="load-btn"]').trigger('click');
  expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true);
  expect(wrapper.find('[data-testid="load-btn"]').exists()).toBe(false);

  // 3. Resolver la Promise: transicion a SUCCESS
  resolvePromise({
    ok: true,
    json: () => Promise.resolve({ items: ['resultado'] }),
  });
  await flushPromises();

  expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false);
  expect(wrapper.find('[data-testid="data"]').text()).toContain('resultado');
});

it('transicion completa: idle -> loading -> error', async () => {
  let rejectPromise!: (reason: any) => void;
  const controlledPromise = new Promise((_, reject) => {
    rejectPromise = reject;
  });

  mockFetch.mockReturnValue(controlledPromise);
  const wrapper = mount(DataComponent);

  // 1. Click: transicion a LOADING
  await wrapper.find('[data-testid="load-btn"]').trigger('click');
  expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(true);

  // 2. Rechazar la Promise: transicion a ERROR
  rejectPromise(new Error('Network failure'));
  await flushPromises();

  expect(wrapper.find('[data-testid="spinner"]').exists()).toBe(false);
  expect(wrapper.find('[data-testid="error"]').exists()).toBe(true);
});

it('transicion: error -> retry -> success', async () => {
  // Primera carga: error
  mockFetch.mockRejectedValueOnce(new Error('fail'));
  const wrapper = mount(DataComponent);

  await wrapper.find('[data-testid="load-btn"]').trigger('click');
  await flushPromises();
  expect(wrapper.find('[data-testid="error"]').exists()).toBe(true);

  // Retry: exito
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ items: ['datos'] }),
  });

  await wrapper.find('[data-testid="retry-btn"]').trigger('click');
  await flushPromises();

  expect(wrapper.find('[data-testid="error"]').exists()).toBe(false);
  expect(wrapper.find('[data-testid="data"]').text()).toContain('datos');
});
```

### 8.3 Testar transiciones en Angular

```typescript
describe('DataComponent transiciones', () => {
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  it('idle -> loading -> success', async () => {
    const fixture = TestBed.createComponent(DataComponent);

    // 1. IDLE
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="spinner"]')).toBeNull();

    // 2. LOADING (trigger carga)
    fixture.componentInstance.loadData();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="spinner"]')).toBeTruthy();

    // 3. SUCCESS (responder al request)
    httpCtrl.expectOne('/api/data').flush({ items: ['result'] });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="spinner"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('result');
  });
});
```

---

## 9. Async en Vue

### 9.1 nextTick() — actualizaciones reactivas del DOM

Vue actualiza el DOM de forma asíncrona. Tras cambiar el estado, toca esperar:

```typescript
import { nextTick } from 'vue';

test('incrementa contador', async () => {
  const wrapper = mount(Counter);
  wrapper.find('button').trigger('click');
  await nextTick();
  expect(wrapper.html()).toContain('Count: 1');
});
```

**Atajo.** Los métodos de Vue Test Utils ya devuelven `nextTick`:

```typescript
// Esto ya incluye el nextTick
await wrapper.find('button').trigger('click');
expect(wrapper.html()).toContain('Count: 1');
```

### 9.2 flushPromises — resolver todas las Promises pendientes

```typescript
import { flushPromises } from '@vue/test-utils';

test('carga datos de API', async () => {
  vi.spyOn(axios, 'get').mockResolvedValue({ data: 'datos!' });
  const wrapper = mount(DataComponent);

  await flushPromises(); // resolver la llamada API
  expect(wrapper.text()).toContain('datos!');
});
```

**Cuándo usar cada uno:**

| Utilidad | Uso |
|----------|-----|
| `await nextTick()` | Actualizaciones reactivas del DOM (cambios de estado Vue) |
| `await flushPromises()` | Operaciones async externas (API calls, Promises) |

Normalmente los necesitas los dos. Primero `flushPromises` para resolver la API; después `nextTick` para que Vue actualice el DOM.

### 9.3 Varios nextTick / flushPromises encadenados

Con cadenas de Promises o watchers que disparan nuevas operaciones async, un solo `flushPromises` no llega. Necesitas varias pasadas:

```typescript
test('cascada de operaciones async', async () => {
  // Componente que:
  // 1. onMounted: llama fetchUser()
  // 2. watch(user): cuando user cambia, llama fetchOrders(user.id)
  // 3. watch(orders): cuando orders cambia, calcula total

  vi.mocked(api.fetchUser).mockResolvedValue({ id: 1, name: 'Ana' });
  vi.mocked(api.fetchOrders).mockResolvedValue([
    { id: 1, total: 50 },
    { id: 2, total: 30 },
  ]);

  const wrapper = mount(UserDashboard);

  // Primera ronda: resolver fetchUser
  await flushPromises();
  expect(wrapper.text()).toContain('Ana');

  // Segunda ronda: resolver fetchOrders (disparado por el watcher de user)
  await flushPromises();
  expect(wrapper.text()).toContain('2 pedidos');

  // El total se calcula sincronamente, pero necesita nextTick para renderizar
  await nextTick();
  expect(wrapper.text()).toContain('Total: $80');
});
```

### 9.4 Testar watchers async

```typescript
test('watcher dispara busqueda con debounce', async () => {
  vi.useFakeTimers();
  vi.mocked(api.search).mockResolvedValue({ results: ['resultado 1'] });

  const wrapper = mount(SearchComponent);

  // Escribir en el input (dispara watcher)
  await wrapper.find('input').setValue('query');

  // El watcher tiene debounce de 300ms
  expect(api.search).not.toHaveBeenCalled();

  // Avanzar el timer del debounce
  await vi.advanceTimersByTimeAsync(300);

  expect(api.search).toHaveBeenCalledWith('query');

  // Resolver la Promise del API call
  await flushPromises();

  expect(wrapper.text()).toContain('resultado 1');

  vi.useRealTimers();
});

test('watcher con immediate: true se ejecuta en mount', async () => {
  vi.mocked(api.getData).mockResolvedValue(['item 1']);

  const wrapper = mount(ImmediateWatchComponent, {
    props: { filter: 'active' },
  });

  // El watcher con immediate se ejecuta inmediatamente
  expect(api.getData).toHaveBeenCalledWith('active');

  await flushPromises();
  expect(wrapper.text()).toContain('item 1');
});
```

### 9.5 Testar async setup() con Suspense

```typescript
const AsyncComponent = defineComponent({
  async setup() {
    const data = await fetchData();
    return { data };
  },
  template: '<div>{{ data }}</div>'
});

test('renderiza componente async', async () => {
  vi.mocked(fetchData).mockResolvedValue('datos cargados');

  const TestWrapper = defineComponent({
    components: { AsyncComponent },
    template: `
      <Suspense>
        <template #default><AsyncComponent /></template>
        <template #fallback><div>Loading...</div></template>
      </Suspense>
    `
  });

  const wrapper = mount(TestWrapper);

  // Inicialmente muestra fallback
  expect(wrapper.text()).toContain('Loading...');

  await flushPromises();

  // Ahora muestra contenido
  expect(wrapper.text()).toContain('datos cargados');
});
```

### 9.6 Testar composables async

```typescript
// composables/useFetch.ts
export function useFetch<T>(url: string) {
  const data = ref<T | null>(null);
  const error = ref<Error | null>(null);
  const loading = ref(true);

  const execute = async () => {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      data.value = await response.json();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  };

  onMounted(execute);

  return { data, error, loading, refetch: execute };
}

// composables/__tests__/useFetch.spec.ts
import { withSetup } from '@/test/withSetup'; // helper que crea app context

test('useFetch: estado loading inicial', () => {
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  const [result] = withSetup(() => useFetch('/api/data'));

  expect(result.loading.value).toBe(true);
  expect(result.data.value).toBeNull();
  expect(result.error.value).toBeNull();
});

test('useFetch: estado success', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ name: 'test' }),
  }));

  const [result] = withSetup(() => useFetch<{ name: string }>('/api/data'));
  await flushPromises();

  expect(result.loading.value).toBe(false);
  expect(result.data.value).toEqual({ name: 'test' });
  expect(result.error.value).toBeNull();
});

test('useFetch: estado error', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status: 500,
  }));

  const [result] = withSetup(() => useFetch('/api/data'));
  await flushPromises();

  expect(result.loading.value).toBe(false);
  expect(result.data.value).toBeNull();
  expect(result.error.value).toBeInstanceOf(Error);
  expect(result.error.value?.message).toBe('HTTP 500');
});

test('useFetch: refetch actualiza datos', async () => {
  const mockFetch = vi.fn()
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ v: 1 }) })
    .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ v: 2 }) });

  vi.stubGlobal('fetch', mockFetch);

  const [result] = withSetup(() => useFetch<{ v: number }>('/api/data'));
  await flushPromises();
  expect(result.data.value).toEqual({ v: 1 });

  await result.refetch();
  expect(result.data.value).toEqual({ v: 2 });
  expect(mockFetch).toHaveBeenCalledTimes(2);
});
```

---

## 9bis. Async en React

React no tiene ni Zone.js ni sistema de reactividad con microtask propio. El modelo mental es más sencillo: los cambios de estado van a través de `act`, y para esperar al DOM usas `findBy*` o `waitFor` igual que en los otros frameworks. La diferencia está en los hooks y en el server state.

### 9bis.1 Testar hooks aislados con `renderHook`

El paquete `@testing-library/react-hooks` está deprecado desde hace tiempo. A partir de Testing Library React 13, `renderHook` vive en `@testing-library/react` directamente:

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { useCart } from './useCart'

it('carga los items del carrito', async () => {
  const { result } = renderHook(() => useCart())

  // Al inicio, el hook arranca con array vacío y loading: true
  expect(result.current.items).toHaveLength(0)

  // Espera a que la carga async termine
  await waitFor(() => expect(result.current.items).toHaveLength(2))
})
```

`renderHook` devuelve un `result` que es un objeto vivo: cada render refresca `result.current`. Por eso las aserciones van siempre sobre `result.current.X`, no sobre una copia capturada antes.

### 9bis.2 Actualizar estado desde el test: `act`

Si el test dispara un cambio de estado desde fuera (llamar al setter, invocar un handler), envuélvelo en `act`:

```tsx
import { renderHook, act } from '@testing-library/react'

const { result } = renderHook(() => useCounter())

act(() => result.current.increment())
expect(result.current.count).toBe(1)
```

`userEvent` 14 ya llama a `act` internamente, así que en tests de componente no suele hacer falta escribirlo a mano.

### 9bis.3 Server state con TanStack Query

En React moderno, el equivalente a `toSignal(httpCall$)` o a `BehaviorSubject` para datos de API es **TanStack Query**. Para testearlo, envuelve el hook en un `QueryClientProvider` con un cliente nuevo por test:

```tsx
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useUser } from './useUser'

function wrapper({ children }: { children: React.ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

it('devuelve el usuario cuando la query resuelve', async () => {
  vi.mocked(api.getUser).mockResolvedValue({ id: 1, name: 'Ana' })

  const { result } = renderHook(() => useUser(1), { wrapper })

  await waitFor(() => expect(result.current.isSuccess).toBe(true))
  expect(result.current.data).toEqual({ id: 1, name: 'Ana' })
})
```

`retry: false` es casi obligatorio: sin él, TanStack Query reintenta tres veces en caso de error y los tests negativos cuelgan.

### 9bis.4 Fake timers con React

No hay equivalente conceptual a `fakeAsync` de Angular porque no hay Zone.js. Usa directamente `vi.useFakeTimers()` y el combo `advanceTimersByTimeAsync` cuando haya Promises por medio:

```tsx
it('ejecuta la búsqueda tras el debounce', async () => {
  vi.useFakeTimers()
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

  render(<Search />)
  await user.type(screen.getByRole('textbox'), 'hola')

  await vi.advanceTimersByTimeAsync(300)
  expect(await screen.findByText(/resultado/i)).toBeInTheDocument()

  vi.useRealTimers()
})
```

El truco con `userEvent` 14 es pasarle `advanceTimers` en el `setup`: si no, los tipeos internos disparan timers reales y el test se cuelga.

---

## 10. Testing Library: utilidades async

### 10.1 waitFor() — esperar cambios en el DOM

```typescript
import { waitFor, screen } from '@testing-library/dom';

await waitFor(() => {
  expect(screen.getByText('Cargado')).toBeInTheDocument();
}, {
  timeout: 1000,   // default: 1000ms
  interval: 50,    // default: 50ms
});
```

> Los valores por defecto de `waitFor` (timeout 1000 ms, interval 50 ms) están fijados en la referencia oficial de Testing Library.
>
> > **Fuente:** Testing Library — Async Methods. https://testing-library.com/docs/dom-testing-library/api-async

**Antipatrón crítico: side effects dentro de `waitFor`.**

```typescript
// MAL - ejecuta el click multiples veces (cada retry)
await waitFor(() => {
  fireEvent.click(button);              // side effect!
  expect(result).toBeVisible();
});

// BIEN - separar accion de verificacion
fireEvent.click(button);
await waitFor(() => {
  expect(result).toBeVisible();
});
```

#### waitFor con varias aserciones

```typescript
// BIEN: varios expects dentro de un solo waitFor.
// Se reintenta TODO el callback hasta que TODAS las aserciones pasen.
await waitFor(() => {
  expect(screen.getByText('Usuario: Ana')).toBeInTheDocument();
  expect(screen.getByText('Email: ana@test.com')).toBeInTheDocument();
  expect(screen.getByText('Rol: Admin')).toBeInTheDocument();
});

// CUIDADO: si el primer expect tarda en pasar,
// los demas no se evaluan hasta que el primero pase.
// Si necesitas esperar cosas independientes, usa varios waitFor:
await waitFor(() => expect(screen.getByText('Header')).toBeInTheDocument());
await waitFor(() => expect(screen.getByText('Footer')).toBeInTheDocument());
```

#### waitFor con aserciones negativas

```typescript
// Esperar a que un elemento desaparezca
await waitFor(() => {
  expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
});

// Esperar a que un boton se habilite
await waitFor(() => {
  expect(screen.getByRole('button', { name: 'Submit' })).not.toBeDisabled();
});
```

### 10.2 findBy* — queries con espera incorporada

```typescript
// findBy = getBy + waitFor
const element = await screen.findByText('Contenido Cargado');
expect(element).toBeInTheDocument();

// Con timeout custom
const element2 = await screen.findByText('Lento', {}, { timeout: 5000 });

// findAllBy para multiples elementos
const items = await screen.findAllByRole('listitem');
expect(items).toHaveLength(3);

// findBy con regex
const greeting = await screen.findByText(/bienvenid/i);
expect(greeting).toBeInTheDocument();
```

### 10.3 waitForElementToBeRemoved()

```typescript
// El elemento DEBE existir antes de llamar
const spinner = screen.getByTestId('spinner');
await waitForElementToBeRemoved(spinner);

// O con callback (preferido, más fiable)
await waitForElementToBeRemoved(() => screen.queryByTestId('spinner'));

// Con timeout custom
await waitForElementToBeRemoved(
  () => screen.queryByText('Cargando...'),
  { timeout: 5000 }
);
```

### 10.4 Patrón completo: loading → data (Angular / Vue Testing Library)

```typescript
// Angular Testing Library
import { render, screen, waitForElementToBeRemoved } from '@testing-library/angular';

test('muestra skeleton, luego datos del usuario (Angular)', async () => {
  const getUser = vi.fn().mockResolvedValue({ name: 'Ana Garcia', email: 'ana@test.com' });

  await render(UserProfileComponent, {
    componentInputs: { userId: 1 },
    providers: [{ provide: UserService, useValue: { getUser } }],
  });

  // 1. Verificar loading
  expect(screen.getByTestId('skeleton')).toBeInTheDocument();

  // 2. Esperar a que loading desaparezca
  await waitForElementToBeRemoved(() => screen.queryByTestId('skeleton'));

  // 3. Verificar datos
  expect(screen.getByText('Ana Garcia')).toBeInTheDocument();
  expect(screen.getByText('ana@test.com')).toBeInTheDocument();
});

// Vue Testing Library — version concisa con findBy
import { render, screen } from '@testing-library/vue';

test('muestra datos del usuario (Vue)', async () => {
  vi.mocked(api.getUser).mockResolvedValue({ name: 'Ana Garcia', email: 'ana@test.com' });

  render(UserProfile, { props: { userId: 1 } });

  // findBy* espera automaticamente (equivalente a getBy + waitFor)
  expect(await screen.findByText('Ana Garcia')).toBeInTheDocument();
  expect(screen.getByText('ana@test.com')).toBeInTheDocument(); // ya deberia estar
});

// React Testing Library — mismo patrón que Vue con findBy
import { render, screen } from '@testing-library/react'

test('muestra datos del usuario (React)', async () => {
  vi.mocked(api.getUser).mockResolvedValue({ name: 'Ana Garcia', email: 'ana@test.com' })

  render(<UserProfile userId={1} />)

  // findBy* espera hasta que el elemento aparezca (hasta el timeout)
  expect(await screen.findByText('Ana Garcia')).toBeInTheDocument()
  expect(screen.getByText('ana@test.com')).toBeInTheDocument()
})
```

`findBy*`, `waitFor` y `waitForElementToBeRemoved` se comportan igual en los tres frameworks porque viven en `@testing-library/dom`. Lo único que cambia es el `render` del paquete de tu framework.

### 10.5 Testing de formularios async (carrito con validación de stock)

```typescript
// Vue Testing Library — formulario "añadir al carrito" con validación async de stock
test('submit del formulario con validacion async', async () => {
  vi.mocked(api.checkStock).mockResolvedValue({ available: false });
  vi.mocked(api.addToCart).mockResolvedValue({ success: true });

  const user = userEvent.setup();
  render(AddToCartForm, { props: { productId: 'sku-123' } });

  // Llenar formulario
  await user.type(screen.getByLabelText('Cantidad'), '5');

  // La validacion async de stock se dispara al perder focus
  await user.tab();

  // Esperar mensaje de validacion
  expect(await screen.findByText('Stock insuficiente')).toBeInTheDocument();

  // El boton deberia estar deshabilitado
  expect(screen.getByRole('button', { name: 'Añadir al carrito' })).toBeDisabled();

  // Cambiar a una cantidad disponible
  vi.mocked(api.checkStock).mockResolvedValue({ available: true });
  await user.clear(screen.getByLabelText('Cantidad'));
  await user.type(screen.getByLabelText('Cantidad'), '2');
  await user.tab();

  // Esperar a que desaparezca el error
  await waitFor(() => {
    expect(screen.queryByText('Stock insuficiente')).not.toBeInTheDocument();
  });

  // Ahora el boton deberia estar habilitado
  expect(screen.getByRole('button', { name: 'Añadir al carrito' })).toBeEnabled();
});
```

### 10.6 Guía de selección

| Escenario | Utilidad |
|-----------|----------|
| Elemento aparece tras async | `findBy*` |
| Esperar condición compleja | `waitFor()` |
| Elemento desaparece | `waitForElementToBeRemoved()` |
| Verificar que NO existe | `queryBy*` (devuelve null) |
| Elemento ya existe | `getBy*` |
| Varios elementos aparecen | `findAllBy*` |
| Polling de un valor | `expect.poll()` |

---

## 11. Errores comunes en testing async

### 11.1 Tests que pasan pero no testan nada (missing await)

Este es el error más peligroso: el test aparece como `passed`, pero ni siquiera ejecuta las aserciones.

```typescript
// MAL - PASA SIEMPRE (incluso con datos incorrectos)
it('verifica datos', () => {
  // Sin await, el test termina antes de que la Promise se resuelva
  expect(fetchUser(1)).resolves.toEqual({ name: 'WRONG NAME' });
  // Vitest no espera la Promise, el test termina OK
});

// MAL - expect dentro de then sin await
it('verifica datos', () => {
  fetchUser(1).then(user => {
    expect(user.name).toBe('WRONG NAME'); // nunca se ejecuta si no hay error
  });
  // El test termina antes de que el then se ejecute
});

// BIEN
it('verifica datos', async () => {
  await expect(fetchUser(1)).resolves.toEqual({ name: 'Ana' });
});

// BIEN
it('verifica datos', async () => {
  const user = await fetchUser(1);
  expect(user.name).toBe('Ana');
});
```

**Cómo detectarlo.** Configura `vitest.config.ts`:
```typescript
export default defineConfig({
  test: {
    // Vitest por defecto advierte sobre Promises no esperadas
    // Asegurate de no silenciar los warnings
  }
});
```

### 11.2 Flaky tests por race conditions

**Síntoma.** El test pasa 9 de 10 veces y falla la décima sin avisar.

```typescript
// MAL - depende del timing del sistema
it('muestra resultado', async () => {
  render(<SearchComponent />);
  fireEvent.change(input, { target: { value: 'test' } });

  // Falla intermitentemente porque el debounce + fetch
  // puede tardar mas o menos segun la carga del sistema
  await new Promise(r => setTimeout(r, 500)); // sleep arbitrario

  expect(screen.getByText('Resultado')).toBeInTheDocument();
});

// BIEN - esperar la condicion, no un tiempo fijo
it('muestra resultado', async () => {
  render(<SearchComponent />);
  fireEvent.change(input, { target: { value: 'test' } });

  // waitFor reintenta hasta que la condicion se cumpla
  await waitFor(() => {
    expect(screen.getByText('Resultado')).toBeInTheDocument();
  });
});

// BIEN - usar findBy (equivalente a getBy + waitFor)
it('muestra resultado', async () => {
  render(<SearchComponent />);
  fireEvent.change(input, { target: { value: 'test' } });

  expect(await screen.findByText('Resultado')).toBeInTheDocument();
});
```

### 11.3 Memory leaks por suscripciones sin limpiar

```typescript
// MAL - la suscripcion sigue viva despues del test
it('recibe datos del stream', () => {
  service.getStream().subscribe(data => {
    expect(data).toBe('valor');
  });
  // Si getStream() es un Subject o BehaviorSubject,
  // la suscripcion sigue activa y puede causar:
  // - Warnings de memory leak
  // - Tests que interfieren entre si
  // - El proceso de test no termina
});

// BIEN - limpiar la suscripcion
it('recibe datos del stream', () => {
  const sub = service.getStream().subscribe(data => {
    expect(data).toBe('valor');
  });
  // ... trigger y assertions ...
  sub.unsubscribe();
});

// MEJOR - usar firstValueFrom que automaticamente se desuscribe
it('recibe datos del stream', async () => {
  const data = await firstValueFrom(service.getStream());
  expect(data).toBe('valor');
});

// EN ANGULAR - destruir el componente
afterEach(() => {
  fixture.destroy(); // limpia takeUntilDestroyed y similares
});

// EN VUE - desmontar el wrapper
afterEach(() => {
  wrapper.unmount(); // dispara onUnmounted hooks
});
```

### 11.4 Actualizaciones fuera del ciclo reactivo (concepto general)

Cada framework tiene su pacto con los tests. Si cambias estado, tienes que dejar que el framework reaccione antes de aseverar. Si te saltas el pacto, te salen warnings y tests frágiles.

| Framework | Síntoma | Solución |
|---|---|---|
| **Angular** | `ExpressionChangedAfterItHasBeenCheckedError`, DOM no refleja el cambio | Llamar `fixture.detectChanges()` tras cambiar estado; `await fixture.whenStable()` tras operaciones async |
| **Vue** | El DOM muestra el estado previo | `await nextTick()` tras cambiar un `ref`; `await flushPromises()` tras una Promise |
| **React** (referencia) | `Warning: An update to Component inside a test was not wrapped in act(...)` | `await screen.findByText(...)` o `await waitFor(...)` |

Regla universal: **cualquier test que modifique estado async tiene que ser `async` y esperar** antes de aseverar. Si ves warnings en la consola durante los tests, léelos. Son la pista más directa.

```typescript
// ❌ Angular: el DOM no refleja el cambio todavía
it('muestra datos', () => {
  fixture.componentInstance.load();
  expect(fixture.nativeElement.textContent).toContain('cargado'); // falla
});

// ✅ Angular: trigger + whenStable + detectChanges
it('muestra datos', async () => {
  fixture.componentInstance.load();
  await fixture.whenStable();
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('cargado');
});
```

### 11.5 Tests que cuelgan indefinidamente (Promises no resueltas)

**Síntoma.** El test nunca termina y tienes que matar el proceso a mano.

```typescript
// CAUSA 1: lastValueFrom con observable infinito
it('test colgado', async () => {
  const subject = new Subject<number>();
  subject.next(1);
  const result = await lastValueFrom(subject); // CUELGA: el subject nunca completa
});

// SOLUCION: usar take() o firstValueFrom()
it('test OK', async () => {
  const subject = new Subject<number>();
  const promise = firstValueFrom(subject); // espera solo 1 valor
  subject.next(42);
  expect(await promise).toBe(42);
});

// CAUSA 2: Promise que nunca se resuelve ni rechaza
it('test colgado', async () => {
  const result = await new Promise((resolve) => {
    // resolve nunca se llama!
    someAsyncOperation(); // que no hace nada con resolve
  });
});

// SOLUCION: usar timeout en el test
it('test con timeout', async () => {
  const result = await Promise.race([
    longOperation(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), 5000)
    ),
  ]);
}, 10000); // timeout del test

// CAUSA 3: fake timers + await sin avanzar el reloj
it('test colgado', async () => {
  vi.useFakeTimers();
  // Este await espera un setTimeout... pero el reloj esta congelado!
  await delay(1000); // CUELGA
  vi.useRealTimers();
});

// SOLUCION: avanzar el reloj en paralelo
it('test OK', async () => {
  vi.useFakeTimers();
  const promise = delay(1000); // no hacer await todavia
  vi.advanceTimersByTime(1000); // avanzar el reloj
  await promise; // ahora si, la Promise ya esta resuelta
  vi.useRealTimers();
});
```

### 11.6 Orden incorrecto de mock e import

```typescript
// MAL: el import se ejecuta ANTES del vi.mock (sin hoisting)
// Esto solo pasa con vi.doMock, NO con vi.mock (que se hoistea)
import { myFunction } from './module';
vi.doMock('./module', () => ({ myFunction: vi.fn() }));
// myFunction ya fue importada con la implementacion real

// BIEN con vi.doMock: import DESPUES
vi.doMock('./module', () => ({ myFunction: vi.fn() }));
const { myFunction } = await import('./module');

// BIEN con vi.mock: se hoistea automaticamente (orden no importa)
vi.mock('./module', () => ({ myFunction: vi.fn() }));
import { myFunction } from './module'; // OK, vi.mock se ejecuta primero
```

### 11.7 Fake timers + Promises: el combo peligroso

```typescript
// CAUSA: mezclar fake timers con operaciones que usan Promise + timer
function retryWithDelay(fn: () => Promise<any>, retries: number, delay: number) {
  return fn().catch(err => {
    if (retries <= 0) throw err;
    return new Promise(resolve =>
      setTimeout(() => resolve(retryWithDelay(fn, retries - 1, delay)), delay)
    );
  });
}

// MAL: usar versiones sync
it('reintenta tras fallo', async () => {
  vi.useFakeTimers();
  const fn = vi.fn()
    .mockRejectedValueOnce(new Error('fail'))
    .mockResolvedValue('ok');

  const promise = retryWithDelay(fn, 3, 1000);
  vi.advanceTimersByTime(1000); // avanza el timer...
  // ...pero la Promise del catch + setTimeout no se resuelve!
  // El test cuelga

  vi.useRealTimers();
});

// BIEN: usar versiones async
it('reintenta tras fallo', async () => {
  vi.useFakeTimers();
  const fn = vi.fn()
    .mockRejectedValueOnce(new Error('fail'))
    .mockResolvedValue('ok');

  const promise = retryWithDelay(fn, 3, 1000);
  await vi.advanceTimersByTimeAsync(1000); // resuelve timers Y Promises

  const result = await promise;
  expect(result).toBe('ok');
  expect(fn).toHaveBeenCalledTimes(2);

  vi.useRealTimers();
});
```

### 11.8 Conexión directa con el mutation score

Cuando Stryker evalúa tu suite, cada uno de los errores de §11 deja **mutantes vivos**:

| Antipatrón async | Mutante típico que sobrevive |
|---|---|
| `await` olvidado en `.resolves` | Cambiar el valor esperado (`'Ana'` → `''`). El test sigue pasando porque nunca aserta. |
| `subscribe(v => push(v))` sin esperar | Cambiar `.map(x => x * 2)` por `.map(x => x)`. El push no llega a tiempo. |
| `setTimeout` en vez de `waitFor` | `if (x > 0)` → `if (true)`. El timer no depende de la rama. |
| Promise colgada en Subject sin `take()` | Mutantes en operadores RxJS. El test cuelga y se marca como timeout, no como killed. |
| `waitFor` con side effects dentro | Cualquier mutante en la lógica del click. Se re-ejecuta en cada retry. |

**Regla operativa.** Si un test async no tiene al menos un `expect` ejecutado tras un `await`, va a dejar mutantes vivos casi seguro. Revisa estos primero al optimizar.

---

## 12. Problemas comunes y soluciones

### 12.1 Tests que pasan con Promises colgadas

**Síntoma.** Los tests pasan uno a uno, pero fallan en grupo. El proceso no termina.

**Solución:**
- `await` o `return` en todas las Promises de los tests.
- Limpia recursos en `afterEach` (cancela suscripciones, `clearInterval`).
- En Angular, asegúrate de llamar a `httpCtrl.verify()`.

### 12.2 Race conditions

**Síntoma.** Los tests pasan unas veces sí y otras no (flaky).

**Solución:**
- Nada de `setTimeout` ni `sleep` arbitrarios.
- Usa `waitFor`, `findBy*` o `expect.poll()`.
- Mockea todas las dependencias externas.
- Asegura aislamiento completo entre tests.

### 12.3 Memory leaks por suscripciones

**Angular:**
```typescript
// Usar takeUntilDestroyed() (Angular 16+)
this.data$ = this.service.getData().pipe(
  takeUntilDestroyed()
);

// En tests: destruir el componente
afterEach(() => {
  fixture.destroy();
});
```

**Vue:**
```typescript
// Limpiar en onUnmounted
onUnmounted(() => {
  subscription.unsubscribe();
});

// En tests:
afterEach(() => {
  wrapper.unmount();
});
```

### 12.4 Testing de manejo de errores async

```typescript
// Con .rejects
await expect(asyncFunctionThatFails()).rejects.toThrow('Error esperado');

// Con try/catch para inspección detallada
try {
  await asyncFunctionThatFails();
  expect.unreachable('Debería haber lanzado');
} catch (error) {
  expect(error.message).toBe('Error esperado');
  expect(error.code).toBe('ERR_VALIDATION');
}

// Testing de error en componente (Vue)
test('muestra error cuando la API falla', async () => {
  vi.mocked(api.getData).mockRejectedValue(new Error('Server error'));
  const wrapper = mount(DataComponent);
  await flushPromises();

  expect(wrapper.find('.error-message').text()).toBe('Error al cargar datos');
  expect(wrapper.find('.retry-button').exists()).toBe(true);
});
```

---

## 13. Resumen: árbol de decisiones async

```
¿Qué tipo de código async estás testando?
│
├── Timer (setTimeout/setInterval)
│   └── vi.useFakeTimers() + vi.advanceTimersByTime()
│       └── ¿Hay Promises dentro del timer?
│           ├── NO → vi.advanceTimersByTime() (sync)
│           └── SÍ → vi.advanceTimersByTimeAsync() (async)
│
├── Promise / fetch / HTTP
│   ├── Angular → HttpTestingController + flush()
│   ├── Vue → flushPromises()
│   └── General → async/await + mock del servicio
│
├── Observable (RxJS)
│   ├── Emisión simple → firstValueFrom() / lastValueFrom()
│   ├── Stream complejo → marble testing (TestScheduler)
│   ├── Con timer → fake timers + subscribe
│   ├── switchMap/retry → mock del servicio + flush secuencial
│   └── Subject/BehaviorSubject → subscribe + aserciones
│
├── DOM update (reactividad)
│   ├── Angular → fixture.detectChanges() + whenStable()
│   ├── Vue → await nextTick()
│   ├── React → act() (automático con userEvent 14) + findBy*/waitFor()
│   └── Testing Library → findBy* / waitFor()
│
├── Hook aislado (React)
│   └── renderHook() de @testing-library/react + waitFor()
│
├── Server state (React)
│   └── TanStack Query + QueryClientProvider wrapper + waitFor(isSuccess)
│
├── Angular Signals (17+)
│   ├── computed() → lectura directa (sync)
│   ├── effect() → TestBed.tick() (19+) o ApplicationRef.tick() (17-18)
│   ├── signal inputs → fixture.componentRef.setInput() + detectChanges()
│   └── toSignal/toObservable → TestBed.runInInjectionContext + firstValueFrom
│
├── Fake timers zoneless vs Zone.js testing
│   ├── Escenario A (zone.js/testing cargado) → fakeAsync/tick/flush siguen funcionando
│   └── Escenario B (zoneless) → vi.useFakeTimers() + advanceTimersByTimeAsync()
│
├── Debounce/Throttle
│   └── vi.useFakeTimers() + vi.advanceTimersByTimeAsync()
│
└── Estados de transición (idle → loading → success/error)
    ├── Cada estado: montar componente con mock en estado deseado
    ├── Transición: Promise controlada (resolve manual)
    └── Errores: mock con mockRejectedValue
```

### 13.1 Checklist final "si es X, usa Y"

- [ ] **Timer sin Promise dentro** → `vi.advanceTimersByTime()` (sync, más rápido).
- [ ] **Timer con Promise dentro** → `await vi.advanceTimersByTimeAsync()` (obligatorio).
- [ ] **Fetch / HTTP en Angular** → `HttpTestingController.expectOne().flush()`.
- [ ] **Fetch / HTTP en Vue** → `await flushPromises()` tras mockear `fetch`/`axios`.
- [ ] **Observable de una emisión** → `firstValueFrom()`.
- [ ] **Observable con `complete`** → `lastValueFrom()`.
- [ ] **Stream temporal (debounce, throttle, delay)** → marble testing con `TestScheduler`.
- [ ] **Subject / BehaviorSubject** → `subscribe` + recoger valores en un array + `unsubscribe` en `afterEach`.
- [ ] **DOM Vue tras cambio de estado** → `await nextTick()`.
- [ ] **DOM Angular tras cambio de estado** → `fixture.detectChanges()`; tras async, `await fixture.whenStable()`.
- [ ] **Hook React aislado** → `renderHook` de `@testing-library/react` + `waitFor`.
- [ ] **Server state en React** → TanStack Query dentro de `QueryClientProvider` con `retry: false`.
- [ ] **Elemento aparece** → `await screen.findByText(...)`.
- [ ] **Elemento desaparece** → `await waitForElementToBeRemoved(() => screen.queryBy...)`.
- [ ] **Signal `computed`** → lectura directa.
- [ ] **Signal `effect`** → `TestBed.tick()` (Angular 19+) dentro de `runInInjectionContext`.
- [ ] **Signal input** → `fixture.componentRef.setInput(name, value)` + `detectChanges()`.
- [ ] **Mock de fecha** → `vi.useFakeTimers()` + `vi.setSystemTime(new Date(...))`.
- [ ] **Flaky test** → sustituir `setTimeout`/`sleep` arbitrario por `waitFor` / `findBy*` / `expect.poll`.
- [ ] **Test colgado** → revisar Subject sin `take()`/`complete()`, o fake timers sin avanzar el reloj.

---

## Fuentes

Las fuentes públicas que sostienen los claims de este archivo.

- **Vitest — Timers Guide.** https://vitest.dev/guide/mocking/timers — fake timers y helpers `*Async`.
- **Vitest — Vi API Reference.** https://vitest.dev/api/vi.html — `vi.advanceTimersToNextFrame`, `vi.useFakeTimers`, `vi.setSystemTime`.
- **Angular — Signals guide.** https://angular.dev/guide/signals — scheduler propio de `effect()` y flushing en tests.
- **Angular — `ApplicationRef` / `TestBed`.** https://angular.dev/api/core/ApplicationRef y https://angular.dev/api/core/testing/TestBed — `tick()` en 17-18 vs 19+.
- **Angular — Zoneless Guide.** https://angular.dev/guide/zoneless — implicaciones de `fakeAsync`/`tick` fuera de Zone.js.
- **Announcing Angular v21.** https://blog.angular.dev/announcing-angular-v21-57946c34f14b — zoneless por defecto y Vitest como runner.
- **Angular — `fakeAsync` y `tick`.** https://angular.dev/api/core/testing/fakeAsync y https://angular.dev/api/core/testing/tick.
- **React 19 release notes.** https://react.dev/blog/2024/12/05/react-19 — `use()`, Actions, cambios en hydration.
- **React — Reference de `use()`.** https://react.dev/reference/react/use.
- **RxJS — Marble Testing.** https://rxjs.dev/guide/testing/marble-testing — `TestScheduler` y diagramas.
- **RxJS — `firstValueFrom` / `lastValueFrom`.** https://rxjs.dev/api/index/function/firstValueFrom y https://rxjs.dev/api/index/function/lastValueFrom — sustitutos de `toPromise`.
- **Testing Library — Async Methods.** https://testing-library.com/docs/dom-testing-library/api-async — defaults de `waitFor` (1000 ms / 50 ms) y `findBy*`.
- **TanStack Query — Testing.** https://tanstack.com/query/latest/docs/framework/react/guides/testing — `QueryClientProvider` en tests.
- **KPIs "22,59 % → 60 %+".** Datos reales de una suite grande en producción (equipo de 20+ squads) usada como caso de referencia en el taller. Se muestran anonimizados.
