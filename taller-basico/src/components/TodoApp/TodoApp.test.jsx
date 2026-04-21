import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoApp } from './TodoApp'

describe('TodoApp', () => {
  // ============================================================
  // Carga inicial
  // ============================================================

  describe('Cuando la aplicacion se carga por primera vez', () => {
    it('deberia mostrar el titulo, el campo de entrada y un mensaje de lista vacia', () => {
      // Ajustar y Actuar
      render(<TodoApp />)

      // Afirmar
      expect(screen.getByRole('heading', { name: /mis tareas/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/nueva tarea/i)).toBeInTheDocument()
      expect(screen.getByText(/no hay tareas/i)).toBeInTheDocument()
    })
  })

  // ============================================================
  // Agregar tareas
  // ============================================================

  describe('Cuando el usuario agrega una nueva tarea', () => {
    it('deberia mostrar la tarea en la lista y ocultar el mensaje de lista vacia', async () => {
      // Ajustar
      const user = userEvent.setup()
      render(<TodoApp />)

      // Actuar
      await user.type(screen.getByLabelText(/nueva tarea/i), 'Comprar leche en el supermercado')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      // Afirmar
      expect(screen.getByText('Comprar leche en el supermercado')).toBeInTheDocument()
      expect(screen.queryByText(/no hay tareas/i)).not.toBeInTheDocument()
    })

    it('deberia actualizar el contador de tareas pendientes', async () => {
      // Ajustar
      const user = userEvent.setup()
      render(<TodoApp />)

      // Actuar
      await user.type(screen.getByLabelText(/nueva tarea/i), 'Ir al gimnasio por la manana')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      // Afirmar
      expect(screen.getByText(/1 tarea pendiente$/i)).toBeInTheDocument()
    })
  })

  // ============================================================
  // Completar tareas
  // ============================================================

  describe('Cuando el usuario marca una tarea como completada', () => {
    it('deberia marcar el checkbox y actualizar el contador', async () => {
      // Ajustar
      const user = userEvent.setup()
      render(<TodoApp />)
      await user.type(screen.getByLabelText(/nueva tarea/i), 'Leer el capitulo 5 del libro')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      // Actuar
      await user.click(screen.getByRole('checkbox'))

      // Afirmar
      expect(screen.getByRole('checkbox')).toBeChecked()
      expect(screen.getByText(/0 tareas pendientes/i)).toBeInTheDocument()
    })
  })

  // ============================================================
  // Eliminar tareas
  // ============================================================

  describe('Cuando el usuario elimina una tarea', () => {
    it('deberia quitar la tarea de la lista', async () => {
      // Ajustar
      const user = userEvent.setup()
      render(<TodoApp />)
      await user.type(screen.getByLabelText(/nueva tarea/i), 'Sacar la basura antes de las diez')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      // Actuar
      await user.click(screen.getByRole('button', { name: /eliminar sacar la basura/i }))

      // Afirmar
      expect(screen.queryByText('Sacar la basura antes de las diez')).not.toBeInTheDocument()
      expect(screen.getByText(/no hay tareas/i)).toBeInTheDocument()
    })
  })

  // ============================================================
  // Filtrar tareas
  // ============================================================

  describe('Cuando el usuario filtra las tareas', () => {
    it('deberia mostrar solo las tareas activas al seleccionar el filtro "Activas"', async () => {
      // Ajustar
      const user = userEvent.setup()
      render(<TodoApp />)

      await user.type(screen.getByLabelText(/nueva tarea/i), 'Tarea que voy a completar')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      await user.type(screen.getByLabelText(/nueva tarea/i), 'Tarea que queda pendiente')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      // Completar la primera tarea
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])

      // Actuar
      await user.click(screen.getByRole('button', { name: /activas/i }))

      // Afirmar
      expect(screen.getByText('Tarea que queda pendiente')).toBeInTheDocument()
      expect(screen.queryByText('Tarea que voy a completar')).not.toBeInTheDocument()
    })

    it('deberia mostrar solo las tareas completadas al seleccionar el filtro "Completadas"', async () => {
      // Ajustar
      const user = userEvent.setup()
      render(<TodoApp />)

      await user.type(screen.getByLabelText(/nueva tarea/i), 'Tarea completada ejemplo')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      await user.type(screen.getByLabelText(/nueva tarea/i), 'Tarea pendiente ejemplo')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      await user.click(screen.getAllByRole('checkbox')[0])

      // Actuar - usamos within() para buscar dentro del nav de filtros
      // y evitar ambiguedad con el boton "Limpiar completadas"
      const filtros = screen.getByRole('navigation', { name: /filtrar tareas/i })
      await user.click(within(filtros).getByRole('button', { name: /completadas/i }))

      // Afirmar
      expect(screen.getByText('Tarea completada ejemplo')).toBeInTheDocument()
      expect(screen.queryByText('Tarea pendiente ejemplo')).not.toBeInTheDocument()
    })
  })

  // ============================================================
  // Limpiar completadas
  // ============================================================

  describe('Cuando el usuario limpia las tareas completadas', () => {
    it('deberia eliminar las completadas y mantener las pendientes', async () => {
      // Ajustar
      const user = userEvent.setup()
      render(<TodoApp />)

      await user.type(screen.getByLabelText(/nueva tarea/i), 'Tarea que completare')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      await user.type(screen.getByLabelText(/nueva tarea/i), 'Tarea que mantendre pendiente')
      await user.click(screen.getByRole('button', { name: /agregar/i }))

      await user.click(screen.getAllByRole('checkbox')[0])

      // Actuar
      await user.click(screen.getByRole('button', { name: /limpiar completadas/i }))

      // Afirmar
      expect(screen.queryByText('Tarea que completare')).not.toBeInTheDocument()
      expect(screen.getByText('Tarea que mantendre pendiente')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /limpiar completadas/i })).not.toBeInTheDocument()
    })
  })

  // ============================================================
  // Flujo completo
  // ============================================================

  describe('Cuando el usuario agrega varias tareas y completa algunas', () => {
    it('deberia mostrar el contador correcto de tareas pendientes en todo momento', async () => {
      // Ajustar
      const user = userEvent.setup()
      render(<TodoApp />)

      // Actuar - agregar 3 tareas
      const textosTareas = [
        'Pagar la factura del telefono',
        'Recoger el paquete en correos',
        'Comprar comida para el gato',
      ]

      for (const texto of textosTareas) {
        await user.type(screen.getByLabelText(/nueva tarea/i), texto)
        await user.click(screen.getByRole('button', { name: /agregar/i }))
      }

      // Afirmar - 3 tareas pendientes
      expect(screen.getByText(/3 tareas pendientes/i)).toBeInTheDocument()

      // Actuar - completar una tarea
      await user.click(screen.getAllByRole('checkbox')[0])

      // Afirmar - 2 tareas pendientes
      expect(screen.getByText(/2 tareas pendientes/i)).toBeInTheDocument()
    })
  })
})
