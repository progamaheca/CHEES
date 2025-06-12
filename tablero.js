// tablero.js (modificado para dibujar piezas desde un array dado)
import { coordenadasAPosicion } from './util.js';

export const contenedorTablero = document.getElementById('contenedor_tablero');

// Esta variable 'piezas' original puede servir como una plantilla para los datos de las piezas (ID, símbolo, color original),
// pero el estado actual (posicionActual, haMovido) vendrá del servidor.
export const piezasBaseOriginales = [
    // Blancas
    { id: 'TBI', simbolo: '♖', color: 'blanco', posicionOriginal: 'a1', tipo: 'torre' }, { id: 'CBI', simbolo: '♘', color: 'blanco', posicionOriginal: 'b1', tipo: 'caballo' }, { id: 'ABI', simbolo: '♗', color: 'blanco', posicionOriginal: 'c1', tipo: 'alfil' }, { id: 'DB', simbolo: '♕', color: 'blanco', posicionOriginal: 'd1', tipo: 'reina' }, { id: 'RB', simbolo: '♔', color: 'blanco', posicionOriginal: 'e1', tipo: 'rey' }, { id: 'ABD', simbolo: '♗', color: 'blanco', posicionOriginal: 'f1', tipo: 'alfil' }, { id: 'CBD', simbolo: '♘', color: 'blanco', posicionOriginal: 'g1', tipo: 'caballo' }, { id: 'TBD', simbolo: '♖', color: 'blanco', posicionOriginal: 'h1', tipo: 'torre' },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `PB${i+1}`, simbolo: '♙', color: 'blanco', posicionOriginal: `${String.fromCharCode(97 + i)}2`, tipo: 'peon' })),
    // Negras
    { id: 'TNI', simbolo: '♜', color: 'negro', posicionOriginal: 'a8', tipo: 'torre' }, { id: 'CNI', simbolo: '♞', color: 'negro', posicionOriginal: 'b8', tipo: 'caballo' }, { id: 'ANI', simbolo: '♝', color: 'negro', posicionOriginal: 'c8', tipo: 'alfil' }, { id: 'DN', simbolo: '♛', color: 'negro', posicionOriginal: 'd8', tipo: 'reina' }, { id: 'RN', simbolo: '♚', color: 'negro', posicionOriginal: 'e8', tipo: 'rey' }, { id: 'AND', simbolo: '♝', color: 'negro', posicionOriginal: 'f8', tipo: 'alfil' }, { id: 'CND', simbolo: '♞', color: 'negro', posicionOriginal: 'g8', tipo: 'caballo' }, { id: 'TND', simbolo: '♜', color: 'negro', posicionOriginal: 'h8', tipo: 'torre' },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `PN${i+1}`, simbolo: '♟', color: 'negro', posicionOriginal: `${String.fromCharCode(97 + i)}7`, tipo: 'peon' })),
].flat();

// Ya no se exporta 'piezas' como el estado global del tablero.
// Se exporta 'piezasBaseOriginales' si se necesita para consulta de símbolos/IDs.

export function getPiezaBasePorId(id) {
    return piezasBaseOriginales.find(p => p.id === id);
}

export function generarTableroVisual(callbackManejarClick) {
    if (!contenedorTablero) {
        console.error("Error en tablero.js: El div 'contenedor_tablero' no fue encontrado.");
        return;
    }
    contenedorTablero.innerHTML = ''; // Limpiar tablero anterior
    for (let fila = 0; fila < 8; fila++) {
        for (let col = 0; col < 8; col++) {
            const cuadrado = document.createElement('div');
            cuadrado.classList.add('casilla');
            cuadrado.classList.add((fila + col) % 2 !== 0 ? 'negra' : 'blanca');
            const posicionStr = coordenadasAPosicion({ fila, columna: col });
            if (posicionStr) {
               cuadrado.id = posicionStr;
               cuadrado.dataset.posicion = posicionStr;
               if (callbackManejarClick && typeof callbackManejarClick === 'function') {
                   cuadrado.addEventListener('click', () => callbackManejarClick(cuadrado));
               }
            }
            contenedorTablero.appendChild(cuadrado);
        }
    }
    console.log("Tablero visual generado.");
}

/**
 * Dibuja las piezas en el tablero DOM basándose en un array de piezas del servidor.
 * @param {Array<Object>} piezasDelServidor Array de objetos pieza con { id, simbolo, color, posicionActual }
 */
export function dibujarTableroYPiezas(piezasDelServidor) {
    if (!contenedorTablero) {
        console.error("Error en dibujarTableroYPiezas: 'contenedor_tablero' no encontrado.");
        return;
    }
    // Limpiar todas las piezas existentes del tablero
    document.querySelectorAll('.casilla .pieza-simbolo').forEach(piezaVisualElemento => piezaVisualElemento.remove());
    // Limpiar los data-pieza-id de las casillas
    contenedorTablero.querySelectorAll('.casilla').forEach(casilla => delete casilla.dataset.piezaId);

    if (!piezasDelServidor) {
        console.warn("dibujarTableroYPiezas: piezasDelServidor es null o undefined.");
        return;
    }

    piezasDelServidor.forEach(piezaServidor => {
        if (piezaServidor.posicionActual) { // Solo dibujar piezas que están en el tablero
            const casillaEl = document.getElementById(piezaServidor.posicionActual);
            if (casillaEl) {
                // Si ya hay algo (no debería, pero por si acaso), limpiar
                // casillaEl.innerHTML = ''; No es necesario por el querySelectorAll().remove() de arriba

                const piezaEl = document.createElement('span');
                piezaEl.classList.add('pieza-simbolo');
                // El color del texto de la pieza (blanco/negro) se maneja por CSS basado en la clase del padre si es necesario,
                // o podemos añadir clases específicas aquí.
                piezaEl.classList.add(piezaServidor.color === 'blanco' ? 'simbolo-blanco' : 'simbolo-negro');
                piezaEl.textContent = piezaServidor.simbolo; // El servidor DEBE enviar el símbolo.

                casillaEl.dataset.piezaId = piezaServidor.id; // Guardar ID de la pieza en la casilla
                casillaEl.appendChild(piezaEl);
            } else {
                 console.warn(`Casilla DOM con ID ${piezaServidor.posicionActual} no encontrada para la pieza ${piezaServidor.id}.`);
            }
        }
    });
}

// La función getPiezaEnCasilla original dependía del array global 'piezas'.
// Para el cliente, si necesita obtener información de una pieza en una casilla DESPUÉS de que el servidor
// haya enviado el estado, debería consultar el 'currentGameState.piezas' en main.js.
// Por tanto, esta función se elimina o se replantea para tomar el array de piezas como argumento.
// De momento, la eliminamos de la exportación para evitar confusión.
/*
export function getPiezaEnCasilla(posicion) {
    // ESTA VERSIÓN YA NO ES VÁLIDA PARA EL ESTADO GLOBAL DEL CLIENTE
    // return piezas.find(p => p.posicionActual === posicion);
    console.warn("getPiezaEnCasilla de tablero.js no debe usarse para el estado actual del juego. Consultar gameState de main.js");
    return null;
}
*/
// La función inicializarPiezasEnTableroDOM se reemplaza por dibujarTableroYPiezas.
// Ya no se exporta arrayDePiezasGlobal.
