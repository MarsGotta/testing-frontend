# Referencia Completa: Sintaxis Jasmine -> Vitest

> **Modalidad:** reference (consulta rápida de equivalencias y patrones de traducción). Para el **cómo migrar un proyecto** ver [`10-migracion-karma-vitest.md`](./10-migracion-karma-vitest.md); para el **tratamiento profundo de asincronía** ver [`13-dominio-asincronia.md`](./13-dominio-asincronia.md); para **mocking avanzado de módulos y stores** ver [`12-mocking-avanzado.md`](./12-mocking-avanzado.md).
>
> **Prerrequisitos:** conocer la API de Jasmine y haber leído al menos `10-migracion-karma-vitest.md` (la tabla resumida). Este archivo amplía esa tabla con ejemplos reales, patrones sin equivalente directo y casos difíciles.
>
> **Tiempo estimado:** 45 min de lectura lineal, pero pensado para **consulta puntual** (busca con Ctrl+F la API que te bloquea).
>
> **Stack de referencia:** Vitest 4.0.x (oct 2025), Jasmine 5.x, Angular 17–21, Vue 3.x y React 19 + Testing Library 16 (los ejemplos con `ComponentFixture` o `fakeAsync` son accesorios de Angular; la API del runner es framework-neutral). Validado 2026-04. Las APIs `fakeAsync`, `tick` y `waitForAsync` vienen de `@angular/core/testing`, no de Jasmine, y sobreviven a la migración del runner (ver `13-dominio-asincronia.md`).
>
> **Cómo usar este archivo:**
> - Si buscas la equivalencia de una API concreta → usa el índice de la § 0 o el Ctrl+F.
> - Si migras manualmente un fichero → lee la § 9 (cheat sheet) + la § 5 (module mocking, el tema con mayor diferencia conceptual).
> - Si vas a escribir un helper de migración → el schematic oficial cubre el 80 % (ver `10-migracion-karma-vitest.md § 3.3`); este archivo cubre el 20 % que queda.

> [!NOTE]
> **Esto es un mapa de *runner*, no de framework.** Jasmine aquí es la API del runner (`describe`, `it`, `spyOn`, matchers, `jasmine.clock`), y Vitest es la API que la sustituye. La traducción vale igual para los tres stacks del taller: Angular, Vue y React.
>
> Contexto rápido de dónde salió cada uno:
> - **Angular** venía casi siempre con Karma + Jasmine. De ahí que los ejemplos con `TestBed` y `fakeAsync` usen la sintaxis jasminera más explícita.
> - **React** suele usar Jest, que heredó una API tipo Jasmine. Un proyecto React con Jest viejo tiene `spyOn`, `jasmine.createSpy` o `jasmine.any(...)` heredados del lenguaje común. Al migrar a Vitest, el mapeo es el mismo que para Angular.
> - **Vue** históricamente ha ido con Karma + Mocha o Jest; hoy el estándar es Vitest. Los equipos que migran desde Mocha + Chai tienen matchers distintos, pero la capa de spies y timers se traduce con la misma tabla.
>
> Por eso no duplicamos tablas: la equivalencia de sintaxis de runner es idéntica en los tres. Cuando un ejemplo use algo específico de Angular (`TestBed`, `fakeAsync(() => { ... })`, `waitForAsync`), te dejamos una nota al lado con el giro equivalente en React Testing Library o en Vue Test Utils.

---

## 0. Índice

1. [Estructura de Tests](#1-estructura-de-tests)
2. [Spies y Mocks](#2-spies-y-mocks)
3. [Matchers (Expectativas)](#3-matchers-expectativas)
4. [Patrones sin equivalente directo](#4-patrones-sin-equivalente-directo)
5. [Module mocking: la mayor diferencia](#5-module-mocking-la-mayor-diferencia)
6. [Timers](#6-timers)
7. [Patrones asíncronos: migración completa](#7-patrones-asíncronos-migración-completa)
8. [Custom Matchers (tipado TypeScript)](#8-custom-matchers)
9. [Cheat sheet visual](#9-cheat-sheet-visual)
10. [APIs específicas de Vitest 4 sin equivalente en Jasmine](#10-apis-específicas-de-vitest-4-sin-equivalente-en-jasmine)

---

## 1. Estructura de Tests

### 1.1 Tabla de equivalencias

| Jasmine | Vitest | Notas |
|---------|--------|-------|
| `describe('...', () => {})` | `describe('...', () => {})` | Idéntico |
| `it('...', () => {})` | `it('...', () => {})` | Idéntico |
| `beforeEach(() => {})` | `beforeEach(() => {})` | Idéntico |
| `afterEach(() => {})` | `afterEach(() => {})` | Idéntico |
| `beforeAll(() => {})` | `beforeAll(() => {})` | Idéntico |
| `afterAll(() => {})` | `afterAll(() => {})` | Idéntico |
| `fdescribe('...')` | `describe.only('...')` | Foco en un describe |
| `fit('...')` | `it.only('...')` | Foco en un test |
| `xdescribe('...')` | `describe.skip('...')` | Saltar describe |
| `xit('...')` | `it.skip('...')` | Saltar test |
| `pending()` | `it.skip()` o `ctx.skip()` | En Jasmine se llama *dentro* del test; en Vitest se marca `it.skip(...)` o se usa el contexto: `it('...', (ctx) => { ctx.skip() })` |
| `fail('msg')` | `expect.unreachable('msg')` | Forzar fallo. Alternativa equivalente: `throw new Error('msg')` |

### 1.2 Ejemplo real: estructura de un test de componente

> El ejemplo usa Angular (`TestBed`, `ComponentFixture`) porque era la convivencia típica Karma + Jasmine. En React cambia la capa de montaje, no la de runner: `render(<UserListComponent />)` de Testing Library sustituye al `TestBed.createComponent`, y `screen.getByText('John')` sustituye al `fixture.nativeElement.textContent`. En Vue 3, `mount(UserListComponent)` de Vue Test Utils juega el mismo papel. La traducción Jasmine → Vitest de este archivo se aplica igual en los tres.

**Jasmine (Karma):**
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserListComponent } from './user-list.component';
import { UserService } from '../services/user.service';
import { of } from 'rxjs';

fdescribe('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let userService: jasmine.SpyObj<UserService>;

  beforeEach(async () => {
    userService = jasmine.createSpyObj('UserService', ['getUsers']);
    userService.getUsers.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [
        { provide: UserService, useValue: userService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  xit('should show loading spinner', () => {
    // TODO: implementar
  });

  fit('should display users', () => {
    userService.getUsers.and.returnValue(of([{ name: 'John' }]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('John');
  });
});
```

**Vitest:**
```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UserListComponent } from './user-list.component';
import { UserService } from '../services/user.service';
import { of } from 'rxjs';

describe.only('UserListComponent', () => {
  let component: UserListComponent;
  let fixture: ComponentFixture<UserListComponent>;
  let userService: { getUsers: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    userService = {
      getUsers: vi.fn().mockReturnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [UserListComponent],
      providers: [
        { provide: UserService, useValue: userService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.skip('should show loading spinner', () => {
    // TODO: implementar
  });

  it.only('should display users', () => {
    userService.getUsers.mockReturnValue(of([{ name: 'John' }]));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('John');
  });
});
```

### 1.3 Features adicionales de Vitest para estructura

Vitest ofrece funcionalidades que no existen en Jasmine:

```typescript
// Test parametrizado (no existe en Jasmine)
it.each([
  { input: 1, expected: 2 },
  { input: 2, expected: 4 },
  { input: 3, expected: 6 },
])('duplicar($input) debería retornar $expected', ({ input, expected }) => {
  expect(duplicar(input)).toBe(expected);
});

// Describe parametrizado
describe.each([
  { role: 'admin', canDelete: true },
  { role: 'user', canDelete: false },
  { role: 'guest', canDelete: false },
])('Permisos para rol $role', ({ role, canDelete }) => {
  it(`delete debería ser ${canDelete}`, () => {
    expect(getPermissions(role).canDelete).toBe(canDelete);
  });
});

// Test con timeout personalizado
it('operación lenta', async () => {
  await operacionLenta();
}, 10000); // 10 segundos de timeout

// Test concurrente (ejecución paralela dentro del mismo archivo)
describe.concurrent('tests independientes', () => {
  it('test 1', async () => { /* ... */ });
  it('test 2', async () => { /* ... */ });
});

// Test TODO (aparece en el reporte como pendiente)
it.todo('implementar validación de email');

// Test con contexto tipado
it('usa contexto', ({ expect }) => {
  // 'expect' viene del contexto del test, no del global
  expect(1 + 1).toBe(2);
});
```

---

## 2. Spies y Mocks

### 2.1 Crear spies

```typescript
// JASMINE
const spy = jasmine.createSpy('mySpy');
spy.and.returnValue(42);

// VITEST
const spy = vi.fn();
spy.mockReturnValue(42);
```

### 2.2 createSpyObj (sin equivalente directo)

```typescript
// JASMINE
const service = jasmine.createSpyObj('UserService', ['getUser', 'saveUser']);
service.getUser.and.returnValue(of(mockUser));

// VITEST - crear el objeto manualmente
const service = {
  getUser: vi.fn(() => of(mockUser)),
  saveUser: vi.fn(),
};
```

### 2.3 createSpyObj con propiedades

```typescript
// JASMINE - createSpyObj con métodos Y propiedades
const service = jasmine.createSpyObj('AuthService', ['login', 'logout'], {
  isLoggedIn: true,
  currentUser: { name: 'John' }
});

// VITEST - crear manualmente con propiedades
const service = {
  login: vi.fn(),
  logout: vi.fn(),
  isLoggedIn: true,
  currentUser: { name: 'John' },
};
```

### 2.4 spyOn

```typescript
// JASMINE
spyOn(obj, 'method');
spyOn(obj, 'method').and.returnValue(42);
spyOn(obj, 'method').and.callFake(fn);
spyOn(obj, 'method').and.callThrough();
spyOn(obj, 'method').and.throwError(new Error('fail'));

// VITEST
vi.spyOn(obj, 'method');
vi.spyOn(obj, 'method').mockReturnValue(42);
vi.spyOn(obj, 'method').mockImplementation(fn);
vi.spyOn(obj, 'method');  // callThrough es el comportamiento por defecto
vi.spyOn(obj, 'method').mockImplementation(() => { throw new Error('fail'); });
```

**Diferencia clave:** En Jasmine, `spyOn` reemplaza el método por un spy que NO llama a la implementación original (equivalente a "stub"). En Vitest, `vi.spyOn` conserva la implementación original por defecto (equivalente a "callThrough"). La diferencia está documentada en las API refs de ambos proyectos.

> Jasmine `spyOn` sustituye por defecto; Vitest `vi.spyOn` hace callThrough.
>
> > **Fuente:** Jasmine — `spyOn`. https://jasmine.github.io/api/edge/global.html#spyOn
> >
> > **Fuente:** Vitest — Vi API Reference (`vi.spyOn`). https://vitest.dev/api/vi.html

Para replicar el comportamiento de Jasmine:

```typescript
// Para que vi.spyOn se comporte como el spyOn de Jasmine (sin callThrough):
vi.spyOn(obj, 'method').mockImplementation(() => undefined);
// o simplemente:
vi.spyOn(obj, 'method').mockReturnValue(undefined);
```

### 2.5 spyOn con getter/setter

```typescript
// JASMINE
spyOnProperty(obj, 'name', 'get').and.returnValue('John');
spyOnProperty(obj, 'name', 'set');

// VITEST
vi.spyOn(obj, 'name', 'get').mockReturnValue('John');
vi.spyOn(obj, 'name', 'set');
```

### 2.6 Tabla completa de spies

| Jasmine | Vitest |
|---------|--------|
| `spy.and.returnValue(val)` | `spy.mockReturnValue(val)` |
| `spy.and.returnValues(a, b)` | `spy.mockReturnValueOnce(a).mockReturnValueOnce(b)` |
| `spy.and.callFake(fn)` | `spy.mockImplementation(fn)` |
| `spy.and.callThrough()` | Comportamiento por defecto de `vi.spyOn` |
| `spy.and.stub()` | `spy.mockImplementation(() => {})` |
| `spy.and.throwError(err)` | `spy.mockImplementation(() => { throw err; })` |
| `spy.and.rejectWith(err)` | `spy.mockRejectedValue(err)` |
| `spy.and.resolveTo(val)` | `spy.mockResolvedValue(val)` |
| `spy.calls.count()` | `spy.mock.calls.length` |
| `spy.calls.argsFor(0)` | `spy.mock.calls[0]` |
| `spy.calls.allArgs()` | `spy.mock.calls` |
| `spy.calls.mostRecent().args` | `spy.mock.lastCall` |
| `spy.calls.first().args` | `spy.mock.calls[0]` |
| `spy.calls.reset()` | `spy.mockClear()` |
| `spy.calls.any()` | `spy.mock.calls.length > 0` |
| `spy.and.identity` | `spy.getMockName()` |

### 2.7 Ejemplo completo: migración de un test con spies

**Jasmine:**
```typescript
describe('OrderService', () => {
  let service: OrderService;
  let httpClient: jasmine.SpyObj<HttpClient>;
  let notificationService: jasmine.SpyObj<NotificationService>;

  beforeEach(() => {
    httpClient = jasmine.createSpyObj('HttpClient', ['get', 'post', 'put']);
    notificationService = jasmine.createSpyObj('NotificationService', ['success', 'error']);

    service = new OrderService(httpClient, notificationService);
  });

  it('should create order and notify', () => {
    const order = { product: 'Widget', quantity: 3 };
    const createdOrder = { id: 1, ...order };

    httpClient.post.and.returnValue(of(createdOrder));

    service.createOrder(order).subscribe(result => {
      expect(result).toEqual(createdOrder);
    });

    expect(httpClient.post).toHaveBeenCalledWith('/api/orders', order);
    expect(httpClient.post.calls.count()).toBe(1);
    expect(notificationService.success).toHaveBeenCalledWith('Pedido creado');
  });

  it('should handle error and notify', () => {
    httpClient.post.and.returnValue(throwError(() => new Error('Server error')));

    service.createOrder({}).subscribe({
      error: (err) => {
        expect(err.message).toBe('Server error');
      }
    });

    expect(notificationService.error).toHaveBeenCalledWith(
      jasmine.stringMatching(/error/i)
    );
  });
});
```

**Vitest:**
```typescript
describe('OrderService', () => {
  let service: OrderService;
  let httpClient: {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
  };
  let notificationService: {
    success: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    httpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
    };
    notificationService = {
      success: vi.fn(),
      error: vi.fn(),
    };

    service = new OrderService(httpClient as any, notificationService as any);
  });

  it('should create order and notify', () => {
    const order = { product: 'Widget', quantity: 3 };
    const createdOrder = { id: 1, ...order };

    httpClient.post.mockReturnValue(of(createdOrder));

    service.createOrder(order).subscribe(result => {
      expect(result).toEqual(createdOrder);
    });

    expect(httpClient.post).toHaveBeenCalledWith('/api/orders', order);
    expect(httpClient.post.mock.calls.length).toBe(1);
    // o más idiomático en Vitest:
    expect(httpClient.post).toHaveBeenCalledTimes(1);
    expect(notificationService.success).toHaveBeenCalledWith('Pedido creado');
  });

  it('should handle error and notify', () => {
    httpClient.post.mockReturnValue(throwError(() => new Error('Server error')));

    service.createOrder({}).subscribe({
      error: (err) => {
        expect(err.message).toBe('Server error');
      }
    });

    expect(notificationService.error).toHaveBeenCalledWith(
      expect.stringMatching(/error/i)
    );
  });
});
```

---

## 3. Matchers (Expectativas)

### 3.1 Matchers idénticos

Estos matchers funcionan igual en Jasmine y en Vitest:

```typescript
expect(x).toBe(y);
expect(x).toEqual(y);
expect(x).toBeTruthy();
expect(x).toBeFalsy();
expect(x).toBeNull();
expect(x).toBeUndefined();
expect(x).toBeDefined();
expect(x).toContain(y);
expect(x).toMatch(/regex/);
expect(x).toThrow();
expect(x).toThrowError('msg');
expect(x).toBeGreaterThan(y);
expect(x).toBeGreaterThanOrEqual(y);
expect(x).toBeLessThan(y);
expect(x).toBeLessThanOrEqual(y);
expect(x).toBeCloseTo(y, decimals);
expect(x).toBeNaN();
expect(spy).toHaveBeenCalled();
expect(spy).toHaveBeenCalledWith(a, b);
expect(spy).toHaveBeenCalledTimes(n);
expect(x).not.toBe(y);  // negación con .not
```

### 3.2 Matchers con cambio de namespace

| Jasmine | Vitest |
|---------|--------|
| `jasmine.objectContaining({a: 1})` | `expect.objectContaining({a: 1})` |
| `jasmine.arrayContaining([1, 2])` | `expect.arrayContaining([1, 2])` |
| `jasmine.any(Number)` | `expect.any(Number)` |
| `jasmine.anything()` | `expect.anything()` |
| `jasmine.stringMatching(/re/)` | `expect.stringMatching(/re/)` |

### 3.3 Ejemplo de migración con matchers anidados

```typescript
// JASMINE
expect(result).toEqual(jasmine.objectContaining({
  name: jasmine.any(String),
  items: jasmine.arrayContaining([
    jasmine.objectContaining({ id: 1 })
  ]),
  metadata: jasmine.objectContaining({
    createdAt: jasmine.any(Date),
    tags: jasmine.arrayContaining([
      jasmine.stringMatching(/^tag-/)
    ])
  })
}));

// VITEST
expect(result).toEqual(expect.objectContaining({
  name: expect.any(String),
  items: expect.arrayContaining([
    expect.objectContaining({ id: 1 })
  ]),
  metadata: expect.objectContaining({
    createdAt: expect.any(Date),
    tags: expect.arrayContaining([
      expect.stringMatching(/^tag-/)
    ])
  })
}));
```

### 3.4 Matchers adicionales de Vitest (no existen en Jasmine)

```typescript
// Igualdad estricta (verifica propiedades undefined y prototipos)
expect(x).toStrictEqual(y);

// Snapshot testing
expect(x).toMatchSnapshot();
expect(x).toMatchInlineSnapshot(`"valor esperado"`);

// Verificar propiedad
expect(obj).toHaveProperty('key');
expect(obj).toHaveProperty('key', value);
expect(obj).toHaveProperty('nested.deep.key');

// Verificar instancia
expect(err).toBeInstanceOf(TypeError);

// Predicado personalizado
expect(x).toSatisfy((val) => val > 0 && val < 100);

// Verificar valor de retorno del spy
expect(spy).toHaveReturnedWith(42);
expect(spy).toHaveLastReturnedWith(42);
expect(spy).toHaveNthReturnedWith(1, 42);

// Verificar longitud
expect(array).toHaveLength(3);

// Verificar tipo con typeof
expect(typeof x).toBe('string');

// Soft assertions (no detienen la ejecución al fallar)
expect.soft(1 + 1).toBe(3);  // falla pero continúa
expect.soft(2 + 2).toBe(4);  // también se ejecuta
// El test falla al final si alguna soft assertion falló
```

---

## 4. Patrones sin equivalente directo

### 4.1 jasmine.createSpyObj() -> Objeto manual con vi.fn()

`jasmine.createSpyObj` crea de golpe un objeto con métodos spy. En Vitest no existe un atajo equivalente: creas el objeto a mano.

**Jasmine:**
```typescript
// Crear spy object con métodos
const router = jasmine.createSpyObj('Router', ['navigate', 'navigateByUrl']);

// Crear spy object con métodos y propiedades
const authService = jasmine.createSpyObj('AuthService',
  ['login', 'logout', 'refreshToken'],
  { isLoggedIn: true, currentUser: { name: 'John' } }
);

// Configurar retornos
router.navigate.and.returnValue(Promise.resolve(true));
authService.login.and.returnValue(of({ token: 'abc123' }));
```

**Vitest:**
```typescript
// Crear el objeto manualmente
const router = {
  navigate: vi.fn().mockResolvedValue(true),
  navigateByUrl: vi.fn(),
};

// Con propiedades
const authService = {
  login: vi.fn().mockReturnValue(of({ token: 'abc123' })),
  logout: vi.fn(),
  refreshToken: vi.fn(),
  isLoggedIn: true,
  currentUser: { name: 'John' },
};
```

Si tiras mucho de `createSpyObj` en el proyecto viejo, te compensa escribir un helper:

```typescript
// test-utils.ts
type MockMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? ReturnType<typeof vi.fn>
    : T[K];
};

function createMockObj<T>(methods: (keyof T)[], props?: Partial<T>): MockMethods<T> {
  const obj: any = { ...props };
  methods.forEach(method => {
    obj[method] = vi.fn();
  });
  return obj;
}

// Uso:
const service = createMockObj<UserService>(['getUser', 'saveUser'], {
  baseUrl: '/api'
});
```

### 4.2 jasmine.clock().mockDate() -> vi.setSystemTime()

**Jasmine:**
```typescript
describe('DateService', () => {
  beforeEach(() => {
    jasmine.clock().install();
    jasmine.clock().mockDate(new Date('2025-06-15T10:30:00'));
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('debería retornar la fecha actual formateada', () => {
    const result = service.getFormattedDate();
    expect(result).toBe('15/06/2025');
  });

  it('debería detectar fin de semana', () => {
    jasmine.clock().mockDate(new Date('2025-06-14T10:00:00')); // sábado
    expect(service.isWeekend()).toBeTrue();
  });
});
```

**Vitest:**
```typescript
describe('DateService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T10:30:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debería retornar la fecha actual formateada', () => {
    const result = service.getFormattedDate();
    expect(result).toBe('15/06/2025');
  });

  it('debería detectar fin de semana', () => {
    vi.setSystemTime(new Date('2025-06-14T10:00:00')); // sábado
    expect(service.isWeekend()).toBe(true);
  });
});
```

Nota: en Jasmine puedes usar `.toBeTrue()` (de `jasmine-matchers`), en Vitest es `.toBe(true)` o `.toBeTruthy()`.

### 4.3 Jasmine custom equality testers -> expect.extend()

Los "custom equality testers" de Jasmine permiten definir cómo se comparan dos objetos en TODOS los matchers (toBe, toEqual, toContain, etc.). En Vitest, se usa `expect.extend()` para crear matchers personalizados.

**Jasmine:**
```typescript
// Custom equality tester: compara Money objects por valor
beforeEach(() => {
  jasmine.addCustomEqualityTester((a: any, b: any) => {
    if (a instanceof Money && b instanceof Money) {
      return a.amount === b.amount && a.currency === b.currency;
    }
    return undefined; // undefined = usar la comparación por defecto
  });
});

it('compara monedas', () => {
  const price1 = new Money(100, 'EUR');
  const price2 = new Money(100, 'EUR');
  // Funciona con CUALQUIER matcher gracias al custom equality tester
  expect(price1).toEqual(price2);
  expect([price1]).toContain(price2);
});
```

**Vitest:**
```typescript
// Vitest no tiene custom equality testers globales.
// Opción 1: usar expect.extend() para crear un matcher personalizado
expect.extend({
  toEqualMoney(received: Money, expected: Money) {
    const pass = received.amount === expected.amount
              && received.currency === expected.currency;
    return {
      pass,
      message: () => pass
        ? `expected ${received} not to equal ${expected}`
        : `expected ${received} to equal ${expected}`,
    };
  }
});

it('compara monedas', () => {
  const price1 = new Money(100, 'EUR');
  const price2 = new Money(100, 'EUR');
  expect(price1).toEqualMoney(price2);
});

// Opción 2: implementar toJSON() o un método equals() en la clase
class Money {
  constructor(public amount: number, public currency: string) {}

  toJSON() {
    return { amount: this.amount, currency: this.currency };
  }
}

it('compara monedas via toJSON', () => {
  const price1 = new Money(100, 'EUR');
  const price2 = new Money(100, 'EUR');
  // toEqual usa toJSON() si está disponible
  expect(price1).toEqual(price2);
});
```

### 4.4 done() callback -> async/await


El callback `done()` era la forma antigua de manejar asincronía en Jasmine. Vitest lo sigue aceptando, pero está desaconsejado: usa `async/await`.

**Jasmine (done callback):**
```typescript
it('carga usuario por ID', (done) => {
  service.getUser(1).subscribe({
    next: (user) => {
      expect(user.name).toBe('John');
      expect(user.email).toContain('@');
      done();
    },
    error: (err) => {
      fail('No debería fallar: ' + err.message);
      done();
    }
  });
});

it('maneja error 404', (done) => {
  service.getUser(999).subscribe({
    next: () => {
      fail('Debería haber fallado');
      done();
    },
    error: (err) => {
      expect(err.status).toBe(404);
      done();
    }
  });
});
```

**Vitest (async/await):**
```typescript
it('carga usuario por ID', async () => {
  const user = await firstValueFrom(service.getUser(1));
  expect(user.name).toBe('John');
  expect(user.email).toContain('@');
});

it('maneja error 404', async () => {
  await expect(
    firstValueFrom(service.getUser(999))
  ).rejects.toMatchObject({ status: 404 });
});
```

### 4.5 jasmine.addMatchers() -> expect.extend()

**Jasmine:**
```typescript
beforeEach(() => {
  jasmine.addMatchers({
    toBeValidEmail: () => ({
      compare: (actual: string) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const pass = emailRegex.test(actual);
        return {
          pass,
          message: pass
            ? `Expected "${actual}" not to be a valid email`
            : `Expected "${actual}" to be a valid email`
        };
      }
    }),
    toBeWithinRange: () => ({
      compare: (actual: number, floor: number, ceiling: number) => ({
        pass: actual >= floor && actual <= ceiling,
        message: `Expected ${actual} to be within ${floor}-${ceiling}`
      })
    })
  });
});

it('valida email', () => {
  expect('user@example.com').toBeValidEmail();
  expect('invalid').not.toBeValidEmail();
});

it('valida rango', () => {
  expect(5).toBeWithinRange(1, 10);
});
```

**Vitest:**
```typescript
expect.extend({
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    return {
      pass,
      message: () => pass
        ? `expected "${received}" not to be a valid email`
        : `expected "${received}" to be a valid email`,
    };
  },
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  }
});

it('valida email', () => {
  expect('user@example.com').toBeValidEmail();
  expect('invalid').not.toBeValidEmail();
});

it('valida rango', () => {
  expect(5).toBeWithinRange(1, 10);
});
```

### 4.6 Tipado TypeScript para matchers custom

En Jasmine, los custom matchers no tenían tipado automático y acababas usando `any`. Vitest sí los tipa:

```typescript
// vitest.d.ts (declarar en la raíz del proyecto)
import 'vitest';

interface CustomMatchers<R = unknown> {
  toBeValidEmail: () => R;
  toBeWithinRange: (floor: number, ceiling: number) => R;
  toEqualMoney: (expected: Money) => R;
}

declare module 'vitest' {
  interface Assertion<T = any> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}
```

---

## 5. Module mocking: la mayor diferencia

### 5.1 El problema: Jasmine no hace mocking de módulos

Aquí está la diferencia más grande entre ambas herramientas. Jasmine se diseñó antes de que JavaScript tuviera módulos nativos, así que no intercepta `import` ni `require` de fábrica.

En Jasmine, si un componente importa una función directamente, no puedes mockearla desde el test sin trucos:

```typescript
// user.service.ts
import { apiClient } from './api-client';

export class UserService {
  async getUser(id: number) {
    return apiClient.get(`/users/${id}`);
  }
}
```

### 5.2 Los workarounds en Jasmine (todos tienen problemas)

**Workaround 1: `import * as` + `spyOn` (frágil)**

```typescript
import * as ApiClientModule from './api-client';

beforeEach(() => {
  spyOn(ApiClientModule, 'apiClient').and.returnValue(mockClient);
  // PROBLEMA: Esto puede no funcionar con ESM porque las exportaciones
  // son read-only bindings. En CommonJS funciona porque las exportaciones
  // son propiedades mutables del objeto module.exports.
});
```

Este workaround es frágil:
- No funciona con ESM, que es lo que Angular usa con Vite.
- Puede fallar en silencio.
- No mockea el módulo en otros archivos que lo importen.

**Workaround 2: Dependency Injection (invasivo)**

```typescript
// Reestructurar el código para recibir la dependencia por DI
export class UserService {
  constructor(private apiClient: ApiClient) {}  // ahora es inyectable

  async getUser(id: number) {
    return this.apiClient.get(`/users/${id}`);
  }
}

// En el test:
const mockApiClient = jasmine.createSpyObj('ApiClient', ['get']);
const service = new UserService(mockApiClient);
```

Funciona, pero obliga a reestructurar el código para que sea testeable. Con funciones de utilidad, constantes o módulos de terceros, muchas veces no es práctico.

**Workaround 3: rewire / proxyquire (herramientas externas)**

```typescript
// Con proxyquire (CommonJS only)
const UserService = proxyquire('./user.service', {
  './api-client': { apiClient: mockClient }
}).UserService;
```

Estas herramientas son pesadas, solo funcionan con CommonJS y ya no se mantienen.

### 5.3 vi.mock(): la solución integrada de Vitest

Vitest mockea módulos de fábrica y funciona con ESM de forma nativa. Cambia bastante cómo escribes los tests.

**Auto-mock.** Todas las exportaciones se convierten en `vi.fn()`:
```typescript
// Mockear un módulo completo -- TODAS las exportaciones son vi.fn()
vi.mock('./api-client');

import { apiClient } from './api-client';
// apiClient.get, apiClient.post, etc. son vi.fn() automáticamente
```

**Factory mock.** Defines las implementaciones una por una:
```typescript
vi.mock('./api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ name: 'John' }),
    post: vi.fn().mockResolvedValue({ id: 1 }),
  }
}));

import { apiClient } from './api-client';
// apiClient.get() retorna Promise<{ name: 'John' }>
```

**Spy mode.** Conservas la implementación real, pero la trackeas:
```typescript
vi.mock(import('./calculator'), { spy: true });

import { sum } from './calculator';
// sum(1, 2) retorna 3 (implementación real) pero es un spy
// expect(sum).toHaveBeenCalledWith(1, 2) funciona
```

### 5.4 Cómo funciona el hoisting de vi.mock()

`vi.mock()` se mueve automáticamente al inicio del archivo antes de cualquier `import`. Tiene que hacerlo así porque los imports de ES se resuelven de forma estática. La guía oficial de module mocking de Vitest lo explica en detalle.

> Vitest hoistea `vi.mock` en tiempo de compilación; `vi.hoisted` es la vía oficial para capturar variables.
>
> > **Fuente:** Vitest — Module Mocking. https://vitest.dev/guide/mocking/modules

```typescript
// Lo que escribes:
import { UserService } from './user.service';
import { apiClient } from './api-client';

vi.mock('./api-client', () => ({
  apiClient: { get: vi.fn() }
}));

// Lo que Vitest ejecuta (después del hoisting):
vi.mock('./api-client', () => ({
  apiClient: { get: vi.fn() }
}));

import { UserService } from './user.service';
import { apiClient } from './api-client';
// Cuando user.service.ts importa api-client, ya recibe el mock
```

Ojo a la consecuencia. No puedes usar variables definidas fuera de `vi.mock()` dentro de la factory, porque esas variables aún no existen cuando el mock se ejecuta:

```typescript
// MAL: mockUser no existe cuando se ejecuta vi.mock()
const mockUser = { name: 'John' };
vi.mock('./api-client', () => ({
  apiClient: { get: vi.fn().mockResolvedValue(mockUser) }  // Error!
}));

// BIEN: usar vi.hoisted() para definir variables que se hoisteen también
const { mockUser } = vi.hoisted(() => ({
  mockUser: { name: 'John' }
}));

vi.mock('./api-client', () => ({
  apiClient: { get: vi.fn().mockResolvedValue(mockUser) }  // OK
}));
```

### 5.5 Partial mocking con importOriginal

A veces solo quieres mockear alguna exportación de un módulo y dejar el resto intacto:

```typescript
vi.mock('./utils', async (importOriginal) => {
  const original = await importOriginal<typeof import('./utils')>();
  return {
    ...original,                    // mantener todas las exportaciones originales
    formatDate: vi.fn(() => '01/01/2025'),  // solo mockear esta
  };
});

import { formatDate, formatCurrency } from './utils';
// formatDate() retorna '01/01/2025' (mock)
// formatCurrency() retorna el valor real (original)
```

### 5.6 Mockear módulos de node_modules

```typescript
// Mockear axios completamente
vi.mock('axios');

// Mockear una función específica de lodash
vi.mock('lodash', async (importOriginal) => {
  const original = await importOriginal<typeof import('lodash')>();
  return {
    ...original,
    debounce: vi.fn((fn) => fn),  // eliminar el debounce en tests
  };
});

// Mockear un módulo de Angular
vi.mock('@angular/router', async (importOriginal) => {
  const original = await importOriginal<typeof import('@angular/router')>();
  return {
    ...original,
    ActivatedRoute: vi.fn().mockImplementation(() => ({
      params: of({ id: '123' }),
      queryParams: of({}),
    })),
  };
});
```

### 5.7 vi.mock vs vi.spyOn: cuándo usar cada uno

| Escenario | Usar |
|-----------|------|
| Mockear un **método** de un objeto que ya tienes | `vi.spyOn(obj, 'method')` |
| Mockear un **módulo entero** | `vi.mock('./module')` |
| Mockear **algunas funciones** de un módulo | `vi.mock()` con `importOriginal` |
| Mockear una **dependencia inyectada** (Angular DI) | `vi.fn()` + provider en TestBed |
| Mockear un **hook o context** de React | `vi.mock('./use-user')` + `vi.mocked(useUser).mockReturnValue(...)` |
| Mockear un **composable o store Pinia** en Vue | `vi.mock('./useUser')` o `createTestingPinia({ initialState })` |
| Mockear una librería de **node_modules** | `vi.mock('library')` |
| **Espiar** sin cambiar el comportamiento | `vi.spyOn()` sin `.mockImplementation()` |

---

## 6. Timers

### 6.1 Tabla de equivalencias

| Jasmine / Angular | Vitest |
|-------------------|--------|
| `jasmine.clock().install()` | `vi.useFakeTimers()` |
| `jasmine.clock().tick(1000)` | `vi.advanceTimersByTime(1000)` |
| `jasmine.clock().uninstall()` | `vi.useRealTimers()` |
| `jasmine.clock().mockDate(date)` | `vi.setSystemTime(date)` |
| `fakeAsync(() => { ... })` | `vi.useFakeTimers()` + test normal |
| `tick(ms)` | `vi.advanceTimersByTime(ms)` |
| `flush()` | `vi.runAllTimers()` |
| `flushMicrotasks()` | `await vi.advanceTimersByTimeAsync(0)` |
| N/A | `vi.runOnlyPendingTimers()` |
| N/A | `vi.getTimerCount()` |
| N/A | `vi.advanceTimersToNextTimer()` |

### 6.2 Ejemplo completo: Jasmine clock

```typescript
// JASMINE
describe('NotificationService', () => {
  beforeEach(() => {
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('auto-dismiss notification after 3 seconds', () => {
    const cb = jasmine.createSpy('callback');
    service.showNotification('Hello', { autoDismiss: true, onDismiss: cb });

    jasmine.clock().tick(2999);
    expect(cb).not.toHaveBeenCalled();

    jasmine.clock().tick(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('formats date correctly', () => {
    jasmine.clock().mockDate(new Date('2025-12-25T00:00:00'));
    expect(service.getCurrentDateFormatted()).toBe('25/12/2025');
  });
});

// VITEST
describe('NotificationService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-dismiss notification after 3 seconds', () => {
    const cb = vi.fn();
    service.showNotification('Hello', { autoDismiss: true, onDismiss: cb });

    vi.advanceTimersByTime(2999);
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('formats date correctly', () => {
    vi.setSystemTime(new Date('2025-12-25T00:00:00'));
    expect(service.getCurrentDateFormatted()).toBe('25/12/2025');
  });
});
```

### 6.3 Timer features avanzados de Vitest

Vitest te da más control fino sobre los timers que Jasmine:

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

it('control granular de timers', () => {
  const cb1 = vi.fn();
  const cb2 = vi.fn();
  const cb3 = vi.fn();

  setTimeout(cb1, 100);
  setTimeout(cb2, 200);
  setInterval(cb3, 50);

  // Ver cuántos timers están pendientes
  expect(vi.getTimerCount()).toBe(3);

  // Avanzar solo al próximo timer
  vi.advanceTimersToNextTimer();
  expect(cb3).toHaveBeenCalledTimes(1);  // interval a 50ms

  // Ejecutar solo los timers pendientes (no los generados por ellos)
  vi.runOnlyPendingTimers();

  // Ejecutar TODOS los timers (incluidos los generados recursivamente)
  vi.runAllTimers();
});

it('fake timers async (para Promises)', async () => {
  const result: string[] = [];

  setTimeout(() => result.push('timer'), 100);
  Promise.resolve().then(() => result.push('promise'));

  // advanceTimersByTimeAsync avanza timers Y resuelve microtasks
  await vi.advanceTimersByTimeAsync(100);

  expect(result).toEqual(['promise', 'timer']);
});
```

---

## 7. Patrones asíncronos: migración completa

### 7.1 done() callback -> async/await (ejemplo completo)

**Jasmine con done():**
```typescript
describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(httpClient);
  });

  it('carga lista de usuarios', (done) => {
    service.getUsers().subscribe({
      next: (users) => {
        expect(users).toBeDefined();
        expect(users.length).toBeGreaterThan(0);
        expect(users[0]).toEqual(jasmine.objectContaining({
          name: jasmine.any(String),
          email: jasmine.stringMatching(/@/)
        }));
        done();
      },
      error: (err) => {
        fail('No debería fallar: ' + err.message);
        done();
      }
    });
  });

  it('maneja error del servidor', (done) => {
    spyOn(httpClient, 'get').and.returnValue(
      throwError(() => ({ status: 500, message: 'Internal Server Error' }))
    );

    service.getUsers().subscribe({
      next: () => {
        fail('Debería haber fallado');
        done();
      },
      error: (err) => {
        expect(err.status).toBe(500);
        expect(err.message).toBe('Internal Server Error');
        done();
      }
    });
  });

  it('retorna cache si los datos ya fueron cargados', (done) => {
    // Primera carga
    service.getUsers().subscribe(() => {
      // Segunda carga debería usar cache
      service.getUsers().subscribe((users) => {
        expect(httpClient.get).toHaveBeenCalledTimes(1); // solo una llamada HTTP
        done();
      });
    });
  });
});
```

**Vitest con async/await:**
```typescript
import { firstValueFrom } from 'rxjs';

describe('UserService', () => {
  let service: UserService;

  beforeEach(() => {
    service = new UserService(httpClient);
  });

  it('carga lista de usuarios', async () => {
    const users = await firstValueFrom(service.getUsers());

    expect(users).toBeDefined();
    expect(users.length).toBeGreaterThan(0);
    expect(users[0]).toEqual(expect.objectContaining({
      name: expect.any(String),
      email: expect.stringMatching(/@/)
    }));
  });

  it('maneja error del servidor', async () => {
    vi.spyOn(httpClient, 'get').mockReturnValue(
      throwError(() => ({ status: 500, message: 'Internal Server Error' }))
    );

    await expect(
      firstValueFrom(service.getUsers())
    ).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error'
    });
  });

  it('retorna cache si los datos ya fueron cargados', async () => {
    // Primera carga
    await firstValueFrom(service.getUsers());
    // Segunda carga debería usar cache
    await firstValueFrom(service.getUsers());

    expect(httpClient.get).toHaveBeenCalledTimes(1);
  });
});
```

### 7.2 fakeAsync/tick -> vi.useFakeTimers (ejemplo completo)

> `fakeAsync` y `tick` son de `@angular/core/testing`, no de Jasmine puro. En React y Vue no existe ese envoltorio: se usa `vi.useFakeTimers()` directamente y se avanza el reloj con `vi.advanceTimersByTime(ms)` (o su versión `...Async`). Si vienes de Jest, es la misma API: `jest.useFakeTimers()` y `jest.advanceTimersByTime(ms)` tienen equivalencia 1:1 con Vitest. Para flushear microtasks de `act()` en React, combina `vi.advanceTimersByTimeAsync` con `await waitFor(...)` de Testing Library.

**Jasmine + Angular (fakeAsync):**
```typescript
import { fakeAsync, tick, flush } from '@angular/core/testing';

describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let searchService: jasmine.SpyObj<SearchService>;

  beforeEach(async () => {
    searchService = jasmine.createSpyObj('SearchService', ['search']);
    searchService.search.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [{ provide: SearchService, useValue: searchService }]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debounce de 300ms en la búsqueda', fakeAsync(() => {
    // Simular escritura
    component.searchControl.setValue('ang');
    tick(100);
    expect(searchService.search).not.toHaveBeenCalled();

    component.searchControl.setValue('angu');
    tick(100);
    expect(searchService.search).not.toHaveBeenCalled();

    component.searchControl.setValue('angular');
    tick(300); // completar debounce
    expect(searchService.search).toHaveBeenCalledWith('angular');
    expect(searchService.search).toHaveBeenCalledTimes(1);
  }));

  it('muestra spinner mientras busca', fakeAsync(() => {
    searchService.search.and.returnValue(
      of(['resultado']).pipe(delay(500))
    );

    component.searchControl.setValue('test');
    tick(300); // debounce
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner')).toBeTruthy();

    tick(500); // esperar respuesta
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('resultado');
  }));

  it('cancela búsqueda anterior al escribir de nuevo', fakeAsync(() => {
    searchService.search.and.returnValue(
      of(['viejo']).pipe(delay(1000))
    );

    component.searchControl.setValue('primera');
    tick(300);

    searchService.search.and.returnValue(of(['nuevo']));
    component.searchControl.setValue('segunda');
    tick(300);

    flush(); // ejecutar todo lo pendiente
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('nuevo');
    expect(fixture.nativeElement.textContent).not.toContain('viejo');
  }));
});
```

**Vitest:**
```typescript
describe('SearchComponent', () => {
  let component: SearchComponent;
  let fixture: ComponentFixture<SearchComponent>;
  let searchService: { search: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    vi.useFakeTimers();

    searchService = {
      search: vi.fn().mockReturnValue(of([]))
    };

    await TestBed.configureTestingModule({
      imports: [SearchComponent],
      providers: [{ provide: SearchService, useValue: searchService }]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounce de 300ms en la búsqueda', () => {
    component.searchControl.setValue('ang');
    vi.advanceTimersByTime(100);
    expect(searchService.search).not.toHaveBeenCalled();

    component.searchControl.setValue('angu');
    vi.advanceTimersByTime(100);
    expect(searchService.search).not.toHaveBeenCalled();

    component.searchControl.setValue('angular');
    vi.advanceTimersByTime(300);
    expect(searchService.search).toHaveBeenCalledWith('angular');
    expect(searchService.search).toHaveBeenCalledTimes(1);
  });

  it('muestra spinner mientras busca', async () => {
    searchService.search.mockReturnValue(
      of(['resultado']).pipe(delay(500))
    );

    component.searchControl.setValue('test');
    await vi.advanceTimersByTimeAsync(300); // debounce
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner')).toBeTruthy();

    await vi.advanceTimersByTimeAsync(500); // esperar respuesta
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.spinner')).toBeFalsy();
    expect(fixture.nativeElement.textContent).toContain('resultado');
  });

  it('cancela búsqueda anterior al escribir de nuevo', async () => {
    searchService.search.mockReturnValue(
      of(['viejo']).pipe(delay(1000))
    );

    component.searchControl.setValue('primera');
    vi.advanceTimersByTime(300);

    searchService.search.mockReturnValue(of(['nuevo']));
    component.searchControl.setValue('segunda');
    vi.advanceTimersByTime(300);

    vi.runAllTimers(); // equivalente a flush()
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('nuevo');
    expect(fixture.nativeElement.textContent).not.toContain('viejo');
  });
});
```

### 7.3 waitForAsync -> async/await nativo (ejemplo completo)

> `waitForAsync` y `fixture.whenStable()` son de Angular. El equivalente en React Testing Library es `await waitFor(() => expect(...).toBe(...))` o `await screen.findByText('100')`, que ya espera a que el DOM se estabilice. En Vue Test Utils, `await wrapper.vm.$nextTick()` o `await flushPromises()` de `@vue/test-utils` hacen el trabajo. En los tres casos, lo que en Jasmine era un wrapper especial pasa a ser `async/await` plano, que es exactamente el punto de esta sección.

**Jasmine + Angular (waitForAsync):**
```typescript
import { waitForAsync } from '@angular/core/testing';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: StatsService, useValue: mockStatsService },
        { provide: ChartService, useValue: mockChartService },
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('carga estadísticas al iniciar', waitForAsync(() => {
    mockStatsService.getStats.and.returnValue(
      of({ users: 100, orders: 50 })
    );

    fixture.detectChanges(); // dispara ngOnInit

    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.user-count').textContent)
        .toContain('100');
      expect(fixture.nativeElement.querySelector('.order-count').textContent)
        .toContain('50');
    });
  }));

  it('muestra error si falla la carga', waitForAsync(() => {
    mockStatsService.getStats.and.returnValue(
      throwError(() => new Error('Network error'))
    );

    fixture.detectChanges();

    fixture.whenStable().then(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.error-message'))
        .toBeTruthy();
    });
  }));
});
```

**Vitest (async/await nativo):**
```typescript
describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: StatsService, useValue: mockStatsService },
        { provide: ChartService, useValue: mockChartService },
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('carga estadísticas al iniciar', async () => {
    mockStatsService.getStats.mockReturnValue(
      of({ users: 100, orders: 50 })
    );

    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.user-count').textContent)
      .toContain('100');
    expect(fixture.nativeElement.querySelector('.order-count').textContent)
      .toContain('50');
  });

  it('muestra error si falla la carga', async () => {
    mockStatsService.getStats.mockReturnValue(
      throwError(() => new Error('Network error'))
    );

    fixture.detectChanges();

    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.error-message'))
      .toBeTruthy();
  });
});
```

### 7.4 Observable testing: migración completa

**Jasmine (con subscribe + done):**
```typescript
describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    service = new CartService();
  });

  it('calcula total correctamente', (done) => {
    service.addItem({ name: 'Widget', price: 10, quantity: 2 });
    service.addItem({ name: 'Gadget', price: 25, quantity: 1 });

    service.total$.subscribe(total => {
      expect(total).toBe(45);
      done();
    });
  });

  it('emite items actualizados', (done) => {
    const expectedItems: any[] = [];

    service.items$.subscribe(items => {
      expectedItems.push(items);

      if (expectedItems.length === 3) {
        expect(expectedItems[0]).toEqual([]);
        expect(expectedItems[1].length).toBe(1);
        expect(expectedItems[2].length).toBe(2);
        done();
      }
    });

    service.addItem({ name: 'A', price: 10, quantity: 1 });
    service.addItem({ name: 'B', price: 20, quantity: 1 });
  });

  it('filtra items por categoría', (done) => {
    service.addItem({ name: 'Widget', price: 10, quantity: 1, category: 'tools' });
    service.addItem({ name: 'Book', price: 15, quantity: 1, category: 'media' });
    service.addItem({ name: 'Hammer', price: 30, quantity: 1, category: 'tools' });

    service.getItemsByCategory('tools').subscribe(items => {
      expect(items.length).toBe(2);
      expect(items.every(i => i.category === 'tools')).toBeTrue();
      done();
    });
  });
});
```

**Vitest (con firstValueFrom / toArray / async):**
```typescript
import { firstValueFrom, take, toArray } from 'rxjs';

describe('CartService', () => {
  let service: CartService;

  beforeEach(() => {
    service = new CartService();
  });

  it('calcula total correctamente', async () => {
    service.addItem({ name: 'Widget', price: 10, quantity: 2 });
    service.addItem({ name: 'Gadget', price: 25, quantity: 1 });

    const total = await firstValueFrom(service.total$);
    expect(total).toBe(45);
  });

  it('emite items actualizados', async () => {
    // Preparar la suscripción que recolecta 3 emisiones
    const itemsPromise = firstValueFrom(
      service.items$.pipe(take(3), toArray())
    );

    service.addItem({ name: 'A', price: 10, quantity: 1 });
    service.addItem({ name: 'B', price: 20, quantity: 1 });

    const allEmissions = await itemsPromise;

    expect(allEmissions[0]).toEqual([]);
    expect(allEmissions[1]).toHaveLength(1);
    expect(allEmissions[2]).toHaveLength(2);
  });

  it('filtra items por categoría', async () => {
    service.addItem({ name: 'Widget', price: 10, quantity: 1, category: 'tools' });
    service.addItem({ name: 'Book', price: 15, quantity: 1, category: 'media' });
    service.addItem({ name: 'Hammer', price: 30, quantity: 1, category: 'tools' });

    const items = await firstValueFrom(service.getItemsByCategory('tools'));

    expect(items).toHaveLength(2);
    expect(items.every(i => i.category === 'tools')).toBe(true);
  });
});
```

### 7.5 Marble testing: migración de jasmine-marbles a RxJS TestScheduler

Si usas `jasmine-marbles` para testar Observables con "marble diagrams", no hay equivalente directo en Vitest. Usa el `TestScheduler` de RxJS directamente.

**Jasmine (jasmine-marbles):**
```typescript
import { cold, hot, getTestScheduler } from 'jasmine-marbles';

describe('SearchService', () => {
  it('debounce y distinct', () => {
    const input    = hot('-a-b-c---c-d--|');
    const expected = cold('------c------d--|');

    const result = input.pipe(
      debounceTime(30, getTestScheduler()),
      distinctUntilChanged()
    );

    expect(result).toBeObservable(expected);
  });
});
```

**Vitest (RxJS TestScheduler):**
```typescript
import { TestScheduler } from 'rxjs/testing';

describe('SearchService', () => {
  let scheduler: TestScheduler;

  beforeEach(() => {
    scheduler = new TestScheduler((actual, expected) => {
      expect(actual).toEqual(expected);
    });
  });

  it('debounce y distinct', () => {
    scheduler.run(({ hot, expectObservable }) => {
      const input = hot('-a-b-c---c-d--|');

      const result = input.pipe(
        debounceTime(30),
        distinctUntilChanged()
      );

      expectObservable(result).toBe('------c------d--|');
    });
  });
});
```

---

## 8. Custom Matchers

> El patrón completo `jasmine.addMatchers()` → `expect.extend()` (con ejemplos `toBeValidEmail` y `toBeWithinRange`) está en la § 4.5. El tipado TypeScript de matchers custom está en la § 4.6. Aquí solo dejamos el checklist de migración para consulta rápida.

**Checklist rápido:**

- [ ] Migrar cada `jasmine.addMatchers({ nombre: () => ({ compare: ... }) })` a `expect.extend({ nombre(received, ...) { return { pass, message } } })`.
- [ ] Mover la llamada fuera de `beforeEach` (una vez por fichero, o global en `test-setup.ts`).
- [ ] Convertir `message` string en `message: () => string` (función).
- [ ] Declarar el tipo en `vitest.d.ts` (ver § 4.6) para tener autocompletado.

---

## 9. Cheat sheet visual

### 9.1 Spies y mocks

```
JASMINE                                    VITEST
--------------------------------------------+-------------------------------------------
jasmine.createSpy('name')                   vi.fn()
jasmine.createSpyObj('N', ['a','b'])        { a: vi.fn(), b: vi.fn() }
spyOn(obj, 'method')                        vi.spyOn(obj, 'method')
spyOnProperty(obj, 'prop', 'get')           vi.spyOn(obj, 'prop', 'get')
                                            |
spy.and.returnValue(val)                    spy.mockReturnValue(val)
spy.and.returnValues(a, b, c)               spy.mockReturnValueOnce(a)
                                               .mockReturnValueOnce(b)
                                               .mockReturnValueOnce(c)
spy.and.callFake(fn)                        spy.mockImplementation(fn)
spy.and.callThrough()                       // por defecto en vi.spyOn
spy.and.stub()                              spy.mockImplementation(() => {})
spy.and.throwError(err)                     spy.mockImplementation(() => { throw err })
spy.and.resolveTo(val)                      spy.mockResolvedValue(val)
spy.and.rejectWith(err)                     spy.mockRejectedValue(err)
                                            |
spy.calls.count()                           spy.mock.calls.length
spy.calls.argsFor(n)                        spy.mock.calls[n]
spy.calls.allArgs()                         spy.mock.calls
spy.calls.mostRecent().args                 spy.mock.lastCall
spy.calls.first().args                      spy.mock.calls[0]
spy.calls.reset()                           spy.mockClear()
spy.calls.any()                             spy.mock.calls.length > 0
```

### 9.2 Matchers y asymmetric matchers

```
JASMINE                                    VITEST
--------------------------------------------+-------------------------------------------
jasmine.objectContaining({...})             expect.objectContaining({...})
jasmine.arrayContaining([...])              expect.arrayContaining([...])
jasmine.any(Type)                           expect.any(Type)
jasmine.anything()                          expect.anything()
jasmine.stringMatching(/re/)                expect.stringMatching(/re/)
                                            |
  (no tiene)                                expect.toStrictEqual(y)
  (no tiene)                                expect.toMatchSnapshot()
  (no tiene)                                expect.toMatchInlineSnapshot()
  (no tiene)                                expect.toHaveProperty('key')
  (no tiene)                                expect.toSatisfy(fn)
  (no tiene)                                expect.soft(x)
```

### 9.3 Timers y async

```
JASMINE                                    VITEST
--------------------------------------------+-------------------------------------------
jasmine.clock().install()                   vi.useFakeTimers()
jasmine.clock().tick(ms)                    vi.advanceTimersByTime(ms)
jasmine.clock().uninstall()                 vi.useRealTimers()
jasmine.clock().mockDate(date)              vi.setSystemTime(date)
                                            |
fakeAsync(() => { ... })                    vi.useFakeTimers() + test normal
tick(ms)                                    vi.advanceTimersByTime(ms)
flush()                                     vi.runAllTimers()
flushMicrotasks()                           await vi.advanceTimersByTimeAsync(0)
                                            |
waitForAsync(() => { ... })                 async/await nativo
done callback                               async/await
  (no tiene)                                vi.runOnlyPendingTimers()
  (no tiene)                                vi.advanceTimersToNextTimer()
  (no tiene)                                vi.getTimerCount()
```

### 9.4 Estructura de tests

```
JASMINE                                    VITEST
--------------------------------------------+-------------------------------------------
fdescribe('...')                             describe.only('...')
fit('...')                                  it.only('...')
xdescribe('...')                            describe.skip('...')
xit('...')                                  it.skip('...')
pending('reason')                           it.skip('reason')
fail('msg')                                 expect.unreachable('msg')
                                            |
  (no tiene)                                it.each([...])('...', fn)
  (no tiene)                                describe.each([...])('...', fn)
  (no tiene)                                it.todo('...')
  (no tiene)                                describe.concurrent('...')
```

### 9.5 Module mocking

```
JASMINE                                    VITEST
--------------------------------------------+-------------------------------------------
  (no tiene)                                vi.mock('./module')
  (no tiene)                                vi.mock('./module', () => ({ ... }))
  (no tiene)                                vi.mock(import('./mod'), { spy: true })
  (no tiene)                                vi.mocked(fn)
  (no tiene)                                vi.importActual('./module')
  (no tiene)                                vi.importMock('./module')
  (no tiene)                                vi.hoisted(() => ({ ... }))
  (no tiene)                                vi.resetModules()
```

### 9.6 Regla de oro para la migración

```
1. jasmine.createSpy    ->  vi.fn()
2. spyOn                ->  vi.spyOn
3. .and.returnValue     ->  .mockReturnValue
4. .and.callFake        ->  .mockImplementation
5. .calls.count()       ->  .mock.calls.length
6. .calls.reset()       ->  .mockClear()
7. jasmine.*Containing  ->  expect.*Containing
8. jasmine.any(T)       ->  expect.any(T)
9. jasmine.clock()      ->  vi.useFakeTimers()
10. fakeAsync/tick      ->  vi.useFakeTimers + vi.advanceTimersByTime
11. waitForAsync        ->  async/await
12. done callback       ->  async/await
```

Recuerda que el 80 % de la sintaxis (`describe`, `it`, `expect`, `beforeEach`, `afterEach`) es idéntica. La migración afecta sobre todo a spies, mocks, timers y patrones asíncronos.

---

## 10. APIs específicas de Vitest 4 sin equivalente en Jasmine

Estas APIs no tienen origen en Jasmine, así que no son equivalencias sino utilidades nuevas. Apróvechalas cuando toque reescribir un test.

### 10.1 `vi.mocked(fn)` — tipado de mocks

Al mockear un módulo con `vi.mock()`, TypeScript no se entera de que las funciones importadas son spies. `vi.mocked()` les aplica el tipo `MockedFunction<T>` y no toca nada en runtime.

```typescript
import { apiClient } from './api-client';

vi.mock('./api-client');

it('usa el cliente mockeado', () => {
  // Sin vi.mocked: (apiClient.get as any).mockReturnValue(...)
  vi.mocked(apiClient.get).mockReturnValue(of({ id: 1 }));
  //                      ^^^^^^^^^^^^^^^ autocompletado + type-check
  expect(vi.mocked(apiClient.get)).toHaveBeenCalledOnce();
});
```

Variante profunda: `vi.mocked(obj, { deep: true })` recorre todas las propiedades anidadas.

### 10.2 `vi.hoisted()` — variables accesibles desde factories hoisted

`vi.mock()` se hoistea al inicio del archivo en tiempo de compilación. Por eso las variables a nivel de módulo aún no existen cuando corre la factory y no puedes capturarlas. `vi.hoisted()` es la vía oficial para esquivar esa limitación:

```typescript
const { mockUser, mockGetUser } = vi.hoisted(() => ({
  mockUser: { id: 1, name: 'Ana' },
  mockGetUser: vi.fn(),
}));

vi.mock('./api-client', () => ({
  apiClient: { get: mockGetUser },
}));

beforeEach(() => {
  mockGetUser.mockReturnValue(of(mockUser));
});
```

### 10.3 `vi.importActual()` — acceso al módulo real en paralelo al mock

Con esto importas la implementación original dentro de una factory y reutilizas partes sin mockearlas. En Vitest 4 siempre es `async`.

```typescript
vi.mock('./math', async () => {
  const actual = await vi.importActual<typeof import('./math')>('./math');
  return {
    ...actual,
    expensiveCalc: vi.fn(() => 42),  // solo mockeamos esta
  };
});
```

### 10.4 `vi.advanceTimersByTimeAsync()` — drena microtasks

`vi.advanceTimersByTime(ms)` es síncrono. Ejecuta los callbacks de `setTimeout`, pero no procesa las microtasks (`.then`, `await`) creadas dentro. Si el código bajo test tiene un `fetch().then()` dentro de un `setTimeout`, usa la versión `Async`:

```typescript
// Código bajo test
setTimeout(() => {
  fetch('/api').then(r => r.json()).then(data => callback(data));
}, 100);

// En el test
await vi.advanceTimersByTimeAsync(100);  // avanza timer Y drena el await posterior
expect(callback).toHaveBeenCalled();
```

Disponibles también: `vi.runAllTimersAsync()`, `vi.runOnlyPendingTimersAsync()`, `vi.advanceTimersToNextTimerAsync()`.

### 10.5 Cambios de Vitest 4 que afectan a la equivalencia con Jasmine

Vitest 4 es estable desde octubre de 2025, según el changelog público del proyecto. Si migras siguiendo tutoriales anteriores, revisa estos puntos:

> Vitest 4.0 salió el 22 de octubre de 2025; Vitest 4 requiere Vite ≥6 y Node ≥20.
>
> > **Fuente:** Vitest — Migration Guide. https://vitest.dev/guide/migration.html
> >
> > **Fuente:** Vitest — Blog / releases. https://vitest.dev/blog/

| Cambio en v4 | Impacto al migrar desde Jasmine |
|---|---|
| `workspace` → `projects` en la config | Si has generado config con un template pre-v4, renombra la clave |
| `poolOptions` con campos aplanados (`isolate`, `singleThread` a nivel superior) | Revisa tu `vitest.config.ts` tras el upgrade |
| `vi.fn().getMockName()` devuelve `'vi.fn()'` por defecto (antes `'spy'`) | Tests que hacían `expect(spy.getMockName()).toBe('spy')` fallan |
| `vi.restoreAllMocks()` solo restaura spies creados manualmente con `vi.spyOn`, **no** los auto-mocks de `vi.mock()` | Si dependías del comportamiento anterior, usa `vi.resetModules()` o `vi.unmock()` explícitamente |
| Coverage V8 con análisis AST (más fiel en branches) | Coverage puede variar ±1-2 % al migrar |
| Browser mode estable (`@vitest/browser-playwright`) | Alternativa viable a `jsdom`/`happy-dom` para tests que necesitaban un navegador real (lo que justificaba Karma en su momento) |

Fuente: [Vitest 4 migration guide](https://vitest.dev/guide/migration.html).

### 10.6 APIs útiles que ni Jasmine ni versiones antiguas de Vitest tenían

```typescript
// Ejecutar un test solo cuando una condición se cumple (vs it.skip incondicional)
it.runIf(process.env.CI)('solo en CI', () => { /* ... */ });
it.skipIf(process.platform === 'win32')('salta en Windows', () => { /* ... */ });

// Retry automático en tests flaky (útil transitoriamente durante migración)
it('a veces falla', { retry: 3 }, () => { /* ... */ });

// Timeout a nivel de test o de describe (mejor que el parámetro posicional)
it('lento', { timeout: 10_000 }, async () => { /* ... */ });

// Fixtures con dependencias entre ellas (test context)
const myTest = test.extend<{ db: Database; user: User }>({
  db: async ({}, use) => {
    const db = await openDB();
    await use(db);
    await db.close();
  },
  user: async ({ db }, use) => {
    const user = await db.createUser();
    await use(user);
  },
});

myTest('usa fixtures', ({ user }) => {
  expect(user.id).toBeDefined();
});

// Anotaciones en el reporte (útil para debugging en CI)
it('mi test', ({ task }) => {
  task.meta.myAnnotation = 'dato extra';
});
```

Ninguna tiene equivalente en Jasmine. Te ahorran estructuras que antes montabas a mano: retry con loops manuales, fixtures con globales o `fdescribe` condicionales metidos en un `if`.

---

## 11. Referencias

- [Vitest API — `vi.*`](https://vitest.dev/api/vi.html)
- [Vitest API — `expect`](https://vitest.dev/api/expect.html)
- [Vitest migration guide (Jest → Vitest, también aplicable a patrones Jasmine)](https://vitest.dev/guide/migration.html)
- [Jasmine API (edge)](https://jasmine.github.io/api/edge/global)
- Para casos específicos de módulos, HTTP, stores y router: [`12-mocking-avanzado.md`](./12-mocking-avanzado.md).
- Para el tratamiento profundo de asincronía: [`13-dominio-asincronia.md`](./13-dominio-asincronia.md).

---

## Fuentes

Fuentes usadas en los callouts de esta sección.

- **Vitest — Migration Guide.** https://vitest.dev/guide/migration.html — cambios de v3 a v4 (workspace→projects, `restoreAllMocks`, etc.).
- **Vitest — Blog / releases.** https://vitest.dev/blog/ — Vitest 4.0 (22 oct 2025).
- **Vitest — Vi API Reference.** https://vitest.dev/api/vi.html — `vi.fn`, `vi.spyOn`, `vi.mock`, `vi.hoisted`, `vi.importActual`.
- **Vitest — Module Mocking.** https://vitest.dev/guide/mocking/modules — hoisting.
- **Vitest — Expect API.** https://vitest.dev/api/expect.html — matchers y `expect.any`, `expect.objectContaining`.
- **Jasmine — API (edge).** https://jasmine.github.io/api/edge/global — referencia de `spyOn`, `jasmine.clock`, `jasmine.any`, etc.
- **Angular — `fakeAsync` / `tick` / `waitForAsync`.** https://angular.dev/api/core/testing/fakeAsync — estas APIs vienen de `@angular/core/testing`, no de Jasmine.
