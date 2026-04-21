import './TodoFilter.css'

export function TodoFilter({ activeFilter, onFilterChange }) {
  const filters = [
    { value: 'all', label: 'Todas' },
    { value: 'active', label: 'Activas' },
    { value: 'completed', label: 'Completadas' },
  ]

  return (
    <nav aria-label="Filtrar tareas" className="todo-filter">
      {filters.map(({ value, label }) => (
        <button
          key={value}
          aria-pressed={activeFilter === value}
          onClick={() => onFilterChange(value)}
          className={`todo-filter__button ${activeFilter === value ? 'todo-filter__button--active' : ''}`}
        >
          {label}
        </button>
      ))}
    </nav>
  )
}
