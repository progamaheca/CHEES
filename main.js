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
        document.getElementById('estado_conexion_servidor').textContent = 'Conectado al servidor.';
        document.getElementById('estado_conexion_servidor').style.color = 'green';
        // Habilitar controles de sala
        document.getElementById('btn_crear_sala_online').disabled = false;
        document.getElementById('btn_unirse_sala_online').disabled = false;
        document.getElementById('input_codigo_sala_online').disabled = false;
        document.getElementById('select_color_ia').disabled = false;
        document.getElementById('btn_jugar_vs_stockfish').disabled = false;
        document.getElementById('btn_jugar_vs_cosmic').disabled = false;
    };

    ws.onmessage = (event) => {
        let serverMessage;
        try {
            serverMessage = JSON.parse(event.data);
        } catch (e) {
            console.error("[Cliente] Error parseando mensaje del servidor:", event.data, e);
            return;
        }

        console.log("[Cliente] Mensaje del servidor recibido:", serverMessage);

        switch (serverMessage.type) {
            case 'roomCreated':
                currentRoomCode = serverMessage.roomCode;
                playerColor = serverMessage.playerColor; // El servidor ahora lo envía
                console.log(`[Cliente] Sala creada: ${currentRoomCode}, soy ${playerColor}`);
                document.getElementById('info_sala_creada').textContent = `Código de Sala: ${currentRoomCode}. Eres ${playerColor}.`;
                document.getElementById('mensajes_estado_online').textContent = 'Esperando oponente...';
                ui.mostrarMensajeTemporalUI(`Sala ${currentRoomCode} creada. Eres ${playerColor}. Esperando...`, 5000, "info");
                break;

            case 'joinedRoom': // Este caso puede que ya no sea enviado directamente si gameStart lo reemplaza para el que se une
                currentRoomCode = serverMessage.roomCode;
                playerColor = serverMessage.playerColor;
                console.log(`[Cliente] Unido a sala: ${currentRoomCode}, soy ${playerColor}`);
                document.getElementById('mensajes_estado_online').textContent = `Te uniste a la sala ${currentRoomCode}. Eres ${playerColor}.`;
                if (serverMessage.opponentConnected) { // Esto podría ser parte de gameStart ahora
                     document.getElementById('mensajes_estado_online').textContent += ' Oponente conectado.';
                }
                break;

            case 'opponentJoined': // Esto también podría estar cubierto por gameStart para ambos jugadores en HvH
                console.log(`[Cliente] Oponente ${serverMessage.opponentColor} se ha unido.`);
                document.getElementById('mensajes_estado_online').textContent = `Oponente (${serverMessage.opponentColor}) se ha unido. ¡Listos para empezar!`;
                ui.mostrarMensajeTemporalUI("Oponente conectado.", 3000, "info");
                break;

            case 'gameStart':
                currentGameState = serverMessage.gameState;
                playerColor = serverMessage.playerColor;
                juegoIniciado = true;
                console.log(`[Cliente] ¡Juego iniciado! Soy ${playerColor}. Estado:`, currentGameState);

                // Ocultar toda la sección de controles online, ya que el juego ha empezado
                const controlesOnlineJuegoEl = document.getElementById('controles_online_juego');
                if (controlesOnlineJuegoEl) controlesOnlineJuegoEl.style.display = 'none';

                // También ocultar otros elementos de configuración si aún estuvieran visibles
                ui.ocultarSeleccionTiempoUI();
                const configReglasEl = document.getElementById('configuracion_reglas');
                if (configReglasEl) configReglasEl.style.display = 'none';
                // const controlesJuegoInicialEl = document.getElementById('controles_juego_inicial'); // No existe este ID
                // if (controlesJuegoInicialEl) controlesJuegoInicialEl.style.display = 'none';


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
        document.getElementById('estado_conexion_servidor').textContent = 'Desconectado. Intenta recargar.';
        document.getElementById('estado_conexion_servidor').style.color = 'red';
        // Deshabilitar controles de sala
        document.getElementById('btn_crear_sala_online').disabled = true;
        document.getElementById('btn_unirse_sala_online').disabled = true;
        document.getElementById('input_codigo_sala_online').disabled = true;
        document.getElementById('select_color_ia').disabled = true;
        document.getElementById('btn_jugar_vs_stockfish').disabled = true;
        document.getElementById('btn_jugar_vs_cosmic').disabled = true;
        juegoIniciado = false;
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
        const movePayload = {
            piezaId: pMovidaObj.id,
            casillaOrigen: cOrigenStr,
            casillaDestino: cDestinoStr,
            // promocionA: 'reina' // Ejemplo si se implementa promoción
        };
        console.log(`[Cliente] Intentando mover pieza. Enviando makeMove:`, movePayload);
        ws.send(JSON.stringify({
            type: 'makeMove',
            payload: movePayload
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
                const message = { type: 'createRoom' };
                console.log("[Cliente] Enviando mensaje:", message);
                ws.send(JSON.stringify(message));
            } else { ui.mostrarMensajeTemporalUI("No conectado al servidor.", 2000, "error"); }
        });

        // Listener para el botón de unirse a sala (usando el input)
        const btnUnirseConInput = document.getElementById("btn_unirse_sala_online");
        if (btnUnirseConInput) {
            btnUnirseConInput.addEventListener("click", () => {
                if (ws && ws.readyState === WebSocket.OPEN) {
                    const roomCodeToJoin = document.getElementById("input_codigo_sala_online").value;
                    if (roomCodeToJoin) {
                        const message = { type: "joinRoom", payload: { roomCode: roomCodeToJoin.trim().toUpperCase() } };
                        console.log("[Cliente] Enviando mensaje:", message);
                        ws.send(JSON.stringify(message));
                    } else {
                        ui.mostrarMensajeTemporalUI("Ingresa un código de sala.", 2000, "warning");
                    }
                } else { ui.mostrarMensajeTemporalUI("No conectado al servidor.", 2000, "error"); }
            });
        }

        // Listeners para botones de IA
        document.getElementById('btn_jugar_vs_stockfish').addEventListener('click', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const colorPreferido = document.getElementById('select_color_ia').value;
                const message = {
                    type: 'createRoomVsAI',
                    payload: {
                        aiType: 'stockfish',
                        playerPrefersColor: colorPreferido
                    }
                };
                console.log("[Cliente] Enviando mensaje:", message);
                ws.send(JSON.stringify(message));
                document.getElementById('mensajes_estado_online').textContent = 'Creando sala vs Stockfish...';
            } else { ui.mostrarMensajeTemporalUI("No conectado al servidor.", 2000, "error"); }
        });

        document.getElementById('btn_jugar_vs_cosmic').addEventListener('click', () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                const colorPreferido = document.getElementById('select_color_ia').value;
                const message = {
                    type: 'createRoomVsAI',
                    payload: {
                        aiType: 'cosmic',
                        playerPrefersColor: colorPreferido
                    }
                };
                console.log("[Cliente] Enviando mensaje:", message);
                ws.send(JSON.stringify(message));
                document.getElementById('mensajes_estado_online').textContent = 'Creando sala vs Agente Cósmico...';
            } else { ui.mostrarMensajeTemporalUI("No conectado al servidor.", 2000, "error"); }
        });

        // Deshabilitar botones al inicio
        document.getElementById('btn_crear_sala_online').disabled = true;
        document.getElementById('btn_unirse_sala_online').disabled = true;
        document.getElementById('input_codigo_sala_online').disabled = true;
        document.getElementById('select_color_ia').disabled = true;
        document.getElementById('btn_jugar_vs_stockfish').disabled = true;
        document.getElementById('btn_jugar_vs_cosmic').disabled = true;
        document.getElementById('estado_conexion_servidor').textContent = 'Conectando...';

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

// El listener para btn_unirse_sala_online fue movido y consolidado dentro de inicializarJuegoCliente.
// Este bloque ya no es necesario.
// const btnUnirse = document.getElementById("btn_unirse_sala_online");
// if (btnUnirse) {
//     btnUnirse.addEventListener("click", () => {
//         if (ws && ws.readyState === WebSocket.OPEN) {
//             const roomCodeToJoin = document.getElementById("input_codigo_sala_online").value;
//             if (roomCodeToJoin) {
//                 ws.send(JSON.stringify({ type: "joinRoom", payload: { roomCode: roomCodeToJoin.trim().toUpperCase() } }));
//             } else {
//                 ui.mostrarMensajeTemporalUI("Ingresa un código de sala.", 2000, "warning");
//             }
//         } else { ui.mostrarMensajeTemporalUI("No conectado al servidor.", 2000, "error"); }
//     });
// }

document.addEventListener('DOMContentLoaded', inicializarJuegoCliente);

console.log("Fin de main.js online.");
