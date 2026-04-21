// =================================================================
// Tests de geocodingService con Jasmine.
//
// Para aislar la red interceptamos el fetch global con
// `spyOn(window, 'fetch')`. Jasmine limpia automaticamente los
// spies creados con `spyOn` al final de cada `it`, asi que no
// hace falta restaurarlo a mano.
// =================================================================

import { searchCities } from './geocodingService'

const mockResponse = {
  results: [
    {
      id: 3117735,
      name: 'Madrid',
      country: 'Spain',
      country_code: 'ES',
      latitude: 40.4168,
      longitude: -3.7038,
      admin1: 'Community of Madrid',
    },
  ],
}

function mockFetchOk(payload) {
  // Jasmine `spyOn` espía sobre el objeto global y lo restaura
  // automáticamente al final del test.
  return spyOn(window, 'fetch').and.returnValue(
    Promise.resolve({
      ok: true,
      json: function () {
        return Promise.resolve(payload)
      },
    })
  )
}

describe('geocodingService (Jasmine) · searchCities', () => {
  describe('Cuando la busqueda tiene resultados', () => {
    it('deberia devolver las ciudades formateadas', async () => {
      mockFetchOk(mockResponse)

      const result = await searchCities('Madrid')

      expect(result).toEqual([
        {
          id: 3117735,
          name: 'Madrid',
          country: 'Spain',
          countryCode: 'ES',
          latitude: 40.4168,
          longitude: -3.7038,
          region: 'Community of Madrid',
        },
      ])
    })

    it('deberia enviar el query, count y language en la URL', async () => {
      const fetchSpy = mockFetchOk(mockResponse)
      await searchCities('Barcelona')

      const url = fetchSpy.calls.mostRecent().args[0]
      expect(url).toContain('name=Barcelona')
      expect(url).toContain('count=5')
      expect(url).toContain('language=es')
    })

    it('deberia devolver region="" cuando admin1 no viene en la respuesta', async () => {
      mockFetchOk({
        results: [
          {
            id: 1,
            name: 'Monaco',
            country: 'Monaco',
            country_code: 'MC',
            latitude: 43.73,
            longitude: 7.41,
            // admin1 intencionalmente ausente
          },
        ],
      })

      const result = await searchCities('Monaco')
      expect(result[0].region).toBe('')
    })
  })

  describe('Cuando no hay resultados', () => {
    const EMPTY_CASES = [
      ['results ausente', {}],
      ['results: null', { results: null }],
      ['results: []', { results: [] }],
    ]

    EMPTY_CASES.forEach(([label, payload]) => {
      it('deberia devolver array vacio cuando ' + label, async () => {
        mockFetchOk(payload)
        const result = await searchCities('xyzxyz')
        expect(result).toEqual([])
      })
    })
  })

  describe('Cuando el query es muy corto', () => {
    const SHORT_CASES = [
      ['vacio', ''],
      ['un caracter', 'a'],
    ]

    SHORT_CASES.forEach(([label, query]) => {
      it(
        'deberia devolver array vacio sin llamar a fetch (query=' + label + ')',
        async () => {
          const fetchSpy = spyOn(window, 'fetch')
          const result = await searchCities(query)
          expect(result).toEqual([])
          expect(fetchSpy.calls.count()).toBe(0)
        }
      )
    })
  })

  describe('Cuando la API falla', () => {
    it('deberia lanzar un error con mensaje descriptivo', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.resolve({ ok: false, status: 500 })
      )
      // En Jasmine las aserciones sobre promesas rechazadas se
      // escriben con `expectAsync(...).toBeRejectedWithError(msg)`.
      await expectAsync(searchCities('Madrid')).toBeRejectedWithError(
        'Error al buscar ciudades'
      )
    })

    it('deberia propagar errores de red (fetch rechaza)', async () => {
      spyOn(window, 'fetch').and.returnValue(
        Promise.reject(new TypeError('Network error'))
      )
      await expectAsync(searchCities('Madrid')).toBeRejectedWithError(
        'Network error'
      )
    })
  })
})
