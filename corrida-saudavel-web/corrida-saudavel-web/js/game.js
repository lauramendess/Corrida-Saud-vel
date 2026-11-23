// Regras do jogo: estado, HUD, spawn, colisão/comer e fim de jogo

// Estado do jogo
const lanes = [-2.2, 0, 2.2];

let st = 'ready';
let score, fat, vf, streak, heal, speed, lane, px, py, vy;
let items = [];
let spawnT, shake = 0, t0 = 0, sx = 0, sy = 0;

let dist = 0;
let level = 1;
let junk = 0;
let shownScore = -1;

// Barra de peso no HUD
const bar = $('bar');

for (let i = 0; i < CFG.MAX_FAT; i++) {
    bar.appendChild(document.createElement('i'));
}

// Atualização do HUD
function hud() {
    $('sc').textContent = score;
    $('hc').textContent = finalScore();
    $('lv').textContent = level;

    shownScore = finalScore();

    [...bar.children].forEach((e, i) => {
        e.className = i < fat
            ? 'on h' + Math.min(i, 3)
            : '';
    });
}

// Pontuação final:
// 10 pontos por alimento saudável + 1 ponto por 10 m percorridos
// A pontuação final nunca diminui
const finalScore = () =>
    heal * CFG.GOOD_PTS + Math.floor(dist / 10);

// Dificuldade do jogo: valor entre 0 e 1
const difficulty = () =>
    Math.min(
        1,
        (speed - CFG.SPEED_START) /
        (CFG.SPEED_MAX - CFG.SPEED_START)
    );

// Atualização do nível
function tickLevel() {
    const l = 1 + Math.floor(
        (speed - CFG.SPEED_START) / CFG.LEVEL_EVERY
    );

    if (l > level) {
        level = l;

        Sfx.level();

        say(
            'Nível ' + level + '! ⚡',
            '#fff3b0'
        );

        hud();
    } else if (finalScore() !== shownScore) {
        hud();
    }
}

// Exibição de mensagens temporárias
function say(t, c) {
    const m = $('msg');

    m.textContent = t;
    m.style.color = c;
    m.style.opacity = 1;

    clearTimeout(say.t);

    say.t = setTimeout(() => {
        m.style.opacity = 0;
    }, 700);
}

// Reinicialização do jogo
function reset() {
    items.forEach(i => scene.remove(i));
    items = [];

    score = CFG.START_SCORE;
    fat = 0;
    vf = 0;
    streak = 0;
    heal = 0;
    junk = 0;

    dist = 0;
    level = 1;

    speed = CFG.SPEED_START;
    lane = 1;

    px = 0;
    py = 0;
    vy = 0;

    spawnT = 0.5;

    hud();
}

// Início da partida
function start() {
    Sfx.unlock();

    reset();

    st = 'play';

    Musica.play();

    stats.games++;
    store.set('cs_stats', JSON.stringify(stats));

    if (document.activeElement) document.activeElement.blur();
    showScreen(null);   // telas.js
}

// Fim de jogo
function over(why) {
    st = 'over';

    Sfx.over();
    Musica.stop();

    const fs = finalScore();

    // Atualização do recorde e das estatísticas
    const isNew = fs > best;

    if (isNew) {
        best = fs;
        store.set(bestKey(), best);
    }

    stats.heal += heal;
    store.set('cs_stats', JSON.stringify(stats));

    // Tela de fim de jogo (telas.js)
    $('o-why').textContent = why;
    $('o-score').textContent = fs;
    $('o-new').style.display = isNew && fs > 0 ? 'block' : 'none';
    $('o-best').textContent = 'Recorde (' + DIFFS[diff].nome + '): ' + best;
    $('o-stats').textContent =
        'Saudáveis: ' + heal +
        ' · Junk food: ' + junk +
        ' · ' + Math.floor(dist) + ' m';

    showScreen('over');
}

// Inicialização do estado
reset();

// Geração dos alimentos
function spawn() {
    const d = difficulty();

    const n = Math.random() <
        lerp(CFG.DOUBLE_START, CFG.DOUBLE_MAX, d)
        ? 2
        : 1;

    const ls = [0, 1, 2]
        .sort(() => Math.random() - 0.5)
        .slice(0, n);

    for (const l of ls) {
        const g = Math.random() <
            lerp(
                CFG.GOOD_RATIO_START,
                CFG.GOOD_RATIO_MIN,
                d
            );

        const f = (g ? good : bad)[
            Math.floor(
                Math.random() *
                (g ? good : bad).length
            )
        ]();

        f.position.set(lanes[l], 0.8, -70);
        f.userData.good = g;

        scene.add(f);
        items.push(f);
    }
}

// Alimentação e atualização da pontuação
function eat(f) {
    if (f.userData.good) {
        // Alimento saudável
        score += CFG.GOOD_PTS;

        heal++;
        streak++;

        Sfx.good();

        say(
            '+' + CFG.GOOD_PTS + ' 🥗',
            '#b7ffcf'
        );

        // Redução do peso após uma sequência saudável
        if (
            streak >= CFG.STREAK_TO_LOSE_FAT &&
            fat > 0
        ) {
            fat--;
            streak = 0;

            say(
                'Mais leve! 💪',
                '#b7ffcf'
            );
        }
    } else {
        // Alimento não saudável
        score -= CFG.BAD_PTS;

        fat++;
        junk++;

        streak = 0;
        shake = 0.5;

        Sfx.bad();

        say(
            '-' + CFG.BAD_PTS + ' 🍔',
            '#ffb4b4'
        );
    }

    hud();

    // Verificação das condições de fim de jogo
    if (fat >= CFG.MAX_FAT) {
        over('Você ficou pesado demais para correr!');
    } else if (score <= 0) {
        score = 0;

        hud();

        over('Seus pontos acabaram!');
    }
}
