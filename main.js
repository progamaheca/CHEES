// main.js
// Punto de entrada principal de la aplicación.
console.log("main.js cargado como módulo.");

// --- Importaciones ---
import { reglaJaqueHabilitada, checkboxReglaJaque } from './config.js';
import { posicionACoordenadas, coordenadasAPosicion } from './util.js';
import {
    piezas as arrayDePiezasGlobal,
    generarTablero as generarTableroVisual,
    inicializarPiezasEnTableroDOM,
    getPiezaEnCasilla as obtenerPiezaDeCasillaDesdeModuloTablero,
    contenedorTablero
} from './tablero.js';
import {
    esMovimientoValidoPeon, esMovimientoValidoTorre, esMovimientoValidoCaballo,
    esMovimientoValidoAlfil, esMovimientoValidoReina, esMovimientoValidoRey,
    encontrarPosicionRey, estaEnJaque, getMovimientosLegalesParaPieza,
    esJaqueMate, esEmpate,
    formatearNotacionMovimiento // Asegurarse que esta es la importada
} from './movimientos_validaciones.js';
import * as ui from './ui.js';
import { elegirMovimientoIA } from './ia.js'; // Nueva importación para la IA

// --- Estado Principal del Juego ---
let turnoActual = 'blanco';
let piezaSeleccionada = null;
let juegoIniciado = false;
let historialMovimientos = [];
let numeroDeMovimientoActual = 1;

let tiempoSeleccionado = 60;
let tiempoRestanteBlancas = tiempoSeleccionado;
let tiempoRestanteNegras = tiempoSeleccionado;
let intervaloTemporizador = null;

// --- Funciones de Lógica de Juego / Control de Flujo ---
// Modificado: Solo actualiza turnoActual y UI.
function cambiarTurno() {
    turnoActual = (turnoActual === 'blanco' ? 'negro' : 'blanco');
    ui.actualizarIndicadorTurnoUI(turnoActual);
}

function deshabilitarMovimientoPiezas() {
    juegoIniciado = false;
    ui.deshabilitarCheckboxReglaJaqueUI(true);
}

function tickTemporizador(){
    if(turnoActual==='blanco'){tiempoRestanteBlancas--;if(tiempoRestanteBlancas<0)tiempoRestanteBlancas=0;}
    else{tiempoRestanteNegras--;if(tiempoRestanteNegras<0)tiempoRestanteNegras=0;}
    ui.actualizarVisualizacionTiemposIndividualesUI(tiempoRestanteBlancas, tiempoRestanteNegras, tiempoSeleccionado);
    const tA=(turnoActual==='blanco'&&tiempoRestanteBlancas<=0)||(turnoActual==='negro'&&tiempoRestanteNegras<=0);
    if(tA){
        clearInterval(intervaloTemporizador);
        const perdedor = turnoActual;
        const ganador = (perdedor === 'blanco' ? 'Negras' : 'Blancas');
        ui.mostrarMensajeTemporalUI(`¡Tiempo agotado! Jugador ${perdedor} pierde. Gana Jugador ${ganador}.`, 60000, 'info');
        deshabilitarMovimientoPiezas();
    }
}

function iniciarOReanudarTemporizadorJugador(){
    clearInterval(intervaloTemporizador);
    ui.actualizarVisualizacionTiemposIndividualesUI(tiempoRestanteBlancas, tiempoRestanteNegras, tiempoSeleccionado);
    if (juegoIniciado) {
        intervaloTemporizador = setInterval(tickTemporizador,1000);
    }
}

function confirmarSeleccionTiempo(s){
    tiempoSeleccionado=s;tiempoRestanteBlancas=s;tiempoRestanteNegras=s;

    ui.ocultarSeleccionTiempoUI();
    ui.deshabilitarCheckboxReglaJaqueUI(false);
    ui.actualizarVisualizacionTiemposIndividualesUI(tiempoRestanteBlancas, tiempoRestanteNegras, tiempoSeleccionado);

    juegoIniciado = true;

    ui.limpiarTableroDeClasesJuegoUI();
    historialMovimientos = [];
    numeroDeMovimientoActual = 1;
    ui.actualizarDisplayHistorialMovimientosUI(historialMovimientos);
    ui.actualizarEstadoBotonDescargaUI(false);

    arrayDePiezasGlobal.forEach(p => {
        p.posicionActual = p.posicionOriginal;
        p.elementoPieza = null;
        if (p.tipo === 'rey' || p.tipo === 'torre') {
            p.haMovido = false;
        }
    });
    if (contenedorTablero) {
        inicializarPiezasEnTableroDOM();
    }
    turnoActual = 'blanco';
    ui.actualizarIndicadorTurnoUI(turnoActual);
    iniciarOReanudarTemporizadorJugador();
}


// --- Nueva Función para Procesar Movimientos (Humano o IA) ---
function procesarMovimiento(piezaMovidaObj, casillaOrigenStr, casillaDestinoStr, casillaOrigenEl, casillaDestinoEl, esEnroqueOverride = null) {
    // Actualizar estado 'haMovido' para Reyes y Torres
    if (piezaMovidaObj.tipo === 'rey' || piezaMovidaObj.tipo === 'torre') {
        piezaMovidaObj.haMovido = true;
    }

    ui.limpiarResaltadoMovimientosPosiblesUI();
    ui.aplicarResaltadoUltimoMovimientoUI(casillaOrigenEl, casillaDestinoEl);

    // Lógica de Captura de Pieza
    const pEnDestinoOriginal = obtenerPiezaDeCasillaDesdeModuloTablero(casillaDestinoStr); // Obtener antes de mover lógicamente
    if (pEnDestinoOriginal) {
        ui.actualizarPiezasCapturadasUI(piezaMovidaObj.color, pEnDestinoOriginal.simbolo);
        const pCapRealArrayObj = arrayDePiezasGlobal.find(p => p.id === pEnDestinoOriginal.id);
        if (pCapRealArrayObj) pCapRealArrayObj.posicionActual = null; // Marcar como capturada
        if (pEnDestinoOriginal.elementoPieza && pEnDestinoOriginal.elementoPieza.parentElement) {
            pEnDestinoOriginal.elementoPieza.remove();
        }
        pEnDestinoOriginal.elementoPieza = null; // Limpiar referencia
    }

    // --- Lógica de Enroque ---
    // 'esEnroqueOverride' se usará si se pasa (ej. desde IA que ya lo calculó)
    // Si no, se calcula aquí (ej. para movimiento humano)
    const esEnroque = esEnroqueOverride !== null ? esEnroqueOverride :
        (piezaMovidaObj.tipo === 'rey' && Math.abs(posicionACoordenadas(casillaDestinoStr).columna - posicionACoordenadas(casillaOrigenStr).columna) === 2 && reglaJaqueHabilitada);

    if (esEnroque) {
        let torre, torreNuevaPosStr, torreViejaPosStr;
        const filaReyChar = casillaOrigenStr[1];

        if (casillaDestinoStr[0] === 'g') { // Enroque corto
            torreViejaPosStr = `h${filaReyChar}`;
            torreNuevaPosStr = `f${filaReyChar}`;
        } else { // Enroque largo
            torreViejaPosStr = `a${filaReyChar}`;
            torreNuevaPosStr = `d${filaReyChar}`;
        }

        torre = arrayDePiezasGlobal.find(p => p.posicionActual === torreViejaPosStr && p.tipo === 'torre' && p.color === piezaMovidaObj.color);

        if (torre && torre.elementoPieza) {
            const casillaOrigenTorreEl = document.getElementById(torreViejaPosStr);
            const casillaDestinoTorreEl = document.getElementById(torreNuevaPosStr);

            if (casillaDestinoTorreEl) {
                casillaDestinoTorreEl.appendChild(torre.elementoPieza);
                casillaDestinoTorreEl.dataset.piezaId = torre.id;
            }
            if (casillaOrigenTorreEl) casillaOrigenTorreEl.removeAttribute('data-piezaId');

            torre.posicionActual = torreNuevaPosStr;
            torre.haMovido = true;
        } else {
            console.error("Error crítico en enroque: No se encontró la torre o su elemento DOM.", torreViejaPosStr, torre);
        }
    }
    // --- Fin Lógica de Enroque ---

    // Mover pieza principal en el DOM
    if (piezaMovidaObj.elementoPieza) {
        casillaDestinoEl.appendChild(piezaMovidaObj.elementoPieza);
    } else { // Fallback por si elementoPieza no está (debería estar)
        casillaDestinoEl.textContent = piezaMovidaObj.simbolo;
        console.warn("Pieza movida no tenía elementoPieza asociado:", piezaMovidaObj);
    }
    if (casillaOrigenEl) casillaOrigenEl.innerHTML = ''; // Limpiar casilla origen DOM
    casillaDestinoEl.dataset.piezaId = piezaMovidaObj.id;
    if (casillaOrigenEl) delete casillaOrigenEl.dataset.piezaId;


    // Actualizar estado lógico final de la pieza movida
    piezaMovidaObj.posicionActual = casillaDestinoStr;


    // --- Progresión del Juego y Cambio de Turno ---
    const jugadorQueRealizoMovimiento = turnoActual;
    const esCaptura = !!pEnDestinoOriginal; // True si pEnDestinoOriginal existía

    // Generar notación (usando la función importada)
    let notacionBaseDelMovimiento = formatearNotacionMovimiento(
        piezaMovidaObj,
        casillaOrigenStr,
        casillaDestinoStr,
        esCaptura,
        esEnroque ? (casillaDestinoStr[0] === 'g' ? 'O-O' : 'O-O-O') : ""
    );

    let sufijoParaNotacion = "";
    let finDelJuego = false;
    let mensajeFinJuego = "";

    if (!reglaJaqueHabilitada && pEnDestinoOriginal && pEnDestinoOriginal.tipo === 'rey') {
        finDelJuego = true;
        mensajeFinJuego = `¡Jugador ${jugadorQueRealizoMovimiento === 'blanco' ? 'Blanco' : 'Negro'} gana capturando al rey!`;
    }

    if (!finDelJuego) {
        cambiarTurno();
        ui.actualizarResaltadoCasillaJaqueUI(null, false);

        if (reglaJaqueHabilitada) {
            const reyDelOponentePos = encontrarPosicionRey(turnoActual);
            if (esJaqueMate(turnoActual)) {
                finDelJuego = true;
                mensajeFinJuego = `¡JAQUE MATE! Gana el jugador ${jugadorQueRealizoMovimiento}.`;
                sufijoParaNotacion = "#";
                if (reyDelOponentePos) ui.actualizarResaltadoCasillaJaqueUI(reyDelOponentePos, true);
            } else if (estaEnJaque(turnoActual)) {
                if (reyDelOponentePos) ui.actualizarResaltadoCasillaJaqueUI(reyDelOponentePos, true);
                sufijoParaNotacion = "+";
                ui.mostrarMensajeTemporalUI(`¡Jaque al rey ${turnoActual}!`, 3000, 'info');
            }
        }
        if (!finDelJuego && esEmpate(turnoActual)) {
            finDelJuego = true;
            mensajeFinJuego = "¡EMPATE (Ahogado)! La partida termina en tablas.";
        }
    }

    const notacionFinalDelMovimiento = notacionBaseDelMovimiento + sufijoParaNotacion;

    if (jugadorQueRealizoMovimiento === 'blanco') {
        historialMovimientos.push({ numero: numeroDeMovimientoActual, blancas: notacionFinalDelMovimiento, negras: "" });
    } else {
        if (historialMovimientos.length > 0 && historialMovimientos[historialMovimientos.length - 1].negras === "") {
            historialMovimientos[historialMovimientos.length - 1].negras = notacionFinalDelMovimiento;
        } else {
             historialMovimientos.push({ numero: numeroDeMovimientoActual, blancas: "...", negras: notacionFinalDelMovimiento });
        }
        if (!finDelJuego) {
             numeroDeMovimientoActual++;
        }
    }
    ui.actualizarDisplayHistorialMovimientosUI(historialMovimientos);
    ui.actualizarEstadoBotonDescargaUI(historialMovimientos.length > 0);


    if (finDelJuego) {
        ui.mostrarMensajeTemporalUI(mensajeFinJuego, 60000, 'info');
        deshabilitarMovimientoPiezas();
        clearInterval(intervaloTemporizador);
    } else {
        iniciarOReanudarTemporizadorJugador();
    }
}


// --- Función para que la IA juegue su turno ---
async function dispararTurnoIA() {
    if (!juegoIniciado || turnoActual !== 'negro') { // Asumimos que la IA es 'negro'
        return;
    }

    ui.mostrarMensajeTemporalUI("IA está pensando...", 1000, "info");
    await new Promise(resolve => setTimeout(resolve, 750)); // Simular pensamiento

    const movimientoIA = elegirMovimientoIA(turnoActual, arrayDePiezasGlobal);

    if (!juegoIniciado) return; // Comprobar de nuevo por si el juego terminó durante la pausa

    if (movimientoIA) {
        const piezaIA = arrayDePiezasGlobal.find(p => p.id === movimientoIA.piezaId);
        const origenIAEl = document.getElementById(movimientoIA.casillaOrigen);
        const destinoIAEl = document.getElementById(movimientoIA.casillaDestino);

        if (piezaIA && origenIAEl && destinoIAEl) {
            const esEnroqueIA = (
                piezaIA.tipo === 'rey' &&
                Math.abs(posicionACoordenadas(movimientoIA.casillaDestino).columna - posicionACoordenadas(movimientoIA.casillaOrigen).columna) === 2 &&
                reglaJaqueHabilitada
            );

            console.log(`IA procesando movimiento: ${piezaIA.id} de ${movimientoIA.casillaOrigen} a ${movimientoIA.casillaDestino}`);
            procesarMovimiento(piezaIA, movimientoIA.casillaOrigen, movimientoIA.casillaDestino, origenIAEl, destinoIAEl, esEnroqueIA);

            ui.actualizarSeleccionCasillaUI(null); // Resetear selección global
            piezaSeleccionada = null;
        } else {
            console.error("Error en datos del movimiento de la IA o elementos DOM no encontrados:", movimientoIA, piezaIA, origenIAEl, destinoIAEl);
            // Considerar qué hacer si la IA da un movimiento malo o el DOM no está sincronizado.
            // Tal vez forzar un final o un mensaje de error.
        }
    } else {
        // elegirMovimientoIA devolvió null. Esto significa que la IA no tiene movimientos legales.
        // La lógica en procesarMovimiento (del turno anterior del humano) ya debería haber detectado jaque mate o ahogado.
        // Si llegamos aquí y el juego está activo, es una condición inesperada.
        console.warn("IA no pudo encontrar un movimiento. El juego debería haber terminado en el turno anterior si esto es por Jaque Mate o Ahogado.");
        // No se hace nada más aquí, ya que el estado de fin de juego se maneja en procesarMovimiento.
    }
}

// --- Controlador Principal de Eventos Modificado ---
function manejarClickCasilla(casillaClickeadaEl) {
    if (!juegoIniciado || !casillaClickeadaEl ) {
        return;
    }
    if (turnoActual !== 'blanco') { // Solo permitir clicks del humano (blanco)
         if (juegoIniciado && turnoActual === 'negro') {
            ui.mostrarMensajeTemporalUI("Es el turno de la IA.", 1500, "info");
        }
        return;
    }


    const piezaIdEnCasillaClick = casillaClickeadaEl.dataset.piezaId;
    const piezaObjEnCasillaClick = piezaIdEnCasillaClick ? arrayDePiezasGlobal.find(p => p.id === piezaIdEnCasillaClick && p.posicionActual === casillaClickeadaEl.dataset.posicion) : null;

    if (!piezaSeleccionada) { // Primer click: seleccionar pieza
        ui.limpiarResaltadoMovimientosPosiblesUI();
        if (piezaObjEnCasillaClick) {
            if (piezaObjEnCasillaClick.color === turnoActual) { // Solo puede seleccionar sus propias piezas
                piezaSeleccionada = {casillaElemento:casillaClickeadaEl, piezaObjeto:piezaObjEnCasillaClick, posicionOriginalStr:casillaClickeadaEl.dataset.posicion};
                ui.actualizarSeleccionCasillaUI(casillaClickeadaEl);
                const movimientos = getMovimientosLegalesParaPieza(piezaSeleccionada.piezaObjeto, piezaSeleccionada.posicionOriginalStr);
                ui.resaltarMovimientosLegalesUI(movimientos);
            } else {
                ui.mostrarMensajeTemporalUI("No puedes seleccionar una pieza del oponente.", 2500, 'error');
                 piezaSeleccionada = null; // Asegurarse de que no quede nada seleccionado
                 ui.actualizarSeleccionCasillaUI(null);
            }
        } else { // Click en casilla vacía sin pieza seleccionada
            piezaSeleccionada = null;
            ui.actualizarSeleccionCasillaUI(null);
            ui.limpiarResaltadoMovimientosPosiblesUI();
        }
    } else { // Segundo click: mover o deseleccionar/cambiar selección
        const cOrigenEl = piezaSeleccionada.casillaElemento;
        const pMovidaObj = piezaSeleccionada.piezaObjeto;
        const cOrigenStr = piezaSeleccionada.posicionOriginalStr;
        const cDestinoStr = casillaClickeadaEl.dataset.posicion;

        if (cOrigenEl === casillaClickeadaEl) { // Click en la misma casilla: deseleccionar
            ui.limpiarResaltadoMovimientosPosiblesUI();
            ui.actualizarSeleccionCasillaUI(null);
            piezaSeleccionada = null;
            return;
        }

        // Click en otra pieza del mismo color: cambiar selección
        if (piezaObjEnCasillaClick && piezaObjEnCasillaClick.color === pMovidaObj.color) {
            ui.limpiarResaltadoMovimientosPosiblesUI();
            ui.actualizarSeleccionCasillaUI(casillaClickeadaEl); // Resaltar nueva selección
            piezaSeleccionada = {casillaElemento:casillaClickeadaEl, piezaObjeto:piezaObjEnCasillaClick, posicionOriginalStr:cDestinoStr};
            const movimientosNuevos = getMovimientosLegalesParaPieza(piezaSeleccionada.piezaObjeto, piezaSeleccionada.posicionOriginalStr);
            ui.resaltarMovimientosLegalesUI(movimientosNuevos);
            return;
        }

        // Usar getMovimientosLegalesParaPieza para validar el movimiento.
        // Esta función ya considera si el movimiento pondría al propio rey en jaque.
        const movimientosLegalesDisponibles = getMovimientosLegalesParaPieza(pMovidaObj, cOrigenStr);
        const esMovimientoLegalDirecto = movimientosLegalesDisponibles.includes(cDestinoStr);

        let movFinalValido = esMovimientoLegalDirecto;

        if (movFinalValido) {
            const esEnroqueHumano = (
                pMovidaObj.tipo === 'rey' &&
                Math.abs(posicionACoordenadas(cDestinoStr).columna - posicionACoordenadas(cOrigenStr).columna) === 2 &&
                reglaJaqueHabilitada // getMovimientosLegalesParaPieza ya se encarga de la validez del enroque
            );

            procesarMovimiento(pMovidaObj, cOrigenStr, cDestinoStr, cOrigenEl, casillaClickeadaEl, esEnroqueHumano);

            ui.actualizarSeleccionCasillaUI(null); // Resetear selección después de un movimiento válido
            piezaSeleccionada = null;

            // Si el juego sigue y es turno de la IA (negro)
            if (juegoIniciado && turnoActual === 'negro') {
                setTimeout(dispararTurnoIA, 500);
            }

        } else { // Movimiento inválido
            ui.mostrarMensajeTemporalUI("Movimiento inválido.", 2500, 'error');
            // Si el click fue en una casilla vacía no legal (y no era un cambio de pieza), deseleccionar.
            if (!piezaObjEnCasillaClick) {
                 ui.limpiarResaltadoMovimientosPosiblesUI();
                 ui.actualizarSeleccionCasillaUI(null);
                 piezaSeleccionada = null;
            }
            // Si fue en una pieza enemiga (no capturable), la selección actual se mantiene.
        }
    }
}

// La función local formatearNotacionMovimiento ha sido eliminada.
// Se utiliza la versión importada de './movimientos_validaciones.js'.


// --- Inicialización del Juego ---
function inicializarJuego() {
    console.log("main.js: Inicializando juego...");
    if (contenedorTablero) {
        generarTableroVisual(manejarClickCasilla); // Pasa la función de manejo de clicks al generador del tablero
        // inicializarPiezasEnTableroDOM(); // Se llama dentro de confirmarSeleccionTiempo.

        ui.actualizarIndicadorTurnoUI(turnoActual); // Mostrar turno inicial (blanco por defecto)
        ui.actualizarVisualizacionTiemposIndividualesUI(tiempoRestanteBlancas, tiempoRestanteNegras, tiempoSeleccionado);
        ui.actualizarDisplayHistorialMovimientosUI(historialMovimientos);
        ui.limpiarResaltadoUltimoMovimientoUI();
        deshabilitarMovimientoPiezas();
        ui.deshabilitarCheckboxReglaJaqueUI(false);

        ui.configurarListenersBotonesTiempoUI(confirmarSeleccionTiempo);
        ui.configurarListenerDescargaUI(descargarHistorial);
        ui.actualizarEstadoBotonDescargaUI(historialMovimientos.length > 0);

    } else {
        console.error("main.js: El contenedor del tablero (#contenedor_tablero) no fue encontrado en el DOM.");
    }
}

// Callback para el botón de descarga
function descargarHistorial() {
    if (historialMovimientos.length === 0) {
        ui.mostrarMensajeTemporalUI("No hay movimientos para descargar.", 2000, 'info');
        return;
    }
    const textoParaDescargar = ui.generarTextoHistorialUI(historialMovimientos, tiempoSeleccionado, reglaJaqueHabilitada);
    const fecha = new Date();
    const nombreArchivo = `partida_ajedrez_${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, '0')}${String(fecha.getDate()).padStart(2, '0')}_${String(fecha.getHours()).padStart(2,'0')}${String(fecha.getMinutes()).padStart(2,'0')}.txt`;
    ui.descargarArchivoTextoUI(nombreArchivo, textoParaDescargar);
}

document.addEventListener('DOMContentLoaded', inicializarJuego);
