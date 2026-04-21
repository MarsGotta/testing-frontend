import { useState } from 'react'
import './TodoInput.css'

export function TodoInput({ onAddTodo }) {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (text.trim()) {
      onAddTodo(text.trim())
      setText('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="todo-input">
      <label htmlFor="new-todo" className="todo-input__label">
        Nueva tarea
      </label>
      <div className="todo-input__row">
        <input
          id="new-todo"
          type="text"
          placeholder="Escribe una nueva tarea..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="todo-input__field"
        />
        <button type="submit" className="todo-input__button">
          Agregar
        </button>
      </div>
    </form>
  )
}
