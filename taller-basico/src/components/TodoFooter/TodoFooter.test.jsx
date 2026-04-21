import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoFooter } from './TodoFooter'

describe('TodoFooter', () => {
  // ============================================================
  // Texto del contador
  // ============================================================

  describe('Cuando hay una sola tarea pendiente', () => {
    it('deberia mostrar el texto en singular "1 tarea pendiente"', () => {
      // Ajustar y Actuar
      render(<TodoFooter remainingCount={1} completedCount={0} onClearCompleted={vi.fn()} />)

      // Afirmar
      expect(screen.getByText(/1 tarea pendiente/i)).toBeInTheDocument()
    })
  })

  describe('Cuando hay varias tareas pendientes', () => {
    it('deberia mostrar el texto en plural "3 tareas pendientes"', () => {
      // Ajustar y Actuar
      render(<TodoFooter remainingCount={3} completedCount={0} onClearCompleted={vi.fn()} />)

      // Afirmar
      expect(screen.getByText(/3 tareas pendientes/i)).toBeInTheDocument()
    })
  })

  // ============================================================
  // Boton limpiar completadas
  // ============================================================

  describe('Cuando hay tareas completadas', () => {
    it('deberia mostrar el boton "Limpiar completadas"', () => {
      // Ajustar y Actuar
      render(<TodoFooter remainingCount={2} completedCount={3} onClearCompleted={vi.fn()} />)

      // Afirmar
      expect(screen.getByRole('button', { name: /limpiar completadas/i })).toBeInTheDocument()
    })

    it('deberia llamar a onClearCompleted al hacer click en el boton', async () => {
      // Ajustar
      const user = userEvent.setup()
      const mockClearCompleted = vi.fn()
      render(<TodoFooter remainingCount={1} completedCount={2} onClearCompleted={mockClearCompleted} />)

      // Actuar
      await user.click(screen.getByRole('button', { name: /limpiar completadas/i }))

      // Afirmar
      expect(mockClearCompleted).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cuando no hay tareas completadas', () => {
    it('no deberia mostrar el boton "Limpiar completadas"', () => {
      // Ajustar y Actuar
      render(<TodoFooter remainingCount={2} completedCount={0} onClearCompleted={vi.fn()} />)

      // Afirmar
      expect(screen.queryByRole('button', { name: /limpiar completadas/i })).not.toBeInTheDocument()
    })
  })
})
