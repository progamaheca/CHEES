// main.js
// Punto de entrada principal de la aplicación.
console.log("main.js cargado como módulo.");

// --- Importaciones ---
import { reglaJaqueHabilitada, checkboxReglaJaque } from './config.js';
import { posicionACoordenadas, coordenadasAPosicion } from './util.js'; // formatearTiempo es usado por ui.js
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
    formatearNotacionMovimiento // Importar la función movida
} from './movimientos_validaciones.js';
import * as ui from './ui.js';

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
    });
    if (contenedorTablero) {
        inicializarPiezasEnTableroDOM();
    }
    turnoActual = 'blanco';
    ui.actualizarIndicadorTurnoUI(turnoActual);
    iniciarOReanudarTemporizadorJugador();
}

// La función formatearNotacionMovimiento ha sido movida a movimientos_validaciones.js
// y se importa desde allí.

// --- Controlador Principal de Eventos (se moverá a logica_juego.js) ---
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
            // Usar la función importada formatearNotacionMovimiento
            let notacionBaseDelMovimiento = formatearNotacionMovimiento(pMovidaObj, cOrigenStr, cDestinoStr, esCaptura);
            let sufijoParaNotacion = "";

            if (!reglaJaqueHabilitada && pEnDestinoOriginal && pEnDestinoOriginal.tipo === 'rey') {
                finDelJuego = true;
                mensajeFinJuego = `¡Jugador ${jugadorQueRealizoMovimiento === 'blanco' ? 'Blanco' : 'Negro'} gana capturando al rey!`;
            }

            if (!finDelJuego) {
                cambiarTurno();
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
            if (piezaSeleccionada) {
                 ui.mostrarMensajeTemporalUI("Movimiento inválido.", 2500, 'error');
            }
        }
        if (movFinalValido) {
             ui.actualizarSeleccionCasillaUI(null);
             piezaSeleccionada = null;
        }
    }
}

// --- Callback para el botón de descarga ---
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

// --- Inicialización del Juego ---
function inicializarJuego() {
    console.log("main.js: Inicializando juego...");
    if (contenedorTablero) {
        generarTableroVisual(manejarClickCasilla);
        inicializarPiezasEnTableroDOM();

        ui.actualizarIndicadorTurnoUI(turnoActual);
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

document.addEventListener('DOMContentLoaded', inicializarJuego);
