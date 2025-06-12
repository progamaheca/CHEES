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
    esJaqueMate, esEmpate
} from './movimientos_validaciones.js';
import * as ui from './ui.js';

// --- Estado Principal del Juego (en main.js) ---
let turnoActual = 'blanco';
let piezaSeleccionada = null; // { casillaElemento, piezaObjeto, posicionOriginalStr }
let juegoIniciado = false;
let historialMovimientos = [];
let numeroDeMovimientoActual = 1;

let tiempoSeleccionado = 60;
let tiempoRestanteBlancas = tiempoSeleccionado;
let tiempoRestanteNegras = tiempoSeleccionado;
let intervaloTemporizador = null;

// --- Funciones de Lógica de Juego / Control de Flujo (en main.js) ---
function cambiarTurno() {
    turnoActual = (turnoActual === 'blanco' ? 'negro' : 'blanco');
    ui.actualizarIndicadorTurnoUI(turnoActual);
}

function deshabilitarMovimientoPiezas() {
    juegoIniciado = false;
    ui.deshabilitarCheckboxReglaJaqueUI(true);
}

function tickTemporizador() {
    if (turnoActual === 'blanco') {
        tiempoRestanteBlancas--;
        if (tiempoRestanteBlancas < 0) tiempoRestanteBlancas = 0;
    } else {
        tiempoRestanteNegras--;
        if (tiempoRestanteNegras < 0) tiempoRestanteNegras = 0;
    }
    ui.actualizarVisualizacionTiemposIndividualesUI(tiempoRestanteBlancas, tiempoRestanteNegras, tiempoSeleccionado);

    const tiempoAgotado = (turnoActual === 'blanco' && tiempoRestanteBlancas <= 0) ||
                         (turnoActual === 'negro' && tiempoRestanteNegras <= 0);

    if (tiempoAgotado) {
        clearInterval(intervaloTemporizador);
        const perdedor = turnoActual; // El jugador cuyo turno corría cuando se acabó el tiempo
        const ganador = (perdedor === 'blanco' ? 'Negras' : 'Blancas'); // El oponente gana
        ui.mostrarMensajeTemporalUI(`¡Tiempo agotado! Jugador ${perdedor} pierde. Gana Jugador ${ganador}.`, 60000, 'info');
        deshabilitarMovimientoPiezas();
    }
}

function iniciarOReanudarTemporizadorJugador() {
    clearInterval(intervaloTemporizador);
    // Pasar tiempoSeleccionado como fallback si los tiempos restantes son null (inicio de juego antes de confirmar tiempo)
    ui.actualizarVisualizacionTiemposIndividualesUI(tiempoRestanteBlancas, tiempoRestanteNegras, tiempoSeleccionado);
    if (juegoIniciado) {
        intervaloTemporizador = setInterval(tickTemporizador, 1000);
    }
}

function confirmarSeleccionTiempo(segundos) {
    tiempoSeleccionado = segundos;
    tiempoRestanteBlancas = tiempoSeleccionado;
    tiempoRestanteNegras = tiempoSeleccionado;

    ui.ocultarSeleccionTiempoUI();
    ui.actualizarVisualizacionTiemposIndividualesUI(tiempoRestanteBlancas, tiempoRestanteNegras, tiempoSeleccionado);

    juegoIniciado = true;
    ui.deshabilitarCheckboxReglaJaqueUI(false); // Habilitar el checkbox al inicio de una nueva partida

    ui.limpiarTableroDeClasesJuegoUI();
    // Reiniciar historial
    historialMovimientos = [];
    numeroDeMovimientoActual = 1;
    ui.actualizarDisplayHistorialMovimientosUI(historialMovimientos);
    ui.actualizarEstadoBotonDescargaUI(false); // El botón de descarga se deshabilita

    // Limpiar áreas de piezas capturadas (se necesitaría una función en ui.js para esto)
    // ui.limpiarPiezasCapturadasUI(); // Asumiendo que esta función existe en ui.js

    // Reinicializar piezas a sus posiciones originales
    arrayDePiezasGlobal.forEach(p => { // Usar el array importado
        p.posicionActual = p.posicionOriginal;
        p.elementoPieza = null;
    });
    if (contenedorTablero) {
        inicializarPiezasEnTableroDOM();
    }
    turnoActual = 'blanco';
    ui.actualizarIndicadorTurnoUI(turnoActual);
    iniciarOReanudarTemporizadorJugador();
}

// --- Controlador Principal de Eventos ---
function manejarClickCasilla(casillaClickeadaEl) {
    if (!juegoIniciado || !casillaClickeadaEl) return;

    const piezaIdEnCasillaClick = casillaClickeadaEl.dataset.piezaId;
    const piezaObjEnCasillaClick = piezaIdEnCasillaClick ? arrayDePiezasGlobal.find(p => p.id === piezaIdEnCasillaClick && p.posicionActual === casillaClickeadaEl.dataset.posicion) : null;

    if (!piezaSeleccionada) {
        ui.limpiarResaltadoMovimientosPosiblesUI();
        if (piezaObjEnCasillaClick) {
            if (piezaObjEnCasillaClick.color === turnoActual) {
                piezaSeleccionada = {casillaElemento:casillaClickeadaEl, piezaObjeto:piezaObjEnCasillaClick, posicionOriginalStr:casillaClickeadaEl.dataset.posicion};
                ui.actualizarSeleccionCasillaUI(casillaClickeadaEl);
                const movimientos = getMovimientosLegalesParaPieza(piezaSeleccionada.piezaObjeto, piezaSeleccionada.posicionOriginalStr);
                ui.resaltarMovimientosLegalesUI(movimientos);
            } else {
                ui.mostrarMensajeTemporalUI("No puedes mover una pieza del oponente.", 2500, 'error');
            }
        }
    } else {
        const cOrigenEl = piezaSeleccionada.casillaElemento;
        const pMovidaObj = piezaSeleccionada.piezaObjeto;
        const cOrigenStr = piezaSeleccionada.posicionOriginalStr;
        const cDestinoStr = casillaClickeadaEl.dataset.posicion;

        if (cOrigenEl === casillaClickeadaEl) {
            ui.limpiarResaltadoMovimientosPosiblesUI();
            ui.actualizarSeleccionCasillaUI(null);
            piezaSeleccionada = null;
            return;
        }

        if (piezaObjEnCasillaClick && piezaObjEnCasillaClick.color === pMovidaObj.color) {
            ui.limpiarResaltadoMovimientosPosiblesUI();
            ui.actualizarSeleccionCasillaUI(casillaClickeadaEl);
            piezaSeleccionada = {casillaElemento:casillaClickeadaEl, piezaObjeto:piezaObjEnCasillaClick, posicionOriginalStr:cDestinoStr};
            const movimientosNuevos = getMovimientosLegalesParaPieza(piezaSeleccionada.piezaObjeto, piezaSeleccionada.posicionOriginalStr);
            ui.resaltarMovimientosLegalesUI(movimientosNuevos);
            return;
        }

        let movValidoBase = false;
        if(pMovidaObj.tipo==='peon')movValidoBase=esMovimientoValidoPeon(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='torre')movValidoBase=esMovimientoValidoTorre(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='caballo')movValidoBase=esMovimientoValidoCaballo(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='alfil')movValidoBase=esMovimientoValidoAlfil(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='reina')movValidoBase=esMovimientoValidoReina(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='rey')movValidoBase=esMovimientoValidoRey(pMovidaObj,cOrigenStr,cDestinoStr);

        let movFinalValido = movValidoBase;
        const pEnDestinoOriginal = obtenerPiezaDeCasillaDesdeModuloTablero(cDestinoStr);

        if (movValidoBase && reglaJaqueHabilitada) {
            const colorJugadorActual = pMovidaObj.color;
            pMovidaObj.posicionActual = cDestinoStr;
            let idPiezaCapturadaSim = null;
            if(pEnDestinoOriginal){ const pCapSimArrayObj=arrayDePiezasGlobal.find(p=>p.id===pEnDestinoOriginal.id); if(pCapSimArrayObj){idPiezaCapturadaSim=pCapSimArrayObj.id;pCapSimArrayObj.posicionActual=null;} }
            if(estaEnJaque(colorJugadorActual)){movFinalValido=false;}
            pMovidaObj.posicionActual = cOrigenStr;
            if(idPiezaCapturadaSim){ const pRestSimArrayObj=arrayDePiezasGlobal.find(p=>p.id===idPiezaCapturadaSim); if(pRestSimArrayObj){pRestSimArrayObj.posicionActual=cDestinoStr;} }
        }

        if (movFinalValido) {
            ui.limpiarResaltadoMovimientosPosiblesUI();
            ui.aplicarResaltadoUltimoMovimientoUI(cOrigenEl, casillaClickeadaEl);

            if (pEnDestinoOriginal) {
                ui.actualizarPiezasCapturadasUI(pMovidaObj.color, pEnDestinoOriginal.simbolo);
                const pCapRealArrayObj=arrayDePiezasGlobal.find(p=>p.id===pEnDestinoOriginal.id);
                if(pCapRealArrayObj) pCapRealArrayObj.posicionActual=null;
            }

            if (pMovidaObj.elementoPieza) {
                 casillaClickeadaEl.appendChild(pMovidaObj.elementoPieza);
            } else {
                 casillaClickeadaEl.textContent = pMovidaObj.simbolo;
            }
            cOrigenEl.innerHTML = '';
            casillaClickeadaEl.dataset.piezaId = pMovidaObj.id;
            delete cOrigenEl.dataset.piezaId;
            pMovidaObj.posicionActual = cDestinoStr;

            let finDelJuego = false;
            let mensajeFinJuego = "";
            const jugadorQueRealizoMovimiento = turnoActual;
            const esCaptura = !!pEnDestinoOriginal;
            // formatearNotacionMovimiento aún es local en main.js
            let notacionBaseDelMovimiento = formatearNotacionMovimiento(pMovidaObj, cOrigenStr, cDestinoStr, esCaptura);
            let sufijoParaNotacion = "";

            if (!reglaJaqueHabilitada && pEnDestinoOriginal && pEnDestinoOriginal.tipo === 'rey') {
                finDelJuego = true;
                mensajeFinJuego = `¡Jugador ${jugadorQueRealizoMovimiento === 'blanco' ? 'Blanco' : 'Negro'} gana capturando al rey!`;
            }

            if (!finDelJuego) {
                // Cambiar turno ANTES de evaluar jaque/mate sobre el oponente
                cambiarTurno(); // Esto llama a ui.actualizarIndicadorTurnoUI internamente
                ui.actualizarResaltadoCasillaJaqueUI(null, false);

                if (reglaJaqueHabilitada) {
                    if (esJaqueMate(turnoActual)) {
                        finDelJuego = true;
                        mensajeFinJuego = `¡JAQUE MATE! Gana el jugador ${jugadorQueRealizoMovimiento}.`;
                        sufijoParaNotacion = "#";
                        ui.actualizarResaltadoCasillaJaqueUI(encontrarPosicionRey(turnoActual), true);
                    } else if (estaEnJaque(turnoActual)) {
                        ui.actualizarResaltadoCasillaJaqueUI(encontrarPosicionRey(turnoActual), true);
                        sufijoParaNotacion = "+";
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
                if (historialMovimientos.length > 0) {
                    historialMovimientos[historialMovimientos.length - 1].negras = notacionFinalDelMovimiento;
                } else {
                     historialMovimientos.push({ numero: numeroDeMovimientoActual, blancas: "", negras: notacionFinalDelMovimiento });
                }
                if (!finDelJuego || (finDelJuego && jugadorQueRealizoMovimiento === 'negro')) {
                     numeroDeMovimientoActual++;
                }
            }
            ui.actualizarDisplayHistorialMovimientosUI(historialMovimientos);
            // ui.actualizarIndicadorTurnoUI(turnoActual); // Ya se llama dentro de cambiarTurno()

            if(finDelJuego){
                ui.mostrarMensajeTemporalUI(mensajeFinJuego, 60000, 'info');
                deshabilitarMovimientoPiezas();
                clearInterval(intervaloTemporizador);
            } else {
                if (reglaJaqueHabilitada && sufijoParaNotacion === "+") {
                     ui.mostrarMensajeTemporalUI(`¡Jaque al rey ${turnoActual}!`, 3000, 'info');
                }
                iniciarOReanudarTemporizadorJugador();
            }
        } else {
            if (piezaSeleccionada) { // Solo mostrar mensaje si el jugador intentó un movimiento inválido
                 ui.mostrarMensajeTemporalUI("Movimiento inválido.", 2500, 'error');
            }
        }
        if (movFinalValido) {
             ui.actualizarSeleccionCasillaUI(null);
             piezaSeleccionada = null;
        }
    }
}

// formatearNotacionMovimiento se moverá a logica_juego.js
function formatearNotacionMovimiento(pieza, casillaOrigenStr, casillaDestinoStr, esCaptura, sufijoNotacion = "") {
    let notacion = "";
    const mapTipoALetra = { 'torre':'T', 'caballo':'C', 'alfil':'A', 'reina':'D', 'rey':'R' };
    if (pieza.tipo !== 'peon') { notacion += mapTipoALetra[pieza.tipo] || ''; }
    if (esCaptura) { if (pieza.tipo === 'peon' && casillaOrigenStr) { notacion += casillaOrigenStr.charAt(0); } notacion += "x"; }
    notacion += casillaDestinoStr;
    notacion += sufijoNotacion;
    return notacion;
}


// --- Inicialización del Juego ---
function inicializarJuego() {
    if (contenedorTablero) {
        generarTableroVisual(manejarClickCasilla);
        inicializarPiezasEnTableroDOM();

        ui.actualizarIndicadorTurnoUI(turnoActual);
        ui.actualizarVisualizacionTiemposIndividualesUI(tiempoRestanteBlancas, tiempoRestanteNegras, tiempoSeleccionado);
        ui.actualizarDisplayHistorialMovimientosUI(historialMovimientos);
        ui.limpiarResaltadoUltimoMovimientoUI();
        deshabilitarMovimientoPiezas();
        ui.deshabilitarCheckboxReglaJaqueUI(false); // Asegurar que esté habilitado al inicio

        ui.configurarListenersBotonesTiempoUI(confirmarSeleccionTiempo);
        ui.configurarListenerDescargaUI(() => {
            if(historialMovimientos.length === 0){ ui.mostrarMensajeTemporalUI("No hay movimientos para descargar.", 2000, 'info'); return;}
            const txt=ui.generarTextoHistorialUI(historialMovimientos, tiempoSeleccionado, reglaJaqueHabilitada);
            const f=new Date();
            const nomArch=`partida_ajedrez_${f.getFullYear()}${String(f.getMonth()+1).padStart(2,'0')}${String(f.getDate()).padStart(2,'0')}_${String(f.getHours()).padStart(2,'0')}${String(f.getMinutes()).padStart(2,'0')}.txt`;
            ui.descargarArchivoTextoUI(nomArch,txt);
        });
        ui.actualizarEstadoBotonDescargaUI(historialMovimientos.length > 0);

    } else {
        console.error("El contenedor del tablero (#contenedor_tablero) no fue encontrado en el DOM (desde main.js).");
    }
}

document.addEventListener('DOMContentLoaded', inicializarJuego);
