# Snapshots y Accesibilidad

> Taller 1 — Fundamentos del Testing Frontend | Sección 8
>
> **Modalidad Diátaxis:** mezcla deliberada de *how-to* (snapshots) + *explanation* (accesibilidad). Dos temas cortos que comparten archivo porque ambos protegen el contrato visible del componente: uno contra cambios de estructura, otro contra regresiones semánticas.
>
> **Por qué importa para tu mutation score:** un snapshot de 200 líneas "mata" mutantes por accidente (cualquier cambio rompe el test, sin discriminar). Un snapshot pequeño y dirigido, o mejor un test con `getByRole` + `jest-axe`, ejerce el contrato real y deja que Stryker detecte el `Disabled` invertido, el `aria-label` borrado o el `<button>` convertido en `<div>`. El archivo 05 ya estableció la conexión query accesible ↔ mutante; aquí la extendemos al HTML estructural y a la auditoría automática.
>
> **Prerrequisitos:** archivos 04 (render), 05 (queries) y 06 (userEvent).
>
> **Tiempo estimado:** 15 min.
>
> **Validado con:** Vitest 4.1.x, `jest-axe` 10.x / `vitest-axe` 1.x, Angular 17–21, Vue 3, React 19 con Testing Library 16 y happy-dom.

---

## 1 · Snapshots con Vitest 4

Un snapshot guarda el output de un test y lo compara con la versión grabada la primera vez. Si el output cambia, el test falla y Vitest te ofrece actualizar el snapshot. Vitest 4 expone tres APIs distintas, y cada una cubre un caso diferente.

### 1.1 · Las tres APIs: cuándo usar cada una

| API | Dónde vive el snapshot | Úsala cuando... | Evítala cuando... |
|---|---|---|---|
| `toMatchInlineSnapshot()` | Inline en el test (string literal) | El output es **pequeño** (≤ 20 líneas) y quieres que el test sea autocontenido | El output tiene > 20 líneas — el test se vuelve ilegible |
| `toMatchSnapshot()` | Archivo `__snapshots__/*.snap` | Output medio, varias variantes en el mismo test | El `.snap` crece a > 500 líneas — nadie lo revisa |
| `toMatchFileSnapshot('ruta')` | Archivo con extensión real (`.html`, `.json`) | Output grande que quieres abrir con su propia sintaxis (HTML, SQL, JSON) | El contenido es binario o demasiado volátil |

**Regla práctica:** si el snapshot no cabe entero en pantalla sin scroll, ya no es un test; es un backup del DOM disfrazado de aserción.

### 1.2 · Angular: snapshot de un fragmento

```typescript
// counter.component.spec.ts
import { render, screen } from '@testing-library/angular';
import { describe, it, expect } from 'vitest';
import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  it('renderiza la etiqueta del botón incrementar', async () => {
    await render(CounterComponent, { inputs: { initialValue: 0 } });

    // ← Acotamos el snapshot al botón, NO al componente entero
    const incrementBtn = screen.getByRole('button', { name: /incrementar/i });
    expect(incrementBtn.outerHTML).toMatchInlineSnapshot(
      `"<button type="button" aria-label="Incrementar">+</button>"`,
    );
  });
});
```

### 1.3 · Vue: snapshot de un fragmento

```typescript
// Counter.spec.ts
import { render, screen } from '@testing-library/vue';
import { describe, it, expect } from 'vitest';
import Counter from './Counter.vue';

describe('Counter', () => {
  it('renderiza la etiqueta del contador', () => {
    render(Counter, { props: { initialValue: 0 } });

    const status = screen.getByRole('status');
    expect(status.textContent).toMatchInlineSnapshot(`"Contador: 0"`);
  });
});
```

### 1.4 · React: snapshot de un fragmento

```tsx
// Counter.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Counter } from './Counter'

describe('Counter', () => {
  it('renderiza la etiqueta del contador', () => {
    render(<Counter initialValue={0} />)

    const status = screen.getByRole('status')
    expect(status.textContent).toMatchInlineSnapshot(`"Contador: 0"`)
  })
})
```

La API de snapshot es idéntica en los tres frameworks; lo que cambia es cómo montas el componente. En React obtienes el contenedor con `render` de `@testing-library/react` y consultas el DOM con las mismas queries que ya viste en el archivo 05.

### 1.5 · `toMatchFileSnapshot` para outputs grandes

Solo útil cuando el output es propiamente HTML, SQL o JSON y quieres abrirlo con su highlight nativo:

```typescript
it('genera el fragmento de factura', async () => {
  const html = await renderInvoiceFragment({ total: 1299 });
  await expect(html).toMatchFileSnapshot('./__snapshots__/invoice.html');
});
```

> **Preferencia por defecto:** empieza por `toMatchInlineSnapshot` para fragmentos pequeños. Si tienes varios snapshots en el mismo archivo, pasa a `toMatchSnapshot`. Deja `toMatchFileSnapshot` para HTML o JSON grandes que te interese abrir con resaltado de sintaxis propio.

### 1.6 · Custom serializers (opcional)

Cuando el output incluye ruido no determinista (IDs generados, fechas, clases hash), registra un serializer para normalizarlo:

```typescript
// vitest.setup.ts
import { expect } from 'vitest';

expect.addSnapshotSerializer({
  test: (val) => typeof val === 'string' && /id="ng-\d+"/.test(val),
  serialize: (val) => val.replace(/id="ng-\d+"/g, 'id="ng-[dynamic]"'),
});
```

Registrarlo en `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
    snapshotSerializers: ['./serializers/normalize-angular-ids.ts'],
  },
});
```

> **Cuándo vale la pena un serializer:** cuando te des cuenta de que actualizas el mismo snapshot en cada PR por puro ruido no funcional. Si solo hay 2 tests afectados, arregla el test; no montes un serializer.

---

## 2 · Cuándo usar snapshots (y cuándo no)

### Úsalos cuando

- El componente es **estable** y cambia raramente (un `Badge`, un icono, un breadcrumb).
- Quieres detectar **cambios involuntarios** en un fragmento pequeño y bien delimitado.
- El output es **determinista** (sin fechas, sin IDs aleatorios, sin hashes).

### Evítalos cuando

- El componente cambia con frecuencia — vivirás actualizando snapshots.
- El output es grande — nadie revisa un snapshot de 500 líneas en un PR.
- Quieres verificar **comportamiento** (para eso, `userEvent` + aserciones sobre roles).
- Hay datos dinámicos sin normalizar.

### 2.1 · Anti-patrones que destrozan el mutation score

> **⚠ Esto es lo que importa para Vitaly.**

| Anti-patrón | Por qué es malo | Qué hacer |
|---|---|---|
| **Snapshot del componente entero** | Un mutante que invierta `disabled` en un botón pasa el test si el atributo estaba en el snapshot — el test "muere", pero sin discriminar nada útil. Además, cualquier refactor estético rompe el test. | Snapshot solo del **fragmento crítico** (un botón, una cabecera). |
| **Snapshots gigantes (> 50 líneas)** | Matan mutantes por accidente: cualquier cambio los rompe. Stryker no sabe distinguir un mutante killed "por mérito" de uno killed "por ruido". El mutation score **sube artificialmente** sin que la suite sea mejor. | Tests de comportamiento con `getByRole` + `userEvent`. El snapshot, si acaso, para un detalle puntual. |
| **Snapshot como sustituto de tests reales** | Da falsa sensación de cobertura. Cuando falla, el dev hace `-u` sin mirar. | Tests explícitos sobre texto, roles y atributos accesibles. |
| **Snapshot con fechas / IDs sin serializer** | El test es flakey y se actualiza "a mano" cada sprint. | Serializer que normalice, o directamente no hacer snapshot. |

> **Regla:** antes de dejar un `toMatchSnapshot` en un test, pregúntate qué mutante mata ese snapshot que no mataría un assert explícito sobre rol, texto o atributo. Si no se te ocurre ninguno útil, bórralo.

### 2.2 · Snapshot obsolescence y flujo en PR

- Vitest marca como **obsoletos** los snapshots cuyo `it()` ya no existe. Ejecuta `vitest --update` (o `-u`) para limpiarlos. En CI, `vitest run` **falla** si hay snapshots obsoletos; esa es tu red de seguridad contra el `-u` sin revisar.
- En modo watch, pulsa `u` para actualizar el snapshot fallido del test activo, o `i` para actualizarlos uno a uno y revisar cada diff.
- **Revisa los diffs de `.snap` en cada PR** con la misma atención que el código. Hacer `-u` sin leer la diferencia es una forma cómoda de meter regresiones en main.
- **Interacción con Stryker:** un snapshot grande infla tu mutation score sin mejorar la suite. Si ves que el score sube tras añadir snapshots pero los bugs siguen llegando a producción, estás viendo exactamente este anti-patrón. El detalle está en [`14-mutation-testing-stryker.md`](./14-mutation-testing-stryker.md), sección "Mutantes killed por ruido".

---

## 3 · Accesibilidad en tests

En el archivo [`05-queries-testing-library.md`](./05-queries-testing-library.md) ya montaste la base: `getByRole` y `getByLabelText` son las queries más accesibles, y también son las que más mutantes matan. Aquí añades dos capas encima:

1. **Auditoría automática** del árbol de accesibilidad con `jest-axe` / `vitest-axe`.
2. **Assertions dirigidas** sobre el árbol ARIA con `toMatchAriaSnapshot()` (Vitest 4.1.4+).

Los tests de teclado (`user.tab`, `user.keyboard`) viven en [`06-eventos-de-usuario.md`](./06-eventos-de-usuario.md); no los duplicamos aquí.

### 3.1 · Dos tipos de test de accesibilidad (no confundirlos)

| Tipo | Herramienta | Qué detecta | Qué NO detecta |
|---|---|---|---|
| **Comportamiento accesible** | `getByRole` + `userEvent` (archivos 05, 06) | Que el elemento **correcto** reaccione cuando el usuario lo usa como un usuario real | Contraste de color, jerarquía de headings rota, aria-label duplicados |
| **Auditoría estática del árbol ARIA** | `jest-axe` / `vitest-axe` + reglas WCAG | Violaciones objetivas de WCAG: labels ausentes, contraste, roles inválidos, landmark duplicados | Que la interacción funcione (un form accesible puede tener `onSubmit` roto) |

**Los dos tipos se complementan.** Un componente sin violaciones de axe puede tener un bug de lógica perfectamente funcional, y un test de `userEvent` no ve un contraste 3:1 aunque le pases por encima. Necesitas los dos.

### 3.2 · `jest-axe` / `vitest-axe`: instalación

Los dos paquetes son wrappers de `axe-core`, el motor que mantiene Deque Systems y que documenta con detalle pedagógico cada regla de accesibilidad en Deque University. En la práctica se usan igual. `vitest-axe` es el fork activo, pensado para Vitest 4 y con matchers ya tipados.

> El catálogo completo de reglas de axe, con explicación, impacto y cómo arreglarlas, vive en el listado oficial.
>
> > **Fuente:** Deque University, *axe-core Rules Reference*. <https://dequeuniversity.com/rules/axe/>

```bash
# Opción A (más extendida, funciona con Vitest sin problemas)
npm i -D jest-axe @types/jest-axe

# Opción B (tipado específico para Vitest)
npm i -D vitest-axe
```

Configuración en `vitest.setup.ts`:

```typescript
// vitest.setup.ts
import { expect } from 'vitest';
import { toHaveNoViolations } from 'jest-axe'; // o 'vitest-axe/matchers'

expect.extend({ toHaveNoViolations });
```

Y registrarlo en `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

### 3.3 · Angular: auditoría con `jest-axe`

```typescript
// login-form.component.spec.ts
import { render } from '@testing-library/angular';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { LoginFormComponent } from './login-form.component';

describe('LoginFormComponent · Accesibilidad', () => {
  it('no tiene violaciones de WCAG 2.1 AA', async () => {
    const { container } = await render(LoginFormComponent);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 3.4 · Vue: auditoría con `jest-axe`

```typescript
// LoginForm.spec.ts
import { render } from '@testing-library/vue';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import LoginForm from './LoginForm.vue';

describe('LoginForm · Accesibilidad', () => {
  it('no tiene violaciones de WCAG 2.1 AA', async () => {
    const { container } = render(LoginForm);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 3.5 · React: auditoría con `jest-axe`

```tsx
// LoginForm.test.tsx
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'
import { describe, it, expect } from 'vitest'
import { LoginForm } from './LoginForm'

describe('LoginForm · Accesibilidad', () => {
  it('no tiene violaciones de WCAG 2.1 AA', async () => {
    const { container } = render(<LoginForm />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
```

`jest-axe` recibe un nodo DOM, así que funciona igual en los tres frameworks. La única diferencia es de dónde sale el `container`: en React lo devuelve el `render` de `@testing-library/react` después de montar el JSX.

### 3.6 · Configurar las reglas de axe

Por defecto `axe` corre contra WCAG 2.1 A y AA, que es el mínimo exigible en la mayoría de proyectos. Si quieres restringir el conjunto o desactivar una regla concreta:

```typescript
const results = await axe(container, {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, // nivel AA explícito
  rules: {
    'color-contrast': { enabled: false }, // happy-dom no renderiza estilos → desactivar
  },
});
```

> **⚠ Cuidado con `color-contrast`:** ni happy-dom ni jsdom implementan el layout CSS ni los estilos computados que axe necesita para medir el contraste. En la práctica, la regla genera falsos negativos en tests unitarios. Es un límite conocido del entorno DOM simulado, discutido en el issue tracker de `axe-core` y en la documentación de Testing Library. Desactívala aquí y lleva la auditoría de contraste a tests visuales (Chromatic, Percy), Lighthouse o el addon a11y de Storybook.
>
> > **Fuente:** dequelabs/axe-core en GitHub, [limitaciones de jsdom con `color-contrast`](https://github.com/dequelabs/axe-core/issues) · Testing Library, *FAQ sobre entornos DOM simulados*. <https://testing-library.com/docs/>

### 3.7 · `toMatchAriaSnapshot()` (Vitest 4.1.4+)

Novedad de Vitest 4: el snapshot guarda solo el árbol ARIA visible, no el HTML. Para accesibilidad es bastante más estable que `toMatchInlineSnapshot`, porque ignora el ruido de clases CSS y los IDs generados por el framework.

```typescript
it('expone el árbol ARIA esperado', async () => {
  await render(CounterComponent, { inputs: { initialValue: 3 } });

  await expect(document.body).toMatchAriaSnapshot(`
    - status: "Contador: 3"
    - button "Incrementar"
    - button "Decrementar"
  `);
});
```

> **Cuándo elegirlo:** cuando quieras bloquear la estructura semántica del componente (roles y nombres accesibles) sin atarte al HTML concreto. Sobrevive a refactors de clases CSS y a cambios de markup que no tocan la semántica. Funciona bien como contrato de accesibilidad del componente.

---

## 4 · Ejemplo completo: Counter accesible (Angular + Vue + React)

### 4.1 · Template Angular

```html
<!-- counter.component.html -->
<div role="group" aria-labelledby="counter-title">
  <h2 id="counter-title">Contador</h2>
  <p role="status" aria-live="polite">Contador: {{ value() }}</p>
  <button type="button" (click)="decrement()" aria-label="Decrementar">-</button>
  <button type="button" (click)="increment()" aria-label="Incrementar">+</button>
</div>
```

### 4.2 · Template Vue

```vue
<!-- Counter.vue -->
<template>
  <div role="group" aria-labelledby="counter-title">
    <h2 id="counter-title">Contador</h2>
    <p role="status" aria-live="polite">Contador: {{ value }}</p>
    <button type="button" aria-label="Decrementar" @click="decrement">-</button>
    <button type="button" aria-label="Incrementar" @click="increment">+</button>
  </div>
</template>
```

### 4.3 · Componente React

```tsx
// Counter.tsx
import { useState } from 'react'

export function Counter({ initialValue = 0 }: { initialValue?: number }) {
  const [value, setValue] = useState(initialValue)

  return (
    <div role="group" aria-labelledby="counter-title">
      <h2 id="counter-title">Contador</h2>
      <p role="status" aria-live="polite">Contador: {value}</p>
      <button type="button" aria-label="Decrementar" onClick={() => setValue(v => v - 1)}>-</button>
      <button type="button" aria-label="Incrementar" onClick={() => setValue(v => v + 1)}>+</button>
    </div>
  )
}
```

### 4.4 · Test de comportamiento + axe + aria snapshot (Angular)

```typescript
// counter.component.spec.ts
import { render, screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { CounterComponent } from './counter.component';

describe('CounterComponent', () => {
  it('incrementa cuando el usuario pulsa el botón', async () => {
    const user = userEvent.setup();
    await render(CounterComponent, { inputs: { initialValue: 0 } });

    await user.click(screen.getByRole('button', { name: /incrementar/i }));

    expect(screen.getByRole('status')).toHaveTextContent('Contador: 1');
  });

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = await render(CounterComponent, {
      inputs: { initialValue: 0 },
    });

    const results = await axe(container, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results).toHaveNoViolations();
  });

  it('mantiene el contrato ARIA esperado', async () => {
    await render(CounterComponent, { inputs: { initialValue: 0 } });

    await expect(document.body).toMatchAriaSnapshot(`
      - group "Contador":
        - heading "Contador" [level=2]
        - status: "Contador: 0"
        - button "Decrementar"
        - button "Incrementar"
    `);
  });
});
```

La versión Vue es idéntica; solo cambia `@testing-library/angular` por `@testing-library/vue` y ajusta la firma de `render`.

### 4.5 · Test de comportamiento + axe + aria snapshot (React)

```tsx
// Counter.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { describe, it, expect } from 'vitest'
import { Counter } from './Counter'

describe('Counter', () => {
  it('incrementa cuando el usuario pulsa el botón', async () => {
    const user = userEvent.setup()
    render(<Counter initialValue={0} />)

    await user.click(screen.getByRole('button', { name: /incrementar/i }))

    expect(screen.getByRole('status')).toHaveTextContent('Contador: 1')
  })

  it('no tiene violaciones de accesibilidad', async () => {
    const { container } = render(<Counter initialValue={0} />)

    const results = await axe(container, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results).toHaveNoViolations()
  })

  it('mantiene el contrato ARIA esperado', async () => {
    render(<Counter initialValue={0} />)

    await expect(document.body).toMatchAriaSnapshot(`
      - group "Contador":
        - heading "Contador" [level=2]
        - status: "Contador: 0"
        - button "Decrementar"
        - button "Incrementar"
    `)
  })
})
```

Los tres tests son los mismos que en Angular y Vue. La auditoría de axe y el `toMatchAriaSnapshot` se apoyan en el DOM final, así que la lógica se traslada tal cual: solo cambia el mounting.

---

## 5 · Síntesis

| Situación | Herramienta |
|---|---|
| Bloquear un fragmento HTML pequeño y estable | `toMatchInlineSnapshot` |
| Bloquear HTML grande con resaltado (HTML/JSON) | `toMatchFileSnapshot` |
| Bloquear el **contrato semántico** sin acoplarse al HTML | `toMatchAriaSnapshot` (Vitest 4.1.4+) |
| Detectar violaciones WCAG 2.1 AA objetivas | `jest-axe` / `vitest-axe` |
| Verificar que la interacción funciona con el rol correcto | `getByRole` + `userEvent` (archivos 05, 06) |
| Navegación por teclado | `user.tab`, `user.keyboard` (archivo 06) |

**Checklist al cerrar un componente:**

- [ ] Existe al menos un test de comportamiento con `getByRole` + `userEvent`.
- [ ] Existe un test de `jest-axe` que pasa con WCAG 2.1 AA.
- [ ] Si hay snapshot, cubre **un fragmento pequeño** y no el componente entero.
- [ ] Si se usa `toMatchAriaSnapshot`, sustituye al snapshot HTML, no lo duplica.
- [ ] El `.snap` (si existe) cabe en una pantalla.

---

## 6 · Referencias

- Vitest — Snapshot: <https://vitest.dev/guide/snapshot>
- Vitest — `toMatchAriaSnapshot`: <https://vitest.dev/api/expect#tomatchariasnapshot>
- `jest-axe` (compatible con Vitest): <https://github.com/nickcolley/jest-axe>
- `vitest-axe`: <https://www.npmjs.com/package/vitest-axe>
- axe-core rules: <https://dequeuniversity.com/rules/axe/>
- WCAG 2.1 Quick Reference: <https://www.w3.org/WAI/WCAG21/quickref/>
- Testing Library — ByRole (archivo 05 ya lo cubre): [`05-queries-testing-library.md`](./05-queries-testing-library.md)

---

## Fuentes

- Deque Systems, *axe-core Rules Reference* (Deque University). Catálogo canónico de reglas de axe. <https://dequeuniversity.com/rules/axe/>
- dequelabs/axe-core, *repositorio y issue tracker* en GitHub. Discusión sobre los límites de `color-contrast` en entornos DOM simulados. <https://github.com/dequelabs/axe-core>
- Testing Library, *documentación oficial*. Recomendaciones para elegir entorno DOM en tests unitarios. <https://testing-library.com/docs/>
- Vitest, *Snapshot guide* y *`toMatchAriaSnapshot` API*. Referencia oficial para las tres APIs de snapshot de Vitest 4.1+. <https://vitest.dev/guide/snapshot> y <https://vitest.dev/api/expect#tomatchariasnapshot>
- W3C, *WCAG 2.1 Quick Reference*. Criterios oficiales contra los que corre axe por defecto en nivel A y AA. <https://www.w3.org/WAI/WCAG21/quickref/>

---
