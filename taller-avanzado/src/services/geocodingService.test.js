import { searchCities } from './geocodingService'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// `restoreMocks: true` en vite.config.js restaura spyOn originales,
// pero NO los mocks creados con vi.fn(). Para el fetch global lo
// hacemos explícito aquí.
afterEach(() => {
  mockFetch.mockReset()
})

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

describe('geocodingService · searchCities', () => {
  describe('Cuando la busqueda tiene resultados', () => {
    it('deberia devolver las ciudades formateadas', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

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
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      await searchCities('Barcelona')

      // Una sola aserción sobre la URL completa: explícita, detecta
      // si se altera el contrato con el endpoint (útil para mutation
      // testing sobre los parámetros).
      const [url] = mockFetch.mock.calls[0]
      expect(url).toContain('name=Barcelona')
      expect(url).toContain('count=5')
      expect(url).toContain('language=es')
    })

    it('deberia devolver region="" cuando admin1 no viene en la respuesta', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
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
          }),
      })

      const [city] = await searchCities('Monaco')
      expect(city.region).toBe('')
    })
  })

  describe('Cuando no hay resultados', () => {
    // La API puede devolver tres variantes equivalentes: results
    // ausente, null o array vacío. Las tres deben devolver [].
    it.each([
      ['results ausente', {}],
      ['results: null', { results: null }],
      ['results: []', { results: [] }],
    ])('deberia devolver array vacio cuando %s', async (_label, payload) => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(payload),
      })

      const result = await searchCities('xyzxyz')
      expect(result).toEqual([])
    })
  })

  describe('Cuando el query es muy corto', () => {
    it.each([
      ['vacio', ''],
      ['un caracter', 'a'],
    ])(
      'deberia devolver array vacio sin llamar a fetch (query=%s)',
      async (_label, query) => {
        const result = await searchCities(query)
        expect(result).toEqual([])
        expect(mockFetch).not.toHaveBeenCalled()
      },
    )
  })

  describe('Cuando la API falla', () => {
    it('deberia lanzar un error con mensaje descriptivo', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 })
      await expect(searchCities('Madrid')).rejects.toThrow(
        'Error al buscar ciudades',
      )
    })

    it('deberia propagar errores de red (fetch rechaza)', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network error'))
      await expect(searchCities('Madrid')).rejects.toThrow('Network error')
    })
  })
})
