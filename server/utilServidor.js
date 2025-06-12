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

module.exports = {
    posicionACoordenadas,
    coordenadasAPosicion,
    formatearTiempo
};
