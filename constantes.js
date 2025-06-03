// Definición de las cartas
const cardDefinitions = [
    { id: 'muerte', name: 'Muerte', value: -4.9, effect: 'Elige a un jugador, ese jugador pone sus cartas boca abajo y tú descartas 1 de las cartas. Si esa carta vale 0 o menos, avanzas 1 casilla.', count: 1, image: muerte },
    { id: 'avefenix', name: 'Ave Fénix', value: -3.3, effect: 'Descarta tu mano y roba 3 cartas.', count: 1, image: fenix },
    { id: 'gato', name: 'Gato', value: -3, effect: 'Roba 2 cartas.', count: 1, image: gato },
    { id: 'caballodetroya', name: 'Caballo de Troya', value: -2.6, effect: 'Elige a un jugador, ese jugador elige 1 de sus cartas y la descarta.', count: 1, image: troya },
    { id: 'ranadelasuerte', name: 'Rana de la Suerte', value: -2, effect: 'Avanza 2 casillas.', count: 1, image: rana },
    { id: 'perro', name: 'Perro', value: -4, effect: 'Repites tu turno.', count: 1, image: perro }, // Efecto actualizado aquí
    { id: 'esclavo', name: 'Esclavo', value: -1, effect: 'Si tienes una carta mayor que 4, puedes mostrarla para avanzar 1 casilla.', count: 2, image: esclavo },
    { id: 'loco', name: 'Loco', value: -0.5, effect: 'Elige a un jugador, ambos mostráis 1 de vuestras cartas, la más alta gana. Ambas cartas son descartadas. El jugador ganador avanza 2 casillas y el perdedor retrocede 1.', count: 1, image: loco },
    { id: 'vagabundo', name: 'Vagabundo', value: 0, effect: 'Compara tu carta más baja con la carta más baja de otro jugador, si tu carta es más baja, avanza 2 casillas.', count: 3, image:  vagabundo },
    { id: 'filosofo', name: 'Filósofo', value: 0.5, effect: 'Elige a un jugador, ambos robáis una carta y la mostráis, si tu carta es más alta, te la quedas y el otro jugador descarta la carta robada. Si tu carta es más baja, ambos jugadores descartáis las cartas robadas.', count: 1, image: filosofo },
    { id: 'nini', name: 'Nini', value: 1, effect: 'Roba 1 carta.', count: 5, image: nini },
    { id: 'influencer', name: 'Influencer', value: 2, effect: 'Compara tu carta más alta con la carta más alta del jugador que elijas. El ganador avanza 1 casilla, el perdedor retrocede 1 casilla.', count: 3, image: influencer },
    { id: 'camello', name: 'Camello', value: 2.1, effect: 'Roba 1 carta, descarta 1 carta. Si muestras una carta de -1 o menor, avanza 1 casilla.', count: 1, image: camello },
    { id: 'trabajador', name: 'Trabajador', value: 3, effect: 'Avanza 1 casilla.', count: 5, image: trabajador },
    { id: 'artesano', name: 'Artesano', value: 3.1, effect: 'Si estás en la casilla 0, 1, 2 o 3, avanza 2 casillas. Si estás en la 4 o superior, avanza 1.', count: 1, image: artesano },
    { id: 'policia', name: 'Policía', value: 4, effect: 'Elige 1 jugador, ese jugador retrocede 1 casilla.', count: 4, image: policia },
    { id: 'detective', name: 'Detective', value: 4.7, effect: 'Elige a un jugador y una carta, si ese jugador tiene esa carta: la muestra y retrocede 2 casillas.', count: 1, image: detective },
    { id: 'guardaespaldas', name: 'Guardaespaldas', value: 4.9, effect: 'Hasta tu próximo turno, las cartas del resto de jugadores, no te afectan.', count: 2, image: capo },
    { id: 'abogado', name: 'Abogado', value: 5, effect: 'Intercambia las cartas con otro jugador.', count: 3, image: abogado },
    { id: 'banquero', name: 'Banquero', value: 5.9, effect: 'Si la última carta jugada es igual o mayor que 7, avanzas 2 casillas.', count: 1, image: banquero },
    { id: 'musico', name: 'Músico', value: 6, effect: 'Roba 2 cartas y descarta 2 cartas.', count: 2, image: musico },
    { id: 'arlequin', name: 'Arlequín', value: 6.4, effect: 'Roba 2 cartas y descarta 1.', count: 1, image: arlequin },
    { id: 'futbolista', name: 'Futbolista', value: 6.7, effect: 'Descarta 1 carta para avanzar 2 casillas.', count: 1, image: futbolista },
    { id: 'capo', name: 'Capo', value: 7, effect: 'Avanzas 1 casilla. Elige un jugador, el jugador elegido retrocede 1 casilla.', count: 2, image: capo },
    { id: 'politico', name: 'Político', value: 8, effect: 'Un jugador, (puedes ser tú), descarta sus cartas y roba la misma cantidad. Avanzas 1 casilla.', count: 1, image: politico },
    { id: 'sectario', name: 'Sectario', value: 9, effect: 'Elige un jugador y mira sus cartas, puedes intercambiar tus cartas por las suyas. Avanzas 1 casilla.', count: 1, image: sectario },
    { id: 'astronauta', name: 'Astronauta', value: 10.5, effect: 'Avanza 1 casilla. Si estás en la casilla 8 o superior, roba 1 carta.', count: 1, image: astronauta },
    // Mago y Titán excluidos por ahora
    { id: 'arcangel', name: 'Arcángel', value: 12, effect: 'Avanza 1 casilla. Roba 3 cartas y descarta 2.', count: 1, image: arcangel },
    { id: 'semidios', name: 'Semidiós', value: 13, effect: 'Avanza 1 casilla. Repite tu turno.', count: 1, image: semidios },
    { id: 'ojotodove', name: 'Ojo que todo lo ve', value: 13.9, effect: 'Avanza 1 casilla. Mira las cartas de todos los jugadores.', count: 1, image: ojo }
];

// Lista de IDs de cartas con efectos adversos que pueden ser bloqueados por Guardaespaldas
const adverseEffectCards = [
    'muerte', 'caballodetroya', 'loco', 'influencer', 'policia', 'detective', 'capo'
];
