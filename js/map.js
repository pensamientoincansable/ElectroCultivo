// ============ MAPA DE REGIONES ============

// Apply colors from regions data to SVG paths
function colorizeMapRegions() {
    const regionsList = [
        'galicia', 'asturias', 'cantabria', 'paisvasco', 'navarra', 'larioja',
        'aragon', 'cataluna', 'castillayleon', 'madrid', 'castillalamancha',
        'extremadura', 'valencia', 'murcia', 'andalucia'
    ];

    regionsList.forEach(id => {
        const path = document.getElementById('region-' + id);
        const regionData = regions[id];
        if (path && regionData) {
            // Apply region color
            path.setAttribute('fill', regionData.color);
            path.setAttribute('stroke', '#1a1a1a');
            path.setAttribute('stroke-width', '2');
        }
    });
}

// Update map with region emojis as text overlays
function addRegionEmojis() {
    const svg = document.querySelector('#mapView svg');
    if (!svg) return;

    const emojiPositions = {
        galicia: { x: 145, y: 175 },
        asturias: { x: 240, y: 140 },
        cantabria: { x: 340, y: 125 },
        paisvasco: { x: 418, y: 115 },
        navarra: { x: 505, y: 125 },
        larioja: { x: 420, y: 168 },
        aragon: { x: 550, y: 240 },
        cataluna: { x: 695, y: 220 },
        castillayleon: { x: 265, y: 260 },
        madrid: { x: 355, y: 345 },
        castillalamancha: { x: 415, y: 400 },
        extremadura: { x: 195, y: 400 },
        valencia: { x: 610, y: 395 },
        murcia: { x: 565, y: 495 },
        andalucia: { x: 315, y: 520 }
    };

    Object.entries(emojiPositions).forEach(([id, pos]) => {
        const regionData = regions[id];
        if (regionData) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('x', pos.x);
            text.setAttribute('y', pos.y);
            text.setAttribute('font-size', '28');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('style', 'pointer-events:none;');
            text.textContent = regionData.emoji;
            svg.appendChild(text);
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
