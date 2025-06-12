// ui.js
import { formatearTiempo } from './util.js';

// --- Elementos del DOM (obtenidos una vez y usados por las funciones de UI) ---
const displayTurnoJugador = document.getElementById('mostrar_turno_jugador');
const displayTiempoBlancas = document.getElementById('tiempo_blancas');
const displayTiempoNegras = document.getElementById('tiempo_negras');
const contenedorTiempoBlancas = document.getElementById('temporizador_blancas_contenedor');
const contenedorTiempoNegras = document.getElementById('temporizador_negras_contenedor');
const listaMovimientosOLElement = document.getElementById('lista_movimientos_ol');
const btnDescargarMovimientos = document.getElementById('btn_descargar_movimientos');
const mensajeEstadoJuegoContenedorEl = document.getElementById('mensaje_estado_juego_contenedor');
const mensajeEstadoJuegoTextoEl = document.getElementById('mensaje_estado_juego_texto');
const simbolosBlancasCapturoEl = document.getElementById('simbolos_blancas_capturo');
const simbolosNegrasCapturoEl = document.getElementById('simbolos_negras_capturo');
const divConfiguracionTiempo = document.getElementById('configuracion_tiempo'); // Para ocultarlo
const contenedorTablero = document.getElementById('contenedor_tablero'); // Para querySelector de casillas

// --- Estado interno del módulo UI ---
let casillasElementosResaltadosComoPosibles = [];
let ultimaCasillaOrigenEl = null;
let ultimaCasillaDestinoEl = null;
let temporizadorMensajeEstado = null;

// --- Funciones Exportadas para Manipulación de UI ---

export function actualizarIndicadorTurnoUI(turno) {
    if (displayTurnoJugador) {
        displayTurnoJugador.textContent = `Turno de: ${turno.charAt(0).toUpperCase() + turno.slice(1)}`;
    }
    if (contenedorTiempoBlancas && contenedorTiempoNegras) {
        if (turno === 'blanco') {
            contenedorTiempoBlancas.classList.add('reloj-activo');
            contenedorTiempoNegras.classList.remove('reloj-activo');
        } else {
            contenedorTiempoNegras.classList.add('reloj-activo');
            contenedorTiempoBlancas.classList.remove('reloj-activo');
        }
    }
}

export function actualizarVisualizacionTiemposIndividualesUI(tRestanteBlancas, tRestanteNegras, tiempoInicialSeleccionado) {
    // Asegurarse de que los tiempos no sean null antes de formatear, usar tiempoInicialSeleccionado como fallback
    const tBlancas = tRestanteBlancas !== null ? tRestanteBlancas : tiempoInicialSeleccionado;
    const tNegras = tRestanteNegras !== null ? tRestanteNegras : tiempoInicialSeleccionado;

    if (displayTiempoBlancas) displayTiempoBlancas.textContent = formatearTiempo(tBlancas);
    if (displayTiempoNegras) displayTiempoNegras.textContent = formatearTiempo(tNegras);
}

export function limpiarResaltadoMovimientosPosiblesUI() {
    casillasElementosResaltadosComoPosibles.forEach(casillaEl => {
        casillaEl.classList.remove('movimiento-posible');
    });
    casillasElementosResaltadosComoPosibles = [];
}

export function resaltarMovimientosLegalesUI(movimientosLegalesStrArray) {
    limpiarResaltadoMovimientosPosiblesUI();
    if (!contenedorTablero) return;
    movimientosLegalesStrArray.forEach(destinoStr => {
        const casillaDestinoEl = contenedorTablero.querySelector(`[data-posicion="${destinoStr}"]`);
        if (casillaDestinoEl) {
            casillaDestinoEl.classList.add('movimiento-posible');
            casillasElementosResaltadosComoPosibles.push(casillaDestinoEl);
        }
    });
}

export function limpiarResaltadoUltimoMovimientoUI() {
    if (ultimaCasillaOrigenEl) {
        ultimaCasillaOrigenEl.classList.remove('ultimo-mov-origen');
        ultimaCasillaOrigenEl = null;
    }
    if (ultimaCasillaDestinoEl) {
        ultimaCasillaDestinoEl.classList.remove('ultimo-mov-destino');
        ultimaCasillaDestinoEl = null;
    }
}

export function aplicarResaltadoUltimoMovimientoUI(casillaOrigenDOMEl, casillaDestinoDOMEl) {
    limpiarResaltadoUltimoMovimientoUI();
    ultimaCasillaOrigenEl = casillaOrigenDOMEl;
    ultimaCasillaDestinoEl = casillaDestinoDOMEl;
    if (ultimaCasillaOrigenEl) ultimaCasillaOrigenEl.classList.add('ultimo-mov-origen');
    if (ultimaCasillaDestinoEl) ultimaCasillaDestinoEl.classList.add('ultimo-mov-destino');
}

export function actualizarDisplayHistorialMovimientosUI(historialMovimientosArray) {
    if (!listaMovimientosOLElement) return;
    listaMovimientosOLElement.innerHTML = "";
    historialMovimientosArray.forEach(mov => {
        const li = document.createElement('li');
        const numSpan = document.createElement('span');
        numSpan.className = 'numero-movimiento';
        numSpan.textContent = `${mov.numero}.`;
        li.appendChild(numSpan);
        const parMovimientosSpan = document.createElement('span');
        parMovimientosSpan.className = 'movimiento-par';
        const blancasSpan = document.createElement('span');
        blancasSpan.className = 'movimiento-individual';
        blancasSpan.textContent = mov.blancas;
        parMovimientosSpan.appendChild(blancasSpan);
        if (mov.negras) {
            const negrasSpan = document.createElement('span');
            negrasSpan.className = 'movimiento-individual';
            negrasSpan.textContent = mov.negras;
            parMovimientosSpan.appendChild(negrasSpan);
        }
        li.appendChild(parMovimientosSpan);
        listaMovimientosOLElement.appendChild(li);
    });
    const seccionMovimientos = document.getElementById('seccion_movimientos');
    if (seccionMovimientos) seccionMovimientos.scrollTop = seccionMovimientos.scrollHeight;
    if (btnDescargarMovimientos) btnDescargarMovimientos.disabled = historialMovimientosArray.length === 0;
}

export function generarTextoHistorialUI(historialMovimientosArray, tiempoDeJuegoSeleccionado, reglaJaqueEstaHabilitadaParam) {
    let texto = "Historial de Movimientos de la Partida de Ajedrez\n";
    texto += "-------------------------------------------------\n";
    const fechaActual = new Date();
    texto += `Fecha: ${fechaActual.toLocaleDateString()} ${fechaActual.toLocaleTimeString()}\n`;
    texto += `Tiempo Juego: ${tiempoDeJuegoSeleccionado / 60} min/jugador\n`;
    texto += `Regla de Jaque: ${reglaJaqueEstaHabilitadaParam ? 'Habilitada' : 'Deshabilitada'}\n`;
    texto += "-------------------------------------------------\n\n";
    texto += "N.  Blancas   Negras\n";
    texto += "---------------------\n";
    historialMovimientosArray.forEach(mov => {
        let linea = `${mov.numero.toString().padEnd(3, ' ')} ${mov.blancas.padEnd(9, ' ')}`;
        if (mov.negras) linea += `${mov.negras}`;
        texto += linea + "\n";
    });
    return texto;
}

export function descargarArchivoTextoUI(nombreArchivo, contenido) {
    const elemento = document.createElement('a');
    elemento.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contenido));
    elemento.setAttribute('download', nombreArchivo);
    elemento.style.display = 'none';
    document.body.appendChild(elemento);
    elemento.click();
    document.body.removeChild(elemento);
}

export function mostrarMensajeTemporalUI(mensaje, duracionMs = 2500, tipo = 'error') {
    if (!mensajeEstadoJuegoContenedorEl || !mensajeEstadoJuegoTextoEl) return;
    if (temporizadorMensajeEstado) clearTimeout(temporizadorMensajeEstado);
    mensajeEstadoJuegoTextoEl.textContent = mensaje;
    mensajeEstadoJuegoContenedorEl.classList.remove('mensaje-error', 'mensaje-info');
    mensajeEstadoJuegoContenedorEl.classList.add(`mensaje-${tipo}`);
    mensajeEstadoJuegoContenedorEl.classList.add('mensaje-visible');
    temporizadorMensajeEstado = setTimeout(() => {
        mensajeEstadoJuegoContenedorEl.classList.remove('mensaje-visible');
        temporizadorMensajeEstado = null;
    }, duracionMs);
}

export function actualizarPiezasCapturadasUI(jugadorQueCapturaColor, simboloPiezaCapturada) {
    const piezaCapturadaSpan = document.createElement('span');
    piezaCapturadaSpan.textContent = simboloPiezaCapturada;
    if (jugadorQueCapturaColor === 'blanco') {
        if (simbolosBlancasCapturoEl) simbolosBlancasCapturoEl.appendChild(piezaCapturadaSpan);
    } else {
        if (simbolosNegrasCapturoEl) simbolosNegrasCapturoEl.appendChild(piezaCapturadaSpan);
    }
}

export function limpiarTableroDeClasesJuegoUI() {
    if(contenedorTablero) { // Asegurarse que el tablero existe
        contenedorTablero.querySelectorAll('.en-jaque').forEach(el => el.classList.remove('en-jaque'));
        contenedorTablero.querySelectorAll('.seleccionada').forEach(el => el.classList.remove('seleccionada'));
    }
    limpiarResaltadoMovimientosPosiblesUI();
    limpiarResaltadoUltimoMovimientoUI();
}

export function actualizarResaltadoCasillaJaqueUI(posicionRey, estaEnJaqueParam) {
    if (!contenedorTablero) return;
    // Limpiar resaltado de jaque previo en cualquier casilla
    const casillasEnJaquePrevias = contenedorTablero.querySelectorAll('.en-jaque');
    casillasEnJaquePrevias.forEach(c => c.classList.remove('en-jaque'));

    if (posicionRey && estaEnJaqueParam) {
        const casillaReyEl = contenedorTablero.querySelector(`[data-posicion="${posicionRey}"]`);
        if (casillaReyEl) {
            casillaReyEl.classList.add('en-jaque');
        }
    }
}

export function actualizarSeleccionCasillaUI(casillaElemento) {
    if (!contenedorTablero) return;
    contenedorTablero.querySelectorAll('.casilla.seleccionada').forEach(c => c.classList.remove('seleccionada'));
    if (casillaElemento) {
        casillaElemento.classList.add('seleccionada');
    }
}

// Configuración de listeners para botones que son parte de la UI general
export function configurarListenersBotonesTiempoUI(callbackConfirmarTiempo) {
    const btnTiempo1Min = document.getElementById('btn_tiempo_1_min');
    const btnTiempo5Min = document.getElementById('btn_tiempo_5_min');

    if (btnTiempo1Min) btnTiempo1Min.addEventListener('click', () => callbackConfirmarTiempo(60));
    if (btnTiempo5Min) btnTiempo5Min.addEventListener('click', () => callbackConfirmarTiempo(300));
}

export function ocultarSeleccionTiempoUI() {
    if (divConfiguracionTiempo) divConfiguracionTiempo.style.display = 'none';
}

export function configurarListenerDescargaUI(callbackDescarga) {
    if (btnDescargarMovimientos) {
        btnDescargarMovimientos.addEventListener('click', callbackDescarga);
    }
}

export function actualizarEstadoBotonDescargaUI(historialLleno) {
    if (btnDescargarMovimientos) {
        btnDescargarMovimientos.disabled = !historialLleno;
    }
}

export function deshabilitarCheckboxReglaJaqueUI(deshabilitar) {
    const checkbox = document.getElementById('checkbox_regla_jaque');
    if (checkbox) checkbox.disabled = deshabilitar;
}

export function inicializarEstadoBotonesUI(historialMovimientosArrayIsEmpty) {
    if (btnDescargarMovimientos) btnDescargarMovimientos.disabled = historialMovimientosArrayIsEmpty;
    const checkbox = document.getElementById('checkbox_regla_jaque');
    if (checkbox) checkbox.disabled = false; // Habilitado al inicio
}
