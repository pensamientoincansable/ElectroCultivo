/* ============================================================================
   Prueba de humo del front-end de ElectroCultivo
   ----------------------------------------------------------------------------
   Carga index.html en jsdom y ejecuta el bucle de juego real: arar, plantar,
   regar, avanzar días, cosechar, vender, viajar por las 15 regiones, comprar,
   minijuegos, calendario y guardado.

   Uso:  npm install   (instala jsdom)
         npm test
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const http = require('http');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');

function loadGameHtml() {
    let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
    // Fuera dependencias de red: Tailwind (CDN) y tipografías
    html = html.replace(/<script src="https:\/\/cdn\.jsdelivr\.net[^>]*><\/script>/, '');
    html = html.replace(/<link\s+href="https:\/\/fonts\.googleapis[^>]*>/, '');
    return html;
}

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.json': 'application/json'
};

/* Servidor estático mínimo: jsdom necesita http para resolver rutas relativas */
function serveRepo() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
            const file = path.join(ROOT, rel);
            if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
                res.writeHead(404);
                return res.end('no encontrado');
            }
            res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
            res.end(fs.readFileSync(file));
        });
        server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
    });
}

const errors = [];
const results = [];

function check(name, fn) {
    try {
        fn();
        results.push('  OK    ' + name);
    } catch (e) {
        results.push('  FALLO ' + name + ' → ' + e.message);
        errors.push(name + ': ' + e.message);
    }
}

(async () => {
    const { server, port } = await serveRepo();
    const vc = new VirtualConsole();
    vc.on('jsdomError', (e) => {
        if (!/Not implemented/.test(e.message)) errors.push('JSDOM: ' + e.message);
    });
    vc.on('error', (...a) => errors.push('CONSOLE: ' + a.join(' ')));

    const dom = new JSDOM(loadGameHtml(), {
        runScripts: 'dangerously',
        resources: 'usable',
        url: `http://127.0.0.1:${port}/index.html`,
        pretendToBeVisual: true,
        virtualConsole: vc
    });

    const { window } = dom;
    // Sustituimos los diálogos nativos por dobles controlables
    window.alert = () => { };
    window.confirm = () => true;
    window.prompt = () => null;

    await new Promise((res) => {
        if (window.document.readyState === 'complete') return res();
        window.addEventListener('load', res);
        setTimeout(res, 5000);
    });

    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const G = () => window.eval('gameData');
    const R = () => window.eval('regions');
    const E = () => window.eval('electroEquipment');

    check('los scripts del juego cargan', () => {
        ['gameData', 'regions', 'crops', 'FarmArt', 'FarmWorld'].forEach((g) => {
            if (typeof window.eval(g) === 'undefined') throw new Error('falta ' + g);
        });
    });

    check('startLocalGame arranca la partida', () => window.startLocalGame());
    await wait(300);

    check('todos los cultivos tienen sprite propio', () => {
        const crops = window.eval('crops');
        const faltan = Object.keys(crops).filter((id) => !window.FarmArt.has(id));
        if (faltan.length) throw new Error('sin receta: ' + faltan.join(', '));
    });

    check('todas las regiones tienen escenario', () => {
        const faltan = Object.keys(R()).filter((id) => !window.FarmWorld.scenes[id]);
        if (faltan.length) throw new Error('sin escenario: ' + faltan.join(', '));
    });

    check('renderFarm genera las parcelas', () => {
        window.showView('farm');
        const n = window.document.getElementById('farmGrid').children.length;
        if (!n) throw new Error('rejilla vacía');
        const svg = window.document.querySelector('#farmGrid .farm-plot.planted svg, #farmGrid .farm-plot.unplowed');
        if (!svg) throw new Error('parcela sin contenido');
    });

    check('el paisaje se monta con sus capas', () => {
        const w = window.document.querySelector('#worldMount .farm-world');
        if (!w) throw new Error('sin paisaje');
        ['w-sky', 'w-far', 'w-mid', 'w-near', 'w-ground', 'w-ambient'].forEach((c) => {
            if (!w.querySelector('.' + c)) throw new Error('falta capa ' + c);
        });
        if (!w.querySelector('.amb')) throw new Error('sin partículas ambientales');
    });

    check('arar una parcela y plantar', () => {
        const plot = G().farms[G().currentRegion].plots[0];
        plot.plowed = true;
        window.openPlantModal(0);
        if (window.document.getElementById('plantModal').classList.contains('hidden')) throw new Error('modal no abierto');
        if (!window.document.querySelector('#plantModalSeeds svg')) throw new Error('semillas sin sprite');
        window.plantSeed('trigo');
        if (!G().farms[G().currentRegion].plots[0].planted) throw new Error('no se plantó');
    });

    check('arado manteniendo pulsado (finishPlowing)', () => {
        window.gameData = undefined;
        window.eval('gameData.energy = 100');
        window.startPlowing(1);
        window.finishPlowing(1);
        if (!G().farms[G().currentRegion].plots[1].plowed) throw new Error('no quedó arada');
    });

    check('regar todo', () => {
        window.eval('gameData.energy = 100');
        window.waterAll();
        if (!G().farms[G().currentRegion].plots[0].watered) throw new Error('sin regar');
    });

    check('avanzar días hasta la cosecha', () => {
        for (let i = 0; i < 12; i++) window.advanceDay();
        const listo = G().farms[G().currentRegion].plots.some((p) => p.ready);
        if (!listo) throw new Error('nada maduró');
    });

    check('cosechar (overlay con sprites)', () => {
        const farm = G().farms[G().currentRegion];
        const idx = farm.plots.findIndex((p) => p.ready);
        window.startFullHarvest(idx);
        const frutos = window.document.querySelectorAll('#harvestFruitArea .harvest-fruit');
        if (!frutos.length) throw new Error('sin frutos en el overlay');
        if (!frutos[0].querySelector('svg')) throw new Error('fruto sin sprite');
        frutos.forEach((f) => f.onclick());
    });
    await wait(700);

    check('cosechar todo y vender todo', () => {
        window.harvestAll();
        const antes = G().money;
        window.sellAll();
        if (G().money < antes) throw new Error('el dinero bajó al vender');
    });

    check('el inventario muestra sprites', () => {
        window.showView('inventory');
        const grid = window.document.getElementById('inventoryGrid');
        if (!grid.querySelector('svg.prod-sprite')) throw new Error('sin sprites en inventario');
    });

    check('tienda: semillas, herramientas y electro', () => {
        window.eval('gameData.money = 99999');
        window.showView('shop');
        if (!window.document.querySelector('#shopSeeds svg')) throw new Error('semillas sin sprite');
        window.buySeed('trigo');
        ['regadera', 'tractor', 'tractorArado', 'invernadero', 'sistemaRiego'].forEach((t) => window.buyTool(t));
        Object.keys(E()).forEach((e) => window.buyElectro(e));
        window.renderFarm();
        if (!window.document.getElementById('plowAllBtn')) throw new Error('falta el botón de arar todo');
        window.plowAll();
    });

    check('calendario de cultivos', () => {
        window.showCalendar();
        window.renderCalendar();
        if (!window.document.querySelector('#calendarGrid svg')) throw new Error('sin sprites en el calendario');
        window.closeCalendar();
    });

    check('ficha de región en el mapa', () => {
        window.showView('map');
        const id = 'valencia';
        G().unlockedRegions.push(id);
        window.selectRegion(id);
        const info = window.document.getElementById('regionInfo');
        if (!/Valencia/.test(info.textContent)) throw new Error('no se muestra la región');
        if (!info.querySelector('svg')) throw new Error('cultivos sin sprite');
    });

    check('viajar a las 15 regiones', () => {
        Object.keys(R()).forEach((r) => {
            if (!G().unlockedRegions.includes(r)) G().unlockedRegions.push(r);
            window.travelToRegion(r);
            if (!window.document.querySelector('#worldMount .farm-world')) throw new Error('sin paisaje en ' + r);
            if (!window.document.querySelector('#worldMount .w-near svg')) throw new Error('sin primer plano en ' + r);
        });
    });

    check('las 4 estaciones repintan el paisaje', () => {
        ['spring', 'summer', 'autumn', 'winter'].forEach((s) => {
            window.eval(`gameData.season = '${s}'`);
            window.applyFarmEnvironment(true);
            const w = window.document.querySelector('#worldMount .farm-world');
            if (!w.classList.contains('season-' + s)) throw new Error('sin clase de estación ' + s);
        });
    });

    check('momentos del día', () => {
        for (let i = 0; i < 4; i++) window.cycleTimeOfDay();
        const w = window.document.querySelector('#worldMount .farm-world');
        if (!/tod-[0-3]/.test(w.className)) throw new Error('sin clase de momento del día');
    });

    check('minijuegos arrancan y terminan', () => {
        ['catch', 'pest', 'water', 'electric', 'gopher', 'sorter'].forEach((t) => {
            window.eval('gameData.energy = 200');
            window.startMinigame(t);
            window.endMinigame();
            window.closeMinigame();
        });
    });

    check('guardar y volver a cargar', () => {
        window.saveGame();
        const raw = window.localStorage.getItem('electrocultivo_save');
        if (!raw) throw new Error('no se guardó');
        const parsed = JSON.parse(raw);
        ['money', 'farms', 'inventory', 'timeOfDay', 'regionStats'].forEach((k) => {
            if (parsed[k] === undefined) throw new Error('falta ' + k + ' en el guardado');
        });
        window.loadGame();
        if (!G().farms[G().currentRegion]) throw new Error('la partida no se recuperó');
    });

    check('partida nueva (initGame)', () => {
        window.initGame();
        if (!G().farms[G().currentRegion]) throw new Error('sin granja tras reiniciar');
    });

    console.log(results.join('\n'));
    console.log('\n=== ERRORES ===');
    console.log(errors.length ? errors.join('\n') : 'ninguno');
    server.close();
    process.exit(errors.length ? 1 : 0);
})();
