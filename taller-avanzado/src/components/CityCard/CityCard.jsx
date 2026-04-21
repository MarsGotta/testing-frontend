import { getWeatherDescription, getWeatherIconUrl } from '../../utils/weatherCodes'
import './CityCard.css'

export function CityCard({ city }) {
  if (!city) return null

  const { name, country, temperature, weatherCode, isDay } = city
  const description = getWeatherDescription(weatherCode, isDay)
  const iconUrl = getWeatherIconUrl(weatherCode, isDay)

  return (
    <div className="city-card">
      <div className="city-card__info">
        <span className="city-card__country">{country}</span>
        <h3 className="city-card__name">{name}</h3>
        <span className="city-card__description">{description}</span>
      </div>
      <div className="city-card__weather">
        <span className="city-card__temperature">{temperature}°</span>
        <img
          className="city-card__icon"
          src={iconUrl}
          alt={description}
        />
      </div>
    </div>
  )
}
