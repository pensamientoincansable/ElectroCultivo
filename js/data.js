// ============ DATOS DEL JUEGO ============

const gameData = {
    farmName: 'Mi Granja',
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
    unlockedCrops: [], // Crops unlocked in calendar (when seeds purchased)
    recyclingBonus: 1.0, // Multiplier for seeds gained from recycling
    selectedPlotIndex: null,
    guideMessageIndex: 0,
    isHolding: false,
    isSpraying: false,
    sprayTarget: null,
    minigames: {
        playedToday: 0,
        lastReset: new Date().toISOString().split('T')[0]
    }
};

// Game settings (persisted to localStorage)
const gameSettings = {
    soundEnabled: true,
    musicEnabled: true,
    volume: 80
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
        crops: ['trigo', 'cebada', 'azafran', 'uva', 'girasol', 'almendra'],
        color: '#c2410c', soilColor: '#5d4037',
        // Central region
        center: { x: 420, y: 410 }
    },
    aragon: {
        name: 'Aragón', level: 2, emoji: '🍑', farmSize: 14,
        crops: ['trigo', 'cebada', 'melocoton', 'cereza', 'olivo', 'almendra', 'maiz'],
        color: '#dc2626', soilColor: '#4e342e',
        // Northeast, bordering France
        center: { x: 550, y: 220 }
    },
    extremadura: {
        name: 'Extremadura', level: 3, emoji: '🫒', farmSize: 14,
        crops: ['olivo', 'cereza', 'higo', 'tomate', 'pimiento'],
        color: '#16a34a', soilColor: '#3e2723',
        // West, bordering Portugal
        center: { x: 230, y: 400 }
    },
    larioja: {
        name: 'La Rioja', level: 4, emoji: '🍇', farmSize: 10,
        crops: ['uva', 'pimiento', 'champiñon', 'pera', 'manzana'],
        color: '#7c2d12', soilColor: '#3e2723',
        // Small region north of Castilla y Leon
        center: { x: 450, y: 165 }
    },
    murcia: {
        name: 'Murcia', level: 5, emoji: '🍋', farmSize: 16,
        crops: ['limon', 'naranja', 'lechuga', 'brocoli', 'alcachofa', 'melon'],
        color: '#eab308', soilColor: '#6d4c41',
        // Southeast coast
        center: { x: 570, y: 490 }
    },
    valencia: {
        name: 'Valencia', level: 6, emoji: '🍊', farmSize: 16,
        crops: ['naranja', 'arroz', 'tomate', 'kaki', 'albaricoque'],
        color: '#ea580c', soilColor: '#5d4037',
        // East coast
        center: { x: 600, y: 380 }
    },
    cataluna: {
        name: 'Cataluña', level: 7, emoji: '🌰', farmSize: 18,
        crops: ['uva', 'avellana', 'pera', 'manzana', 'calçots'],
        color: '#facc15', soilColor: '#4e342e',
        // Northeast corner
        center: { x: 690, y: 210 }
    },
    castillayleon: {
        name: 'Castilla y León', level: 8, emoji: '🌻', farmSize: 20,
        crops: ['trigo', 'cebada', 'lentejas', 'garbanzos', 'remolacha', 'patata', 'girasol'],
        color: '#7c3aed', soilColor: '#5d4037',
        // Large northern plateau
        center: { x: 270, y: 240 }
    },
    navarra: {
        name: 'Navarra', level: 9, emoji: '🫑', farmSize: 16,
        crops: ['esparrago', 'pimiento', 'alcachofa', 'uva', 'melocoton'],
        color: '#dc2626', soilColor: '#3e2723',
        // North, bordering France
        center: { x: 510, y: 110 }
    },
    paisvasco: {
        name: 'País Vasco', level: 10, emoji: '🍏', farmSize: 14,
        crops: ['manzana', 'pimiento', 'alubia', 'patata'],
        color: '#059669', soilColor: '#2e1915',
        // North coast
        center: { x: 450, y: 110 }
    },
    cantabria: {
        name: 'Cantabria', level: 11, emoji: '🥝', farmSize: 14,
        crops: ['manzana', 'kiwi', 'patata', 'maiz'],
        color: '#0891b2', soilColor: '#3e2723',
        // North coast
        center: { x: 380, y: 110 }
    },
    asturias: {
        name: 'Asturias', level: 12, emoji: '🍎', farmSize: 14,
        crops: ['manzana', 'kiwi', 'arandano', 'frambuesa'],
        color: '#2563eb', soilColor: '#4e342e',
        // North coast
        center: { x: 280, y: 120 }
    },
    galicia: {
        name: 'Galicia', level: 13, emoji: '🥔', farmSize: 16,
        crops: ['patata', 'pimiento', 'uva', 'kiwi', 'manzana'],
        color: '#4f46e5', soilColor: '#5d4037',
        // Northwest corner
        center: { x: 160, y: 160 }
    },
    madrid: {
        name: 'Madrid', level: 14, emoji: '🍓', farmSize: 12,
        crops: ['fresa', 'olivo', 'uva', 'melon', 'ajo'],
        color: '#be123c', soilColor: '#6d4c41',
        // Center
        center: { x: 360, y: 352 }
    },
    andalucia: {
        name: 'Andalucía', level: 15, emoji: '🥑', farmSize: 24,
        crops: ['olivo', 'naranja', 'fresa', 'aguacate', 'mango', 'tomate', 'pimiento', 'almendra', 'uva', 'algodon'],
        color: '#15803d', soilColor: '#4e342e',
        // South
        center: { x: 330, y: 510 }
    }
};

// ============ CULTIVOS ============
const crops = {
    // Cereales
    trigo: {
        name: 'Trigo', emoji: '🌾', seasons: ['autumn', 'winter'], growTime: 8, pricePerUnit: 2.00, seedPrice: 3,
        yieldMin: 3, yieldMax: 6, unit: 'kg', description: '3-6 kg de grano por m²',
        realWorld: "Factores Reales: Se siembra a 3-5cm de profundidad. Requiere suelos bien drenados y es crítico regar durante el 'espigado'."
    },
    cebada: {
        name: 'Cebada', emoji: '🌾', seasons: ['autumn', 'winter'], growTime: 7, pricePerUnit: 1.50, seedPrice: 2,
        yieldMin: 3, yieldMax: 5, unit: 'kg', description: '3-5 kg de grano por m²',
        realWorld: "Factores Reales: Más resistente al frío y la sequía que el trigo. Ideal para suelos calizos de la Meseta española."
    },
    maiz: {
        name: 'Maíz', emoji: '🌽', seasons: ['spring', 'summer'], growTime: 6, pricePerUnit: 0.35, seedPrice: 4,
        yieldMin: 2, yieldMax: 4, unit: 'kg', description: '2-4 mazorcas grandes',
        realWorld: "Factores Reales: Necesita mucho sol y riegos frecuentes. Se siembra cuando el suelo supera los 12°C."
    },
    arroz: {
        name: 'Arroz', emoji: '🍚', seasons: ['spring', 'summer'], growTime: 7, pricePerUnit: 0.50, seedPrice: 5,
        yieldMin: 4, yieldMax: 8, unit: 'kg', description: '4-8 kg por m²',
        realWorld: "Factores Reales: Cultivo en inundación. Requiere temperaturas constantes y mucha humedad (Albufera/Delta del Ebro)."
    },
    // Hortalizas
    tomate: {
        name: 'Tomate', emoji: '🍅', seasons: ['spring', 'summer'], growTime: 4, pricePerUnit: 0.80, seedPrice: 5,
        yieldMin: 15, yieldMax: 25, unit: 'unid', description: '15-25 tomates por planta',
        realWorld: "Factores Reales: Necesita tutorado (guías). Evita mojar las hojas al regar para prevenir hongos como el mildiu."
    },
    lechuga: {
        name: 'Lechuga', emoji: '🥬', seasons: ['spring', 'autumn'], growTime: 2, pricePerUnit: 0.50, seedPrice: 2,
        yieldMin: 1, yieldMax: 1, unit: 'unid', description: '1 lechuga grande',
        realWorld: "Factores Reales: Crecimiento rápido. Prefiere riegos cortos y frecuentes. Sensible al espigado por calor excesivo."
    },
    pimiento: {
        name: 'Pimiento', emoji: '🫑', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 1.20, seedPrice: 4,
        yieldMin: 8, yieldMax: 15, unit: 'unid', description: '8-15 pimientos por planta',
        realWorld: "Factores Reales: Requiere mucho potasio. Se debe recolectar a menudo para estimular la aparición de nuevos frutos."
    },
    brocoli: {
        name: 'Brócoli', emoji: '🥦', seasons: ['autumn', 'winter'], growTime: 4, pricePerUnit: 1.50, seedPrice: 3,
        yieldMin: 1, yieldMax: 2, unit: 'kg', description: '1-2 kg por planta',
        realWorld: "Factores Reales: Clima fresco. Una vez cortada la pella principal, la planta suele dar brotes laterales más pequeños."
    },
    alcachofa: {
        name: 'Alcachofa', emoji: '🌿', seasons: ['autumn', 'winter', 'spring'], growTime: 6, pricePerUnit: 2.00, seedPrice: 8,
        yieldMin: 10, yieldMax: 20, unit: 'unid', description: '10-20 alcachofas por planta',
        realWorld: "Factores Reales: Cultivo plurianual. Requiere inviernos suaves; el frío intenso puede quemar los capítulos."
    },
    esparrago: {
        name: 'Espárrago', emoji: '🌿', seasons: ['spring'], growTime: 5, pricePerUnit: 4.00, seedPrice: 10,
        yieldMin: 15, yieldMax: 25, unit: 'unid', description: '15-25 espárragos',
        realWorld: "Factores Reales: Las esparragueras pueden producir durante 10 años. Se entierran las garras a 20cm de profundidad."
    },
    patata: {
        name: 'Patata', emoji: '🥔', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 0.40, seedPrice: 3,
        yieldMin: 8, yieldMax: 15, unit: 'kg', description: '8-15 kg por planta',
        realWorld: "Factores Reales: Se planta el tubérculo. Necesita 'aporcado' (cubrir el tallo con tierra) para que no verdeen."
    },
    ajo: {
        name: 'Ajo', emoji: '🧄', seasons: ['autumn'], growTime: 8, pricePerUnit: 3.00, seedPrice: 4,
        yieldMin: 8, yieldMax: 12, unit: 'unid', description: '8-12 cabezas de ajo',
        realWorld: "Factores Reales: 'Cada ajo quiere su tajo'. Plantar el diente con la punta hacia arriba en suelos sueltos."
    },
    // Frutas de árbol
    naranja: {
        name: 'Naranja', emoji: '🍊', seasons: ['winter', 'spring'], growTime: 10, pricePerUnit: 0.30, seedPrice: 15,
        yieldMin: 80, yieldMax: 150, unit: 'unid', description: '80-150 naranjas por árbol',
        realWorld: "Factores Reales: Clima mediterráneo sin heladas. El exceso de nitrógeno puede hacer la piel demasiado gruesa."
    },
    limon: {
        name: 'Limón', emoji: '🍋', seasons: ['winter', 'spring'], growTime: 10, pricePerUnit: 0.35, seedPrice: 15,
        yieldMin: 60, yieldMax: 120, unit: 'unid', description: '60-120 limones por árbol',
        realWorld: "Factores Reales: Más sensible al frío que el naranjo. Produce flores y frutos casi todo el año."
    },
    manzana: {
        name: 'Manzana', emoji: '🍎', seasons: ['autumn'], growTime: 8, pricePerUnit: 0.40, seedPrice: 12,
        yieldMin: 100, yieldMax: 200, unit: 'unid', description: '100-200 manzanas por árbol',
        realWorld: "Factores Reales: Necesita acumular 'horas frío' en invierno para una buena floración. Típica de climas templados."
    },
    pera: {
        name: 'Pera', emoji: '🍐', seasons: ['summer', 'autumn'], growTime: 7, pricePerUnit: 0.50, seedPrice: 12,
        yieldMin: 80, yieldMax: 150, unit: 'unid', description: '80-150 peras por árbol',
        realWorld: "Factores Reales: Recolección delicada. Muchas variedades maduran mejor fuera del árbol."
    },
    melocoton: {
        name: 'Melocotón', emoji: '🍑', seasons: ['summer'], growTime: 6, pricePerUnit: 0.60, seedPrice: 14,
        yieldMin: 60, yieldMax: 100, unit: 'unid', description: '60-100 melocotones',
        realWorld: "Factores Reales: Exigente en luz. La poda es fundamental para que el sol llegue a todos los frutos."
    },
    cereza: {
        name: 'Cereza', emoji: '🍒', seasons: ['spring'], growTime: 5, pricePerUnit: 3.50, seedPrice: 20,
        yieldMin: 8, yieldMax: 15, unit: 'kg', description: '8-15 kg por árbol',
        realWorld: "Factores Reales: Cultivo típico del Valle del Jerte. Sensible a la lluvia durante la maduración (raja el fruto)."
    },
    higo: {
        name: 'Higo', emoji: '🫐', seasons: ['summer', 'autumn'], growTime: 6, pricePerUnit: 2.50, seedPrice: 10,
        yieldMin: 30, yieldMax: 60, unit: 'unid', description: '30-60 higos por árbol',
        realWorld: "Factores Reales: Higuera rústica, aguanta bien la sequía. No soporta encharcamientos en las raíces."
    },
    albaricoque: {
        name: 'Albaricoque', emoji: '🍑', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 1.20, seedPrice: 12,
        yieldMin: 50, yieldMax: 100, unit: 'unid', description: '50-100 albaricoques',
        realWorld: "Factores Reales: Floración temprana, riesgo de heladas tardías. Prefiere suelos profundos y aireados."
    },
    kaki: {
        name: 'Kaki', emoji: '🍊', seasons: ['autumn'], growTime: 8, pricePerUnit: 1.50, seedPrice: 15,
        yieldMin: 60, yieldMax: 100, unit: 'unid', description: '60-100 kakis por árbol',
        realWorld: "Factores Reales: El árbol pierde la hoja antes de recolectar el fruto. Muy popular la variedad 'Persimon'."
    },
    kiwi: {
        name: 'Kiwi', emoji: '🥝', seasons: ['autumn', 'winter'], growTime: 9, pricePerUnit: 1.80, seedPrice: 18,
        yieldMin: 40, yieldMax: 80, unit: 'unid', description: '40-80 kiwis por planta',
        realWorld: "Factores Reales: Planta trepadora. Requiere mucha humedad ambiental y suelos ácidos (típico de Galicia)."
    },
    // Frutas pequeñas
    fresa: {
        name: 'Fresa', emoji: '🍓', seasons: ['spring'], growTime: 3, pricePerUnit: 4.00, seedPrice: 8,
        yieldMin: 0.5, yieldMax: 1, unit: 'kg', description: '0.5-1 kg por planta',
        realWorld: "Factores Reales: Se suelen plantar en lomos con plástico negro para conservar calor y limpieza."
    },
    arandano: {
        name: 'Arándano', emoji: '🫐', seasons: ['summer'], growTime: 5, pricePerUnit: 8.00, seedPrice: 15,
        yieldMin: 2, yieldMax: 5, unit: 'kg', description: '2-5 kg por arbusto',
        realWorld: "Factores Reales: Necesita suelos muy ácidos (pH 4.5). Sensible al agua con mucha cal."
    },
    frambuesa: {
        name: 'Frambuesa', emoji: '🍇', seasons: ['summer'], growTime: 4, pricePerUnit: 7.00, seedPrice: 12,
        yieldMin: 1, yieldMax: 3, unit: 'kg', description: '1-3 kg por planta',
        realWorld: "Factores Reales: Fruto muy perecedero. Se recolecta a mano cuando está bien rojo pero firme."
    },
    // Uva
    uva: {
        name: 'Uva', emoji: '🍇', seasons: ['summer', 'autumn'], growTime: 7, pricePerUnit: 1.50, seedPrice: 10,
        yieldMin: 8, yieldMax: 15, unit: 'kg', description: '8-15 kg por vid',
        realWorld: "Factores Reales: La 'vendimia' es cultura en España. El estrés hídrico controlado mejora la calidad del vino."
    },
    // Melones
    melon: {
        name: 'Melón', emoji: '🍈', seasons: ['summer'], growTime: 5, pricePerUnit: 1.20, seedPrice: 5,
        yieldMin: 2, yieldMax: 4, unit: 'unid', description: '2-4 melones por planta',
        realWorld: "Factores Reales: Necesita suelos ricos y mucho sol. Se sabe que está maduro por el olor y el 'escriturado' de la piel."
    },
    sandia: {
        name: 'Sandía', emoji: '🍉', seasons: ['summer'], growTime: 5, pricePerUnit: 0.80, seedPrice: 4,
        yieldMin: 1, yieldMax: 3, unit: 'unid', description: '1-3 sandías grandes',
        realWorld: "Factores Reales: Gran demanda de agua inicial. Agradece temperaturas nocturnas cálidas para el dulzor."
    },
    // Tropicales
    aguacate: {
        name: 'Aguacate', emoji: '🥑', seasons: ['winter', 'spring'], growTime: 12, pricePerUnit: 2.50, seedPrice: 30,
        yieldMin: 60, yieldMax: 150, unit: 'unid', description: '60-150 aguacates por árbol',
        realWorld: "Factores Reales: Clima subtropical (Axarquía/Canarias). Muy sensible al viento y a la salinidad del agua."
    },
    mango: {
        name: 'Mango', emoji: '🥭', seasons: ['summer', 'autumn'], growTime: 14, pricePerUnit: 3.00, seedPrice: 40,
        yieldMin: 40, yieldMax: 100, unit: 'unid', description: '40-100 mangos por árbol',
        realWorld: "Factores Reales: Requiere veranos calurosos y secos para la maduración. No tolera las heladas."
    },
    // Legumbres
    lentejas: {
        name: 'Lentejas', emoji: '🫘', seasons: ['autumn', 'winter'], growTime: 6, pricePerUnit: 2.00, seedPrice: 4,
        yieldMin: 1, yieldMax: 2, unit: 'kg', description: '1-2 kg por m²',
        realWorld: "Factores Reales: Mejora el suelo fijando nitrógeno. Cultivo de secano muy rústico."
    },
    garbanzos: {
        name: 'Garbanzos', emoji: '🫘', seasons: ['spring'], growTime: 7, pricePerUnit: 2.50, seedPrice: 5,
        yieldMin: 0.8, yieldMax: 1.5, unit: 'kg', description: '0.8-1.5 kg por m²',
        realWorld: "Factores Reales: No tolera el exceso de humedad. Típicos de la zona centro y sur de España."
    },
    alubia: {
        name: 'Alubia', emoji: '🫘', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 3.00, seedPrice: 6,
        yieldMin: 1, yieldMax: 2, unit: 'kg', description: '1-2 kg por m²',
        realWorld: "Factores Reales: Necesita riegos regulares. Muy apreciadas las variedades del norte (Fabas, Judiones)."
    },
    // Frutos secos
    almendra: {
        name: 'Almendra', emoji: '🌰', seasons: ['summer', 'autumn'], growTime: 10, pricePerUnit: 6.00, seedPrice: 20,
        yieldMin: 5, yieldMax: 12, unit: 'kg', description: '5-12 kg por árbol',
        realWorld: "Factores Reales: Floración espectacular en febrero. España es uno de los mayores productores mundiales."
    },
    avellana: {
        name: 'Avellana', emoji: '🌰', seasons: ['autumn'], growTime: 9, pricePerUnit: 5.00, seedPrice: 18,
        yieldMin: 4, yieldMax: 10, unit: 'kg', description: '4-10 kg por árbol',
        realWorld: "Factores Reales: Típico de Cataluña (Reus). Necesita cierta humedad ambiental y suelos profundos."
    },
    // Especiales
    azafran: {
        name: 'Azafrán', emoji: '🌸', seasons: ['autumn'], growTime: 8, pricePerUnit: 200.00, seedPrice: 50,
        yieldMin: 0.5, yieldMax: 1.5, unit: 'g', description: '0.5-1.5 g por m² (¡Oro rojo!)',
        realWorld: "Factores Reales: Se recolecta la flor al amanecer en otoño y se 'monda' el estigma a mano ese mismo día."
    },
    olivo: {
        name: 'Aceitunas', emoji: '🫒', seasons: ['autumn', 'winter'], growTime: 12, pricePerUnit: 1.50, seedPrice: 25,
        yieldMin: 15, yieldMax: 30, unit: 'kg', description: '15-30 kg por olivo',
        realWorld: "Factores Reales: 'Árbol de paz y aceite'. Necesita poda anual y aguanta condiciones de sequía extremas."
    },
    girasol: {
        name: 'Girasol', emoji: '🌻', seasons: ['summer'], growTime: 5, pricePerUnit: 0.80, seedPrice: 3,
        yieldMin: 0.5, yieldMax: 1, unit: 'kg', description: '0.5-1 kg de pipas',
        realWorld: "Factores Reales: El girasol sigue al sol (heliotropismo). Se cosecha cuando los capítulos miran al suelo y están secos."
    },
    champiñon: {
        name: 'Champiñón', emoji: '🍄', seasons: ['spring', 'autumn', 'winter'], growTime: 2, pricePerUnit: 3.00, seedPrice: 5,
        yieldMin: 2, yieldMax: 4, unit: 'kg', description: '2-4 kg por cultivo',
        realWorld: "Factores Reales: Se cultiva en oscuridad y con humedad controlada. No necesita luz al ser un hongo."
    },
    algodon: {
        name: 'Algodón', emoji: '☁️', seasons: ['summer'], growTime: 8, pricePerUnit: 1.80, seedPrice: 8,
        yieldMin: 2, yieldMax: 4, unit: 'kg', description: '2-4 kg por planta',
        realWorld: "Factores Reales: Requiere mucho calor y agua. Típico de las marismas del Guadalquivir."
    },
    remolacha: {
        name: 'Remolacha', emoji: '🫐', seasons: ['spring', 'summer'], growTime: 5, pricePerUnit: 0.60, seedPrice: 3,
        yieldMin: 3, yieldMax: 6, unit: 'kg', description: '3-6 kg por m²',
        realWorld: "Factores Reales: De la remolacha azucarera se obtiene el azúcar. Cultivo muy importante en Castilla y León."
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
