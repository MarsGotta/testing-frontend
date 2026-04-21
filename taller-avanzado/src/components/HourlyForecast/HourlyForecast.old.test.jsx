// =================================================================
// Tests de HourlyForecast con Jasmine sobre Karma.
//
// Montamos con `mountComponent` (src/test-utils/jasmine-dom.jsx)
// y buscamos con la API nativa del DOM: `querySelector`,
// `querySelectorAll`, `textContent`. Los casos parametrizados se
// expanden con `forEach` porque Jasmine no tiene `it.each`.
// =================================================================

import { mountComponent } from '../../test-utils/jasmine-dom'
import { HourlyForecast } from './HourlyForecast'

function findByText(container, text) {
  const nodes = container.querySelectorAll('*')
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].textContent === text) return nodes[i]
  }
  return null
}

function findHeadingByText(container, regex) {
  const headings = container.querySelectorAll('h1,h2,h3,h4,h5,h6,[role="heading"]')
  for (let i = 0; i < headings.length; i++) {
    if (regex.test(headings[i].textContent)) return headings[i]
  }
  return null
}

const mockHours = [
  { time: '2026-04-09T15:00', temperature: 23, weatherCode: 1, isDay: true },
  { time: '2026-04-09T16:00', temperature: 22, weatherCode: 2, isDay: true },
  { time: '2026-04-09T17:00', temperature: 21, weatherCode: 3, isDay: true },
]

describe('HourlyForecast (Jasmine)', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      mounted.unmount()
      mounted = null
    }
  })

  describe('Cuando no hay datos horarios', () => {
    // Parametrizamos con forEach: un test por caso.
    const EMPTY_CASES = [
      ['array vacio', []],
      ['null', null],
      ['undefined', undefined],
    ]

    EMPTY_CASES.forEach(([label, hours]) => {
      it('deberia no renderizar nada con ' + label, () => {
        mounted = mountComponent(
          <HourlyForecast hours={hours} symbol="°C" />
        )
        expect(mounted.container.firstChild).toBeNull()
      })
    })
  })

  describe('Cuando recibe datos horarios', () => {
    it('deberia mostrar el titulo del pronostico por hora', () => {
      mounted = mountComponent(<HourlyForecast hours={mockHours} symbol="°C" />)
      expect(findHeadingByText(mounted.container, /pronóstico por hora/i)).toBeTruthy()
    })

    it('deberia mostrar una tarjeta por cada hora recibida', () => {
      mounted = mountComponent(<HourlyForecast hours={mockHours} symbol="°C" />)
      // role="listitem" viene del componente; evitamos selectores CSS.
      const cards = mounted.container.querySelectorAll('[role="listitem"]')
      expect(cards.length).toBe(3)
    })

    it('deberia mostrar las temperaturas con el simbolo', () => {
      mounted = mountComponent(<HourlyForecast hours={mockHours} symbol="°C" />)
      expect(findByText(mounted.container, '23°C')).toBeTruthy()
      expect(findByText(mounted.container, '22°C')).toBeTruthy()
      expect(findByText(mounted.container, '21°C')).toBeTruthy()
    })

    it('deberia mostrar las horas formateadas', () => {
      mounted = mountComponent(<HourlyForecast hours={mockHours} symbol="°C" />)
      expect(findByText(mounted.container, '15:00')).toBeTruthy()
      expect(findByText(mounted.container, '16:00')).toBeTruthy()
      expect(findByText(mounted.container, '17:00')).toBeTruthy()
    })

    it('deberia mostrar un icono por cada hora', () => {
      mounted = mountComponent(<HourlyForecast hours={mockHours} symbol="°C" />)
      const cards = mounted.container.querySelectorAll('[role="listitem"]')
      cards.forEach((card) => {
        // querySelector si es valido cuando buscas descendientes
        // dentro de un elemento que YA seleccionaste semanticamente.
        expect(card.querySelector('img')).toBeTruthy()
      })
    })
  })

  describe('Cuando se usa fahrenheit', () => {
    it('deberia mostrar las temperaturas con °F', () => {
      mounted = mountComponent(
        <HourlyForecast
          hours={[
            {
              time: '2026-04-09T15:00',
              temperature: 73,
              weatherCode: 1,
              isDay: true,
            },
          ]}
          symbol="°F"
        />
      )
      expect(findByText(mounted.container, '73°F')).toBeTruthy()
    })
  })

  describe('Cuando formatea la hora', () => {
    // `formatHour` usa padStart(2,'0') en horas y minutos.
    // Boundaries: valores de un solo digito.
    const CASES = [
      ['2026-04-09T00:00', '00:00', 'medianoche'],
      ['2026-04-09T09:05', '09:05', 'hora < 10 con minuto < 10'],
      ['2026-04-09T13:40', '13:40', '24h sin conversion AM/PM'],
    ]

    CASES.forEach(([time, expected, label]) => {
      it(time + ' → "' + expected + '" (' + label + ')', () => {
        mounted = mountComponent(
          <HourlyForecast
            hours={[{ time, temperature: 20, weatherCode: 1, isDay: true }]}
            symbol="°C"
          />
        )
        expect(findByText(mounted.container, expected)).toBeTruthy()
      })
    })
  })
})
