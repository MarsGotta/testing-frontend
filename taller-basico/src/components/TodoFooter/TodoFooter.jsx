import './TodoFooter.css'

export function TodoFooter({ remainingCount, completedCount, onClearCompleted }) {
  return (
    <footer className="todo-footer">
      <span className="todo-footer__count">
        {remainingCount} {remainingCount === 1 ? 'tarea pendiente' : 'tareas pendientes'}
      </span>
      {completedCount > 0 && (
        <button
          onClick={onClearCompleted}
          className="todo-footer__clear"
        >
          Limpiar completadas
        </button>
      )}
    </footer>
  )
}
