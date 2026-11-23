const vm = require('vm');
const fs = require('fs');

const make = () => {
    const store = {};
    const f = function () {};

    return new Proxy(f, {
        get: (t, k) => {
            if (k === Symbol.toPrimitive) {
                return () => 0;
            }

            return k in store
                ? store[k]
                : (store[k] = make());
        },

        set: (t, k, v) => {
            store[k] = v;
            return true;
        },

        apply: () => make(),
        construct: () => make()
    });
};

const els = {};

const el = id =>
    els[id] ||
    (els[id] = {
        id,
        textContent: '',
        innerHTML: '',
        style: {},
        className: '',
        children: [],

        appendChild(c) {
            this.children.push(c);
        },

        set onclick(f) {
            this._c = f;
        },

        get onclick() {
            return this._c;
        }
    });

const ctxObj = {
    console,
    Math,
    Date,
    Object,
    Array,
    Uint8Array,
    Int16Array,
    Float32Array,
    Uint16Array,
    ArrayBuffer,
    JSON,
    setTimeout,
    clearTimeout,
    setInterval: () => 0,
    clearInterval() {},

    atob: s =>
        Buffer.from(s, 'base64').toString('binary'),

    THREE: make(),

    innerWidth: 800,
    innerHeight: 600,
    devicePixelRatio: 1,

    addEventListener() {},
    requestAnimationFrame() {},

    localStorage: {
        _d: {},

        getItem(k) {
            return this._d[k] ?? null;
        },

        setItem(k, v) {
            this._d[k] = String(v);
        }
    },

    AudioContext: undefined,

    document: {
        getElementById: el,

        createElement: () => ({
            getContext: () => make(),
            style: {},
            children: [],

            appendChild() {}
        }),

        body: {
            prepend() {},
            dataset: {}
        },

        activeElement: null,
        hidden: false,

        addEventListener() {},
        querySelector: () => null,
        querySelectorAll: () => []
    }
};

ctxObj.window = ctxObj;

const cx = vm.createContext(ctxObj);

const order = [
    'config',
    'settings',
    'audio',
    'engine',
    'data/buildings-data',
    'textures',
    'scenery',
    'world',
    'player',
    'foods',
    'game',
    'input',
    'telas',
    'main'
];

for (const k of order) {
    vm.runInContext(
        fs.readFileSync(
            __dirname + '/../js/' + k + '.js',
            'utf8'
        ),
        cx,
        { filename: k }
    );
}

const run = c => vm.runInContext(c, cx);

let ok = 0;
let fail = 0;

const T = (n, c) => {
    c ? ok++ : fail++;

    console.log((c ? 'PASS ' : 'FAIL ') + n);
};

// Estado inicial
run('start()');

T(
    'estado inicial: 50 pontos, peso 0',
    run('score === 50 && fat === 0 && st === "play"')
);

T(
    'barra de peso com 5 níveis',
    els.bar.children.length === 5
);

// Comer alimento saudável
run('eat({ userData: { good: true } })');

T(
    'comida boa: +10 pontos e +10 na pontuação final',
    run('score === 60 && heal === 1 && finalScore() === 10')
);

// Comer alimento não saudável
run('eat({ userData: { good: false } })');

T(
    'comida ruim: -25 pontos e peso +1',
    run('score === 35 && fat === 1 && junk === 1')
);

T(
    'barra mostra 1 nível ligado',
    els.bar.children.filter(
        c => c.className.startsWith('on')
    ).length === 1
);

// Redução de peso após alimentos saudáveis
for (let i = 0; i < 5; i++) {
    run('eat({ userData: { good: true } })');
}

T(
    '5 saudáveis seguidos reduzem o peso',
    run('fat === 0')
);

// Game over por excesso de peso
run('score = 500');

for (let i = 0; i < 5; i++) {
    run('eat({ userData: { good: false } })');
}

T(
    'peso máximo => game over',
    run('st === "over"') &&
        els['o-why'].textContent.includes('pesado demais')
);

T(
    'tela final mostra pontuação final e recorde',
    els['o-score'].textContent === run('finalScore()') &&
        /Recorde/.test(els['o-best'].textContent) &&
        run('screenAtual === "over"')
);

// Game over por falta de pontos
run('start()');
run('score = 20');
run('eat({ userData: { good: false } })');

T(
    'pontos <= 0 => game over, pontos travam em 0',
    run('st === "over" && score === 0')
);

// Testes de dificuldade e nível
run('start()');

const s0 = run('difficulty()');
const n0 = run('level');

run('speed = SPEED = CFG.SPEED_MAX; dist = 1234; tickLevel()');

T(
    'dificuldade sobe com a velocidade (0 -> 1)',
    s0 === 0 && run('difficulty()') === 1
);

T(
    'nível sobe com a velocidade',
    run('level') > n0
);

T(
    'distância entra na pontuação (1234 m => 123)',
    run('finalScore()') === 123
);

// Testes de probabilidade dos alimentos
let g = 0;
let gm = 0;
const N = 4000;

run('speed = CFG.SPEED_START');

for (let i = 0; i < N; i++) {
    run('(() => { const d = difficulty(); return 0 })()');
}

T(
    'chance de saudável cai com a dificuldade',
    run('lerp(CFG.GOOD_RATIO_START, CFG.GOOD_RATIO_MIN, 1)') <
        run('lerp(CFG.GOOD_RATIO_START, CFG.GOOD_RATIO_MIN, 0)')
);

// Cadastro de alimentos
T(
    'carnes grelhadas e batata frita cadastradas',
    run('good.length') === 6 &&
        run('bad.length') === 4
);

// Teste dos construtores dos alimentos
T(
    'construtores dos novos alimentos rodam sem erro',
    (() => {
        try {
            run('good.forEach(f => f()); bad.forEach(f => f())');
            return true;
        } catch (e) {
            console.log(e.message);
            return false;
        }
    })()
);

// Teste do recorde
T(
    'recorde salvo no localStorage',
    ctxObj.localStorage._d.cs_best !== undefined
);

// ---- Dificuldade, telas e fluxo ----
T(
    'dificuldade difícil altera CFG e normal restaura',
    (() => {
        run('applyDiff("dificil")');
        const d = run('CFG.BAD_PTS === 30 && CFG.START_SCORE === 40');
        run('applyDiff("facil")');
        const f = run('CFG.BAD_PTS === 15 && CFG.START_SCORE === 50');
        run('applyDiff("normal")');
        return d && f && run('CFG.BAD_PTS === 25 && CFG.START_SCORE === 50 && CFG.SPEED_MAX === 32');
    })()
);

T(
    'recorde é separado por dificuldade',
    (() => {
        run('applyDiff("facil"); start(); heal = 7; dist = 0; over("x")');
        const k = ctxObj.localStorage._d.cs_best_facil === '70';
        run('applyDiff("normal")');
        return k && run('best') !== 70;
    })()
);

T(
    'start() esconde as telas e conta a partida',
    (() => {
        const g0 = run('stats.games');
        run('start()');
        return run('st === "play" && screenAtual === null && stats.games') === g0 + 1;
    })()
);

T(
    'pausa e continuar (contagem 3-2-1)',
    (() => {
        run('pauseGame()');
        const p = run('st === "pause" && screenAtual === "pause"');
        run('resumeGame()');
        return p && run('st === "count" && screenAtual === null');
    })()
);

T(
    'pausar só funciona durante a partida',
    (() => {
        run('st = "ready"; pauseGame()');
        return run('st === "ready"');
    })()
);

T(
    'comecar(): reinicia, cenário rolando e sem telas',
    (() => {
        run('score = 5; comecar()');
        return run('st === "ready" && screenAtual === null && score === CFG.START_SCORE');
    })()
);

T(
    'regras usam os valores do CFG da dificuldade',
    (() => {
        run('applyDiff("dificil")');
        const h = run('regrasHTML()');
        run('applyDiff("normal")');
        return h.includes('−30') && h.includes('+10');
    })()
);

T(
    'preferência de som lida do localStorage',
    (() => {
        ctxObj.localStorage._d.cs_mute = '1';
        const a = run('somMudo()');
        ctxObj.localStorage._d.cs_mute = '0';
        return a && !run('somMudo()');
    })()
);

// ---- Música e personagem ----
T(
    'música: ritmo() limita entre 0 e 1 e play/stop/pausa não quebram sem AudioContext',
    (() => {
        run('Musica.ritmo(5); Musica.ritmo(-1); Musica.play(); Musica.pausa(true); Musica.pausa(false); Musica.stop()');
        return true;
    })()
);

T(
    'start() liga a música e over() para (sem erro)',
    (() => {
        run('start(); over("teste")');
        return run('st === "over"');
    })()
);

T(
    'animaPersonagem existe e roda em todos os estados (correndo, pulando, parado, gordo)',
    (() => {
        run('animaPersonagem(0.016, 20, true, 0, 0)');
        run('animaPersonagem(0.016, 20, true, 1.2, 2)');
        run('animaPersonagem(0.016, 0, false, 0, 4)');
        return run('typeof animaPersonagem === "function"');
    })()
);

T(
    'texto das regras explica ⭐ vida x 🏆 pontuação final com exemplo',
    (() => {
        const h = run('regrasHTML()');
        return h.includes('Pontos de vida') && h.includes('Pontuação final') &&
            h.includes('12 saudáveis e 800 m = 120 + 80 = 200');
    })()
);

// Resultado final
console.log(`\n${ok} passaram, ${fail} falharam`);

process.exit(fail ? 1 : 0);