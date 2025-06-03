// Este archivo ahora actúa como el FirebaseService (Servicio de Firebase)
// Encapsula toda la lógica de autenticación y gestión de salas en Firestore.

window.FirebaseService = (function() {
    let auth = null;
    let db = null;
    let currentUserId = '';
    let currentRivalId = '';
    let currentRoomId = '';
    let unsubscribeSnapshot = null; // Para desuscribirse de los listeners de Firestore

    let uiManagerInstance = null; // Referencia al UIManager
    let gameLogicInstance = null; // Referencia al GameLogic

    function init(firebaseAuth, firestoreDb) {
        auth = firebaseAuth;
        db = firestoreDb;
    }

    // Función para establecer las referencias a otros módulos
    function setModuleInstances(uiMan, gameLog) {
        uiManagerInstance = uiMan;
        gameLogicInstance = gameLog;
    }

    // Función para iniciar sesión anónimamente y obtener el UID
    async function signInAnonymouslyAndGetUid() {
        try {
            const userCredential = await auth.signInAnonymously();
            currentUserId = userCredential.user.uid;
            console.log('Autenticado anónimamente con UID:', currentUserId);
        } catch (error) {
            console.error('Error al autenticar anónimamente:', error);
            throw new Error('Error de autenticación. Por favor, recarga la página.');
        }
    }

    // Función para buscar o crear una sala
    async function findOrCreateRoom(player1Name, player2Name) {
        try {
            const roomsRef = db.collection('SALAS');
            // Buscar salas donde los nombres de los jugadores coincidan en cualquier orden
            const query1 = roomsRef.where('jugador1Nombre', '==', player1Name)
                                  .where('jugador2Nombre', '==', player2Name);
            const query2 = roomsRef.where('jugador1Nombre', '==', player2Name)
                                  .where('jugador2Nombre', '==', player1Name);

            const [snapshot1, snapshot2] = await Promise.all([query1.get(), query2.get()]);

            let roomDoc = null;

            if (!snapshot1.empty) {
                roomDoc = snapshot1.docs[0];
            } else if (!snapshot2.empty) {
                roomDoc = snapshot2.docs[0];
            }

            if (roomDoc) {
                // Sala existente encontrada
                currentRoomId = roomDoc.id;
                const roomData = roomDoc.data();
                const isPlayer1 = (currentUserId === roomData.jugador1Id);

                // Si la sala está en estado 'jugando' o 'terminado', y el usuario actual no es uno de los jugadores,
                // o si el otro jugador ya está conectado, no permitir unirse.
                if (roomData.estadoJuego.estado !== 'esperando' &&
                    roomData.jugador1Id !== currentUserId && roomData.jugador2Id !== currentUserId) {
                    throw new Error('La partida ya está en curso o terminada con otros jugadores.');
                }

                // Si el jugador 2 no está asignado, asignarlo
                if (!roomData.jugador2Id && roomData.jugador1Id !== currentUserId) {
                    await roomsRef.doc(currentRoomId).update({
                        jugador2Id: currentUserId,
                        jugador2Nombre: player1Name, // Tu nombre es el rival en este caso
                        'estadoJuego.estado': 'esperando' // Asegurar estado de espera si se une el segundo
                    });
                    currentRivalId = roomData.jugador1Id;
                    uiManagerInstance.showGameMessage(`Te has unido a la sala de ${roomData.jugador1Nombre}.`);
                } else if (roomData.jugador1Id === currentUserId) {
                    // Si ya eres el jugador 1, simplemente reconéctate
                    currentRivalId = roomData.jugador2Id;
                    uiManagerInstance.showGameMessage(`Reconectado a tu sala con ${roomData.jugador2Nombre || 'esperando rival'}.`);
                } else if (roomData.jugador2Id === currentUserId) {
                    // Si ya eres el jugador 2, simplemente reconéctate
                    currentRivalId = roomData.jugador1Id;
                    uiManagerInstance.showGameMessage(`Reconectado a tu sala con ${roomData.jugador1Nombre}.`);
                } else {
                    // Caso donde la sala existe pero ambos jugadores ya están asignados y no eres ninguno
                    throw new Error('La sala ya está ocupada por otros jugadores.');
                }

                uiManagerInstance.showScreen(uiManagerInstance.screen2);
                uiManagerInstance.playerNameInputScreen2.textContent = isPlayer1 ? roomData.jugador1Nombre : player1Name;
                uiManagerInstance.rivalNameInputScreen2.textContent = isPlayer1 ? (roomData.jugador2Nombre || 'Esperando...') : roomData.jugador1Nombre;
                uiManagerInstance.roomIdDisplay.textContent = currentRoomId;

                // Si ya hay dos jugadores, mostrar botón de inicio
                if (roomData.jugador1Id && roomData.jugador2Id) {
                    uiManagerInstance.waitingMessage.textContent = '¡Rival encontrado! Puedes empezar la partida.';
                    uiManagerInstance.btnStartGame.style.display = 'block';
                } else {
                    uiManagerInstance.waitingMessage.textContent = 'Esperando a que el rival se conecte...';
                    uiManagerInstance.btnStartGame.style.display = 'none';
                }

            } else {
                // No se encontró sala, crear una nueva
                const newRoomRef = await roomsRef.add({
                    jugador1Id: currentUserId,
                    jugador1Nombre: player1Name,
                    jugador2Id: null, // Esperando al segundo jugador
                    jugador2Nombre: player2Name, // Nombre del rival deseado
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    estadoJuego: {
                        estado: 'esperando',
                        turnoActual: null,
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
                        rematchRequested1: false,
                        rematchRequested2: false,
                    }
                });
                currentRoomId = newRoomRef.id;
                currentRivalId = null; // Aún no hay rival conectado

                uiManagerInstance.showScreen(uiManagerInstance.screen2);
                uiManagerInstance.playerNameInputScreen2.textContent = player1Name;
                uiManagerInstance.rivalNameInputScreen2.textContent = player2Name;
                uiManagerInstance.roomIdDisplay.textContent = currentRoomId;
                uiManagerInstance.waitingMessage.textContent = 'Esperando a que el rival se conecte...';
                uiManagerInstance.btnStartGame.style.display = 'none'; // Deshabilitar hasta que se una el rival
                uiManagerInstance.showGameMessage('Sala creada. Comparte el ID con tu rival.');
            }

            // Iniciar el listener de cambios en la sala
            listenToRoomChanges();

        } catch (error) {
            console.error('Error al buscar o crear sala:', error);
            uiManagerInstance.showError(`Error al buscar o crear sala: ${error.message}`);
            throw error;
        }
    }

    // Listener de cambios en la sala de Firestore
    function listenToRoomChanges() {
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot(); // Desuscribirse del listener anterior si existe
        }

        if (!currentRoomId) {
            console.warn("DEBUG: No hay currentRoomId para escuchar cambios.");
            return;
        }

        const roomRef = db.collection('SALAS').doc(currentRoomId);
        unsubscribeSnapshot = roomRef.onSnapshot(docSnapshot => {
            if (docSnapshot.exists) {
                const roomData = docSnapshot.data();
                console.log("DEBUG: Cambios en la sala detectados:", roomData);

                // Actualizar IDs de jugadores si es necesario (cuando el segundo jugador se une)
                if (roomData.jugador1Id === currentUserId) {
                    currentRivalId = roomData.jugador2Id;
                } else if (roomData.jugador2Id === currentUserId) {
                    currentRivalId = roomData.jugador1Id;
                }

                // Actualizar UI de sala de espera
                if (uiManagerInstance.screen2.classList.contains('active')) {
                    uiManagerInstance.playerNameInputScreen2.textContent = (roomData.jugador1Id === currentUserId) ? roomData.jugador1Nombre : roomData.jugador2Nombre;
                    uiManagerInstance.rivalNameInputScreen2.textContent = (roomData.jugador1Id === currentUserId) ? (roomData.jugador2Nombre || 'Esperando...') : roomData.jugador1Nombre;
                    uiManagerInstance.roomIdDisplay.textContent = currentRoomId;

                    if (roomData.jugador1Id && roomData.jugador2Id) {
                        uiManagerInstance.waitingMessage.textContent = '¡Rival encontrado! Puedes empezar la partida.';
                        uiManagerInstance.btnStartGame.style.display = 'block';
                    } else {
                        uiManagerInstance.waitingMessage.textContent = 'Esperando a que el rival se conecte...';
                        uiManagerInstance.btnStartGame.style.display = 'none';
                    }
                }

                // Si el estado del juego cambia a 'jugando', ir a la pantalla de juego
                if (roomData.estadoJuego.estado === 'jugando' || roomData.estadoJuego.estado === 'terminado') {
                    uiManagerInstance.showScreen(uiManagerInstance.screen3);
                }

                // Notificar a GameLogic sobre los cambios en el estado del juego
                gameLogicInstance.updateGameStateAndUI(roomData);

            } else {
                // La sala ha sido eliminada
                console.log("DEBUG: La sala no existe. Desuscribiendo listener.");
                if (unsubscribeSnapshot) {
                    unsubscribeSnapshot();
                    unsubscribeSnapshot = null;
                }
                // Si la sala desaparece, volver a la pantalla de inicio
                uiManagerInstance.showGameMessage('La partida ha sido cancelada o terminada por el rival.');
                uiManagerInstance.showScreen(uiManagerInstance.screen1);
                resetRoomState(); // Limpiar el estado local de la sala
            }
        }, error => {
            console.error("Error al escuchar cambios en la sala:", error);
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot();
                unsubscribeSnapshot = null;
            }
            uiManagerInstance.showError('Error de conexión con la partida. Por favor, recarga.');
        });
    }

    // Función para obtener los datos de la sala una vez
    async function getRoomData(roomId) {
        try {
            const doc = await db.collection('SALAS').doc(roomId).get();
            return doc.exists ? doc.data() : null;
        } catch (error) {
            console.error("Error al obtener datos de la sala:", error);
            throw error;
        }
    }

    // Función para actualizar el estado del juego en Firestore
    async function updateGameState(roomId, updates) {
        try {
            await db.collection('SALAS').doc(roomId).update(updates);
            console.log("DEBUG: Estado de juego actualizado en Firestore.");
        } catch (error) {
            console.error("Error al actualizar estado de juego en Firestore:", error);
            throw error;
        }
    }

    // Función para cancelar la partida (eliminar la sala)
    async function cancelGame() {
        if (currentRoomId) {
            try {
                await db.collection('SALAS').doc(currentRoomId).delete();
                console.log("DEBUG: Sala eliminada de Firestore por cancelación.");
                resetRoomState();
            } catch (error) {
                console.error("Error al cancelar la partida:", error);
                throw error;
            }
        }
    }

    // Función para resetear el estado local de la sala
    function resetRoomState() {
        if (unsubscribeSnapshot) {
            unsubscribeSnapshot();
            unsubscribeSnapshot = null;
        }
        currentUserId = '';
        currentRivalId = '';
        currentRoomId = '';
    }

    // --- Funciones para interacciones con el usuario a través de modales (multijugador) ---

    // Genera un ID único para el modal de confirmación
    function generateModalId() {
        return 'modal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Espera una confirmación de un modal multijugador
    async function awaitMultiPlayerModalConfirmation(modalId) {
        const roomRef = db.collection('SALAS').doc(currentRoomId);

        return new Promise((resolve, reject) => {
            let unsubscribeModalConfirmation = roomRef.onSnapshot(docSnapshot => {
                if (docSnapshot.exists) {
                    const roomData = docSnapshot.data();
                    const modalData = roomData.estadoJuego.modalConfirmations[modalId];

                    if (modalData && modalData.responded) {
                        console.log(`DEBUG: Modal ${modalId} respondido:`, modalData.response);
                        if (unsubscribeModalConfirmation) {
                            unsubscribeModalConfirmation();
                            unsubscribeModalConfirmation = null;
                        }
                        // Eliminar la entrada del modal de Firestore una vez respondido
                        const updatePayload = {};
                        updatePayload[`estadoJuego.modalConfirmations.${modalId}`] = firebase.firestore.FieldValue.delete();
                        roomRef.update(updatePayload)
                            .then(() => console.log(`DEBUG: Modal ${modalId} entry removed from Firestore.`))
                            .catch(error => console.error(`Error deleting modal ${modalId} from Firestore:`, error));

                        resolve(modalData.response);
                    }
                } else {
                    // Room disappeared, resolve and hide modal
                    console.warn("DEBUG: Sala desaparecida mientras esperaba confirmación de modal.");
                    if (unsubscribeModalConfirmation) {
                        unsubscribeModalConfirmation();
                        unsubscribeModalConfirmation = null;
                    }
                    uiManagerInstance.hideModal(); // Hide in case room is deleted
                    reject(new Error("La sala de juego ha desaparecido."));
                }
            }, error => {
                console.error("Error listening to modal confirmations:", error);
                if (unsubscribeModalConfirmation) {
                    unsubscribeModalConfirmation();
                    unsubscribeModalConfirmation = null;
                }
                uiManagerInstance.hideModal(); // Hide on error
                reject(error);
            });
        });
    }

    // Función genérica para solicitar una acción a un jugador (local o remoto)
    async function requestPlayerAction(targetUserId, sourceUserId, type, prompt, data = {}) {
        const modalId = generateModalId();
        const roomRef = db.collection('SALAS').doc(currentRoomId);

        const modalPayload = {
            targetUserId: targetUserId,
            sourceUserId: sourceUserId, // Quién solicita la acción
            type: type, // 'choosePlayer', 'chooseCardFromHand', 'chooseCardToDiscard', 'confirmAction', 'chooseCardFromAllDefinitions', 'chooseNumberOfCardsToDiscard', 'requestPlayerDiscardCard'
            prompt: prompt,
            data: data, // Datos adicionales como la mano del jugador, etc.
            responded: false,
            response: null
        };

        try {
            await roomRef.update({
                [`estadoJuego.modalConfirmations.${modalId}`]: modalPayload
            });
            console.log(`DEBUG: Solicitud de modal ${modalId} enviada a Firestore para ${targetUserId}.`);

            // Esperar la respuesta del modal
            const response = await awaitMultiPlayerModalConfirmation(modalId);
            return response;

        } catch (error) {
            console.error(`Error al solicitar acción de jugador (${type}):`, error);
            throw error;
        }
    }

    // Funciones específicas de interacción que usan requestPlayerAction
    async function choosePlayer(currentUserId, rivalId, jugador1Id, jugador2Id, jugador1Nombre, jugador2Nombre) {
        const players = [
            { id: jugador1Id, name: jugador1Nombre },
            { id: jugador2Id, name: jugador2Nombre }
        ].filter(p => p.id !== currentUserId); // No puedes elegirte a ti mismo

        const prompt = 'Elige un jugador:';
        const data = { players: players };

        return await requestPlayerAction(currentUserId, currentUserId, 'choosePlayer', prompt, data);
    }

    async function chooseCardsToDiscard(hand, count, prompt) {
        const data = { hand: hand, count: count };
        return await requestPlayerAction(currentUserId, currentUserId, 'chooseCardToDiscard', prompt, data);
    }

    async function chooseCardFromAllDefinitions(cards, prompt, showFaceUp = false) {
        const data = { cards: cards, showFaceUp: showFaceUp };
        return await requestPlayerAction(currentUserId, currentUserId, 'chooseCardFromAllDefinitions', prompt, data);
    }

    async function confirmAction(targetUserId, sourceUserId, prompt) {
        return await requestPlayerAction(targetUserId, sourceUserId, 'confirmAction', prompt);
    }

    async function chooseNumberOfCardsToDiscard(targetUserId, maxCards, maxSelection) {
        const prompt = `Elige cuántas cartas quieres descartar (máximo ${maxSelection}):`;
        const data = { maxCards: maxCards, maxSelection: maxSelection };
        return await requestPlayerAction(targetUserId, currentUserId, 'chooseNumberOfCardsToDiscard', prompt, data);
    }

    async function requestPlayerDiscardCard(targetUserId, sourceUserId, hand) {
        const prompt = 'Elige una carta para descartar:';
        const data = { hand: hand };
        return await requestPlayerAction(targetUserId, sourceUserId, 'chooseCardToDiscard', prompt, data);
    }

    async function selectCard(hand) {
        const prompt = 'Elige una carta de tu mano para jugar:';
        const data = { hand: hand };
        return await requestPlayerAction(currentUserId, currentUserId, 'selectCard', prompt, data);
    }


    // Exponer las propiedades y métodos públicos del FirebaseService
    return {
        init: init,
        setModuleInstances: setModuleInstances,
        signInAnonymouslyAndGetUid: signInAnonymouslyAndGetUid,
        findOrCreateRoom: findOrCreateRoom,
        listenToRoomChanges: listenToRoomChanges,
        getRoomData: getRoomData,
        updateGameState: updateGameState,
        cancelGame: cancelGame,
        resetRoomState: resetRoomState,
        currentUserId: currentUserId, // Exponer para GameLogic
        currentRivalId: currentRivalId, // Exponer para GameLogic
        currentRoomId: currentRoomId, // Exponer para GameLogic
        db: db, // Exponer la instancia de Firestore si es necesaria para operaciones directas (ej. eliminar sala)

        // Funciones de interacción con el usuario (modales multijugador)
        choosePlayer: choosePlayer,
        chooseCardsToDiscard: chooseCardsToDiscard,
        chooseCardFromAllDefinitions: chooseCardFromAllDefinitions,
        confirmAction: confirmAction,
        chooseNumberOfCardsToDiscard: chooseNumberOfCardsToDiscard,
        requestPlayerDiscardCard: requestPlayerDiscardCard,
        selectCard: selectCard,
    };
})();
