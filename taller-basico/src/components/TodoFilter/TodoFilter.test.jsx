import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoFilter } from './TodoFilter'

describe('TodoFilter', () => {
  // ============================================================
  // Renderizado del filtro activo
  // ============================================================

  describe('Cuando se renderiza con el filtro "all" activo', () => {
    it('deberia mostrar el boton "Todas" como presionado y los demas no', () => {
      // Ajustar y Actuar
      render(<TodoFilter activeFilter="all" onFilterChange={vi.fn()} />)

      // Afirmar
      expect(screen.getByRole('button', { name: /todas/i })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: /activas/i })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: /completadas/i })).toHaveAttribute('aria-pressed', 'false')
    })
  })

  // ============================================================
  // Interaccion con filtros
  // ============================================================

  describe('Cuando el usuario hace click en el filtro "Activas"', () => {
    it('deberia llamar a onFilterChange con el valor "active"', async () => {
      // Ajustar
      const user = userEvent.setup()
      const mockOnFilterChange = vi.fn()
      render(<TodoFilter activeFilter="all" onFilterChange={mockOnFilterChange} />)

      // Actuar
      await user.click(screen.getByRole('button', { name: /activas/i }))

      // Afirmar
      expect(mockOnFilterChange).toHaveBeenCalledWith('active')
    })
  })

  describe('Cuando el usuario hace click en el filtro "Completadas"', () => {
    it('deberia llamar a onFilterChange con el valor "completed"', async () => {
      // Ajustar
      const user = userEvent.setup()
      const mockOnFilterChange = vi.fn()
      render(<TodoFilter activeFilter="all" onFilterChange={mockOnFilterChange} />)

      // Actuar
      await user.click(screen.getByRole('button', { name: /completadas/i }))

      // Afirmar
      expect(mockOnFilterChange).toHaveBeenCalledWith('completed')
    })
  })
})
