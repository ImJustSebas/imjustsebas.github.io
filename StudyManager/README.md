# TempoMind

TempoMind organiza el estudio por materias con una estética soft modular en blanco y negro. El foco sigue siendo el tiempo: eliges una materia, lanzas la sesión y luego guardas el detalle de cada bloque de estudio. Ahora puedes medir con cronómetro libre o con un Pomodoro clásico, sin salir de la misma vista.

## Flujo

1. En **Mis materias** crea una materia con nombre.
2. Abre la materia para ver el detalle y elegir cómo medir el tiempo.
3. Al detenerlo, guarda notas, estado de ánimo y etiquetas.
4. La sesión queda asociada con `subjectId` y actualiza el total acumulado de la materia.
5. En **Estadísticas** se revisa la meta diaria, la racha y el rendimiento de los últimos 7 días.

## Modos de medición

Arriba del cronómetro hay un selector con dos modos. Se recuerda entre sesiones y solo se puede cambiar cuando no hay una sesión activa.

### Cronómetro
Cuenta hacia arriba desde cero. Al detener, se abre el modal de notas y la sesión se guarda con el tiempo acumulado.

### Pomodoro
Encadena rondas automáticamente: estudio → descanso corto → estudio → … → descanso largo → reinicio del ciclo. Al elegir este modo aparece un panel con cuatro parámetros:

- **Estudio**: minutos por ronda de estudio.
- **Descanso**: minutos del descanso corto entre rondas.
- **Descanso largo**: minutos del descanso al cerrar un ciclo completo.
- **Rondas**: cuántas rondas de estudio antes del descanso largo.

Cada ronda de estudio completada se guarda automáticamente como una sesión con la duración configurada. Las transiciones son automáticas y avisan con un tono corto y una vibración breve si el dispositivo lo soporta. Si detienes el pomodoro a mitad de una ronda de estudio, se abre el modal de notas como en el cronómetro. Si lo detienes durante un descanso, sale directo a idle sin guardar nada.

El estado del pomodoro se restaura si recargas la pestaña: si estaba corriendo, continúa; si estaba pausado, se recupera con los botones Reanudar y Detener listos. Si la fase se agotó mientras la pestaña estaba cerrada, la app vuelve a idle con un aviso y no inventa rondas que nadie estudió.

Durante el foco, el selector de modo y el panel de configuración se ocultan junto con el resto del chrome. Solo quedan visibles la etiqueta de fase, los puntos de ronda y el cronómetro.

## Características

- Datos privados en `localStorage`, sin cuentas ni servidor.
- Dos modos de medición: cronómetro libre y Pomodoro configurable.
- Ciclo Pomodoro con rondas, descanso corto y descanso largo automáticos.
- Guardado automático de cada ronda de estudio completada.
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
- Web Audio API y `navigator.vibrate` para los avisos del Pomodoro (nativos, sin dependencias).
- Dependencia de tipografías de Google Fonts: Inter y JetBrains Mono.
- Assets del icono incluidos en la raíz del proyecto: `icono.png`, `icono-blanco.png` y `apple-touch-icon.png`.