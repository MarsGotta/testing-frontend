import { useTodos } from '../../hooks/useTodos'
import { TodoInput } from '../TodoInput/TodoInput'
import { TodoList } from '../TodoList/TodoList'
import { TodoFilter } from '../TodoFilter/TodoFilter'
import { TodoFooter } from '../TodoFooter/TodoFooter'
import './TodoApp.css'

export function TodoApp() {
  const {
    filteredTodos,
    activeFilter,
    remainingCount,
    completedCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    setFilter,
    clearCompleted,
  } = useTodos()

  return (
    <section className="todo-app">
      <h1 className="todo-app__title">Mis Tareas</h1>
      <TodoInput onAddTodo={addTodo} />
      <TodoFilter activeFilter={activeFilter} onFilterChange={setFilter} />
      <TodoList
        todos={filteredTodos}
        onToggleTodo={toggleTodo}
        onDeleteTodo={deleteTodo}
      />
      <TodoFooter
        remainingCount={remainingCount}
        completedCount={completedCount}
        onClearCompleted={clearCompleted}
      />
    </section>
  )
}
