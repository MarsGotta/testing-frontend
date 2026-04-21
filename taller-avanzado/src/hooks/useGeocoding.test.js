import { renderHook, waitFor, act } from '@testing-library/react'
import { useGeocoding } from './useGeocoding'

// ── vi.hoisted · mock compartido y datos ──────────────────────
// El mock y los datos se hoistean junto a vi.mock para evitar el
// ReferenceError clásico al referenciar `searchCities` dentro de
// la factory.
const { searchCities, madridCity } = vi.hoisted(() => ({
  searchCities: vi.fn(),
  madridCity: {
    id: 1,
    name: 'Madrid',
    country: 'Spain',
    countryCode: 'ES',
    latitude: 40.41,
    longitude: -3.7,
    region: '',
  },
}))

vi.mock('../services/geocodingService', () => ({ searchCities }))

describe('useGeocoding', () => {
  describe('Cuando el query tiene menos de 2 caracteres', () => {
    it.each(['', 'a'])(
      'deberia devolver resultados vacios sin llamar al servicio (query=%s)',
      (query) => {
        const { result } = renderHook(() => useGeocoding(query))
        expect(result.current.results).toEqual([])
        expect(searchCities).not.toHaveBeenCalled()
      },
    )
  })

  describe('Cuando el query es valido (con debounce)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('deberia marcar loading=true inmediatamente y false tras el debounce', async () => {
      searchCities.mockResolvedValue([madridCity])
      const { result } = renderHook(() => useGeocoding('Madrid', 300))

      expect(result.current.loading).toBe(true)

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })

      expect(result.current.loading).toBe(false)
    })

    it('deberia buscar ciudades tras cumplirse el debounce', async () => {
      searchCities.mockResolvedValue([madridCity])
      const { result } = renderHook(() => useGeocoding('Madrid', 300))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })

      // advanceTimersByTimeAsync ya flushea los await/Promises del
      // callback del setTimeout, así que result.current.results ya
      // está actualizado. NO envolvemos en waitFor — sería redundante.
      expect(result.current.results).toEqual([madridCity])
      expect(searchCities).toHaveBeenCalledWith('Madrid')
      expect(searchCities).toHaveBeenCalledTimes(1)
    })

    it('no deberia llamar al servicio si el debounce no se completa', async () => {
      searchCities.mockResolvedValue([madridCity])
      renderHook(() => useGeocoding('Madrid', 300))

      // Solo avanzamos 299ms — justo antes del límite.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(299)
      })

      expect(searchCities).not.toHaveBeenCalled()
    })
  })

  describe('Cuando el usuario escribe rapido (race condition)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('deberia usar solo el ultimo query y cancelar los anteriores', async () => {
      searchCities.mockResolvedValue([madridCity])

      const { rerender } = renderHook(({ q }) => useGeocoding(q, 300), {
        initialProps: { q: 'Ma' },
      })

      // Antes de cumplirse el debounce, cambia el query dos veces.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
      rerender({ q: 'Mad' })
      await act(async () => {
        await vi.advanceTimersByTimeAsync(100)
      })
      rerender({ q: 'Madrid' })

      // Ahora dejamos que el último debounce termine.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })

      // Solo la última query viaja al servicio.
      expect(searchCities).toHaveBeenCalledTimes(1)
      expect(searchCities).toHaveBeenCalledWith('Madrid')
    })

    it('deberia limpiar el timeout al desmontar (sin warnings ni leaks)', async () => {
      searchCities.mockResolvedValue([madridCity])

      const { unmount } = renderHook(() => useGeocoding('Madrid', 300))
      // Desmontar antes de que se complete el debounce.
      unmount()

      // Avanzar el reloj: como el cleanup limpió el timer, no debe
      // ejecutarse el fetch.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1000)
      })

      expect(searchCities).not.toHaveBeenCalled()
    })
  })

  describe('Cuando la busqueda falla', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('deberia devolver resultados vacios y loading=false', async () => {
      searchCities.mockRejectedValue(new Error('Network error'))

      const { result } = renderHook(() => useGeocoding('test', 300))

      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })

      expect(result.current.results).toEqual([])
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Cuando cambia el debounceMs', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('deberia respetar el valor personalizado de debounceMs', async () => {
      searchCities.mockResolvedValue([madridCity])

      // Con debounce de 500ms.
      renderHook(() => useGeocoding('Madrid', 500))

      // A los 300ms (el default) todavía no debe haber llamado.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300)
      })
      expect(searchCities).not.toHaveBeenCalled()

      // A los 500ms en total, sí.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(200)
      })
      expect(searchCities).toHaveBeenCalledTimes(1)
    })
  })
})

// ── Nota para el formador ────────────────────────────────────
// Por qué evitamos `waitFor` envolviendo expects cuando ya usamos
// `advanceTimersByTimeAsync`:
//
//   await vi.advanceTimersByTimeAsync(300)
//   await waitFor(() => expect(x).toBe(y))   ← DOBLE espera
//
// `advanceTimersByTimeAsync` avanza el reloj simulado y flushea
// las Promises/microtasks que se disparan en el camino. Al salir,
// el estado ya está actualizado. Añadir `waitFor` encima duplica
// el polling con el reloj ya congelado — lento y confuso si falla.
