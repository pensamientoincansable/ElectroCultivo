/* ============================================================================
   FarmArt - Sprites vectoriales ligeros de los cultivos de ElectroCultivo
   ----------------------------------------------------------------------------
   Todo el arte se genera como SVG en línea (sin imágenes externas, sin canvas,
   sin WebGL). Cada cultivo tiene 4 fases de crecimiento con la forma real del
   fruto:

     0 -> semilla / brote          (asoma del suelo)
     1 -> plántula                 (planta joven, ya reconocible)
     2 -> cuajado / fruto verde    (planta completa con frutos sin madurar)
     3 -> listo para cosechar      (fruto maduro con su color real)

   Se usa una paleta plana y contornos suaves (estilo dibujo animado amable)
   pensada para leerse bien en parcelas de 64-96 px.
   ========================================================================== */

const FarmArt = (function () {
    'use strict';

    // ---------------------------------------------------------------- utils ---
    const P = (d, fill, extra = '') => `<path d="${d}" fill="${fill}"${extra}/>`;
    const C = (cx, cy, r, fill, extra = '') => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"${extra}/>`;
    const E = (cx, cy, rx, ry, fill, extra = '') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${extra}/>`;
    const R = (x, y, w, h, fill, extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;
    const G = (t, inner) => `<g transform="${t}">${inner}</g>`;
    const STK = (d, stroke, w = 2.4, extra = '') =>
        `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`;
    const rot = (deg, x, y) => `rotate(${deg} ${x} ${y})`;

    // Paleta común
    const K = {
        outline: '#3b2a18',
        stem: '#5f9e3d',
        stemDark: '#3f7a2c',
        leaf: '#63b04a',
        leafDark: '#3f8a34',
        leafLight: '#8ccf62',
        silver: '#93a86a',
        dry: '#c9a24a',
        shadow: 'rgba(0,0,0,0.16)'
    };

    const shadow = (rx = 24, cy = 90) => E(50, cy, rx, rx * 0.28, K.shadow);

    // Una hoja con nervio central
    function leaf(x, y, len, ang, color, veinColor) {
        const w = len * 0.42;
        const d = `M${x} ${y} C${x + len * 0.35} ${y - w} ${x + len * 0.8} ${y - w * 0.9} ${x + len} ${y} C${x + len * 0.8} ${y + w * 0.9} ${x + len * 0.35} ${y + w} ${x} ${y} Z`;
        return G(rot(ang, x, y), P(d, color) + STK(`M${x + len * 0.06} ${y} L${x + len * 0.92} ${y}`, veinColor, Math.max(0.8, len * 0.07)));
    }

    // Mata de hojas alrededor de un punto (para plantas herbáceas)
    function bushLeaves(cx, cy, size, color, color2, count = 7) {
        let out = '';
        for (let i = 0; i < count; i++) {
            const a = -90 + (i - (count - 1) / 2) * (150 / count);
            const len = size * (0.75 + 0.35 * Math.cos((i / count) * Math.PI));
            out += leaf(cx, cy, len, a, i % 2 ? color : color2);
        }
        return out;
    }

    // Roseta de lechuga / repollo
    function rosette(cx, cy, size, c1, c2, c3) {
        let out = C(cx, cy + size * 0.25, size * 0.86, c2);
        for (let i = 0; i < 9; i++) {
            const a = -180 + i * 40;
            out += G(rot(a, cx, cy), E(cx + size * 0.62, cy, size * 0.42, size * 0.3, c1));
        }
        out += C(cx, cy, size * 0.62, c1);
        for (let i = 0; i < 5; i++) {
            const a = -180 + i * 72;
            out += G(rot(a, cx, cy), E(cx + size * 0.32, cy, size * 0.26, size * 0.2, c3));
        }
        out += C(cx, cy, size * 0.3, c3);
        return out;
    }

    // Copa de árbol (grupo de círculos con volumen)
    function canopy(cx, cy, w, h, c1, c2) {
        let out = '';
        const blobs = [
            [cx, cy - h * 0.32, w * 0.5],
            [cx - w * 0.34, cy, w * 0.44],
            [cx + w * 0.34, cy, w * 0.44],
            [cx - w * 0.16, cy + h * 0.22, w * 0.4],
            [cx + w * 0.16, cy + h * 0.22, w * 0.4],
            [cx, cy + h * 0.05, w * 0.5]
        ];
        blobs.forEach(([x, y, r], i) => {
            out += E(x, y, r, r * 0.92, i % 2 ? c2 : c1);
        });
        return out;
    }

    // Espiga de cereal (trigo / cebada)
    function cerealEar(x, y, h, color, awn, opts) {
        const { grains = 4, awnLen = 9, awnColor = '#d8b25a' } = opts || {};
        let out = STK(`M${x} ${y + 7} L${x} ${y + h * 0.45}`, color, 2);
        for (let i = 0; i < grains; i++) {
            const t = i / (grains - 1 || 1);
            const gy = y + h * (0.42 - 0.42 * t);
            const gr = 3.1 - 0.75 * t;
            const spread = 2.6 + t * 1.2;
            out += G(rot(-30 - 12 * t, x, gy), P(`M${x} ${gy - gr} q${gr * 1.5} ${gr * 0.7} 0 ${gr * 1.9} q${-gr * 1.5} ${-gr * 0.7} 0 ${-gr * 1.9} Z`, color));
            out += G(rot(30 + 12 * t, x, gy), P(`M${x} ${gy - gr} q${gr * 1.5} ${gr * 0.7} 0 ${gr * 1.9} q${-gr * 1.5} ${-gr * 0.7} 0 ${-gr * 1.9} Z`, color));
            if (awn) {
                out += STK(`M${x - 1} ${gy - gr * 0.4} L${x - spread - awnLen * 0.75} ${gy - gr - awnLen}`, awnColor, 1);
                out += STK(`M${x + 1} ${gy - gr * 0.4} L${x + spread + awnLen * 0.75} ${gy - gr - awnLen}`, awnColor, 1);
            }
        }
        return out;
    }

    // Panícula de arroz (espigas caídas)
    function ricePanicle(x, y, h, color) {
        let out = STK(`M${x} ${y} q2 ${-h * 0.5} 7 ${-h}`, K.stemDark, 2);
        for (let i = 0; i < 6; i++) {
            const t = i / 5;
            const px = x + 3 + 7 * t + 2.5;
            const py = y - h * (0.45 + 0.55 * t);
            out += G(rot(35 - i * 6, px, py), E(px, py, 3.4 - 0.4 * i, 1.5, color));
        }
        return out;
    }

    // ---------------------------------------------------------------- frutos ---
    /* Cada fruto se dibuja centrado en (x,y) y con escala s (1 = tamaño base).
       `ripe=false` dibuja la versión verde (fruto cuajado sin madurar).       */
    const F = {
        cereza: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#c0182f' : '#7fae4a';
            const c2 = ripe ? '#8f0f22' : '#5d8f36';
            return STK(`M${x} ${y - 13 * s} q0 6 ${-4 * s} 9`, '#6a4a22', 2) +
                STK(`M${x} ${y - 13 * s} q0 6 ${4 * s} 9`, '#6a4a22', 2) +
                leaf(x, y - 13 * s, 8 * s, -25, K.leaf) +
                C(x - 4.5 * s, y + 1 * s, 5.4 * s, c2) + C(x + 4.5 * s, y + 1 * s, 5.4 * s, c1) +
                C(x + 3 * s, y - 1 * s, 1.6 * s, 'rgba(255,255,255,.55)');
        },
        tomate: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#e63946' : '#84b74e';
            const c2 = ripe ? '#b32233' : '#6a9c3c';
            let out = C(x, y + 0.5 * s, 12 * s, c2) + C(x, y, 11.4 * s, c1);
            out += C(x - 3.5 * s, y - 4 * s, 3 * s, 'rgba(255,255,255,.35)');
            // Cáliz en estrella
            for (let i = 0; i < 5; i++) {
                out += G(rot(i * 72 + 18, x, y - 10 * s), E(x + 5 * s, y - 10 * s, 5 * s, 1.9 * s, '#3f8a34'));
            }
            out += R(x - 1 * s, y - 15 * s, 2 * s, 5 * s, '#3f8a34');
            return out;
        },
        pimiento: (x, y, s = 1, ripe = true) => {
            const c = ripe ? '#d8342a' : '#4e9c46';
            const d = ripe ? '#a7251f' : '#3b7a37';
            return P(`M${x - 9 * s} ${y - 6 * s} Q${x} ${y - 15 * s} ${x + 9 * s} ${y - 6 * s} Q${x + 11 * s} ${y + 9 * s} ${x + 3 * s} ${y + 12 * s} Q${x} ${y + 9 * s} ${x - 3 * s} ${y + 12 * s} Q${x - 11 * s} ${y + 9 * s} ${x - 9 * s} ${y - 6 * s} Z`, c) +
                P(`M${x - 9 * s} ${y - 6 * s} Q${x - 4 * s} ${y - 3 * s} ${x - 3 * s} ${y + 12 * s} Q${x - 11 * s} ${y + 9 * s} ${x - 9 * s} ${y - 6 * s} Z`, d) +
                R(x - 1.6 * s, y - 17 * s, 3.2 * s, 5 * s, '#3f8a34') +
                C(x - 4 * s, y - 6 * s, 2 * s, 'rgba(255,255,255,.35)');
        },
        naranja: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#f79420' : '#79ab45';
            const c2 = ripe ? '#d97706' : '#5d8f36';
            return C(x, y, 11 * s, c2) + C(x, y - 0.6 * s, 10.3 * s, c1) +
                C(x - 3.4 * s, y - 4 * s, 2.8 * s, 'rgba(255,255,255,.4)') +
                STK(`M${x} ${y - 10 * s} L${x} ${y - 14 * s}`, '#4d7a2b', 2) +
                E(x + 4 * s, y - 14 * s, 4.6 * s, 2.4 * s, K.leafDark);
        },
        limon: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#f4d03a' : '#86b34a';
            const c2 = ripe ? '#c9a227' : '#628f36';
            return G(rot(-14, x, y),
                E(x, y, 12 * s, 8.4 * s, c2) + E(x, y - 0.5 * s, 11.4 * s, 7.8 * s, c1) +
                C(x - 3 * s, y - 3 * s, 2.2 * s, 'rgba(255,255,255,.45)') +
                C(x - 11.4 * s, y, 1.5 * s, c2) + C(x + 11.4 * s, y, 1.5 * s, c2)) +
                leaf(x, y - 8 * s, 7 * s, -35, K.leaf);
        },
        manzana: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#e33b3b' : '#7fae4a';
            const c2 = ripe ? '#b51f28' : '#5d8f36';
            return P(`M${x} ${y - 8 * s} q${-2 * s} ${-4 * s} ${-8 * s} ${-2 * s} q${-5 * s} ${7 * s} 0 ${14 * s} q${4 * s} ${6 * s} ${8 * s} ${2 * s} q${4 * s} ${4 * s} ${8 * s} ${-2 * s} q${5 * s} ${-7 * s} 0 ${-14 * s} q${-6 * s} ${-2 * s} ${-8 * s} ${2 * s} Z`, c1) +
                P(`M${x} ${y - 8 * s} q${-2 * s} ${-4 * s} ${-8 * s} ${-2 * s} q${-3 * s} ${4 * s} ${-1 * s} ${8 * s} q${4 * s} ${-4 * s} ${9 * s} ${-6 * s} Z`, c2) +
                STK(`M${x} ${y - 9 * s} q0 ${-4 * s} ${1 * s} ${-6 * s}`, '#6a4a22', 2) +
                leaf(x + 1 * s, y - 14 * s, 8 * s, -25, K.leafDark) +
                C(x - 4 * s, y - 2 * s, 2.6 * s, 'rgba(255,255,255,.4)');
        },
        pera: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#b9d33f' : '#7fae4a';
            const c2 = ripe ? '#8fa82c' : '#5d8f36';
            return P(`M${x} ${y - 13 * s} q${-6 * s} ${0} ${-6 * s} ${6 * s} q0 ${4 * s} ${-4 * s} ${7 * s} q${-6 * s} ${6 * s} ${1 * s} ${12 * s} q${9 * s} ${5 * s} ${18 * s} ${0} q${7 * s} ${-6 * s} ${1 * s} ${-12 * s} q${-4 * s} ${-3 * s} ${-4 * s} ${-7 * s} q0 ${-6 * s} ${-6 * s} ${-6 * s} Z`, c1) +
                STK(`M${x} ${y - 14 * s} q${1 * s} ${-5 * s} ${3 * s} ${-6 * s}`, '#6a4a22', 2) +
                leaf(x + 2 * s, y - 19 * s, 7 * s, -30, K.leaf) +
                C(x - 5 * s, y + 4 * s, 2.8 * s, 'rgba(255,255,255,.35)');
        },
        melocoton: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#f79b6d' : '#8ab74e';
            const c2 = ripe ? '#e2734a' : '#639238';
            return C(x, y, 11.4 * s, c2) + C(x, y - 0.6 * s, 10.6 * s, c1) +
                STK(`M${x} ${y - 9 * s} q${-2.4 * s} ${9 * s} 0 ${18 * s}`, 'rgba(180,80,40,.45)', 1.6) +
                C(x - 4 * s, y - 4 * s, 2.6 * s, 'rgba(255,255,255,.4)') +
                leaf(x + 2 * s, y - 11 * s, 8 * s, -20, K.leafDark);
        },
        albaricoque: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#f5a623' : '#8ab74e';
            const c2 = ripe ? '#d4801a' : '#639238';
            return C(x, y, 9.4 * s, c2) + C(x, y - 0.5 * s, 8.7 * s, c1) +
                STK(`M${x} ${y - 7 * s} q${-2 * s} ${7 * s} 0 ${14 * s}`, 'rgba(190,110,20,.4)', 1.4) +
                C(x - 3 * s, y - 3 * s, 2.2 * s, 'rgba(255,255,255,.4)') +
                leaf(x + 1 * s, y - 9 * s, 7 * s, -25, K.leafDark);
        },
        higo: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#7b3f74' : '#7fae4a';
            const c2 = ripe ? '#5a2b56' : '#5d8f36';
            return P(`M${x} ${y - 10 * s} q${9 * s} ${3 * s} ${9 * s} ${10 * s} q0 ${9 * s} ${-9 * s} ${11 * s} q${-9 * s} ${-2 * s} ${-9 * s} ${-11 * s} q0 ${-7 * s} ${9 * s} ${-10 * s} Z`, c1) +
                P(`M${x} ${y - 10 * s} q${-9 * s} ${3 * s} ${-9 * s} ${10 * s} q0 ${5 * s} ${4 * s} ${9 * s} q${-3 * s} ${-9 * s} ${5 * s} ${-19 * s} Z`, c2) +
                STK(`M${x} ${y - 10 * s} q${1 * s} ${-4 * s} ${3 * s} ${-5 * s}`, '#4d7a2b', 2) +
                C(x + 3 * s, y + 1 * s, 2 * s, 'rgba(255,255,255,.28)');
        },
        kaki: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#ef7d21' : '#89b74e';
            const c2 = ripe ? '#c85f13' : '#639238';
            return E(x, y + 1 * s, 11 * s, 9.6 * s, c2) + E(x, y, 10.4 * s, 9 * s, c1) +
                C(x - 3.5 * s, y - 3 * s, 2.4 * s, 'rgba(255,255,255,.38)') +
                E(x, y - 9 * s, 1.8 * s, 3 * s, '#4d7a2b') +
                E(x - 5 * s, y - 9 * s, 4 * s, 1.6 * s, '#4d7a2b') +
                E(x + 5 * s, y - 9 * s, 4 * s, 1.6 * s, '#4d7a2b');
        },
        kiwi: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#8a6242' : '#7fae4a';
            return G(rot(-8, x, y),
                E(x, y, 10 * s, 8.4 * s, c1) + E(x, y - 0.6 * s, 9.2 * s, 7.6 * s, ripe ? '#a37a54' : '#8bb851')) +
                (ripe ? C(x, y + 1 * s, 4.6 * s, '#9ccf4a') + C(x, y + 1 * s, 2 * s, '#f4f2e2') : '') +
                (ripe ? [[-2.4, -1.6], [0, -2.4], [2.4, -1.6], [-1.6, 2.4], [1.6, 2.4]].map(([dx, dy]) => C(x + dx * s, y + (dy + 1) * s, 0.6 * s, '#3d3d2a')).join('') : '') +
                leaf(x, y - 8 * s, 7 * s, -25, K.leafDark);
        },
        fresa: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#e63946' : '#8ab74e';
            const c2 = ripe ? '#b3202c' : '#639238';
            let out = P(`M${x} ${y + 13 * s} q${-10 * s} ${-8 * s} ${-10 * s} ${-15 * s} q0 ${-7 * s} ${10 * s} ${-7 * s} q${10 * s} 0 ${10 * s} ${7 * s} q0 ${7 * s} ${-10 * s} ${15 * s} Z`, c1);
            out += P(`M${x} ${y + 13 * s} q${-8 * s} ${-6 * s} ${-9 * s} ${-11 * s} q${4 * s} ${-2 * s} ${7 * s} ${0} q${-2 * s} ${6 * s} ${2 * s} ${11 * s} Z`, c2);
            [[-4, -6], [4, -6], [-5, 1], [5, 0], [0, -2]].forEach(([dx, dy]) => {
                out += E(x + dx * s, y + dy * s, 1.1 * s, 1.5 * s, ripe ? '#ffe9a8' : '#d9e8a0');
            });
            for (let i = 0; i < 5; i++) out += G(rot(i * 72 + 10, x, y - 7 * s), E(x + 5 * s, y - 7 * s, 5 * s, 2 * s, '#3f8a34'));
            out += STK(`M${x} ${y - 10 * s} q${1 * s} ${-4 * s} ${3 * s} ${-5 * s}`, '#3f8a34', 2);
            return out;
        },
        arandano: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#4a5ea8' : '#7fae4a';
            const berries = [[-6, 2], [6, 2], [0, -4], [-2, 6], [3, 7]];
            let out = '';
            berries.forEach(([dx, dy], i) => {
                out += C(x + dx * s, y + dy * s, 4.6 * s, i % 2 ? c1 : (ripe ? '#3b4d90' : '#6b9a3e'));
                out += C(x + dx * s - 1.4 * s, y + dy * s - 1.4 * s, 1.2 * s, 'rgba(255,255,255,.45)');
                if (ripe) out += C(x + dx * s, y + dy * s - 3.4 * s, 1 * s, '#cfe0f5');
            });
            return out;
        },
        frambuesa: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#c2185b' : '#8ab74e';
            const c2 = ripe ? '#e0468a' : '#7aa845';
            let out = '';
            for (let i = 0; i < 9; i++) {
                const a = -90 + i * 26;
                out += G(rot(a, x, y + 4 * s), C(x, y - 2 * s, 3.2 * s, i % 3 ? c1 : c2));
            }
            out += C(x, y + 1 * s, 5.4 * s, c1) + C(x - 1.6 * s, y - 1 * s, 2 * s, 'rgba(255,255,255,.35)');
            return out;
        },
        uva: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#6b3f8f' : '#7fae4a';
            const c2 = ripe ? '#54307a' : '#639238';
            let out = '';
            const rows = [[-6, -4, 3], [0, -4, 3], [6, -4, 3], [-3, 2, 3], [3, 2, 3], [0, 8, 3]];
            rows.forEach(([dx, dy], i) => {
                out += C(x + dx * s, y + dy * s, 4.4 * s, i % 2 ? c1 : c2);
                out += C(x + dx * s - 1.3 * s, y + dy * s - 1.3 * s, 1.1 * s, 'rgba(255,255,255,.4)');
            });
            out += STK(`M${x} ${y - 6 * s} q0 ${-5 * s} ${-1 * s} ${-7 * s}`, '#6a4a22', 2);
            return out;
        },
        melon: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#dfe07a' : '#8ab74e';
            const c2 = ripe ? '#b9bd4f' : '#639238';
            let out = E(x, y, 13 * s, 11 * s, c2) + E(x, y - 0.5 * s, 12.2 * s, 10.2 * s, c1);
            for (let i = -2; i <= 2; i++) {
                out += STK(`M${x + i * 5 * s} ${y - 9.6 * s} q${i * 1.2 * s} ${9 * s} ${i * 0.4 * s} ${19 * s}`, 'rgba(255,255,255,.5)', 1.3);
                out += STK(`M${x + (i + 0.5) * 5 * s} ${y - 9.2 * s} q${i * 1.2 * s} ${9 * s} ${i * 0.4 * s} ${18 * s}`, 'rgba(150,150,60,.35)', 1);
            }
            out += C(x - 4 * s, y - 4 * s, 2.6 * s, 'rgba(255,255,255,.4)') +
                STK(`M${x} ${y - 10 * s} q${2 * s} ${-3 * s} ${5 * s} ${-4 * s}`, '#6a4a22', 2.4);
            return out;
        },
        sandia: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#3f7d3f' : '#7fae4a';
            const c2 = ripe ? '#2c5c2c' : '#639238';
            let out = C(x, y, 12 * s, c2) + C(x, y - 0.6 * s, 11.2 * s, c1);
            for (let i = -1; i <= 1; i++) {
                out += G(rot(i * 12, x, y), P(`M${x + i * 9 * s - 1.6 * s} ${y - 10 * s} q${1.6 * s} ${5 * s} ${-0.6 * s} ${10 * s} q${-0.8 * s} ${5 * s} ${1.4 * s} ${10 * s} q${1.4 * s} ${-5 * s} ${0.6 * s} ${-10 * s} q${-0.8 * s} ${-5 * s} ${-1.4 * s} ${-10 * s} Z`, c2));
            }
            out += C(x - 4 * s, y - 4.4 * s, 2.4 * s, 'rgba(255,255,255,.35)');
            out += STK(`M${x + 2 * s} ${y - 10 * s} q${-4 * s} ${-3 * s} ${-7 * s} ${-1 * s}`, '#4d7a2b', 2);
            return out;
        },
        aguacate: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#2f6b3f' : '#7fae4a';
            return P(`M${x} ${y - 13 * s} q${-4 * s} 0 ${-4 * s} ${4 * s} q0 ${3 * s} ${-2 * s} ${5 * s} q${-6 * s} ${5 * s} ${0} ${11 * s} q${6 * s} ${5 * s} ${12 * s} ${0} q${6 * s} ${-6 * s} ${0} ${-11 * s} q${-3 * s} ${-2 * s} ${-2 * s} ${-5 * s} q0 ${-4 * s} ${-4 * s} ${-4 * s} Z`, c1) +
                C(x - 4 * s, y + 3 * s, 2.6 * s, 'rgba(255,255,255,.28)') +
                STK(`M${x} ${y - 13 * s} q${1 * s} ${-3 * s} ${3 * s} ${-4 * s}`, '#4d7a2b', 1.8);
        },
        mango: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#ef7a26' : '#7fae4a';
            const c2 = ripe ? '#e0b93a' : '#639238';
            return G(rot(-18, x, y),
                E(x, y, 12 * s, 9 * s, c2) + E(x, y - 1 * s, 10.6 * s, 8 * s, c1) +
                P(`M${x - 9 * s} ${y + 1 * s} q${5 * s} ${-7 * s} ${11 * s} ${-6 * s} q${-3 * s} ${7 * s} ${-9 * s} ${8 * s} Z`, ripe ? '#7bbf3f' : 'rgba(255,255,255,.25)') +
                C(x - 3 * s, y - 3 * s, 2.4 * s, 'rgba(255,255,255,.35)')) +
                STK(`M${x} ${y - 10 * s} q${1 * s} ${-3 * s} ${3 * s} ${-4 * s}`, '#6a4a22', 2);
        },
        oliva: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#55682c' : '#6f9c3c';
            return E(x, y, 4.4 * s, 6 * s, c1) + E(x + 1 * s, y - 1.4 * s, 1.4 * s, 2 * s, 'rgba(255,255,255,.35)') +
                STK(`M${x} ${y - 5 * s} q0 ${-3 * s} ${-2 * s} ${-4 * s}`, '#4d7a2b', 1.6);
        },
        almendra: (x, y, s = 1, ripe = true) => {
            const hull = ripe ? '#c9b68a' : '#8fbf5a';
            return E(x, y + 1 * s, 7 * s, 9.4 * s, hull) +
                P(`M${x} ${y - 8 * s} q${6 * s} ${4 * s} ${5 * s} ${9 * s} q${-2 * s} ${-2 * s} ${-5 * s} ${-2 * s} Z`, ripe ? '#a89468' : '#79a845') +
                P(`M${x} ${y - 8 * s} q${-6 * s} ${4 * s} ${-5 * s} ${9 * s} q${2 * s} ${-2 * s} ${5 * s} ${-2 * s} Z`, ripe ? '#b7a377' : '#88b552') +
                STK(`M${x} ${y - 9 * s} q0 ${-2 * s} ${1 * s} ${-3 * s}`, '#6a4a22', 1.8) +
                C(x - 2 * s, y + 1 * s, 1.6 * s, 'rgba(255,255,255,.35)');
        },
        avellana: (x, y, s = 1, ripe = true) => {
            const nut = ripe ? '#b07a45' : '#7fae4a';
            return C(x, y, 7 * s, nut) +
                P(`M${x - 8 * s} ${y - 5 * s} q${3 * s} ${-5 * s} ${8 * s} ${-3 * s} q${5 * s} ${3 * s} ${6 * s} ${8 * s} q${-4 * s} ${-2 * s} ${-7 * s} ${-1 * s} q0 ${3 * s} ${2 * s} ${5 * s} q${-4 * s} ${-1 * s} ${-9 * s} ${-3 * s} Z`, ripe ? '#8fa85a' : '#88b552') +
                C(x - 2 * s, y - 2 * s, 2 * s, 'rgba(255,255,255,.28)');
        },
        ajo: (x, y, s = 1, ripe = true) => {
            const bulb = ripe ? '#f2efe2' : '#e6e2cf';
            let out = P(`M${x - 7 * s} ${y + 9 * s} q0 ${-9 * s} ${2 * s} ${-12 * s} q${5 * s} ${-4 * s} ${10 * s} 0 q${2 * s} ${3 * s} ${2 * s} ${12 * s} Z`, bulb);
            for (let i = -1; i <= 1; i++) out += STK(`M${x + i * 3.6 * s} ${y - 2 * s} q0 ${5 * s} ${i * 0.6 * s} ${10 * s}`, 'rgba(150,140,110,.5)', 1);
            out += STK(`M${x - 1 * s} ${y - 3 * s} q${-1 * s} ${-6 * s} ${-3 * s} ${-8 * s}`, '#5aa845', 2.4) +
                STK(`M${x + 1 * s} ${y - 3 * s} q${1 * s} ${-6 * s} ${3 * s} ${-8 * s}`, '#4f9a3e', 2.4) +
                C(x - 3 * s, y + 1 * s, 2 * s, 'rgba(255,255,255,.5)');
            return out;
        },
        maiz: (x, y, s = 1, ripe = true) => {
            const kernel = ripe ? '#f2c14e' : '#a8c85a';
            let out = R(x - 4.6 * s, y - 9 * s, 9.2 * s, 19 * s, ripe ? '#e0a92f' : '#93b44b', ' rx="4"');
            out += R(x - 4.2 * s, y - 8.4 * s, 8.4 * s, 17.6 * s, kernel, ' rx="4"');
            for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) {
                out += C(x - 2.8 * s + c * 2.8 * s, y - 6.4 * s + r * 3.4 * s, 1.2 * s, 'rgba(255,255,255,.35)');
            }
            out += P(`M${x - 5 * s} ${y - 9 * s} q${-6 * s} ${4 * s} ${-5 * s} ${13 * s} q${4 * s} ${-3 * s} ${6 * s} ${-4 * s} Z`, ripe ? '#c9c47a' : '#9fbf5c');
            out += P(`M${x + 5 * s} ${y - 9 * s} q${6 * s} ${4 * s} ${5 * s} ${13 * s} q${-4 * s} ${-3 * s} ${-6 * s} ${-4 * s} Z`, ripe ? '#d6d189' : '#a9c966');
            return out;
        },
        girasol: (x, y, s = 1, ripe = true) => {
            const petals = ripe ? '#f7c948' : '#d9d35a';
            let out = '';
            for (let i = 0; i < 12; i++) out += G(rot(i * 30, x, y), E(x + 11 * s, y, 6.4 * s, 2.6 * s, i % 2 ? petals : (ripe ? '#e9b52f' : '#c9c44e')));
            out += C(x, y, 8.4 * s, ripe ? '#6b4423' : '#7f9c3f') + C(x, y, 6.4 * s, ripe ? '#8a5a2b' : '#8fa845');
            [[0, 0], [3, 2], [-3, 2], [3, -3], [-3, -3], [0, 4], [0, -4]].forEach(([dx, dy]) => {
                out += C(x + dx * s, y + dy * s, 0.9 * s, 'rgba(60,30,10,.5)');
            });
            return out;
        },
        azafran: (x, y, s = 1, ripe = true) => {
            const petal = ripe ? '#8e5aa8' : '#6f9c3c';
            let out = '';
            for (let i = 0; i < 5; i++) out += G(rot(i * 72, x, y), E(x, y - 7 * s, 3.2 * s, 8 * s, i % 2 ? petal : '#7a4a94'));
            out += C(x, y, 3 * s, ripe ? '#a06a3a' : '#5d8f36');
            out += STK(`M${x} ${y} q${5 * s} ${3 * s} ${7 * s} ${8 * s}`, ripe ? '#d92e2e' : '#8fa845', 1.8);
            out += STK(`M${x} ${y} q${-1 * s} ${5 * s} ${-3 * s} ${9 * s}`, ripe ? '#d92e2e' : '#8fa845', 1.8);
            out += STK(`M${x} ${y} q${-6 * s} ${2 * s} ${-8 * s} ${6 * s}`, ripe ? '#d92e2e' : '#8fa845', 1.8);
            return out;
        },
        alcachofa: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#6f8f45' : '#7fae4a';
            const c2 = ripe ? '#567a35' : '#639238';
            let out = E(x, y + 2 * s, 8.6 * s, 9 * s, c2);
            for (let r = 0; r < 3; r++) {
                for (let i = 0; i < 5 - r; i++) {
                    const dx = (i - (4 - r) / 2) * 6.2 * s;
                    out += G(rot(-18 + r * 6, x + dx, y + 4 * s - r * 2 * s), E(x + dx, y + 2 * s - r * 3.4 * s, 3.6 * s, 5.4 * s, i % 2 ? c1 : c2));
                }
            }
            out += E(x, y - 9 * s, 3.4 * s, 4 * s, ripe ? '#a86ac0' : '#8fbf5a');
            return out;
        },
        esparrago: (x, y, s = 1, ripe = true) => {
            const body = ripe ? '#96c93d' : '#79a845';
            let out = '';
            [-6, 0, 6].forEach((dx, i) => {
                const h = 22 - Math.abs(dx) * 0.6;
                out += R(x + dx * s - 1.8 * s, y - h * s, 3.6 * s, h * s, i === 1 ? body : K.leafDark, ' rx="1.8"');
                out += P(`M${x + dx * s - 2.4 * s} ${y - h * s} q${2.4 * s} ${-5 * s} ${4.8 * s} 0 Z`, ripe ? '#7dbb2f' : '#6d9c3c');
            });
            return out;
        },
        pod: (x, y, s = 1, ripe = true, seedColor = '#c8b06a') => {
            const c1 = ripe ? '#b9c95a' : '#8fbf5a';
            let out = G(rot(-24, x, y), E(x, y, 11 * s, 3.6 * s, c1) + STK(`M${x - 9 * s} ${y} L${x + 9 * s} ${y}`, 'rgba(90,120,40,.5)', 1.2));
            for (let i = 0; i < 4; i++) out += C(x - 6 * s + i * 4 * s, y + 0.4 * s, 1.5 * s, ripe ? seedColor : 'rgba(120,150,70,.7)');
            return out;
        },
        algodon: (x, y, s = 1, ripe = true) => {
            let out = '';
            const bolls = [[0, -3], [-6, 2], [6, 2], [0, 6]];
            bolls.forEach(([dx, dy]) => {
                out += C(x + dx * s, y + dy * s, 5 * s, ripe ? '#f7f5ee' : '#d6e4b8');
                out += C(x + dx * s - 1.4 * s, y + dy * s - 1.4 * s, 2.4 * s, 'rgba(255,255,255,.75)');
            });
            out += P(`M${x - 8 * s} ${y + 10 * s} q${4 * s} ${-6 * s} ${8 * s} ${-3 * s} q${4 * s} ${-3 * s} ${8 * s} ${3 * s} Z`, ripe ? '#b98a4a' : '#8fbf5a');
            return out;
        },
        remolacha: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#a3183c' : '#8fbf5a';
            return C(x, y + 4 * s, 9 * s, c1) +
                STK(`M${x} ${y - 4 * s} q0 ${-4 * s} ${-1 * s} ${-6 * s}`, '#7dbb2f', 2.4) +
                P(`M${x - 1 * s} ${y - 5 * s} q${-10 * s} ${-2 * s} ${-12 * s} ${-8 * s} q${9 * s} ${1 * s} ${12 * s} ${6 * s} Z`, '#4f9a3e') +
                P(`M${x + 1 * s} ${y - 5 * s} q${10 * s} ${-2 * s} ${12 * s} ${-8 * s} q${-9 * s} ${1 * s} ${-12 * s} ${6 * s} Z`, '#5aa845') +
                P(`M${x} ${y - 5 * s} q${4 * s} ${-8 * s} ${1 * s} ${-12 * s} q${-6 * s} ${4 * s} ${-1 * s} ${12 * s} Z`, '#3f8a34') +
                C(x - 3 * s, y + 2 * s, 2.6 * s, 'rgba(255,255,255,.28)');
        },
        patata: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#c8a165' : '#a9b06a';
            let out = '';
            [[-7, 2, 5.6, 4.4], [6, 4, 6, 4.6], [-1, 9, 5.4, 4.2]].forEach(([dx, dy, rx, ry]) => {
                out += E(x + dx * s, y + dy * s, rx * s, ry * s, c1);
                out += C(x + dx * s - 1.6 * s, y + dy * s - 1.4 * s, 1.4 * s, 'rgba(255,255,255,.35)');
                out += C(x + dx * s + 1.6 * s, y + dy * s + 1.2 * s, 0.9 * s, 'rgba(120,90,40,.4)');
            });
            return out;
        },
        brocoli: (x, y, s = 1, ripe = true) => {
            const c1 = ripe ? '#2f7a3a' : '#4f9a3e';
            const c2 = ripe ? '#3f8f45' : '#63b04a';
            let out = leaf(x - 1 * s, y + 9 * s, 13 * s, 178, ripe ? '#7dbb2f' : '#8fbf5a');
            out += leaf(x + 1 * s, y + 9 * s, 13 * s, 2, ripe ? '#8fbf5a' : '#a9c966');
            out += leaf(x, y + 10 * s, 12 * s, -130, '#5f9e3d');
            out += R(x - 3.4 * s, y - 2 * s, 6.8 * s, 14 * s, ripe ? '#8fbf5a' : '#a9c966', ' rx="3"');
            out += C(x - 8 * s, y - 5 * s, 6.6 * s, c2) + C(x + 8 * s, y - 5 * s, 6.6 * s, c2);
            out += C(x, y - 10 * s, 8.2 * s, c1) + C(x, y - 2 * s, 7.4 * s, c1);
            [[-8, -6], [-3, -10], [3, -10], [8, -6], [0, -3], [-5, -2], [5, -2]].forEach(([dx, dy]) => {
                out += C(x + dx * s, y + dy * s, 2.3 * s, 'rgba(190,240,170,.22)');
            });
            return out;
        },
        lechuga: (x, y, s = 1, ripe = true) => rosette(x, y, 15 * s, ripe ? '#7dbb2f' : '#8fbf5a', ripe ? '#59992a' : '#6ba83f', ripe ? '#a8d95a' : '#b9dd7a'),
        esparragos: '',
        champi: (x, y, s = 1, ripe = true) => {
            let out = '';
            const spots = [[-7, 5, 0.85], [6, 6, 1], [0, 1, 1.15]];
            spots.forEach(([dx, dy, k]) => {
                const caps = ripe ? '#f0e6d2' : '#dfe8c4';
                out += R(x + dx * s - 2.6 * s * k, y + dy * s - 2 * s * k, 5.2 * s * k, 8 * s * k, caps, ' rx="2.2"');
                out += P(`M${x + dx * s - 7.4 * s * k} ${y + dy * s - 1 * s * k} q${7.4 * s * k} ${-9 * s * k} ${14.8 * s * k} 0 q0 ${2.6 * s * k} ${-2 * s * k} ${2.6 * s * k} l${-10.8 * s * k} 0 q${-2 * s * k} 0 ${-2 * s * k} ${-2.6 * s * k} Z`, caps);
                out += E(x + dx * s, y + dy * s - 0.4 * s * k, 7.4 * s * k, 1 * s * k, ripe ? '#c9a36a' : '#a9bd7a');
            });
            return out;
        }
    };

    // ------------------------------------------------------------ esqueletos ---
    /* Cada esqueleto dibuja la planta según la fase. Devuelve {svg, anchor}    */

    // Brote inicial común (fase 0): dos hojitas saliendo de la tierra
    function sprout(cx, color = K.leaf, tall = 8) {
        return STK(`M${cx} 88 L${cx} ${88 - tall}`, K.stemDark, 2.2) +
            leaf(cx, 88 - tall, tall * 0.9, -30, color) +
            leaf(cx, 88 - tall, tall * 0.9, 210, K.leafDark);
    }

    function tilledMound(cx = 50, w = 30, cy = 88, dark = '#6b4a2b') {
        return P(`M${cx - w / 2} ${cy + 5} q${w * 0.1} ${-7} ${w * 0.5} ${-7} q${w * 0.4} ${0} ${w * 0.5} ${7} Z`, dark);
    }

    const ARCH = {
        // -------- Cereales: varias cañas con espigas ----
        cereal(stage, r) {
            const n = stage === 0 ? 1 : (r.stems || 5);
            const h = [8, 26, 46, 54][stage];
            const col = stage < 3 ? K.stem : r.straw;
            const earCol = stage < 2 ? K.leaf : (stage === 2 ? '#b9c96a' : r.ear);
            let out = '';
            for (let i = 0; i < n; i++) {
                const dx = n === 1 ? 0 : (i - (n - 1) / 2) * (r.spread || 5.5);
                const lean = dx * 0.5;
                out += STK(`M${50 + dx * 0.75} 88 Q${50 + dx * 0.9} ${88 - h * 0.6} ${50 + dx + lean} ${88 - h}`, col, 2.4);
                out += leaf(50 + dx * 0.8, 88 - h * 0.45, 12 + stage * 3, 205 + i * 8, stage < 2 ? K.leaf : r.strawAlt);
                if (stage >= 2) {
                    out += cerealEar(50 + dx + lean, 88 - h, r.earLen || 15, earCol, r.awn, { grains: 4, awnLen: stage === 3 ? (r.awnLen || 8) : 5 });
                }
            }
            return out;
        },

        // -------- Tallo alto: maíz y girasol ----
        tallstalk(stage, r) {
            const h = [10, 32, 56, 62][stage];
            const top = 88 - h;
            let out = STK(`M50 88 Q49 ${88 - h * 0.55} 50 ${top}`, r.stalk, 3.6);
            const leaves = stage === 0 ? 1 : 4;
            for (let i = 0; i < leaves; i++) {
                const t = (i + 1) / (leaves + 1);
                const ly = 88 - h * t * 0.95;
                const dir = i % 2 ? 1 : -1;
                out += G(rot(dir * 12, 50, ly), leaf(50, ly, (16 + stage * 7) * (1 - t * 0.3), dir > 0 ? 8 : 172, i % 2 ? r.leaf1 : r.leaf2));
            }
            if (r.kind === 'maiz') {
                if (stage >= 2) out += G(`translate(0 ${stage === 2 ? -6 : -8})`, F.maiz(50, 74, stage === 3 ? 0.95 : 0.7, stage === 3));
                if (stage === 3) out += G(rot(8, 59, 40), P('M59 46 q7 -3 7 6 q-7 4 -7 -6 Z', '#c9c47a'));
                out += P(`M50 ${top} q6 -7 2 -12 q-6 4 -2 12 Z`, r.tassel);
            } else {
                if (stage >= 2) {
                    out += G(`translate(0 ${stage === 2 ? 54 : 52})`, F.girasol(50, top + (stage === 3 ? 4 : 2), stage === 3 ? 1 : 0.62, stage === 3));
                }
            }
            return out;
        },

        // -------- Arbusto con frutos (tomate, pimiento, algodón...) ----
        bush(stage, r) {
            const h = [9, 22, 34, 36][stage];
            const cy = 88 - h * 0.62;
            let out = '';
            out += STK(`M50 88 L50 ${88 - h * 0.7}`, K.stem, 3);
            if (r.stake && stage >= 1) out += STK(`M${r.stake === 'left' ? 36 : 64} 90 L${r.stake === 'left' ? 38 : 62} ${88 - h - 6}`, '#a97c4f', 2.6);
            out += bushLeaves(50, cy, 13 + stage * 4.5, r.leaf1 || K.leaf, r.leaf2 || K.leafDark, stage === 0 ? 3 : 7);
            if (stage >= 2) {
                const spots = r.fruitSpots || [[-11, 4], [10, 2], [-2, 12], [13, 12], [-14, -4]];
                spots.forEach(([dx, dy], i) => {
                    out += F[r.fruit](50 + dx, cy + dy - h * 0.12, (r.fruitScale || 0.62) * (stage === 3 ? 1 : 0.82), stage === 3);
                });
            }
            return out;
        },

        // -------- Árbol frutal ----
        tree(stage, r) {
            const th = [6, 14, 26, 30][stage];
            const cw = [10, 22, 46, 50][stage];
            const ch = [8, 18, 30, 32][stage];
            const cy = 88 - th - ch * 0.42;
            let out = STK(`M50 89 L50 ${88 - th}`, '#8a5f38', 4 + stage * 0.6);
            if (stage >= 2) {
                out += STK(`M50 ${88 - th * 0.55} L40 ${88 - th - 4}`, '#8a5f38', 2.4);
                out += STK(`M50 ${88 - th * 0.55} L60 ${88 - th - 4}`, '#8a5f38', 2.4);
            }
            out += canopy(50, cy, cw, ch, r.leaf1 || K.leaf, r.leaf2 || K.leafDark);
            if (stage >= 2) {
                const spots = r.fruitSpots || [[-15, -6], [14, -8], [0, 6], [-8, 12], [12, 12]];
                spots.forEach(([dx, dy]) => {
                    out += F[r.fruit](50 + dx, cy + dy, (r.fruitScale || 0.6) * (stage === 3 ? 1 : 0.85), stage === 3);
                });
            }
            return out;
        },

        // -------- Vid / emparrado --------
        vine(stage, r) {
            const postH = [0, 30, 74, 74][stage];
            let out = '';
            if (stage >= 1) {
                out += R(29, 92 - postH, 4, postH, '#b8895a', ' rx="2"') +
                    R(67, 92 - postH, 4, postH, '#b8895a', ' rx="2"') +
                    R(27, 92 - postH, 46, 3, '#cfae79', ' rx="1.5"');
                if (stage >= 2) {
                    out += STK('M26 58 L74 58', '#e8dcb8', 1.6) + STK('M26 73 L74 73', '#e8dcb8', 1.6);
                }
            }
            out += STK('M50 90 Q40 78 50 66 Q60 54 50 42', r.vineStem || '#7a6a3a', 2.8);
            const spots = [[38, 80, 200], [63, 78, -20], [40, 66, 190], [61, 64, -10], [38, 54, 205], [62, 52, -25], [42, 44, 215], [58, 42, -35]];
            const n = stage === 0 ? 2 : (stage === 1 ? 4 : 8);
            for (let i = 0; i < n; i++) {
                const sp = spots[i];
                out += leaf(sp[0], sp[1], 13 + stage * 1.4, sp[2], i % 2 ? (r.leaf1 || K.leaf) : (r.leaf2 || K.leafDark));
            }
            if (stage >= 2) out += F[r.fruit || 'uva'](50, 58, (r.fruitScale || 1) * (stage === 3 ? 1 : 0.78), stage === 3);
            return out;
        },

        // -------- Planta rastrera (melón, sandía) --------
        creeper(stage, r) {
            const sc = [0.3, 0.6, 1, 1][stage];
            let out = tilledMound(50, 40, 90);
            out += STK('M50 90 q-13 -7 -21 -5', K.stemDark, 2.6);
            out += STK('M50 90 q13 -7 21 -5', K.stemDark, 2.6);
            const leafSpots = [[34, 82, -150], [66, 82, -30], [42, 77, -118], [58, 77, -62]];
            for (let i = 0; i < (stage === 0 ? 2 : 4); i++) {
                const lp = leafSpots[i];
                out += leaf(lp[0], lp[1], (19 + stage * 4) * sc, lp[2], i % 2 ? (r.leaf1 || K.leaf) : (r.leaf2 || K.leafDark));
            }
            out += STK('M50 90 q-7 -12 -2 -17', '#c9d16a', 1.6);
            if (stage >= 2) out += F[r.fruit](50, 84, (r.fruitScale || 0.85) * (stage === 3 ? 1 : 0.78), stage === 3);
            return out;
        },

        // -------- Planta con raíz visible (patata, remolacha, ajo...) ----
        root(stage, r) {
            const h = [6, 20, 32, 34][stage];
            let out = tilledMound(50, 40, 90);
            out += bushLeaves(50, 86 - h * 0.6, 11 + stage * 4.5, r.leaf1 || K.leaf, r.leaf2 || K.leafDark, stage === 0 ? 3 : 7);
            if (r.fern) {
                for (let i = -2; i <= 2; i++) {
                    out += G(rot(i * 22, 50, 86), leaf(50, 86, 15 + stage * 4, i * 24 - 90, i % 2 ? (r.leaf2 || K.leafDark) : (r.leaf1 || K.leaf)));
                }
            }
            if (stage >= 2) {
                (r.roots || [[-9, 82], [8, 84]]).forEach(([dx, dy]) => {
                    out += F[r.fruit](50 + dx, dy, (r.fruitScale || 0.62) * (stage === 3 ? 1.25 : 1), stage === 3);
                });
            }
            return out;
        },

        // -------- Leguminosas: matas bajas con vainas ----
        legume(stage, r) {
            const h = [8, 20, 28, 30][stage];
            const cy = 88 - h * 0.6;
            let out = STK(`M50 88 L50 ${88 - h * 0.8}`, K.stem, 2.6) + bushLeaves(50, cy, 9 + stage * 3.4, r.leaf1 || '#7fae4a', r.leaf2 || K.leafDark, stage === 0 ? 3 : 6);
            if (stage >= 2) {
                (r.pods || [[-10, 4], [9, 7], [0, 14]]).forEach(([dx, dy], i) => {
                    out += F.pod(50 + dx, cy + dy, (r.fruitScale || 0.62) * (stage === 3 ? 1 : 0.85), stage === 3, r.seed);
                });
            }
            return out;
        },

        // -------- Flores (azafrán) --------
        flower(stage, r) {
            const n = stage === 0 ? 1 : (r.count || 4);
            const h = [7, 16, 26, 28][stage];
            let out = '';
            for (let i = 0; i < n; i++) {
                const dx = n === 1 ? 0 : (i - (n - 1) / 2) * 7;
                out += STK(`M${50 + dx} 88 q${dx * 0.3} ${-h * 0.6} ${dx * 0.4} ${-h}`, K.stem, 2.2);
                out += G(rot(i * 16 - 24, 50 + dx, 88 - h * 0.5), leaf(50 + dx, 88 - h * 0.5, 12 + stage * 3, i % 2 ? 6 : 174, '#5f9e3d'));
                if (stage >= 2) out += F.azafran(50 + dx * 1.2, 88 - h - 2, (r.fruitScale || 0.7) * (stage === 3 ? 1 : 0.8), stage === 3);
            }
            return out;
        },

        // -------- Hongos --------
        fungus(stage, r) {
            let out = P('M22 90 q28 -8 56 0 Z', '#4a3a2a');
            out += E(50, 89, 26, 5, '#3f3225');
            const scale = [0.4, 0.65, 0.9, 1][stage];
            if (stage >= 1) out += F.champi(50, 84, scale, stage === 3);
            return out;
        },

        // -------- Hortalizas de hoja (lechuga, brócoli) ----
        leafy(stage, r) {
            const size = [0.34, 0.62, 1, 1.15][stage];
            if (r.kind === 'brocoli') {
                return F.brocoli(50, 80, size, stage === 3);
            }
            return F.lechuga(50, 84, size, stage === 3);
        },

        // -------- Manojo de tallos (espárrago, calçots) ----
        spears(stage, r) {
            if (r.kind === 'calcot') {
                const sc = [0.3, 0.6, 0.9, 1][stage];
                let out = tilledMound(50, 30, 88);
                [-7, -2.4, 2.4, 7].forEach((dx, i) => {
                    const h = (24 + (i === 1 || i === 2 ? 6 : 0)) * sc;
                    out += R(50 + dx - 2, 88 - h, 4, h, '#f4f0dc', ' rx="2"');
                    out += P(`M${50 + dx - 2} ${88 - h} q2 -6 4 0 Z`, '#7dbb2f');
                    out += STK(`M${50 + dx - 1} ${88 - h * 0.35} q-4 -3 -6 -1`, '#8fbf5a', 1.4);
                });
                return out;
            }
            const sc = [0.28, 0.55, 0.9, 1][stage];
            return G(`translate(50 86) scale(${sc}) translate(-50 -86)`, F.esparrago(50, 86, 1, stage === 3));
        },

        // -------- Baya baja (fresa, arándano, frambuesa) ----
        berry(stage, r) {
            const h = [6, 12, 16, 17][stage];
            let out = '';
            if (r.habit === 'bush') out += STK(`M50 88 L50 ${88 - h}`, '#8a5f38', 2.4);
            out += bushLeaves(50, 88 - h * 0.55, 8 + stage * 4, r.leaf1 || K.leaf, r.leaf2 || K.leafDark, stage === 0 ? 3 : 6);
            if (stage >= 2) {
                (r.fruitSpots || [[-8, 2], [8, 0], [0, 8]]).forEach(([dx, dy]) => {
                    out += F[r.fruit](50 + dx, 88 - h * 0.5 + dy, (r.fruitScale || 0.55) * (stage === 3 ? 1 : 0.8), stage === 3);
                });
            }
            return out;
        }
    };

    // ------------------------------------------------------------- recetas ---
    /* arch: esqueleto | fruit: dibujo del fruto | colores propios del cultivo */
    const RECIPES = {
        trigo: { arch: 'cereal', straw: '#e0c060', strawAlt: '#cfa945', ear: '#efd071', earLen: 17, stems: 5, awn: true, awnLen: 7, awnColor: '#e0c060' },
        cebada: { arch: 'cereal', straw: '#d9cd8a', strawAlt: '#c7b96a', ear: '#e8dfa0', earLen: 15, stems: 5, awn: true, awnLen: 13, awnColor: '#ded39a' },
        arroz: { arch: 'cereal', straw: '#d9cf8e', strawAlt: '#c9bd75', ear: '#e9df9f', earLen: 13, stems: 6, spread: 6.4 },
        maiz: { arch: 'tallstalk', kind: 'maiz', stalk: '#5aa845', leaf1: '#63b04a', leaf2: '#3f8a34', tassel: '#d9c07a' },
        girasol: { arch: 'tallstalk', kind: 'girasol', stalk: '#5aa845', leaf1: '#63b04a', leaf2: '#3f8a34', tassel: '#e9b52f' },
        tomate: { arch: 'bush', fruit: 'tomate', stake: 'left', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.62, fruitSpots: [[-11, 6], [11, 4], [0, 16], [14, 16]] },
        pimiento: { arch: 'bush', fruit: 'pimiento', leaf1: '#4f9a3e', leaf2: '#3f8a34', fruitScale: 0.58, fruitSpots: [[-10, 8], [11, 5], [0, 17]] },
        alcachofa: { arch: 'bush', fruit: 'alcachofa', leaf1: '#93a86a', leaf2: '#6f8f45', fruitScale: 0.55, fruitSpots: [[-9, 8], [10, 5], [0, 16]] },
        brocoli: { arch: 'leafy', kind: 'brocoli' },
        lechuga: { arch: 'leafy', kind: 'lechuga' },
        esparrago: { arch: 'spears', kind: 'esparrago' },
        calçots: { arch: 'spears', kind: 'calcot' },
        patata: { arch: 'root', leaf1: '#63b04a', leaf2: '#3f8a34', fruit: 'patata', roots: [[-9, 82], [9, 84], [0, 88]], fruitScale: 0.8 },
        remolacha: { arch: 'root', leaf1: '#5aa845', leaf2: '#3f8a34', fruit: 'remolacha', roots: [[0, 84]], fruitScale: 1 },
        ajo: { arch: 'root', leaf1: '#8fbf5a', leaf2: '#5f9e3d', fruit: 'ajo', roots: [[0, 84]], fruitScale: 0.85 },
        naranja: { arch: 'tree', fruit: 'naranja', leaf1: '#3f8f45', leaf2: '#2f6b38', fruitScale: 0.55, fruitSpots: [[-15, -4], [14, -6], [0, 8], [-9, 13], [12, 12]] },
        limon: { arch: 'tree', fruit: 'limon', leaf1: '#4f9a3e', leaf2: '#357a33', fruitScale: 0.55, fruitSpots: [[-14, -6], [13, -4], [0, 9], [-8, 12], [11, 13]] },
        manzana: { arch: 'tree', fruit: 'manzana', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.6, fruitSpots: [[-13, -4], [12, -6], [0, 9], [-10, 13], [11, 12]] },
        pera: { arch: 'tree', fruit: 'pera', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.62, fruitSpots: [[-13, -6], [12, -5], [0, 9], [-9, 13], [12, 13]] },
        melocoton: { arch: 'tree', fruit: 'melocoton', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.6, fruitSpots: [[-14, -5], [13, -6], [0, 9], [-9, 13], [11, 13]] },
        albaricoque: { arch: 'tree', fruit: 'albaricoque', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.62, fruitSpots: [[-13, -5], [13, -6], [0, 9], [-8, 13], [11, 12]] },
        cereza: { arch: 'tree', fruit: 'cereza', leaf1: '#4f9a3e', leaf2: '#357a33', fruitScale: 0.6, fruitSpots: [[-13, -4], [12, -7], [0, 10], [-8, 12], [12, 12]] },
        higo: { arch: 'tree', fruit: 'higo', leaf1: '#4f9a3e', leaf2: '#357a33', fruitScale: 0.6, fruitSpots: [[-13, -4], [12, -6], [0, 10], [-9, 13], [11, 13]] },
        kaki: { arch: 'tree', fruit: 'kaki', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.6, fruitSpots: [[-13, -5], [12, -6], [0, 10], [-9, 13], [11, 13]] },
        olivo: { arch: 'tree', fruit: 'oliva', leaf1: '#a8bd83', leaf2: '#7d9457', fruitScale: 0.8, fruitSpots: [[-14, -5], [13, -7], [0, 9], [-9, 12], [12, 13]] },
        almendra: { arch: 'tree', fruit: 'almendra', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.62, fruitSpots: [[-13, -6], [12, -6], [0, 10], [-9, 13]] },
        avellana: { arch: 'tree', fruit: 'avellana', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.6, fruitSpots: [[-13, -6], [12, -5], [0, 10], [-9, 13]] },
        aguacate: { arch: 'tree', fruit: 'aguacate', leaf1: '#3f8f45', leaf2: '#2f6b38', fruitScale: 0.62, fruitSpots: [[-14, -5], [13, -6], [0, 10], [-9, 13]] },
        mango: { arch: 'tree', fruit: 'mango', leaf1: '#4f9a3e', leaf2: '#357a33', fruitScale: 0.6, fruitSpots: [[-14, -6], [13, -5], [0, 10], [-9, 13]] },
        kiwi: { arch: 'vine', fruit: 'kiwi', leaf1: '#4f9a3e', leaf2: '#3f8a34', fruitScale: 0.85, vineStem: '#8a6a4a' },
        uva: { arch: 'vine', fruit: 'uva', leaf1: '#4f9a3e', leaf2: '#3f8a34', fruitScale: 1, vineStem: '#7a6a3a' },
        melon: { arch: 'creeper', fruit: 'melon', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.82 },
        sandia: { arch: 'creeper', fruit: 'sandia', leaf1: '#4f9a3e', leaf2: '#3f8a34', fruitScale: 0.8 },
        fresa: { arch: 'berry', fruit: 'fresa', leaf1: '#4f9a3e', leaf2: '#3f8a34', fruitScale: 0.6, fruitSpots: [[-7, 8], [7, 6], [0, 13]] },
        arandano: { arch: 'berry', fruit: 'arandano', habit: 'bush', leaf1: '#4f9a3e', leaf2: '#3f8a34', fruitScale: 0.6, fruitSpots: [[-8, 6], [8, 4], [0, 13]] },
        frambuesa: { arch: 'berry', fruit: 'frambuesa', habit: 'bush', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.58, fruitSpots: [[-8, 5], [8, 7], [0, 13]] },
        lentejas: { arch: 'legume', seed: '#c9a35a', leaf1: '#8fbf5a', leaf2: '#5f9e3d', fruitScale: 0.6 },
        garbanzos: { arch: 'legume', seed: '#dcc27a', leaf1: '#7fae4a', leaf2: '#4f8f3a', fruitScale: 0.6 },
        alubia: { arch: 'legume', seed: '#c46b4a', leaf1: '#5aa845', leaf2: '#3f8a34', fruitScale: 0.6 },
        azafran: { arch: 'flower', count: 4, fruitScale: 0.62 },
        champiñon: { arch: 'fungus' },
        algodon: { arch: 'bush', fruit: 'algodon', leaf1: '#5f7a3a', leaf2: '#456028', fruitScale: 0.62, fruitSpots: [[-11, 6], [11, 4], [0, 15]] }
    };

    // Producto "suelto" (icono para tienda, inventario, calendario...)
    const PRODUCT = {
        trigo: () => cerealEar(50, 46, 42, '#efd071', true, { grains: 5, awnLen: 12 }),
        cebada: () => cerealEar(50, 46, 40, '#e8dfa0', true, { grains: 5, awnLen: 18 }),
        arroz: () => ricePanicle(46, 76, 46, '#e9df9f') + ricePanicle(54, 78, 40, '#dfd28f'),
        maiz: () => F.maiz(50, 50, 1.55, true),
        tomate: () => F.tomate(50, 52, 1.5, true),
        lechuga: () => F.lechuga(50, 54, 1.5, true),
        pimiento: () => F.pimiento(50, 52, 1.5, true),
        brocoli: () => F.brocoli(50, 48, 1.5, true),
        alcachofa: () => F.alcachofa(50, 55, 1.5, true),
        esparrago: () => G('translate(50 62) scale(1.9) translate(-50 -62)', F.esparrago(50, 62, 1, true)),
        calçots: () => G('translate(50 60) scale(1.7) translate(-50 -60)',
            [-7, -2.4, 2.4, 7].map(dx => R(50 + dx - 2, 34, 4, 30, '#f4f0dc', ' rx="2"') + P(`M${50 + dx - 2} 34 q2 -7 4 0 Z`, '#7dbb2f')).join('')),
        patata: () => F.patata(50, 56, 1.35, true),
        remolacha: () => F.remolacha(50, 54, 1.35, true),
        ajo: () => F.ajo(50, 52, 1.5, true),
        naranja: () => F.naranja(50, 50, 1.5, true),
        limon: () => F.limon(50, 50, 1.5, true),
        manzana: () => F.manzana(50, 50, 1.5, true),
        pera: () => F.pera(50, 50, 1.5, true),
        melocoton: () => F.melocoton(50, 50, 1.5, true),
        albaricoque: () => F.albaricoque(50, 50, 1.5, true),
        cereza: () => G('translate(50 52) scale(1.45) translate(-50 -52)', F.cereza(50, 52, 1, true)),
        higo: () => F.higo(50, 52, 1.5, true),
        kaki: () => F.kaki(50, 52, 1.5, true),
        kiwi: () => F.kiwi(50, 50, 1.5, true),
        olivo: () => F.oliva(50, 52, 1.9, true) + F.oliva(60, 58, 1.5, true),
        almendra: () => F.almendra(50, 50, 1.45, true),
        avellana: () => F.avellana(50, 52, 1.5, true),
        aguacate: () => F.aguacate(50, 50, 1.5, true),
        mango: () => F.mango(50, 52, 1.5, true),
        uva: () => F.uva(50, 50, 1.5, true),
        melon: () => F.melon(50, 52, 1.45, true),
        sandia: () => F.sandia(50, 52, 1.5, true),
        fresa: () => F.fresa(50, 48, 1.5, true),
        arandano: () => F.arandano(50, 52, 1.7, true),
        frambuesa: () => F.frambuesa(50, 50, 1.6, true),
        lentejas: () => G('translate(50 52) scale(1.7) translate(-50 -52)', F.pod(50, 52, 1, true, '#c9a35a')) + F.pod(50, 60, 1.2, true, '#c9a35a'),
        garbanzos: () => G('translate(50 52) scale(1.7) translate(-50 -52)', F.pod(50, 52, 1, true, '#dcc27a')) + F.pod(50, 60, 1.2, true, '#dcc27a'),
        alubia: () => G('translate(50 52) scale(1.7) translate(-50 -52)', F.pod(50, 52, 1, true, '#c46b4a')) + F.pod(50, 60, 1.2, true, '#c46b4a'),
        azafran: () => G('translate(50 54) scale(1.7) translate(-50 -54)', F.azafran(50, 54, 1, true)),
        girasol: () => F.girasol(50, 50, 1.5, true),
        champiñon: () => F.champi(50, 52, 1.7, true),
        algodon: () => F.algodon(50, 50, 1.5, true)
    };

    // ------------------------------------------------------------ API pública ---
    const cache = new Map();

    function warp(inner, cls) {
        return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" class="${cls}" aria-hidden="true" focusable="false">${inner}</svg>`;
    }

    /** Fase de dibujo a partir del progreso (0..1) y si está listo. */
    function stageFor(progress, ready) {
        if (ready) return 3;
        const p = Math.max(0, Math.min(1, progress || 0));
        if (p < 0.18) return 0;
        if (p < 0.5) return 1;
        return 2;
    }

    /** Planta completa de un cultivo en una fase (0..3). */
    function plant(cropId, stage = 3) {
        const key = `p:${cropId}:${stage}`;
        if (cache.has(key)) return cache.get(key);
        const r = RECIPES[cropId];
        let inner;
        if (!r) {
            inner = shadow() + sprout(50) + (stage === 3 ? F.tomate(50, 70, 0.8, true) : '');
        } else if (stage === 0 && r.arch !== 'fungus' && r.arch !== 'leafy' && r.arch !== 'spears') {
            // Brote común: mantiene la silueta de la planta en miniatura
            inner = shadow(18) + ARCH[r.arch](0, r);
        } else {
            inner = shadow(r.arch === 'tree' ? 22 : 26) + ARCH[r.arch](stage, r);
        }
        const svg = warp(inner + (stage === 3 ? sparkle() : ''), 'spr');
        cache.set(key, svg);
        return svg;
    }

    /** Producto suelto (fruto / grano) para interfaces. */
    function product(cropId) {
        const key = `i:${cropId}`;
        if (cache.has(key)) return cache.get(key);
        const fn = PRODUCT[cropId];
        const inner = fn ? fn() : C(50, 50, 16, '#b9c96a');
        const svg = warp(inner, 'spr');
        cache.set(key, svg);
        return svg;
    }

    /** Destello de "listo para cosechar". */
    function sparkle() {
        const star = (x, y, s, o) => `<path d="M${x} ${y - s} q${s * 0.22} ${s * 0.7} ${s} ${s} q${-s * 0.78} ${s * 0.3} ${-s} ${s} q${-s * 0.22} ${-s * 0.7} ${-s} ${-s} q${s * 0.78} ${-s * 0.3} ${s} ${-s} Z" fill="#fff" opacity="${o}"/>`;
        return star(76, 26, 6, 0.85) + star(24, 40, 4, 0.7) + star(66, 62, 3.4, 0.55);
    }

    return {
        plant,
        product,
        sparkle,
        stageFor,
        has: (cropId) => !!RECIPES[cropId],
        recipes: RECIPES,
        fruits: F,
        _cacheSize: () => cache.size
    };
})();

if (typeof window !== 'undefined') window.FarmArt = FarmArt;
if (typeof module !== 'undefined' && module.exports) module.exports = { FarmArt };
