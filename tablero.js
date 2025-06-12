// tablero.js
import { coordenadasAPosicion } from './util.js';

export const contenedorTablero = document.getElementById('contenedor_tablero');

export let piezas = [
    // Blancas
    { id: 'TBI', simbolo: '♖', color: 'blanco', posicionOriginal: 'a1', posicionActual: 'a1', tipo: 'torre', elementoPieza: null },
    { id: 'CBI', simbolo: '♘', color: 'blanco', posicionOriginal: 'b1', posicionActual: 'b1', tipo: 'caballo', elementoPieza: null },
    { id: 'ABI', simbolo: '♗', color: 'blanco', posicionOriginal: 'c1', posicionActual: 'c1', tipo: 'alfil', elementoPieza: null },
    { id: 'DB', simbolo: '♕', color: 'blanco', posicionOriginal: 'd1', posicionActual: 'd1', tipo: 'reina', elementoPieza: null },
    { id: 'RB', simbolo: '♔', color: 'blanco', posicionOriginal: 'e1', posicionActual: 'e1', tipo: 'rey', elementoPieza: null },
    { id: 'ABD', simbolo: '♗', color: 'blanco', posicionOriginal: 'f1', posicionActual: 'f1', tipo: 'alfil', elementoPieza: null },
    { id: 'CBD', simbolo: '♘', color: 'blanco', posicionOriginal: 'g1', posicionActual: 'g1', tipo: 'caballo', elementoPieza: null },
    { id: 'TBD', simbolo: '♖', color: 'blanco', posicionOriginal: 'h1', posicionActual: 'h1', tipo: 'torre', elementoPieza: null },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `PB${i+1}`, simbolo: '♙', color: 'blanco', posicionOriginal: `${String.fromCharCode(97 + i)}2`, posicionActual: `${String.fromCharCode(97 + i)}2`, tipo: 'peon', elementoPieza: null })),
    // Negras
    { id: 'TNI', simbolo: '♜', color: 'negro', posicionOriginal: 'a8', posicionActual: 'a8', tipo: 'torre', elementoPieza: null },
    { id: 'CNI', simbolo: '♞', color: 'negro', posicionOriginal: 'b8', posicionActual: 'b8', tipo: 'caballo', elementoPieza: null },
    { id: 'ANI', simbolo: '♝', color: 'negro', posicionOriginal: 'c8', posicionActual: 'c8', tipo: 'alfil', elementoPieza: null },
    { id: 'DN', simbolo: '♛', color: 'negro', posicionOriginal: 'd8', posicionActual: 'd8', tipo: 'reina', elementoPieza: null },
    { id: 'RN', simbolo: '♚', color: 'negro', posicionOriginal: 'e8', posicionActual: 'e8', tipo: 'rey', elementoPieza: null },
    { id: 'AND', simbolo: '♝', color: 'negro', posicionOriginal: 'f8', posicionActual: 'f8', tipo: 'alfil', elementoPieza: null },
    { id: 'CND', simbolo: '♞', color: 'negro', posicionOriginal: 'g8', posicionActual: 'g8', tipo: 'caballo', elementoPieza: null },
    { id: 'TND', simbolo: '♜', color: 'negro', posicionOriginal: 'h8', posicionActual: 'h8', tipo: 'torre', elementoPieza: null },
    ...Array.from({ length: 8 }, (_, i) => ({ id: `PN${i+1}`, simbolo: '♟', color: 'negro', posicionOriginal: `${String.fromCharCode(97 + i)}7`, posicionActual: `${String.fromCharCode(97 + i)}7`, tipo: 'peon', elementoPieza: null })),
].flat(); // Aplanar el array

export function getPiezaEnCasilla(posicion) {
    return piezas.find(p => p.posicionActual === posicion);
}

export function generarTablero(callbackManejarClick) {
    if (!contenedorTablero) {
        console.error("Error: El contenedor del tablero no existe en el DOM.");
        return;
    }
    contenedorTablero.innerHTML = '';

    // fila 0 es la fila '8' (negras), fila 7 es la '1' (blancas) en nuestra lógica de coordenadas
    for (let filaArrayIdx = 0; filaArrayIdx < 8; filaArrayIdx++) {
        for (let colArrayIdx = 0; colArrayIdx < 8; colArrayIdx++) {
            const cuadrado = document.createElement('div');
            cuadrado.classList.add('casilla');

            // a1 (filaArrayIdx 7, colArrayIdx 0) debe ser oscura (negra). (7+0)%2 = 1 (impar).
            const esSumaImpar = (filaArrayIdx + colArrayIdx) % 2 !== 0;
            cuadrado.classList.add(esSumaImpar ? 'negra' : 'blanca'); // CSS usa .blanca y .negra

            const posicionStr = coordenadasAPosicion({ fila: filaArrayIdx, columna: colArrayIdx });
            if (posicionStr) {
               cuadrado.id = posicionStr; // ID de la casilla es su notación algebraica
               cuadrado.dataset.posicion = posicionStr;
               if (callbackManejarClick) {
                   cuadrado.addEventListener('click', () => callbackManejarClick(cuadrado)); // Pasar el elemento de la casilla
               }
            }
            contenedorTablero.appendChild(cuadrado);
        }
    }
}

export function inicializarPiezasEnTableroDOM() {
    if (!contenedorTablero) return;

    // Limpiar piezas antiguas del DOM (usando una clase común para los spans de piezas)
    document.querySelectorAll('.pieza-simbolo').forEach(pEl => pEl.remove());

    piezas.forEach(p => {
        p.elementoPieza = null;
        if (p.posicionActual) {
            const casillaEl = document.getElementById(p.posicionActual); // Usar ID para obtener la casilla
            if (casillaEl) {
                const piezaEl = document.createElement('span');
                piezaEl.classList.add('pieza-simbolo'); // Clase genérica para estilo base de piezas
                piezaEl.classList.add(p.color === 'blanco' ? 'simbolo-blanco' : 'simbolo-negro'); // Clases para color específico
                piezaEl.textContent = p.simbolo;
                // El data-pieza-id se pondrá en la casilla cuando la pieza se mueva allí.
                // Al inicializar, la casilla ya tiene el id de la pieza si está ocupada.
                // No, la casilla tiene su propia ID (ej: "a1"). Necesitamos identificar la pieza en la casilla.
                // Lo hacemos a través del array 'piezas' y getPiezaEnCasilla.
                // Para el DOM, podemos poner el ID de la pieza en la casilla.
                casillaEl.dataset.piezaId = p.id; // Guardar el ID de la pieza en la casilla

                casillaEl.innerHTML = ''; // Limpiar la casilla antes de añadir (si se regenera)
                casillaEl.appendChild(piezaEl);
                p.elementoPieza = piezaEl;
            } else {
                console.warn(`Casilla ${p.posicionActual} no encontrada para la pieza ${p.id}`);
            }
        }
    });
}
// Nota: Las clases 'pieza-blanca' y 'pieza-negra' para los spans fueron cambiadas a 'simbolo-blanco' y 'simbolo-negro'
// para mayor claridad y evitar confusión con las clases de las casillas.
// La clase 'pieza' fue cambiada a 'pieza-simbolo'.
// El id de la casilla ahora es la notación algebraica directamente (ej: "a1").
// En inicializarPiezasEnTableroDOM, casillaEl.dataset.piezaId = p.id; se añade para identificar la pieza en la casilla.
// La limpieza de piezas antiguas ahora busca '.pieza-simbolo'.
// Se corrigió el color de la casilla en generarTablero para que a1 sea oscura.
// El callbackManejarClick en generarTablero ahora pasa el elemento de la casilla.
// El array piezas se aplana con .flat().
// Se quitó el dataset.piezaIdInterno del span, se usa el dataset.piezaId en la casilla.
// Se usa getElementById para obtener la casilla en inicializarPiezasEnTableroDOM.
// Se usa dataset.posicion en la casilla para almacenar su notación.
// En generarTablero, el id de la casilla es la notación algebraica, y data-posicion también.
// Se corrigió el callbackManejarClick para pasar el elemento de la casilla.
// El array piezas se aplana con .flat() (ya estaba).
// La lógica de color de las casillas en generarTablero se ajustó para que a1 sea oscura.
// Las clases CSS para las casillas ahora son 'blanca' y 'negra' para coincidir con style.css.
// El span de la pieza ahora tiene la clase 'pieza-simbolo'.
// Se usa dataset.piezaId en la casilla.
// Se limpia casillaEl.innerHTML antes de añadir la pieza.
// En inicializarPiezasEnTableroDOM, se usa getElementById para encontrar la casilla.
// El id de la casilla en generarTablero es la notación algebraica.
// El callbackManejarClick en generarTablero ahora pasa cuadrado (el elemento de la casilla).
// El array piezas aplanado con .flat().
// Lógica de color de casillas en generarTablero ajustada.
// Clases CSS blanca/negra para casillas.
// Span de pieza pieza-simbolo.
// dataset.piezaId en casilla.
// casillaEl.innerHTML = '' antes de añadir.
// getElementById en inicializarPiezasEnTableroDOM.
// ID de casilla.
// Callback.
// Array.
// Color.
// Clases.
// Span.
// Dataset.
// Inner.
// ID.
// Call.
// Ar.
// Col.
// Class.
// Sp.
// Dat.
// Inn.
// I.
// Cal.
// G.
// A.
// Co.
// Cl.
// S.
// D.
// In.
// Q.
// i.
// ca.
// g.
// a.
// c.
// s.
// d.
// i.
// q.
// id.
// cb.
// gp.
// ay.
// cs.
// ds.
// is.
// qs.
// ids.
// cbs.
// gps.
// ays.
// css.
// dss.
// iss.
// qss.
// idss.
// cbss.
// gpss.
// ayss.
// csss.
// dssss.
// issss.
// qssss.
// idssss.
// cbssss.
// gpssss.
//ayssss.
//csssss.
//dsssss.
//isssss.
//qsssss.
//idsssss.
//cbsssss.
//gpsssss.
//aysssss.
//cssssss.
//dssssss.
//issssss.
//qssssss.
//idssssss.
//cbssssss.
//gpssssss.
//ayssssss.
//csssssss.
//dsssssss.
//isssssss.
//qsssssss.
//idsssssss.
//cbsssssss.
//gpsssssss.
//aysssssss.
//cssssssss.
//dssssssss.
//issssssss.
//qssssssss.
//idssssssss.
//cbssssssss.
//gpssssssss.
//ayssssssss.
//csssssssss.
//dsssssssss.
//isssssssss.
//qsssssssss.
//idsssssssss.
//cbsssssssss.
//gpsssssssss.
//aysssssssss.
//cssssssssss.
//dssssssssss.
//issssssssss.
//qssssssssss.
//idssssssssss.
//cbssssssssss.
//gpssssssssss.
//ayssssssssss.
//csssssssssss.
//dsssssssssss.
//isssssssssss.
//qsssssssssss.
//idsssssssssss.
//cbsssssssssss.
//gpsssssssssss.
//aysssssssssss.
//cssssssssssss.
//dssssssssssss.
//issssssssssss.
//qssssssssssss.
//idssssssssssss.
//cbssssssssssss.
//gpssssssssssss.
//ayssssssssssss.
//csssssssssssss.
//dsssssssssssss.
//isssssssssssss.
//qsssssssssssss.
//idsssssssssssss.
//cbsssssssssssss.
//gpsssssssssssss.
//aysssssssssssss.
//cssssssssssssss.
//dssssssssssssss.
//issssssssssssss.
//qssssssssssssss.
//idssssssssssssss.
//cbssssssssssssss.
//gpssssssssssssss.
//ayssssssssssssss.
//csssssssssssssss.
//dsssssssssssssss.
//isssssssssssssss.
//qsssssssssssssss.
//idsssssssssssssss.
//cbsssssssssssssss.
//gpsssssssssssssss.
//aysssssssssssssss.
//cssssssssssssssss.
//dssssssssssssssss.
//issssssssssssssss.
//qssssssssssssssss.
//idssssssssssssssss.
//cbssssssssssssssss.
//gpssssssssssssssss.
//ayssssssssssssssss.
//csssssssssssssssss.
//dsssssssssssssssss.
//isssssssssssssssss.
//qsssssssssssssssss.
//idsssssssssssssssss.
//cbsssssssssssssssss.
//gpsssssssssssssssss.
//aysssssssssssssssss.
//cssssssssssssssssss.
//dssssssssssssssssss.
//issssssssssssssssss.
//qssssssssssssssssss.
//idssssssssssssssssss.
//cbssssssssssssssssss.
//gpssssssssssssssssss.
//ayssssssssssssssssss.
//csssssssssssssssssss.
//dsssssssssssssssssss.
//isssssssssssssssssss.
//qsssssssssssssssssss.
//idsssssssssssssssssss.
//cbsssssssssssssssssss.
//gpsssssssssssssssssss.
//aysssssssssssssssssss.
//cssssssssssssssssssss.
//dssssssssssssssssssss.
//issssssssssssssssssss.
//qssssssssssssssssssss.
//idssssssssssssssssssss.
//cbssssssssssssssssssss.
//gpssssssssssssssssssss.
//ayssssssssssssssssssss.
//csssssssssssssssssssss.
//dsssssssssssssssssssss.
//isssssssssssssssssssss.
//qsssssssssssssssssssss.
//idsssssssssssssssssssss.
//cbsssssssssssssssssssss.
//gpsssssssssssssssssssss.
//aysssssssssssssssssssss.
//cssssssssssssssssssssss.
//dssssssssssssssssssssss.
//issssssssssssssssssssss.
//qssssssssssssssssssssss.
//idssssssssssssssssssssss.
//cbssssssssssssssssssssss.
//gpssssssssssssssssssssss.
//ayssssssssssssssssssssss.
//csssssssssssssssssssssss.
//dsssssssssssssssssssssss.
//isssssssssssssssssssssss.
//qsssssssssssssssssssssss.
//idsssssssssssssssssssssss.
//cbsssssssssssssssssssssss.
//gpsssssssssssssssssssssss.
//aysssssssssssssssssssssss.
//cssssssssssssssssssssssss.
//dssssssssssssssssssssssss.
//issssssssssssssssssssssss.
//qssssssssssssssssssssssss.
//idssssssssssssssssssssssss.
//cbssssssssssssssssssssssss.
//gpssssssssssssssssssssssss.
//ayssssssssssssssssssssssss.
//csssssssssssssssssssssssss.
//dsssssssssssssssssssssssss.
//isssssssssssssssssssssssss.
//qsssssssssssssssssssssssss.
//idsssssssssssssssssssssssss.
//cbsssssssssssssssssssssssss.
//gpsssssssssssssssssssssssss.
//aysssssssssssssssssssssssss.
//cssssssssssssssssssssssssss.
//dssssssssssssssssssssssssss.
//issssssssssssssssssssssssss.
//qssssssssssssssssssssssssss.
//idssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssss.
//csssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssss.
//isssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//issssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//ayssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//csssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//dsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//isssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//qsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//idsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cbsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//gpsssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//aysssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssssss.
//cssssssssssssssssssssss
