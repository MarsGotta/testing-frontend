// =================================================================
// Tests del favoritesReducer con Jasmine.
//
// El reducer es una funcion pura: no hay DOM, no hay mocks, no
// hay async. Los casos parametrizados se generan con `forEach`
// porque Jasmine no tiene `it.each`.
// =================================================================

import { favoritesReducer, initialState, cityKey } from './favoritesReducer'

const madrid = { name: 'Madrid', lat: 40.41, lon: -3.70 }
const lisbon = { name: 'Lisbon', lat: 38.72, lon: -9.14 }
const tokyo = { name: 'Tokyo', lat: 35.68, lon: 139.69 }

describe('favoritesReducer (Jasmine)', () => {
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

      expect(next.cities.length).toBe(1)
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
    // Parametrizamos los casos con forEach generando un `it` por
    // fila. El label entra como string en cada nombre de test.
    const CASOS = [
      { caso: 'anade si no estaba', inicial: [], esperada: [madrid] },
      { caso: 'quita si ya estaba', inicial: [madrid], esperada: [] },
      { caso: 'anade al final sin tocar el resto', inicial: [lisbon], esperada: [lisbon, madrid] },
    ]

    CASOS.forEach(function (c) {
      it('deberia ' + c.caso, () => {
        const next = favoritesReducer(
          { cities: c.inicial },
          { type: 'TOGGLE_FAVORITE', city: madrid },
        )
        expect(next.cities).toEqual(c.esperada)
      })
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
