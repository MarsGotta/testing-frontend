// =================================================================
// Tests del hook useGeocoding con Jasmine sobre Karma.
//
// Usamos `runHook` y `flushMicrotasks` de la mini-helper
// `src/test-utils/jasmine-dom.jsx`. `act()` se importa de `react`
// (React 18.3+).
//
// Gotcha clave con fake timers: `jasmine.clock().tick(300)` avanza
// el reloj pero NO flushea las Promises que se disparan dentro
// del callback del timer. Como el debounce del hook ejecuta un
// fetch (que es una Promise), hay que combinar el tick con un
// `flushMicrotasks()` para que la Promise resuelva y el setState
// final se vea. El patron en todos los tests es:
//
//     await act(async () => {
//       jasmine.clock().tick(300)
//       await flushMicrotasks()
//     })
//
// El servicio `geocodingService` se ejecuta de verdad;
// interceptamos el fetch con `spyOn(window, 'fetch')`.
// =================================================================

import { act } from 'react'
import { runHook, flushMicrotasks } from '../test-utils/jasmine-dom'
import { useGeocoding } from './useGeocoding'

const madridResponse = {
  results: [
    {
      id: 1,
      name: 'Madrid',
      country: 'Spain',
      country_code: 'ES',
      latitude: 40.41,
      longitude: -3.7,
      admin1: '',
    },
  ],
}

function mockFetchOk(payload) {
  return spyOn(window, 'fetch').and.returnValue(
    Promise.resolve({
      ok: true,
      json: function () {
        return Promise.resolve(payload)
      },
    })
  )
}

describe('useGeocoding (Jasmine)', () => {
  describe('Cuando el query tiene menos de 2 caracteres', () => {
    const SHORT_QUERIES = ['', 'a']

    SHORT_QUERIES.forEach(function (query) {
      it(
        'deberia devolver resultados vacios sin llamar al servicio (query=' + query + ')',
        () => {
          const fetchSpy = spyOn(window, 'fetch')
          const { result } = runHook(() => useGeocoding(query))
          expect(result.current.results).toEqual([])
          expect(fetchSpy.calls.count()).toBe(0)
        }
      )
    })
  })

  describe('Cuando el query es valido (con debounce)', () => {
    beforeEach(() => {
      jasmine.clock().install()
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })

    it('deberia marcar loading=true inmediatamente y false tras el debounce', async () => {
      mockFetchOk(madridResponse)
      const { result } = runHook(() => useGeocoding('Madrid', 300))

      expect(result.current.loading).toBe(true)

      await act(async () => {
        jasmine.clock().tick(300)
        await flushMicrotasks()
      })

      expect(result.current.loading).toBe(false)
    })

    it('deberia buscar ciudades tras cumplirse el debounce', async () => {
      const fetchSpy = mockFetchOk(madridResponse)
      const { result } = runHook(() => useGeocoding('Madrid', 300))

      await act(async () => {
        jasmine.clock().tick(300)
        await flushMicrotasks()
      })

      expect(result.current.results[0].name).toBe('Madrid')
      expect(fetchSpy.calls.count()).toBe(1)
      expect(fetchSpy.calls.mostRecent().args[0]).toContain('name=Madrid')
    })

    it('no deberia llamar al servicio si el debounce no se completa', async () => {
      const fetchSpy = mockFetchOk(madridResponse)
      runHook(() => useGeocoding('Madrid', 300))

      await act(async () => {
        jasmine.clock().tick(299)
        await flushMicrotasks()
      })

      expect(fetchSpy.calls.count()).toBe(0)
    })
  })

  describe('Cuando el usuario escribe rapido (race condition)', () => {
    beforeEach(() => {
      jasmine.clock().install()
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })

    it('deberia usar solo el ultimo query y cancelar los anteriores', async () => {
      const fetchSpy = mockFetchOk(madridResponse)

      const hook = runHook((args) => useGeocoding(args.q, 300), {
        initialProps: { q: 'Ma' },
      })

      await act(async () => {
        jasmine.clock().tick(100)
        await flushMicrotasks()
      })
      hook.rerender({ q: 'Mad' })
      await act(async () => {
        jasmine.clock().tick(100)
        await flushMicrotasks()
      })
      hook.rerender({ q: 'Madrid' })

      await act(async () => {
        jasmine.clock().tick(300)
        await flushMicrotasks()
      })

      expect(fetchSpy.calls.count()).toBe(1)
      expect(fetchSpy.calls.mostRecent().args[0]).toContain('name=Madrid')
    })

    it('deberia limpiar el timeout al desmontar (sin warnings ni leaks)', async () => {
      const fetchSpy = mockFetchOk(madridResponse)

      const { unmount } = runHook(() => useGeocoding('Madrid', 300))
      unmount()

      await act(async () => {
        jasmine.clock().tick(1000)
        await flushMicrotasks()
      })

      expect(fetchSpy.calls.count()).toBe(0)
    })
  })

  describe('Cuando la busqueda falla', () => {
    beforeEach(() => {
      jasmine.clock().install()
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })

    it('deberia devolver resultados vacios y loading=false', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve({ ok: false, status: 500 })
      )

      const { result } = runHook(() => useGeocoding('test', 300))

      await act(async () => {
        jasmine.clock().tick(300)
        await flushMicrotasks()
      })

      expect(result.current.results).toEqual([])
      expect(result.current.loading).toBe(false)
    })
  })

  describe('Cuando cambia el debounceMs', () => {
    beforeEach(() => {
      jasmine.clock().install()
    })

    afterEach(() => {
      jasmine.clock().uninstall()
    })

    it('deberia respetar el valor personalizado de debounceMs', async () => {
      const fetchSpy = mockFetchOk(madridResponse)
      runHook(() => useGeocoding('Madrid', 500))

      await act(async () => {
        jasmine.clock().tick(300)
        await flushMicrotasks()
      })
      expect(fetchSpy.calls.count()).toBe(0)

      await act(async () => {
        jasmine.clock().tick(200)
        await flushMicrotasks()
      })
      expect(fetchSpy.calls.count()).toBe(1)
    })
  })
})
