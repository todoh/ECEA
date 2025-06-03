
        // Función para cambiar de pantalla
        function showScreen(screenToShow) {
            screen1.classList.remove('active');
            screen2.classList.remove('active'); // Asegurarse de que screen2 también se desactive
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
                        <img src="${card.image}" alt="${card.name}">
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
            console.log("Rendering own hand with card IDs:", hand); // Añadido para depuración
            ownHandDiv.innerHTML = '';
            hand.forEach(cardId => {
                const card = cardDefinitions.find(c => c.id === cardId);
                if (card) {
                    const cardElement = createCardElement(card);
                    cardElement.addEventListener('click', () => showCardOptions(cardElement, card));
                    ownHandDiv.appendChild(cardElement);
                } else {
                    console.warn("Card definition not found for ID:", cardId); // Añadido para depuración
                }
            });
        }

        // Función para renderizar la mano del oponente (boca abajo)
        function renderOpponentHand(numCards) {
            console.log("Rendering opponent hand with", numCards, "cards (face down)."); // Añadido para depuración
            opponentHandDiv.innerHTML = '';
            for (let i = 0; i < numCards; i++) {
                opponentHandDiv.appendChild(createCardElement({}, true)); // isFaceDown = true
            }
        }

        // Función para mostrar las opciones de una carta (jugar/nada)
        function showCardOptions(cardElement, card) {
            // Eliminar opciones anteriores si existen
            const existingOptions = document.querySelector('.card-options');
            if (existingOptions) {
                existingOptions.remove();
            }

            const optionsDiv = document.createElement('div');
            optionsDiv.classList.add('card-options');
            optionsDiv.style.left = `${cardElement.offsetLeft}px`;
            optionsDiv.style.top = `${cardElement.offsetTop - optionsDiv.offsetHeight - 10}px`; // Ajustar posición

            const playButton = document.createElement('button');
            playButton.textContent = 'Jugar';
            playButton.addEventListener('click', () => {
                playCard(card.id);
                optionsDiv.remove();
            });

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Nada';
            cancelButton.addEventListener('click', () => {
                optionsDiv.remove();
            });

            optionsDiv.appendChild(playButton);
            optionsDiv.appendChild(cancelButton);
            ownHandDiv.appendChild(optionsDiv); // Añadir al contenedor de la mano para posicionamiento relativo

            // Ajustar la posición después de añadirlo al DOM para que el offsetHeight sea correcto
            optionsDiv.style.top = `${cardElement.offsetTop - optionsDiv.offsetHeight - 10}px`;
            optionsDiv.style.left = `${cardElement.offsetLeft + (cardElement.offsetWidth / 2) - (optionsDiv.offsetWidth / 2)}px`;

            // Cerrar opciones si se clica fuera
            const closeOptions = (event) => {
                if (!optionsDiv.contains(event.target) && !cardElement.contains(event.target)) {
                    optionsDiv.remove();
                    document.removeEventListener('click', closeOptions);
                }
            };
            document.addEventListener('click', closeOptions);
        }


        // Función para renderizar el tablero lineal
        function renderGameBoard(player1Pos, player2Pos) {
            gameBoardDiv.innerHTML = ''; // Limpiar casillas existentes
            const numCells = 14; // De 0 a 13

            for (let i = 0; i < numCells; i++) {
                const cell = document.createElement('div');
                cell.classList.add('board-cell');
                cell.textContent = i;
                cell.dataset.cellIndex = i; // Almacenar el índice de la casilla
                gameBoardDiv.appendChild(cell);
            }

            // Renderizar tokens de jugador
            const player1Token = document.createElement('div');
            player1Token.classList.add('player-token', 'player1-token');
            player1Token.id = 'player1Token';
            gameBoardDiv.appendChild(player1Token);

            const player2Token = document.createElement('div');
            player2Token.classList.add('player-token', 'player2-token');
            player2Token.id = 'player2Token';
            gameBoardDiv.appendChild(player2Token);

            updatePlayerTokens(player1Pos, player2Pos);
        }

        // Función para actualizar la posición de los tokens de jugador en el tablero lineal
        function updatePlayerTokens(player1Pos, player2Pos) {
            const player1Token = document.getElementById('player1Token');
            const player2Token = document.getElementById('player2Token');
            const cells = gameBoardDiv.querySelectorAll('.board-cell');

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

        // Helper function to draw a card, handling reshuffling
        function drawCardForTurn(mazo, pilaDescarte, messageDiv) {
            if (mazo.length === 0) {
                if (pilaDescarte.length > 0) {
                    mazo.push(...shuffleArray(pilaDescarte));
                    pilaDescarte.length = 0;
                    messageDiv.textContent = '¡Mazo barajado con el descarte!';
                } else {
                    messageDiv.textContent = 'No hay cartas en el mazo ni en el descarte para robar.';
                    return null;
                }
            }
            return mazo.shift();
        }