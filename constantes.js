// Definición de las cartas
// Las rutas de las imágenes deben ser relativas o absolutas válidas
// Si las imágenes no se cargan, se usará un placeholder
const muerte = '[https://placehold.co/60x80/cccccc/333333?text=Muerte](https://placehold.co/60x80/cccccc/333333?text=Muerte)';
const fenix = '[https://placehold.co/60x80/cccccc/333333?text=Fenix](https://placehold.co/60x80/cccccc/333333?text=Fenix)';
const gato = '[https://placehold.co/60x80/cccccc/333333?text=Gato](https://placehold.co/60x80/cccccc/333333?text=Gato)';
const troya = '[https://placehold.co/60x80/cccccc/333333?text=Troya](https://placehold.co/60x80/cccccc/333333?text=Troya)';
const rana = '[https://placehold.co/60x80/cccccc/333333?text=Rana](https://placehold.co/60x80/cccccc/333333?text=Rana)';
const perro = '[https://placehold.co/60x80/cccccc/333333?text=Perro](https://placehold.co/60x80/cccccc/333333?text=Perro)';
const esclavo = '[https://placehold.co/60x80/cccccc/333333?text=Esclavo](https://placehold.co/60x80/cccccc/333333?text=Esclavo)';
const granjero = '[https://placehold.co/60x80/cccccc/333333?text=Granjero](https://placehold.co/60x80/cccccc/333333?text=Granjero)';
const ladron = '[https://placehold.co/60x80/cccccc/333333?text=Ladron](https://placehold.co/60x80/cccccc/333333?text=Ladron)';
const mercader = '[https://placehold.co/60x80/cccccc/333333?text=Mercader](https://placehold.co/60x80/cccccc/333333?text=Mercader)';
const soldado = '[https://placehold.co/60x80/cccccc/333333?text=Soldado](https://placehold.co/60x80/cccccc/333333?text=Soldado)';
const medico = '[https://placehold.co/60x80/cccccc/333333?text=Medico](https://placehold.co/60x80/cccccc/333333?text=Medico)';
const mago = '[https://placehold.co/60x80/cccccc/333333?text=Mago](https://placehold.co/60x80/cccccc/333333?text=Mago)'; // Asegúrate de que esta imagen exista si la usas
const titan = '[https://placehold.co/60x80/cccccc/333333?text=Titan](https://placehold.co/60x80/cccccc/333333?text=Titan)'; // Asegúrate de que esta imagen exista si la usas
const artista = '[https://placehold.co/60x80/cccccc/333333?text=Artista](https://placehold.co/60x80/cccccc/333333?text=Artista)';
const futbolista = '[https://placehold.co/60x80/cccccc/333333?text=Futbolista](https://placehold.co/60x80/cccccc/333333?text=Futbolista)';
const capo = '[https://placehold.co/60x80/cccccc/333333?text=Capo](https://placehold.co/60x80/cccccc/333333?text=Capo)';
const politico = '[https://placehold.co/60x80/cccccc/333333?text=Politico](https://placehold.co/60x80/cccccc/333333?text=Politico)';
const sectario = '[https://placehold.co/60x80/cccccc/333333?text=Sectario](https://placehold.co/60x80/cccccc/333333?text=Sectario)';
const astronauta = '[https://placehold.co/60x80/cccccc/333333?text=Astronauta](https://placehold.co/60x80/cccccc/333333?text=Astronauta)';
const arcangel = '[https://placehold.co/60x80/cccccc/333333?text=Arcangel](https://placehold.co/60x80/cccccc/333333?text=Arcangel)';
const semidios = '[https://placehold.co/60x80/cccccc/333333?text=Semidios](https://placehold.co/60x80/cccccc/333333?text=Semidios)';
const ojoTodoVe = '[https://placehold.co/60x80/cccccc/333333?text=OjoTodoVe](https://placehold.co/60x80/cccccc/333333?text=OjoTodoVe)';


window.cardDefinitions = [
    { id: 'muerte', name: 'Muerte', value: -4.9, effect: 'Elige a un jugador, ese jugador pone sus cartas boca abajo y tú descartas 1 de las cartas. Si esa carta vale 0 o menos, avanzas 1 casilla.', count: 1, image: muerte },
    { id: 'avefenix', name: 'Ave Fénix', value: -3.3, effect: 'Descarta tu mano y roba 3 cartas.', count: 1, image: fenix },
    { id: 'gato', name: 'Gato', value: -3, effect: 'Roba 2 cartas.', count: 1, image: gato },
    { id: 'caballodetroya', name: 'Caballo de Troya', value: -2.6, effect: 'Elige a un jugador, ese jugador elige 1 de sus cartas y la descarta.', count: 1, image: troya },
    { id: 'ranadelasuerte', name: 'Rana de la Suerte', value: -2, effect: 'Avanza 2 casillas.', count: 1, image: rana },
    { id: 'perro', name: 'Perro', value: -4, effect: 'Repites tu turno.', count: 1, image: perro }, // Efecto actualizado aquí
    { id: 'esclavo', name: 'Esclavo', value: -1, effect: 'Si tienes una carta mayor que 4, puedes mostrarla para avanzar 1 casilla.', count: 2, image: esclavo },
    { id: 'granjero', name: 'Granjero', value: 0.5, effect: 'Avanza 1 casilla.', count: 2, image: granjero },
    { id: 'ladron', name: 'Ladrón', value: 1, effect: 'Elige un jugador y roba 1 carta de su mano al azar.', count: 2, image: ladron },
    { id: 'mercader', name: 'Mercader', value: 2, effect: 'Roba 1 carta. Si tienes 5 o más cartas, descarta 1.', count: 2, image: mercader },
    { id: 'soldado', name: 'Soldado', value: 3, effect: 'Avanza 1 casilla. Si estás en la casilla 5 o superior, avanza 1 casilla adicional.', count: 2, image: soldado },
    { id: 'medico', name: 'Médico', value: 4, effect: 'Si tienes 3 o menos cartas, roba 2 cartas.', count: 1, image: medico },
    { id: 'artista', name: 'Artista', value: 5.5, effect: 'Puedes descartar hasta 2 cartas para robar la misma cantidad.', count: 1, image: artista },
    { id: 'futbolista', name: 'Futbolista', value: 6.7, effect: 'Descarta 1 carta para avanzar 2 casillas.', count: 1, image: futbolista },
    { id: 'capo', name: 'Capo', value: 7, effect: 'Avanzas 1 casilla. Elige un jugador, el jugador elegido retrocede 1 casilla.', count: 2, image: capo },
    { id: 'politico', name: 'Político', value: 8, effect: 'Un jugador, (puedes ser tú), descarta sus cartas y roba la misma cantidad. Avanzas 1 casilla.', count: 1, image: politico },
    { id: 'sectario', name: 'Sectario', value: 9, effect: 'Elige un jugador y mira sus cartas, puedes intercambiar tus cartas por las suyas. Avanzas 1 casilla.', count: 1, image: sectario },
    { id: 'astronauta', name: 'Astronauta', value: 10.5, effect: 'Avanza 1 casilla. Si estás en la casilla 8 o superior, roba 1 carta.', count: 1, image: astronauta },
    // Mago y Titán excluidos por ahora
    { id: 'arcangel', name: 'Arcángel', value: 12, effect: 'Avanza 1 casilla. Roba 3 cartas y descarta 2.', count: 1, image: arcangel },
    { id: 'semidios', name: 'Semidiós', value: 13, effect: 'Avanza 1 casilla. Repite tu turno.', count: 1, image: semidios },
    { id: 'ojotodove', name: 'Ojo que todo lo ve', value: 14, effect: 'Mira la mano de tu rival y descarta 1 carta de su mano.', count: 1, image: ojoTodoVe },
];
