# Jules Chess AI

Esta carpeta contiene los scripts de Python para una Inteligencia Artificial de Ajedrez básica, inspirada en AlphaZero y diseñada para aprender mediante aprendizaje por refuerzo con autojuego.

## Componentes del Proyecto

Actualmente, el proyecto consta de los siguientes archivos principales:

*   `representation.py`:
    *   Define la función `board_to_array(board)`.
    *   Esta función es responsable de convertir un objeto de tablero de la biblioteca `python-chess` a una representación de matriz NumPy (8x8x12), que sirve como entrada para la red neuronal. Los 12 canales representan los 6 tipos de piezas para cada uno de los dos colores.

*   `network.py`:
    *   Define la clase `ChessNet(nn.Module)` utilizando PyTorch.
    *   Esta es la arquitectura de la red neuronal que aprenderá a jugar ajedrez.
    *   Incluye capas convolucionales para procesar el estado del tablero y dos "cabezas" de salida:
        *   **Cabeza de Política**: Estima la probabilidad de los posibles movimientos.
        *   **Cabeza de Valor**: Estima la probabilidad de ganar desde la posición actual.

*   `environment.py`:
    *   Define la clase `ChessEnv`.
    *   Este es el entorno de simulación de ajedrez que interactúa con la IA. Utiliza `python-chess` para la lógica del juego.
    *   Proporciona métodos como `reset()` para iniciar una nueva partida y `step(move_idx)` para ejecutar un movimiento y obtener el nuevo estado, la recompensa y si la partida ha terminado.
    *   Incluye la lógica para las reglas de finalización de la partida (jaque mate, ahogado, reglas de empate como material insuficiente, límite de movimientos, etc.).

## Cómo Entrenar la IA (Próximos Pasos)

Para entrenar esta IA, se implementará un script principal de entrenamiento (por ejemplo, `train.py` - **aún no creado**). Este script:

1.  Utilizará `ChessEnv` para simular partidas de ajedrez donde la IA (`ChessNet`) juegue contra sí misma (autojuego).
2.  Generará datos de estas partidas (estados, acciones tomadas, resultados de las partidas).
3.  Usará estos datos para entrenar los pesos de `ChessNet`, mejorando su capacidad de evaluación de posiciones y selección de movimientos.
4.  El proceso de entrenamiento implicará un bucle que itere sobre múltiples partidas, ajustando la red gradualmente.

Una vez que el modelo (`ChessNet`) esté entrenado, sus pesos se guardarán en un archivo (por ejemplo, `jules_chess_model.pth`).

## Cómo Usar la IA Entrenada (Próximos Pasos)

Después del entrenamiento, el modelo guardado se podrá cargar en un script de Python que actúe como un servidor (por ejemplo, usando Flask). Este servidor:

1.  Recibirá el estado actual del tablero (en formato FEN) desde una interfaz de usuario (como el tablero de ajedrez en JavaScript).
2.  Usará el modelo `ChessNet` cargado para predecir el mejor movimiento.
3.  Devolverá este movimiento a la interfaz de usuario para que se ejecute en el tablero.

Este README se actualizará a medida que se desarrollen los scripts de entrenamiento e inferencia.
