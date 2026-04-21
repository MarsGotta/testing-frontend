import { useState, useCallback } from 'react'

export function useUnit() {
  const [unit, setUnit] = useState('celsius')

  const toggleUnit = useCallback(() => {
    setUnit((prev) => (prev === 'celsius' ? 'fahrenheit' : 'celsius'))
  }, [])

  const symbol = unit === 'celsius' ? '°C' : '°F'

  return { unit, symbol, toggleUnit }
}
