/* ============================================================================
   Previsualización de la granja (paisaje + rejilla de parcelas)
   ----------------------------------------------------------------------------
   Compone una imagen equivalente a lo que se ve en el navegador, respetando el
   orden y la escala de capas de css/styles.css. Sirve para revisar entornos y
   tamaños de los cultivos sin abrir el juego.

   Requiere:  npm i -D @resvg/resvg-js

   Uso:  node tools/farm-preview.js <region> [estación] [momentoDelDía] [salida]
         node tools/farm-preview.js castillalamancha autumn 0 /tmp/granja.png
         (estación: spring|summer|autumn|winter · momento: 0 día 1 atardecer 2 noche 3 amanecer)
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let Resvg;
try { ({ Resvg } = require(path.join(ROOT, 'node_modules', '@resvg', 'resvg-js'))); }
catch (e) {
    try { ({ Resvg } = require('@resvg/resvg-js')); }
    catch (e2) {
        console.error('Falta @resvg/resvg-js →  npm i -D @resvg/resvg-js');
        process.exit(1);
    }
}
const { FarmArt } = require(path.join(ROOT, 'js', 'sprites.js'));
const { FarmWorld } = require(path.join(ROOT, 'js', 'environment.js'));

const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');

const region = process.argv[2] || 'castillalamancha';
const season = process.argv[3] || 'autumn';
const tod = parseInt(process.argv[4] || '0', 10);
const out = process.argv[5] || path.join(process.cwd(), `farm-${region}.png`);

// Ancho de lienzo configurable (para comprobar el aspecto en móvil)
const W = parseInt(process.env.W || '1280', 10);
const WORLD_H = parseInt(process.env.WORLD_H || '360', 10);
const HEADER = 96;
// Igual que SEASON_GROUND en js/game.js
const GROUND = {
    spring: { top: '#86c463', dark: '#69a349' },
    summer: { top: '#a5bf4d', dark: '#86a13a' },
    autumn: { top: '#b39a54', dark: '#957e3f' },
    winter: { top: '#c6d1c9', dark: '#a8b5ad' }
};
const g = GROUND[season] || GROUND.spring;
const scene = FarmWorld.scenes[region] || FarmWorld.scenes.castillalamancha;
const UNITS = { far: 230, mid: 190, near: 150 };
const TOTAL_H = 1180;

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TOTAL_H}" viewBox="0 0 ${W} ${TOTAL_H}">`;
svg += `<defs>
  <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${scene.sky[0]}"/>
    <stop offset="42%" stop-color="${scene.sky[1]}"/>
    <stop offset="72%" stop-color="${scene.sky[2]}"/>
    <stop offset="100%" stop-color="${scene.sky[2]}"/>
  </linearGradient>
  <linearGradient id="hazeG" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${scene.sky[2]}"/>
    <stop offset="100%" stop-color="${scene.sky[2]}" stop-opacity="0"/>
  </linearGradient>
  <clipPath id="worldClip"><rect width="${W}" height="${WORLD_H}"/></clipPath>
</defs>`;

// Suelo de la granja
svg += `<rect width="${W}" height="${TOTAL_H}" fill="${g.top}"/>`;
svg += `<rect y="${WORLD_H + 120}" width="${W}" height="${TOTAL_H}" fill="${g.dark}" opacity=".35"/>`;

// Paisaje
svg += `<g clip-path="url(#worldClip)">`;
svg += `<rect width="${W}" height="${WORLD_H}" fill="url(#skyG)"/>`;
svg += `<g opacity=".85">${[0, 1, 2, 3].map((i) => `<g transform="translate(${90 + i * 300} ${40 + (i % 2) * 34})"><ellipse cx="0" cy="0" rx="46" ry="18" fill="#fff"/><ellipse cx="-24" cy="6" rx="30" ry="13" fill="#fff"/><ellipse cx="26" cy="6" rx="32" ry="14" fill="#fff"/><ellipse cx="4" cy="-11" rx="28" ry="15" fill="#fff"/></g>`).join('')}</g>`;
svg += tod === 2
    ? `<circle cx="1120" cy="80" r="34" fill="#f2f0e0"/>`
    : `<circle cx="1120" cy="80" r="52" fill="rgba(255,225,110,.30)"/><circle cx="1120" cy="80" r="36" fill="#ffe66b"/>`;

const drawLayer = (key, bottomFrac) => {
    const U = UNITS[key];
    const scale = W / 1000;
    const drawH = U * scale;
    const baseline = WORLD_H * (1 - bottomFrac);
    svg += `<g transform="translate(0 ${baseline - drawH}) scale(${scale})">${scene[key](U)}</g>`;
};
drawLayer('far', 0.12);
svg += `<rect y="${WORLD_H - WORLD_H * 0.26 - WORLD_H * 0.13}" width="${W}" height="${WORLD_H * 0.13}" fill="url(#hazeG)" opacity=".5"/>`;
drawLayer('mid', 0.10);
// Franja de hierba + primer plano
svg += `<rect y="${WORLD_H - WORLD_H * 0.17}" width="${W}" height="${WORLD_H * 0.17}" fill="${g.top}"/>`;
drawLayer('near', 0.015);
svg += `</g>`;

// HUD
svg += `<rect y="${WORLD_H}" width="${W}" height="${HEADER}" fill="#5a3b1d" opacity=".96"/>`;
svg += `<text x="24" y="${WORLD_H + 40}" font-family="sans-serif" font-size="26" font-weight="bold" fill="#fcd34d">Mi Granja</text>`;
svg += `<text x="24" y="${WORLD_H + 66}" font-family="sans-serif" font-size="15" fill="#e8cfa0">Granja de ${region} · Día 12 · ${season} · ${scene.label || ''}</text>`;
[['💰 500', '#fcd34d'], ['⚡ 100', '#93c5fd'], ['⭐ 3', '#86efac']].forEach(([t, c], i) => {
    svg += `<rect x="${W - 560 + i * 120}" y="${WORLD_H + 26}" width="110" height="40" rx="10" fill="#3f2a13"/>` +
        `<text x="${W - 538 + i * 120}" y="${WORLD_H + 53}" font-family="sans-serif" font-size="18" fill="${c}">${t}</text>`;
});

// Panel del campo
// En pantallas estrechas el panel lateral pasa debajo (como en el juego real)
const NARROW = W < 900;
const PAD = 16, PANEL_Y = WORLD_H + HEADER + 24;
const PANEL_W = NARROW ? W - PAD * 2 : 930;
const PANEL_H = NARROW ? 420 : 620;
svg += `<rect x="${PAD}" y="${PANEL_Y}" width="${PANEL_W}" height="${PANEL_H}" rx="24" fill="#6b4a26"/>`;
svg += `<rect x="${PAD + 6}" y="${PANEL_Y + 6}" width="${PANEL_W - 12}" height="${PANEL_H - 12}" rx="18" fill="#7a5433"/>`;
svg += `<text x="${PAD + 30}" y="${PANEL_Y + 52}" font-family="sans-serif" font-size="24" font-weight="bold" fill="#fff">Campo de Cultivo</text>`;
svg += `<text x="${PAD + 30}" y="${PANEL_Y + 78}" font-family="sans-serif" font-size="14" fill="#f0d9a8">Parcelas del ejemplo: 16</text>`;

// Parcelas de ejemplo con todas las fases
const COLS = NARROW ? 5 : 8;
const CELL = Math.min(96, Math.floor((PANEL_W - 60 - (COLS - 1) * 12) / COLS));
const GAP = 12, GX = PAD + 30, GY = PANEL_Y + 104;
const sample = (require(path.join(ROOT, 'js', 'data.js')) && null) || null;
const regionCrops = scene.cropHint || null;
const cropsOfRegion = {
    castillalamancha: ['trigo', 'cebada', 'uva', 'azafran', 'girasol', 'almendra'],
    valencia: ['naranja', 'arroz', 'tomate', 'kaki', 'albaricoque'],
    andalucia: ['olivo', 'fresa', 'aguacate', 'mango', 'tomate'],
    asturias: ['manzana', 'kiwi', 'arandano', 'frambuesa'],
    galicia: ['patata', 'pimiento', 'uva', 'kiwi'],
    larioja: ['uva', 'champiñon', 'pera', 'manzana'],
    murcia: ['limon', 'naranja', 'lechuga', 'melon'],
    aragon: ['melocoton', 'cereza', 'maiz', 'almendra'],
    extremadura: ['olivo', 'higo', 'tomate', 'cereza'],
    cataluna: ['uva', 'avellana', 'pera', 'calçots'],
    castillayleon: ['trigo', 'lentejas', 'patata', 'girasol'],
    navarra: ['esparrago', 'pimiento', 'alcachofa', 'uva'],
    paisvasco: ['manzana', 'alubia', 'patata'],
    cantabria: ['kiwi', 'maiz', 'manzana'],
    madrid: ['fresa', 'ajo', 'melon', 'olivo']
};
const list = regionCrops || cropsOfRegion[region] || ['trigo', 'tomate', 'uva'];
const stages = [0, 0, 1, 2, 3, 3, 1, 2];
for (let i = 0; i < 16; i++) {
    const cx = GX + (i % COLS) * (CELL + GAP);
    const cy = GY + Math.floor(i / COLS) * (CELL + GAP);
    const st = stages[i % stages.length];
    const ready = st === 3;
    const soil = ready ? '#96683a' : (i % 3 === 0 ? '#6f4b28' : '#a3743f');
    svg += `<rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" rx="14" fill="${soil}" stroke="${ready ? 'rgba(255,214,90,.9)' : 'rgba(60,38,20,.45)'}" stroke-width="${ready ? 3 : 2}"/>`;
    for (let k = 0; k < 8; k++) svg += `<rect x="${cx + 4 + k * 11}" y="${cy + 4}" width="5" height="${CELL - 8}" rx="2" fill="rgba(0,0,0,.10)"/>`;
    const cid = list[i % list.length];
    svg += `<g transform="translate(${cx} ${cy})"><svg width="${CELL}" height="${CELL}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${inner(FarmArt.plant(cid, st))}</svg></g>`;
    if (ready) svg += `<rect x="${cx + CELL - 40}" y="${cy - 6}" width="46" height="18" rx="9" fill="#f0a92a"/><text x="${cx + CELL - 34}" y="${cy + 7}" font-family="sans-serif" font-size="12" font-weight="bold" fill="#4a2e08">12 kg</text>`;
    else svg += `<rect x="${cx - 7}" y="${cy - 7}" width="20" height="20" rx="10" fill="#fff" stroke="rgba(90,55,10,.35)"/><text x="${cx - 1}" y="${cy + 6}" font-family="sans-serif" font-size="11">${['🌱', '🌿', '🍃'][st]}</text>`;
}

// Panel lateral con productos reales de la región
const SIDE_X = NARROW ? PAD : PAD + PANEL_W + 20;
const SIDE_W = NARROW ? PANEL_W : W - SIDE_X - PAD;
const SIDE_Y = NARROW ? PANEL_Y + PANEL_H + 20 : PANEL_Y;
const SIDE_H = NARROW ? 300 : 430;
svg += `<rect x="${SIDE_X}" y="${SIDE_Y}" width="${SIDE_W}" height="${SIDE_H}" rx="20" fill="#784e28" stroke="rgba(255,220,150,.25)" stroke-width="2"/>`;
svg += `<text x="${SIDE_X + 18}" y="${SIDE_Y + 36}" font-family="sans-serif" font-size="18" font-weight="bold" fill="#fcd34d">Mis Semillas</text>`;
list.slice(0, NARROW ? 1 : 4).forEach((cid, i) => {
    const y = SIDE_Y + 52 + i * 92;
    svg += `<rect x="${SIDE_X + 14}" y="${y}" width="${SIDE_W - 28}" height="96" rx="12" fill="#2f6b3a" stroke="rgba(255,255,255,.12)"/>`;
    svg += `<g transform="translate(${SIDE_X + 30} ${y + 12})"><svg width="70" height="70" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${inner(FarmArt.product(cid))}</svg></g>`;
    svg += `<text x="${SIDE_X + 108}" y="${y + 40}" font-family="sans-serif" font-size="15" font-weight="bold" fill="#fff">${cid}</text>`;
    svg += `<text x="${SIDE_X + 108}" y="${y + 62}" font-family="sans-serif" font-size="12" fill="#86efac">En temporada</text>`;
});
svg += `</svg>`;

if (process.env.KEEP_SVG) fs.writeFileSync(out.replace(/\.png$/, '.svg'), svg);
fs.writeFileSync(out, new Resvg(svg, { fitTo: { mode: 'zoom', value: 1 } }).render().asPng());
console.log('escrito', out);
