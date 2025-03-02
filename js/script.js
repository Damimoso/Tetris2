// Obtener elementos del DOM
const enterBtn = document.getElementById("enter-btn");
const enterContainer = document.getElementById("enter-container");
const introVideoContainer = document.getElementById("intro-video-container");
const introVideo = document.getElementById("intro-video");
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");
const gameScreen = document.getElementById("game-screen");
const rankingScreen = document.getElementById("ranking-screen");
const backToStartBtn = document.getElementById("back-to-start-btn");

// Obtener elementos de audio para efectos de sonido
const levelUpSound = document.getElementById("level-up-sound");
const clearRowSound = document.getElementById("clear-row-sound");

// Reproducir el video cuando el usuario haga clic en "Entrar"
enterBtn.addEventListener("click", () => {
    enterContainer.style.display = "none";
    introVideoContainer.style.display = "flex";
    introVideo.play();
    introVideo.muted = false;
});

// Ocultar el video y mostrar la pantalla de inicio cuando termine
introVideo.addEventListener("ended", () => {
    introVideoContainer.style.display = "none";
    startScreen.style.display = "block";
});

// Iniciar el juego cuando el usuario haga clic en "Iniciar Juego"
startBtn.addEventListener("click", () => {
    startScreen.style.display = "none";
    gameScreen.style.display = "block";
    iniciarJuego();
});

// Volver a la pantalla de inicio desde el ranking
backToStartBtn.addEventListener("click", () => {
    rankingScreen.style.display = "none";
    startScreen.style.display = "block";
});

// Obtener el canvas principal y su contexto
const canvas = document.getElementById("tetris");
const ctx = canvas.getContext("2d");

// Obtener el canvas de la siguiente pieza y su contexto
const nextCanvas = document.getElementById("next-piece");
const nextCtx = nextCanvas.getContext("2d");

// Obtener el elemento de audio para la música de fondo
const musicaFondo = document.getElementById("background-music");

// Constantes del juego
const FILAS = 20, COLUMNAS = 10, TAMANO_CUADRADO = 30, VACIO = "black";
const COLORES = ["cyan", "yellow", "purple", "green", "red", "blue", "orange"];

// Variables globales
let tablero, pieza, siguientePieza, puntuacion = 0, nivel = 1, juegoTerminado = false, velocidadCaida = 500, juegoIniciado = false;
let teclaAbajoPresionada = false;
let juegoPausado = false;
let dropTimeout;

// Array para almacenar las puntuaciones (máximo 5 jugadores)
let ranking = [];

// Cargar el ranking desde LocalStorage al iniciar la página
function cargarRanking() {
    const rankingGuardado = localStorage.getItem("ranking");
    if (rankingGuardado) {
        ranking = JSON.parse(rankingGuardado);
    } else {
        ranking = [];
    }
}

// Guardar el ranking en LocalStorage
function guardarRanking() {
    localStorage.setItem("ranking", JSON.stringify(ranking));
}

// Reiniciar el tablero
function reiniciarTablero() {
    tablero = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(VACIO));
}

// Dibujar un cuadrado
function dibujarCuadrado(x, y, color, contexto = ctx) {
    contexto.fillStyle = color;
    contexto.fillRect(x * TAMANO_CUADRADO, y * TAMANO_CUADRADO, TAMANO_CUADRADO, TAMANO_CUADRADO);
    contexto.strokeStyle = "gray";
    contexto.strokeRect(x * TAMANO_CUADRADO, y * TAMANO_CUADRADO, TAMANO_CUADRADO, TAMANO_CUADRADO);
}

// Dibujar el tablero
function dibujarTablero() {
    tablero.forEach((fila, r) => fila.forEach((celda, c) => dibujarCuadrado(c, r, celda)));
}

// Actualizar la puntuación y el nivel
function actualizarPuntuacion() {
    document.getElementById("score").innerText = `Puntaje: ${puntuacion}`;
    document.getElementById("level").innerText = `Nivel: ${nivel}`;
}

// Eliminar filas completas
function eliminarFilasCompletas() {
    let nuevoTablero = tablero.filter(fila => fila.some(celda => celda === VACIO));
    const filasEliminadas = FILAS - nuevoTablero.length;

    // Reproducir sonido si se destruyó al menos una fila
    if (filasEliminadas > 0) {
        clearRowSound.play(); // Reproducir sonido de fila destruida
    }

    while (nuevoTablero.length < FILAS) nuevoTablero.unshift(Array(COLUMNAS).fill(VACIO));
    tablero = nuevoTablero;
    puntuacion += filasEliminadas * 10;
    actualizarNivel();
    actualizarPuntuacion();
}

// Actualizar el nivel y la velocidad de caída
function actualizarNivel() {
    const nivelAnterior = nivel; // Guardar el nivel anterior
    nivel = Math.min(15, Math.floor(puntuacion / 80) + 1);
    velocidadCaida = Math.max(100, 500 - (nivel - 1) * 40);

    // Reproducir sonido si el nivel ha aumentado
    if (nivel > nivelAnterior) {
        levelUpSound.play(); // Reproducir sonido de subida de nivel
    }
}

// Definición de las piezas
const PIEZAS = [
    { forma: [[1, 1, 1, 1]], color: "cyan" },
    { forma: [[1, 1], [1, 1]], color: "yellow" },
    { forma: [[0, 1, 0], [1, 1, 1]], color: "purple" },
    { forma: [[1, 0, 0], [1, 1, 1]], color: "green" },
    { forma: [[0, 0, 1], [1, 1, 1]], color: "red" },
    { forma: [[1, 1, 0], [0, 1, 1]], color: "blue" },
    { forma: [[0, 1, 1], [1, 1, 0]], color: "orange" }
];

// Rotar una pieza
function rotar(matriz) {
    return matriz[0].map((_, i) => matriz.map(fila => fila[i]).reverse());
}

// Generar una pieza aleatoria
function generarPiezaAleatoria() {
    const pieza = PIEZAS[Math.floor(Math.random() * PIEZAS.length)];
    return { ...pieza, x: 3, y: 0 };
}

// Dibujar la siguiente pieza
function dibujarSiguientePieza() {
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    const offsetX = Math.floor((nextCanvas.width / TAMANO_CUADRADO - siguientePieza.forma[0].length) / 2); // Centrar horizontalmente
    const offsetY = Math.floor((nextCanvas.height / TAMANO_CUADRADO - siguientePieza.forma.length) / 2); // Centrar verticalmente

    siguientePieza.forma.forEach((fila, r) => fila.forEach((celda, c) => {
        if (celda) dibujarCuadrado(c + offsetX, r + offsetY, siguientePieza.color, nextCtx);
    }));
}

// Función principal de caída de la pieza
function caer() {
    if (!juegoTerminado && juegoIniciado && !juegoPausado) {
        moverAbajo();
        dropTimeout = setTimeout(caer, velocidadCaida);
    }
}

// Mover la pieza hacia abajo
function moverAbajo() {
    if (!colision(0, 1, pieza.forma)) {
        pieza.y++;
    } else {
        bloquearPieza();
        eliminarFilasCompletas();
        pieza = siguientePieza;
        siguientePieza = generarPiezaAleatoria();
        dibujarSiguientePieza();
        if (colision(0, 0, pieza.forma)) {
            terminarJuego();
            clearTimeout(dropTimeout); // Limpiar el temporizador al terminar el juego
        }
    }
    dibujarTablero();
    dibujarPieza();
}

// Verificar colisiones
function colision(xOffset, yOffset, forma) {
    return forma.some((fila, r) => fila.some((celda, c) => {
        if (celda) {
            const nuevaX = c + pieza.x + xOffset;
            const nuevaY = r + pieza.y + yOffset;
            return (
                nuevaX < 0 || nuevaX >= COLUMNAS || // Fuera de los límites horizontales
                nuevaY >= FILAS || // Fuera del límite inferior
                (nuevaY >= 0 && tablero[nuevaY]?.[nuevaX] !== VACIO) // Colisión con otra pieza
            );
        }
        return false;
    }));
}

// Bloquear la pieza en el tablero
function bloquearPieza() {
    pieza.forma.forEach((fila, r) => fila.forEach((celda, c) => {
        if (celda) tablero[r + pieza.y][c + pieza.x] = pieza.color;
    }));
}

// Dibujar la pieza actual
function dibujarPieza() {
    pieza.forma.forEach((fila, r) => fila.forEach((celda, c) => {
        if (celda) dibujarCuadrado(c + pieza.x, r + pieza.y, pieza.color);
    }));
}

// Terminar el juego
function terminarJuego() {
    document.getElementById("game-over").style.display = "block";
    document.getElementById("restart-btn").style.display = "inline-block";
    juegoTerminado = true;
    juegoIniciado = false;
}

// Función para finalizar el juego
function finalizarJuego() {
    // Detener el juego
    juegoTerminado = true;
    juegoIniciado = false;
    clearTimeout(dropTimeout); // Detener la caída de la pieza

    // Ocultar la pantalla de juego
    document.getElementById("game-screen").style.display = "none";

    // Mostrar la pantalla de ranking
    document.getElementById("ranking-screen").style.display = "block";

    // Mostrar el formulario para guardar las iniciales
    document.getElementById("ranking-form").style.display = "block";

    // Detener la música de fondo
    musicaFondo.pause();
}

// Función para volver a la pantalla de inicio
function volverAlInicio() {
    // Ocultar la pantalla de ranking
    document.getElementById("ranking-screen").style.display = "none";

    // Mostrar la pantalla de inicio
    document.getElementById("start-screen").style.display = "block";
}

// Función para guardar la puntuación en el ranking
function guardarPuntuacion(iniciales) {
    // Verificar que las iniciales y la puntuación sean válidas
    if (iniciales && typeof iniciales === "string" && iniciales.length === 3 && !isNaN(puntuacion)) {
        // Agregar la nueva puntuación
        ranking.push({ iniciales, puntuacion });

        // Ordenar el ranking de mayor a menor puntuación
        ranking.sort((a, b) => b.puntuacion - a.puntuacion);

        // Mantener solo los 5 mejores
        ranking = ranking.slice(0, 5);

        // Guardar el ranking en LocalStorage
        guardarRanking();

        // Mostrar el ranking actualizado
        mostrarRanking();
    } else {
        console.error("Datos inválidos para guardar en el ranking.");
    }
}

// Función para mostrar el ranking con colores
function mostrarRanking() {
    const rankingList = document.getElementById("ranking-list");
    if (rankingList) {
        rankingList.innerHTML = ranking
            .map((entry, index) => {
                let color = "";
                if (index === 0) {
                    color = "gold"; // Oro fluorescente
                } else if (index === 1) {
                    color = "silver"; // Plata fluorescente
                } else if (index === 2) {
                    color = "#cd7f32"; // Bronce
                }
                return `<p style="color: ${color}; text-shadow: 0 0 10px ${color}, 0 0 20px ${color};">${index + 1}. ${entry.iniciales} - ${entry.puntuacion}</p>`;
            })
            .join("");
    }
}

// Cargar el ranking al iniciar la página
document.addEventListener("DOMContentLoaded", () => {
    cargarRanking();
    mostrarRanking();
});

// Manejar el envío del formulario de ranking
document.getElementById("ranking-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const iniciales = document.getElementById("initials").value.toUpperCase();
    if (iniciales.length === 3) {
        guardarPuntuacion(iniciales);
        document.getElementById("ranking-form").style.display = "none"; // Ocultar el formulario
    } else {
        alert("Por favor, ingresa 3 letras.");
    }
});

// Iniciar el juego
function iniciarJuego() {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
    reiniciarJuego();
}

// Reiniciar el juego
function reiniciarJuego() {
    puntuacion = 0;
    nivel = 1;
    velocidadCaida = 500;
    juegoTerminado = false;
    juegoIniciado = true;
    juegoPausado = false;
    actualizarPuntuacion();
    document.getElementById("game-over").style.display = "none";
    document.getElementById("restart-btn").style.display = "none";
    reiniciarTablero();
    dibujarTablero();
    pieza = generarPiezaAleatoria();
    siguientePieza = generarPiezaAleatoria();
    dibujarSiguientePieza();
    dibujarPieza();
    clearTimeout(dropTimeout);
    caer();
}

// Eventos de los botones
document.getElementById("start-btn").addEventListener("click", iniciarJuego);
document.getElementById("restart-btn").addEventListener("click", reiniciarJuego);
document.getElementById("end-btn").addEventListener("click", finalizarJuego);
document.getElementById("back-to-start-btn").addEventListener("click", volverAlInicio);

// Botón de instrucciones
document.getElementById("instructions-btn").addEventListener("click", () => {
    document.getElementById("instructions").style.display = "block";
});
document.getElementById("close-instructions-btn").addEventListener("click", () => {
    document.getElementById("instructions").style.display = "none";
});

// Botón de pausa
document.getElementById("pause-btn").addEventListener("click", togglePause);

// Función para pausar o reanudar el juego
function togglePause() {
    if (juegoTerminado) return;
    juegoPausado = !juegoPausado;

    if (juegoPausado) {
        clearTimeout(dropTimeout);
        document.getElementById("pause-btn").innerText = "Reanudar";
        document.getElementById("pause-overlay").style.display = "block";
        musicaFondo.pause(); // Pausar la música de fondo
    } else {
        document.getElementById("pause-btn").innerText = "Pausar";
        document.getElementById("pause-overlay").style.display = "none";
        musicaFondo.play(); // Reanudar la música de fondo
        caer();
    }
}

// Eventos del teclado
document.addEventListener("keydown", (event) => {
    if (juegoTerminado || !juegoIniciado || juegoPausado) return;

    if (event.key === "ArrowLeft" && !colision(-1, 0, pieza.forma)) pieza.x--;
    if (event.key === "ArrowRight" && !colision(1, 0, pieza.forma)) pieza.x++;

    if (event.key === "ArrowDown" && !teclaAbajoPresionada) {
        moverAbajo();
        teclaAbajoPresionada = true;
        setTimeout(() => teclaAbajoPresionada = false, 100);
    }

    if (event.key === "ArrowUp") {
        const rotada = rotar(pieza.forma);
        if (!colision(0, 0, rotada)) {
            pieza.forma = rotada;
        } else if (!colision(-1, 0, rotada)) {
            pieza.forma = rotada;
            pieza.x--;
        } else if (!colision(1, 0, rotada)) {
            pieza.forma = rotada;
            pieza.x++;
        }
    }

    dibujarTablero();
    dibujarPieza();
});