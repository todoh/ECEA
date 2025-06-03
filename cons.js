      // Tu configuración de Firebase
        const firebaseConfig = {
            apiKey: "AIzaSyAfK_AOq-Pc2bzgXEzIEZ1ESWvnhMJUvwI",
            authDomain: "enraya-51670.firebaseapp.com",
            databaseURL: "https://enraya-51670-default-rtdb.europe-west1.firebasedatabase.app",
            projectId: "enraya-51670",
            storageBucket: "enraya-51670.appspot.com",
            messagingSenderId: "103343380727",
            appId: "1:103343380727:web:b2fa02aee03c9506915bf2",
            measurementId: "G-2G31LLJY1T"
        };

        // Inicializar Firebase
        const app = firebase.initializeApp(firebaseConfig);
        const auth = firebase.auth();
        const db = firebase.firestore();

        // Referencias a los elementos de las pantallas
        const screen1 = document.getElementById('screen1');
        const screen2 = document.getElementById('screen2');
        const screen3 = document.getElementById('screen3');

        const playerNameInput = document.getElementById('playerName');
        const btnEnterName = document.getElementById('btnEnterName');
        const nameError = document.getElementById('nameError');

        const rivalNameInputScreen1 = document.getElementById('rivalNameScreen1');
        const rivalErrorScreen1 = document.getElementById('rivalErrorScreen1');

        const ownNameDisplay = document.getElementById('ownNameDisplay');
        const opponentNameDisplay = document.getElementById('opponentNameDisplay');
        const opponentHandDiv = document.getElementById('opponentHand');
        const ownHandDiv = document.getElementById('ownHand');
        const gameBoardDiv = document.getElementById('gameBoard');
        const discardPileDiv = document.getElementById('discardPile');
        const gameMessageDiv = document.getElementById('gameMessage');

        const cardInteractionModal = document.getElementById('cardInteractionModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalButtons = document.getElementById('modalButtons');

        const ownActiveEffectsDiv = document.getElementById('ownActiveEffects');
        const opponentActiveEffectsDiv = document.getElementById('opponentActiveEffects');

        const gameOverTitle = document.getElementById('gameOverTitle');
        const winnerDisplay = document.getElementById('winnerDisplay');
        const playerNamesDisplay = document.getElementById('playerNamesDisplay');
        const playerNameInputScreen2 = document.getElementById('playerNameScreen2');
        const rivalNameInputScreen2 = document.getElementById('rivalNameScreen2');

        const btnPassTurn = document.getElementById('btnPassTurn');
        const btnRematch = document.getElementById('btnRematch');

        // Lógica del juego (omitida para brevedad)...

        // Variables globales para los nombres de los jugadores y el estado de la partida
        let currentPlayerName = '';
        let rivalPlayerName = '';
        let currentUserId = ''; // UID de Firebase para el jugador actual
        let currentRivalId = ''; // UID de Firebase para el rival
        let currentRoomId = ''; // ID del documento de la sala en Firestore
        let unsubscribeSnapshot = null; // Para desuscribirse de los listeners de Firestore

