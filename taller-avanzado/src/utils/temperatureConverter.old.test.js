// =================================================================
// Tests de temperatureConverter con Jasmine (demo S12 · mutation
// testing).
//
// Dos suites didacticas: una debil que deja mutantes vivos y otra
// fuerte con boundaries + valores exactos que los mata. Los casos
// parametrizados se expanden con `forEach` porque Jasmine no
// tiene `it.each`.
// =================================================================

import {
  convertTemperature,
  classifyTemperature,
  recommendClothing,
} from './temperatureConverter'

// ────────────────────────────────────────────────────────────
// Suite 1 · TESTS DÉBILES
// ────────────────────────────────────────────────────────────
describe('temperatureConverter (Jasmine) · tests debiles', () => {
  it('convierte celsius a fahrenheit (aprox)', () => {
    // Matcher blando — no mata MUTANT_DEMO_3.
    expect(convertTemperature(100, 'celsius', 'fahrenheit')).toBeGreaterThan(32)
  })

  it('cuando from y to son iguales, devuelve el valor original', () => {
    // No mata MUTANT_DEMO_1 (ConditionalExpression).
    expect(convertTemperature(20, 'celsius', 'celsius')).toBe(20)
  })

  it('clasifica temperaturas como algo', () => {
    // No mata MUTANT_DEMO_2 ni MUTANT_DEMO_5.
    expect(classifyTemperature(-5)).toBe('freezing')
    expect(classifyTemperature(10)).toBeTruthy()
  })

  it('recomienda ropa corta cuando hace calor y sol', () => {
    // No mata MUTANT_DEMO_4 (LogicalOperator).
    expect(recommendClothing(30, true)).toBe('shorts')
  })
})

// ────────────────────────────────────────────────────────────
// Suite 2 · TESTS FUERTES
// ────────────────────────────────────────────────────────────
describe('temperatureConverter (Jasmine) · tests fuertes', () => {
  describe('convertTemperature', () => {
    it('100 °C son 212 °F exactos', () => {
      expect(convertTemperature(100, 'celsius', 'fahrenheit')).toBe(212)
    })

    it('32 °F son 0 °C exactos', () => {
      expect(convertTemperature(32, 'fahrenheit', 'celsius')).toBe(0)
    })

    it('cuando from !== to, aplica la conversion (no devuelve el valor crudo)', () => {
      expect(convertTemperature(100, 'celsius', 'fahrenheit')).not.toBe(100)
    })

    it('unidad desconocida lanza error', () => {
      expect(function () {
        convertTemperature(10, 'kelvin', 'celsius')
      }).toThrowError(/desconocida/)
    })
  })

  describe('classifyTemperature', () => {
    const CLASSIFY_CASES = [
      [-1, 'freezing'],
      [0, 'freezing'], // boundary exacto que mata <= vs <
      [1, 'cold'],
      [14, 'cold'],
      [15, 'mild'],
      [24, 'mild'],
      [25, 'warm'],
      [34, 'warm'],
      [35, 'hot'],
      [40, 'hot'],
    ]

    CLASSIFY_CASES.forEach(([celsius, expected]) => {
      it('classifyTemperature(' + celsius + ' °C) → ' + expected, () => {
        expect(classifyTemperature(celsius)).toBe(expected)
      })
    })

    it('devuelve el string exacto "cold" para 10 °C', () => {
      expect(classifyTemperature(10)).toBe('cold')
    })
  })

  describe('recommendClothing', () => {
    const CLOTHING_CASES = [
      [30, true, 'shorts'],
      [30, false, 'long-sleeve'], // divergente && vs ||
      [20, true, 'long-sleeve'], // divergente && vs ||
      [20, false, 'long-sleeve'],
    ]

    CLOTHING_CASES.forEach(([celsius, sunny, expected]) => {
      it(
        'celsius=' + celsius + ', sunny=' + sunny + ' → ' + expected,
        () => {
          expect(recommendClothing(celsius, sunny)).toBe(expected)
        }
      )
    })

    it('frio extremo recomienda abrigo', () => {
      expect(recommendClothing(5, false)).toBe('coat')
      expect(recommendClothing(10, true)).toBe('coat')
    })
  })
})
