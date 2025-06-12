// ia.js
// Este archivo contendrá la lógica para la Inteligencia Artificial del juego.

import { getTodosMovimientosLegalesPosibles } from './movimientos_validaciones.js';
// Posiblemente necesitemos acceso al array de piezas si la IA necesita evaluar el tablero directamente.
// import { piezas } from './tablero.js';

/**
 * Elige un movimiento para la IA.
 * Por ahora, seleccionará un movimiento legal al azar.
 *
 * @param {string} colorIa El color de las piezas que controla la IA ('blanco' or 'negro').
 * @param {Array} piezasActuales Una copia o referencia al array global de piezas para conocer el estado del tablero.
 * @returns {object|null} Un objeto representando el movimiento { piezaId, casillaOrigen, casillaDestino } o null si no hay movimientos.
 */
export function elegirMovimientoIA(colorIa, piezasActuales) {
    // Nota: 'piezasActuales' podría no ser necesario si 'getTodosMovimientosLegalesPosibles'
    // ya utiliza la versión más actualizada del array 'piezas' del módulo 'tablero.js'.
    // Esto dependerá de cómo se gestione el estado y se pase a esta función.

    console.log(`IA (${colorIa}) está pensando...`);

    const movimientosPosibles = getTodosMovimientosLegalesPosibles(colorIa);

    if (movimientosPosibles.length === 0) {
        console.log(`IA (${colorIa}) no tiene movimientos legales.`);
        return null; // Jaque mate o ahogado
    }

    // Seleccionar un movimiento al azar
    const indiceAleatorio = Math.floor(Math.random() * movimientosPosibles.length);
    const movimientoSeleccionado = movimientosPosibles[indiceAleatorio];

    console.log(`IA (${colorIa}) eligió: mover pieza ${movimientoSeleccionado.piezaId} de ${movimientoSeleccionado.casillaOrigen} a ${movimientoSeleccionado.casillaDestino}`);

    return movimientoSeleccionado;
}

// Futuras mejoras:
// - Implementar heurísticas para elegir mejores movimientos (capturar, avanzar, etc.).
// - Considerar el algoritmo Minimax para una IA más avanzada.
