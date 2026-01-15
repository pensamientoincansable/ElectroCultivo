// ============ MAPA DE REGIONES ============

// Apply colors from regions data to SVG paths
function colorizeMapRegions() {
    if (!regions) {
        console.error("Regions data not found!");
        return;
    }

    Object.keys(regions).forEach(id => {
        const path = document.getElementById('region-' + id);
        const regionData = regions[id];
        if (path && regionData) {
            // Apply region color
            path.setAttribute('fill', regionData.color || '#4b5563');
            path.setAttribute('stroke', '#1a1a1a');
            path.setAttribute('stroke-width', '2');
        }
    });
}

// Update map with region labels and emojis
function addRegionEmojis() {
    const container = document.getElementById('mapLabels');
    if (!container) return;
    container.innerHTML = ''; // Clear existing

    // Posiciones en el SVG (ajustadas)
    const regionPositions = {
        galicia: { x: 150, y: 175 },
        asturias: { x: 245, y: 135 },
        cantabria: { x: 345, y: 120 },
        paisvasco: { x: 420, y: 110 },
        navarra: { x: 510, y: 125 },
        larioja: { x: 425, y: 170 },
        aragon: { x: 550, y: 245 },
        cataluna: { x: 700, y: 220 },
        castillayleon: { x: 270, y: 260 },
        madrid: { x: 360, y: 345 },
        castillalamancha: { x: 410, y: 410 },
        extremadura: { x: 200, y: 410 },
        valencia: { x: 615, y: 395 },
        murcia: { x: 565, y: 500 },
        andalucia: { x: 320, y: 525 }
    };

    Object.entries(regionPositions).forEach(([id, pos]) => {
        const regionData = regions[id];
        if (regionData) {
            const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            group.setAttribute('class', 'label-group');

            // Emoji (above text)
            const emoji = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            emoji.setAttribute('x', pos.x);
            emoji.setAttribute('y', pos.y - 18);
            emoji.setAttribute('class', 'region-emoji');
            emoji.setAttribute('text-anchor', 'middle');
            emoji.setAttribute('font-size', '20');
            emoji.textContent = regionData.emoji;
            group.appendChild(emoji);

            // Label (Region Name)
            const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            label.setAttribute('x', pos.x);
            label.setAttribute('y', pos.y + 12);
            label.setAttribute('class', 'region-label');
            label.setAttribute('text-anchor', 'middle');
            label.setAttribute('fill', 'white');
            label.setAttribute('font-weight', 'bold');
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
