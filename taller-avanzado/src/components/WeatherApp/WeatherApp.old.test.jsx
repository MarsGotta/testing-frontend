// =================================================================
// Tests de integracion de WeatherApp con Jasmine sobre Karma.
//
// El test ejercita la app entera con los servicios
// (`weatherService`, `geocodingService`) ejecutandose de verdad.
// No mockeamos los modulos: interceptamos `window.fetch` con
// `spyOn` y devolvemos la respuesta cruda de la API. Un cambio en
// la transformacion del servicio puede romper estos tests aunque
// `WeatherApp` siga igual — son tests de integracion.
//
// Tres piezas que conviene explicar:
//
//   · `typeIntoInput(input, text)` — escribe letra a letra
//     disparando input+change por caracter y drenando microtasks
//     entre letras, para que el debounce de useGeocoding vea cada
//     valor intermedio.
//
//   · `waitForEl(container, predicate)` — polling manual con
//     timeout. Ejecuta el predicado, si devuelve algo truthy lo
//     retorna, si no espera y reintenta. En cada iteracion drena
//     microtasks para que las Promises de los hooks resuelvan.
//
//   · `findByText` / `findHeadingByText` — recorren el DOM filtrando
//     por textContent para localizar nodos semanticamente.
// =================================================================

import { act } from 'react'
import {
  mountComponent,
  clickEl,
  setInputValue,
  flushMicrotasks,
  sleepInAct,
} from '../../test-utils/jasmine-dom'
import { FavoritesProvider } from '../../store/FavoritesContext'
import { WeatherApp } from './WeatherApp'

// ── Helpers locales ─────────────────────────────────────────────
// Polling manual con timeout. Ejecuta `predicate(container)`; si
// devuelve algo truthy, lo retorna. Si no, espera `interval` ms y
// reintenta hasta `timeout`. Flushea microtasks en cada iteracion
// para que las Promises de los hooks se resuelvan.
async function waitForEl(container, predicate, options) {
  const opts = options || {}
  const timeout = opts.timeout != null ? opts.timeout : 3000
  const interval = opts.interval != null ? opts.interval : 20
  const start = Date.now()
  let lastError = null
  while (Date.now() - start < timeout) {
    await flushMicrotasks()
    try {
      const found = predicate(container)
      if (found) return found
    } catch (e) {
      lastError = e
    }
    // eslint-disable-next-line no-await-in-loop
    await sleepInAct(interval)
  }
  throw new Error(
    'waitForEl timeout' + (lastError ? ': ' + lastError.message : ''),
  )
}

// Escribe letra a letra disparando `input` + `change` en cada
// caracter, y drena microtasks entre letras para que el debounce
// y los efectos vean cada valor intermedio.
async function typeIntoInput(input, text) {
  for (const ch of text) {
    setInputValue(input, input.value + ch)
    // eslint-disable-next-line no-await-in-loop
    await flushMicrotasks()
  }
}

// Monta WeatherApp dentro del Provider que exige `FavoriteButton`.
// Storage en memoria para no depender de localStorage del
// navegador real (ChromeHeadless).
function renderApp() {
  const mem = new Map()
  const storage = {
    getItem: function (k) { return mem.has(k) ? mem.get(k) : null },
    setItem: function (k, v) { mem.set(k, v) },
    removeItem: function (k) { mem.delete(k) },
  }
  return mountComponent(
    <FavoritesProvider storage={storage}>
      <WeatherApp />
    </FavoritesProvider>,
  )
}

// Helpers de busqueda en el DOM: escaneo plano por textContent.
function findHeadingByText(container, text) {
  const headings = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')]
  if (text instanceof RegExp) {
    return headings.find((h) => text.test(h.textContent || ''))
  }
  return headings.find((h) => (h.textContent || '').trim() === text)
}

function findByText(container, text) {
  const nodes = [...container.querySelectorAll('*')]
  // Filtramos a elementos hoja-ish: los que no tienen hijos
  // elemento, para no matchear el wrapper completo.
  const leaves = nodes.filter((n) => n.children.length === 0)
  if (text instanceof RegExp) {
    return leaves.find((n) => text.test(n.textContent || ''))
  }
  return leaves.find((n) => (n.textContent || '').trim() === text)
}

// Respuesta cruda de Open-Meteo para el endpoint forecast.
const mockWeatherApiResponse = {
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
    // Empezamos a las 15:00 para evitar colisionar con `current.time`.
    // El servicio filtra `new Date(h.time) >= now`: si dejamos 14:00
    // con temperatura 22 tambien, el test encuentra dos "22°C" en
    // pantalla (actual + primera hora) y falla. Los datos de las
    // horas usan temperaturas distintas a la actual por seguridad.
    time: [
      '2026-04-09T15:00',
      '2026-04-09T16:00',
      '2026-04-09T17:00',
    ],
    temperature_2m: [23, 21, 19],
    weather_code: [1, 2, 3],
    is_day: [1, 1, 1],
  },
  daily: {
    time: ['2026-04-09', '2026-04-10', '2026-04-11', '2026-04-12', '2026-04-13'],
    temperature_2m_max: [24, 19, 20, 25, 23],
    temperature_2m_min: [12, 11, 10, 14, 13],
    weather_code: [2, 61, 3, 0, 1],
  },
}

const mockGeocodingResponse = {
  results: [
    {
      id: 3117735,
      name: 'Barcelona',
      country: 'Spain',
      country_code: 'ES',
      latitude: 41.39,
      longitude: 2.17,
      admin1: 'Catalonia',
    },
  ],
}

// Helper: un stub de fetch que responde segun el endpoint.
// Asi simulamos dos servicios distintos sin tener que mockear modulos.
function stubAllFetch() {
  return spyOn(window, 'fetch').and.callFake((url) => {
    if (url.indexOf('geocoding-api') !== -1) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockGeocodingResponse),
      })
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockWeatherApiResponse),
    })
  })
}

describe('WeatherApp (Jasmine)', () => {
  // Mount hygiene: todo test que monte algo deja el `mounted` en
  // esta referencia y el afterEach lo desmonta. Sin esto, los
  // componentes siguen vivos entre tests y los spies se pisan.
  let mounted
  afterEach(() => {
    if (mounted) {
      mounted.unmount()
      mounted = null
    }
  })

  describe('Cuando se carga inicialmente', () => {
    it('deberia buscar el clima de la ciudad por defecto (Madrid)', async () => {
      const fetchSpy = stubAllFetch()

      mounted = renderApp()
      const { container } = mounted

      await waitForEl(container, (c) => findHeadingByText(c, 'Madrid'))

      // Verificamos que al menos una de las llamadas a fetch uso
      // las coordenadas de Madrid.
      const urls = fetchSpy.calls.allArgs().map((args) => args[0])
      const madridCall = urls.find(
        (url) =>
          url.indexOf('latitude=40.41') !== -1 &&
          url.indexOf('longitude=-3.7') !== -1,
      )
      expect(madridCall).toBeDefined()
    })

    it('deberia mostrar la temperatura actual', async () => {
      stubAllFetch()
      mounted = renderApp()
      const { container } = mounted
      const node = await waitForEl(container, (c) => findByText(c, '22°C'))
      expect(node).toBeTruthy()
    })

    it('deberia mostrar el pronostico horario', async () => {
      stubAllFetch()
      mounted = renderApp()
      const { container } = mounted
      const heading = await waitForEl(container, (c) =>
        findHeadingByText(c, /pronóstico por hora/i),
      )
      expect(heading).toBeTruthy()
    })

    it('deberia mostrar el titulo de "Otras grandes ciudades"', async () => {
      stubAllFetch()
      mounted = renderApp()
      const { container } = mounted
      const heading = await waitForEl(container, (c) =>
        findHeadingByText(c, /otras grandes ciudades/i),
      )
      expect(heading).toBeTruthy()
    })
  })

  describe('Cuando se busca una ciudad', () => {
    it('deberia mostrar resultados y navegar al clima de la ciudad seleccionada', async () => {
      stubAllFetch()

      mounted = renderApp()
      const { container } = mounted

      // Esperamos al estado inicial (Madrid cargado).
      await waitForEl(container, (c) => findHeadingByText(c, 'Madrid'))

      // Buscar el input por su aria-label.
      const input = container.querySelector('input[aria-label="Buscar ciudad"]')
      expect(input).toBeTruthy()

      // Tecleamos letra a letra. El hook useGeocoding tiene
      // debounce de 300ms, asi que despues del type esperamos a
      // que aparezca el dropdown con la opcion de Barcelona.
      await typeIntoInput(input, 'Barcelona')

      // Timeout extendido: ChromeHeadless + debounce 300ms +
      // polling manual piden margen.
      const barcelonaOption = await waitForEl(
        container,
        (c) => {
          const options = [...c.querySelectorAll('[role="option"]')]
          return options.find((o) => /barcelona/i.test(o.textContent || ''))
        },
        { timeout: 5000 },
      )

      clickEl(barcelonaOption)

      // Tras seleccionar Barcelona, el heading cambia de "Madrid"
      // a "Barcelona" porque el useEffect vuelve a llamar fetchWeather.
      const barcelonaHeading = await waitForEl(
        container,
        (c) => findHeadingByText(c, 'Barcelona'),
        { timeout: 5000 },
      )
      expect(barcelonaHeading).toBeTruthy()
    })
  })

  describe('Cuando se cambia la unidad de temperatura', () => {
    it('deberia re-buscar el clima en la nueva unidad', async () => {
      const fetchSpy = stubAllFetch()

      mounted = renderApp()
      const { container } = mounted

      await waitForEl(container, (c) => findByText(c, '22°C'))

      // Buscamos el boton `°F` escaneando todos los buttons y
      // filtrando por textContent.
      const fahrenheitBtn = [...container.querySelectorAll('button')].find(
        (b) => (b.textContent || '').trim() === '°F',
      )
      expect(fahrenheitBtn).toBeTruthy()
      clickEl(fahrenheitBtn)

      await waitForEl(container, () => {
        const fahrenheitCall = fetchSpy.calls.allArgs().find((args) => {
          return args[0].indexOf('temperature_unit=fahrenheit') !== -1
        })
        return fahrenheitCall
      })
    })
  })

  describe('Cuando hay un error en la carga del clima', () => {
    it('deberia mostrar el mensaje de error en un alert', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve({ ok: false, status: 500 }),
      )

      mounted = renderApp()
      const { container } = mounted

      const alert = await waitForEl(container, (c) =>
        c.querySelector('[role="alert"]'),
      )
      expect(alert.textContent.indexOf('Error al obtener el clima')).not.toBe(-1)
    })
  })

  describe('Cuando esta cargando', () => {
    it('deberia mostrar el texto de carga mientras la promesa no resuelve', async () => {
      // Una promesa que nunca resuelve mantiene el estado de loading.
      spyOn(window, 'fetch').and.returnValue(new Promise(() => {}))

      mounted = renderApp()
      const { container } = mounted

      const loading = await waitForEl(container, (c) =>
        findByText(c, /cargando datos del clima/i),
      )
      expect(loading).toBeTruthy()
    })
  })

  describe('Cuando falla el fetch de las otras ciudades', () => {
    it('deberia seguir mostrando el clima principal aunque fallen las otras ciudades', async () => {
      // Contador secuencial: primera llamada OK (Madrid), resto
      // rechaza (OTHER_CITIES). Usamos `.and.callFake` para que
      // el spy ejecute logica distinta en cada invocacion.
      let callCount = 0
      spyOn(window, 'fetch').and.callFake(() => {
        // Geocoding no se invoca en este test (no se busca nada).
        callCount += 1
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockWeatherApiResponse),
          })
        }
        return Promise.reject(new Error('network error'))
      })

      mounted = renderApp()
      const { container } = mounted

      // Clima principal si se renderiza.
      await waitForEl(container, (c) => findHeadingByText(c, 'Madrid'))
      expect(findByText(container, '22°C')).toBeTruthy()

      // La seccion "Otras grandes ciudades" sigue montandose (el
      // titulo es estatico), pero sin CityCards dentro.
      expect(
        findHeadingByText(container, /otras grandes ciudades/i),
      ).toBeTruthy()
    })
  })

  describe('Cuando daily viene vacio', () => {
    it('deberia renderizar el clima sin romperse aunque no haya tempMax/tempMin', async () => {
      const emptyDaily = Object.assign({}, mockWeatherApiResponse, {
        daily: {
          time: [],
          temperature_2m_max: [],
          temperature_2m_min: [],
          weather_code: [],
        },
      })
      spyOn(window, 'fetch').and.callFake((url) => {
        if (url.indexOf('geocoding-api') !== -1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ results: [] }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(emptyDaily),
        })
      })

      mounted = renderApp()
      const { container } = mounted

      await waitForEl(container, (c) => findByText(c, '22°C'))
      expect(
        findHeadingByText(container, /pronóstico semanal/i),
      ).toBeFalsy()
    })
  })
})

// `act` importado arriba — se re-exporta como no-op para silenciar
// el linter si no se usa explicitamente en este archivo. Lo dejamos
// disponible para quien toque estos tests: a veces hay que envolver
// una llamada manual a un setter de estado.
void act
