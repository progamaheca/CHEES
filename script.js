// script.js
// Este archivo ha sido refactorizado y su contenido movido a módulos.
// El punto de entrada principal ahora es main.js.
// Este archivo (script.js) ya no se carga en index.html (o debería estar comentado).

// No debería haber lógica de juego activa aquí.
// Toda la lógica ha sido movida a:
// - main.js (orquestador principal y lógica de juego temporal)
// - config.js (configuraciones)
// - util.js (funciones de utilidad)
// - tablero.js (manejo del array de piezas y generación del DOM del tablero)
// - movimientos_validaciones.js (validación de movimientos, jaque, mate, etc.)
// - ui.js (actualizaciones del DOM, mensajes, historial, etc.)

// El listener DOMContentLoaded que estaba aquí ya no es necesario porque main.js
// se carga como un módulo, que tiene comportamiento 'defer' por defecto.
// document.addEventListener('DOMContentLoaded', () => { ... });
// console.log("script.js ha sido cargado, pero su contenido ha sido migrado.");
