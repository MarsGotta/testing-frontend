// =================================================================
// Tests del FavoritesContext con Jasmine sobre Karma.
//
// Ejercitamos `useFavorites` con `runHook` de la mini-helper
// `src/test-utils/jasmine-dom.jsx`. La opcion `wrapper` sirve
// para montar el `FavoritesProvider` alrededor del hook sonda.
// `act()` se importa de `react` (React 18.3+).
//
// Inyectamos un storage fake (con `jasmine.createSpy` para poder
// asertar sobre `setItem`/`getItem`) en lugar de depender del
// `localStorage` real del navegador headless.
// =================================================================

import { act } from 'react'
import { runHook } from '../test-utils/jasmine-dom'
import { FavoritesProvider, useFavorites } from './FavoritesContext'

const madrid = { name: 'Madrid', lat: 40.41, lon: -3.70 }
const lisbon = { name: 'Lisbon', lat: 38.72, lon: -9.14 }

function createFakeStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: jasmine.createSpy('getItem').and.callFake(function (k) {
      return data.has(k) ? data.get(k) : null
    }),
    setItem: jasmine.createSpy('setItem').and.callFake(function (k, v) {
      data.set(k, v)
    }),
    removeItem: jasmine.createSpy('removeItem').and.callFake(function (k) {
      data.delete(k)
    }),
    _data: data,
  }
}

function wrapperWith(storage) {
  return function Wrapper(props) {
    return <FavoritesProvider storage={storage}>{props.children}</FavoritesProvider>
  }
}

describe('FavoritesContext (Jasmine)', () => {
  // -----------------------------------------------------------------
  // Escenario omitido: "useFavorites fuera del Provider lanza error".
  //
  // React 18 propaga los errores de render a `window.onerror`
  // ademas de relanzarlos sincronamente, y Karma los captura como
  // "Uncaught Error" marcando el test como fallido aunque la
  // asercion pase. Silenciarlo limpiamente requeriria un
  // ErrorBoundary propio, cosa que ensuciaria el test, asi que
  // este caso no se cubre aqui.
  // -----------------------------------------------------------------

  describe('Cuando el Provider monta sin datos previos', () => {
    it('deberia empezar con favoritos vacios', () => {
      const storage = createFakeStorage()

      const { result } = runHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      expect(result.current.favorites).toEqual([])
    })
  })

  describe('Cuando se anade una ciudad', () => {
    it('deberia aparecer en favorites e isFavorite ser true', () => {
      const storage = createFakeStorage()

      const { result } = runHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      act(() => result.current.addFavorite(madrid))

      expect(result.current.favorites).toEqual([madrid])
      expect(result.current.isFavorite(madrid)).toBe(true)
    })

    it('deberia persistir el cambio en el storage inyectado', () => {
      const storage = createFakeStorage()

      const { result } = runHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

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

      const { result } = runHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      act(() => result.current.toggleFavorite(madrid))
      expect(result.current.isFavorite(madrid)).toBe(true)

      act(() => result.current.toggleFavorite(madrid))
      expect(result.current.isFavorite(madrid)).toBe(false)
    })
  })

  describe('Cuando hay datos previos en el storage', () => {
    it('deberia hidratar favorites al montar', () => {
      const storage = createFakeStorage({
        'weather.favorites.v1': JSON.stringify([madrid, lisbon]),
      })

      const { result } = runHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      expect(result.current.favorites).toEqual([madrid, lisbon])
    })

    it('deberia ignorar JSON corrupto y empezar vacio', () => {
      const storage = createFakeStorage({
        'weather.favorites.v1': '{not-json',
      })

      const { result } = runHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      expect(result.current.favorites).toEqual([])
    })
  })

  describe('Cuando se llama a clearFavorites', () => {
    it('deberia vaciar la lista', () => {
      const storage = createFakeStorage({
        'weather.favorites.v1': JSON.stringify([madrid, lisbon]),
      })

      const { result } = runHook(() => useFavorites(), { wrapper: wrapperWith(storage) })

      act(() => result.current.clearFavorites())

      expect(result.current.favorites).toEqual([])
    })
  })
})
