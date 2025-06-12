// tablero.js
import { coordenadasAPosicion } from './util.js';

export const contenedorTablero = document.getElementById('contenedor_tablero');

export let piezas = [
    // Blancas
    { id: 'TBI', simbolo: '♖', color: 'blanco', posicionOriginal: 'a1', posicionActual: 'a1', tipo: 'torre', haMovido: false, elementoPieza: null },
    { id: 'CBI', simbolo: '♘', color: 'blanco', posicionOriginal: 'b1', posicionActual: 'b1', tipo: 'caballo', elementoPieza: null },
    { id: 'ABI', simbolo: '♗', color: 'blanco', posicionOriginal: 'c1', posicionActual: 'c1', tipo: 'alfil', elementoPieza: null },
    { id: 'DB', simbolo: '♕', color: 'blanco', posicionOriginal: 'd1', posicionActual: 'd1', tipo: 'reina', elementoPieza: null },
    { id: 'RB', simbolo: '♔', color: 'blanco', posicionOriginal: 'e1', posicionActual: 'e1', tipo: 'rey', haMovido: false, elementoPieza: null },
    { id: 'ABD', simbolo: '♗', color: 'blanco', posicionOriginal: 'f1', posicionActual: 'f1', tipo: 'alfil', elementoPieza: null },
    { id: 'CBD', simbolo: '♘', color: 'blanco', posicionOriginal: 'g1', posicionActual: 'g1', tipo: 'caballo', elementoPieza: null },
    { id: 'TBD', simbolo: '♖', color: 'blanco', posicionOriginal: 'h1', posicionActual: 'h1', tipo: 'torre', haMovido: false, elementoPieza: null },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `PB${i+1}`, simbolo: '♙', color: 'blanco', posicionOriginal: `${String.fromCharCode(97 + i)}2`, posicionActual: `${String.fromCharCode(97 + i)}2`, tipo: 'peon', elementoPieza: null })),

    // Negras
    { id: 'TNI', simbolo: '♜', color: 'negro', posicionOriginal: 'a8', posicionActual: 'a8', tipo: 'torre', haMovido: false, elementoPieza: null },
    { id: 'CNI', simbolo: '♞', color: 'negro', posicionOriginal: 'b8', posicionActual: 'b8', tipo: 'caballo', elementoPieza: null },
    { id: 'ANI', simbolo: '♝', color: 'negro', posicionOriginal: 'c8', posicionActual: 'c8', tipo: 'alfil', elementoPieza: null },
    { id: 'DN', simbolo: '♛', color: 'negro', posicionOriginal: 'd8', posicionActual: 'd8', tipo: 'reina', elementoPieza: null },
    { id: 'RN', simbolo: '♚', color: 'negro', posicionOriginal: 'e8', posicionActual: 'e8', tipo: 'rey', haMovido: false, elementoPieza: null },
    { id: 'AND', simbolo: '♝', color: 'negro', posicionOriginal: 'f8', posicionActual: 'f8', tipo: 'alfil', elementoPieza: null },
    { id: 'CND', simbolo: '♞', color: 'negro', posicionOriginal: 'g8', posicionActual: 'g8', tipo: 'caballo', elementoPieza: null },
    { id: 'TND', simbolo: '♜', color: 'negro', posicionOriginal: 'h8', posicionActual: 'h8', tipo: 'torre', haMovido: false, elementoPieza: null },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `PN${i+1}`, simbolo: '♟', color: 'negro', posicionOriginal: `${String.fromCharCode(97 + i)}7`, posicionActual: `${String.fromCharCode(97 + i)}7`, tipo: 'peon', elementoPieza: null })),
].flat();

export function getPiezaEnCasilla(posicion) {
    return piezas.find(p => p.posicionActual === posicion);
}

export function generarTablero(callbackManejarClick) {
    if (!contenedorTablero) {
        console.error("Error en tablero.js: El div 'contenedor_tablero' no fue encontrado en el DOM.");
        return;
    }
    contenedorTablero.innerHTML = '';
    for (let fila = 0; fila < 8; fila++) {
        for (let col = 0; col < 8; col++) {
            const cuadrado = document.createElement('div');
            cuadrado.classList.add('casilla');
            const esSumaImpar = (fila + col) % 2 !== 0;
            cuadrado.classList.add(esSumaImpar ? 'negra' : 'blanca');
            const posicionStr = coordenadasAPosicion({ fila, columna: col });
            if (posicionStr) {
               cuadrado.id = posicionStr;
               cuadrado.dataset.posicion = posicionStr;
               if (callbackManejarClick && typeof callbackManejarClick === 'function') {
                   cuadrado.addEventListener('click', () => callbackManejarClick(cuadrado));
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
            const casillaEl = document.getElementById(p.posicionActual);
            if (casillaEl) {
                casillaEl.innerHTML = '';
                const piezaEl = document.createElement('span');
                piezaEl.classList.add('pieza-simbolo');
                piezaEl.classList.add(p.color === 'blanco' ? 'simbolo-blanco' : 'simbolo-negro');
                piezaEl.textContent = p.simbolo;
                casillaEl.dataset.piezaId = p.id;
                casillaEl.appendChild(piezaEl);
                p.elementoPieza = piezaEl;
            } else {
                 console.warn(`Casilla DOM con ID ${p.posicionActual} no encontrada para la pieza ${p.id}. La pieza no se mostrará.`);
            }
        }
    });
}
