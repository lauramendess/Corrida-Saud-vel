// Configurações compartilhadas entre a página do menu (index.html) e a página do jogo (jogo.html):
// dificuldade, recorde por dificuldade, estatísticas e preferência de som.
// Tudo fica no localStorage, que é como as duas páginas "conversam".

// Leitura/gravação segura (pode falhar em modo privado)
const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
};

// Dificuldades: sobrescrevem valores de CFG (config.js). "normal" = valores originais.
const BASE_CFG = Object.assign({}, CFG);

const DIFFS = {
    facil: {
        nome: 'Fácil',
        desc: 'Mais devagar e com mais comida saudável.',
        cfg: { BAD_PTS: 15, SPEED_START: 12, SPEED_MAX: 26, SPEED_ACCEL: .25, GOOD_RATIO_START: .65, GOOD_RATIO_MIN: .5, DOUBLE_START: .25, DOUBLE_MAX: .45 }
    },
    normal: {
        nome: 'Normal',
        desc: 'O ritmo equilibrado do jogo.',
        cfg: {}
    },
    dificil: {
        nome: 'Difícil',
        desc: 'Rápido, com mais junk food e menos pontos para começar.',
        cfg: { START_SCORE: 40, BAD_PTS: 30, SPEED_START: 16, SPEED_MAX: 36, SPEED_ACCEL: .5, GOOD_RATIO_START: .45, GOOD_RATIO_MIN: .3, DOUBLE_START: .45, DOUBLE_MAX: .7 }
    }
};

let diff = store.get('cs_diff', 'normal');
if (!DIFFS[diff]) diff = 'normal';

// recorde separado por dificuldade ("normal" mantém a chave antiga cs_best)
const bestKey = () => diff === 'normal' ? 'cs_best' : 'cs_best_' + diff;
let best = +store.get(bestKey(), 0) || 0;

// estatísticas gerais
let stats = { games: 0, heal: 0 };
try { Object.assign(stats, JSON.parse(store.get('cs_stats', '{}'))); } catch (e) {}

function applyDiff(d) {
    diff = d;
    Object.assign(CFG, BASE_CFG, DIFFS[d].cfg);
    store.set('cs_diff', d);
    best = +store.get(bestKey(), 0) || 0;
}
applyDiff(diff);

// som: preferência salva ('1' = mudo)
const somMudo = () => store.get('cs_mute', '0') === '1';

// Texto das regras (usado no menu), gerado a partir do CFG atual
function regrasHTML() {
    const c = CFG;

    return '<h3>🎯 Objetivo</h3>' +
        '<p>Seu personagem corre sozinho. Troque de pista e pule para pegar comida saudável e desviar da junk food.</p>' +

        '<h3>🎮 Controles</h3>' +
        '<ul>' +
        '<li>Mudar de pista: <kbd>←</kbd> <kbd>→</kbd> ou <kbd>A</kbd> <kbd>D</kbd></li>' +
        '<li>Pular: <kbd>↑</kbd>, <kbd>W</kbd> ou <kbd>Espaço</kbd></li>' +
        '<li>Pausar: <kbd>P</kbd> ou <kbd>Esc</kbd> · Som: <kbd>M</kbd></li>' +
        '<li>No celular: deslize para os lados ou para cima</li>' +
        '</ul>' +

        '<h3>📊 Dois números na tela</h3>' +
        '<ul>' +
        '<li><b>⭐ Pontos de vida</b> (barra de peso embaixo): começam em ' + c.START_SCORE + '. Se chegarem a 0, o jogo acaba.</li>' +
        '<li><b>🏆 Pontuação final</b>: é a que vale para o recorde.</li>' +
        '</ul>' +

        '<h3><span class="ok">✔ Comida saudável</span> 🍎🥕🥦🍌🍗</h3>' +
        '<ul>' +
        '<li>⭐ +' + c.GOOD_PTS + ' pontos de vida</li>' +
        '<li>🏆 +' + c.GOOD_PTS + ' na pontuação final</li>' +
        '<li>' + c.STREAK_TO_LOSE_FAT + ' seguidas fazem o personagem emagrecer 1 nível</li>' +
        '</ul>' +

        '<h3><span class="no">✘ Junk food</span> 🍔🍩🥤🍟</h3>' +
        '<ul>' +
        '<li>⭐ −' + c.BAD_PTS + ' pontos de vida</li>' +
        '<li>🏆 Não tira nada da pontuação final</li>' +
        '<li>O personagem engorda 1 nível e a sequência zera</li>' +
        '</ul>' +

        '<h3>💀 Fim de jogo</h3>' +
        '<ul>' +
        '<li>⭐ chega a 0, ou</li>' +
        '<li>o personagem engorda ' + c.MAX_FAT + ' níveis</li>' +
        '</ul>' +

        '<h3>🏆 Como a pontuação final é calculada</h3>' +
        '<ul>' +
        '<li>' + c.GOOD_PTS + ' pontos por alimento saudável pego</li>' +
        '<li>+ 1 ponto a cada 10 metros corridos</li>' +
        '<li>Ela só sobe: nunca diminui</li>' +
        '<li>Exemplo: 12 saudáveis e 800 m = ' + (12 * c.GOOD_PTS) + ' + 80 = ' + (12 * c.GOOD_PTS + 80) + '</li>' +
        '</ul>' +

        '<h3>⚡ Níveis</h3>' +
        '<ul>' +
        '<li>A cada +' + c.LEVEL_EVERY + ' m/s de velocidade você sobe de nível: o jogo acelera e vem mais junk food</li>' +
        '</ul>';
}
