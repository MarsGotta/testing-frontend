// =================================================================
// Tests del hook useUnit con Jasmine sobre Karma.
//
// Para ejercitar un hook en aislamiento usamos la mini-helper
// `runHook` (src/test-utils/jasmine-dom.jsx), que monta por
// dentro un componente sonda con `createRoot().render()` y expone
// el resultado del hook en `result.current`.
//
// `act()` se importa de `react` (React 18.3+ lo expone ahi; antes
// estaba en `react-dom/test-utils`, ahora deprecado).
// =================================================================

import { act } from 'react'
import { runHook } from '../test-utils/jasmine-dom'
import { useUnit } from './useUnit'

describe('useUnit (Jasmine)', () => {
  describe('Cuando se inicializa', () => {
    it('deberia empezar en celsius', () => {
      const { result } = runHook(() => useUnit())

      expect(result.current.unit).toBe('celsius')
      expect(result.current.symbol).toBe('°C')
    })
  })

  describe('Cuando se cambia la unidad', () => {
    it('deberia alternar entre celsius y fahrenheit', () => {
      const { result } = runHook(() => useUnit())

      act(() => result.current.toggleUnit())

      expect(result.current.unit).toBe('fahrenheit')
      expect(result.current.symbol).toBe('°F')

      act(() => result.current.toggleUnit())

      expect(result.current.unit).toBe('celsius')
      expect(result.current.symbol).toBe('°C')
    })
  })
})
