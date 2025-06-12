// tablero.js
import { coordenadasAPosicion } from './util.js';

export const contenedorTablero = document.getElementById('contenedor_tablero');

export let piezas = [
    // Blancas (fila del sistema de coordenadas: 7 es '1', 6 es '2')
    { id: 'TBI', simbolo: '♖', color: 'blanco', posicionOriginal: 'a1', posicionActual: 'a1', tipo: 'torre', elementoPieza: null },
    { id: 'CBI', simbolo: '♘', color: 'blanco', posicionOriginal: 'b1', posicionActual: 'b1', tipo: 'caballo', elementoPieza: null },
    { id: 'ABI', simbolo: '♗', color: 'blanco', posicionOriginal: 'c1', posicionActual: 'c1', tipo: 'alfil', elementoPieza: null },
    { id: 'DB', simbolo: '♕', color: 'blanco', posicionOriginal: 'd1', posicionActual: 'd1', tipo: 'reina', elementoPieza: null },
    { id: 'RB', simbolo: '♔', color: 'blanco', posicionOriginal: 'e1', posicionActual: 'e1', tipo: 'rey', elementoPieza: null },
    { id: 'ABD', simbolo: '♗', color: 'blanco', posicionOriginal: 'f1', posicionActual: 'f1', tipo: 'alfil', elementoPieza: null },
    { id: 'CBD', simbolo: '♘', color: 'blanco', posicionOriginal: 'g1', posicionActual: 'g1', tipo: 'caballo', elementoPieza: null },
    { id: 'TBD', simbolo: '♖', color: 'blanco', posicionOriginal: 'h1', posicionActual: 'h1', tipo: 'torre', elementoPieza: null },
    // Generación corregida de peones blancos
    ...Array.from({ length: 8 }, (_, i) => ({ id: `PB${i+1}`, simbolo: '♙', color: 'blanco', posicionOriginal: `${String.fromCharCode(97 + i)}2`, posicionActual: `${String.fromCharCode(97 + i)}2`, tipo: 'peon', elementoPieza: null })),

    // Negras (fila del sistema de coordenadas: 0 es '8', 1 es '7')
    { id: 'TNI', simbolo: '♜', color: 'negro', posicionOriginal: 'a8', posicionActual: 'a8', tipo: 'torre', elementoPieza: null },
    { id: 'CNI', simbolo: '♞', color: 'negro', posicionOriginal: 'b8', posicionActual: 'b8', tipo: 'caballo', elementoPieza: null },
    { id: 'ANI', simbolo: '♝', color: 'negro', posicionOriginal: 'c8', posicionActual: 'c8', tipo: 'alfil', elementoPieza: null },
    { id: 'DN', simbolo: '♛', color: 'negro', posicionOriginal: 'd8', posicionActual: 'd8', tipo: 'reina', elementoPieza: null },
    { id: 'RN', simbolo: '♚', color: 'negro', posicionOriginal: 'e8', posicionActual: 'e8', tipo: 'rey', elementoPieza: null },
    { id: 'AND', simbolo: '♝', color: 'negro', posicionOriginal: 'f8', posicionActual: 'f8', tipo: 'alfil', elementoPieza: null },
    { id: 'CND', simbolo: '♞', color: 'negro', posicionOriginal: 'g8', posicionActual: 'g8', tipo: 'caballo', elementoPieza: null },
    { id: 'TND', simbolo: '♜', color: 'negro', posicionOriginal: 'h8', posicionActual: 'h8', tipo: 'torre', elementoPieza: null },
    // Generación corregida de peones negros
    ...Array.from({ length: 8 }, (_, i) => ({ id: `PN${i+1}`, simbolo: '♟', color: 'negro', posicionOriginal: `${String.fromCharCode(97 + i)}7`, posicionActual: `${String.fromCharCode(97 + i)}7`, tipo: 'peon', elementoPieza: null })),
].flat(); // Aplanar el array para que los peones estén en el mismo nivel

export function getPiezaEnCasilla(posicion) {
    return piezas.find(p => p.posicionActual === posicion);
}

export function generarTablero(callbackManejarClick) {
    if (!contenedorTablero) {
        console.error("Error en tablero.js: El div 'contenedor_tablero' no fue encontrado en el DOM.");
        return;
    }
    contenedorTablero.innerHTML = '';
    // En nuestro sistema de coordenadas: fila 0 es la fila '8' del tablero, fila 7 es la fila '1'.
    // Columna 0 es 'a', columna 7 es 'h'.
    for (let fila = 0; fila < 8; fila++) {
        for (let col = 0; col < 8; col++) {
            const cuadrado = document.createElement('div');
            cuadrado.classList.add('casilla');

            // a1 (fila 7, col 0) es negra. Suma (7+0)=7 (impar).
            // h8 (fila 0, col 7) es negra. Suma (0+7)=7 (impar).
            // a8 (fila 0, col 0) es blanca. Suma (0+0)=0 (par).
            // Si (fila + col) es par, la casilla es blanca. Si es impar, es negra.
            const esSumaPar = (fila + col) % 2 === 0;
            cuadrado.classList.add(esSumaPar ? 'blanca' : 'negra'); // CSS usa .blanca y .negra

            const posicionStr = coordenadasAPosicion({ fila, columna: col });
            if (posicionStr) {
               cuadrado.id = posicionStr; // ID de la casilla es su notación algebraica
               cuadrado.dataset.posicion = posicionStr;
               if (callbackManejarClick && typeof callbackManejarClick === 'function') {
                   cuadrado.addEventListener('click', () => callbackManejarClick(cuadrado)); // Pasar el elemento de la casilla
               }
            } else {
                console.error(`Error en generarTablero: coordenadasAPosicion devolvió null para fila ${fila}, col ${col}`);
            }
            contenedorTablero.appendChild(cuadrado);
        }
    }
}

export function inicializarPiezasEnTableroDOM() {
    if (!contenedorTablero) {
        console.error("Error en tablero.js: El div 'contenedor_tablero' no fue encontrado al inicializar piezas.");
        return;
    }

    document.querySelectorAll('.casilla .pieza-simbolo').forEach(piezaVisualElemento => piezaVisualElemento.remove());

    piezas.forEach(p => {
        p.elementoPieza = null;
        if (p.posicionActual) {
            const casillaEl = document.getElementById(p.posicionActual); // Casillas tienen ID "a1", "h8", etc.
            if (casillaEl) {
                // Limpiar contenido previo de la casilla (por si acaso, aunque generarTablero ya lo hace)
                casillaEl.innerHTML = '';

                const piezaEl = document.createElement('span');
                piezaEl.classList.add('pieza-simbolo'); // Clase genérica para piezas
                piezaEl.classList.add(p.color === 'blanco' ? 'simbolo-blanco' : 'simbolo-negro');
                piezaEl.textContent = p.simbolo;
                // Guardar el ID de la pieza en el dataset de la casilla para referencia en manejarClickCasilla
                casillaEl.dataset.piezaId = p.id;

                casillaEl.appendChild(piezaEl);
                p.elementoPieza = piezaEl;
            } else {
                 console.warn(`Casilla DOM con ID ${p.posicionActual} no encontrada para la pieza ${p.id}. La pieza no se mostrará.`);
            }
        }
    });
}
