# Mi Sistema Personal

Dashboard personal (agenda, tareas, hábitos, finanzas, notas, proyectos y más)
pensado para crecer durante años sin tener que rehacerse. HTML, CSS y
JavaScript puro — sin frameworks, sin paso de compilación, sin dependencias
externas. Corre 100% estático, listo para GitHub Pages.

## Cómo correrlo en local

Los módulos usan `import`/`export` de ES modules, así que el navegador los
bloquea si abres `index.html` directo con `file://` (por CORS). Necesitas un
servidor estático simple:

```bash
npx serve .
```

o la extensión "Live Server" de VS Code, y abrir la URL que te den.

## Arquitectura en una página

- **`core/`** — el motor de la app. No conoce módulos específicos (nunca
  importa nada de "tareas" o "hábitos" por nombre), solo un contrato:
  - `router.js` — hash routing (`#/ruta`), funciona igual en GitHub Pages.
  - `storage.js` — persistencia en `localStorage` por "namespace". Si algún
    día se necesita IndexedDB o un backend, se cambia aquí una sola vez y
    ningún módulo se entera.
  - `theme.js` — tema claro/oscuro persistente.
  - `event-bus.js` — pub/sub mínimo entre módulos.
  - `module-registry.js` — registro de módulos activos.
  - `modules.config.js` — **el único archivo que "conoce" qué módulos
    existen**. Agregar un módulo nuevo es: crear su carpeta + una línea aquí.
  - `roadmap.js` — módulos futuros que se muestran deshabilitados en el
    sidebar (con su badge de versión) para visualizar hacia dónde va el
    sistema.
  - `shell.js` — arma el sidebar/topbar a partir del registro y conecta todo.
  - `backup.js` — exportar/importar todos tus datos como un archivo JSON.

- **`modules/`** — cada carpeta es una funcionalidad independiente
  (Dashboard, Tareas, Notas, y las que sigan). Cada módulo exporta un objeto
  con esta forma:

  ```js
  export default {
    id: 'tareas',
    label: 'Tareas',
    icon: 'tasks',       // nombre de ícono en shared/icons.js
    group: 'Productividad', // agrupa el sidebar
    route: '#/tareas',
    mount(container) { /* pinta la vista completa */ },
    unmount() { /* limpieza al salir de la vista */ },
    widget: {               // opcional: mini-vista para el Dashboard
      mount(container) { /* ... */ },
    },
  };
  ```

  Un módulo guarda sus datos con `storage.get('su-namespace', default)` /
  `storage.set('su-namespace', valor)` — nunca toca `localStorage`
  directamente ni conoce a otros módulos.

- **`shared/`** — utilidades reusables por cualquier módulo: sprite de
  íconos (`icons.js`), helpers de DOM/seguridad (`utils/dom.js`), debounce
  (`utils/debounce.js`), y `load-css.js` (cada módulo carga su propio CSS al
  montarse por primera vez, así `index.html` nunca se edita para agregar un
  módulo).

- **`styles/`** — design tokens, temas, layout del shell, formularios y
  vocabulario visual de los widgets. Todo con variables CSS (`--espacio`,
  `--color`, etc.) para que sea fácil retocar sin tocar cada módulo.

## Cómo agregar un módulo nuevo

1. Crear `modules/<nombre>/index.js` con el contrato de arriba.
2. (Opcional) `modules/<nombre>/<nombre>.css`, cargado con
   `loadModuleStyles('modules/<nombre>/<nombre>.css')` dentro de `mount()`.
3. Agregar el import y la entrada en `core/modules.config.js`.
4. Si estaba en `core/roadmap.js`, quitarlo de ahí.

Nada más cambia. El sidebar, el router y el dashboard lo detectan solos.

## Respaldo de datos

Los datos viven en `localStorage` del navegador (no se sincronizan entre
dispositivos). Usa los botones de exportar/importar en la barra superior
para descargar un `.json` con todo y restaurarlo cuando quieras (o en otro
navegador/computadora).

## Roadmap

V1 (actual): Dashboard, Tareas, Notas rápidas.
V2 Agenda/Calendario · V3 Hábitos + Pomodoro/Temporizadores · V4 Finanzas ·
V5 Proyectos/Objetivos · V6 Biblioteca + Buscador global · V7 Clientes +
Proyectos de arquitectura · V8 Seguimiento de aprendizaje · V9 Widgets
personalizables + Panel de estadísticas · V10 Respaldo automático + PWA
offline.
