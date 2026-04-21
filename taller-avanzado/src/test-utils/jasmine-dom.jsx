// ============================================================
// jasmine-dom · helpers minimos para testear React en Karma
//
// Mini-toolkit para montar React y disparar eventos desde
// Jasmine. Permite:
//
//   1. Montar un componente React sobre un `<div>`.
//   2. Correr un hook en aislamiento.
//   3. Disparar eventos del DOM de forma que React los procese.
//
// Para las queries se usa la API nativa del DOM:
// `container.querySelector`, `textContent`, `getAttribute`.
//
// Exportado:
//   mountComponent(jsx)     → { container, unmount, rerender }
//   runHook(cb, options?)   → { result, rerender, unmount }
//   clickEl(el)             → mousedown + mouseup + click
//   setInputValue(el, v)    → value + input + change (via setter nativo)
//   focusEl(el) / blurEl(el)
//   flushMicrotasks(n?)     → await Promise.resolve() × n
// ============================================================

import { createRoot } from 'react-dom/client'
import { act } from 'react'

// React 18 exige esta flag o emite warnings ruidosos con act().
if (typeof globalThis !== 'undefined') {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true
}

export function mountComponent(jsx, options) {
  options = options || {}
  const container = options.container || document.createElement('div')
  if (!container.parentNode) document.body.appendChild(container)
  const root = createRoot(container)
  act(() => { root.render(jsx) })
  return {
    container,
    rerender: (nextJsx) => act(() => { root.render(nextJsx) }),
    unmount: () => {
      act(() => root.unmount())
      if (container.parentNode === document.body) {
        document.body.removeChild(container)
      }
    },
  }
}

// Monta un componente sonda que llama al callback y guarda el
// resultado en `result.current`, permitiendo ejecutar hooks en
// aislamiento.
//
// Soporta un `wrapper` (para Context Providers) y `initialProps`
// (para hooks que toman argumentos y queremos re-renderizar con
// otros valores).
export function runHook(callback, options) {
  options = options || {}
  const result = { current: undefined }
  const Wrapper = options.wrapper || PassThroughWrapper

  function HookProbe(props) {
    result.current = callback(props.args)
    return null
  }

  let currentArgs = options.initialProps
  const mounted = mountComponent(
    <Wrapper><HookProbe args={currentArgs} /></Wrapper>,
  )

  return {
    result,
    rerender: (nextArgs) => {
      currentArgs = nextArgs
      mounted.rerender(
        <Wrapper><HookProbe args={currentArgs} /></Wrapper>,
      )
    },
    unmount: mounted.unmount,
  }
}

function PassThroughWrapper(props) {
  return props.children
}

// React 18 intercepta el `value` de un input por referencia. Si
// cambias `input.value = ...` directamente, React detecta "no
// cambio" y no dispara onChange. Hay que usar el setter NATIVO
// del prototipo. Es un gotcha clasico; por eso la helper existe.
export function setInputValue(el, value) {
  const proto = el.tagName === 'TEXTAREA'
    ? window.HTMLTextAreaElement.prototype
    : window.HTMLInputElement.prototype
  const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value').set
  act(() => {
    nativeSetter.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

export function clickEl(el) {
  act(() => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

export function focusEl(el) {
  act(() => {
    el.focus()
    // jsdom/Chrome a veces no dispara los eventos sinteticos a
    // tiempo; forzamos los correctos.
    el.dispatchEvent(new FocusEvent('focus', { bubbles: false }))
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
}

export function blurEl(el) {
  act(() => {
    el.blur()
    el.dispatchEvent(new FocusEvent('blur', { bubbles: false }))
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

// Drena microtasks pendientes. Util para combinarlo con
// `jasmine.clock().tick()` cuando hay Promises dentro del
// callback del timer (p.ej. debounce → fetch).
//
// Lo envolvemos en `act(async ...)` porque las Promises que
// resolvemos aqui casi siempre disparan setState en hooks
// (p.ej. `setResults` tras un fetch resuelto). Sin el `act`,
// React 18 escupe "An update was not wrapped in act(...)".
export async function flushMicrotasks(times) {
  const n = times || 3
  await act(async () => {
    for (let i = 0; i < n; i++) {
      // eslint-disable-next-line no-await-in-loop
      await Promise.resolve()
    }
  })
}

// Duerme `ms` dentro de un `act()`. Util dentro de loops de
// polling (`waitForEl`) para que las updates que resuelvan
// durante el sleep se contabilicen dentro del act-environment.
export async function sleepInAct(ms) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms))
  })
}
