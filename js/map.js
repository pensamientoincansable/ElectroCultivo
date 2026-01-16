// ============ MAPA DE REGIONES ============

// Map rendering logic - now based on interactive markers (pins)

// No longer rendering paths as the background image contains boundaries
function colorizeMapRegions() {
    // Legacy function kept for compatibility with showView, but now a no-op
    // or we could use it to create invisible hit areas if needed, 
    // but the plan is to use the markers as the primary interaction.
    const mapGroup = document.getElementById('map-regions');
    if (mapGroup) mapGroup.innerHTML = ''; // Clear any leftover paths
}

// Render interactive markers (emojis) for each region
function addRegionEmojis() {
    const container = document.getElementById('mapLabels');
    if (!container) return;
    container.innerHTML = ''; // Clear existing

    Object.keys(regions).forEach(id => {
        const regionData = regions[id];
        const center = regionData.center;

        if (regionData && center) {
            // Create HTML overlay group (The "Pin")
            const group = document.createElement('div');
            group.className = 'label-group absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer transition-transform duration-200 hover:scale-110 z-10';

            // Calculate percentage position relative to 800x600 viewBox (SVG viewBox updated in index.html to 800x600 previously)
            // Wait, previous data logic assumed 800x800 or similar.
            // Let's stick to percentages based on the coordinate system we established.
            // If data.js coords are based on 800x600, then x/800, y/600.
            // If they are 800x800, then x/800, y/800.
            // To be safe, let's use the X/800, Y/600 logic if the container aspect ratio matches the image.

            const leftPercent = (center.x / 800) * 100;
            const topPercent = (center.y / 600) * 100; // Adjusted for 800x600 assumption or similar map ratio

            group.style.left = `${leftPercent}%`;
            group.style.top = `${topPercent}%`;

            // Interaction
            group.onclick = (e) => {
                e.stopPropagation(); // Prevent bubbling
                selectRegion(id);
            };

            // Emoji (The visible pin)
            const emoji = document.createElement('div');
            emoji.className = 'region-emoji text-center leading-none filter drop-shadow-md';
            // Add a "pin" effect or background circle if unlocked?
            const isUnlocked = gameData.unlockedRegions && gameData.unlockedRegions.includes(id);
            if (!isUnlocked && id !== 'castillalamancha') {
                emoji.style.opacity = '0.7';
                emoji.style.filter = 'grayscale(100%)';
                emoji.innerHTML = '🔒'; // Lock icon for locked regions?? Or keep region emoji but grey?
                // User said "coloca bien los emoticonos", implying the region emoji.
                emoji.textContent = regionData.emoji;
                // Add a small lock indicator maybe?
                const lockOverlay = document.createElement('span');
                lockOverlay.textContent = '🔒';
                lockOverlay.className = 'absolute -top-2 -right-2 text-xs';
                group.appendChild(lockOverlay);
            } else {
                emoji.textContent = regionData.emoji;
                // Add a subtle bounce or glow for current/unlocked
                if (gameData.currentRegion === id) {
                    emoji.classList.add('animate-bounce');
                }
            }

            group.appendChild(emoji);

            // Label (Region Name) - Optional, user said "ya tiene los nombres".
            // "como la imagen ya tiene sus lineas delimitantes elimina las que habiamos puesto tan solo coloca bien los emoticonos"
            // The image HAS names. So we might NOT need the text label.
            // But having a tooltip or hover label is nice.
            // Let's keep it but make it visible only on hover? Or remove it as per "tan solo coloca bien los emoticonos".
            // I will remove the permanent label to respect "image already has names".

            // Tooltip style label on hover
            const tooltip = document.createElement('div');
            tooltip.className = 'region-tooltip absolute -bottom-8 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none';
            tooltip.textContent = regionData.name;
            group.appendChild(tooltip);

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
