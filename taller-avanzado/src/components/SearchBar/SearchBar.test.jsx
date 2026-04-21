import { render, screen, within, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SearchBar } from './SearchBar'

const defaultProps = {
  query: '',
  onQueryChange: vi.fn(),
  results: [],
  loading: false,
  onSelectCity: vi.fn(),
}

const mockCities = [
  { id: 1, name: 'Madrid', country: 'Spain', region: 'Community of Madrid' },
  { id: 2, name: 'Málaga', country: 'Spain', region: 'Andalusia' },
]

describe('SearchBar', () => {
  describe('Cuando se renderiza con props por defecto', () => {
    it('deberia mostrar el input con el placeholder', () => {
      render(<SearchBar {...defaultProps} />)
      const input = screen.getByLabelText('Buscar ciudad')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('placeholder', 'Buscar ciudad...')
    })

    // ¿Tiene sentido este test? Solo si el input no es nativo de HTML y hay que testear el valor del query.
    it('deberia reflejar el valor del query en el input', () => {
      render(<SearchBar {...defaultProps} query="Mad" />)
      expect(screen.getByLabelText('Buscar ciudad')).toHaveValue('Mad')
    })
  })

  describe('Cuando el usuario escribe en el input', () => {
    it('deberia llamar a onQueryChange con cada caracter escrito', async () => {
      const onQueryChange = vi.fn() // ¿qué es esto?
      const user = userEvent.setup()

      render(<SearchBar {...defaultProps} onQueryChange={onQueryChange} />)

      await user.type(screen.getByLabelText('Buscar ciudad'), 'M')

      // userEvent.type dispara onChange por cada carácter (1 aquí).
      expect(onQueryChange).toHaveBeenCalledWith('M')
    })
  })

  describe('Cuando hay resultados y el input tiene foco', () => {
    it('deberia mostrar la lista de resultados con cada ciudad', async () => {
      const user = userEvent.setup()

      render(<SearchBar {...defaultProps} results={mockCities} />)

      await user.click(screen.getByLabelText('Buscar ciudad'))

      const listbox = screen.getByRole('listbox')
      expect(listbox).toBeInTheDocument()
      expect(within(listbox).getAllByRole('option')).toHaveLength(2)
    })

    it('deberia mostrar el nombre y la region de cada ciudad', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} results={mockCities} />)
      await user.click(screen.getByLabelText('Buscar ciudad'))

      expect(screen.getByText('Madrid')).toBeInTheDocument()
      expect(
        screen.getByText('Community of Madrid, Spain'),
      ).toBeInTheDocument()
      expect(screen.getByText('Málaga')).toBeInTheDocument()
      expect(screen.getByText('Andalusia, Spain')).toBeInTheDocument()
    })

    it('deberia mostrar solo el pais cuando la ciudad no tiene region', async () => {
      const user = userEvent.setup()
      render(
        <SearchBar
          {...defaultProps}
          results={[{ id: 3, name: 'Monaco', country: 'Monaco', region: '' }]}
        />,
      )
      await user.click(screen.getByLabelText('Buscar ciudad'))
      // Sin region, el separador ", " no debe aparecer (solo "Monaco").
      expect(screen.getByText('Monaco', { selector: '.search-bar__result-detail' })).toBeInTheDocument()
    })
  })

  describe('Cuando no hay resultados', () => {
    it('no deberia mostrar la lista de resultados', async () => {
      const user = userEvent.setup()
      render(<SearchBar {...defaultProps} results={[]} />)
      await user.click(screen.getByLabelText('Buscar ciudad'))
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('Cuando se selecciona una ciudad', () => {
    it('deberia llamar a onSelectCity con la ciudad seleccionada', async () => {
      const onSelectCity = vi.fn()
      const user = userEvent.setup()

      render(
        <SearchBar
          {...defaultProps}
          results={mockCities}
          onSelectCity={onSelectCity}
        />,
      )

      await user.click(screen.getByLabelText('Buscar ciudad'))
      await user.click(screen.getAllByRole('option')[0])

      expect(onSelectCity).toHaveBeenCalledWith(mockCities[0])
    })

    it('deberia limpiar el query al seleccionar (onQueryChange con "")', async () => {
      const onQueryChange = vi.fn()
      const user = userEvent.setup()

      render(
        <SearchBar
          {...defaultProps}
          results={mockCities}
          onQueryChange={onQueryChange}
        />,
      )

      await user.click(screen.getByLabelText('Buscar ciudad'))
      await user.click(screen.getAllByRole('option')[0])

      expect(onQueryChange).toHaveBeenLastCalledWith('')
    })
  })

  describe('Cuando esta cargando', () => {
    it('deberia mostrar el spinner como elemento de status', () => {
      render(<SearchBar {...defaultProps} loading={true} />)
      // El spinner expone role="status" y aria-label "Cargando
      // resultados". Así se detecta sin depender del selector CSS.
      expect(
        screen.getByRole('status', { name: /cargando resultados/i }),
      ).toBeInTheDocument()
    })

    it('no deberia mostrar el spinner cuando no esta cargando', () => {
      render(<SearchBar {...defaultProps} loading={false} />)
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })

  describe('Cuando el input pierde foco', () => {
    // handleBlur tiene un setTimeout de 200ms antes de cerrar el
    // dropdown. Esto permite que un click en una opción llegue antes
    // de que se desmonte. Se verifica con vi.useFakeTimers() para
    // controlar el avance del reloj.
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('deberia cerrar la lista tras 200ms de salir del input', () => {
      render(<SearchBar {...defaultProps} results={mockCities} />)

      const input = screen.getByLabelText('Buscar ciudad')
      // Abrir dropdown con focus (fireEvent porque userEvent + fake
      // timers tiene fricción innecesaria para este caso puntual).
      fireEvent.focus(input)
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      // Disparar blur → hay un setTimeout de 200ms antes de cerrar.
      fireEvent.blur(input)

      // Antes de los 200ms todavía debe estar abierto (permite que
      // un click en una opción llegue antes de que se desmonte).
      // act() es necesario porque el callback del setTimeout dispara
      // un setState que provoca re-render.
      act(() => vi.advanceTimersByTime(199))
      expect(screen.getByRole('listbox')).toBeInTheDocument()

      // A partir de los 200ms se cierra.
      act(() => vi.advanceTimersByTime(1))
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })
})
