// Espera a que el contenido del DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    const contenedorTablero = document.getElementById('contenedor_tablero');
    const mostrarTurnoJugador = document.getElementById('mostrar_turno_jugador');

    // Representación de Piezas y Posiciones Iniciales
    // Unicode: Torre (♖♜), Caballo (♘♞), Alfil (♗♝), Reina (♕♛), Rey (♔♚), Peón (♙♟)
    let piezas = [
        // Piezas Blancas (ejemplo inicial)
        { simbolo: '♜', color: 'negro', posicionOriginal: 'a8', posicionActual: 'a8', id: 'torre-n-1' },
        { simbolo: '♞', color: 'negro', posicionOriginal: 'b8', posicionActual: 'b8', id: 'caballo-n-1' },
        { simbolo: '♝', color: 'negro', posicionOriginal: 'c8', posicionActual: 'c8', id: 'alfil-n-1' },
        { simbolo: '♜', color: 'negro', posicionOriginal: 'h8', posicionActual: 'h8', id: 'torre-n-2' },
        { simbolo: '♟', color: 'negro', posicionOriginal: 'a7', posicionActual: 'a7', id: 'peon-n-1' },
        { simbolo: '♟', color: 'negro', posicionOriginal: 'b7', posicionActual: 'b7', id: 'peon-n-2' },
        { simbolo: '♟', color: 'negro', posicionOriginal: 'c7', posicionActual: 'c7', id: 'peon-n-3' },


        // Piezas Negras (ejemplo inicial)
        { simbolo: '♖', color: 'blanco', posicionOriginal: 'a1', posicionActual: 'a1', id: 'torre-b-1' },
        { simbolo: '♘', color: 'blanco', posicionOriginal: 'b1', posicionActual: 'b1', id: 'caballo-b-1' },
        { simbolo: '♗', color: 'blanco', posicionOriginal: 'c1', posicionActual: 'c1', id: 'alfil-b-1' },
        { simbolo: '♖', color: 'blanco', posicionOriginal: 'h1', posicionActual: 'h1', id: 'torre-b-2' },
        { simbolo: '♙', color: 'blanco', posicionOriginal: 'a2', posicionActual: 'a2', id: 'peon-b-1' },
        { simbolo: '♙', color: 'blanco', posicionOriginal: 'b2', posicionActual: 'b2', id: 'peon-b-2' },
        { simbolo: '♙', color: 'blanco', posicionOriginal: 'c2', posicionActual: 'c2', id: 'peon-b-3' },
    ];

    let piezaSeleccionada = null; // Almacena la información de la pieza seleccionada
    let turnoActual = 'blanco'; // Comienzan las blancas
    let tiempoRestante = 60; // Segundos para el temporizador
    let intervaloTemporizador = null; // Referencia al intervalo del temporizador

    // Función para convertir posición tipo 'a1' a coordenadas [fila, columna]
    function posicionACoordenadas(posicion) {
        const columna = posicion.charCodeAt(0) - 'a'.charCodeAt(0); // 'a' -> 0, 'b' -> 1, ...
        const fila = 8 - parseInt(posicion.substring(1)); // '1' -> 7, '2' -> 6, ... (tablero invertido en array)
        return [fila, columna];
    }

    // Función para convertir coordenadas [fila, columna] a posición tipo 'a1'
    function coordenadasAPosicion(fila, columna) {
        const letraColumna = String.fromCharCode('a'.charCodeAt(0) + columna);
        const numeroFila = 8 - fila;
        return `${letraColumna}${numeroFila}`;
    }

    // Función para crear el tablero de ajedrez
    function generarTablero() {
        for (let i = 0; i < 8; i++) { // 8 filas
            for (let j = 0; j < 8; j++) { // 8 columnas
                const casilla = document.createElement('div');
                casilla.classList.add('casilla');

                // Alternar colores de las casillas
                if ((i + j) % 2 === 0) {
                    casilla.classList.add('blanca');
                } else {
                    casilla.classList.add('negra');
                }

                // Añadir coordenadas como data-attributes
                casilla.dataset.fila = i;
                casilla.dataset.columna = j;
                casilla.dataset.posicion = coordenadasAPosicion(i, j); // ej: a1, h8

                // Event listener para cada casilla
                casilla.addEventListener('click', () => manejarClickCasilla(casilla));

                contenedorTablero.appendChild(casilla);
            }
        }
        colocarPiezasIniciales();
        actualizarIndicadorTurno(); // Mostrar turno inicial
    }

    // Función para colocar las piezas en sus posiciones iniciales
    function colocarPiezasIniciales() {
        piezas.forEach((pieza, index) => {
            const [fila, columna] = posicionACoordenadas(pieza.posicionActual);
            const selectorCasilla = `[data-fila="${fila}"][data-columna="${columna}"]`;
            const casilla = contenedorTablero.querySelector(selectorCasilla);

            if (casilla) {
                casilla.textContent = pieza.simbolo;
                casilla.dataset.piezaId = pieza.id; // Guardar el ID de la pieza en la casilla
                // Aplicar color a la pieza si es necesario (ej. si no se distingue bien en casilla oscura)
                // if (pieza.color === 'negro' && casilla.classList.contains('negra')) {
                //     casilla.style.color = '#CCC'; // Un gris claro para piezas negras en casillas negras
                // } else if (pieza.color === 'blanco' && casilla.classList.contains('negra')) {
                //      casilla.style.color = 'white';
                // } else if (pieza.color === 'negro' && casilla.classList.contains('blanca')) {
                //      casilla.style.color = 'black';
                // }
            }
        });
    }

    // Función para manejar el click en una casilla
    function manejarClickCasilla(casillaClickeada) {
        const piezaIdEnCasilla = casillaClickeada.dataset.piezaId;
        const piezaActualEnCasilla = piezaIdEnCasilla ? piezas.find(p => p.id === piezaIdEnCasilla) : null;

        if (piezaSeleccionada === null) {
            // 1. Si no hay pieza seleccionada, intentar seleccionar una
            if (piezaActualEnCasilla && piezaActualEnCasilla.color === turnoActual) {
                piezaSeleccionada = {
                    elemento: casillaClickeada, // La casilla HTML donde está la pieza
                    pieza: piezaActualEnCasilla, // El objeto de la pieza
                    posicionOriginal: casillaClickeada.dataset.posicion
                };
                casillaClickeada.classList.add('seleccionada');
                console.log(`Pieza seleccionada: ${piezaSeleccionada.pieza.simbolo} en ${piezaSeleccionada.posicionOriginal}`);
            } else {
                console.log("Casilla vacía o pieza del color incorrecto.");
            }
        } else {
            // 2. Si ya hay una pieza seleccionada, intentar moverla
            const casillaOriginal = piezaSeleccionada.elemento;

            // Validar si el movimiento es a una casilla diferente (simple validación por ahora)
            if (casillaOriginal !== casillaClickeada) {
                // Mover la pieza (símbolo y data-piezaId)
                casillaClickeada.textContent = piezaSeleccionada.pieza.simbolo;
                casillaClickeada.dataset.piezaId = piezaSeleccionada.pieza.id;

                // Limpiar la casilla original
                casillaOriginal.textContent = '';
                delete casillaOriginal.dataset.piezaId;

                // Actualizar la posición en el array de piezas
                piezaSeleccionada.pieza.posicionActual = casillaClickeada.dataset.posicion;

                console.log(`Pieza ${piezaSeleccionada.pieza.simbolo} movida de ${piezaSeleccionada.posicionOriginal} a ${casillaClickeada.dataset.posicion}`);

                // Cambiar turno
                turnoActual = (turnoActual === 'blanco') ? 'negro' : 'blanco';
                actualizarIndicadorTurno();
                // reiniciarTemporizador(); // Se definirá en el siguiente paso
            }

            // Quitar resaltado y resetear pieza seleccionada, independientemente de si se movió o no (ej. click en la misma casilla)
            casillaOriginal.classList.remove('seleccionada');
            piezaSeleccionada = null;
        }
    }

    // Función para actualizar el indicador de turno
    function actualizarIndicadorTurno() {
        const nombreTurno = turnoActual.charAt(0).toUpperCase() + turnoActual.slice(1); // Capitalizar
        mostrarTurnoJugador.textContent = `Turno de: ${nombreTurno}`;
    }

    // Función para actualizar el indicador de turno
    function actualizarIndicadorTurno() {
        const nombreTurno = turnoActual.charAt(0).toUpperCase() + turnoActual.slice(1); // Capitalizar
        mostrarTurnoJugador.textContent = `Turno de: ${nombreTurno}`;
    }

    // --- Lógica del Temporizador ---

    // Función para actualizar la visualización del tiempo
    function actualizarVisualizacionTiempo() {
        const displayTiempo = document.getElementById('mostrar_tiempo');
        displayTiempo.textContent = `Tiempo: ${tiempoRestante}s`;
    }

    // Función que se ejecuta cada segundo para actualizar el temporizador
    function actualizarTemporizador() {
        tiempoRestante--;
        actualizarVisualizacionTiempo();

        if (tiempoRestante <= 0) {
            clearInterval(intervaloTemporizador);
            alert(`¡Tiempo agotado! El jugador ${turnoActual === 'blanco' ? 'Blanco' : 'Negro'} pierde.`);
            // Aquí se podría añadir lógica para deshabilitar el tablero o reiniciar el juego
            // Por ejemplo, deshabilitar clicks en las casillas:
            document.querySelectorAll('.casilla').forEach(casilla => {
                casilla.removeEventListener('click', manejarClickCasilla); // Esto necesitaría que manejarClickCasilla sea una referencia nombrada accesible
                // Para simplificar, podríamos añadir una bandera global como 'juegoTerminado = true'
                // y comprobarla en manejarClickCasilla.
            });
            // O simplemente mostrar un mensaje y permitir reiniciar manualmente (recargando la página)
        }
    }

    // Función para iniciar (o reiniciar) el temporizador
    function iniciarTemporizador() {
        clearInterval(intervaloTemporizador); // Limpia cualquier temporizador anterior
        tiempoRestante = 60; // Reinicia a 60 segundos
        actualizarVisualizacionTiempo(); // Muestra el tiempo inicial
        intervaloTemporizador = setInterval(actualizarTemporizador, 1000); // Inicia el conteo
    }

    // Función puente que se llama después de un movimiento
    function reiniciarTemporizador() {
        iniciarTemporizador();
    }


    // --- Inicialización del Juego ---

    // Llama a la función para generar el tablero cuando se carga la página
    generarTablero();
    // La llamada a actualizarIndicadorTurno() ya está dentro de generarTablero al final.
    iniciarTemporizador(); // Inicia el temporizador por primera vez

    // Más lógica del juego se agregará aquí si es necesario
});
