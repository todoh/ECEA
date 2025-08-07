// Importaciones necesarias (asegúrate de que estas variables y funciones estén disponibles en el scope global o se importen adecuadamente)
// Por ejemplo:
// const cardDefinitions = [...]; // Desde constantes.js
// const gameMessageDiv = ...; // Desde cons.js
// const opponentNameDisplay = ...; // Desde cons.js
// const ownNameDisplay = ...; // Desde cons.js
// const createCardElement = ...; // Desde dibujar.js
// const displayModal = ...; // Desde online.js
// const hideModal = ...; // Desde online.js
// const choosePlayer = ...; // Desde online.js
// const chooseCardsToDiscard = ...; // Desde online.js
// const chooseCardFromAllDefinitions = ...; // Desde online.js
// const awaitMultiPlayerModalConfirmation = ...; // Desde funciones.js
// const db = ...; // Desde cons.js
// const shuffleArray = ...; // Desde online.js o funciones.js

// Función auxiliar para robar cartas, manejando el barajado del descarte (para efectos)
const drawCardForEffect = (mazo, pilaDescarte) => {
    if (mazo.length === 0) {
        if (pilaDescarte.length > 0) {
            mazo.push(...shuffleArray(pilaDescarte));
            pilaDescarte.length = 0; // Vaciar pila de descarte
            gameMessageDiv.textContent = '¡Mazo barajado con el descarte!';
            console.log("DEBUG: drawCardForEffect - Mazo barajado con descarte. Nuevo mazo:", mazo);
        } else {
            gameMessageDiv.textContent = 'No hay cartas en el mazo ni en el descarte para robar.';
            console.log("DEBUG: drawCardForEffect - No hay cartas para robar.");
            return null; // No hay cartas para robar
        }
    }
    const drawnCard = mazo.shift(); // Roba la primera carta del mazo
    console.log("DEBUG: drawCardForEffect - Carta robada:", drawnCard);
    return drawnCard;
};

// Función para verificar si un efecto adverso debe ser bloqueado por Guardaespaldas
const isEffectBlockedByGuardaespaldas = (targetPlayerId, effectsActivos) => {
    return effectsActivos[targetPlayerId] && effectsActivos[targetPlayerId].guardaespaldas;
};

// --- Funciones de efecto individuales para cada carta ---

async function effectMuerte(state) {
    let { ownPos, rivalHand, pilaDescarte, currentUserId, currentRivalId, roomData, roomRef, effectsActivos } = state;
    console.log("DEBUG: Efecto Muerte activado.");

    if (isEffectBlockedByGuardaespaldas(currentRivalId, effectsActivos)) {
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} está protegido por Guardaespaldas. ¡El efecto Muerte es bloqueado!`;
        return;
    }

    if (rivalHand.length === 0) {
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} no tiene cartas para descartar.`;
        return;
    }

    gameMessageDiv.textContent = `Elige una de las cartas de ${opponentNameDisplay.textContent} para descartar.`;

    // PASO 1: Preparar una ventana emergente (modal) para ti.
    const facedownSelectionDiv = document.createElement('div');
    facedownSelectionDiv.classList.add('hand');
    facedownSelectionDiv.style.justifyContent = 'center';

    // PASO 2: Crear una promesa que se resolverá cuando TÚ elijas una carta.
    const cardSelectionPromise = new Promise(resolve => {
        // Se crean tantas cartas boca abajo como cartas tenga el rival.
        rivalHand.forEach(cardId => {
            const cardElement = createCardElement({}, true); // true = boca abajo
            cardElement.classList.add('selectable');
            
            // Se añade un listener de clic A CADA CARTA BOCA ABAJO.
            cardElement.addEventListener('click', () => {
                // Cuando haces clic, se resuelve la promesa con el ID de la carta elegida.
                resolve(cardId);

                // Se cierra el modal.
                hideModal(); 
            });
            facedownSelectionDiv.appendChild(cardElement);
        });
    });

    // PASO 3: Mostrarte el modal con las cartas boca abajo del rival para que elijas.
    await displayModal(
        `Elige la carta a descartar del rival`,
        facedownSelectionDiv,
        [] // No hay botones, la elección es directa sobre las cartas.
    );

    // PASO 4: Esperar a que hagas tu elección. La variable contendrá la carta que tú elegiste.
    const discardedCardIdMuerte = await cardSelectionPromise;

    // PASO 5: Procesar la carta que TÚ elegiste.
    if (discardedCardIdMuerte) {
        // Se elimina la carta de la mano del rival.
        const index = rivalHand.indexOf(discardedCardIdMuerte);
        if (index > -1) {
            rivalHand.splice(index, 1);
            pilaDescarte.push(discardedCardIdMuerte);
        }

        const discardedCardDef = cardDefinitions.find(c => c.id === discardedCardIdMuerte);
        gameMessageDiv.textContent = `Has descartado la carta "${discardedCardDef.name}" del rival.`;

        // Se informa a ambos jugadores de la carta descartada.
        const modalIdMuerteView = `muerte-view-${Date.now()}`;
        await roomRef.update({
            [`estadoJuego.modalConfirmations.${modalIdMuerteView}`]: {
                [currentUserId]: true,
                [currentRivalId]: false,
                type: 'view_card',
                cardId: discardedCardIdMuerte
            }
        });
        await awaitMultiPlayerModalConfirmation(modalIdMuerteView);

        // Se comprueba el valor para ver si avanzas.
        if (discardedCardDef.value <= 0) {
            state.ownPos = Math.min(13, state.ownPos + 1);
            gameMessageDiv.textContent += ' ¡Como su valor es 0 o menos, avanzas 1 casilla!';
        }
    } else {
        gameMessageDiv.textContent = 'No se seleccionó ninguna carta para descartar.';
    }
}

async function effectAveFenix(state) {
    let { ownHand, mazo, pilaDescarte } = state;
    console.log("DEBUG: Efecto Ave Fénix activado.");
    while(ownHand.length > 0) {
        pilaDescarte.push(ownHand.pop());
    }
    for (let i = 0; i < 3; i++) {
        const newCard = drawCardForEffect(mazo, pilaDescarte);
        if (newCard) ownHand.push(newCard);
    }
    gameMessageDiv.textContent = 'Has descartado tu mano y robado 3 cartas.';
    console.log("DEBUG: Ave Fénix: Mano actualizada:", ownHand);
}

async function effectGato(state) {
    let { ownHand, mazo, pilaDescarte } = state;
    console.log("DEBUG: Efecto Gato activado.");
    for (let i = 0; i < 2; i++) {
        const newCard = drawCardForEffect(mazo, pilaDescarte);
        if (newCard) ownHand.push(newCard);
    }
    gameMessageDiv.textContent += ' Has robado 2 cartas.';
    console.log("DEBUG: Gato: Mano actualizada:", ownHand);
}

async function effectCaballoDeTroya(state) {
    let { ownHand, rivalHand, mazo, pilaDescarte, currentUserId, currentRivalId, roomData, roomRef, effectsActivos } = state;
    console.log("DEBUG: Efecto Caballo de Troya activado.");

    if (isEffectBlockedByGuardaespaldas(currentRivalId, effectsActivos)) {
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} está protegido por Guardaespaldas. ¡El efecto Caballo de Troya es bloqueado!`;
        console.log("DEBUG: Caballo de Troya: Efecto bloqueado por Guardaespaldas.");
        return;
    }

    if (rivalHand.length === 0) {
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} no tiene cartas para descartar.`;
        console.log("DEBUG: Caballo de Troya: Rival sin cartas.");
        return;
    }

    const modalIdTroya = `troya-${Date.now()}-${currentUserId}`;

    await roomRef.update({
        [`estadoJuego.modalConfirmations.${modalIdTroya}`]: {
            [currentUserId]: true,
            [currentRivalId]: false,
            type: 'choose_card_to_discard',
            targetPlayerId: currentRivalId,
            initiatorId: currentUserId,
            numToDiscard: 1,
            chosenCardId: null
        }
    });

    gameMessageDiv.textContent = `Esperando a que ${opponentNameDisplay.textContent} descarte una carta por Caballo de Troya.`;
    console.log("DEBUG: Caballo de Troya: Esperando selección del rival.");

    await awaitMultiPlayerModalConfirmation(modalIdTroya);

    // Re-fetch room data after opponent's modal interaction to get updated hands and discard pile
    const updatedRoomDocTroya = await roomRef.get();
    const updatedRoomDataTroya = updatedRoomDocTroya.data();
    state.ownHand = roomData.jugador1Id === currentUserId ? [...updatedRoomDataTroya.estadoJuego.manoJugador1] : [...updatedRoomDataTroya.estadoJuego.manoJugador2];
    state.rivalHand = roomData.jugador1Id === currentUserId ? [...updatedRoomDataTroya.estadoJuego.manoJugador2] : [...updatedRoomDataTroya.estadoJuego.manoJugador1];
    state.mazo = [...updatedRoomDataTroya.estadoJuego.mazo];
    state.pilaDescarte = [...updatedRoomDataTroya.estadoJuego.pilaDescarte];

    const troyaModalState = updatedRoomDataTroya.estadoJuego.modalConfirmations[modalIdTroya];
    const discardedCardIdTroya = troyaModalState ? troyaModalState.chosenCardId : null;

    if (discardedCardIdTroya) {
        const discardedCardTroyaDef = cardDefinitions.find(c => c.id === discardedCardIdTroya);
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} ha descartado ${discardedCardTroyaDef.name}.`;
        console.log("DEBUG: Caballo de Troya: Rival descartó:", discardedCardTroyaDef.name);
    } else {
        gameMessageDiv.textContent = 'El rival no seleccionó ninguna carta para descartar.';
        console.log("DEBUG: Caballo de Troya: Rival no seleccionó carta.");
    }
}

async function effectRanaDeLaSuerte(state) {
    let { ownPos } = state;
    console.log("DEBUG: Efecto Rana de la Suerte activado.");
    state.ownPos = Math.min(13, ownPos + 2);
    gameMessageDiv.textContent += ' ¡Has avanzado 2 casillas!';
    console.log("DEBUG: Rana de la Suerte: Nueva posición:", state.ownPos);
}

async function effectPerro(state) {
    
    gameMessageDiv.textContent += ` ¡Repites tu turno!`;
    console.log("DEBUG: Perro: El jugador actual repetirá turno.");
}

async function effectEsclavo(state) {
    let { ownHand, ownPos, currentUserId, currentRivalId, roomRef } = state;
    console.log("DEBUG: Efecto Esclavo activado.");

    const cardToRevealEsclavoId = ownHand.find(cId => {
        const cardDef = cardDefinitions.find(cd => cd.id === cId);
        return cardDef && cardDef.value > 4;
    });

    if (cardToRevealEsclavoId) {
        const cardToRevealEsclavo = cardDefinitions.find(c => c.id === cardToRevealEsclavoId);
        const modalIdEsclavo = `esclavo-${Date.now()}-${currentUserId}`;

        await roomRef.update({
            [`estadoJuego.modalConfirmations.${modalIdEsclavo}`]: {
                [currentUserId]: true,
                [currentRivalId]: false,
                type: 'view_card',
                cardId: cardToRevealEsclavoId,
                viewerId: currentUserId,
                targetId: currentUserId
            }
        });

        const revealedCardDiv = document.createElement('div');
        revealedCardDiv.classList.add('hand');
        revealedCardDiv.appendChild(createCardElement(cardToRevealEsclavo));

        const actionEsclavo = await displayModal(
            'Carta Mostrada (Esclavo)',
            revealedCardDiv,
            [{ text: 'Aceptar', action: 'confirm_modal_view' }],
            'view-hand-modal'
        );

        if (actionEsclavo === 'confirm_modal_view') {
            await roomRef.update({
                [`estadoJuego.modalConfirmations.${modalIdEsclavo}.${currentUserId}`]: true
            });
        }

        await awaitMultiPlayerModalConfirmation(modalIdEsclavo);

        state.ownPos = Math.min(13, ownPos + 1);
        gameMessageDiv.textContent += ` ¡Has mostrado la carta ${cardToRevealEsclavo.name} y avanzado 1 casilla!`;
        console.log("DEBUG: Esclavo: Avanza 1 casilla. Nueva posición:", state.ownPos);
    } else {
        gameMessageDiv.textContent += ' No tienes una carta mayor que 4 para mostrar.';
        console.log("DEBUG: Esclavo: No hay carta para mostrar.");
    }
}

async function effectLoco(state) {
    let { ownHand, rivalHand, ownPos, rivalPos, pilaDescarte, currentUserId, currentRivalId, roomData, roomRef, effectsActivos } = state;
    console.log("DEBUG: Efecto Loco activado.");

    if (isEffectBlockedByGuardaespaldas(currentRivalId, effectsActivos)) {
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} está protegido por Guardaespaldas. ¡El efecto Loco es bloqueado!`;
        return;
    }

    if (ownHand.length === 0 || rivalHand.length === 0) {
        gameMessageDiv.textContent = 'Uno de los jugadores no tiene cartas para el duelo del Loco.';
        return;
    }

    // --- LÓGICA CORREGIDA ---
    // Ambos jugadores eligen su carta para el duelo.

    // 1. El atacante (jugador actual) elige su carta.
    const ownCardsToChoose = await chooseCardsToDiscard(ownHand, 1, "Elige tu carta para el duelo del Loco");
    if (!ownCardsToChoose || ownCardsToChoose.length === 0) {
        gameMessageDiv.textContent = "No elegiste una carta para el duelo.";
        return;
    }
    const ownCardLocoId = ownCardsToChoose[0];
    const ownCardLoco = cardDefinitions.find(c => c.id === ownCardLocoId);


    // 2. Se informa al rival para que elija su carta.
    const modalIdLoco = `loco-${Date.now()}-${currentUserId}`;
    await roomRef.update({
        [`estadoJuego.modalConfirmations.${modalIdLoco}`]: {
            [currentUserId]: true,
            [currentRivalId]: false,
            type: 'choose_card_to_discard', // Reutilizamos este tipo de modal
            targetPlayerId: currentRivalId,
            initiatorId: currentUserId,
            numToDiscard: 1,
            chosenCardId: null
        }
    });

    gameMessageDiv.textContent = `Has elegido ${ownCardLoco.name}. Esperando a que ${opponentNameDisplay.textContent} elija su carta...`;

    // 3. Esperar a que el rival confirme su elección.
    await awaitMultiPlayerModalConfirmation(modalIdLoco);

    // 4. Obtener la elección del rival desde el estado actualizado de la sala.
    const updatedRoomDoc = await roomRef.get();
    const updatedGameState = updatedRoomDoc.data().estadoJuego;
    const rivalCardLocoId = updatedGameState.modalConfirmations[modalIdLoco]?.chosenCardId;

    if (!rivalCardLocoId) {
        gameMessageDiv.textContent = "El rival no eligió una carta. El efecto se cancela.";
        // Devolver la carta elegida a la mano del jugador
        return;
    }
    const rivalCardLoco = cardDefinitions.find(c => c.id === rivalCardLocoId);

    // 5. Mostrar a ambos el resultado de la comparación.
    const modalIdLocoView = `loco-view-${Date.now()}`;
    await roomRef.update({
        [`estadoJuego.modalConfirmations.${modalIdLocoView}`]: {
            [currentUserId]: true, [currentRivalId]: false, type: 'comparison',
            player1Card: ownCardLocoId, player2Card: rivalCardLocoId,
            player1Id: currentUserId, player2Id: currentRivalId
        }
    });
    await awaitMultiPlayerModalConfirmation(modalIdLocoView);
    
    // 6. Descartar las cartas elegidas de las manos de ambos jugadores.
    let indexOwn = ownHand.indexOf(ownCardLocoId);
    if (indexOwn > -1) ownHand.splice(indexOwn, 1);
    
    let indexRival = rivalHand.indexOf(rivalCardLocoId);
    if (indexRival > -1) rivalHand.splice(indexRival, 1);
    
    pilaDescarte.push(ownCardLocoId, rivalCardLocoId);
    console.log(`DEBUG: Loco: Descartadas: ${ownCardLoco.name} y ${rivalCardLoco.name}`);

    // 7. Aplicar efectos de avance/retroceso.
    gameMessageDiv.textContent = `Duelo del Loco: Tú (${ownCardLoco.name}) vs. Rival (${rivalCardLoco.name}).`;
    if (ownCardLoco.value > rivalCardLoco.value) {
        state.ownPos = Math.min(13, ownPos + 2);
        state.rivalPos = Math.max(0, rivalPos - 1);
        gameMessageDiv.textContent += ` ¡Ganas! Avanzas 2, el rival retrocede 1.`;
    } else if (rivalCardLoco.value > ownCardLoco.value) {
        state.ownPos = Math.max(0, ownPos - 1);
        state.rivalPos = Math.min(13, rivalPos + 2);
        gameMessageDiv.textContent += ` ¡Pierdes! Retrocedes 1, el rival avanza 2.`;
    } else {
        gameMessageDiv.textContent += ` Empate. Nadie se mueve.`;
    }
}

async function effectVagabundo(state) {
    let { ownHand, ownPos, rivalHand, currentUserId, currentRivalId, roomData, roomRef, pilaDescarte } = state;
    const isPlayer1 = roomData.jugador1Id === currentUserId;
    console.log("DEBUG: Efecto Vagabundo activado.");

    const targetPlayerIdVagabundo = await choosePlayer();

    if (ownHand.length === 0 || rivalHand.length === 0) {
        gameMessageDiv.textContent = 'Uno de los jugadores no tiene cartas para el efecto Vagabundo.';
        console.log("DEBUG: Vagabundo: Jugador sin cartas.");
        return;
    }

    const ownLowestCardInitial = ownHand.reduce((minCard, cardId) => {
        const card = cardDefinitions.find(c => c.id === cardId);
        return (!minCard || (card && card.value < minCard.value)) ? card : minCard;
    }, { value: Infinity });

    const rivalLowestCardInitial = rivalHand.reduce((minCard, cardId) => {
        const card = cardDefinitions.find(c => c.id === cardId);
        return (!minCard || (card && card.value < minCard.value)) ? card : minCard;
    }, { value: Infinity });

    if (ownLowestCardInitial.value !== Infinity && rivalLowestCardInitial.value !== Infinity) {
        const modalIdVagabundo = `vagabundo-${Date.now()}-${currentUserId}`;

        await roomRef.update({
            [`estadoJuego.modalConfirmations.${modalIdVagabundo}`]: {
                [currentUserId]: true,
                [currentRivalId]: false,
                type: 'comparison',
                player1Card: ownLowestCardInitial.id,
                player2Card: rivalLowestCardInitial.id,
                player1Id: currentUserId,
                player2Id: currentRivalId
            }
        });

        const comparisonCardsDivVagabundo = document.createElement('div');
        comparisonCardsDivVagabundo.classList.add('hand');
        comparisonCardsDivVagabundo.style.justifyContent = 'space-around';
        comparisonCardsDivVagabundo.style.width = '100%';
        comparisonCardsDivVagabundo.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <span>Tu Carta más Baja:</span>
                ${createCardElement(ownLowestCardInitial).outerHTML}
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <span>Carta más Baja del Rival:</span>
                ${createCardElement(rivalLowestCardInitial).outerHTML}
            </div>
        `;

        const actionVagabundo = await displayModal(
            'Comparación de Cartas (Vagabundo)',
            comparisonCardsDivVagabundo,
            [{ text: 'Aceptar', action: 'confirm_modal_view' }],
            'comparison-modal'
        );

        if (actionVagabundo === 'confirm_modal_view') {
            await roomRef.update({
                [`estadoJuego.modalConfirmations.${modalIdVagabundo}.${currentUserId}`]: true
            });
        }

        await awaitMultiPlayerModalConfirmation(modalIdVagabundo);

        const freshOwnLowestCard = ownHand.reduce((minCard, cardId) => {
            const card = cardDefinitions.find(c => c.id === cardId);
            return (!minCard || (card && card.value < minCard.value)) ? card : minCard;
        }, { value: Infinity });

        const freshRivalLowestCard = rivalHand.reduce((minCard, cardId) => {
            const card = cardDefinitions.find(c => c.id === cardId);
            return (!minCard || (card && card.value < minCard.value)) ? card : minCard;
        }, { value: Infinity });

        gameMessageDiv.textContent = `Comparando cartas más bajas: Tú ${freshOwnLowestCard.name}, Rival ${freshRivalLowestCard.name}.`;
        console.log("DEBUG: Vagabundo: Cartas más bajas (post-modal) - Propia:", freshOwnLowestCard.name, "Rival:", freshRivalLowestCard.name);

        if (freshOwnLowestCard.value < freshRivalLowestCard.value) {
            state.ownPos = Math.min(13, state.ownPos + 2);
            gameMessageDiv.textContent += ` Tu carta más baja (${freshOwnLowestCard.name}) es menor. Avanzas 2 casillas.`;
            console.log("DEBUG: Vagabundo: Avanza 2 casillas. Nueva posición:", state.ownPos);
        } else {
            gameMessageDiv.textContent += ` Tu carta más baja (${freshOwnLowestCard.name}) no es menor que la del rival.`;
            console.log("DEBUG: Vagabundo: No avanza.");
        }

    } else {
        gameMessageDiv.textContent = 'No se pudieron encontrar las cartas más bajas para la comparación.';
        console.log("DEBUG: Vagabundo: No se pudieron encontrar las cartas más bajas.");
    }
}

async function effectFilosofo(state) {
    let { ownHand, rivalHand, mazo, pilaDescarte, currentUserId, currentRivalId, roomData, roomRef } = state;
    const isPlayer1 = roomData.jugador1Id === currentUserId;
    console.log("DEBUG: Efecto Filósofo activado.");

    const targetPlayerIdFilosofo = await choosePlayer();
    let targetHandFilosofo = (isPlayer1 && targetPlayerIdFilosofo === currentRivalId) ? rivalHand : ownHand;

    const ownDrawnCardId = drawCardForEffect(mazo, pilaDescarte);
    const rivalDrawnCardId = drawCardForEffect(mazo, pilaDescarte);

    if (!ownDrawnCardId || !rivalDrawnCardId) {
        gameMessageDiv.textContent = 'No hay suficientes cartas en el mazo para el efecto Filósofo.';
        if (ownDrawnCardId) mazo.push(ownDrawnCardId);
        if (rivalDrawnCardId) mazo.push(rivalDrawnCardId);
        console.log("DEBUG: Filósofo: Mazo insuficiente.");
        return;
    }

    const ownDrawnCard = cardDefinitions.find(c => c.id === ownDrawnCardId);
    const rivalDrawnCard = cardDefinitions.find(c => c.id === rivalDrawnCardId);

    const modalIdFilosofo = `filosofo-${Date.now()}-${currentUserId}`;

    await roomRef.update({
        [`estadoJuego.modalConfirmations.${modalIdFilosofo}`]: {
            [currentUserId]: true,
            [currentRivalId]: false,
            type: 'comparison',
            player1Card: ownDrawnCardId,
            player2Card: rivalDrawnCardId,
            player1Id: currentUserId,
            player2Id: currentRivalId
        }
    });

    const comparisonCardsDiv = document.createElement('div');
    comparisonCardsDiv.classList.add('hand');
    comparisonCardsDiv.style.justifyContent = 'space-around';
    comparisonCardsDiv.style.width = '100%';
    comparisonCardsDiv.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <span>Tu Carta:</span>
            ${createCardElement(ownDrawnCard).outerHTML}
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <span>Carta del Rival:</span>
            ${createCardElement(rivalDrawnCard).outerHTML}
        </div>
    `;

    const actionFilosofo = await displayModal(
        'Comparación de Cartas (Filósofo)',
        comparisonCardsDiv,
        [{ text: 'Aceptar', action: 'confirm_modal_view' }],
        'comparison-modal'
    );

    if (actionFilosofo === 'confirm_modal_view') {
        await roomRef.update({
            [`estadoJuego.modalConfirmations.${modalIdFilosofo}.${currentUserId}`]: true
        });
    }

    await awaitMultiPlayerModalConfirmation(modalIdFilosofo);

    gameMessageDiv.textContent = `Ambos robáis: Tú ${ownDrawnCard.name}, Rival ${rivalDrawnCard.name}.`;
    console.log("DEBUG: Filósofo: Cartas robadas - Propia:", ownDrawnCard.name, "Rival:", rivalDrawnCard.name);

    if (ownDrawnCard.value > rivalDrawnCard.value) {
        ownHand.push(ownDrawnCardId);
        pilaDescarte.push(rivalDrawnCardId);
        gameMessageDiv.textContent += ` Tu carta es más alta, te la quedas y el rival descarta la suya.`;
        console.log("DEBUG: Filósofo: Propia más alta.");
    } else if (ownDrawnCard.value < rivalDrawnCard.value) {
        pilaDescarte.push(ownDrawnCardId);
        pilaDescarte.push(rivalDrawnCardId);
        gameMessageDiv.textContent += ` Tu carta es más baja, ambos descartáis las cartas.`;
        console.log("DEBUG: Filósofo: Rival más alta.");
    } else {
        pilaDescarte.push(ownDrawnCardId);
        pilaDescarte.push(rivalDrawnCardId);
        gameMessageDiv.textContent += ` Empate, ambos descartáis las cartas.`;
        console.log("DEBUG: Filósofo: Empate.");
    }
    if (isPlayer1 && targetPlayerIdFilosofo === currentRivalId) { state.rivalHand = targetHandFilosofo; } else if (targetPlayerIdFilosofo === currentUserId) { state.ownHand = targetHandFilosofo; }
}

async function effectNini(state) {
    let { ownHand, mazo, pilaDescarte } = state;
    console.log("DEBUG: Efecto Nini activado.");
    const newCardNini = drawCardForEffect(mazo, pilaDescarte);
    if (newCardNini) ownHand.push(newCardNini);
    gameMessageDiv.textContent += ' Has robado 1 carta.';
    console.log("DEBUG: Nini: Mano actualizada:", ownHand);
}

async function effectInfluencer(state) {
    let { ownHand, rivalHand, ownPos, rivalPos, currentUserId, currentRivalId, roomData, roomRef, effectsActivos, pilaDescarte } = state;
    const isPlayer1 = roomData.jugador1Id === currentUserId;
    console.log("DEBUG: Efecto Influencer activado.");

    const targetPlayerIdInfluencer = await choosePlayer();

    if (isEffectBlockedByGuardaespaldas(targetPlayerIdInfluencer, effectsActivos)) {
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} está protegido por Guardaespaldas. ¡El efecto Influencer es bloqueado!`;
        console.log("DEBUG: Influencer: Efecto bloqueado por Guardaespaldas.");
        return;
    }

    // Use the current state hands directly, do not re-fetch
    if (ownHand.length === 0 || rivalHand.length === 0) {
        gameMessageDiv.textContent = 'Uno de los jugadores no tiene cartas para el efecto Influencer.';
        console.log("DEBUG: Influencer: Jugador sin cartas.");
        return;
    }

    // Determine highest cards for modal display from current hands
    const ownHighestCardInitial = ownHand.reduce((maxCard, cardId) => {
        const card = cardDefinitions.find(c => c.id === cardId);
        return (!maxCard || (card && card.value > maxCard.value)) ? card : maxCard;
    }, { value: -Infinity });

    const rivalHighestCardInitial = rivalHand.reduce((maxCard, cardId) => {
        const card = cardDefinitions.find(c => c.id === cardId);
        return (!maxCard || (card && card.value > maxCard.value)) ? card : maxCard;
    }, { value: -Infinity });

    if (ownHighestCardInitial.value !== -Infinity && rivalHighestCardInitial.value !== -Infinity) {
        const modalIdInfluencer = `influencer-${Date.now()}-${currentUserId}`;

        await roomRef.update({
            [`estadoJuego.modalConfirmations.${modalIdInfluencer}`]: {
                [currentUserId]: true,
                [currentRivalId]: false,
                type: 'comparison',
                player1Card: ownHighestCardInitial.id,
                player2Card: rivalHighestCardInitial.id,
                player1Id: currentUserId,
                player2Id: currentRivalId
            }
        });

        const comparisonCardsDivInfluencer = document.createElement('div');
        comparisonCardsDivInfluencer.classList.add('hand');
        comparisonCardsDivInfluencer.style.justifyContent = 'space-around';
        comparisonCardsDivInfluencer.style.width = '100%';
        comparisonCardsDivInfluencer.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <span>Tu Carta más Alta:</span>
                ${createCardElement(ownHighestCardInitial).outerHTML}
            </div>
            <div style="display: flex; flex-direction: column; align-items: center; gap: 10px;">
                <span>Carta más Alta del Rival:</span>
                ${createCardElement(rivalHighestCardInitial).outerHTML}
            </div>
        `;

        const actionInfluencer = await displayModal(
            'Comparación de Cartas (Influencer)',
            comparisonCardsDivInfluencer,
            [{ text: 'Aceptar', action: 'confirm_modal_view' }],
            'comparison-modal'
        );

        if (actionInfluencer === 'confirm_modal_view') {
            await roomRef.update({
                [`estadoJuego.modalConfirmations.${modalIdInfluencer}.${currentUserId}`]: true
            });
        }

        await awaitMultiPlayerModalConfirmation(modalIdInfluencer);

        // No re-fetch here. Operate on the 'state' object directly.

        // Re-calculate highest cards from current hands (they haven't changed from Firestore yet)
        const freshOwnHighestCard = ownHand.reduce((maxCard, cardId) => {
            const card = cardDefinitions.find(c => c.id === cardId);
            return (!maxCard || (card && card.value > maxCard.value)) ? card : maxCard;
        }, { value: -Infinity });

        const freshRivalHighestCard = rivalHand.reduce((maxCard, cardId) => {
            const card = cardDefinitions.find(c => c.id === cardId);
            return (!maxCard || (card && card.value > maxCard.value)) ? card : maxCard;
        }, { value: -Infinity });

        gameMessageDiv.textContent = `Comparando cartas más altas: Tú ${freshOwnHighestCard.name}, Rival ${freshRivalHighestCard.name}.`;
        console.log("DEBUG: Influencer: Cartas más altas (post-modal) - Propia:", freshOwnHighestCard.name, "Rival:", freshRivalHighestCard.name);

        if (freshOwnHighestCard.value > freshRivalHighestCard.value) {
            state.ownPos = Math.min(13, state.ownPos + 1);
            state.rivalPos = Math.max(0, state.rivalPos - 1);
            gameMessageDiv.textContent += ` ¡Tú ganas! Avanzas 1, rival retrocede 1.`;
            console.log("DEBUG: Influencer: Gana propio. Posiciones:", state.ownPos, state.rivalPos);
        } else if (freshRivalHighestCard.value > freshOwnHighestCard.value) {
            state.ownPos = Math.max(0, state.ownPos - 1);
            state.rivalPos = Math.min(13, state.rivalPos + 1);
            gameMessageDiv.textContent += ` ¡El rival gana! Tú retrocedes 1, rival avanza 1.`;
            console.log("DEBUG: Influencer: Gana rival. Posiciones:", state.ownPos, state.rivalPos);
        } else {
            gameMessageDiv.textContent += ` Empate. Nadie avanza ni retrocede.`;
            console.log("DEBUG: Influencer: Empate.");
        }

    } else {
        gameMessageDiv.textContent = 'No se pudieron encontrar las cartas más altas para la comparación.';
        console.log("DEBUG: Influencer: No se pudieron encontrar las cartas más altas.");
    }
}

async function effectCamello(state) {
    let { ownHand, ownPos, mazo, pilaDescarte } = state;
    console.log("DEBUG: Efecto Camello activado.");
    const newCardCamello = drawCardForEffect(mazo, pilaDescarte);
    if (newCardCamello) ownHand.push(newCardCamello);
    gameMessageDiv.textContent = 'Has robado una carta. Ahora descarta una.';
    if (ownHand.length > 0) {
        const discardedCardsCamello = await chooseCardsToDiscard(ownHand, 1, ownNameDisplay.textContent);
        if (discardedCardsCamello && discardedCardsCamello.length > 0) {
            const discardedCardId = discardedCardsCamello[0];
            const index = ownHand.indexOf(discardedCardId);
            if (index > -1) {
                ownHand.splice(index, 1);
                pilaDescarte.push(discardedCardId);
                const discardedCardCamelloDef = cardDefinitions.find(c => c.id === discardedCardId);
                gameMessageDiv.textContent += ` Has descartado ${discardedCardCamelloDef.name}.`;
                console.log("DEBUG: Camello: Carta descartada:", discardedCardCamelloDef.name);
                if (discardedCardCamelloDef && discardedCardCamelloDef.value <= -1) {
                    state.ownPos = Math.min(13, ownPos + 1);
                    gameMessageDiv.textContent += ' ¡Y avanzas 1 casilla!';
                    console.log("DEBUG: Camello: Avanza 1 casilla. Nueva posición:", state.ownPos);
                }
            }
        } else {
            gameMessageDiv.textContent = 'No se seleccionó ninguna carta para descartar.';
            console.log("DEBUG: Camello: No se seleccionó ninguna carta para descartar.");
        }
    } else {
        gameMessageDiv.textContent += ' No tienes cartas para descartar.';
        console.log("DEBUG: Camello: No hay cartas para descartar.");
    }
}

async function effectTrabajador(state) {
    let { ownPos } = state;
    console.log("DEBUG: Efecto Trabajador activado.");
    state.ownPos = Math.min(13, ownPos + 1);
    gameMessageDiv.textContent += ' ¡Has avanzado 1 casilla!';
    console.log("DEBUG: Trabajador: Nueva posición:", state.ownPos);
}

async function effectArtesano(state) {
    let { ownPos } = state;
    console.log("DEBUG: Efecto Artesano activado.");
    if (ownPos >= 0 && ownPos <= 3) {
        state.ownPos = Math.min(13, ownPos + 2);
        gameMessageDiv.textContent += ' Avanzas 2 casillas.';
    } else if (ownPos >= 4) {
        state.ownPos = Math.min(13, ownPos + 1);
        gameMessageDiv.textContent += ' Avanzas 1 casilla.';
    }
    console.log("DEBUG: Artesano: Nueva posición:", state.ownPos);
}

async function effectPolicia(state) {
    let { ownPos, rivalPos, currentUserId, currentRivalId, effectsActivos } = state;
    console.log("DEBUG: Efecto Policía activado.");
    const targetPlayerIdPolicia = await choosePlayer();

    if (isEffectBlockedByGuardaespaldas(targetPlayerIdPolicia, effectsActivos)) {
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} está protegido por Guardaespaldas. ¡El efecto Policía es bloqueado!`;
        console.log("DEBUG: Policía: Efecto bloqueado por Guardaespaldas.");
        return;
    }

    if (targetPlayerIdPolicia === currentUserId) {
        state.ownPos = Math.max(0, ownPos - 1);
        gameMessageDiv.textContent = 'Has retrocedido 1 casilla.';
        console.log("DEBUG: Policía: Propio retrocede 1. Nueva posición:", state.ownPos);
    } else {
        state.rivalPos = Math.max(0, rivalPos - 1);
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} retrocede 1 casilla.`;
        console.log("DEBUG: Policía: Rival retrocede 1. Nueva posición:", state.rivalPos);
    }
}

async function effectDetective(state) {
    let { ownHand, rivalHand, ownPos, rivalPos, currentUserId, currentRivalId, roomData, effectsActivos } = state;
    const isPlayer1 = roomData.jugador1Id === currentUserId;
    console.log("DEBUG: Efecto Detective activado.");

    const targetPlayerIdDetective = await choosePlayer();
    const targetHandDetective = (isPlayer1 && targetPlayerIdDetective === currentRivalId) ? rivalHand : ownHand;

    if (isEffectBlockedByGuardaespaldas(targetPlayerIdDetective, effectsActivos)) {
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} está protegido por Guardaespaldas. ¡El efecto Detective es bloqueado!`;
        console.log("DEBUG: Detective: Efecto bloqueado por Guardaespaldas.");
        return;
    }

    const chosenCardIdDetective = await chooseCardFromAllDefinitions('Elige una carta para buscar en la mano del rival:');
    const cardToFind = cardDefinitions.find(c => c.id === chosenCardIdDetective);

    if (cardToFind && targetHandDetective.includes(cardToFind.id)) {
        gameMessageDiv.textContent = `${(targetPlayerIdDetective === currentUserId) ? ownNameDisplay.textContent : opponentNameDisplay.textContent} tiene la carta ${cardToFind.name} y retrocede 2 casillas.`;
        if (targetPlayerIdDetective === currentUserId) {
            state.ownPos = Math.max(0, ownPos - 2);
            console.log("DEBUG: Detective: Propio retrocede 2. Nueva posición:", state.ownPos);
        } else {
            state.rivalPos = Math.max(0, rivalPos - 2);
            console.log("DEBUG: Detective: Rival retrocede 2. Nueva posición:", state.rivalPos);
        }
    } else {
        gameMessageDiv.textContent = `${(targetPlayerIdDetective === currentUserId) ? ownNameDisplay.textContent : opponentNameDisplay.textContent} no tiene la carta ${cardToFind ? cardToFind.name : 'seleccionada'}.`;
        console.log("DEBUG: Detective: Carta no encontrada.");
    }
}

async function effectGuardaespaldas(state) {
    let { currentUserId, effectsActivos } = state;
    console.log("DEBUG: Efecto Guardaespaldas activado.");
    state.effectsActivos[currentUserId] = { guardaespaldas: true, turnosRestantes: 1 };
    gameMessageDiv.textContent = '¡Guardaespaldas activado! Estás protegido hasta tu próximo turno.';
    console.log("DEBUG: Guardaespaldas: Efecto activado para el jugador actual.");
}

async function effectAbogado(state) {
    let { ownHand, rivalHand, currentUserId } = state;
    console.log("DEBUG: Efecto Abogado activado.");
    const targetPlayerIdAbogado = await choosePlayer();

    if (targetPlayerIdAbogado === currentUserId) {
        gameMessageDiv.textContent = 'No puedes intercambiar cartas contigo mismo.';
        console.log("DEBUG: Abogado: Intento de intercambio consigo mismo.");
        return;
    }
    const tempHand = [...ownHand];
    state.ownHand.length = 0;
    state.ownHand.push(...rivalHand);
    state.rivalHand.length = 0;
    state.rivalHand.push(...tempHand);
    gameMessageDiv.textContent = '¡Has intercambiado manos con el rival!';
    console.log("DEBUG: Abogado: Manos intercambiadas.");
}

async function effectBanquero(state) {
    let { ownPos, lastPlayedCardId } = state;
    console.log("DEBUG: Efecto Banquero activado.");
    if (lastPlayedCardId) {
        const lastCard = cardDefinitions.find(c => c.id === lastPlayedCardId);
        if (lastCard && lastCard.value >= 7) {
            state.ownPos = Math.min(13, ownPos + 2);
            gameMessageDiv.textContent = `La última carta (${lastCard.name}) es >= 7. Avanzas 2 casillas.`;
            console.log("DEBUG: Banquero: Avanza 2 casillas. Nueva posición:", state.ownPos);
        } else {
            gameMessageDiv.textContent = `La última carta (${lastCard ? lastCard.name : 'ninguna'}) no es >= 7.`;
            console.log("DEBUG: Banquero: No avanza.");
        }
    } else {
        gameMessageDiv.textContent = 'No hay última carta jugada para Banquero.';
        console.log("DEBUG: Banquero: No hay última carta.");
    }
}

async function effectMusico(state) {
    let { ownHand, mazo, pilaDescarte } = state;
    console.log("DEBUG: Efecto Músico activado.");
    for (let i = 0; i < 2; i++) {
        const newCard = drawCardForEffect(mazo, pilaDescarte);
        if (newCard) ownHand.push(newCard);
    }
    gameMessageDiv.textContent = 'Has robado 2 cartas. Ahora descarta 2.';
    if (ownHand.length >= 2) {
        const discardedCardsMusico = await chooseCardsToDiscard(ownHand, 2, ownNameDisplay.textContent);
        if (discardedCardsMusico && discardedCardsMusico.length === 2) {
            discardedCardsMusico.forEach(cardId => {
                const index = ownHand.indexOf(cardId);
                if (index > -1) {
                    ownHand.splice(index, 1);
                    pilaDescarte.push(cardId);
                }
            });
            gameMessageDiv.textContent += ` Has descartado 2 cartas.`;
            console.log("DEBUG: Músico: Cartas descartadas.");
        } else {
            gameMessageDiv.textContent += ' No se seleccionaron 2 cartas para descartar.';
            console.log("DEBUG: Músico: No se seleccionaron 2 cartas para descartar.");
        }
    } else {
        gameMessageDiv.textContent += ' No tienes suficientes cartas para descartar.';
        console.log("DEBUG: Músico: No hay suficientes cartas para descartar.");
    }
}

async function effectArlequin(state) {
    let { ownHand, mazo, pilaDescarte } = state;
    console.log("DEBUG: Efecto Arlequín activado.");
    for (let i = 0; i < 2; i++) {
        const newCard = drawCardForEffect(mazo, pilaDescarte);
        if (newCard) ownHand.push(newCard);
    }
    gameMessageDiv.textContent = 'Has robado 2 cartas. Ahora descarta 1.';
    if (ownHand.length >= 1) {
        const discardedCardsArlequin = await chooseCardsToDiscard(ownHand, 1, ownNameDisplay.textContent);
        if (discardedCardsArlequin && discardedCardsArlequin.length === 1) {
            const discardedCardId = discardedCardsArlequin[0];
            const index = ownHand.indexOf(discardedCardId);
            if (index > -1) {
                ownHand.splice(index, 1);
                pilaDescarte.push(discardedCardId);
            }
            gameMessageDiv.textContent += ` Has descartado 1 carta.`;
            console.log("DEBUG: Arlequín: Carta descartada.");
        } else {
            gameMessageDiv.textContent += ' No se seleccionó 1 carta para descartar.';
            console.log("DEBUG: Arlequín: No se seleccionó 1 carta para descartar.");
        }
    } else {
        gameMessageDiv.textContent += ' No tienes cartas para descartar.';
        console.log("DEBUG: Arlequín: No hay cartas para descartar.");
    }
}

async function effectFutbolista(state) {
    let { ownHand, ownPos, pilaDescarte } = state;
    console.log("DEBUG: Efecto Futbolista activado.");
    if (ownHand.length > 0) {
        const discardedCardsFutbolista = await chooseCardsToDiscard(ownHand, 1, ownNameDisplay.textContent);
        if (discardedCardsFutbolista && discardedCardsFutbolista.length > 0) {
            const discardedCardId = discardedCardsFutbolista[0];
            const index = ownHand.indexOf(discardedCardId);
            if (index > -1) {
                ownHand.splice(index, 1);
                pilaDescarte.push(discardedCardId);
            }
            state.ownPos = Math.min(13, ownPos + 2);
            gameMessageDiv.textContent = 'Has descartado una carta y avanzado 2 casillas.';
            console.log("DEBUG: Futbolista: Avanza 2 casillas. Nueva posición:", state.ownPos);
        } else {
            gameMessageDiv.textContent = 'No se seleccionó ninguna carta para descartar.';
            console.log("DEBUG: Futbolista: No se seleccionó ninguna carta para descartar.");
        }
    } else {
        gameMessageDiv.textContent += ' No tienes cartas para descartar y usar Futbolista.';
        console.log("DEBUG: Futbolista: No hay cartas para descartar.");
    }
}

async function effectCapo(state) {
    let { ownPos, rivalPos, currentUserId, currentRivalId, effectsActivos } = state;
    console.log("DEBUG: Efecto Capo activado.");
    state.ownPos = Math.min(13, ownPos + 1);
    const targetPlayerIdCapo = await choosePlayer();

    if (isEffectBlockedByGuardaespaldas(targetPlayerIdCapo, effectsActivos)) {
        gameMessageDiv.textContent = `${opponentNameDisplay.textContent} está protegido por Guardaespaldas. ¡El efecto de retroceso de Capo es bloqueado!`;
        console.log("DEBUG: Capo: Efecto de retroceso bloqueado por Guardaespaldas.");
        gameMessageDiv.textContent = `Avanzas 1 casilla. ${opponentNameDisplay.textContent} está protegido por Guardaespaldas.`;
        return;
    }

    if (targetPlayerIdCapo === currentUserId) {
        state.ownPos = Math.max(0, ownPos - 1);
        gameMessageDiv.textContent = 'Avanzas 1, pero luego retrocedes 1 (te elegiste a ti mismo).';
        console.log("DEBUG: Capo: Propio avanza y retrocede. Nueva posición:", state.ownPos);
    } else {
        state.rivalPos = Math.max(0, rivalPos - 1);
        gameMessageDiv.textContent = `Avanzas 1 casilla. ${opponentNameDisplay.textContent} retrocede 1 casilla.`;
        console.log("DEBUG: Capo: Rival retrocede 1. Nueva posición:", state.rivalPos);
    }
}

async function effectPolitico(state) {
    let { ownHand, rivalHand, ownPos, mazo, pilaDescarte, currentUserId, currentRivalId } = state;
    console.log("DEBUG: Efecto Político activado.");
    state.ownPos = Math.min(13, ownPos + 1);

    const playerChoiceDiv = document.createElement('div');
    playerChoiceDiv.innerHTML = `<p>¿A quién quieres aplicar el efecto de descartar y robar cartas?</p>`;

    const chosenPlayerIdPolitico = await displayModal(
        'Efecto Político: Elegir Jugador',
        playerChoiceDiv,
        [
            { text: 'A mí', action: currentUserId },
            { text: 'Al Rival', action: currentRivalId }
        ]
    );

    let targetHandPolitico;
    let targetPlayerNamePolitico;

    if (chosenPlayerIdPolitico === currentUserId) {
        targetHandPolitico = ownHand;
        targetPlayerNamePolitico = ownNameDisplay.textContent;
    } else {
        targetHandPolitico = rivalHand;
        targetPlayerNamePolitico = opponentNameDisplay.textContent;
    }

    const numCardsToRedraw = targetHandPolitico.length;
    while(targetHandPolitico.length > 0) {
        pilaDescarte.push(targetHandPolitico.pop());
    }

    for (let i = 0; i < numCardsToRedraw; i++) {
        const newCard = drawCardForEffect(mazo, pilaDescarte);
        if (newCard) targetHandPolitico.push(newCard);
    }

    gameMessageDiv.textContent = `Avanzas 1 casilla. ${targetPlayerNamePolitico} ha descartado y robado cartas.`;
    console.log("DEBUG: Político: Cartas descartadas/robadas. Propio avanza 1.");

    if (chosenPlayerIdPolitico === currentUserId) {
        state.ownHand = targetHandPolitico;
    } else {
        state.rivalHand = targetHandPolitico;
    }
}

async function effectSectario(state) {
    let { ownHand, rivalHand, ownPos, currentUserId, currentRivalId, roomData, roomRef } = state;
    const isPlayer1 = roomData.jugador1Id === currentUserId;
    console.log("DEBUG: Efecto Sectario activado.");

    const targetPlayerIdSectario = await choosePlayer();

    // --- CORRECCIÓN ---
    // La línea original fue reemplazada por una más simple y correcta.
    // let targetHandSectario = (isPlayer1 && targetPlayerIdSectario === currentRivalId) ? rivalHand : ownHand; // <-- LÍNEA INCORRECTA ELIMINADA
    let targetHandSectario = rivalHand; // <-- NUEVA LÍNEA CORRECTA

    const modalIdSectario = `sectario-${Date.now()}-${currentUserId}`;

    await roomRef.update({
        [`estadoJuego.modalConfirmations.${modalIdSectario}`]: {
            [currentUserId]: true,
            [currentRivalId]: false,
            type: 'view_hand',
            targetHand: targetHandSectario,
            viewerId: currentUserId,
            targetId: targetPlayerIdSectario
        }
    });

    const rivalHandDisplayDivSectario = document.createElement('div');
    rivalHandDisplayDivSectario.classList.add('hand');
    if (targetHandSectario.length > 0) {
        targetHandSectario.forEach(cardId => {
            const card = cardDefinitions.find(c => c.id === cardId);
            if (card) {
                rivalHandDisplayDivSectario.appendChild(createCardElement(card));
            }
        });
    } else {
        rivalHandDisplayDivSectario.textContent = 'El rival no tiene cartas en la mano.';
    }

    const exchangeDecision = await displayModal(
        'Cartas del Rival (Sectario)',
        rivalHandDisplayDivSectario,
        [
            { text: 'Intercambiar Cartas', action: 'exchange' },
            { text: 'No Intercambiar', action: 'no_exchange' }
        ],
        'view-hand-modal'
    );

    await roomRef.update({
        [`estadoJuego.modalConfirmations.${modalIdSectario}.${currentUserId}`]: true
    });

    await awaitMultiPlayerModalConfirmation(modalIdSectario);

    if (exchangeDecision === 'exchange') {
        if (targetPlayerIdSectario !== currentUserId) {
            const tempHand = [...ownHand];
            state.ownHand.length = 0;
            state.ownHand.push(...targetHandSectario);
            targetHandSectario.length = 0;
            targetHandSectario.push(...tempHand);
            gameMessageDiv.textContent = '¡Has intercambiado manos!';
            console.log("DEBUG: Sectario: Manos intercambiadas.");
        } else {
            gameMessageDiv.textContent = 'No puedes intercambiar contigo mismo.';
        }
    } else {
        gameMessageDiv.textContent = 'Has decidido no intercambiar cartas.';
    }

    state.ownPos = Math.min(13, ownPos + 1);

    // --- CORRECCIÓN ---
    // Se elimina esta línea final porque ya no es necesaria y podía causar errores.
    // if (isPlayer1 && targetPlayerIdSectario === currentRivalId) { state.rivalHand = targetHandSectario; } else if (targetPlayerIdSectario === currentUserId) { state.ownHand = targetHandSectario; }
}

async function effectAstronauta(state) {
    let { ownHand, ownPos, mazo, pilaDescarte } = state;
    console.log("DEBUG: Efecto Astronauta activado.");
    state.ownPos = Math.min(13, ownPos + 1);
    if (ownPos >= 8) {
        const newCard = drawCardForEffect(mazo, pilaDescarte);
        if (newCard) ownHand.push(newCard);
        gameMessageDiv.textContent += ' ¡Y has robado 1 carta!';
        console.log("DEBUG: Astronauta: Roba 1 carta.");
    }
    console.log("DEBUG: Astronauta: Nueva posición:", state.ownPos);
}

async function effectArcangel(state) {
    let { ownHand, ownPos, mazo, pilaDescarte } = state;
    console.log("DEBUG: Efecto Arcángel activado.");
    state.ownPos = Math.min(13, ownPos + 1);
    for (let i = 0; i < 3; i++) {
        const newCard = drawCardForEffect(mazo, pilaDescarte);
        if (newCard) ownHand.push(newCard);
    }
    gameMessageDiv.textContent = 'Avanzas 1 casilla y robas 3 cartas. Ahora descarta 2.';
    if (ownHand.length >= 2) {
        const discardedCardsArcangel = await chooseCardsToDiscard(ownHand, 2, ownNameDisplay.textContent);
        if (discardedCardsArcangel && discardedCardsArcangel.length === 2) {
            discardedCardsArcangel.forEach(cardId => {
                const index = ownHand.indexOf(cardId);
                if (index > -1) {
                    ownHand.splice(index, 1);
                    pilaDescarte.push(cardId);
                }
            });
            gameMessageDiv.textContent += ` Has descartado 2 cartas.`;
            console.log("DEBUG: Arcángel: Cartas descartadas.");
        } else {
            gameMessageDiv.textContent += ' No se seleccionaron 2 cartas para descartar.';
            console.log("DEBUG: Arcángel: No se seleccionaron 2 cartas para descartar.");
        }
    } else {
        gameMessageDiv.textContent += ' No tienes suficientes cartas para descartar.';
        console.log("DEBUG: Arcángel: No hay suficientes cartas para descartar.");
    }
}

async function effectSemidios(state) {
    let { ownPos } = state;
    console.log("DEBUG: Efecto Semidiós activado.");
    state.ownPos = Math.min(13, ownPos + 1);
    state.repeatTurn = true; // Establece la bandera para que `passTurn` la detecte
    gameMessageDiv.textContent += ' Avanzas 1 casilla y repites tu turno.';
    console.log("DEBUG: Semidiós: Repite turno. Nueva posición:", state.ownPos);
}

async function effectOjoTodoVe(state) {
    let { ownPos, rivalHand, currentUserId, currentRivalId, roomRef } = state;
    console.log("DEBUG: Efecto Ojo que todo lo ve activado.");
    state.ownPos = Math.min(13, ownPos + 1);

    const modalIdOjo = `ojotodove-${Date.now()}-${currentUserId}`;

    await roomRef.update({
        [`estadoJuego.modalConfirmations.${modalIdOjo}`]: {
            [currentUserId]: true,
            [currentRivalId]: false,
            type: 'view_hand',
            targetHand: rivalHand,
            viewerId: currentUserId,
            targetId: currentRivalId
        }
    });

    const rivalHandDisplayDivOjo = document.createElement('div');
    rivalHandDisplayDivOjo.classList.add('hand');
    if (rivalHand.length > 0) {
        rivalHand.forEach(cardId => {
            const card = cardDefinitions.find(c => c.id === cardId);
            if (card) {
                rivalHandDisplayDivOjo.appendChild(createCardElement(card));
            }
        });
    } else {
        rivalHandDisplayDivOjo.textContent = 'El rival no tiene cartas en la mano.';
    }

    const actionOjo = await displayModal(
        'Cartas del Rival (Ojo que todo lo ve)',
        rivalHandDisplayDivOjo,
        [{ text: 'Aceptar', action: 'confirm_modal_view' }],
        'view-hand-modal'
    );

    if (actionOjo === 'confirm_modal_view') {
        await roomRef.update({
            [`estadoJuego.modalConfirmations.${modalIdOjo}.${currentUserId}`]: true
        });
    }

    await awaitMultiPlayerModalConfirmation(modalIdOjo);

    gameMessageDiv.textContent = `Avanzas 1 casilla. Has visto las cartas del rival.`;
    console.log("DEBUG: Ojo que todo lo ve: Cartas del rival mostradas.");
}

// --- Mapa de efectos de cartas ---
const cardEffects = {
    'muerte': effectMuerte,
    'avefenix': effectAveFenix,
    'gato': effectGato,
    'caballodetroya': effectCaballoDeTroya,
    'ranadelasuerte': effectRanaDeLaSuerte,
    'perro': effectPerro,
    'esclavo': effectEsclavo,
    'loco': effectLoco,
    'vagabundo': effectVagabundo,
    'filosofo': effectFilosofo,
    'nini': effectNini,
    'influencer': effectInfluencer,
    'camello': effectCamello,
    'trabajador': effectTrabajador,
    'artesano': effectArtesano,
    'policia': effectPolicia,
    'detective': effectDetective,
    'guardaespaldas': effectGuardaespaldas,
    'abogado': effectAbogado,
    'banquero': effectBanquero,
    'musico': effectMusico,
    'arlequin': effectArlequin,
    'futbolista': effectFutbolista,
    'capo': effectCapo,
    'politico': effectPolitico,
    'sectario': effectSectario,
    'astronauta': effectAstronauta,
    'arcangel': effectArcangel,
    'semidios': effectSemidios,
    'ojotodove': effectOjoTodoVe,
};

// Función principal para aplicar los efectos de las cartas
async function applyCardEffect(card, state) {
    console.log(`DEBUG: applyCardEffect - Aplicando efecto de carta: ${card.name}`);
    console.log("DEBUG: applyCardEffect - Estado inicial del efecto:", { ownHand: [...state.ownHand], rivalHand: [...state.rivalHand], ownPos: state.ownPos, rivalPos: state.rivalPos, mazo: [...state.mazo], pilaDescarte: [...state.pilaDescarte], effectsActivos: {...state.effectsActivos} });

    const effectFunction = cardEffects[card.id];

    if (effectFunction) {
        await effectFunction(state);
    } else {
        console.warn('DEBUG: Efecto de carta no implementado:', card.name);
        gameMessageDiv.textContent = `Has jugado ${card.name}.`;
    }

    console.log("DEBUG: applyCardEffect - Estado final del efecto:", { ownHand: [...state.ownHand], rivalHand: [...state.rivalHand], ownPos: state.ownPos, rivalPos: state.rivalPos, mazo: [...state.mazo], pilaDescarte: [...state.pilaDescarte], effectsActivos: {...state.effectsActivos} });
}

// Las funciones passTurn, resetGame, awaitMultiPlayerModalConfirmation, etc.,
// y las variables globales como cardDefinitions, gameMessageDiv, etc.,
// deben seguir estando disponibles en el scope global o importarse adecuadamente.
// Por ejemplo, el contenido de funciones.js y cons.js y constantes.js
// debería cargarse antes de este archivo en index.html.
