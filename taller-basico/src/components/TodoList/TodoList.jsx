import { TodoItem } from '../TodoItem/TodoItem'
import './TodoList.css'

export function TodoList({ todos, onToggleTodo, onDeleteTodo }) {
  if (todos.length === 0) {
    return <p className="todo-list__empty">No hay tareas</p>
  }

  return (
    <ul aria-label="Lista de tareas" className="todo-list">
      {todos.map((todo) => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={onToggleTodo}
          onDelete={onDeleteTodo}
        />
      ))}
    </ul>
  )
}
