// =================================================================
// Tests de SearchBar con Jasmine sobre Karma.
//
// Helpers que usamos (de src/test-utils/jasmine-dom.jsx):
//   · `mountComponent`   — monta el componente React.
//   · `setInputValue`    — simula escritura usando el setter nativo
//                          de `HTMLInputElement` + evento input/change.
//                          React 18 intercepta `input.value`: si lo
//                          asignas directo detecta "no cambio" y no
//                          dispara onChange. El setter nativo fuerza
//                          el evento.
//   · `focusEl`/`blurEl` — para abrir y cerrar el dropdown.
//   · `clickEl`          — selecciona una opcion. La `<li>` del
//                          SearchBar escucha `onMouseDown`, y
//                          `clickEl` dispara mousedown primero, asi
//                          que se activa como se espera.
//   · `jasmine.clock()`  — controla el setTimeout de 200ms que cierra
//                          el dropdown tras blur.
// =================================================================

import { act } from 'react'
import {
  mountComponent,
  setInputValue,
  focusEl,
  blurEl,
  clickEl,
} from '../../test-utils/jasmine-dom'
import { SearchBar } from './SearchBar'

const mockCities = [
  { id: 1, name: 'Madrid', country: 'Spain', region: 'Community of Madrid' },
  { id: 2, name: 'Málaga', country: 'Spain', region: 'Andalusia' },
]

function buildProps(overrides) {
  const defaults = {
    query: '',
    onQueryChange: jasmine.createSpy('onQueryChange'),
    results: [],
    loading: false,
    onSelectCity: jasmine.createSpy('onSelectCity'),
  }
  return Object.assign({}, defaults, overrides || {})
}

// Helpers locales de query.
function getInput(container) {
  return container.querySelector('input[aria-label="Buscar ciudad"]')
}

function getListbox(container) {
  return container.querySelector('[role="listbox"]')
}

function getOptions(container) {
  return container.querySelectorAll('[role="option"]')
}

// Busca un elemento cuyo textContent coincide (trim+exacto) con
// `text`. Si se pasa `selector`, restringe la busqueda a nodos que
// matcheen ese selector CSS.
function getByText(container, text, selector) {
  const nodes = selector
    ? container.querySelectorAll(selector)
    : container.querySelectorAll('*')
  return [...nodes].find((n) => n.textContent.trim() === text)
}

describe('SearchBar (Jasmine)', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      mounted.unmount()
      mounted = null
    }
  })

  describe('Cuando se renderiza con props por defecto', () => {
    it('deberia mostrar el input con el placeholder', () => {
      mounted = mountComponent(<SearchBar {...buildProps()} />)
      const input = getInput(mounted.container)
      expect(input).toBeTruthy()
      expect(input.getAttribute('placeholder')).toBe('Buscar ciudad...')
    })

    it('deberia reflejar el valor del query en el input', () => {
      mounted = mountComponent(<SearchBar {...buildProps({ query: 'Mad' })} />)
      expect(getInput(mounted.container).value).toBe('Mad')
    })
  })

  describe('Cuando el usuario escribe en el input', () => {
    it('deberia llamar a onQueryChange con cada caracter escrito', () => {
      const onQueryChange = jasmine.createSpy('onQueryChange')
      mounted = mountComponent(<SearchBar {...buildProps({ onQueryChange })} />)

      // Disparamos un unico cambio con el valor final: el test
      // comprueba que onQueryChange llega con 'M', no necesitamos
      // reproducir keydown/keypress por caracter.
      setInputValue(getInput(mounted.container), 'M')

      expect(onQueryChange.calls.count()).toBe(1)
      expect(onQueryChange.calls.mostRecent().args[0]).toBe('M')
    })
  })

  describe('Cuando hay resultados y el input tiene foco', () => {
    it('deberia mostrar la lista de resultados con cada ciudad', () => {
      mounted = mountComponent(<SearchBar {...buildProps({ results: mockCities })} />)
      // Hacer focus en el input es lo que abre el dropdown (via
      // onFocus del componente), asi que con `focusEl` basta.
      focusEl(getInput(mounted.container))

      const listbox = getListbox(mounted.container)
      expect(listbox).toBeTruthy()
      expect(listbox.querySelectorAll('[role="option"]').length).toBe(2)
    })

    it('deberia mostrar el nombre y la region de cada ciudad', () => {
      mounted = mountComponent(<SearchBar {...buildProps({ results: mockCities })} />)
      focusEl(getInput(mounted.container))
      const { container } = mounted

      expect(getByText(container, 'Madrid', '.search-bar__result-name')).toBeTruthy()
      expect(getByText(container, 'Community of Madrid, Spain', '.search-bar__result-detail')).toBeTruthy()
      expect(getByText(container, 'Málaga', '.search-bar__result-name')).toBeTruthy()
      expect(getByText(container, 'Andalusia, Spain', '.search-bar__result-detail')).toBeTruthy()
    })

    it('deberia mostrar solo el pais cuando la ciudad no tiene region', () => {
      mounted = mountComponent(
        <SearchBar
          {...buildProps({
            results: [{ id: 3, name: 'Monaco', country: 'Monaco', region: '' }],
          })}
        />,
      )
      focusEl(getInput(mounted.container))
      // Con region vacio el detalle muestra solo "Monaco" (no
      // "Region, Monaco"). Filtramos por la clase porque hay varios
      // elementos con el texto "Monaco" (nombre y pais).
      expect(
        getByText(mounted.container, 'Monaco', '.search-bar__result-detail'),
      ).toBeTruthy()
    })
  })

  describe('Cuando no hay resultados', () => {
    it('no deberia mostrar la lista de resultados', () => {
      mounted = mountComponent(<SearchBar {...buildProps({ results: [] })} />)
      focusEl(getInput(mounted.container))
      expect(getListbox(mounted.container)).toBeNull()
    })
  })

  describe('Cuando se selecciona una ciudad', () => {
    it('deberia llamar a onSelectCity con la ciudad seleccionada', () => {
      const onSelectCity = jasmine.createSpy('onSelectCity')
      mounted = mountComponent(
        <SearchBar {...buildProps({ results: mockCities, onSelectCity })} />,
      )

      focusEl(getInput(mounted.container))
      // clickEl dispara mousedown primero — y la `<li>` del
      // SearchBar escucha onMouseDown, no onClick.
      clickEl(getOptions(mounted.container)[0])

      expect(onSelectCity.calls.mostRecent().args[0]).toEqual(mockCities[0])
    })

    it('deberia limpiar el query al seleccionar (onQueryChange con "")', () => {
      const onQueryChange = jasmine.createSpy('onQueryChange')
      mounted = mountComponent(
        <SearchBar {...buildProps({ results: mockCities, onQueryChange })} />,
      )

      focusEl(getInput(mounted.container))
      clickEl(getOptions(mounted.container)[0])

      expect(onQueryChange.calls.mostRecent().args[0]).toBe('')
    })
  })

  describe('Cuando esta cargando', () => {
    it('deberia mostrar el spinner como elemento de status', () => {
      mounted = mountComponent(<SearchBar {...buildProps({ loading: true })} />)
      // role="status" + aria-label descriptivo: el componente expone
      // el spinner semanticamente para que el test no dependa de
      // clases CSS.
      const status = mounted.container.querySelector('[role="status"]')
      expect(status).toBeTruthy()
      expect(/cargando resultados/i.test(status.getAttribute('aria-label'))).toBe(true)
    })

    it('no deberia mostrar el spinner cuando no esta cargando', () => {
      mounted = mountComponent(<SearchBar {...buildProps({ loading: false })} />)
      expect(mounted.container.querySelector('[role="status"]')).toBeNull()
    })
  })

  describe('Cuando el input pierde foco', () => {
    // handleBlur cierra el dropdown tras 200ms. Instalamos el reloj
    // fake de Jasmine y avanzamos con `tick(ms)`. El callback del
    // setTimeout es sincrono (solo setIsOpen(false)), asi que el
    // tick basta — no hace falta flushear microtasks.
    beforeEach(() => {
      jasmine.clock().install()
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })

    it('deberia cerrar la lista tras 200ms de salir del input', () => {
      mounted = mountComponent(<SearchBar {...buildProps({ results: mockCities })} />)
      const input = getInput(mounted.container)

      focusEl(input)
      expect(getListbox(mounted.container)).toBeTruthy()

      blurEl(input)

      // Antes de los 200ms todavia esta abierto.
      act(() => {
        jasmine.clock().tick(199)
      })
      expect(getListbox(mounted.container)).toBeTruthy()

      // A partir de 200ms se cierra.
      act(() => {
        jasmine.clock().tick(1)
      })
      expect(getListbox(mounted.container)).toBeNull()
    })
  })
})
