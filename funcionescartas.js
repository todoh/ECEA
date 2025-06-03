// Este archivo contiene las funciones de efecto para cada carta.
// Reciben un objeto `state` que contiene el estado actual del juego
// y referencias a `firebaseService`, `uiManager`, `gameLogic`, etc.

// Función auxiliar para robar cartas, manejando el barajado del descarte (para efectos)
// Esta es una versión local para los efectos, que usa el GameLogic.drawCard
const drawCardForEffect = (state, count = 1) => {
    return state.gameLogic.drawCard(state.mazo, state.pilaDescarte, count);
};

// Función para añadir un efecto activo a un jugador
const addActiveEffect = (state, targetPlayerId, effectId, effectName, duration) => {
    const effectsKey = (targetPlayerId === state.jugador1Id) ? 'effectsActivosJugador1' : 'effectsActivosJugador2';
    state[effectsKey] = state[effectsKey] || {};
    state[effectsKey][effectId] = { name: effectName, duration: duration };
    console.log(`DEBUG: Efecto '${effectName}' añadido a ${targetPlayerId} con duración ${duration}.`);
};

// --- Efectos de las cartas ---

const effectMuerte = async (state) => {
    state.uiManager.showGameMessage('Efecto Muerte: Elige un jugador...');
    const chosenPlayerId = await state.firebaseService.choosePlayer(state.currentUserId, state.rivalId, state.jugador1Id, state.jugador2Id, state.jugador1Nombre, state.jugador2Nombre);

    if (!chosenPlayerId) {
        state.uiManager.showGameMessage('No se eligió ningún jugador. Efecto Muerte cancelado.');
        return;
    }

    const isChosenPlayer1 = (chosenPlayerId === state.jugador1Id);
    const chosenPlayerHandKey = isChosenPlayer1 ? 'manoJugador1' : 'manoJugador2';
    const currentHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';

    // El jugador elegido pone sus cartas boca abajo (no se manipula directamente aquí, es un concepto visual)
    // Tú descartas 1 carta de las cartas del jugador elegido
    state.uiManager.showGameMessage(`Efecto Muerte: ${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre} pone sus cartas boca abajo. Ahora elige una carta de tu mano para descartar.`);

    const cardToDiscardId = await state.firebaseService.chooseCardsToDiscard(state[currentHandKey], 1, 'Elige una carta de tu mano para descartar.');

    if (!cardToDiscardId) {
        state.uiManager.showGameMessage('No se eligió carta para descartar. Efecto Muerte cancelado.');
        return;
    }

    const discardedCardIndex = state[currentHandKey].findIndex(c => c.id === cardToDiscardId);
    if (discardedCardIndex !== -1) {
        const discardedCard = state[currentHandKey].splice(discardedCardIndex, 1)[0];
        state.pilaDescarte.push(discardedCard);
        state.uiManager.showGameMessage(`Has descartado ${discardedCard.name}.`);

        // Si la carta descartada vale 0 o menos, avanzas 1 casilla.
        if (discardedCard.value <= 0) {
            if (state.currentUserId === state.jugador1Id) {
                state.ownPos = Math.min(14, state.ownPos + 1);
            } else {
                state.ownPos = Math.min(14, state.ownPos + 1);
            }
            state.uiManager.showGameMessage('¡La carta descartada valía 0 o menos! Avanzas 1 casilla.');
        }
    }
};

const effectAveFenix = async (state) => {
    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';
    state.pilaDescarte.push(...state[ownHandKey].splice(0)); // Descarta toda la mano
    state.uiManager.showGameMessage('Efecto Ave Fénix: Has descartado tu mano.');

    const newCards = drawCardForEffect(state, 3);
    state[ownHandKey].push(...newCards);
    state.uiManager.showGameMessage('Has robado 3 cartas nuevas.');
};

const effectGato = async (state) => {
    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';
    const newCards = drawCardForEffect(state, 2);
    state[ownHandKey].push(...newCards);
    state.uiManager.showGameMessage('Efecto Gato: Has robado 2 cartas.');
};

const effectCaballoDeTroya = async (state) => {
    state.uiManager.showGameMessage('Efecto Caballo de Troya: Elige un jugador para que descarte una carta.');
    const chosenPlayerId = await state.firebaseService.choosePlayer(state.currentUserId, state.rivalId, state.jugador1Id, state.jugador2Id, state.jugador1Nombre, state.jugador2Nombre);

    if (!chosenPlayerId) {
        state.uiManager.showGameMessage('No se eligió ningún jugador. Efecto Caballo de Troya cancelado.');
        return;
    }

    const isChosenPlayer1 = (chosenPlayerId === state.jugador1Id);
    const chosenPlayerHandKey = isChosenPlayer1 ? 'manoJugador1' : 'manoJugador2';

    if (state[chosenPlayerHandKey].length === 0) {
        state.uiManager.showGameMessage(`El jugador elegido (${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre}) no tiene cartas para descartar.`);
        return;
    }

    state.uiManager.showGameMessage(`Esperando a que ${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre} elija una carta para descartar...`);

    // El jugador elegido debe elegir una carta para descartar
    const discardedCardId = await state.firebaseService.requestPlayerDiscardCard(chosenPlayerId, state.currentUserId, state[chosenPlayerHandKey]);

    if (!discardedCardId) {
        state.uiManager.showGameMessage('El jugador elegido no descartó ninguna carta. Efecto Caballo de Troya cancelado.');
        return;
    }

    const discardedCardIndex = state[chosenPlayerHandKey].findIndex(c => c.id === discardedCardId);
    if (discardedCardIndex !== -1) {
        const discardedCard = state[chosenPlayerHandKey].splice(discardedCardIndex, 1)[0];
        state.pilaDescarte.push(discardedCard);
        state.uiManager.showGameMessage(`${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre} ha descartado ${discardedCard.name}.`);
    }
};

const effectRanaDeLaSuerte = async (state) => {
    if (state.currentUserId === state.jugador1Id) {
        state.ownPos = Math.min(14, state.ownPos + 2);
    } else {
        state.ownPos = Math.min(14, state.ownPos + 2);
    }
    state.uiManager.showGameMessage('Efecto Rana de la Suerte: Avanzas 2 casillas.');
};

const effectPerro = async (state) => {
    state.repeatTurn = true;
    state.uiManager.showGameMessage('Efecto Perro: ¡Repites tu turno!');
};

const effectEsclavo = async (state) => {
    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';
    const hasHighCard = state[ownHandKey].some(card => card.value > 4);

    if (hasHighCard) {
        const confirm = await state.firebaseService.confirmAction(state.currentUserId, state.currentUserId, 'Tienes una carta mayor que 4. ¿Quieres mostrarla para avanzar 1 casilla?');
        if (confirm) {
            if (state.currentUserId === state.jugador1Id) {
                state.ownPos = Math.min(14, state.ownPos + 1);
            } else {
                state.ownPos = Math.min(14, state.ownPos + 1);
            }
            state.uiManager.showGameMessage('Efecto Esclavo: Has mostrado una carta mayor que 4 y avanzas 1 casilla.');
        } else {
            state.uiManager.showGameMessage('Efecto Esclavo: No mostraste una carta. No avanzas.');
        }
    } else {
        state.uiManager.showGameMessage('Efecto Esclavo: No tienes una carta mayor que 4. No puedes avanzar.');
    }
};

const effectGranjero = async (state) => {
    if (state.currentUserId === state.jugador1Id) {
        state.ownPos = Math.min(14, state.ownPos + 1);
    } else {
        state.ownPos = Math.min(14, state.ownPos + 1);
    }
    state.uiManager.showGameMessage('Efecto Granjero: Avanzas 1 casilla.');
};

const effectLadron = async (state) => {
    state.uiManager.showGameMessage('Efecto Ladrón: Elige un jugador para robarle una carta.');
    const chosenPlayerId = await state.firebaseService.choosePlayer(state.currentUserId, state.rivalId, state.jugador1Id, state.jugador2Id, state.jugador1Nombre, state.jugador2Nombre);

    if (!chosenPlayerId) {
        state.uiManager.showGameMessage('No se eligió ningún jugador. Efecto Ladrón cancelado.');
        return;
    }

    const isChosenPlayer1 = (chosenPlayerId === state.jugador1Id);
    const chosenPlayerHandKey = isChosenPlayer1 ? 'manoJugador1' : 'manoJugador2';
    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';

    if (state[chosenPlayerHandKey].length > 0) {
        const randomIndex = Math.floor(Math.random() * state[chosenPlayerHandKey].length);
        const stolenCard = state[chosenPlayerHandKey].splice(randomIndex, 1)[0];
        state[ownHandKey].push(stolenCard);
        state.uiManager.showGameMessage(`Has robado una carta de ${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre}.`);
    } else {
        state.uiManager.showGameMessage(`El jugador elegido (${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre}) no tiene cartas para robar.`);
    }
};

const effectMercader = async (state) => {
    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';
    const newCards = drawCardForEffect(state, 1);
    state[ownHandKey].push(...newCards);
    state.uiManager.showGameMessage('Efecto Mercader: Robas 1 carta.');

    if (state[ownHandKey].length >= 5) {
        state.uiManager.showGameMessage('Tienes 5 o más cartas. Elige 1 para descartar.');
        const cardToDiscardId = await state.firebaseService.chooseCardsToDiscard(state[ownHandKey], 1, 'Elige una carta de tu mano para descartar.');

        if (cardToDiscardId) {
            const discardedCardIndex = state[ownHandKey].findIndex(c => c.id === cardToDiscardId);
            if (discardedCardIndex !== -1) {
                const discardedCard = state[ownHandKey].splice(discardedCardIndex, 1)[0];
                state.pilaDescarte.push(discardedCard);
                state.uiManager.showGameMessage(`Has descartado ${discardedCard.name}.`);
            }
        } else {
            state.uiManager.showGameMessage('No se eligió carta para descartar.');
        }
    }
};

const effectSoldado = async (state) => {
    if (state.currentUserId === state.jugador1Id) {
        state.ownPos = Math.min(14, state.ownPos + 1);
    } else {
        state.ownPos = Math.min(14, state.ownPos + 1);
    }
    state.uiManager.showGameMessage('Efecto Soldado: Avanzas 1 casilla.');

    if (state.ownPos >= 5) {
        if (state.currentUserId === state.jugador1Id) {
            state.ownPos = Math.min(14, state.ownPos + 1);
        } else {
            state.ownPos = Math.min(14, state.ownPos + 1);
        }
        state.uiManager.showGameMessage('¡Estás en la casilla 5 o superior! Avanzas 1 casilla adicional.');
    }
};

const effectMedico = async (state) => {
    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';
    if (state[ownHandKey].length <= 3) {
        const newCards = drawCardForEffect(state, 2);
        state[ownHandKey].push(...newCards);
        state.uiManager.showGameMessage('Efecto Médico: Tienes 3 o menos cartas. Robas 2 cartas.');
    } else {
        state.uiManager.showGameMessage('Efecto Médico: Tienes más de 3 cartas. No robas.');
    }
};

const effectArtista = async (state) => {
    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';
    if (state[ownHandKey].length === 0) {
        state.uiManager.showGameMessage('Efecto Artista: No tienes cartas para descartar.');
        return;
    }

    state.uiManager.showGameMessage('Efecto Artista: Puedes descartar hasta 2 cartas para robar la misma cantidad.');
    const numToDiscard = await state.firebaseService.chooseNumberOfCardsToDiscard(state.currentUserId, state[ownHandKey].length, 2);

    if (numToDiscard > 0) {
        const cardsToDiscardIds = await state.firebaseService.chooseCardsToDiscard(state[ownHandKey], numToDiscard, `Elige ${numToDiscard} carta(s) para descartar.`);
        if (cardsToDiscardIds && cardsToDiscardIds.length === numToDiscard) {
            cardsToDiscardIds.forEach(cardId => {
                const index = state[ownHandKey].findIndex(c => c.id === cardId);
                if (index !== -1) {
                    state.pilaDescarte.push(state[ownHandKey].splice(index, 1)[0]);
                }
            });
            state.uiManager.showGameMessage(`Has descartado ${numToDiscard} carta(s).`);
            const newCards = drawCardForEffect(state, numToDiscard);
            state[ownHandKey].push(...newCards);
            state.uiManager.showGameMessage(`Has robado ${numToDiscard} carta(s) nueva(s).`);
        } else {
            state.uiManager.showGameMessage('No se descartaron cartas. Efecto Artista cancelado.');
        }
    } else {
        state.uiManager.showGameMessage('No se descartaron cartas. Efecto Artista cancelado.');
    }
};

const effectFutbolista = async (state) => {
    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';
    if (state[ownHandKey].length === 0) {
        state.uiManager.showGameMessage('Efecto Futbolista: No tienes cartas para descartar.');
        return;
    }

    state.uiManager.showGameMessage('Efecto Futbolista: Descarta 1 carta para avanzar 2 casillas.');
    const cardToDiscardId = await state.firebaseService.chooseCardsToDiscard(state[ownHandKey], 1, 'Elige una carta para descartar.');

    if (cardToDiscardId) {
        const discardedCardIndex = state[ownHandKey].findIndex(c => c.id === cardToDiscardId);
        if (discardedCardIndex !== -1) {
            state.pilaDescarte.push(state[ownHandKey].splice(discardedCardIndex, 1)[0]);
            if (state.currentUserId === state.jugador1Id) {
                state.ownPos = Math.min(14, state.ownPos + 2);
            } else {
                state.ownPos = Math.min(14, state.ownPos + 2);
            }
            state.uiManager.showGameMessage('Has descartado una carta y avanzas 2 casillas.');
        }
    } else {
        state.uiManager.showGameMessage('No se descartó ninguna carta. Efecto Futbolista cancelado.');
    }
};

const effectCapo = async (state) => {
    if (state.currentUserId === state.jugador1Id) {
        state.ownPos = Math.min(14, state.ownPos + 1);
    } else {
        state.ownPos = Math.min(14, state.ownPos + 1);
    }
    state.uiManager.showGameMessage('Efecto Capo: Avanzas 1 casilla.');

    state.uiManager.showGameMessage('Efecto Capo: Elige un jugador para que retroceda 1 casilla.');
    const chosenPlayerId = await state.firebaseService.choosePlayer(state.currentUserId, state.rivalId, state.jugador1Id, state.jugador2Id, state.jugador1Nombre, state.jugador2Nombre);

    if (!chosenPlayerId) {
        state.uiManager.showGameMessage('No se eligió ningún jugador. Efecto Capo cancelado.');
        return;
    }

    if (chosenPlayerId === state.jugador1Id) {
        state.posicionJugador1 = Math.max(0, state.posicionJugador1 - 1);
        state.uiManager.showGameMessage(`${state.jugador1Nombre} retrocede 1 casilla.`);
    } else {
        state.posicionJugador2 = Math.max(0, state.posicionJugador2 - 1);
        state.uiManager.showGameMessage(`${state.jugador2Nombre} retrocede 1 casilla.`);
    }
};

const effectPolitico = async (state) => {
    state.uiManager.showGameMessage('Efecto Político: Elige un jugador para que descarte sus cartas y robe la misma cantidad.');
    const chosenPlayerId = await state.firebaseService.choosePlayer(state.currentUserId, state.rivalId, state.jugador1Id, state.jugador2Id, state.jugador1Nombre, state.jugador2Nombre);

    if (!chosenPlayerId) {
        state.uiManager.showGameMessage('No se eligió ningún jugador. Efecto Político cancelado.');
        return;
    }

    const isChosenPlayer1 = (chosenPlayerId === state.jugador1Id);
    const chosenPlayerHandKey = isChosenPlayer1 ? 'manoJugador1' : 'manoJugador2';

    const numDiscarded = state[chosenPlayerHandKey].length;
    state.pilaDescarte.push(...state[chosenPlayerHandKey].splice(0)); // Descarta toda la mano
    state.uiManager.showGameMessage(`${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre} ha descartado ${numDiscarded} cartas.`);

    const newCards = drawCardForEffect(state, numDiscarded);
    state[chosenPlayerHandKey].push(...newCards);
    state.uiManager.showGameMessage(`${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre} ha robado ${numDiscarded} cartas nuevas.`);

    if (state.currentUserId === state.jugador1Id) {
        state.ownPos = Math.min(14, state.ownPos + 1);
    } else {
        state.ownPos = Math.min(14, state.ownPos + 1);
    }
    state.uiManager.showGameMessage('Avanzas 1 casilla.');
};

const effectSectario = async (state) => {
    state.uiManager.showGameMessage('Efecto Sectario: Elige un jugador para mirar sus cartas e intercambiar manos.');
    const chosenPlayerId = await state.firebaseService.choosePlayer(state.currentUserId, state.rivalId, state.jugador1Id, state.jugador2Id, state.jugador1Nombre, state.jugador2Nombre);

    if (!chosenPlayerId) {
        state.uiManager.showGameMessage('No se eligió ningún jugador. Efecto Sectario cancelado.');
        return;
    }

    const isChosenPlayer1 = (chosenPlayerId === state.jugador1Id);
    const chosenPlayerHandKey = isChosenPlayer1 ? 'manoJugador1' : 'manoJugador2';
    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';

    // Mostrar las cartas del rival (solo al jugador actual)
    state.uiManager.showGameMessage(`Las cartas de ${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre} son:`);
    const rivalCardsContent = document.createElement('div');
    rivalCardsContent.classList.add('modal-card-display');
    state[chosenPlayerHandKey].forEach(card => {
        rivalCardsContent.appendChild(state.uiManager.createCardElement(card));
    });
    await state.uiManager.displayModal(`Cartas de ${isChosenPlayer1 ? state.jugador1Nombre : state.jugador2Nombre}`, rivalCardsContent, [{ text: 'Aceptar', onClick: () => state.uiManager.resolveModal(true) }]);

    const confirmSwap = await state.firebaseService.confirmAction(state.currentUserId, state.currentUserId, '¿Quieres intercambiar tu mano por la suya?');

    if (confirmSwap) {
        // Intercambiar manos
        const tempHand = [...state[ownHandKey]];
        state[ownHandKey].splice(0, state[ownHandKey].length, ...state[chosenPlayerHandKey]);
        state[chosenPlayerHandKey].splice(0, state[chosenPlayerHandKey].length, ...tempHand);
        state.uiManager.showGameMessage('¡Manos intercambiadas!');
    } else {
        state.uiManager.showGameMessage('No se intercambiaron las manos.');
    }

    if (state.currentUserId === state.jugador1Id) {
        state.ownPos = Math.min(14, state.ownPos + 1);
    } else {
        state.ownPos = Math.min(14, state.ownPos + 1);
    }
    state.uiManager.showGameMessage('Avanzas 1 casilla.');
};

const effectAstronauta = async (state) => {
    if (state.currentUserId === state.jugador1Id) {
        state.ownPos = Math.min(14, state.ownPos + 1);
    } else {
        state.ownPos = Math.min(14, state.ownPos + 1);
    }
    state.uiManager.showGameMessage('Efecto Astronauta: Avanzas 1 casilla.');

    if (state.ownPos >= 8) {
        const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';
        const newCards = drawCardForEffect(state, 1);
        state[ownHandKey].push(...newCards);
        state.uiManager.showGameMessage('¡Estás en la casilla 8 o superior! Robas 1 carta.');
    }
};

const effectArcangel = async (state) => {
    if (state.currentUserId === state.jugador1Id) {
        state.ownPos = Math.min(14, state.ownPos + 1);
    } else {
        state.ownPos = Math.min(14, state.ownPos + 1);
    }
    state.uiManager.showGameMessage('Efecto Arcángel: Avanzas 1 casilla.');

    const ownHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador1' : 'manoJugador2';
    const newCards = drawCardForEffect(state, 3);
    state[ownHandKey].push(...newCards);
    state.uiManager.showGameMessage('Robas 3 cartas.');

    if (state[ownHandKey].length > 0) {
        state.uiManager.showGameMessage('Ahora descarta 2 cartas.');
        const cardsToDiscardIds = await state.firebaseService.chooseCardsToDiscard(state[ownHandKey], 2, 'Elige 2 cartas para descartar.');

        if (cardsToDiscardIds && cardsToDiscardIds.length === 2) {
            cardsToDiscardIds.forEach(cardId => {
                const index = state[ownHandKey].findIndex(c => c.id === cardId);
                if (index !== -1) {
                    state.pilaDescarte.push(state[ownHandKey].splice(index, 1)[0]);
                }
            });
            state.uiManager.showGameMessage('Has descartado 2 cartas.');
        } else {
            state.uiManager.showGameMessage('No se descartaron las 2 cartas. Asegúrate de seleccionar 2.');
        }
    } else {
        state.uiManager.showGameMessage('No tienes cartas para descartar.');
    }
};

const effectSemidios = async (state) => {
    if (state.currentUserId === state.jugador1Id) {
        state.ownPos = Math.min(14, state.ownPos + 1);
    } else {
        state.ownPos = Math.min(14, state.ownPos + 1);
    }
    state.uiManager.showGameMessage('Efecto Semidiós: Avanzas 1 casilla.');
    state.repeatTurn = true;
    state.uiManager.showGameMessage('¡Repites tu turno!');
};

const effectOjoTodoVe = async (state) => {
    state.uiManager.showGameMessage('Efecto Ojo que todo lo ve: Mira la mano de tu rival y descarta 1 carta.');
    const rivalId = (state.currentUserId === state.jugador1Id) ? state.jugador2Id : state.jugador1Id;
    const rivalHandKey = (state.currentUserId === state.jugador1Id) ? 'manoJugador2' : 'manoJugador1';
    const rivalName = (state.currentUserId === state.jugador1Id) ? state.jugador2Nombre : state.jugador1Nombre;

    if (state[rivalHandKey].length === 0) {
        state.uiManager.showGameMessage(`Tu rival (${rivalName}) no tiene cartas en la mano.`);
        return;
    }

    // Mostrar las cartas del rival para que el jugador actual elija
    const chosenCardId = await state.firebaseService.chooseCardFromAllDefinitions(state[rivalHandKey], `Elige una carta de la mano de ${rivalName} para descartar.`, true);

    if (!chosenCardId) {
        state.uiManager.showGameMessage('No se eligió ninguna carta para descartar. Efecto Ojo que todo lo ve cancelado.');
        return;
    }

    const discardedCardIndex = state[rivalHandKey].findIndex(c => c.id === chosenCardId);
    if (discardedCardIndex !== -1) {
        const discardedCard = state[rivalHandKey].splice(discardedCardIndex, 1)[0];
        state.pilaDescarte.push(discardedCard);
        state.uiManager.showGameMessage(`Has descartado ${discardedCard.name} de la mano de ${rivalName}.`);
    } else {
        state.uiManager.showError('La carta seleccionada no se encontró en la mano del rival. Esto no debería ocurrir.');
    }
};


// Mapeo de IDs de cartas a sus funciones de efecto
window.cardEffects = {
    'muerte': effectMuerte,
    'avefenix': effectAveFenix,
    'gato': effectGato,
    'caballodetroya': effectCaballoDeTroya,
    'ranadelasuerte': effectRanaDeLaSuerte,
    'perro': effectPerro,
    'esclavo': effectEsclavo,
    'granjero': effectGranjero,
    'ladron': effectLadron,
    'mercader': effectMercader,
    'soldado': effectSoldado,
    'medico': effectMedico,
    'artista': effectArtista,
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
// Esta función es llamada por GameLogic
window.applyCardEffect = async function(card, state) {
    console.log(`DEBUG: applyCardEffect - Aplicando efecto de carta: ${card.name}`);
    console.log("DEBUG: applyCardEffect - Estado inicial del efecto:", { ownHand: [...state.ownHand], rivalHand: [...state.rivalHand], ownPos: state.ownPos, rivalPos: state.rivalPos, mazo: [...state.mazo], pilaDescarte: [...state.pilaDescarte], effectsActivos: {...state.effectsActivos} });

    const effectFunction = window.cardEffects[card.id];

    if (effectFunction) {
        await effectFunction(state);
    } else {
        console.warn('DEBUG: Efecto de carta no implementado:', card.name);
        state.uiManager.showGameMessage(`Has jugado ${card.name}.`);
    }

    console.log("DEBUG: applyCardEffect - Estado final del efecto:", { ownHand: [...state.ownHand], rivalHand: [...state.rivalHand], ownPos: state.ownPos, rivalPos: state.rivalPos, mazo: [...state.mazo], pilaDescarte: [...state.pilaDescarte], effectsActivos: {...state.effectsActivos} });
};
