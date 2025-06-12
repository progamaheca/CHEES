// main.js (adaptado para multijugador online)
console.log("main.js cargado para online.");

// --- Importaciones ---
import { reglaJaqueHabilitada as reglaJaqueLocal, checkboxReglaJaque } from './config.js'; // reglaJaqueLocal puede quedar obsoleta
import { posicionACoordenadas, coordenadasAPosicion } from './util.js';
import {
    // piezasBaseOriginales, // No se usa directamente para el estado, pero sí para referencia si es necesario.
    getPiezaBasePorId, // Para obtener símbolo/color original si el servidor solo manda IDs.
    generarTableroVisual,
    dibujarTableroYPiezas, // Nueva función para dibujar desde el estado del servidor
    contenedorTablero
} from './tablero.js';
// Las validaciones de movimiento y lógica de jaque/mate ahora están en el servidor.
// import { ... } from './movimientos_validaciones.js'; // Ya no se usan directamente en el cliente para validar.
import * as ui from './ui.js';

// --- Estado del Cliente para Online ---
// Temporizadores locales eliminados, ahora manejados por el servidor
let ws = null; // WebSocket connection
let currentRoomCode = null;
let playerColor = null; // 'blanco' o 'negro', asignado por el servidor
let currentGameState = null; // Recibido del servidor { piezas: [], turnoActual: '', historialMovimientos: [], ... }
let piezaSeleccionadaLocal = null; // {casillaElemento: DOMEl, piezaObjeto: {id, color, simbolo, ...}, posicionOriginalStr: 'e2'}
                                // piezaObjeto aquí será una copia de la info de currentGameState.piezas
let juegoIniciado = false; // Se vuelve true cuando el servidor envía 'gameStart'

// --- Conexión WebSocket ---
// const tiempoSeleccionado = 60; // Segundos, ya no se usa localmente
// let tiempoRestanteBlancasLocal = tiempoSeleccionado; // Ya no se usa localmente
// let tiempoRestanteNegrasLocal = tiempoSeleccionado; // Ya no se usa localmente
// let intervaloTemporizador = null; // Ya no se usa localmente

const SERVER_URL = `ws://${window.location.host.split(':')[0]}:3000`; // Asume server en mismo host, puerto 3000
                                                                    // En producción, esto sería `wss://${window.location.host}` si el server está detrás de un proxy
console.log(`Intentando conectar a: ${SERVER_URL}`);

function conectarWebSocket() {
    ws = new WebSocket(SERVER_URL);

    ws.onopen = () => {
        console.log("Conectado al servidor WebSocket.");
        // Aquí se podría habilitar la UI para crear/unirse a salas
        document.getElementById('estado_conexion_servidor').textContent = 'Conectado al servidor.'; \n        document.getElementById('estado_conexion_servidor').style.color = 'green'; \n        document.getElementById('btn_crear_sala_online').disabled = false; \n        document.getElementById('btn_unirse_sala_online').disabled = false; \n        document.getElementById('input_codigo_sala_online').disabled = false;
        // Simulación de botones de sala (estos deberían ser elementos HTML reales)
        document.getElementById('btn_crear_sala_online').disabled = false;
        document.getElementById('btn_unirse_sala_online').disabled = false;
    };

    ws.onmessage = (event) => {
        const serverMessage = JSON.parse(event.data);
        console.log("Mensaje del servidor:", serverMessage);

        switch (serverMessage.type) {
            case 'roomCreated':
                currentRoomCode = serverMessage.roomCode;
                playerColor = serverMessage.playerColor;
                // TODO: Actualizar UI real aquí
                document.getElementById('info_sala_creada').textContent = `Código de Sala: ${currentRoomCode}. Eres ${playerColor}.`; \n                document.getElementById('mensajes_estado_online').textContent = 'Esperando oponente...';
                ui.mostrarMensajeTemporalUI(`Sala ${currentRoomCode} creada. Eres ${playerColor}. Esperando...`, 5000, "info");
                break;

            case 'joinedRoom':
                currentRoomCode = serverMessage.roomCode;
                playerColor = serverMessage.playerColor;
                 document.getElementById('mensajes_estado_online').textContent = `Te uniste a la sala ${currentRoomCode}. Eres ${playerColor}.`;
                if (serverMessage.opponentConnected) {
                     document.getElementById('mensajes_estado_online').textContent += ' Oponente conectado.';
                }
                // Si el juego no empieza inmediatamente, esperar mensaje 'gameStart'
                break;

            case 'opponentJoined':
                // TODO: Actualizar UI
                 document.getElementById('mensajes_estado_online').textContent = `Oponente (${serverMessage.opponentColor}) se ha unido. ¡Listos para empezar!`;
                ui.mostrarMensajeTemporalUI("Oponente conectado.", 3000, "info");
                // El juego debería empezar pronto con 'gameStart'
                break;

            case 'gameStart':
                currentGameState = serverMessage.gameState;
                playerColor = serverMessage.playerColor; // Confirmar/actualizar color del jugador
                juegoIniciado = true;
                console.log("¡Juego iniciado!", currentGameState);
                ui.ocultarSeleccionTiempoUI(); // Ocultar config de tiempo local si estaba visible
                document.getElementById('configuracion_reglas').style.display = 'none'; \n                const controlesOnlineEl = document.getElementById('controles_online_juego'); \n                if (controlesOnlineEl) controlesOnlineEl.style.display = 'none'; // Ocultar config de reglas local
                document.getElementById('controles_juego_inicial').style.display = 'none'; // Ocultar controles de sala

                dibujarTableroYPiezas(currentGameState.piezas);
                ui.actualizarIndicadorTurnoUI(currentGameState.turnoActual);
                ui.actualizarVisualizacionTiemposIndividualesUI(currentGameState.tiempoRestanteBlancas, currentGameState.tiempoRestanteNegras, currentGameState.tiempoPorJugador);
                ui.actualizarIndicadorTurnoUI(currentGameState.turnoActual); // Asegurar que el reloj activo se actualice
                ui.actualizarDisplayHistorialMovimientosUI(currentGameState.historialMovimientos);
                // Actualizar piezas capturadas (ui.js necesita adaptación o una nueva función)
                actualizarDisplayPiezasCapturadasCompleto(currentGameState.piezasCapturadasPorBlancas, currentGameState.piezasCapturadasPorNegras);
                ui.limpiarTableroDeClasesJuegoUI();
                if(currentGameState.estadoMeta && currentGameState.estadoMeta.startsWith('JAQUE_')) {
                    const reyEnJaqueColor = currentGameState.estadoMeta.split('_')[1].toLowerCase();
                    const posRey = encontrarPosicionReyCliente(currentGameState.piezas, reyEnJaqueColor);
                    ui.actualizarResaltadoCasillaJaqueUI(posRey, true);
                    ui.mostrarMensajeTemporalUI(`¡Jaque al rey ${reyEnJaqueColor}!`, 3000, "info");
                }
                break;

            case 'gameStateUpdate':
                const oldTurno = currentGameState ? currentGameState.turnoActual : null;
                currentGameState = serverMessage.gameState;
                console.log("Actualización de estado recibida:", currentGameState);

                dibujarTableroYPiezas(currentGameState.piezas);
                if (currentGameState.ultimoMovimiento) {
                    const origenEl = document.getElementById(currentGameState.ultimoMovimiento.origen);
                    const destinoEl = document.getElementById(currentGameState.ultimoMovimiento.destino);
                    if (origenEl && destinoEl) {
                        ui.aplicarResaltadoUltimoMovimientoUI(origenEl, destinoEl);
                    }
                }
                ui.actualizarIndicadorTurnoUI(currentGameState.turnoActual);
                ui.actualizarVisualizacionTiemposIndividualesUI(currentGameState.tiempoRestanteBlancas, currentGameState.tiempoRestanteNegras, currentGameState.tiempoPorJugador);
                ui.actualizarIndicadorTurnoUI(currentGameState.turnoActual); // Asegurar que el reloj activo se actualice
                ui.actualizarDisplayHistorialMovimientosUI(currentGameState.historialMovimientos);
                actualizarDisplayPiezasCapturadasCompleto(currentGameState.piezasCapturadasPorBlancas, currentGameState.piezasCapturadasPorNegras);

                // Manejo de mensajes de jaque, mate, ahogado
                ui.actualizarResaltadoCasillaJaqueUI(null, false); // Limpiar jaque anterior
                if (currentGameState.estadoMeta) {
                    if (currentGameState.estadoMeta.startsWith('JAQUE_')) {
                        const reyEnJaqueColor = currentGameState.estadoMeta.split('_')[1].toLowerCase();
                        const posRey = encontrarPosicionReyCliente(currentGameState.piezas, reyEnJaqueColor);
                        ui.actualizarResaltadoCasillaJaqueUI(posRey, true);
                        if (oldTurno !== currentGameState.turnoActual) { // Solo mostrar si es un nuevo jaque por un movimiento
                           ui.mostrarMensajeTemporalUI(`¡Jaque al rey ${reyEnJaqueColor}! (Notación: ${serverMessage.notacionUltimoMovimiento})`, 3000, "info");
                        }
                    } else if (currentGameState.estadoMeta.startsWith('JAQUEMATE_')) {
                        const perdedor = currentGameState.estadoMeta.split('_')[1].toLowerCase();
                        const ganador = perdedor === 'blanco' ? 'Negro' : 'Blanco';
                        ui.mostrarMensajeTemporalUI(`¡JAQUE MATE! Gana ${ganador}. (Notación: ${serverMessage.notacionUltimoMovimiento})`, 60000, "info");
                        deshabilitarMovimientoPiezasLocal(); // Juego terminado
                    } else if (currentGameState.estadoMeta.startsWith('TIMEOUT_')) {
                        const perdedorPorTiempo = currentGameState.estadoMeta.split('_')[1].toLowerCase();
                        const ganadorPorTiempo = perdedorPorTiempo === 'blanco' ? 'Negro' : 'Blanco';
                        ui.mostrarMensajeTemporalUI(`¡TIEMPO AGOTADO! Jugador ${perdedorPorTiempo} pierde. Gana Jugador ${ganadorPorTiempo}. (Notación: ${serverMessage.notacionUltimoMovimiento || ''})`, 60000, "info");
                        deshabilitarMovimientoPiezasLocal();
                    } else if (currentGameState.estadoMeta.startsWith('AHOGADO_')) {
                        ui.mostrarMensajeTemporalUI(`¡EMPATE POR AHOGADO! (Notación: ${serverMessage.notacionUltimoMovimiento})`, 60000, "info");
                        deshabilitarMovimientoPiezasLocal(); // Juego terminado
                    }
                }
                break;

            case 'error':
                console.error("Error del servidor:", serverMessage.message);
                ui.mostrarMensajeTemporalUI(`Error: ${serverMessage.message}`, 3000, "error");
                break;

            case 'opponentLeft':
                ui.mostrarMensajeTemporalUI(serverMessage.message, 5000, "info");
                deshabilitarMovimientoPiezasLocal(); // Juego terminado o pausado
                // TODO: Ofrecer opción de reclamar victoria o esperar.
                break;

            default:
                console.warn("Tipo de mensaje desconocido del servidor:", serverMessage.type);
        }
    };

    ws.onclose = () => {
        console.log("Desconectado del servidor WebSocket.");
        document.getElementById('estado_conexion_servidor').textContent = 'Desconectado. Intenta recargar.'; \n        document.getElementById('estado_conexion_servidor').style.color = 'red'; \n        document.getElementById('btn_crear_sala_online').disabled = true; \n        document.getElementById('btn_unirse_sala_online').disabled = true; \n        document.getElementById('input_codigo_sala_online').disabled = true;
        juegoIniciado = false;
        // TODO: Deshabilitar UI de juego, mostrar UI de conexión
        document.getElementById('btn_crear_sala_online').disabled = true;
        document.getElementById('btn_unirse_sala_online').disabled = true;
    };

    ws.onerror = (error) => {
        console.error("Error de WebSocket:", error);
        ui.mostrarMensajeTemporalUI("Error de conexión WebSocket.", 3000, "error");
    };
}

// --- Lógica de Interacción del Cliente ---
function manejarClickCasilla(casillaClickeadaEl) {
    if (!juegoIniciado || !currentGameState || currentGameState.turnoActual !== playerColor) {
        if(juegoIniciado && currentGameState.turnoActual !== playerColor) {
            ui.mostrarMensajeTemporalUI("No es tu turno.", 1500, "error");
        }
        return;
    }

    const piezaIdEnCasillaClick = casillaClickeadaEl.dataset.piezaId;
    // Encontrar la pieza en nuestro estado local (currentGameState.piezas)
    const piezaObjEnCasillaClick = piezaIdEnCasillaClick ? currentGameState.piezas.find(p => p.id === piezaIdEnCasillaClick && p.posicionActual === casillaClickeadaEl.dataset.posicion) : null;

    if (!piezaSeleccionadaLocal) { // Si no hay pieza seleccionada actualmente
        ui.limpiarResaltadoMovimientosPosiblesUI(); // Limpiar resaltados anteriores (si los hubiera)
        if (piezaObjEnCasillaClick) {
            if (piezaObjEnCasillaClick.color === playerColor) { // Es una pieza del jugador actual
                piezaSeleccionadaLocal = {
                    casillaElemento: casillaClickeadaEl,
                    piezaObjeto: { ...piezaObjEnCasillaClick }, // Copia para evitar mutación accidental
                    posicionOriginalStr: casillaClickeadaEl.dataset.posicion
                };
                ui.actualizarSeleccionCasillaUI(casillaClickeadaEl);
                // TODO Opcional: Pedir al servidor los movimientos legales para esta pieza y resaltarlos.
                // Por ahora, no se resaltan movimientos posibles para simplificar.
            } else {
                ui.mostrarMensajeTemporalUI("No puedes mover una pieza del oponente.", 2500, "error");
            }
        }
    } else { // Ya hay una pieza seleccionada, este click es para mover o deseleccionar
        const cOrigenEl = piezaSeleccionadaLocal.casillaElemento;
        const pMovidaObj = piezaSeleccionadaLocal.piezaObjeto;
        const cOrigenStr = piezaSeleccionadaLocal.posicionOriginalStr;
        const cDestinoStr = casillaClickeadaEl.dataset.posicion;

        if (cOrigenEl === casillaClickeadaEl) { // Click en la misma casilla para deseleccionar
            ui.limpiarResaltadoMovimientosPosiblesUI();
            ui.actualizarSeleccionCasillaUI(null);
            piezaSeleccionadaLocal = null;
            return;
        }

        // Si se hace click en otra pieza propia, seleccionarla
        if (piezaObjEnCasillaClick && piezaObjEnCasillaClick.color === playerColor) {
            ui.limpiarResaltadoMovimientosPosiblesUI();
            ui.actualizarSeleccionCasillaUI(casillaClickeadaEl);
            piezaSeleccionadaLocal = {
                casillaElemento: casillaClickeadaEl,
                piezaObjeto: { ...piezaObjEnCasillaClick },
                posicionOriginalStr: cDestinoStr
            };
            // TODO Opcional: Pedir movimientos legales al servidor.
            return;
        }

        // Es un intento de movimiento a una casilla vacía o con pieza enemiga
        console.log(`Intentando mover pieza ${pMovidaObj.id} de ${cOrigenStr} a ${cDestinoStr}`);
        ws.send(JSON.stringify({
            type: 'makeMove',
            payload: {
                piezaId: pMovidaObj.id,
                casillaOrigen: cOrigenStr,
                casillaDestino: cDestinoStr,
                // Opcional: si hay promoción de peón, enviar la pieza elegida
                // promocionA: 'reina' (ejemplo)
            }
        }));

        // Limpiar selección local. La UI se actualizará cuando llegue 'gameStateUpdate'.
        ui.actualizarSeleccionCasillaUI(null);
        ui.limpiarResaltadoMovimientosPosiblesUI();
        piezaSeleccionadaLocal = null;
    }
}

// --- Funciones Auxiliares del Cliente ---
function encontrarPosicionReyCliente(piezasDelJuego, colorRey) {
    const rey = piezasDelJuego.find(p => p.tipo === 'rey' && p.color === colorRey && p.posicionActual);
    return rey ? rey.posicionActual : null;
}

function deshabilitarMovimientoPiezasLocal() {
    juegoIniciado = false; // Previene más interacciones de click que intenten enviar movimientos
    // Aquí se podría añadir lógica para "congelar" el tablero visualmente si se desea
    console.log("Movimiento de piezas deshabilitado localmente.");
}

// Función para actualizar el display de todas las piezas capturadas
function actualizarDisplayPiezasCapturadasCompleto(capturadasPorBlancasSimbolos, capturadasPorNegrasSimbolos) {
    const simbolosBlancasEl = document.getElementById('simbolos_blancas_capturo');
    const simbolosNegrasEl = document.getElementById('simbolos_negras_capturo');

    if (simbolosBlancasEl) {
        simbolosBlancasEl.innerHTML = ''; // Limpiar
        (capturadasPorBlancasSimbolos || []).forEach(simbolo => {
            const span = document.createElement('span');
            span.textContent = simbolo;
            simbolosBlancasEl.appendChild(span);
        });
    }
    if (simbolosNegrasEl) {
        simbolosNegrasEl.innerHTML = ''; // Limpiar
        (capturadasPorNegrasSimbolos || []).forEach(simbolo => {
            const span = document.createElement('span');
            span.textContent = simbolo;
            simbolosNegrasEl.appendChild(span);
        });
    }
}


// --- Inicialización del Juego del Cliente ---
function inicializarJuegoCliente() {
    console.log("main.js: Inicializando UI para juego online...");
    if (contenedorTablero) {
        generarTableroVisual(manejarClickCasilla); // Generar el tablero visual, los clicks ahora van al servidor
        // No se inicializan piezas aquí, se espera al servidor.
        ui.actualizarIndicadorTurnoUI("Esperando conexión...");
        // Configurar listeners para botones de sala (simulados por ahora)
        document.getElementById('btn_crear_sala_online').addEventListener('click', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'createRoom' }));
            } else { ui.mostrarMensajeTemporalUI("No conectado al servidor.", 2000, "error"); }
        });
        document.getElementById('btn_unirse_sala_online').addEventListener('click', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const roomCodeToJoin = prompt("Ingresa el código de la sala:");
                if (roomCodeToJoin) {
                    ws.send(JSON.stringify({ type: 'joinRoom', payload: { roomCode: roomCodeToJoin.trim().toUpperCase() } }));
                }
            } else { ui.mostrarMensajeTemporalUI("No conectado al servidor.", 2000, "error"); }
        });
        document.getElementById('btn_crear_sala_online').disabled = true;
        document.getElementById('btn_unirse_sala_online').disabled = true; \n        document.getElementById('input_codigo_sala_online').disabled = true; \n        document.getElementById('estado_conexion_servidor').textContent = 'Conectando...';

        // Ocultar elementos de configuración local que ya no aplican
        // ui.ocultarSeleccionTiempoUI(); // Ya no existe esta función, los botones de tiempo se eliminaron del HTML
        const configuracionTiempoEl = document.getElementById('configuracion_tiempo'); // El div aún existe pero comentado
        if (configuracionTiempoEl) configuracionTiempoEl.style.display = 'none';

        document.getElementById('configuracion_reglas').style.display = 'none'; // La regla de jaque la maneja el servidor
        document.getElementById('controles_juego_extra').style.display = 'none'; // Descarga de movimientos podría ser server-side o rediseñada

    } else {
        console.error("main.js: El contenedor del tablero no fue encontrado.");
    }
    conectarWebSocket(); // Iniciar la conexión
}

// Lógica de temporizador local eliminada. El servidor gestiona los tiempos.

    const btnUnirse = document.getElementById("btn_unirse_sala_online");
    if (btnUnirse) {
        btnUnirse.addEventListener("click", () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const roomCodeToJoin = document.getElementById("input_codigo_sala_online").value;
                if (roomCodeToJoin) {
                    ws.send(JSON.stringify({ type: "joinRoom", payload: { roomCode: roomCodeToJoin.trim().toUpperCase() } }));
                } else {
                    ui.mostrarMensajeTemporalUI("Ingresa un código de sala.", 2000, "warning");
                }
            } else { ui.mostrarMensajeTemporalUI("No conectado al servidor.", 2000, "error"); }
        });
    }
document.addEventListener('DOMContentLoaded', inicializarJuegoCliente);

console.log("Fin de main.js online.");
