// Este archivo ahora actúa como el UIManager (Gestor de Interfaz de Usuario)
// Contiene todas las referencias a elementos del DOM y funciones para manipular la UI.

window.UIManager = (function() {
    // Referencias a los elementos de las pantallas
    const screen1 = document.getElementById('screen1');
    const screen2 = document.getElementById('screen2');
    const screen3 = document.getElementById('screen3');

    const playerNameInput = document.getElementById('playerName');
    const btnEnterName = document.getElementById('btnEnterName');
    const nameError = document.getElementById('nameError');

    const rivalNameInputScreen1 = document.getElementById('rivalNameScreen1');

    const playerNameInputScreen2 = document.getElementById('playerNameScreen2');
    const rivalNameInputScreen2 = document.getElementById('rivalNameScreen2');
    const roomIdDisplay = document.getElementById('roomIdDisplay');
    const waitingMessage = document.getElementById('waitingMessage');
    const btnStartGame = document.getElementById('btnStartGame');
    const btnCancelGame = document.getElementById('btnCancelGame');

    const ownNameDisplay = document.getElementById('ownNameDisplay');
    const opponentNameDisplay = document.getElementById('opponentNameDisplay');
    const ownPositionDisplay = document.getElementById('ownPositionDisplay');
    const opponentPositionDisplay = document.getElementById('opponentPositionDisplay');
    const currentTurnDisplay = document.getElementById('currentTurnDisplay');
    const gameBoard = document.getElementById('gameBoard');
    const player1Token = document.getElementById('player1Token');
    const player2Token = document.getElementById('player2Token');
    const gameMessageDiv = document.getElementById('gameMessages');
    const ownHandDiv = document.getElementById('ownHand');
    const opponentHandDiv = document.getElementById('opponentHand');
    const ownHandCountDisplay = document.getElementById('ownHandCount');
    const opponentHandCountDisplay = document.getElementById('opponentHandCount');
    const btnPlayCard = document.getElementById('btnPlayCard');
    const btnPassTurn = document.getElementById('btnPassTurn');
    const btnRematch = document.getElementById('btnRematch');
    const btnNewGame = document.getElementById('btnNewGame');

    const cardInteractionModal = document.getElementById('cardInteractionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalButtons = document.getElementById('modalButtons');

    const ownActiveEffectsDiv = document.getElementById('ownActiveEffects');
    const opponentActiveEffectsDiv = document.getElementById('opponentActiveEffects');

    const gameOverModal = document.getElementById('gameOverModal');
    const gameOverTitle = document.getElementById('gameOverTitle');
    const winnerDisplay = document.getElementById('winnerDisplay');
    const playerNamesDisplay = document.getElementById('playerNamesDisplay');
    const btnRematchGameOver = document.getElementById('btnRematchGameOver');
    const btnNewGameGameOver = document.getElementById('btnNewGameGameOver');

    let gameLogicInstance = null; // Referencia a GameLogic para callbacks

    function init(gameLogic) {
        gameLogicInstance = gameLogic;
    }

    // Función para cambiar de pantalla
    function showScreen(screenToShow) {
        screen1.classList.remove('active');
        screen2.classList.remove('active');
        screen3.classList.remove('active');
        screenToShow.classList.add('active');
    }

    // Función para generar una carta visualmente
    function createCardElement(card, isFaceDown = false) {
        const cardDiv = document.createElement('div');
        cardDiv.classList.add('card-in-hand');
        cardDiv.dataset.cardId = card.id; // Almacenar el ID de la carta

        if (isFaceDown) {
            cardDiv.classList.add('card-back');
            cardDiv.innerHTML = 'CS';
        } else {
            cardDiv.innerHTML = `
                <div class="card-image">
                    <img src="${card.image}" alt="${card.name}" onerror="this.onerror=null;this.src='https://placehold.co/60x80/cccccc/333333?text=Card';">
                </div>
                <div class="card-info">
                    <div class="card-name-value">
                        <span>${card.name}</span>
                        <span>${card.value}</span>
                    </div>
                    <div class="card-effect">${card.effect}</div>
                </div>
            `;
        }
        return cardDiv;
    }

    // Función para renderizar la mano del jugador
    function renderOwnHand(hand) {
        ownHandDiv.innerHTML = ''; // Limpiar mano actual
        ownHandCountDisplay.textContent = hand.length;
        hand.forEach(card => {
            const cardElement = createCardElement(card);
            cardElement.addEventListener('click', () => {
                // Lógica de selección de carta para jugar (se manejará en GameLogic.playCard)
                // Por ahora, solo feedback visual
                const currentlySelected = ownHandDiv.querySelector('.card-in-hand.selected');
                if (currentlySelected) {
                    currentlySelected.classList.remove('selected');
                }
                cardElement.classList.add('selected');
            });
            ownHandDiv.appendChild(cardElement);
        });
    }

    // Función para renderizar la mano del oponente (solo el número de cartas)
    function renderOpponentHand(cardCount) {
        opponentHandDiv.innerHTML = ''; // Limpiar mano actual
        opponentHandCountDisplay.textContent = cardCount;
        for (let i = 0; i < cardCount; i++) {
            opponentHandDiv.appendChild(createCardElement({}, true)); // Crea cartas boca abajo
        }
    }

    // Función para renderizar el tablero de juego
    function renderGameBoard(player1Pos, player2Pos) {
        gameBoard.innerHTML = ''; // Limpiar tablero existente
        const numCells = 15; // Número total de casillas en el tablero

        for (let i = 0; i < numCells; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.cellIndex = i;
            cell.textContent = i; // Mostrar el número de la casilla
            gameBoard.appendChild(cell);
        }

        // Posicionar los tokens de los jugadores
        const cells = document.querySelectorAll('.game-board .cell');
        if (cells.length > 0) {
            // Posicionar Jugador 1
            const cell1 = cells[player1Pos];
            player1Token.style.left = `${cell1.offsetLeft + (cell1.offsetWidth / 2) - (player1Token.offsetWidth / 2) - 10}px`; /* Ajuste para P1 */
            player1Token.style.top = `${cell1.offsetTop + (cell1.offsetHeight / 2) - (player1Token.offsetHeight / 2)}px`;

            // Posicionar Jugador 2 (ligeramente desplazado si están en la misma casilla)
            const cell2 = cells[player2Pos];
            let offset = 0;
            if (player1Pos === player2Pos) {
                offset = 10; // Pequeño desplazamiento para que no se superpongan completamente
            }
            player2Token.style.left = `${cell2.offsetLeft + (cell2.offsetWidth / 2) - (player2Token.offsetWidth / 2) + offset}px`; /* Ajuste para P2 */
            player2Token.style.top = `${cell2.offsetTop + (cell2.offsetHeight / 2) - (player2Token.offsetHeight / 2)}px`;
        }
    }

    // Función para mostrar mensajes en el juego
    function showGameMessage(message) {
        gameMessageDiv.textContent = message;
    }

    // Función para mostrar un modal genérico
    let currentModalResolve = null; // Para resolver la promesa del modal
    let currentModalReject = null; // Para rechazar la promesa del modal

    function displayModal(title, contentElement, buttonsArray = [], customClass = '') {
        modalTitle.textContent = title;
        modalBody.innerHTML = '';
        modalBody.appendChild(contentElement);
        modalButtons.innerHTML = '';

        buttonsArray.forEach(buttonConfig => {
            const button = document.createElement('button');
            button.textContent = buttonConfig.text;
            button.classList.add('modal-button');
            if (buttonConfig.class) {
                button.classList.add(buttonConfig.class);
            }
            button.addEventListener('click', () => {
                if (buttonConfig.onClick) {
                    buttonConfig.onClick();
                }
                // No ocultar el modal automáticamente aquí si es una confirmación que espera una respuesta de Firebase
                // La ocultación se manejará en awaitMultiPlayerModalConfirmation o en la lógica de resolución.
            });
            modalButtons.appendChild(button);
        });

        cardInteractionModal.classList.add('active');
        if (customClass) {
            cardInteractionModal.classList.add(customClass);
        }

        return new Promise((resolve, reject) => {
            currentModalResolve = resolve;
            currentModalReject = reject;
        });
    }

    function hideModal(modalId = 'cardInteractionModal') {
        const modalToHide = document.getElementById(modalId);
        if (modalToHide) {
            modalToHide.classList.remove('active');
            // Limpiar las promesas si el modal se cierra manualmente
            if (currentModalResolve) {
                currentModalResolve(null); // O null para indicar que se cerró sin selección
                currentModalResolve = null;
                currentModalReject = null;
            }
        }
    }

    function showLoading(message = 'Cargando...') {
        gameMessageDiv.textContent = message;
        // Podrías añadir un spinner o una clase de carga aquí
    }

    function hideLoading() {
        gameMessageDiv.textContent = ''; // Limpiar mensaje de carga
        // Quitar spinner/clase de carga
    }

    function showError(message) {
        gameMessageDiv.textContent = `Error: ${message}`;
        gameMessageDiv.style.color = 'red';
        setTimeout(() => {
            gameMessageDiv.textContent = '';
            gameMessageDiv.style.color = '';
        }, 5000);
    }

    function updatePlayerInfo(ownName, ownPos, opponentName, opponentPos, turnPlayerName) {
        ownNameDisplay.textContent = ownName;
        ownPositionDisplay.textContent = ownPos;
        opponentNameDisplay.textContent = opponentName;
        opponentPositionDisplay.textContent = opponentPos;
        currentTurnDisplay.textContent = turnPlayerName;
    }

    function updateActiveEffects(ownEffects, opponentEffects) {
        ownActiveEffectsDiv.innerHTML = '<h3>Tus Efectos Activos:</h3>';
        if (ownEffects && Object.keys(ownEffects).length > 0) {
            for (const effectId in ownEffects) {
                const effect = ownEffects[effectId];
                const effectDiv = document.createElement('div');
                effectDiv.textContent = `${effect.name} (Turnos restantes: ${effect.duration})`;
                ownActiveEffectsDiv.appendChild(effectDiv);
            }
        } else {
            ownActiveEffectsDiv.innerHTML += '<p>Ninguno</p>';
        }

        opponentActiveEffectsDiv.innerHTML = '<h3>Efectos Activos del Rival:</h3>';
        if (opponentEffects && Object.keys(opponentEffects).length > 0) {
            for (const effectId in opponentEffects) {
                const effect = opponentEffects[effectId];
                const effectDiv = document.createElement('div');
                effectDiv.textContent = `${effect.name} (Turnos restantes: ${effect.duration})`;
                opponentActiveEffectsDiv.appendChild(effectDiv);
            }
        } else {
            opponentActiveEffectsDiv.innerHTML += '<p>Ninguno</p>';
        }
    }

    function showGameOverModal(winnerName, player1Name, player2Name) {
        gameOverTitle.textContent = '¡Fin de la Partida!';
        winnerDisplay.textContent = winnerName;
        playerNamesDisplay.textContent = `${player1Name} vs ${player2Name}`;
        gameOverModal.classList.add('active');
    }

    // Exponer las propiedades y métodos públicos del UIManager
    return {
        init: init,
        // Referencias a elementos DOM (para acceso desde GameLogic/FirebaseService)
        screen1: screen1,
        screen2: screen2,
        screen3: screen3,
        playerNameInput: playerNameInput,
        btnEnterName: btnEnterName,
        nameError: nameError,
        rivalNameInputScreen1: rivalNameInputScreen1,
        playerNameInputScreen2: playerNameInputScreen2,
        rivalNameInputScreen2: rivalNameInputScreen2,
        roomIdDisplay: roomIdDisplay,
        waitingMessage: waitingMessage,
        btnStartGame: btnStartGame,
        btnCancelGame: btnCancelGame,
        ownNameDisplay: ownNameDisplay,
        opponentNameDisplay: opponentNameDisplay,
        currentTurnDisplay: currentTurnDisplay,
        btnPlayCard: btnPlayCard,
        btnPassTurn: btnPassTurn,
        btnRematch: btnRematch,
        btnNewGame: btnNewGame,
        btnRematchGameOver: btnRematchGameOver,
        btnNewGameGameOver: btnNewGameGameOver,

        // Métodos de UI
        showScreen: showScreen,
        createCardElement: createCardElement,
        renderOwnHand: renderOwnHand,
        renderOpponentHand: renderOpponentHand,
        renderGameBoard: renderGameBoard,
        showGameMessage: showGameMessage,
        displayModal: displayModal,
        hideModal: hideModal,
        showLoading: showLoading,
        hideLoading: hideLoading,
        showError: showError,
        updatePlayerInfo: updatePlayerInfo,
        updateActiveEffects: updateActiveEffects,
        showGameOverModal: showGameOverModal,
        // Para resolver modales interactivos
        resolveModal: (value) => {
            if (currentModalResolve) {
                currentModalResolve(value);
                currentModalResolve = null;
                currentModalReject = null;
            }
        },
        rejectModal: (error) => {
            if (currentModalReject) {
                currentModalReject(error);
                currentModalResolve = null;
                currentModalReject = null;
            }
        }
    };
})();
