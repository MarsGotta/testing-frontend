# Mocking avanzado

> Taller 2 — Testing Frontend Avanzado | Sección 12
>
> **Modalidad:** how-to dominante (resolver problemas concretos de aislamiento) con tablas de referencia al final (§11 APIs, §9.1 reset, §12 enfoques HTTP).
> **Tiempo estimado:** 75 min.
> **Prerrequisitos:** [`07-mocking-basico.md`](./07-mocking-basico.md) (conceptos stub/spy/mock, `vi.fn`, `vi.spyOn`) y [`10-migracion-karma-vitest.md`](./10-migracion-karma-vitest.md) (proyecto migrado a Vitest).
> **Stack validado:** Vitest 4.x, Angular 17–21, Vue 3.x, React 19 + Testing Library React 16, `@ngrx/store` 17+, `@ngrx/signals` 17+, `@pinia/testing` 0.x, Redux Toolkit 2.x, Zustand 5.x, `@tanstack/react-query` 5.x, MSW 2.x (abril 2026).
>
> Este archivo asume que ya sabes crear un `vi.fn()` y verificar llamadas. Si no, lee primero el 07. Aquí vamos a casos reales de aislamiento: módulos pesados, peticiones HTTP, stores, router. Al final, los anti-patrones que dejan tu mutation score estancado en valores bajos, tomados de una suite grande en producción usada como referencia en el taller (equipo de 20+ squads).

---

## Por qué este archivo

Un test tarda 8 segundos porque arrastra `@angular/material` entero. Una petición HTTP se escapa en CI. Un store NgRx se cuela en un componente que debería estar aislado. El Router navega en mitad del test. El problema es siempre el mismo: no has aislado bien el SUT.

Este archivo es una colección de recetas `problema → solución`. No está pensado para leerse de corrido; se consulta. Usa el índice y salta a tu caso.

> ⚠ **Relación con mutation score.** Los mocks demasiado permisivos dejan mutantes vivos: `toHaveBeenCalled()` sin argumentos, `expect.any(Object)` en todo el payload, actions con stub que nunca verificas. Cada sección apunta al patrón que sube el score. El resumen completo está en §10.7.

---

## 1. Cuándo mockear y cuándo NO: diagrama de decisión

Antes de crear un mock, pasa por este flujo de decisión:

```
¿Que estoy probando?
│
├── ¿Es una funcion pura (sin side effects)?
│   └── NO mockear. Testa input/output directamente.
│       Ejemplo: formatDate(), capitalize(), calculateTotal()
│
├── ¿Es el modulo/funcion bajo test (SUT)?
│   └── NUNCA mockear. Si mockeas lo que estas probando, no estas probando nada.
│       Ejemplo: Si testas UserService, NUNCA hagas vi.mock('./userService')
│
├── ¿Es un servicio externo (API, base de datos, third-party)?
│   └── SI mockear. No quieres depender de red ni estado externo.
│       Ejemplo: fetch, axios, HttpClient, Firebase, Stripe SDK
│
├── ¿Es una dependencia pesada (lenta, costosa, compleja de instanciar)?
│   └── SI mockear para velocidad y aislamiento.
│       Ejemplo: Un servicio que abre conexiones, un modulo que lee archivos
│
├── ¿Es tiempo/fecha (Date, setTimeout, setInterval)?
│   └── SI mockear con fake timers (vi.useFakeTimers, vi.setSystemTime).
│       Los tests deben ser deterministas, no depender del reloj real.
│
├── ¿Es una utilidad simple sin side effects?
│   └── NO mockear. Usar la implementacion real.
│       Ejemplo: lodash.cloneDeep, un helper de formateo propio
│
├── ¿Es un Value Object o DTO?
│   └── NO mockear. Crear instancias reales.
│       Ejemplo: new User({ name: 'Ana' })
│
└── ¿Es un store o router (cuando testas un componente)?
    └── SI mockear. Aislar el componente del estado global.
        Ejemplo: provideMockStore, createTestingPinia, vi.mock('vue-router')
```

**Principio general:** mockea las fronteras de tu sistema (I/O, red, tiempo, estado global) y nunca la lógica de negocio que quieres verificar.

### Ejemplo práctico del principio

```typescript
// userService.ts
export class UserService {
  constructor(private api: ApiClient) {}

  async getFullName(userId: number): Promise<string> {
    const user = await this.api.get(`/users/${userId}`);
    return `${user.firstName} ${user.lastName}`;
  }
}

// userService.spec.ts
// BIEN: mockear ApiClient (frontera de red), probar la logica de UserService
it('deberia concatenar nombre y apellido', async () => {
  const mockApi = { get: vi.fn().mockResolvedValue({ firstName: 'Ana', lastName: 'Garcia' }) };
  const service = new UserService(mockApi as any);

  const name = await service.getFullName(1);

  expect(name).toBe('Ana Garcia');
  expect(mockApi.get).toHaveBeenCalledWith('/users/1');
});

// MAL: mockear UserService cuando lo que quieres es probarlo
vi.mock('./userService'); // Ahora getFullName es vi.fn() y no pruebas NADA
```

---

## 2. Fundamentos: vi.fn(), vi.spyOn(), vi.mock()

### 2.1 vi.fn() - Crear funciones mock

Crea una función espía que registra las llamadas que recibe: con qué argumentos y qué devuelve cada vez.

```typescript
// Mock sin implementacion (devuelve undefined)
const mock = vi.fn();

// Mock con implementacion
const getApples = vi.fn(() => 0);
getApples(); // 0

// Cambiar el valor de retorno
getApples.mockReturnValue(5);
getApples(); // 5

// Valor de retorno solo una vez
getApples.mockReturnValueOnce(99);
getApples(); // 99 (primera llamada)
getApples(); // 5  (vuelve al default)
```

#### Encadenamiento avanzado con mockReturnValueOnce

Encadena varios `mockReturnValueOnce` para simular una secuencia de respuestas:

```typescript
const fetchPage = vi.fn()
  .mockReturnValueOnce({ page: 1, items: ['a', 'b'] })     // primera llamada
  .mockReturnValueOnce({ page: 2, items: ['c', 'd'] })     // segunda llamada
  .mockReturnValueOnce({ page: 3, items: [] })              // tercera llamada
  .mockReturnValue({ page: 0, items: [] });                 // todas las demas

fetchPage(); // { page: 1, items: ['a', 'b'] }
fetchPage(); // { page: 2, items: ['c', 'd'] }
fetchPage(); // { page: 3, items: [] }
fetchPage(); // { page: 0, items: [] }
fetchPage(); // { page: 0, items: [] }  -- sigue devolviendo el default
```

#### Encadenamiento con Promises

```typescript
const apiCall = vi.fn()
  .mockResolvedValueOnce({ data: 'first' })     // primera: resuelve
  .mockRejectedValueOnce(new Error('timeout'))   // segunda: rechaza
  .mockResolvedValue({ data: 'default' });       // resto: resuelve

await apiCall(); // { data: 'first' }
await apiCall(); // throws Error('timeout')
await apiCall(); // { data: 'default' }
```

#### mockImplementation vs mockReturnValue

```typescript
// mockReturnValue: solo cambia lo que devuelve
const fn1 = vi.fn().mockReturnValue(42);
fn1('cualquier', 'argumento'); // 42

// mockImplementation: control total sobre la logica
const fn2 = vi.fn().mockImplementation((a: number, b: number) => {
  if (a < 0 || b < 0) throw new Error('Negative numbers');
  return a + b;
});
fn2(2, 3); // 5
fn2(-1, 3); // throws Error('Negative numbers')

// mockImplementationOnce: implementacion diferente por llamada
const fn3 = vi.fn()
  .mockImplementationOnce(() => 'first call')
  .mockImplementationOnce(() => { throw new Error('second fails'); })
  .mockImplementation(() => 'rest of calls');
```

### 2.2 vi.spyOn() - Espiar métodos existentes

Crea un spy sobre un método de un objeto. Por defecto, mantiene la implementación original y solo la observa.

```typescript
const cart = { getApples: () => 42 };

// Espiar sin cambiar comportamiento
const spy = vi.spyOn(cart, 'getApples');
cart.getApples(); // 42 (original funciona)
expect(spy).toHaveBeenCalled(); // true

// Sobrescribir implementacion
spy.mockImplementation(() => 1);
cart.getApples(); // 1

// Restaurar original
spy.mockRestore();
cart.getApples(); // 42
```

#### Espiar getters y setters

```typescript
const user = {
  _name: 'original',
  get name() { return this._name; },
  set name(val: string) { this._name = val; }
};

// Espiar un getter
const getSpy = vi.spyOn(user, 'name', 'get');
getSpy.mockReturnValue('mocked name');
console.log(user.name); // 'mocked name'
expect(getSpy).toHaveBeenCalledTimes(1);

// Espiar un setter
const setSpy = vi.spyOn(user, 'name', 'set');
user.name = 'new value';
expect(setSpy).toHaveBeenCalledWith('new value');
```

#### Espiar metodos de prototipos y clases

```typescript
// Espiar un metodo de clase
class Calculator {
  add(a: number, b: number) { return a + b; }
  multiply(a: number, b: number) { return a * b; }
}

const calc = new Calculator();

// Espiar en la instancia
const addSpy = vi.spyOn(calc, 'add');
calc.add(2, 3); // 5 (original)
expect(addSpy).toHaveBeenCalledWith(2, 3);

// Espiar en el prototipo (afecta a TODAS las instancias)
const multiplySpy = vi.spyOn(Calculator.prototype, 'multiply');
multiplySpy.mockReturnValue(999);

const calc2 = new Calculator();
calc2.multiply(2, 3); // 999
expect(multiplySpy).toHaveBeenCalledWith(2, 3);

multiplySpy.mockRestore(); // restaurar para no contaminar otros tests
```

#### Espiar console, Date y otros globals

```typescript
// Espiar console.warn para verificar que un deprecation warning se emite
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
deprecatedFunction();
expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'));
warnSpy.mockRestore();

// Espiar console.error para verificar que errores se logean
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
await handleApiError(new Error('fail'));
expect(errorSpy).toHaveBeenCalledTimes(1);
errorSpy.mockRestore();

// Espiar Date.now
vi.spyOn(Date, 'now').mockReturnValue(1609459200000); // 2021-01-01
expect(Date.now()).toBe(1609459200000);
```

### 2.3 vi.mock() - Mocking de módulos

> **Nota:** `vi.mock`, `vi.doMock`, `vi.hoisted` y `vi.importActual` se comportan igual en Angular, Vue y React. Es API de Vitest, no del framework. Los ejemplos de esta sección sirven tal cual en los tres stacks.

Sustituye todas las importaciones de un módulo. Se hoistea: Vitest lo mueve al inicio del archivo antes de ejecutar nada más.

```typescript
// Auto-mock: todas las exportaciones se convierten en vi.fn()
vi.mock('./calculator');

// Factory mock: implementacion custom
vi.mock('./api', () => ({
  fetchData: vi.fn().mockResolvedValue({ items: [] }),
}));

// Spy mode: mantiene originales pero las trackea
vi.mock(import('./calculator'), { spy: true });
```

#### Hoisting - comportamiento critico

```typescript
// ESTO FALLA - myValue no existe cuando vi.mock se ejecuta
const myValue = 'hello';
vi.mock('./module', () => ({
  getValue: vi.fn().mockReturnValue(myValue) // ReferenceError!
}));

// SOLUCION 1: vi.hoisted()
const { mockGetValue } = vi.hoisted(() => ({
  mockGetValue: vi.fn().mockReturnValue('hello')
}));
vi.mock('./module', () => ({ getValue: mockGetValue }));

// SOLUCION 2: vi.doMock() (no se hoistea, para imports dinamicos)
beforeEach(() => {
  vi.doMock('./module', () => ({
    getValue: vi.fn().mockReturnValue('dynamic')
  }));
});
```

> El equipo de Vitest documenta este hoisting y recomienda `vi.hoisted()` como vía oficial para capturar variables del scope.
>
> > **Fuente:** Vitest — Module Mocking. https://vitest.dev/guide/mocking/modules
> >
> > **Fuente:** Vitest — Vi API Reference (`vi.hoisted`, `vi.doMock`). https://vitest.dev/api/vi.html

#### Tipar los imports mockeados con `vi.mocked()`

Cuando mockeas un módulo con `vi.mock('./api')`, TypeScript sigue viendo la firma original. Si quieres acceder a `.mockResolvedValue`, `.mock.calls` y similares con autocompletado, envuelve el import con `vi.mocked()`:

```typescript
import { fetchUser } from './api';
vi.mock('./api');

const mockedFetchUser = vi.mocked(fetchUser);
mockedFetchUser.mockResolvedValue({ id: 1, name: 'Ana' });

// Deep typing para objetos con metodos anidados
import * as api from './api';
vi.mock('./api');
const mockedApi = vi.mocked(api, { deep: true });
mockedApi.client.get.mockResolvedValue(...); // tipado
```

Más patrones de tipado en §5.3.

#### Mocking parcial con importOriginal

Así mockeas algunas exportaciones y dejas el resto con la implementación real:

```typescript
vi.mock(import('./utils'), async (importOriginal) => {
  const original = await importOriginal();
  return {
    ...original,                    // todo real
    expensiveOperation: vi.fn(),    // solo esta mockeada
    sendAnalytics: vi.fn(),         // y esta tambien
  };
});

// Ahora en el test:
import { formatDate, expensiveOperation, sendAnalytics } from './utils';

it('usa formatDate real y expensiveOperation mockeada', () => {
  // formatDate ejecuta la logica real
  expect(formatDate(new Date(2026, 0, 1))).toBe('01/01/2026');

  // expensiveOperation es un vi.fn()
  expensiveOperation();
  expect(expensiveOperation).toHaveBeenCalled();
});
```

**Limitación importante:** si `formatDate` llama internamente a `expensiveOperation`, esa llamada usa la implementación original, no el mock. Para interceptar llamadas internas tienes que refactorizar hacia inyección de dependencias.

#### vi.doMock() para imports dinamicos

```typescript
it('usa modulo con mock dinamico', async () => {
  vi.doMock('./config', () => ({
    API_URL: 'http://test-server.com',
    TIMEOUT: 5000,
  }));

  // IMPORTANTE: usar import() dinamico DESPUES de doMock
  const { createClient } = await import('./client');
  const client = createClient();

  expect(client.baseUrl).toBe('http://test-server.com');

  vi.doUnmock('./config'); // limpiar
});
```

### 2.4 vi.stubGlobal() - Stubs globales

```typescript
vi.stubGlobal('innerWidth', 100);
expect(globalThis.innerWidth).toBe(100);

// Mockear localStorage
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: vi.fn((key: string) => mockStorage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
  removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  clear: vi.fn(() => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }),
  length: 0,
  key: vi.fn(),
});

// Mockear matchMedia
vi.stubGlobal('matchMedia', vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})));

// Limpiar todos los stubs
vi.unstubAllGlobals();
```

---

## 3. Mocking de Servicios HTTP

### 3.1 Angular: HttpTestingController

```typescript
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

describe('UserService', () => {
  let service: UserService;
  let httpCtrl: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UserService,
        provideHttpClient(),          // DEBE ir primero
        provideHttpClientTesting(),    // override del HttpClient
      ]
    });
    service = TestBed.inject(UserService);
    httpCtrl = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpCtrl.verify(); // asegurar que no hay requests sin flush
  });

  it('deberia obtener usuarios', () => {
    const mockUsers = [{ id: 1, name: 'Ana' }];

    service.getUsers().subscribe(users => {
      expect(users).toEqual(mockUsers);
    });

    const req = httpCtrl.expectOne('/api/users');
    expect(req.request.method).toBe('GET');
    req.flush(mockUsers); // responder al request
  });

  it('deberia enviar headers de autorizacion', () => {
    service.getProtectedData().subscribe();

    const req = httpCtrl.expectOne('/api/protected');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({ data: 'secret' });
  });

  it('deberia manejar error 404', () => {
    service.getUser(999).subscribe({
      next: () => fail('deberia haber fallado'),
      error: (err) => {
        expect(err.status).toBe(404);
        expect(err.statusText).toBe('Not Found');
      }
    });

    const req = httpCtrl.expectOne('/api/users/999');
    req.flush('Not found', { status: 404, statusText: 'Not Found' });
  });

  it('deberia manejar errores de red', () => {
    service.getUsers().subscribe({
      next: () => fail('deberia haber fallado'),
      error: (err) => {
        expect(err.error).toBeInstanceOf(ProgressEvent);
      }
    });

    const req = httpCtrl.expectOne('/api/users');
    req.error(new ProgressEvent('Network error'));
  });

  it('deberia verificar multiples requests', () => {
    service.getAllData().subscribe();

    const requests = httpCtrl.match(req => req.url.startsWith('/api/'));
    expect(requests.length).toBe(3);
    requests.forEach(req => req.flush([]));
  });
});
```

### 3.2 Alternativa: Mock a nivel de servicio

```typescript
const mockHttp = {
  get: vi.fn().mockReturnValue(of([{ id: 1 }])),
  post: vi.fn().mockReturnValue(of({ success: true })),
  put: vi.fn().mockReturnValue(of({ success: true })),
  delete: vi.fn().mockReturnValue(of(undefined)),
};

TestBed.configureTestingModule({
  providers: [
    MyService,
    { provide: HttpClient, useValue: mockHttp }
  ]
});
```

### 3.3 Vue: Mock de fetch/axios

**Mocking de fetch:**
```typescript
vi.stubGlobal('fetch', vi.fn());

const mockFetch = vi.mocked(fetch);
mockFetch.mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ data: 'test' }),
  text: () => Promise.resolve('text response'),
  headers: new Headers({ 'content-type': 'application/json' }),
} as Response);
```

**Mocking de axios con directorio `__mocks__`:**

```typescript
// __mocks__/axios.ts
import { vi } from 'vitest';

export default {
  get: vi.fn().mockResolvedValue({ data: {} }),
  post: vi.fn().mockResolvedValue({ data: {} }),
  put: vi.fn().mockResolvedValue({ data: {} }),
  delete: vi.fn().mockResolvedValue({ data: {} }),
  create: vi.fn(function() { return this; }),
  interceptors: {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  },
};
```

En el test:
```typescript
import axios from 'axios';
vi.mock('axios'); // usa automaticamente __mocks__/axios.ts

test('obtiene datos', async () => {
  vi.mocked(axios.get).mockResolvedValue({ data: { name: 'test' } });
  const result = await myService.fetchData();
  expect(result.name).toBe('test');
});
```

---

## 4. MSW (Mock Service Worker) en Detalle

> **Nota:** MSW funciona igual en Angular, Vue y React. Los handlers, el `setupServer` y los overrides con `server.use()` son idénticos; solo cambia el componente que renderizas. Los ejemplos usan Testing Library de cada framework, pero la lógica MSW se copia tal cual.

Artem Zakharchenko, autor de MSW, defiende en la documentación oficial el principio de "interceptar a nivel de red, no de cliente HTTP": esa es la razón por la que el mismo handler vale para browser y para Node. MSW intercepta las peticiones a nivel de red sin que tengas que tocar el código de la aplicación. Es el enfoque que mejor escala para HTTP, por varias razones:
- No necesitas mockear `fetch` ni `axios` directamente.
- Tus interceptors y middlewares se ejecutan tal cual.
- Los mismos handlers te sirven en desarrollo (browser) y en tests (node).
- Las peticiones aparecen en los logs de red como si fueran reales.

> MSW 2.x es la rama estable; la guía oficial cubre el setup en Node (Vitest, Jest) y en el navegador.
>
> > **Fuente:** MSW — Quick Start. https://mswjs.io/docs/quick-start
> >
> > **Fuente:** MSW — Node.js integration. https://mswjs.io/docs/integrations/node

### 4.1 Instalacion y Setup Completo

**Paso 1: Instalar MSW**

```bash
npm install msw --save-dev
```

**Paso 2: Crear los handlers**

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

// Datos de ejemplo para tests
const mockUsers = [
  { id: 1, name: 'Ana Garcia', email: 'ana@example.com' },
  { id: 2, name: 'Luis Martinez', email: 'luis@example.com' },
];

export const handlers = [
  // GET con respuesta JSON
  http.get('https://api.example.com/users', () => {
    return HttpResponse.json(mockUsers);
  }),

  // GET con parametros de ruta
  http.get('https://api.example.com/users/:id', ({ params }) => {
    const user = mockUsers.find(u => u.id === Number(params.id));
    if (!user) {
      return HttpResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    return HttpResponse.json(user);
  }),

  // GET con query params
  http.get('https://api.example.com/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const results = mockUsers.filter(u =>
      u.name.toLowerCase().includes(query?.toLowerCase() ?? '')
    );
    return HttpResponse.json({ results, total: results.length });
  }),

  // POST con body
  http.post('https://api.example.com/users', async ({ request }) => {
    const body = await request.json() as { name: string; email: string };
    const newUser = { id: mockUsers.length + 1, ...body };
    return HttpResponse.json(newUser, { status: 201 });
  }),

  // PUT
  http.put('https://api.example.com/users/:id', async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: Number(params.id), ...body });
  }),

  // DELETE
  http.delete('https://api.example.com/users/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

**Paso 3: Configurar el servidor para Node (tests)**

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

**Paso 4: Configurar en vitest.setup.ts**

```typescript
// vitest.setup.ts
import { server } from './src/mocks/server';

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error', // falla si un request no tiene handler
    // Alternativas:
    // onUnhandledRequest: 'warn'   -- logea warning pero no falla
    // onUnhandledRequest: 'bypass' -- deja pasar (no recomendado)
  });
});

afterEach(() => {
  server.resetHandlers(); // restaurar handlers originales entre tests
});

afterAll(() => {
  server.close(); // cerrar el servidor al final
});
```

**Paso 5: Agregar el setup en vitest.config.ts**

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    // ...
  }
});
```

### 4.2 Overrides por test con server.use()

Con `server.use()` sobrescribes los handlers para un test concreto. El `afterEach` con `server.resetHandlers()` limpia los overrides al terminar, así que el siguiente test vuelve al comportamiento por defecto.

```typescript
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';

// Ejemplo en Angular con @testing-library/angular
describe('UserListComponent', () => {
  // Este test usa los handlers por defecto
  it('muestra la lista de usuarios', async () => {
    await render(UserListComponent); // proviene de @testing-library/angular
    expect(await screen.findByText('Ana Garcia')).toBeInTheDocument();
    expect(await screen.findByText('Luis Martinez')).toBeInTheDocument();
  });

  // Este test sobrescribe el handler solo para este test
  it('muestra mensaje cuando no hay usuarios', async () => {
    server.use(
      http.get('https://api.example.com/users', () => {
        return HttpResponse.json([]); // lista vacia solo para este test
      })
    );

    await render(UserListComponent);
    expect(await screen.findByText('No hay usuarios')).toBeInTheDocument();
  });

  // El siguiente test vuelve a usar los handlers originales
  // gracias a server.resetHandlers() en afterEach
});

// Equivalente en Vue 3 con @vue/test-utils
import { mount } from '@vue/test-utils';

it('muestra la lista de usuarios (Vue)', async () => {
  const wrapper = mount(UserList);
  await vi.waitFor(() => {
    expect(wrapper.text()).toContain('Ana Garcia');
    expect(wrapper.text()).toContain('Luis Martinez');
  });
});
```

### 4.3 Testing de escenarios de error

```typescript
describe('manejo de errores', () => {
  it('muestra error en respuesta 500', async () => {
    server.use(
      http.get('https://api.example.com/users', () => {
        return HttpResponse.json(
          { error: 'Internal Server Error' },
          { status: 500 }
        );
      })
    );

    await render(UserListComponent);
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument();
  });

  it('muestra error en respuesta 404', async () => {
    server.use(
      http.get('https://api.example.com/users/:id', () => {
        return HttpResponse.json(
          { error: 'Not Found' },
          { status: 404 }
        );
      })
    );

    await render(UserDetailComponent, { componentInputs: { userId: 999 } });
    expect(await screen.findByText('Usuario no encontrado')).toBeInTheDocument();
  });

  it('muestra error de red (sin conexion)', async () => {
    server.use(
      http.get('https://api.example.com/users', () => {
        return HttpResponse.error(); // simula error de red
      })
    );

    await render(UserListComponent);
    expect(await screen.findByText('Error de conexion')).toBeInTheDocument();
  });

  it('muestra error en timeout', async () => {
    server.use(
      http.get('https://api.example.com/users', async () => {
        // Simular timeout con delay infinito (combinado con AbortController)
        await new Promise(() => {}); // nunca resuelve
        return HttpResponse.json([]); // nunca llega aqui
      })
    );

    await render(UserListComponent);
    // Si tu componente tiene timeout propio
    expect(await screen.findByText('Tiempo de espera agotado')).toBeInTheDocument();
  });

  it('simula respuesta lenta', async () => {
    server.use(
      http.get('https://api.example.com/users', async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return HttpResponse.json([{ id: 1, name: 'Ana' }]);
      })
    );

    await render(UserListComponent);

    // Primero se muestra loading
    expect(screen.getByTestId('spinner')).toBeInTheDocument();

    // Despues de esperar, se muestran los datos
    expect(await screen.findByText('Ana', {}, { timeout: 5000 })).toBeInTheDocument();
  });
});
```

### 4.4 Cuando preferir MSW sobre vi.mock(fetch)

| Criterio | MSW | vi.mock(fetch) / vi.mock(axios) |
|----------|-----|----------------------------------|
| Intercepta a nivel de red | Si -- toda la cadena HTTP se ejecuta | No -- reemplaza la funcion directamente |
| Interceptors/middlewares se ejecutan | Si | No (se saltan) |
| Reutilizable entre tests, dev y staging | Si | Solo en tests |
| Requiere setup adicional | Si (handlers, server) | No, inline |
| Testing de componentes con fetch real | Ideal | Funciona pero menos realista |
| Testing unitario rapido de un servicio | Overhead innecesario | Ideal |
| Testing E2E-like en unit tests | Ideal | Limitado |

**Regla práctica:**
- Tests unitarios de servicios simples: `vi.mock()` es más rápido y directo.
- Tests de integración o componentes que hacen HTTP: MSW da tests más realistas.
- Proyecto grande con muchos endpoints: MSW escala mejor con handlers compartidos.

---

## 5. Mock Factories y Helpers Reutilizables

### 5.1 Crear factory functions para mocks comunes

Si copias el mismo mock en cada test, centralízalo en una factory:

```typescript
// test/factories/mockUserService.ts
import { vi } from 'vitest';
import type { UserService } from '@/services/userService';

export function createMockUserService(overrides: Partial<Record<keyof UserService, any>> = {}): UserService {
  return {
    getUser: vi.fn().mockResolvedValue({ id: 1, name: 'Test User', email: 'test@test.com' }),
    getUsers: vi.fn().mockResolvedValue([
      { id: 1, name: 'User 1' },
      { id: 2, name: 'User 2' },
    ]),
    createUser: vi.fn().mockResolvedValue({ id: 3, name: 'New User' }),
    updateUser: vi.fn().mockResolvedValue({ success: true }),
    deleteUser: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as UserService;
}

// Uso en tests:
const userService = createMockUserService(); // todos los defaults

const userService2 = createMockUserService({
  getUser: vi.fn().mockRejectedValue(new Error('Not found')),
}); // solo getUser cambia, el resto queda igual

const userService3 = createMockUserService({
  getUsers: vi.fn().mockResolvedValue([]), // lista vacia
  createUser: vi.fn().mockRejectedValue(new Error('Forbidden')),
});
```

#### Factory para datos de test (fixtures)

```typescript
// test/factories/userFactory.ts
interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  active: boolean;
  createdAt: Date;
}

let nextId = 1;

export function createUser(overrides: Partial<User> = {}): User {
  return {
    id: nextId++,
    name: `User ${nextId}`,
    email: `user${nextId}@test.com`,
    role: 'user',
    active: true,
    createdAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function createUsers(count: number, overrides: Partial<User> = {}): User[] {
  return Array.from({ length: count }, () => createUser(overrides));
}

export function createAdmin(overrides: Partial<User> = {}): User {
  return createUser({ role: 'admin', ...overrides });
}

// Uso:
const user = createUser(); // usuario default
const admin = createAdmin({ name: 'Super Admin' });
const inactiveUsers = createUsers(5, { active: false });
```

#### Factory para Angular providers

```typescript
// test/factories/mockProviders.ts
import { vi } from 'vitest';
import { AuthService } from '@/services/auth.service';
import { Router } from '@angular/router';

export function createMockAuthProvider(overrides = {}) {
  return {
    provide: AuthService,
    useValue: {
      isLoggedIn: vi.fn().mockReturnValue(true),
      getToken: vi.fn().mockReturnValue('mock-token'),
      login: vi.fn().mockResolvedValue(true),
      logout: vi.fn(),
      currentUser$: of({ id: 1, name: 'Test' }),
      ...overrides,
    }
  };
}

export function createMockRouterProvider(overrides = {}) {
  return {
    provide: Router,
    useValue: {
      navigate: vi.fn().mockResolvedValue(true),
      navigateByUrl: vi.fn().mockResolvedValue(true),
      parseUrl: vi.fn(url => ({ path: url })),
      events: of(),
      url: '/',
      ...overrides,
    }
  };
}

// Uso en TestBed:
TestBed.configureTestingModule({
  providers: [
    MyComponent,
    createMockAuthProvider(),
    createMockRouterProvider({ url: '/dashboard' }),
  ]
});
```

### 5.2 Directorio `__mocks__` - Pattern

#### Para paquetes npm (modulos de terceros)

```
proyecto/
  __mocks__/
    axios.ts          # Se usa cuando vi.mock('axios') se llama
    firebase.ts       # Se usa cuando vi.mock('firebase') se llama
  src/
    ...
```

#### Para modulos locales

```
src/
  services/
    __mocks__/
      api.ts          # Se usa cuando vi.mock('./services/api') se llama
      analytics.ts    # Se usa cuando vi.mock('./services/analytics') se llama
    api.ts
    analytics.ts
```

**Regla importante:** el archivo de `__mocks__` no se activa por su sola presencia. Tienes que llamar a `vi.mock('nombre-modulo')` en el test; lo que te ahorras es escribir el factory, porque Vitest encuentra y usa el archivo de `__mocks__`.

```typescript
// __mocks__/analytics.ts
import { vi } from 'vitest';

export const trackEvent = vi.fn();
export const trackPageView = vi.fn();
export const setUser = vi.fn();
export const init = vi.fn();

// En el test: solo necesitas esto
vi.mock('@/services/analytics'); // automaticamente usa __mocks__/analytics.ts
```

### 5.3 Mocks tipados con TypeScript

```typescript
import { vi, type Mock, type Mocked } from 'vitest';

// vi.mocked() para tipar funciones mockeadas
const mockedFn = vi.mocked(someFunction);
// Ahora TypeScript sabe que mockedFn tiene .mockReturnValue, .mock.calls, etc.

// Deep typing para objetos con metodos anidados
const mockedObj = vi.mocked(someObject, { deep: true });

// Tipo helper para crear mock services en Angular
type MockedService<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? Mock<(...args: A) => R>
    : T[K];
};

// Ejemplo de uso:
interface AuthService {
  login(email: string, password: string): Promise<boolean>;
  logout(): void;
  isAuthenticated(): boolean;
  getToken(): string | null;
}

const mockAuth: MockedService<AuthService> = {
  login: vi.fn<(email: string, password: string) => Promise<boolean>>()
    .mockResolvedValue(true),
  logout: vi.fn(),
  isAuthenticated: vi.fn().mockReturnValue(true),
  getToken: vi.fn().mockReturnValue('mock-token-abc'),
};

// TypeScript ahora sabe los tipos:
mockAuth.login.mockResolvedValue(false); // OK
// mockAuth.login.mockReturnValue('string'); // Error de tipo
```

#### Tipo helper generico para Vitest + Angular

```typescript
// test/types.ts
import { Mock } from 'vitest';

/**
 * Convierte todos los metodos de un tipo T en Mock<T>
 * y mantiene las propiedades no-funcion como opcionales
 */
export type DeepMocked<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? Mock<T[K]>
    : T[K] extends object
    ? DeepMocked<T[K]>
    : T[K];
} & T;

/**
 * Crea un mock tipado con todos los metodos como vi.fn()
 */
export function createMock<T>(overrides: Partial<{ [K in keyof T]: any }> = {}): DeepMocked<T> {
  return new Proxy({} as any, {
    get: (target, prop) => {
      if (prop in overrides) return (overrides as any)[prop];
      if (!(prop in target)) target[prop] = vi.fn();
      return target[prop];
    }
  });
}

// Uso:
const mockService = createMock<UserService>({
  getUser: vi.fn().mockResolvedValue({ id: 1, name: 'Ana' }),
});
// mockService.deleteUser() -- automaticamente es vi.fn()
// mockService.getUser() -- usa el override
```

---

## 6. Debugging de Mocks

### 6.1 Inspeccionar `mock.calls` y `mock.results`

Cada `vi.fn()` expone una propiedad `.mock` con toda la información de las llamadas que ha recibido:

```typescript
const fn = vi.fn((x: number) => x * 2);
fn(3);
fn(5);
fn(7);

// mock.calls: array de arrays con los argumentos de cada llamada
console.log(fn.mock.calls);
// [ [3], [5], [7] ]

// mock.results: array de objetos con tipo y valor de cada retorno
console.log(fn.mock.results);
// [
//   { type: 'return', value: 6 },
//   { type: 'return', value: 10 },
//   { type: 'return', value: 14 },
// ]

// mock.lastCall: argumentos de la ultima llamada
console.log(fn.mock.lastCall);
// [7]

// mock.instances: array de `this` de cada llamada (util con `new`)
// mock.invocationCallOrder: orden global de invocacion
```

#### Ejemplo practico de debugging

```typescript
it('deberia llamar al API con los parametros correctos', async () => {
  const apiCall = vi.fn().mockResolvedValue({ ok: true });
  const service = new OrderService(apiCall);

  await service.createOrder({ product: 'Laptop', qty: 2 });
  await service.createOrder({ product: 'Mouse', qty: 5 });

  // Debugging: ver todas las llamadas
  console.log('Llamadas al API:', JSON.stringify(apiCall.mock.calls, null, 2));
  // [
  //   ['/orders', { product: 'Laptop', qty: 2 }],
  //   ['/orders', { product: 'Mouse', qty: 5 }]
  // ]

  // Verificar la primera llamada
  expect(apiCall.mock.calls[0]).toEqual(['/orders', { product: 'Laptop', qty: 2 }]);

  // O con matchers mas expresivos:
  expect(apiCall).toHaveBeenNthCalledWith(1, '/orders', expect.objectContaining({ product: 'Laptop' }));
  expect(apiCall).toHaveBeenNthCalledWith(2, '/orders', expect.objectContaining({ product: 'Mouse' }));
  expect(apiCall).toHaveBeenCalledTimes(2);
});
```

#### Inspeccionar resultados de mocks (incluyendo errores)

```typescript
const fn = vi.fn()
  .mockReturnValueOnce('ok')
  .mockImplementationOnce(() => { throw new Error('boom'); })
  .mockReturnValueOnce('recovered');

fn(); // 'ok'
try { fn(); } catch(e) {} // throws
fn(); // 'recovered'

console.log(fn.mock.results);
// [
//   { type: 'return', value: 'ok' },
//   { type: 'throw', value: Error('boom') },
//   { type: 'return', value: 'recovered' },
// ]
```

### 6.2 Error común: el mock no se llama (ruta de import mal resuelta)

El caso clásico: el test pasa por debajo de la mesa porque el mock nunca se aplicó. Suele ser un problema de ruta.

```typescript
// archivo: src/services/userService.ts
import { api } from '../utils/api';  // importa con ruta relativa

// archivo: src/services/__tests__/userService.spec.ts
vi.mock('../../utils/api'); // FUNCIONA: misma ruta que el modulo usa

vi.mock('@/utils/api');     // PUEDE FALLAR si el alias no coincide exactamente
                            // con como se importa en el modulo

vi.mock('src/utils/api');   // FALLA: ruta incorrecta
```

**Como diagnosticarlo:**

```typescript
import { api } from '../../utils/api';
vi.mock('../../utils/api');

it('debug: verificar que el mock esta activo', () => {
  console.log('api.get es mock?', vi.isMockFunction(api.get)); // debe ser true
  console.log('api.get:', api.get.toString()); // si es mock, muestra "spy"

  // Si es false, el mock no se aplico correctamente
  // Posibles causas:
  // 1. La ruta en vi.mock() no coincide con la ruta de importacion
  // 2. El modulo usa export default y tu mock exporta named exports
  // 3. Hay un alias en tsconfig que no se resuelve igual
});
```

**Otras causas comunes:**

```typescript
// CAUSA 1: export default vs named exports
// Si el modulo hace: export default { get, post }
// Tu mock debe hacer:
vi.mock('./api', () => ({
  default: { get: vi.fn(), post: vi.fn() } // necesita 'default'
}));

// CAUSA 2: el modulo re-exporta desde otro
// src/utils/index.ts re-exporta api.ts
// Debes mockear la fuente, no el barrel:
vi.mock('./utils/api');  // mockea el archivo fuente
// NO: vi.mock('./utils'); // el barrel puede no re-exportar correctamente
```

### 6.3 Mock leaking entre tests (contaminación)

**Síntoma:** un test pasa aislado pero falla cuando lo corres con los demás, o depende de que otro se ejecute antes para funcionar.

```typescript
// MAL: mock global sin limpieza
let mockFetch: Mock;

describe('API tests', () => {
  beforeAll(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });
    vi.stubGlobal('fetch', mockFetch);
    // Este mock persiste para TODOS los tests del archivo
  });

  it('test 1', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    // Si este test falla antes de consumir el mockOnce,
    // el mockOnce queda pendiente y contamina test 2
  });

  it('test 2', async () => {
    // Puede recibir la respuesta 500 del test anterior!
  });
});

// BIEN: limpieza en cada test
describe('API tests', () => {
  let mockFetch: Mock;

  beforeEach(() => {
    mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // Cada test empieza con un mock fresco
});
```

**Mejor aún, configúralo una vez en `vitest.config.ts`:**

```typescript
export default defineConfig({
  test: {
    restoreMocks: true,  // restaura todos los mocks entre tests automaticamente
    unstubGlobals: true,  // restaura globals entre tests automaticamente
  }
});
```

### 6.4 El mock se llama pero con argumentos inesperados

```typescript
it('debug de argumentos', () => {
  const saveFn = vi.fn();
  const service = new DataService(saveFn);

  service.save({ name: 'test', date: new Date() });

  // La assertion falla:
  // expect(saveFn).toHaveBeenCalledWith({ name: 'test', date: new Date() });
  // Porque new Date() en el test != new Date() en el servicio (distinto timestamp)

  // SOLUCION 1: usar expect.any()
  expect(saveFn).toHaveBeenCalledWith({
    name: 'test',
    date: expect.any(Date),
  });

  // SOLUCION 2: usar expect.objectContaining() para verificar solo lo importante
  expect(saveFn).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'test' })
  );

  // SOLUCION 3: mockear Date para determinismo
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-04-08'));
  // Ahora new Date() es determinista
});
```

---

## 6bis. Mocking de módulos pesados (UI libraries, 3rd party)

Síntoma típico: el componente importa `@angular/material` entero o un `<Dialog>` de terceros. El test tarda 8 s en arrancar. A veces ni arranca: falla porque le falta el contexto del módulo. La solución pasa por decirle al runner que ese sub-árbol no es parte del SUT, y que no intente renderizarlo.

### 6bis.1 Angular: `NO_ERRORS_SCHEMA` y `CUSTOM_ELEMENTS_SCHEMA`

```typescript
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

TestBed.configureTestingModule({
  declarations: [CartPageComponent],
  schemas: [NO_ERRORS_SCHEMA], // ← ignora elementos/atributos desconocidos
});
```

Con `NO_ERRORS_SCHEMA`, Angular deja pasar cualquier elemento o binding que no reconozca (`<mat-dialog>`, `[matTooltip]`). Sirve para aislar un componente de un sub-árbol caro.

> ⚠ **Trade-off crítico para mutation score.** `NO_ERRORS_SCHEMA` silencia errores reales: typos en selectores, bindings rotos, inputs renombrados. Stryker puede mutar el nombre de un input a uno que no existe y tu test sigue en verde. Úsalo solo cuando la alternativa sea importar el módulo entero. En componentes nucleares, prefiere mocks explícitos con `vi.mock()`, o helpers de `@testing-library/angular` con stubs nombrados. En el reporte de la suite de referencia del taller, varios supervivientes vienen justamente de `NO_ERRORS_SCHEMA` aplicado a componentes que deberían validar su plantilla.

Alternativa más estricta: `CUSTOM_ELEMENTS_SCHEMA`. Ignora solo Web Components desconocidos, no atributos sueltos.

### 6bis.2 Angular: mock del módulo pesado vía `vi.mock`

```typescript
// Mock quirurgico de @angular/material/dialog
vi.mock('@angular/material/dialog', () => ({
  MatDialog: class { open = vi.fn().mockReturnValue({ afterClosed: () => of(true) }); },
  MatDialogModule: class {},
  MAT_DIALOG_DATA: Symbol('MAT_DIALOG_DATA'),
}));
```

Si dentro de la factory quieres capturar variables del scope, acuérdate del hoisting: usa `vi.hoisted()` (§2.3).

### 6bis.3 Vue: `shallowMount` y stubs

```typescript
import { shallowMount, mount } from '@vue/test-utils';

// shallowMount: todos los componentes hijo se renderizan como stubs
const wrapper = shallowMount(CartPage);
// <BaseButton/> aparece como <base-button-stub/>, sin ejecutar su logica

// Stub selectivo: mantener hijos ligeros reales, stubear los caros
const wrapper2 = mount(CartPage, {
  global: {
    stubs: {
      HeavyChart: true,          // stub boolean
      HeavyDialog: {             // stub con template propio
        template: '<div data-testid="dialog-stub"><slot /></div>',
      },
    },
  },
});
```

> **Preferencia:** mejor `mount` con `stubs` selectivos que `shallowMount` a lo bruto. `shallowMount` stubea todo. Un test que renderiza stubs en cascada no está validando la integración real entre tus propios componentes, y eso mata el mutation score en los bindings de `props` y `emits`.

### 6bis.4 Cuándo NO usar estas técnicas

- Si el hijo pertenece a tu sistema de diseño y lleva lógica de negocio, mockearlo o stubearlo te oculta bugs reales.
- Si solo quieres evitarte importar un módulo grande porque "es lento", prueba antes con `happy-dom` (archivo 10) y un `vi.mock` parcial. `NO_ERRORS_SCHEMA` y `shallowMount` son la última bala, no la primera.

---

## 7. Mocking de State Management (Stores)

### 7.1 NgRx Store (Angular)

#### provideMockStore

```typescript
import { provideMockStore, MockStore } from '@ngrx/store/testing';

describe('DashboardComponent', () => {
  let store: MockStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({
          initialState: { users: { list: [], loading: false, error: null } }
        })
      ]
    });
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors(); // IMPORTANTE: limpiar overrides
  });
});
```

#### Sobreescribir selectores

```typescript
// Forzar el valor que devuelve un selector
store.overrideSelector(selectUsers, [{ id: 1, name: 'Ana' }]);
store.overrideSelector(selectLoading, false);
store.overrideSelector(selectError, null);

// Actualizar mid-test
const mockSelector = store.overrideSelector(selectCount, 10);
// Simular un cambio de estado
mockSelector.setResult(20);
store.refreshState(); // trigger emision

// Verificar que el componente reacciona al nuevo valor
fixture.detectChanges();
expect(compiled.textContent).toContain('20');
```

#### Sobreescribir selectores con props (parametrizados)

```typescript
// Selector parametrizado:
// export const selectUserById = (id: number) =>
//   createSelector(selectUsers, users => users.find(u => u.id === id));

// En el test:
store.overrideSelector(selectUserById(1), { id: 1, name: 'Ana' });
store.overrideSelector(selectUserById(2), { id: 2, name: 'Luis' });
```

#### Verificar actions despachados

```typescript
// Opcion 1: con scannedActions$
const actions: Action[] = [];
store.scannedActions$.subscribe(action => actions.push(action));

component.loadUsers(); // dispara un dispatch

expect(actions).toContainEqual(loadUsers());

// Opcion 2: espiar dispatch directamente
const dispatchSpy = vi.spyOn(store, 'dispatch');
component.deleteUser(1);
expect(dispatchSpy).toHaveBeenCalledWith(deleteUser({ id: 1 }));
```

#### Testar selectores en aislamiento

Los selectores son funciones puras, puedes testarlos con `.projector()`:

```typescript
it('deberia formatear nombres completos', () => {
  const result = selectFormattedUsers.projector([
    { id: 1, firstName: 'Ana', lastName: 'Garcia' },
    { id: 2, firstName: 'Luis', lastName: 'Martinez' },
  ]);
  expect(result).toEqual(['Ana Garcia', 'Luis Martinez']);
});

it('deberia filtrar usuarios activos', () => {
  const result = selectActiveUsers.projector([
    { id: 1, name: 'Ana', active: true },
    { id: 2, name: 'Luis', active: false },
    { id: 3, name: 'Maria', active: true },
  ]);
  expect(result).toHaveLength(2);
  expect(result.map(u => u.name)).toEqual(['Ana', 'Maria']);
});

// Selector compuesto (que depende de otros selectores):
// selectDashboardData depende de selectUsers y selectStats
it('deberia combinar usuarios y stats', () => {
  const result = selectDashboardData.projector(
    [{ id: 1, name: 'Ana' }],  // selectUsers
    { totalOrders: 42 }         // selectStats
  );
  expect(result).toEqual({
    users: [{ id: 1, name: 'Ana' }],
    stats: { totalOrders: 42 },
  });
});
```

#### Testar Effects

```typescript
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';

describe('UserEffects', () => {
  let effects: UserEffects;
  let actions$: Observable<Action>;
  let userService: { getUsers: ReturnType<typeof vi.fn>; createUser: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    userService = {
      getUsers: vi.fn(),
      createUser: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        UserEffects,
        provideMockActions(() => actions$),
        { provide: UserService, useValue: userService },
      ]
    });

    effects = TestBed.inject(UserEffects);
  });

  // Preferencia: async/await + firstValueFrom sobre done().
  // done() era necesario en Jasmine; con Vitest 4 es un anti-patron (ver 13).
  it('deberia cargar usuarios exitosamente', async () => {
    const mockUsers = [{ id: 1, name: 'Ana' }];
    userService.getUsers.mockReturnValue(of(mockUsers));

    actions$ = of(loadUsers());

    const action = await firstValueFrom(effects.loadUsers$);
    expect(action).toEqual(loadUsersSuccess({ users: mockUsers }));
  });

  it('deberia manejar error al cargar usuarios', async () => {
    userService.getUsers.mockReturnValue(throwError(() => new Error('Network error')));

    actions$ = of(loadUsers());

    const action = await firstValueFrom(effects.loadUsers$);
    expect(action).toEqual(loadUsersFailure({ error: 'Network error' }));
  });
});
```

#### Testar Guards funcionales con Store

```typescript
// auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const store = inject(Store);
  const router = inject(Router);

  return store.select(selectIsAuthenticated).pipe(
    take(1),
    map(isAuth => {
      if (isAuth) return true;
      return router.parseUrl('/login');
    })
  );
};

// auth.guard.spec.ts
describe('authGuard', () => {
  let store: MockStore;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideMockStore({ initialState: {} }),
        { provide: Router, useValue: { parseUrl: vi.fn(url => ({ path: url })) } },
      ]
    });
    store = TestBed.inject(MockStore);
    router = TestBed.inject(Router);
  });

  it('deberia permitir acceso si esta autenticado', async () => {
    store.overrideSelector(selectIsAuthenticated, true);

    const result = await firstValueFrom(
      TestBed.runInInjectionContext(() => authGuard({} as any, {} as any) as Observable<boolean | UrlTree>)
    );

    expect(result).toBe(true);
  });

  it('deberia redirigir a /login si no esta autenticado', async () => {
    store.overrideSelector(selectIsAuthenticated, false);

    const result = await firstValueFrom(
      TestBed.runInInjectionContext(() => authGuard({} as any, {} as any) as Observable<boolean | UrlTree>)
    );

    expect(router.parseUrl).toHaveBeenCalledWith('/login');
  });
});
```

#### NgRx Signal Store (Angular 17+)

Para stores basados en `@ngrx/signals` el patrón cambia. No hay `MockStore`. O inyectas el store real, o un fake construido con la misma API. La guía de testing de NgRx lo confirma y desaconseja reaprovechar `provideMockStore` en este caso.

> Los equipos de NgRx recomiendan testear `@ngrx/signals` con la instancia real del store (o un fake equivalente) en lugar de con `MockStore`.
>
> > **Fuente:** NgRx — Signal Store Testing. https://ngrx.io/guide/signals/testing
> >
> > **Fuente:** NgRx v18 — Store Testing (`provideMockStore`). https://v18.ngrx.io/guide/store/testing

```typescript
import { signalStore, withState, withMethods } from '@ngrx/signals';

// Store real
export const UserStore = signalStore(
  withState({ user: null as User | null, loading: false }),
  withMethods((store) => ({
    async loadUser(id: number) { /* ... */ },
  }))
);

// En el test: fake store con la misma API
const FakeUserStore = signalStore(
  withState({ user: { id: 1, name: 'Ana' } as User | null, loading: false }),
  withMethods(() => ({ loadUser: vi.fn() }))
);

TestBed.configureTestingModule({
  providers: [{ provide: UserStore, useClass: FakeUserStore }],
});

const store = TestBed.inject(UserStore);
expect(store.user()).toEqual({ id: 1, name: 'Ana' });
```

Para leer signals, invócalos como funciones: `store.user()`. Para forzar la ejecución de effects en tests, usa `TestBed.tick()` (Angular 19+); el detalle está en el archivo 13.

#### Equivalente en React: TanStack Query para server state

NgRx Signal Store mezcla client state y server state en el mismo contenedor. En React el ecosistema lo parte en dos: el server state vive en TanStack Query y el client state en Redux Toolkit o Zustand. No hay un "NgRx canónico" en React; cada equipo monta su combinación.

Para testear componentes que consumen queries, el patrón es un `QueryClient` nuevo por test con `retry: false`. Sin el `retry: false`, un fallo reintenta tres veces y el test se te va a timeout sin motivo aparente.

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });

  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
    ),
  };
}

it('muestra el usuario cargado por la query', async () => {
  renderWithQuery(<UserProfile userId={1} />);

  expect(await screen.findByText('Ana García')).toBeInTheDocument();
});
```

Para el `fetchUser` que consume la query, tienes dos caminos. Si el hook usa `fetch` o `axios` por debajo, MSW intercepta la petición y el hook se prueba de punta a punta (recomendado, §4). Si lo que quieres es aislar el componente de la capa de red, mockea la `queryFn` directamente:

```tsx
// hooks/useUser.ts
export function useUser(id: number) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
  });
}

// UserProfile.spec.tsx
import { fetchUser } from '@/api/users';

vi.mock('@/api/users');

it('renderiza el nombre del usuario', async () => {
  vi.mocked(fetchUser).mockResolvedValue({ id: 1, name: 'Ana García' });

  renderWithQuery(<UserProfile userId={1} />);

  expect(await screen.findByText('Ana García')).toBeInTheDocument();
  expect(fetchUser).toHaveBeenCalledWith(1);
});

it('pinta el estado de error cuando la query falla', async () => {
  vi.mocked(fetchUser).mockRejectedValue(new Error('boom'));

  renderWithQuery(<UserProfile userId={1} />);

  expect(await screen.findByText(/error/i)).toBeInTheDocument();
});
```

> **Preferencia:** MSW por defecto para componentes con queries, `vi.mock` de la `queryFn` cuando la petición no es el foco del test o cuando el setup MSW te sale caro para una query aislada. Es el mismo criterio que la tabla de §4.4 aplicado al server state.

Dos detalles que pillan a todo el mundo. El `gcTime: 0` fuerza que el cache se tire al desmontar, y evita que el test siguiente vea datos del anterior. Y `QueryClient` no va bien como singleton de archivo: si lo creas una vez fuera del test, la caché se acumula entre `it` y los resultados dejan de ser deterministas. Un `QueryClient` nuevo por test, siempre.

### 7.2 Pinia Store (Vue)

> **⚠ Gotcha con Vitest:** `createTestingPinia` usa `jest.fn` por defecto para crear spies. En un proyecto Vitest esto revienta con `jest is not defined`. Pásale siempre `createSpy: vi.fn` en la configuración, o déjalo fijado globalmente en el setup de tests. El propio Testing Cookbook de Pinia lo recomienda explícitamente.
>
> > **Fuente:** Pinia — Testing Cookbook. https://pinia.vuejs.org/cookbook/testing.html

```typescript
// Configuracion global recomendada en el setup de tests:
// src/test-setup.ts
import { config } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { vi } from 'vitest';

config.global.plugins.push(createTestingPinia({ createSpy: vi.fn }));
```

#### createTestingPinia

```typescript
import { mount } from '@vue/test-utils';
import { createTestingPinia } from '@pinia/testing';
import { useCounterStore } from '@/stores/counter';

const wrapper = mount(Counter, {
  global: {
    plugins: [
      createTestingPinia({
        createSpy: vi.fn, // OBLIGATORIO en Vitest
        initialState: {
          counter: { n: 20 }, // id del store -> estado inicial
        },
        // stubActions: true (por defecto) - las acciones son vi.fn()
        // stubActions: false - las acciones ejecutan la logica real
      }),
    ],
  },
});

const store = useCounterStore();
store.increment(); // es un vi.fn(), no ejecuta la logica real
expect(store.increment).toHaveBeenCalledTimes(1);
expect(store.n).toBe(20); // no cambio porque la accion esta stubbed
```

#### createTestingPinia con stubActions: false

```typescript
// Cuando quieres probar la logica real de las acciones
const wrapper = mount(CartComponent, {
  global: {
    plugins: [
      createTestingPinia({
        initialState: {
          cart: { items: [], total: 0 },
        },
        stubActions: false, // las acciones ejecutan la logica REAL
      }),
    ],
  },
});

const cart = useCartStore();
cart.addItem({ id: 1, name: 'Laptop', price: 999 });

// La logica real se ejecuto
expect(cart.items).toHaveLength(1);
expect(cart.total).toBe(999);
```

#### Testar stores en aislamiento (sin componente)

```typescript
import { setActivePinia, createPinia } from 'pinia';

beforeEach(() => {
  setActivePinia(createPinia()); // Pinia fresca por test
});

it('incrementa el contador', () => {
  const counter = useCounterStore();
  expect(counter.n).toBe(0);
  counter.increment(); // ejecuta la logica REAL
  expect(counter.n).toBe(1);
});

it('calcula el doble (getter)', () => {
  const counter = useCounterStore();
  counter.n = 10;
  expect(counter.double).toBe(20); // getter
});

it('accion asincrona', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ count: 42 }),
  }));

  const counter = useCounterStore();
  await counter.fetchCount(); // accion async real

  expect(counter.n).toBe(42);
  expect(fetch).toHaveBeenCalledWith('/api/count');
});
```

#### Testar composables que usan stores

```typescript
// composables/useUserProfile.ts
export function useUserProfile() {
  const authStore = useAuthStore();
  const userStore = useUserStore();

  const fullName = computed(() => {
    if (!authStore.isLoggedIn) return 'Guest';
    return `${userStore.currentUser?.firstName} ${userStore.currentUser?.lastName}`;
  });

  return { fullName };
}

// composables/__tests__/useUserProfile.spec.ts
import { setActivePinia, createPinia } from 'pinia';

beforeEach(() => {
  setActivePinia(createPinia());
});

it('devuelve Guest si no esta logueado', () => {
  const authStore = useAuthStore();
  authStore.isLoggedIn = false;

  const { fullName } = useUserProfile();
  expect(fullName.value).toBe('Guest');
});

it('devuelve nombre completo si esta logueado', () => {
  const authStore = useAuthStore();
  authStore.isLoggedIn = true;

  const userStore = useUserStore();
  userStore.currentUser = { firstName: 'Ana', lastName: 'Garcia' };

  const { fullName } = useUserProfile();
  expect(fullName.value).toBe('Ana Garcia');
});
```

### 7.3 Client state en React: Redux Toolkit y Zustand

React no tiene un equivalente canónico a Pinia. En la práctica se usan dos opciones: Redux Toolkit cuando el equipo viene de Redux o necesita reducers explícitos, y Zustand cuando quieren algo ligero y basado en hooks. Las dos se testean distinto, así que merece la pena verlas por separado.

#### Redux Toolkit: `renderWithProviders`

El patrón estándar es un helper que crea un store fresco por test y envuelve el componente en `<Provider>`. Así no hay estado compartido entre tests y puedes precargar el slice que te interese.

```tsx
// test/renderWithProviders.tsx
import type { ReactElement } from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { render, type RenderOptions } from '@testing-library/react';
import cartReducer from '@/store/cartSlice';

export function renderWithProviders(
  ui: ReactElement,
  {
    preloadedState = {},
    ...renderOptions
  }: { preloadedState?: any } & Omit<RenderOptions, 'wrapper'> = {},
) {
  const store = configureStore({
    reducer: { cart: cartReducer },
    preloadedState,
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  }

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
```

Con eso, el test se queda limpio:

```tsx
it('pinta los items del carrito desde el estado precargado', () => {
  renderWithProviders(<CartPage />, {
    preloadedState: {
      cart: { items: [{ id: 1, name: 'Laptop', price: 999 }], total: 999 },
    },
  });

  expect(screen.getByText('Laptop')).toBeInTheDocument();
  expect(screen.getByText(/999/)).toBeInTheDocument();
});

it('despacha addItem al pulsar "Añadir"', async () => {
  const user = userEvent.setup();
  const { store } = renderWithProviders(<CartPage />);

  await user.click(screen.getByRole('button', { name: /añadir/i }));

  // Verificar el efecto observable en el estado, no el action despachado.
  expect(store.getState().cart.items).toHaveLength(1);
});
```

> **Preferencia:** testea el resultado en el estado (`store.getState()`) en vez de espiar `store.dispatch`. Si refactorizas el action creator, el primer estilo sigue pasando; el segundo se rompe sin que haya cambiado el comportamiento. Es el mismo criterio de §10.2.

#### Testear slices aislados

Los reducers son funciones puras. Los pruebas sin `Provider` ni `render`:

```tsx
import cartReducer, { addItem, removeItem } from '@/store/cartSlice';

it('addItem añade el producto y actualiza el total', () => {
  const initial = cartReducer(undefined, { type: '@@INIT' });

  const next = cartReducer(initial, addItem({ id: 1, name: 'Laptop', price: 999 }));

  expect(next.items).toHaveLength(1);
  expect(next.total).toBe(999);
});
```

#### Zustand: reset del store en `beforeEach`

Zustand expone el store como un hook. El estado vive en un módulo, así que persiste entre tests si no lo reinicias. Regla: en cada `beforeEach` vuelves al estado inicial.

```tsx
// stores/cartStore.ts
import { create } from 'zustand';

interface CartState {
  items: Array<{ id: number; name: string; price: number }>;
  total: number;
  addItem: (item: { id: number; name: string; price: number }) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>((set) => ({
  items: [],
  total: 0,
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
      total: state.total + item.price,
    })),
  clear: () => set({ items: [], total: 0 }),
}));
```

```tsx
// cartStore.spec.ts
import { useCartStore } from '@/stores/cartStore';

beforeEach(() => {
  // Reset completo al estado inicial del store
  useCartStore.setState(useCartStore.getInitialState(), true);
});

it('addItem actualiza items y total', () => {
  useCartStore.getState().addItem({ id: 1, name: 'Laptop', price: 999 });

  expect(useCartStore.getState().items).toHaveLength(1);
  expect(useCartStore.getState().total).toBe(999);
});
```

> **Gotcha con Vitest 4:** si no pasas `true` como segundo argumento a `setState`, Zustand hace merge parcial y las propiedades que no reescribas del test anterior se te cuelan. `setState(initial, true)` reemplaza el estado entero. Es el equivalente del `setActivePinia(createPinia())` de la §7.2.

#### Mockear el store entero con `vi.mock`

Cuando el componente solo consume una slice del store y quieres aislarlo del resto, mockea el módulo:

```tsx
import { useCartStore } from '@/stores/cartStore';

vi.mock('@/stores/cartStore');

it('muestra el número de items desde el store mockeado', () => {
  vi.mocked(useCartStore).mockReturnValue({
    items: [{ id: 1, name: 'Laptop', price: 999 }],
    total: 999,
    addItem: vi.fn(),
    clear: vi.fn(),
  });

  render(<CartBadge />);
  expect(screen.getByText('1')).toBeInTheDocument();
});
```

Dos avisos. El primero: si el componente usa selectores (`useCartStore((s) => s.items.length)`), el mock tiene que devolver un valor que cuadre con el selector, o usar `mockImplementation` para aplicarlo. El segundo: un mock así te saca el store del test. Si lo que pruebas es la integración componente–store, prefiere el reset en `beforeEach` y usa el store real.

---

## 8. Mocking de Router/Navegacion

### 8.1 Angular Router

**`RouterTestingModule` está deprecado.** Usa la API moderna:

```typescript
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { RouterTestingHarness } from '@angular/router/testing';

beforeEach(async () => {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([
        { path: 'dashboard', component: DashboardComponent },
        { path: 'login', component: LoginComponent },
      ]),
      provideLocationMocks(),
    ]
  });
});

it('deberia navegar al dashboard', async () => {
  const harness = await RouterTestingHarness.create();
  const component = await harness.navigateByUrl('/dashboard', DashboardComponent);
  expect(component).toBeTruthy();
});
```

#### Testar guards funcionales

```typescript
// auth.guard.ts
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isLoggedIn()) return true;
  return router.parseUrl('/login');
};

// auth.guard.spec.ts
it('deberia redirigir si no esta autenticado', () => {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { isLoggedIn: vi.fn().mockReturnValue(false) } },
      { provide: Router, useValue: { parseUrl: vi.fn(url => ({ path: url })) } },
    ]
  });

  const result = TestBed.runInInjectionContext(() =>
    authGuard({} as any, {} as any)
  );

  expect(result).toEqual(expect.objectContaining({ path: '/login' }));
});

it('deberia permitir acceso si esta autenticado', () => {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { isLoggedIn: vi.fn().mockReturnValue(true) } },
    ]
  });

  const result = TestBed.runInInjectionContext(() =>
    authGuard({} as any, {} as any)
  );

  expect(result).toBe(true);
});
```

#### Testar resolvers

```typescript
// user.resolver.ts
export const userResolver: ResolveFn<User> = (route) => {
  const userService = inject(UserService);
  return userService.getUser(Number(route.paramMap.get('id')));
};

// user.resolver.spec.ts
it('deberia resolver el usuario por ID', async () => {
  const mockUser = { id: 1, name: 'Ana' };
  TestBed.configureTestingModule({
    providers: [
      { provide: UserService, useValue: { getUser: vi.fn().mockReturnValue(of(mockUser)) } },
    ]
  });

  const mockRoute = { paramMap: { get: vi.fn().mockReturnValue('1') } } as any;

  const result = await firstValueFrom(
    TestBed.runInInjectionContext(() => userResolver(mockRoute, {} as any) as Observable<User>)
  );

  expect(result).toEqual(mockUser);
});
```

### 8.2 Vue Router

#### Mockear useRouter/useRoute (Composition API)

```typescript
import { useRouter, useRoute } from 'vue-router';

vi.mock('vue-router');

const push = vi.fn();
const replace = vi.fn();

beforeEach(() => {
  vi.mocked(useRouter).mockReturnValue({
    push,
    replace,
    go: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    currentRoute: { value: { path: '/' } },
  } as any);

  vi.mocked(useRoute).mockReturnValue({
    params: { id: '1' },
    query: { search: 'test' },
    path: '/users/1',
    name: 'UserDetail',
    meta: {},
  } as any);

  push.mockReset();
  replace.mockReset();
});

it('navega al hacer submit', async () => {
  const wrapper = shallowMount(MyComponent, {
    global: { stubs: ['RouterLink'] },
  });
  await wrapper.find('button').trigger('click');
  expect(push).toHaveBeenCalledWith({ name: 'Detail', params: { id: '1' } });
});
```

#### Usar un router real (tests de integracion)

```typescript
import { createRouter, createMemoryHistory } from 'vue-router';

let router: Router;

beforeEach(async () => {
  router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Home },
      { path: '/about', component: About },
      { path: '/users/:id', component: UserDetail },
    ],
  });
  router.push('/');
  await router.isReady();
});

it('renderiza Home inicialmente', () => {
  const wrapper = mount(App, {
    global: { plugins: [router] },
  });
  expect(wrapper.html()).toContain('Home');
});

it('navega a UserDetail', async () => {
  const wrapper = mount(App, {
    global: { plugins: [router] },
  });

  await router.push('/users/42');
  await wrapper.vm.$nextTick();

  expect(wrapper.html()).toContain('User 42');
});
```

---

## 9. Patrones Avanzados

### 9.1 Limpiar mocks: clear vs reset vs restore

| Metodo | Limpia historial | Elimina implementacion | Restaura original |
|--------|:----------------:|:---------------------:|:-----------------:|
| `mockClear()` / `clearAllMocks` | Si | No | No |
| `mockReset()` / `resetAllMocks` | Si | Si (devuelve undefined) | No |
| `mockRestore()` / `restoreAllMocks` | Si | Si | Si |

**Ejemplo para entender la diferencia:**

```typescript
const obj = { greet: () => 'hello' };
const spy = vi.spyOn(obj, 'greet').mockReturnValue('mocked');

obj.greet(); // 'mocked'

spy.mockClear();
// spy.mock.calls = []  (historial limpio)
// obj.greet() = 'mocked' (implementacion mock SIGUE)

spy.mockReset();
// spy.mock.calls = []
// obj.greet() = undefined (implementacion eliminada, devuelve undefined)

spy.mockRestore();
// spy.mock.calls = []
// obj.greet() = 'hello' (implementacion ORIGINAL restaurada)
```

**Recomendación:** configura la limpieza automática en `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    mockReset: true,     // auto-reset entre tests
    // o: restoreMocks: true  (mas agresivo, restaura originales)
    // o: clearMocks: true    (mas permisivo, solo limpia historial)
  }
});
```

### 9.2 Mock de timers

```typescript
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('polling cada 5 segundos', () => {
  const callback = vi.fn();
  setInterval(callback, 5000);

  vi.advanceTimersByTime(5000);
  expect(callback).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(10000);
  expect(callback).toHaveBeenCalledTimes(3);
});
```

### 9.3 Mock de fechas

```typescript
vi.useFakeTimers();
vi.setSystemTime(new Date(2026, 3, 8)); // 8 de abril 2026

expect(new Date().getFullYear()).toBe(2026);
expect(new Date().getMonth()).toBe(3); // abril (0-indexed)
expect(Date.now()).toBe(new Date(2026, 3, 8).valueOf());

vi.useRealTimers();
```

---

## 10. Anti-patrones de Mocking

### 10.1 Over-mocking: Cuando el mock ES el test

```typescript
// MAL: mockeando la funcion que estamos probando
vi.mock('./calculator', () => ({
  add: vi.fn().mockReturnValue(5)
}));

test('add devuelve 5', () => {
  expect(add(2, 3)).toBe(5); // Esto no prueba NADA, solo tu mock
});
```

**Regla:** mockea solo lo que no puedes controlar (red, tiempo, servicios externos). Nunca mockees el sistema que estás probando.

### 10.2 Testar detalles de implementacion

```typescript
// MAL: verificar orden exacto de llamadas internas
expect(mockFn.mock.calls[0][0]).toBe('arg1');
expect(mockFn.mock.calls[1][0]).toBe('arg2');
// Si refactorizas el orden interno, el test se rompe
// aunque el comportamiento siga siendo correcto

// BIEN: verificar el resultado observable
expect(result).toEqual(expectedOutput);
expect(mockFn).toHaveBeenCalledWith('arg1');
expect(mockFn).toHaveBeenCalledWith('arg2');
// No importa el orden, solo que se llamaron
```

### 10.3 No restaurar mocks entre tests

```typescript
// MAL: sin limpieza
it('test 1', () => {
  vi.spyOn(Math, 'random').mockReturnValue(0.5);
  // Math.random esta mockeado...
});

it('test 2', () => {
  // Math.random SIGUE mockeado! Test pollution.
  expect(Math.random()).toBe(0.5); // pasa inesperadamente
});

// SOLUCION: afterEach o mockReset: true en config
afterEach(() => {
  vi.restoreAllMocks();
});
```

### 10.4 Mockear demasiadas capas

```typescript
// MAL: mockeas tanto que no pruebas nada real
vi.mock('./userRepository');
vi.mock('./validator');
vi.mock('./emailService');
vi.mock('./logger');
vi.mock('./cache');

it('createUser funciona', async () => {
  // Con 5 mocks, solo estas probando que tu funcion
  // llama a otras funciones en cierto orden.
  // No pruebas logica real.
  const result = await createUser(mockData);
  expect(mockValidator.validate).toHaveBeenCalled();
  expect(mockRepo.save).toHaveBeenCalled();
  expect(mockEmail.send).toHaveBeenCalled();
  // Esto es un test de coreografia, no de comportamiento
});

// BIEN: mockear solo las fronteras de I/O
// Usar la validacion real, el repositorio real con DB en memoria,
// y solo mockear el servicio de email y el logger
vi.mock('./emailService');
vi.mock('./logger');

it('createUser valida y guarda', async () => {
  const result = await createUser({ name: '', email: 'invalid' });
  expect(result.error).toBe('Name is required');

  const result2 = await createUser({ name: 'Ana', email: 'ana@test.com' });
  expect(result2.success).toBe(true);
  expect(mockEmail.send).toHaveBeenCalledWith(
    expect.objectContaining({ to: 'ana@test.com' })
  );
});
```

### 10.5 Mocks que divergen de la API real

```typescript
// MAL: tu mock tiene una interfaz diferente al servicio real
const mockApi = {
  getUsers: vi.fn().mockResolvedValue([{ id: 1, name: 'Ana' }]),
  // El servicio real devuelve { data: [...], pagination: {...} }
  // pero el mock devuelve directamente el array
  // Los tests pasan pero la app falla en produccion
};

// BIEN: que el mock refleje la interfaz real
const mockApi = {
  getUsers: vi.fn().mockResolvedValue({
    data: [{ id: 1, name: 'Ana' }],
    pagination: { page: 1, total: 1, perPage: 10 },
  }),
};

// MEJOR: usar un tipo de TypeScript que fuerce la forma
const mockApi: Mocked<ApiClient> = {
  getUsers: vi.fn().mockResolvedValue({
    data: [{ id: 1, name: 'Ana' }],
    pagination: { page: 1, total: 1, perPage: 10 },
  }),
};
```

### 10.6 Usar mocks como tests de contrato

```typescript
// MAL: tu test pasa porque el mock dice lo que quieres oir
const mockPaymentService = {
  charge: vi.fn().mockResolvedValue({ success: true }),
};

it('procesa el pago', async () => {
  const result = await processOrder(order, mockPaymentService);
  expect(result.paid).toBe(true);
  // Nunca probaste que el PaymentService REAL funciona
  // ni que tu integracion con el es correcta
});

// BIEN: tener tests de contrato separados
// 1. Test unitario: mock para aislar tu logica
// 2. Test de integracion: servicio real con sandbox/test API
// 3. Test de contrato: verificar que tu mock y el servicio real
//    tienen la misma interfaz
```

### 10.7 Mocks permisivos que matan el mutation score

Esta sección recoge los patrones que más mutantes dejan vivos en el reporte de referencia del taller (una suite grande en producción, equipo de 20+ squads). Si solo te quedas con una cosa del archivo, que sea esta tabla.

| Síntoma en el test | Mutante que sobrevive | Arreglo |
|---|---|---|
| `expect(spy).toHaveBeenCalled()` sin args | Mutación de argumentos (`sku` → `''`, `id` → `0`) | `toHaveBeenCalledWith(args específicos)` o `toHaveBeenNthCalledWith` |
| `expect.any(Object)` en todo el payload | Mutación de propiedades del body (booleans flip, strings vaciados) | `expect.objectContaining({ campos específicos })` |
| `stubActions: true` y nunca se verifica la acción | Mutación de la acción (`increment` → `decrement`) | `expect(store.action).toHaveBeenCalledWith(...)` o `stubActions: false` y validar estado |
| `NO_ERRORS_SCHEMA` en componentes nucleares | Mutación de inputs/outputs (`@Input('foo')` → `@Input('bar')`) | Mocks nombrados o importar el módulo real del hijo |
| `shallowMount` indiscriminado | Mutación de props pasadas al hijo (true → false) | `mount` + `stubs` selectivos; verificar `props()` en el stub |
| `mockResolvedValue(whatever)` sin verificar input | Mutación del argumento pasado al servicio | Verificar `toHaveBeenCalledWith` junto al retorno |
| Sin tests de error paths | Mutación en `catch`/`throw`/`?? fallback` | Un test por cada rama de error con `mockRejectedValue` |

**Patrón general:** un mock que no verifica qué se le pasa solo prueba que *algo* ocurrió, no *qué*. Stryker lo detecta enseguida. La regla es simple: cada `vi.fn` que pase a la aplicación tiene que tener al menos una aserción `toHaveBeenCalledWith` con argumentos concretos. La única excepción es el test de "compruebo que no revienta".

Cruza esta sección con [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md). El roadmap del 22 % al 60 %+ (fases 2 y 3) se apoya justo en atacar estos patrones. Los porcentajes provienen del mismo caso de referencia del taller (suite grande en producción).

---

## 11. Tabla de referencia rápida de APIs

| Necesito... | Usar... |
|------------|---------|
| Funcion espia sin implementacion | `vi.fn()` |
| Espiar metodo sin cambiar su comportamiento | `vi.spyOn(obj, 'method')` |
| Reemplazar un modulo completo | `vi.mock('./module')` |
| Mock parcial (algunas funciones reales) | `vi.mock(import(...), async (orig) => ({ ...(await orig()), fn: vi.fn() }))` |
| Mock que no se hoistea | `vi.doMock('./module', factory)` |
| Mock de variable global | `vi.stubGlobal('name', value)` |
| Mock de timers | `vi.useFakeTimers()` + `vi.advanceTimersByTime()` |
| Mock de fecha | `vi.useFakeTimers()` + `vi.setSystemTime()` |
| Mock de HTTP en Angular | `HttpTestingController` |
| Mock de HTTP en Vue | `vi.stubGlobal('fetch')` o MSW |
| Mock de HTTP realista | MSW (`setupServer`) |
| Mock de NgRx Store | `provideMockStore()` |
| Mock de Pinia Store | `createTestingPinia()` |
| Mock de Redux Toolkit (React) | `configureStore()` + `<Provider>` en un helper `renderWithProviders` |
| Mock de Zustand (React) | `useStore.setState(useStore.getInitialState(), true)` en `beforeEach` |
| Mock de TanStack Query (React) | `QueryClient` nuevo por test con `retry: false, gcTime: 0` |
| Mock de Angular Router | `provideRouter()` + `provideLocationMocks()` |
| Mock de Vue Router | `vi.mock('vue-router')` o `createRouter({ history: createMemoryHistory() })` |
| Verificar que mock fue llamado | `expect(fn).toHaveBeenCalled()` |
| Verificar argumentos de llamada | `expect(fn).toHaveBeenCalledWith(args)` |
| Verificar N-esima llamada | `expect(fn).toHaveBeenNthCalledWith(n, args)` |
| Verificar numero de llamadas | `expect(fn).toHaveBeenCalledTimes(n)` |
| Limpiar historial de mock | `fn.mockClear()` |
| Eliminar implementacion mock | `fn.mockReset()` |
| Restaurar funcion original | `fn.mockRestore()` |
| Inspeccionar llamadas | `fn.mock.calls` |
| Inspeccionar retornos | `fn.mock.results` |

---

## 12. Comparativa de enfoques HTTP

| Enfoque | Ventajas | Desventajas | Cuándo usarlo |
|---------|----------|-------------|----------------|
| `HttpTestingController` | Integrado con Angular DI, verifica método/URL/body exactos | Acoplado a Angular, verboso | Tests unitarios de un `HttpClient` consumer en Angular |
| `vi.fn()` / `vi.mock()` sobre el servicio | Simple, rápido, control total | No verifica HTTP real; los mocks pueden divergir de la API | Tests unitarios de un consumer del servicio (componente, composable) |
| MSW | Agnóstico de framework, intercepta a nivel de red, reutilizable entre dev, tests y staging | Dependencia adicional, más setup | Tests de integración de componentes que hacen HTTP; proyectos grandes con handlers compartidos |

---

## 13. Checklist de revisión

Antes de dar por bueno un archivo `.spec.ts` con mocking avanzado:

- [ ] El SUT no está mockeado (ni directa ni indirectamente vía barrel).
- [ ] Cada `vi.mock()` está tipado con `vi.mocked()` o el alias correspondiente.
- [ ] `vi.hoisted()` se usa si la factory captura variables del scope.
- [ ] Los stores (Pinia/NgRx classic/Signal Store/Redux Toolkit/Zustand) están inicializados con estado fresco por test.
- [ ] `createTestingPinia` lleva `createSpy: vi.fn` explícitamente.
- [ ] En React, el `QueryClient` se crea nuevo por test con `retry: false` y el store de Zustand se resetea en `beforeEach`.
- [ ] `RouterTestingModule` no aparece; en su lugar `provideRouter` + `provideLocationMocks` (+ `RouterTestingHarness` para navegación).
- [ ] `restoreMocks: true` (o `mockReset: true`) está activado en `vitest.config.ts`, o hay `afterEach(restoreAllMocks)` explícito.
- [ ] No hay `NO_ERRORS_SCHEMA` ni `shallowMount` indiscriminado en componentes nucleares.
- [ ] Cada `vi.fn` crítico tiene al menos una aserción `toHaveBeenCalledWith` con argumentos concretos (no solo `toHaveBeenCalled`).
- [ ] Hay tests de rutas de error (`mockRejectedValue`, `HttpResponse` 4xx/5xx, `throwError`).
- [ ] Los nombres de los SKUs, IDs y entidades son consistentes con el dominio del archivo 07 (Cart/Counter) cuando aplica.

---

## Qué viene después

- Tests que fallan por promesas colgadas, Observables sin unsubscribe o timers pendientes: [`13-dominio-asincronia.md`](./13-dominio-asincronia.md).
- Medir si los mocks son lo bastante estrictos: [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md) y el roadmap 22 % → 60 %+.

---

## Fuentes

- **Vitest — Mocking Guide.** https://vitest.dev/guide/mocking — overview (spies, mocks, timers).
- **Vitest — Module Mocking.** https://vitest.dev/guide/mocking/modules — hoisting de `vi.mock`, factories.
- **Vitest — Vi API Reference.** https://vitest.dev/api/vi.html — `vi.hoisted`, `vi.doMock`, `vi.importActual`.
- **Vitest — Mocking Requests.** https://vitest.dev/guide/mocking/requests — MSW y mocks de `fetch`.
- **MSW — Quick Start.** https://mswjs.io/docs/quick-start — handlers, setup Node/browser (MSW 2.x).
- **MSW — Node.js Integration.** https://mswjs.io/docs/integrations/node — integración con Vitest y Jest.
- **Pinia — Testing Cookbook.** https://pinia.vuejs.org/cookbook/testing.html — `createTestingPinia`, `createSpy: vi.fn`.
- **NgRx v18 — Store Testing.** https://v18.ngrx.io/guide/store/testing — `provideMockStore`.
- **NgRx — Signal Store Testing.** https://ngrx.io/guide/signals/testing — instancia real del store.
- **Redux Toolkit — Writing Tests.** https://redux.js.org/usage/writing-tests — store real en tests de integración.
- **Zustand — Testing.** https://zustand.docs.pmnd.rs/learn/guides/testing — reset del store entre tests.
- **TanStack Query — Testing.** https://tanstack.com/query/latest/docs/framework/react/guides/testing — `QueryClientProvider` con `retry: false`.
- **Angular — HTTP Testing.** https://angular.dev/guide/http/testing — `HttpTestingController`.
- **Angular — Routing Testing.** https://angular.dev/guide/routing/testing — `RouterTestingHarness`, `provideRouter`, `provideLocationMocks`.
- **Gerard Meszaros (2007).** *xUnit Test Patterns: Refactoring Test Code* — terminología stub/spy/mock/fake/dummy usada en todo el archivo 07 y éste.
- **KPIs internos ("22 % → 60 %+").** Suite grande en producción (equipo de 20+ squads) usada como caso de referencia del taller. Se muestran anonimizados.
- Fundamentos (stub / spy / mock, `vi.fn`, `vi.spyOn`, inspección de `.mock.calls`): [`07-mocking-basico.md`](./07-mocking-basico.md).
