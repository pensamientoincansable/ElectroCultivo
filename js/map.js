// ============ MAPA DE REGIONES ============

// Apply colors from regions data to SVG paths
function colorizeMapRegions() {
    if (!regions) return;

    Object.keys(regions).forEach(id => {
        const pathEl = document.getElementById('region-' + id);
        const regionData = regions[id];

        if (pathEl && regionData) {
            // Apply region color
            pathEl.setAttribute('fill', regionData.color || '#4b5563');
            pathEl.setAttribute('stroke', 'rgba(26, 26, 26, 0.4)');
            pathEl.setAttribute('stroke-width', '1');

            // Update path d attribute if points are available
            if (regionData.path) {
                const points = regionData.path.split(' ');
                const d = `M ${points[0]} L ${points.slice(1).join(' L ')} Z`;
                pathEl.setAttribute('d', d);
            }
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
