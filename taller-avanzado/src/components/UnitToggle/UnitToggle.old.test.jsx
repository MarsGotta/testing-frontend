// =================================================================
// Tests de UnitToggle con Jasmine sobre Karma.
//
// Montamos con `mountComponent` y disparamos clicks con `clickEl`
// desde la mini-helper `src/test-utils/jasmine-dom.jsx`. Para
// encontrar los botones escaneamos `querySelectorAll('button')`
// y filtramos por `textContent`, porque el componente no expone
// ids ni data-attributes para localizarlos.
//
// Los callbacks se espian con `jasmine.createSpy('nombre')` y se
// asertan con `.calls.count()`.
// =================================================================

import { mountComponent, clickEl } from '../../test-utils/jasmine-dom'
import { UnitToggle } from './UnitToggle'

// Helper local: encuentra el boton cuyo texto coincide con el
// esperado recorriendo los buttons del contenedor.
function getButtonByText(container, text) {
  return [...container.querySelectorAll('button')]
    .find((b) => b.textContent.trim() === text)
}

describe('UnitToggle (Jasmine)', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      mounted.unmount()
      mounted = null
    }
  })

  describe('Cuando se renderiza con celsius', () => {
    it('deberia mostrar los botones de °C y °F', () => {
      mounted = mountComponent(
        <UnitToggle unit="celsius" onToggle={jasmine.createSpy('onToggle')} />,
      )
      const { container } = mounted

      expect(getButtonByText(container, '°C')).toBeTruthy()
      expect(getButtonByText(container, '°F')).toBeTruthy()
    })

    it('deberia marcar °C como activo (aria-pressed)', () => {
      mounted = mountComponent(
        <UnitToggle unit="celsius" onToggle={jasmine.createSpy('onToggle')} />,
      )
      const { container } = mounted

      expect(getButtonByText(container, '°C').getAttribute('aria-pressed')).toBe('true')
      expect(getButtonByText(container, '°F').getAttribute('aria-pressed')).toBe('false')
    })

    it('deberia aplicar la clase --active al boton de celsius', () => {
      mounted = mountComponent(
        <UnitToggle unit="celsius" onToggle={jasmine.createSpy('onToggle')} />,
      )
      const { container } = mounted

      expect(getButtonByText(container, '°C').classList.contains('unit-toggle__button--active')).toBe(true)
      expect(getButtonByText(container, '°F').classList.contains('unit-toggle__button--active')).toBe(false)
    })
  })

  describe('Cuando se renderiza con fahrenheit', () => {
    it('deberia marcar °F como activo', () => {
      mounted = mountComponent(
        <UnitToggle unit="fahrenheit" onToggle={jasmine.createSpy('onToggle')} />,
      )
      const { container } = mounted

      expect(getButtonByText(container, '°F').getAttribute('aria-pressed')).toBe('true')
      expect(getButtonByText(container, '°C').getAttribute('aria-pressed')).toBe('false')
    })
  })

  describe('Cuando se hace click en el boton inactivo', () => {
    it('deberia llamar a onToggle al hacer click en °F estando en celsius', () => {
      const onToggle = jasmine.createSpy('onToggle')
      mounted = mountComponent(<UnitToggle unit="celsius" onToggle={onToggle} />)

      clickEl(getButtonByText(mounted.container, '°F'))

      expect(onToggle.calls.count()).toBe(1)
    })

    it('deberia llamar a onToggle al hacer click en °C estando en fahrenheit', () => {
      const onToggle = jasmine.createSpy('onToggle')
      mounted = mountComponent(<UnitToggle unit="fahrenheit" onToggle={onToggle} />)

      clickEl(getButtonByText(mounted.container, '°C'))

      expect(onToggle.calls.count()).toBe(1)
    })
  })

  describe('Cuando se hace click en el boton activo', () => {
    it('no deberia llamar a onToggle al hacer click en °C estando en celsius', () => {
      const onToggle = jasmine.createSpy('onToggle')
      mounted = mountComponent(<UnitToggle unit="celsius" onToggle={onToggle} />)

      clickEl(getButtonByText(mounted.container, '°C'))

      expect(onToggle.calls.count()).toBe(0)
    })
  })
})
