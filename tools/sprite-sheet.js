/* ============================================================================
   Hoja de contactos de los sprites de cultivos
   ----------------------------------------------------------------------------
   Genera una imagen con todas las fases de crecimiento (o todos los productos)
   para revisar el arte a ojo después de tocar js/sprites.js.

   Requiere:  npm i -D @resvg/resvg-js

   Uso:
     node tools/sprite-sheet.js stages   /tmp/fases.png     [desde] [cuántos]
     node tools/sprite-sheet.js products /tmp/productos.png
   ========================================================================== */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let Resvg;
try {
    ({ Resvg } = require(path.join(ROOT, 'node_modules', '@resvg', 'resvg-js')));
} catch (e) {
    try { ({ Resvg } = require('@resvg/resvg-js')); }
    catch (e2) {
        console.error('Falta @resvg/resvg-js →  npm i -D @resvg/resvg-js');
        process.exit(1);
    }
}
const { FarmArt } = require(path.join(ROOT, 'js', 'sprites.js'));

const inner = (svg) => svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const mode = process.argv[2] || 'stages';
const out = process.argv[3] || path.join(process.cwd(), 'sprite-sheet.png');
const from = parseInt(process.argv[4] || '0', 10);
const count = parseInt(process.argv[5] || '0', 10);

let ids = Object.keys(FarmArt.recipes).sort();
if (count > 0) ids = ids.slice(from, from + count);

const cell = parseInt(process.env.CELL || '120', 10);
const cols = mode === 'stages' ? 4 : 6;
const rows = Math.ceil(ids.length / (mode === 'stages' ? 1 : cols));

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cell * cols}" height="${cell * rows}">`;
svg += `<rect width="100%" height="100%" fill="#caa87a"/>`;

if (mode === 'stages') {
    ids.forEach((id, r) => {
        for (let s = 0; s < 4; s++) {
            const x = (s % 4) * cell, y = r * cell;
            svg += `<g transform="translate(${x} ${y})"><rect x="8" y="8" width="${cell - 16}" height="${cell - 16}" rx="10" fill="#8a6a45"/>` +
                `<g transform="scale(${cell / 100})">${inner(FarmArt.plant(id, s))}</g></g>`;
        }
    });
} else {
    ids.forEach((id, i) => {
        const x = (i % cols) * cell, y = Math.floor(i / cols) * cell;
        svg += `<g transform="translate(${x} ${y})"><rect x="6" y="6" width="${cell - 12}" height="${cell - 12}" rx="10" fill="#f3e4c8"/>` +
            `<g transform="scale(${cell / 100})">${inner(FarmArt.product(id))}</g></g>`;
    });
}
svg += '</svg>';

fs.writeFileSync(out, new Resvg(svg, { fitTo: { mode: 'zoom', value: 1 } }).render().asPng());
console.log(`escrito ${out} · ${ids.length} cultivos · modo ${mode}`);
