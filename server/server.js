// server.js (con lógica de temporizadores integrada)
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const { spawn } = require('child_process'); // Para IA
const path = require('path'); // Para rutas de scripts IA

const { posicionACoordenadas, coordenadasAPosicion, formatearTiempo, boardToFEN } = require('./utilServidor'); // Añadir boardToFEN
const { generarPiezasIniciales, getPiezaEnCasillaServidor } = require('./tableroServidor');
const {
    // esMovimientoValidoPeon, esMovimientoValidoTorre, esMovimientoValidoCaballo, // No se usan directamente aquí
    // esMovimientoValidoAlfil, esMovimientoValidoReina, esMovimientoValidoRey, // Se usan dentro de getMovimientosLegalesParaPieza
    encontrarPosicionRey, estaEnJaque, getMovimientosLegalesParaPieza,
    esJaqueMate, esEmpatePorAhogado, formatearNotacionMovimiento
} = require('./validacionesServidor');

const port = process.env.PORT || 3000;
const STOCKFISH_PATH = process.env.STOCKFISH_PATH || "/usr/games/stockfish"; // Configurable
const PYTHON_AGENT_SCRIPT = path.join(__dirname, 'py_agent', 'cosmic_agent_cli.py');
const AI_MOVE_TIMEOUT_MS = 10000; // Tiempo máximo para que la IA devuelva un movimiento
const TIEMPO_POR_JUGADOR_SEGUNDOS = 300; // 5 minutos por jugador por defecto

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const gameRooms = {};

function generateRoomCode() {
    let code;
    do {
        code = crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (gameRooms[code]);
    return code;
}

function inicializarEstadoJuego() {
    // Generar derechos de enroque iniciales para FEN
    const enroqueInicial = { K: true, Q: true, k: true, q: true }; // Asumimos que todas las piezas están en su sitio
    return {
        piezas: generarPiezasIniciales(),
        turnoActual: 'blanco',
        historialMovimientos: [],
        reglaJaqueHabilitada: true, // Podría ser configurable por sala
        ultimoMovimiento: null,
        estadoMeta: null, // 'JAQUE_BLANCO', 'JAQUE_NEGRO', 'JAQUEMATE_BLANCO', 'JAQUEMATE_NEGRO', 'AHOGADO_BLANCO', 'AHOGADO_NEGRO', 'TIMEOUT_BLANCO', 'TIMEOUT_NEGRO'
        piezasCapturadasPorBlancas: [],
        piezasCapturadasPorNegras: [],
        tiempoPorJugador: TIEMPO_POR_JUGADOR_SEGUNDOS,
        tiempoRestanteBlancas: TIEMPO_POR_JUGADOR_SEGUNDOS,
        tiempoRestanteNegras: TIEMPO_POR_JUGADOR_SEGUNDOS,
        enroquePosible: enroqueInicial, // Para FEN
        peonAlPasoTargetSquare: null, // Para FEN, ej: "e3"
        // Contadores para FEN (halfmove clock, fullmove number) se pueden simplificar o calcular si es necesario
    };
}

// --- Lógica de Temporizador del Servidor ---
function tickTemporizadorSala(roomCode) {
    const room = gameRooms[roomCode];
    if (!room || !room.gameState || room.gameState.estadoMeta) { // Juego terminado por cualquier razón
        if (room && room.intervaloTemporizadorSala) {
            clearInterval(room.intervaloTemporizadorSala);
            room.intervaloTemporizadorSala = null;
        }
        return;
    }

    const gameState = room.gameState;
    let jugadorAfectado = null;

    if (gameState.turnoActual === 'blanco') {
        // No descontar tiempo si el jugador blanco es una IA que no usa reloj aquí
        if (!room.aiOpponentType || room.playerHumanoEs !== 'blanco') {
            gameState.tiempoRestanteBlancas--;
            if (gameState.tiempoRestanteBlancas <= 0) {
                gameState.tiempoRestanteBlancas = 0;
                gameState.estadoMeta = 'TIMEOUT_BLANCO';
                jugadorAfectado = 'blanco';
            }
        }
    } else { // Turno de Negras
        if (!room.aiOpponentType || room.playerHumanoEs !== 'negro') {
            gameState.tiempoRestanteNegras--;
            if (gameState.tiempoRestanteNegras <= 0) {
                gameState.tiempoRestanteNegras = 0;
                gameState.estadoMeta = 'TIMEOUT_NEGRO';
                jugadorAfectado = 'negro';
            }
        }
    }

    if (jugadorAfectado) {
        console.log(`Timeout para ${jugadorAfectado} en sala ${roomCode}`);
        clearInterval(room.intervaloTemporizadorSala);
        room.intervaloTemporizadorSala = null;
    }

    // Enviar actualización solo si hay jugadores humanos o si el tiempo cambió
    // (Evitar spam si es IA vs IA, aunque ese no es el caso de uso actual)
    if (room.players.length > 0) {
        room.players.forEach(player => {
            if (player.ws && player.ws.readyState === WebSocket.OPEN) {
                player.ws.send(JSON.stringify({
                    type: 'gameStateUpdate',
                    gameState: gameState,
                }));
            }
        });
    }


    if (gameState.estadoMeta && gameState.estadoMeta.includes('TIMEOUT')) {
        console.log(`Fin del juego por tiempo en sala ${roomCode}: ${gameState.estadoMeta}`);
        // No se necesita llamar a triggerAIMove aquí porque el juego ya terminó.
    }
}

function iniciarTemporizadorSala(roomCode) {
    const room = gameRooms[roomCode];
    if (room && room.gameState) {
        if (room.intervaloTemporizadorSala) {
            clearInterval(room.intervaloTemporizadorSala);
        }
        // Iniciar el reloj para el turno actual (normalmente blanco al inicio)
        console.log(`Iniciando temporizador para sala ${roomCode}. Turno de ${room.gameState.turnoActual}.`);
        room.intervaloTemporizadorSala = setInterval(() => tickTemporizadorSala(roomCode), 1000);
    }
}


wss.on('connection', (ws) => {
    console.log('Cliente conectado');
    ws.playerColor = null;
    ws.currentRoomCode = null;

    ws.on('message', async (message) => { // Convertida a async para esperar a la IA
        const receivedMessageStr = message instanceof Buffer ? message.toString() : message;
        let parsedMessage;
        try { parsedMessage = JSON.parse(receivedMessageStr); }
        catch (error) {
            console.error('Error al parsear JSON:', error, receivedMessageStr);
            ws.send(JSON.stringify({ type: 'error', message: 'Mensaje JSON inválido.' }));
            return;
        }

        const { type, payload } = parsedMessage;
        const roomCode = ws.currentRoomCode;
        let room = roomCode ? gameRooms[roomCode] : null;

        switch (type) {
            case 'createRoom': // Humano vs Humano (esperando a otro jugador)
                const newRoomCodeHvh = generateRoomCode();
                gameRooms[newRoomCodeHvh] = {
                    players: [{ ws, color: 'blanco' }], // El creador es blanco por defecto
                    hostWs: ws,
                    gameState: null, // Se inicializa cuando el segundo jugador se une
                    intervaloTemporizadorSala: null,
                    aiOpponentType: null, // No hay IA
                    playerHumanoEs: null // Se define cuando empieza el juego
                };
                room = gameRooms[newRoomCodeHvh];
                ws.currentRoomCode = newRoomCodeHvh;
                ws.playerColor = 'blanco'; // Asignación temporal hasta que empiece el juego
                console.log(`[Server] Jugador ${ws._socket.remoteAddress} creó sala HvH ${newRoomCodeHvh} y es blanco (temporal). Esperando oponente. gameRooms:`, Object.keys(gameRooms));
                ws.send(JSON.stringify({ type: 'roomCreated', roomCode: newRoomCodeHvh, playerColor: 'blanco' }));
                break;

            case 'createRoomVsAI':
                const { aiType, playerPrefersColor } = payload;
                if (!['stockfish', 'cosmic'].includes(aiType)) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Tipo de IA no válido.' }));
                    return;
                }

                const newRoomCodeAi = generateRoomCode();
                let playerColorAi;
                let aiColor;

                if (playerPrefersColor === 'blanco' || (playerPrefersColor === 'aleatorio' && Math.random() < 0.5)) {
                    playerColorAi = 'blanco';
                    aiColor = 'negro';
                } else {
                    playerColorAi = 'negro';
                    aiColor = 'blanco';
                }

                gameRooms[newRoomCodeAi] = {
                    players: [{ ws, color: playerColorAi }], // Solo el jugador humano
                    hostWs: ws,
                    gameState: inicializarEstadoJuego(),
                    intervaloTemporizadorSala: null,
                    aiOpponentType: aiType,
                    aiColor: aiColor,
                    playerHumanoEs: playerColorAi // Color del humano en esta partida
                };
                room = gameRooms[newRoomCodeAi];
                ws.currentRoomCode = newRoomCodeAi;
                ws.playerColor = playerColorAi; // Color asignado al jugador humano

                console.log(`Jugador creó sala ${newRoomCodeAi} vs ${aiType}. Jugador es ${playerColorAi}, IA es ${aiColor}.`);

                // Enviar gameStart inmediatamente
                ws.send(JSON.stringify({
                    type: 'gameStart',
                    roomCode: newRoomCodeAi,
                    playerColor: playerColorAi, // El color del jugador humano
                    opponentColor: aiColor, // El color de la IA
                    gameState: room.gameState
                }));
                iniciarTemporizadorSala(newRoomCodeAi);

                // Si la IA es blanca, debe hacer el primer movimiento.
                if (room.gameState.turnoActual === aiColor) {
                    console.log(`Sala ${newRoomCodeAi}: IA (${aiType}, ${aiColor}) inicia. Disparando movimiento IA.`);
                    await triggerAIMove(newRoomCodeAi);
                }
                break;

            case 'joinRoom': // Humano se une a una sala creada por otro humano
                const roomToJoinCode = payload.roomCode;
                console.log(`[Server] Intentando unirse a sala: ${roomToJoinCode}. gameRooms disponibles:`, Object.keys(gameRooms));
                const roomToJoin = gameRooms[roomToJoinCode];

                if (roomToJoin) {
                    console.log(`[Server] Sala ${roomToJoinCode} encontrada. Jugadores actuales: ${roomToJoin.players.length}`);
                    if (roomToJoin.aiOpponentType) {
                        console.log(`[Server] Error: Sala ${roomToJoinCode} es vs IA.`);
                        ws.send(JSON.stringify({ type: 'error', message: 'Esta sala es para jugar contra una IA.' }));
                        return;
                    }
                    if (roomToJoin.players.length >= 2) {
                        console.log(`[Server] Error: Sala ${roomToJoinCode} está llena.`);
                        ws.send(JSON.stringify({ type: 'error', message: 'La sala está llena.' }));
                        return;
                    }
                    if (roomToJoin.players.find(p => p.ws === ws)) {
                        console.log(`[Server] Error: Jugador ya está en sala ${roomToJoinCode}.`);
                        ws.send(JSON.stringify({ type: 'error', message: 'Ya estás en esta sala.'}));
                        return;
                    }

                    // El primer jugador es blanco, el que se une es negro
                    const newPlayerColor = 'negro';
                    roomToJoin.players.push({ ws, color: newPlayerColor });
                    ws.currentRoomCode = roomToJoinCode;
                    ws.playerColor = newPlayerColor; // Color asignado
                    room = roomToJoin; // reasignar room para el contexto actual
                    console.log(`[Server] Jugador ${ws._socket.remoteAddress} se unió a sala ${roomToJoinCode} como ${newPlayerColor}. Total jugadores: ${room.players.length}`);

                    room.gameState = inicializarEstadoJuego();
                    room.playerHumanoEs = null; // No es relevante para HvH de la misma forma que para IA
                    console.log(`[Server] Juego HvH iniciado en sala ${roomToJoinCode}. Turno de ${room.gameState.turnoActual}. Notificando jugadores...`);

                    // Notificar a ambos jugadores que el juego ha comenzado
                    room.players.forEach(p => {
                        if (p.ws && p.ws.readyState === WebSocket.OPEN) {
                            const opponent = room.players.find(pl => pl.ws !== p.ws);
                            p.ws.send(JSON.stringify({
                                type: 'gameStart',
                                roomCode: roomToJoinCode,
                                playerColor: p.color,
                                opponentColor: opponent ? opponent.color : 'desconocido', // Manejar si el oponente aún no está completamente definido
                                gameState: room.gameState
                            }));
                            console.log(`[Server] Enviado gameStart a jugador ${p.color} en sala ${roomToJoinCode}`);
                        } else {
                            console.warn(`[Server] WS no abierto para jugador ${p.color} en sala ${roomToJoinCode} al intentar enviar gameStart.`);
                        }
                    });
                    iniciarTemporizadorSala(roomToJoinCode);
                } else {
                    console.log(`[Server] Error: Sala ${roomToJoinCode} no existe.`);
                    ws.send(JSON.stringify({ type: 'error', message: `La sala '${roomToJoinCode}' no existe.` }));
                }
                break;

            case 'makeMove':
                if (!room || !room.gameState) {
                    ws.send(JSON.stringify({ type: 'error', message: 'El juego no ha comenzado.' }));
                    return;
                }
                if (room.gameState.estadoMeta) { // Juego ya terminado
                    ws.send(JSON.stringify({ type: 'error', message: 'El juego ya ha terminado.' }));
                    return;
                }
                if (ws.playerColor !== room.gameState.turnoActual) {
                    ws.send(JSON.stringify({ type: 'error', message: 'No es tu turno.' }));
                    return;
                }

                const { piezaId, casillaOrigen, casillaDestino } = payload; // promoción no se usa aún
                const piezasJuegoActual = room.gameState.piezas;
                const piezaMovidaOriginal = piezasJuegoActual.find(p => p.id === piezaId && p.posicionActual === casillaOrigen);

                if (!piezaMovidaOriginal || piezaMovidaOriginal.color !== ws.playerColor) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Pieza inválida o no te pertenece.' }));
                    return;
                }

                // Validar movimiento
                const movimientosLegales = getMovimientosLegalesParaPieza(piezasJuegoActual, piezaId, room.gameState.reglaJaqueHabilitada);
                if (!movimientosLegales.includes(casillaDestino)) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Movimiento ilegal.' }));
                    return;
                }

                // Aplicar el movimiento y actualizar estado (esta lógica se puede refactorizar en una función)
                await procesarYAplicarMovimiento(room, piezaId, casillaOrigen, casillaDestino, ws.playerColor);

                // Si es una partida contra IA y el juego no ha terminado, es turno de la IA
                if (room.aiOpponentType && !room.gameState.estadoMeta) {
                    if (room.gameState.turnoActual === room.aiColor) {
                        console.log(`Sala ${roomCode}: Turno de IA (${room.aiOpponentType}, ${room.aiColor}). Disparando movimiento.`);
                        await triggerAIMove(roomCode);
                    }
                }
                break;

            default:
                console.log(`Tipo de mensaje desconocido: ${type} con payload:`, payload);
        }
    });

    ws.on('close', () => {
        const closedRoomCode = ws.currentRoomCode;
        const closedPlayerColor = ws.playerColor;
        console.log(`Cliente ${closedPlayerColor || 'desconocido'} desconectado de sala ${closedRoomCode || 'desconocida'}`);

        if (closedRoomCode && gameRooms[closedRoomCode]) {
            const room = gameRooms[closedRoomCode];

            if (room.intervaloTemporizadorSala) {
                clearInterval(room.intervaloTemporizadorSala);
                room.intervaloTemporizadorSala = null;
                console.log(`Temporizador detenido en sala ${closedRoomCode} por desconexión.`);
            }

            room.players = room.players.filter(p => p.ws !== ws);

            if (room.players.length === 0) {
                // Si no quedan jugadores humanos (ej. en partida vs IA, o el último de HvH se fue)
                console.log(`Sala ${closedRoomCode} vacía o sin jugadores humanos, eliminándola.`);
                delete gameRooms[closedRoomCode];
            } else {
                // Si queda al menos un jugador (en una partida HvH)
                const remainingPlayer = room.players[0];
                if (remainingPlayer.ws && remainingPlayer.ws.readyState === WebSocket.OPEN) {
                    remainingPlayer.ws.send(JSON.stringify({
                        type: 'opponentLeft',
                        message: `El jugador ${closedPlayerColor || 'oponente'} se ha desconectado.`
                    }));

                    // Si el juego estaba en curso y no había terminado por otra razón
                    if (room.gameState && !room.gameState.estadoMeta) {
                         room.gameState.estadoMeta = closedPlayerColor === 'blanco' ? 'TIMEOUT_BLANCO_DESCONEXION' : 'TIMEOUT_NEGRO_DESCONEXION';
                         console.log(`Juego en sala ${closedRoomCode} terminado por desconexión de ${closedPlayerColor}. Gana ${remainingPlayer.color}.`);
                         remainingPlayer.ws.send(JSON.stringify({ type: 'gameStateUpdate', gameState: room.gameState }));
                    }
                }
                // Reasignar host si el que se fue era el host
                if (ws === room.hostWs) {
                    room.hostWs = remainingPlayer.ws; // Asumimos que remainingPlayer.ws está definido
                    console.log(`Nuevo host (${remainingPlayer.color}) asignado a la sala ${closedRoomCode}.`);
                }
            }
        }
    });
});

// --- Lógica de IA ---

// Función para procesar y aplicar un movimiento (humano o IA)
async function procesarYAplicarMovimiento(room, piezaId, casillaOrigen, casillaDestino, jugadorQueMueve) {
    const gameState = room.gameState;
    const piezasJuegoActual = gameState.piezas;
    // La pieza DEBE existir y estar en casillaOrigen si la validación previa (getMovimientosLegales) fue correcta.
    const piezaMovida = piezasJuegoActual.find(p => p.id === piezaId);
    if (!piezaMovida) {
        console.error(`Error crítico: Pieza ${piezaId} no encontrada para mover en procesarYAplicarMovimiento.`);
        // Enviar error al jugador humano si es posible
        const humanPlayer = room.players.find(p => p.color === jugadorQueMueve);
        if (humanPlayer && humanPlayer.ws) {
            humanPlayer.ws.send(JSON.stringify({type: 'error', message: 'Error interno del servidor al procesar movimiento.'}));
        }
        return; // No continuar si la pieza no se encuentra
    }


    const piezaCapturadaOriginal = getPiezaEnCasillaServidor(piezasJuegoActual, casillaDestino);
    let notacionMovimiento = "";
    let esCaptura = false;
    let tipoMovEspecial = ""; // Para enroque

    // Actualizar 'haMovido' para reyes y torres (afecta derechos de enroque)
    if (piezaMovida.tipo === 'rey' || (piezaMovida.tipo === 'torre' && !piezaMovida.haMovido)) {
        piezaMovida.haMovido = true;
        // Actualizar derechos de enroque en gameState.enroquePosible
        if (piezaMovida.tipo === 'rey') {
            if (piezaMovida.color === 'blanco') { gameState.enroquePosible.K = false; gameState.enroquePosible.Q = false; }
            else { gameState.enroquePosible.k = false; gameState.enroquePosible.q = false; }
        } else if (piezaMovida.tipo === 'torre') {
            // Si la torre blanca de 'h1' (original) se mueve
            if (piezaMovida.color === 'blanco' && piezaMovida.posicionOriginal === 'h1') gameState.enroquePosible.K = false;
            else if (piezaMovida.color === 'blanco' && piezaMovida.posicionOriginal === 'a1') gameState.enroquePosible.Q = false;
            // Si la torre negra de 'h8' (original) se mueve
            else if (piezaMovida.color === 'negro' && piezaMovida.posicionOriginal === 'h8') gameState.enroquePosible.k = false;
            else if (piezaMovida.color === 'negro' && piezaMovida.posicionOriginal === 'a8') gameState.enroquePosible.q = false;
        }
    }

    // Manejo de Enroque
    const esEnroque = piezaMovida.tipo === 'rey' && Math.abs(posicionACoordenadas(casillaDestino).columna - posicionACoordenadas(casillaOrigen).columna) === 2;
    if (esEnroque) { // No es necesario "&& gameState.reglaJaqueHabilitada" porque getMovimientosLegales ya lo valida
        const filaRey = posicionACoordenadas(casillaOrigen).fila;
        let torreEnrocada, torreNuevaPosStr;
        if (casillaDestino[0] === 'g') { // Enroque corto
            torreEnrocada = piezasJuegoActual.find(p => p.posicionOriginal === coordenadasAPosicion({fila: filaRey, columna: 7}) && p.tipo === 'torre' && p.color === piezaMovida.color);
            torreNuevaPosStr = coordenadasAPosicion({fila: filaRey, columna: 5}); // f1 o f8
            tipoMovEspecial = "O-O";
        } else { // Enroque largo (casillaDestino[0] === 'c')
            torreEnrocada = piezasJuegoActual.find(p => p.posicionOriginal === coordenadasAPosicion({fila: filaRey, columna: 0}) && p.tipo === 'torre' && p.color === piezaMovida.color);
            torreNuevaPosStr = coordenadasAPosicion({fila: filaRey, columna: 3}); // d1 o d8
            tipoMovEspecial = "O-O-O";
        }
        if (torreEnrocada) {
            torreEnrocada.posicionActual = torreNuevaPosStr;
            torreEnrocada.haMovido = true; // La torre también se mueve
        }
    }

    // Mover la pieza principal
    piezaMovida.posicionActual = casillaDestino;

    // Manejo de Captura
    if (piezaCapturadaOriginal) {
        esCaptura = true;
        const piezaCapturadaEnArray = piezasJuegoActual.find(p => p.id === piezaCapturadaOriginal.id);
        if (piezaCapturadaEnArray) piezaCapturadaEnArray.posicionActual = null; // Marcar como capturada

        if (piezaMovida.color === 'blanco') {
            gameState.piezasCapturadasPorBlancas.push(piezaCapturadaOriginal.simbolo);
        } else {
            gameState.piezasCapturadasPorNegras.push(piezaCapturadaOriginal.simbolo);
        }
    }

    // TODO: Promoción de Peón (si casillaDestino es fila 0 o 7 y piezaMovida es peón)
    // Necesitaría un payload adicional del cliente para saber a qué pieza promocionar.
    // Por ahora, no se implementa promoción.

    // Actualizar turno y último movimiento
    const jugadorAnterior = gameState.turnoActual;
    gameState.turnoActual = (jugadorAnterior === 'blanco' ? 'negro' : 'blanco');
    gameState.ultimoMovimiento = { origen: casillaOrigen, destino: casillaDestino, pieza: piezaMovida.simbolo };

    // Formatear notación
    notacionMovimiento = formatearNotacionMovimiento(piezaMovida, casillaOrigen, casillaDestino, esCaptura, tipoMovEspecial);

    // Chequear Jaque, Mate, Ahogado
    gameState.estadoMeta = null; // Resetear antes de chequear
    const reyOponenteColor = gameState.turnoActual; // El jugador cuyo turno es ahora, es el que podría estar en jaque/mate

    if (estaEnJaque(piezasJuegoActual, reyOponenteColor, gameState.reglaJaqueHabilitada)) {
        if (esJaqueMate(piezasJuegoActual, reyOponenteColor, gameState.reglaJaqueHabilitada)) {
            gameState.estadoMeta = `JAQUEMATE_${reyOponenteColor.toUpperCase()}`;
            notacionMovimiento += "#";
        } else {
            gameState.estadoMeta = `JAQUE_${reyOponenteColor.toUpperCase()}`;
            notacionMovimiento += "+";
        }
    } else if (esEmpatePorAhogado(piezasJuegoActual, reyOponenteColor, gameState.reglaJaqueHabilitada)) {
        gameState.estadoMeta = `AHOGADO_${reyOponenteColor.toUpperCase()}`;
        // Podríamos añadir "1/2-1/2" a la notación aquí si quisiéramos
    }

    // Actualizar historial de movimientos
    const numeroMovimientoActual = (gameState.historialMovimientos.length === 0 || gameState.historialMovimientos[gameState.historialMovimientos.length - 1].negras)
                               ? (gameState.historialMovimientos.length + 1)
                               : gameState.historialMovimientos[gameState.historialMovimientos.length - 1].numero;

    if (jugadorAnterior === 'blanco') {
        gameState.historialMovimientos.push({ numero: numeroMovimientoActual, blancas: notacionMovimiento, negras: "" });
    } else { // Jugador anterior fue negro
        if (gameState.historialMovimientos.length > 0 && !gameState.historialMovimientos[gameState.historialMovimientos.length - 1].negras) {
            gameState.historialMovimientos[gameState.historialMovimientos.length - 1].negras = notacionMovimiento;
        } else {
            // Esto no debería ocurrir si la lógica de números de movimiento es correcta (ej. negro mueve primero sin blanco)
            gameState.historialMovimientos.push({ numero: numeroMovimientoActual, blancas: "", negras: notacionMovimiento });
        }
    }

    // Detener temporizador si hay mate o ahogado
    if (gameState.estadoMeta && (gameState.estadoMeta.includes('JAQUEMATE') || gameState.estadoMeta.includes('AHOGADO'))) {
        if (room.intervaloTemporizadorSala) {
            clearInterval(room.intervaloTemporizadorSala);
            room.intervaloTemporizadorSala = null;
            console.log(`Temporizador detenido en sala ${room.ws.currentRoomCode} por ${gameState.estadoMeta}`);
        }
    }

    // Enviar actualización a todos los jugadores en la sala
    room.players.forEach(playerClient => {
        if (playerClient.ws && playerClient.ws.readyState === WebSocket.OPEN) {
            playerClient.ws.send(JSON.stringify({
                type: 'gameStateUpdate',
                gameState: gameState,
                ultimoMovimientoPor: jugadorAnterior, // Quién hizo el movimiento
                notacionUltimoMovimiento: notacionMovimiento
            }));
        }
    });

    if (gameState.estadoMeta) {
        console.log(`Fin del juego en sala ${room.ws.currentRoomCode}: ${gameState.estadoMeta}`);
    }
}


async function triggerAIMove(roomCode) {
    const room = gameRooms[roomCode];
    if (!room || !room.aiOpponentType || !room.gameState || room.gameState.estadoMeta || room.gameState.turnoActual !== room.aiColor) {
        if (room && room.gameState && room.gameState.turnoActual !== room.aiColor && !room.gameState.estadoMeta) {
            // console.log(`triggerAIMove llamado para ${roomCode} pero no es turno de IA (${room.aiColor}, es ${room.gameState.turnoActual}) o juego terminado.`);
        }
        return;
    }

    console.log(`Sala ${roomCode}: IA (${room.aiOpponentType}, ${room.aiColor}) está pensando...`);

    try {
        // Convertir el estado actual de las piezas a FEN
        const fen = boardToFEN(room.gameState.piezas, room.gameState.turnoActual, room.gameState.enroquePosible, room.gameState.peonAlPasoTargetSquare);

        let aiMoveResponse; // Debería ser como { origen: 'e2', destino: 'e4', piezaId: 'PB5'} o solo UCI string 'e2e4'
        if (room.aiOpponentType === 'stockfish') {
            aiMoveResponse = await getStockfishMove(fen, room.gameState.tiempoPorJugador); // Pasamos el FEN
        } else if (room.aiOpponentType === 'cosmic') {
            aiMoveResponse = await getCosmicAgentMove(fen, room.gameState.tiempoPorJugador); // Pasamos el FEN
        } else {
            console.error(`Tipo de IA desconocido: ${room.aiOpponentType} en sala ${roomCode}`);
            return;
        }

        if (aiMoveResponse && aiMoveResponse.movimientoUCI) {
            const { movimientoUCI } = aiMoveResponse;
            const casillaOrigenIA = movimientoUCI.substring(0, 2);
            const casillaDestinoIA = movimientoUCI.substring(2, 4);
            // Promoción: e.g., e7e8q (la 'q' indica promoción a reina)
            const promocionIA = movimientoUCI.length === 5 ? movimientoUCI.charAt(4) : null;


            // Encontrar la pieza que la IA quiere mover desde casillaOrigenIA
            // Esto es crucial: necesitamos el ID de nuestra pieza en el servidor.
            const piezaAIMovida = room.gameState.piezas.find(p => p.posicionActual === casillaOrigenIA && p.color === room.aiColor);

            if (!piezaAIMovida) {
                console.error(`Error en sala ${roomCode}: IA ${room.aiOpponentType} intentó mover desde una casilla vacía (${casillaOrigenIA}) o pieza incorrecta.`);
                // Podría ser un error de la IA o un FEN mal interpretado.
                // Enviar un mensaje de error al jugador humano si existe.
                // O forzar a la IA a perder, o intentar un movimiento aleatorio legal como fallback.
                // Por ahora, solo logueamos y no hacemos nada.
                return;
            }

            // Validar que el movimiento de la IA es legal según nuestras reglas.
            // Esto es una salvaguarda importante.
            const movimientosLegalesIA = getMovimientosLegalesParaPieza(room.gameState.piezas, piezaAIMovida.id, room.gameState.reglaJaqueHabilitada);
            if (!movimientosLegalesIA.includes(casillaDestinoIA)) {
                console.error(`Error en sala ${roomCode}: IA ${room.aiOpponentType} propuso movimiento ilegal: ${movimientoUCI}. Legales: ${movimientosLegalesIA.join(', ')}`);
                // Manejar este error (ej. IA pierde, o intentar otro movimiento)
                return;
            }

            console.log(`Sala ${roomCode}: IA (${room.aiOpponentType}) mueve ${movimientoUCI} (Pieza ID: ${piezaAIMovida.id})`);
            await procesarYAplicarMovimiento(room, piezaAIMovida.id, casillaOrigenIA, casillaDestinoIA, room.aiColor);

            // Si después del movimiento de la IA, el juego no ha terminado y es turno del humano
            if (!room.gameState.estadoMeta && room.gameState.turnoActual === room.playerHumanoEs) {
                // No se necesita hacer nada aquí, el humano recibirá gameStateUpdate y podrá mover.
            }

        } else {
            console.error(`Sala ${roomCode}: IA ${room.aiOpponentType} no devolvió un movimiento válido. Respuesta:`, aiMoveResponse);
            // Manejar esto, quizás la IA pierde por "timeout" o error.
            // Por ahora, si la IA no mueve, el juego podría quedar bloqueado para el humano.
            // Podríamos establecer un estadoMeta aquí.
            if (room.players.length > 0 && room.players[0].ws) {
                 room.players[0].ws.send(JSON.stringify({ type: 'error', message: `La IA (${room.aiOpponentType}) no pudo realizar un movimiento.` }));
            }
        }

    } catch (error) {
        console.error(`Error durante el turno de la IA en sala ${roomCode}:`, error);
        // Notificar al jugador humano si existe
        if (room.players.length > 0 && room.players[0].ws) {
            room.players[0].ws.send(JSON.stringify({ type: 'error', message: `Error procesando el movimiento de la IA (${room.aiOpponentType}).` }));
        }
        // Considerar si el juego debe terminar o si la IA pierde el turno/partida.
    }
}

// Funciones para obtener movimiento de IA
async function getStockfishMove(fen, tiempoDisponibleSegundos) {
    console.log(`getStockfishMove llamado con FEN: "${fen}", Tiempo: ${tiempoDisponibleSegundos}s`);
    const depth = 20; // Profundidad de búsqueda para Stockfish, o usar movetime
    const moveTimeMs = Math.min(AI_MOVE_TIMEOUT_MS, (tiempoDisponibleSegundos * 1000) / 30); // Ej: usar 1/30 del tiempo, max AI_MOVE_TIMEOUT_MS

    return new Promise((resolve, reject) => {
        const stockfishProcess = spawn(STOCKFISH_PATH);
        let bestMove = null;
        let uciOk = false;
        let readyOk = false;

        stockfishProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            console.log(`Stockfish STDOUT: ${output}`);

            if (output.includes("uciok")) {
                uciOk = true;
            }
            if (output.includes("readyok")) {
                readyOk = true;
            }
            if (output.startsWith("bestmove")) {
                const parts = output.split(" ");
                if (parts.length >= 2) {
                    bestMove = parts[1];
                    stockfishProcess.stdin.write("quit\n"); // Salir después de obtener el movimiento
                }
            }

            // Flujo de comandos UCI
            if (!uciOk) {
                // Esperando uciok
            } else if (!readyOk) {
                // Esperando readyok
            } else if (bestMove === null) {
                // Ya se envió la posición y 'go', esperando 'bestmove'
            }
        });

        stockfishProcess.stderr.on('data', (data) => {
            console.error(`Stockfish STDERR: ${data.toString()}`);
        });

        stockfishProcess.on('error', (err) => {
            console.error('Error al iniciar Stockfish:', err);
            reject({ error: "Error al iniciar Stockfish.", details: err.message });
        });

        stockfishProcess.on('close', (code) => {
            console.log(`Stockfish proceso cerrado con código ${code}`);
            if (bestMove) {
                resolve({ movimientoUCI: bestMove });
            } else if (code !== 0 && !bestMove) { // Si cerró con error y no tenemos movimiento
                reject({ error: "Stockfish cerró inesperadamente o no encontró movimiento.", details: `Exit code: ${code}` });
            } else if (!bestMove) { // Cerró limpiamente pero no hubo bestmove (ej. timeout externo mató el proceso)
                reject({ error: "Stockfish no devolvió un movimiento (posible timeout o posición sin movimientos).", details: `Exit code: ${code}` });
            }
            // Si bestMove ya fue resuelto, esta parte no hace nada.
        });

        // Enviar comandos UCI
        stockfishProcess.stdin.write("uci\n");
        stockfishProcess.stdin.write("isready\n");
        stockfishProcess.stdin.write(`position fen ${fen}\n`);
        // Usar movetime para controlar el tiempo de pensamiento de Stockfish.
        // Opcionalmente, se puede usar 'go depth <depth>'
        stockfishProcess.stdin.write(`go movetime ${Math.max(500, moveTimeMs)}\n`); // Mínimo 500ms para pensar

        // Timeout para el proceso de Stockfish
        const processTimeout = setTimeout(() => {
            if (!bestMove) { // Si no hemos obtenido un movimiento aún
                console.error(`Stockfish timeout después de ${AI_MOVE_TIMEOUT_MS} ms para FEN: ${fen}`);
                stockfishProcess.kill(); // Terminar el proceso
                reject({ error: "Stockfish timeout." });
            }
        }, AI_MOVE_TIMEOUT_MS + 1000); // Un poco más que el movetime para permitir que 'quit' funcione

        stockfishProcess.on('exit', () => {
            clearTimeout(processTimeout); // Limpiar el timeout si el proceso termina antes
        });
    });
}

async function getCosmicAgentMove(fen, tiempoDisponibleSegundos) {
    console.log(`getCosmicAgentMove llamado con FEN: "${fen}", Tiempo: ${tiempoDisponibleSegundos}s`);
    // El script Python maneja su propio tiempo internamente ('tiempo_max' en elegir_movimiento).
    // El script cosmic_agent_cli.py fue adaptado para tomar FEN y opcionalmente STOCKFISH_PATH.

    return new Promise((resolve, reject) => {
        const scriptArgs = [PYTHON_AGENT_SCRIPT, fen, STOCKFISH_PATH];

        console.log(`Ejecutando: python3 ${scriptArgs.join(" ")}`);
        // Usar 'python3' explícitamente. Asegurarse de que está en el PATH del servidor.
        const pythonProcess = spawn('python3', scriptArgs, { timeout: AI_MOVE_TIMEOUT_MS + 2000 }); // Timeout para el proceso en sí

        let moveUCI = ""; // Iniciar como string vacío para acumular
        let errorOutput = "";
        let hasResolved = false; // Flag para evitar múltiples resolves/rejects

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            // El script Python debería imprimir solo el movimiento UCI a stdout.
            // Podría haber múltiples chunks de datos si el output es largo, aunque para un movimiento UCI es improbable.
            // Solo consideramos la última línea no vacía y que no sea una advertencia conocida.
            if (output) {
                console.log(`CosmicAgent STDOUT: ${output}`);
                if (!output.toLowerCase().startsWith("advertencia:") && !output.toLowerCase().includes("tensorflow")) {
                     moveUCI = output; // Tomar la última línea como el movimiento
                } else {
                    console.log(`CosmicAgent STDOUT (ignorado como advertencia): ${output}`);
                }
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            const errData = data.toString().trim();
            console.error(`CosmicAgent STDERR: ${errData}`);
            errorOutput += errData + "\n";
        });

        pythonProcess.on('error', (err) => {
            if (hasResolved) return;
            hasResolved = true;
            console.error('Error al iniciar CosmicAgent script:', err);
            reject({ error: "Error al iniciar CosmicAgent script.", details: err.message });
        });

        pythonProcess.on('close', (code) => {
            if (hasResolved) return;
            hasResolved = true;
            console.log(`CosmicAgent script cerrado con código ${code}. Movimiento obtenido: '${moveUCI}'`);

            // Validar el formato del movimiento UCI (simple chequeo de longitud)
            if (moveUCI && (moveUCI.length === 4 || moveUCI.length === 5) && moveUCI !== "NOMOVE") {
                 // Ej: e2e4, e7e8q
                const fromSq = moveUCI.substring(0,2);
                const toSq = moveUCI.substring(2,4);
                if (posicionACoordenadas(fromSq) && posicionACoordenadas(toSq)) {
                     resolve({ movimientoUCI: moveUCI.trim() });
                } else {
                    console.error(`CosmicAgent devolvió un UCI con formato de casilla inválido: ${moveUCI}`);
                    reject({ error: "Agente Cósmico devolvió un UCI con formato de casilla inválido.", details: `UCI: ${moveUCI}, stderr: ${errorOutput || `Exit code: ${code}`}` });
                }
            } else if (moveUCI === "NOMOVE") {
                console.error("Agente Cósmico explícitamente no encontró movimiento (NOMOVE).");
                reject({ error: "Agente Cósmico no encontró movimiento (NOMOVE).", details: errorOutput || `Exit code: ${code}`});
            } else if (code !== 0) {
                 console.error(`CosmicAgent script cerró con error código ${code}.`);
                reject({ error: "CosmicAgent script cerró con error.", details: errorOutput || `Exit code: ${code}` });
            } else { // Código 0 pero sin movimiento UCI válido
                 console.error(`CosmicAgent script no devolvió un movimiento UCI válido. Recibido: '${moveUCI}'`);
                reject({ error: "CosmicAgent script no devolvió un movimiento UCI válido.", details: `Recibido: '${moveUCI}', stderr: ${errorOutput || `Exit code: ${code}`}` });
            }
        });

        // El timeout ya está incluido en spawn options. No se necesita uno separado aquí si es confiable.
        // Sin embargo, por si acaso el evento 'close' o 'error' no se dispara con el timeout de spawn:
        const safetyTimeout = setTimeout(() => {
            if (!hasResolved) {
                hasResolved = true;
                console.error(`CosmicAgent TIMEOUT DE SEGURIDAD después de ${AI_MOVE_TIMEOUT_MS + 3000} ms para FEN: ${fen}`);
                if (pythonProcess && !pythonProcess.killed) {
                    pythonProcess.kill('SIGTERM');
                }
                reject({ error: "CosmicAgent timeout (safety)." });
            }
        }, AI_MOVE_TIMEOUT_MS + 3000); // Un poco más que el timeout del spawn

        // Asegurarse de limpiar el timeout de seguridad si el proceso termina normalmente.
        pythonProcess.on('exit', (code, signal) => {
             clearTimeout(safetyTimeout);
        });
    });
}


server.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});

app.get('/', (req, res) => {
    res.send('El servidor de Ajedrez está funcionando con temporizadores.');
});
