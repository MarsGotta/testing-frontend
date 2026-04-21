import { render, screen } from '@testing-library/react'
import { DailyForecast } from './DailyForecast'

// Fechas dinámicas: los tests se ejecutan cualquier día del año,
// pero "Hoy" debe coincidir con la fecha del sistema.
function toDateString(d) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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

describe('DailyForecast', () => {
  describe('Cuando no hay datos diarios', () => {
    it.each([
      ['array vacio', []],
      ['null', null],
      ['undefined', undefined],
    ])('deberia no renderizar nada con %s', (_label, days) => {
      const { container } = render(<DailyForecast days={days} symbol="°C" />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Cuando recibe datos diarios', () => {
    it('deberia mostrar el titulo del pronostico semanal', () => {
      render(<DailyForecast days={mockDays} symbol="°C" />)
      expect(
        screen.getByRole('heading', { name: /pronóstico semanal/i }),
      ).toBeInTheDocument()
    })

    it('deberia mostrar una fila por cada dia recibido', () => {
      render(<DailyForecast days={mockDays} symbol="°C" />)
      // Preferimos role semántico (`listitem`) sobre querySelector
      // con clase CSS. Si mañana renombran `.daily-forecast__row` el
      // test no se rompe.
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })

    it('deberia mostrar "Hoy" para la fecha actual', () => {
      render(<DailyForecast days={mockDays} symbol="°C" />)
      expect(screen.getByText('Hoy')).toBeInTheDocument()
    })

    it('deberia mostrar el nombre del dia para fechas futuras', () => {
      render(<DailyForecast days={mockDays} symbol="°C" />)
      expect(screen.getByText(getDayName(getFutureString(1)))).toBeInTheDocument()
    })

    it('deberia mostrar las temperaturas maximas y minimas', () => {
      render(<DailyForecast days={mockDays} symbol="°C" />)
      expect(screen.getByText('24°C')).toBeInTheDocument()
      expect(screen.getByText('12°C')).toBeInTheDocument()
      expect(screen.getByText('22°C')).toBeInTheDocument()
      expect(screen.getByText('11°C')).toBeInTheDocument()
    })

    it('deberia mostrar la descripcion del clima para cada dia', () => {
      render(<DailyForecast days={mockDays} symbol="°C" />)
      // weatherCode 2 = "Parcialmente nublado", 61 = "Lluvia ligera"
      expect(screen.getByText('Parcialmente nublado')).toBeInTheDocument()
      expect(screen.getByText('Lluvia ligera')).toBeInTheDocument()
    })
  })

  describe('Cuando se usa fahrenheit', () => {
    it('deberia mostrar las temperaturas con °F', () => {
      render(
        <DailyForecast
          days={[
            { date: getTodayString(), tempMax: 75, tempMin: 54, weatherCode: 0 },
          ]}
          symbol="°F"
        />,
      )
      expect(screen.getByText('75°F')).toBeInTheDocument()
      expect(screen.getByText('54°F')).toBeInTheDocument()
    })
  })

  describe('Cuando getDayLabel identifica el dia de la semana', () => {
    // Testeo indirecto: damos una fecha fija y comprobamos que aparece
    // el nombre corto del día. Esto cubre las 7 ramas de DAY_NAMES.
    // Usamos vi.setSystemTime para fijar la fecha de "hoy" fuera del
    // rango, así ninguna fecha del set coincide con "Hoy".
    beforeEach(() => {
      vi.useFakeTimers()
      // Fijamos hoy al 1-ene-2025 (miércoles). Ninguna fecha del test
      // cae en ese día.
      vi.setSystemTime(new Date('2025-01-01T00:00:00'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it.each([
      ['2026-04-05', 'Dom'], // 2026-04-05 es domingo
      ['2026-04-06', 'Lun'],
      ['2026-04-07', 'Mar'],
      ['2026-04-08', 'Mié'],
      ['2026-04-09', 'Jue'],
      ['2026-04-10', 'Vie'],
      ['2026-04-11', 'Sáb'],
    ])('%s → "%s"', (date, expectedLabel) => {
      render(
        <DailyForecast
          days={[{ date, tempMax: 20, tempMin: 10, weatherCode: 0 }]}
          symbol="°C"
        />,
      )
      expect(screen.getByText(expectedLabel)).toBeInTheDocument()
    })
  })

  describe('Cuando todos los dias tienen la misma temperatura', () => {
    // Edge case del cálculo de range: si globalMax === globalMin,
    // `range = 0 || 1` → 1, evitando una división por cero. El test
    // verifica que el componente sigue renderizando sin romperse.
    it('no deberia lanzar error (range fallback = 1)', () => {
      const flatDays = [
        { date: getTodayString(), tempMax: 20, tempMin: 20, weatherCode: 0 },
        { date: getFutureString(1), tempMax: 20, tempMin: 20, weatherCode: 0 },
      ]
      expect(() =>
        render(<DailyForecast days={flatDays} symbol="°C" />),
      ).not.toThrow()
      expect(screen.getAllByRole('listitem')).toHaveLength(2)
    })
  })
})
