import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeatherApp } from './WeatherApp'
import { FavoritesProvider } from '../../store/FavoritesContext'

// Helper: monta la app dentro del Provider que exige `FavoriteButton`.
// Usamos un storage en memoria para que los tests no dependan del
// localStorage real del jsdom.
function renderApp() {
  const mem = new Map()
  const storage = {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  }
  return render(
    <FavoritesProvider storage={storage}>
      <WeatherApp />
    </FavoritesProvider>,
  )
}

// ── vi.hoisted · mocks + fixtures compartidos ────────────────
// Se hoistean junto a vi.mock para evitar el clásico
// "Cannot access before initialization". El formador puede usar
// este archivo como referencia del patrón.
const { getWeather, searchCities, mockWeatherData, barcelonaCity } =
  vi.hoisted(() => ({
    getWeather: vi.fn(),
    searchCities: vi.fn(),
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
        { time: '2026-04-09T16:00', temperature: 21, weatherCode: 2, isDay: true },
      ],
      daily: [
        { date: '2026-04-09', tempMax: 24, tempMin: 12, weatherCode: 2 },
        { date: '2026-04-10', tempMax: 19, tempMin: 11, weatherCode: 61 },
        { date: '2026-04-11', tempMax: 20, tempMin: 10, weatherCode: 3 },
      ],
    },
    barcelonaCity: {
      id: 3117735,
      name: 'Barcelona',
      country: 'Spain',
      countryCode: 'ES',
      latitude: 41.39,
      longitude: 2.17,
      region: 'Catalonia',
    },
  }))

vi.mock('../../services/weatherService', () => ({ getWeather }))
vi.mock('../../services/geocodingService', () => ({ searchCities }))

describe('WeatherApp', () => {
  describe('Cuando se carga inicialmente', () => {
    it('deberia buscar el clima de la ciudad por defecto (Madrid)', async () => {
      getWeather.mockResolvedValue(mockWeatherData)

      renderApp()

      expect(
        await screen.findByRole('heading', { name: 'Madrid' }),
      ).toBeInTheDocument()
      expect(getWeather).toHaveBeenCalledWith(40.41, -3.7, 'celsius')
    })

    it('deberia mostrar la temperatura actual', async () => {
      getWeather.mockResolvedValue(mockWeatherData)
      renderApp()
      expect(await screen.findByText('22°C')).toBeInTheDocument()
    })

    it('deberia mostrar el pronostico horario', async () => {
      getWeather.mockResolvedValue(mockWeatherData)
      renderApp()
      await screen.findByRole('heading', { name: /pronóstico por hora/i })
      expect(screen.getByText('23°C')).toBeInTheDocument()
    })

    it('deberia mostrar el titulo de "Otras grandes ciudades"', async () => {
      getWeather.mockResolvedValue(mockWeatherData)
      renderApp()
      expect(
        await screen.findByRole('heading', { name: /otras grandes ciudades/i }),
      ).toBeInTheDocument()
    })
  })

  describe('Cuando se busca una ciudad', () => {
    it('deberia mostrar resultados y navegar al clima de la ciudad seleccionada', async () => {
      getWeather.mockResolvedValue(mockWeatherData)
      searchCities.mockResolvedValue([barcelonaCity])
      const user = userEvent.setup()

      renderApp()
      await screen.findByRole('heading', { name: 'Madrid' })

      await user.type(screen.getByLabelText('Buscar ciudad'), 'Barcelona')

      // La búsqueda se dispara tras el debounce.
      await waitFor(() =>
        expect(searchCities).toHaveBeenCalledWith('Barcelona'),
      )

      const barcelonaOption = await screen.findByRole('option', {
        name: /barcelona/i,
      })
      await user.click(barcelonaOption)

      // Tras seleccionar, se vuelve a pedir clima con las coordenadas
      // de Barcelona.
      await waitFor(() =>
        expect(getWeather).toHaveBeenCalledWith(41.39, 2.17, 'celsius'),
      )
    })
  })

  describe('Cuando se cambia la unidad de temperatura', () => {
    it('deberia re-buscar el clima en la nueva unidad', async () => {
      getWeather.mockResolvedValue(mockWeatherData)
      const user = userEvent.setup()

      renderApp()
      await screen.findByText('22°C')

      await user.click(screen.getByRole('button', { name: '°F' }))

      await waitFor(() =>
        expect(getWeather).toHaveBeenCalledWith(40.41, -3.7, 'fahrenheit'),
      )
    })
  })

  describe('Cuando hay un error en la carga del clima', () => {
    it('deberia mostrar el mensaje de error en un alert', async () => {
      getWeather.mockRejectedValue(new Error('Error al obtener el clima'))

      renderApp()

      const alert = await screen.findByRole('alert')
      expect(alert).toHaveTextContent('Error al obtener el clima')
    })
  })

  describe('Cuando esta cargando', () => {
    it('deberia mostrar el texto de carga mientras la promesa no resuelve', async () => {
      // `new Promise(() => {})` nunca resuelve — fija el estado de
      // loading sin tener que coordinar N resolvers manualmente, que
      // era el anti-patrón de la versión anterior.
      getWeather.mockImplementation(() => new Promise(() => {}))

      renderApp()

      expect(
        await screen.findByText(/cargando datos del clima/i),
      ).toBeInTheDocument()
    })
  })

  describe('Cuando daily viene vacio', () => {
    // Rama lógica del WeatherApp: si `daily.length === 0`,
    // `tempMax`/`tempMin` son null y CurrentWeather debe renderizar
    // "Máx: null°C / Mín: null°C" (comportamiento actual).
    it('deberia renderizar el clima sin romperse aunque no haya tempMax/tempMin', async () => {
      getWeather.mockResolvedValue({
        ...mockWeatherData,
        daily: [],
      })

      renderApp()

      // Se sigue mostrando la temperatura actual aunque falte el
      // detalle diario.
      expect(await screen.findByText('22°C')).toBeInTheDocument()
      // No se renderiza la sección del pronóstico semanal porque
      // DailyForecast retorna null con array vacío.
      expect(
        screen.queryByRole('heading', { name: /pronóstico semanal/i }),
      ).not.toBeInTheDocument()
    })
  })

  describe('Cuando falla el fetch de las otras ciudades', () => {
    // Promise.all cae si una sola promesa falla. El componente
    // captura el error con un catch silencioso y deja el array vacío.
    it('deberia seguir mostrando el clima principal aunque fallen las otras ciudades', async () => {
      let callCount = 0
      getWeather.mockImplementation(() => {
        callCount += 1
        // La primera llamada es Madrid (ciudad principal) → OK.
        // Las siguientes son las OTHER_CITIES → fallan.
        if (callCount === 1) return Promise.resolve(mockWeatherData)
        return Promise.reject(new Error('network error'))
      })

      renderApp()

      // El clima principal se renderiza correctamente.
      expect(
        await screen.findByRole('heading', { name: 'Madrid' }),
      ).toBeInTheDocument()
      expect(screen.getByText('22°C')).toBeInTheDocument()

      // "Otras grandes ciudades" sigue montándose (es el título
      // estático), pero sin tarjetas dentro.
      const otherCitiesHeading = screen.getByRole('heading', {
        name: /otras grandes ciudades/i,
      })
      expect(otherCitiesHeading).toBeInTheDocument()
    })
  })
})
