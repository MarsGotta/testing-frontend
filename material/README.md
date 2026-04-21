# Taller de Testing Frontend · Material

Guía escrita (16 archivos) + guion síncrono + ejercicios para la serie de talleres de testing frontend de Vitaly.

- **Audiencia:** 20+ equipos Angular/Vue con experiencia media-senior.
- **KPI objetivo:** mover mutation score de **22,59 % (feb 2026) → 60 %+**.
- **Stack de referencia:** Vitest 4.x · Stryker 9.6.x · Angular 17–21 · Vue 3 · Testing Library 16 · userEvent 14 · happy-dom 14.
- **Última validación pedagógica:** 2026-04-19 (5 pasadas de revisión con 23 agentes aplicando la skill `technical-guide-design`).

## Estructura

- [`material/00-temario.md`](./material/00-temario.md) — índice del alumno con rutas por situación.
- [`material/01-09-*.md`](./material/) — Taller 1 (Fundamentos).
- [`material/10-14-*.md`](./material/) — Taller 2 (Avanzado).
- [`material/15-referencias.md`](./material/15-referencias.md) — fuentes y bibliografía.
- [`material/16-ejercicios.md`](./material/16-ejercicios.md) — 8 ejercicios progresivos.
- [`material/guion-sesion-sincrona.md`](./material/guion-sesion-sincrona.md) — guion minuto a minuto para el formador (Taller 2).

## Tareas pendientes

Próximos pasos antes del despliegue del Taller 2 a los 20+ equipos.

### 🔴 Bloqueante — antes del despliegue

- [ ] **Crear el repositorio de ejercicios** `taller-testing-ejercicios`
  - Rama `main` con estado inicial de cada uno de los 8 ejercicios (código Karma+Jasmine legacy, componentes sin tests, etc.).
  - Rama `solucion-01` a `solucion-08` con solución verificada (tests pasan, mutation score medido).
  - `SOLUCION.md` por ejercicio con explicación corta del enfoque y alternativas consideradas.
  - Soluciones **públicas** (sin bloqueo) — coherente con respeto al aprendiz adulto profesional.
  - Referenciado desde `material/16-ejercicios.md`.

### 🟡 Recomendado — antes del despliegue

- [ ] **Pilotar la sesión síncrona** con 1–2 equipos antes del despliegue a los 20+.
  - Medir: tiempo real vs estimado por bloque, dudas recurrentes, puntos donde se atascan.
  - Iterar sobre el guion con el feedback recibido.
  - El formador puede anotar directamente en `guion-sesion-sincrona.md`.

- [ ] **Validación técnica de snippets** de la guía
  - Extraer snippets críticos y ejecutarlos contra un proyecto Angular 21 + Vue 3 real.
  - Confirmar que compilan con `tsc --noEmit`.
  - Prioridad por archivo: 04, 06, 07, 10, 12, 13 (contienen los snippets más complejos).

### 🟢 Deseable — no bloquea

- [ ] **Validación de enlaces externos** con `lychee` o `markdown-link-check`.
  - URL rota ya corregida: `ngrx.io/guide/store/testing` → `v18.ngrx.io/...`.
  - Pendiente: pasar la herramienta sobre las ~200 URLs de `15-referencias.md`.

- [ ] **Unificación de dominio** en ejemplos dispersos
  - Archivo 12 mezcla User/Cart/Order/Dashboard — no crítico (how-to, funcional tal cual) pero unificar a Cart reduciría carga cognitiva.

- [ ] **Normalización de acentos** en archivos con texto sin tildes
  - Archivos 12 y 14 tienen mezcla de "deberia"/"debería". Barrido manual con búsqueda-reemplazo.

- [ ] **Branch de guion para Taller 1**
  - Actualmente solo existe guion síncrono del Taller 2. Si se vuelve a impartir el Taller 1, necesitará su propio guion con la misma estructura (`guion-sesion-sincrona-taller-1.md`).

## Historial de revisión

| Fecha | Alcance | Agentes |
|---|---|---|
| 2026-04-19 | 5 pasadas · 19 documentos · skill `technical-guide-design` aplicada | 23 |

Notas clave de la revisión (ver memoria `engram`):

- Archivos 02–09 estaban inicialmente en React — migrados a Angular+Vue.
- Flag Stryker `--since origin/main` documentada como si existiera — no existe, corregida.
- Incoherencia `fakeAsync` entre archivos 10 y 13 — corregida con escenarios A (zone.js testing) y B (zoneless).
- Stryker 9.5.1 → 9.6.x (v9.6.1 es la versión actual).

## Skill pedagógica

La revisión aplicó la skill `technical-guide-design` (Obsidian vault, categoría `generals/`) basada en Diátaxis, andragogía (Knowles), Cognitive Load Theory (Sweller), worked examples (Renkl & Atkinson) y Google Developer Style Guide. Ver `~/.claude/skills/technical-guide-design/SKILL.md`.
