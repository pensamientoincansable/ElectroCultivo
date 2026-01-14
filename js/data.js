// ============ DATOS DEL JUEGO ============

const gameData = {
    money: 500,
    energy: 100,
    maxEnergy: 100,
    level: 1,
    xp: 0,
    xpNeeded: 100,
    day: 1,
    season: 'autumn',
    year: 1,
    currentRegion: 'castillalamancha',
    unlockedRegions: ['castillalamancha'],
    farms: {},
    inventory: {
        seeds: {},
        harvests: {},
        tools: { azada: true }
    },
    electroculture: {
        copperAntenna: false,
        magneticPoles: false,
        pyramidStructure: false,
        electroStimulator: false,
        cosmicAntenna: false
    },
    selectedPlotIndex: null,
    guideMessageIndex: 0,
    isHolding: false,
    isSpraying: false,
    sprayTarget: null
};

let holdTimer = null;
let sprayTimer = null;
let harvestFruits = [];
let collectedFruits = 0;
let minigameInterval = null;
let minigameTimeout = null;
let minigameScore = 0;
let minigameType = null;

const guideMessages = [
    "¡Bienvenido, joven agricultor! Soy Pedro. Es otoño, la mejor época para sembrar cereales. Te he dado semillas de trigo, cebada y el valioso azafrán de La Mancha.",
    "Ve a la GRANJA (🌱) arriba. Verás un campo con parcelas de tierra. Haz clic en '+' para plantar.",
    "Cada planta produce rendimientos REALISTAS. Una vid de uvas te dará 8-15 kg, un naranjo 80-150 naranjas...",
    "El azafrán es el ORO de La Mancha. Una planta da 0.5-1.5g, ¡pero vale 200💰 el gramo!",
    "RIEGA tus cultivos (💧) para que crezcan 50% más rápido. Cada día pasa, tus plantas crecen.",
    "Cuando una planta BRILLE, está lista para cosechar. ¡Haz clic para recogerla!",
    "Juega MINIJUEGOS (🎮) para ganar dinero y energía extra. ¡El de riego es gratis!",
    "La ELECTROCULTURA (⚡) multiplica tus rendimientos. Compra antenas de cobre para empezar.",
    "Sube de NIVEL cosechando para desbloquear nuevas regiones con cultivos únicos.",
    "¡Buena suerte! Toca mi cara (👨‍🌾) si me necesitas. Ahora, ¡a plantar!"
];

// ============ REGIONES ============
const regions = {
    castillalamancha: {
        name: 'Castilla-La Mancha', level: 1, emoji: '🌾', farmSize: 12,
        crops: ['trigo', 'cebada', 'azafran', 'uva', 'girasol', 'almendra']
    },
    aragon: {
        name: 'Aragón', level: 2, emoji: '🍑', farmSize: 14,
        crops: ['trigo', 'cebada', 'melocoton', 'cereza', 'olivo', 'almendra', 'maiz']
    },
    extremadura: {
        name: 'Extremadura', level: 3, emoji: '🫒', farmSize: 14,
        crops: ['olivo', 'cereza', 'higo', 'tomate', 'pimiento']
    },
    larioja: {
        name: 'La Rioja', level: 4, emoji: '🍇', farmSize: 10,
        crops: ['uva', 'pimiento', 'champiñon', 'pera', 'manzana']
    },
    murcia: {
        name: 'Murcia', level: 5, emoji: '🍋', farmSize: 16,
        crops: ['limon', 'naranja', 'lechuga', 'brocoli', 'alcachofa', 'melon']
    },
    valencia: {
        name: 'Valencia', level: 6, emoji: '🍊', farmSize: 16,
        crops: ['naranja', 'arroz', 'tomate', 'kaki', 'albaricoque']
    },
    cataluna: {
        name: 'Cataluña', level: 7, emoji: '🌰', farmSize: 18,
        crops: ['uva', 'avellana', 'manzana', 'pera', 'olivo', 'fresa']
    },
    castillayleon: {
        name: 'Castilla y León', level: 8, emoji: '🌻', farmSize: 20,
        crops: ['trigo', 'cebada', 'lentejas', 'garbanzos', 'remolacha', 'patata', 'girasol']
    },
    navarra: {
        name: 'Navarra', level: 9, emoji: '🫑', farmSize: 16,
        crops: ['esparrago', 'pimiento', 'alcachofa', 'uva', 'melocoton']
    },
    paisvasco: {
        name: 'País Vasco', level: 10, emoji: '🍏', farmSize: 14,
        crops: ['manzana', 'pimiento', 'alubia', 'patata']
    },
    cantabria: {
        name: 'Cantabria', level: 11, emoji: '🥝', farmSize: 14,
        crops: ['manzana', 'kiwi', 'patata', 'maiz']
    },
    asturias: {
        name: 'Asturias', level: 12, emoji: '🍎', farmSize: 14,
        crops: ['manzana', 'kiwi', 'arandano', 'frambuesa']
    },
    galicia: {
        name: 'Galicia', level: 13, emoji: '🥔', farmSize: 16,
        crops: ['patata', 'pimiento', 'uva', 'kiwi', 'manzana']
    },
    madrid: {
        name: 'Madrid', level: 14, emoji: '🍓', farmSize: 12,
        crops: ['fresa', 'olivo', 'uva', 'melon', 'ajo']
    },
    andalucia: {
        name: 'Andalucía', level: 15, emoji: '🥑', farmSize: 24,
        crops: ['olivo', 'naranja', 'fresa', 'aguacate', 'mango', 'tomate', 'pimiento', 'almendra', 'uva', 'algodon']
    }
};

// ============ CULTIVOS ============
const crops = {
    // Cereales
    trigo: {
        name: 'Trigo', emoji: '🌾', seasons: ['autumn', 'winter'], growTime: 8, pricePerUnit: 0.25, seedPrice: 3,
        yieldMin: 3, yieldMax: 6, unit: 'kg', description: '3-6 kg de grano por m²'
    },
    cebada: {
        name: 'Cebada', emoji: '🌾', seasons: ['autumn', 'winter'], growTime: 7, pricePerUnit: 0.22, seedPrice: 2,
        yieldMin: 3, yieldMax: 5, unit: 'kg', description: '3-5 kg de grano por m²'
    },
    maiz: {
        name: 'Maíz', emoji: '🌽', seasons: ['spring', 'summer'], growTime: 6, pricePerUnit: 0.35, seedPrice: 4,
        yieldMin: 2, yieldMax: 4, unit: 'kg', description: '2-4 mazorcas grandes'
    },
    arroz: {
        name: 'Arroz', emoji: '🍚', seasons: ['spring', 'summer'], growTime: 7, pricePerUnit: 0.50, seedPrice: 5,
        yieldMin: 4, yieldMax: 8, unit: 'kg', description: '4-8 kg por m²'
    },
    // Hortalizas
    tomate: {
        name: 'Tomate', emoji: '🍅', seasons: ['spring', 'summer'], growTime: 4, pricePerUnit: 0.80, seedPrice: 5,
        yieldMin: 15, yieldMax: 25, unit: 'unid', description: '15-25 tomates por planta'
    },
    lechuga: {
        name: 'Lechuga', emoji: '🥬', seasons: ['spring', 'autumn'], growTime: 2, pricePerUnit: 0.50, seedPrice: 2,
        yieldMin: 1, yieldMax: 1, unit: 'unid', description: '1 lechuga grande'
    },
    pimiento: {
        name: 'Pimiento', emoji: '🫑', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 1.20, seedPrice: 4,
        yieldMin: 8, yieldMax: 15, unit: 'unid', description: '8-15 pimientos por planta'
    },
    brocoli: {
        name: 'Brócoli', emoji: '🥦', seasons: ['autumn', 'winter'], growTime: 4, pricePerUnit: 1.50, seedPrice: 3,
        yieldMin: 1, yieldMax: 2, unit: 'kg', description: '1-2 kg por planta'
    },
    alcachofa: {
        name: 'Alcachofa', emoji: '🌿', seasons: ['autumn', 'winter', 'spring'], growTime: 6, pricePerUnit: 2.00, seedPrice: 8,
        yieldMin: 10, yieldMax: 20, unit: 'unid', description: '10-20 alcachofas por planta'
    },
    esparrago: {
        name: 'Espárrago', emoji: '🌿', seasons: ['spring'], growTime: 5, pricePerUnit: 4.00, seedPrice: 10,
        yieldMin: 15, yieldMax: 25, unit: 'unid', description: '15-25 espárragos'
    },
    patata: {
        name: 'Patata', emoji: '🥔', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 0.40, seedPrice: 3,
        yieldMin: 8, yieldMax: 15, unit: 'kg', description: '8-15 kg por planta'
    },
    ajo: {
        name: 'Ajo', emoji: '🧄', seasons: ['autumn'], growTime: 8, pricePerUnit: 3.00, seedPrice: 4,
        yieldMin: 8, yieldMax: 12, unit: 'unid', description: '8-12 cabezas de ajo'
    },
    // Frutas de árbol
    naranja: {
        name: 'Naranja', emoji: '🍊', seasons: ['winter', 'spring'], growTime: 10, pricePerUnit: 0.30, seedPrice: 15,
        yieldMin: 80, yieldMax: 150, unit: 'unid', description: '80-150 naranjas por árbol'
    },
    limon: {
        name: 'Limón', emoji: '🍋', seasons: ['winter', 'spring'], growTime: 10, pricePerUnit: 0.35, seedPrice: 15,
        yieldMin: 60, yieldMax: 120, unit: 'unid', description: '60-120 limones por árbol'
    },
    manzana: {
        name: 'Manzana', emoji: '🍎', seasons: ['autumn'], growTime: 8, pricePerUnit: 0.40, seedPrice: 12,
        yieldMin: 100, yieldMax: 200, unit: 'unid', description: '100-200 manzanas por árbol'
    },
    pera: {
        name: 'Pera', emoji: '🍐', seasons: ['summer', 'autumn'], growTime: 7, pricePerUnit: 0.50, seedPrice: 12,
        yieldMin: 80, yieldMax: 150, unit: 'unid', description: '80-150 peras por árbol'
    },
    melocoton: {
        name: 'Melocotón', emoji: '🍑', seasons: ['summer'], growTime: 6, pricePerUnit: 0.60, seedPrice: 14,
        yieldMin: 60, yieldMax: 100, unit: 'unid', description: '60-100 melocotones'
    },
    cereza: {
        name: 'Cereza', emoji: '🍒', seasons: ['spring'], growTime: 5, pricePerUnit: 3.50, seedPrice: 20,
        yieldMin: 8, yieldMax: 15, unit: 'kg', description: '8-15 kg por árbol'
    },
    higo: {
        name: 'Higo', emoji: '🫐', seasons: ['summer', 'autumn'], growTime: 6, pricePerUnit: 2.50, seedPrice: 10,
        yieldMin: 30, yieldMax: 60, unit: 'unid', description: '30-60 higos por árbol'
    },
    albaricoque: {
        name: 'Albaricoque', emoji: '🍑', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 1.20, seedPrice: 12,
        yieldMin: 50, yieldMax: 100, unit: 'unid', description: '50-100 albaricoques'
    },
    kaki: {
        name: 'Kaki', emoji: '🍊', seasons: ['autumn'], growTime: 8, pricePerUnit: 1.50, seedPrice: 15,
        yieldMin: 60, yieldMax: 100, unit: 'unid', description: '60-100 kakis por árbol'
    },
    kiwi: {
        name: 'Kiwi', emoji: '🥝', seasons: ['autumn', 'winter'], growTime: 9, pricePerUnit: 1.80, seedPrice: 18,
        yieldMin: 40, yieldMax: 80, unit: 'unid', description: '40-80 kiwis por planta'
    },
    // Frutas pequeñas
    fresa: {
        name: 'Fresa', emoji: '🍓', seasons: ['spring'], growTime: 3, pricePerUnit: 4.00, seedPrice: 8,
        yieldMin: 0.5, yieldMax: 1, unit: 'kg', description: '0.5-1 kg por planta'
    },
    arandano: {
        name: 'Arándano', emoji: '🫐', seasons: ['summer'], growTime: 5, pricePerUnit: 8.00, seedPrice: 15,
        yieldMin: 2, yieldMax: 5, unit: 'kg', description: '2-5 kg por arbusto'
    },
    frambuesa: {
        name: 'Frambuesa', emoji: '🍇', seasons: ['summer'], growTime: 4, pricePerUnit: 7.00, seedPrice: 12,
        yieldMin: 1, yieldMax: 3, unit: 'kg', description: '1-3 kg por planta'
    },
    // Uva
    uva: {
        name: 'Uva', emoji: '🍇', seasons: ['summer', 'autumn'], growTime: 7, pricePerUnit: 1.50, seedPrice: 10,
        yieldMin: 8, yieldMax: 15, unit: 'kg', description: '8-15 kg por vid'
    },
    // Melones
    melon: {
        name: 'Melón', emoji: '🍈', seasons: ['summer'], growTime: 5, pricePerUnit: 1.20, seedPrice: 5,
        yieldMin: 2, yieldMax: 4, unit: 'unid', description: '2-4 melones por planta'
    },
    sandia: {
        name: 'Sandía', emoji: '🍉', seasons: ['summer'], growTime: 5, pricePerUnit: 0.80, seedPrice: 4,
        yieldMin: 1, yieldMax: 3, unit: 'unid', description: '1-3 sandías grandes'
    },
    // Tropicales
    aguacate: {
        name: 'Aguacate', emoji: '🥑', seasons: ['winter', 'spring'], growTime: 12, pricePerUnit: 2.50, seedPrice: 30,
        yieldMin: 60, yieldMax: 150, unit: 'unid', description: '60-150 aguacates por árbol'
    },
    mango: {
        name: 'Mango', emoji: '🥭', seasons: ['summer', 'autumn'], growTime: 14, pricePerUnit: 3.00, seedPrice: 40,
        yieldMin: 40, yieldMax: 100, unit: 'unid', description: '40-100 mangos por árbol'
    },
    // Legumbres
    lentejas: {
        name: 'Lentejas', emoji: '🫘', seasons: ['autumn', 'winter'], growTime: 6, pricePerUnit: 2.00, seedPrice: 4,
        yieldMin: 1, yieldMax: 2, unit: 'kg', description: '1-2 kg por m²'
    },
    garbanzos: {
        name: 'Garbanzos', emoji: '🫘', seasons: ['spring'], growTime: 7, pricePerUnit: 2.50, seedPrice: 5,
        yieldMin: 0.8, yieldMax: 1.5, unit: 'kg', description: '0.8-1.5 kg por m²'
    },
    alubia: {
        name: 'Alubia', emoji: '🫘', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 3.00, seedPrice: 6,
        yieldMin: 1, yieldMax: 2, unit: 'kg', description: '1-2 kg por m²'
    },
    // Frutos secos
    almendra: {
        name: 'Almendra', emoji: '🌰', seasons: ['summer', 'autumn'], growTime: 10, pricePerUnit: 6.00, seedPrice: 20,
        yieldMin: 5, yieldMax: 12, unit: 'kg', description: '5-12 kg por árbol'
    },
    avellana: {
        name: 'Avellana', emoji: '🌰', seasons: ['autumn'], growTime: 9, pricePerUnit: 5.00, seedPrice: 18,
        yieldMin: 4, yieldMax: 10, unit: 'kg', description: '4-10 kg por árbol'
    },
    // Especiales
    azafran: {
        name: 'Azafrán', emoji: '🌸', seasons: ['autumn'], growTime: 8, pricePerUnit: 200.00, seedPrice: 50,
        yieldMin: 0.5, yieldMax: 1.5, unit: 'g', description: '0.5-1.5 g por m² (¡Oro rojo!)'
    },
    olivo: {
        name: 'Aceitunas', emoji: '🫒', seasons: ['autumn', 'winter'], growTime: 12, pricePerUnit: 1.50, seedPrice: 25,
        yieldMin: 15, yieldMax: 30, unit: 'kg', description: '15-30 kg por olivo'
    },
    girasol: {
        name: 'Girasol', emoji: '🌻', seasons: ['summer'], growTime: 5, pricePerUnit: 0.80, seedPrice: 3,
        yieldMin: 0.5, yieldMax: 1, unit: 'kg', description: '0.5-1 kg de pipas'
    },
    champiñon: {
        name: 'Champiñón', emoji: '🍄', seasons: ['spring', 'autumn', 'winter'], growTime: 2, pricePerUnit: 3.00, seedPrice: 5,
        yieldMin: 2, yieldMax: 4, unit: 'kg', description: '2-4 kg por cultivo'
    },
    algodon: {
        name: 'Algodón', emoji: '☁️', seasons: ['summer'], growTime: 8, pricePerUnit: 1.80, seedPrice: 8,
        yieldMin: 2, yieldMax: 4, unit: 'kg', description: '2-4 kg por planta'
    },
    remolacha: {
        name: 'Remolacha', emoji: '🫐', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 0.60, seedPrice: 3,
        yieldMin: 3, yieldMax: 6, unit: 'kg', description: '3-6 kg por m²'
    }
};

// ============ HERRAMIENTAS ============
const tools = {
    azada: { name: 'Azada Básica', emoji: '⛏️', price: 0, effect: 'Permite cultivar' },
    regadera: { name: 'Regadera Pro', emoji: '🚿', price: 200, effect: '-50% coste de riego' },
    tractor: { name: 'Tractor', emoji: '🚜', price: 3000, effect: '-20% tiempo crecimiento' },
    invernadero: { name: 'Invernadero', emoji: '🏠', price: 8000, effect: 'Ignora temporadas' },
    sistemaRiego: { name: 'Riego Automático', emoji: '💧', price: 5000, effect: 'Riego diario gratis' }
};

// ============ ELECTROCULTURA ============
const electroEquipment = {
    copperAntenna: { name: 'Antena de Cobre', emoji: '📡', price: 1000, effect: '+20% velocidad', desc: 'Captura electricidad atmosférica' },
    magneticPoles: { name: 'Polos Magnéticos', emoji: '🧲', price: 2500, effect: '+30% rendimiento', desc: 'Mejora absorción de nutrientes' },
    pyramidStructure: { name: 'Pirámide Energética', emoji: '🔺', price: 5000, effect: '+40% precio venta', desc: 'Concentra energía cósmica' },
    electroStimulator: { name: 'Electroestimulador', emoji: '⚡', price: 8000, effect: '-3 días crecimiento', desc: 'Pulsos eléctricos a raíces' },
    cosmicAntenna: { name: 'Antena Cósmica', emoji: '🛸', price: 20000, effect: '¡Todo x2!', desc: 'Tecnología suprema' }
};
