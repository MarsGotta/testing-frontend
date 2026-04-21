import { useFavorites } from '../../store/FavoritesContext'
import './FavoriteButton.css'

export function FavoriteButton({ city }) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const active = isFavorite(city)

  return (
    <button
      type="button"
      className={`favorite-button${active ? ' favorite-button--active' : ''}`}
      aria-pressed={active}
      aria-label={active ? `Quitar ${city.name} de favoritas` : `Añadir ${city.name} a favoritas`}
      onClick={() => toggleFavorite(city)}
    >
      <span aria-hidden="true">{active ? '★' : '☆'}</span>
    </button>
  )
}
