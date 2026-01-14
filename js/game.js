// ============ INICIALIZACIÓN ============
function startGame() {
    document.getElementById('loginChoiceModal').classList.remove('hidden');
}

function loginWithGoogle() {
    alert('Simulando conexión con Google Account...\n¡Autenticado con éxito! Cargando datos desde la nube (simulado).');
    startLocalGame(); // For now, both use local save logic
}

function startLocalGame() {
    document.getElementById('loginChoiceModal').classList.add('hidden');
    document.getElementById('mainMenu').classList.add('hidden');
    document.getElementById('gameContainer').classList.remove('hidden');

    loadSettings();
    loadGame(); // Cargar progreso del usuario

    // Si es una partida nueva, inicializar
    if (!gameData.farms[gameData.currentRegion]) {
        initGame();
    }

    updateUI();
    renderFarm();
    renderShop();
    renderElectroculture();

    setTimeout(() => {
        colorizeMapRegions();
        addRegionEmojis();
    }, 100);
}

function initGame() {
    initFarmForRegion('castillalamancha');
    gameData.inventory.seeds = { trigo: 5, cebada: 5, azafran: 2, uva: 3 };
    updateUI();
    renderFarm();
    renderShop();
    renderElectroculture();
}

function initGame() {
    initFarmForRegion('castillalamancha');
    gameData.inventory.seeds = { trigo: 5, cebada: 5, azafran: 2, uva: 3 };
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
    } else if (view === 'shop') renderShop();
    else if (view === 'electroculture') renderElectroculture();
    else if (view === 'inventory') renderInventory();
}

function updateFarmBackground() {
    const farm = document.getElementById('farmFullscreen');
    farm.classList.remove('spring', 'summer', 'autumn', 'winter');
    farm.classList.add(gameData.season);
}

// ============ UI ============
function updateUI() {
    document.getElementById('money').textContent = Math.floor(gameData.money);
    document.getElementById('energy').textContent = Math.floor(gameData.energy);
    document.getElementById('level').textContent = gameData.level;

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

    const farm = gameData.farms[gameData.currentRegion];
    if (!farm) return;

    farm.plots.forEach((plot, index) => {
        const cell = document.createElement('div');
        cell.className = 'farm-plot w-16 h-16 sm:w-18 sm:h-18 md:w-20 md:h-20 flex items-center justify-center cursor-pointer relative transition-all duration-300';

        if (plot.planted) {
            const crop = crops[plot.planted];
            const progress = Math.min(plot.daysGrown / getGrowTime(plot.planted), 1);

            cell.classList.add('planted');
            if (plot.watered) cell.classList.add('watered');

            if (plot.ready) {
                cell.classList.add('ready');
                const hasElectro = Object.values(gameData.electroculture).some(v => v);
                cell.innerHTML = `
                    <div class="plant-icon plant-sway text-3xl md:text-4xl ${hasElectro ? 'electro-active' : ''}">${crop.emoji}</div>
                    <div class="yield-badge">${plot.yieldAmount.toFixed(1)}${crop.unit}</div>
                `;
                cell.title = `${crop.name} - ¡LISTO! ${plot.yieldAmount.toFixed(1)} ${crop.unit}`;
                cell.onclick = () => startFullHarvest(index);
            } else {
                const stage = progress < 0.25 ? '🌱' : progress < 0.5 ? '🌿' : progress < 0.75 ? '🪴' : crop.emoji;
                cell.innerHTML = `
                    <div class="plant-icon plant-sway text-2xl md:text-3xl">${stage}</div>
                    <div class="growth-bar"><div class="growth-bar-fill" style="width: ${progress * 100}%"></div></div>
                `;
                cell.title = `${crop.name} - ${Math.floor(progress * 100)}% (${Math.ceil(getGrowTime(plot.planted) - plot.daysGrown)} días restantes)`;

                cell.onmousedown = (e) => startSpraying(index, e);
                cell.onmouseup = stopSpraying;
                cell.onmouseleave = stopSpraying;
            }
        } else if (plot.plowed) {
            cell.classList.add('plowed');
            cell.innerHTML = '<span class="text-amber-200/50 text-3xl font-bold">✨</span>';
            cell.title = 'Parcela arada - Clic para plantar';
            cell.onclick = () => openPlantModal(index);
        } else {
            cell.classList.add('unplowed');
            cell.innerHTML = '<span class="text-white/20 text-3xl font-bold">🍂</span>';
            cell.title = 'Tierra sin arar - Mantén 2s para arar';

            cell.onmousedown = () => startPlowing(index);
            cell.onmouseup = stopPlowing;
            cell.onmouseleave = stopPlowing;
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
            item.className = `p-2 rounded-lg flex items-center gap-2 ${inSeason ? 'bg-green-800/80' : 'bg-gray-700/80'}`;
            item.innerHTML = `
                <span class="text-xl">${crop.emoji}</span>
                <div class="flex-1 min-w-0">
                    <p class="text-white text-xs font-bold truncate">${crop.name}</p>
                    <p class="text-xs ${inSeason ? 'text-green-300' : 'text-red-300'}">${inSeason ? '✓ En temporada' : '✗ Fuera temp.'}</p>
                </div>
                <span class="text-yellow-300 font-bold">${qty}</span>
            `;
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
        item.innerHTML = `<span>${crop.emoji}</span><span class="truncate flex-1 text-xs">${crop.name}</span><span class="text-yellow-300 text-xs">${qty.toFixed(1)}${crop.unit}</span>`;
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
                <span class="text-3xl">${crop.emoji}</span>
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
        alert('¡No tienes suficiente energía! Juega minijuegos o descansa.');
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

    gameData.energy -= 5;
    closePlantModal();
    renderFarm();
    renderSeeds();
    updateUI();
    saveGame();
}

function interactPlot(index) {
    const farm = gameData.farms[gameData.currentRegion];
    const plot = farm.plots[index];
    if (!plot.planted) return;

    if (plot.ready) harvestPlot(index);
    else if (!plot.watered && gameData.energy >= 2) waterPlot(index);
}

function waterPlot(index) {
    const cost = gameData.inventory.tools.regadera ? 1 : 2;
    if (gameData.energy < cost) return;

    gameData.farms[gameData.currentRegion].plots[index].watered = true;
    gameData.energy -= cost;
    renderFarm();
    updateUI();
    saveGame();
}

function waterAll() {
    const cost = gameData.inventory.tools.regadera ? 5 : 10;
    if (gameData.energy < cost) {
        alert('¡No tienes suficiente energía!');
        return;
    }

    gameData.farms[gameData.currentRegion].plots.forEach(plot => {
        if (plot.planted && !plot.ready) plot.watered = true;
    });

    gameData.energy -= cost;
    renderFarm();
    updateUI();
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
}

function harvestAll() {
    const farm = gameData.farms[gameData.currentRegion];
    farm.plots.forEach((plot, i) => {
        if (plot.ready) harvestPlot(i);
    });
}

function expandFarm() {
    if (gameData.money < 500) {
        alert('¡Necesitas 500💰 para expandir!');
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

    updateFarmBackground();
    renderFarm();
    updateUI();
    saveGame();
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

function gainXP(amount) {
    gameData.xp += amount;
    while (gameData.xp >= gameData.xpNeeded) {
        gameData.xp -= gameData.xpNeeded;
        gameData.level++;
        gameData.xpNeeded = Math.floor(gameData.xpNeeded * 1.5);

        const regionOrder = Object.keys(regions);
        if (gameData.level <= regionOrder.length) {
            const newRegion = regionOrder[gameData.level - 1];
            if (!gameData.unlockedRegions.includes(newRegion)) {
                gameData.unlockedRegions.push(newRegion);
                initFarmForRegion(newRegion);
                alert(`🎉 ¡Nivel ${gameData.level}! Desbloqueaste ${regions[newRegion].name}!`);
            }
        }
    }
    updateUI();
}

// ============ INVENTARIO ============
function renderInventory() {
    const grid = document.getElementById('inventoryGrid');
    const sell = document.getElementById('sellInventory');
    if (!grid || !sell) return;

    const harvests = Object.entries(gameData.inventory.harvests).filter(([_, q]) => q > 0);

    if (harvests.length === 0) {
        grid.innerHTML = '<p class="text-gray-400 col-span-full text-center py-8">Sin cosechas aún</p>';
        sell.innerHTML = '<p class="text-gray-400 text-center py-8">Cosecha productos primero</p>';
        document.getElementById('totalInventoryValue').textContent = '0 💰';
        return;
    }

    grid.innerHTML = '';
    sell.innerHTML = '';
    let total = 0;

    harvests.forEach(([cropId, qty]) => {
        const crop = crops[cropId];
        const price = crop.pricePerUnit * getPriceMultiplier();
        const value = qty * price;
        total += value;

        const item = document.createElement('div');
        item.className = 'inventory-item flex flex-col items-center p-3 bg-white/10 rounded-xl';
        item.innerHTML = `
            <span class="text-3xl">${crop.emoji}</span>
            <p class="text-amber-900 font-bold text-sm">${crop.name}</p>
            <p class="text-amber-700 text-xs">${qty.toFixed(1)} ${crop.unit}</p>
            <p class="text-green-700 font-bold text-xs mb-2">${Math.floor(value)}💰</p>
            <button onclick="recycleHarvest('${cropId}')" 
                class="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] py-1 rounded font-bold transition-all"
                title="Consigue semillas de este fruto">
                ♻️ Reciclar
            </button>
        `;
        grid.appendChild(item);

        const sellItem = document.createElement('div');
        sellItem.className = 'bg-green-800/50 p-3 rounded-lg flex items-center gap-3';
        sellItem.innerHTML = `
            <span class="text-2xl">${crop.emoji}</span>
            <div class="flex-1">
                <p class="text-white font-bold">${crop.name}</p>
                <p class="text-green-300 text-sm">${qty.toFixed(1)} ${crop.unit} × ${price.toFixed(2)}💰</p>
            </div>
            <button onclick="sellHarvest('${cropId}')" class="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg font-bold">
                ${Math.floor(value)}💰
            </button>
        `;
        sell.appendChild(sellItem);
    });

    document.getElementById('totalInventoryValue').textContent = `${Math.floor(total)} 💰`;
}

function sellHarvest(cropId) {
    const qty = gameData.inventory.harvests[cropId];
    if (!qty || qty <= 0) return;

    const crop = crops[cropId];
    const price = Math.floor(qty * crop.pricePerUnit * getPriceMultiplier());
    gameData.money += price;
    delete gameData.inventory.harvests[cropId];

    updateUI();
    renderInventory();
    renderQuickInventory();
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
    gameData.inventory.harvests = {};

    updateUI();
    renderInventory();
    renderQuickInventory();
    saveGame();
}

function recycleHarvest(cropId) {
    const qty = gameData.inventory.harvests[cropId];
    if (!qty || qty <= 0) return;

    const crop = crops[cropId];
    // Formula: 10 seeds per unit (kg or unid) initially, plus production bonuses
    const baseSeedsPerUnit = 10;
    const seedsGained = Math.floor(qty * baseSeedsPerUnit * gameData.recyclingBonus);

    if (seedsGained <= 0) {
        alert('No hay suficiente cantidad para reciclar semillas.');
        return;
    }

    if (confirm(`¿Quieres reciclar ${qty.toFixed(1)} ${crop.unit} de ${crop.name} para obtener ${seedsGained} semillas?`)) {
        gameData.inventory.seeds[cropId] = (gameData.inventory.seeds[cropId] || 0) + seedsGained;
        delete gameData.inventory.harvests[cropId];

        alert(`♻️ ¡Reciclaje completado! Has obtenido ${seedsGained} semillas de ${crop.name}.`);

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
    updateUI();
    saveGame();
}

// ============ TIENDA ============
function renderShop() {
    renderShopSeeds();
    renderShopTools();
    renderShopElectro();
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
                <span class="text-2xl">${crop.emoji}</span>
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
        alert('¡Dinero insuficiente!');
        return;
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
        alert('¡Dinero insuficiente!');
        return;
    }
    gameData.money -= tool.price;
    gameData.inventory.tools[toolId] = true;
    updateUI();
    renderShopTools();
}

function buyElectro(eqId) {
    const eq = electroEquipment[eqId];
    if (gameData.money < eq.price) {
        alert('¡Dinero insuficiente!');
        return;
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
    const costs = { catch: 10, pest: 5, water: 0, electric: 15 };
    if (gameData.energy < costs[type]) {
        alert('¡Energía insuficiente!');
        return;
    }
    gameData.energy -= costs[type];
    updateUI();

    minigameType = type;
    minigameScore = 0;
    document.getElementById('minigameScore').textContent = '0';
    document.getElementById('minigameTimer').textContent = '30';

    const titles = { catch: '🧺 Atrapa la Cosecha', pest: '🐛 Elimina Plagas', water: '💧 Riego Rápido', electric: '⚡ Carga Eléctrica' };
    document.getElementById('minigameTitle').textContent = titles[type];
    document.getElementById('minigameModal').classList.remove('hidden');

    const area = document.getElementById('minigameArea');
    area.innerHTML = '';

    if (type === 'catch') startCatchGame(area);
    else if (type === 'pest') startPestGame(area);
    else if (type === 'water') startWaterGame(area);
    else if (type === 'electric') startElectricGame(area);

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

    let reward = '';
    if (minigameType === 'catch') {
        gameData.money += minigameScore;
        reward = `+${minigameScore}💰`;
    } else if (minigameType === 'pest') {
        gameData.money += minigameScore;
        reward = `+${minigameScore}💰`;
    } else if (minigameType === 'water') {
        const energy = Math.min(minigameScore / 2, 40);
        gameData.energy = Math.min(gameData.maxEnergy, gameData.energy + energy);
        reward = `+${Math.floor(energy)}⚡`;
    } else if (minigameType === 'electric') {
        gameData.energy = Math.min(gameData.maxEnergy, gameData.energy + 40);
        gameData.money += Math.floor(minigameScore / 3);
        reward = `+40⚡ +${Math.floor(minigameScore / 3)}💰`;
    }

    setTimeout(() => {
        alert(`🎉 ¡Juego terminado!\n\nPuntos: ${minigameScore}\nRecompensa: ${reward}`);
        closeMinigame();
        updateUI();
    }, 100);
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
        alert('¡Energía insuficiente!');
        return;
    }
    gameData.isHolding = true;
    let progress = 0;
    const plotDiv = document.getElementById('farmGrid').children[index];
    const progressCircle = document.createElement('div');
    progressCircle.className = 'hold-progress';
    progressCircle.innerHTML = '<div class="hold-progress-circle"></div>';
    plotDiv.appendChild(progressCircle);

    holdTimer = setInterval(() => {
        progress += 5;
        if (progress >= 100) {
            stopPlowing();
            finishPlowing(index);
        }
    }, 100);
}

function stopPlowing() {
    gameData.isHolding = false;
    clearInterval(holdTimer);
    document.querySelectorAll('.hold-progress').forEach(el => el.remove());
}

function finishPlowing(index) {
    gameData.farms[gameData.currentRegion].plots[index].plowed = true;
    gameData.energy -= 5;
    renderFarm();
    updateUI();
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
    if (hose) {
        hose.style.left = e.clientX + 'px';
        hose.style.top = e.clientY + 'px';
    }
}

function stopSpraying() {
    gameData.isSpraying = false;
    clearInterval(sprayTimer);
    document.body.classList.remove('spray-cursor');
    document.getElementById('hoseEffect')?.remove();
    document.removeEventListener('mousemove', updateHosePosition);
}

function finishWatering(index) {
    const cost = gameData.inventory.tools.regadera ? 1 : 2;
    gameData.farms[gameData.currentRegion].plots[index].watered = true;
    gameData.energy -= cost;
    renderFarm();
    updateUI();
}

function startFullHarvest(index) {
    const plot = gameData.farms[gameData.currentRegion].plots[index];
    const crop = crops[plot.planted];

    document.getElementById('harvestOverlay').classList.remove('hidden');
    document.getElementById('harvestTitle').textContent = `🍎 Cosechando ${crop.name}`;
    const area = document.getElementById('harvestFruitArea');
    area.innerHTML = '';

    collectedFruits = 0;
    const totalToCollect = Math.ceil(plot.yieldAmount);
    document.getElementById('collectedCount').textContent = '0';
    document.getElementById('totalToCollect').textContent = ` / ${totalToCollect}`;

    for (let i = 0; i < totalToCollect; i++) {
        const fruit = document.createElement('div');
        fruit.className = 'harvest-fruit';
        fruit.textContent = crop.emoji;
        fruit.style.left = Math.random() * 80 + 10 + '%';
        fruit.style.top = Math.random() * 80 + 10 + '%';
        fruit.style.position = 'absolute';
        fruit.style.animationDelay = (Math.random() * 2) + 's';

        fruit.onclick = () => {
            if (!fruit.classList.contains('picked')) {
                fruit.classList.add('picked');
                collectedFruits++;
                document.getElementById('collectedCount').textContent = collectedFruits;
                if (collectedFruits >= totalToCollect) {
                    setTimeout(() => finishFullHarvest(index, totalToCollect), 600);
                }
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
                    <span class="text-4xl">${crop.emoji}</span>
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
                        <p class="text-yellow-300 font-bold">📊 Datos del cultivo</p>
                        <p class="text-gray-300">⏱️ ${crop.growTime} días | 💰 ${crop.pricePerUnit}/${crop.unit}</p>
                        <p class="text-gray-300">🌱 Rinde: ${crop.yieldMin}-${crop.yieldMax} ${crop.unit}</p>
                    </div>
                </div>
            `;
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
    alert('✅ Ajustes guardados');
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
