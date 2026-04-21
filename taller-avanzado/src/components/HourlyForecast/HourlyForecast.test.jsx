import { render, screen } from '@testing-library/react'
import { HourlyForecast } from './HourlyForecast'

const mockHours = [
  { time: '2026-04-09T15:00', temperature: 23, weatherCode: 1, isDay: true },
  { time: '2026-04-09T16:00', temperature: 22, weatherCode: 2, isDay: true },
  { time: '2026-04-09T17:00', temperature: 21, weatherCode: 3, isDay: true },
]

describe('HourlyForecast', () => {
  describe('Cuando no hay datos horarios', () => {
    it.each([
      ['array vacio', []],
      ['null', null],
      ['undefined', undefined],
    ])('deberia no renderizar nada con %s', (_label, hours) => {
      const { container } = render(
        <HourlyForecast hours={hours} symbol="°C" />,
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Cuando recibe datos horarios', () => {
    it('deberia mostrar el titulo del pronostico por hora', () => {
      render(<HourlyForecast hours={mockHours} symbol="°C" />)
      expect(
        screen.getByRole('heading', { name: /pronóstico por hora/i }),
      ).toBeInTheDocument()
    })

    it('deberia mostrar una tarjeta por cada hora recibida', () => {
      render(<HourlyForecast hours={mockHours} symbol="°C" />)
      // El contenedor expone role="list" y cada card role="listitem".
      // Preferimos queries semánticas antes que selectores de clase CSS.
      const cards = screen.getAllByRole('listitem')
      expect(cards).toHaveLength(3)
    })

    it('deberia mostrar las temperaturas con el simbolo', () => {
      render(<HourlyForecast hours={mockHours} symbol="°C" />)
      expect(screen.getByText('23°C')).toBeInTheDocument()
      expect(screen.getByText('22°C')).toBeInTheDocument()
      expect(screen.getByText('21°C')).toBeInTheDocument()
    })

    it('deberia mostrar las horas formateadas', () => {
      render(<HourlyForecast hours={mockHours} symbol="°C" />)
      expect(screen.getByText('15:00')).toBeInTheDocument()
      expect(screen.getByText('16:00')).toBeInTheDocument()
      expect(screen.getByText('17:00')).toBeInTheDocument()
    })

    it('deberia mostrar un icono por cada hora', () => {
      render(<HourlyForecast hours={mockHours} symbol="°C" />)
      // Los <img> son elementos con role="img" (implicito) — pero
      // como tienen alt="" decorativo, NO aparecen en el árbol
      // accesible. Usamos getAllByRole('listitem') y contamos.
      const cards = screen.getAllByRole('listitem')
      cards.forEach((card) => {
        expect(card.querySelector('img')).toBeInTheDocument()
      })
    })
  })

  describe('Cuando se usa fahrenheit', () => {
    it('deberia mostrar las temperaturas con °F', () => {
      render(
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
        />,
      )
      expect(screen.getByText('73°F')).toBeInTheDocument()
    })
  })

  describe('Cuando formatea la hora', () => {
    // `formatHour` usa padStart(2,'0') tanto en horas como en minutos.
    // Los boundaries críticos son valores de un solo dígito.
    it.each([
      ['2026-04-09T00:00', '00:00', 'medianoche'],
      ['2026-04-09T09:05', '09:05', 'hora < 10 con minuto < 10'],
      ['2026-04-09T13:40', '13:40', '24h sin conversion AM/PM'],
    ])('%s → "%s" (%s)', (time, expected) => {
      render(
        <HourlyForecast
          hours={[{ time, temperature: 20, weatherCode: 1, isDay: true }]}
          symbol="°C"
        />,
      )
      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })
})
