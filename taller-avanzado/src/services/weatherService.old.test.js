// =================================================================
// Tests de weatherService con Jasmine.
//
// Patrones tipicos del runner:
//   · `spyOn(window, 'fetch')` para interceptar la red.
//   · `.and.returnValue(Promise.resolve(...))` para un spy async.
//   · `expectAsync(...).toBeRejectedWithError(msg)` para asertar
//     que una Promise rechaza con un error concreto.
// =================================================================

import { getWeather } from './weatherService'

const mockApiResponse = {
  current: {
    time: '2026-04-09T14:00',
    temperature_2m: 22.4,
    apparent_temperature: 20.1,
    relative_humidity_2m: 45,
    weather_code: 2,
    wind_speed_10m: 3.5,
    is_day: 1,
  },
  hourly: {
    time: [
      '2026-04-09T12:00',
      '2026-04-09T13:00',
      '2026-04-09T14:00',
      '2026-04-09T15:00',
      '2026-04-09T16:00',
      '2026-04-09T17:00',
      '2026-04-09T18:00',
      '2026-04-09T19:00',
      '2026-04-09T20:00',
      '2026-04-09T21:00',
    ],
    temperature_2m: [20, 21, 22, 23, 22, 21, 19, 18, 17, 16],
    weather_code: [2, 2, 2, 1, 1, 3, 3, 0, 0, 0],
    is_day: [1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  },
  daily: {
    time: ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13', '2026-04-14'],
    temperature_2m_max: [24, 22, 20, 25, 23, 21],
    temperature_2m_min: [12, 11, 10, 14, 13, 12],
    weather_code: [2, 61, 3, 0, 1, 63],
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

describe('weatherService (Jasmine) · getWeather', () => {
  describe('Cuando la API responde correctamente', () => {
    it('deberia devolver el clima actual formateado con valores exactos', async () => {
      mockFetchOk(mockApiResponse)
      const result = await getWeather(40.41, -3.7)

      expect(result.current).toEqual({
        temperature: 22, // Math.round(22.4)
        feelsLike: 20, // Math.round(20.1)
        humidity: 45,
        windSpeed: 3.5,
        weatherCode: 2,
        isDay: true,
        time: '2026-04-09T14:00',
      })
    })

    it('deberia filtrar horas pasadas y limitar a 8 horas futuras', async () => {
      mockFetchOk(mockApiResponse)
      const result = await getWeather(40.41, -3.7)

      // current.time = 14:00 → filtra 12:00 y 13:00, deja 8 restantes.
      expect(result.hourly.length).toBe(8)
      expect(result.hourly[0].time).toBe('2026-04-09T14:00')
      expect(result.hourly[7].time).toBe('2026-04-09T21:00')
    })

    it('deberia devolver exactamente 5 dias de pronostico', async () => {
      mockFetchOk(mockApiResponse)
      const result = await getWeather(40.41, -3.7)

      expect(result.daily.length).toBe(5)
      expect(result.daily[0]).toEqual({
        date: '2026-04-09',
        tempMax: 24,
        tempMin: 12,
        weatherCode: 2,
      })
    })

    it('deberia enviar coordenadas, unidad y parametros fijos en la URL', async () => {
      const fetchSpy = mockFetchOk(mockApiResponse)
      await getWeather(40.41, -3.7, 'fahrenheit')

      const url = fetchSpy.calls.mostRecent().args[0]
      expect(url).toContain('latitude=40.41')
      expect(url).toContain('longitude=-3.7')
      expect(url).toContain('temperature_unit=fahrenheit')
      expect(url).toContain('wind_speed_unit=ms')
      expect(url).toContain('timezone=auto')
      expect(url).toContain('forecast_days=6')
    })

    it('deberia usar celsius por defecto cuando no se pasa unidad', async () => {
      const fetchSpy = mockFetchOk(mockApiResponse)
      await getWeather(40.41, -3.7)
      const url = fetchSpy.calls.mostRecent().args[0]
      expect(url).toContain('temperature_unit=celsius')
    })

    it('deberia convertir is_day=0 a isDay=false', async () => {
      const payload = Object.assign({}, mockApiResponse, {
        current: Object.assign({}, mockApiResponse.current, { is_day: 0 }),
      })
      mockFetchOk(payload)
      const result = await getWeather(40.41, -3.7)
      expect(result.current.isDay).toBe(false)
    })

    it('deberia redondear windSpeed a 1 decimal', async () => {
      const payload = Object.assign({}, mockApiResponse, {
        current: Object.assign({}, mockApiResponse.current, {
          wind_speed_10m: 3.567,
        }),
      })
      mockFetchOk(payload)
      const result = await getWeather(40.41, -3.7)
      expect(result.current.windSpeed).toBe(3.6)
    })
  })

  describe('Cuando la hora actual es posterior a todas las horarias', () => {
    it('deberia devolver un array hourly vacio', async () => {
      const payload = Object.assign({}, mockApiResponse, {
        current: Object.assign({}, mockApiResponse.current, {
          time: '2026-04-09T23:59',
        }),
      })
      mockFetchOk(payload)

      const result = await getWeather(40.41, -3.7)
      expect(result.hourly).toEqual([])
    })
  })

  describe('Cuando la API falla', () => {
    it('deberia lanzar un error descriptivo en respuesta 500', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve({ ok: false, status: 500 })
      )
      await expectAsync(getWeather(40.41, -3.7)).toBeRejectedWithError(
        'Error al obtener el clima'
      )
    })

    it('deberia propagar errores de red', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.reject(new Error('Failed to fetch'))
      )
      await expectAsync(getWeather(40.41, -3.7)).toBeRejectedWithError(
        'Failed to fetch'
      )
    })
  })
})
