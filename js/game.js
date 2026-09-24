// ============ INICIALIZACIÓN ============
function startGame() {
    // Verificar si regresamos de una autenticación exitosa
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('auth') === 'success') {
        alert('¡Autenticado con Google con éxito!');
        startLocalGame();
        return;
    }
    console.log("startGame called");
    document.getElementById('loginChoiceModal').classList.remove('hidden');
}

/* Servidor de autenticación (opcional). Se puede apuntar a otro host con
   window.ELECTRO_AUTH_URL antes de cargar los scripts. */
function authServerBase() {
    if (typeof window.ELECTRO_AUTH_URL === 'string' && window.ELECTRO_AUTH_URL) {
        return window.ELECTRO_AUTH_URL.replace(/\/+$/, '');
    }
    return `${window.location.protocol}//${window.location.hostname}:3000`;
}

async function loginWithGoogle() {
    const base = authServerBase();
    try {
        // Comprobación rápida: si no hay servidor, avisamos en vez de dejar al
        // jugador en una página en blanco.
        await fetch(base + '/auth/user', { method: 'GET', signal: AbortSignal.timeout ? AbortSignal.timeout(2500) : undefined });
    } catch (e) {
        showToast('🔐 No hay servidor de autenticación aquí: usa «Jugar en Local»');
        return;
    }
    window.location.href = base + '/auth/google';
}

function startLocalGame() {
    document.getElementById('loginChoiceModal').classList.add('hidden');
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');

    loadSettings();
    loadGame(); // Cargar progreso del usuario

    // Si es una partida nueva o falta la granja actual, inicializar
    if (!gameData.farms[gameData.currentRegion]) {
        initFarmForRegion(gameData.currentRegion);
        // Semillas iniciales solo si es realmente el principio
        if (gameData.currentRegion === 'castillalamancha' && Object.keys(gameData.inventory.seeds).length === 0) {
            gameData.inventory.seeds = { trigo: 5, cebada: 5, azafran: 2, uva: 3 };
        }
    }

    updateUI();
    applyFarmEnvironment(true);
    renderFarm();
    renderShop();
    renderElectroculture();

    // Iniciar mapa
    setTimeout(() => {
        colorizeMapRegions();
        addRegionEmojis();
        // Initialize stats if missing (migration)
        if (!gameData.regionStats) gameData.regionStats = {};
        Object.keys(regions).forEach(r => {
            if (!gameData.regionStats[r]) gameData.regionStats[r] = { invested: 0, planted: 0, earned: 0 };
        });
    }, 100);
}

function initGame() {
    initFarmForRegion('castillalamancha');
    gameData.inventory.seeds = { trigo: 5, cebada: 5, azafran: 2, uva: 3 };
    gameData.regionStats = {};
    Object.keys(regions).forEach(r => {
        gameData.regionStats[r] = { invested: 0, planted: 0, earned: 0 };
    });
    updateUI();
    renderFarm();
    renderShop();
    renderElectroculture();
}

function initFarmForRegion(regionId) {
    if (!gameData.farms[regionId]) {
        const region = regions[regionId];
        const plots = [];
        for (let i = 0; i < region.farmSize; i++) {
            plots.push({ planted: null, daysGrown: 0, watered: false, ready: false, yieldAmount: 0, plowed: false });
        }
        gameData.farms[regionId] = { plots };
    }
}

// ============ NAVEGACIÓN ============
function showView(view) {
    ['mapView', 'farmView', 'minigameView', 'shopView', 'electrocultureView', 'inventoryView'].forEach(v => {
        document.getElementById(v)?.classList.add('hidden');
    });
    document.getElementById(view + 'View').classList.remove('hidden');

    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-yellow-400'));
    const activeBtn = document.getElementById('nav' + view.charAt(0).toUpperCase() + view.slice(1));
    if (activeBtn) activeBtn.classList.add('ring-2', 'ring-yellow-400');

    if (view === 'farm') {
        updateFarmBackground();
        renderFarm();
        renderSeeds();
        renderQuickInventory();
    } else if (view === 'map') {
        colorizeMapRegions();
        addRegionEmojis();
    } else if (view === 'shop') renderShop();
    else if (view === 'electroculture') renderElectroculture();
    else if (view === 'inventory') renderInventory();
}

// ============ PAISAJE DE LA GRANJA (FarmWorld) ============
/* Cada región tiene su escenario real: cielo, sierra, campos y aperos.
   El paisaje se adapta a la estación y al momento del día. */

const TIME_OF_DAY = [
    { icon: '☀️', label: 'Día' },
    { icon: '🌇', label: 'Atardecer' },
    { icon: '🌙', label: 'Noche' },
    { icon: '🌅', label: 'Amanecer' }
];

// Tonos de suelo/hierba por estación (comparten valor con FarmWorld)
const SEASON_GROUND = {
    spring: { top: '#86c463', dark: '#69a349' },
    summer: { top: '#a5bf4d', dark: '#86a13a' },
    autumn: { top: '#b39a54', dark: '#957e3f' },
    winter: { top: '#c6d1c9', dark: '#a8b5ad' }
};

function getTimeOfDay() {
    return Number.isInteger(gameData.timeOfDay) && TIME_OF_DAY[gameData.timeOfDay] ? gameData.timeOfDay : 0;
}

function applyFarmEnvironment(force) {
    const mount = document.getElementById('worldMount');
    if (!mount || typeof FarmWorld === 'undefined') return;

    const tod = getTimeOfDay();
    const season = gameData.season;
    const region = gameData.currentRegion;
    const ground = SEASON_GROUND[season] || SEASON_GROUND.spring;

    // Altura del paisaje según la pantalla (más bajo en móvil)
    const worldH = window.innerWidth < 640 ? '250px' : (window.innerWidth < 1024 ? '300px' : '360px');
    const farm = document.getElementById('farmFullscreen');
    if (farm) farm.style.setProperty('--ground', ground.top);

    const key = `${region}|${season}|${tod}`;
    const world = mount.querySelector('.farm-world');
    if (!force && world && mount.dataset.key === key) {
        // Solo refrescamos medidas y tonos (barato): el paisaje ya está montado
        world.style.setProperty('--world-h', worldH);
        world.style.setProperty('--grass', ground.top);
        world.style.setProperty('--grass-dark', ground.dark);
        return;
    }
    mount.dataset.key = key;

    mount.innerHTML = '';
    const fresh = FarmWorld.build(region, season, tod);
    fresh.style.setProperty('--grass', ground.top);
    fresh.style.setProperty('--grass-dark', ground.dark);
    fresh.style.setProperty('--world-h', worldH);
    mount.appendChild(fresh);

    const label = document.getElementById('placeLabel');
    if (label) label.textContent = FarmWorld.placeLabel(region) || regions[region].name;

    const icon = document.getElementById('todIcon');
    if (icon) icon.textContent = TIME_OF_DAY[tod].icon;
    const btn = document.getElementById('todBtn');
    if (btn) btn.title = `Momento del día: ${TIME_OF_DAY[tod].label} (clic para cambiar)`;

    bindParallax();
}

// El paisaje se reajusta si cambia el tamaño de la ventana (sin rehacer todo)
let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        if (!document.getElementById('farmView')?.classList.contains('hidden')) applyFarmEnvironment();
    }, 220);
});

function cycleTimeOfDay() {
    gameData.timeOfDay = (getTimeOfDay() + 1) % TIME_OF_DAY.length;
    applyFarmEnvironment(true);
    showToast(`${TIME_OF_DAY[gameData.timeOfDay].icon} ${TIME_OF_DAY[gameData.timeOfDay].label} en ${regions[gameData.currentRegion].name}`);
    saveGame();
}

// Paralaje muy suave: solo desplaza las capas de paisaje (coste mínimo)
let parallaxBound = false;
function bindParallax() {
    if (parallaxBound) return;
    parallaxBound = true;
    let raf = null;
    window.addEventListener('mousemove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
            raf = null;
            const scale = window.innerWidth < 900 ? 0 : 1;
            if (!scale) return;
            const nx = (e.clientX / window.innerWidth - 0.5);
            const layers = document.querySelectorAll('#worldMount .w-layer');
            layers.forEach((el, i) => {
                const k = [10, 18, 26][i] || 14;
                el.style.setProperty('--px', `${(-nx * k).toFixed(1)}px`);
            });
        });
    }, { passive: true });
}

function updateFarmBackground() {
    applyFarmEnvironment();
}

// ============ UI ============
function updateUI() {
    // Asegurar que la energía no sea negativa
    gameData.energy = Math.max(0, gameData.energy);

    document.getElementById('money').textContent = Math.floor(gameData.money);
    document.getElementById('energy').textContent = Math.floor(gameData.energy);
    document.getElementById('level').textContent = gameData.level;
    if (document.getElementById('farmNameDisplay'))
        document.getElementById('farmNameDisplay').textContent = gameData.farmName;

    const xpPercent = (gameData.xp / gameData.xpNeeded) * 100;
    document.getElementById('xpBarHeader').style.width = `${xpPercent}%`;
    document.getElementById('xpText').textContent = `${gameData.xp}/${gameData.xpNeeded}`;

    if (document.getElementById('currentDay')) {
        document.getElementById('currentDay').textContent = gameData.day;
        document.getElementById('currentYear').textContent = gameData.year;
    }

    const seasonData = {
        spring: { emoji: '🌸', name: 'Primavera' }, summer: { emoji: '☀️', name: 'Verano' },
        autumn: { emoji: '🍂', name: 'Otoño' }, winter: { emoji: '❄️', name: 'Invierno' }
    };
    const season = seasonData[gameData.season];

    document.getElementById('seasonIndicator').textContent = `${season.emoji} ${season.name}`;
    if (document.getElementById('currentSeasonText'))
        document.getElementById('currentSeasonText').textContent = `${season.emoji} ${season.name}`;

    if (document.getElementById('xpBar')) {
        document.getElementById('xpBar').style.width = `${xpPercent}%`;
        document.getElementById('levelProgress').textContent = gameData.level;
        document.getElementById('xpProgress').textContent = gameData.xp;
        document.getElementById('xpNeededProgress').textContent = gameData.xpNeeded;
    }

    document.getElementById('unlockedCount').textContent = `${gameData.unlockedRegions.length} / ${Object.keys(regions).length}`;

    Object.keys(regions).forEach(id => {
        const el = document.getElementById('region-' + id);
        if (el) {
            el.classList.remove('locked', 'current');
            if (!gameData.unlockedRegions.includes(id)) el.classList.add('locked');
            if (id === gameData.currentRegion) el.classList.add('current');

            // Asegurar color
            const color = regions[id].color || '#4b5563';
            el.setAttribute('fill', color);
            el.style.fill = color; // Doble seguridad
        }
    });

    const hasElectro = Object.values(gameData.electroculture).some(v => v);
    const electroStatus = document.getElementById('electrocultureStatus');
    if (electroStatus) {
        electroStatus.innerHTML = hasElectro
            ? '<span class="text-green-300">⚡ Electrocultura ACTIVA</span>'
            : '<span class="text-gray-400">⚡ Sin electrocultura</span>';
        electroStatus.className = hasElectro ? 'bg-green-800 px-3 py-1 rounded-lg text-sm' : 'bg-gray-700 px-3 py-1 rounded-lg text-sm';
    }

    if (document.getElementById('farmRegionTitle'))
        document.getElementById('farmRegionTitle').textContent = `🌾 Granja de ${regions[gameData.currentRegion].name}`;
    if (document.getElementById('shopRegionName'))
        document.getElementById('shopRegionName').textContent = regions[gameData.currentRegion].name;
    if (document.getElementById('plotCount'))
        document.getElementById('plotCount').textContent = gameData.farms[gameData.currentRegion]?.plots.length || 0;
}

// ============ GRANJA ============
function renderFarm() {
    const grid = document.getElementById('farmGrid');
    if (!grid) return;
    grid.innerHTML = '';

    // Botón "Arar todo" (solo con tractor de arado)
    if (gameData.inventory.tools.tractorArado) {
        let btnContainer = document.getElementById('farmControlsContainer');
        if (!btnContainer) {
            const field = document.querySelector('#farmView .field-area');
            if (field) {
                btnContainer = document.createElement('div');
                btnContainer.id = 'farmControlsContainer';
                btnContainer.className = 'flex justify-end mb-3';
                field.insertBefore(btnContainer, field.firstElementChild);
            }
        }
        if (btnContainer && !document.getElementById('plowAllBtn')) {
            btnContainer.innerHTML = `
                <button id="plowAllBtn" onclick="plowAll()" class="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg font-bold shadow-lg flex items-center gap-2 transform active:scale-95 transition-all">
                    🚜 Arar Todo (10⚡)
                </button>`;
        }
    }

    const farm = gameData.farms[gameData.currentRegion];
    if (!farm) return;

    const hasElectro = Object.values(gameData.electroculture).some(v => v);
    const stageIcons = ['🌱', '🌿', '🍃', '✨'];

    farm.plots.forEach((plot, index) => {
        const cell = document.createElement('div');
        cell.className = 'farm-plot w-14 h-14 sm:w-20 sm:h-20 md:w-24 md:h-24 relative cursor-pointer select-none touch-manipulation';

        // --- Helpers de interacción (mantener pulsado) ---
        const begin = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            if (plot.planted && !plot.ready) startSpraying(index, e);
            else if (!plot.planted && !plot.plowed) startPlowing(index);
        };
        const end = () => {
            if (plot.planted && !plot.ready) stopSpraying();
            else if (!plot.planted && !plot.plowed) stopPlowing();
        };
        cell.addEventListener('mousedown', begin);
        cell.addEventListener('mouseup', end);
        cell.addEventListener('mouseleave', end);
        cell.addEventListener('touchstart', begin, { passive: false });
        cell.addEventListener('touchend', end);
        cell.addEventListener('touchcancel', end);

        if (plot.planted) {
            const crop = crops[plot.planted];
            const growTime = getGrowTime(plot.planted);
            const progress = Math.min(plot.daysGrown / growTime, 1);
            const stage = FarmArt.stageFor(progress, plot.ready);

            cell.classList.add('planted');
            if (plot.watered) cell.classList.add('watered');
            cell.classList.add(plot.ready ? 'ready' : 'growing');

            const art = FarmArt.plant(plot.planted, stage);
            const daysLeft = Math.max(0, Math.ceil(growTime - plot.daysGrown));
            cell.innerHTML = `
                <div class="spr-wrap ${hasElectro ? 'electro-glow' : ''}">${art}</div>
                <div class="plot-stage">${plot.ready ? '✨' : stageIcons[stage]}</div>
                <div class="plot-badge">${plot.ready
                    ? `${plot.yieldAmount.toFixed(1)}${crop.unit}`
                    : `${Math.floor(progress * 100)}%`}</div>
            `;
            cell.title = plot.ready
                ? `${crop.name} — ¡LISTO PARA COSECHAR! ${plot.yieldAmount.toFixed(1)} ${crop.unit}`
                : `${crop.name} — ${Math.floor(progress * 100)}% (${daysLeft} día${daysLeft === 1 ? '' : 's'} restante${daysLeft === 1 ? '' : 's'})`;

            if (plot.ready) {
                cell.onclick = (e) => { e.stopPropagation(); startFullHarvest(index); };
                cell.ontouchend = (e) => { e.preventDefault(); e.stopPropagation(); startFullHarvest(index); };
            } else {
                cell.onclick = (e) => { e.stopPropagation(); if (!plot.watered) waterPlot(index); };
                cell.ontouchend = end;
            }
        } else if (plot.plowed) {
            const soilColor = regions[gameData.currentRegion].soilColor || '#7d5527';
            cell.classList.add('plowed');
            cell.style.background = `linear-gradient(160deg, ${soilColor}, #4f3417)`;
            cell.innerHTML = `
                <div class="spr-wrap" style="align-items:center">
                    <span style="font-size:26px;opacity:.55">🕳️</span>
                </div>
                <div class="plot-stage">➕</div>`;
            cell.title = 'Parcela arada — toca para plantar';
            cell.onclick = (e) => { e.stopPropagation(); openPlantModal(index); };
            cell.ontouchend = (e) => { e.preventDefault(); openPlantModal(index); };
        } else {
            cell.classList.add('unplowed', 'empty-hint');
            cell.innerHTML = `
                <div class="spr-wrap" style="align-items:center">
                    <span style="font-size:22px;opacity:.45">🪨</span>
                </div>`;
            cell.title = 'Tierra sin arar — mantén pulsado 0.5 s para arar (5⚡)';
            cell.onclick = (e) => {
                e.stopPropagation();
                if (!gameData.farms[gameData.currentRegion].plots[index].plowed) {
                    showToast('✋ Mantén pulsado para arar la tierra');
                }
            };
        }

        grid.appendChild(cell);
    });
}

function renderSeeds() {
    const list = document.getElementById('seedList');
    if (!list) return;
    list.innerHTML = '';

    const regionCrops = regions[gameData.currentRegion].crops;
    let hasSeeds = false;

    Object.entries(gameData.inventory.seeds).forEach(([seedId, qty]) => {
        if (qty > 0 && regionCrops.includes(seedId)) {
            hasSeeds = true;
            const crop = crops[seedId];
            const inSeason = crop.seasons.includes(gameData.season) || gameData.inventory.tools.invernadero;

            const item = document.createElement('div');
            item.className = `seed-chip p-2 flex items-center gap-2 ${inSeason ? 'bg-green-800/80' : 'bg-gray-700/80'}`;
            item.innerHTML = `
                ${FarmArt.product(seedId)}
                <div class="flex-1 min-w-0">
                    <p class="text-white text-xs font-bold truncate">${crop.name}</p>
                    <p class="text-xs ${inSeason ? 'text-green-300' : 'text-red-300'}">${inSeason ? '✓ En temporada' : '✗ Fuera temp.'}</p>
                </div>
                <span class="text-yellow-300 font-bold">${qty}</span>
            `;
            item.querySelector('svg').classList.add('prod-sprite', 'sm');
            list.appendChild(item);
        }
    });

    if (!hasSeeds) list.innerHTML = '<p class="text-gray-400 text-xs text-center py-2">Sin semillas</p>';
}

function renderQuickInventory() {
    const container = document.getElementById('quickInventory');
    if (!container) return;
    container.innerHTML = '';

    const harvests = Object.entries(gameData.inventory.harvests).filter(([_, q]) => q > 0);
    if (harvests.length === 0) {
        container.innerHTML = '<p class="text-gray-400 text-xs">Vacío</p>';
        document.getElementById('totalHarvestValue').textContent = '0';
        return;
    }

    let total = 0;
    harvests.slice(0, 6).forEach(([cropId, qty]) => {
        const crop = crops[cropId];
        const value = qty * crop.pricePerUnit * getPriceMultiplier();
        total += value;
        const item = document.createElement('div');
        item.className = 'flex items-center gap-1 text-white';
        item.innerHTML = `${FarmArt.product(cropId)}<span class="truncate flex-1 text-xs">${crop.name}</span><span class="text-yellow-300 text-xs">${qty.toFixed(1)}${crop.unit}</span>`;
        item.querySelector('svg').classList.add('prod-sprite', 'sm');
        container.appendChild(item);
    });

    document.getElementById('totalHarvestValue').textContent = Math.floor(total);
}

function openPlantModal(index) {
    gameData.selectedPlotIndex = index;
    const modal = document.getElementById('plantModal');
    const container = document.getElementById('plantModalSeeds');
    container.innerHTML = '';

    const regionCrops = regions[gameData.currentRegion].crops;
    let hasSeeds = false;

    Object.entries(gameData.inventory.seeds).forEach(([seedId, qty]) => {
        if (qty > 0 && regionCrops.includes(seedId)) {
            hasSeeds = true;
            const crop = crops[seedId];
            const inSeason = crop.seasons.includes(gameData.season) || gameData.inventory.tools.invernadero;

            const btn = document.createElement('button');
            btn.className = `w-full p-3 rounded-lg ${inSeason ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700 opacity-60 cursor-not-allowed'} flex items-center gap-3 transition-all`;
            btn.disabled = !inSeason;
            btn.innerHTML = `
                ${FarmArt.product(seedId)}
                <div class="flex-1 text-left">
                    <p class="text-white font-bold">${crop.name}</p>
                    <p class="text-green-300 text-xs">🌱 ${crop.description}</p>
                    <p class="text-gray-300 text-xs">⏱️ ${getGrowTime(seedId)} días | 💰 ${crop.pricePerUnit}/${crop.unit}</p>
                </div>
                <div class="text-right">
                    <span class="text-yellow-300 font-bold text-lg">${qty}</span>
                    <p class="text-gray-400 text-xs">semillas</p>
                </div>
            `;
            btn.querySelector('svg').classList.add('prod-sprite', 'lg');
            btn.onclick = () => plantSeed(seedId);
            container.appendChild(btn);
        }
    });

    if (!hasSeeds) container.innerHTML = '<p class="text-gray-400 text-center py-8">No tienes semillas para esta región. ¡Ve a la tienda!</p>';
    modal.classList.remove('hidden');
}

function closePlantModal() {
    document.getElementById('plantModal').classList.add('hidden');
    gameData.selectedPlotIndex = null;
}

function plantSeed(seedId) {
    if (gameData.energy < 5) {
        showToast('⚡ ¡No tienes suficiente energía! Juega un minijuego o pasa el día.');
        return;
    }

    const farm = gameData.farms[gameData.currentRegion];
    const crop = crops[seedId];

    let yieldAmount = crop.yieldMin + Math.random() * (crop.yieldMax - crop.yieldMin);
    yieldAmount *= getYieldMultiplier();

    farm.plots[gameData.selectedPlotIndex] = {
        planted: seedId,
        daysGrown: 0,
        watered: false,
        ready: false,
        yieldAmount: yieldAmount
    };

    gameData.inventory.seeds[seedId]--;
    if (gameData.inventory.seeds[seedId] <= 0) delete gameData.inventory.seeds[seedId];

    // Track planted
    if (gameData.regionStats && gameData.regionStats[gameData.currentRegion]) {
        gameData.regionStats[gameData.currentRegion].planted++;
    }

    gameData.energy = Math.max(0, gameData.energy - 5);
    closePlantModal();
    renderFarm();
    renderSeeds();
    updateUI();
    saveGame();
}

function waterPlot(index) {
    const cost = gameData.inventory.tools.regadera ? 1 : 2;
    if (gameData.energy < cost) return;

    gameData.farms[gameData.currentRegion].plots[index].watered = true;
    gameData.energy = Math.max(0, gameData.energy - cost);
    renderFarm();
    updateUI();
    saveGame();
}

function waterAll() {
    const cost = gameData.inventory.tools.regadera ? 5 : 10;
    if (gameData.energy < cost) {
        showToast('⚡ ¡No tienes suficiente energía!');
        return;
    }

    gameData.farms[gameData.currentRegion].plots.forEach(plot => {
        if (plot.planted && !plot.ready) plot.watered = true;
    });

    gameData.energy = Math.max(0, gameData.energy - cost);
    renderFarm();
    updateUI();
    saveGame();
}

function harvestPlot(index) {
    const farm = gameData.farms[gameData.currentRegion];
    const plot = farm.plots[index];
    if (!plot.ready) return;

    const cropId = plot.planted;
    const crop = crops[cropId];

    if (!gameData.inventory.harvests[cropId]) gameData.inventory.harvests[cropId] = 0;
    gameData.inventory.harvests[cropId] += plot.yieldAmount;

    const xpGain = Math.floor(plot.yieldAmount * crop.pricePerUnit);
    gainXP(xpGain);

    farm.plots[index] = { planted: null, daysGrown: 0, watered: false, ready: false, yieldAmount: 0 };

    renderFarm();
    renderQuickInventory();
    updateUI();
    saveGame();
}

function harvestAll() {
    const farm = gameData.farms[gameData.currentRegion];
    farm.plots.forEach((plot, i) => {
        if (plot.ready) harvestPlot(i);
    });
}

function expandFarm() {
    if (gameData.money < 500) {
        showToast('💰 Necesitas 500 para ampliar el campo');
        return;
    }

    gameData.money -= 500;
    const farm = gameData.farms[gameData.currentRegion];
    for (let i = 0; i < 4; i++) {
        farm.plots.push({ planted: null, daysGrown: 0, watered: false, ready: false, yieldAmount: 0 });
    }

    renderFarm();
    updateUI();
    saveGame();
}

function advanceDay() {
    gameData.day++;

    Object.values(gameData.farms).forEach(farm => {
        farm.plots.forEach(plot => {
            if (plot.planted && !plot.ready) {
                plot.daysGrown += plot.watered ? 1.5 : 1;
                plot.watered = false;
                if (plot.daysGrown >= getGrowTime(plot.planted)) plot.ready = true;
            }
        });

        if (gameData.inventory.tools.sistemaRiego) {
            farm.plots.forEach(plot => {
                if (plot.planted && !plot.ready) plot.watered = true;
            });
        }
    });

    if (gameData.day % 30 === 0) {
        const seasons = ['spring', 'summer', 'autumn', 'winter'];
        const idx = seasons.indexOf(gameData.season);
        gameData.season = seasons[(idx + 1) % 4];
        if (gameData.season === 'spring') gameData.year++;
    }

    gameData.energy = Math.min(gameData.maxEnergy, gameData.energy + 35);

    updateFarmBackground(true);
    renderFarm();
    updateUI();
    showToast(`📅 Día ${gameData.day} · ${gameData.season === 'autumn' ? '🍂 Otoño' : gameData.season === 'winter' ? '❄️ Invierno' : gameData.season === 'spring' ? '🌸 Primavera' : '☀️ Verano'}`);
    saveGame();
}

// Celebración de subida de nivel (tarjeta efímera, sin bloquear el juego)
function showLevelUp(level, regionId) {
    let box = document.getElementById('levelUpCard');
    if (box) box.remove();
    box = document.createElement('div');
    box.id = 'levelUpCard';
    box.className = 'level-up-card';
    box.innerHTML = `
        <div class="title-font text-3xl text-yellow-300 mb-1">✨ ¡Nivel ${level}! ✨</div>
        ${regionId ? `<p class="text-green-200">Nueva región desbloqueada:<br><b class="text-white">${regions[regionId].name} ${regions[regionId].emoji}</b></p>` : '<p class="text-green-200">¡Tu granja mejora!</p>'}
        <button onclick="this.parentElement.remove()" class="mt-3 bg-green-600 hover:bg-green-500 text-white px-5 py-2 rounded-xl font-bold">Seguir</button>`;
    document.body.appendChild(box);
    setTimeout(() => box && box.remove(), 6000);
}

// Aviso breve y no intrusivo (sustituye a los alert en acciones de juego)
function showToast(message, kind) {
    let host = document.getElementById('toastHost');
    if (!host) {
        host = document.createElement('div');
        host.id = 'toastHost';
        document.body.appendChild(host);
    }
    const toast = document.createElement('div');
    toast.className = 'toast' + (kind ? ' toast-' + kind : '');
    toast.textContent = message;
    host.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-out');
        setTimeout(() => toast.remove(), 400);
    }, 2200);
}

// ============ CÁLCULOS ============
function getGrowTime(cropId) {
    let time = crops[cropId].growTime;
    if (gameData.electroculture.electroStimulator) time -= 3;
    if (gameData.electroculture.copperAntenna) time *= 0.8;
    if (gameData.electroculture.cosmicAntenna) time *= 0.5;
    if (gameData.inventory.tools.tractor) time *= 0.8;
    return Math.max(1, Math.floor(time));
}

function getYieldMultiplier() {
    let mult = 1;
    if (gameData.electroculture.magneticPoles) mult += 0.3;
    if (gameData.electroculture.cosmicAntenna) mult += 0.5;
    return mult;
}

function getPriceMultiplier() {
    let mult = 1;
    if (gameData.electroculture.pyramidStructure) mult += 0.4;
    if (gameData.electroculture.cosmicAntenna) mult += 0.4;
    return mult;
}

function gainXP(amount, event) {
    gameData.xp += amount;
    showXPPopup(amount, event);
    while (gameData.xp >= gameData.xpNeeded) {
        gameData.xp -= gameData.xpNeeded;
        gameData.level++;
        gameData.xpNeeded = Math.floor(gameData.xpNeeded * 1.5);

        const regionOrder = Object.keys(regions);
        if (gameData.level <= regionOrder.length) {
            const newRegion = regionOrder[gameData.level - 1];
            if (!gameData.unlockedRegions.includes(newRegion)) gameData.unlockedRegions.push(newRegion);
            initFarmForRegion(newRegion);
            showLevelUp(gameData.level, newRegion);
        } else {
            showLevelUp(gameData.level);
        }
    }
    saveGame();
    updateUI();
}

function showXPPopup(amount, event) {
    const popup = document.createElement('div');
    popup.className = 'xp-popup';
    popup.textContent = `+${amount} XP`;

    if (event) {
        popup.style.left = event.clientX + 'px';
        popup.style.top = event.clientY + 'px';
    } else {
        popup.style.left = '50%';
        popup.style.top = '50px';
    }
    document.body.appendChild(popup);

    setTimeout(() => popup.remove(), 1000);
}

function changeFarmName() {
    const newName = prompt('Introduce el nuevo nombre de tu granja:', gameData.farmName);
    if (newName && newName.trim().length > 0) {
        gameData.farmName = newName.substring(0, 20);
        updateUI();
        saveGame();
    }
}

// ============ INVENTARIO ============
// ============ INVENTARIO ============
function renderInventory() {
    const grid = document.getElementById('inventoryGrid');
    const sell = document.getElementById('sellInventory'); // This might not exist anymore if we remove it, or we reuse it? 
    // Wait, the user wanted sell in shop. So inventory should just be "seeds we have".
    if (!grid) return;

    // Hide sell container if it exists in DOM or clear it
    if (sell) sell.innerHTML = '';
    // Actually, let's repurpose this view to be "Almacén" (Seeds + Tools + Harvests maybe? or just Seeds as requested).
    // "Implementes en el inventario un registro de las semillas..."

    grid.innerHTML = '';

    // Seeds Section
    const seedsHeader = document.createElement('h3');
    seedsHeader.className = 'col-span-full text-xl text-yellow-300 font-bold mt-4 mb-2';
    seedsHeader.textContent = '🌱 Semillas Disponibles';
    grid.appendChild(seedsHeader);

    const seedEntries = Object.entries(gameData.inventory.seeds);
    if (seedEntries.length === 0) {
        grid.innerHTML += '<p class="col-span-full text-gray-400 text-center">No tienes semillas.</p>';
    } else {
        seedEntries.forEach(([seedId, qty]) => {
            if (qty <= 0) return;
            const crop = crops[seedId];
            const item = document.createElement('div');
            item.className = 'inventory-item flex flex-col items-center p-3 bg-white/10 rounded-xl';
            item.innerHTML = `
                ${FarmArt.product(seedId)}
                <p class="text-amber-100 font-bold text-sm">${crop.name}</p>
                <p class="text-amber-300 text-xs font-bold text-lg">${qty}</p>
            `;
            item.querySelector('svg').classList.add('prod-sprite');
            grid.appendChild(item);
        });
    }

    // Harvests Section (Just for viewing, not selling)
    const harvestHeader = document.createElement('h3');
    harvestHeader.className = 'col-span-full text-xl text-yellow-300 font-bold mt-6 mb-2';
    harvestHeader.textContent = '📦 Cosechas (Vender en Tienda)';
    grid.appendChild(harvestHeader);

    const harvestEntries = Object.entries(gameData.inventory.harvests);
    if (harvestEntries.length === 0) {
        grid.appendChild(document.createElement('div')).innerHTML = '<p class="col-span-full text-gray-400 text-center">Almacén vacío.</p>';
    } else {
        harvestEntries.forEach(([cropId, qty]) => {
            if (qty <= 0) return;
            const crop = crops[cropId];
            const item = document.createElement('div');
            item.className = 'inventory-item flex flex-col items-center p-3 bg-white/10 rounded-xl opacity-80';
            item.innerHTML = `
                ${FarmArt.product(cropId)}
                <p class="text-amber-100 font-bold text-sm">${crop.name}</p>
                <p class="text-amber-300 text-xs">${qty.toFixed(1)} ${crop.unit}</p>
                <button onclick="recycleHarvest('${cropId}')" 
                    class="mt-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1 rounded font-bold transition-all"
                    title="Reciclar por semillas">
                    ♻️ Reciclar
                </button>
            `;
            item.querySelector('svg').classList.add('prod-sprite');
            grid.appendChild(item);
        });
    }

    // We removed global total value or we can keep it?
    // document.getElementById('totalInventoryValue').textContent = `${Math.floor(total)} 💰`;
}

function sellHarvest(cropId) {
    const qty = gameData.inventory.harvests[cropId];
    if (!qty || qty <= 0) return;

    const crop = crops[cropId];
    const price = Math.floor(qty * crop.pricePerUnit * getPriceMultiplier());
    gameData.money += price;

    // Track Stats
    if (gameData.regionStats && gameData.regionStats[gameData.currentRegion]) {
        gameData.regionStats[gameData.currentRegion].earned += price;
    }

    delete gameData.inventory.harvests[cropId];

    updateUI();
    renderInventory();
    renderQuickInventory();
    renderShop(); // Update shop if we are there
}

function sellAll() {
    let total = 0;
    Object.entries(gameData.inventory.harvests).forEach(([cropId, qty]) => {
        if (qty > 0) {
            const crop = crops[cropId];
            total += qty * crop.pricePerUnit * getPriceMultiplier();
        }
    });
    gameData.money += Math.floor(total);
    // Track Stats (Distribute? Or just dump to current region for simplicity since global sell all is tricky without tracking origin)
    // Ideally we should track where crops came from, but we don't store that. 
    // For now, attribute 'Sell All' earnings to Current Region as a simplification, or split?
    // Let's attribute to current region.
    if (gameData.regionStats && gameData.regionStats[gameData.currentRegion]) {
        gameData.regionStats[gameData.currentRegion].earned += Math.floor(total);
    }

    gameData.inventory.harvests = {};

    updateUI();
    renderInventory();
    renderQuickInventory();
    saveGame();
}

function plowAll() {
    const cost = 10;
    if (gameData.energy < cost) {
        showToast('⚡ Necesitas 10 de energía para arar todo');
        return;
    }

    const farm = gameData.farms[gameData.currentRegion];
    let plowedCount = 0;

    farm.plots.forEach((plot, index) => {
        if (!plot.planted && !plot.ready && !plot.plowed) {
            plot.plowed = true;
            plowedCount++;
        }
    });

    if (plowedCount > 0) {
        gameData.energy -= cost;
        renderFarm();
        updateUI();
        saveGame();
        // Visual feedback?
        showToast(`🚜 ¡Tractor en marcha! ${plowedCount} parcelas aradas`);
    } else {
        showToast('🚜 No hay parcelas vacías que arar');
    }
}


function recycleHarvest(cropId) {
    const qty = gameData.inventory.harvests[cropId];
    if (!qty || qty <= 0) return;

    const crop = crops[cropId];
    // Formula: 10 seeds per unit (kg or unid) initially, plus production bonuses
    const baseSeedsPerUnit = 10;

    // Prompt for quantity
    const input = prompt(`¿Cuánto ${crop.name} quieres reciclar?\nienes: ${qty.toFixed(1)} ${crop.unit}\n(Deja vacío para todo)`, qty);

    if (input === null) return; // Cancelled

    let amountToRecycle = parseFloat(input);
    if (isNaN(amountToRecycle) || amountToRecycle <= 0) {
        // If empty or invalid, maybe default to all? User said "seleccionar la cantidad".
        // If they leave it empty, it might be nice to do all.
        if (input.trim() === '') amountToRecycle = qty;
        else {
            showToast('⚠️ Cantidad inválida');
            return;
        }
    }

    if (amountToRecycle > qty) amountToRecycle = qty;

    const seedsGained = Math.floor(amountToRecycle * baseSeedsPerUnit * gameData.recyclingBonus);

    if (seedsGained <= 0) {
        showToast('⚠️ Cantidad insuficiente para generar semillas');
        return;
    }

    if (confirm(`¿Reciclar ${amountToRecycle.toFixed(1)} ${crop.unit} de ${crop.name} para obtener ${seedsGained} semillas?`)) {
        gameData.inventory.seeds[cropId] = (gameData.inventory.seeds[cropId] || 0) + seedsGained;

        gameData.inventory.harvests[cropId] -= amountToRecycle;
        if (gameData.inventory.harvests[cropId] <= 0.01) delete gameData.inventory.harvests[cropId];

        showToast(`♻️ ¡${seedsGained} semillas de ${crop.name} obtenidas!`);

        updateUI();
        renderInventory();
        renderQuickInventory();
        saveGame();
    }
}

// ============ PERSISTENCIA (SAVE/LOAD) ============
function saveGame() {
    localStorage.setItem('electrocultivo_save', JSON.stringify(gameData));
    console.log('Juego guardado localmente.');
}

function loadGame() {
    const savedData = localStorage.getItem('electrocultivo_save');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            // Fusionar datos guardados con gameData inicial (para mantener nuevas propiedades si las hay)
            Object.assign(gameData, parsedData);
            console.log('Progreso cargado con éxito.');
        } catch (e) {
            console.error('Error al cargar la partida:', e);
        }
    }
}

// ============ REGIONES (Modal) ============
function closeRegionModal() { document.getElementById('regionModal').classList.add('hidden'); }

function travelToRegion(regionId) {
    gameData.currentRegion = regionId;
    initFarmForRegion(regionId);
    closeRegionModal();
    showView('farm');
    applyFarmEnvironment(true);
    updateUI();
    showToast(`🚚 Te has mudado a ${regions[regionId].name}`);
    saveGame();
}

// ============ TIENDA ============
function renderShop() {
    renderShopSell(); // New Sell Section
    renderShopSeeds();
    renderShopTools();
    renderShopElectro();
}

function renderShopSell() {
    // We need a container for selling. If it doesn't exist in HTML, we might need to create it dynamically or just append to shopSeeds?
    // Best: Insert a new section at the top of shopView.
    const shopView = document.getElementById('shopView');
    let sellContainer = document.getElementById('shopSellContainer');
    if (!sellContainer) {
        // Create container if missing
        sellContainer = document.createElement('div');
        sellContainer.id = 'shopSellContainer';
        sellContainer.className = 'mb-8 bg-amber-950/30 p-4 rounded-2xl border border-amber-800';

        // Insert at top (after title)
        const title = shopView.querySelector('h3') || shopView.firstElementChild;
        // shopView usually has columns or sections. Let's prepend to the main content area.
        shopView.insertBefore(sellContainer, shopView.firstChild.nextSibling); // After title?
        // Actually, let's just create it.
    }

    sellContainer.innerHTML = '<h3 class="text-xl text-yellow-300 font-bold mb-4 flex items-center gap-2"><span>💰</span> Vender Cosecha</h3>';

    const harvests = Object.entries(gameData.inventory.harvests).filter(([_, q]) => q > 0);
    if (harvests.length === 0) {
        sellContainer.innerHTML += '<p class="text-gray-400 text-sm">No tienes productos para vender.</p>';
        return;
    }

    // Add "Sell All" button
    let totalValue = 0;
    const list = document.createElement('div');
    list.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3';

    harvests.forEach(([cropId, qty]) => {
        const crop = crops[cropId];
        const price = Math.floor(qty * crop.pricePerUnit * getPriceMultiplier());
        totalValue += price;

        const item = document.createElement('div');
        item.className = 'bg-black/20 p-3 rounded-lg flex items-center justify-between';
        item.innerHTML = `
            <div class="flex items-center gap-2">
                ${FarmArt.product(cropId)}
                <div>
                     <p class="text-white text-sm font-bold">${crop.name}</p>
                     <p class="text-xs text-gray-300">${qty.toFixed(1)} ${crop.unit}</p>
                </div>
            </div>
            <button onclick="sellHarvest('${cropId}')" class="bg-green-700 hover:bg-green-600 text-white px-3 py-1 rounded text-sm font-bold shadow-sm">
                +${price}💰
            </button>
        `;
        item.querySelector('svg').classList.add('prod-sprite');
        list.appendChild(item);
    });

    const sellAllBtn = document.createElement('div');
    sellAllBtn.className = 'flex justify-between items-center bg-green-900/50 p-3 rounded-lg mb-3 border border-green-700';
    sellAllBtn.innerHTML = `
        <span class="text-green-300 font-bold">Valor Total: ${Math.floor(totalValue)}💰</span>
        <button onclick="sellAll()" class="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-all transform active:scale-95">
            Vender Todo 💰
        </button>
    `;

    sellContainer.appendChild(sellAllBtn);
    sellContainer.appendChild(list);
}

// ============ DASHBOARD REGIONES ============
let dashboardSortBy = 'level'; // 'level', 'invested', 'planted', 'earned'

function openRegionDashboard() {
    renderRegionDashboard();
    document.getElementById('regionDashboardModal').classList.remove('hidden');
}

function closeRegionDashboard() {
    document.getElementById('regionDashboardModal').classList.add('hidden');
}

function sortDashboard(criteria) {
    dashboardSortBy = criteria;
    renderRegionDashboard();
}

function renderRegionDashboard() {
    const tbody = document.getElementById('dashboardTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const sortedRegions = Object.entries(regions).sort(([, a], [, b]) => {
        const statsA = gameData.regionStats?.[a] || { invested: 0, planted: 0, earned: 0 };
        const statsB = gameData.regionStats?.[b] || { invested: 0, planted: 0, earned: 0 };
        const idA = Object.keys(regions).find(key => regions[key] === a); // We have key in entry[0]

        switch (dashboardSortBy) {
            case 'invested': return statsB.invested - statsA.invested;
            case 'planted': return statsB.planted - statsA.planted;
            case 'earned': return statsB.earned - statsA.earned;
            case 'level': default: return b.level - a.level; // High level first? Or low? Usually Level 1 to X. Let's do Ascending for Level (1,2,3) to show progression order, or unlocked? 
                // User: "ordenadas por defecto por nivel".
                // Let's do Ascending Level order (1..15).
                return a.level - b.level;
        }
    });

    // If criteria other than level, maybe desc? yes, invested/planted/earned usually desc.
    // Level: Ascending.

    // Correction for sort:
    // We are iterating entries: [key, value]

    Object.keys(regions).sort((a, b) => {
        const regA = regions[a];
        const regB = regions[b];
        const statsA = gameData.regionStats?.[a] || { invested: 0, planted: 0, earned: 0 };
        const statsB = gameData.regionStats?.[b] || { invested: 0, planted: 0, earned: 0 };

        if (dashboardSortBy === 'level') return regA.level - regB.level; // 1, 2, 3...
        if (dashboardSortBy === 'invested') return statsB.invested - statsA.invested;
        if (dashboardSortBy === 'planted') return statsB.planted - statsA.planted;
        if (dashboardSortBy === 'earned') return statsB.earned - statsA.earned;
        return 0;
    }).forEach(regionId => {
        const region = regions[regionId];
        const stats = gameData.regionStats?.[regionId] || { invested: 0, planted: 0, earned: 0 };
        const isUnlocked = gameData.unlockedRegions.includes(regionId);

        const row = document.createElement('tr');
        row.className = isUnlocked ? 'hover:bg-slate-700/50' : 'opacity-50 grayscale';
        row.innerHTML = `
            <td class="p-3 flex items-center gap-2">
                <span class="text-2xl">${region.emoji}</span>
                <div>
                    <p class="font-bold cursor-pointer hover:text-yellow-300" onclick="${isUnlocked ? `travelToRegion('${regionId}'); closeRegionDashboard()` : ''}">
                        ${region.name}
                    </p>
                    <p class="text-xs text-gray-400">${isUnlocked ? 'Desbloqueado' : 'Bloqueado'}</p>
                </div>
            </td>
            <td class="p-3 font-mono text-blue-300">${region.level}</td>
            <td class="p-3 font-mono text-yellow-300">${stats.invested}💰</td>
            <td class="p-3 font-mono text-green-300">${stats.planted}🌱</td>
            <td class="p-3 font-mono text-amber-400 font-bold">${stats.earned}💰</td>
        `;
        tbody.appendChild(row);
    });
}
function renderShopSeeds() {
    const container = document.getElementById('shopSeeds');
    if (!container) return;
    container.innerHTML = '';

    regions[gameData.currentRegion].crops.forEach(cropId => {
        const crop = crops[cropId];
        if (!crop) return;

        const inSeason = crop.seasons.includes(gameData.season);
        const item = document.createElement('div');
        item.className = `p-3 rounded-lg ${inSeason ? 'bg-green-800/60' : 'bg-gray-700/60'}`;
        item.innerHTML = `
            <div class="flex items-center gap-2 mb-2">
                ${FarmArt.product(cropId)}
                <div class="flex-1">
                    <p class="text-white font-bold text-sm">${crop.name}</p>
                    <p class="text-xs ${inSeason ? 'text-green-300' : 'text-gray-400'}">${inSeason ? '✓ En temporada' : 'Fuera de temporada'}</p>
                </div>
            </div>
            <p class="text-gray-300 text-xs mb-2">📊 Rinde: ${crop.description}</p>
            <div class="flex justify-between items-center">
                <span class="text-yellow-300 font-bold">${crop.seedPrice}💰</span>
                <button onclick="buySeed('${cropId}')" class="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1 rounded text-sm font-bold transition-all">
                    Comprar
                </button>
            </div>
        `;
        item.querySelector('svg').classList.add('prod-sprite');
        container.appendChild(item);
    });
}


function renderShopTools() {
    const container = document.getElementById('shopTools');
    if (!container) return;
    container.innerHTML = '';

    Object.entries(tools).forEach(([id, tool]) => {
        if (id === 'azada') return;
        const owned = gameData.inventory.tools[id];

        const item = document.createElement('div');
        item.className = `p-3 rounded-lg ${owned ? 'bg-gray-700' : 'bg-blue-800/50'}`;
        item.innerHTML = `
            <div class="flex items-center gap-2">
                <span class="text-2xl">${tool.emoji}</span>
                <div class="flex-1">
                    <p class="text-white font-bold text-sm">${tool.name}</p>
                    <p class="text-blue-300 text-xs">${tool.effect}</p>
                </div>
                ${owned ? '<span class="text-green-400">✓</span>' : `<button onclick="buyTool('${id}')" class="bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded text-sm font-bold">${tool.price}💰</button>`}
            </div>
        `;
        container.appendChild(item);
    });
}

function renderShopElectro() {
    const container = document.getElementById('shopElectro');
    if (!container) return;
    container.innerHTML = '';

    Object.entries(electroEquipment).forEach(([id, eq]) => {
        const owned = gameData.electroculture[id];

        const item = document.createElement('div');
        item.className = `p-3 rounded-lg ${owned ? 'bg-gray-700' : 'bg-purple-800/50'}`;
        item.innerHTML = `
            <div class="flex items-center gap-2 mb-1">
                <span class="text-2xl">${eq.emoji}</span>
                <div class="flex-1">
                    <p class="text-white font-bold text-sm">${eq.name}</p>
                    <p class="text-yellow-300 text-xs">${eq.effect}</p>
                </div>
            </div>
            <p class="text-gray-400 text-xs mb-2">${eq.desc}</p>
            ${owned ? '<span class="text-green-400 text-sm">✓ Instalado</span>' : `<button onclick="buyElectro('${id}')" class="w-full bg-yellow-600 hover:bg-yellow-500 text-white py-1 rounded text-sm font-bold">${eq.price}💰</button>`}
        `;
        container.appendChild(item);
    });
}

function buySeed(cropId) {
    const crop = crops[cropId];
    if (gameData.money < crop.seedPrice) {
        showToast('💸 ¡Dinero insuficiente!');
        return;
    }

    // Track Stats
    if (gameData.regionStats && gameData.regionStats[gameData.currentRegion]) {
        gameData.regionStats[gameData.currentRegion].invested += crop.seedPrice;
    }
    gameData.money -= crop.seedPrice;
    gameData.inventory.seeds[cropId] = (gameData.inventory.seeds[cropId] || 0) + 1;

    // Unlock crop in calendar when first purchased
    if (!gameData.unlockedCrops.includes(cropId)) {
        gameData.unlockedCrops.push(cropId);
    }

    updateUI();
    renderSeeds();
    saveGame();
}

function buyTool(toolId) {
    const tool = tools[toolId];
    if (gameData.money < tool.price) {
        showToast('💸 ¡Dinero insuficiente!');
        return;
    }

    // Track Stats
    if (gameData.regionStats && gameData.regionStats[gameData.currentRegion]) {
        gameData.regionStats[gameData.currentRegion].invested += tool.price;
    }
    gameData.money -= tool.price;
    gameData.inventory.tools[toolId] = true;
    updateUI();
    renderShopTools();
}

function buyElectro(eqId) {
    const eq = electroEquipment[eqId];
    if (gameData.money < eq.price) {
        showToast('💸 ¡Dinero insuficiente!');
        return;
    }

    // Track Stats
    if (gameData.regionStats && gameData.regionStats[gameData.currentRegion]) {
        gameData.regionStats[gameData.currentRegion].invested += eq.price;
    }
    gameData.money -= eq.price;
    gameData.electroculture[eqId] = true;
    updateUI();
    renderShopElectro();
    renderElectroculture();
}

// ============ ELECTROCULTURA ============
function renderElectroculture() {
    const techContainer = document.getElementById('electroTechniques');
    const benefitsContainer = document.getElementById('activeBenefits');
    if (!techContainer || !benefitsContainer) return;

    techContainer.innerHTML = '';
    Object.entries(electroEquipment).forEach(([id, eq]) => {
        const owned = gameData.electroculture[id];
        const item = document.createElement('div');
        item.className = `p-4 rounded-xl ${owned ? 'bg-green-800/60 border-2 border-green-500' : 'bg-gray-800/60'}`;
        item.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="text-3xl">${eq.emoji}</span>
                <div class="flex-1">
                    <p class="text-white font-bold">${eq.name}</p>
                    <p class="text-yellow-300 text-sm">${eq.effect}</p>
                    <p class="text-gray-400 text-xs">${eq.desc}</p>
                </div>
                ${owned ? '<span class="text-green-400 text-2xl">⚡</span>' : `<button onclick="buyElectro('${id}')" class="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold">${eq.price}💰</button>`}
            </div>
        `;
        techContainer.appendChild(item);
    });

    benefitsContainer.innerHTML = '';
    const benefits = [];
    if (gameData.electroculture.copperAntenna) benefits.push({ emoji: '📡', text: '+20% velocidad de crecimiento' });
    if (gameData.electroculture.magneticPoles) benefits.push({ emoji: '🧲', text: '+30% rendimiento de cosecha' });
    if (gameData.electroculture.pyramidStructure) benefits.push({ emoji: '🔺', text: '+40% precio de venta' });
    if (gameData.electroculture.electroStimulator) benefits.push({ emoji: '⚡', text: '-3 días de crecimiento' });
    if (gameData.electroculture.cosmicAntenna) benefits.push({ emoji: '🛸', text: '¡TODOS LOS BONUSES x2!' });

    if (benefits.length === 0) {
        benefitsContainer.innerHTML = '<p class="text-gray-400 text-sm">Ningún equipo instalado</p>';
    } else {
        benefits.forEach(b => {
            const item = document.createElement('div');
            item.className = 'bg-green-700/50 p-3 rounded-lg flex items-center gap-3';
            item.innerHTML = `<span class="text-2xl">${b.emoji}</span><span class="text-green-200">${b.text}</span>`;
            benefitsContainer.appendChild(item);
        });
    }
}

// ============ MINIJUEGOS ============
function startMinigame(type) {
    // Reset diario si es necesario
    const today = new Date().toISOString().split('T')[0];
    if (gameData.minigames.lastReset !== today) {
        gameData.minigames.playedToday = 0;
        gameData.minigames.lastReset = today;
    }

    const isFree = gameData.minigames.playedToday < 3;
    const costs = { catch: 10, pest: 5, water: 0, electric: 15, gopher: 0 };

    const energyCost = isFree ? 0 : costs[type];

    if (gameData.energy < energyCost) {
        showToast('⚡ ¡Energía insuficiente!');
        return;
    }

    gameData.energy -= energyCost;
    updateUI();

    minigameType = type;
    minigameScore = 0;
    document.getElementById('minigameScore').textContent = '0';
    document.getElementById('minigameTimer').textContent = '30';

    const titles = {
        catch: '🧺 Atrapa la Cosecha',
        pest: '🐛 Elimina Plagas',
        water: '💧 Riego Rápido',
        electric: '⚡ Carga Eléctrica',
        gopher: '🐹 ¡Golpea al Topo!',
        sorter: '📦 Clasificador de Semillas'
    };
    document.getElementById('minigameTitle').textContent = titles[type];
    document.getElementById('minigameModal').classList.remove('hidden');

    const area = document.getElementById('minigameArea');
    area.innerHTML = '';

    if (type === 'catch') startCatchGame(area);
    else if (type === 'pest') startPestGame(area);
    else if (type === 'water') startWaterGame(area);
    else if (type === 'electric') startElectricGame(area);
    else if (type === 'gopher') startGopherGame(area);
    else if (type === 'sorter') startSorterGame(area);

    let time = 30;
    minigameInterval = setInterval(() => {
        time--;
        document.getElementById('minigameTimer').textContent = time;
        if (time <= 0) endMinigame();
    }, 1000);
}

function startCatchGame(area) {
    const fruits = ['🍎', '🍊', '🍋', '🍇', '🍓', '🍑', '🌽', '🥕', '🍅', '🥬'];
    const bad = ['🪨', '💀', '🐛'];

    function spawn() {
        const item = document.createElement('div');
        item.className = 'falling-item';
        const isBad = Math.random() < 0.2;
        item.textContent = isBad ? bad[Math.floor(Math.random() * bad.length)] : fruits[Math.floor(Math.random() * fruits.length)];
        item.dataset.bad = isBad;
        item.style.left = Math.random() * 85 + 5 + '%';
        item.style.top = '-40px';

        item.onclick = () => {
            if (item.dataset.bad === 'true') {
                minigameScore = Math.max(0, minigameScore - 5);
            } else {
                minigameScore += 5;
                item.classList.add('caught');
            }
            document.getElementById('minigameScore').textContent = minigameScore;
            setTimeout(() => item.remove(), 300);
        };

        area.appendChild(item);

        let pos = -40;
        const fall = setInterval(() => {
            pos += 4;
            item.style.top = pos + 'px';
            if (pos > 400) {
                clearInterval(fall);
                item.remove();
            }
        }, 40);
    }

    minigameTimeout = setInterval(spawn, 500);
}

function startPestGame(area) {
    const pests = ['🐛', '🐜', '🦗', '🐌', '🪲', '🦟'];

    function spawn() {
        const pest = document.createElement('div');
        pest.className = 'falling-item';
        pest.textContent = pests[Math.floor(Math.random() * pests.length)];
        pest.style.left = Math.random() * 85 + 5 + '%';
        pest.style.top = Math.random() * 80 + 10 + '%';
        pest.style.fontSize = '2.5rem';

        pest.onclick = () => {
            minigameScore += 3;
            document.getElementById('minigameScore').textContent = minigameScore;
            pest.textContent = '💥';
            setTimeout(() => pest.remove(), 150);
        };

        area.appendChild(pest);
        setTimeout(() => pest.remove(), 1500);
    }

    minigameTimeout = setInterval(spawn, 350);
}

function startWaterGame(area) {
    for (let i = 0; i < 15; i++) {
        const plant = document.createElement('div');
        plant.className = 'absolute text-4xl cursor-pointer transition-all hover:scale-125';
        plant.textContent = '🥀';
        plant.style.left = (8 + (i % 5) * 18) + '%';
        plant.style.top = (15 + Math.floor(i / 5) * 28) + '%';
        plant.dataset.watered = 'false';

        plant.onclick = () => {
            if (plant.dataset.watered === 'false') {
                plant.textContent = '🌱';
                plant.dataset.watered = 'true';
                minigameScore += 5;
                document.getElementById('minigameScore').textContent = minigameScore;
            }
        };

        area.appendChild(plant);
    }
}

function startElectricGame(area) {
    for (let i = 0; i < 9; i++) {
        const node = document.createElement('div');
        node.className = 'absolute text-4xl cursor-pointer transition-all hover:scale-125';
        node.textContent = '🔴';
        node.style.left = (15 + (i % 3) * 30) + '%';
        node.style.top = (15 + Math.floor(i / 3) * 28) + '%';
        node.dataset.active = 'false';

        node.onclick = () => {
            if (node.dataset.active === 'false') {
                node.textContent = '⚡';
                node.dataset.active = 'true';
                minigameScore += 8;
                document.getElementById('minigameScore').textContent = minigameScore;
            }
        };

        area.appendChild(node);
    }
}

function endMinigame() {
    clearInterval(minigameInterval);
    clearInterval(minigameTimeout);

    const isFree = gameData.minigames.playedToday < 3;
    let reward = '';
    let moneyReward = 0;
    let energyReward = 0;

    // Lógica de recompensas
    if (isFree && minigameScore >= 200) {
        moneyReward = 5000;
        gameData.minigames.playedToday++;
    } else {
        if (minigameType === 'catch') moneyReward = minigameScore;
        else if (minigameType === 'pest') moneyReward = minigameScore;
        else if (minigameType === 'water') energyReward = Math.min(minigameScore / 2, 40);
        else if (minigameType === 'electric') {
            energyReward = 40;
            moneyReward = Math.floor(minigameScore / 3);
        } else if (minigameType === 'gopher') moneyReward = minigameScore * 2;
        else if (minigameType === 'sorter') moneyReward = minigameScore * 3;
    }

    gameData.money += moneyReward;
    gameData.energy = Math.min(gameData.maxEnergy, gameData.energy + energyReward);

    reward = (moneyReward > 0 ? `+${moneyReward}💰 ` : "") + (energyReward > 0 ? `+${energyReward}⚡` : "");
    if (isFree && minigameScore < 200) reward = "¡Puntos insuficientes para el premio diario (necesitas 200)!";

    setTimeout(() => {
        const gratis = Math.max(0, 3 - gameData.minigames.playedToday);
        showToast(`🎉 ${minigameScore} puntos · ${reward} · ${gratis} partida${gratis === 1 ? '' : 's'} gratis hoy`);
        closeMinigame();
        updateUI();
        saveGame();
    }, 100);
}

function startGopherGame(area) {
    function spawn() {
        const gopher = document.createElement('div');
        gopher.className = 'absolute text-5xl cursor-pointer transition-all hover:scale-110';
        gopher.textContent = '🐹';
        gopher.style.left = Math.random() * 80 + 10 + '%';
        gopher.style.top = Math.random() * 80 + 10 + '%';

        gopher.onclick = (e) => {
            minigameScore += 10;
            document.getElementById('minigameScore').textContent = minigameScore;
            gopher.textContent = '💥';
            showXPPopup(10, e);
            setTimeout(() => gopher.remove(), 200);
        };

        area.appendChild(gopher);
        setTimeout(() => gopher.remove(), 800);
    }
    minigameTimeout = setInterval(spawn, 300); // 100 topos en 30s -> Max 1000 puntos
}

function startSorterGame(area) {
    const seedTypes = ['🌾', '🌽', '🌻', '🍎', '🍇'];
    let target = seedTypes[Math.floor(Math.random() * seedTypes.length)];

    const targetDisplay = document.createElement('div');
    targetDisplay.className = 'text-center mb-4 p-4 bg-white/10 rounded-xl border-2 border-yellow-500 card-3d';
    targetDisplay.innerHTML = `<p class="text-white text-sm">Busca solo: <span class="text-5xl block mt-2">${target}</span></p>`;
    area.appendChild(targetDisplay);

    const grid = document.createElement('div');
    grid.className = 'grid grid-cols-5 gap-2';
    area.appendChild(grid);

    function spawnItems() {
        grid.innerHTML = '';
        for (let i = 0; i < 30; i++) {
            const item = document.createElement('div');
            item.className = 'text-3xl p-2 cursor-pointer hover:scale-125 transition-all text-center';
            const type = seedTypes[Math.floor(Math.random() * seedTypes.length)];
            item.textContent = type;

            item.onclick = (e) => {
                if (type === target) {
                    minigameScore += 15;
                    showXPPopup(15, e);
                    item.style.visibility = 'hidden';
                    if (minigameScore % 75 === 0) {
                        target = seedTypes[Math.floor(Math.random() * seedTypes.length)];
                        targetDisplay.querySelector('span').textContent = target;
                    }
                } else {
                    minigameScore = Math.max(0, minigameScore - 10);
                    item.textContent = '❌';
                    setTimeout(() => item.textContent = type, 500);
                }
                document.getElementById('minigameScore').textContent = minigameScore;
            };
            grid.appendChild(item);
        }
    }

    spawnItems();
    minigameTimeout = setInterval(spawnItems, 3000);
}

function closeMinigame() {
    clearInterval(minigameInterval);
    clearInterval(minigameTimeout);
    document.getElementById('minigameModal').classList.add('hidden');
    document.getElementById('minigameArea').innerHTML = '';
}

// ============ GUÍA ============
function nextGuideMessage() {
    gameData.guideMessageIndex = (gameData.guideMessageIndex + 1) % guideMessages.length;
    document.getElementById('guideText').textContent = guideMessages[gameData.guideMessageIndex];
}

function hideGuide() {
    document.getElementById('guidePanel').classList.add('hidden');
    document.getElementById('showGuideBtn').classList.remove('hidden');
}

function showGuide() {
    document.getElementById('guidePanel').classList.remove('hidden');
    document.getElementById('showGuideBtn').classList.add('hidden');
}

// ============ NUEVAS INTERACCIONES ============
function startPlowing(index) {
    if (gameData.energy < 5) {
        showToast('⚡ ¡Energía insuficiente!');
        return;
    }
    gameData.isHolding = true;
    let progress = 0;
    const plotDiv = document.getElementById('farmGrid').children[index];
    plotDiv.classList.add('shake-plot');

    const container = document.createElement('div');
    container.className = 'hold-progress';
    plotDiv.appendChild(container);

    holdTimer = setInterval(() => {
        progress += 20; // 5x acelerado (20% cada 100ms = 0.5s total)

        // Crear partículas de tierra
        createPlowParticle(container);

        if (progress >= 100) {
            stopPlowing();
            finishPlowing(index);
        }
    }, 100);
}

function createPlowParticle(container) {
    const p = document.createElement('div');
    p.className = 'plow-particle';
    const tx = (Math.random() - 0.5) * 60;
    const ty = (Math.random() - 0.5) * 60 - 20;
    p.style.setProperty('--tx', `${tx}px`);
    p.style.setProperty('--ty', `${ty}px`);
    p.style.left = '50%';
    p.style.top = '50%';
    container.appendChild(p);
    setTimeout(() => p.remove(), 600);
}



function stopPlowing() {
    gameData.isHolding = false;
    clearInterval(holdTimer);
    document.querySelectorAll('.hold-progress').forEach(el => el.remove());
}

function finishPlowing(index) {
    gameData.farms[gameData.currentRegion].plots[index].plowed = true;
    gameData.energy = Math.max(0, gameData.energy - 5);
    renderFarm();
    updateUI();
    saveGame();
}

function startSpraying(index, event) {
    if (gameData.energy < 2) return;
    gameData.isSpraying = true;
    gameData.sprayTarget = index;
    document.body.classList.add('spray-cursor');

    const hose = document.createElement('div');
    hose.id = 'hoseEffect';
    hose.className = 'hose-effect';
    document.body.appendChild(hose);

    updateHosePosition(event);
    document.addEventListener('mousemove', updateHosePosition);
    document.addEventListener('touchmove', updateHosePosition, { passive: true });

    let progress = 0;
    sprayTimer = setInterval(() => {
        progress += 5;
        if (progress >= 100) {
            stopSpraying();
            finishWatering(index);
        }
    }, 100);
}

function updateHosePosition(e) {
    const hose = document.getElementById('hoseEffect');
    if (!hose) return;
    const touch = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0] ? e.changedTouches[0] : null);
    const x = touch ? touch.clientX : e.clientX;
    const y = touch ? touch.clientY : e.clientY;
    if (typeof x !== 'number' || typeof y !== 'number') return;
    hose.style.left = x + 'px';
    hose.style.top = y + 'px';
}

function stopSpraying() {
    gameData.isSpraying = false;
    clearInterval(sprayTimer);
    document.body.classList.remove('spray-cursor');
    document.getElementById('hoseEffect')?.remove();
    document.removeEventListener('mousemove', updateHosePosition);
    document.removeEventListener('touchmove', updateHosePosition);
}

function finishWatering(index) {
    const cost = gameData.inventory.tools.regadera ? 1 : 2;
    const plot = gameData.farms[gameData.currentRegion].plots[index];
    gameData.energy = Math.max(0, gameData.energy - cost);
    plot.watered = true;
    renderFarm();
    updateUI();
    saveGame();
}

function startFullHarvest(index) {
    const plot = gameData.farms[gameData.currentRegion].plots[index];
    const crop = crops[plot.planted];

    document.getElementById('harvestOverlay').classList.remove('hidden');
    document.getElementById('harvestTitle').textContent = `🧺 Cosechando ${crop.name}`;
    const desc = document.getElementById('harvestDesc');
    if (desc) desc.textContent = `Toca cada ${crop.name.toLowerCase()} para llenar la cesta`;
    const area = document.getElementById('harvestFruitArea');
    area.innerHTML = '';

    // Rendimientos altos se representan con una muestra (no saturamos el DOM)
    const total = plot.yieldAmount;
    const shown = Math.min(18, Math.max(3, Math.round(total)));
    const perFruit = total / shown;

    harvestFruits = [];
    collectedFruits = 0;
    document.getElementById('collectedCount').textContent = '0';
    document.getElementById('totalToCollect').textContent = ` / ${total.toFixed(1)} ${crop.unit}`;

    const art = FarmArt.product(plot.planted);
    for (let i = 0; i < shown; i++) {
        const fruit = document.createElement('div');
        fruit.className = 'harvest-fruit';
        fruit.innerHTML = art;
        fruit.querySelector('svg').classList.add('prod-sprite', 'lg');
        fruit.style.left = (8 + (i % 6) * 15 + Math.random() * 4) + '%';
        fruit.style.top = (6 + Math.floor(i / 6) * 24 + Math.random() * 5) + '%';
        fruit.style.position = 'absolute';
        fruit.style.animationDelay = (Math.random() * 2).toFixed(2) + 's';

        fruit.onclick = () => {
            if (fruit.classList.contains('picked')) return;
            fruit.classList.add('picked');
            collectedFruits++;
            const recogido = Math.min(total, collectedFruits * perFruit);
            document.getElementById('collectedCount').textContent = recogido.toFixed(1);
            if (collectedFruits >= shown) {
                setTimeout(() => finishFullHarvest(index, total), 500);
            }
        };
        area.appendChild(fruit);
    }
}

function finishFullHarvest(index, amount) {
    const farm = gameData.farms[gameData.currentRegion];
    const plot = farm.plots[index];
    const cropId = plot.planted;
    const crop = crops[cropId];

    if (!gameData.inventory.harvests[cropId]) gameData.inventory.harvests[cropId] = 0;
    gameData.inventory.harvests[cropId] += plot.yieldAmount;

    const xpGain = Math.floor(plot.yieldAmount * crop.pricePerUnit);
    gainXP(xpGain);

    farm.plots[index] = { planted: null, daysGrown: 0, watered: false, ready: false, yieldAmount: 0, plowed: false };

    document.getElementById('harvestOverlay').classList.add('hidden');
    renderFarm();
    renderQuickInventory();
    updateUI();
    saveGame();
}

// ============ MENÚ PRINCIPAL ============
function showMainMenu() {
    document.getElementById('gameContainer').classList.add('hidden');
    document.getElementById('mainMenu').classList.remove('hidden');
}

function exitGame() {
    if (confirm('¿Seguro que quieres salir? Tu progreso no se guardará.')) {
        showMainMenu();
    }
}

// ============ CALENDARIO DE CULTIVOS ============
function showCalendar() {
    renderCalendar();
    document.getElementById('calendarView').classList.remove('hidden');
}

function closeCalendar() {
    document.getElementById('calendarView').classList.add('hidden');
}

function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const totalCrops = Object.keys(crops).length;
    const unlockedCount = gameData.unlockedCrops.length;

    document.getElementById('unlockedCropsCount').textContent = unlockedCount;
    document.getElementById('totalCropsCount').textContent = totalCrops;

    // Season data for display
    const seasonNames = {
        spring: '🌸 Primavera',
        summer: '☀️ Verano',
        autumn: '🍂 Otoño',
        winter: '❄️ Invierno'
    };

    // Fertilizer recommendations (realistic)
    const fertilizers = {
        trigo: 'Nitrógeno (urea)',
        cebada: 'Nitrógeno-Fósforo',
        tomate: 'Potasio + Calcio',
        naranja: 'NPK equilibrado',
        uva: 'Potasio + Magnesio',
        azafran: 'Materia orgánica',
        olivo: 'Nitrógeno primaveral',
        fresa: 'Fósforo + Potasio',
        patata: 'Potasio + Nitrógeno',
        maiz: 'Nitrógeno abundante',
        almendra: 'Boro + Zinc',
        cereza: 'Nitrógeno moderado',
        limon: 'NPK + micronutrientes',
        manzana: 'Calcio + Potasio',
        aguacate: 'Nitrógeno + Zinc',
        default: 'NPK equilibrado'
    };

    Object.entries(crops).forEach(([cropId, crop]) => {
        const isUnlocked = gameData.unlockedCrops.includes(cropId);

        const card = document.createElement('div');
        card.className = `rounded-2xl p-4 ${isUnlocked ? 'bg-gradient-to-br from-green-800 to-green-900' : 'bg-gray-800/60'}`;

        if (isUnlocked) {
            const seasonText = crop.seasons.map(s => seasonNames[s]).join(', ');
            const fertText = fertilizers[cropId] || fertilizers.default;

            card.innerHTML = `
                <div class="flex items-center gap-3 mb-3">
                    ${FarmArt.product(cropId)}
                    <div>
                        <h3 class="text-white font-bold text-lg">${crop.name}</h3>
                        <p class="text-green-300 text-xs">${crop.description}</p>
                    </div>
                </div>
                <div class="space-y-2 text-sm">
                    <div class="bg-black/30 rounded-lg p-2">
                        <p class="text-amber-300 font-bold">📅 Temporadas óptimas</p>
                        <p class="text-white">${seasonText}</p>
                    </div>
                    <div class="bg-black/30 rounded-lg p-2">
                        <p class="text-blue-300 font-bold">🧪 Abono recomendado</p>
                        <p class="text-white">${fertText}</p>
                    </div>
                    <div class="bg-black/30 rounded-lg p-2">
                        <p class="text-yellow-300 font-bold">📊 Datos del juego</p>
                        <p class="text-gray-300">⏱️ ${crop.growTime} días | 💰 ${crop.pricePerUnit}/${crop.unit}</p>
                        <p class="text-gray-300">🌱 Rinde: ${crop.yieldMin}-${crop.yieldMax} ${crop.unit}</p>
                    </div>
                    <div class="bg-amber-900/40 rounded-lg p-2 border border-amber-500/30">
                        <p class="text-green-400 font-bold flex items-center gap-1">📖 Consejos Reales</p>
                        <p class="text-white text-[11px] italic leading-tight">${crop.realWorld}</p>
                    </div>
                </div>
            `;
            card.querySelector('svg').classList.add('prod-sprite', 'lg');
        } else {
            card.innerHTML = `
                <div class="flex items-center justify-center h-32 opacity-50">
                    <div class="text-center">
                        <span class="text-5xl">🔒</span>
                        <p class="text-gray-400 mt-2">Compra semillas para desbloquear</p>
                    </div>
                </div>
            `;
        }

        grid.appendChild(card);
    });
}

// ============ OPCIONES ============
function showOptions() {
    updateOptionsUI();
    document.getElementById('optionsModal').classList.remove('hidden');
}

function closeOptions() {
    document.getElementById('optionsModal').classList.add('hidden');
}

function updateOptionsUI() {
    // Update toggle buttons based on current settings
    const soundToggle = document.getElementById('soundToggle');
    const musicToggle = document.getElementById('musicToggle');
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');

    if (soundToggle) {
        const span = soundToggle.querySelector('span');
        if (gameSettings.soundEnabled) {
            soundToggle.className = 'w-16 h-8 rounded-full bg-green-500 relative transition-all';
            span.className = 'absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all transform translate-x-8';
        } else {
            soundToggle.className = 'w-16 h-8 rounded-full bg-gray-600 relative transition-all';
            span.className = 'absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all transform translate-x-0';
        }
    }

    if (musicToggle) {
        const span = musicToggle.querySelector('span');
        if (gameSettings.musicEnabled) {
            musicToggle.className = 'w-16 h-8 rounded-full bg-green-500 relative transition-all';
            span.className = 'absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all transform translate-x-8';
        } else {
            musicToggle.className = 'w-16 h-8 rounded-full bg-gray-600 relative transition-all';
            span.className = 'absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-all transform translate-x-0';
        }
    }

    if (volumeSlider) volumeSlider.value = gameSettings.volume;
    if (volumeValue) volumeValue.textContent = gameSettings.volume;
}

function toggleSound() {
    gameSettings.soundEnabled = !gameSettings.soundEnabled;
    updateOptionsUI();
}

function toggleMusic() {
    gameSettings.musicEnabled = !gameSettings.musicEnabled;
    updateOptionsUI();
}

function updateVolume(value) {
    gameSettings.volume = parseInt(value);
    document.getElementById('volumeValue').textContent = value;
}

function saveSettings() {
    localStorage.setItem('electrocultivo_settings', JSON.stringify(gameSettings));
    closeOptions();
    showToast('✅ Ajustes guardados');
}

function loadSettings() {
    const saved = localStorage.getItem('electrocultivo_settings');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameSettings.soundEnabled = parsed.soundEnabled ?? true;
        gameSettings.musicEnabled = parsed.musicEnabled ?? true;
        gameSettings.volume = parsed.volume ?? 80;
    }
}

// ============ PERSISTENCIA (SISTEMA DE GUARDADO) ============
function saveGame() {
    // Preparar objeto de guardado. Solo guardamos lo necesario, no todo el estado UI.
    const saveObject = {
        money: gameData.money,
        energy: gameData.energy,
        level: gameData.level,
        xp: gameData.xp,
        day: gameData.day,
        year: gameData.year,
        season: gameData.season,
        currentRegion: gameData.currentRegion,
        unlockedRegions: gameData.unlockedRegions,
        farms: gameData.farms,
        inventory: gameData.inventory,
        electroculture: gameData.electroculture,
        unlockedCrops: gameData.unlockedCrops,
        minigames: gameData.minigames,
        regionStats: gameData.regionStats,
        timeOfDay: gameData.timeOfDay
    };

    localStorage.setItem('electrocultivo_save', JSON.stringify(saveObject));
    // No mostramos alerta en cada autosave para no molestar,
    // pero si se llama manualmente (ej: al salir), se podría mostrar.
}

function loadGame() {
    const saved = localStorage.getItem('electrocultivo_save');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);

            // Cargar datos básicos con valores por defecto si faltan (migración)
            gameData.money = parsed.money ?? 500;
            gameData.energy = parsed.energy ?? 100;
            gameData.level = parsed.level ?? 1;
            gameData.xp = parsed.xp ?? 0;
            gameData.day = parsed.day ?? 1;
            gameData.year = parsed.year ?? 1;
            gameData.season = parsed.season ?? 'spring';
            gameData.currentRegion = parsed.currentRegion ?? 'castillalamancha';
            gameData.unlockedRegions = parsed.unlockedRegions ?? ['castillalamancha'];

            // Cargar granjas (critico)
            gameData.farms = parsed.farms ?? {};

            // Cargar inventario mezclando con estructura base para evitar undefined
            if (parsed.inventory) {
                gameData.inventory.seeds = parsed.inventory.seeds || {};
                gameData.inventory.harvests = parsed.inventory.harvests || {};
                gameData.inventory.tools = { ...gameData.inventory.tools, ...parsed.inventory.tools };
            }

            // Cargar electrocultura
            if (parsed.electroculture) {
                gameData.electroculture = { ...gameData.electroculture, ...parsed.electroculture };
            }

            gameData.unlockedCrops = parsed.unlockedCrops ?? [];
            gameData.timeOfDay = Number.isInteger(parsed.timeOfDay) ? parsed.timeOfDay : 0;
            gameData.minigames = parsed.minigames ?? { playedToday: 0, lastReset: new Date().toISOString().split('T')[0] };

            // Migración: Stats de región
            gameData.regionStats = parsed.regionStats || {};

            console.log('Juego cargado correctamente');
        } catch (e) {
            console.error('Error al cargar partida:', e);
            showToast('⚠️ No se pudo cargar la partida: empezamos de nuevo');
            initGame(); // Reiniciar si falla
        }
    } else {
        console.log('No hay partida guardada, iniciando nueva.');
        initGame();
    }
}
