// config.js

// Estado de la regla de jaque, exportada para que otros módulos la lean y la respeten.
export let reglaJaqueHabilitada = true;

// Exportar la referencia al checkbox para que pueda ser deshabilitado desde otros módulos (ej: ui.js o main.js al final del juego)
export const checkboxReglaJaque = document.getElementById('checkbox_regla_jaque');

if (checkboxReglaJaque) {
    // Sincronizar la variable 'reglaJaqueHabilitada' con el estado inicial del checkbox al cargar la página.
    // Esto asegura que si el HTML define 'checked' de manera diferente, el JS lo respete.
    reglaJaqueHabilitada = checkboxReglaJaque.checked;

    checkboxReglaJaque.addEventListener('change', function() {
        reglaJaqueHabilitada = this.checked;
        // console.log("config.js: Regla de Jaque Habilitada actualizada a:", reglaJaqueHabilitada);

        if (!reglaJaqueHabilitada) {
            // Si la regla de jaque se desactiva, es importante limpiar cualquier
            // resaltado visual de jaque que pudiera estar activo en el tablero.
            // Esta es una manipulación directa del DOM desde config.js.
            // Alternativamente, se podría emitir un evento o llamar a una función de ui.js.
            document.querySelectorAll('.casilla.en-jaque').forEach(casilla => {
                casilla.classList.remove('en-jaque');
            });
        }
        // No se añade lógica para re-evaluar jaque si se activa la regla aquí;
        // eso se manejará naturalmente en el flujo del juego (ej: próximo movimiento).
    });
} else {
    // Si el checkbox no se encuentra, la reglaJaqueHabilitada mantendrá su valor por defecto (true).
    // Esto podría pasar si el ID en el HTML es incorrecto o el elemento no existe.
    console.warn("El elemento checkbox con ID 'checkbox_regla_jaque' no fue encontrado. La funcionalidad de activar/desactivar la regla de jaque no estará disponible.");
}

// No se exportan funciones, solo la variable de estado y la referencia al checkbox.
// El event listener se activa cuando este módulo se carga por primera vez.
