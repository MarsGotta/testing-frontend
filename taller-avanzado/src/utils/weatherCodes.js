const WMO_CODES = {
  0: { day: 'Despejado', night: 'Despejado', icon: '01' },
  1: { day: 'Mayormente despejado', night: 'Mayormente despejado', icon: '01' },
  2: { day: 'Parcialmente nublado', night: 'Parcialmente nublado', icon: '02' },
  3: { day: 'Nublado', night: 'Nublado', icon: '03' },
  45: { day: 'Niebla', night: 'Niebla', icon: '50' },
  48: { day: 'Niebla helada', night: 'Niebla helada', icon: '50' },
  51: { day: 'Llovizna ligera', night: 'Llovizna ligera', icon: '09' },
  53: { day: 'Llovizna', night: 'Llovizna', icon: '09' },
  55: { day: 'Llovizna intensa', night: 'Llovizna intensa', icon: '09' },
  56: { day: 'Llovizna helada', night: 'Llovizna helada', icon: '09' },
  57: { day: 'Llovizna helada intensa', night: 'Llovizna helada intensa', icon: '09' },
  61: { day: 'Lluvia ligera', night: 'Lluvia ligera', icon: '10' },
  63: { day: 'Lluvia', night: 'Lluvia', icon: '10' },
  65: { day: 'Lluvia intensa', night: 'Lluvia intensa', icon: '10' },
  66: { day: 'Lluvia helada', night: 'Lluvia helada', icon: '10' },
  67: { day: 'Lluvia helada intensa', night: 'Lluvia helada intensa', icon: '10' },
  71: { day: 'Nieve ligera', night: 'Nieve ligera', icon: '13' },
  73: { day: 'Nieve', night: 'Nieve', icon: '13' },
  75: { day: 'Nieve intensa', night: 'Nieve intensa', icon: '13' },
  77: { day: 'Granizo fino', night: 'Granizo fino', icon: '13' },
  80: { day: 'Chubascos ligeros', night: 'Chubascos ligeros', icon: '09' },
  81: { day: 'Chubascos', night: 'Chubascos', icon: '09' },
  82: { day: 'Chubascos intensos', night: 'Chubascos intensos', icon: '09' },
  85: { day: 'Nieve ligera', night: 'Nieve ligera', icon: '13' },
  86: { day: 'Nieve intensa', night: 'Nieve intensa', icon: '13' },
  95: { day: 'Tormenta', night: 'Tormenta', icon: '11' },
  96: { day: 'Tormenta con granizo', night: 'Tormenta con granizo', icon: '11' },
  99: { day: 'Tormenta con granizo', night: 'Tormenta con granizo', icon: '11' },
}

export function getWeatherDescription(code, isDay = true) {
  const entry = WMO_CODES[code]
  if (!entry) return 'Desconocido'
  return isDay ? entry.day : entry.night
}

export function getWeatherIconUrl(code, isDay = true) {
  const entry = WMO_CODES[code]
  if (!entry) return 'https://openweathermap.org/img/wn/01d@2x.png'
  const suffix = isDay ? 'd' : 'n'
  return `https://openweathermap.org/img/wn/${entry.icon}${suffix}@2x.png`
}
