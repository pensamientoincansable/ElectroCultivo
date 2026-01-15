// ============ MAPA DE REGIONES ============

// Apply colors from regions data to SVG paths
function colorizeMapRegions() {
    if (!regions) return;

    const mapGroup = document.getElementById('map-regions');
    if (!mapGroup) return;

    // Clear existing paths to avoid duplicates if re-running
    mapGroup.innerHTML = '';

    Object.keys(regions).forEach(id => {
        const regionData = regions[id];

        if (regionData && regionData.path) {
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            pathEl.setAttribute('id', 'region-' + id);

            // Determine class based on locked status (check gameData if available or default)
            const isUnlocked = gameData.unlockedRegions && gameData.unlockedRegions.includes(id);
            const isCurrent = gameData.currentRegion === id;

            let className = 'region';
            if (!isUnlocked && id !== 'castillalamancha') className += ' locked'; // Default locked except start
            if (isCurrent) className += ' current';

            pathEl.setAttribute('class', className);

            // Construct path d attribute
            // Data has "x,y x,y", convert to "M x,y L x,y Z"
            // Note: My recent data update put "M x,y ..." format directly in some cases or simple points?
            // Let's check format. The updated data has "x,y x,y ...". 
            // So we need to format it.
            const points = regionData.path.trim().split(' ');
            const d = `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;
            pathEl.setAttribute('d', d);

            pathEl.setAttribute('fill', regionData.color || '#4b5563');
            pathEl.setAttribute('stroke', 'rgba(26, 26, 26, 0.4)');
            pathEl.setAttribute('onclick', `selectRegion('${id}')`);

            mapGroup.appendChild(pathEl);
        }
    });
}

// Update map with region labels and emojis
function addRegionEmojis() {
    const container = document.getElementById('mapLabels');
    if (!container) return;
    container.innerHTML = ''; // Clear existing

    Object.keys(regions).forEach(id => {
        const regionData = regions[id];
        const center = regionData.center;

        if (regionData && center) {
            // Create HTML overlay group
            const group = document.createElement('div');
            group.className = 'label-group absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center';

            // Calculate percentage position relative to 800x800 viewBox
            const leftPercent = (center.x / 800) * 100;
            const topPercent = (center.y / 800) * 100;

            group.style.left = `${leftPercent}%`;
            group.style.top = `${topPercent}%`;

            // Emoji
            const emoji = document.createElement('div');
            emoji.className = 'region-emoji text-center leading-none';
            emoji.textContent = regionData.emoji;
            group.appendChild(emoji);

            // Label
            const label = document.createElement('div');
            label.className = 'region-label text-center whitespace-nowrap leading-none mt-1';
            label.textContent = regionData.name;
            group.appendChild(label);

            container.appendChild(group);
        }
    });
}

function selectRegion(regionId) {
    if (!gameData.unlockedRegions.includes(regionId)) {
        const region = regions[regionId];
        alert(`🔒 ${region.name} está bloqueada.\n\nNecesitas nivel ${region.level} para desbloquearla.\nTu nivel actual: ${gameData.level}`);
        return;
    }

    gameData.currentRegion = regionId;
    initFarmForRegion(regionId);
    updateUI();
    showView('farm');
}
