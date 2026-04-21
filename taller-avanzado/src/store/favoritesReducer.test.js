// ============================================================
// favoritesReducer · tests de funcion pura (Vitest)
//
// Puntos pedagogicos:
//   - Una funcion pura NO necesita render, ni DOM, ni Provider.
//     Solo llamamos y comprobamos el resultado.
//   - Por eso los reducers son el mejor sitio para empezar a
//     testear state management: barato, rapido, determinista.
//   - `it.each` deja las reglas del reducer como una tabla que
//     un junior puede leer sin entrar al cuerpo del test.
// ============================================================

import { favoritesReducer, initialState, cityKey } from './favoritesReducer'

const madrid = { name: 'Madrid', lat: 40.41, lon: -3.70 }
const lisbon = { name: 'Lisbon', lat: 38.72, lon: -9.14 }
const tokyo = { name: 'Tokyo', lat: 35.68, lon: 139.69 }

describe('favoritesReducer', () => {
  describe('initialState', () => {
    it('deberia empezar con el array de ciudades vacio', () => {
      expect(initialState).toEqual({ cities: [] })
    })
  })

  describe('cityKey', () => {
    it('deberia generar la misma clave para coords con pequenas variaciones', () => {
      const a = { name: 'Madrid', lat: 40.41, lon: -3.70 }
      const b = { name: 'Madrid', lat: 40.4099, lon: -3.7001 }
      expect(cityKey(a)).toBe(cityKey(b))
    })

    it('deberia diferenciar ciudades distintas', () => {
      expect(cityKey(madrid)).not.toBe(cityKey(lisbon))
    })
  })

  describe('ADD_FAVORITE', () => {
    it('deberia anadir una ciudad al estado vacio', () => {
      const next = favoritesReducer(initialState, { type: 'ADD_FAVORITE', city: madrid })

      expect(next.cities).toEqual([madrid])
    })

    it('no deberia duplicar una ciudad ya favorita', () => {
      const state = { cities: [madrid] }

      const next = favoritesReducer(state, { type: 'ADD_FAVORITE', city: madrid })

      expect(next.cities).toHaveLength(1)
    })

    it('deberia devolver la misma referencia si no cambia (optimizacion)', () => {
      const state = { cities: [madrid] }

      const next = favoritesReducer(state, { type: 'ADD_FAVORITE', city: madrid })

      expect(next).toBe(state)
    })
  })

  describe('REMOVE_FAVORITE', () => {
    it('deberia quitar la ciudad indicada y dejar el resto', () => {
      const state = { cities: [madrid, lisbon, tokyo] }

      const next = favoritesReducer(state, { type: 'REMOVE_FAVORITE', city: lisbon })

      expect(next.cities).toEqual([madrid, tokyo])
    })

    it('deberia ser noop si la ciudad no estaba', () => {
      const state = { cities: [madrid] }

      const next = favoritesReducer(state, { type: 'REMOVE_FAVORITE', city: lisbon })

      expect(next.cities).toEqual([madrid])
    })
  })

  describe('TOGGLE_FAVORITE', () => {
    it.each([
      { caso: 'anade si no estaba', inicial: [], esperada: [madrid] },
      { caso: 'quita si ya estaba', inicial: [madrid], esperada: [] },
      { caso: 'anade al final sin tocar el resto', inicial: [lisbon], esperada: [lisbon, madrid] },
    ])('deberia $caso', ({ inicial, esperada }) => {
      const next = favoritesReducer({ cities: inicial }, { type: 'TOGGLE_FAVORITE', city: madrid })

      expect(next.cities).toEqual(esperada)
    })
  })

  describe('CLEAR_FAVORITES', () => {
    it('deberia vaciar la lista', () => {
      const state = { cities: [madrid, lisbon, tokyo] }

      const next = favoritesReducer(state, { type: 'CLEAR_FAVORITES' })

      expect(next.cities).toEqual([])
    })
  })

  describe('HYDRATE', () => {
    it('deberia sustituir la lista por la cargada desde storage', () => {
      const state = { cities: [tokyo] }

      const next = favoritesReducer(state, { type: 'HYDRATE', cities: [madrid, lisbon] })

      expect(next.cities).toEqual([madrid, lisbon])
    })
  })

  describe('action desconocida', () => {
    it('deberia devolver el estado sin cambios', () => {
      const state = { cities: [madrid] }

      const next = favoritesReducer(state, { type: 'UNKNOWN' })

      expect(next).toBe(state)
    })
  })
})
