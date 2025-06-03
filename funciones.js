// Este archivo ahora actúa como el GameLogic (Lógica del Juego)
// Contiene el estado central del juego y las funciones principales de la lógica.

window.GameLogic = (function() {
    let firebaseService = null; // Referencia al servicio de Firebase
    let uiManager = null;       // Referencia al gestor de UI
    let cardDefinitions = [];   // Referencia a las definiciones de cartas
    let cardEffects = {};       // Referencia a los efectos de cartas

    // Estado del juego centralizado
    let gameState = {
        jugador1Id: '',
        jugador2Id: '',
        jugador1Nombre: '',
        jugador2Nombre: '',
        estado: 'esperando', // 'esperando', 'jugando', 'terminado'
        turnoActual: '',
        posicionJugador1: 0,
        posicionJugador2: 0,
        manoJugador1: [],
        manoJugador2: [],
        mazo: [],
        pilaDescarte: [],
        repeatTurn: false,
        modalConfirmations: {}, // Para manejar modales multijugador
        winner: null,
        effectsActivosJugador1: {},
        effectsActivosJugador2: {},
        lastPlayedCard: null, // Última carta jugada para referencia
    };

    function init(fbService, uiMan, cDefs, cEffects) {
        firebaseService = fbService;
        uiManager = uiMan;
        cardDefinitions = cDefs;
        cardEffects = cEffects; // Asegúrate de que cardEffects se pase correctamente
    }

    // Función para barajar un array (algoritmo de Fisher-Yates)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Función para actualizar el estado local del juego y renderizar la UI
    function updateGameStateAndUI(roomData) {
        if (!roomData) {
            console.warn("DEBUG: No hay datos de sala para actualizar el estado.");
            return;
        }

        const currentUserId = firebaseService.currentUserId;
        const rivalId = firebaseService.currentRivalId;

        // Actualizar el estado local con los datos de Firestore
        gameState.jugador1Id = roomData.jugador1Id;
        gameState.jugador2Id = roomData.jugador2Id;
        gameState.jugador1Nombre = roomData.jugador1Nombre;
        gameState.jugador2Nombre = roomData.jugador2Nombre;
        gameState.estado = roomData.estadoJuego.estado;
        gameState.turnoActual = roomData.estadoJuego.turnoActual;
        gameState.posicionJugador1 = roomData.estadoJuego.posicionJugador1;
        gameState.posicionJugador2 = roomData.estadoJuego.posicionJugador2;
        gameState.mazo = roomData.estadoJuego.mazo || [];
        gameState.pilaDescarte = roomData.estadoJuego.pilaDescarte || [];
        gameState.repeatTurn = roomData.estadoJuego.repeatTurn || false;
        gameState.modalConfirmations = roomData.estadoJuego.modalConfirmations || {};
        gameState.winner = roomData.estadoJuego.winner || null;
        gameState.effectsActivosJugador1 = roomData.estadoJuego.effectsActivosJugador1 || {};
        gameState.effectsActivosJugador2 = roomData.estadoJuego.effectsActivosJugador2 || {};
        gameState.lastPlayedCard = roomData.estadoJuego.lastPlayedCard || null;


        // Determinar qué mano es la propia y cuál es la del rival
        if (roomData.jugador1Id === currentUserId) {
            gameState.manoJugador1 = roomData.estadoJuego.manoJugador1 || [];
            gameState.manoJugador2 = roomData.estadoJuego.manoJugador2 || [];
        } else {
            gameState.manoJugador1 = roomData.estadoJuego.manoJugador2 || []; // Tu mano es la del jugador 2
            gameState.manoJugador2 = roomData.estadoJuego.manoJugador1 || []; // La mano del rival es la del jugador 1
        }

        // Renderizar la UI basada en el nuevo estado
        const ownPos = (currentUserId === gameState.jugador1Id) ? gameState.posicionJugador1 : gameState.posicionJugador2;
        const opponentPos = (currentUserId === gameState.jugador1Id) ? gameState.posicionJugador2 : gameState.posicionJugador1;
        const ownName = (currentUserId === gameState.jugador1Id) ? gameState.jugador1Nombre : gameState.jugador2Nombre;
        const opponentName = (currentUserId === gameState.jugador1Id) ? gameState.jugador2Nombre : gameState.jugador1Nombre;
        const turnPlayerName = (gameState.turnoActual === gameState.jugador1Id) ? gameState.jugador1Nombre : gameState.jugador2Nombre;

        uiManager.updatePlayerInfo(ownName, ownPos, opponentName, opponentPos, turnPlayerName);
        uiManager.renderGameBoard(gameState.posicionJugador1, gameState.posicionJugador2);
        uiManager.renderOwnHand(gameState.manoJugador1);
        uiManager.renderOpponentHand(gameState.manoJugador2.length); // Solo el conteo de cartas del rival
        uiManager.updateActiveEffects(
            (currentUserId === gameState.jugador1Id) ? gameState.effectsActivosJugador1 : gameState.effectsActivosJugador2,
            (currentUserId === gameState.jugador1Id) ? gameState.effectsActivosJugador2 : gameState.effectsActivosJugador1
        );

        // Habilitar/deshabilitar botones de acción
        const isMyTurn = gameState.turnoActual === currentUserId;
        uiManager.btnPlayCard.disabled = !isMyTurn;
        uiManager.btnPassTurn.disabled = !isMyTurn;

        // Lógica de fin de juego
        if (gameState.estado === 'terminado' && gameState.winner) {
            uiManager.showGameOverModal(
                (gameState.winner === gameState.jugador1Id ? gameState.jugador1Nombre : gameState.jugador2Nombre),
                gameState.jugador1Nombre,
                gameState.jugador2Nombre
            );
            uiManager.btnRematch.style.display = 'block';
            uiManager.btnNewGame.style.display = 'block';
        } else {
            uiManager.hideModal('gameOverModal');
            uiManager.btnRematch.style.display = 'none';
            uiManager.btnNewGame.style.display = 'none';
        }

        // Lógica de modales multijugador
        handleMultiplayerModals(roomData.estadoJuego.modalConfirmations);
    }

    // Función para manejar los modales multijugador
    async function handleMultiplayerModals(modalConfirmations) {
        const currentUserId = firebaseService.currentUserId;
        const currentRoomId = firebaseService.currentRoomId;

        if (!currentRoomId) return;

        // Buscar si hay un modal pendiente para el usuario actual
        for (const modalId in modalConfirmations) {
            const modalData = modalConfirmations[modalId];
            if (modalData.targetUserId === currentUserId) {
                // Si ya estamos mostrando este modal, no hacer nada
                if (uiManager.cardInteractionModal.classList.contains('active') && uiManager.modalTitle.textContent === modalData.title) {
                    return;
                }

                // Mostrar el modal y esperar la acción del usuario
                console.log(`DEBUG: Mostrando modal para el usuario actual: ${modalData.title}`);
                let selectedValue = null;
                try {
                    // Reconstruir el contenido del modal
                    const modalContentDiv = document.createElement('div');
                    const promptElement = document.createElement('p');
                    promptElement.textContent = modalData.prompt;
                    modalContentDiv.appendChild(promptElement);

                    const selectionContainer = document.createElement('div');
                    selectionContainer.classList.add('modal-selection-container');
                    modalContentDiv.appendChild(selectionContainer);

                    let selectedItem = null;

                    if (modalData.type === 'choosePlayer') {
                        const players = [
                            { id: gameState.jugador1Id, name: gameState.jugador1Nombre },
                            { id: gameState.jugador2Id, name: gameState.jugador2Nombre }
                        ].filter(p => p.id !== currentUserId); // No puedes elegirte a ti mismo

                        players.forEach(player => {
                            const playerElement = document.createElement('button');
                            playerElement.textContent = player.name;
                            playerElement.classList.add('modal-choice-button');
                            playerElement.addEventListener('click', () => {
                                if (selectedItem) selectedItem.classList.remove('selected');
                                playerElement.classList.add('selected');
                                selectedItem = playerElement;
                                uiManager.modalButtons.querySelector('.confirm-button').disabled = false;
                            });
                            selectionContainer.appendChild(playerElement);
                        });
                    } else if (modalData.type === 'chooseCardFromHand' || modalData.type === 'chooseCardToDiscard') {
                        const handToChooseFrom = (modalData.sourceUserId === currentUserId) ? gameState.manoJugador1 : gameState.manoJugador2;
                        handToChooseFrom.forEach(card => {
                            const cardElement = uiManager.createCardElement(card);
                            cardElement.addEventListener('click', () => {
                                if (selectedItem) selectedItem.classList.remove('selected');
                                cardElement.classList.add('selected');
                                selectedItem = cardElement;
                                uiManager.modalButtons.querySelector('.confirm-button').disabled = false;
                            });
                            selectionContainer.appendChild(cardElement);
                        });
                    } else if (modalData.type === 'chooseCardFromAllDefinitions') {
                        cardDefinitions.forEach(card => {
                            const cardElement = uiManager.createCardElement(card);
                            cardElement.addEventListener('click', () => {
                                if (selectedItem) selectedItem.classList.remove('selected');
                                cardElement.classList.add('selected');
                                selectedItem = cardElement;
                                uiManager.modalButtons.querySelector('.confirm-button').disabled = false;
                            });
                            selectionContainer.appendChild(cardElement);
                        });
                    } else if (modalData.type === 'confirmAction') {
                        // No hay selección, solo botones de confirmación
                    }

                    const confirmButton = document.createElement('button');
                    confirmButton.textContent = 'Confirmar';
                    confirmButton.classList.add('confirm-button');
                    confirmButton.disabled = (modalData.type !== 'confirmAction'); // Deshabilitar si se requiere selección

                    confirmButton.addEventListener('click', () => {
                        if (modalData.type === 'choosePlayer') {
                            selectedValue = selectedItem ? selectedItem.dataset.playerId : null;
                        } else if (modalData.type === 'chooseCardFromHand' || modalData.type === 'chooseCardToDiscard' || modalData.type === 'chooseCardFromAllDefinitions') {
                            selectedValue = selectedItem ? selectedItem.dataset.cardId : null;
                        } else if (modalData.type === 'confirmAction') {
                            selectedValue = true; // Simplemente confirma la acción
                        }
                        uiManager.resolveModal(selectedValue); // Resuelve la promesa del modal
                    });

                    const buttons = [];
                    if (modalData.type !== 'confirmAction') { // No añadir el botón si es solo confirmación
                        buttons.push({ text: 'Confirmar', onClick: () => confirmButton.click(), class: 'confirm-button', disabled: (modalData.type !== 'confirmAction') });
                    } else {
                        buttons.push({ text: 'Aceptar', onClick: () => confirmButton.click(), class: 'confirm-button' });
                    }


                    await uiManager.displayModal(modalData.title, modalContentDiv, [{ text: 'Confirmar', onClick: () => confirmButton.click(), class: 'confirm-button', disabled: (modalData.type !== 'confirmAction') }]);
                    // La promesa del modal se resuelve cuando se hace click en el botón de confirmar.
                    // El valor `selectedValue` se establece en el event listener del botón.

                    // Una vez que el usuario ha interactuado con el modal, enviar la confirmación a Firestore
                    const roomRef = firebaseService.db.collection('SALAS').doc(currentRoomId);
                    const updatePayload = {};
                    updatePayload[`estadoJuego.modalConfirmations.${modalId}.response`] = selectedValue;
                    updatePayload[`estadoJuego.modalConfirmations.${modalId}.responded`] = true;
                    await roomRef.update(updatePayload);
                    console.log(`DEBUG: Respuesta del modal ${modalId} enviada a Firestore.`);

                } catch (error) {
                    console.error("Error al manejar modal multijugador:", error);
                    // Si el modal se cierra sin selección o hay un error, rechazar la promesa del modal
                    uiManager.rejectModal(error);
                } finally {
                    uiManager.hideModal(); // Ocultar el modal después de la interacción
                }
                return; // Solo manejar un modal a la vez
            }
        }
        // Si no hay modales pendientes para el usuario actual, asegurarse de que el modal esté oculto
        uiManager.hideModal();
    }


    // Función para pasar el turno
    async function passTurn() {
        const currentRoomId = firebaseService.currentRoomId;
        const currentUserId = firebaseService.currentUserId;

        if (!currentRoomId || !currentUserId) {
            uiManager.showError('Error: No estás en una partida activa.');
            return;
        }

        // Obtener el estado más reciente del juego directamente desde Firestore
        const currentRoomDoc = await firebaseService.getRoomData(currentRoomId);
        if (!currentRoomDoc) {
            uiManager.showError('Error: Sala de juego no encontrada al intentar pasar el turno.');
            return;
        }
        const currentGameStateFromDB = currentRoomDoc.estadoJuego;

        if (currentGameStateFromDB.turnoActual !== currentUserId) {
            uiManager.showGameMessage('¡No es tu turno para pasar!');
            return;
        }
        console.log("DEBUG: Pasando turno...");

        let nextTurnPlayerId;
        let updatePayload = {};

        // Si la bandera repeatTurn está activa en el estado actual de Firestore, el turno se queda con el jugador actual
        if (currentGameStateFromDB.repeatTurn) {
            nextTurnPlayerId = currentUserId;
            updatePayload['estadoJuego.repeatTurn'] = false; // Restablecer la bandera en el payload
            uiManager.showGameMessage(`¡Repites tu turno!`);
            console.log("DEBUG: Turno repetido para el jugador actual.");
        } else {
            nextTurnPlayerId = (currentUserId === currentGameStateFromDB.jugador1Id) ? currentGameStateFromDB.jugador2Id : currentGameStateFromDB.jugador1Id; // Por defecto, el turno pasa al rival
            uiManager.showGameMessage(`Has pasado el turno. Turno de ${uiManager.opponentNameDisplay.textContent}.`);
            console.log("DEBUG: Turno pasado al rival.");
        }

        updatePayload['estadoJuego.turnoActual'] = nextTurnPlayerId;

        // Aplicar efectos activos al final del turno
        const ownEffects = (currentUserId === currentGameStateFromDB.jugador1Id) ? currentGameStateFromDB.effectsActivosJugador1 : currentGameStateFromDB.effectsActivosJugador2;
        const updatedEffects = {};
        for (const effectId in ownEffects) {
            const effect = ownEffects[effectId];
            if (effect.duration > 1) {
                updatedEffects[effectId] = { ...effect, duration: effect.duration - 1 };
            }
        }
        if (currentUserId === currentGameStateFromDB.jugador1Id) {
            updatePayload['estadoJuego.effectsActivosJugador1'] = updatedEffects;
        } else {
            updatePayload['estadoJuego.effectsActivosJugador2'] = updatedEffects;
        }


        try {
            await firebaseService.updateGameState(currentRoomId, updatePayload);
            console.log("DEBUG: Turno actualizado en Firestore.");
        } catch (error) {
            console.error("Error al actualizar turno en Firestore:", error);
            uiManager.showError('Error al pasar el turno.');
        }
    }

    // Función para robar cartas, manejando el barajado del descarte
    function drawCard(mazo, pilaDescarte, count = 1) {
        const drawnCards = [];
        for (let i = 0; i < count; i++) {
            if (mazo.length === 0) {
                if (pilaDescarte.length > 0) {
                    mazo.push(...shuffleArray(pilaDescarte));
                    pilaDescarte.length = 0;
                    uiManager.showGameMessage('¡Mazo barajado con el descarte!');
                    console.log("DEBUG: Mazo barajado con descarte.");
                } else {
                    uiManager.showGameMessage('No hay cartas en el mazo ni en la pila de descarte.');
                    console.warn("DEBUG: No hay cartas para robar.");
                    break; // No hay cartas para robar
                }
            }
            if (mazo.length > 0) {
                drawnCards.push(mazo.shift());
            }
        }
        return drawnCards;
    }

    // Función para iniciar la partida
    async function startGame() {
        const currentRoomId = firebaseService.currentRoomId;
        const currentUserId = firebaseService.currentUserId;

        if (!currentRoomId || !currentUserId) {
            uiManager.showError('Error: No estás en una partida activa.');
            return;
        }

        const roomDoc = await firebaseService.getRoomData(currentRoomId);
        if (!roomDoc || roomDoc.estadoJuego.estado !== 'esperando') {
            uiManager.showError('La partida ya ha comenzado o no está en estado de espera.');
            return;
        }

        // Solo el jugador1 inicia la partida para evitar duplicados
        if (currentUserId !== roomDoc.jugador1Id) {
            uiManager.showGameMessage('Solo el jugador que creó la sala puede iniciar la partida.');
            return;
        }

        // Inicializar el mazo completo
        let fullDeck = [];
        cardDefinitions.forEach(cardDef => {
            for (let i = 0; i < cardDef.count; i++) {
                fullDeck.push({ id: cardDef.id, name: cardDef.name, value: cardDef.value, effect: cardDef.effect, image: cardDef.image });
            }
        });
        fullDeck = shuffleArray(fullDeck);

        // Repartir 3 cartas a cada jugador
        const initialHand1 = drawCard(fullDeck, [], 3);
        const initialHand2 = drawCard(fullDeck, [], 3);

        const initialGameState = {
            estado: 'jugando',
            turnoActual: roomDoc.jugador1Id, // El jugador 1 siempre empieza
            posicionJugador1: 0,
            posicionJugador2: 0,
            manoJugador1: initialHand1,
            manoJugador2: initialHand2,
            mazo: fullDeck,
            pilaDescarte: [],
            repeatTurn: false,
            modalConfirmations: {},
            winner: null,
            effectsActivosJugador1: {},
            effectsActivosJugador2: {},
            lastPlayedCard: null,
        };

        try {
            await firebaseService.updateGameState(currentRoomId, { estadoJuego: initialGameState });
            uiManager.showGameMessage('¡La partida ha comenzado!');
            uiManager.showScreen(uiManager.screen3); // Mover a la pantalla de juego
        } catch (error) {
            console.error("Error al iniciar la partida en Firestore:", error);
            uiManager.showError('Error al iniciar la partida.');
        }
    }

    // Función para jugar una carta
    async function playCard() {
        const currentRoomId = firebaseService.currentRoomId;
        const currentUserId = firebaseService.currentUserId;

        if (!currentRoomId || !currentUserId) {
            uiManager.showError('Error: No estás en una partida activa.');
            return;
        }

        const roomDoc = await firebaseService.getRoomData(currentRoomId);
        if (!roomDoc) {
            uiManager.showError('Error: Sala de juego no encontrada al intentar jugar carta.');
            return;
        }
        const currentGameStateFromDB = roomDoc.estadoJuego;

        if (currentGameStateFromDB.turnoActual !== currentUserId) {
            uiManager.showGameMessage('¡No es tu turno para jugar!');
            return;
        }

        const ownHand = (currentUserId === currentGameStateFromDB.jugador1Id) ? currentGameStateFromDB.manoJugador1 : currentGameStateFromDB.manoJugador2;
        if (ownHand.length === 0) {
            uiManager.showGameMessage('No tienes cartas en la mano para jugar.');
            return;
        }

        // Mostrar modal para seleccionar carta
        let selectedCardId = null;
        try {
            selectedCardId = await firebaseService.selectCard(ownHand);
            if (!selectedCardId) {
                uiManager.showGameMessage('No se seleccionó ninguna carta.');
                return;
            }
        } catch (error) {
            console.error("Error al seleccionar carta:", error);
            uiManager.showError('Error al seleccionar carta.');
            return;
        }

        const selectedCardIndex = ownHand.findIndex(card => card.id === selectedCardId);
        if (selectedCardIndex === -1) {
            uiManager.showError('La carta seleccionada no se encontró en tu mano.');
            return;
        }
        const selectedCard = ownHand[selectedCardIndex];

        // Crear una copia mutable del estado del juego para aplicar efectos
        let tempGameState = JSON.parse(JSON.stringify(currentGameStateFromDB));

        // Determinar qué jugador es el actual y cuál es el rival en el estado temporal
        const isPlayer1 = (currentUserId === tempGameState.jugador1Id);
        const playerKey = isPlayer1 ? 'jugador1' : 'jugador2';
        const rivalKey = isPlayer1 ? 'jugador2' : 'jugador1';

        // Actualizar la mano del jugador en el estado temporal
        const playerHandKey = isPlayer1 ? 'manoJugador1' : 'manoJugador2';
        const rivalHandKey = isPlayer1 ? 'manoJugador2' : 'manoJugador1';

        tempGameState[playerHandKey].splice(selectedCardIndex, 1); // Quitar la carta de la mano
        tempGameState.pilaDescarte.push(selectedCard); // Moverla a la pila de descarte
        tempGameState.lastPlayedCard = selectedCard; // Guardar la última carta jugada

        // Preparar el objeto de estado para la función de efecto
        const stateForEffect = {
            ownHand: tempGameState[playerHandKey],
            rivalHand: tempGameState[rivalHandKey],
            ownPos: tempGameState[`posicion${playerKey.charAt(0).toUpperCase() + playerKey.slice(1)}`],
            rivalPos: tempGameState[`posicion${rivalKey.charAt(0).toUpperCase() + rivalKey.slice(1)}`],
            mazo: tempGameState.mazo,
            pilaDescarte: tempGameState.pilaDescarte,
            currentUserId: currentUserId,
            rivalId: (currentUserId === tempGameState.jugador1Id) ? tempGameState.jugador2Id : tempGameState.jugador1Id,
            jugador1Id: tempGameState.jugador1Id,
            jugador2Id: tempGameState.jugador2Id,
            jugador1Nombre: tempGameState.jugador1Nombre,
            jugador2Nombre: tempGameState.jugador2Nombre,
            repeatTurn: tempGameState.repeatTurn,
            effectsActivos: isPlayer1 ? tempGameState.effectsActivosJugador1 : tempGameState.effectsActivosJugador2,
            rivalEffectsActivos: isPlayer1 ? tempGameState.effectsActivosJugador2 : tempGameState.effectsActivosJugador1,
            // Pasar referencias a los servicios para que los efectos puedan interactuar
            firebaseService: firebaseService,
            uiManager: uiManager,
            gameLogic: window.GameLogic, // Permite que los efectos llamen a funciones de GameLogic
            cardDefinitions: cardDefinitions,
        };

        uiManager.showGameMessage(`Has jugado ${selectedCard.name}. Aplicando efecto...`);

        try {
            // Aplicar el efecto de la carta
            await window.applyCardEffect(selectedCard, stateForEffect);

            // Actualizar el estado temporal con los cambios del efecto
            tempGameState[playerHandKey] = stateForEffect.ownHand;
            tempGameState[rivalHandKey] = stateForEffect.rivalHand;
            tempGameState[`posicion${playerKey.charAt(0).toUpperCase() + playerKey.slice(1)}`] = stateForEffect.ownPos;
            tempGameState[`posicion${rivalKey.charAt(0).toUpperCase() + rivalKey.slice(1)}`] = stateForEffect.rivalPos;
            tempGameState.mazo = stateForEffect.mazo;
            tempGameState.pilaDescarte = stateForEffect.pilaDescarte;
            tempGameState.repeatTurn = stateForEffect.repeatTurn;
            if (isPlayer1) {
                tempGameState.effectsActivosJugador1 = stateForEffect.effectsActivos;
                tempGameState.effectsActivosJugador2 = stateForEffect.rivalEffectsActivos;
            } else {
                tempGameState.effectsActivosJugador2 = stateForEffect.effectsActivos;
                tempGameState.effectsActivosJugador1 = stateForEffect.rivalEffectsActivos;
            }

            // Verificar si alguien ganó después de aplicar el efecto
            const winner = checkWinCondition(tempGameState);
            if (winner) {
                tempGameState.estado = 'terminado';
                tempGameState.winner = winner;
                uiManager.showGameMessage(`¡${(winner === tempGameState.jugador1Id ? tempGameState.jugador1Nombre : tempGameState.jugador2Nombre)} ha ganado!`);
            } else {
                // Si no hay repetición de turno, pasar al siguiente jugador
                if (!tempGameState.repeatTurn) {
                    tempGameState.turnoActual = (currentUserId === tempGameState.jugador1Id) ? tempGameState.jugador2Id : tempGameState.jugador1Id;
                    uiManager.showGameMessage(`Turno de ${tempGameState.turnoActual === tempGameState.jugador1Id ? tempGameState.jugador1Nombre : tempGameState.jugador2Nombre}.`);
                } else {
                    uiManager.showGameMessage(`¡Repites tu turno!`);
                    tempGameState.repeatTurn = false; // Resetear la bandera después de aplicar
                }
            }

            // Actualizar el estado del juego en Firestore
            await firebaseService.updateGameState(currentRoomId, { estadoJuego: tempGameState });
            console.log("DEBUG: Estado de juego actualizado en Firestore después de jugar carta.");

        } catch (error) {
            console.error("Error al aplicar efecto de carta:", error);
            uiManager.showError(`Error al jugar carta: ${error.message}`);
        }
    }

    // Función para comprobar la condición de victoria
    function checkWinCondition(state) {
        const winningPosition = 14; // Casilla 14 es la última (0-indexado)
        if (state.posicionJugador1 >= winningPosition) {
            return state.jugador1Id;
        }
        if (state.posicionJugador2 >= winningPosition) {
            return state.jugador2Id;
        }
        return null;
    }

    // Función para reiniciar el juego (volver a la pantalla de inicio)
    async function resetGame() {
        const currentRoomId = firebaseService.currentRoomId;
        if (currentRoomId) {
            try {
                // Eliminar la sala de Firestore
                await firebaseService.db.collection('SALAS').doc(currentRoomId).delete();
                console.log("DEBUG: Sala eliminada de Firestore.");
            } catch (error) {
                console.error("Error al eliminar la sala:", error);
                uiManager.showError("Error al reiniciar el juego: No se pudo eliminar la sala.");
            }
        }
        // Resetear variables locales de estado
        gameState = {
            jugador1Id: '',
            jugador2Id: '',
            jugador1Nombre: '',
            jugador2Nombre: '',
            estado: 'esperando',
            turnoActual: '',
            posicionJugador1: 0,
            posicionJugador2: 0,
            manoJugador1: [],
            manoJugador2: [],
            mazo: [],
            pilaDescarte: [],
            repeatTurn: false,
            modalConfirmations: {},
            winner: null,
            effectsActivosJugador1: {},
            effectsActivosJugador2: {},
            lastPlayedCard: null,
        };
        firebaseService.resetRoomState(); // Resetear estado en FirebaseService
        uiManager.showScreen(uiManager.screen1);
        uiManager.showGameMessage('Juego reiniciado. ¡Bienvenido de nuevo!');
    }

    // Función para solicitar revancha
    async function requestRematch() {
        const currentRoomId = firebaseService.currentRoomId;
        const currentUserId = firebaseService.currentUserId;

        if (!currentRoomId || !currentUserId) {
            uiManager.showError('Error: No estás en una partida activa.');
            return;
        }

        const roomDoc = await firebaseService.getRoomData(currentRoomId);
        if (!roomDoc) {
            uiManager.showError('Error: Sala no encontrada para revancha.');
            return;
        }

        const isPlayer1 = currentUserId === roomDoc.jugador1Id;
        const rematchRequestedKey = isPlayer1 ? 'rematchRequested1' : 'rematchRequested2';
        const otherPlayerRematchKey = isPlayer1 ? 'rematchRequested2' : 'rematchRequested1';

        // Actualizar el estado de solicitud de revancha en Firestore
        const updatePayload = {};
        updatePayload[`estadoJuego.${rematchRequestedKey}`] = true;

        try {
            await firebaseService.updateGameState(currentRoomId, updatePayload);
            uiManager.showGameMessage('Solicitud de revancha enviada. Esperando al rival...');

            // Comprobar si ambos jugadores han solicitado revancha
            const updatedRoomDoc = await firebaseService.getRoomData(currentRoomId);
            if (updatedRoomDoc.estadoJuego[rematchRequestedKey] && updatedRoomDoc.estadoJuego[otherPlayerRematchKey]) {
                // Ambos han solicitado revancha, reiniciar el juego
                await resetGameForRematch(currentRoomId, updatedRoomDoc.jugador1Id, updatedRoomDoc.jugador2Id);
                uiManager.showGameMessage('¡Revancha aceptada! La partida ha comenzado de nuevo.');
            }
        } catch (error) {
            console.error("Error al solicitar revancha:", error);
            uiManager.showError("Error al solicitar revancha.");
        }
    }

    // Función para reiniciar el juego para una revancha
    async function resetGameForRematch(roomId, player1Id, player2Id) {
        // Inicializar el mazo completo
        let fullDeck = [];
        cardDefinitions.forEach(cardDef => {
            for (let i = 0; i < cardDef.count; i++) {
                fullDeck.push({ id: cardDef.id, name: cardDef.name, value: cardDef.value, effect: cardDef.effect, image: cardDef.image });
            }
        });
        fullDeck = shuffleArray(fullDeck);

        // Repartir 3 cartas a cada jugador
        const initialHand1 = drawCard(fullDeck, [], 3);
        const initialHand2 = drawCard(fullDeck, [], 3);

        const newGameState = {
            estado: 'jugando',
            turnoActual: player1Id, // El jugador 1 siempre empieza en la revancha
            posicionJugador1: 0,
            posicionJugador2: 0,
            manoJugador1: initialHand1,
            manoJugador2: initialHand2,
            mazo: fullDeck,
            pilaDescarte: [],
            repeatTurn: false,
            modalConfirmations: {},
            winner: null,
            effectsActivosJugador1: {},
            effectsActivosJugador2: {},
            lastPlayedCard: null,
            rematchRequested1: false, // Resetear solicitudes de revancha
            rematchRequested2: false,
        };

        try {
            await firebaseService.updateGameState(roomId, { estadoJuego: newGameState });
            uiManager.showScreen(uiManager.screen3); // Volver a la pantalla de juego
        } catch (error) {
            console.error("Error al reiniciar el juego para revancha:", error);
            uiManager.showError('Error al reiniciar la partida para revancha.');
        }
    }


    // Exponer las propiedades y métodos públicos del GameLogic
    return {
        init: init,
        gameState: gameState, // Exponer el estado para que otros módulos lo lean (no lo modifiquen directamente)
        updateGameStateAndUI: updateGameStateAndUI, // Llamado por FirebaseService
        passTurn: passTurn,
        drawCard: drawCard,
        startGame: startGame,
        playCard: playCard,
        resetGame: resetGame,
        requestRematch: requestRematch,
        // awaitMultiPlayerModalConfirmation ya no es necesario aquí directamente, se maneja en FirebaseService
    };
})();
