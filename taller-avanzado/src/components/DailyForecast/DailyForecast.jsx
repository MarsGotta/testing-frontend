import { getWeatherDescription, getWeatherIconUrl } from '../../utils/weatherCodes'
import './DailyForecast.css'

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

function getDayLabel(dateStr) {
  const date = new Date(dateStr + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (date.getTime() === today.getTime()) {
    return 'Hoy'
  }

  return DAY_NAMES[date.getDay()]
}

export function DailyForecast({ days, symbol }) {
  if (!days || days.length === 0) return null

  const globalMin = Math.min(...days.map((d) => d.tempMin))
  const globalMax = Math.max(...days.map((d) => d.tempMax))
  const range = globalMax - globalMin || 1

  return (
    <section className="daily-forecast">
      <h2 className="daily-forecast__title">Pronóstico semanal</h2>
      <div className="daily-forecast__list" role="list">
        {days.map((day, index) => {
          const barLeft = ((day.tempMin - globalMin) / range) * 100
          const barWidth = ((day.tempMax - day.tempMin) / range) * 100

          return (
            <div className="daily-forecast__row" key={index} role="listitem">
              <span className="daily-forecast__day">{getDayLabel(day.date)}</span>
              <div className="daily-forecast__condition">
                <img
                  className="daily-forecast__icon"
                  src={getWeatherIconUrl(day.weatherCode, true)}
                  alt={getWeatherDescription(day.weatherCode)}
                />
                <span className="daily-forecast__description">
                  {getWeatherDescription(day.weatherCode)}
                </span>
              </div>
              <span className="daily-forecast__temp-min">{day.tempMin}{symbol}</span>
              <div className="daily-forecast__bar-track">
                <div
                  className="daily-forecast__bar"
                  style={{
                    left: `${barLeft}%`,
                    width: `${Math.max(barWidth, 5)}%`,
                  }}
                />
              </div>
              <span className="daily-forecast__temp-max">{day.tempMax}{symbol}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
