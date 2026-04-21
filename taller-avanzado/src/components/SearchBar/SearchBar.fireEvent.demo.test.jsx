// ============================================================
// SearchBar · demo comparativa `fireEvent` vs `userEvent`
//
// Los dos tests de este archivo verifican LO MISMO: que el
// componente dispara `onQueryChange` cuando el usuario escribe.
// La diferencia está en CÓMO se simula la escritura.
//
//   · fireEvent.change(input, { target: { value: 'Madrid' } })
//       → sincrónico. Dispara UN solo evento `change`.
//       → NO simula keydown/keypress/input/keyup.
//       → Si el componente tiene un handler `onInput`
//         o debounce que se resetea con cada pulsación,
//         fireEvent no lo activa correctamente.
//
//   · const user = userEvent.setup(); await user.type(input, 'Madrid')
//       → asíncrono. Dispara keydown/keypress/input/keyup POR CADA
//         carácter, más el focus y los eventos de teclado reales.
//       → Detecta handlers que fireEvent no ve.
//       → Es la forma recomendada desde user-event 14.
//
// Por qué subir de fireEvent a userEvent sube el mutation score:
//   · Los tests con fireEvent tienden a dejar mutantes del tipo
//     BlockStatement/ConditionalExpression vivos en el handler
//     de input, porque solo disparan la vía `change` final.
//   · userEvent activa todas las vías reales del teclado, así
//     que los tests cubren más ramas del componente.
//
// En la demo: proyectar los dos tests lado a lado, explicar la
// tabla de eventos disparados y conectar con S11 de la guía
// interactiva (sección "userEvent 14 es async").
// ============================================================

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from './SearchBar'

const defaultProps = {
  query: '',
  onQueryChange: vi.fn(),
  results: [],
  loading: false,
  onSelectCity: vi.fn(),
}

afterEach(() => {
  vi.restoreAllMocks()
})

// ────────────────────────────────────────────────────────────
// Enfoque A · fireEvent (API clásica, sincrónica)
// ────────────────────────────────────────────────────────────
describe('SearchBar · escritura con fireEvent', () => {
  it('dispara onQueryChange cuando el usuario "escribe" con fireEvent.change', () => {
    const onQueryChange = vi.fn()
    render(<SearchBar {...defaultProps} onQueryChange={onQueryChange} />)

    const input = screen.getByLabelText('Buscar ciudad')

    // fireEvent.change salta directo al valor final: UN solo evento,
    // sin keystrokes intermedios. Los handlers onKeyDown, onKeyUp,
    // onInput específicos del campo NO se activarían con esto.
    fireEvent.change(input, { target: { value: 'Madrid' } })

    // El assert pasa porque el componente usa onChange, pero si
    // hubiera lógica en onKeyDown este test no la cubriría.
    expect(onQueryChange).toHaveBeenCalledTimes(1)
    expect(onQueryChange).toHaveBeenCalledWith('Madrid')
  })
})

// ────────────────────────────────────────────────────────────
// Enfoque B · userEvent 14 (API moderna, asíncrona)
// ────────────────────────────────────────────────────────────
describe('SearchBar · escritura con userEvent', () => {
  it('dispara onQueryChange una vez por cada carácter con user.type', async () => {
    const onQueryChange = vi.fn()
    // userEvent 14: SIEMPRE `setup()` al principio, y todas las
    // interacciones con `await`.
    const user = userEvent.setup()

    render(<SearchBar {...defaultProps} onQueryChange={onQueryChange} />)

    const input = screen.getByLabelText('Buscar ciudad')

    // userEvent.type simula al usuario pulsando 6 teclas. Por cada
    // carácter dispara: keydown → keypress → input → keyup.
    // El componente ejecuta su onChange 6 veces.
    await user.type(input, 'Madrid')

    // Verificación más fina: cada pulsación provocó una llamada
    // con el prefijo acumulado. Esto no lo puede detectar fireEvent.change.
    expect(onQueryChange).toHaveBeenCalledTimes(6)
    expect(onQueryChange.mock.calls.map((c) => c[0])).toEqual([
      'M',
      'a',
      'd',
      'r',
      'i',
      'd',
    ])
    // (El componente recibe la letra individual porque `query` es
    //  una prop controlada desde fuera y aquí no la actualizamos
    //  entre llamadas — eso basta para la demo.)
  })

  it('mantiene el comportamiento async de user-event 14', async () => {
    const user = userEvent.setup()
    const onQueryChange = vi.fn()

    render(<SearchBar {...defaultProps} onQueryChange={onQueryChange} />)

    // ⚠ Error clásico: olvidar el `await`. Si lo quitas, el test
    //   sigue en verde pero el `onQueryChange` aún no se ha
    //   ejecutado cuando llega el expect. Mostrar este anti-patrón
    //   en la demo comentando/descomentando el `await`.
    await user.type(screen.getByLabelText('Buscar ciudad'), 'M')

    expect(onQueryChange).toHaveBeenCalled()
  })
})
