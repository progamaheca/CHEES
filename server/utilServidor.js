// utilServidor.js (CommonJS)

/**
 * Convierte una posición de ajedrez (ej: "a1", "h8") a un objeto de coordenadas.
 * Sistema de coordenadas: fila 0 es la fila '8' del tablero, fila 7 es la fila '1'.
 * Columna 0 es 'a', columna 7 es 'h'.
 * @param {string} posicion Ej: "e4".
 * @returns {{fila: number, columna: number} | null} Objeto con fila y columna, o null si la posición es inválida.
 */
function posicionACoordenadas(posicion) {
    if (!posicion || typeof posicion !== 'string' || posicion.length !== 2) {
        return null;
    }
    const columnaChar = posicion[0].toLowerCase();
    const filaChar = posicion[1];

    if (columnaChar < 'a' || columnaChar > 'h' || filaChar < '1' || filaChar > '8') {
        return null;
    }

    const columna = columnaChar.charCodeAt(0) - 'a'.charCodeAt(0);
    const fila = 8 - parseInt(filaChar);
    return { fila, columna };
}

/**
 * Convierte un objeto de coordenadas al formato de posición de ajedrez (ej: "e4").
 * Inverso de posicionACoordenadas.
 * @param {{fila: number, columna: number}} coords Objeto con fila y columna.
 * @returns {string | null} Posición en formato "a1"-"h8", o null si las coordenadas son inválidas.
 */
function coordenadasAPosicion(coords) {
    if (coords === null || typeof coords !== 'object' ||
        typeof coords.fila !== 'number' || typeof coords.columna !== 'number' ||
        coords.fila < 0 || coords.fila > 7 || coords.columna < 0 || coords.columna > 7) {
        return null;
    }
    const columna = String.fromCharCode('a'.charCodeAt(0) + coords.columna);
    const fila = 8 - coords.fila;
    return columna + fila;
}

/**
 * Formatea un número de segundos al formato MM:SS.
 * @param {number} segundos El número total de segundos.
 * @returns {string} El tiempo formateado como "MM:SS".
 */
function formatearTiempo(segundos) {
    if (typeof segundos !== 'number' || isNaN(segundos) || segundos < 0) {
        return "00:00";
    }
    const minutos = Math.floor(segundos / 60);
    const segRestantes = Math.floor(segundos % 60);
    return `${minutos.toString().padStart(2, '0')}:${segRestantes.toString().padStart(2, '0')}`;
}

// Helper para convertir nuestro array de piezas a FEN
// Esto es una simplificación y podría no cubrir todos los casos de FEN (ej. enroque, peón al paso, contador de movimientos)
// pero será suficiente para que Stockfish y el agente Python entiendan la posición de las piezas.
function boardToFEN(piezas, turnoActual, enroquePosible, peonAlPasoTargetSquare) {
    let fen = "";
    for (let fila = 0; fila < 8; fila++) {
        let emptySquares = 0;
        for (let col = 0; col < 8; col++) {
            const pos = coordenadasAPosicion({ fila, columna: col });
            const pieza = piezas.find(p => p.posicionActual === pos);
            if (pieza) {
                if (emptySquares > 0) {
                    fen += emptySquares;
                    emptySquares = 0;
                }
                let fenChar = pieza.simbolo;
                // Convertir nuestros símbolos a los caracteres FEN estándar
                switch (pieza.simbolo) {
                    case '♙': fenChar = 'P'; break;
                    case '♟': fenChar = 'p'; break;
                    case '♖': fenChar = 'R'; break;
                    case '♜': fenChar = 'r'; break;
                    case '♘': fenChar = 'N'; break;
                    case '♞': fenChar = 'n'; break;
                    case '♗': fenChar = 'B'; break;
                    case '♝': fenChar = 'b'; break;
                    case '♕': fenChar = 'Q'; break;
                    case '♛': fenChar = 'q'; break;
                    case '♔': fenChar = 'K'; break;
                    case '♚': fenChar = 'k'; break;
                }
                fen += pieza.color === 'blanco' ? fenChar.toUpperCase() : fenChar.toLowerCase();
            } else {
                emptySquares++;
            }
        }
        if (emptySquares > 0) {
            fen += emptySquares;
        }
        if (fila < 7) {
            fen += "/";
        }
    }

    // Turno
    fen += turnoActual === 'blanco' ? " w" : " b";

    // Derechos de enroque (simplificado, se necesitaría más estado de 'haMovido' rey/torres)
    // Por ahora, asumimos que si las piezas están en su sitio original y no han movido, pueden enrocar.
    // Esto es una simplificación GRANDE. Una implementación FEN completa es más compleja.
    // Para la IA, la posición de las piezas es lo más crucial.
    let castlingRights = "";
    if (enroquePosible) { // Este objeto debería venir del gameState
        if (enroquePosible.K) castlingRights += "K";
        if (enroquePosible.Q) castlingRights += "Q";
        if (enroquePosible.k) castlingRights += "k";
        if (enroquePosible.q) castlingRights += "q";
    }
    fen += castlingRights ? ` ${castlingRights}` : " -";


    // Peón al paso (ej. "e3"). '-' si no hay.
    fen += peonAlPasoTargetSquare ? ` ${peonAlPasoTargetSquare}` : " -";

    // Contador de medios movimientos para la regla de 50 movimientos (ej. "0")
    // Contador de movimientos completos (ej. "1")
    // Estos son menos críticos para que la IA simplemente elija un movimiento desde una posición.
    fen += " 0 1"; // Placeholder

    return fen;
}


module.exports = {
    posicionACoordenadas,
    coordenadasAPosicion,
    formatearTiempo,
    boardToFEN
};
