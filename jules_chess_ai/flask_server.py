from flask import Flask, request, jsonify
from flask_cors import CORS # Para permitir peticiones Cross-Origin
import chess
import torch
import numpy as np
import os

# Importar las clases y funciones necesarias de los otros archivos
# Asumimos que están en el mismo paquete o PYTHONPATH está configurado
try:
    from .representation import board_to_array
    from .network import ChessNet # Asegúrate que ChessNet está en network.py
except ImportError:
    # Fallback por si se ejecuta el script directamente y el paquete no está bien configurado
    from representation import board_to_array
    from network import ChessNet


app = Flask(__name__)
CORS(app) # Habilitar CORS para todas las rutas, útil para desarrollo local

# --- Configuración del Modelo ---
MODEL_FILENAME = "jules_chess_model.pth"
# Determinar NUM_POSSIBLE_MOVES de una instancia de la red.
# Esto debe coincidir con cómo se entrenó el modelo.
try:
    # Intenta obtener el número de movimientos de la definición de la clase si es posible,
    # o cárgalo de un archivo de configuración si lo tienes.
    # Por ahora, crearemos una instancia temporal para obtenerlo.
    temp_model_for_config = ChessNet()
    NUM_POSSIBLE_MOVES = temp_model_for_config.policy_head.out_features
    del temp_model_for_config
except Exception as e:
    print(f"Advertencia: No se pudo determinar NUM_POSSIBLE_MOVES automáticamente de ChessNet. Usando 1968 por defecto. Error: {e}")
    NUM_POSSIBLE_MOVES = 1968 # Un valor común, pero asegúrate que coincida con tu modelo entrenado.


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model = ChessNet(num_possible_moves=NUM_POSSIBLE_MOVES).to(device)

# Construir la ruta al modelo relativa a la ubicación de este script
script_dir = os.path.dirname(__file__) # Directorio del script actual (jules_chess_ai)
model_path = os.path.join(script_dir, MODEL_FILENAME)


try:
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval() # Poner el modelo en modo de evaluación
    print(f"Modelo '{MODEL_FILENAME}' cargado exitosamente en {device}.")
except FileNotFoundError:
    print(f"ADVERTENCIA: No se encontró el archivo del modelo '{model_path}'. El servidor usará una red no entrenada.")
except Exception as e:
    print(f"ADVERTENCIA: Error al cargar el modelo '{model_path}': {e}. El servidor usará una red no entrenada.")


def select_best_legal_move(board_fen, network_policy_logits, legal_chess_moves):
    """
    Selecciona el mejor movimiento legal basado en los logits de la política de la red.
    Args:
        board_fen: FEN del tablero actual (para logging o referencia).
        network_policy_logits: Tensor (1, NUM_POSSIBLE_MOVES) de la red.
        legal_chess_moves: Lista de objetos chess.Move que son legales.
    Returns:
        chess.Move (el mejor movimiento legal) o None si no hay movimientos legales.
    """
    if not legal_chess_moves:
        return None

    # --- Mapeo de logits de la red a movimientos legales ---
    # Esta es la parte más crítica y específica de la implementación.
    # Deberías usar la misma lógica de mapeo que planeas para tu entrenamiento.
    # Simplificación actual: Tomar los logits correspondientes a los primeros N movimientos.
    # ¡ESTO ES UNA SIMPLIFICACIÓN GRANDE Y DEBE SER REEMPLAZADO!

    num_legal = len(legal_chess_moves)

    # Placeholder: Extraer los logits que *creemos* corresponden a los movimientos legales.
    # En una implementación real, esto sería un mapeo, no solo tomar los primeros N.
    relevant_logits = network_policy_logits[0, :num_legal]

    if relevant_logits.nelement() == 0 or relevant_logits.shape[0] != num_legal:
        print(f"Advertencia en Flask: Discrepancia de tamaño o logits vacíos. "
              f"Logits relevantes: {relevant_logits.shape if relevant_logits.nelement() > 0 else 'None'}, Num legales: {num_legal}. "
              f"Eligiendo un movimiento legal al azar.")
        # Fallback a un movimiento legal aleatorio si la simplificación falla
        return np.random.choice(legal_chess_moves)

    # Aplicar softmax a los logits relevantes para obtener probabilidades
    action_probs = F.softmax(relevant_logits, dim=0)

    # Elegir el movimiento legal con la mayor probabilidad
    best_move_idx = torch.argmax(action_probs).item()

    return legal_chess_moves[best_move_idx]


@app.route('/predict', methods=['POST'])
def predict_move():
    if not request.is_json:
        return jsonify({"error": "Solicitud debe ser JSON"}), 400

    data = request.get_json()

    if 'fen' not in data:
        return jsonify({"error": "Falta 'fen' en la solicitud"}), 400

    fen = data['fen']

    try:
        board = chess.Board(fen)
    except ValueError:
        return jsonify({"error": "FEN inválido"}), 400

    if board.is_game_over(claim_draw=True):
        return jsonify({"move": None, "game_over": True, "result": board.result(claim_draw=True), "message": "La partida ya ha terminado."})

    # Convertir tablero a matriz para la red
    current_state_array = board_to_array(board)
    # Preparar tensor: (H,W,C) -> (N,C,H,W) y enviar al dispositivo
    state_tensor = torch.from_numpy(current_state_array).permute(2, 0, 1).unsqueeze(0).float().to(device)

    with torch.no_grad(): # No necesitamos gradientes para la inferencia
        policy_logits, value_estimate = model(state_tensor)

    legal_moves_list = list(board.legal_moves)

    best_move_obj = select_best_legal_move(fen, policy_logits, legal_moves_list)

    if best_move_obj:
        # Devolver el movimiento en formato UCI (ej: "e2e4", "g1f3")
        # que es comúnmente usado y fácil de parsear en JavaScript.
        return jsonify({'move': best_move_obj.uci(), "game_over": False, "value": value_estimate.item()})
    else:
        # Esto podría pasar si la partida termina justo en este turno (ej. ahogado)
        # o si select_best_legal_move devuelve None por alguna razón.
        # La comprobación de board.is_game_over() al inicio debería cubrir la mayoría de los casos.
        return jsonify({'move': None, "game_over": True, "result": board.result(claim_draw=True), "message": "No hay movimientos legales disponibles o error."})

if __name__ == '__main__':
    # Nota: Ejecutar con `flask run` es a menudo preferido para desarrollo,
    # o usar un servidor WSGI como Gunicorn para producción.
    # app.run() es conveniente para pruebas rápidas.
    print("Iniciando servidor Flask. Asegúrate de que el modelo entrenado")
    print(f"'{MODEL_FILENAME}' exista en el directorio '{script_dir}' o la IA usará pesos aleatorios.")
    print("Endpoint disponible en POST http://localhost:5000/predict")
    print("Envía JSON como: {'fen': 'fen_string_del_tablero'}")
    app.run(host='0.0.0.0', port=5000, debug=False) # debug=False es mejor si cargas modelo una vez
