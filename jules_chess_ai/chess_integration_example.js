// jules_chess_ai/chess_integration_example.js
// Ejemplo de cómo integrar la IA de Python con un tablero de ajedrez en JavaScript usando chess.js y Flask.

// Asegúrate de que chess.js esté cargado en tu página HTML antes que este script.
// Por ejemplo: <script src="https://cdnjs.cloudflare.com/ajax/libs/chess.js/0.10.3/chess.min.js"></script>

// --- Inicialización del Tablero (asumiendo que ya tienes esto en tu JS principal) ---
// let game = new Chess(); // Crea una nueva instancia de chess.js.
                         // Probablemente ya tengas una instancia global o en tu módulo principal.
                         // Aquí la comentamos para que este script sea solo un ejemplo de funciones.

/**
 * Obtiene el movimiento de la IA desde el servidor Flask.
 *
 * @param {object} chessInstance - La instancia actual de chess.js que maneja el estado del juego.
 * @param {string} flaskServerUrl - La URL del endpoint del servidor Flask (ej. 'http://localhost:5000/predict').
 * @returns {Promise<string|null>} El movimiento en formato UCI (ej. "e2e4") o null si hay error/fin de juego.
 */
async function getMoveFromAI(chessInstance, flaskServerUrl = 'http://localhost:5000/predict') {
    if (!chessInstance) {
        console.error("Instancia de chess.js no proporcionada a getMoveFromAI.");
        return null;
    }

    const fen = chessInstance.fen(); // Obtener el estado actual del tablero en formato FEN

    console.log("Enviando FEN a la IA:", fen);

    const bodyPayload = {
        fen: fen,
        // Assumes 'selectedAiModelFile' is a global variable accessible in this scope.
        // If not, it should be passed as an argument to getMoveFromAI.
        model_file: typeof selectedAiModelFile !== 'undefined' ? selectedAiModelFile : "jules_chess_model.pth" // Fallback to default
    };

    try {
        const response = await fetch(flaskServerUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyPayload), // Use the new payload
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error del servidor Flask:', response.status, errorData);
            alert(`Error de la IA: ${errorData.error || 'Error desconocido del servidor'}`);
            return null;
        }

        const data = await response.json();

        if (data.game_over) {
            console.log("La IA informa que la partida ha terminado. Resultado:", data.result);
            alert(`Partida terminada. Resultado: ${data.result}. ${data.message || ''}`);
            // Aquí podrías querer deshabilitar más movimientos o mostrar un mensaje final.
            return null;
        }

        if (data.move) {
            console.log("Movimiento recibido de la IA:", data.move);
            console.log("Valor estimado de la posición (por la IA):", data.value);
            return data.move; // Devuelve el movimiento en formato UCI (ej. "e2e4")
        } else {
            console.warn("La IA no devolvió un movimiento válido, pero la partida no ha terminado según la IA.");
            // Esto podría ser un estado inesperado.
            return null;
        }

    } catch (error) {
        console.error('Error al contactar al servidor de la IA:', error);
        alert('No se pudo conectar con el servidor de la IA. Asegúrate de que esté ejecutándose.');
        return null;
    }
}

/**
 * Actualiza la visualización del tablero en el DOM.
 * ESTA FUNCIÓN ES UN EJEMPLO Y DEBE SER ADAPTADA A TU ESTRUCTURA HTML.
 *
 * @param {object} chessInstance - La instancia actual de chess.js.
 */
function updateBoardDisplay(chessInstance) {
    if (!chessInstance) {
        console.error("Instancia de chess.js no proporcionada a updateBoardDisplay.");
        return;
    }

    const squares = chessInstance.SQUARES; // Array con los nombres de los escaques: "a1", "b1", ... "h8"

    for (const squareName of squares) {
        const piece = chessInstance.get(squareName); // Obtiene la pieza en el escaque (o null)
        // Asume que tus casillas en el DOM tienen un atributo como 'data-posicion="a1"'
        const squareElement = document.querySelector(`.casilla[data-posicion="${squareName}"]`);

        if (squareElement) {
            if (piece) {
                // Convierte el objeto pieza de chess.js a un símbolo Unicode o a una clase CSS
                squareElement.textContent = getPieceSymbol(piece);
                // O podrías hacer: squareElement.innerHTML = `<img src="path/to/${piece.color}${piece.type}.png">`;
            } else {
                squareElement.textContent = ''; // Limpiar la casilla
            }
        }
    }
    // Aquí también deberías actualizar otros elementos de la UI como:
    // - Indicador de turno.
    // - Información de jaque/jaque mate.
    // - Historial de movimientos, etc.
    // Esto dependerá de cómo esté estructurado tu ui.js o main.js.
}

/**
 * Convierte un objeto pieza de chess.js a un símbolo Unicode.
 * Ejemplo: { type: 'p', color: 'w' } -> '♙'
 *
 * @param {object} pieceObject - Objeto pieza de chess.js (ej. {type: 'p', color: 'w'}).
 * @returns {string} Símbolo Unicode de la pieza.
 */
function getPieceSymbol(pieceObject) {
    const symbols = {
        'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚', // Negras
        'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'  // Blancas
    };
    return pieceObject.color === 'b' ? symbols[pieceObject.type] : symbols[pieceObject.type.toUpperCase()];
}


// --- Cómo integrar esto en tu juego (Ejemplo conceptual) ---
// Esto es solo un ejemplo de cómo podrías llamarlo.
// Necesitarás adaptarlo a tu flujo de juego existente en main.js o similar.

/*
// En tu archivo main.js o donde manejes la lógica del juego:

// Asumiendo que 'game' es tu instancia global de Chess()
// y 'ui.actualizarTodoElTableroVisualmente(game);' es tu función para redibujar el tablero.

async function hacerJugarALA_IA() {
    if (game.game_over()) {
        console.log("La partida ya terminó. No se llamará a la IA.");
        return;
    }

    // Mostrar algún indicador de que la IA está "pensando"
    ui.mostrarMensajeTemporal("IA (Python) está pensando...", 2000, "info");

    const ai_move_uci = await getMoveFromAI(game); // Llama a la función de este archivo

    if (ai_move_uci) {
        const resultOfMove = game.move(ai_move_uci, { sloppy: true }); // Aplicar movimiento en chess.js
                                                                    // 'sloppy:true' puede ser útil si el formato UCI no es estricto

        if (resultOfMove === null) {
            console.error("Error: La IA devolvió un movimiento inválido o ilegal:", ai_move_uci);
            alert("Error: La IA intentó un movimiento inválido: " + ai_move_uci);
            // Aquí podrías manejar el error, quizás el jugador humano gana por defecto.
            return;
        }

        // Actualizar tu tablero visual en el DOM
        // Esta es TU función que redibuja el tablero basado en el estado de `game`.
        // Por ejemplo, si tu función se llama `actualizarTableroDOM` en `tablero.js`
        // o una función en `ui.js`.
        updateBoardDisplay(game); // Usando la función de ejemplo de este archivo. Adapta.

        // Comprobar si la partida terminó después del movimiento de la IA
        if (game.game_over()) {
            if (game.in_checkmate()) {
                alert("¡Jaque Mate! " + (game.turn() === 'w' ? "Ganan las Negras." : "Ganan las Blancas."));
            } else if (game.in_draw()) {
                alert("¡Empate!");
            } else if (game.in_stalemate()) {
                alert("¡Ahogado! Empate.");
            } else if (game.in_threefold_repetition()) {
                alert("¡Triple repetición! Empate.");
            }
            // Aquí también actualiza el estado del juego (ej. juegoIniciado = false;)
        } else {
            // Cambiar turno al jugador humano y actualizar UI de turno
            // (tu lógica de cambio de turno)
            // ej. cambiarTurno(); // Si tienes una función así
        }
    } else {
        // getMoveFromAI devolvió null, lo que significa que la partida pudo haber terminado
        // o hubo un error de comunicación. Los mensajes ya se mostraron.
        console.log("No se recibió movimiento de la IA o la partida terminó.");
    }
}

// Podrías tener un botón para que el jugador humano indique que es el turno de la IA,
// o esto podría llamarse automáticamente después del movimiento del humano si es Humano vs IA.
// Ejemplo de botón:
// <button id="btn_jugar_ia">Pedir movimiento a IA</button>
// document.getElementById('btn_jugar_ia').addEventListener('click', hacerJugarALA_IA);

// Si tu juego es Humano (Blancas) vs IA (Negras):
// Después de que el humano (blanco) haga un movimiento válido y cambie el turno a negras:
// if (game.turn() === 'b' && modoJuego === 'hvsia') { // 'b' para negras en chess.js
//     hacerJugarALA_IA();
// }

*/

console.log("chess_integration_example.js cargado. Contiene funciones de ejemplo para interactuar con la IA de Flask.");
console.log("Recuerda adaptar `updateBoardDisplay` y la lógica de llamada a tu proyecto existente.");
