// util.js

/**
 * Convierte una posición de ajedrez (ej: "a1", "h8") a un objeto de coordenadas.
 * Sistema de coordenadas: fila 0 es la fila '8' del tablero, fila 7 es la fila '1'.
 * Columna 0 es 'a', columna 7 es 'h'.
 * @param {string} posicion Ej: "e4".
 * @returns {{fila: number, columna: number} | null} Objeto con fila y columna, o null si la posición es inválida.
 */
export function posicionACoordenadas(posicion) {
    if (!posicion || typeof posicion !== 'string' || posicion.length !== 2) {
        // console.warn("posicionACoordenadas: Posición inválida proporcionada:", posicion);
        return null;
    }
    const columnaChar = posicion[0].toLowerCase();
    const filaChar = posicion[1];

    if (columnaChar < 'a' || columnaChar > 'h' || filaChar < '1' || filaChar > '8') {
        // console.warn("posicionACoordenadas: Posición fuera de rango del tablero:", posicion);
        return null;
    }

    const columna = columnaChar.charCodeAt(0) - 'a'.charCodeAt(0);
    const fila = 8 - parseInt(filaChar); // '8' se convierte en fila 0, '1' en fila 7.
    return { fila, columna };
}

/**
 * Convierte un objeto de coordenadas al formato de posición de ajedrez (ej: "e4").
 * Inverso de posicionACoordenadas.
 * @param {{fila: number, columna: number}} coords Objeto con fila y columna.
 * @returns {string | null} Posición en formato "a1"-"h8", o null si las coordenadas son inválidas.
 */
export function coordenadasAPosicion(coords) {
    if (coords === null || typeof coords !== 'object' ||
        typeof coords.fila !== 'number' || typeof coords.columna !== 'number' ||
        coords.fila < 0 || coords.fila > 7 || coords.columna < 0 || coords.columna > 7) {
        // console.warn("coordenadasAPosicion: Coordenadas inválidas proporcionadas:", coords);
        return null;
    }
    const columna = String.fromCharCode('a'.charCodeAt(0) + coords.columna);
    const fila = 8 - coords.fila; // Fila 0 se convierte en '8', fila 7 en '1'.
    return columna + fila;
}

/**
 * Formatea un número de segundos al formato MM:SS.
 * @param {number} segundos El número total de segundos.
 * @returns {string} El tiempo formateado como "MM:SS".
 */
export function formatearTiempo(segundos) {
    if (typeof segundos !== 'number' || isNaN(segundos) || segundos < 0) {
        // console.warn("formatearTiempo: Número de segundos inválido:", segundos);
        return "00:00"; // Devuelve un formato válido por defecto en caso de error.
    }
    const minutos = Math.floor(segundos / 60);
    const segRestantes = Math.floor(segundos % 60); // Usar Math.floor para asegurar enteros.
    return `${minutos.toString().padStart(2, '0')}:${segRestantes.toString().padStart(2, '0')}`;
}
