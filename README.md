# Juego de Ajedrez Interactivo en JavaScript

## Descripción Corta

Un juego de ajedrez funcional desarrollado completamente en JavaScript, HTML y CSS. Permite a dos jugadores locales competir en una partida de ajedrez con temporizadores individuales y varias características modernas de interfaz de usuario. El código está estructurado en módulos ES6 para facilitar su mantenimiento y comprensión.

## Características Principales

-   **Tablero de Ajedrez Completo:** Tablero de 8x8 con todas las piezas estándar.
-   **Movimiento de Piezas:** Implementación de las reglas de movimiento para todas las piezas (Peón, Torre, Caballo, Alfil, Reina, Rey).
-   **Temporizadores Individuales:** Cada jugador (Blancas y Negras) tiene su propio temporizador configurable (1 o 5 minutos) que descuenta solo durante su turno. El juego finaliza si un jugador agota su tiempo.
-   **Regla de Jaque Opcional:**
    *   **Modo Estándar (Regla de Jaque Habilitada):**
        *   Detección de Jaque y notificación visual.
        *   Prevención de movimientos que dejen al propio rey en Jaque (Auto-Jaque).
        *   Detección de Jaque Mate para finalizar la partida.
        *   Detección de Empate por Ahogado (Stalemate).
    *   **Modo Alternativo (Regla de Jaque Deshabilitada):**
        *   No hay detección de jaque ni restricciones de auto-jaque.
        *   La partida puede ganarse capturando directamente el rey del oponente.
        *   El empate por ahogado sigue siendo posible.
-   **Historial de Movimientos:**
    *   Se registra cada movimiento en una lista visible en la interfaz.
    *   Utiliza una notación algebraica simplificada (ej: "Cf3", "exd4").
    *   Incluye indicadores de Jaque ("+") y Jaque Mate ("#") si la regla de jaque está habilitada.
    *   Opción para **descargar el historial** de la partida como un archivo de texto.
-   **Interfaz de Usuario Mejorada:**
    *   **Resaltado de Pieza Seleccionada:** La pieza que el jugador ha seleccionado se resalta visualmente.
    *   **Resaltado de Movimientos Posibles:** Al seleccionar una pieza, las casillas a las que puede moverse legalmente se resaltan en color rosado.
    *   **Resaltado del Último Movimiento:** Las casillas de origen y destino del último movimiento realizado se resaltan con colores distintivos.
    *   **Visualización de Piezas Capturadas:** Se muestran los símbolos de las piezas que cada jugador ha capturado.
    *   **Mensajes No Intrusivos:** Notificaciones para movimientos inválidos, jaque, y fin de partida aparecen temporalmente sin bloquear el juego (reemplazando los `alert()`s).
-   **Código Modularizado:**
    *   El código JavaScript está organizado en módulos ES6 (`main.js`, `config.js`, `util.js`, `tablero.js`, `movimientos_validaciones.js`, `ui.js`) para una mejor estructura y mantenibilidad.

## Cómo Ejecutar el Juego

1.  **Clonar el Repositorio o Descargar los Archivos:**
    *   Si tienes Git: `git clone <url-del-repositorio>`
    *   Alternativamente, descarga el código fuente como un archivo ZIP y extráelo.
2.  **Abrir `index.html`:**
    *   Navega a la carpeta donde clonaste o extrajiste los archivos.
    *   Abre el archivo `index.html` directamente en un navegador web moderno (como Chrome, Firefox, Edge, Safari).
3.  **¡A Jugar!**
    *   Selecciona el tiempo de juego.
    *   Decide si quieres jugar con la Regla de Jaque habilitada (opción por defecto).
    *   El jugador con las piezas blancas comienza.

No se requieren pasos de compilación ni instalación de dependencias adicionales.

## Estructura del Código JavaScript (Módulos)

El código JavaScript está organizado en los siguientes archivos para separar las responsabilidades:

-   **`main.js`**: Punto de entrada principal de la aplicación. Orquesta la inicialización del juego, maneja el estado central y el flujo de eventos principal (como los clics en el tablero).
-   **`config.js`**: Gestiona configuraciones globales, como el estado de la "Regla de Jaque" y la interacción con su control en la UI.
-   **`util.js`**: Contiene funciones de utilidad puras y reutilizables (ej: conversión entre notación de ajedrez y coordenadas, formateo de tiempo).
-   **`tablero.js`**: Define el estado de las piezas (`piezas`), genera la estructura del tablero en el DOM, e inicializa la posición visual de las piezas.
-   **`movimientos_validaciones.js`**: Encapsula toda la lógica de las reglas del juego. Incluye la validación de movimiento para cada tipo de pieza, la lógica para jaque, jaque mate, empate, el cálculo de movimientos legales, y el formateo de la notación de movimientos.
-   **`ui.js`**: Maneja todas las interacciones directas con el DOM para actualizar la interfaz de usuario (indicadores de turno, temporizadores, historial, mensajes, resaltados visuales, etc.).
