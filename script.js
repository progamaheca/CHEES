// Espera a que el contenido del DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    const contenedorTablero = document.getElementById('contenedor_tablero');
    const mostrarTurnoJugador = document.getElementById('mostrar_turno_jugador');

    // Representación de Piezas y Posiciones Iniciales
    let piezas = [
        // Piezas Blancas
        { id: 'TBI', simbolo: '♖', color: 'blanco', posicionOriginal: 'a1', posicionActual: 'a1', tipo: 'torre' },
        { id: 'CBI', simbolo: '♘', color: 'blanco', posicionOriginal: 'b1', posicionActual: 'b1', tipo: 'caballo' },
        { id: 'ABI', simbolo: '♗', color: 'blanco', posicionOriginal: 'c1', posicionActual: 'c1', tipo: 'alfil' },
        { id: 'DB',  simbolo: '♕', color: 'blanco', posicionOriginal: 'd1', posicionActual: 'd1', tipo: 'reina' },
        { id: 'RB',  simbolo: '♔', color: 'blanco', posicionOriginal: 'e1', posicionActual: 'e1', tipo: 'rey' },
        { id: 'ABD', simbolo: '♗', color: 'blanco', posicionOriginal: 'f1', posicionActual: 'f1', tipo: 'alfil' },
        { id: 'CBD', simbolo: '♘', color: 'blanco', posicionOriginal: 'g1', posicionActual: 'g1', tipo: 'caballo' },
        { id: 'TBD', simbolo: '♖', color: 'blanco', posicionOriginal: 'h1', posicionActual: 'h1', tipo: 'torre' },
        { id: 'PB1', simbolo: '♙', color: 'blanco', posicionOriginal: 'a2', posicionActual: 'a2', tipo: 'peon' },
        { id: 'PB2', simbolo: '♙', color: 'blanco', posicionOriginal: 'b2', posicionActual: 'b2', tipo: 'peon' },
        { id: 'PB3', simbolo: '♙', color: 'blanco', posicionOriginal: 'c2', posicionActual: 'c2', tipo: 'peon' },
        { id: 'PB4', simbolo: '♙', color: 'blanco', posicionOriginal: 'd2', posicionActual: 'd2', tipo: 'peon' },
        { id: 'PB5', simbolo: '♙', color: 'blanco', posicionOriginal: 'e2', posicionActual: 'e2', tipo: 'peon' },
        { id: 'PB6', simbolo: '♙', color: 'blanco', posicionOriginal: 'f2', posicionActual: 'f2', tipo: 'peon' },
        { id: 'PB7', simbolo: '♙', color: 'blanco', posicionOriginal: 'g2', posicionActual: 'g2', tipo: 'peon' },
        { id: 'PB8', simbolo: '♙', color: 'blanco', posicionOriginal: 'h2', posicionActual: 'h2', tipo: 'peon' },
        // Piezas Negras
        { id: 'TNI', simbolo: '♜', color: 'negro', posicionOriginal: 'a8', posicionActual: 'a8', tipo: 'torre' },
        { id: 'CNI', simbolo: '♞', color: 'negro', posicionOriginal: 'b8', posicionActual: 'b8', tipo: 'caballo' },
        { id: 'ANI', simbolo: '♝', color: 'negro', posicionOriginal: 'c8', posicionActual: 'c8', tipo: 'alfil' },
        { id: 'DN',  simbolo: '♛', color: 'negro', posicionOriginal: 'd8', posicionActual: 'd8', tipo: 'reina' },
        { id: 'RN',  simbolo: '♚', color: 'negro', posicionOriginal: 'e8', posicionActual: 'e8', tipo: 'rey' },
        { id: 'AND', simbolo: '♝', color: 'negro', posicionOriginal: 'f8', posicionActual: 'f8', tipo: 'alfil' },
        { id: 'CND', simbolo: '♞', color: 'negro', posicionOriginal: 'g8', posicionActual: 'g8', tipo: 'caballo' },
        { id: 'TND', simbolo: '♜', color: 'negro', posicionOriginal: 'h8', posicionActual: 'h8', tipo: 'torre' },
        { id: 'PN1', simbolo: '♟', color: 'negro', posicionOriginal: 'a7', posicionActual: 'a7', tipo: 'peon' },
        { id: 'PN2', simbolo: '♟', color: 'negro', posicionOriginal: 'b7', posicionActual: 'b7', tipo: 'peon' },
        { id: 'PN3', simbolo: '♟', color: 'negro', posicionOriginal: 'c7', posicionActual: 'c7', tipo: 'peon' },
        { id: 'PN4', simbolo: '♟', color: 'negro', posicionOriginal: 'd7', posicionActual: 'd7', tipo: 'peon' },
        { id: 'PN5', simbolo: '♟', color: 'negro', posicionOriginal: 'e7', posicionActual: 'e7', tipo: 'peon' },
        { id: 'PN6', simbolo: '♟', color: 'negro', posicionOriginal: 'f7', posicionActual: 'f7', tipo: 'peon' },
        { id: 'PN7', simbolo: '♟', color: 'negro', posicionOriginal: 'g7', posicionActual: 'g7', tipo: 'peon' },
        { id: 'PN8', simbolo: '♟', color: 'negro', posicionOriginal: 'h7', posicionActual: 'h7', tipo: 'peon' },
    ];

    let piezaSeleccionada = null;
    let turnoActual = 'blanco';
    let tiempoSeleccionado = 60;
    let tiempoRestante = null;
    let intervaloTemporizador = null;
    let juegoIniciado = false;

    const displayTiempo = document.getElementById('mostrar_tiempo');
    const btnTiempo1Min = document.getElementById('btn_tiempo_1_min');
    const btnTiempo5Min = document.getElementById('btn_tiempo_5_min');
    const divConfiguracionTiempo = document.getElementById('configuracion_tiempo');

    function posicionACoordenadas(posicion) {
        if (typeof posicion !== 'string' || posicion.length !== 2) { console.error('Formato de posición inválido:', posicion); return null; }
        const columna = posicion.charCodeAt(0) - 'a'.charCodeAt(0);
        const fila = 8 - parseInt(posicion[1]);
        if (columna < 0 || columna > 7 || fila < 0 || fila > 7 || isNaN(fila)) { console.error('Posición fuera de rango:', posicion); return null; }
        return { fila, columna };
    }

    function coordenadasAPosicion(coords) {
        if (typeof coords !== 'object' || coords === null || !('fila' in coords) || !('columna' in coords)) { console.error('Formato de coordenadas inválido:', coords); return null; }
        return `${String.fromCharCode('a'.charCodeAt(0) + coords.columna)}${8 - coords.fila}`;
    }

    function getPiezaEnCasilla(posicion) {
        if (!posicion) return null;
        return piezas.find(p => p.posicionActual === posicion);
    }

    function generarTablero() {
        contenedorTablero.innerHTML = '';
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const casilla = document.createElement('div');
                casilla.classList.add('casilla', (i + j) % 2 === 0 ? 'blanca' : 'negra');
                casilla.dataset.fila = i;
                casilla.dataset.columna = j;
                casilla.dataset.posicion = coordenadasAPosicion({fila: i, columna: j});
                casilla.addEventListener('click', () => manejarClickCasilla(casilla));
                contenedorTablero.appendChild(casilla);
            }
        }
        colocarPiezasIniciales();
        actualizarIndicadorTurno();
    }

    function colocarPiezasIniciales() {
        piezas.forEach((pieza) => {
            if (pieza.posicionActual) { // Solo coloca piezas que tienen una posición actual
                const casilla = contenedorTablero.querySelector(`[data-posicion="${pieza.posicionActual}"]`);
                if (casilla) {
                    casilla.textContent = pieza.simbolo;
                    casilla.dataset.piezaId = pieza.id;
                } else {
                    console.error(`No se encontró la casilla para la posición: ${pieza.posicionActual} de la pieza ${pieza.id}`);
                }
            }
        });
    }

    function manejarClickCasilla(casillaClickeada) {
        if (!juegoIniciado) {
            console.log("El juego no ha comenzado. Por favor, selecciona un tiempo de juego.");
            return;
        }

        const piezaIdEnCasillaClickeada = casillaClickeada.dataset.piezaId;
        const piezaObjetoEnCasillaClickeada = piezaIdEnCasillaClickeada ? piezas.find(p => p.id === piezaIdEnCasillaClickeada) : null;

        if (piezaSeleccionada === null) {
            if (piezaObjetoEnCasillaClickeada && piezaObjetoEnCasillaClickeada.color === turnoActual) {
                piezaSeleccionada = {
                    casillaElemento: casillaClickeada,
                    piezaObjeto: piezaObjetoEnCasillaClickeada,
                    posicionOriginalStr: casillaClickeada.dataset.posicion
                };
                casillaClickeada.classList.add('seleccionada');
                console.log(`Seleccionada: ${piezaSeleccionada.piezaObjeto.simbolo} en ${piezaSeleccionada.posicionOriginalStr}`);
            }
        } else {
            const casillaOrigenEl = piezaSeleccionada.casillaElemento;
            const piezaMovidaObjeto = piezaSeleccionada.piezaObjeto;
            const casillaOrigenStr = piezaSeleccionada.posicionOriginalStr;
            const casillaDestinoStr = casillaClickeada.dataset.posicion;

            if (casillaOrigenEl === casillaClickeada) {
                casillaOrigenEl.classList.remove('seleccionada');
                piezaSeleccionada = null;
                return;
            }

            if (piezaObjetoEnCasillaClickeada && piezaObjetoEnCasillaClickeada.color === piezaMovidaObjeto.color) {
                console.log("No se puede capturar pieza propia. Cambiando selección.");
                casillaOrigenEl.classList.remove('seleccionada');
                if (piezaObjetoEnCasillaClickeada.color === turnoActual) {
                    casillaClickeada.classList.add('seleccionada');
                    piezaSeleccionada = { casillaElemento: casillaClickeada, piezaObjeto: piezaObjetoEnCasillaClickeada, posicionOriginalStr: casillaDestinoStr };
                    console.log(`Nueva pieza seleccionada: ${piezaSeleccionada.piezaObjeto.simbolo}`);
                } else {
                    piezaSeleccionada = null;
                }
                return;
            }

            let movimientoValidoBase = false;
            if (piezaMovidaObjeto.tipo === 'peon')    movimientoValidoBase = esMovimientoValidoPeon(piezaMovidaObjeto, casillaOrigenStr, casillaDestinoStr);
            else if (piezaMovidaObjeto.tipo === 'torre')   movimientoValidoBase = esMovimientoValidoTorre(piezaMovidaObjeto, casillaOrigenStr, casillaDestinoStr);
            else if (piezaMovidaObjeto.tipo === 'caballo') movimientoValidoBase = esMovimientoValidoCaballo(piezaMovidaObjeto, casillaOrigenStr, casillaDestinoStr);
            else if (piezaMovidaObjeto.tipo === 'alfil')   movimientoValidoBase = esMovimientoValidoAlfil(piezaMovidaObjeto, casillaOrigenStr, casillaDestinoStr);
            else if (piezaMovidaObjeto.tipo === 'reina')  movimientoValidoBase = esMovimientoValidoReina(piezaMovidaObjeto, casillaOrigenStr, casillaDestinoStr);
            else if (piezaMovidaObjeto.tipo === 'rey')     movimientoValidoBase = esMovimientoValidoRey(piezaMovidaObjeto, casillaOrigenStr, casillaDestinoStr);
            else { console.error("Tipo de pieza no reconocido:", piezaMovidaObjeto.tipo); movimientoValidoBase = false; }

            let movimientoFinalValido = movimientoValidoBase;
            if (movimientoValidoBase) {
                // Simulación para verificar auto-jaque
                const colorJugadorActual = piezaMovidaObjeto.color;
                const posicionOriginalSim = piezaMovidaObjeto.posicionActual; // Es casillaOrigenStr
                const piezaEnDestinoSimObj = getPiezaEnCasilla(casillaDestinoStr); // Puede ser null

                piezaMovidaObjeto.posicionActual = casillaDestinoStr; // Simular movimiento
                let idPiezaCapturadaSim = null;
                if (piezaEnDestinoSimObj) {
                    const piezaCapturadaSimArrayObj = piezas.find(p => p.id === piezaEnDestinoSimObj.id);
                    if (piezaCapturadaSimArrayObj) piezaCapturadaSimArrayObj.posicionActual = null; // Simular captura
                    idPiezaCapturadaSim = piezaEnDestinoSimObj.id;
                }

                if (estaEnJaque(colorJugadorActual)) {
                    console.log("Movimiento inválido: resultaría en auto-jaque.");
                    movimientoFinalValido = false;
                }

                // Revertir simulación
                piezaMovidaObjeto.posicionActual = posicionOriginalSim;
                if (idPiezaCapturadaSim) {
                    const piezaRestauradaSimArrayObj = piezas.find(p => p.id === idPiezaCapturadaSim);
                    if (piezaRestauradaSimArrayObj) piezaRestauradaSimArrayObj.posicionActual = casillaDestinoStr;
                }
            }

            if (movimientoFinalValido) {
                document.querySelectorAll('.en-jaque').forEach(c => c.classList.remove('en-jaque'));

                const piezaCapturadaRealObj = getPiezaEnCasilla(casillaDestinoStr);
                if (piezaCapturadaRealObj) {
                    const piezaCapturadaRealArrayObj = piezas.find(p => p.id === piezaCapturadaRealObj.id);
                    if (piezaCapturadaRealArrayObj) piezaCapturadaRealArrayObj.posicionActual = null; // Marcar como no activa
                    console.log(`Pieza ${piezaCapturadaRealObj.simbolo} capturada.`);
                }

                casillaClickeada.textContent = piezaMovidaObjeto.simbolo;
                casillaClickeada.dataset.piezaId = piezaMovidaObjeto.id;
                casillaOrigenEl.textContent = '';
                delete casillaOrigenEl.dataset.piezaId;
                piezaMovidaObjeto.posicionActual = casillaDestinoStr;

                console.log(`Movido ${piezaMovidaObjeto.simbolo} de ${casillaOrigenStr} a ${casillaDestinoStr}`);

                turnoActual = (turnoActual === 'blanco') ? 'negro' : 'blanco';
                actualizarIndicadorTurno();

                if (estaEnJaque(turnoActual)) {
                    alert(`¡Jaque al rey ${turnoActual}!`);
                    const posReyEnJaque = encontrarPosicionRey(turnoActual);
                    if (posReyEnJaque) {
                        const casillaRey = document.querySelector(`[data-posicion="${posReyEnJaque}"]`);
                        if (casillaRey) casillaRey.classList.add('en-jaque');
                    }
                }
                reiniciarTemporizador();
            } else {
                console.log(`Movimiento de ${piezaMovidaObjeto.simbolo} de ${casillaOrigenStr} a ${casillaDestinoStr} es inválido.`);
            }

            casillaOrigenEl.classList.remove('seleccionada');
            piezaSeleccionada = null;
        }
    }

    function encontrarPosicionRey(colorRey) {
        const rey = piezas.find(p => p.tipo === 'rey' && p.color === colorRey && p.posicionActual);
        return rey ? rey.posicionActual : null;
    }

    function getCasillasAtacadasPor(colorAtacante) {
        const casillasAtacadas = new Set();
        const piezasAtacantesActivas = piezas.filter(p => p.color === colorAtacante && p.posicionActual);

        for (const pieza of piezasAtacantesActivas) {
            const origenStr = pieza.posicionActual;
            for (let i = 0; i < 8; i++) {
                for (let j = 0; j < 8; j++) {
                    const destinoStr = coordenadasAPosicion({ fila: i, columna: j });
                    if (origenStr === destinoStr) continue;

                    let puedeAtacar = false;
                    // Para peones, el ataque es diferente a su movimiento normal.
                    if (pieza.tipo === 'peon') {
                        const o = posicionACoordenadas(origenStr);
                        const d = posicionACoordenadas(destinoStr);
                        if (!o || !d) continue;
                        const dCol = Math.abs(d.columna - o.columna);
                        const dFila = d.fila - o.fila;
                        if (pieza.color === 'blanco') { if (dFila === -1 && dCol === 1) puedeAtacar = true; }
                        else { if (dFila === 1 && dCol === 1) puedeAtacar = true; }
                    }
                    // Para otras piezas, su patrón de movimiento define las casillas que atacan.
                    // Las funciones de validación (esMovimientoValido*) verifican el camino despejado.
                    // Para determinar "casillas atacadas", no nos importa si la casilla destino está ocupada por un amigo,
                    // solo si la pieza "podría" moverse allí si fuera una captura o un movimiento a casilla vacía.
                    // Las funciones esMovimientoValido ya tienen la lógica de trayectoria.
                    // La restricción de no capturar piezas amigas se maneja en manejarClickCasilla, no aquí.
                    else if (pieza.tipo === 'rey')    { if (esMovimientoValidoRey(pieza, origenStr, destinoStr)) puedeAtacar = true; }
                    else if (pieza.tipo === 'caballo'){ if (esMovimientoValidoCaballo(pieza, origenStr, destinoStr)) puedeAtacar = true; }
                    else if (pieza.tipo === 'torre')  { if (esMovimientoValidoTorre(pieza, origenStr, destinoStr)) puedeAtacar = true; }
                    else if (pieza.tipo === 'alfil')  { if (esMovimientoValidoAlfil(pieza, origenStr, destinoStr)) puedeAtacar = true; }
                    else if (pieza.tipo === 'reina')  { if (esMovimientoValidoReina(pieza, origenStr, destinoStr)) puedeAtacar = true; }

                    if (puedeAtacar) casillasAtacadas.add(destinoStr);
                }
            }
        }
        return Array.from(casillasAtacadas);
    }

    function estaEnJaque(colorRey) {
        const posicionDelRey = encontrarPosicionRey(colorRey);
        if (!posicionDelRey) return false;
        const colorAtacante = (colorRey === 'blanco' ? 'negro' : 'blanco');
        return getCasillasAtacadasPor(colorAtacante).includes(posicionDelRey);
    }

    function esMovimientoValidoRey(pieza, oS, dS) { const o=posicionACoordenadas(oS), d=posicionACoordenadas(dS); if(!o||!d || (o.f===d.f&&o.c===d.c)) return false; return Math.abs(d.f-o.f)<=1 && Math.abs(d.c-o.c)<=1; }
    function esMovimientoValidoReina(p,oS,dS) { return esMovimientoValidoTorre(p,oS,dS) || esMovimientoValidoAlfil(p,oS,dS); }
    function esMovimientoValidoAlfil(p,oS,dS) { const o=posicionACoordenadas(oS),d=posicionACoordenadas(dS); if(!o||!d||(o.f===d.f&&o.c===d.c)||Math.abs(d.f-o.f)!==Math.abs(d.c-o.c)) return false; const dF=Math.sign(d.f-o.f),dC=Math.sign(d.c-o.c); let cF=o.f+dF,cC=o.c+dC; while(cF!==d.f){if(getPiezaEnCasilla(coordenadasAPosicion({f:cF,c:cC}))) return false; cF+=dF;cC+=dC;} return true;}
    function esMovimientoValidoCaballo(p,oS,dS) { const o=posicionACoordenadas(oS),d=posicionACoordenadas(dS); if(!o||!d) return false; const dFA=Math.abs(d.f-o.f),dCA=Math.abs(d.c-o.c); return (dFA===2&&dCA===1)||(dFA===1&&dCA===2); }
    function esMovimientoValidoTorre(p,oS,dS) { const o=posicionACoordenadas(oS),d=posicionACoordenadas(dS); if(!o||!d||(o.f===d.f&&o.c===d.c)||(o.f!==d.f&&o.c!==d.c)) return false; if(o.f===d.f){const cM=Math.min(o.c,d.c),cMa=Math.max(o.c,d.c); for(let c=cM+1;c<cMa;c++){if(getPiezaEnCasilla(coordenadasAPosicion({f:o.f,c:c})))return false;}}else{const fM=Math.min(o.f,d.f),fMa=Math.max(o.f,d.f); for(let f=fM+1;f<fMa;f++){if(getPiezaEnCasilla(coordenadasAPosicion({f:f,c:o.c})))return false;}} return true;}
    function esMovimientoValidoPeon(pz,oS,dS) { const o=posicionACoordenadas(oS),d=posicionACoordenadas(dS); if(!o||!d)return false; const pED=getPiezaEnCasilla(dS),dC=d.c-o.c,dF=d.f-o.f; if(pz.c==='blanco'){if(dC===0&&!pED){if(dF===-1)return true;if(dF===-2&&o.f===6&&!getPiezaEnCasilla(coordenadasAPosicion({f:o.f-1,c:o.c})))return true;}if(Math.abs(dC)===1&&dF===-1&&pED&&pED.c==='negro')return true;}else{if(dC===0&&!pED){if(dF===1)return true;if(dF===2&&o.f===1&&!getPiezaEnCasilla(coordenadasAPosicion({f:o.f+1,c:o.c})))return true;}if(Math.abs(dC)===1&&dF===1&&pED&&pED.c==='blanco')return true;} return false;}

    function actualizarIndicadorTurno() { mostrarTurnoJugador.textContent = `Turno de: ${turnoActual.charAt(0).toUpperCase() + turnoActual.slice(1)}`; }
    function actualizarVisualizacionTiempo() { displayTiempo.textContent = `Tiempo: ${tiempoRestante !== null ? tiempoRestante : tiempoSeleccionado}s`; }
    function actualizarTemporizador() { tiempoRestante--; actualizarVisualizacionTiempo(); if (tiempoRestante <= 0) { clearInterval(intervaloTemporizador); alert(`¡Tiempo agotado! El jugador ${turnoActual} pierde.`); juegoIniciado = false; } }
    function iniciarTemporizador() { clearInterval(intervaloTemporizador); tiempoRestante = tiempoSeleccionado; actualizarVisualizacionTiempo(); intervaloTemporizador = setInterval(actualizarTemporizador, 1000); }
    function reiniciarTemporizador() { iniciarTemporizador(); }
    function habilitarMovimientoPiezas() { juegoIniciado = true; console.log("Movimiento habilitado."); }
    function deshabilitarMovimientoPiezas() { juegoIniciado = false; console.log("Movimiento deshabilitado."); }
    function confirmarSeleccionTiempo(segundos) { tiempoSeleccionado = segundos; divConfiguracionTiempo.style.display = 'none'; actualizarVisualizacionTiempo(); iniciarTemporizador(); habilitarMovimientoPiezas(); }

    if (btnTiempo1Min && btnTiempo5Min) {
        btnTiempo1Min.addEventListener('click', () => confirmarSeleccionTiempo(60));
        btnTiempo5Min.addEventListener('click', () => confirmarSeleccionTiempo(300));
    } else { console.error("Botones de selección de tiempo no encontrados."); }

    generarTablero();
    actualizarIndicadorTurno();
    actualizarVisualizacionTiempo();
    deshabilitarMovimientoPiezas();
});
// Nota: Las funciones de validación de piezas se han minificado/abreviado para ahorrar espacio en esta reescritura.
// Se recomienda mantener las versiones más legibles con comentarios para facilitar el mantenimiento.
// La lógica de 'getCasillasAtacadasPor' también es una simplificación y podría necesitar refinamiento para una IA o reglas de torneo estrictas.
// El manejo de 'posicionActual = null' para piezas capturadas es una forma de sacarlas del juego activo.
