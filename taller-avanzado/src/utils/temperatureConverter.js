// ============================================================
// temperatureConverter · demo pedagógica para S12 (Stryker)
//
// Este archivo está diseñado para el taller de mutation testing.
// Las tres funciones contienen código real y funcional, pero
// cada una tiene marcado al menos UN "mutante de libro" que los
// tests DÉBILES del archivo `.test.js` dejan sobrevivir.
//
// Los cinco mutantes que introduce Stryker aquí cubren las cinco
// categorías que más aparecen en un reporte real:
//
//   MUTANT_DEMO_1 · ConditionalExpression
//   MUTANT_DEMO_2 · EqualityOperator (boundary)
//   MUTANT_DEMO_3 · ArithmeticOperator
//   MUTANT_DEMO_4 · LogicalOperator (&& vs ||)
//   MUTANT_DEMO_5 · BlockStatement
//
// En la demo: ejecutar `npm run test:mutation:file -- src/utils/temperatureConverter.js`,
// abrir `reports/mutation/mutation.html` y mostrar los 5 Survived
// antes de aplicar los tests fuertes.
// ============================================================

/**
 * Convierte una temperatura entre Celsius y Fahrenheit.
 *
 * @param {number} value - Temperatura a convertir
 * @param {'celsius'|'fahrenheit'} from - Unidad de origen
 * @param {'celsius'|'fahrenheit'} to - Unidad destino
 * @returns {number}
 */
export function convertTemperature(value, from, to) {
  // MUTANT_DEMO_1 · ConditionalExpression
  //   Stryker muta:  if (from === to)  →  if (true)
  //   Si no existe un test con `from !== to`, el mutante
  //   sobrevive porque el atajo "return value" se activa siempre.
  if (from === to) {
    return value
  }

  if (from === 'celsius' && to === 'fahrenheit') {
    // MUTANT_DEMO_3 · ArithmeticOperator
    //   Stryker muta:  value * 9 / 5  →  value / 9 / 5
    //   Con matchers blandos (`toBeGreaterThan`) el mutante
    //   sobrevive. Solo un `toBe(valorExacto)` lo mata.
    return (value * 9) / 5 + 32
  }

  if (from === 'fahrenheit' && to === 'celsius') {
    return ((value - 32) * 5) / 9
  }

  throw new Error(`Unidad desconocida: ${from} → ${to}`)
}

/**
 * Clasifica una temperatura en Celsius por franja.
 *
 * Franjas:
 *   ≤ 0   → 'freezing'
 *   1-14  → 'cold'
 *   15-24 → 'mild'
 *   25-34 → 'warm'
 *   ≥ 35  → 'hot'
 *
 * @param {number} celsius
 * @returns {'freezing'|'cold'|'mild'|'warm'|'hot'}
 */
export function classifyTemperature(celsius) {
  // MUTANT_DEMO_2 · EqualityOperator (boundary)
  //   Stryker muta:  celsius <= 0  →  celsius < 0
  //   Sin un test con `celsius === 0`, el mutante sobrevive:
  //   con valores negativos los dos matchers devuelven lo mismo.
  if (celsius <= 0) return 'freezing'

  if (celsius < 15) {
    // MUTANT_DEMO_5 · BlockStatement
    //   Stryker muta el cuerpo del if a `{ }` (bloque vacío).
    //   Un test que solo compruebe que "devuelve algo" (truthy)
    //   dejaría pasar el mutante: un return vacío también es
    //   undefined, que no es 'cold' pero tampoco es truthy.
    //   Solo un toBe('cold') exacto lo mata.
    return 'cold'
  }

  if (celsius < 25) return 'mild'
  if (celsius < 35) return 'warm'

  return 'hot'
}

/**
 * Recomienda prenda según temperatura y condiciones.
 *
 * @param {number} celsius
 * @param {boolean} isSunny
 * @returns {'shorts'|'long-sleeve'|'coat'}
 */
export function recommendClothing(celsius, isSunny) {
  // MUTANT_DEMO_4 · LogicalOperator
  //   Stryker muta:  celsius >= 25 && isSunny  →  celsius >= 25 || isSunny
  //   Para matarlo hacen falta DOS tests que diverjan:
  //     (20, true)  → && devuelve false, || devuelve true
  //     (25, false) → && devuelve false, || devuelve true
  //   Un solo caso con las dos condiciones verdaderas no basta.
  if (celsius >= 25 && isSunny) {
    return 'shorts'
  }

  if (celsius <= 10) return 'coat'
  return 'long-sleeve'
}
