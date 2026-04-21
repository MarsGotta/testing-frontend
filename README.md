# Taller de Testing Frontend

Repositorio paraguas con todo el material del programa de formación en testing
frontend: dos proyectos de prácticas (básico y avanzado) y la guía escrita
completa (16 documentos + PDF). Pensado para developers con experiencia en
Angular, Vue o React que quieren subir la calidad real de sus tests —no solo
la cobertura.

---

## Qué hay dentro

```
testing-frontend/
├── taller-basico/     · Taller 1 · Fundamentos (TodoApp en React + Vitest)
├── taller-avanzado/   · Taller 2 · Avanzado (App "El Tiempo" · Karma ↔ Vitest · Stryker)
└── material/          · Guía escrita (16 .md + PDF + guion síncrono)
```

Cada subdirectorio es autosuficiente y tiene su propio `README.md` con
instrucciones detalladas. Este README es solo el mapa de entrada.

---

## Por dónde empezar

Elige la ruta según tu situación:

### 1. Vengo a prepararme antes del taller
1. Abre [`material/material/00-temario.md`](./material/material/00-temario.md)
   y lee el bloque "Cómo usar esta guía".
2. Si vas al **Taller 1**, hojea los archivos `01` a `09`.
3. Si vas al **Taller 2**, hojea los archivos `10` a `14`.
4. Clona el proyecto correspondiente (`taller-basico` o `taller-avanzado`),
   instala dependencias y ejecuta los tests para comprobar que todo arranca.

### 2. Ya hice el taller y quiero practicar
1. Entra al proyecto que corresponda y sigue los ejercicios de su README.
2. Los 8 ejercicios progresivos viven en
   [`material/material/16-ejercicios.md`](./material/material/16-ejercicios.md).

### 3. Tengo un caso concreto en mi proyecto
1. Busca el tema en [`material/material/00-temario.md`](./material/material/00-temario.md)
   (hay un índice por tema y "rutas sugeridas por situación").
2. Cada archivo de la guía enlaza al código ejecutable de
   `taller-basico` o `taller-avanzado` cuando existe un ejemplo.

---

## Los tres bloques en detalle

### 📘 `material/` — Guía escrita

16 documentos en Markdown organizados en dos partes:

- **Parte 1 · Fundamentos (archivos 01–09):** por qué testear, anatomía del
  test, Jest vs Vitest, primer componente, queries, eventos, mocking básico,
  snapshots y accesibilidad, buenas prácticas.
- **Parte 2 · Avanzado (archivos 10–14):** migración Karma→Vitest, sintaxis
  Jasmine↔Vitest, mocking avanzado, dominio de la asincronía, mutation
  testing con Stryker.
- **Extras:** referencias (15), ejercicios (16), guion síncrono.

Todo en español, con ejemplos para **Angular, Vue y React**. Validado
pedagógicamente (skill `technical-guide-design`, 5 pasadas de revisión).

### 🟢 `taller-basico/` — Taller 1 · Fundamentos

App de tareas (**TodoApp**) en React 18 + Vite + Vitest. Pensada para
practicar lo esencial: render, queries, eventos de usuario, mocks simples.

Arranque rápido:

```bash
cd taller-basico
npm install
npm run test      # vitest en modo watch
npm run dev       # servidor de desarrollo
```

Scripts disponibles: `dev`, `build`, `preview`, `test`, `test:ui`,
`test:coverage`, `test:run`. Ver su [README](./taller-basico) o `package.json`
para detalles.

### 🔴 `taller-avanzado/` — Taller 2 · Avanzado

App de **El Tiempo** (React 18) que consume Open-Meteo. La pieza clave: dos
suites de tests **espejadas 1:1**, una en Karma/Jasmine (legacy) y otra en
Vitest (moderna). Cada `*.old.test.*` tiene su gemelo `*.test.*` probando lo
mismo. Además incluye dos configuraciones de Stryker para mutation testing
(una sobre Vitest, otra sobre Karma).

Arranque rápido:

```bash
cd taller-avanzado
npm install
npm run test:run          # Vitest (moderno)     · ~266 tests
npm run test:karma        # Karma + Chrome       · ~262 tests
npm run test:mutation     # Stryker sobre Vitest
```

Requisitos extra: **Google Chrome** instalado (Karma usa ChromeHeadless). La
suite Vitest funciona sin Chrome. Ver [`taller-avanzado/README.md`](./taller-avanzado/README.md)
para la guía completa (tiene tabla de contenidos propia, paso a paso de
migración, troubleshooting y ejercicios).

---

## Requisitos globales

- **Node.js 20+**
- **npm** (viene con Node)
- **Google Chrome** — solo si vas a ejecutar la suite de Karma del taller
  avanzado
- **Editor con soporte de TypeScript/JSX** — recomendado VS Code con la
  extensión oficial de Vitest

---

## Stack de referencia

| Herramienta | Versión |
|---|---|
| Vitest | 2.x (guía referencia también 4.x) |
| Testing Library | 16.x |
| userEvent | 14.x |
| Stryker | 9.6.x |
| React | 18.3 |
| Node | 20+ |

La guía escrita cubre además ejemplos para **Angular 17–21** y **Vue 3**,
aunque los proyectos de prácticas están en React.

---

## KPI del programa

Mover el *mutation score* medio de los equipos de **~22 % (feb 2026) a
60 %+**. Por eso el Taller 2 gira alrededor de Stryker y no solo de coverage.

---

## Licencia y uso

Material interno de formación. Uso libre dentro de la organización para
impartir, estudiar o adaptar los contenidos.
