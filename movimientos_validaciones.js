// movimientos_validaciones.js
import { posicionACoordenadas, coordenadasAPosicion } from './util.js';
import { getPiezaEnCasilla, piezas } from './tablero.js';
import { reglaJaqueHabilitada } from './config.js';

// --- Funciones de Validación de Movimiento de Piezas ---

export function esMovimientoValidoPeon(pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    const piezaEnDestino = getPiezaEnCasilla(casillaDestinoStr);
    const deltaCol = destino.columna - origen.columna;
    const deltaFila = destino.fila - origen.fila;

    if (pieza.color === 'blanco') {
        if (deltaCol === 0 && !piezaEnDestino) {
            if (deltaFila === -1) return true;
            if (deltaFila === -2 && origen.fila === 6 && !getPiezaEnCasilla(coordenadasAPosicion({ fila: origen.fila - 1, columna: origen.columna }))) return true;
        }
        if (Math.abs(deltaCol) === 1 && deltaFila === -1 && piezaEnDestino && piezaEnDestino.color === 'negro') return true;
    } else {
        if (deltaCol === 0 && !piezaEnDestino) {
            if (deltaFila === 1) return true;
            if (deltaFila === 2 && origen.fila === 1 && !getPiezaEnCasilla(coordenadasAPosicion({ fila: origen.fila + 1, columna: origen.columna }))) return true;
        }
        if (Math.abs(deltaCol) === 1 && deltaFila === 1 && piezaEnDestino && piezaEnDestino.color === 'blanco') return true;
    }
    return false;
}

export function esMovimientoValidoTorre(pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    if (origen.fila === destino.fila && origen.columna === destino.columna) return false;
    if (origen.fila !== destino.fila && origen.columna !== destino.columna) return false;

    if (origen.fila === destino.fila) {
        const colMenor = Math.min(origen.columna, destino.columna);
        const colMayor = Math.max(origen.columna, destino.columna);
        for (let c = colMenor + 1; c < colMayor; c++) {
            if (getPiezaEnCasilla(coordenadasAPosicion({ fila: origen.fila, columna: c }))) return false;
        }
    } else {
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

export function esMovimientoValidoRey(rey, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);

    if (!origen || !destino) return false;
    // El rey no se movió (esto es importante para la lógica de enroque, donde deltaColAbs es 2)
    // if (origen.fila === destino.fila && origen.columna === destino.columna) return false; // Ya cubierto por delta checks

    const deltaFilaAbs = Math.abs(destino.fila - origen.fila);
    const deltaColAbs = Math.abs(destino.columna - origen.columna);

    // --- LÓGICA DE ENROQUE ---
    if (reglaJaqueHabilitada && !rey.haMovido && deltaFilaAbs === 0 && deltaColAbs === 2) {
        if (estaEnJaque(rey.color)) { // No se puede enrocar si el rey está en jaque
            return false;
        }

        const filaRey = origen.fila; // La fila del rey (0 para negras, 7 para blancas)
        const colorOponente = (rey.color === 'blanco' ? 'negro' : 'blanco');
        const casillasAtacadasPorOponente = getCasillasAtacadasPor(colorOponente);

        let torre, caminoDespejado = true;
        let casillaPasoReyStr; // La casilla por la que el rey "pasa"
        // La casilla destino del rey ya es casillaDestinoStr

        if (destino.columna > origen.columna) { // Enroque corto (O-O), rey se mueve a la derecha
            // Torre de lado h (columna 7 en índice 0-7)
            torre = piezas.find(p => p.color === rey.color && p.tipo === 'torre' &&
                                   p.posicionOriginal === coordenadasAPosicion({fila: filaRey, columna: 7}));
            if (!torre || torre.haMovido) return false;

            // Casillas entre rey y torre (ej: f1, g1 o f8, g8) deben estar vacías
            for (let col = origen.columna + 1; col < 7; col++) { // No incluye la columna de la torre
                if (getPiezaEnCasilla(coordenadasAPosicion({fila: filaRey, columna: col}))) {
                    caminoDespejado = false; break;
                }
            }
            casillaPasoReyStr = coordenadasAPosicion({fila: filaRey, columna: origen.columna + 1}); // f1 o f8
        } else { // Enroque largo (O-O-O), rey se mueve a la izquierda
            // Torre de lado a (columna 0 en índice 0-7)
            torre = piezas.find(p => p.color === rey.color && p.tipo === 'torre' &&
                                   p.posicionOriginal === coordenadasAPosicion({fila: filaRey, columna: 0}));
            if (!torre || torre.haMovido) return false;

            // Casillas entre rey y torre (ej: d1, c1, b1 o d8, c8, b8) deben estar vacías
            for (let col = origen.columna - 1; col > 0; col--) { // No incluye la columna de la torre
                if (getPiezaEnCasilla(coordenadasAPosicion({fila: filaRey, columna: col}))) {
                    caminoDespejado = false; break;
                }
            }
            casillaPasoReyStr = coordenadasAPosicion({fila: filaRey, columna: origen.columna - 1}); // d1 o d8
        }

        if (!caminoDespejado) return false;

        // Casilla de origen, casilla de paso del rey y casilla destino del rey no deben estar atacadas
        // (La casilla origen ya se verifica con estaEnJaque(rey.color) al inicio del enroque)
        if (casillasAtacadasPorOponente.includes(casillaPasoReyStr) ||
            casillasAtacadasPorOponente.includes(casillaDestinoStr)) {
            return false;
        }

        // Si todas las condiciones pasan, el enroque es un movimiento válido del rey
        return true;
    }
    // --- FIN LÓGICA DE ENROQUE ---

    // Movimiento normal del rey (una casilla)
    if (deltaFilaAbs <= 1 && deltaColAbs <= 1) {
        return true;
    }

    return false;
}


// --- Funciones de Lógica de Jaque y Jaque Mate ---
export function encontrarPosicionRey(colorRey) {
    const rey = piezas.find(p => p.tipo === 'rey' && p.color === colorRey && p.posicionActual);
    return rey ? rey.posicionActual : null;
}

export function getCasillasAtacadasPor(colorAtacante) {
    const casillasAtacadas = new Set();
    const piezasDelAtacante = piezas.filter(p => p.color === colorAtacante && p.posicionActual);

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
            const piezaEnDestinoEval = getPiezaEnCasilla(casillaDestinoStr);
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
                const posicionOriginalPiezaMovida = piezaConsiderada.posicionActual;
                piezaConsiderada.posicionActual = casillaDestinoStr;
                if (idPiezaCapturada) { const pCapSim = piezas.find(p => p.id === idPiezaCapturada); if (pCapSim) pCapSim.posicionActual = null; }

                let autoJaque = estaEnJaque(piezaConsiderada.color);

                piezaConsiderada.posicionActual = posicionOriginalPiezaMovida;
                if (idPiezaCapturada) { const pCapSim = piezas.find(p => p.id === idPiezaCapturada); if (pCapSim) pCapSim.posicionActual = casillaDestinoStr; }

                if (!autoJaque) { movimientosLegalesParaEstaPieza.push(casillaDestinoStr); }
            }
        }
    }
    return movimientosLegalesParaEstaPieza;
}

export function getTodosMovimientosLegalesPosibles(colorJugador) {
    const movimientosLegales = [];
    const piezasDelJugadorActivas = piezas.filter(p => p.color === colorJugador && p.posicionActual);
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

export function formatearNotacionMovimiento(pieza, casillaOrigenStr, casillaDestinoStr, esCaptura) {
    let notacion = "";
    const mapTipoALetra = {
        'torre': 'T',
        'caballo': 'C',
        'alfil': 'A',
        'reina': 'D',
        'rey': 'R'
    };

    if (pieza.tipo !== 'peon') {
        notacion += mapTipoALetra[pieza.tipo] || '';
    }

    if (esCaptura) {
        if (pieza.tipo === 'peon') {
            const origenCoords = posicionACoordenadas(casillaOrigenStr);
            if (origenCoords) {
                 notacion += String.fromCharCode('a'.charCodeAt(0) + origenCoords.columna);
            }
        }
        notacion += "x";
    }
    notacion += casillaDestinoStr;
    return notacion;
}
