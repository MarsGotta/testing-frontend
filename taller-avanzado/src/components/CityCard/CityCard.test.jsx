import { render, screen } from '@testing-library/react'
import { CityCard } from './CityCard'

const mockCity = {
  name: 'New York',
  country: 'US',
  temperature: 18,
  weatherCode: 3,
  isDay: true,
}

describe('CityCard', () => {
  describe('Cuando no recibe datos de ciudad', () => {
    it('deberia no renderizar nada cuando city es null', () => {
      const { container } = render(<CityCard city={null} />)
      // Comprobación explícita: el componente retorna null, por eso
      // container.firstChild es null. `innerHTML === ''` también
      // pasaría si el componente renderizase un <div/> vacío por
      // accidente, por eso esta assertion es más precisa.
      expect(container.firstChild).toBeNull()
    })

    it('deberia no renderizar nada cuando city es undefined', () => {
      const { container } = render(<CityCard city={undefined} />)
      expect(container.firstChild).toBeNull()
    })
  })

  describe('Cuando recibe datos de ciudad validos', () => {
    it('deberia mostrar el nombre de la ciudad', () => {
      render(<CityCard city={mockCity} />)
      expect(screen.getByText('New York')).toBeInTheDocument()
    })

    it('deberia mostrar el pais', () => {
      render(<CityCard city={mockCity} />)
      expect(screen.getByText('US')).toBeInTheDocument()
    })

    it('deberia mostrar la temperatura con el simbolo de grado', () => {
      render(<CityCard city={mockCity} />)
      expect(screen.getByText('18°')).toBeInTheDocument()
    })

    it('deberia mostrar la descripcion del clima', () => {
      // weatherCode 3 = "Nublado"
      render(<CityCard city={mockCity} />)
      expect(screen.getByText('Nublado')).toBeInTheDocument()
    })

    it('deberia mostrar el icono del clima con alt descriptivo', () => {
      render(<CityCard city={mockCity} />)
      const icon = screen.getByAltText('Nublado')
      expect(icon).toBeInTheDocument()
      expect(icon.tagName).toBe('IMG')
    })
  })

  describe('Cuando el clima es de dia', () => {
    it('deberia usar el icono diurno', () => {
      render(<CityCard city={{ ...mockCity, isDay: true, weatherCode: 0 }} />)
      const icon = screen.getByAltText('Despejado')
      expect(icon.src).toContain('01d@2x.png')
    })
  })

  describe('Cuando el clima es de noche', () => {
    it('deberia usar el icono nocturno', () => {
      render(<CityCard city={{ ...mockCity, isDay: false, weatherCode: 0 }} />)
      const icon = screen.getByAltText('Despejado')
      expect(icon.src).toContain('01n@2x.png')
    })
  })

  describe('Cuando weatherCode no existe en la tabla WMO', () => {
    it('deberia mostrar "Desconocido" y el icono por defecto', () => {
      render(<CityCard city={{ ...mockCity, weatherCode: 999 }} />)
      expect(screen.getByText('Desconocido')).toBeInTheDocument()
      const icon = screen.getByAltText('Desconocido')
      expect(icon.src).toContain('01d@2x.png')
    })
  })
})
