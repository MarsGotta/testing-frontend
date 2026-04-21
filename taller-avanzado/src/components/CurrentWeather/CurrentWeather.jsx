import { getWeatherDescription, getWeatherIconUrl } from '../../utils/weatherCodes'
import './CurrentWeather.css'

function formatTime(timeStr) {
  const date = new Date(timeStr)
  let hours = date.getHours()
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`
}

export function CurrentWeather({ current, cityName, tempMax, tempMin, symbol, actions }) {
  if (!current) return null

  const description = getWeatherDescription(current.weatherCode, current.isDay)
  const iconUrl = getWeatherIconUrl(current.weatherCode, current.isDay)

  return (
    <section className="current-weather">
      <div className="current-weather__main">
        <div className="current-weather__temp-group">
          <span className="current-weather__temperature">
            {current.temperature}{symbol}
          </span>
          <div className="current-weather__high-low">
            <span>Máx: {tempMax}{symbol}</span>
            <span>Mín: {tempMin}{symbol}</span>
          </div>
        </div>
        <div className="current-weather__city-info">
          <div className="current-weather__city-header">
            <h1 className="current-weather__city-name">{cityName}</h1>
            {actions}
          </div>
          <span className="current-weather__time">{formatTime(current.time)}</span>
        </div>
      </div>

      <div className="current-weather__details">
        <div className="current-weather__condition">
          <img
            className="current-weather__icon"
            src={iconUrl}
            alt={description}
          />
          <span className="current-weather__description">{description}</span>
        </div>
        <div className="current-weather__detail-grid">
          <div className="current-weather__detail-item">
            <span className="current-weather__detail-label">Sensación</span>
            <span className="current-weather__detail-value">{current.feelsLike}{symbol}</span>
          </div>
          <div className="current-weather__detail-item">
            <span className="current-weather__detail-label">Viento</span>
            <span className="current-weather__detail-value">{current.windSpeed} m/s</span>
          </div>
          <div className="current-weather__detail-item">
            <span className="current-weather__detail-label">Humedad</span>
            <span className="current-weather__detail-value">{current.humidity}%</span>
          </div>
        </div>
      </div>
    </section>
  )
}
