# Dependencias: pip install torch numpy python-chess flask flask-cors
# (Asegúrate de tener un entorno de Python configurado con estas bibliotecas)
import torch
import torch.optim as optim
import torch.nn.functional as F
import numpy as np
import chess
import time
from multiprocessing import Pool, Manager # Para procesamiento en paralelo
from collections import deque # Para almacenar experiencias de juego

# Importar las clases y funciones necesarias de los otros archivos
from .representation import board_to_array
from .network import ChessNet # Asumiendo que ChessNet está en network.py
from .environment import ChessEnv # Asumiendo que ChessEnv está en environment.py

# --- Parámetros de Configuración ---
NUM_GAMES_PER_ITERATION = 100  # Número de partidas de autojuego por iteración de entrenamiento
NUM_ITERATIONS = 10         # Número total de iteraciones de entrenamiento (cada una con NUM_GAMES_PER_ITERATION)
LEARNING_RATE = 0.001
EPSILON = 0.1               # Probabilidad de exploración (movimiento aleatorio)
GAMMA = 0.97                # Factor de descuento para recompensas futuras (para el valor)
MAX_MOVES_PER_GAME = 200    # Límite de movimientos en ChessEnv
NUM_WORKERS = 4             # Número de procesos paralelos para generar partidas
BATCH_SIZE = 64             # Tamaño del lote para entrenar la red
NUM_EPOCHS_PER_ITERATION = 1 # Número de épocas de entrenamiento sobre los datos generados en una iteración
MODEL_PATH = "jules_chess_model.pth" # Donde guardar/cargar el modelo
# NUM_POSSIBLE_MOVES debe coincidir con la salida de la política de ChessNet
# Lo tomaremos de la instanciación de la red más adelante.

# --- Funciones de Ayuda para el Entrenamiento ---

def select_action(model, state_tensor, legal_moves, board_turn_is_white, epsilon, device):
    """
    Selecciona una acción usando una política epsilon-greedy.
    Args:
        model: La red neuronal (ChessNet).
        state_tensor: El estado actual del tablero como un tensor.
        legal_moves: Lista de objetos chess.Move.
        board_turn_is_white: Booleano, True si es el turno de las blancas.
        epsilon: Probabilidad de tomar una acción aleatoria.
        device: 'cuda' o 'cpu'.
    Returns:
        Tuple (chosen_move_object, chosen_move_idx_in_legal_moves, policy_dist_for_legal_moves)
        policy_dist_for_legal_moves es un array NumPy.
    """
    if not legal_moves:
        return None, -1, None

    if np.random.rand() < epsilon:
        chosen_move_idx = np.random.randint(len(legal_moves))
        chosen_move = legal_moves[chosen_move_idx]
        # Para la política objetivo cuando es aleatorio, podemos usar uniforme sobre legales
        policy_dist = np.ones(len(legal_moves), dtype=np.float32) / len(legal_moves)
        return chosen_move, chosen_move_idx, policy_dist
    else:
        model.eval()
        with torch.no_grad():
            # La red espera (N,C,H,W). state_tensor ya debería tener la N (batch_size=1)
            policy_logits, _ = model(state_tensor.to(device))

        # --- Mapeo de logits de la red a movimientos legales ---
        # Esta es la parte más crítica y específica de la implementación.
        # Asumiremos una codificación donde cada movimiento legal tiene un índice en la salida de la política.
        # Para esta implementación, necesitamos un placeholder o una estrategia simple.
        # Estrategia placeholder: Tomar los logits correspondientes a los primeros N movimientos legales.
        # ¡ESTO ES UNA SIMPLIFICACIÓN GRANDE Y DEBE SER REEMPLAZADO CON UN MAPEADO REAL!

        num_legal = len(legal_moves)
        # Tomar los primeros 'num_legal' logits (simplificación)
        # En una implementación real, mapearías cada movimiento legal a su logit específico.
        relevant_logits = policy_logits[0, :num_legal]

        if relevant_logits.nelement() == 0 or relevant_logits.shape[0] != num_legal:
            # Fallback si la simplificación no da el tamaño correcto
            action_probs_numpy = np.ones(num_legal, dtype=np.float32) / num_legal
        else:
            action_probs = F.softmax(relevant_logits, dim=0)
            action_probs_numpy = action_probs.cpu().numpy()
            # Asegurar que sumen 1 debido a posibles errores de precisión flotante
            action_probs_numpy = action_probs_numpy / np.sum(action_probs_numpy)

        chosen_move_idx = np.random.choice(len(legal_moves), p=action_probs_numpy)
        chosen_move = legal_moves[chosen_move_idx]
        return chosen_move, chosen_move_idx, action_probs_numpy

def play_game(model_weights, game_id, epsilon, device_str, num_possible_moves):
    """
    Simula una partida completa de autojuego.
    Args:
        model_weights: Los pesos del modelo actual para cargar en una nueva instancia.
        game_id: Identificador del juego (para logging).
        epsilon: Valor actual de epsilon para la selección de acciones.
        device_str: 'cuda' o 'cpu'.
        num_possible_moves: Dimensión de la salida de la política.
    Returns:
        Lista de tuplas (estado, política_objetivo, valor_objetivo) para la partida.
        El valor_objetivo es desde la perspectiva del jugador que estaba por mover en ese estado.
    """
    device = torch.device(device_str)
    local_model = ChessNet(num_possible_moves=num_possible_moves).to(device)
    if model_weights: # Cargar pesos si se proporcionan (para trabajadores)
        local_model.load_state_dict(model_weights)

    env = ChessEnv(max_moves_per_game=MAX_MOVES_PER_GAME)
    state_matrix = env.reset() # Matriz 8x8x12

    game_experiences = [] # (estado_matriz, política_objetivo_para_entrenamiento, jugador_actual_ganó)

    done = False
    while not done:
        # Preparar estado para la red: (H,W,C) -> (N,C,H,W)
        # N=1 (un solo estado), C=12, H=8, W=8
        state_tensor = torch.from_numpy(state_matrix.copy()).permute(2, 0, 1).unsqueeze(0).float()

        legal_moves = env.get_legal_moves()
        current_player_is_white = env.board.turn == chess.WHITE

        if not legal_moves: # Partida terminada (mate/ahogado)
            break

        chosen_move, chosen_move_idx, policy_dist = select_action(local_model, state_tensor, legal_moves, current_player_is_white, epsilon, device)

        if chosen_move is None: # No debería pasar si legal_moves no está vacío
            break

        # Crear la política objetivo para el entrenamiento: one-hot para el movimiento elegido
        # El tamaño de esta política es el número de movimientos legales en ESTE estado.
        policy_target_for_training = np.zeros(len(legal_moves), dtype=np.float32)
        policy_target_for_training[chosen_move_idx] = 1.0

        # Guardar el estado ANTES de hacer el movimiento, y la política objetivo.
        # El valor (recompensa final) se añadirá después.
        game_experiences.append({'state': state_matrix,
                                 'policy_target': policy_target_for_training,
                                 'player_turn_is_white': current_player_is_white,
                                 'num_legal_moves_in_state': len(legal_moves)})

        state_matrix, reward_for_just_moved_player, done, info = env.step(chosen_move_idx)

    # Partida terminada. Determinar el resultado final.
    # `reward_for_just_moved_player` es +1 si el último jugador en mover ganó, -1 si perdió, 0 empate.
    # Necesitamos asignar la recompensa correcta a cada estado guardado.

    # `final_game_outcome_for_white` será +1 si blancas ganaron, -1 si negras ganaron, 0 empate.
    # Si el último en mover fue BLANCO (info['result'] es '1-0' o '0-1' donde blanco es el sujeto)
    #   y reward_for_just_moved_player es 1.0 => final_game_outcome_for_white = 1.0
    #   y reward_for_just_moved_player es -1.0 => final_game_outcome_for_white = -1.0 (no debería pasar si solo hay un ganador)
    # Si el último en mover fue NEGRO
    #   y reward_for_just_moved_player es 1.0 (negras ganaron) => final_game_outcome_for_white = -1.0
    #   y reward_for_just_moved_player es -1.0 (negras perdieron) => final_game_outcome_for_white = 1.0

    final_game_outcome_for_white = 0.0
    if info.get('result') == '1-0':
        final_game_outcome_for_white = 1.0
    elif info.get('result') == '0-1':
        final_game_outcome_for_white = -1.0
    # Si es empate (ej. "1/2-1/2"), final_game_outcome_for_white es 0.0

    # Asignar el valor objetivo a cada experiencia
    # El valor objetivo es desde la perspectiva del jugador cuyo turno era en ese estado.
    processed_experiences = []
    for exp in game_experiences:
        if exp['player_turn_is_white']: # Si era turno de blancas en este estado
            value_obj = final_game_outcome_for_white
        else: # Si era turno de negras
            value_obj = -final_game_outcome_for_white # Invertir para la perspectiva de negras

        processed_experiences.append({
            'state': exp['state'],
            'policy_target': exp['policy_target'], # One-hot para el mov. tomado de los legales
            'value_target': value_obj,
            'num_legal_moves_in_state': exp['num_legal_moves_in_state']
        })

    # print(f"Juego {game_id} terminado. Resultado para blancas: {final_game_outcome_for_white}. Movimientos: {env.current_move_count}")
    return processed_experiences


# --- Bucle Principal de Entrenamiento ---
def train_main():
    device_str = "cuda" if torch.cuda.is_available() else "cpu"
    device = torch.device(device_str)
    print(f"Usando dispositivo: {device}")

    # Determinar NUM_POSSIBLE_MOVES de una instancia de la red
    # Esto asume que la definición de ChessNet tiene un valor por defecto o lo podemos pasar
    temp_net = ChessNet()
    num_possible_moves = temp_net.policy_head.out_features
    del temp_net

    model = ChessNet(num_possible_moves=num_possible_moves).to(device)
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)

    # Cargar modelo si existe
    try:
        model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
        print(f"Modelo cargado desde {MODEL_PATH}")
    except FileNotFoundError:
        print(f"No se encontró modelo en {MODEL_PATH}. Iniciando desde cero.")
    except Exception as e:
        print(f"Error al cargar modelo: {e}. Iniciando desde cero.")

    all_experiences_buffer = deque(maxlen=100000) # Buffer para almacenar experiencias de varios juegos

    for iteration in range(1, NUM_ITERATIONS + 1):
        print(f"\n--- Iteración de Entrenamiento {iteration}/{NUM_ITERATIONS} ---")

        start_time_games = time.time()
        # Generar partidas en paralelo
        # Necesitamos pasar los pesos del modelo actual a los trabajadores
        current_model_weights = model.state_dict()

        # Crear argumentos para play_game
        # Cada trabajador necesita una copia de los pesos del modelo actual
        # y otros hiperparámetros.
        play_game_args = [(current_model_weights, i, EPSILON, device_str, num_possible_moves) for i in range(NUM_GAMES_PER_ITERATION)]

        with Pool(processes=NUM_WORKERS) as pool:
            iteration_game_data_list = pool.starmap(play_game, play_game_args)

        duration_games = time.time() - start_time_games
        print(f"Generación de {NUM_GAMES_PER_ITERATION} partidas completada en {duration_games:.2f}s.")

        # Agregar nuevas experiencias al buffer
        for game_data in iteration_game_data_list:
            all_experiences_buffer.extend(game_data)

        if not all_experiences_buffer:
            print("No hay experiencias para entrenar. Saltando época de entrenamiento.")
            continue

        print(f"Tamaño del buffer de experiencias: {len(all_experiences_buffer)}")

        # Fase de Entrenamiento
        model.train()
        start_time_train = time.time()
        for epoch in range(NUM_EPOCHS_PER_ITERATION):
            # Muestrear un lote del buffer de experiencias
            # Convertir deque a lista para muestreo aleatorio si es necesario, o usarlo secuencialmente.
            # Por ahora, para simplificar, tomaremos un lote secuencial o aleatorio simple.

            if len(all_experiences_buffer) < BATCH_SIZE:
                # print(f"Buffer ({len(all_experiences_buffer)}) más pequeño que BATCH_SIZE ({BATCH_SIZE}). Usando todo el buffer.")
                current_batch_indices = np.arange(len(all_experiences_buffer))
            else:
                current_batch_indices = np.random.choice(len(all_experiences_buffer), BATCH_SIZE, replace=False)

            batch_experiences = [all_experiences_buffer[i] for i in current_batch_indices]

            batch_states = np.array([exp['state'] for exp in batch_experiences])
            batch_policy_targets = [exp['policy_target'] for exp in batch_experiences] # Lista de arrays
            batch_value_targets = np.array([[exp['value_target']] for exp in batch_experiences], dtype=np.float32)
            batch_num_legal_moves = [exp['num_legal_moves_in_state'] for exp in batch_experiences]


            # Convertir a tensores
            # Estados: (B,H,W,C) -> (B,C,H,W)
            states_tensor = torch.from_numpy(batch_states).permute(0, 3, 1, 2).float().to(device)
            value_targets_tensor = torch.from_numpy(batch_value_targets).float().to(device)

            optimizer.zero_grad()

            # Forward pass
            policy_logits_pred, value_pred = model(states_tensor)

            # Calcular pérdidas
            # Pérdida de Valor
            value_loss = F.mse_loss(value_pred, value_targets_tensor)

            # Pérdida de Política
            # Es más complejo porque policy_logits_pred es (B, NUM_POSSIBLE_MOVES)
            # y batch_policy_targets es una lista de arrays one-hot de tamaño variable (num_legal_moves_in_state)
            # Necesitamos alinear esto.
            policy_loss = 0
            num_valid_policy_samples = 0
            for i in range(len(batch_experiences)):
                num_legal = batch_num_legal_moves[i]
                if num_legal == 0: continue # No hay movimientos legales, no hay política que aprender

                # Tomar los logits relevantes (SIMPLIFICACIÓN)
                # En una implementación real, esto debe usar el mapeo de movimientos.
                pred_logits_for_sample_legal = policy_logits_pred[i, :num_legal].unsqueeze(0) # (1, num_legal)

                # Target es one-hot de tamaño (num_legal)
                target_policy_for_sample = torch.from_numpy(batch_policy_targets[i]).unsqueeze(0).float().to(device) # (1, num_legal)

                if pred_logits_for_sample_legal.shape[1] != target_policy_for_sample.shape[1]:
                    # print(f"Advertencia de tamaño en época {epoch}, muestra {i}: Logits {pred_logits_for_sample_legal.shape}, Target {target_policy_for_sample.shape}")
                    continue # Saltar si la simplificación causa problemas de tamaño

                # CrossEntropyLoss espera logits y los índices de clase, o logits y probabilidades objetivo.
                # Si target_policy_for_sample es one-hot (probabilidades), podemos usar la fórmula directa.
                # log_softmax + nll_loss es común, o usar directamente F.cross_entropy si los targets son índices.
                # Para target como distribución: -sum(target * log_softmax(logits))
                log_probs = F.log_softmax(pred_logits_for_sample_legal, dim=1)
                policy_loss_sample = -torch.sum(target_policy_for_sample * log_probs)
                policy_loss += policy_loss_sample
                num_valid_policy_samples += 1

            if num_valid_policy_samples > 0:
                policy_loss /= num_valid_policy_samples
            else: # Si por alguna razón no hubo muestras válidas para la política.
                policy_loss = torch.tensor(0.0).to(device) # Evitar error con policy_loss no definida.

            total_loss = policy_loss + value_loss

            if torch.isnan(total_loss) or torch.isinf(total_loss):
                print(f"Advertencia: Pérdida es NaN o Inf en iteración {iteration}, época {epoch}. Saltando backward.")
            else:
                total_loss.backward()
                optimizer.step()

            if (epoch + 1) % 1 == 0: # Log cada época (o más frecuentemente si NUM_EPOCHS es grande)
                 print(f"Iteración {iteration}, Época {epoch+1}/{NUM_EPOCHS_PER_ITERATION}, "
                       f"Pérdida Total: {total_loss.item():.4f} (Política: {policy_loss.item() if isinstance(policy_loss, torch.Tensor) else policy_loss:.4f}, Valor: {value_loss.item():.4f})")

        duration_train = time.time() - start_time_train
        print(f"Entrenamiento de la iteración {iteration} completado en {duration_train:.2f}s.")

        # Guardar el modelo después de cada iteración
        torch.save(model.state_dict(), MODEL_PATH)
        print(f"Modelo guardado en {MODEL_PATH}")

if __name__ == '__main__':
    # --- ¡ADVERTENCIA IMPORTANTE! ---
    # Este script de entrenamiento es un ESQUELETO y tiene SIMPLIFICACIONES IMPORTANTES,
    # especialmente en cómo `select_action` y el cálculo de la pérdida de política
    # manejan el mapeo entre la salida de la red (fija) y los movimientos legales (variables).
    # La sección comentada como "SIMPLIFICACIÓN IMPORTANTE" o "ESTO ES UNA SIMPLIFICACIÓN GRANDE"
    # deberá ser reemplazada con una lógica de mapeo de movimientos robusta para un
    # rendimiento de IA de ajedrez significativo.
    # El código se proporciona para ilustrar la estructura general del bucle de autojuego
    # y el entrenamiento en paralelo.
    # -----------------------------------

    # Para ejecutar esto, necesitarías tener las clases ChessNet, ChessEnv y la función
    # board_to_array definidas e importables (ej. en el mismo directorio o paquete).

    # train_main()
    print("Para ejecutar el entrenamiento, descomenta 'train_main()' y asegúrate de que")
    print("las dependencias (ChessNet, ChessEnv, board_to_array) están correctamente importadas.")
    print("Recuerda la advertencia sobre las simplificaciones en el manejo de la política de movimientos.")
