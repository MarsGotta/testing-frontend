import { getWeatherIconUrl } from '../../utils/weatherCodes'
import './HourlyForecast.css'

function formatHour(timeStr) {
  const date = new Date(timeStr)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

export function HourlyForecast({ hours, symbol }) {
  if (!hours || hours.length === 0) return null

  return (
    <section className="hourly-forecast">
      <h2 className="hourly-forecast__title">Pronóstico por hora</h2>
      <div className="hourly-forecast__scroll" role="list">
        {hours.map((hour, index) => (
          <div className="hourly-forecast__card" key={index} role="listitem">
            <span className="hourly-forecast__time">{formatHour(hour.time)}</span>
            <img
              className="hourly-forecast__icon"
              src={getWeatherIconUrl(hour.weatherCode, hour.isDay)}
              alt=""
            />
            <span className="hourly-forecast__temp">
              {hour.temperature}{symbol}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
