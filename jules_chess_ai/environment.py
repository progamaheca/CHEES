import chess
import numpy as np
# Necesitaremos la función board_to_array.
# Asumimos que está en el mismo directorio para la importación.
from .representation import board_to_array

class ChessEnv:
    def __init__(self, max_moves_per_game=200):
        """
        Entorno de ajedrez para aprendizaje por refuerzo.

        Args:
            max_moves_per_game (int): Límite de movimientos totales en una partida
                                      para evitar bucles infinitos en autojuego.
        """
        self.board = chess.Board() # Instancia del tablero de python-chess
        self.max_moves_per_game = max_moves_per_game
        self.current_move_count = 0
        self.position_history = [] # Para la regla de triple repetición (FENs)

    def reset(self) -> np.ndarray:
        """
        Reinicia el tablero a la posición inicial, limpia el historial de movimientos
        y el contador de movimientos.

        Returns:
            La representación del tablero inicial como una matriz NumPy (8x8x12).
        """
        self.board.reset()
        self.current_move_count = 0
        # Almacenar el FEN de la posición para la regla de triple repetición
        self.position_history = [self.board.fen()]
        return board_to_array(self.board)

    def get_legal_moves(self) -> list[chess.Move]:
        """
        Obtiene la lista de movimientos legales (objetos chess.Move)
        para la posición actual del tablero.
        """
        return list(self.board.legal_moves)

    def step(self, move_idx: int) -> tuple[np.ndarray, float, bool, dict]:
        """
        Ejecuta un movimiento en el tablero basado en el índice de la lista de movimientos legales.

        Args:
            move_idx: El índice del movimiento a realizar en la lista de
                      movimientos legales actuales (obtenida de get_legal_moves()).

        Returns:
            Un tuple (new_state_array, reward, done, info):
            - new_state_array: La representación del nuevo estado del tablero (matriz 8x8x12).
            - reward: La recompensa obtenida después del movimiento (+1 blancas ganan,
                      -1 negras ganan/blancas pierden, 0 empate o en curso).
            - done: Booleano que indica si la partida ha terminado.
            - info: Un diccionario para información adicional (ej. resultado, razón del fin).
        """
        legal_moves = self.get_legal_moves()

        if not legal_moves: # No debería ocurrir si se llama después de verificar que hay movimientos
            # Esto significa que la partida ya terminó en el turno anterior.
            # Devolver el estado actual, recompensa 0 (o la del resultado previo), y done=True.
            # Esta situación se maneja mejor con la comprobación de is_game_over() antes de llamar a step.
            # Pero como salvaguarda:
            game_over_status = self.board.is_game_over(claim_draw=True)
            res = self.board.result(claim_draw=True) if game_over_status else "*"
            current_reward = 0.0
            if res == "1-0": current_reward = 1.0
            elif res == "0-1": current_reward = -1.0
            return board_to_array(self.board), current_reward, True, {'result': res, 'reason': 'No legal moves (pre-step)'}

        if move_idx < 0 or move_idx >= len(legal_moves):
            # Índice de movimiento inválido
            # Esto es un error en la lógica que llama a step.
            # Devolver estado sin cambios, recompensa negativa (penalización), y terminar.
            # O lanzar una excepción. Por ahora, penalizamos y terminamos.
            # La recompensa es para el jugador actual. Si es blanco y hace error, -1. Si es negro, +1.
            # Nota: esta recompensa es para el jugador BLANCO.
            # Si el jugador NEGRO comete el error, las blancas ganan (+1).
            # Si el jugador BLANCO comete el error, las negras ganan (-1).
            # Así que, si self.board.turn es WHITE (iba a mover blanco), recompensa es -1.
            # Si self.board.turn es BLACK (iba a mover negro), recompensa es 1.
            # Esto es un poco confuso. Es mejor que la lógica que llama a step evite esto.
            # Vamos a simplificar: si hay un error de índice, es un fallo catastrófico.
            raise IndexError(f"move_idx {move_idx} fuera de rango para {len(legal_moves)} movimientos legales.")

        chosen_move = legal_moves[move_idx]
        self.board.push(chosen_move)
        self.current_move_count += 1
        self.position_history.append(self.board.fen()) # Añadir FEN para regla de repetición

        reward = 0.0  # Recompensa por defecto (partida en curso)
        done = False
        info = {'result': '*'} # '*' significa en curso

        # Comprobar condiciones de fin de partida
        # 1. Jaque mate, Ahogado, Material insuficiente, Regla de 50 movimientos, Triple repetición
        if self.board.is_game_over(claim_draw=True):
            done = True
            result_str = self.board.result(claim_draw=True)
            info['result'] = result_str
            if self.board.is_checkmate():
                info['reason'] = 'checkmate'
                # La recompensa es desde la perspectiva de las blancas.
                # Si el jugador que ACABA DE MOVER (y dio mate) es blanco, recompensa +1.
                # Si el jugador que ACABA DE MOVER es negro, blancas pierden, recompensa -1.
                # self.board.turn ahora es el jugador que NO movió.
                # Así que, si self.board.turn es NEGRO, las blancas (que movieron antes) ganaron.
                reward = 1.0 if self.board.turn == chess.BLACK else -1.0
            elif self.board.is_stalemate():
                info['reason'] = 'stalemate'
                reward = 0.0
            elif self.board.is_insufficient_material():
                info['reason'] = 'insufficient_material'
                reward = 0.0
            elif self.board.is_seventyfive_moves(): # python-chess usa 75 por defecto para is_game_over
                info['reason'] = 'seventyfive_moves_rule' # o fifty_moves si ajustas is_fifty_moves
                reward = 0.0
            elif self.board.is_fivefold_repetition(): # python-chess usa 5 por defecto para is_game_over
                 info['reason'] = 'fivefold_repetition_rule' # o threefold si ajustas is_threefold_repetition
                 reward = 0.0
            else: # Otros empates (ej. variante de tres repeticiones, o 50 mov no detectados arriba)
                info['reason'] = 'draw_by_other_rule'
                reward = 0.0

        # 2. Límite de movimientos alcanzado
        elif self.current_move_count >= self.max_moves_per_game:
            done = True
            info['result'] = "1/2-1/2" # Empate
            info['reason'] = 'max_moves_reached'
            reward = 0.0

        return board_to_array(self.board), reward, done, info

# --- Ejemplo de Uso (actualizado) ---
if __name__ == '__main__':
    env = ChessEnv(max_moves_per_game=10) # Límite bajo para pruebas

    print("Entorno de Ajedrez inicializado.")
    initial_board_array = env.reset()
    print(f"FEN Inicial: {env.board.fen()}")
    print(env.board.unicode())

    done = False
    game_turn = 0
    # Necesitamos info aquí fuera del bucle para el print final
    info = {}
    while not done and game_turn < 15: # Jugar hasta 15 movimientos o fin de partida
        game_turn += 1
        print(f"\n--- Turno {game_turn} ---")
        print(f"Mueve: {'Blancas' if env.board.turn == chess.WHITE else 'Negras'}")

        legal_moves = env.get_legal_moves()
        if not legal_moves:
            print("No hay movimientos legales. La partida debería haber terminado en el paso anterior.")
            # Actualizar 'info' si el juego termina aquí por falta de movimientos
            if env.board.is_game_over(claim_draw=True):
                 info['result'] = env.board.result(claim_draw=True)
                 if env.board.is_checkmate(): info['reason'] = 'checkmate'
                 elif env.board.is_stalemate(): info['reason'] = 'stalemate'
                 else: info['reason'] = 'no_legal_moves_ended_game'
            else: # No debería llegar aquí si no hay movimientos legales
                 info['reason'] = 'no_legal_moves_unexpected'
            break

        print(f"Movimientos legales: {[env.board.san(m) for m in legal_moves]}")

        # Elegir un movimiento legal al azar (índice)
        chosen_move_idx = np.random.randint(0, len(legal_moves))
        chosen_move_san = env.board.san(legal_moves[chosen_move_idx]) # Para imprimir

        print(f"Movimiento elegido (idx {chosen_move_idx}): {chosen_move_san}")

        new_state_array, reward_for_white, done, info = env.step(chosen_move_idx)

        print("Tablero resultante:")
        print(env.board.unicode())
        print(f"Recompensa (para blancas): {reward_for_white}")
        print(f"Partida terminada: {done}")
        print(f"Info: {info}")
        # print(f"FEN actual: {env.board.fen()}")
        # print(f"Historial FENs: {env.position_history}")
        # print(f"Puede reclamar empate por 3-rep: {env.board.can_claim_threefold_repetition()}")
        # print(f"Movimientos sin captura/peón: {env.board.halfmove_clock}")


    print("\n--- Fin del Juego de Ejemplo ---")
    if info.get('reason'):
        print(f"Razón del fin: {info['reason']}")
    print(f"Resultado final: {info.get('result', '*')}")
    print(f"Total de movimientos en el entorno: {env.current_move_count}")
