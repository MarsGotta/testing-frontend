// =================================================================
// Tests de weatherCodes con Jasmine.
//
// Funciones puras: no hay DOM, mocks ni async. Los casos
// parametrizados se expanden con `forEach` porque Jasmine no
// tiene `it.each`: cada fila del array produce un `it`
// independiente con el codigo concatenado en el nombre del test.
// =================================================================

import { getWeatherDescription, getWeatherIconUrl } from './weatherCodes'

const WMO_SAMPLE = [
  [0, 'Despejado', '01'],
  [1, 'Mayormente despejado', '01'],
  [2, 'Parcialmente nublado', '02'],
  [3, 'Nublado', '03'],
  [45, 'Niebla', '50'],
  [48, 'Niebla helada', '50'],
  [51, 'Llovizna ligera', '09'],
  [53, 'Llovizna', '09'],
  [55, 'Llovizna intensa', '09'],
  [61, 'Lluvia ligera', '10'],
  [63, 'Lluvia', '10'],
  [65, 'Lluvia intensa', '10'],
  [71, 'Nieve ligera', '13'],
  [73, 'Nieve', '13'],
  [75, 'Nieve intensa', '13'],
  [77, 'Granizo fino', '13'],
  [80, 'Chubascos ligeros', '09'],
  [81, 'Chubascos', '09'],
  [82, 'Chubascos intensos', '09'],
  [95, 'Tormenta', '11'],
  [96, 'Tormenta con granizo', '11'],
  [99, 'Tormenta con granizo', '11'],
]

describe('weatherCodes (Jasmine)', () => {
  describe('getWeatherDescription', () => {
    // Un `it` por codigo de la tabla WMO: el codigo se concatena
    // al nombre del test para que el reporte identifique cual fallo.
    WMO_SAMPLE.forEach(([code, description]) => {
      it('deberia devolver la descripcion correcta para el codigo ' + code + ' (dia)', () => {
        expect(getWeatherDescription(code, true)).toBe(description)
      })
      it('deberia devolver la descripcion correcta para el codigo ' + code + ' (noche)', () => {
        expect(getWeatherDescription(code, false)).toBe(description)
      })
    })

    it('deberia devolver "Desconocido" para codigos invalidos', () => {
      expect(getWeatherDescription(999)).toBe('Desconocido')
    })

    it('deberia devolver "Desconocido" para codigos negativos', () => {
      expect(getWeatherDescription(-1)).toBe('Desconocido')
    })

    it('deberia devolver "Desconocido" cuando el codigo es undefined', () => {
      expect(getWeatherDescription(undefined)).toBe('Desconocido')
    })

    it('por defecto (sin isDay) deberia usar la variante de dia', () => {
      expect(getWeatherDescription(0)).toBe('Despejado')
    })
  })

  describe('getWeatherIconUrl', () => {
    WMO_SAMPLE.forEach(([code, , iconId]) => {
      it('deberia devolver la URL del icono de dia para el codigo ' + code, () => {
        expect(getWeatherIconUrl(code, true)).toBe(
          'https://openweathermap.org/img/wn/' + iconId + 'd@2x.png'
        )
      })
      it('deberia devolver la URL del icono de noche para el codigo ' + code, () => {
        expect(getWeatherIconUrl(code, false)).toBe(
          'https://openweathermap.org/img/wn/' + iconId + 'n@2x.png'
        )
      })
    })

    it('deberia devolver el icono por defecto para codigos invalidos', () => {
      expect(getWeatherIconUrl(999)).toBe(
        'https://openweathermap.org/img/wn/01d@2x.png'
      )
    })

    it('por defecto (sin isDay) deberia devolver la variante diurna', () => {
      expect(getWeatherIconUrl(0)).toBe(
        'https://openweathermap.org/img/wn/01d@2x.png'
      )
    })
  })
})
