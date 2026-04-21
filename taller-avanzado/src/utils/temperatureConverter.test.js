// ============================================================
// temperatureConverter · demo de tests DÉBILES vs FUERTES
//
// Este archivo está dividido en dos suites con la MISMA intención
// pero distinto rigor:
//
//   · "Tests DÉBILES" ............. matan ~30 % de los mutantes
//   · "Tests FUERTES (it.each + boundaries)" . matan el 100 %
//
// Ambas suites están en verde con Vitest. La diferencia se ve al
// ejecutar Stryker y abrir el reporte HTML: los mismos mutantes
// aparecen Survived en la primera suite y Killed en la segunda.
//
// Cómo mostrarlo en vivo:
//   1) Comentar la suite "FUERTES" → ejecutar Stryker → abrir reporte
//      → señalar los 5 MUTANT_DEMO Survived.
//   2) Descomentar la suite "FUERTES" → re-ejecutar Stryker → ver
//      cómo pasan a Killed.
// ============================================================

import {
  convertTemperature,
  classifyTemperature,
  recommendClothing,
} from './temperatureConverter'

// ────────────────────────────────────────────────────────────
// Suite 1 · TESTS DÉBILES (dejan mutantes vivos)
// ────────────────────────────────────────────────────────────
describe('temperatureConverter · tests débiles', () => {
  it('convierte celsius a fahrenheit (aprox)', () => {
    // Matcher blando — no mata MUTANT_DEMO_3 (ArithmeticOperator).
    // value / 9 / 5 + 32 también es > 32 si value > 0, así que
    // `toBeGreaterThan(32)` pasa con ambos.
    expect(convertTemperature(100, 'celsius', 'fahrenheit')).toBeGreaterThan(32)
  })

  it('cuando from y to son iguales, devuelve el valor original', () => {
    // No mata MUTANT_DEMO_1 (ConditionalExpression): con if(true)
    // el atajo se activa siempre y este test sigue pasando.
    expect(convertTemperature(20, 'celsius', 'celsius')).toBe(20)
  })

  it('clasifica temperaturas como algo', () => {
    // No mata MUTANT_DEMO_2 (EqualityOperator <= vs <): con celsius=-5
    // ambas condiciones devuelven true. Falta probar celsius=0.
    expect(classifyTemperature(-5)).toBe('freezing')
    // No mata MUTANT_DEMO_5 (BlockStatement vaciado): si el bloque
    // se vacía, `classifyTemperature(10)` devuelve undefined, que
    // NO es truthy. Pero este test solo comprueba truthy, así que
    // pasaría igual si el flujo cae al siguiente if.
    expect(classifyTemperature(10)).toBeTruthy()
  })

  it('recomienda ropa corta cuando hace calor y sol', () => {
    // No mata MUTANT_DEMO_4 (LogicalOperator && vs ||): con ambas
    // condiciones true, && y || devuelven lo mismo.
    expect(recommendClothing(30, true)).toBe('shorts')
  })
})

// ────────────────────────────────────────────────────────────
// Suite 2 · TESTS FUERTES (matan los 5 mutantes)
//
// Técnicas aplicadas (ver S12 de la guía interactiva):
//   · it.each con boundaries [min-1, min, min+1]
//   · asserts con valor exacto en vez de matchers blandos
//   · casos divergentes para operadores lógicos
// ────────────────────────────────────────────────────────────
describe('temperatureConverter · tests fuertes', () => {
  describe('convertTemperature', () => {
    // Mata MUTANT_DEMO_3 (ArithmeticOperator) con valor exacto.
    it('100 °C son 212 °F exactos', () => {
      expect(convertTemperature(100, 'celsius', 'fahrenheit')).toBe(212)
    })

    it('32 °F son 0 °C exactos', () => {
      expect(convertTemperature(32, 'fahrenheit', 'celsius')).toBe(0)
    })

    // Mata MUTANT_DEMO_1 (ConditionalExpression) probando el caso
    // donde `from !== to`: si el if se hubiera mutado a if(true),
    // devolvería 100 en vez de 212.
    it('cuando from !== to, aplica la conversión (no devuelve el valor crudo)', () => {
      expect(convertTemperature(100, 'celsius', 'fahrenheit')).not.toBe(100)
    })

    it('unidad desconocida lanza error', () => {
      expect(() => convertTemperature(10, 'kelvin', 'celsius')).toThrow(/desconocida/)
    })
  })

  describe('classifyTemperature', () => {
    // Mata MUTANT_DEMO_2 (EqualityOperator <= vs <).
    // El boundary crítico es celsius === 0: con `<=` es freezing,
    // con `<` sería 'cold'.
    it.each([
      [-1, 'freezing'],
      [0, 'freezing'], // ← boundary exacto que mata <= vs <
      [1, 'cold'],
      [14, 'cold'],
      [15, 'mild'],
      [24, 'mild'],
      [25, 'warm'],
      [34, 'warm'],
      [35, 'hot'],
      [40, 'hot'],
    ])('classifyTemperature(%i °C) → %s', (celsius, expected) => {
      expect(classifyTemperature(celsius)).toBe(expected)
    })

    // Mata MUTANT_DEMO_5 (BlockStatement vaciado) con valor exacto:
    // si el bloque se vacía, el return es undefined, distinto de 'cold'.
    it('devuelve el string exacto "cold" para 10 °C', () => {
      expect(classifyTemperature(10)).toBe('cold')
    })
  })

  describe('recommendClothing', () => {
    // Mata MUTANT_DEMO_4 (LogicalOperator && vs ||).
    // Hacen falta los dos casos divergentes:
    it.each([
      // celsius | isSunny | expected (con &&)  | con || daría
      [30, true, 'shorts'], // ambos true: && y || coinciden
      [30, false, 'long-sleeve'], // divergente: || → shorts, && → long-sleeve
      [20, true, 'long-sleeve'], // divergente: || → shorts, && → long-sleeve
      [20, false, 'long-sleeve'], // ambos false: && y || coinciden
    ])('celsius=%i, sunny=%s → %s', (celsius, sunny, expected) => {
      expect(recommendClothing(celsius, sunny)).toBe(expected)
    })

    it('frío extremo recomienda abrigo', () => {
      expect(recommendClothing(5, false)).toBe('coat')
      expect(recommendClothing(10, true)).toBe('coat') // boundary <= 10
    })
  })
})
