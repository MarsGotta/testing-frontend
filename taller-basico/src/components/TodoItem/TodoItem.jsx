import './TodoItem.css'

export function TodoItem({ todo, onToggle, onDelete }) {
  return (
    <li className={`todo-item ${todo.completed ? 'todo-item--completed' : ''}`}>
      <label className="todo-item__label">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={() => onToggle(todo.id)}
          className="todo-item__checkbox"
        />
        <span className="todo-item__text">{todo.text}</span>
      </label>
      <button
        onClick={() => onDelete(todo.id)}
        aria-label={`Eliminar ${todo.text}`}
        className="todo-item__delete"
      >
        Eliminar
      </button>
    </li>
  )
}
