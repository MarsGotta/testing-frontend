// ============================================================
// FavoritesContext · Provider + hook consumidor
//
// Patron: Context + useReducer + persistencia en localStorage.
// Es el Context "de libro de texto" — suficiente para el taller
// sin arrastrar Redux/Zustand. Y, lo mas importante, lo podemos
// testear de tres formas claras y progresivas:
//
//   1. El reducer (archivo separado) como funcion pura.
//   2. El hook `useFavorites` con `renderHook` + wrapper Provider.
//   3. Cualquier componente consumidor, renderizandolo dentro del
//      Provider (helper `renderWithFavorites` al final del archivo).
//
// No exportamos el Context directamente — solo el hook. Esto
// fuerza a los consumidores a ir por el hook y facilita mockear
// en el futuro.
// ============================================================

import { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react'
import { favoritesReducer, initialState, cityKey } from './favoritesReducer'

const STORAGE_KEY = 'weather.favorites.v1'

const FavoritesContext = createContext(null)

export function FavoritesProvider({ children, storage = defaultStorage() }) {
  const [state, dispatch] = useReducer(favoritesReducer, initialState)
  const hydratedRef = useRef(false)

  // Hidratacion inicial desde localStorage. Un unico useEffect
  // que corre una vez tras el primer render.
  useEffect(() => {
    try {
      const raw = storage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          dispatch({ type: 'HYDRATE', cities: parsed })
        }
      }
    } catch {
      // Si el JSON esta corrupto lo ignoramos — empezamos vacios.
    }
    hydratedRef.current = true
  }, [storage])

  // Persistencia reactiva: cada cambio en `cities` se escribe.
  // Se salta la primera ejecucion (antes de hidratar) para no
  // pisar el valor almacenado con el estado inicial vacio.
  useEffect(() => {
    if (!hydratedRef.current) return
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(state.cities))
    } catch {
      // storage lleno o bloqueado — no rompemos la app por esto.
    }
  }, [state.cities, storage])

  // `useMemo` estabiliza la referencia del value para que los
  // consumidores no re-rendericen si nada ha cambiado.
  const value = useMemo(
    () => ({
      favorites: state.cities,
      addFavorite: (city) => dispatch({ type: 'ADD_FAVORITE', city }),
      removeFavorite: (city) => dispatch({ type: 'REMOVE_FAVORITE', city }),
      toggleFavorite: (city) => dispatch({ type: 'TOGGLE_FAVORITE', city }),
      clearFavorites: () => dispatch({ type: 'CLEAR_FAVORITES' }),
      isFavorite: (city) => state.cities.some((c) => cityKey(c) === cityKey(city)),
    }),
    [state.cities],
  )

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) {
    throw new Error('useFavorites debe usarse dentro de <FavoritesProvider>')
  }
  return ctx
}

// Wrapper defensivo — si localStorage no existe (SSR, tests) o
// esta bloqueado (Safari privado), devolvemos un storage en memoria.
function defaultStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
  } catch {
    // Falla el acceso a localStorage en algunos entornos.
  }
  const mem = new Map()
  return {
    getItem: (k) => (mem.has(k) ? mem.get(k) : null),
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  }
}
