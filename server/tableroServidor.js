// tableroServidor.js (CommonJS)

// No hay un 'contenedorTablero' en el servidor.
// Las piezas no tendrán 'elementoPieza'.

/**
 * Genera un nuevo conjunto de piezas en sus posiciones iniciales.
 * @returns {Array<Object>} Un array de objetos pieza.
 */
function generarPiezasIniciales() {
    // Deep copy para asegurar que cada juego tenga su propio conjunto de piezas
    const piezasBase = [
        // Blancas
        { id: 'TBI', simbolo: '♖', color: 'blanco', posicionOriginal: 'a1', posicionActual: 'a1', tipo: 'torre', haMovido: false },
        { id: 'CBI', simbolo: '♘', color: 'blanco', posicionOriginal: 'b1', posicionActual: 'b1', tipo: 'caballo' },
        { id: 'ABI', simbolo: '♗', color: 'blanco', posicionOriginal: 'c1', posicionActual: 'c1', tipo: 'alfil' },
        { id: 'DB', simbolo: '♕', color: 'blanco', posicionOriginal: 'd1', posicionActual: 'd1', tipo: 'reina' },
        { id: 'RB', simbolo: '♔', color: 'blanco', posicionOriginal: 'e1', posicionActual: 'e1', tipo: 'rey', haMovido: false },
        { id: 'ABD', simbolo: '♗', color: 'blanco', posicionOriginal: 'f1', posicionActual: 'f1', tipo: 'alfil' },
        { id: 'CBD', simbolo: '♘', color: 'blanco', posicionOriginal: 'g1', posicionActual: 'g1', tipo: 'caballo' },
        { id: 'TBD', simbolo: '♖', color: 'blanco', posicionOriginal: 'h1', posicionActual: 'h1', tipo: 'torre', haMovido: false },
        ...Array.from({ length: 8 }, (_, i) => ({ id: `PB${i+1}`, simbolo: '♙', color: 'blanco', posicionOriginal: `${String.fromCharCode(97 + i)}2`, posicionActual: `${String.fromCharCode(97 + i)}2`, tipo: 'peon' })),

        // Negras
        { id: 'TNI', simbolo: '♜', color: 'negro', posicionOriginal: 'a8', posicionActual: 'a8', tipo: 'torre', haMovido: false },
        { id: 'CNI', simbolo: '♞', color: 'negro', posicionOriginal: 'b8', posicionActual: 'b8', tipo: 'caballo' },
        { id: 'ANI', simbolo: '♝', color: 'negro', posicionOriginal: 'c8', posicionActual: 'c8', tipo: 'alfil' },
        { id: 'DN', simbolo: '♛', color: 'negro', posicionOriginal: 'd8', posicionActual: 'd8', tipo: 'reina' },
        { id: 'RN', simbolo: '♚', color: 'negro', posicionOriginal: 'e8', posicionActual: 'e8', tipo: 'rey', haMovido: false },
        { id: 'AND', simbolo: '♝', color: 'negro', posicionOriginal: 'f8', posicionActual: 'f8', tipo: 'alfil' },
        { id: 'CND', simbolo: '♞', color: 'negro', posicionOriginal: 'g8', posicionActual: 'g8', tipo: 'caballo' },
        { id: 'TND', simbolo: '♜', color: 'negro', posicionOriginal: 'h8', posicionActual: 'h8', tipo: 'torre', haMovido: false },
        ...Array.from({ length: 8 }, (_, i) => ({ id: `PN${i+1}`, simbolo: '♟', color: 'negro', posicionOriginal: `${String.fromCharCode(97 + i)}7`, posicionActual: `${String.fromCharCode(97 + i)}7`, tipo: 'peon' })),
    ];
    // Retornar una copia profunda para evitar modificaciones entre salas
    return JSON.parse(JSON.stringify(piezasBase));
}

/**
 * Obtiene una pieza en una casilla específica de un array de piezas dado.
 * @param {Array<Object>} piezasDelJuego El array de piezas del juego actual.
 * @param {string} posicion La posición a buscar (ej: "e4").
 * @returns {Object | undefined} El objeto pieza si se encuentra, o undefined.
 */
function getPiezaEnCasillaServidor(piezasDelJuego, posicion) {
    if (!piezasDelJuego || !posicion) return undefined;
    return piezasDelJuego.find(p => p.posicionActual === posicion);
}

module.exports = {
    generarPiezasIniciales,
    getPiezaEnCasillaServidor
};
