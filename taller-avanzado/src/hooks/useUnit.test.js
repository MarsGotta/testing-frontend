import { renderHook, act } from '@testing-library/react'
import { useUnit } from './useUnit'

describe('useUnit', () => {
  describe('Cuando se inicializa', () => {
    it('deberia empezar en celsius', () => {
      const { result } = renderHook(() => useUnit())

      expect(result.current.unit).toBe('celsius')
      expect(result.current.symbol).toBe('°C')
    })
  })

  describe('Cuando se cambia la unidad', () => {
    it('deberia alternar entre celsius y fahrenheit', () => {
      const { result } = renderHook(() => useUnit())

      act(() => result.current.toggleUnit())

      expect(result.current.unit).toBe('fahrenheit')
      expect(result.current.symbol).toBe('°F')

      act(() => result.current.toggleUnit())

      expect(result.current.unit).toBe('celsius')
      expect(result.current.symbol).toBe('°C')
    })
  })
})
