// server.js (con lógica de temporizadores integrada)
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');

const { posicionACoordenadas, coordenadasAPosicion, formatearTiempo } = require('./utilServidor');
const { generarPiezasIniciales, getPiezaEnCasillaServidor } = require('./tableroServidor');
const {
    esMovimientoValidoPeon, esMovimientoValidoTorre, esMovimientoValidoCaballo,
    esMovimientoValidoAlfil, esMovimientoValidoReina, esMovimientoValidoRey,
    encontrarPosicionRey, estaEnJaque, getMovimientosLegalesParaPieza,
    esJaqueMate, esEmpatePorAhogado, formatearNotacionMovimiento
} = require('./validacionesServidor');

const port = process.env.PORT || 3000;
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
    return {
        piezas: generarPiezasIniciales(),
        turnoActual: 'blanco',
        historialMovimientos: [],
        reglaJaqueHabilitada: true,
        ultimoMovimiento: null,
        estadoMeta: null, // 'JAQUE_BLANCO', 'JAQUE_NEGRO', 'JAQUEMATE_BLANCO', 'JAQUEMATE_NEGRO', 'AHOGADO_BLANCO', 'AHOGADO_NEGRO', 'TIMEOUT_BLANCO', 'TIMEOUT_NEGRO'
        piezasCapturadasPorBlancas: [],
        piezasCapturadasPorNegras: [],
        tiempoPorJugador: TIEMPO_POR_JUGADOR_SEGUNDOS,
        tiempoRestanteBlancas: TIEMPO_POR_JUGADOR_SEGUNDOS,
        tiempoRestanteNegras: TIEMPO_POR_JUGADOR_SEGUNDOS,
    };
}

// --- Lógica de Temporizador del Servidor ---
function tickTemporizadorSala(roomCode) {
    const room = gameRooms[roomCode];
    if (!room || !room.gameState || (room.gameState.estadoMeta && (room.gameState.estadoMeta.includes('JAQUEMATE') || room.gameState.estadoMeta.includes('AHOGADO') || room.gameState.estadoMeta.includes('TIMEOUT')))) {
        // Si la sala no existe, el juego no ha empezado, o ya terminó, detener el intervalo.
        if (room && room.intervaloTemporizadorSala) {
            clearInterval(room.intervaloTemporizadorSala);
            room.intervaloTemporizadorSala = null;
        }
        return;
    }

    const gameState = room.gameState;
    if (gameState.turnoActual === 'blanco') {
        gameState.tiempoRestanteBlancas--;
        if (gameState.tiempoRestanteBlancas <= 0) {
            gameState.tiempoRestanteBlancas = 0;
            gameState.estadoMeta = 'TIMEOUT_BLANCO'; // Blanco pierde por tiempo
            console.log(`Timeout para Blancas en sala ${roomCode}`);
            clearInterval(room.intervaloTemporizadorSala);
            room.intervaloTemporizadorSala = null;
        }
    } else { // Turno de Negras
        gameState.tiempoRestanteNegras--;
        if (gameState.tiempoRestanteNegras <= 0) {
            gameState.tiempoRestanteNegras = 0;
            gameState.estadoMeta = 'TIMEOUT_NEGRO'; // Negro pierde por tiempo
            console.log(`Timeout para Negras en sala ${roomCode}`);
            clearInterval(room.intervaloTemporizadorSala);
            room.intervaloTemporizadorSala = null;
        }
    }

    // Enviar actualización a todos los jugadores en la sala
    // Incluye todo el gameState, que ahora tiene los tiempos actualizados y posible estadoMeta por timeout
    room.players.forEach(player => {
        player.ws.send(JSON.stringify({
            type: 'gameStateUpdate', // Reutilizamos gameStateUpdate para enviar tiempos
            gameState: gameState,
            // No hay un 'ultimoMovimientoPor' o 'notacionUltimoMovimiento' en un tick de reloj
        }));
    });

    if (gameState.estadoMeta && gameState.estadoMeta.includes('TIMEOUT')) {
        console.log(`Fin del juego por tiempo en sala ${roomCode}: ${gameState.estadoMeta}`);
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

    ws.on('message', (message) => {
        const receivedMessageStr = message instanceof Buffer ? message.toString() : message;
        let parsedMessage;
        try { parsedMessage = JSON.parse(receivedMessageStr); }
        catch (error) {
            console.error('Error al parsear JSON:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Mensaje JSON inválido.' }));
            return;
        }

        const { type, payload } = parsedMessage;
        const roomCode = ws.currentRoomCode;
        let room = roomCode ? gameRooms[roomCode] : null; // 'let' para que pueda ser reasignada

        switch (type) {
            case 'createRoom':
                const newRoomCode = generateRoomCode();
                gameRooms[newRoomCode] = {
                    players: [{ ws, color: 'blanco' }],
                    hostWs: ws,
                    gameState: null,
                    intervaloTemporizadorSala: null
                };
                room = gameRooms[newRoomCode]; // Asignar la sala recién creada
                ws.currentRoomCode = newRoomCode;
                ws.playerColor = 'blanco';
                console.log(`Jugador creó y se unió a sala ${newRoomCode} como blanco.`);
                ws.send(JSON.stringify({ type: 'roomCreated', roomCode: newRoomCode, playerColor: 'blanco' }));
                break;

            case 'joinRoom':
                const roomToJoin = gameRooms[payload.roomCode];
                if (roomToJoin) {
                    if (roomToJoin.players.length < 2) {
                        if (roomToJoin.players.find(p => p.ws === ws)) {
                             ws.send(JSON.stringify({ type: 'error', message: 'Ya estás en esta sala.'}));
                             return;
                        }
                        const newPlayerColor = (roomToJoin.players[0].color === 'blanco') ? 'negro' : 'blanco';
                        roomToJoin.players.push({ ws, color: newPlayerColor });
                        ws.currentRoomCode = payload.roomCode;
                        ws.playerColor = newPlayerColor;
                        room = roomToJoin; // Asignar la sala a la que se unió
                        console.log(`Jugador se unió a sala ${payload.roomCode} como ${newPlayerColor}.`);

                        room.gameState = inicializarEstadoJuego();
                        console.log(`Juego iniciado en sala ${payload.roomCode}. Turno de ${room.gameState.turnoActual}.`);

                        room.players.forEach(player => {
                            player.ws.send(JSON.stringify({
                                type: 'gameStart',
                                roomCode: payload.roomCode,
                                playerColor: player.color,
                                opponentColor: room.players.find(p => p.ws !== player.ws).color,
                                gameState: room.gameState
                            }));
                        });
                        iniciarTemporizadorSala(payload.roomCode); // Iniciar temporizador cuando el juego comienza
                    } else {
                        ws.send(JSON.stringify({ type: 'error', message: 'La sala está llena.' }));
                    }
                } else {
                    ws.send(JSON.stringify({ type: 'error', message: 'La sala no existe.' }));
                }
                break;

            case 'makeMove':
                if (!room || !room.gameState) {
                    ws.send(JSON.stringify({ type: 'error', message: 'El juego no ha comenzado.' }));
                    return;
                }
                if (room.gameState.estadoMeta && (room.gameState.estadoMeta.includes("JAQUEMATE") || room.gameState.estadoMeta.includes("AHOGADO") || room.gameState.estadoMeta.includes("TIMEOUT"))) {
                    ws.send(JSON.stringify({ type: 'error', message: 'El juego ya ha terminado.' }));
                    return;
                }
                if (ws.playerColor !== room.gameState.turnoActual) {
                    ws.send(JSON.stringify({ type: 'error', message: 'No es tu turno.' }));
                    return;
                }

                const { piezaId, casillaOrigen, casillaDestino } = payload;
                const piezasJuegoActual = room.gameState.piezas;
                const piezaMovida = piezasJuegoActual.find(p => p.id === piezaId && p.posicionActual === casillaOrigen);

                if (!piezaMovida || piezaMovida.color !== ws.playerColor) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Pieza inválida o no te pertenece.' }));
                    return;
                }

                const movimientosLegales = getMovimientosLegalesParaPieza(piezasJuegoActual, piezaId, room.gameState.reglaJaqueHabilitada);
                if (!movimientosLegales.includes(casillaDestino)) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Movimiento ilegal.' }));
                    return;
                }

                const piezaCapturadaOriginal = getPiezaEnCasillaServidor(piezasJuegoActual, casillaDestino);
                let notacionMovimiento = "";
                let esCaptura = false;
                let tipoMovEspecial = "";

                if (piezaMovida.tipo === 'rey' || piezaMovida.tipo === 'torre') {
                    piezaMovida.haMovido = true;
                }

                const esEnroque = piezaMovida.tipo === 'rey' && Math.abs(posicionACoordenadas(casillaDestino).columna - posicionACoordenadas(casillaOrigen).columna) === 2;
                if (esEnroque && room.gameState.reglaJaqueHabilitada) {
                    const filaRey = posicionACoordenadas(casillaOrigen).fila;
                    let torreEnrocada, torreNuevaPosStr;
                    if (casillaDestino[0] === 'g') {
                        torreEnrocada = piezasJuegoActual.find(p => p.posicionOriginal === coordenadasAPosicion({fila: filaRey, columna: 7}) && p.tipo === 'torre' && p.color === piezaMovida.color);
                        torreNuevaPosStr = coordenadasAPosicion({fila: filaRey, columna: 5});
                        tipoMovEspecial = "O-O";
                    } else {
                        torreEnrocada = piezasJuegoActual.find(p => p.posicionOriginal === coordenadasAPosicion({fila: filaRey, columna: 0}) && p.tipo === 'torre' && p.color === piezaMovida.color);
                        torreNuevaPosStr = coordenadasAPosicion({fila: filaRey, columna: 3});
                        tipoMovEspecial = "O-O-O";
                    }
                    if (torreEnrocada) {
                        torreEnrocada.posicionActual = torreNuevaPosStr;
                        torreEnrocada.haMovido = true;
                    }
                }

                piezaMovida.posicionActual = casillaDestino;
                if (piezaCapturadaOriginal) {
                    esCaptura = true;
                    const piezaCapturadaEnArray = piezasJuegoActual.find(p => p.id === piezaCapturadaOriginal.id);
                    if (piezaCapturadaEnArray) piezaCapturadaEnArray.posicionActual = null;

                    if (piezaMovida.color === 'blanco') {
                        room.gameState.piezasCapturadasPorBlancas.push(piezaCapturadaOriginal.simbolo);
                    } else {
                        room.gameState.piezasCapturadasPorNegras.push(piezaCapturadaOriginal.simbolo);
                    }
                }

                const jugadorActual = room.gameState.turnoActual;
                room.gameState.turnoActual = (jugadorActual === 'blanco' ? 'negro' : 'blanco');
                room.gameState.ultimoMovimiento = { origen: casillaOrigen, destino: casillaDestino, pieza: piezaMovida.simbolo };

                notacionMovimiento = formatearNotacionMovimiento(piezaMovida, casillaOrigen, casillaDestino, esCaptura, tipoMovEspecial);

                room.gameState.estadoMeta = null;
                const reyOponente = room.gameState.turnoActual;
                if (estaEnJaque(piezasJuegoActual, reyOponente, room.gameState.reglaJaqueHabilitada)) {
                    if (esJaqueMate(piezasJuegoActual, reyOponente, room.gameState.reglaJaqueHabilitada)) {
                        room.gameState.estadoMeta = `JAQUEMATE_${reyOponente.toUpperCase()}`;
                        notacionMovimiento += "#";
                    } else {
                        room.gameState.estadoMeta = `JAQUE_${reyOponente.toUpperCase()}`;
                        notacionMovimiento += "+";
                    }
                } else if (esEmpatePorAhogado(piezasJuegoActual, reyOponente, room.gameState.reglaJaqueHabilitada)) {
                    room.gameState.estadoMeta = `AHOGADO_${reyOponente.toUpperCase()}`;
                }

                const numeroMovimiento = room.gameState.historialMovimientos.length > 0 && room.gameState.historialMovimientos[room.gameState.historialMovimientos.length - 1].negras !== "" ?
                                       room.gameState.historialMovimientos[room.gameState.historialMovimientos.length - 1].numero + 1 :
                                       (room.gameState.historialMovimientos.length === 0 ? 1 : room.gameState.historialMovimientos[room.gameState.historialMovimientos.length - 1].numero);

                if (jugadorActual === 'blanco') {
                    room.gameState.historialMovimientos.push({ numero: numeroMovimiento, blancas: notacionMovimiento, negras: "" });
                } else {
                    if (room.gameState.historialMovimientos.length > 0 && room.gameState.historialMovimientos[room.gameState.historialMovimientos.length-1].blancas !== "") {
                         room.gameState.historialMovimientos[room.gameState.historialMovimientos.length - 1].negras = notacionMovimiento;
                    } else {
                         room.gameState.historialMovimientos.push({ numero: numeroMovimiento, blancas: "", negras: notacionMovimiento });
                    }
                }

                // Si el juego termina por mate o ahogado, detener el temporizador de la sala
                if (room.gameState.estadoMeta && (room.gameState.estadoMeta.includes('JAQUEMATE') || room.gameState.estadoMeta.includes('AHOGADO'))) {
                    if (room.intervaloTemporizadorSala) {
                        clearInterval(room.intervaloTemporizadorSala);
                        room.intervaloTemporizadorSala = null;
                        console.log(`Temporizador detenido en sala ${roomCode} por ${room.gameState.estadoMeta}`);
                    }
                }

                room.players.forEach(player => {
                    player.ws.send(JSON.stringify({
                        type: 'gameStateUpdate',
                        gameState: room.gameState,
                        ultimoMovimientoPor: jugadorActual,
                        notacionUltimoMovimiento: notacionMovimiento
                    }));
                });

                if (room.gameState.estadoMeta && (room.gameState.estadoMeta.includes('JAQUEMATE') || room.gameState.estadoMeta.includes('AHOGADO'))) {
                    console.log(`Fin del juego en sala ${roomCode}: ${room.gameState.estadoMeta}`);
                }
                break;

            default:
                console.log(`Tipo de mensaje desconocido: ${type}`);
        }
    });

    ws.on('close', () => {
        console.log(`Cliente ${ws.playerColor || ''} desconectado de sala ${ws.currentRoomCode || ''}`);
        const roomCode = ws.currentRoomCode;
        if (roomCode && gameRooms[roomCode]) {
            const room = gameRooms[roomCode];
            // Detener el temporizador de la sala si un jugador se desconecta y el juego estaba activo
            if (room.intervaloTemporizadorSala) {
                clearInterval(room.intervaloTemporizadorSala);
                room.intervaloTemporizadorSala = null;
                console.log(`Temporizador detenido en sala ${roomCode} por desconexión.`);
            }

            room.players = room.players.filter(p => p.ws !== ws);

            if (room.players.length === 0) {
                console.log(`Sala ${roomCode} vacía, eliminándola.`);
                delete gameRooms[roomCode];
            } else {
                room.players.forEach(player => {
                    player.ws.send(JSON.stringify({ type: 'opponentLeft', message: `El jugador ${ws.playerColor || 'oponente'} se ha desconectado.`}));
                    // Si el juego estaba en curso, podría marcarse como victoria para el jugador restante
                    if (room.gameState && !(room.gameState.estadoMeta && (room.gameState.estadoMeta.includes('JAQUEMATE') || room.gameState.estadoMeta.includes('AHOGADO') || room.gameState.estadoMeta.includes('TIMEOUT')))) {
                         room.gameState.estadoMeta = ws.playerColor === 'blanco' ? 'TIMEOUT_BLANCO_POR_DESCONEXION' : 'TIMEOUT_NEGRO_POR_DESCONEXION'; // O un estado específico de desconexión
                         console.log(`Juego en sala ${roomCode} terminado por desconexión de ${ws.playerColor}. Gana ${player.color}.`);
                         // Enviar una última actualización de estado al jugador restante
                         player.ws.send(JSON.stringify({ type: 'gameStateUpdate', gameState: room.gameState }));
                    }
                });
                if (ws === room.hostWs && room.players.length > 0) {
                    room.hostWs = room.players[0].ws;
                    console.log(`Nuevo host (${room.players[0].color}) asignado a la sala ${roomCode}.`);
                }
            }
        }
    });
});

server.listen(port, () => {
    console.log(`Servidor escuchando en el puerto ${port}`);
});

app.get('/', (req, res) => {
    res.send('El servidor de Ajedrez está funcionando con temporizadores.');
});
