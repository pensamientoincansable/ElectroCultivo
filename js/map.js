// ============ MAPA DE REGIONES ============

function updateMapPatterns() {
    // Dynamically adjust flags to fit regions perfectly
    const regionsList = [
        'galicia', 'asturias', 'cantabria', 'paisvasco', 'navarra', 'larioja',
        'aragon', 'cataluna', 'castillayleon', 'madrid', 'castillalamancha',
        'extremadura', 'valencia', 'murcia', 'andalucia'
    ];

    regionsList.forEach(id => {
        const path = document.getElementById('region-' + id);
        const pattern = document.getElementById('flag-' + id);
        if (path && pattern) {
            const bbox = path.getBBox();

            // Update pattern to use userSpaceOnUse (absolute coordinates)
            pattern.setAttribute('patternUnits', 'userSpaceOnUse');
            pattern.setAttribute('patternContentUnits', 'userSpaceOnUse');
            pattern.setAttribute('x', bbox.x);
            pattern.setAttribute('y', bbox.y);
            pattern.setAttribute('width', bbox.width);
            pattern.setAttribute('height', bbox.height);

            // Update image to fill the bounding box
            const image = pattern.querySelector('image');
            if (image) {
                image.setAttribute('x', 0);
                image.setAttribute('y', 0);
                image.setAttribute('width', bbox.width);
                image.setAttribute('height', bbox.height);
                image.setAttribute('preserveAspectRatio', 'none');
            }
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
