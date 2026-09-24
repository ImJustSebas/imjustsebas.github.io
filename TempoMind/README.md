# TempoMind

TempoMind organiza el estudio por materias con una estética soft modular en blanco y negro. El foco sigue siendo el tiempo: eliges una materia, lanzas la sesión y luego guardas el detalle de cada bloque de estudio.

## Flujo

1. En **Mis materias** crea una materia con nombre.
2. Abre la materia para ver el detalle y ejecutar el cronómetro.
3. Al detenerlo, guarda notas, estado de ánimo y etiquetas.
4. La sesión queda asociada con `subjectId` y actualiza el total acumulado de la materia.
5. En **Estadísticas** se revisa la meta diaria, la racha y el rendimiento de los últimos 7 días.

## Características

- Datos privados en `localStorage`, sin cuentas ni servidor.
- Sesiones restaurables si la pestaña se recarga durante un timer activo.
- Historial filtrado por materia y detalle completo de cada sesión.
- Exportación e importación del modelo de materias y sesiones en JSON sin cambiar la estructura ni el formato.
- Sistema monocromo con opacidades, módulos suaves y diseño responsive.
- Modo enfoque para mantener el cronómetro como centro visual.
- Gráfico de siete días con un tratamiento limpio y legible en modo claro y oscuro.

## Tecnologías

- HTML5 y CSS3 con variables, Grid y Flexbox.
- JavaScript vanilla ES6+.
- [Chart.js](https://www.chartjs.org/) mediante CDN.
- Dependencia de tipografías de Google Fonts: Inter y JetBrains Mono.
- Assets del icono incluidos en la raíz del proyecto: `icono.png`, `icono-blanco.png` y `apple-touch-icon.png`.
