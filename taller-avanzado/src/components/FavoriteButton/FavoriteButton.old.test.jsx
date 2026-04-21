// =================================================================
// Tests de FavoriteButton con Jasmine sobre Karma.
//
// Montamos el componente dentro del `FavoritesProvider` con la
// helper `mountComponent`. Para observar el estado del store sin
// leer el storage usamos el patron "Probe": un componente que
// llama a `useFavorites()` y copia lo que lee a un objeto externo
// que el test puede consultar.
//
// Los clicks se disparan con `clickEl`, que envuelve la secuencia
// mousedown + mouseup + click dentro de `act()` para que React
// procese el setState.
// =================================================================

import { mountComponent, clickEl } from '../../test-utils/jasmine-dom'
import { FavoriteButton } from './FavoriteButton'
import { FavoritesProvider, useFavorites } from '../../store/FavoritesContext'

const madrid = { name: 'Madrid', lat: 40.41, lon: -3.70 }

function createMemoryStorage(initial) {
  const data = new Map(Object.entries(initial || {}))
  return {
    getItem: function (k) { return data.has(k) ? data.get(k) : null },
    setItem: function (k, v) { data.set(k, v) },
    removeItem: function (k) { data.delete(k) },
  }
}

// Helper que monta el componente dentro del Provider. Expone una
// "sonda" para consultar el estado del store sin tocar el storage,
// y devuelve el `mounted` (con container/unmount) para que el test
// limpie entre it's y pueda buscar el boton por DOM crudo.
function renderWithFavorites(ui, options) {
  options = options || {}
  const probe = {}

  function Probe() {
    Object.assign(probe, useFavorites())
    return null
  }

  const seedList = options.initialFavorites || []
  const memStorage = createMemoryStorage(
    seedList.length ? { 'weather.favorites.v1': JSON.stringify(seedList) } : {},
  )

  const mounted = mountComponent(
    <FavoritesProvider storage={memStorage}>
      {ui}
      <Probe />
    </FavoritesProvider>,
  )

  return { probe, mounted }
}

describe('FavoriteButton (Jasmine)', () => {
  let mounted

  afterEach(() => {
    if (mounted) {
      mounted.unmount()
      mounted = null
    }
  })

  describe('Cuando la ciudad NO es favorita', () => {
    it('deberia mostrar la estrella vacia y aria-pressed=false', () => {
      const result = renderWithFavorites(<FavoriteButton city={madrid} />)
      mounted = result.mounted

      const button = mounted.container.querySelector('button')
      expect(/añadir madrid a favoritas/i.test(button.getAttribute('aria-label'))).toBe(true)
      expect(button.getAttribute('aria-pressed')).toBe('false')
      expect(button.textContent.includes('☆')).toBe(true)
    })
  })

  describe('Cuando la ciudad SI es favorita', () => {
    it('deberia mostrar la estrella llena y aria-pressed=true', () => {
      const result = renderWithFavorites(
        <FavoriteButton city={madrid} />,
        { initialFavorites: [madrid] },
      )
      mounted = result.mounted

      const button = mounted.container.querySelector('button')
      expect(/quitar madrid de favoritas/i.test(button.getAttribute('aria-label'))).toBe(true)
      expect(button.getAttribute('aria-pressed')).toBe('true')
      expect(button.textContent.includes('★')).toBe(true)
    })
  })

  describe('Cuando el usuario hace click', () => {
    it('deberia anadir la ciudad a favoritos si no estaba', () => {
      const result = renderWithFavorites(<FavoriteButton city={madrid} />)
      mounted = result.mounted
      const { probe } = result

      expect(probe.isFavorite(madrid)).toBe(false)

      clickEl(mounted.container.querySelector('button'))

      expect(probe.isFavorite(madrid)).toBe(true)
    })

    it('deberia quitar la ciudad de favoritos si ya estaba', () => {
      const result = renderWithFavorites(
        <FavoriteButton city={madrid} />,
        { initialFavorites: [madrid] },
      )
      mounted = result.mounted
      const { probe } = result

      clickEl(mounted.container.querySelector('button'))

      expect(probe.isFavorite(madrid)).toBe(false)
    })
  })
})
