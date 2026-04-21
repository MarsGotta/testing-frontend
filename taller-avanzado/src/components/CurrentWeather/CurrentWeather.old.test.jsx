// =================================================================
// Tests de CurrentWeather con Jasmine sobre Karma.
//
// Montamos con `mountComponent` (src/test-utils/jasmine-dom.jsx)
// y buscamos con la API nativa del DOM: `querySelector`,
// `textContent`, `getAttribute`.
//
// Helpers locales:
//   · findByText(container, str)        — match exacto por textContent.
//   · findByTextMatch(container, regex) — match por regex en nodos hoja
//                                         (evita atrapar al contenedor padre).
//   · findHeadingByName(container, str) — match exacto en h1..h6.
//
// Los casos parametrizados se expanden con `forEach` porque
// Jasmine no tiene `it.each`.
// =================================================================

import { mountComponent } from '../../test-utils/jasmine-dom'
import { CurrentWeather } from './CurrentWeather'

function findByText(container, text) {
  const nodes = container.querySelectorAll('*')
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].textContent === text) return nodes[i]
  }
  return null
}

// Version regex: buscamos el nodo "hoja" (sin hijos elemento) cuyo
// textContent cumple el pattern. Evita devolver el <body> o el
// contenedor padre, que siempre contendra el texto.
function findByTextMatch(container, regex) {
  const nodes = container.querySelectorAll('*')
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i]
    if (el.children.length === 0 && regex.test(el.textContent)) return el
  }
  return null
}

function findHeadingByName(container, name) {
  const headings = container.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')
  for (let i = 0; i < headings.length; i++) {
    if (headings[i].textContent === name) return headings[i]
  }
  return null
}

const buildProps = (overrides) => {
  const defaults = {
    current: {
      temperature: 22,
      feelsLike: 20,
      humidity: 45,
      windSpeed: 3.5,
      weatherCode: 2,
      isDay: true,
      time: '2026-04-09T14:00',
    },
    cityName: 'Madrid',
    tempMax: 24,
    tempMin: 12,
    symbol: '°C',
  }
  return Object.assign({}, defaults, overrides || {})
}

describe('CurrentWeather (Jasmine)', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      mounted.unmount()
      mounted = null
    }
  })

  describe('Cuando no recibe datos de clima', () => {
    it('deberia no renderizar nada cuando current es null', () => {
      mounted = mountComponent(
        <CurrentWeather {...buildProps({ current: null })} />
      )
      expect(mounted.container.firstChild).toBeNull()
    })
  })

  describe('Cuando recibe datos de clima validos', () => {
    it('deberia mostrar la temperatura actual con el simbolo', () => {
      mounted = mountComponent(<CurrentWeather {...buildProps()} />)
      expect(findByText(mounted.container, '22°C')).toBeTruthy()
    })

    it('deberia mostrar el nombre de la ciudad en el heading', () => {
      mounted = mountComponent(<CurrentWeather {...buildProps()} />)
      expect(findHeadingByName(mounted.container, 'Madrid')).toBeTruthy()
    })

    it('deberia mostrar las temperaturas maxima y minima', () => {
      mounted = mountComponent(<CurrentWeather {...buildProps()} />)
      expect(findByTextMatch(mounted.container, /Máx: 24°C/)).toBeTruthy()
      expect(findByTextMatch(mounted.container, /Mín: 12°C/)).toBeTruthy()
    })

    it('deberia mostrar la descripcion del clima', () => {
      // weatherCode 2 = "Parcialmente nublado"
      mounted = mountComponent(<CurrentWeather {...buildProps()} />)
      expect(findByText(mounted.container, 'Parcialmente nublado')).toBeTruthy()
    })

    it('deberia mostrar el icono del clima con alt text descriptivo', () => {
      mounted = mountComponent(<CurrentWeather {...buildProps()} />)
      const icon = mounted.container.querySelector('img[alt="Parcialmente nublado"]')
      expect(icon).toBeTruthy()
      expect(icon.tagName).toBe('IMG')
    })

    it('deberia mostrar la sensacion termica junto a su etiqueta', () => {
      mounted = mountComponent(<CurrentWeather {...buildProps()} />)
      expect(findByText(mounted.container, 'Sensación')).toBeTruthy()
      expect(findByText(mounted.container, '20°C')).toBeTruthy()
    })

    it('deberia mostrar la velocidad del viento junto a su etiqueta', () => {
      mounted = mountComponent(<CurrentWeather {...buildProps()} />)
      expect(findByText(mounted.container, 'Viento')).toBeTruthy()
      expect(findByText(mounted.container, '3.5 m/s')).toBeTruthy()
    })

    it('deberia mostrar la humedad junto a su etiqueta', () => {
      mounted = mountComponent(<CurrentWeather {...buildProps()} />)
      expect(findByText(mounted.container, 'Humedad')).toBeTruthy()
      expect(findByText(mounted.container, '45%')).toBeTruthy()
    })
  })

  describe('Cuando el clima es de noche', () => {
    it('deberia mostrar el icono nocturno', () => {
      mounted = mountComponent(
        <CurrentWeather
          {...buildProps({
            current: {
              ...buildProps().current,
              isDay: false,
              weatherCode: 0,
            },
          })}
        />
      )
      expect(findByText(mounted.container, 'Despejado')).toBeTruthy()
      const icon = mounted.container.querySelector('img[alt="Despejado"]')
      expect(icon.src).toContain('01n@2x.png')
    })
  })

  describe('Cuando formatea la hora', () => {
    // `formatTime` convierte ISO → "hh:mm AM|PM" en 12h. Los
    // boundaries criticos son medianoche (00→12 AM), mediodia
    // (12→12 PM) y horas/minutos < 10 con padding.
    const TIME_CASES = [
      ['2026-04-09T00:00', '12:00 AM', 'medianoche'],
      ['2026-04-09T09:05', '09:05 AM', 'hora < 10 con minuto < 10'],
      ['2026-04-09T12:00', '12:00 PM', 'mediodia'],
      ['2026-04-09T13:07', '01:07 PM', 'tarde con minuto < 10'],
      ['2026-04-09T23:59', '11:59 PM', 'casi medianoche'],
    ]

    TIME_CASES.forEach(([time, expected, label]) => {
      it(time + ' → "' + expected + '" (' + label + ')', () => {
        mounted = mountComponent(
          <CurrentWeather
            {...buildProps({
              current: { ...buildProps().current, time },
            })}
          />
        )
        expect(findByText(mounted.container, expected)).toBeTruthy()
      })
    })
  })
})
