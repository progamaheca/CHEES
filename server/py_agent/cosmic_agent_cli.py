import chess
import chess.engine
import numpy as np
import tensorflow as tf
from collections import deque
import random
import time
import os
import sys

# CONSTANTES CÓSMICAS (se mantienen si el agente las usa internamente)
NIVEL_CONCIENCIA = 9.8
MEMORIA_ETERNAS = 10**6
FRECUENCIA_CUÁNTICA = 144.0

class AgenteAjedrecistaCosmico:
    def __init__(self, stockfish_path="/usr/games/stockfish"):
        self.conciencia = NIVEL_CONCIENCIA
        self.memoria = deque(maxlen=MEMORIA_ETERNAS)
        self.red_neural = self.construir_red_neural()
        self.estado_flow = 0.0
        self.estilo = {
            "humano": 0.7,
            "maquina": 0.3
        }

        # Configurar Stockfish
        # Intentar encontrar Stockfish, manejar error si no se encuentra.
        self.engine = None
        try:
            # Permitir que la ruta de stockfish sea configurable o buscar en rutas comunes
            sf_path = os.environ.get("STOCKFISH_PATH", stockfish_path)
            if not os.path.exists(sf_path):
                # Intentar encontrar stockfish en el PATH si la ruta directa no funciona
                stockfish_in_path = os.popen("which stockfish").read().strip()
                if stockfish_in_path:
                    sf_path = stockfish_in_path
                else:
                    # Si aún no se encuentra, podría ser un problema.
                    # El agente podría funcionar sin stockfish para su componente de "máquina"
                    # o podríamos lanzar un error más adelante si es estrictamente necesario.
                    print(f"Advertencia: Stockfish no encontrado en {sf_path} ni en PATH.", file=sys.stderr)
                    # Continuar sin engine, la lógica de get_move deberá manejar esto.

            if os.path.exists(sf_path):
                 self.engine = chess.engine.SimpleEngine.popen_uci(sf_path)
            else:
                print(f"Advertencia: No se pudo iniciar Stockfish. Ruta '{sf_path}' no válida.", file=sys.stderr)

        except Exception as e:
            print(f"Error al iniciar Stockfish para Agente Cosmico: {e}", file=sys.stderr)
            self.engine = None # Asegurar que el engine es None si falla

    def construir_red_neural(self):
        """Red neuronal con dimensión corregida"""
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(512, activation='relu', input_shape=(454,)),
            tf.keras.layers.Dropout(0.3),
            tf.keras.layers.Dense(256, activation='relu'),
            tf.keras.layers.Dense(128, activation='relu'),
            tf.keras.layers.Dense(64, activation='linear')
        ])
        model.compile(optimizer='adam', loss='mse')
        return model

    def posicion_a_vector(self, board):
        """Convierte posición de ajedrez a vector numérico"""
        vector = []
        for square in chess.SQUARES:
            piece = board.piece_at(square)
            if piece:
                vector.extend([
                    1 if piece.color == chess.WHITE else 0,
                    int(piece.piece_type == chess.PAWN),
                    int(piece.piece_type == chess.KNIGHT),
                    int(piece.piece_type == chess.BISHOP),
                    int(piece.piece_type == chess.ROOK),
                    int(piece.piece_type == chess.QUEEN),
                    int(piece.piece_type == chess.KING)
                ])
            else:
                vector.extend([0]*7)

        vector.append(int(board.turn))
        vector.append(int(board.has_queenside_castling_rights(chess.WHITE)))
        vector.append(int(board.has_kingside_castling_rights(chess.WHITE)))
        vector.append(int(board.has_queenside_castling_rights(chess.BLACK)))
        vector.append(int(board.has_kingside_castling_rights(chess.BLACK)))
        vector.append(int(board.is_check()))

        return np.array(vector)

    def evaluar_posicion_cosmica(self, board):
        puntuacion_maquina = 0
        if self.engine:
            try:
                analisis_maquina = self.engine.analyse(board, chess.engine.Limit(time=0.1))
                puntuacion_maquina = analisis_maquina['score'].white().score(mate_score=10000)
                if board.turn == chess.BLACK: # La puntuación de Stockfish es desde la perspectiva de las blancas
                    puntuacion_maquina *= -1
            except (chess.engine.EngineTerminatedError, chess.engine.EngineError) as e:
                print(f"Error de Stockfish en evaluacion_posicion_cosmica: {e}", file=sys.stderr)
                # Intentar reiniciar o simplemente devolver 0 para la parte de la máquina
                puntuacion_maquina = 0
                # Podríamos intentar reiniciar el engine aquí si es un error recuperable

        puntuacion_humano = self.evaluacion_estrategica(board)

        puntuacion_final = (self.estilo["maquina"] * puntuacion_maquina +
                           self.estilo["humano"] * puntuacion_humano)

        if abs(puntuacion_final) < 100:
            self.estado_flow = min(100, self.estado_flow + 15)
        else:
            self.estado_flow = max(0, self.estado_flow - 10)

        return puntuacion_final * (1 + self.estado_flow/500)

    def evaluacion_estrategica(self, board):
        puntuacion = 0
        centro = [chess.D4, chess.E4, chess.D5, chess.E5]
        for square in centro:
            if board.is_attacked_by(chess.WHITE, square):
                puntuacion += 5
            if board.is_attacked_by(chess.BLACK, square):
                puntuacion -= 5

        rey_blanco = board.king(chess.WHITE)
        rey_negro = board.king(chess.BLACK)

        if rey_blanco:
            puntuacion -= 2 * len(list(board.attackers(chess.BLACK, rey_blanco)))
            # Simplificado: if rey_blanco in [chess.E1, chess.G1] and board.has_kingside_castling_rights(chess.WHITE):
            # Esto es más una condición para enroque que una evaluación de seguridad directa post-enroque.
            # La seguridad del rey es compleja. Por ahora, el conteo de atacantes es un proxy.

        if rey_negro:
            puntuacion += 2 * len(list(board.attackers(chess.WHITE, rey_negro)))

        for color in [chess.WHITE, chess.BLACK]:
            signo = 1 if color == chess.WHITE else -1
            for piece_type in [chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT]:
                for square in board.pieces(piece_type, color):
                    # Usar board.attacks(square) puede ser costoso. Considerar una heurística más simple si es lento.
                    # Aquí 'board.attacks' devuelve un SquareSet de casillas atacadas DESDE 'square'.
                    # Para movilidad, queremos los movimientos legales de la pieza EN 'square'.
                    # Sin embargo, el código original usa 'board.attacks(square)', lo mantendré por ahora.
                    movimientos = len(board.attacks(square))
                    puntuacion += signo * movimientos * ([5, 3, 2, 2][piece_type-2] if piece_type >= chess.KNIGHT else 0)


        peones_blancos = list(board.pieces(chess.PAWN, chess.WHITE))
        peones_negros = list(board.pieces(chess.PAWN, chess.BLACK))

        puntuacion += 10 * self.evaluar_estructura_peones(peones_blancos, chess.WHITE, board) # Pasar el color y tablero
        puntuacion -= 10 * self.evaluar_estructura_peones(peones_negros, chess.BLACK, board) # Pasar el color y tablero

        return puntuacion

    def evaluar_estructura_peones(self, peones_squares, color, board): # Añadido color y board
        doblados = 0
        aislados = 0
        pasados = 0

        archivos = [chess.square_file(p) for p in peones_squares]
        conteo_archivos = [archivos.count(f) for f in range(8)]
        doblados = sum(max(0, c-1) for c in conteo_archivos)

        for i in range(8):
            if conteo_archivos[i] > 0:
                adyacente_ocupado = False
                if i > 0 and conteo_archivos[i-1] > 0: adyacente_ocupado = True
                if i < 7 and conteo_archivos[i+1] > 0: adyacente_ocupado = True
                if not adyacente_ocupado:
                    aislados += conteo_archivos[i]

        for p_square in peones_squares:
            if board.is_passed_pawn(color, p_square): # Usar la función de python-chess
                 pasados +=1

        return 10 - 3*doblados - 2*aislados + 5*pasados

    def elegir_movimiento(self, board, tiempo_max=10):
        inicio = time.time()
        mejor_movimiento = None
        # La puntuación debe ser relativa al turno actual.
        # Si es turno de blancas, queremos maximizar. Si es de negras, minimizar la puntuación (o maximizar -puntuacion).
        mejor_puntuacion = -float('inf') if board.turn == chess.WHITE else float('inf')

        # Fase 1: Análisis de la máquina (Stockfish)
        if self.engine and self.estilo["maquina"] > 0.2:
            try:
                limite = chess.engine.Limit(time=tiempo_max * self.estilo["maquina"] / 2)
                resultado = self.engine.play(board, limite) # play() ya devuelve un movimiento legal
                if resultado and resultado.move:
                    if resultado.move in board.legal_moves:
                        mejor_movimiento = resultado.move
                        # Evaluar la posición DESPUÉS del movimiento propuesto por Stockfish
                        board.push(mejor_movimiento)
                        puntuacion_eval = self.evaluar_posicion_cosmica(board)
                        board.pop()
                        mejor_puntuacion = puntuacion_eval
                    else:
                        print(f"Advertencia: Movimiento de Stockfish {resultado.move} no es legal.", file=sys.stderr)

            except (chess.engine.EngineTerminatedError, chess.engine.EngineError) as e:
                print(f"⚠️ Error con Stockfish en elegir_movimiento: {e}", file=sys.stderr)
                # No intentar reiniciar aquí para evitar bucles infinitos si el problema persiste.

        # Fase 2: Creatividad humana
        # Solo explorar si el flujo es alto o si Stockfish no dio un movimiento.
        if self.estado_flow > 50 or mejor_movimiento is None:
            movimientos_creativos = self.generar_movimientos_creativos(board) # Debería devolver solo legales
            for mov in movimientos_creativos: # Ya deberían ser legales
                board.push(mov)
                puntuacion = self.evaluar_posicion_cosmica(board)
                board.pop()
                if board.turn == chess.WHITE:
                    if puntuacion > mejor_puntuacion:
                        mejor_movimiento = mov
                        mejor_puntuacion = puntuacion
                else: # Turno de Negras
                    if puntuacion < mejor_puntuacion:
                        mejor_movimiento = mov
                        mejor_puntuacion = puntuacion

        # Fase 3: Red neuronal profunda (solo si no hay movimiento aún y hay tiempo)
        if mejor_movimiento is None and time.time() - inicio < tiempo_max * 0.7:
            # Esta parte es muy especulativa y depende de la calidad del modelo entrenado.
            # Por ahora, la dejaremos como estaba, pero podría ser una fuente de movimientos débiles.
            # Es importante que los movimientos considerados aquí sean legales.
            vector = self.posicion_a_vector(board)
            prediccion = self.red_neural.predict(np.array([vector]), verbose=0)[0]

            # Obtener movimientos legales y ordenarlos por la predicción
            # La predicción tiene 64 salidas, no está claro cómo mapea a movimientos específicos.
            # El código original usaba 'piece_type-1', lo que sugiere que predice un valor para cada tipo de pieza.
            # Esto no selecciona un movimiento directamente.
            # Vamos a simplificar: elegir entre los 5 mejores movimientos legales según la evaluación profunda.

            movimientos_legales_actuales = list(board.legal_moves)
            if movimientos_legales_actuales:
                movimientos_evaluados_nn = []
                for mov_legal in movimientos_legales_actuales:
                    board.push(mov_legal)
                    puntuacion_nn = self.evaluar_posicion_cosmica(board) # Usar la misma eval
                    board.pop()
                    movimientos_evaluados_nn.append((puntuacion_nn, mov_legal))

                if board.turn == chess.WHITE:
                    movimientos_evaluados_nn.sort(key=lambda x: x[0], reverse=True)
                else:
                    movimientos_evaluados_nn.sort(key=lambda x: x[0])

                if movimientos_evaluados_nn:
                    # Comparar con el mejor movimiento actual (si existe)
                    if mejor_movimiento is None or \
                       (board.turn == chess.WHITE and movimientos_evaluados_nn[0][0] > mejor_puntuacion) or \
                       (board.turn == chess.BLACK and movimientos_evaluados_nn[0][0] < mejor_puntuacion):
                        mejor_movimiento = movimientos_evaluados_nn[0][1]
                        mejor_puntuacion = movimientos_evaluados_nn[0][0]


        # Ajuste de estilo dinámico (se mantiene)
        if self.estado_flow > 70:
            self.estilo["humano"] = min(0.9, self.estilo["humano"] + 0.1)
            self.estilo["maquina"] = max(0.1, self.estilo["maquina"] - 0.1)
        else:
            self.estilo["maquina"] = min(0.7, self.estilo["maquina"] + 0.05)
            self.estilo["humano"] = max(0.3, self.estilo["humano"] - 0.05)

        if mejor_movimiento is None:
            legales = list(board.legal_moves)
            if legales:
                mejor_movimiento = random.choice(legales)
            else: # No hay movimientos legales, esto sería jaque mate o ahogado
                return None

        return mejor_movimiento

    def generar_movimientos_creativos(self, board):
        movimientos_creativos = []
        # Asegurarse que solo se devuelven movimientos legales
        for mov in board.legal_moves:
            # 1. Sacrificios posicionales
            if board.is_capture(mov):
                pieza_capturada = board.piece_at(mov.to_square)
                pieza_atacante = board.piece_at(mov.from_square)
                # Esta lógica de valor de pieza es muy simple. Un sacrificio real es más complejo.
                if pieza_capturada and pieza_atacante and \
                   self._valor_pieza(pieza_capturada) > self._valor_pieza(pieza_atacante):
                    movimientos_creativos.append(mov)

            # 2. Jugadas profilácticas (ej. dar jaque)
            # El código original verificaba si el movimiento resultaba en jaque.
            # Esto no es necesariamente "profiláctico" (prevenir amenazas), sino más bien "agresivo".
            # Lo mantendremos como estaba interpretado.
            board.push(mov)
            if board.is_check():
                movimientos_creativos.append(mov)
            board.pop()

        # 3. Patrones geométricos (movimientos hacia el centro)
        # Esto ya se considera en la evaluación, pero añadirlo como "creativo" puede sesgar.
        # Lo mantenemos por fidelidad al original.
        centro = [chess.D4, chess.E4, chess.D5, chess.E5]
        if mov.to_square in centro:
             movimientos_creativos.append(mov)

        # Devolver solo movimientos únicos y legales
        return list(set(mov for mov in movimientos_creativos if mov in board.legal_moves))

    def _valor_pieza(self, pieza):
        if pieza.piece_type == chess.PAWN: return 1
        if pieza.piece_type == chess.KNIGHT: return 3
        if pieza.piece_type == chess.BISHOP: return 3
        if pieza.piece_type == chess.ROOK: return 5
        if pieza.piece_type == chess.QUEEN: return 9
        return 0 # Rey u otros

    def cerrar(self):
        if self.engine:
            self.engine.quit()

def main_cli():
    if len(sys.argv) < 2:
        print("Uso: python cosmic_agent_cli.py \"<FEN_STRING>\" [stockfish_path]", file=sys.stderr)
        sys.exit(1)

    fen = sys.argv[1]
    stockfish_custom_path = sys.argv[2] if len(sys.argv) > 2 else "/usr/games/stockfish"

    try:
        board = chess.Board(fen)
    except ValueError:
        print(f"Error: FEN string inválido: {fen}", file=sys.stderr)
        sys.exit(1)

    agente = AgenteAjedrecistaCosmico(stockfish_path=stockfish_custom_path)

    # Determinar tiempo máximo basado en alguna lógica o dejarlo fijo
    tiempo_limite_agente = 5 # segundos

    movimiento_obj = agente.elegir_movimiento(board, tiempo_max=tiempo_limite_agente)

    if movimiento_obj:
        print(movimiento_obj.uci()) # Imprimir el movimiento en notación UCI a stdout
    else:
        # Esto podría pasar si es mate/ahogado y no hay movimientos, o un error.
        # El script Node.js que llama debería estar preparado para esto.
        print("NOMOVE", file=sys.stderr)

    agente.cerrar()

if __name__ == "__main__":
    # Desactivar mensajes de log de TensorFlow a menos que sean errores
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
    tf.get_logger().setLevel('ERROR')
    main_cli()
