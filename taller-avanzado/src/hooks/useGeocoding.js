import { useState, useEffect, useRef } from 'react'
import { searchCities } from '../services/geocodingService'

export function useGeocoding(query, debounceMs = 300) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }

    setLoading(true)

    timerRef.current = setTimeout(async () => {
      try {
        const cities = await searchCities(query)
        setResults(cities)
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, debounceMs)

    return () => {
      clearTimeout(timerRef.current)
      setLoading(false)
    }
  }, [query, debounceMs])

  return { results, loading }
}
