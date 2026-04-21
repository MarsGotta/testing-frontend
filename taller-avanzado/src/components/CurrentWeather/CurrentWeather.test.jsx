import { render, screen } from '@testing-library/react'
import { CurrentWeather } from './CurrentWeather'

// Factory de props por defecto. Evita repetir el mock entero en cada
// test y deja claro qué campo cambia en los casos específicos.
const buildProps = (overrides = {}) => ({
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
  ...overrides,
})

describe('CurrentWeather', () => {
  describe('Cuando no recibe datos de clima', () => {
    it('deberia no renderizar nada cuando current es null', () => {
      const { container } = render(
        <CurrentWeather {...buildProps({ current: null })} />,
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Cuando recibe datos de clima validos', () => {
    it('deberia mostrar la temperatura actual con el simbolo', () => {
      render(<CurrentWeather {...buildProps()} />)
      expect(screen.getByText('22°C')).toBeInTheDocument()
    })

    it('deberia mostrar el nombre de la ciudad en el heading', () => {
      render(<CurrentWeather {...buildProps()} />)
      expect(
        screen.getByRole('heading', { name: 'Madrid' }),
      ).toBeInTheDocument()
    })

    it('deberia mostrar las temperaturas maxima y minima', () => {
      render(<CurrentWeather {...buildProps()} />)
      expect(screen.getByText(/Máx: 24°C/)).toBeInTheDocument()
      expect(screen.getByText(/Mín: 12°C/)).toBeInTheDocument()
    })

    it('deberia mostrar la descripcion del clima', () => {
      render(<CurrentWeather {...buildProps()} />)
      // weatherCode 2 = "Parcialmente nublado"
      expect(screen.getByText('Parcialmente nublado')).toBeInTheDocument()
    })

    it('deberia mostrar el icono del clima con alt text descriptivo', () => {
      render(<CurrentWeather {...buildProps()} />)
      const icon = screen.getByAltText('Parcialmente nublado')
      expect(icon).toBeInTheDocument()
      expect(icon.tagName).toBe('IMG')
    })

    it('deberia mostrar la sensacion termica junto a su etiqueta', () => {
      render(<CurrentWeather {...buildProps()} />)
      expect(screen.getByText('Sensación')).toBeInTheDocument()
      expect(screen.getByText('20°C')).toBeInTheDocument()
    })

    it('deberia mostrar la velocidad del viento junto a su etiqueta', () => {
      render(<CurrentWeather {...buildProps()} />)
      expect(screen.getByText('Viento')).toBeInTheDocument()
      expect(screen.getByText('3.5 m/s')).toBeInTheDocument()
    })

    it('deberia mostrar la humedad junto a su etiqueta', () => {
      render(<CurrentWeather {...buildProps()} />)
      expect(screen.getByText('Humedad')).toBeInTheDocument()
      expect(screen.getByText('45%')).toBeInTheDocument()
    })
  })

  describe('Cuando el clima es de noche', () => {
    it('deberia mostrar el icono nocturno', () => {
      render(
        <CurrentWeather
          {...buildProps({
            current: { ...buildProps().current, isDay: false, weatherCode: 0 },
          })}
        />,
      )
      // weatherCode 0 de noche = "Despejado"
      expect(screen.getByText('Despejado')).toBeInTheDocument()
      expect(screen.getByAltText('Despejado').src).toContain('01n@2x.png')
    })
  })

  describe('Cuando formatea la hora', () => {
    // `formatTime` convierte ISO → "hh:mm AM|PM" en 12h. Los boundaries
    // críticos son 00:00 (medianoche → 12 AM), 12:00 (mediodía → 12 PM),
    // y horas/minutos < 10 (padding con cero).
    it.each([
      ['2026-04-09T00:00', '12:00 AM', 'medianoche'],
      ['2026-04-09T09:05', '09:05 AM', 'hora < 10 con minuto < 10'],
      ['2026-04-09T12:00', '12:00 PM', 'mediodia'],
      ['2026-04-09T13:07', '01:07 PM', 'tarde con minuto < 10'],
      ['2026-04-09T23:59', '11:59 PM', 'casi medianoche'],
    ])('%s → "%s" (%s)', (time, expected) => {
      render(
        <CurrentWeather
          {...buildProps({ current: { ...buildProps().current, time } })}
        />,
      )
      expect(screen.getByText(expected)).toBeInTheDocument()
    })
  })
})
