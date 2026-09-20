# TempoMind

TempoMind organiza el estudio por materias. Cada materia tiene un color, un total acumulado y una lista propia de sesiones, siguiendo un flujo similar a una biblioteca de juegos: primero eliges la materia y después registras el tiempo jugado.

## Flujo

1. En **Mis materias** crea una materia con nombre y color.
2. Abre su tarjeta para entrar al detalle y ejecutar el cronómetro.
3. Al detenerlo, guarda notas, estado de ánimo y etiquetas.
4. La sesión se relaciona mediante `subjectId` y actualiza las horas acumuladas de la materia.
5. **Estadísticas** muestra una visión global de todas las materias, con meta diaria y gráfico.

## Características

- Datos privados en `localStorage`, sin cuentas ni servidor.
- Sesiones restaurables si la pestaña se recarga durante un timer activo.
- Historial filtrado por materia y detalle de cada sesión.
- Exportación e importación del modelo de materias y sesiones en JSON.
- Tema claro/oscuro y diseño responsive.

## Tecnologías

- HTML5 y CSS3 con variables, Grid y Flexbox.
- JavaScript vanilla ES6+.
- [Chart.js](https://www.chartjs.org/) mediante CDN.
