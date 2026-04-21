// =================================================================
// Tests del hook useWeather con Jasmine sobre Karma.
//
// Ejercitamos el hook con la mini-helper `runHook`
// (src/test-utils/jasmine-dom.jsx) y `act()` de `react` (React 18.3+).
//
// El servicio `weatherService` se ejecuta de verdad: no mockeamos
// el modulo, sino que interceptamos `window.fetch` con `spyOn` y
// devolvemos la respuesta cruda de la API. Es un test mas
// integrado — cubre tambien la logica de parsing del servicio —
// asi que un fallo puede venir del hook o del servicio.
// =================================================================

import { act } from 'react'
import { runHook } from '../test-utils/jasmine-dom'
import { useWeather } from './useWeather'

// Respuesta API cruda (como la enviaría Open-Meteo). Es más verbosa
// porque el servicio hace su propia transformación antes de
// entregársela al hook.
const mockApiResponse = {
  current: {
    time: '2026-04-09T14:00',
    temperature_2m: 22,
    apparent_temperature: 20,
    relative_humidity_2m: 45,
    weather_code: 2,
    wind_speed_10m: 3.5,
    is_day: 1,
  },
  hourly: {
    time: ['2026-04-09T15:00'],
    temperature_2m: [23],
    weather_code: [1],
    is_day: [1],
  },
  daily: {
    time: ['2026-04-09'],
    temperature_2m_max: [24],
    temperature_2m_min: [12],
    weather_code: [2],
  },
}

function mockFetchOk(payload) {
  return spyOn(window, 'fetch').and.returnValue(
    Promise.resolve({
      ok: true,
      json: function () {
        return Promise.resolve(payload)
      },
    })
  )
}

describe('useWeather (Jasmine)', () => {
  describe('Cuando se inicializa', () => {
    it('deberia tener el estado inicial vacio', () => {
      const { result } = runHook(() => useWeather())

      expect(result.current.current).toBeNull()
      expect(result.current.hourly).toEqual([])
      expect(result.current.daily).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Cuando se busca el clima exitosamente', () => {
    it('deberia devolver los datos del clima', async () => {
      mockFetchOk(mockApiResponse)

      const { result } = runHook(() => useWeather())

      await act(async () => {
        await result.current.fetchWeather(40.41, -3.7)
      })

      expect(result.current.current).toEqual({
        temperature: 22,
        feelsLike: 20,
        humidity: 45,
        windSpeed: 3.5,
        weatherCode: 2,
        isDay: true,
        time: '2026-04-09T14:00',
      })
      expect(result.current.loading).toBe(false)
    })

    it('deberia pasar la unidad al servicio', async () => {
      const fetchSpy = mockFetchOk(mockApiResponse)

      const { result } = runHook(() => useWeather())

      await act(async () => {
        await result.current.fetchWeather(40.41, -3.7, 'fahrenheit')
      })

      // Verificamos indirectamente a traves del fetch: la unidad
      // viaja como query string en la URL que el servicio construye.
      const url = fetchSpy.calls.mostRecent().args[0]
      expect(url).toContain('temperature_unit=fahrenheit')
    })
  })

  describe('Cuando la busqueda falla', () => {
    it('deberia mostrar el error y limpiar datos', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve({ ok: false, status: 500 })
      )

      const { result } = runHook(() => useWeather())

      await act(async () => {
        await result.current.fetchWeather(0, 0)
      })

      expect(result.current.error).toBe('Error al obtener el clima')
      expect(result.current.current).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })
})
