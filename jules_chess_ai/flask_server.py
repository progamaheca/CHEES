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
DEFAULT_MODEL_FILENAME = "jules_chess_model.pth" # Renombrado para claridad
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
default_model_path = os.path.join(script_dir, DEFAULT_MODEL_FILENAME)

# Variable global para rastrear el modelo actualmente cargado en 'model'
# Podríamos inicializarlo con None y cargar el default solo si es necesario,
# o cargarlo aquí y potencialmente reemplazarlo en /predict.
# Por simplicidad, cargamos el default aquí si existe.
CURRENTLY_LOADED_MODEL_PATH = None

try:
    if os.path.exists(default_model_path):
        model.load_state_dict(torch.load(default_model_path, map_location=device))
        model.eval()
        CURRENTLY_LOADED_MODEL_PATH = default_model_path
        print(f"Modelo por defecto '{DEFAULT_MODEL_FILENAME}' cargado exitosamente en {device}.")
    else:
        print(f"ADVERTENCIA: No se encontró el archivo del modelo por defecto '{default_model_path}'. El servidor usará una red no entrenada inicialmente.")
except Exception as e:
    print(f"ADVERTENCIA: Error al cargar el modelo por defecto '{default_model_path}': {e}. El servidor usará una red no entrenada inicialmente.")


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
    model_file_requested = data.get('model_file', DEFAULT_MODEL_FILENAME) # Usar default si no se especifica

    global model # Para modificar la instancia global del modelo
    global CURRENTLY_LOADED_MODEL_PATH # Para rastrear qué modelo está cargado

    requested_model_path = os.path.join(script_dir, model_file_requested)

    # Cargar el modelo solicitado si no es el que ya está cargado
    if requested_model_path != CURRENTLY_LOADED_MODEL_PATH or not CURRENTLY_LOADED_MODEL_PATH:
        try:
            if os.path.exists(requested_model_path):
                model.load_state_dict(torch.load(requested_model_path, map_location=device))
                model.eval()
                CURRENTLY_LOADED_MODEL_PATH = requested_model_path
                print(f"Modelo '{model_file_requested}' cargado para esta petición.")
            else:
                # Si el modelo solicitado no existe, intentar cargar/re-cargar el modelo por defecto
                print(f"Advertencia: Modelo solicitado '{model_file_requested}' no encontrado.")
                if os.path.exists(default_model_path):
                    if CURRENTLY_LOADED_MODEL_PATH != default_model_path:
                        print(f"Volviendo al modelo por defecto '{DEFAULT_MODEL_FILENAME}'.")
                        model.load_state_dict(torch.load(default_model_path, map_location=device))
                        model.eval()
                        CURRENTLY_LOADED_MODEL_PATH = default_model_path
                    else:
                        print(f"Modelo por defecto '{DEFAULT_MODEL_FILENAME}' ya está cargado.")
                else:
                    # Si ni el solicitado ni el por defecto existen
                    print(f"ADVERTENCIA: Modelo por defecto '{DEFAULT_MODEL_FILENAME}' tampoco encontrado. Usando red con pesos actuales (posiblemente aleatorios).")
                    # CURRENTLY_LOADED_MODEL_PATH = None # Indicar que no hay un modelo "válido" cargado
                    # En este caso, el modelo 'model' global retiene los últimos pesos que tuvo (o aleatorios si ninguno cargó)
        except Exception as e:
            # Si hay un error cargando el modelo solicitado, podría ser un archivo corrupto.
            # Se podría intentar volver al default, o simplemente usar el modelo tal como está en memoria.
            print(f"Error al cargar el modelo solicitado '{model_file_requested}': {e}. Usando el modelo actual en memoria.")
            # Aquí podrías decidir si quieres devolver un error al cliente o seguir con el modelo en memoria.
            # return jsonify({"error": f"Error crítico al intentar cargar el modelo {model_file_requested}"}), 500

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
    print("Iniciando servidor Flask. Asegúrate de que el modelo por defecto entrenado")
    print(f"'{DEFAULT_MODEL_FILENAME}' exista en el directorio '{script_dir}' o la IA usará pesos aleatorios si ese modelo no se encuentra.")
    print("El servidor intentará cargar modelos dinámicamente si se especifica 'model_file' en la petición JSON.")
    print("Endpoint disponible en POST http://localhost:5000/predict")
    print("Envía JSON como: {'fen': 'fen_string_del_tablero'}")
    app.run(host='0.0.0.0', port=5000, debug=False) # debug=False es mejor si cargas modelo una vez
