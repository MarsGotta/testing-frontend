import { useState } from 'react'
import './SearchBar.css'

export function SearchBar({ query, onQueryChange, results, loading, onSelectCity }) {
  const [isOpen, setIsOpen] = useState(false)

  const handleInputChange = (e) => {
    onQueryChange(e.target.value)
    setIsOpen(true)
  }

  const handleSelect = (city) => {
    onSelectCity(city)
    setIsOpen(false)
    onQueryChange('')
  }

  const handleBlur = () => {
    setTimeout(() => setIsOpen(false), 200)
  }

  return (
    <div className="search-bar">
      <div className="search-bar__input-wrapper">
        <span className="search-bar__icon" aria-hidden="true">🔍</span>
        <input
          className="search-bar__input"
          type="text"
          placeholder="Buscar ciudad..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onBlur={handleBlur}
          aria-label="Buscar ciudad"
        />
        {loading && (
          <span
            className="search-bar__spinner"
            role="status"
            aria-label="Cargando resultados"
          />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="search-bar__results" role="listbox">
          {results.map((city) => (
            <li
              key={city.id}
              className="search-bar__result-item"
              role="option"
              onMouseDown={() => handleSelect(city)}
            >
              <span className="search-bar__result-name">{city.name}</span>
              <span className="search-bar__result-detail">
                {city.region ? `${city.region}, ` : ''}{city.country}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
