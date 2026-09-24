/* ============================================================================
   FarmWorld - Entornos visuales de cada granja
   ----------------------------------------------------------------------------
   Cada región de España tiene su paisaje: cielo, relieve de fondo, campos y
   aperos. Todo se dibuja con SVG en línea (ligero, escalable, sin imágenes
   externas) y se compone en capas con paralaje suave:

       cielo -> sol/luna -> nubes -> sierra (lejos) -> campos (medio) -> granja
       (cerca) -> suelo -> ambiente (partículas)

   El paisaje se adapta a la estación (tinte y partículas) y al momento del día.
   ========================================================================== */

const FarmWorld = (function () {
    'use strict';

    const rnd = (seed) => {
        // PRNG determinista para que el paisaje no "baile" entre repintados
        let s = seed % 2147483647;
        if (s <= 0) s += 2147483646;
        return () => (s = (s * 16807) % 2147483647) / 2147483647;
    };

    const uri = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg).replace(/'/g, '%27')}")`;

    // ------------------------------------------------------------- relieve ---
    /** Cadena de montañas / sierra. */
    function range(color, peaks, seed = 7, h = 220, w = 1000, snow, jitter) {
        const r = rnd(seed);
        let d = `M0 ${h} L0 ${h * 0.62}`;
        const step = w / (peaks.length - 1);
        peaks.forEach((p, i) => {
            const x = i * step;
            const y = h - p * h;
            if (i === 0) d = `M0 ${h} L0 ${y}`;
            else {
                const prevX = (i - 1) * step;
                const prevY = h - peaks[i - 1] * h;
                d += ` L${prevX + step * 0.5} ${Math.min(prevY, y) * 0.94} L${x} ${y}`;
            }
            if (snow && p > 0.72) {
                d += ` l${step * 0.13} ${h * 0.09} l${step * 0.1} ${-h * 0.05} l${step * 0.09} ${h * 0.06} l${step * 0.14} ${-h * 0.1}`;
            }
        });
        d += ` L${w} ${h * 0.68} L${w} ${h} Z`;
        return `<path d="${d}" fill="${color}"/>`;
    }

    /** Colinas suaves (dehesa, campiña, lomas). */
    function hills(color, ys, h = 200, w = 1000) {
        let d = `M0 ${h} L0 ${h - ys[0] * h}`;
        const step = w / (ys.length - 1);
        ys.forEach((y, i) => {
            if (i === 0) return;
            const prev = ys[i - 1];
            d += ` Q${(i - 1) * step + step * 0.5} ${h - Math.max(prev, y) * h * 1.06} ${i * step} ${h - y * h}`;
        });
        d += ` L${w} ${h} Z`;
        return `<path d="${d}" fill="${color}"/>`;
    }

    /** Bancales / parcelas de cultivo en franjas, con surcos y lindes. */
    function bands(colors, count = 6, h = 200, w = 1000, seed = 3) {
        const r = rnd(seed);
        let out = '';
        const rows = [];
        for (let i = 0; i < count; i++) {
            const y = h * (0.14 + (i / count) * 0.86);
            const height = h * (0.15 + r() * 0.11);
            rows.push([y, height, colors[i % colors.length]]);
        }
        // Surcos dentro de cada franja (líneas finas, dibujadas de lejos a cerca)
        rows.forEach(([y, height, c], i) => {
            out += `<path d="M0 ${y} Q${w * 0.5} ${y - 7 - r() * 9} ${w} ${y + 4} L${w} ${y + height} Q${w * 0.5} ${y + height - 9} 0 ${y + height + 4} Z" fill="${c}"/>`;
            const lines = 3;
            for (let k = 1; k <= lines; k++) {
                const ly = y + (height * k) / (lines + 1) + (k - 1) * 1.5;
                out += `<path d="M0 ${ly} Q${w * 0.5} ${ly - 5} ${w} ${ly + 2}" stroke="rgba(80,60,20,.13)" stroke-width="${1.6 + k * 0.5}" fill="none"/>`;
            }
            out += `<path d="M0 ${y + height + 3} Q${w * 0.5} ${y + height - 6} ${w} ${y + height + 7}" stroke="rgba(70,60,30,.18)" stroke-width="1.6" fill="none"/>`;
            // Lindes con arbolado disperso en las franjas pares
            if (i % 2 === 1) {
                for (let t = 0; t < 6; t++) {
                    const tx = 60 + t * 172 + r() * 40;
                    const th = 6 + r() * 4;
                    out += `<ellipse cx="${tx}" cy="${y + height + 1}" rx="${8 + r() * 5}" ry="${th}" fill="rgba(70,95,45,.55)"/>`;
                }
            }
        });
        return out;
    }

    /** Vegetación dispersa: setos, olivar, pinares... Se dibuja con copas
        redondeadas de tamaños variados (las pequeñas quedan más lejos). */
    function foliage(c1, c2, count, seed, h, yBase, maxS = 1) {
        const r = rnd(seed);
        const items = [];
        for (let i = 0; i < count; i++) {
            items.push([70 + r() * 790, yBase - r() * 10, (0.55 + r() * 0.65) * maxS, r()]);
        }
        items.sort((a, b) => a[2] - b[2]);
        let out = '';
        items.forEach(([x, y, s, k]) => {
            out += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y - 5 * s}" stroke="rgba(90,66,40,.75)" stroke-width="${1.4 * s}"/>`;
            out += `<ellipse cx="${x}" cy="${y - 7 * s}" rx="${7.5 * s}" ry="${6 * s}" fill="${k > .5 ? c1 : c2}"/>`;
            out += `<ellipse cx="${x - 4 * s}" cy="${y - 5 * s}" rx="${5 * s}" ry="${4 * s}" fill="${c2}"/>`;
            out += `<ellipse cx="${x + 4 * s}" cy="${y - 5 * s}" rx="${5 * s}" ry="${4 * s}" fill="${c2}"/>`;
        });
        return out;
    }

    // ---------------------------------------------------------------- props ---
    const PROP = {
        // Molino de viento manchego
        molino(x, y, s = 1, c = {}) {
            const stone = c.stone || '#efe3cf', roof = c.roof || '#8d6a4a', blade = '#f4f1e6';
            let out = `<rect x="${x - 9 * s}" y="${y - 34 * s}" width="${18 * s}" height="${34 * s}" fill="${stone}"/>` +
                `<rect x="${x - 9 * s}" y="${y - 34 * s}" width="${6 * s}" height="${34 * s}" fill="rgba(0,0,0,.08)"/>` +
                `<path d="M${x - 13 * s} ${y - 34 * s} L${x} ${y - 48 * s} L${x + 13 * s} ${y - 34 * s} Z" fill="${roof}"/>` +
                `<rect x="${x - 3.4 * s}" y="${y - 16 * s}" width="${6.8 * s}" height="${9 * s}" rx="${3 * s}" fill="#6b4a30"/>`;
            for (let i = 0; i < 4; i++) {
                const a = i * 90 + 20;
                out += `<g transform="rotate(${a} ${x} ${y - 40 * s})"><rect x="${x - 1.3 * s}" y="${y - 40 * s}" width="${2.6 * s}" height="${20 * s}" fill="${blade}"/><rect x="${x + 0.4 * s}" y="${y - 40 * s}" width="${2.6 * s}" height="${20 * s}" fill="rgba(0,0,0,.10)"/></g>`;
            }
            out += `<circle cx="${x}" cy="${y - 40 * s}" r="${2.4 * s}" fill="#7a5a3a"/>`;
            return out;
        },
        // Encina / olivo (copa redondeada, tronco corto)
        encina(x, y, s = 1, c = {}) {
            const trunk = c.trunk || '#7a5636', leaf = c.leaf || '#5d7f45', leaf2 = c.leaf2 || '#4a6b38';
            return `<rect x="${x - 2.4 * s}" y="${y - 12 * s}" width="${4.8 * s}" height="${13 * s}" fill="${trunk}" rx="${1.6 * s}"/>` +
                `<ellipse cx="${x - 7 * s}" cy="${y - 17 * s}" rx="${9 * s}" ry="${7.4 * s}" fill="${leaf2}"/>` +
                `<ellipse cx="${x + 7 * s}" cy="${y - 17 * s}" rx="${9 * s}" ry="${7.4 * s}" fill="${leaf2}"/>` +
                `<ellipse cx="${x}" cy="${y - 24 * s}" rx="${11 * s}" ry="${9 * s}" fill="${leaf}"/>` +
                `<ellipse cx="${x}" cy="${y - 17 * s}" rx="${12 * s}" ry="${7 * s}" fill="${leaf}"/>`;
        },
        olivo(x, y, s = 1) {
            return PROP.encina(x, y, s, { leaf: '#9aad74', leaf2: '#7b9159', trunk: '#8a6a48' });
        },
        almendro(x, y, s = 1, blossom) {
            if (blossom) {
                return `<rect x="${x - 2.2 * s}" y="${y - 11 * s}" width="${4.4 * s}" height="${12 * s}" fill="#7a5636" rx="1.5"/>` +
                    `<ellipse cx="${x}" cy="${y - 19 * s}" rx="${11 * s}" ry="${9 * s}" fill="#f7c7d9"/>` +
                    `<ellipse cx="${x - 7 * s}" cy="${y - 15 * s}" rx="${7 * s}" ry="${5.6 * s}" fill="#f2b3cb"/>` +
                    `<ellipse cx="${x + 7 * s}" cy="${y - 15 * s}" rx="${7 * s}" ry="${5.6 * s}" fill="#f2b3cb"/>`;
            }
            return PROP.encina(x, y, s, { leaf: '#6f9450', leaf2: '#567a3e' });
        },
        // Naranjo / frutal redondo con frutos
        frutalCon(x, y, s = 1, c = {}) {
            const fruit = c.fruit || '#f0912a';
            let out = `<rect x="${x - 2.4 * s}" y="${y - 12 * s}" width="${4.8 * s}" height="${13 * s}" fill="#7a5636" rx="1.6"/>` +
                `<ellipse cx="${x}" cy="${y - 21 * s}" rx="${12 * s}" ry="${10 * s}" fill="${c.leaf || '#3f7f45'}"/>` +
                `<ellipse cx="${x - 8 * s}" cy="${y - 15 * s}" rx="${8 * s}" ry="${6.4 * s}" fill="${c.leaf2 || '#336b39'}"/>` +
                `<ellipse cx="${x + 8 * s}" cy="${y - 15 * s}" rx="${8 * s}" ry="${6.4 * s}" fill="${c.leaf2 || '#336b39'}"/>`;
            [[-7, -20], [5, -24], [0, -14], [10, -17], [-11, -13]].forEach(([dx, dy]) => {
                out += `<circle cx="${x + dx * s}" cy="${y + dy * s}" r="${2.6 * s}" fill="${fruit}"/>`;
            });
            return out;
        },
        // Palmera
        palmera(x, y, s = 1) {
            let out = `<path d="M${x - 2 * s} ${y} q${1.6 * s} ${-18 * s} ${-1 * s} ${-34 * s} q${3 * s} ${-2 * s} ${4 * s} 0 q${-1 * s} ${18 * s} ${1 * s} ${34 * s} Z" fill="#8a6a44"/>`;
            for (let i = 0; i < 7; i++) {
                const a = -160 + i * 34;
                out += `<g transform="rotate(${a} ${x} ${y - 34 * s})"><path d="M${x} ${y - 34 * s} q${16 * s} ${-5 * s} ${24 * s} ${5 * s} q${-18 * s} ${2 * s} ${-24 * s} ${4 * s} Z" fill="${i % 2 ? '#3f7f45' : '#4f8f50'}"/></g>`;
            }
            out += `<circle cx="${x}" cy="${y - 34 * s}" r="${2.6 * s}" fill="#8a6a44"/>`;
            return out;
        },
        cipres(x, y, s = 1, c = {}) {
            return `<rect x="${x - 1.8 * s}" y="${y - 8 * s}" width="${3.6 * s}" height="${9 * s}" fill="#6b4a30"/>` +
                `<path d="M${x} ${y - 44 * s} q${7 * s} ${12 * s} ${5 * s} ${26 * s} q${-3 * s} ${10 * s} ${-5 * s} ${18 * s} q${-2 * s} ${-8 * s} ${-5 * s} ${-18 * s} q${-2 * s} ${-14 * s} ${5 * s} ${-26 * s} Z" fill="${c.leaf || '#2f6b3f'}"/>`;
        },
        pino(x, y, s = 1) {
            return `<rect x="${x - 2 * s}" y="${y - 9 * s}" width="${4 * s}" height="${10 * s}" fill="#6b4a30"/>` +
                `<path d="M${x} ${y - 40 * s} L${x + 11 * s} ${y - 16 * s} L${x - 11 * s} ${y - 16 * s} Z" fill="#2f6b3f"/>` +
                `<path d="M${x} ${y - 30 * s} L${x + 14 * s} ${y - 8 * s} L${x - 14 * s} ${y - 8 * s} Z" fill="#357a45"/>`;
        },
        casa(x, y, s = 1, c = {}) {
            const wall = c.wall || '#f3e7d3', roof = c.roof || '#b4553f';
            let out = `<rect x="${x - 16 * s}" y="${y - 20 * s}" width="${32 * s}" height="${20 * s}" fill="${wall}"/>` +
                `<path d="M${x - 20 * s} ${y - 20 * s} L${x} ${y - 34 * s} L${x + 20 * s} ${y - 20 * s} Z" fill="${roof}"/>` +
                `<rect x="${x - 4 * s}" y="${y - 12 * s}" width="${8 * s}" height="${12 * s}" fill="#8a5f38"/>` +
                `<rect x="${x - 13 * s}" y="${y - 16 * s}" width="${6 * s}" height="${6 * s}" fill="#bfe0ee"/>` +
                `<rect x="${x + 7 * s}" y="${y - 16 * s}" width="${6 * s}" height="${6 * s}" fill="#bfe0ee"/>`;
            out += `<path d="M${x + 12 * s} ${y - 34 * s} q${2 * s} ${-8 * s} ${5 * s} ${-10 * s} q${-1 * s} ${5 * s} ${2 * s} ${10 * s} Z" fill="rgba(240,240,240,.7)"/>`;
            return out;
        },
        // Hórreo gallego/asturiano
        horreo(x, y, s = 1) {
            return `<rect x="${x - 14 * s}" y="${y - 8 * s}" width="${6 * s}" height="${8 * s}" fill="#9a9a92"/>` +
                `<rect x="${x + 8 * s}" y="${y - 8 * s}" width="${6 * s}" height="${8 * s}" fill="#9a9a92"/>` +
                `<rect x="${x - 16 * s}" y="${y - 24 * s}" width="${32 * s}" height="${16 * s}" fill="#c9ab7a"/>` +
                `<path d="M${x - 19 * s} ${y - 24 * s} L${x} ${y - 34 * s} L${x + 19 * s} ${y - 24 * s} Z" fill="#a5673f"/>` +
                `<rect x="${x - 16 * s}" y="${y - 26 * s}" width="${32 * s}" height="${2.4 * s}" fill="#8a6a48"/>`;
        },
        silo(x, y, s = 1) {
            return `<rect x="${x - 9 * s}" y="${y - 40 * s}" width="${18 * s}" height="${40 * s}" rx="${3 * s}" fill="#d8d8d2"/>` +
                `<path d="M${x - 10 * s} ${y - 40 * s} q${10 * s} ${-12 * s} ${20 * s} 0 Z" fill="#b9b9b2"/>` +
                `<rect x="${x - 9 * s}" y="${y - 40 * s}" width="${5 * s}" height="${40 * s}" fill="rgba(0,0,0,.07)"/>`;
        },
        pajar(x, y, s = 1) {
            return `<path d="M${x - 13 * s} ${y} q${3 * s} ${-20 * s} ${13 * s} ${-20 * s} q${10 * s} ${0} ${13 * s} ${20 * s} Z" fill="#d9b96a"/>` +
                `<path d="M${x - 13 * s} ${y} q${13 * s} ${-6 * s} ${26 * s} 0 Z" fill="#c9a95a"/>`;
        },
        muro(x, y, s = 1, w = 40) {
            let out = '';
            const r = rnd(x + 3);
            for (let i = 0; i * 7 * s < w * s; i++) {
                out += `<rect x="${x + i * 7 * s}" y="${y - (5 + r() * 3) * s}" width="${6 * s}" height="${(5 + r() * 3) * s}" rx="${1.4 * s}" fill="${i % 2 ? '#b9ab94' : '#a89a83'}"/>`;
            }
            return out;
        },
        cardo(x, y, s = 1, c = '#7f8f5a') {
            let out = '';
            for (let i = -1; i <= 1; i++) {
                out += `<path d="M${x} ${y} q${i * 5 * s} ${-9 * s} ${i * 7 * s} ${-15 * s}" stroke="${c}" stroke-width="${2 * s}" fill="none" stroke-linecap="round"/>`;
            }
            return out;
        },
        girasolFila(x, y, s = 1) {
            return `<rect x="${x - 1.2 * s}" y="${y - 16 * s}" width="${2.4 * s}" height="${16 * s}" fill="#5a8f3a"/>` +
                `<circle cx="${x}" cy="${y - 19 * s}" r="${5 * s}" fill="#e8b93a"/>` +
                `<circle cx="${x}" cy="${y - 19 * s}" r="${2.6 * s}" fill="#7a5228"/>`;
        },
        arrozal(x, y, s = 1, w = 60) {
            let out = `<rect x="${x}" y="${y - 3}" width="${w * s}" height="${9 * s}" fill="#7fb4c9" opacity=".75" rx="2"/>`;
            out += `<rect x="${x}" y="${y - 6}" width="${w * s}" height="${3.4 * s}" fill="#8fbf5a"/>`;
            return out;
        },
        invernadero(x, y, s = 1) {
            return `<path d="M${x - 18 * s} ${y} q${0} ${-13 * s} ${18 * s} ${-13 * s} q${18 * s} ${0} ${18 * s} ${13 * s} Z" fill="rgba(220,240,250,.85)" stroke="#9db6c4" stroke-width="1"/>` +
                `<path d="M${x - 18 * s} ${y} L${x - 18 * s} ${y - 2 * s}" stroke="#9db6c4"/>` +
                `<path d="M${x} ${y - 13 * s} L${x} ${y}" stroke="#9db6c4" stroke-width=".8"/>`;
        },
        barraca(x, y, s = 1) {
            return `<path d="M${x - 18 * s} ${y} L${x} ${y - 20 * s} L${x + 18 * s} ${y} Z" fill="#c9a86a"/>` +
                `<path d="M${x - 22 * s} ${y} q${22 * s} ${-4 * s} ${44 * s} 0 Z" fill="#8a6a3f"/>` +
                `<rect x="${x - 4 * s}" y="${y - 9 * s}" width="${8 * s}" height="${9 * s}" fill="#6b4a30"/>`;
        },
        castillo(x, y, s = 1) {
            let out = `<rect x="${x - 16 * s}" y="${y - 26 * s}" width="${32 * s}" height="${26 * s}" fill="#cdbb9a"/>`;
            [[-16, 0], [16, 0], [-9, 0], [9, 0]].forEach(([dx]) => {
                out += `<rect x="${x + dx * s - 3 * s}" y="${y - 36 * s}" width="${6 * s}" height="${12 * s}" fill="#cdbb9a"/>`;
            });
            out += `<rect x="${x - 3 * s}" y="${y - 14 * s}" width="${6 * s}" height="${14 * s}" fill="#8a765a"/>`;
            return out;
        },
        vaca(x, y, s = 1) {
            return `<ellipse cx="${x}" cy="${y - 9 * s}" rx="${8 * s}" ry="${5 * s}" fill="#f6f3ec"/>` +
                `<circle cx="${x + 7 * s}" cy="${y - 11 * s}" r="${3.4 * s}" fill="#f6f3ec"/>` +
                `<rect x="${x - 6 * s}" y="${y - 5 * s}" width="${2 * s}" height="${5 * s}" fill="#5a5a55"/>` +
                `<rect x="${x + 3 * s}" y="${y - 5 * s}" width="${2 * s}" height="${5 * s}" fill="#5a5a55"/>` +
                `<ellipse cx="${x - 2 * s}" cy="${y - 10 * s}" rx="${3 * s}" ry="${2.2 * s}" fill="#4a4a45"/>`;
        },
        oveja(x, y, s = 1) {
            return `<ellipse cx="${x}" cy="${y - 7 * s}" rx="${7 * s}" ry="${4.6 * s}" fill="#f2efe6"/>` +
                `<circle cx="${x + 6 * s}" cy="${y - 9 * s}" r="${2.8 * s}" fill="#5f5a52"/>` +
                `<rect x="${x - 4 * s}" y="${y - 4 * s}" width="${1.6 * s}" height="${4 * s}" fill="#4a4540"/>` +
                `<rect x="${x + 2 * s}" y="${y - 4 * s}" width="${1.6 * s}" height="${4 * s}" fill="#4a4540"/>`;
        },
        butano(x, y, s = 1) {
            return `<rect x="${x - 3 * s}" y="${y - 12 * s}" width="${6 * s}" height="${12 * s}" rx="${1.6 * s}" fill="#e07a3a"/>`;
        }
    };

    // ---------------------------------------------------------------- cielo ---
    function clouds(count, seed = 11) {
        const r = rnd(seed);
        let out = '';
        for (let i = 0; i < count; i++) {
            const x = 60 + r() * 880;
            const y = 40 + r() * 110;
            const s = 0.6 + r() * 0.9;
            out += `<g transform="translate(${x} ${y}) scale(${s})" opacity="${0.55 + r() * 0.35}">` +
                `<ellipse cx="0" cy="0" rx="46" ry="18" fill="#fff"/>` +
                `<ellipse cx="-24" cy="6" rx="30" ry="13" fill="#fff"/>` +
                `<ellipse cx="26" cy="6" rx="32" ry="14" fill="#fff"/>` +
                `<ellipse cx="4" cy="-11" rx="28" ry="15" fill="#fff"/></g>`;
        }
        return out;
    }

    const celestial = (tod) => {
        if (tod >= 2) {
            return `<circle cx="820" cy="110" r="34" fill="#f2f0e0"/><circle cx="806" cy="100" r="30" fill="rgba(0,0,0,0)"/>
                <g opacity=".85">${[0, 1, 2, 3, 4, 5, 6].map(i => `<circle cx="${120 + i * 118}" cy="${52 + (i % 3) * 26}" r="${1.4 + (i % 3) * 0.5}" fill="#fff"/>`).join('')}</g>`;
        }
        if (tod === 1) return `<circle cx="830" cy="330" r="40" fill="#ffd27a"/><circle cx="830" cy="330" r="58" fill="rgba(255,200,120,.28)"/>`;
        return `<circle cx="840" cy="90" r="38" fill="#ffe66b"/><circle cx="840" cy="90" r="56" fill="rgba(255,230,110,.3)"/>`;
    };

    // ----------------------------------------------------------- escenarios ---
    /* Cada escenario devuelve las tres capas de paisaje (lejos/medio/cerca)   */
    const SCENES = {
        castillalamancha: {
            label: 'La Mancha · meseta de molinos y viñedos',
            sky: ['#7ec4ea', '#bfe3f5', '#f2e3c2'],
            far: (h) => range('#b6a58c', [0.42, 0.62, 0.38, 0.72, 0.46], 5, h) + range('#cdbda4', [0.3, 0.42, 0.26, 0.5, 0.34], 9, h),
            mid: (h) => bands(['#d3b76a', '#bda055', '#e0c886', '#a88c48', '#d0b465'], 5, h, 1000, 4) + foliage('#6f9445', '#557a38', 12, 61, h, h - 8, 0.9),
            near: (h) => PROP.molino(232, h, 1.05) + PROP.molino(322, h, 0.8) + PROP.molino(742, h, 0.95) +
                PROP.encina(430, h, 1) + PROP.olivo(560, h, 0.85) + PROP.encina(700, h, 0.9) + PROP.cardo(660, h, 1) + PROP.muro(790, h, 1, 60),
            farLabel: 'Meseta',
            weather: 'wind'
        },
        aragon: {
            label: 'Aragón · Pirineo, cipreses y huerta del Ebro',
            sky: ['#6fb6e8', '#a9d8ef', '#e8ecd6'],
            far: (h) => range('#8fa3b5', [0.62, 0.86, 0.58, 0.92, 0.7, 0.8], 3, h, 1000, true) + range('#a8b6a5', [0.38, 0.5, 0.34, 0.56, 0.42], 8, h),
            mid: (h) => bands(['#7f9c52', '#93a95c', '#6f8c48', '#a3b46a'], 5, h, 1000, 6) + foliage('#8fae5a', '#6f9445', 10, 64, h, h - 7, 0.85),
            near: (h) => PROP.cipres(206, h, 1.1) + PROP.cipres(232, h, 0.8) + PROP.almendro(330, h, 1, true) +
                PROP.casa(520, h, 0.9, { wall: '#f0e3cd', roof: '#8d5b3f' }) + PROP.almendro(760, h, 0.95, true) + PROP.almendro(880, h, 0.8, false),
            weather: 'wind'
        },
        extremadura: {
            label: 'Extremadura · dehesa de encinas y ganado',
            sky: ['#82c2e8', '#c3e2f0', '#f0e6c8'],
            far: (h) => range('#bcc3a8', [0.24, 0.34, 0.2, 0.36, 0.26, 0.22], 44, h) + hills('#a8b48e', [0.3, 0.42, 0.28, 0.4, 0.34, 0.3], h),
            mid: (h) => hills('#8fa475', [0.2, 0.3, 0.24, 0.32, 0.26, 0.22], h) +
                foliage('#5d7f45', '#47632f', 14, 63, h, h - 4, 1) +
                PROP.encina(160, h, 0.7, { leaf: '#5d7f45' }) + PROP.encina(420, h, 0.6) + PROP.encina(660, h, 0.72) + PROP.encina(880, h, 0.58),
            near: (h) => PROP.encina(214, h, 1.05) + PROP.oveja(340, h, 1) + PROP.oveja(400, h, 0.85) + PROP.oveja(450, h, 1.05) +
                PROP.muro(560, h, 1, 90) + PROP.encina(820, h, 0.95),
            weather: 'leaves'
        },
        larioja: {
            label: 'La Rioja · viñedos y sierra',
            sky: ['#7fc0e8', '#c2e0ee', '#f2e6c9'],
            far: (h) => range('#9aa6a0', [0.36, 0.5, 0.32, 0.54, 0.4], 12, h),
            mid: (h) => hills('#b7c06a', [0.22, 0.3, 0.26, 0.34, 0.24, 0.28], h) +
                // hileras de viñedo
                (() => { let o = ''; for (let i = 0; i < 22; i++) o += `<ellipse cx="${20 + i * 46}" cy="${h - 26}" rx="16" ry="5" fill="#5f8a3f"/>`; return o; })(),
            near: (h) => PROP.vina(0, h, 1, 1000) +
                PROP.casa(520, h, 1.05, { wall: '#f4e8d2', roof: '#a35a44' }) + PROP.cipres(660, h, 0.9) + PROP.cipres(690, h, 0.7) + PROP.encina(880, h, 0.85),
            weather: 'wind',
            vineRows: true
        },
        murcia: {
            label: 'Murcia · secano, palmeras y mar',
            sky: ['#6cbfe8', '#b6e0ef', '#f6e6bd'],
            far: (h) => range('#b09a7a', [0.44, 0.6, 0.4, 0.66, 0.5], 15, h) + `<rect x="0" y="${h - 12}" width="1000" height="12" fill="#5fa8c9"/>`,
            mid: (h) => bands(['#cbb267', '#d9c37c', '#bda35a'], 4, h, 1000, 5) + foliage('#9aa06a', '#7d8452', 9, 67, h, h - 6, 0.7),
            near: (h) => PROP.palmera(216, h, 1.1) + PROP.palmera(268, h, 0.8) + PROP.invernadero(400, h, 1) + PROP.invernadero(560, h, 0.9) +
                PROP.cardo(660, h, 1.2, '#9aa06a') + PROP.palmera(782, h, 1) + PROP.casa(700, h, 0.7, { wall: '#f7f0e0', roof: '#c07a52' }),
            weather: 'heat'
        },
        valencia: {
            label: 'Valencia · arrozales, naranjos y la Albufera',
            sky: ['#79c3ea', '#bfe3f2', '#f4eccf'],
            far: (h) => `<rect x="0" y="${h - 26}" width="1000" height="26" fill="#5fa8c9" opacity=".9"/>` + hills('#9fb87a', [0.16, 0.22, 0.18, 0.2, 0.16, 0.19], h),
            mid: (h) => foliage('#4f8f45', '#3b703a', 9, 69, h, h - 4, 0.9) + PROP.arrozal(0, h - 18, 2.4, 140) + PROP.arrozal(220, h - 10, 2, 130) + PROP.arrozal(520, h - 16, 2.6, 150) + PROP.arrozal(820, h - 8, 2, 120),
            near: (h) => PROP.barraca(222, h, 1) + PROP.frutalCon(360, h, 1) + PROP.frutalCon(440, h, 0.8) +
                PROP.frutalCon(700, h, 1.05) + PROP.frutalCon(790, h, 0.85) + PROP.palmera(560, h, 0.7),
            weather: 'wind'
        },
        cataluna: {
            label: 'Cataluña · Montseny, viñas y masías',
            sky: ['#77bfe8', '#b9dff0', '#eef0d8'],
            far: (h) => range('#7f8f9d', [0.5, 0.72, 0.46, 0.78, 0.56], 21, h),
            mid: (h) => hills('#8fa866', [0.2, 0.28, 0.22, 0.3, 0.24, 0.2], h) + PROP.pino(220, h - 4, 0.5) + PROP.pino(480, h - 4, 0.45) + PROP.pino(700, h - 4, 0.5),
            near: (h) => PROP.casa(240, h, 1.05, { wall: '#e9dcc4', roof: '#a5704f' }) + PROP.cipres(380, h, 1) + PROP.cipres(408, h, 0.75) +
                PROP.avellano(620, h, 1) + PROP.pino(784, h, 0.9),
            weather: 'wind'
        },
        castillayleon: {
            label: 'Castilla y León · campos de cereal y castillos',
            sky: ['#78c1e8', '#bde0ef', '#f2e6c4'],
            far: (h) => hills('#c3b393', [0.26, 0.34, 0.24, 0.36, 0.28, 0.26], h),
            mid: (h) => bands(['#e0c67c', '#c9ac5f', '#edd9a0', '#b9a052', '#d8bd70'], 6, h, 1000, 7) + foliage('#7d9457', '#5f7a3e', 11, 68, h, h - 5, 0.85),
            near: (h) => PROP.castillo(246, h, 0.95) + PROP.cerealFila(0, h) + PROP.silo(690, h, 1) + PROP.pajar(786, h, 1) + PROP.encina(520, h, 0.85),
            weather: 'wind',
            cerealField: true
        },
        navarra: {
            label: 'Navarra · huerta, río y Pirineo verde',
            sky: ['#83c6ea', '#c6e5f0', '#eef0d6'],
            far: (h) => range('#7fa08a', [0.44, 0.6, 0.4, 0.64, 0.48], 24, h, 1000, true),
            mid: (h) => `<rect x="0" y="${h - 30}" width="1000" height="30" fill="#79b7d6" opacity=".85"/>` + hills('#93ab6a', [0.2, 0.26, 0.22, 0.28, 0.2, 0.24], h),
            near: (h) => PROP.casa(228, h, 1, { wall: '#f6ecd8', roof: '#b0553f' }) + PROP.esparragoFila(400, h) + PROP.frutalCon(620, h, 0.9, { fruit: '#e25b5b', leaf: '#4f8f45' }) +
                PROP.pajar(778, h, 0.9) + PROP.muro(650, h, 1, 90),
            weather: 'wind'
        },
        paisvasco: {
            label: 'País Vasco · caseríos, prados y mar Cantábrico',
            sky: ['#7fb6dd', '#bed9e8', '#e6eee0'],
            far: (h) => range('#93a8b4', [0.3, 0.42, 0.26, 0.44, 0.32, 0.28], 48, h) + hills('#6f8f7a', [0.36, 0.5, 0.32, 0.52, 0.38, 0.44], h) + `<rect x="0" y="${h - 20}" width="1000" height="20" fill="#5b93b5" opacity=".8"/>`,
            mid: (h) => hills('#7fa055', [0.22, 0.3, 0.24, 0.32, 0.26, 0.22], h) + PROP.manzano(200, h - 2, 0.55) + PROP.manzano(520, h - 2, 0.5) + PROP.vaca(760, h - 2, 0.7),
            near: (h) => PROP.casa(238, h, 1.1, { wall: '#f7f1e2', roof: '#8c4a37' }) + PROP.manzano(430, h, 1) + PROP.manzano(530, h, 0.85) +
                PROP.vaca(680, h, 1) + PROP.muro(766, h, 1, 80),
            weather: 'rain'
        },
        cantabria: {
            label: 'Cantabria · Picos de Europa y prados verdes',
            sky: ['#84b8dd', '#c2dbe8', '#e8eee2'],
            far: (h) => range('#6f7f8a', [0.72, 0.94, 0.66, 0.98, 0.78], 27, h, 1000, true),
            mid: (h) => hills('#7f9f5f', [0.18, 0.26, 0.2, 0.28, 0.22, 0.19], h),
            near: (h) => PROP.casa(226, h, 1, { wall: '#f2e8d6', roof: '#a5503c' }) + PROP.vaca(360, h, 1) + PROP.vaca(420, h, 0.85) +
                PROP.kiwiTrellis(560, h) + PROP.muro(742, h, 1, 100) + PROP.frutalCon(806, h, 0.8, { fruit: '#c9d94a', leaf: '#4f8f45' }),
            weather: 'rain'
        },
        asturias: {
            label: 'Asturias · hórreo, manzanos y montaña',
            sky: ['#7fb6dd', '#bfd9e6', '#e2eee0'],
            far: (h) => range('#6f8a7f', [0.5, 0.68, 0.44, 0.72, 0.54], 30, h),
            mid: (h) => hills('#7a9c58', [0.2, 0.28, 0.22, 0.3, 0.24, 0.2], h) + PROP.manzano(300, h - 2, 0.5) + PROP.manzano(640, h - 2, 0.55),
            near: (h) => PROP.horreo(232, h, 1.05) + PROP.manzano(420, h, 1.05) + PROP.manzano(520, h, 0.9) +
                PROP.vaca(672, h, 1) + PROP.casa(774, h, 0.85, { wall: '#f4ecdc', roof: '#9c4a38' }),
            weather: 'rain'
        },
        galicia: {
            label: 'Galicia · rías, viñedos en bancales y hórreos',
            sky: ['#8cbcdd', '#c8dce6', '#dfe8de'],
            far: (h) => range('#a9b7b2', [0.26, 0.36, 0.22, 0.38, 0.28], 52, h) + hills('#7f8f7a', [0.3, 0.4, 0.28, 0.42, 0.32, 0.3], h) + `<rect x="0" y="${h - 18}" width="1000" height="18" fill="#6f9fb5" opacity=".8"/>`,
            mid: (h) => hills('#8aa25c', [0.24, 0.32, 0.26, 0.34, 0.28, 0.24], h) +
                (() => { let o = ''; for (let i = 0; i < 16; i++) o += `<ellipse cx="${30 + i * 62}" cy="${h - 22}" rx="20" ry="6" fill="#6f9445"/>`; return o; })(),
            near: (h) => PROP.horreo(238, h, 1) + PROP.muro(360, h, 1, 120) + PROP.manzano(560, h, 0.95) +
                PROP.casa(742, h, 0.9, { wall: '#f2ead9', roof: '#8d5a44' }),
            weather: 'rain',
            fog: true
        },
        madrid: {
            label: 'Madrid · Sierra de Guadarrama y fresas del valle',
            sky: ['#7cc0e8', '#c4e0ee', '#f0e8cc'],
            far: (h) => range('#9fabb8', [0.56, 0.78, 0.5, 0.84, 0.62, 0.7], 33, h, 1000, true) + range('#bcc6d2', [0.34, 0.44, 0.3, 0.46, 0.36], 37, h),
            mid: (h) => hills('#a8ac68', [0.2, 0.26, 0.22, 0.28, 0.22, 0.2], h) + foliage('#4d7a48', '#3b6338', 12, 66, h, h - 6, 1.1),
            near: (h) => PROP.pino(216, h, 1.05) + PROP.pino(268, h, 0.8) + PROP.muro(340, h, 1, 130) +
                PROP.fresal(560, h) + PROP.casa(760, h, 0.9, { wall: '#f6eee0', roof: '#a8603f' }),
            weather: 'petals'
        },
        andalucia: {
            label: 'Andalucía · mar de olivos, cortijo y Sierra Nevada',
            sky: ['#7fc7ee', '#c9e6f2', '#f8ecc6'],
            far: (h) => range('#a8b4c2', [0.62, 0.86, 0.54, 0.9, 0.68], 36, h, 1000, true) + range('#c2cbd6', [0.4, 0.52, 0.36, 0.56, 0.44], 40, h),
            mid: (h) => hills('#b5b473', [0.2, 0.28, 0.22, 0.3, 0.24, 0.21], h) +
                (() => { let o = ''; const r = rnd(42); for (let i = 0; i < 26; i++) { const x = i * 40; o += PROP.olivo(x, h - 6 + r() * 6, 0.62 + r() * 0.24); } return o; })() +
                foliage('#8aa056', '#6d8443', 12, 70, h, h - 3, 0.95),
            near: (h) => PROP.cortijo(242, h) + PROP.olivo(430, h, 1.1) + PROP.olivo(520, h, 0.9) + PROP.olivo(790, h, 1) + PROP.palmera(660, h, 0.85),
            weather: 'heat'
        }
    };

    // Props extra usados por algunos escenarios
    PROP.vina = (x, y, s = 1, w = 1000) => {
        let out = '';
        for (let i = 0; i < 13; i++) {
            const px = i * (w / 13);
            out += `<rect x="${px}" y="${y - 26}" width="2.6" height="26" fill="#b8895a"/>`;
            out += `<path d="M${px - 12} ${y - 30} q12 -14 24 0 q-12 5 -24 0 Z" fill="#5f8a3f"/>`;
            out += `<path d="M${px + 1} ${y - 30} q12 -14 24 0 q-12 5 -24 0 Z" fill="#4f7a35"/>`;
        }
        return out + `<rect x="0" y="${y - 34}" width="${w}" height="3" fill="#e8dcb8" opacity=".8"/>`;
    };
    PROP.cerealFila = (x, y, s = 1) => {
        let out = '';
        for (let i = 0; i < 40; i++) {
            const px = 60 + i * 22;
            out += `<path d="M${px} ${y} q-4 -16 -1 -22" stroke="#d9b95a" stroke-width="2" fill="none"/>`;
            out += `<ellipse cx="${px - 1}" cy="${y - 24}" rx="2.4" ry="5" fill="#e8cc74"/>`;
        }
        return out;
    };
    PROP.esparragoFila = (x, y, s = 1) => {
        let out = `<rect x="${x - 40}" y="${y - 4}" width="200" height="6" fill="#8a6a45" rx="3"/>`;
        for (let i = 0; i < 7; i++) {
            out += `<path d="M${x - 30 + i * 26} ${y - 4} q2 -20 5 -26" stroke="#6fa83f" stroke-width="3" fill="none" stroke-linecap="round"/>`;
        }
        return out;
    };
    PROP.fresal = (x, y, s = 1) => {
        let out = '';
        for (let r = 0; r < 2; r++) for (let i = 0; i < 6; i++) {
            out += `<ellipse cx="${x + i * 24 - 60}" cy="${y - 6 - r * 12}" rx="11" ry="5" fill="#4f8f45"/>`;
            out += `<circle cx="${x + i * 24 - 60 + 4}" cy="${y - 8 - r * 12}" r="2.6" fill="#e14b4b"/>`;
        }
        return out;
    };
    PROP.manzano = (x, y, s = 1) => PROP.frutalCon(x, y, s, { fruit: '#e0524c', leaf: '#4f8f45', leaf2: '#3f7a38' });
    PROP.avellano = (x, y, s = 1) => PROP.frutalCon(x, y, s, { fruit: '#c08a4a', leaf: '#5f8f45', leaf2: '#4a7a38' });
    PROP.kiwiTrellis = (x, y, s = 1) => {
        let out = '';
        for (let i = 0; i < 4; i++) out += `<rect x="${x + i * 40}" y="${y - 22}" width="3" height="22" fill="#b8895a"/>`;
        out += `<rect x="${x - 4}" y="${y - 24}" width="132" height="3" fill="#cfae79"/>`;
        for (let i = 0; i < 8; i++) out += `<ellipse cx="${x + i * 17}" cy="${y - 28}" rx="12" ry="6" fill="${i % 2 ? '#4f8f45' : '#3f7a38'}"/>`;
        out += `<ellipse cx="${x + 60}" cy="${y - 34}" rx="16" ry="8" fill="#4f8f45"/>`;
        return out;
    };
    PROP.cortijo = (x, y, s = 1) => {
        let out = `<rect x="${x - 30 * s}" y="${y - 24 * s}" width="${60 * s}" height="${24 * s}" fill="#f6efdd"/>` +
            `<path d="M${x - 36 * s} ${y - 24 * s} L${x - 4 * s} ${y - 40 * s} L${x + 8 * s} ${y - 24 * s} Z" fill="#b4553f"/>` +
            `<path d="M${x - 4 * s} ${y - 40 * s} L${x + 34 * s} ${y - 34 * s} L${x + 34 * s} ${y - 14 * s} L${x + 8 * s} ${y - 24 * s} Z" fill="#c46a4a"/>` +
            `<rect x="${x - 10 * s}" y="${y - 15 * s}" width="${10 * s}" height="${15 * s}" fill="#8a5f38"/>` +
            `<rect x="${x + 12 * s}" y="${y - 20 * s}" width="${8 * s}" height="${8 * s}" fill="#bfe0ee"/>`;
        out += PROP.palmera(x - 60 * s, y, 0.6 * s);
        return out;
    };

    // ------------------------------------------------------------ API pública --
    const SEASON_PARTICLE = {
        spring: ['petals', 'petals', 'wind'],
        summer: ['heat', 'heat'],
        autumn: ['leaves', 'leaves', 'leaves'],
        winter: ['snow', 'snow', 'rain']
    };

    /* Alturas de referencia de cada capa (unidades de dibujo). El SVG se
       escala de forma uniforme ("slice" anclado abajo), así que las formas
       nunca se deforman: si la pantalla es estrecha se recorta por los lados
       y si es ancha se recorta cielo por arriba. */
    const LAYER_UNITS = { far: 230, mid: 190, near: 150 };

    function propsLayer(kind, scene) {
        const h = LAYER_UNITS[kind];
        const fn = scene && scene[kind];
        const body = typeof fn === 'function' ? fn(h) : '';
        return `<svg viewBox="0 0 1000 ${h}" preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
    }

    /**
     * Construye el fondo completo de una granja.
     * @param {string} regionId
     * @param {string} season   spring|summer|autumn|winter
     * @param {number} tod      0 día · 1 atardecer · 2 noche · 3 amanecer
     * @returns {HTMLElement}
     */
    function build(regionId, season = 'spring', tod = 3, opts = {}) {
        const scene = SCENES[regionId] || SCENES.castillalamancha;
        const h = opts.height || 210;

        const root = document.createElement('div');
        root.className = `farm-world tod-${tod} season-${season}`;
        root.dataset.region = regionId;

        const farSvg = propsLayer('far', scene);
        const midSvg = propsLayer('mid', scene);
        const nearSvg = propsLayer('near', scene);

        const parts = [
            `<div class="w-sky" style="--sky-top:${scene.sky[0]};--sky-mid:${scene.sky[1]};--sky-low:${scene.sky[2]}"></div>`,
            `<div class="w-celestial">${celestial(tod)}</div>`,
            `<div class="w-clouds"><svg viewBox="0 0 1000 200" preserveAspectRatio="none">${clouds(4, regionId.length * 13 + 5)}</svg></div>`,
            `<div class="w-layer w-far">${farSvg}</div>`,
            `<div class="w-haze"></div>`,
            `<div class="w-fog"></div>`,
            `<div class="w-layer w-mid">${midSvg}</div>`,
            `<div class="w-ground"></div>`,
            `<div class="w-layer w-near">${nearSvg}</div>`,
            `<div class="w-ambient"></div>`
        ];
        root.innerHTML = parts.join('');

        // Partículas ambientales (estación + clima del lugar)
        fillAmbient(root.querySelector('.w-ambient'), season, scene.weather, tod);
        if (scene.fog) root.classList.add('has-fog');
        // Etiqueta informativa del lugar (se muestra en el HUD de la granja)
        root.dataset.place = scene.label || '';
        return root;
    }

    /** Rellena la capa de partículas con elementos animados por CSS. */
    function fillAmbient(layer, season, weather, tod) {
        if (!layer) return;
        const r = rnd(season.length * 97 + (weather || '').length * 31 + tod * 7 + 1);
        const kinds = [];
        const base = SEASON_PARTICLE[season] || ['wind'];
        const n = 16;
        for (let i = 0; i < n; i++) {
            const kind = base[Math.floor(r() * base.length)];
            const el = document.createElement('i');
            el.className = 'amb ' + kind;
            el.style.left = (r() * 100).toFixed(1) + '%';
            el.style.animationDelay = (-r() * 14).toFixed(1) + 's';
            el.style.animationDuration = (7 + r() * 9).toFixed(1) + 's';
            el.style.setProperty('--dx', ((r() - 0.5) * 180).toFixed(0) + 'px');
            el.style.setProperty('--sz', (0.6 + r() * 0.9).toFixed(2));
            el.style.top = (-r() * 20).toFixed(0) + '%';
            layer.appendChild(el);
            kinds.push(kind);
        }
        // Ocasionales: mariposa de día, luciérnaga de noche
        if (tod <= 1) {
            const b = document.createElement('i');
            b.className = 'amb butterfly';
            b.style.left = '18%';
            b.style.top = '46%';
            layer.appendChild(b);
        } else {
            for (let i = 0; i < 3; i++) {
                const f = document.createElement('i');
                f.className = 'amb firefly';
                f.style.left = (20 + r() * 60).toFixed(0) + '%';
                f.style.top = (35 + r() * 30).toFixed(0) + '%';
                f.style.animationDelay = (-r() * 4).toFixed(1) + 's';
                layer.appendChild(f);
            }
        }
    }

    /** Etiqueta descriptiva del lugar (para el HUD). */
    function placeLabel(regionId) {
        const s = SCENES[regionId];
        return s ? s.label : '';
    }

    return { build, placeLabel, scenes: SCENES, props: PROP };
})();

if (typeof window !== 'undefined') window.FarmWorld = FarmWorld;
if (typeof module !== 'undefined' && module.exports) module.exports = { FarmWorld };
