// Espera a que el contenido del DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    const contenedorTablero = document.getElementById('contenedor_tablero');
    const mostrarTurnoJugador = document.getElementById('mostrar_turno_jugador');

    // Representación de Piezas y Posiciones Iniciales (completo, sin cambios)
    let piezas = [
        { id: 'TBI', simbolo: '♖', color: 'blanco', posicionOriginal: 'a1', posicionActual: 'a1', tipo: 'torre' }, { id: 'CBI', simbolo: '♘', color: 'blanco', posicionOriginal: 'b1', posicionActual: 'b1', tipo: 'caballo' }, { id: 'ABI', simbolo: '♗', color: 'blanco', posicionOriginal: 'c1', posicionActual: 'c1', tipo: 'alfil' }, { id: 'DB',  simbolo: '♕', color: 'blanco', posicionOriginal: 'd1', posicionActual: 'd1', tipo: 'reina' }, { id: 'RB',  simbolo: '♔', color: 'blanco', posicionOriginal: 'e1', posicionActual: 'e1', tipo: 'rey' }, { id: 'ABD', simbolo: '♗', color: 'blanco', posicionOriginal: 'f1', posicionActual: 'f1', tipo: 'alfil' }, { id: 'CBD', simbolo: '♘', color: 'blanco', posicionOriginal: 'g1', posicionActual: 'g1', tipo: 'caballo' }, { id: 'TBD', simbolo: '♖', color: 'blanco', posicionOriginal: 'h1', posicionActual: 'h1', tipo: 'torre' },
        { id: 'PB1', simbolo: '♙', color: 'blanco', posicionOriginal: 'a2', posicionActual: 'a2', tipo: 'peon' }, { id: 'PB2', simbolo: '♙', color: 'blanco', posicionOriginal: 'b2', posicionActual: 'b2', tipo: 'peon' }, { id: 'PB3', simbolo: '♙', color: 'blanco', posicionOriginal: 'c2', posicionActual: 'c2', tipo: 'peon' }, { id: 'PB4', simbolo: '♙', color: 'blanco', posicionOriginal: 'd2', posicionActual: 'd2', tipo: 'peon' }, { id: 'PB5', simbolo: '♙', color: 'blanco', posicionOriginal: 'e2', posicionActual: 'e2', tipo: 'peon' }, { id: 'PB6', simbolo: '♙', color: 'blanco', posicionOriginal: 'f2', posicionActual: 'f2', tipo: 'peon' }, { id: 'PB7', simbolo: '♙', color: 'blanco', posicionOriginal: 'g2', posicionActual: 'g2', tipo: 'peon' }, { id: 'PB8', simbolo: '♙', color: 'blanco', posicionOriginal: 'h2', posicionActual: 'h2', tipo: 'peon' },
        { id: 'TNI', simbolo: '♜', color: 'negro', posicionOriginal: 'a8', posicionActual: 'a8', tipo: 'torre' }, { id: 'CNI', simbolo: '♞', color: 'negro', posicionOriginal: 'b8', posicionActual: 'b8', tipo: 'caballo' }, { id: 'ANI', simbolo: '♝', color: 'negro', posicionOriginal: 'c8', posicionActual: 'c8', tipo: 'alfil' }, { id: 'DN',  simbolo: '♛', color: 'negro', posicionOriginal: 'd8', posicionActual: 'd8', tipo: 'reina' }, { id: 'RN',  simbolo: '♚', color: 'negro', posicionOriginal: 'e8', posicionActual: 'e8', tipo: 'rey' }, { id: 'AND', simbolo: '♝', color: 'negro', posicionOriginal: 'f8', posicionActual: 'f8', tipo: 'alfil' }, { id: 'CND', simbolo: '♞', color: 'negro', posicionOriginal: 'g8', posicionActual: 'g8', tipo: 'caballo' }, { id: 'TND', simbolo: '♜', color: 'negro', posicionOriginal: 'h8', posicionActual: 'h8', tipo: 'torre' },
        { id: 'PN1', simbolo: '♟', color: 'negro', posicionOriginal: 'a7', posicionActual: 'a7', tipo: 'peon' }, { id: 'PN2', simbolo: '♟', color: 'negro', posicionOriginal: 'b7', posicionActual: 'b7', tipo: 'peon' }, { id: 'PN3', simbolo: '♟', color: 'negro', posicionOriginal: 'c7', posicionActual: 'c7', tipo: 'peon' }, { id: 'PN4', simbolo: '♟', color: 'negro', posicionOriginal: 'd7', posicionActual: 'd7', tipo: 'peon' }, { id: 'PN5', simbolo: '♟', color: 'negro', posicionOriginal: 'e7', posicionActual: 'e7', tipo: 'peon' }, { id: 'PN6', simbolo: '♟', color: 'negro', posicionOriginal: 'f7', posicionActual: 'f7', tipo: 'peon' }, { id: 'PN7', simbolo: '♟', color: 'negro', posicionOriginal: 'g7', posicionActual: 'g7', tipo: 'peon' }, { id: 'PN8', simbolo: '♟', color: 'negro', posicionOriginal: 'h7', posicionActual: 'h7', tipo: 'peon' },
    ];

    let piezaSeleccionada = null;
    let turnoActual = 'blanco';
    let tiempoSeleccionado = 60;
    let tiempoRestanteBlancas = null;
    let tiempoRestanteNegras = null;
    let intervaloTemporizador = null;
    let juegoIniciado = false;
    let historialMovimientos = [];
    let numeroDeMovimientoActual = 1;
    let casillasElementosResaltadosComoPosibles = [];
    let ultimaCasillaOrigenEl = null;
    let ultimaCasillaDestinoEl = null;

    const btnTiempo1Min = document.getElementById('btn_tiempo_1_min');
    const btnTiempo5Min = document.getElementById('btn_tiempo_5_min');
    const divConfiguracionTiempo = document.getElementById('configuracion_tiempo');
    const displayTiempoBlancas = document.getElementById('tiempo_blancas');
    const displayTiempoNegras = document.getElementById('tiempo_negras');
    const contenedorTiempoBlancas = document.getElementById('temporizador_blancas_contenedor');
    const contenedorTiempoNegras = document.getElementById('temporizador_negras_contenedor');
    const listaMovimientosOLElement = document.getElementById('lista_movimientos_ol');
    const btnDescargarMovimientos = document.getElementById('btn_descargar_movimientos');
    // NUEVO: Referencias a contenedores de piezas capturadas
    const simbolosBlancasCapturoEl = document.getElementById('simbolos_blancas_capturo');
    const simbolosNegrasCapturoEl = document.getElementById('simbolos_negras_capturo');

    function posicionACoordenadas(posicion) { if (typeof posicion !== 'string' || posicion.length !== 2) { return null; } const col = posicion.charCodeAt(0)-'a'.charCodeAt(0); const fil = 8-parseInt(posicion[1]); if(col<0||col>7||fil<0||fil>7||isNaN(fil)){return null;} return {fila:fil,columna:col}; }
    function coordenadasAPosicion(coords) { if(typeof coords!=='object'||coords===null||!('fila'in coords)||!('columna'in coords)){return null;} return `${String.fromCharCode('a'.charCodeAt(0)+coords.columna)}${8-coords.fila}`; }
    function getPiezaEnCasilla(posicion) { if (!posicion) return null; return piezas.find(p => p.posicionActual === posicion); }

    function generarTablero() {
        contenedorTablero.innerHTML = '';
        for (let i=0;i<8;i++) { for (let j=0;j<8;j++) { const c=document.createElement('div'); c.classList.add('casilla',(i+j)%2===0?'blanca':'negra'); c.dataset.fila=i; c.dataset.columna=j; c.dataset.posicion=coordenadasAPosicion({fila:i,columna:j}); c.addEventListener('click',()=>manejarClickCasilla(c)); contenedorTablero.appendChild(c); } }
        colocarPiezasIniciales();
        actualizarIndicadorTurno();
        actualizarDisplayHistorialMovimientos();
        limpiarResaltadoUltimoMovimiento();
    }

    function colocarPiezasIniciales() {
        piezas.forEach(pza => { if(pza.posicionActual){ const c=contenedorTablero.querySelector(`[data-posicion="${pza.posicionActual}"]`); if(c){c.textContent=pza.simbolo; c.dataset.piezaId=pza.id;} } });
    }

    function formatearNotacionMovimiento(pieza, casillaOrigenStr, casillaDestinoStr, esCaptura, sufijoNotacion = "") {
        let notacion = "";
        const mapTipoALetra = { 'torre':'T', 'caballo':'C', 'alfil':'A', 'reina':'D', 'rey':'R' };
        if (pieza.tipo !== 'peon') { notacion += mapTipoALetra[pieza.tipo] || ''; }
        if (esCaptura) { if (pieza.tipo === 'peon' && casillaOrigenStr) { notacion += casillaOrigenStr.charAt(0); } notacion += "x"; }
        notacion += casillaDestinoStr;
        notacion += sufijoNotacion;
        return notacion;
    }

    function actualizarDisplayHistorialMovimientos() {
        if (!listaMovimientosOLElement) return;
        listaMovimientosOLElement.innerHTML = "";
        historialMovimientos.forEach(mov => {
            const li=document.createElement('li'); const numS=document.createElement('span'); numS.className='numero-movimiento'; numS.textContent=`${mov.numero}.`; li.appendChild(numS);
            const parS=document.createElement('span'); parS.className='movimiento-par'; const blS=document.createElement('span'); blS.className='movimiento-individual'; blS.textContent=mov.blancas; parS.appendChild(blS);
            if(mov.negras){ const negS=document.createElement('span'); negS.className='movimiento-individual'; negS.textContent=mov.negras; parS.appendChild(negS); }
            li.appendChild(parS); listaMovimientosOLElement.appendChild(li);
        });
        const seccionMovs = document.getElementById('seccion_movimientos'); if (seccionMovs) { seccionMovs.scrollTop = seccionMovs.scrollHeight; }
        if (btnDescargarMovimientos) { btnDescargarMovimientos.disabled = historialMovimientos.length === 0; }
    }

    function limpiarResaltadoMovimientosPosibles() {
        casillasElementosResaltadosComoPosibles.forEach(casillaEl => {
            casillaEl.classList.remove('movimiento-posible');
        });
        casillasElementosResaltadosComoPosibles = [];
    }

    function limpiarResaltadoUltimoMovimiento() {
        if (ultimaCasillaOrigenEl) {
            ultimaCasillaOrigenEl.classList.remove('ultimo-mov-origen');
            ultimaCasillaOrigenEl = null;
        }
        if (ultimaCasillaDestinoEl) {
            ultimaCasillaDestinoEl.classList.remove('ultimo-mov-destino');
            ultimaCasillaDestinoEl = null;
        }
    }

    function manejarClickCasilla(casillaClickeada) {
        if (!juegoIniciado) return;
        const piezaIdEnCasillaClick = casillaClickeada.dataset.piezaId;
        const piezaObjEnCasillaClick = piezaIdEnCasillaClick ? piezas.find(p => p.id === piezaIdEnCasillaClick && p.posicionActual === casillaClickeada.dataset.posicion) : null;

        if (!piezaSeleccionada) {
            limpiarResaltadoMovimientosPosibles();
            if (piezaObjEnCasillaClick && piezaObjEnCasillaClick.color === turnoActual) {
                piezaSeleccionada = {casillaElemento:casillaClickeada, piezaObjeto:piezaObjEnCasillaClick, posicionOriginalStr:casillaClickeada.dataset.posicion};
                casillaClickeada.classList.add('seleccionada');
                const movimientos = getMovimientosLegalesParaPieza(piezaSeleccionada.piezaObjeto, piezaSeleccionada.posicionOriginalStr);
                movimientos.forEach(destinoStr => {
                    const casillaDestinoEl = document.querySelector(`[data-posicion="${destinoStr}"]`);
                    if (casillaDestinoEl) {
                        casillaDestinoEl.classList.add('movimiento-posible');
                        casillasElementosResaltadosComoPosibles.push(casillaDestinoEl);
                    }
                });
            }
        } else {
            const cOrigenEl = piezaSeleccionada.casillaElemento;
            const pMovidaObj = piezaSeleccionada.piezaObjeto;
            const cOrigenStr = piezaSeleccionada.posicionOriginalStr;
            const cDestinoStr = casillaClickeada.dataset.posicion;

            if (cOrigenEl === casillaClickeada) {
                limpiarResaltadoMovimientosPosibles();
                cOrigenEl.classList.remove('seleccionada');
                piezaSeleccionada = null;
                return;
            }

            if (piezaObjEnCasillaClick && piezaObjEnCasillaClick.color === pMovidaObj.color) {
                limpiarResaltadoMovimientosPosibles();
                cOrigenEl.classList.remove('seleccionada');
                casillaClickeada.classList.add('seleccionada');
                piezaSeleccionada = {casillaElemento:casillaClickeada, piezaObjeto:piezaObjEnCasillaClick, posicionOriginalStr:cDestinoStr};
                const movimientosNuevos = getMovimientosLegalesParaPieza(piezaSeleccionada.piezaObjeto, piezaSeleccionada.posicionOriginalStr);
                movimientosNuevos.forEach(destinoStr => {
                    const casillaDestinoEl = document.querySelector(`[data-posicion="${destinoStr}"]`);
                    if (casillaDestinoEl) {
                        casillaDestinoEl.classList.add('movimiento-posible');
                        casillasElementosResaltadosComoPosibles.push(casillaDestinoEl);
                    }
                });
                return;
            }

            let movValidoBase = false;
            if(pMovidaObj.tipo==='peon')movValidoBase=esMovimientoValidoPeon(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='torre')movValidoBase=esMovimientoValidoTorre(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='caballo')movValidoBase=esMovimientoValidoCaballo(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='alfil')movValidoBase=esMovimientoValidoAlfil(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='reina')movValidoBase=esMovimientoValidoReina(pMovidaObj,cOrigenStr,cDestinoStr); else if(pMovidaObj.tipo==='rey')movValidoBase=esMovimientoValidoRey(pMovidaObj,cOrigenStr,cDestinoStr);

            let movFinalValido = movValidoBase;
            const pEnDestinoOriginal = getPiezaEnCasilla(cDestinoStr); // Pieza que está en la casilla destino ANTES del movimiento

            if (movValidoBase) {
                const colorJugadorActual = pMovidaObj.color;
                pMovidaObj.posicionActual = cDestinoStr;
                let idPiezaCapturadaSim = null;
                if(pEnDestinoOriginal){ const pCapSimArrayObj=piezas.find(p=>p.id===pEnDestinoOriginal.id); if(pCapSimArrayObj){idPiezaCapturadaSim=pCapSimArrayObj.id;pCapSimArrayObj.posicionActual=null;} }
                if(estaEnJaque(colorJugadorActual)){movFinalValido=false;}
                pMovidaObj.posicionActual = cOrigenStr;
                if(idPiezaCapturadaSim){ const pRestSimArrayObj=piezas.find(p=>p.id===idPiezaCapturadaSim); if(pRestSimArrayObj){pRestSimArrayObj.posicionActual=cDestinoStr;} }
            }

            if (movFinalValido) {
                limpiarResaltadoMovimientosPosibles();
                document.querySelectorAll('.en-jaque').forEach(c => c.classList.remove('en-jaque'));
                limpiarResaltadoUltimoMovimiento();

                ultimaCasillaOrigenEl = cOrigenEl;
                ultimaCasillaDestinoEl = casillaClickeada;
                if (ultimaCasillaOrigenEl) ultimaCasillaOrigenEl.classList.add('ultimo-mov-origen');
                if (ultimaCasillaDestinoEl) ultimaCasillaDestinoEl.classList.add('ultimo-mov-destino');

                // --- Lógica para mostrar piezas capturadas ---
                if (pEnDestinoOriginal) { // Si hay una pieza en el destino y el movimiento es válido (ya implica que es enemiga)
                    const simboloCapturado = pEnDestinoOriginal.simbolo;
                    const piezaCapturadaSpan = document.createElement('span');
                    piezaCapturadaSpan.textContent = simboloCapturado;

                    if (pMovidaObj.color === 'blanco') { // Blancas capturaron una pieza negra
                        if (simbolosBlancasCapturoEl) simbolosBlancasCapturoEl.appendChild(piezaCapturadaSpan);
                    } else { // Negras capturaron una pieza blanca
                        if (simbolosNegrasCapturoEl) simbolosNegrasCapturoEl.appendChild(piezaCapturadaSpan);
                    }
                    // Marcar la pieza como capturada en el array 'piezas'
                    const pCapRealArrayObj=piezas.find(p=>p.id===pEnDestinoOriginal.id);
                    if(pCapRealArrayObj) pCapRealArrayObj.posicionActual=null;
                }
                // --- Fin de la lógica para mostrar piezas capturadas ---

                const esCap = !!pEnDestinoOriginal;
                let notacionMov = formatearNotacionMovimiento(pMovidaObj, cOrigenStr, cDestinoStr, esCap);

                casillaClickeada.textContent = pMovidaObj.simbolo; casillaClickeada.dataset.piezaId = pMovidaObj.id;
                cOrigenEl.textContent = ''; delete cOrigenEl.dataset.piezaId;
                pMovidaObj.posicionActual = cDestinoStr;

                const jugadorQueMovio = turnoActual;
                turnoActual=(turnoActual==='blanco')?'negro':'blanco';

                let finJuego = false, msgFinJuego = "";
                if(estaEnJaque(turnoActual)){
                    if(esJaqueMate(turnoActual)){
                        finJuego=true; msgFinJuego=`¡JAQUE MATE! Gana ${jugadorQueMovio}.`;
                        notacionMov += "#";
                    } else {
                        notacionMov += "+";
                    }
                } else if(esEmpate(turnoActual)){
                    finJuego=true; msgFinJuego="¡EMPATE (Ahogado)! La partida termina en tablas.";
                }

                if(jugadorQueMovio==='blanco'){ historialMovimientos.push({numero:numeroDeMovimientoActual, blancas:notacionMov, negras:""}); }
                else{ if(historialMovimientos.length>0){historialMovimientos[historialMovimientos.length-1].negras=notacionMov;} numeroDeMovimientoActual++; }
                actualizarDisplayHistorialMovimientos();
                actualizarIndicadorTurno();

                if(finJuego){ alert(msgFinJuego); deshabilitarMovimientoPiezas(); clearInterval(intervaloTemporizador); }
                else {
                    if (notacionMov.endsWith("+")) {
                         alert(`¡Jaque al rey ${turnoActual}!`);
                         const posReyJaque=encontrarPosicionRey(turnoActual);
                         if(posReyJaque){ const cRey=document.querySelector(`[data-posicion="${posReyJaque}"]`); if(cRey)cRey.classList.add('en-jaque');}
                    }
                    iniciarOReanudarTemporizadorJugador();
                }
            }
            cOrigenEl.classList.remove('seleccionada');
            piezaSeleccionada = null;
        }
    }

    function encontrarPosicionRey(colorRey){const r=piezas.find(p=>p.tipo==='rey'&&p.color===colorRey&&p.posicionActual); return r?r.posicionActual:null;}
    function getCasillasAtacadasPor(colorAtacante) { /* ... (sin cambios) ... */
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
    function estaEnJaque(colorRey){const pR=encontrarPosicionRey(colorRey); if(!pR)return false; const cA=(colorRey==='blanco'?'negro':'blanco'); return getCasillasAtacadasPor(cA).includes(pR);}
    function getMovimientosLegalesParaPieza(piezaConsiderada, casillaOrigenActualStr) { /* ... (sin cambios) ... */
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
                    const idPiezaCapturada = piezaEnDestinoEval ? piezaEnDestinoEval.id : null;
                    piezaConsiderada.posicionActual = casillaDestinoStr;
                    if (idPiezaCapturada) { const pCapSim = piezas.find(p => p.id === idPiezaCapturada); if (pCapSim) pCapSim.posicionActual = null; }
                    let autoJaque = estaEnJaque(piezaConsiderada.color);
                    piezaConsiderada.posicionActual = casillaOrigenActualStr;
                    if (idPiezaCapturada) { const pCapSim = piezas.find(p => p.id === idPiezaCapturada); if (pCapSim) pCapSim.posicionActual = casillaDestinoStr; }
                    if (!autoJaque) { movimientosLegalesParaEstaPieza.push(casillaDestinoStr); }
                }
            }
        }
        return movimientosLegalesParaEstaPieza;
    }
    function getTodosMovimientosLegalesPosibles(colorJugador) { /* ... (sin cambios) ... */
        const movimientosLegales = [];
        const piezasDelJugador = piezas.filter(p => p.color === colorJugador && p.posicionActual);
        for (const pieza of piezasDelJugador) {
            const movimientosParaEstaPieza = getMovimientosLegalesParaPieza(pieza, pieza.posicionActual);
            movimientosParaEstaPieza.forEach(destino => {
                movimientosLegales.push({piezaId:pieza.id, casillaOrigen:pieza.posicionActual, casillaDestino:destino});
            });
        }
        return movimientosLegales;
    }
    function esJaqueMate(colorReyEnJaque) { if (!estaEnJaque(colorReyEnJaque)) return false; return getTodosMovimientosLegalesPosibles(colorReyEnJaque).length === 0; }
    function esEmpate(colorJugadorTurno) { if (estaEnJaque(colorJugadorTurno)) return false; return getTodosMovimientosLegalesPosibles(colorJugadorTurno).length === 0; }
    function esMovimientoValidoRey(p,oS,dS) { const o=posicionACoordenadas(oS),d=posicionACoordenadas(dS); if(!o||!d||(o.f===d.f&&o.c===d.c))return false;return Math.abs(d.f-o.f)<=1&&Math.abs(d.c-o.c)<=1;}
    function esMovimientoValidoReina(p,oS,dS){ return esMovimientoValidoTorre(p,oS,dS)||esMovimientoValidoAlfil(p,oS,dS);}
    function esMovimientoValidoAlfil(p,oS,dS){const o=posicionACoordenadas(oS),d=posicionACoordenadas(dS);if(!o||!d||(o.f===d.f&&o.c===d.c)||Math.abs(d.f-o.f)!==Math.abs(d.c-o.c))return false;const dF=Math.sign(d.f-o.f),dC=Math.sign(d.c-o.c);let cF=o.f+dF,cC=o.c+dC;while(cF!==d.f){const pI=coordenadasAPosicion({fila:cF,columna:cC});if(getPiezaEnCasilla(pI))return false;cF+=dF;cC+=dC;}return true;}
    function esMovimientoValidoCaballo(p,oS,dS){const o=posicionACoordenadas(oS),d=posicionACoordenadas(dS);if(!o||!d)return false;const dFA=Math.abs(d.f-o.f),dCA=Math.abs(d.c-o.c);return(dFA===2&&dCA===1)||(dFA===1&&dCA===2);}
    function esMovimientoValidoTorre(p,oS,dS){const o=posicionACoordenadas(oS),d=posicionACoordenadas(dS);if(!o||!d||(o.f===d.f&&o.c===d.c)||(o.f!==d.f&&o.c!==d.c))return false;if(o.f===d.f){const cMn=Math.min(o.c,d.c),cMx=Math.max(o.c,d.c);for(let c=cMn+1;c<cMx;c++){if(getPiezaEnCasilla(coordenadasAPosicion({fila:o.f,columna:c})))return false;}}else{const fMn=Math.min(o.f,d.f),fMx=Math.max(o.f,d.f);for(let f=fMn+1;f<fMx;f++){if(getPiezaEnCasilla(coordenadasAPosicion({fila:f,columna:o.c})))return false;}}return true;}
    function esMovimientoValidoPeon(pz,oS,dS){const o=posicionACoordenadas(oS),d=posicionACoordenadas(dS);if(!o||!d)return false;const pED=getPiezaEnCasilla(dS),dCol=d.c-o.c,dF=d.f-o.f;if(pz.color==='blanco'){if(dCol===0&&!pED){if(dF===-1)return true;if(dF===-2&&o.f===6&&!getPiezaEnCasilla(coordenadasAPosicion({fila:o.f-1,columna:o.c})))return true;}if(Math.abs(dCol)===1&&dF===-1&&pED&&pED.color==='negro')return true;}else{if(dCol===0&&!pED){if(dF===1)return true;if(dF===2&&o.f===1&&!getPiezaEnCasilla(coordenadasAPosicion({fila:o.f+1,columna:o.c})))return true;}if(Math.abs(dCol)===1&&dF===1&&pED&&pED.color==='blanco')return true;}return false;}
    function formatearTiempo(s){const m=Math.floor(s/60);const rS=s%60;return `${m.toString().padStart(2,'0')}:${rS.toString().padStart(2,'0')}`; }
    function actualizarVisualizacionTiemposIndividuales(){if(displayTiempoBlancas)displayTiempoBlancas.textContent=formatearTiempo(tiempoRestanteBlancas!==null?tiempoRestanteBlancas:tiempoSeleccionado); if(displayTiempoNegras)displayTiempoNegras.textContent=formatearTiempo(tiempoRestanteNegras!==null?tiempoRestanteNegras:tiempoSeleccionado); if(turnoActual==='blanco'){contenedorTiempoBlancas.classList.add('reloj-activo');contenedorTiempoNegras.classList.remove('reloj-activo');}else{contenedorTiempoNegras.classList.add('reloj-activo');contenedorTiempoBlancas.classList.remove('reloj-activo');}}
    function tickTemporizador(){if(turnoActual==='blanco'){tiempoRestanteBlancas--;if(tiempoRestanteBlancas<0)tiempoRestanteBlancas=0;}else{tiempoRestanteNegras--;if(tiempoRestanteNegras<0)tiempoRestanteNegras=0;} actualizarVisualizacionTiemposIndividuales(); const tA=(turnoActual==='blanco'&&tiempoRestanteBlancas<=0)||(turnoActual==='negro'&&tiempoRestanteNegras<=0); if(tA){clearInterval(intervaloTemporizador);alert(`¡Tiempo agotado! Gana ${turnoActual==='blanco'?'Negro':'Blanco'}.`);deshabilitarMovimientoPiezas();}}
    function iniciarOReanudarTemporizadorJugador(){clearInterval(intervaloTemporizador); if(tiempoRestanteBlancas===null||tiempoRestanteNegras===null){tiempoRestanteBlancas=tiempoSeleccionado;tiempoRestanteNegras=tiempoSeleccionado;} actualizarVisualizacionTiemposIndividuales(); intervaloTemporizador=setInterval(tickTemporizador,1000);}
    function actualizarIndicadorTurno(){mostrarTurnoJugador.textContent=`Turno de: ${turnoActual.charAt(0).toUpperCase()+turnoActual.slice(1)}`;actualizarVisualizacionTiemposIndividuales();}
    function habilitarMovimientoPiezas(){juegoIniciado=true;}
    function deshabilitarMovimientoPiezas(){juegoIniciado=false;}
    function confirmarSeleccionTiempo(s){tiempoSeleccionado=s;tiempoRestanteBlancas=s;tiempoRestanteNegras=s;divConfiguracionTiempo.style.display='none';actualizarVisualizacionTiemposIndividuales();habilitarMovimientoPiezas();iniciarOReanudarTemporizadorJugador();}
    function generarTextoHistorial(){let t="Historial de Movimientos Partida de Ajedrez\n-------------------------------------------------\n"; const fA=new Date(); t+=`Fecha: ${fA.toLocaleDateString()} ${fA.toLocaleTimeString()}\n`; t+=`Tiempo Juego: ${tiempoSeleccionado/60} min/jugador\n-------------------------------------------------\n\nN.  Blancas   Negras\n---------------------\n`; historialMovimientos.forEach(m=>{let l=`${m.numero.toString().padEnd(3,' ')} ${m.blancas.padEnd(9,' ')}`; if(m.negras){l+=`${m.negras}`;} t+=l+"\n";}); return t;}
    function descargarArchivoTexto(nom,con){const el=document.createElement('a');el.setAttribute('href','data:text/plain;charset=utf-8,'+encodeURIComponent(con));el.setAttribute('download',nom);el.style.display='none';document.body.appendChild(el);el.click();document.body.removeChild(el);}
    if(btnTiempo1Min&&btnTiempo5Min){btnTiempo1Min.addEventListener('click',()=>confirmarSeleccionTiempo(60));btnTiempo5Min.addEventListener('click',()=>confirmarSeleccionTiempo(300));}else{console.error("Botones de selección de tiempo no hallados.");}
    if(btnDescargarMovimientos){btnDescargarMovimientos.disabled=true;btnDescargarMovimientos.addEventListener('click',()=>{if(historialMovimientos.length===0){alert("No hay movimientos para descargar.");return;}const txt=generarTextoHistorial();const f=new Date();const nomArch=`partida_ajedrez_${f.getFullYear()}${String(f.getMonth()+1).padStart(2,'0')}${String(f.getDate()).padStart(2,'0')}_${String(f.getHours()).padStart(2,'0')}${String(f.getMinutes()).padStart(2,'0')}.txt`;descargarArchivoTexto(nomArch,txt);});}
    generarTablero();
    deshabilitarMovimientoPiezas();
});
// Fin del script.js
