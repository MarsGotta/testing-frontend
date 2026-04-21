import { render, screen } from '@testing-library/react'
import { TodoList } from './TodoList'

describe('TodoList', () => {
  // ============================================================
  // Lista vacia
  // ============================================================

  describe('Cuando no hay tareas', () => {
    it('deberia mostrar un mensaje indicando que no hay tareas', () => {
      // Ajustar y Actuar
      render(<TodoList todos={[]} onToggleTodo={vi.fn()} onDeleteTodo={vi.fn()} />)

      // Afirmar
      expect(screen.getByText(/no hay tareas/i)).toBeInTheDocument()
    })

    it('no deberia renderizar la lista', () => {
      // Ajustar y Actuar
      render(<TodoList todos={[]} onToggleTodo={vi.fn()} onDeleteTodo={vi.fn()} />)

      // Afirmar
      expect(screen.queryByRole('list')).not.toBeInTheDocument()
    })
  })

  // ============================================================
  // Lista con tareas
  // ============================================================

  describe('Cuando hay varias tareas', () => {
    it('deberia mostrar todas las tareas proporcionadas', () => {
      // Ajustar
      const tareas = [
        { id: '1', text: 'Hacer la cama antes de salir', completed: false },
        { id: '2', text: 'Comprar flores para la mesa', completed: true },
        { id: '3', text: 'Preparar la cena para la familia', completed: false },
      ]

      // Actuar
      render(<TodoList todos={tareas} onToggleTodo={vi.fn()} onDeleteTodo={vi.fn()} />)

      // Afirmar
      expect(screen.getByText('Hacer la cama antes de salir')).toBeInTheDocument()
      expect(screen.getByText('Comprar flores para la mesa')).toBeInTheDocument()
      expect(screen.getByText('Preparar la cena para la familia')).toBeInTheDocument()
    })

    it('deberia renderizar un checkbox por cada tarea', () => {
      // Ajustar
      const tareas = [
        { id: '1', text: 'Tarea uno', completed: false },
        { id: '2', text: 'Tarea dos', completed: true },
      ]

      // Actuar
      render(<TodoList todos={tareas} onToggleTodo={vi.fn()} onDeleteTodo={vi.fn()} />)

      // Afirmar
      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes).toHaveLength(2)
    })
  })
})
