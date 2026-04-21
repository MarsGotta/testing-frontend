import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoItem } from './TodoItem'

describe('TodoItem', () => {
  // ============================================================
  // Renderizado
  // ============================================================

  describe('Cuando se renderiza con una tarea pendiente', () => {
    it('deberia mostrar el texto de la tarea y el checkbox desmarcado', () => {
      // Ajustar
      const tarea = { id: 'todo-1', text: 'Organizar el escritorio', completed: false }

      // Actuar
      render(<TodoItem todo={tarea} onToggle={vi.fn()} onDelete={vi.fn()} />)

      // Afirmar
      expect(screen.getByText('Organizar el escritorio')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })
  })

  describe('Cuando se renderiza con una tarea completada', () => {
    it('deberia mostrar el checkbox marcado', () => {
      // Ajustar
      const tarea = { id: 'todo-1', text: 'Enviar el paquete por correo', completed: true }

      // Actuar
      render(<TodoItem todo={tarea} onToggle={vi.fn()} onDelete={vi.fn()} />)

      // Afirmar
      expect(screen.getByRole('checkbox')).toBeChecked()
    })
  })

  // ============================================================
  // Interacciones
  // ============================================================

  describe('Cuando el usuario hace click en el checkbox', () => {
    it('deberia llamar a onToggle con el id de la tarea', async () => {
      // Ajustar
      const user = userEvent.setup()
      const tarea = { id: 'todo-abc', text: 'Regar las plantas del balcon', completed: false }
      const mockOnToggle = vi.fn()
      render(<TodoItem todo={tarea} onToggle={mockOnToggle} onDelete={vi.fn()} />)

      // Actuar
      await user.click(screen.getByRole('checkbox'))

      // Afirmar
      expect(mockOnToggle).toHaveBeenCalledWith('todo-abc')
      expect(mockOnToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Cuando el usuario hace click en el boton eliminar', () => {
    it('deberia llamar a onDelete con el id de la tarea', async () => {
      // Ajustar
      const user = userEvent.setup()
      const tarea = { id: 'todo-xyz', text: 'Devolver los libros a la biblioteca', completed: false }
      const mockOnDelete = vi.fn()
      render(<TodoItem todo={tarea} onToggle={vi.fn()} onDelete={mockOnDelete} />)

      // Actuar
      await user.click(screen.getByRole('button', { name: /eliminar devolver los libros/i }))

      // Afirmar
      expect(mockOnDelete).toHaveBeenCalledWith('todo-xyz')
      expect(mockOnDelete).toHaveBeenCalledTimes(1)
    })
  })
})
