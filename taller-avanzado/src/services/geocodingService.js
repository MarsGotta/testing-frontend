const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search'

export async function searchCities(query) {
  if (!query || query.length < 2) return []

  const params = new URLSearchParams({
    name: query,
    count: 5,
    language: 'es',
  })

  const response = await fetch(`${GEOCODING_URL}?${params}`)

  if (!response.ok) {
    throw new Error('Error al buscar ciudades')
  }

  const data = await response.json()

  if (!data.results) return []

  return data.results.map((city) => ({
    id: city.id,
    name: city.name,
    country: city.country,
    countryCode: city.country_code,
    latitude: city.latitude,
    longitude: city.longitude,
    region: city.admin1 || '',
  }))
}
