// =================================================================
// Tests de CityCard con Jasmine sobre Karma.
//
// Montamos el componente con la mini-helper `mountComponent`
// (src/test-utils/jasmine-dom.jsx), que devuelve
// `{ container, unmount, rerender }`. Las queries se hacen con el
// DOM plano: `container.querySelector`, `textContent`,
// `getAttribute`.
//
// Para buscar por texto definimos un `findByText` local: recorre
// los nodos del contenedor y devuelve el primero cuyo textContent
// coincida exactamente.
// =================================================================

import { mountComponent } from '../../test-utils/jasmine-dom'
import { CityCard } from './CityCard'

// Busca el primer elemento cuyo textContent coincide exactamente
// con `text`.
function findByText(container, text) {
  const nodes = container.querySelectorAll('*')
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].textContent === text) return nodes[i]
  }
  return null
}

const mockCity = {
  name: 'New York',
  country: 'US',
  temperature: 18,
  weatherCode: 3,
  isDay: true,
}

describe('CityCard (Jasmine)', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      mounted.unmount()
      mounted = null
    }
  })

  describe('Cuando no recibe datos de ciudad', () => {
    it('deberia no renderizar nada cuando city es null', () => {
      mounted = mountComponent(<CityCard city={null} />)
      expect(mounted.container.firstChild).toBeNull()
    })

    it('deberia no renderizar nada cuando city es undefined', () => {
      mounted = mountComponent(<CityCard city={undefined} />)
      expect(mounted.container.firstChild).toBeNull()
    })
  })

  describe('Cuando recibe datos de ciudad validos', () => {
    it('deberia mostrar el nombre de la ciudad', () => {
      mounted = mountComponent(<CityCard city={mockCity} />)
      expect(findByText(mounted.container, 'New York')).toBeTruthy()
    })

    it('deberia mostrar el pais', () => {
      mounted = mountComponent(<CityCard city={mockCity} />)
      expect(findByText(mounted.container, 'US')).toBeTruthy()
    })

    it('deberia mostrar la temperatura con el simbolo de grado', () => {
      mounted = mountComponent(<CityCard city={mockCity} />)
      expect(findByText(mounted.container, '18°')).toBeTruthy()
    })

    it('deberia mostrar la descripcion del clima', () => {
      // weatherCode 3 = "Nublado"
      mounted = mountComponent(<CityCard city={mockCity} />)
      expect(findByText(mounted.container, 'Nublado')).toBeTruthy()
    })

    it('deberia mostrar el icono del clima con alt descriptivo', () => {
      mounted = mountComponent(<CityCard city={mockCity} />)
      const icon = mounted.container.querySelector('img[alt="Nublado"]')
      expect(icon).toBeTruthy()
      expect(icon.tagName).toBe('IMG')
    })
  })

  describe('Cuando el clima es de dia', () => {
    it('deberia usar el icono diurno', () => {
      mounted = mountComponent(
        <CityCard city={{ ...mockCity, isDay: true, weatherCode: 0 }} />
      )
      const icon = mounted.container.querySelector('img[alt="Despejado"]')
      expect(icon.src).toContain('01d@2x.png')
    })
  })

  describe('Cuando el clima es de noche', () => {
    it('deberia usar el icono nocturno', () => {
      mounted = mountComponent(
        <CityCard city={{ ...mockCity, isDay: false, weatherCode: 0 }} />
      )
      const icon = mounted.container.querySelector('img[alt="Despejado"]')
      expect(icon.src).toContain('01n@2x.png')
    })
  })

  describe('Cuando weatherCode no existe en la tabla WMO', () => {
    it('deberia mostrar "Desconocido" y el icono por defecto', () => {
      mounted = mountComponent(
        <CityCard city={{ ...mockCity, weatherCode: 999 }} />
      )
      expect(findByText(mounted.container, 'Desconocido')).toBeTruthy()
      const icon = mounted.container.querySelector('img[alt="Desconocido"]')
      expect(icon.src).toContain('01d@2x.png')
    })
  })
})
