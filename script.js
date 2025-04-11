// --- Elementos del DOM ---
const mainMenu = document.getElementById('main-menu');
const startButton = document.getElementById('start-button');
const highScoresButton = document.getElementById('high-scores-button');
const difficultyScreen = document.getElementById('difficulty-screen');
const difficultyButtons = document.querySelectorAll('#difficulty-screen button[data-difficulty]');
const backToMenuFromDifficulty = document.getElementById('back-to-menu-from-difficulty');
const countdownScreen = document.getElementById('countdown-screen');
const countdownText = document.getElementById('countdown-text');
const gameScreen = document.getElementById('game-screen');
const gameCanvas = document.getElementById('gameCanvas');
const nextPieceDisplay = document.getElementById('next-piece');
const levelDisplay = document.getElementById('level');
const scoreDisplay = document.getElementById('score');
const recordDisplay = document.getElementById('record');
const pauseButton = document.getElementById('pause-button');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreDisplay = document.getElementById('final-score');
const finalLevelDisplay = document.getElementById('final-level');
const finalLinesDisplay = document.getElementById('final-lines');
const newRecordMessage = document.getElementById('new-record-message');
const playAgainButton = document.getElementById('play-again-button');
const backToMenuFromGameOver = document.getElementById('back-to-menu-from-game-over');
const highScoresScreen = document.getElementById('high-scores-screen');
const highScoresList = document.getElementById('high-scores-list');
const backToMenuFromHighScores = document.getElementById('back-to-menu-from-high-scores');
const ctx = gameCanvas.getContext('2d');

// --- Constantes y Variables del Juego ---
const grid = [];
const gridRows = 20;
const gridCols = 10;
const blockSize = 30;
let currentPiece = null;
let nextPiece = null;
let gameInterval;
let dropInterval = 1000; // Velocidad inicial de caída
let score = 0;
let level = 1;
let linesCleared = 0;
let isPaused = false;
let gameIsRunning = false; // Para saber si el juego ha pasado la cuenta atrás
let difficulty = 'normal';
let highScores = loadHighScores();

// --- Colores y Formas de las Piezas ---
const colors = {
    I: '#00ffff', J: '#0000ff', L: '#ffa500', O: '#ffff00', S: '#008000', T: '#800080', Z: '#ff0000'
};
const darkColors = { // Colores más oscuros para los bordes
    I: '#00cccc', J: '#0000cc', L: '#cc8400', O: '#cccc00', S: '#006600', T: '#660066', Z: '#cc0000'
};
// Definición corregida de las formas de las piezas (coordenadas relativas al centro [0,0])
const pieces = {
    'I': [[0, -1], [0, 0], [0, 1], [0, 2]], // Línea vertical
    'J': [[-1, 0], [-1, 1], [0, 1], [1, 1]],
    'L': [[1, 0], [-1, 1], [0, 1], [1, 1]],
    'O': [[0, 0], [1, 0], [0, 1], [1, 1]], // Cuadrado
    'S': [[0, 0], [1, 0], [-1, 1], [0, 1]],
    'T': [[0, 0], [-1, 1], [0, 1], [1, 1]],
    'Z': [[-1, 0], [0, 0], [0, 1], [1, 1]]
};
const pieceLetters = Object.keys(pieces); // ['I', 'J', 'L', 'O', 'S', 'T', 'Z']

// --- Funciones de Puntuaciones ---
function loadHighScores() {
    const storedScores = localStorage.getItem('tretisHighScores');
    // Asegúrate de que siempre devuelve un array, incluso si no hay nada guardado
    try {
        const parsed = JSON.parse(storedScores);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveHighScores() {
    localStorage.setItem('tretisHighScores', JSON.stringify(highScores));
}

function displayHighScores() {
    highScoresList.innerHTML = ''; // Limpia la lista existente
    // Asegúrate de que highScores sea un array antes de ordenar
    if (!Array.isArray(highScores)) {
        highScores = [];
    }
    // Ordena de mayor a menor y toma los 10 primeros
    const sortedScores = highScores.sort((a, b) => b - a).slice(0, 10);
    if (sortedScores.length === 0) {
        const li = document.createElement('li');
        li.textContent = "Aún no hay puntuaciones";
        li.style.textAlign = 'center'; // Centra el texto si no hay puntuaciones
        highScoresList.appendChild(li);
    } else {
        sortedScores.forEach((score, index) => {
            const li = document.createElement('li');
            li.textContent = `${index + 1}. ${score}`; // Muestra posición y puntuación
            highScoresList.appendChild(li);
        });
    }
}

function updateRecordDisplay() {
     recordDisplay.textContent = Math.max(0, ...highScores); // Muestra 0 si no hay puntuaciones
}

// --- Funciones del Grid y Dibujo ---
function createGrid() {
    grid.length = 0; // Vacía el array existente
    for (let y = 0; y < gridRows; y++) {
        grid[y] = Array(gridCols).fill(0); // Rellena con 0s
    }
}

function getRandomPiece() {
    const index = Math.floor(Math.random() * pieceLetters.length);
    const letter = pieceLetters[index];
    const shape = pieces[letter];
    return {
        shape: shape.map(arr => [...arr]), // Crea una copia profunda de la forma
        color: colors[letter],
        darkColor: darkColors[letter],
        x: Math.floor(gridCols / 2) - 1, // Posición inicial X (centrada)
        y: letter === 'I' ? -1 : 0,      // Posición inicial Y (ajustada para 'I')
        letter: letter                   // Guarda la letra para la lógica de rotación
    };
}

function drawBlock(x, y, color, darkColor) {
    ctx.fillStyle = color;
    ctx.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
    ctx.strokeStyle = darkColor; // Usa el color oscuro para el borde
    ctx.lineWidth = 2; // Grosor del borde
    ctx.strokeRect(x * blockSize + 1, y * blockSize + 1, blockSize - 2, blockSize - 2); // Dibuja el borde interior
}

function drawGrid() {
    for (let y = 0; y < gridRows; y++) {
        for (let x = 0; x < gridCols; x++) {
            if (grid[y][x]) { // Si la celda tiene una pieza (no es 0)
                drawBlock(x, y, grid[y][x].color, grid[y][x].darkColor);
            }
        }
    }
}

function drawPiece(piece) {
    piece.shape.forEach(block => {
        const drawX = piece.x + block[0];
        const drawY = piece.y + block[1];
        // Solo dibuja si está dentro del canvas visible (y >= 0)
        if (drawY >= 0) {
            drawBlock(drawX, drawY, piece.color, piece.darkColor);
        }
    });
}

function drawGhostPiece() {
    if (!currentPiece || isPaused || !gameIsRunning) return; // No dibujar si no hay pieza, está pausado o el juego no ha iniciado

    let ghostY = currentPiece.y;
    // Baja la 'ghostY' hasta que colisione
    while (!collision(currentPiece.shape, currentPiece.x, ghostY + 1)) {
        ghostY++;
    }

    // Dibuja la pieza fantasma semitransparente en la posición 'ghostY'
    ctx.globalAlpha = 0.3; // Establece transparencia
    currentPiece.shape.forEach(block => {
        const drawX = currentPiece.x + block[0];
        const drawY = ghostY + block[1];
        if (drawY >= 0) { // Solo dibuja si está dentro del canvas visible
             drawBlock(drawX, drawY, currentPiece.color, currentPiece.darkColor);
        }
    });
    ctx.globalAlpha = 1.0; // Restaura la opacidad completa
}

// --- Funciones de Lógica del Juego (Movimiento, Colisión, etc.) ---
function collision(shape, x, y) {
    return shape.some(block => {
        const newX = x + block[0];
        const newY = y + block[1];
        return (
            newX < 0 || // Fuera por la izquierda
            newX >= gridCols || // Fuera por la derecha
            newY >= gridRows || // Fuera por abajo
            (newY >= 0 && grid[newY] && grid[newY][newX]) // Choca con otra pieza en el grid
        );
    });
}

function mergePiece() {
    if (!currentPiece) return;
    currentPiece.shape.forEach(block => {
        const x = currentPiece.x + block[0];
        const y = currentPiece.y + block[1];
        if (y >= 0 && y < gridRows && x >= 0 && x < gridCols) {
            grid[y][x] = { color: currentPiece.color, darkColor: currentPiece.darkColor };
        }
    });
     // Comprobación temprana de Game Over justo después de mergear si la pieza quedó fuera arriba
     if (currentPiece.y < 0) {
         // Esta condición podría ser más robusta verificando si alguna parte
         // de la pieza mergeada está en y<0, pero para piezas estándar
         // si la y principal es < 0 al mergear, es probable Game Over.
         // gameOver(); // Mover gameOver a después de obtener nueva pieza
     }
}

function clearLines() {
    let linesClearedThisTurn = 0;
    for (let y = gridRows - 1; y >= 0; y--) {
        // Si la fila está completa (ninguna celda es 0)
        if (grid[y].every(cell => cell !== 0)) {
            linesClearedThisTurn++;
            // Elimina la fila 'y' del grid
            grid.splice(y, 1);
            // Añade una nueva fila vacía (llena de 0s) al principio
            grid.unshift(Array(gridCols).fill(0));
            // Como hemos modificado el grid, necesitamos volver a comprobar
            // la misma fila 'y' (que ahora contiene la fila de arriba)
            y++; // Incrementamos 'y' para contrarrestar el decremento del bucle for
        }
    }

    if (linesClearedThisTurn > 0) {
        // Calcula la puntuación basada en el número de líneas
        let points = 0;
        switch (linesClearedThisTurn) {
            case 1: points = 100 * level; break; // Tretis simple
            case 2: points = 300 * level; break; // Doble
            case 3: points = 500 * level; break; // Triple
            case 4: points = 800 * level; break; // ¡Tretis!
        }
        score += points;
        linesCleared += linesClearedThisTurn;

        // Actualiza el nivel cada 10 líneas
        const newLevel = Math.floor(linesCleared / 10) + 1;
        if (newLevel > level) {
            level = newLevel;
            // Aumenta la velocidad de caída basado en la dificultad y nivel
            let baseSpeed = 1000;
            if (difficulty === 'easy') baseSpeed = 1500;
            else if (difficulty === 'hard') baseSpeed = 500;
            // La velocidad aumenta, el intervalo disminuye. Evita que sea demasiado rápido.
            dropInterval = Math.max(100, baseSpeed / level); // Mínimo 100ms

            clearInterval(gameInterval); // Limpia el intervalo anterior
            gameInterval = setInterval(drop, dropInterval); // Crea uno nuevo con la nueva velocidad
        }
        updateDisplay(); // Actualiza la puntuación y nivel en pantalla
    }
}

function movePiece(dx) {
    if (!isGameActive()) return; // Usa la función de comprobación
    const newX = currentPiece.x + dx;
    if (!collision(currentPiece.shape, newX, currentPiece.y)) {
        currentPiece.x = newX;
    }
}

function rotatePiece() {
    if (!isGameActive()) return; // Usa la función de comprobación
    // La pieza 'O' no rota
    if (currentPiece.letter === 'O') return;

    const shape = currentPiece.shape;
    // Rota la pieza 90 grados a la derecha: (x, y) -> (-y, x)
    const newShape = shape.map(([x, y]) => [-y, x]);

    // Comprueba colisiones en la nueva posición
    if (!collision(newShape, currentPiece.x, currentPiece.y)) {
        currentPiece.shape = newShape; // Aplica la rotación
    } else {
         // Intenta "Wall Kick": mover 1 a la derecha o 1 a la izquierda
         if (!collision(newShape, currentPiece.x + 1, currentPiece.y)) {
             currentPiece.x++;
             currentPiece.shape = newShape;
         } else if (!collision(newShape, currentPiece.x - 1, currentPiece.y)) {
             currentPiece.x--;
             currentPiece.shape = newShape;
         }
         // Podrías añadir más lógica de wall kick si es necesario
     }
}

function drop() { // Caída automática temporizada
    if (!isGameActive()) return;

    if (!collision(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++; // Mueve la pieza hacia abajo
    } else {
        // Si hay colisión al intentar bajar:
        mergePiece();       // 1. Fusiona la pieza con el grid
        clearLines();       // 2. Comprueba y limpia líneas completas
        currentPiece = nextPiece; // 3. La siguiente pieza se convierte en la actual
        nextPiece = getRandomPiece(); // 4. Genera una nueva pieza siguiente
        updateNextPieceDisplay(); // 5. Actualiza la vista previa de la siguiente pieza

        // 6. Comprueba si la nueva pieza colisiona inmediatamente (Game Over)
        if (collision(currentPiece.shape, currentPiece.x, currentPiece.y)) {
            gameOver();
            return; // Termina la función drop si es Game Over
        }
    }
    draw(); // Redibuja el estado del juego después de cada paso de caída
}

function dropFast() { // Caída suave (soft drop) activada por el usuario
    if (!isGameActive()) return;

    if (!collision(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        score += 1; // Pequeño bonus por bajar rápido
        updateDisplay(); // Actualiza el marcador
        draw();          // Redibuja inmediatamente
        // Opcional: reiniciar el temporizador de caída automática si se desea
        // clearInterval(gameInterval);
        // gameInterval = setInterval(drop, dropInterval);
    } else {
        // Si colisiona al intentar bajar rápido, actúa como la caída normal
        drop();
    }
}

// *** NUEVA FUNCIÓN Hard Drop ***
function hardDrop() {
    if (!isGameActive()) return;

    let dropCount = 0;
    // Baja la pieza hasta que colisione
    while (!collision(currentPiece.shape, currentPiece.x, currentPiece.y + 1)) {
        currentPiece.y++;
        dropCount++;
    }

    if (dropCount > 0) {
        score += dropCount * 2; // Bonus por hard drop (ej. 2 puntos por celda)
    }

    // Después de bajarla del todo, ejecuta la misma lógica que al final de drop()
    mergePiece();
    clearLines();
    currentPiece = nextPiece;
    nextPiece = getRandomPiece();
    updateNextPieceDisplay();
    if (collision(currentPiece.shape, currentPiece.x, currentPiece.y)) {
        gameOver();
        return;
    }
    updateDisplay(); // Actualiza el score
    draw(); // Dibuja el estado final tras hard drop
    // Reinicia el intervalo de caída normal
    clearInterval(gameInterval);
    gameInterval = setInterval(drop, dropInterval);
}


// --- Funciones de Actualización de Pantalla ---
function updateDisplay() {
    scoreDisplay.textContent = score;
    levelDisplay.textContent = level;
    // Actualiza el récord mostrado dinámicamente
    updateRecordDisplay();
}

function updateNextPieceDisplay() {
    nextPieceDisplay.innerHTML = ''; // Limpia el contenedor
    if (!nextPiece) return;

    const nextCanvas = document.createElement('canvas');
    const pieceSize = Math.max(
         ...nextPiece.shape.map(p => Math.abs(p[0])),
         ...nextPiece.shape.map(p => Math.abs(p[1]))
    ) * 2 + 1; // Calcula tamaño necesario (aprox)

    // Ajusta el tamaño del canvas de vista previa
    nextCanvas.width = blockSize * (pieceSize > 3 ? 4 : 3); // Un poco más grande para 'I'
    nextCanvas.height = blockSize * (pieceSize > 2 ? 4 : 3);
    const nextCtx = nextCanvas.getContext('2d');

    // Calcula el desplazamiento para centrar la pieza
    const offsetX = (nextCanvas.width / blockSize / 2);
    const offsetY = (nextCanvas.height / blockSize / 2);

    nextPiece.shape.forEach(block => {
         // Dibuja cada bloque relativo al centro calculado
         const drawX = block[0] + offsetX;
         const drawY = block[1] + offsetY;
         // Dibuja el bloque en el canvas de vista previa
         nextCtx.fillStyle = nextPiece.color;
         nextCtx.fillRect(drawX * blockSize, drawY * blockSize, blockSize, blockSize);
         nextCtx.strokeStyle = nextPiece.darkColor;
         nextCtx.lineWidth = 2;
         nextCtx.strokeRect(drawX * blockSize + 1, drawY * blockSize + 1, blockSize - 2, blockSize - 2);

    });
    nextPieceDisplay.appendChild(nextCanvas);
}


function draw() {
    if (!ctx) return; // Comprobación extra por si acaso
    // Limpia el canvas completo
    ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
    // Dibuja el fondo del grid (opcional, si quieres líneas de guía)
    // Dibuja las piezas ya fijadas en el grid
    drawGrid();
    // Dibuja la pieza fantasma (si existe la pieza actual)
    if (currentPiece) {
        drawGhostPiece();
        // Dibuja la pieza actual que está cayendo
        drawPiece(currentPiece);
    }
}

// --- Funciones de Control del Estado del Juego ---
function startGame() {
    mainMenu.classList.add('hidden');
    difficultyScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden'); // Asegúrate que esté oculta
    highScoresScreen.classList.add('hidden'); // Asegúrate que esté oculta
    countdownScreen.classList.remove('hidden'); // Muestra cuenta atrás

    // Aplica clase de dificultad al body para CSS dinámico
    document.body.className = `difficulty-${difficulty}`; // Limpia clases previas y pone la actual

    createGrid();
    currentPiece = getRandomPiece();
    nextPiece = getRandomPiece();
    updateNextPieceDisplay();
    score = 0;
    level = 1;
    linesCleared = 0;
    isPaused = false; // Asegura que no esté pausado al inicio
    gameIsRunning = false; // Aún no empieza hasta después de la cuenta atrás
    pauseButton.textContent = 'Pausa'; // Texto inicial del botón
    updateDisplay(); // Muestra score y nivel iniciales
    updateRecordDisplay(); // Muestra el récord

    // Ajusta la velocidad inicial según la dificultad
    if (difficulty === 'easy') dropInterval = 1500;
    else if (difficulty === 'normal') dropInterval = 1000;
    else if (difficulty === 'hard') dropInterval = 500;

    clearInterval(gameInterval); // Limpia cualquier intervalo anterior

    // Lógica de la cuenta atrás
    let countdown = 3;
    countdownText.textContent = countdown;
    const countdownInterval = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownText.textContent = countdown;
        } else if (countdown === 0) {
            countdownText.textContent = '¡YA!'; // Cambiado de LISTO
        } else {
            clearInterval(countdownInterval);
            countdownScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');
            gameIsRunning = true; // ¡El juego comienza ahora!
            // Inicia el bucle principal del juego (caída de piezas)
            gameInterval = setInterval(drop, dropInterval);
            // Añade el listener de teclado SOLO cuando el juego empieza
            document.addEventListener('keydown', handleKeyDown);
            draw(); // Dibuja el estado inicial del juego
        }
    }, 1000);
}

function pauseGame() {
    if (!gameIsRunning) return; // No se puede pausar si el juego no ha empezado
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Reanudar' : 'Pausa';
    if (isPaused) {
        clearInterval(gameInterval); // Detiene la caída automática
        // Opcional: Mostrar un texto de Pausa en el canvas
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, gameCanvas.height / 2 - 30, gameCanvas.width, 60);
        ctx.font = "30px 'Press Start 2P'";
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSA', gameCanvas.width / 2, gameCanvas.height / 2 + 10);

    } else {
        // Reanuda la caída automática
        gameInterval = setInterval(drop, dropInterval);
        draw(); // Redibuja para quitar el mensaje de pausa
    }
}

function gameOver() {
    gameIsRunning = false; // El juego ya no está activo
    clearInterval(gameInterval); // Detiene el bucle del juego
    document.removeEventListener('keydown', handleKeyDown); // Quita el listener de teclado
    gameScreen.classList.add('hidden'); // Oculta pantalla de juego
    gameOverScreen.classList.remove('hidden'); // Muestra pantalla de Game Over

    finalScoreDisplay.textContent = score;
    finalLevelDisplay.textContent = level;
    finalLinesDisplay.textContent = linesCleared;

    // Comprueba si es un nuevo récord
    const currentRecord = Math.max(0, ...highScores);
    if (score > currentRecord) {
        newRecordMessage.classList.remove('hidden'); // Muestra mensaje de nuevo récord
        highScores.push(score); // Añade la nueva puntuación
        highScores.sort((a, b) => b - a); // Ordena
        highScores = highScores.slice(0, 10); // Mantiene solo los 10 mejores
        saveHighScores(); // Guarda en localStorage
        displayHighScores(); // Actualiza la lista en la pantalla de récords (aunque esté oculta)
        updateRecordDisplay(); // Actualiza el récord mostrado en la pantalla de juego (para la próxima vez)
    } else {
        newRecordMessage.classList.add('hidden'); // Oculta el mensaje si no es récord
    }
}

function resetGame() { // Llamada por "Jugar de Nuevo"
    gameOverScreen.classList.add('hidden');
    // Vuelve a mostrar la pantalla de dificultad para elegir de nuevo
    showDifficultyScreen();
    // O podrías llamar directamente a startGame() si quieres mantener la dificultad:
    // startGame();
}

// --- Funciones de Navegación entre Pantallas ---
function showDifficultyScreen() {
    mainMenu.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    highScoresScreen.classList.add('hidden');
    difficultyScreen.classList.remove('hidden');
     // Limpia la clase de dificultad del body al volver a la selección
     document.body.className = '';
}

function showMainMenu() {
    difficultyScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    highScoresScreen.classList.add('hidden');
    countdownScreen.classList.add('hidden'); // Asegura ocultar cuenta atrás
    mainMenu.classList.remove('hidden');
    gameIsRunning = false; // Resetea estado del juego
    isPaused = false;      // Resetea pausa
    clearInterval(gameInterval); // Detiene cualquier bucle de juego
    document.removeEventListener('keydown', handleKeyDown); // Quita listener
    // Limpia la clase de dificultad del body al volver al menú principal
    document.body.className = '';
}

function showHighScores() {
    mainMenu.classList.add('hidden');
    difficultyScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    highScoresScreen.classList.remove('hidden');
    displayHighScores(); // Carga y muestra las puntuaciones actualizadas
}

// --- Manejador de Eventos de Teclado ---
function handleKeyDown(e) {
    // Comprobación robusta: no hacer nada si no está activo el juego
    if (!isGameActive()) return;

    let actionTaken = false; // Bandera para saber si se redibuja

    switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            movePiece(-1);
            actionTaken = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            movePiece(1);
            actionTaken = true;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            dropFast(); // Llama a soft drop
            // dropFast ya llama a draw() o drop() internamente
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
        case ' ': // Espacio también rota
            rotatePiece();
            actionTaken = true;
            break;
        case 'p': // Tecla P para Pausa/Reanudar
        case 'P':
             pauseGame();
             break;
        // Podrías añadir una tecla para Hard Drop si quieres, ej: 'Enter' o 'Shift'
        // case 'Enter':
        //     hardDrop();
        //     break;
    }

    // Redibuja solo si se realizó una acción de movimiento/rotación
    // y el juego no está pausado (dropFast/hardDrop se encargan de su propio dibujo)
    if (actionTaken && !isPaused) {
        draw();
    }
}

// --- Event Listeners de Botones de Navegación ---
startButton.addEventListener('click', showDifficultyScreen);
highScoresButton.addEventListener('click', showHighScores);
backToMenuFromDifficulty.addEventListener('click', showMainMenu);
backToMenuFromHighScores.addEventListener('click', showMainMenu);
playAgainButton.addEventListener('click', resetGame); // Llama a resetGame -> showDifficultyScreen
backToMenuFromGameOver.addEventListener('click', showMainMenu);
pauseButton.addEventListener('click', pauseGame);

// Listener para botones de dificultad
difficultyButtons.forEach(button => {
    button.addEventListener('click', function() {
        difficulty = this.dataset.difficulty; // Establece la dificultad seleccionada
        startGame(); // Inicia el juego con esa dificultad
    });
});

// --- INICIO: CÓDIGO PARA CONTROLES MÓVILES ---

// Referencias a los botones móviles
const moveLeftButton = document.getElementById('move-left-btn');
const moveRightButton = document.getElementById('move-right-btn');
const rotateButton = document.getElementById('rotate-btn');
const moveDownButton = document.getElementById('move-down-btn'); // Botón para Soft Drop (↓)
const dropButton = document.getElementById('drop-btn');         // Botón para Hard Drop (↓↓)

// Función para verificar si el juego está activo (no pausado y pantalla visible)
function isGameActive() {
    // El juego está activo si gameIsRunning es true Y no está pausado
    return gameIsRunning && !isPaused;
}

// Listeners para los botones móviles
if (moveLeftButton) {
    moveLeftButton.addEventListener('click', () => {
        if (isGameActive()) {
            movePiece(-1);
            draw(); // Redibuja después de mover
        }
    });
}

if (moveRightButton) {
    moveRightButton.addEventListener('click', () => {
        if (isGameActive()) {
            movePiece(1);
            draw(); // Redibuja después de mover
        }
    });
}

if (rotateButton) {
    rotateButton.addEventListener('click', () => {
        if (isGameActive()) {
            rotatePiece();
            draw(); // Redibuja después de rotar
        }
    });
}

if (moveDownButton) {
    moveDownButton.addEventListener('click', () => {
        if (isGameActive()) {
            dropFast(); // Llama a la función de soft drop
        }
    });
    // Opcional: Implementar mantener presionado para bajar continuamente
    // requeriría 'touchstart', 'touchend' y manejo de intervalos.
}

if (dropButton) {
    dropButton.addEventListener('click', () => {
        if (isGameActive()) {
            hardDrop(); // Llama a la nueva función de hard drop
        }
    });
}

// --- FIN: CÓDIGO PARA CONTROLES MÓVILES ---


// --- Inicialización ---
showMainMenu(); // Muestra el menú principal al cargar
updateRecordDisplay(); // Asegura que el récord se muestre inicialmente
