import { useState, useEffect } from 'react'
import { useWeather } from '../../hooks/useWeather'
import { useGeocoding } from '../../hooks/useGeocoding'
import { useUnit } from '../../hooks/useUnit'
import { getWeather } from '../../services/weatherService'
import { SearchBar } from '../SearchBar/SearchBar'
import { UnitToggle } from '../UnitToggle/UnitToggle'
import { CurrentWeather } from '../CurrentWeather/CurrentWeather'
import { HourlyForecast } from '../HourlyForecast/HourlyForecast'
import { DailyForecast } from '../DailyForecast/DailyForecast'
import { CityCard } from '../CityCard/CityCard'
import { FavoriteButton } from '../FavoriteButton/FavoriteButton'
import './WeatherApp.css'

const DEFAULT_CITY = { name: 'Madrid', lat: 40.41, lon: -3.70 }

const OTHER_CITIES = [
  { name: 'New York', country: 'US', lat: 40.71, lon: -74.01 },
  { name: 'London', country: 'GB', lat: 51.51, lon: -0.13 },
  { name: 'Tokyo', country: 'JP', lat: 35.68, lon: 139.69 },
]

export function WeatherApp() {
  const [query, setQuery] = useState('')
  const [selectedCity, setSelectedCity] = useState({
    name: DEFAULT_CITY.name,
    lat: DEFAULT_CITY.lat,
    lon: DEFAULT_CITY.lon,
  })
  const [otherCitiesWeather, setOtherCitiesWeather] = useState([])

  const { unit, symbol, toggleUnit } = useUnit()
  const { current, hourly, daily, loading, error, fetchWeather } = useWeather()
  const { results: geoResults, loading: geoLoading } = useGeocoding(query)

  // Fetch weather for the selected city
  useEffect(() => {
    fetchWeather(selectedCity.lat, selectedCity.lon, unit)
  }, [selectedCity, unit, fetchWeather])

  // Fetch weather for other cities on mount and when unit changes
  useEffect(() => {
    async function fetchOtherCities() {
      try {
        const promises = OTHER_CITIES.map(async (city) => {
          const data = await getWeather(city.lat, city.lon, unit)
          return {
            name: city.name,
            country: city.country,
            temperature: data.current.temperature,
            weatherCode: data.current.weatherCode,
            isDay: data.current.isDay,
          }
        })
        const results = await Promise.all(promises)
        setOtherCitiesWeather(results)
      } catch {
        setOtherCitiesWeather([])
      }
    }

    fetchOtherCities()
  }, [unit])

  const handleSelectCity = (city) => {
    setSelectedCity({
      name: city.name,
      lat: city.latitude,
      lon: city.longitude,
    })
    setQuery('')
  }

  const tempMax = daily.length > 0 ? daily[0].tempMax : null
  const tempMin = daily.length > 0 ? daily[0].tempMin : null

  return (
    <div className="weather-app">
      <header className="weather-app__header">
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          results={geoResults}
          loading={geoLoading}
          onSelectCity={handleSelectCity}
        />
        <UnitToggle unit={unit} onToggle={toggleUnit} />
      </header>

      {error && (
        <div className="weather-app__alert" role="alert">
          <span>Error: {error}</span>
        </div>
      )}

      {loading && (
        <div className="weather-app__loading">
          <div className="weather-app__spinner" />
          <span>Cargando datos del clima...</span>
        </div>
      )}

      {!loading && !error && current && (
        <>
          <CurrentWeather
            current={current}
            cityName={selectedCity.name}
            tempMax={tempMax}
            tempMin={tempMin}
            symbol={symbol}
            actions={<FavoriteButton city={selectedCity} />}
          />

          <HourlyForecast hours={hourly} symbol={symbol} />

          <div className="weather-app__bottom">
            <div className="weather-app__other-cities">
              <h2 className="weather-app__section-title">Otras grandes ciudades</h2>
              <div className="weather-app__city-list">
                {otherCitiesWeather.map((city) => (
                  <CityCard key={city.name} city={city} />
                ))}
              </div>
            </div>

            <div className="weather-app__daily">
              <DailyForecast days={daily} symbol={symbol} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
