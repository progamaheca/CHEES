// config.js

// Estado de la regla de jaque, exportada para que otros módulos la lean.
export let reglaJaqueHabilitada = true;

const checkboxReglaJaque = document.getElementById('checkbox_regla_jaque');

if (checkboxReglaJaque) {
    reglaJaqueHabilitada = checkboxReglaJaque.checked; // Sincronizar al inicio

    checkboxReglaJaque.addEventListener('change', function() {
        reglaJaqueHabilitada = this.checked;
        // console.log("config.js: Regla de Jaque Habilitada:", reglaJaqueHabilitada);

        if (!reglaJaqueHabilitada) {
            // Limpiar resaltados de jaque del tablero
            document.querySelectorAll('.en-jaque').forEach(el => el.classList.remove('en-jaque'));
        }
        // Si se reactiva, el estado de jaque se evaluará en el siguiente movimiento.
    });
} else {
    console.warn("Checkbox para regla de jaque no encontrado. Usando valor por defecto (true).");
}

// Otras configuraciones globales podrían ir aquí, como:
// export const TIEMPO_BASE_PARTIDA = 60; // Ejemplo
// export const SIMBOLOS_PIEZAS = { ... }; // Ejemplo
