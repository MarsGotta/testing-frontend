// ============================================================
// useWeather · demo de `vi.hoisted()`
//
// `vi.mock()` se hoistea al inicio del archivo mediante
// transformación AST. Significa que NO puede acceder a variables
// definidas en el scope del test — cuando la factory se ejecuta,
// esas variables todavía no existen → ReferenceError.
//
// `vi.hoisted()` es el workaround oficial: su callback se mueve
// ARRIBA junto con los vi.mock, así que las variables que declara
// están disponibles tanto en la factory del mock como en los tests.
//
// Este archivo usa el patrón para compartir la referencia al mock
// `getWeather` y los datos mock `mockWeatherData` entre la factory
// de `vi.mock()` y los tests. En la demo: intentar poner los datos
// en un `const` normal arriba del archivo y mostrar el
// ReferenceError en rojo. Luego aplicar `vi.hoisted()` y todo pasa.
// ============================================================

import { renderHook, act } from '@testing-library/react'
import { useWeather } from './useWeather'

// ── Patrón `vi.hoisted` ─────────────────────────────────────
// Todo lo que va aquí dentro se "hoistea" junto a vi.mock,
// por eso la factory del mock puede referenciar `getWeather`.
const { getWeather, mockWeatherData } = vi.hoisted(() => ({
  getWeather: vi.fn(),
  mockWeatherData: {
    current: {
      temperature: 22,
      feelsLike: 20,
      humidity: 45,
      windSpeed: 3.5,
      weatherCode: 2,
      isDay: true,
      time: '2026-04-09T14:00',
    },
    hourly: [
      { time: '2026-04-09T15:00', temperature: 23, weatherCode: 1, isDay: true },
    ],
    daily: [
      { date: '2026-04-09', tempMax: 24, tempMin: 12, weatherCode: 2 },
    ],
  },
}))

// Aquí la factory de vi.mock SÍ puede usar `getWeather` porque
// ambos — vi.mock y vi.hoisted — se ejecutan antes que los imports.
vi.mock('../services/weatherService', () => ({
  getWeather,
}))

afterEach(() => {
  vi.resetAllMocks()
})

describe('useWeather', () => {
  describe('Cuando se inicializa', () => {
    it('deberia tener el estado inicial vacio', () => {
      const { result } = renderHook(() => useWeather())

      expect(result.current.current).toBeNull()
      expect(result.current.hourly).toEqual([])
      expect(result.current.daily).toEqual([])
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  describe('Cuando se busca el clima exitosamente', () => {
    it('deberia devolver los datos del clima', async () => {
      getWeather.mockResolvedValue(mockWeatherData)

      const { result } = renderHook(() => useWeather())

      await act(async () => {
        await result.current.fetchWeather(40.41, -3.70)
      })

      expect(result.current.current).toEqual(mockWeatherData.current)
      expect(result.current.hourly).toEqual(mockWeatherData.hourly)
      expect(result.current.daily).toEqual(mockWeatherData.daily)
      expect(result.current.loading).toBe(false)
    })

    it('deberia pasar la unidad al servicio', async () => {
      getWeather.mockResolvedValue(mockWeatherData)

      const { result } = renderHook(() => useWeather())

      await act(async () => {
        await result.current.fetchWeather(40.41, -3.70, 'fahrenheit')
      })

      expect(getWeather).toHaveBeenCalledWith(40.41, -3.70, 'fahrenheit')
    })
  })

  describe('Cuando la busqueda falla', () => {
    it('deberia mostrar el error y limpiar datos', async () => {
      getWeather.mockRejectedValue(new Error('Error al obtener el clima'))

      const { result } = renderHook(() => useWeather())

      await act(async () => {
        await result.current.fetchWeather(0, 0)
      })

      expect(result.current.error).toBe('Error al obtener el clima')
      expect(result.current.current).toBeNull()
      expect(result.current.loading).toBe(false)
    })
  })
})
