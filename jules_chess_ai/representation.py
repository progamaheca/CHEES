import chess
import numpy as np

def board_to_array(board: chess.Board) -> np.ndarray:
    """
    Convierte un objeto de tablero de python-chess a una representación de matriz NumPy 8x8x12.

    La matriz tiene 12 planos (canales):
    - Planos 0-5 para piezas blancas: Peón, Caballo, Alfil, Torre, Reina, Rey.
    - Planos 6-11 para piezas negras: Peón, Caballo, Alfil, Torre, Reina, Rey.
    Un '1' en una posición (fila, columna, plano) indica la presencia de esa pieza
    en esa casilla.

    Args:
        board: El objeto chess.Board a convertir.

    Returns:
        Una matriz NumPy de dimensiones (8, 8, 12) representando el tablero,
        con tipo de dato float32.
    """
    piece_to_plane_index = {
        chess.PAWN: 0,
        chess.KNIGHT: 1,
        chess.BISHOP: 2,
        chess.ROOK: 3,
        chess.QUEEN: 4,
        chess.KING: 5
    }
    board_array = np.zeros((8, 8, 12), dtype=np.float32)

    for square_index in chess.SQUARES:
        piece = board.piece_at(square_index)
        if piece:
            color_offset = 0 if piece.color == chess.WHITE else 6
            plane_idx = piece_to_plane_index[piece.piece_type]
            row = chess.square_rank(square_index)
            col = chess.square_file(square_index)
            board_array[7 - row, col, color_offset + plane_idx] = 1.0

    return board_array

if __name__ == '__main__':
    current_board = chess.Board()
    print("Tablero inicial en formato FEN:", current_board.fen())
    print(current_board.unicode())
    board_matrix = board_to_array(current_board)
    print(f"\nForma de la matriz resultante: {board_matrix.shape}")
    print(f"Tipo de dato de la matriz: {board_matrix.dtype}")
    if board_matrix[6, 4, 0] == 1.0:
        print("Verificación: Peón blanco en e2 (matriz[6,4,0]) encontrado.")
    if board_matrix[0, 0, 9] == 1.0:
        print("Verificación: Torre negra en a8 (matriz[0,0,9]) encontrada.")
    if board_matrix[7, 4, 5] == 1.0:
        print("Verificación: Rey blanco en e1 (matriz[7,4,5]) encontrado.")
    print(f"Suma de todos los elementos en la matriz: {np.sum(board_matrix)}")
    current_board.push_san("e4")
    board_matrix_e4 = board_to_array(current_board)
    print(f"Peón blanco en e2 después de e4 (matriz[6,4,0]): {board_matrix_e4[6,4,0]}")
    print(f"Peón blanco en e4 después de e4 (matriz[4,4,0]): {board_matrix_e4[4,4,0]}")
