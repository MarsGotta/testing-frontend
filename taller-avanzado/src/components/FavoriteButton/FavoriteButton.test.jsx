// ============================================================
// FavoriteButton · test de componente que consume Context (Vitest)
//
// Patron:
//   - Envolvemos el render en el Provider — es asi como deben
//     probarse los componentes que usan Context: "montalo como
//     lo monta la app".
//   - Para aserciones sobre el estado del store, usamos un hook
//     "probe" renderizado en paralelo (`useFavorites()` dentro de
//     un componente auxiliar) en lugar de alcanzar al storage.
//     Asi el test verifica el efecto observable.
// ============================================================

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FavoriteButton } from './FavoriteButton'
import { FavoritesProvider, useFavorites } from '../../store/FavoritesContext'

const madrid = { name: 'Madrid', lat: 40.41, lon: -3.70 }

// Helper que monta el componente dentro del Provider. Expone
// tambien una "sonda" para consultar el estado del store sin
// tocar el storage.
function renderWithFavorites(ui, { initialFavorites = [] } = {}) {
  const probe = {}

  function Probe() {
    Object.assign(probe, useFavorites())
    return null
  }

  const memStorage = createMemoryStorage(
    initialFavorites.length ? { 'weather.favorites.v1': JSON.stringify(initialFavorites) } : {},
  )

  render(
    <FavoritesProvider storage={memStorage}>
      {ui}
      <Probe />
    </FavoritesProvider>,
  )

  return { probe }
}

function createMemoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial))
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  }
}

describe('FavoriteButton', () => {
  describe('Cuando la ciudad NO es favorita', () => {
    it('deberia mostrar la estrella vacia y aria-pressed=false', () => {
      renderWithFavorites(<FavoriteButton city={madrid} />)

      const button = screen.getByRole('button', { name: /añadir madrid a favoritas/i })
      expect(button).toHaveAttribute('aria-pressed', 'false')
      expect(button).toHaveTextContent('☆')
    })
  })

  describe('Cuando la ciudad SI es favorita', () => {
    it('deberia mostrar la estrella llena y aria-pressed=true', () => {
      renderWithFavorites(<FavoriteButton city={madrid} />, { initialFavorites: [madrid] })

      const button = screen.getByRole('button', { name: /quitar madrid de favoritas/i })
      expect(button).toHaveAttribute('aria-pressed', 'true')
      expect(button).toHaveTextContent('★')
    })
  })

  describe('Cuando el usuario hace click', () => {
    it('deberia anadir la ciudad a favoritos si no estaba', async () => {
      const user = userEvent.setup()
      const { probe } = renderWithFavorites(<FavoriteButton city={madrid} />)

      expect(probe.isFavorite(madrid)).toBe(false)

      await user.click(screen.getByRole('button'))

      expect(probe.isFavorite(madrid)).toBe(true)
    })

    it('deberia quitar la ciudad de favoritos si ya estaba', async () => {
      const user = userEvent.setup()
      const { probe } = renderWithFavorites(
        <FavoriteButton city={madrid} />,
        { initialFavorites: [madrid] },
      )

      await user.click(screen.getByRole('button'))

      expect(probe.isFavorite(madrid)).toBe(false)
    })
  })
})
