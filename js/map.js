// ============ MAPA DE REGIONES ============

// Render interactive markers (emojis) for each region
function addRegionEmojis() {
    const container = document.getElementById('mapLabels');
    if (!container) return;

    // Ensure container allows pointer events for children but not itself
    // heavily enforce this to prevent blocking
    container.style.pointerEvents = 'none';
    container.innerHTML = ''; // Clear existing

    Object.keys(regions).forEach(id => {
        const regionData = regions[id];
        const center = regionData.center;

        if (regionData && center) {
            // Create HTML overlay group (The "Pin")
            // vital: pointer-events-auto so it captures clicks even if container is none
            // Added explicit z-50 and cursor-pointer
            const group = document.createElement('div');
            group.className = 'label-group absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-125 z-50 pointer-events-auto';
            group.dataset.region = id;

            // Calculate percentage position relative to 800x600 layout
            const leftPercent = (center.x / 800) * 100;
            const topPercent = (center.y / 600) * 100;

            group.style.left = `${leftPercent}%`;
            group.style.top = `${topPercent}%`;

            // Interaction - Catch all common events
            const handleClick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Ensure globally available function is called
                if (typeof window.selectRegion === 'function') {
                    window.selectRegion(id);
                } else if (typeof selectRegion === 'function') {
                    selectRegion(id);
                } else {
                    console.error('selectRegion function not found');
                    // Fallback try
                    try {
                        selectRegion(id);
                    } catch (err) {
                        console.error(err);
                    }
                }
            };

            group.onclick = handleClick;
            group.ontouchend = handleClick;

            // Emoji (The visible pin)
            const emoji = document.createElement('div');
            emoji.className = 'region-emoji text-center leading-none filter drop-shadow-md text-3xl md:text-4xl';

            const isUnlocked = gameData.unlockedRegions && gameData.unlockedRegions.includes(id);
            if (!isUnlocked && id !== 'castillalamancha') {
                emoji.style.opacity = '0.8';
                emoji.style.filter = 'grayscale(100%)';
                emoji.textContent = regionData.emoji;

                // Small lock indicator
                const lockOverlay = document.createElement('div');
                lockOverlay.textContent = '🔒';
                lockOverlay.className = 'absolute -top-1 -right-2 text-sm bg-white/80 rounded-full w-5 h-5 flex items-center justify-center shadow-sm text-black';
                group.appendChild(lockOverlay);
            } else {
                emoji.textContent = regionData.emoji;
                // Bounce effect for current region
                if (gameData.currentRegion === id) {
                    emoji.classList.add('animate-bounce');
                    // Add a highlight ring
                    const ring = document.createElement('div');
                    ring.className = 'absolute inset-0 bg-yellow-400/30 rounded-full animate-ping';
                    group.appendChild(ring);
                }
            }

            group.appendChild(emoji);

            // Tooltip style label on hover
            const tooltip = document.createElement('div');
            tooltip.className = 'region-tooltip absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50';
            tooltip.textContent = regionData.name;
            group.appendChild(tooltip);

            container.appendChild(group);
        }
    });
}

// Global legacy function support - kept for compatibility
function colorizeMapRegions() {
    const mapGroup = document.getElementById('map-regions');
    if (mapGroup) mapGroup.innerHTML = '';
}

/* Selecciona una región: muestra su ficha (cultivos, nivel, granja) en el
   panel lateral y permite viajar a ella si está desbloqueada. */
function selectRegion(regionId) {
    const region = regions[regionId];
    if (!region) return;
    const unlocked = gameData.unlockedRegions.includes(regionId);
    const isCurrent = gameData.currentRegion === regionId;

    // Marca visual del marcador elegido
    document.querySelectorAll('#mapLabels .label-group').forEach(g => g.classList.remove('ring-4', 'ring-yellow-300', 'rounded-full'));
    const marker = document.querySelector(`#mapLabels .label-group[data-region="${regionId}"]`);
    if (marker) marker.classList.add('ring-4', 'ring-yellow-300', 'rounded-full');

    const panel = document.getElementById('regionInfo');
    if (panel) {
        const cropList = region.crops.map(id => {
            const crop = crops[id];
            if (!crop) return '';
            const inSeason = crop.seasons.includes(gameData.season);
            return `<div class="flex items-center gap-2 bg-black/25 rounded-xl p-2 ${inSeason ? '' : 'opacity-70'}">
                ${FarmArt.product(id)}
                <div class="min-w-0">
                    <p class="text-white text-sm font-bold truncate">${crop.name}</p>
                    <p class="text-${inSeason ? 'green' : 'gray'}-300 text-[11px]">${inSeason ? '✓ En temporada' : 'Fuera de temporada'}</p>
                </div>
            </div>`;
        }).join('');

        panel.innerHTML = `
            <div class="flex items-center gap-3 mb-2">
                <span class="text-3xl">${region.emoji}</span>
                <div>
                    <h3 class="title-font text-xl text-yellow-300">${region.name}</h3>
                    <p class="text-amber-300 text-xs">${FarmWorld.placeLabel(regionId) || ''}</p>
                </div>
            </div>
            <div class="flex items-center justify-between text-xs text-green-200 mb-3">
                <span>Nivel requerido: <b class="text-white">${region.level}</b></span>
                <span>Parcelas: <b class="text-white">${gameData.farms[regionId]?.plots.length ?? region.farmSize}</b></span>
            </div>
            <h4 class="text-amber-200 text-sm font-bold mb-2">🌱 Cultivos de la zona</h4>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">${cropList}</div>
            <div class="mt-4">
                ${unlocked
                    ? `<button onclick="travelToRegion('${regionId}')" class="w-full ${isCurrent ? 'bg-amber-700 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-500'} text-white px-4 py-3 rounded-xl font-bold transition-all">
                        ${isCurrent ? '🌾 Ya estás en esta granja' : `🌾 Ir a la granja de ${region.name}`}
                       </button>`
                    : `<div class="bg-black/40 rounded-xl p-3 text-center">
                        <p class="text-red-300 font-bold">🔒 Región bloqueada</p>
                        <p class="text-gray-300 text-xs mt-1">Alcanza el nivel ${region.level} para desbloquearla (ahora: ${gameData.level})</p>
                       </div>`}
            </div>
        `;
        panel.querySelectorAll('svg').forEach(svg => svg.classList.add('prod-sprite', 'sm'));
    }
}

// Ensure functions are available globally
window.addRegionEmojis = addRegionEmojis;
window.colorizeMapRegions = colorizeMapRegions;
window.selectRegion = selectRegion;
