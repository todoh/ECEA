       // --- Lógica de Firebase y Partida ---

        // Función para iniciar sesión anónimamente y obtener el UID
        async function signInAnonymouslyAndGetUid() {
            try {
                const userCredential = await auth.signInAnonymously();
                currentUserId = userCredential.user.uid;
                console.log('Autenticado anónimamente con UID:', currentUserId);
            } catch (error) {
                console.error('Error al autenticar anónimamente:', error);
                gameMessageDiv.textContent = 'Error de autenticación. Por favor, recarga la página.';
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
                    // Sala existente, unirse a ella
                    currentRoomId = roomDoc.id;
                    const roomData = roomDoc.data();
                    const roomRef = db.collection('SALAS').doc(currentRoomId);

                    // Determinar si el jugador actual es el jugador1 o jugador2 en la sala existente
                    if (roomData.jugador1Nombre === currentPlayerName && roomData.jugador1Id === null) {
                        // Si el jugador 1 de la sala no tiene ID, asignárselo (caso de reconexión o error previo)
                        await roomRef.update({
                            jugador1Id: currentUserId,
                            'estadoJuego.gameStatus': roomData.jugador2Id ? 'inProgress' : 'waitingForPlayer',
                            [`estadoJuego.drawStatus.${currentUserId}`]: false, // Initialize draw status for player1 if rejoining
                            [`estadoJuego.rematchStatus.${currentUserId}`]: false // Initialize rematch status for player1
                        });
                        gameMessageDiv.textContent = 'Te has reconectado como Jugador 1.';
                        currentRivalId = roomData.jugador2Id;
                    } else if (roomData.jugador2Nombre === currentPlayerName && roomData.jugador2Id === null) {
                        // Si el jugador 2 de la sala no tiene ID, asignárselo (caso de reconexión o error previo)
                        await roomRef.update({
                            jugador2Id: currentUserId,
                            'estadoJuego.gameStatus': 'inProgress',
                            'estadoJuego.turnoActual': Math.random() < 0.5 ? roomData.jugador1Id : currentUserId,
                            [`estadoJuego.drawStatus.${currentUserId}`]: false, // Initialize draw status for player2
                            [`estadoJuego.rematchStatus.${currentUserId}`]: false // Initialize rematch status for player2
                        });
                        gameMessageDiv.textContent = '¡Te has unido a la partida!';
                        currentRivalId = roomData.jugador1Id;
                    } else if (roomData.jugador1Id === currentUserId || roomData.jugador2Id === currentUserId) {
                        // El jugador ya está en la sala y tiene su ID asignado
                        gameMessageDiv.textContent = 'Reconectando a la partida existente.';
                        if (roomData.jugador1Id === currentUserId) {
                            currentRivalId = roomData.jugador2Id;
                        } else {
                            currentRivalId = roomData.jugador1Id;
                        }
                        // Ensure drawStatus and rematchStatus exist for rejoining player if not already
                        if (!roomData.estadoJuego.drawStatus || roomData.estadoJuego.drawStatus[currentUserId] === undefined) {
                            await roomRef.update({
                                [`estadoJuego.drawStatus.${currentUserId}`]: false
                            });
                        }
                        if (!roomData.estadoJuego.rematchStatus || roomData.estadoJuego.rematchStatus[currentUserId] === undefined) {
                            await roomRef.update({
                                [`estadoJuego.rematchStatus.${currentUserId}`]: false
                            });
                        }
                    } else {
                        // La sala existe pero no es para este jugador o ya está llena
                        console.error('Error: Intentando unirse a una sala que ya está llena o no te corresponde.');
                        rivalErrorScreen1.textContent = 'La sala ya está completa o no te corresponde. Intenta con otro nombre de rival.';
                        return; // Evitar mostrar screen3
                    }
                    
                    // Ensure modalConfirmations exists
                    if (!roomData.estadoJuego.modalConfirmations) {
                        await roomRef.update({
                            'estadoJuego.modalConfirmations': {}
                        });
                    }

                    listenToRoomChanges(currentRoomId);
                    showScreen(screen3);
                } else {
                    // No existe sala, crear una nueva
                    console.log("No existing room found, creating a new one.");
                    const initialDeck = generateInitialDeck();
                    const shuffledDeck = shuffleArray(initialDeck);
                    const initialHand1 = shuffledDeck.splice(0, 3);
                    const initialHand2 = shuffledDeck.splice(0, 3); // Mano inicial para el jugador 2 (vacía si no se unió)

                    const newRoomRef = await roomsRef.add({
                        jugador1Id: currentUserId,
                        jugador1Nombre: player1Name,
                        jugador2Id: null, // Inicialmente nulo
                        jugador2Nombre: player2Name, // Guardar el nombre del rival esperado
                        estadoJuego: {
                            mazo: shuffledDeck,
                            pilaDescarte: [],
                            manoJugador1: initialHand1,
                            manoJugador2: initialHand2,
                            posicionJugador1: 0,
                            posicionJugador2: 0,
                            ultimaCartaJugada: null,
                            turnoActual: null, // Se asignará cuando el segundo jugador se una
                            gameStatus: "waitingForPlayer",
                            ganador: null,
                            efectosActivos: {},
                            drawStatus: { [currentUserId]: false }, // Inicializar drawStatus para el jugador 1
                            rematchStatus: { [currentUserId]: false }, // Inicializar rematch status para el jugador 1
                            modalConfirmations: {} // Initialize modal confirmations
                        }
                    });
                    currentRoomId = newRoomRef.id;
                    console.log('Sala creada:', currentRoomId);
                    gameMessageDiv.textContent = 'Esperando al rival... (ID de sala: ' + currentRoomId + ')'; // Mostrar ID para depuración
                    listenToRoomChanges(currentRoomId);
                    showScreen(screen3);
                }
            } catch (error) {
                console.error('Error al buscar/crear sala:', error);
                rivalErrorScreen1.textContent = 'Error al conectar. Inténtalo de nuevo.';
            }
        }

        // Función para escuchar cambios en la sala de Firestore
        function listenToRoomChanges(roomId) {
            if (unsubscribeSnapshot) {
                unsubscribeSnapshot(); // Desuscribirse del listener anterior si existe
            }
            const roomRef = db.collection('SALAS').doc(roomId);
            unsubscribeSnapshot = roomRef.onSnapshot(docSnapshot => {
                if (docSnapshot.exists) {
                    const roomData = docSnapshot.data();
                    console.log('Estado de la sala actualizado (onSnapshot):', roomData);
                    console.log('currentUserId (desde onSnapshot):', currentUserId);

                    // Determinar currentRivalId y nombres de forma robusta
                    if (roomData.jugador1Id === currentUserId) {
                        currentRivalId = roomData.jugador2Id;
                        currentPlayerName = roomData.jugador1Nombre;
                        rivalPlayerName = roomData.jugador2Nombre;
                    } else if (roomData.jugador2Id === currentUserId) {
                        currentRivalId = roomData.jugador1Id;
                        currentPlayerName = roomData.jugador2Nombre;
                        rivalPlayerName = roomData.jugador1Nombre;
                    } else {
                        currentRivalId = null;
                        console.error("Error: currentUserId no coincide con ningún jugador en la sala. Esto no debería ocurrir si el jugador está en una sala activa.");
                        // Forzar a volver a la pantalla de inicio si el estado es inconsistente
                        gameMessageDiv.textContent = 'Error en la conexión. Volviendo a la pantalla de inicio.';
                        showScreen(screen1);
                        return;
                    }

                    // Actualizar la UI con los últimos datos de la sala
                    updateGameUI(roomData, roomRef);

                    // Lógica para transiciones de estado del juego y mensajes
                    if (roomData.estadoJuego.gameStatus === "waitingForPlayer") {
                        gameMessageDiv.textContent = 'Esperando al rival... (ID de sala: ' + roomId + ')';
                        btnPassTurn.disabled = true;

                        // Si es el jugador 1, el rival se ha unido y el turno no está asignado, iniciar partida
                        if (roomData.jugador1Id === currentUserId && roomData.jugador2Id && !roomData.estadoJuego.turnoActual) {
                            console.log("Jugador 1 detectó que Jugador 2 se unió. Inicializando estado de juego y turno.");
                            roomRef.update({
                                'estadoJuego.gameStatus': 'inProgress',
                                'estadoJuego.turnoActual': Math.random() < 0.5 ? roomData.jugador1Id : roomData.jugador2Id,
                                [`estadoJuego.drawStatus.${roomData.jugador1Id}`]: false, // Reset draw status for both players on game start
                                [`estadoJuego.drawStatus.${roomData.jugador2Id}`]: false,
                                [`estadoJuego.rematchStatus.${roomData.jug0r1Id}`]: false, // Reset rematch status on game start
                                [`estadoJuego.rematchStatus.${roomData.jugador2Id}`]: false
                            }).then(() => {
                                console.log("Estado de juego y turno actualizados por Jugador 1.");
                                gameMessageDiv.textContent = '¡Rival conectado! La partida ha comenzado.';
                            }).catch(error => {
                                console.error('Error al actualizar estado de juego y turno:', error);
                            });
                        }
                    } else if (roomData.estadoJuego.gameStatus === "inProgress") {
                        // El mensaje de turno se maneja en updateGameUI
                        console.log("Juego en progreso. Turno actual:", roomData.estadoJuego.turnoActual);
                    } else if (roomData.estadoJuego.gameStatus === "finished") {
                        gameMessageDiv.textContent = `¡Partida terminada! El ganador es: ${roomData.estadoJuego.ganador === currentUserId ? currentPlayerName : rivalPlayerName}`;
                        btnPassTurn.disabled = true; // Deshabilitar interacciones
                        showScreen(screen2); // Mostrar la pantalla de fin de partida
                        updateGameOverScreen(roomData); // Actualizar la pantalla de fin de partida
                    }

                    // Check for rematch readiness
                    if (roomData.estadoJuego.gameStatus === "finished" && roomData.estadoJuego.rematchStatus) {
                        const ownRematchReady = roomData.estadoJuego.rematchStatus[currentUserId];
                        const opponentRematchReady = roomData.estadoJuego.rematchStatus[currentRivalId];

                        if (ownRematchReady) {
                            btnRematch.classList.add('ready');
                            btnRematchStatusIndicator.classList.add('active');
                            btnRematch.disabled = true; // Disable once ready
                        } else {
                            btnRematch.classList.remove('ready');
                            btnRematchStatusIndicator.classList.remove('active');
                            btnRematch.disabled = false; // Enable if not ready
                        }

                        if (ownRematchReady && opponentRematchReady) {
                            gameMessageDiv.textContent = 'Ambos jugadores listos para la revancha. Reiniciando...';
                            console.log("DEBUG: Ambos jugadores listos para revancha. Reiniciando partida.");
                            resetGame(roomRef, roomData);
                        }
                    }

                    // --- Handle multi-player modal confirmations ---
                    const modalConfirmations = roomData.estadoJuego.modalConfirmations || {};
                    let modalToDisplayForMe = null;

                    for (const modalId in modalConfirmations) {
                        const modalState = modalConfirmations[modalId];
                        // Si el modal existe y este jugador aún no ha confirmado
                        if (modalState && !modalState[currentUserId]) {
                            modalToDisplayForMe = { id: modalId, state: modalState };
                            break; // Se encontró un modal que este jugador necesita confirmar
                        }
                    }

                    if (modalToDisplayForMe) {
                        const { id: modalId, state: modalState } = modalToDisplayForMe;
                        let modalContentDiv = document.createElement('div');
                        let modalTitleText = '';
                        let customModalClass = '';
                        let buttonsForModal = [{ text: 'Aceptar', action: 'confirm_modal_view' }]; // Botón por defecto

                        if (modalState.type === 'comparison' && modalState.player1Card && modalState.player2Card) {
                            const player1Card = cardDefinitions.find(c => c.id === modalState.player1Card);
                            const player2Card = cardDefinitions.find(c => c.id === modalState.player2Card);

                            if (player1Card && player2Card) {
                                modalTitleText = 'Comparación de Cartas';
                                customModalClass = 'comparison-modal';
                                modalContentDiv.classList.add('hand');
                                modalContentDiv.style.justifyContent = 'space-around';
                                modalContentDiv.style.width = '100%';
                                modalContentDiv.innerHTML = `
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                                        <span>${roomData.jugador1Nombre}'s Carta:</span>
                                        ${createCardElement(player1Card).outerHTML}
                                    </div>
                                    <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                                        <span>${roomData.jugador2Nombre}'s Carta:</span>
                                        ${createCardElement(player2Card).outerHTML}
                                    </div>
                                `;
                            }
                        } else if (modalState.type === 'view_hand' && modalState.targetHand) {
                            modalTitleText = 'Cartas Vistas';
                            customModalClass = 'view-hand-modal';
                            const handToView = modalState.targetHand; // Array de IDs de cartas
                            modalContentDiv.classList.add('hand');
                            if (handToView.length > 0) {
                                handToView.forEach(cardId => {
                                    const card = cardDefinitions.find(c => c.id === cardId);
                                    if (card) {
                                        modalContentDiv.appendChild(createCardElement(card));
                                    }
                                });
                            } else {
                                modalContentDiv.textContent = 'El rival no tiene cartas en la mano.';
                            }
                        } else if (modalState.type === 'view_card' && modalState.cardId) {
                            modalTitleText = 'Carta Mostrada';
                            customModalClass = 'view-hand-modal'; // Reutilizando para vista de una sola carta
                            const cardToView = cardDefinitions.find(c => c.id === modalState.cardId);
                            if (cardToView) {
                                modalContentDiv.classList.add('hand');
                                modalContentDiv.appendChild(createCardElement(cardToView));
                            } else {
                                modalContentDiv.textContent = 'No se pudo cargar la carta.';
                            }
                        } else if (modalState.type === 'choose_card_to_discard') {
                            // Este jugador necesita elegir una carta para descartar (Caballo de Troya)
                            if (modalState.targetPlayerId === currentUserId && !modalState.chosenCardId) {
                                modalTitleText = 'Descartar Carta (Caballo de Troya)';
                                customModalClass = 'discard-modal-content';

                                const ownHandForDiscard = roomData.jugador1Id === currentUserId ? roomData.estadoJuego.manoJugador1 : roomData.estadoJuego.manoJugador2;

                                chooseCardsToDiscard(ownHandForDiscard, modalState.numToDiscard, currentPlayerName)
                                    .then(async (selectedCards) => {
                                        if (selectedCards && selectedCards.length > 0) {
                                            await roomRef.update({
                                                [`estadoJuego.modalConfirmations.${modalId}.chosenCardId`]: selectedCards[0],
                                                [`estadoJuego.modalConfirmations.${modalId}.${currentUserId}`]: true
                                            });
                                            // También descartar la carta del lado del jugador que la elige
                                            const cardIndex = ownHandForDiscard.indexOf(selectedCards[0]);
                                            if (cardIndex > -1) {
                                                ownHandForDiscard.splice(cardIndex, 1);
                                                roomData.estadoJuego.pilaDescarte.push(selectedCards[0]);
                                                await roomRef.update({
                                                    [`estadoJuego.${roomData.jugador1Id === currentUserId ? 'manoJugador1' : 'manoJugador2'}`]: ownHandForDiscard,
                                                    'estadoJuego.pilaDescarte': roomData.estadoJuego.pilaDescarte
                                                });
                                            }
                                        } else {
                                            console.warn("DEBUG: Caballo de Troya: No se seleccionó ninguna carta para descartar.");
                                            await roomRef.update({
                                                [`estadoJuego.modalConfirmations.${modalId}.${currentUserId}`]: true
                                            });
                                        }
                                    });
                                return;
                            }
                        } else if (modalState.type === 'choose_card_to_discard_facedown') {
                            if (modalState.targetPlayerId === currentUserId && !modalState.chosenCardId) {
                                // Este jugador es el TARGET (rival) y necesita elegir una carta para descartar (Muerte)
                                modalTitleText = 'Descartar Carta (Efecto Muerte)';
                                customModalClass = 'discard-modal-content';

                                const ownHandForDiscard = roomData.jugador1Id === currentUserId ? roomData.estadoJuego.manoJugador1 : roomData.estadoJuego.manoJugador2;

                                chooseCardsToDiscard(ownHandForDiscard, modalState.numToDiscard, currentPlayerName)
                                    .then(async (selectedCards) => {
                                        if (selectedCards && selectedCards.length > 0) {
                                            await roomRef.update({
                                                [`estadoJuego.modalConfirmations.${modalId}.chosenCardId`]: selectedCards[0],
                                                [`estadoJuego.modalConfirmations.${modalId}.${currentUserId}`]: true
                                            });
                                            // También descartar la carta del lado del jugador que la elige
                                            const cardIndex = ownHandForDiscard.indexOf(selectedCards[0]);
                                            if (cardIndex > -1) {
                                                ownHandForDiscard.splice(cardIndex, 1);
                                                roomData.estadoJuego.pilaDescarte.push(selectedCards[0]);
                                                await roomRef.update({
                                                    [`estadoJuego.${roomData.jugador1Id === currentUserId ? 'manoJugador1' : 'manoJugador2'}`]: ownHandForDiscard,
                                                    'estadoJuego.pilaDescarte': roomData.estadoJuego.pilaDescarte
                                                });
                                            }
                                        } else {
                                            console.warn("DEBUG: Muerte: No se seleccionó ninguna carta para descartar.");
                                            await roomRef.update({
                                                [`estadoJuego.modalConfirmations.${modalId}.${currentUserId}`]: true
                                            });
                                        }
                                    });
                                return;
                            } else if (modalState.initiatorId === currentUserId && !modalState.chosenCardId) {
                                // Este jugador es el INICIADOR (quien jugó Muerte) y está esperando al rival
                                modalTitleText = 'Esperando al Rival (Efecto Muerte)';
                                customModalClass = 'waiting-facedown-modal'; // Nueva clase para este modal

                                const waitingContentDiv = document.createElement('div');
                                waitingContentDiv.style.display = 'flex';
                                waitingContentDiv.style.flexDirection = 'column';
                                waitingContentDiv.style.alignItems = 'center';
                                waitingContentDiv.style.gap = '15px';

                                const messageP = document.createElement('p');
                                messageP.textContent = `${opponentNameDisplay.textContent} está eligiendo una carta para descartar.`;
                                messageP.style.fontSize = '1.1em';
                                messageP.style.textAlign = 'center';
                                messageP.style.color = '#e0e0e0';

                                const faceDownCard = createCardElement(null, true); // Crear una carta genérica boca abajo
                                faceDownCard.style.width = '120px'; // Ajustar tamaño según sea necesario
                                faceDownCard.style.height = '160px';

                                waitingContentDiv.appendChild(messageP);
                                waitingContentDiv.appendChild(faceDownCard);

                                displayModal(
                                    modalTitleText,
                                    waitingContentDiv,
                                    [], // Sin botones, ya que solo está esperando
                                    customModalClass
                                );
                                return;
                            }
                        }


                        if (modalTitleText && modalContentDiv.innerHTML) {
                            // Mostrar el modal para que el jugador actual confirme
                            displayModal(
                                modalTitleText,
                                modalContentDiv,
                                buttonsForModal, // Usar el botón por defecto
                                customModalClass
                            ).then(async (action) => {
                                if (action === 'confirm_modal_view') {
                                    // Actualizar el estado de confirmación de este jugador en Firestore
                                    await roomRef.update({
                                        [`estadoJuego.modalConfirmations.${modalId}.${currentUserId}`]: true
                                    });
                                }
                            });
                        }
                    }
                    // IMPORTANTE: Se eliminó la línea 'else { hideModal(); }' para permitir el cierre independiente.
                    // El modal ahora solo se ocultará cuando el jugador local haga clic en "Aceptar",
                    // o cuando la entrada del modal se elimine de Firestore (después de que ambos confirmen).


                } else {
                    console.log('La sala ya no existe.');
                    gameMessageDiv.textContent = 'La partida ha terminado o la sala ha sido eliminada.';
                    showScreen(screen1);
                }
            }, error => {
                console.error('Error al escuchar cambios en la sala:', error);
                gameMessageDiv.textContent = 'Error de conexión. Volviendo a la pantalla de selección de rival.';
                showScreen(screen1);
            });
        }

        // Función para actualizar la UI del juego con los datos de Firestore
        async function updateGameUI(roomData, roomRef) {
            const gameState = roomData.estadoJuego;

            // Actualizar nombres
            const ownName = roomData.jugador1Id === currentUserId ? roomData.jugador1Nombre : roomData.jugador2Nombre;
            const opponentName = roomData.jugador1Id === currentUserId ? roomData.jugador2Nombre : roomData.jugador1Nombre;
            ownNameDisplay.textContent = ownName;
            opponentNameDisplay.textContent = opponentName;
            console.log(`UI Nombres - Propio: ${ownNameDisplay.textContent}, Rival: ${opponentNameDisplay.textContent}`);


            // Actualizar manos
            const ownHand = roomData.jugador1Id === currentUserId ? gameState.manoJugador1 : gameState.manoJugador2;
            const opponentHandCount = roomData.jugador1Id === currentUserId ? gameState.manoJugador2.length : gameState.manoJugador1.length;
            renderOwnHand(ownHand);
            renderOpponentHand(opponentHandCount);

            // Actualizar pila de descarte
            discardPileDiv.innerHTML = '';
            if (gameState.ultimaCartaJugada) {
                const lastCard = cardDefinitions.find(c => c.id === gameState.ultimaCartaJugada);
                if (lastCard) {
                    const lastCardElement = createCardElement(lastCard);
                    lastCardElement.classList.add('last-played-card');
                    discardPileDiv.appendChild(lastCardElement);
                }
            } else {
                discardPileDiv.textContent = 'Descarte';
            }

            // Actualizar tablero y posiciones de jugadores
            const player1Pos = gameState.posicionJugador1;
            const player2Pos = gameState.posicionJugador2;
            renderGameBoard(player1Pos, player2Pos); // Pasar las posiciones tal cual están en Firestore

            // Renderizar efectos activos
            renderActiveEffects(gameState.efectosActivos, roomData.jugador1Id, roomData.jugador2Id, roomData.jugador1Nombre, roomData.jugador2Nombre);

            // Indicar turno actual y manejar robo de carta al inicio del turno
            console.log(`DEBUG: UI Turno - Turno actual en Firestore: ${gameState.turnoActual}, Mi UID: ${currentUserId}, Rival UID: ${currentRivalId}`);
            console.log(`DEBUG: UI Turno - drawStatus para ${currentUserId}: ${gameState.drawStatus ? gameState.drawStatus[currentUserId] : 'undefined'}`);
            console.log(`DEBUG: UI Turno - gameStatus: ${gameState.gameStatus}`);

            if (gameState.turnoActual === currentUserId) {
                gameMessageDiv.textContent = '¡Es tu turno!';
                btnPassTurn.disabled = false; // Habilitar botón de pasar turno
                ownHandDiv.style.border = '2px solid #FF0000'; // Resaltar mano del jugador actual con rojo

                // Lógica para robar carta al inicio del turno
                if (gameState.gameStatus === "inProgress" && gameState.drawStatus && gameState.drawStatus[currentUserId] === false) {
                    console.log("DEBUG: UI Turno - Detectado que el jugador actual necesita robar una carta.");
                    const currentMazo = [...gameState.mazo]; // Copia para modificar
                    const currentPilaDescarte = [...gameState.pilaDescarte]; // Copia para modificar
                    const currentOwnHand = roomData.jugador1Id === currentUserId ? [...gameState.manoJugador1] : [...gameState.manoJugador2]; // Asegurarse de usar la mano correcta del estado

                    const newCard = drawCardForTurn(currentMazo, currentPilaDescarte, gameMessageDiv);
                    if (newCard) {
                        currentOwnHand.push(newCard);
                        console.log(`DEBUG: UI Turno - Carta robada: ${newCard}. Nueva mano:`, currentOwnHand);

                        // Actualizar Firestore con la nueva mano, mazo, descarte y estado de robo
                        const updatePayload = {
                            'estadoJuego.mazo': currentMazo,
                            'estadoJuego.pilaDescarte': currentPilaDescarte,
                            [`estadoJuego.drawStatus.${currentUserId}`]: true // Marcar como robado para este turno
                        };

                        if (roomData.jugador1Id === currentUserId) {
                            updatePayload['estadoJuego.manoJugador1'] = currentOwnHand;
                        } else {
                            updatePayload['estadoJuego.manoJugador2'] = currentOwnHand;
                        }

                        try {
                            await roomRef.update(updatePayload);
                            gameMessageDiv.textContent += ' Has robado una carta al inicio de tu turno.';
                            console.log("DEBUG: UI Turno - Firestore actualizado después de robar carta.");
                        } catch (e) {
                            console.error("Error al actualizar Firestore después de robar carta:", e);
                        }
                    } else {
                        console.log("DEBUG: UI Turno - No se pudo robar una carta.");
                    }
                }

            } else if (gameState.turnoActual === currentRivalId) {
                gameMessageDiv.textContent = `Turno de ${opponentNameDisplay.textContent}`;
                btnPassTurn.disabled = true; // Deshabilitar botón de pasar turno
                ownHandDiv.style.border = '1px solid #333333'; // Quitar resaltado con un borde sutil
            } else {
                 gameMessageDiv.textContent = 'Esperando al rival...';
                 btnPassTurn.disabled = true;
                 ownHandDiv.style.border = '1px solid #333333';
            }

            // Verificar condición de victoria
            if (gameState.posicionJugador1 >= 13 || gameState.posicionJugador2 >= 13) {
                const winnerId = gameState.posicionJugador1 >= 13 ? roomData.jugador1Id : roomData.jugador2Id;
                // Solo actualiza el estado de la partida a "finished" si aún no lo está
                if (gameState.gameStatus !== "finished") {
                    if (roomRef) { // Asegurarse de que roomRef esté disponible antes de actualizar
                        await roomRef.update({ 'estadoJuego.ganador': winnerId, 'estadoJuego.gameStatus': 'finished' });
                        console.log("DEBUG: Condición de victoria alcanzada. Ganador:", winnerId);
                    } else {
                        console.error("roomRef no está disponible para actualizar el estado de victoria.");
                    }
                }
            }
        }

        // Función para actualizar la pantalla de fin de partida
        function updateGameOverScreen(roomData) {
            const gameState = roomData.estadoJuego;
            const winnerName = gameState.ganador === roomData.jugador1Id ? roomData.jugador1Nombre : roomData.jugador2Nombre;
            const ownName = roomData.jugador1Id === currentUserId ? roomData.jugador1Nombre : roomData.jugador2Nombre;
            const opponentName = roomData.jugador1Id === currentUserId ? roomData.jugador2Nombre : roomData.jugador1Nombre;

            winnerDisplay.textContent = `Ganador: ${winnerName}`;
            playerNamesDisplay.textContent = `Jugadores: ${roomData.jugador1Nombre} vs ${roomData.jugador2Nombre}`;
            playerNameInputScreen2.value = ownName;
            rivalNameInputScreen2.value = opponentName;

            // Resetear el estado del botón de reinicio para el jugador actual
            btnRematch.classList.remove('ready');
            btnRematchStatusIndicator.classList.remove('active');
            btnRematch.disabled = false; // Habilitar el botón para que el jugador pueda iniciar el reinicio
        }


        // Función para generar el mazo inicial completo
        function generateInitialDeck() {
            let deck = [];
            cardDefinitions.forEach(card => {
                for (let i = 0; i < card.count; i++) {
                    deck.push(card.id);
                }
            });
            return deck;
        }

        // Función para barajar un array (algoritmo Fisher-Yates)
        function shuffleArray(array) {
            for (let i = array.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [array[i], array[j]] = [array[j], array[i]];
            }
            return array;
        }

        // Función para renderizar los efectos activos
        function renderActiveEffects(effectsActivos, jugador1Id, jugador2Id, jugador1Nombre, jugador2Nombre) {
            // Limpiar los divs de efectos antes de renderizar
            ownActiveEffectsDiv.innerHTML = '';
            opponentActiveEffectsDiv.innerHTML = '';

            // Determinar qué jugador es el usuario actual y cuál es el oponente
            const isPlayer1 = currentUserId === jugador1Id;
            const ownPlayerId = currentUserId;
            const opponentPlayerId = isPlayer1 ? jugador2Id : jugador1Id;

            // Renderizar efectos para el usuario actual
            if (effectsActivos[ownPlayerId] && effectsActivos[ownPlayerId].guardaespaldas) {
                const cardDef = cardDefinitions.find(c => c.id === 'guardaespaldas');
                if (cardDef) {
                    const effectDiv = document.createElement('div');
                    effectDiv.classList.add('active-effect-card');
                    effectDiv.innerHTML = `
                        <div class="card-image-small" style="background-image: url('${cardDef.image}');"></div>
                        <span>Guardaespaldas activo</span>
                        <span>Activada por: ${ownNameDisplay.textContent}</span>
                    `;
                    ownActiveEffectsDiv.appendChild(effectDiv);
                }
            }

            // Renderizar efectos para el oponente
            if (effectsActivos[opponentPlayerId] && effectsActivos[opponentPlayerId].guardaespaldas) {
                const cardDef = cardDefinitions.find(c => c.id === 'guardaespaldas');
                if (cardDef) {
                    const effectDiv = document.createElement('div');
                    effectDiv.classList.add('active-effect-card');
                    effectDiv.innerHTML = `
                        <div class="card-image-small" style="background-image: url('${cardDef.image}');"></div>
                        <span>Guardaespaldas activo</span>
                        <span>Activada por: ${opponentNameDisplay.textContent}</span>
                    `;
                    opponentActiveEffectsDiv.appendChild(effectDiv);
                }
            }
        }


        // --- Lógica de Juego (acciones del jugador) ---

        // Función para jugar una carta
        async function playCard(cardId) {
            // Asegurarse de que es el turno del jugador
            const roomRef = db.collection('SALAS').doc(currentRoomId);
            const roomDoc = await roomRef.get();
            const roomData = roomDoc.data();
            const gameState = roomDoc.data().estadoJuego; // Accede directamente a estadoJuego

            if (gameState.turnoActual !== currentUserId) {
                gameMessageDiv.textContent = '¡No es tu turno!';
                console.log("DEBUG: playCard - No es tu turno.");
                return;
            }
            console.log(`DEBUG: playCard - Jugando carta: ${cardDefinitions.find(c => c.id === cardId).name}`);
            gameMessageDiv.textContent = `Jugando ${cardDefinitions.find(c => c.id === cardId).name}...`;

            let ownHand = roomData.jugador1Id === currentUserId ? [...gameState.manoJugador1] : [...gameState.manoJugador2];
            let rivalHand = roomData.jugador1Id === currentUserId ? [...gameState.manoJugador2] : [...gameState.manoJugador1];
            let ownPos = roomData.jugador1Id === currentUserId ? gameState.posicionJugador1 : gameState.posicionJugador2;
            let rivalPos = roomData.jugador1Id === currentUserId ? gameState.posicionJugador2 : gameState.posicionJugador1;
            let mazo = [...gameState.mazo];
            let pilaDescarte = [...gameState.pilaDescarte];
            const lastPlayedCardId = gameState.ultimaCartaJugada;
            let effectsActivos = {...gameState.efectosActivos}; // Copy effects

            console.log(`DEBUG: playCard - Current ownHand from Firestore (before local modification):`, JSON.stringify(ownHand));
            const cardIndex = ownHand.indexOf(cardId);
            if (cardIndex === -1) {
                gameMessageDiv.textContent = 'Esa carta no está en tu mano.';
                console.log("DEBUG: playCard - Carta no encontrada en mano. CardId:", cardId, "Hand:", ownHand);
                return;
            }

            const playedCard = cardDefinitions.find(c => c.id === cardId);
            ownHand.splice(cardIndex, 1); // Remover la carta de la mano
            pilaDescarte.push(cardId); // Añadirla a la pila de descarte
            console.log(`DEBUG: playCard - ownHand after removing played card locally:`, JSON.stringify(ownHand));
            console.log(`DEBUG: playCard - pilaDescarte after adding played card locally:`, JSON.stringify(pilaDescarte));

            // Crear un objeto de estado mutable para pasar a applyCardEffect
            let mutableState = {
                ownHand: ownHand, // This ownHand already has the card removed
                rivalHand: rivalHand,
                ownPos: ownPos,
                rivalPos: rivalPos,
                mazo: mazo,
                pilaDescarte: pilaDescarte,
                lastPlayedCardId: lastPlayedCardId,
                currentUserId: currentUserId,
                currentRivalId: currentRivalId,
                roomData: roomData,
                roomRef: roomRef,
                effectsActivos: effectsActivos // Pass effects to mutableState
            };
            console.log("DEBUG: playCard - mutableState.ownHand before applyCardEffect:", JSON.stringify(mutableState.ownHand));

            // Aplicar efecto de la carta, modificando mutableState
            await applyCardEffect(playedCard, mutableState);
            console.log("DEBUG: playCard - mutableState.ownHand after applyCardEffect (should be final hand):", JSON.stringify(mutableState.ownHand));
            console.log("DEBUG: playCard - mutableState.pilaDescarte after applyCardEffect (should be final discard pile):", JSON.stringify(mutableState.pilaDescarte));


            // Determinar el próximo turno. Si la carta es Semidiós o Perro, el turno se repite.
            let nextTurnPlayerId = currentRivalId;
            let newDrawStatus = {...gameState.drawStatus}; // Copy drawStatus

            // Si la carta jugada es Semidiós, el jugador actual repite turno.
            // El efecto de Perro se maneja en passTurn, no aquí.
            if  (playedCard.id === 'semidios' || playedCard.id === 'perro') {
                nextTurnPlayerId = currentUserId; // Repetir turno
                newDrawStatus[currentUserId] = false; // Reset draw status for repeated turn
                gameMessageDiv.textContent += ' ¡Repites tu turno!';
                console.log("DEBUG: playCard - Semidiós jugado. Repitiendo turno y reseteando drawStatus para el jugador actual.");
            } else {
                newDrawStatus[currentRivalId] = false; // Reset draw status for the next player
                console.log("DEBUG: playCard - Turno normal. Reseteando drawStatus para el rival.");
            }

            // Actualizar el estado en Firestore con los valores modificados de mutableState
            let updatedGameState = {
                ...gameState,
                mazo: mutableState.mazo,
                pilaDescarte: mutableState.pilaDescarte,
                ultimaCartaJugada: cardId,
                manoJugador1: roomData.jugador1Id === currentUserId ? mutableState.ownHand : mutableState.rivalHand,
                manoJugador2: roomData.jugador1Id === currentUserId ? mutableState.rivalHand : mutableState.ownHand,
                posicionJugador1: roomData.jugador1Id === currentUserId ? mutableState.ownPos : mutableState.rivalPos,
                posicionJugador2: roomData.jugador1Id === currentUserId ? mutableState.rivalPos : mutableState.ownPos,
                turnoActual: nextTurnPlayerId, // Pasar el turno al rival o repetir
                efectosActivos: mutableState.effectsActivos, // Update effects from mutableState
                drawStatus: newDrawStatus // Update drawStatus
            };
            console.log("DEBUG: playCard - Estado del juego a actualizar en Firestore:", updatedGameState);

            await roomRef.update({ estadoJuego: updatedGameState });
            gameMessageDiv.textContent = `Has jugado ${playedCard.name}. Turno de ${opponentNameDisplay.textContent}.`;
        }

        // Función auxiliar para elegir un jugador (simplificado por ahora)
        // NOTA: Para una experiencia multijugador completa, esto debería ser un modal interactivo
        // que permita al jugador actual elegir entre sí mismo o el rival, y que el rival reciba una notificación.
        async function choosePlayer() {
            console.log("DEBUG: choosePlayer llamado. Por simplicidad, siempre se elige al rival.");
            // Por ahora, siempre elegimos al rival para efectos que afectan a "otro jugador".
            // Para efectos donde se puede elegir "a ti mismo o a otro", se necesitaría una UI.
            return currentRivalId;
        }

        // Función para mostrar un modal interactivo (renamed from showModal)
        function displayModal(title, contentHtml, buttons, customClass = '') {
            return new Promise(resolve => {
                modalTitle.textContent = title;
                modalBody.innerHTML = ''; // Limpiar contenido previo
                modalBody.appendChild(contentHtml); // Añadir el contenido HTML proporcionado

                modalButtons.innerHTML = ''; // Limpiar botones previos
                buttons.forEach(btn => {
                    const buttonElement = document.createElement('button');
                    buttonElement.textContent = btn.text;
                    buttonElement.addEventListener('click', () => {
                        // Ocultar el modal inmediatamente para el jugador que hizo clic en "Aceptar"
                        if (btn.action === 'confirm' || btn.action === 'confirm_modal_view' || btn.action === 'exchange' || btn.action === 'no_exchange' || btn.action === currentUserId || btn.action === currentRivalId) { // Added Politico's actions
                            hideModal();
                        }
                        resolve(btn.action); // Resolver la promesa con la acción del botón
                    });
                    modalButtons.appendChild(buttonElement);
                });

                // Añadir clase personalizada si se proporciona
                if (customClass) {
                    cardInteractionModal.querySelector('.modal-content').classList.add(customClass);
                } else {
                    // Asegurarse de que no persistan clases personalizadas antiguas si no se proporciona ninguna
                    cardInteractionModal.querySelector('.modal-content').classList.remove('comparison-modal', 'view-hand-modal', 'discard-modal-content', 'select-card-modal', 'waiting-facedown-modal'); // Added new class
                }

                cardInteractionModal.style.display = 'flex'; // Mostrar el modal
            });
        }

        // Función para ocultar el modal
        function hideModal() {
            cardInteractionModal.style.display = 'none';
            modalTitle.textContent = '';
            modalBody.innerHTML = '';
            modalButtons.innerHTML = '';
            // Eliminar cualquier clase personalizada al ocultar
            cardInteractionModal.querySelector('.modal-content').classList.remove('comparison-modal', 'view-hand-modal', 'discard-modal-content', 'select-card-modal', 'waiting-facedown-modal'); // Added new class
        }

        // Nueva función para permitir al jugador elegir cartas para descartar
        async function chooseCardsToDiscard(hand, numToDiscard, targetPlayerName) {
            return new Promise(resolve => {
                let selectedCards = [];
                const discardContainer = document.createElement('div');
                discardContainer.classList.add('hand'); // Reutilizar estilos de mano
                discardContainer.style.flexWrap = 'wrap';
                discardContainer.style.justifyContent = 'center';
                discardContainer.style.gap = '15px';
                // El estilo del borde se aplicará a través de la clase .discard-modal-content en el propio contenido del modal

                const selectionCounter = document.createElement('p');
                selectionCounter.style.color = 'white';
                selectionCounter.style.fontSize = '1.2em';
                selectionCounter.style.marginBottom = '15px';
                selectionCounter.textContent = `Elige las cartas a descartar: 0/${numToDiscard}`;

                const confirmButton = document.createElement('button');
                confirmButton.textContent = 'Confirmar Descarte';
                confirmButton.disabled = true; // Deshabilitado hasta que se seleccione el número correcto de cartas

                // Función para actualizar el contador y el estado del botón
                const updateSelection = () => {
                    selectionCounter.textContent = `Elige las cartas a descartar: ${selectedCards.length}/${numToDiscard}`;
                    confirmButton.disabled = selectedCards.length !== numToDiscard;
                };

                // Crear elementos de carta para la selección
                hand.forEach(cardId => {
                    const card = cardDefinitions.find(c => c.id === cardId);
                    if (card) {
                        const cardElement = createCardElement(card);
                        cardElement.classList.add('selectable'); // Añadir clase seleccionable para estilos
                        cardElement.addEventListener('click', () => {
                            const index = selectedCards.indexOf(cardId);
                            if (index > -1) {
                                // Carta ya seleccionada, deseleccionarla
                                selectedCards.splice(index, 1);
                                cardElement.classList.remove('selected');
                            } else if (selectedCards.length < numToDiscard) {
                                // Carta no seleccionada y podemos seleccionar más
                                selectedCards.push(cardId);
                                cardElement.classList.add('selected');
                            }
                            updateSelection();
                        });
                        discardContainer.appendChild(cardElement);
                    }
                });

                confirmButton.addEventListener('click', () => {
                    hideModal(); // Ocultar el modal cuando se confirma
                    resolve(selectedCards);
                });

                const modalContentDiv = document.createElement('div');
                modalContentDiv.appendChild(selectionCounter);
                modalContentDiv.appendChild(discardContainer);

                // Mostrar el modal con la clase personalizada
                displayModal(
                    `Descartar Cartas (${targetPlayerName})`,
                    modalContentDiv,
                    [], // Sin botones por defecto, añadiremos el nuestro personalizado
                    'discard-modal-content' // Clase personalizada para estilos
                );

                // Añadir manualmente el botón de confirmar al div de modalButtons
                modalButtons.innerHTML = ''; // Limpiar botones existentes
                modalButtons.appendChild(confirmButton);
            });
        }

        // Nueva función para permitir al jugador elegir una carta de todas las definiciones
        async function chooseCardFromAllDefinitions(promptText) {
            return new Promise(resolve => {
                const selectionContainer = document.createElement('div');
                selectionContainer.classList.add('hand');
                selectionContainer.style.flexWrap = 'wrap';
                selectionContainer.style.justifyContent = 'center';
                selectionContainer.style.gap = '10px';

                const promptElement = document.createElement('p');
                promptElement.style.color = 'white';
                promptElement.style.fontSize = '1.2em';
                promptElement.style.marginBottom = '15px';
                promptElement.textContent = promptText;

                let selectedCardId = null;

                cardDefinitions.forEach(card => {
                    const cardElement = createCardElement(card);
                    cardElement.classList.add('selectable');
                    cardElement.style.cursor = 'pointer';
                    cardElement.addEventListener('click', () => {
                        // Deseleccionar la carta anterior si la hay
                        const prevSelected = selectionContainer.querySelector('.card-in-hand.selected');
                        if (prevSelected) {
                            prevSelected.classList.remove('selected');
                        }
                        // Seleccionar la carta actual
                        cardElement.classList.add('selected');
                        selectedCardId = card.id;
                        confirmButton.disabled = false; // Habilitar el botón de confirmar
                    });
                    selectionContainer.appendChild(cardElement);
                });

                const confirmButton = document.createElement('button');
                confirmButton.textContent = 'Confirmar Selección';
                confirmButton.disabled = true; // Deshabilitado hasta que se seleccione una carta

                confirmButton.addEventListener('click', () => {
                    hideModal();
                    resolve(selectedCardId);
                });

                const modalContentDiv = document.createElement('div');
                modalContentDiv.appendChild(promptElement);
                modalContentDiv.appendChild(selectionContainer);

                displayModal(
                    'Seleccionar Carta',
                    modalContentDiv,
                    [],
                    'select-card-modal' // Clase personalizada opcional para este modal
                );

                modalButtons.innerHTML = '';
                modalButtons.appendChild(confirmButton);
            });
        }
