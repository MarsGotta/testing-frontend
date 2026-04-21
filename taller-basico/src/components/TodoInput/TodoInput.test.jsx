import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoInput } from './TodoInput'

describe('TodoInput', () => {
  // ============================================================
  // Renderizado
  // ============================================================

  describe('Cuando se renderiza el componente', () => {
    it('deberia mostrar un campo de texto con placeholder y un boton para agregar', () => {
      // Ajustar
      const mockOnAddTodo = vi.fn()

      // Actuar
      render(<TodoInput onAddTodo={mockOnAddTodo} />)

      // Afirmar
      expect(screen.getByLabelText(/nueva tarea/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/escribe una nueva tarea/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument()
    })
  })

  // ============================================================
  // Agregar tarea
  // ============================================================

  describe('Cuando el usuario escribe una tarea y hace click en Agregar', () => {
    it('deberia llamar a onAddTodo con el texto escrito', async () => {
      // Ajustar
      const user = userEvent.setup()
      const mockOnAddTodo = vi.fn()
      render(<TodoInput onAddTodo={mockOnAddTodo} />)

      // Actuar
      await user.type(screen.getByLabelText(/nueva tarea/i), 'Comprar pan en la panaderia')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      // Afirmar
      expect(mockOnAddTodo).toHaveBeenCalledWith('Comprar pan en la panaderia')
      expect(mockOnAddTodo).toHaveBeenCalledTimes(1)
    })

    it('deberia limpiar el campo de texto despues de agregar la tarea', async () => {
      // Ajustar
      const user = userEvent.setup()
      render(<TodoInput onAddTodo={vi.fn()} />)

      // Actuar
      await user.type(screen.getByLabelText(/nueva tarea/i), 'Pasear al perro por el parque')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      // Afirmar
      expect(screen.getByLabelText(/nueva tarea/i)).toHaveValue('')
    })
  })

  // ============================================================
  // Validacion
  // ============================================================

  describe('Cuando el usuario intenta agregar una tarea con el campo vacio', () => {
    it('no deberia llamar a onAddTodo', async () => {
      // Ajustar
      const user = userEvent.setup()
      const mockOnAddTodo = vi.fn()
      render(<TodoInput onAddTodo={mockOnAddTodo} />)

      // Actuar
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      // Afirmar
      expect(mockOnAddTodo).not.toHaveBeenCalled()
    })
  })

  // ============================================================
  // Envio con Enter
  // ============================================================

  describe('Cuando el usuario presiona Enter en el campo de texto', () => {
    it('deberia agregar la tarea sin necesidad de hacer click en el boton', async () => {
      // Ajustar
      const user = userEvent.setup()
      const mockOnAddTodo = vi.fn()
      render(<TodoInput onAddTodo={mockOnAddTodo} />)

      // Actuar
      await user.type(screen.getByLabelText(/nueva tarea/i), 'Revisar los apuntes de clase{Enter}')

      // Afirmar
      expect(mockOnAddTodo).toHaveBeenCalledWith('Revisar los apuntes de clase')
    })
  })
})
