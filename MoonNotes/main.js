(function () {
  'use strict';

  const COUNTAPI_BASE = 'https://api.countapi.xyz';
  const COUNTAPI_NAMESPACE = 'moonnotes-downloads';
  const CLAVE_TEMA = 'moonnotes-tema';
  const TIEMPO_LIMITE_API = 1500;

  const ICONO_LUNA =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';

  const ICONO_SOL =
    '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="4"></circle>' +
    '<path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41' +
    'M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path></svg>';

  const ICONOS_POR_DEFECTO = [
    { claves: ['calculo', 'matemat', 'algebra', 'geometr', 'estadistic', 'analisis', 'trigonometr'], icono: 'C' },
    { claves: ['fisica'], icono: 'F' },
    { claves: ['quimic'], icono: 'Q' },
    { claves: ['biolog', 'anatom', 'salud', 'medic'], icono: 'B' },
    { claves: ['programacion', 'informatic', 'algoritm', 'computacion', 'sistema'], icono: 'P' },
    { claves: ['historia', 'historic'], icono: 'H' },
    { claves: ['literat', 'lengua', 'escritur', 'comunicacion'], icono: 'L' },
    { claves: ['ingles', 'idioma', 'portugues', 'frances'], icono: 'I' },
    { claves: ['econom', 'contab', 'administra', 'finanz'], icono: 'E' },
    { claves: ['derecho', 'juridic', 'legal'], icono: 'J' },
    { claves: ['filosof', 'etica', 'psicolog'], icono: 'S' },
    { claves: ['dibujo', 'arte', 'diseno', 'musica'], icono: 'A' }
  ];

  /* ----------------------------------------------------------
     Utilidades
     ---------------------------------------------------------- */

  function normalizar(texto) {
    return String(texto == null ? '' : texto)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function slugify(texto) {
    return normalizar(texto)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function formatearNombre(texto) {
    const limpio = String(texto == null ? '' : texto)
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!limpio) return 'Recurso sin nombre';
    return limpio.charAt(0).toUpperCase() + limpio.slice(1);
  }

  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun',
                 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function formatearFecha(iso) {
    const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    if (!coincidencia) return '';

    const anio = coincidencia[1];
    const mes = parseInt(coincidencia[2], 10);
    const dia = parseInt(coincidencia[3], 10);

    if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return String(iso);

    return dia + ' ' + MESES[mes - 1] + ' ' + anio;
  }

  function escapar(texto) {
    return String(texto == null ? '' : texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function codificarRuta(ruta) {
    return String(ruta || '')
      .split('/')
      .filter(function (parte) { return parte.length > 0; })
      .map(encodeURIComponent)
      .join('/');
  }

  function contarRecursos(n) {
    return n + (n === 1 ? ' recurso' : ' recursos');
  }

  function iconoPorDefecto(nombre) {
    const plano = normalizar(nombre);
    for (let i = 0; i < ICONOS_POR_DEFECTO.length; i++) {
      const grupo = ICONOS_POR_DEFECTO[i];
      for (let j = 0; j < grupo.claves.length; j++) {
        if (plano.indexOf(grupo.claves[j]) !== -1) return grupo.icono;
      }
    }
    return '📚';
  }

  function prefiereMenosMovimiento() {
    return typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ----------------------------------------------------------
     Construcción del modelo a partir de config.js
     ---------------------------------------------------------- */

  const CONFIG = (typeof MOONNOTES_CONFIG !== 'undefined' && MOONNOTES_CONFIG)
    ? MOONNOTES_CONFIG
    : { materias: [] };

  const materias = (Array.isArray(CONFIG.materias) ? CONFIG.materias : [])
    .map(function (materia, indiceMateria) {

      const carpeta = String(materia.carpeta || '').replace(/^\/+|\/+$/g, '');
      const nombreMateria = formatearNombre(materia.nombre || ('Materia ' + (indiceMateria + 1)));
      const slugMateria = slugify(materia.nombre || ('materia-' + indiceMateria));

      const archivos = (Array.isArray(materia.archivos) ? materia.archivos : [])
        .map(function (archivo, indiceArchivo) {

          const nombreCrudo = archivo.nombre || archivo.archivo || ('Recurso ' + (indiceArchivo + 1));
          const nombreArchivo = String(archivo.archivo || '').trim();
          const ruta = [carpeta, nombreArchivo].filter(Boolean).join('/');

          return {
            nombre: formatearNombre(nombreCrudo),
            archivo: nombreArchivo,
            fecha: archivo.fecha || '',
            ruta: ruta,
            url: codificarRuta(ruta),
            slug: slugify(nombreCrudo) || ('recurso-' + indiceArchivo)
          };
        });

      return {
        nombre: nombreMateria,
        slug: slugMateria,
        icono: materia.icono || iconoPorDefecto(nombreMateria),
        carpeta: carpeta,
        archivos: archivos
      };
    });

  /* ----------------------------------------------------------
     Referencias al DOM
     ---------------------------------------------------------- */

  const vistaInicio = document.getElementById('vista-inicio');
  const vistaMateria = document.getElementById('vista-materia');
  const vistaBusqueda = document.getElementById('vista-busqueda');

  const gridMaterias = document.getElementById('grid-materias');
  const materiaHeader = document.getElementById('materia-header');
  const listaArchivos = document.getElementById('lista-archivos');
  const listaResultados = document.getElementById('lista-resultados');
  const tituloBusqueda = document.getElementById('busqueda-titulo');

  const entradaBuscador = document.getElementById('buscador');
  const botonLimpiar = document.getElementById('buscador-limpiar');
  const botonTema = document.getElementById('tema-toggle');
  const botonVolver = document.getElementById('btn-volver');

  const VISTAS = [vistaInicio, vistaMateria, vistaBusqueda];

  let consulta = '';

  /* ----------------------------------------------------------
     Tema claro / oscuro
     ---------------------------------------------------------- */

  function temaActual() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function actualizarBotonTema(tema) {
    const esClaro = tema === 'light';
    const etiqueta = esClaro ? 'Cambiar a tema oscuro' : 'Cambiar a tema claro';
    botonTema.setAttribute('title', etiqueta);
    botonTema.setAttribute('aria-label', etiqueta);
    botonTema.innerHTML = esClaro ? ICONO_SOL : ICONO_LUNA;
  }

  function aplicarTema(tema) {
    document.documentElement.setAttribute('data-theme', tema);
    try {
      localStorage.setItem(CLAVE_TEMA, tema);
    } catch (e) { /* almacenamiento no disponible */ }
    actualizarBotonTema(tema);
  }

  /* ----------------------------------------------------------
     Contadores de descarga (CountAPI)
     ---------------------------------------------------------- */

  const contadoresCache = {};
  const contadoresSolicitados = {};

  function peticionCountAPI(ruta) {
    const tieneAbort = typeof AbortController !== 'undefined';
    const controlador = tieneAbort ? new AbortController() : null;

    const temporizador = setTimeout(function () {
      if (controlador) controlador.abort();
    }, TIEMPO_LIMITE_API);

    const opciones = { cache: 'no-store' };
    if (controlador) opciones.signal = controlador.signal;

    return fetch(COUNTAPI_BASE + ruta, opciones)
      .then(function (respuesta) {
        if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
        return respuesta.json();
      })
      .then(function (datos) {
        clearTimeout(temporizador);
        return datos;
      })
      .catch(function (error) {
        clearTimeout(temporizador);
        throw error;
      });
  }

  function actualizarContador(slug, valor) {
    const nodos = document.querySelectorAll('[data-contador="' + slug + '"]');
    for (let i = 0; i < nodos.length; i++) {
      nodos[i].textContent = '↓ ' + valor;
      nodos[i].hidden = false;
    }
  }

  function cargarContador(slug) {
    if (contadoresCache[slug] !== undefined) {
      actualizarContador(slug, contadoresCache[slug]);
      return;
    }

    if (contadoresSolicitados[slug]) return;
    contadoresSolicitados[slug] = true;

    peticionCountAPI('/get/' + COUNTAPI_NAMESPACE + '/' + encodeURIComponent(slug))
      .then(function (datos) {
        if (datos && typeof datos.value === 'number' && datos.value > 0) {
          contadoresCache[slug] = datos.value;
          actualizarContador(slug, datos.value);
        }
      })
      .catch(function () {
        /* CountAPI no disponible: se oculta el contador en silencio */
      });
  }

  function cargarContadores(archivos) {
    archivos.forEach(function (archivo) {
      cargarContador(archivo.slug);
    });
  }

  function incrementarContador(slug) {
    return peticionCountAPI('/hit/' + COUNTAPI_NAMESPACE + '/' + encodeURIComponent(slug))
      .then(function (datos) {
        if (datos && typeof datos.value === 'number') {
          contadoresCache[slug] = datos.value;
          actualizarContador(slug, datos.value);
        }
      })
      .catch(function () {
        /* Falla silenciosa: la descarga continúa igual */
      });
  }

  /* ----------------------------------------------------------
     Plantillas
     ---------------------------------------------------------- */

  function plantillaArchivo(materia, archivo, conMateria) {
    const meta = [];

    if (conMateria) {
      meta.push('<span class="archivo__materia">' + escapar(materia.nombre) + '</span>');
    }

    const fecha = formatearFecha(archivo.fecha);
    if (fecha) {
      meta.push('<span class="archivo__fecha">' + escapar(fecha) + '</span>');
    }

    meta.push(
      '<span class="archivo__contador" data-contador="' +
      escapar(archivo.slug) + '" hidden></span>'
    );

    return '' +
      '<div class="archivo__info">' +
        '<h3 class="archivo__nombre">' + escapar(archivo.nombre) + '</h3>' +
        '<p class="archivo__meta">' + meta.join('') + '</p>' +
      '</div>' +
      '<div class="archivo__acciones">' +
        '<a class="btn btn--outline" href="' + escapar(archivo.url) + '" ' +
          'target="_blank" rel="noopener noreferrer">Ver</a>' +
        '<button class="btn btn--filled" type="button" ' +
          'data-descargar="' + escapar(archivo.slug) + '" ' +
          'data-url="' + escapar(archivo.url) + '" ' +
          'data-archivo="' + escapar(archivo.archivo) + '">Descargar</button>' +
      '</div>';
  }

  function crearFilaArchivo(materia, archivo, conMateria) {
    const fila = document.createElement('article');
    fila.className = 'archivo';
    fila.id = 'archivo-' + materia.slug + '-' + archivo.slug;
    fila.innerHTML = plantillaArchivo(materia, archivo, conMateria);
    return fila;
  }

  /* ----------------------------------------------------------
     Vistas
     ---------------------------------------------------------- */

  function mostrarVista(vista) {
    VISTAS.forEach(function (otra) {
      if (otra === vista) return;
      otra.hidden = true;
      otra.classList.remove('vista--activa');
    });

    vista.hidden = false;
    window.requestAnimationFrame(function () {
      vista.classList.add('vista--activa');
    });
  }

  function renderInicio() {
    gridMaterias.innerHTML = '';

    if (!materias.length) {
      const aviso = document.createElement('p');
      aviso.className = 'vacio';
      aviso.textContent = 'Todavía no hay materias cargadas.';
      gridMaterias.appendChild(aviso);
      lucide.createIcons();
      return;
    }

    materias.forEach(function (materia, indice) {
      const card = document.createElement('a');
      card.className = 'card-materia';
      card.href = '#' + materia.slug;
      card.innerHTML =
        '<span class="card-materia__icono" aria-hidden="true">' + escapar(materia.icono) + '</span>' +
        '<span class="card-materia__nombre">' + escapar(materia.nombre) + '</span>' +
        '<span class="card-materia__meta">' + contarRecursos(materia.archivos.length) + '</span>';

      gridMaterias.appendChild(card);

      setTimeout(function () {
        card.classList.add('card-materia--visible');
      }, 40 + indice * 70);
    });

    lucide.createIcons();
  }

  function renderMateria(materia) {
    materiaHeader.innerHTML =
      '<span class="materia-header__icono" aria-hidden="true">' + escapar(materia.icono) + '</span>' +
      '<div>' +
        '<h1 class="materia-header__nombre">' + escapar(materia.nombre) + '</h1>' +
        '<p class="materia-header__meta">' + contarRecursos(materia.archivos.length) + '</p>' +
      '</div>';

    listaArchivos.innerHTML = '';

    if (!materia.archivos.length) {
      const aviso = document.createElement('p');
      aviso.className = 'vacio';
      aviso.textContent = 'Esta materia aún no tiene recursos disponibles.';
      listaArchivos.appendChild(aviso);
      lucide.createIcons();
      return;
    }

    materia.archivos.forEach(function (archivo) {
      listaArchivos.appendChild(crearFilaArchivo(materia, archivo, false));
    });

    cargarContadores(materia.archivos);
    lucide.createIcons();
  }

  function renderBusqueda(termino) {
    const objetivo = normalizar(termino);
    const resultados = [];

    materias.forEach(function (materia) {
      const materiaCoincide = normalizar(materia.nombre).indexOf(objetivo) !== -1;

      materia.archivos.forEach(function (archivo) {
        const archivoCoincide = normalizar(archivo.nombre).indexOf(objetivo) !== -1;
        if (archivoCoincide || materiaCoincide) {
          resultados.push({ materia: materia, archivo: archivo });
        }
      });
    });

    listaResultados.innerHTML = '';

    if (!resultados.length) {
      tituloBusqueda.textContent = 'Resultados';
      const aviso = document.createElement('p');
      aviso.className = 'vacio';
      aviso.textContent = "No se encontraron recursos para '" + termino + "'.";
      listaResultados.appendChild(aviso);
      lucide.createIcons();
      return;
    }

    tituloBusqueda.textContent = resultados.length === 1
      ? '1 resultado'
      : resultados.length + ' resultados';

    resultados.forEach(function (item) {
      const fila = crearFilaArchivo(item.materia, item.archivo, true);
      listaResultados.appendChild(fila);

      if (contadoresCache[item.archivo.slug] !== undefined) {
        actualizarContador(item.archivo.slug, contadoresCache[item.archivo.slug]);
      }
    });

    lucide.createIcons();
  }

  function resaltarArchivo(materia, slugArchivo) {
    const objetivo = document.getElementById('archivo-' + materia.slug + '-' + slugArchivo);
    if (!objetivo) return;

    objetivo.classList.add('archivo--destacado');

    window.requestAnimationFrame(function () {
      objetivo.scrollIntoView({
        behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth',
        block: 'center'
      });
    });

    setTimeout(function () {
      objetivo.classList.remove('archivo--destacado');
    }, 2600);
  }

  /* ----------------------------------------------------------
     Routing por hash
     ---------------------------------------------------------- */

  function parseHash() {
    let crudo = '';

    try {
      crudo = decodeURIComponent(window.location.hash.replace(/^#\/?/, ''));
    } catch (e) {
      crudo = window.location.hash.replace(/^#\/?/, '');
    }

    const partes = crudo.split('/')
      .map(function (parte) { return slugify(parte); })
      .filter(Boolean);

    if (!partes.length) return { vista: 'inicio' };

    return {
      vista: 'materia',
      materiaSlug: partes[0],
      archivoSlug: partes[1] || null
    };
  }

  function buscarMateria(slug) {
    for (let i = 0; i < materias.length; i++) {
      if (materias[i].slug === slug) return materias[i];
    }
    return null;
  }

  function manejarRuta() {
    const ruta = parseHash();

    if (ruta.vista === 'materia') {
      const materia = buscarMateria(ruta.materiaSlug);

      if (materia) {
        renderMateria(materia);
        mostrarVista(vistaMateria);
        window.scrollTo({ top: 0, behavior: 'auto' });

        if (ruta.archivoSlug) {
          resaltarArchivo(materia, ruta.archivoSlug);
        }
        return;
      }
    }

    renderInicio();
    mostrarVista(vistaInicio);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ----------------------------------------------------------
     Descargas
     ---------------------------------------------------------- */

  function lanzarDescarga(url, nombreArchivo) {
    const enlace = document.createElement('a');
    enlace.href = url;
    if (nombreArchivo) enlace.download = nombreArchivo;
    enlace.rel = 'noopener';
    enlace.style.display = 'none';

    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
  }

  function descargar(url, slug, nombreArchivo) {
    incrementarContador(slug).then(function () {
      lanzarDescarga(url, nombreArchivo);
    });
  }

  document.addEventListener('click', function (evento) {
    const boton = evento.target.closest('[data-descargar]');
    if (!boton) return;

    evento.preventDefault();

    descargar(
      boton.getAttribute('data-url'),
      boton.getAttribute('data-descargar'),
      boton.getAttribute('data-archivo')
    );
  });

  /* ----------------------------------------------------------
     Búsqueda
     ---------------------------------------------------------- */

  function limpiarBuscador(silencioso) {
    consulta = '';
    if (entradaBuscador.value !== '') entradaBuscador.value = '';
    botonLimpiar.hidden = true;
    if (!silencioso) entradaBuscador.focus();
  }

  entradaBuscador.addEventListener('input', function () {
    consulta = entradaBuscador.value.trim();
    botonLimpiar.hidden = consulta.length === 0;

    if (consulta) {
      renderBusqueda(consulta);
      mostrarVista(vistaBusqueda);
    } else {
      manejarRuta();
    }
  });

  entradaBuscador.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && entradaBuscador.value !== '') {
      evento.preventDefault();
      limpiarBuscador(false);
      manejarRuta();
    }
  });

  botonLimpiar.addEventListener('click', function () {
    limpiarBuscador(false);
    manejarRuta();
  });

  /* ----------------------------------------------------------
     Navegación y eventos globales
     ---------------------------------------------------------- */

  botonVolver.addEventListener('click', function () {
    if (window.location.hash) {
      window.location.hash = '';
    } else {
      manejarRuta();
    }
  });

  window.addEventListener('hashchange', function () {
    if (consulta) limpiarBuscador(true);
    manejarRuta();
  });

  botonTema.addEventListener('click', function () {
    aplicarTema(temaActual() === 'dark' ? 'light' : 'dark');
  });

  /* ----------------------------------------------------------
     Arranque
     ---------------------------------------------------------- */

  function iniciar() {
    actualizarBotonTema(temaActual());
    manejarRuta();
  }

  iniciar();

})();