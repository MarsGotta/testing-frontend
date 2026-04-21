import { useReducer, useState, useMemo } from 'react'

const todosReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_TODO':
      return [
        ...state,
        {
          id: crypto.randomUUID(),
          text: action.payload,
          completed: false,
        },
      ]
    case 'TOGGLE_TODO':
      return state.map((todo) =>
        todo.id === action.payload
          ? { ...todo, completed: !todo.completed }
          : todo
      )
    case 'DELETE_TODO':
      return state.filter((todo) => todo.id !== action.payload)
    case 'CLEAR_COMPLETED':
      return state.filter((todo) => !todo.completed)
    default:
      return state
  }
}

export function useTodos(initialTodos = []) {
  const [todos, dispatch] = useReducer(todosReducer, initialTodos)
  const [activeFilter, setActiveFilter] = useState('all')

  const filteredTodos = useMemo(() => {
    switch (activeFilter) {
      case 'active':
        return todos.filter((todo) => !todo.completed)
      case 'completed':
        return todos.filter((todo) => todo.completed)
      default:
        return todos
    }
  }, [todos, activeFilter])

  const remainingCount = useMemo(
    () => todos.filter((todo) => !todo.completed).length,
    [todos]
  )

  const completedCount = useMemo(
    () => todos.filter((todo) => todo.completed).length,
    [todos]
  )

  const addTodo = (text) => {
    if (text.trim()) {
      dispatch({ type: 'ADD_TODO', payload: text.trim() })
    }
  }

  const toggleTodo = (id) => {
    dispatch({ type: 'TOGGLE_TODO', payload: id })
  }

  const deleteTodo = (id) => {
    dispatch({ type: 'DELETE_TODO', payload: id })
  }

  const setFilter = (filter) => {
    setActiveFilter(filter)
  }

  const clearCompleted = () => {
    dispatch({ type: 'CLEAR_COMPLETED' })
  }

  return {
    todos,
    filteredTodos,
    activeFilter,
    remainingCount,
    completedCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    setFilter,
    clearCompleted,
  }
}
