// validacionesServidor.js (CommonJS)
const { posicionACoordenadas, coordenadasAPosicion } = require('./utilServidor');
const { getPiezaEnCasillaServidor } = require('./tableroServidor'); // Usar la versión del servidor

// NOTA: La variable 'piezas' global del cliente ya no se usa directamente.
// En su lugar, las funciones recibirán 'piezasDelJuego' como parámetro,
// que representa el estado de las piezas para una sala de juego específica.
// La variable 'reglaJaqueHabilitada' también se pasará como parámetro donde sea necesario.

// --- Funciones de Validación de Movimiento de Piezas (adaptadas para el servidor) ---

function esMovimientoValidoPeon(piezasDelJuego, pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    const piezaEnDestino = getPiezaEnCasillaServidor(piezasDelJuego, casillaDestinoStr);
    const deltaCol = destino.columna - origen.columna;
    const deltaFila = destino.fila - origen.fila;

    if (pieza.color === 'blanco') {
        if (deltaCol === 0 && !piezaEnDestino) { // Movimiento vertical
            if (deltaFila === -1) return true; // Avanza una casilla
            // Avanza dos casillas desde la posición inicial
            if (deltaFila === -2 && origen.fila === 6 && !getPiezaEnCasillaServidor(piezasDelJuego, coordenadasAPosicion({ fila: origen.fila - 1, columna: origen.columna }))) return true;
        }
        // Captura diagonal
        if (Math.abs(deltaCol) === 1 && deltaFila === -1 && piezaEnDestino && piezaEnDestino.color === 'negro') return true;
    } else { // Pieza negra
        if (deltaCol === 0 && !piezaEnDestino) { // Movimiento vertical
            if (deltaFila === 1) return true; // Avanza una casilla
            // Avanza dos casillas desde la posición inicial
            if (deltaFila === 2 && origen.fila === 1 && !getPiezaEnCasillaServidor(piezasDelJuego, coordenadasAPosicion({ fila: origen.fila + 1, columna: origen.columna }))) return true;
        }
        // Captura diagonal
        if (Math.abs(deltaCol) === 1 && deltaFila === 1 && piezaEnDestino && piezaEnDestino.color === 'blanco') return true;
    }
    return false;
}

function esMovimientoValidoTorre(piezasDelJuego, pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    if (origen.fila === destino.fila && origen.columna === destino.columna) return false; // No se movió
    if (origen.fila !== destino.fila && origen.columna !== destino.columna) return false; // No es movimiento horizontal ni vertical

    if (origen.fila === destino.fila) { // Movimiento horizontal
        const colMenor = Math.min(origen.columna, destino.columna);
        const colMayor = Math.max(origen.columna, destino.columna);
        for (let c = colMenor + 1; c < colMayor; c++) {
            if (getPiezaEnCasillaServidor(piezasDelJuego, coordenadasAPosicion({ fila: origen.fila, columna: c }))) return false; // Camino bloqueado
        }
    } else { // Movimiento vertical
        const filaMenor = Math.min(origen.fila, destino.fila);
        const filaMayor = Math.max(origen.fila, destino.fila);
        for (let f = filaMenor + 1; f < filaMayor; f++) {
            if (getPiezaEnCasillaServidor(piezasDelJuego, coordenadasAPosicion({ fila: f, columna: origen.columna }))) return false; // Camino bloqueado
        }
    }
    const piezaEnDestino = getPiezaEnCasillaServidor(piezasDelJuego, casillaDestinoStr);
    if (piezaEnDestino && piezaEnDestino.color === pieza.color) return false; // No puede capturar propia pieza
    return true;
}

function esMovimientoValidoCaballo(piezasDelJuego, pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    const deltaFilaAbs = Math.abs(destino.fila - origen.fila);
    const deltaColAbs = Math.abs(destino.columna - origen.columna);
    const esMovimientoCaballo = (deltaFilaAbs === 2 && deltaColAbs === 1) || (deltaFilaAbs === 1 && deltaColAbs === 2);
    if (!esMovimientoCaballo) return false;

    const piezaEnDestino = getPiezaEnCasillaServidor(piezasDelJuego, casillaDestinoStr);
    if (piezaEnDestino && piezaEnDestino.color === pieza.color) return false; // No puede capturar propia pieza
    return true;
}

function esMovimientoValidoAlfil(piezasDelJuego, pieza, casillaOrigenStr, casillaDestinoStr) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;
    if (origen.fila === destino.fila && origen.columna === destino.columna) return false; // No se movió
    if (Math.abs(destino.fila - origen.fila) !== Math.abs(destino.columna - origen.columna)) return false; // No es diagonal

    const dirFila = Math.sign(destino.fila - origen.fila);
    const dirColumna = Math.sign(destino.columna - origen.columna);
    let filaActual = origen.fila + dirFila;
    let columnaActual = origen.columna + dirColumna;
    while (filaActual !== destino.fila) {
        if (getPiezaEnCasillaServidor(piezasDelJuego, coordenadasAPosicion({ fila: filaActual, columna: columnaActual }))) return false; // Camino bloqueado
        filaActual += dirFila;
        columnaActual += dirColumna;
    }
    const piezaEnDestino = getPiezaEnCasillaServidor(piezasDelJuego, casillaDestinoStr);
    if (piezaEnDestino && piezaEnDestino.color === pieza.color) return false; // No puede capturar propia pieza
    return true;
}

function esMovimientoValidoReina(piezasDelJuego, pieza, casillaOrigenStr, casillaDestinoStr) {
    // Una reina se mueve como torre o alfil
    return esMovimientoValidoTorre(piezasDelJuego, pieza, casillaOrigenStr, casillaDestinoStr) ||
           esMovimientoValidoAlfil(piezasDelJuego, pieza, casillaOrigenStr, casillaDestinoStr);
}

function esMovimientoValidoRey(piezasDelJuego, rey, casillaOrigenStr, casillaDestinoStr, reglaJaqueHabilitada) {
    const origen = posicionACoordenadas(casillaOrigenStr);
    const destino = posicionACoordenadas(casillaDestinoStr);
    if (!origen || !destino) return false;

    const deltaFilaAbs = Math.abs(destino.fila - origen.fila);
    const deltaColAbs = Math.abs(destino.columna - origen.columna);

    // --- LÓGICA DE ENROQUE ---
    // El rey no debe haberse movido, el movimiento debe ser de 2 casillas en horizontal, y la regla de jaque debe estar habilitada.
    if (reglaJaqueHabilitada && !rey.haMovido && deltaFilaAbs === 0 && deltaColAbs === 2) {
        if (estaEnJaque(piezasDelJuego, rey.color, reglaJaqueHabilitada)) return false; // No se puede enrocar si el rey está en jaque

        const filaRey = origen.fila;
        const colorOponente = (rey.color === 'blanco' ? 'negro' : 'blanco');
        // Para la validación del enroque, necesitamos una copia temporal de las piezas para no afectar el estado real
        const casillasAtacadasPorOponente = getCasillasAtacadasPor(piezasDelJuego, colorOponente, reglaJaqueHabilitada);


        let torre, caminoDespejado = true;
        let casillaPasoReyStr;

        if (destino.columna > origen.columna) { // Enroque corto
            torre = piezasDelJuego.find(p => p.color === rey.color && p.tipo === 'torre' &&
                                       p.posicionOriginal === coordenadasAPosicion({fila: filaRey, columna: 7}));
            if (!torre || torre.haMovido) return false;
            for (let col = origen.columna + 1; col < 7; col++) {
                if (getPiezaEnCasillaServidor(piezasDelJuego, coordenadasAPosicion({fila: filaRey, columna: col}))) {
                    caminoDespejado = false; break;
                }
            }
            casillaPasoReyStr = coordenadasAPosicion({fila: filaRey, columna: origen.columna + 1});
        } else { // Enroque largo
            torre = piezasDelJuego.find(p => p.color === rey.color && p.tipo === 'torre' &&
                                       p.posicionOriginal === coordenadasAPosicion({fila: filaRey, columna: 0}));
            if (!torre || torre.haMovido) return false;
            for (let col = origen.columna - 1; col > 0; col--) {
                if (getPiezaEnCasillaServidor(piezasDelJuego, coordenadasAPosicion({fila: filaRey, columna: col}))) {
                    caminoDespejado = false; break;
                }
            }
            casillaPasoReyStr = coordenadasAPosicion({fila: filaRey, columna: origen.columna - 1});
        }

        if (!caminoDespejado) return false;
        if (casillasAtacadasPorOponente.includes(casillaPasoReyStr) ||
            casillasAtacadasPorOponente.includes(casillaDestinoStr) ||
            casillasAtacadasPorOponente.includes(casillaOrigenStr)) { // Origen también debe ser seguro
            return false;
        }
        return true; // Enroque válido
    }
    // --- FIN LÓGICA DE ENROQUE ---

    // Movimiento normal del rey (una casilla)
    if (deltaFilaAbs <= 1 && deltaColAbs <= 1) {
      const piezaEnDestino = getPiezaEnCasillaServidor(piezasDelJuego, casillaDestinoStr);
      if (piezaEnDestino && piezaEnDestino.color === rey.color) return false; // No puede capturar propia pieza
      return true;
    }

    return false;
}


// --- Funciones de Lógica de Jaque y Jaque Mate (adaptadas) ---
function encontrarPosicionRey(piezasDelJuego, colorRey) {
    const rey = piezasDelJuego.find(p => p.tipo === 'rey' && p.color === colorRey && p.posicionActual);
    return rey ? rey.posicionActual : null;
}

function getCasillasAtacadasPor(piezasDelJuego, colorAtacante, reglaJaqueHabilitada) {
    // Si la regla de jaque no está habilitada, no se calculan casillas atacadas (optimización/lógica de juego)
    // Sin embargo, para validar el enroque, siempre necesitamos saber las casillas atacadas.
    // Se podría añadir un parámetro extra 'forEnroqueValidation' si se quiere ser estricto con reglaJaqueHabilitada aquí.
    // Por ahora, se asume que si se llama, se necesitan.

    const casillasAtacadas = new Set();
    const piezasDelAtacante = piezasDelJuego.filter(p => p.color === colorAtacante && p.posicionActual);

    for (const pieza of piezasDelAtacante) {
        const origenStr = pieza.posicionActual;
        const origenCoords = posicionACoordenadas(origenStr);
        if (!origenCoords) continue;

        if (pieza.tipo === 'peon') {
            const dir = (pieza.color === 'blanco') ? -1 : 1; // Blancas atacan hacia filas menores, negras hacia mayores
            if (origenCoords.columna > 0) { // Ataque diagonal izquierda
                const c = coordenadasAPosicion({ fila: origenCoords.fila + dir, columna: origenCoords.columna - 1 });
                if (c) casillasAtacadas.add(c);
            }
            if (origenCoords.columna < 7) { // Ataque diagonal derecha
                const c = coordenadasAPosicion({ fila: origenCoords.fila + dir, columna: origenCoords.columna + 1 });
                if (c) casillasAtacadas.add(c);
            }
        } else if (pieza.tipo === 'caballo') {
            const movimientosCaballo = [
                { df: -2, dc: -1 }, { df: -2, dc: 1 }, { df: -1, dc: -2 }, { df: -1, dc: 2 },
                { df: 1, dc: -2 }, { df: 1, dc: 2 }, { df: 2, dc: -1 }, { df: 2, dc: 1 }
            ];
            movimientosCaballo.forEach(mov => {
                const dF = origenCoords.fila + mov.df;
                const dC = origenCoords.columna + mov.dc;
                if (dF >= 0 && dF < 8 && dC >= 0 && dC < 8) { // Dentro del tablero
                    casillasAtacadas.add(coordenadasAPosicion({ fila: dF, columna: dC }));
                }
            });
        } else if (pieza.tipo === 'rey') {
            // Similar al caballo, pero para las 8 casillas adyacentes
            const movimientosRey = [
                { df: -1, dc: -1 }, { df: -1, dc: 0 }, { df: -1, dc: 1 },
                { df: 0, dc: -1 },                 { df: 0, dc: 1 },
                { df: 1, dc: -1 }, { df: 1, dc: 0 }, { df: 1, dc: 1 }
            ];
            movimientosRey.forEach(mov => {
                const dF = origenCoords.fila + mov.df;
                const dC = origenCoords.columna + mov.dc;
                if (dF >= 0 && dF < 8 && dC >= 0 && dC < 8) {
                    casillasAtacadas.add(coordenadasAPosicion({ fila: dF, columna: dC }));
                }
            });
        } else { // Torre, Alfil, Reina
            let dirs = [];
            if (pieza.tipo === 'torre') dirs = [{df:0,dc:1},{df:0,dc:-1},{df:1,dc:0},{df:-1,dc:0}];
            else if (pieza.tipo === 'alfil') dirs = [{df:1,dc:1},{df:1,dc:-1},{df:-1,dc:1},{df:-1,dc:-1}];
            else if (pieza.tipo === 'reina') dirs = [{df:0,dc:1},{df:0,dc:-1},{df:1,dc:0},{df:-1,dc:0},{df:1,dc:1},{df:1,dc:-1},{df:-1,dc:1},{df:-1,dc:-1}];

            dirs.forEach(dir => {
                for (let i = 1; i < 8; i++) {
                    const dF = origenCoords.fila + dir.df * i;
                    const dC = origenCoords.columna + dir.dc * i;
                    if (dF >= 0 && dF < 8 && dC >= 0 && dC < 8) { // Dentro del tablero
                        const casillaAtacadaStr = coordenadasAPosicion({ fila: dF, columna: dC });
                        casillasAtacadas.add(casillaAtacadaStr);
                        // Si hay una pieza en la casilla atacada, el ataque no continúa más allá en esa dirección
                        if (getPiezaEnCasillaServidor(piezasDelJuego, casillaAtacadaStr)) break;
                    } else break; // Fuera del tablero
                }
            });
        }
    }
    return Array.from(casillasAtacadas).filter(pos => pos !== null);
}

function estaEnJaque(piezasDelJuego, colorRey, reglaJaqueHabilitada) {
    if (!reglaJaqueHabilitada) return false;
    const posicionDelRey = encontrarPosicionRey(piezasDelJuego, colorRey);
    if (!posicionDelRey) return false; // No debería pasar en un juego normal
    const colorAtacante = (colorRey === 'blanco' ? 'negro' : 'blanco');
    return getCasillasAtacadasPor(piezasDelJuego, colorAtacante, reglaJaqueHabilitada).includes(posicionDelRey);
}

// ESTA ES LA FUNCIÓN MÁS CRÍTICA PARA ADAPTAR CORRECTAMENTE (ESTADOLESS)
function getMovimientosLegalesParaPieza(piezasDelJuegoOriginal, piezaIdConsiderada, reglaJaqueHabilitada) {
    const movimientosLegalesParaEstaPieza = [];
    const piezaConsiderada = piezasDelJuegoOriginal.find(p => p.id === piezaIdConsiderada);

    if (!piezaConsiderada || !piezaConsiderada.posicionActual) {
        console.error(`Error: Pieza con ID ${piezaIdConsiderada} no encontrada o sin posición actual.`);
        return [];
    }
    const casillaOrigenActualStr = piezaConsiderada.posicionActual;

    for (let i = 0; i < 8; i++) { // fila
        for (let j = 0; j < 8; j++) { // columna
            const casillaDestinoStr = coordenadasAPosicion({ fila: i, columna: j });
            if (casillaOrigenActualStr === casillaDestinoStr) continue;

            // Clonamos el estado del juego para esta simulación específica
            // JSON.parse(JSON.stringify(...)) es una forma simple de hacer una copia profunda
            const piezasSimulacion = JSON.parse(JSON.stringify(piezasDelJuegoOriginal));
            const piezaSimulacion = piezasSimulacion.find(p => p.id === piezaIdConsiderada);
            const piezaEnDestinoOriginal = getPiezaEnCasillaServidor(piezasDelJuegoOriginal, casillaDestinoStr); // Usar original para la info

            let esMovimientoTipoValido = false;
            if (piezaEnDestinoOriginal && piezaEnDestinoOriginal.color === piezaConsiderada.color) {
                esMovimientoTipoValido = false; // No puede moverse a una casilla ocupada por una pieza propia
            } else {
                // Validaciones básicas de movimiento por tipo de pieza
                if (piezaConsiderada.tipo === 'peon') esMovimientoTipoValido = esMovimientoValidoPeon(piezasDelJuegoOriginal, piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'torre') esMovimientoTipoValido = esMovimientoValidoTorre(piezasDelJuegoOriginal, piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'caballo') esMovimientoTipoValido = esMovimientoValidoCaballo(piezasDelJuegoOriginal, piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'alfil') esMovimientoTipoValido = esMovimientoValidoAlfil(piezasDelJuegoOriginal, piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'reina') esMovimientoTipoValido = esMovimientoValidoReina(piezasDelJuegoOriginal, piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr);
                else if (piezaConsiderada.tipo === 'rey') esMovimientoTipoValido = esMovimientoValidoRey(piezasDelJuegoOriginal, piezaConsiderada, casillaOrigenActualStr, casillaDestinoStr, reglaJaqueHabilitada);
            }

            if (esMovimientoTipoValido) {
                if (!reglaJaqueHabilitada) {
                    movimientosLegalesParaEstaPieza.push(casillaDestinoStr);
                    continue; // Si no hay regla de jaque, el movimiento es legal si el tipo es válido
                }

                // Simular el movimiento en el estado clonado
                const piezaEnDestinoSimulacion = getPiezaEnCasillaServidor(piezasSimulacion, casillaDestinoStr); // Podría ser null
                if (piezaEnDestinoSimulacion) {
                    piezaEnDestinoSimulacion.posicionActual = null; // Simular captura
                }
                piezaSimulacion.posicionActual = casillaDestinoStr;
                // Si es un rey o torre, actualizar 'haMovido' en la simulación para lógica de enroque
                if (piezaSimulacion.tipo === 'rey' || piezaSimulacion.tipo === 'torre') {
                    piezaSimulacion.haMovido = true;
                }


                // Comprobar si el movimiento simulado resulta en auto-jaque
                const autoJaque = estaEnJaque(piezasSimulacion, piezaConsiderada.color, reglaJaqueHabilitada);

                if (!autoJaque) {
                    movimientosLegalesParaEstaPieza.push(casillaDestinoStr);
                }
            }
        }
    }
    return movimientosLegalesParaEstaPieza;
}

function getTodosMovimientosLegalesPosibles(piezasDelJuego, colorJugador, reglaJaqueHabilitada) {
    const movimientosLegales = [];
    const piezasDelJugadorActivas = piezasDelJuego.filter(p => p.color === colorJugador && p.posicionActual);

    for (const pieza of piezasDelJugadorActivas) {
        const movimientosParaEstaPieza = getMovimientosLegalesParaPieza(piezasDelJuego, pieza.id, reglaJaqueHabilitada);
        movimientosParaEstaPieza.forEach(destino => {
            movimientosLegales.push({
                piezaId: pieza.id, // Quién se mueve
                casillaOrigen: pieza.posicionActual, // Desde dónde
                casillaDestino: destino // Hacia dónde
            });
        });
    }
    return movimientosLegales;
}

function esJaqueMate(piezasDelJuego, colorReyEnJaque, reglaJaqueHabilitada) {
    if (!reglaJaqueHabilitada) return false;
    if (!estaEnJaque(piezasDelJuego, colorReyEnJaque, reglaJaqueHabilitada)) return false; // No hay jaque, no puede ser mate
    // Es mate si no hay movimientos legales que saquen al rey del jaque
    return getTodosMovimientosLegalesPosibles(piezasDelJuego, colorReyEnJaque, reglaJaqueHabilitada).length === 0;
}

// Ahogado: el jugador de turno no está en jaque, pero no tiene movimientos legales.
function esEmpatePorAhogado(piezasDelJuego, colorJugadorTurno, reglaJaqueHabilitada) {
    if (!reglaJaqueHabilitada) return false; // Usualmente ahogado se considera con reglas de jaque
    if (estaEnJaque(piezasDelJuego, colorJugadorTurno, reglaJaqueHabilitada)) return false; // Si está en jaque, no es ahogado (podría ser mate)
    return getTodosMovimientosLegalesPosibles(piezasDelJuego, colorJugadorTurno, reglaJaqueHabilitada).length === 0;
}

// Otras condiciones de empate (ej: insuficiencia de material, triple repetición) no están implementadas.

// La función de formatear notación puede quedarse en el cliente o moverse/duplicarse si el servidor la necesita.
// Por ahora, la mantenemos aquí si el servidor va a generar la notación.
function formatearNotacionMovimiento(pieza, casillaOrigenStr, casillaDestinoStr, esCaptura, tipoMovimientoEspecial = "") {
    if (tipoMovimientoEspecial === "O-O" || tipoMovimientoEspecial === "O-O-O") {
        return tipoMovimientoEspecial;
    }

    let notacion = "";
    const mapTipoALetra = { 'torre':'T', 'caballo':'C', 'alfil':'A', 'reina':'D', 'rey':'R' };

    if (pieza.tipo !== 'peon') {
        notacion += mapTipoALetra[pieza.tipo] || '';
    }
    // TODO: Lógica para desambiguar movimientos (ej: Tbd1) - complejo, omitido por ahora

    if (esCaptura) {
        if (pieza.tipo === 'peon' && casillaOrigenStr) {
            notacion += casillaOrigenStr.charAt(0); // Columna de origen del peón para captura: 'exd5'
        }
        notacion += "x";
    }
    notacion += casillaDestinoStr;

    // TODO: Añadir sufijos para jaque (+) o jaque mate (#) - esto requiere conocer el estado *después* del movimiento.
    // Esta función se llamaría después de validar y realizar el movimiento.
    return notacion;
}


module.exports = {
    esMovimientoValidoPeon,
    esMovimientoValidoTorre,
    esMovimientoValidoCaballo,
    esMovimientoValidoAlfil,
    esMovimientoValidoReina,
    esMovimientoValidoRey,
    encontrarPosicionRey,
    getCasillasAtacadasPor,
    estaEnJaque,
    getMovimientosLegalesParaPieza,
    getTodosMovimientosLegalesPosibles,
    esJaqueMate,
    esEmpatePorAhogado, // Cambiado de esEmpate a ser más específico
    formatearNotacionMovimiento
};
