import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { UnitToggle } from './UnitToggle'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('UnitToggle', () => {
  describe('Cuando se renderiza con celsius', () => {
    it('deberia mostrar los botones de °C y °F', () => {
      render(<UnitToggle unit="celsius" onToggle={vi.fn()} />)

      expect(screen.getByText('°C')).toBeInTheDocument()
      expect(screen.getByText('°F')).toBeInTheDocument()
    })

    it('deberia marcar °C como activo (aria-pressed)', () => {
      render(<UnitToggle unit="celsius" onToggle={vi.fn()} />)

      expect(screen.getByText('°C')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('°F')).toHaveAttribute('aria-pressed', 'false')
    })

    it('deberia aplicar la clase --active al boton de celsius', () => {
      render(<UnitToggle unit="celsius" onToggle={vi.fn()} />)

      expect(screen.getByText('°C')).toHaveClass('unit-toggle__button--active')
      expect(screen.getByText('°F')).not.toHaveClass('unit-toggle__button--active')
    })
  })

  describe('Cuando se renderiza con fahrenheit', () => {
    it('deberia marcar °F como activo', () => {
      render(<UnitToggle unit="fahrenheit" onToggle={vi.fn()} />)

      expect(screen.getByText('°F')).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('°C')).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('Cuando se hace click en el boton inactivo', () => {
    it('deberia llamar a onToggle al hacer click en °F estando en celsius', async () => {
      const onToggle = vi.fn()
      const user = userEvent.setup()

      render(<UnitToggle unit="celsius" onToggle={onToggle} />)

      await user.click(screen.getByText('°F'))

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('deberia llamar a onToggle al hacer click en °C estando en fahrenheit', async () => {
      const onToggle = vi.fn()
      const user = userEvent.setup()

      render(<UnitToggle unit="fahrenheit" onToggle={onToggle} />)

      await user.click(screen.getByText('°C'))

      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cuando se hace click en el boton activo', () => {
    it('no deberia llamar a onToggle al hacer click en °C estando en celsius', async () => {
      const onToggle = vi.fn()
      const user = userEvent.setup()

      render(<UnitToggle unit="celsius" onToggle={onToggle} />)

      await user.click(screen.getByText('°C'))

      expect(onToggle).not.toHaveBeenCalled()
    })
  })
})
