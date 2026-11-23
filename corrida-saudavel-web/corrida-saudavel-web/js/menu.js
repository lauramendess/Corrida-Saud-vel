// Página do menu (index.html): dificuldade (setas), recorde, regras (janela), som e botão Jogar.
// As escolhas são gravadas no localStorage (settings.js) e lidas por jogo.html.
// Obs.: este arquivo NÃO usa o helper `$` do engine.js, porque o engine só é carregado
// depois (menu-fundo.js) e pode nem carregar sem internet; o menu funciona de qualquer jeito.

const q = id => document.getElementById(id);
const ORDEM = ['facil', 'normal', 'dificil'];

function atualizaMenu() {
    q('d-val').textContent = DIFFS[diff].nome;
    q('d-val').dataset.d = diff;

    q('m-diffdesc').textContent = DIFFS[diff].desc;
    q('m-stats').innerHTML =
        '<span>🏆 Recorde: ' + best + '</span>' +
        '<span>🎮 Partidas: ' + stats.games + '</span>';

    q('r-body').innerHTML = regrasHTML();   // os números das regras dependem da dificuldade
}

function atualizaSom() {
    q('m-sound').textContent = somMudo() ? '🔇' : '🔊';
    q('m-sound').setAttribute('aria-pressed', somMudo());
}

// setas: passa para a próxima/anterior e volta ao início no fim da lista
function mudaDificuldade(passo) {
    const i = (ORDEM.indexOf(diff) + passo + ORDEM.length) % ORDEM.length;
    applyDiff(ORDEM[i]);
    atualizaMenu();
}

q('d-prev').onclick = () => mudaDificuldade(-1);
q('d-next').onclick = () => mudaDificuldade(1);

q('m-sound').onclick = () => {
    store.set('cs_mute', somMudo() ? '0' : '1');
    atualizaSom();
};

// ---- janela de regras ----
const modal = q('modal');
const modalAberto = () => !modal.hidden;

function abreRegras() {
    modal.hidden = false;
    q('m-fechar').focus({ preventScroll: true });
}

function fechaRegras() {
    modal.hidden = true;
    q('m-rules').focus({ preventScroll: true });
}

q('m-rules').onclick = abreRegras;
q('m-fechar').onclick = fechaRegras;
modal.onclick = e => { if (e.target === modal) fechaRegras(); };   // clique fora fecha

// ---- jogar ----
let saindo = false;

function jogar() {
    if (saindo) return;
    saindo = true;
    document.body.classList.add('saindo');
    setTimeout(() => { location.href = 'jogo.html'; }, 220);
}

q('m-play').onclick = jogar;

addEventListener('keydown', e => {
    const k = e.key;

    if (modalAberto()) {
        if (k === 'Escape') fechaRegras();
        return;
    }

    // Enter em um botão focado já ativa o botão
    const emBotao = document.activeElement && document.activeElement.tagName === 'BUTTON';

    if (k === 'ArrowLeft' || k === 'a' || k === 'A') mudaDificuldade(-1);
    else if (k === 'ArrowRight' || k === 'd' || k === 'D') mudaDificuldade(1);
    else if (k === 'r' || k === 'R') abreRegras();
    else if (k === 'm' || k === 'M') q('m-sound').click();
    else if (k === 'Enter' && !emBotao) jogar();
});

// voltando do jogo pelo botão "voltar" do navegador, recarrega para mostrar recorde/partidas atuais
addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

atualizaMenu();
atualizaSom();
