# Queries en Testing Library

> Taller 1 — Fundamentos del Testing Frontend | Sección 5
>
> **Modalidad Diátaxis:** *Reference*. Tabla consultable + jerarquía oficial. No es un tutorial paso a paso: úsalo para resolver "¿qué query uso aquí?" mientras escribes tests.
>
> **Prerrequisitos:** haber leído [`04-primer-componente.md`](./04-primer-componente.md) (uso básico de `render()` y `screen`).
>
> **Tiempo estimado:** 25 min lectura inicial · después, consulta puntual.
>
> **Stack validado (2026-04):** Vitest 4.x · `@testing-library/angular` 16.x · `@testing-library/vue` 8.x · `@testing-library/react` 16.x · `@testing-library/dom` 10.x · `@testing-library/jest-dom` 6.x. Angular 17–21 · Vue 3.x · React 19.
>
> **Relación con otros archivos:** los ejemplos asumen el componente renderizado con `render()` según [`04-primer-componente.md`](./04-primer-componente.md). Para **disparar eventos** sobre los elementos encontrados, ver [`06-eventos-de-usuario.md`](./06-eventos-de-usuario.md).
>
> **Por qué importa para tu mutation score:** las queries semánticas (`getByRole`, `getByLabelText`) matan bastantes más mutantes que los selectores CSS o que `data-testid`. Se anclan en el contrato accesible del componente, no en su HTML. Si Stryker cambia un `<button>` por un `<div>` o borra un `aria-label`, un selector como `.btn-primary` lo deja pasar; `getByRole('button', { name: /enviar/i })` revienta en el acto. Y ese es el objetivo del Taller 1: ir sustituyendo selectores frágiles por queries accesibles conforme tocas cada componente.

---

### Índice

1. [Tabla de decisión: getBy vs queryBy vs findBy](#tabla-de-decisión-getby-vs-queryby-vs-findby)
2. [Variantes para múltiples elementos](#variantes-para-múltiples-elementos)
3. [Jerarquía de selectores (de más a menos preferido)](#jerarquía-de-selectores-de-más-a-menos-preferido)
4. [`within()` para búsquedas acotadas](#within-para-búsquedas-acotadas)
5. [Anti-patrones a evitar](#anti-patrones-a-evitar)
6. [Troubleshooting: cuando una query no encuentra el elemento](#troubleshooting-cuando-una-query-no-encuentra-el-elemento)
7. [Conexión con mutation score (Stryker)](#conexión-con-mutation-score-stryker)
8. [Referencias](#referencias)

### Tabla de decisión: getBy vs queryBy vs findBy

Testing Library expone tres prefijos, uno por cada escenario que te vas a encontrar al buscar un elemento: "tiene que estar", "quiero comprobar que NO está" y "va a estar cuando termine una operación async". La tabla resume el comportamiento; debajo tienes los tres casos típicos en código.

| Prefijo    | Si no encuentra       | Si encuentra múltiples | Async | Cuándo usar                               |
|------------|----------------------|------------------------|-------|-------------------------------------------|
| `getBy`    | Lanza error          | Lanza error            | No    | Elementos que DEBEN existir               |
| `queryBy`  | Devuelve `null`      | Lanza error            | No    | Verificar que algo NO está en el DOM      |
| `findBy`   | Lanza error (timeout)| Lanza error            | Sí    | Elementos que aparecen de forma asíncrona |

```typescript
// ── getBy: el elemento DEBE existir ──────────────────
const button = screen.getByRole('button', { name: /enviar/i });
// Si el botón no existe, el test falla inmediatamente con un error claro.

// ── queryBy: verificar AUSENCIA ──────────────────────
const errorMsg = screen.queryByText(/error/i);
expect(errorMsg).not.toBeInTheDocument();
// Si usaras getByText aquí, el test fallaría con "no se encontró"
// en vez de poder verificar que no existe.

// ── findBy: contenido ASÍNCRONO ──────────────────────
const data = await screen.findByText(/datos cargados/i);
expect(data).toBeInTheDocument();
// findBy reintenta hasta que el elemento aparezca (timeout por defecto: 1000 ms).
// Es equivalente a waitFor(() => getByText(...)).
```

> **Fuente:** Testing Library — *Async Methods* (<https://testing-library.com/docs/dom-testing-library/api-async/>). `findBy*` resuelve internamente `waitFor(() => getBy*(...))` con `timeout: 1000` e `interval: 50` por defecto.

### Variantes para múltiples elementos

Los prefijos anteriores fallan si encuentran más de un match, y eso es lo que quieres la mayor parte del tiempo. Cuando de verdad esperas varias coincidencias (filas de una tabla, cards de un listado, errores de validación), cada prefijo tiene su variante `All`. Te devuelve la colección entera en vez de quejarse.

| Singular      | Plural          | Devuelve           |
|---------------|-----------------|---------------------|
| `getBy`       | `getAllBy`       | Array de elementos  |
| `queryBy`     | `queryAllBy`     | Array (vacío si no hay) |
| `findBy`      | `findAllBy`      | Promise de array    |

```typescript
// Obtener todos los items de una lista
const items = screen.getAllByRole('listitem');
expect(items).toHaveLength(5);

// Verificar que no hay errores mostrados
const errors = screen.queryAllByRole('alert');
expect(errors).toHaveLength(0);

// Esperar a que se carguen varios elementos
const cards = await screen.findAllByTestId(/card-/);
expect(cards).toHaveLength(3);
```

### Jerarquía de selectores (de más a menos preferido)

Testing Library propone un orden claro de qué query usar primero, y ese orden es el que fija la propia documentación oficial en *About Queries*. El criterio es siempre el mismo: cuanto más se parezca tu forma de localizar el elemento a cómo lo encontraría una persona real (o un lector de pantalla), mejor. De ahí que `getByRole` esté arriba del todo y `getByTestId` quede reservado para cuando ya no hay nada semántico a lo que agarrarse. En la práctica, bajas por la lista hasta que una opción encaja con el elemento que tienes delante.

> **Fuente:** Testing Library — *About Queries · Priority* (<https://testing-library.com/docs/queries/about/#priority>). La jerarquía oficial va de role/label/placeholder/text/display value a alt/title/testid, en ese orden.

#### 1. `getByRole` (el más recomendado)

Busca por rol ARIA, ya sea implícito (un `<button>` tiene rol `button` de serie) o explícito (`role="dialog"` sobre un `<div>`). Es la query que deberías intentar primero casi siempre. Obliga a que el componente esté bien construido a nivel semántico: si el test no encuentra el rol, lo normal es que el HTML tenga un problema de accesibilidad real.

```typescript
// Botones
screen.getByRole('button', { name: /enviar/i });

// Encabezados
screen.getByRole('heading', { name: /bienvenido/i });
screen.getByRole('heading', { level: 2 }); // <h2>

// Links
screen.getByRole('link', { name: /inicio/i });

// Inputs (según su tipo)
screen.getByRole('textbox', { name: /nombre/i });      // <input type="text">
screen.getByRole('checkbox', { name: /acepto/i });      // <input type="checkbox">
screen.getByRole('spinbutton', { name: /cantidad/i });   // <input type="number">
screen.getByRole('combobox', { name: /país/i });         // <select>

// Regiones y navegación
screen.getByRole('navigation');
screen.getByRole('main');
screen.getByRole('alert');
screen.getByRole('dialog');

// Tablas
screen.getByRole('table');
screen.getByRole('row');
screen.getByRole('cell', { name: /precio/i });
```

**Opciones de `getByRole`** (combínalas para afinar la query):

| Opción     | Tipo             | Para qué sirve                                                    |
|------------|------------------|-------------------------------------------------------------------|
| `name`     | `string \| RegExp` | Nombre accesible (label, aria-label, contenido textual)          |
| `level`    | `number`         | Nivel de heading (`<h1>` = 1, `<h2>` = 2, …)                      |
| `hidden`   | `boolean`        | Incluir elementos con `aria-hidden="true"` o CSS ocultos          |
| `selected` | `boolean`        | `option`/`tab` seleccionados (`aria-selected`)                    |
| `checked`  | `boolean`        | `checkbox`/`radio`/`switch` marcados (`aria-checked`)             |
| `pressed`  | `boolean`        | Toggle buttons presionados (`aria-pressed`)                       |
| `expanded` | `boolean`        | Elementos expandibles (`aria-expanded`)                           |
| `current`  | `boolean \| string` | Elemento actual (`aria-current`: link activo, paso actual, …)  |

```typescript
screen.getByRole('heading', { level: 1, name: /bienvenido/i });
screen.getByRole('checkbox', { checked: true });
screen.getByRole('button', { pressed: true, name: /favorito/i });
screen.getByRole('tab', { selected: true });
screen.getByRole('link', { current: 'page' });
```

**String vs RegExp en `name`:**

```typescript
// String → coincidencia EXACTA (sensible a mayúsculas/espacios)
screen.getByRole('button', { name: 'Enviar formulario' });

// RegExp → coincidencia PARCIAL y flexible (recomendado para UI que puede cambiar)
screen.getByRole('button', { name: /enviar/i });   // case-insensitive, parcial
screen.getByRole('button', { name: /^enviar$/i }); // exacto pero insensible a mayúsculas

// Función → control total
screen.getByRole('button', { name: (accessibleName) => accessibleName.startsWith('Enviar') });
```

> **Regla práctica:** por defecto, pasa siempre una `RegExp` con `/i`. Así el test aguanta cambios triviales en el copy (una mayúscula, un espacio de más, un emoji que meten luego) sin que lo toques. Deja el `string` exacto solo cuando quieres verificar el literal: un mensaje legal, una etiqueta que tiene que aparecer tal cual.

> **Tip de debugging:** cuando no tengas claro qué rol le toca a un elemento, tira de dos atajos. `screen.logTestingPlaygroundURL()` imprime una URL que abre el DOM actual en [testing-playground.com](https://testing-playground.com) y te sugiere la query idónea. `screen.debug()` vuelca el árbol en la consola para inspeccionarlo ahí mismo.

#### 2. `getByLabelText` (formularios)

Es la query natural para inputs, selects y textareas. En vez de apuntar al input directamente, buscas por la etiqueta que el usuario lee al lado. Funciona con las tres formas habituales de asociar label e input en Angular, Vue y React: la nativa (`<label for="...">`), `aria-label` cuando no hay label visible, y `aria-labelledby` cuando el texto que hace de etiqueta vive en otro nodo.

```html
<!-- Angular template / Vue template / JSX / HTML -->
<label for="email">Correo electrónico</label>
<input id="email" type="email" />
```

```typescript
screen.getByLabelText('Correo electrónico');
screen.getByLabelText(/correo/i); // regex para tolerar cambios menores

// También funciona con aria-label
// <input aria-label="Buscar" />
screen.getByLabelText('Buscar');

// Y con aria-labelledby
// <span id="price-label">Precio</span>
// <input aria-labelledby="price-label" />
screen.getByLabelText('Precio');
```

#### 3. `getByPlaceholderText`

```typescript
// <input placeholder="tu@email.com" />
screen.getByPlaceholderText('tu@email.com');
```

> Nota: úsalo solo como último recurso dentro de los formularios, porque el placeholder desaparece en cuanto el usuario escribe y no cuenta como label accesible. Si el input tiene `<label>` o `aria-label`, prefiere `getByLabelText`.

#### 4. `getByText`

Busca por el texto visible del elemento. Encaja bien para párrafos, mensajes de estado o cualquier contenido puramente textual. Pero ojo: no lo uses para botones o enlaces. Un `<div onclick>` con el mismo texto pasaría el test sin problema, y ese es justo el fallo que `getByRole` bloquea.

```typescript
// <p>No se encontraron resultados</p>
screen.getByText('No se encontraron resultados');
screen.getByText(/no se encontraron/i); // Regex, case-insensitive

// Coincidencia parcial con función
screen.getByText((content, element) => {
  return content.startsWith('Total:') && element?.tagName === 'P';
});
```

#### 5. `getByDisplayValue`

Busca por el **valor actual** del input, select o textarea.

```typescript
// <input value="Madrid" />
screen.getByDisplayValue('Madrid');

// <select><option selected>España</option></select>
screen.getByDisplayValue('España');
```

#### 6. `getByAltText`

Para elementos con atributo `alt` (imágenes, inputs de tipo imagen, areas).

```typescript
// <img alt="Logo de la empresa" src="logo.png" />
screen.getByAltText('Logo de la empresa');
screen.getByAltText(/logo/i);
```

#### 7. `getByTitle`

Busca por el atributo `title`.

```typescript
// <span title="Cerrar">X</span>
screen.getByTitle('Cerrar');
```

#### 8. `getByTestId` (último recurso)

Reserva `data-testid` para cuando ya has descartado todo lo anterior y sigues necesitando un punto de anclaje estable. El caso típico es un contenedor sin rol implícito ni texto propio: un wrapper de gráfico, un widget custom que aún no tiene ARIA. Antes de llegar aquí, pregúntate si el componente no debería exponer un rol o un label. Muchas veces lo que te empuja al testid es un problema de accesibilidad que el propio test está señalando.

```typescript
// <div data-testid="custom-chart">...</div>
screen.getByTestId('custom-chart');
```

> **Regla:** si puedes evitar `data-testid` apoyándote en un rol, un label o el propio texto, hazlo sin pensarlo. Los testid no aportan nada al usuario ni a las tecnologías asistivas. Y encima degradan el mutation score: un mutante que cambie el rol del elemento o retoque su nombre accesible pasa desapercibido mientras el `data-testid` siga intacto.

### `within()` para búsquedas acotadas

En cuanto una página tiene dos formularios parecidos, una tabla con varias filas o un listado con tarjetas repetidas, `getByRole('textbox', { name: /nombre/i })` va a saltar: encuentra más de uno. La solución es acotar la búsqueda a la región que te interesa. Primero localizas el contenedor con una query semántica; luego pasas ese nodo a `within()` y buscas solo dentro de él.

Importa `render`, `screen` y `within` del paquete de tu framework. La API de queries es la misma en los tres; lo único que cambia es el paquete del que importas y la firma de `render`.

| Framework | Import                                                 | Llamada a `render`              |
|-----------|--------------------------------------------------------|---------------------------------|
| Angular   | `import { render, screen, within } from '@testing-library/angular'` | `await render(PageComponent)`   |
| Vue       | `import { render, screen, within } from '@testing-library/vue'`     | `render(PageComponent)`         |
| React     | `import { render, screen, within } from '@testing-library/react'`   | `render(<PageComponent />)`     |

```typescript
// Ejemplo con Angular (para Vue o React, cambia el import y la llamada a render)
import { render, screen, within } from '@testing-library/angular';

await render(PageComponent);

// Encontrar la sección de "Datos personales"
const personalSection = screen.getByRole('region', { name: /datos personales/i });

// Buscar SOLO dentro de esa sección
const nameInput = within(personalSection).getByLabelText(/nombre/i);
expect(nameInput).toBeInTheDocument();

// Ejemplo con una fila de tabla específica
const rows = screen.getAllByRole('row');
const firstDataRow = rows[1]; // rows[0] es el header
expect(within(firstDataRow).getByRole('cell', { name: 'Ana' })).toBeInTheDocument();
expect(within(firstDataRow).getByRole('cell', { name: '30' })).toBeInTheDocument();
```

Cada vez que te pilles escribiendo algo como `.user-card:nth-child(2) .name`, pisa el freno. Eso es señal de que lo que necesitas es `within()`. Cuando acotas por la región semántica que ya existe en el DOM, la búsqueda deja de depender del orden exacto de los elementos, y el test aguanta reordenaciones del HTML sin enterarse.

### Anti-patrones a evitar

Abajo tienes los patrones que más aparecen en code reviews. Casi todos tiran abajo dos cosas a la vez: la legibilidad del test y el mutation score. La columna de la derecha dice qué poner en su lugar. Y si un test de tu equipo acumula varios de estos, suele salir más a cuenta reescribirlo entero que parchearlo.

| Anti-patrón                                                   | Por qué evitarlo                                                                 | Alternativa                                        |
|---------------------------------------------------------------|----------------------------------------------------------------------------------|----------------------------------------------------|
| Acceder a `fixture.componentInstance` / `wrapper.vm`          | Testas implementación, no comportamiento. Stryker mutará métodos privados que no afectan al usuario. | Renderizar e interactuar vía queries + `userEvent` |
| Selectores CSS (`.btn-primary`, `#submit`, `div > span`)      | Se rompen al refactorizar estilos. No matan mutantes ARIA ni de roles.           | `getByRole`, `getByLabelText`                      |
| `querySelector` / `nativeElement.querySelector`               | Bypassa la capa de accesibilidad.                                                | Queries de Testing Library                         |
| Abuso de `data-testid` cuando existe rol/label                | Oculta problemas de accesibilidad y mata menos mutantes.                         | `getByRole` con `name`                             |
| `getByText` para botones/links                                | Si el elemento cambia de `<button>` a `<div onclick>`, el test sigue pasando.    | `getByRole('button', { name: /.../ })`             |
| Queries con nombre exacto (`name: 'Enviar'`) sin razón        | Fallan ante cambios triviales (espacios, mayúsculas, traducción).                | RegExp con `/i`                                    |

### Troubleshooting: cuando una query no encuentra el elemento

El error que suelta Testing Library cuando una query falla es bastante hablador. Aun así, a veces necesitas ver el DOM tal y como está en el momento exacto del fallo. Tres herramientas cubren el 90% de los casos: `screen.debug()` vuelca el árbol por consola, `logTestingPlaygroundURL()` te abre el DOM renderizado en el navegador, y `logRoles()` te lista qué roles expone tu componente cuando ese es justo el dato que te falta.

```typescript
// 1. Imprime el DOM actual
screen.debug();                     // todo el container
screen.debug(screen.getByRole('form')); // solo un subárbol

// 2. Abre la UI renderizada en Testing Playground
screen.logTestingPlaygroundURL();   // imprime una URL; ábrela en el navegador

// 3. Lista todos los roles disponibles (muy útil cuando falla getByRole)
import { logRoles } from '@testing-library/dom';
logRoles(container);
```

Y si el que te está dando guerra es `getByRole`, repasa este checklist antes de sospechar del framework:

- ¿El elemento está renderizado en el momento de la query? (si es asíncrono → usa `findByRole`)
- ¿Tiene un nombre accesible? (label asociado, `aria-label`, `aria-labelledby`, contenido textual)
- ¿Está oculto con `aria-hidden="true"` o `display: none`? (prueba `{ hidden: true }` para confirmar)
- ¿El rol es el esperado? (un `<div>` no tiene rol `button`; hace falta `<button>` o `role="button"`)

### Conexión con mutation score (Stryker)

La primera vez que pasas Stryker sobre una suite propia, sorprende la cantidad de mutantes que sobreviven solo por el tipo de selector que usas. La tabla lo deja claro. Si anclas tus queries en la semántica accesible del componente, muchas mutaciones que antes pasaban tranquilas con un selector CSS o un `data-testid` ahora se convierten en fallo.

| Mutación que Stryker aplica              | `.btn-primary` (CSS) | `getByRole('button', { name: /enviar/i })` |
|------------------------------------------|:--------------------:|:------------------------------------------:|
| Cambiar `<button>` por `<div>`           | Sobrevive            | **Muere**                                  |
| Quitar `aria-label="enviar"`             | Sobrevive            | **Muere**                                  |
| Cambiar texto "Enviar" por "Submit"      | Sobrevive            | **Muere**                                  |
| Invertir `disabled` en el botón          | Sobrevive si no lo consultas | **Muere** con `{ name, ... }` + assertion sobre `disabled` |

**Regla práctica:** cuando escribas una assertion, imagina qué mutación la haría fallar. Si lo único que se te ocurre es "que el elemento desaparezca del DOM", estás testando la presencia del nodo, no el contrato con el usuario. En ese caso, afina la query con un `name`, un estado (`checked`, `disabled`, `pressed`) o un rol más específico.

### Referencias

- Testing Library — About Queries: <https://testing-library.com/docs/queries/about>
- Testing Library — ByRole: <https://testing-library.com/docs/queries/byrole>
- Testing Playground: <https://testing-playground.com/>
- Kent C. Dodds — Common Mistakes with React Testing Library (aplicable a Angular/Vue): <https://kentcdodds.com/blog/common-mistakes-with-react-testing-library>

### Fuentes

- **Testing Library — *Guiding Principles*.** El principio fundacional de Kent C. Dodds: *"the more your tests resemble the way your software is used, the more confidence they can give you"*. Sustenta toda la jerarquía de queries. <https://testing-library.com/docs/guiding-principles/>
- **Testing Library — *About Queries · Priority*.** Orden oficial de preferencia: role → label → placeholder → text → display value → alt → title → testid. <https://testing-library.com/docs/queries/about/#priority>
- **Testing Library — *ByRole*.** Query recomendada por defecto. Opciones `name`, `level`, `checked`, `pressed`, `selected`, `expanded`, `hidden`. <https://testing-library.com/docs/queries/byrole>
- **Testing Library — *Async Methods*.** `findBy*`, `waitFor`, `waitForElementToBeRemoved`, con el `timeout: 1000` e `interval: 50` por defecto. <https://testing-library.com/docs/dom-testing-library/api-async/>
- **Testing Playground.** UI para descubrir qué query encaja con un DOM dado; se abre desde `screen.logTestingPlaygroundURL()`. <https://testing-playground.com/>
- **Kent C. Dodds — *Common Mistakes with React Testing Library*.** Anti-patrones aplicables también a Angular y Vue: abuso de `container.querySelector`, `data-testid` innecesario, olvido de `screen`. <https://kentcdodds.com/blog/common-mistakes-with-react-testing-library>

> Bibliografía completa del taller en [`15-referencias.md`](./15-referencias.md).

### Siguiente paso

Con esto ya tienes cubierta la parte de encontrar elementos; lo que falta es interactuar con ellos (clicks, teclado, formularios, drag & drop). Eso vive en [`06-eventos-de-usuario.md`](./06-eventos-de-usuario.md), donde entramos en `userEvent` v14, el patrón `setup()` que recomienda la v14 y por qué en la práctica casi nunca quieres volver a `fireEvent`.

---

