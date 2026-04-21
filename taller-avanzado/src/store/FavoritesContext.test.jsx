// ============================================================
// FavoritesContext · tests del Provider + hook (Vitest)
//
// Patron:
//   - Testeamos el hook consumidor (`useFavorites`) con
//     `renderHook` + un `wrapper` que monta el Provider.
//   - Inyectamos un `storage` fake para aislar los tests del
//     localStorage real del navegador — una ventaja clarisima
//     frente a setear globales desde fuera.
// ============================================================

import { renderHook, act } from '@testing-library/react'
import { FavoritesProvider, useFavorites } from './FavoritesContext'

const madrid = { name: 'Madrid', lat: 40.41, lon: -3.70 }
const lisbon = { name: 'Lisbon', lat: 38.72, lon: -9.14 }

function createFakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((k) => (data.has(k) ? data.get(k) : null)),
    setItem: vi.fn((k, v) => data.set(k, v)),
    removeItem: vi.fn((k) => data.delete(k)),
    _data: data,
  }
}

function wrapperWith(storage) {
  return function Wrapper({ children }) {
    return <FavoritesProvider storage={storage}>{children}</FavoritesProvider>
  }
}

describe('FavoritesContext', () => {
  describe('Cuando se usa fuera del Provider', () => {
    it('deberia lanzar un error explicativo', () => {
      // Silenciamos el error.log que React pinta al renderizar con throw.
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => renderHook(() => useFavorites())).toThrow(
        /useFavorites debe usarse dentro de <FavoritesProvider>/,
      )

      spy.mockRestore()
    })
  })

  describe('Cuando el Provider monta sin datos previos', () => {
    it('deberia empezar con favoritos vacios', () => {
      const storage = createFakeStorage()

      const { result } = renderHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      expect(result.current.favorites).toEqual([])
    })
  })

  describe('Cuando se anade una ciudad', () => {
    it('deberia aparecer en `favorites` e `isFavorite` ser true', () => {
      const storage = createFakeStorage()

      const { result } = renderHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      act(() => result.current.addFavorite(madrid))

      expect(result.current.favorites).toEqual([madrid])
      expect(result.current.isFavorite(madrid)).toBe(true)
    })

    it('deberia persistir el cambio en el storage inyectado', () => {
      const storage = createFakeStorage()

      const { result } = renderHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      act(() => result.current.addFavorite(madrid))

      expect(storage.setItem).toHaveBeenCalledWith(
        'weather.favorites.v1',
        JSON.stringify([madrid]),
      )
    })
  })

  describe('Cuando se usa toggleFavorite', () => {
    it('deberia alternar entre anadir y quitar', () => {
      const storage = createFakeStorage()

      const { result } = renderHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      act(() => result.current.toggleFavorite(madrid))
      expect(result.current.isFavorite(madrid)).toBe(true)

      act(() => result.current.toggleFavorite(madrid))
      expect(result.current.isFavorite(madrid)).toBe(false)
    })
  })

  describe('Cuando hay datos previos en el storage', () => {
    it('deberia hidratar `favorites` al montar', () => {
      const storage = createFakeStorage({
        'weather.favorites.v1': JSON.stringify([madrid, lisbon]),
      })

      const { result } = renderHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      expect(result.current.favorites).toEqual([madrid, lisbon])
    })

    it('deberia ignorar JSON corrupto y empezar vacio', () => {
      const storage = createFakeStorage({
        'weather.favorites.v1': '{not-json',
      })

      const { result } = renderHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      expect(result.current.favorites).toEqual([])
    })
  })

  describe('Cuando se llama a clearFavorites', () => {
    it('deberia vaciar la lista', () => {
      const storage = createFakeStorage({
        'weather.favorites.v1': JSON.stringify([madrid, lisbon]),
      })

      const { result } = renderHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      act(() => result.current.clearFavorites())

      expect(result.current.favorites).toEqual([])
    })
  })
})
