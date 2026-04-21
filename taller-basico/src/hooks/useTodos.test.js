import { renderHook, act } from '@testing-library/react'
import { useTodos } from './useTodos'

describe('useTodos', () => {
  // ============================================================
  // Inicializacion
  // ============================================================

  describe('Cuando se inicializa sin argumentos', () => {
    it('deberia devolver una lista de tareas vacia', () => {
      // Ajustar y Actuar
      const { result } = renderHook(() => useTodos())

      // Afirmar
      expect(result.current.todos).toEqual([])
      expect(result.current.remainingCount).toBe(0)
      expect(result.current.completedCount).toBe(0)
    })
  })

  describe('Cuando se inicializa con tareas existentes', () => {
    it('deberia devolver las tareas proporcionadas con los contadores correctos', () => {
      // Ajustar
      const tareasIniciales = [
        { id: '1', text: 'Comprar leche en el supermercado', completed: false },
        { id: '2', text: 'Estudiar para el examen de matematicas', completed: true },
      ]

      // Actuar
      const { result } = renderHook(() => useTodos(tareasIniciales))

      // Afirmar
      expect(result.current.todos).toHaveLength(2)
      expect(result.current.remainingCount).toBe(1)
      expect(result.current.completedCount).toBe(1)
    })
  })

  // ============================================================
  // Agregar tareas
  // ============================================================

  describe('Cuando se agrega una nueva tarea', () => {
    it('deberia incluir la nueva tarea en la lista como pendiente', () => {
      // Ajustar
      const { result } = renderHook(() => useTodos())

      // Actuar
      act(() => {
        result.current.addTodo('Llamar al dentista para pedir cita')
      })

      // Afirmar
      expect(result.current.todos).toHaveLength(1)
      expect(result.current.todos[0].text).toBe('Llamar al dentista para pedir cita')
      expect(result.current.todos[0].completed).toBe(false)
    })

    it('deberia incrementar el contador de tareas pendientes', () => {
      // Ajustar
      const { result } = renderHook(() => useTodos())

      // Actuar
      act(() => {
        result.current.addTodo('Preparar la presentacion del proyecto')
      })

      // Afirmar
      expect(result.current.remainingCount).toBe(1)
    })

    it('no deberia agregar una tarea si el texto esta vacio o solo tiene espacios', () => {
      // Ajustar
      const { result } = renderHook(() => useTodos())

      // Actuar
      act(() => {
        result.current.addTodo('   ')
      })

      // Afirmar
      expect(result.current.todos).toHaveLength(0)
    })
  })

  // ============================================================
  // Completar tareas
  // ============================================================

  describe('Cuando se marca una tarea como completada', () => {
    it('deberia cambiar el estado de completada de la tarea', () => {
      // Ajustar
      const tareasIniciales = [
        { id: 'todo-1', text: 'Enviar el informe mensual', completed: false },
      ]
      const { result } = renderHook(() => useTodos(tareasIniciales))

      // Actuar
      act(() => {
        result.current.toggleTodo('todo-1')
      })

      // Afirmar
      expect(result.current.todos[0].completed).toBe(true)
    })

    it('deberia decrementar el contador de tareas pendientes', () => {
      // Ajustar
      const tareasIniciales = [
        { id: 'todo-1', text: 'Enviar el informe mensual', completed: false },
        { id: 'todo-2', text: 'Revisar el correo electronico', completed: false },
      ]
      const { result } = renderHook(() => useTodos(tareasIniciales))

      // Actuar
      act(() => {
        result.current.toggleTodo('todo-1')
      })

      // Afirmar
      expect(result.current.remainingCount).toBe(1)
      expect(result.current.completedCount).toBe(1)
    })
  })

  // ============================================================
  // Eliminar tareas
  // ============================================================

  describe('Cuando se elimina una tarea', () => {
    it('deberia remover la tarea de la lista', () => {
      // Ajustar
      const tareasIniciales = [
        { id: 'todo-1', text: 'Comprar el regalo de cumpleanos', completed: false },
        { id: 'todo-2', text: 'Reservar mesa en el restaurante', completed: false },
      ]
      const { result } = renderHook(() => useTodos(tareasIniciales))

      // Actuar
      act(() => {
        result.current.deleteTodo('todo-1')
      })

      // Afirmar
      expect(result.current.todos).toHaveLength(1)
      expect(result.current.todos[0].text).toBe('Reservar mesa en el restaurante')
    })
  })

  // ============================================================
  // Filtrar tareas
  // ============================================================

  describe('Cuando se filtran las tareas', () => {
    it('deberia mostrar solo las tareas activas al filtrar por "active"', () => {
      // Ajustar
      const tareasIniciales = [
        { id: '1', text: 'Hacer la compra semanal', completed: true },
        { id: '2', text: 'Limpiar la casa', completed: false },
      ]
      const { result } = renderHook(() => useTodos(tareasIniciales))

      // Actuar
      act(() => {
        result.current.setFilter('active')
      })

      // Afirmar
      expect(result.current.filteredTodos).toHaveLength(1)
      expect(result.current.filteredTodos[0].text).toBe('Limpiar la casa')
    })

    it('deberia mostrar solo las tareas completadas al filtrar por "completed"', () => {
      // Ajustar
      const tareasIniciales = [
        { id: '1', text: 'Hacer la compra semanal', completed: true },
        { id: '2', text: 'Limpiar la casa', completed: false },
      ]
      const { result } = renderHook(() => useTodos(tareasIniciales))

      // Actuar
      act(() => {
        result.current.setFilter('completed')
      })

      // Afirmar
      expect(result.current.filteredTodos).toHaveLength(1)
      expect(result.current.filteredTodos[0].text).toBe('Hacer la compra semanal')
    })

    it('deberia mostrar todas las tareas al filtrar por "all"', () => {
      // Ajustar
      const tareasIniciales = [
        { id: '1', text: 'Tarea completada', completed: true },
        { id: '2', text: 'Tarea pendiente', completed: false },
      ]
      const { result } = renderHook(() => useTodos(tareasIniciales))

      // Actuar
      act(() => {
        result.current.setFilter('all')
      })

      // Afirmar
      expect(result.current.filteredTodos).toHaveLength(2)
    })
  })

  // ============================================================
  // Limpiar completadas
  // ============================================================

  describe('Cuando se limpian las tareas completadas', () => {
    it('deberia eliminar todas las tareas completadas y mantener las pendientes', () => {
      // Ajustar
      const tareasIniciales = [
        { id: '1', text: 'Tarea completada uno', completed: true },
        { id: '2', text: 'Tarea pendiente', completed: false },
        { id: '3', text: 'Tarea completada dos', completed: true },
      ]
      const { result } = renderHook(() => useTodos(tareasIniciales))

      // Actuar
      act(() => {
        result.current.clearCompleted()
      })

      // Afirmar
      expect(result.current.todos).toHaveLength(1)
      expect(result.current.todos[0].text).toBe('Tarea pendiente')
      expect(result.current.completedCount).toBe(0)
    })
  })
})
