// ============================================================
// favoritesReducer · reducer puro
//
// Pedagogía:
//   - Un reducer es una funcion PURA: (state, action) => state.
//     No lee ni escribe fuera. No toca el DOM. No llama a fetch.
//   - Por eso se testea directamente como cualquier funcion:
//     sin React, sin Provider, sin renderHook.
//
// Este separador (reducer aislado en su propio archivo) es
// deliberado: demuestra el "extract pure logic" que hace
// testear Context/Store barato.
// ============================================================

export const initialState = { cities: [] }

// Clave estable para identificar una ciudad: redondeamos coords
// a 2 decimales para que "40.41 / -3.70" y "40.4099 / -3.7001"
// se consideren la misma ciudad. Evita duplicados sutiles.
export function cityKey(city) {
  return `${city.name}|${city.lat.toFixed(2)}|${city.lon.toFixed(2)}`
}

export function favoritesReducer(state, action) {
  switch (action.type) {
    case 'ADD_FAVORITE': {
      const key = cityKey(action.city)
      const alreadyIn = state.cities.some((c) => cityKey(c) === key)
      if (alreadyIn) return state
      return { ...state, cities: [...state.cities, action.city] }
    }

    case 'REMOVE_FAVORITE': {
      const key = cityKey(action.city)
      return {
        ...state,
        cities: state.cities.filter((c) => cityKey(c) !== key),
      }
    }

    case 'TOGGLE_FAVORITE': {
      const key = cityKey(action.city)
      const alreadyIn = state.cities.some((c) => cityKey(c) === key)
      return alreadyIn
        ? { ...state, cities: state.cities.filter((c) => cityKey(c) !== key) }
        : { ...state, cities: [...state.cities, action.city] }
    }

    case 'CLEAR_FAVORITES':
      return { ...state, cities: [] }

    case 'HYDRATE':
      return { ...state, cities: action.cities }

    default:
      return state
  }
}
