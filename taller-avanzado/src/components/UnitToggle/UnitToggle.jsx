import './UnitToggle.css'

export function UnitToggle({ unit, onToggle }) {
  return (
    <div className="unit-toggle" role="group" aria-label="Unidad de temperatura">
      <button
        className={`unit-toggle__button${unit === 'celsius' ? ' unit-toggle__button--active' : ''}`}
        onClick={() => unit !== 'celsius' && onToggle()}
        aria-pressed={unit === 'celsius'}
      >
        °C
      </button>
      <button
        className={`unit-toggle__button${unit === 'fahrenheit' ? ' unit-toggle__button--active' : ''}`}
        onClick={() => unit !== 'fahrenheit' && onToggle()}
        aria-pressed={unit === 'fahrenheit'}
      >
        °F
      </button>
    </div>
  )
}
