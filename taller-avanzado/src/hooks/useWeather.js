import { useState, useCallback } from 'react'
import { getWeather } from '../services/weatherService'

export function useWeather() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchWeather = useCallback(async (latitude, longitude, unit = 'celsius') => {
    setLoading(true)
    setError(null)

    try {
      const result = await getWeather(latitude, longitude, unit)
      setData(result)
    } catch (err) {
      setError(err.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    current: data?.current ?? null,
    hourly: data?.hourly ?? [],
    daily: data?.daily ?? [],
    loading,
    error,
    fetchWeather,
  }
}
