import torch
import torch.nn as nn
import torch.nn.functional as F

class ChessNet(nn.Module):
    def __init__(self, input_channels=12, num_conv_filters=32, num_fc_neurons=256, num_possible_moves=1968):
        """
        Red neuronal simple para ajedrez con cabezas de política y valor.
        Args:
            input_channels (int): Número de canales de entrada (12).
            num_conv_filters (int): Número de filtros en las capas convolucionales.
            num_fc_neurons (int): Número de neuronas en la capa densa intermedia.
            num_possible_moves (int): Dimensión del vector de salida para la política.
        """
        super(ChessNet, self).__init__()
        self.conv1 = nn.Conv2d(in_channels=input_channels,
                               out_channels=num_conv_filters,
                               kernel_size=3,
                               padding=1)
        self.bn1 = nn.BatchNorm2d(num_conv_filters)
        self.conv2 = nn.Conv2d(in_channels=num_conv_filters,
                               out_channels=num_conv_filters * 2,
                               kernel_size=3,
                               padding=1)
        self.bn2 = nn.BatchNorm2d(num_conv_filters * 2)
        self.fc_input_size = (num_conv_filters * 2) * 8 * 8
        self.fc_hidden = nn.Linear(self.fc_input_size, num_fc_neurons)
        self.dropout = nn.Dropout(0.3)
        self.policy_head = nn.Linear(num_fc_neurons, num_possible_moves)
        self.value_head = nn.Linear(num_fc_neurons, 1)

    def forward(self, x: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        """
        Args:
            x: Tensor (batch_size, input_channels, 8, 8).
        Returns:
            Un tuple (policy_logits, value_output).
        """
        # Se espera que x ya venga como (N, C, H, W)
        x = F.relu(self.bn1(self.conv1(x)))
        x = F.relu(self.bn2(self.conv2(x)))
        x = x.view(-1, self.fc_input_size)
        x = F.relu(self.fc_hidden(x))
        x = self.dropout(x)
        policy_logits = self.policy_head(x)
        value_output = torch.tanh(self.value_head(x))
        return policy_logits, value_output

if __name__ == '__main__':
    INPUT_CHANNELS = 12
    CONV_FILTERS = 32
    FC_NEURONS = 128
    NUM_MOVES = 1968
    chess_model = ChessNet(input_channels=INPUT_CHANNELS,
                           num_conv_filters=CONV_FILTERS,
                           num_fc_neurons=FC_NEURONS,
                           num_possible_moves=NUM_MOVES)
    print("Estructura de la Red Neuronal (ChessNet):")
    print(chess_model)
    # dummy_board_matrix simula la salida de board_to_array (H, W, C)
    dummy_board_matrix = torch.randn(8, 8, INPUT_CHANNELS)
    # Convertir a (N, C, H, W) para la red
    dummy_input_tensor = dummy_board_matrix.permute(2, 0, 1).unsqueeze(0)
    print(f"\nForma del tensor de entrada para la red: {dummy_input_tensor.shape}")
    chess_model.eval()
    with torch.no_grad():
        policy_output_logits, value_output = chess_model(dummy_input_tensor)
    print(f"\nForma de la salida de política (logits): {policy_output_logits.shape}")
    print(f"Forma de la salida de valor: {value_output.shape}")
    policy_probabilities = F.softmax(policy_output_logits, dim=1)
    print(f"Suma de probabilidades de política: {torch.sum(policy_probabilities).item():.4f}")
    print(f"Salida de valor de ejemplo: {value_output.item():.4f}")
