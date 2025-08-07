
// Función para pasar el turno
async function passTurn() {
    console.log("--- INICIANDO passTurn ---");
    const roomRef = db.collection('SALAS').doc(currentRoomId);

    const currentRoomDoc = await roomRef.get();
    if (!currentRoomDoc.exists) {
        console.error("DEBUG: Sala no encontrada al intentar pasar el turno.");
        return;
    }
    const currentGameState = currentRoomDoc.data().estadoJuego;

    if (currentGameState.turnoActual !== currentUserId) {
        gameMessageDiv.textContent = '¡No es tu turno para pasar!';
        console.log("passTurn: Bloqueado, no es el turno del jugador.");
        return;
    }
    console.log(`passTurn: Es el turno de ${currentUserId}. Procediendo.`);

    const nextTurnPlayerId = currentRivalId;
    let updatePayload = {};

    // --- DEPURACIÓN DEL GUARDAESPALDAS ---
    console.log("passTurn: Revisando efectos activos...", currentGameState.efectosActivos);
    const updatedEffects = { ...currentGameState.efectosActivos };

    // Comprobamos si el jugador que está pasando el turno (currentUserId) tiene el efecto.
    if (updatedEffects[currentUserId] && updatedEffects[currentUserId].guardaespaldas) {
        console.log(`passTurn: ¡EFECTO GUARDAESPALDAS ENCONTRADO para ${currentUserId}!`);
        console.log(`passTurn: Turnos restantes (antes): ${updatedEffects[currentUserId].turnosRestantes}`);

        updatedEffects[currentUserId].turnosRestantes--;

        console.log(`passTurn: Turnos restantes (después): ${updatedEffects[currentUserId].turnosRestantes}`);

        if (updatedEffects[currentUserId].turnosRestantes <= 0) {
            console.log("passTurn: Turnos restantes es 0 o menos. ELIMINANDO EFECTO.");
            delete updatedEffects[currentUserId];
            gameMessageDiv.textContent += ' El efecto Guardaespaldas ha terminado.';
        } else {
            console.log("passTurn: El efecto todavía tiene turnos restantes.");
        }
    } else {
        console.log(`passTurn: No se encontró efecto Guardaespaldas para el jugador actual (${currentUserId}).`);
    }

    const newDrawStatus = { ...currentGameState.drawStatus };
    newDrawStatus[nextTurnPlayerId] = false;

    updatePayload = {
        'estadoJuego.turnoActual': nextTurnPlayerId,
        'estadoJuego.efectosActivos': updatedEffects, // Se enviarán los efectos actualizados
        'estadoJuego.drawStatus': newDrawStatus
    };
    
    console.log("passTurn: Payload final que se enviará a Firestore:", updatePayload);
    await roomRef.update(updatePayload);
    console.log("--- FIN passTurn ---");
}

// Función para reiniciar el estado del juego
async function resetGame(roomRef, roomData) {
    console.log("DEBUG: Reiniciando el juego...");
    const initialDeck = generateInitialDeck();
    const shuffledDeck = shuffleArray(initialDeck);
    const newHand1 = shuffledDeck.splice(0, 3);
    const newHand2 = shuffledDeck.splice(0, 3);

    const player1Id = roomData.jugador1Id;
    const player2Id = roomData.jugador2Id;

    const updatedGameState = {
        mazo: shuffledDeck,
        pilaDescarte: [],
        manoJugador1: newHand1,
        manoJugador2: newHand2,
        posicionJugador1: 0,
        posicionJugador2: 0,
        ultimaCartaJugada: null,
        turnoActual: Math.random() < 0.5 ? player1Id : player2Id, // Turno aleatorio
        gameStatus: "inProgress",
        ganador: null,
        efectosActivos: {},
        drawStatus: {
            [player1Id]: false,
            [player2Id]: false
        },
        rematchStatus: {
            [player1Id]: false,
            [player2Id]: false
        },
        modalConfirmations: {}, // Initialize modal confirmations
        repeatTurn: false // Nueva propiedad para controlar la repetición de turno
    };

    try {
        await roomRef.update({ estadoJuego: updatedGameState });
        console.log("DEBUG: Juego reiniciado en Firestore. Transicionando a screen3.");
        showScreen(screen3); // Volver a la pantalla de juego
        gameMessageDiv.textContent = '¡Partida reiniciada! ¡A jugar de nuevo!';
    } catch (error) {
        console.error("Error al reiniciar el juego en Firestore:", error);
        gameMessageDiv.textContent = "Error al reiniciar la partida. Inténtalo de nuevo.";
    }
}

// Global variable to hold the unsubscribe function for the modal listener
let unsubscribeModalConfirmation = null;

// Function to await confirmation from both players for a modal
async function awaitMultiPlayerModalConfirmation(modalId) {
    return new Promise(resolve => {
        const roomRef = db.collection('SALAS').doc(currentRoomId);

        // Clear any previous modal listener
        if (unsubscribeModalConfirmation) {
            unsubscribeModalConfirmation();
            unsubscribeModalConfirmation = null;
        }

        unsubscribeModalConfirmation = roomRef.onSnapshot(async docSnapshot => {
            if (docSnapshot.exists) {
                const roomData = docSnapshot.data();
                const modalConfirmations = roomData.estadoJuego.modalConfirmations || {};
                const modalState = modalConfirmations[modalId];

                if (modalState && modalState[roomData.jugador1Id] && modalState[roomData.jugador2Id]) {
                    // Both players have confirmed
                    if (unsubscribeModalConfirmation) {
                        unsubscribeModalConfirmation();
                        unsubscribeModalConfirmation = null;
                    }
                    // Delete the modal entry from Firestore after both players have confirmed
                    // This will trigger listenToRoomChanges for both players, leading to hideModal() being called if no other modal is active.
                    const updatePayload = {};
                    updatePayload[`estadoJuego.modalConfirmations.${modalId}`] = firebase.firestore.FieldValue.delete();
                    try {
                        await roomRef.update(updatePayload);
                        console.log(`DEBUG: Modal ${modalId} entry removed from Firestore.`);
                    } catch (error) {
                        console.error(`Error deleting modal ${modalId} from Firestore:`, error);
                    }
                    resolve(); // Resolve the promise
                }
            } else {
                // Room disappeared, resolve and hide modal
                if (unsubscribeModalConfirmation) {
                    unsubscribeModalConfirmation();
                    unsubscribeModalConfirmation = null;
                }
                hideModal(); // Hide in case room is deleted
                resolve();
            }
        }, error => {
            console.error("Error listening to modal confirmations:", error);
            if (unsubscribeModalConfirmation) {
                unsubscribeModalConfirmation();
                unsubscribeModalConfirmation = null;
            }
            hideModal(); // Hide on error
            resolve(); // Resolve even on error to unblock game
        });
    });
}
