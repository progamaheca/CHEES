// movimientos_validaciones.js
import { posicionACoordenadas, coordenadasAPosicion } from './util.js';
// Importar getPiezaEnCasilla y piezas desde tablero.js
import { getPiezaEnCasilla, piezas as arrayDePiezas } from './tablero.js';
// Importar reglaJaqueHabilitada desde config.js
import { reglaJaqueHabilitada } from './config.js';

// --- Funciones de Validación de Movimiento de Piezas ---

export function esMovimientoValidoPeon(pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    const piezaEnDestino = getPiezaEnCasilla(casillaDestinoStr);
    const deltaCol = destino.columna - origen.columna;
    const deltaFila = destino.fila - origen.fila;

    if (pieza.color === 'blanco') { // Blancas se mueven de fila mayor a menor (ej: 6 a 5, deltaFila = -1)
        if (deltaCol === 0 && !piezaEnDestino) { // Movimiento vertical
            if (deltaFila === -1) return true;
            if (deltaFila === -2 && origen.fila === 6 && !getPiezaEnCasilla(coordenadasAPosicion({ fila: origen.fila - 1, columna: origen.columna }))) return true;
        }
        if (Math.abs(deltaCol) === 1 && deltaFila === -1 && piezaEnDestino && piezaEnDestino.color === 'negro') return true; // Captura
    } else { // Piezas negras se mueven de fila menor a mayor (ej: 1 a 2, deltaFila = 1)
        if (deltaCol === 0 && !piezaEnDestino) { // Movimiento vertical
            if (deltaFila === 1) return true;
            if (deltaFila === 2 && origen.fila === 1 && !getPiezaEnCasilla(coordenadasAPosicion({ fila: origen.fila + 1, columna: origen.columna }))) return true;
        }
        if (Math.abs(deltaCol) === 1 && deltaFila === 1 && piezaEnDestino && piezaEnDestino.color === 'blanco') return true; // Captura
    }
    return false;
}

export function esMovimientoValidoTorre(pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    if (origen.fila === destino.fila && origen.columna === destino.columna) return false; // No se movió
    if (origen.fila !== destino.fila && origen.columna !== destino.columna) return false; // No es horizontal ni vertical

    if (origen.fila === destino.fila) { // Movimiento horizontal
        const colMenor = Math.min(origen.columna, destino.columna);
        const colMayor = Math.max(origen.columna, destino.columna);
        for (let c = colMenor + 1; c < colMayor; c++) {
            if (getPiezaEnCasilla(coordenadasAPosicion({ fila: origen.fila, columna: c }))) return false;
        }
    } else { // Movimiento vertical
        const filaMenor = Math.min(origen.fila, destino.fila);
        const filaMayor = Math.max(origen.fila, destino.fila);
        for (let f = filaMenor + 1; f < filaMayor; f++) {
            if (getPiezaEnCasilla(coordenadasAPosicion({ fila: f, columna: origen.columna }))) return false;
        }
    }
    return true;
}

export function esMovimientoValidoCaballo(pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    const deltaFilaAbs = Math.abs(destino.fila - origen.fila);
    const deltaColAbs = Math.abs(destino.columna - origen.columna);
    return (deltaFilaAbs === 2 && deltaColAbs === 1) || (deltaFilaAbs === 1 && deltaColAbs === 2);
}

export function esMovimientoValidoAlfil(pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    if (origen.fila === destino.fila && origen.columna === destino.columna) return false;
    if (Math.abs(destino.fila - origen.fila) !== Math.abs(destino.columna - origen.columna)) return false;

    const dirFila = Math.sign(destino.fila - origen.fila);
    const dirColumna = Math.sign(destino.columna - origen.columna);
    let filaActual = origen.fila + dirFila;
    let columnaActual = origen.columna + dirColumna;
    while (filaActual !== destino.fila) {
        if (getPiezaEnCasilla(coordenadasAPosicion({ fila: filaActual, columna: columnaActual }))) return false;
        filaActual += dirFila;
        columnaActual += dirColumna;
    }
    return true;
}

export function esMovimientoValidoReina(pieza, casillaOrigenStr, casillaDestinoStr) {
    return esMovimientoValidoTorre(pieza, casillaOrigenStr, casillaDestinoStr) ||
           esMovimientoValidoAlfil(pieza, casillaOrigenStr, casillaDestinoStr);
}

export function esMovimientoValidoRey(pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    if (origen.fila === destino.fila && origen.columna === destino.columna) return false;
    const deltaFilaAbs = Math.abs(destino.fila - origen.fila);
    const deltaColAbs = Math.abs(destino.columna - origen.columna);
    return deltaFilaAbs <= 1 && deltaColAbs <= 1;
}

// --- Funciones de Lógica de Jaque y Jaque Mate ---

export function encontrarPosicionRey(colorRey) {
    const rey = arrayDePiezas.find(p => p.tipo === 'rey' && p.color === colorRey && p.posicionActual);
    return rey ? rey.posicionActual : null;
}

export function getCasillasAtacadasPor(colorAtacante) {
    const casillasAtacadas = new Set();
    const piezasDelAtacante = arrayDePiezas.filter(p => p.color === colorAtacante && p.posicionActual);

    for (const pieza of piezasDelAtacante) {
        const origenStr = pieza.posicionActual;
        const origenCoords = posicionACoordenadas(origenStr);
        if (!origenCoords) continue;

        if (pieza.tipo === 'peon') {
            const dir = (pieza.color === 'blanco') ? -1 : 1;
            if (origenCoords.columna > 0) { const c = coordenadasAPosicion({ fila: origenCoords.fila + dir, columna: origenCoords.columna - 1 }); if (c) casillasAtacadas.add(c); }
            if (origenCoords.columna < 7) { const c = coordenadasAPosicion({ fila: origenCoords.fila + dir, columna: origenCoords.columna + 1 }); if (c) casillasAtacadas.add(c); }
        } else if (pieza.tipo === 'caballo') {
            const movimientosCaballo = [ { df: -2, dc: -1 }, { df: -2, dc: 1 }, { df: -1, dc: -2 }, { df: -1, dc: 2 }, { df: 1, dc: -2 }, { df: 1, dc: 2 }, { df: 2, dc: -1 }, { df: 2, dc: 1 } ];
            movimientosCaballo.forEach(mov => { const dF = origenCoords.fila+mov.df; const dC = origenCoords.columna+mov.dc; if(dF>=0&&dF<8&&dC>=0&&dC<8){casillasAtacadas.add(coordenadasAPosicion({fila:dF,columna:dC}));}});
        } else if (pieza.tipo === 'rey') {
            const movimientosRey = [ { df: -1, dc: -1 }, { df: -1, dc: 0 }, { df: -1, dc: 1 }, { df: 0, dc: -1 }, { df: 0, dc: 1 }, { df: 1, dc: -1 }, { df: 1, dc: 0 }, { df: 1, dc: 1 } ];
            movimientosRey.forEach(mov => { const dF = origenCoords.fila+mov.df; const dC = origenCoords.columna+mov.dc; if(dF>=0&&dF<8&&dC>=0&&dC<8){casillasAtacadas.add(coordenadasAPosicion({fila:dF,columna:dC}));}});
        } else {
            let dirs = [];
            if(pieza.tipo==='torre')dirs=[{df:0,dc:1},{df:0,dc:-1},{df:1,dc:0},{df:-1,dc:0}]; else if(pieza.tipo==='alfil')dirs=[{df:1,dc:1},{df:1,dc:-1},{df:-1,dc:1},{df:-1,dc:-1}]; else if(pieza.tipo==='reina')dirs=[{df:0,dc:1},{df:0,dc:-1},{df:1,dc:0},{df:-1,dc:0},{df:1,dc:1},{df:1,dc:-1},{df:-1,dc:1},{df:-1,dc:-1}];
            dirs.forEach(dir=>{for(let i=1;i<8;i++){const dF=origenCoords.fila+dir.df*i; const dC=origenCoords.columna+dir.dc*i; if(dF>=0&&dF<8&&dC>=0&&dC<8){const cAStr=coordenadasAPosicion({fila:dF,columna:dC}); casillasAtacadas.add(cAStr); if(getPiezaEnCasilla(cAStr))break;}else break;}});
        }
    }
    return Array.from(casillasAtacadas).filter(pos => pos !== null);
}

export function estaEnJaque(colorRey) {
    if (!reglaJaqueHabilitada) return false;
    const pR = encontrarPosicionRey(colorRey);
    if (!pR) return false;
    const cA = (colorRey === 'blanco' ? 'negro' : 'blanco');
    return getCasillasAtacadasPor(cA).includes(pR);
}

export function getMovimientosLegalesParaPieza(piezaConsiderada, casillaOrigenActualStr) {
    const movimientosLegalesParaEstaPieza = [];
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const casillaDestinoStr = coordenadasAPosicion({ fila: i, columna: j });
            if (casillaOrigenActualStr === casillaDestinoStr) continue;
            let esMovimientoTipoValido = false;
            const piezaEnDestinoEval = getPiezaEnCasilla(casillaDestinoStr); // Usa la importada de tablero.js
            if (piezaEnDestinoEval && piezaEnDestinoEval.color === piezaConsiderada.color) {
                esMovimientoTipoValido = false;
            } else {
                if (piezaConsiderada.tipo === 'peon') esMovimientoTipoValido = esMovimientoValidoPeon(piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'torre') esMovimientoTipoValido = esMovimientoValidoTorre(piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'caballo') esMovimientoTipoValido = esMovimientoValidoCaballo(piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'alfil') esMovimientoTipoValido = esMovimientoValidoAlfil(piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'reina') esMovimientoTipoValido = esMovimientoValidoReina(piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'rey') esMovimientoTipoValido = esMovimientoValidoRey(piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
            }
            if (esMovimientoTipoValido) {
                if (!reglaJaqueHabilitada) {
                    movimientosLegalesParaEstaPieza.push(casillaDestinoStr);
                    continue;
                }
                const idPiezaCapturada = piezaEnDestinoEval ? piezaEnDestinoEval.id : null;
                const posicionOriginalPiezaMovida = piezaConsiderada.posicionActual; // Guardar antes de simular
                piezaConsiderada.posicionActual = casillaDestinoStr;
                if (idPiezaCapturada) { const pCapSim = arrayDePiezas.find(p => p.id === idPiezaCapturada); if (pCapSim) pCapSim.posicionActual = null; }

                let autoJaque = estaEnJaque(piezaConsiderada.color);

                piezaConsiderada.posicionActual = posicionOriginalPiezaMovida; // Revertir
                if (idPiezaCapturada) { const pCapSim = arrayDePiezas.find(p => p.id === idPiezaCapturada); if (pCapSim) pCapSim.posicionActual = casillaDestinoStr; } // Revertir captura

                if (!autoJaque) { movimientosLegalesParaEstaPieza.push(casillaDestinoStr); }
            }
        }
    }
    return movimientosLegalesParaEstaPieza;
}

export function getTodosMovimientosLegalesPosibles(colorJugador) {
    const movimientosLegales = [];
    const piezasDelJugadorActivas = arrayDePiezas.filter(p => p.color === colorJugador && p.posicionActual);
    for (const pieza of piezasDelJugadorActivas) {
        const movimientosParaEstaPieza = getMovimientosLegalesParaPieza(pieza, pieza.posicionActual);
        movimientosParaEstaPieza.forEach(destino => {
            movimientosLegales.push({ piezaId: pieza.id, casillaOrigen: pieza.posicionActual, casillaDestino: destino });
        });
    }
    return movimientosLegales;
}

export function esJaqueMate(colorReyEnJaque) {
    if (!reglaJaqueHabilitada) return false;
    if (!estaEnJaque(colorReyEnJaque)) return false;
    return getTodosMovimientosLegalesPosibles(colorReyEnJaque).length === 0;
}

export function esEmpate(colorJugadorTurno) {
    if (reglaJaqueHabilitada && estaEnJaque(colorJugadorTurno)) return false;
    return getTodosMovimientosLegalesPosibles(colorJugadorTurno).length === 0;
}
