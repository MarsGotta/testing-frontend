const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast'

export async function getWeather(latitude, longitude, unit = 'celsius') {
  const params = new URLSearchParams({
    latitude,
    longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day',
    hourly: 'temperature_2m,weather_code,is_day',
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    temperature_unit: unit,
    wind_speed_unit: 'ms',
    timezone: 'auto',
    forecast_days: 6,
  })

  const response = await fetch(`${FORECAST_URL}?${params}`)

  if (!response.ok) {
    throw new Error('Error al obtener el clima')
  }

  const data = await response.json()

  return {
    current: formatCurrent(data),
    hourly: formatHourly(data),
    daily: formatDaily(data),
  }
}

function formatCurrent(data) {
  const c = data.current
  return {
    temperature: Math.round(c.temperature_2m),
    feelsLike: Math.round(c.apparent_temperature),
    humidity: c.relative_humidity_2m,
    windSpeed: Number(c.wind_speed_10m.toFixed(1)),
    weatherCode: c.weather_code,
    isDay: c.is_day === 1,
    time: c.time,
  }
}

function formatHourly(data) {
  const now = new Date(data.current.time)
  const hours = data.hourly.time
    .map((time, i) => ({
      time,
      temperature: Math.round(data.hourly.temperature_2m[i]),
      weatherCode: data.hourly.weather_code[i],
      isDay: data.hourly.is_day[i] === 1,
    }))
    .filter((h) => new Date(h.time) >= now)
    .slice(0, 8)

  return hours
}

function formatDaily(data) {
  return data.daily.time.slice(0, 5).map((date, i) => ({
    date,
    tempMax: Math.round(data.daily.temperature_2m_max[i]),
    tempMin: Math.round(data.daily.temperature_2m_min[i]),
    weatherCode: data.daily.weather_code[i],
  }))
}
