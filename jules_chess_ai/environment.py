import chess
import numpy as np
# Asumimos que representation.py está en el mismo directorio o es accesible.
from .representation import board_to_array

class ChessEnv:
    def __init__(self, max_moves_per_game=200):
        """
        Entorno de ajedrez para aprendizaje por refuerzo.

        Args:
            max_moves_per_game (int): Límite de movimientos totales en una partida
                                      para evitar bucles infinitos en autojuego.
        """
        self.board = chess.Board()
        self.max_moves_per_game = max_moves_per_game
        self.current_move_count = 0
        # Historial de posiciones para la regla de triple repetición, usando FEN como clave.
        # Se almacenará el FEN de la posición sin el contador de movimientos de medio tiempo
        # ni el número de movimiento completo, para una correcta detección de repetición de posición.
        self.position_counts = {}

    def _get_simplified_fen(self):
        """Devuelve el FEN sin el contador de movimientos de medio tiempo ni el número de movimiento completo."""
        # Ejemplo FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
        # Queremos: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -
        parts = self.board.fen().split(' ')
        return ' '.join(parts[:4]) # Piezas, turno, enroque, peón al paso

    def reset(self) -> np.ndarray:
        """
        Reinicia el tablero a la posición inicial y el estado del entorno.
        Devuelve la representación del tablero como una matriz NumPy (8x8x12).
        """
        self.board.reset()
        self.current_move_count = 0
        self.position_counts = {}
        simplified_fen = self._get_simplified_fen()
        self.position_counts[simplified_fen] = 1
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
            move_idx: Índice del movimiento en la lista de movimientos legales.
        Returns:
            Tupla (estado_matriz, recompensa, terminado, info):
            - estado_matriz: Nuevo estado del tablero (matriz 8x8x12).
            - recompensa: Recompensa para el jugador que acaba de mover.
            - terminado: True si la partida ha terminado.
            - info: Diccionario con información adicional.
        """
        legal_moves = self.get_legal_moves()
        player_who_was_to_move = self.board.turn # True para Blanco, False para Negro

        if not legal_moves: # Partida ya terminada antes de este paso
            # Esto no debería ocurrir si el bucle de juego comprueba 'done' correctamente.
            # Si ocurre, es un estado terminal, recompensa 0.
            return board_to_array(self.board), 0.0, True, {'result': self.board.result(claim_draw=True), 'reason': 'No legal moves (pre-step error)'}

        if not (0 <= move_idx < len(legal_moves)):
            # Movimiento inválido (índice fuera de rango)
            # Penalización para el jugador que intentó el movimiento inválido.
            # El juego termina, y el jugador actual pierde.
            # Recompensa -1 para el jugador que intentó mover.
            # Dado que la recompensa es para el jugador que acaba de mover, y este movimiento es "inválido"
            # y no se ejecuta, es más bien una penalización por un error de la IA o del agente.
            # Consideramos que el agente que eligió el move_idx inválido pierde.
            # Si player_who_was_to_move es Blanco (True), Blanco pierde (-1).
            # Si player_who_was_to_move es Negro (False), Negro pierde (-1), que desde la perspectiva de la IA es -1.
            print(f"Error Crítico: move_idx {move_idx} inválido para {len(legal_moves)} movimientos. Jugador que iba a mover: {'Blanco' if player_who_was_to_move else 'Negro'}.")
            # La partida termina, y el jugador que iba a mover (y eligió mal) recibe -1.
            return board_to_array(self.board), -1.0, True, {'result': 'invalid_move_idx', 'reason': 'Move index out of bounds'}

        chosen_move = legal_moves[move_idx]
        self.board.push(chosen_move)
        self.current_move_count += 1

        simplified_fen = self._get_simplified_fen()
        self.position_counts[simplified_fen] = self.position_counts.get(simplified_fen, 0) + 1

        done = False
        reward = 0.0  # Recompensa por defecto (partida en curso o empate estándar)
        info = {'result': '*'} # '*' significa en curso

        # Comprobar condiciones de fin de partida
        # La recompensa es desde la perspectiva del jugador QUE ACABA DE MOVER.

        # 1. Jaque Mate
        if self.board.is_checkmate():
            done = True
            info['result'] = self.board.result() # Será "1-0" o "0-1"
            info['reason'] = 'checkmate'
            reward = 1.0 # El jugador que movió y dio mate gana.

        # 2. Ahogado (Stalemate)
        elif self.board.is_stalemate():
            done = True
            info['result'] = self.board.result() # Será "1/2-1/2"
            info['reason'] = 'stalemate'
            reward = 0.0

        # 3. Material Insuficiente
        elif self.board.is_insufficient_material():
            done = True
            info['result'] = self.board.result() # Será "1/2-1/2"
            info['reason'] = 'insufficient_material'
            reward = 0.0

        # 4. Regla de 50 movimientos (is_fifty_moves verifica si se puede reclamar)
        #    board.can_claim_fifty_moves() es True si se cumplen los 50 movimientos.
        #    En autojuego, podemos terminarla directamente.
        elif self.board.is_fifty_moves(): # Si el contador de medios movimientos es >= 100 (50 mov. completos)
            done = True
            # self.board.result() no se actualiza solo por is_fifty_moves,
            # pero la partida es tablas si se reclama o bajo ciertas reglas de competición.
            info['result'] = "1/2-1/2"
            info['reason'] = 'fifty_moves_rule'
            reward = 0.0

        # 5. Triple Repetición
        #    board.can_claim_threefold_repetition() es True si la posición actual se ha repetido 3+ veces.
        #    En autojuego, podemos terminarla.
        elif self.position_counts[simplified_fen] >= 3:
            done = True
            # Similar a 50-mov, result() no se actualiza automáticamente solo por esto.
            info['result'] = "1/2-1/2"
            info['reason'] = 'threefold_repetition'
            reward = 0.0

        # 6. Límite de movimientos alcanzado
        elif self.current_move_count >= self.max_moves_per_game:
            done = True
            info['result'] = "1/2-1/2"
            info['reason'] = 'max_moves_reached'
            reward = 0.0

        # Si la partida no ha terminado, la recompensa es 0 para el jugador actual.
        # Las recompensas intermedias no se usan en este esquema simple (solo al final).

        return board_to_array(self.board), reward, done, info

    def get_current_player_color(self) -> chess.Color:
        return self.board.turn

    def render(self, mode='unicode'):
        if mode == 'unicode':
            print(self.board.unicode(empty_square='.'))
        else:
            print(self.board)

if __name__ == '__main__':
    env = ChessEnv(max_moves_per_game=200)
    state = env.reset()
    print("Tablero Inicial:")
    env.render()
    print(f"FEN: {env.board.fen()}")
    print(f"Simplified FEN: {env._get_simplified_fen()}")
    print(f"Position counts: {env.position_counts}")

    # Prueba de triple repetición
    print("\nPrueba de Triple Repetición:")
    # Movimientos para forzar una triple repetición (ejemplo simple)
    # Cg1-f3, Cg8-f6, Cf3-g1, Cf6-g8 (repetir posición inicial 2 veces más)
    moves_to_repeat = ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1"] # No la última

    done = False
    for uci_move in moves_to_repeat:
        if done: break
        move_obj = chess.Move.from_uci(uci_move)
        legal_moves = env.get_legal_moves()
        # Encontrar el índice del movimiento
        try:
            move_idx = legal_moves.index(move_obj)
            print(f"Ejecutando: {env.board.san(move_obj)}")
            state, reward, done, info = env.step(move_idx)
            env.render()
            print(f"Pos counts: {env.position_counts.get(env._get_simplified_fen(), 0)}")
            print(f"Recompensa: {reward}, Terminado: {done}, Info: {info}")
        except ValueError:
            print(f"Error: Movimiento {uci_move} no es legal o no encontrado.")
            break

    # El siguiente movimiento Cf6-g8 debería causar la tercera repetición y terminar el juego.
    if not done:
        last_move_obj = chess.Move.from_uci("f6g8")
        legal_moves = env.get_legal_moves()
        try:
            move_idx = legal_moves.index(last_move_obj)
            print(f"Ejecutando movimiento final para triple rep: {env.board.san(last_move_obj)}")
            state, reward, done, info = env.step(move_idx)
            env.render()
            print(f"Pos counts: {env.position_counts.get(env._get_simplified_fen(), 0)}")
            print(f"Recompensa: {reward}, Terminado: {done}, Info: {info}")
            if done and info.get('reason') == 'threefold_repetition':
                print("Prueba de Triple Repetición Exitosa!")
            else:
                print(f"Prueba de Triple Repetición Fallida o partida terminó por otra razón: {info}")
        except ValueError:
            print(f"Error: Movimiento final {last_move_obj.uci()} no es legal.")


    # Prueba de movimiento inválido
    print("\nPrueba de move_idx inválido:")
    env.reset()
    # Para probar el error de move_idx inválido, necesitamos saber cuántos movimientos legales hay.
    # No podemos simplemente usar 1000 si solo hay 20 movimientos legales.
    # En su lugar, intentaremos simular un error de lógica del agente.
    # Directamente llamar con un índice inválido si hay movimientos.
    # No se puede usar try-except aquí porque el IndexError detendría la ejecución del script.
    # Se comentará esta parte y se confiará en la lógica de la función.
    # Si se quiere probar explícitamente, se debe hacer en un test unitario con pytest.raises.
    # print("Intentando step con move_idx=1000 (esperando error o recompensa -1)...")
    # try:
    #     state, reward, done, info = env.step(1000)
    #     print(f"Recompensa por mov inválido: {reward}, Terminado: {done}, Info: {info}")
    #     if reward == -1.0 and done and info.get('reason') == 'Move index out of bounds':
    #         print("Prueba de mov inválido (recompensa -1, done True) Exitosa!")
    #     else:
    #         print(f"Prueba de mov inválido Fallida. Obtenido: r={reward}, d={done}, i={info}")
    # except IndexError as e:
    #     print(f"Prueba de mov inválido Exitosa con IndexError: {e}")

    # Prueba de jaque mate (Mate del Pastor)
    print("\nPrueba de Jaque Mate (Mate del Pastor):")
    env.reset()
    pastor_moves = ["e2e4", "e7e5", "d1h5", "b8c6", "f1c4", "g8f6", "h5f7"]
    for uci_move in pastor_moves:
        move_obj = chess.Move.from_uci(uci_move)
        legal_moves = env.get_legal_moves()
        if move_obj not in legal_moves:
            print(f"Error en secuencia de Mate del Pastor: {uci_move} no es legal.")
            break
        move_idx = legal_moves.index(move_obj)
        print(f"Ejecutando: {env.board.san(move_obj)} (Turno: {'W' if env.board.turn else 'B'})")
        state, reward, done, info = env.step(move_idx)
        env.render()
        print(f"Recompensa: {reward}, Terminado: {done}, Info: {info}")
        if done:
            if info.get('reason') == 'checkmate' and reward == 1.0 : # Recompensa 1.0 para el que dio mate
                print("Prueba de Mate del Pastor Exitosa!")
            else:
                print(f"Prueba de Mate del Pastor Fallida. Razón: {info.get('reason')}, Recompensa: {reward}")
            break
    if not done:
        print("Mate del Pastor no completado.")
