// =================================================================
// Tests de DailyForecast con Jasmine sobre Karma.
//
// Montamos con `mountComponent` (src/test-utils/jasmine-dom.jsx)
// y buscamos con la API nativa del DOM: `querySelector`,
// `querySelectorAll`, `textContent`.
//
// Para fijar la fecha "hoy" en los tests usamos
// `jasmine.clock().mockDate(date)`, que controla el reloj del
// sistema igual que el resto de la API de fake timers de Jasmine.
// =================================================================

import { mountComponent } from '../../test-utils/jasmine-dom'
import { DailyForecast } from './DailyForecast'

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

function toDateString(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return yyyy + '-' + mm + '-' + dd
}

function getTodayString() {
  return toDateString(new Date())
}

function getFutureString(daysAhead) {
  const d = new Date()
  d.setDate(d.getDate() + daysAhead)
  return toDateString(d)
}

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return DAY_NAMES[d.getDay()]
}

const mockDays = [
  { date: getTodayString(), tempMax: 24, tempMin: 12, weatherCode: 2 },
  { date: getFutureString(1), tempMax: 22, tempMin: 11, weatherCode: 61 },
]

describe('DailyForecast (Jasmine)', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      mounted.unmount()
      mounted = null
    }
  })

  describe('Cuando no hay datos diarios', () => {
    const EMPTY_CASES = [
      ['array vacio', []],
      ['null', null],
      ['undefined', undefined],
    ]

    EMPTY_CASES.forEach(([label, days]) => {
      it('deberia no renderizar nada con ' + label, () => {
        mounted = mountComponent(<DailyForecast days={days} symbol="°C" />)
        expect(mounted.container.firstChild).toBeNull()
      })
    })
  })

  describe('Cuando recibe datos diarios', () => {
    it('deberia mostrar el titulo del pronostico semanal', () => {
      mounted = mountComponent(<DailyForecast days={mockDays} symbol="°C" />)
      expect(findHeadingByText(mounted.container, /pronóstico semanal/i)).toBeTruthy()
    })

    it('deberia mostrar una fila por cada dia recibido', () => {
      mounted = mountComponent(<DailyForecast days={mockDays} symbol="°C" />)
      // role="listitem" viene del componente; evitamos selectores CSS.
      const items = mounted.container.querySelectorAll('[role="listitem"]')
      expect(items.length).toBe(2)
    })

    it('deberia mostrar "Hoy" para la fecha actual', () => {
      mounted = mountComponent(<DailyForecast days={mockDays} symbol="°C" />)
      expect(findByText(mounted.container, 'Hoy')).toBeTruthy()
    })

    it('deberia mostrar el nombre del dia para fechas futuras', () => {
      mounted = mountComponent(<DailyForecast days={mockDays} symbol="°C" />)
      expect(findByText(mounted.container, getDayName(getFutureString(1)))).toBeTruthy()
    })

    it('deberia mostrar las temperaturas maximas y minimas', () => {
      mounted = mountComponent(<DailyForecast days={mockDays} symbol="°C" />)
      expect(findByText(mounted.container, '24°C')).toBeTruthy()
      expect(findByText(mounted.container, '12°C')).toBeTruthy()
      expect(findByText(mounted.container, '22°C')).toBeTruthy()
      expect(findByText(mounted.container, '11°C')).toBeTruthy()
    })

    it('deberia mostrar la descripcion del clima para cada dia', () => {
      mounted = mountComponent(<DailyForecast days={mockDays} symbol="°C" />)
      // weatherCode 2 = "Parcialmente nublado", 61 = "Lluvia ligera"
      expect(findByText(mounted.container, 'Parcialmente nublado')).toBeTruthy()
      expect(findByText(mounted.container, 'Lluvia ligera')).toBeTruthy()
    })
  })

  describe('Cuando se usa fahrenheit', () => {
    it('deberia mostrar las temperaturas con °F', () => {
      mounted = mountComponent(
        <DailyForecast
          days={[
            { date: getTodayString(), tempMax: 75, tempMin: 54, weatherCode: 0 },
          ]}
          symbol="°F"
        />
      )
      expect(findByText(mounted.container, '75°F')).toBeTruthy()
      expect(findByText(mounted.container, '54°F')).toBeTruthy()
    })
  })

  describe('Cuando getDayLabel identifica el dia de la semana', () => {
    // Fijamos "hoy" a una fecha fuera del rango de los casos para
    // que ninguna fecha del test colisione con la etiqueta "Hoy"
    // (que sustituye al dia de la semana para la fecha actual).
    beforeEach(() => {
      jasmine.clock().install()
      jasmine.clock().mockDate(new Date('2025-01-01T00:00:00'))
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })

    const DAY_CASES = [
      ['2026-04-05', 'Dom'],
      ['2026-04-06', 'Lun'],
      ['2026-04-07', 'Mar'],
      ['2026-04-08', 'Mié'],
      ['2026-04-09', 'Jue'],
      ['2026-04-10', 'Vie'],
      ['2026-04-11', 'Sáb'],
    ]

    DAY_CASES.forEach(([date, expectedLabel]) => {
      it(date + ' → "' + expectedLabel + '"', () => {
        mounted = mountComponent(
          <DailyForecast
            days={[{ date, tempMax: 20, tempMin: 10, weatherCode: 0 }]}
            symbol="°C"
          />
        )
        expect(findByText(mounted.container, expectedLabel)).toBeTruthy()
      })
    })
  })

  describe('Cuando todos los dias tienen la misma temperatura', () => {
    // Edge case del calculo de range (globalMax === globalMin → 1).
    it('no deberia lanzar error (range fallback = 1)', () => {
      const flatDays = [
        { date: getTodayString(), tempMax: 20, tempMin: 20, weatherCode: 0 },
        { date: getFutureString(1), tempMax: 20, tempMin: 20, weatherCode: 0 },
      ]
      expect(function () {
        mounted = mountComponent(<DailyForecast days={flatDays} symbol="°C" />)
      }).not.toThrow()
      const items = mounted.container.querySelectorAll('[role="listitem"]')
      expect(items.length).toBe(2)
    })
  })
})
