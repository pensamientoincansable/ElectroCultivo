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

// Ensure functions are available globally
window.addRegionEmojis = addRegionEmojis;
window.colorizeMapRegions = colorizeMapRegions;
