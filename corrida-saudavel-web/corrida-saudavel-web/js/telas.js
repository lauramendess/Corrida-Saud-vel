// Telas do jogo (pausa e fim de jogo) e fluxo de início.
// O menu principal é uma página separada (index.html); daqui só se volta para ele.
// Estados do jogo (variável `st`): 'ready' (contagem inicial, cenário rolando), 'play',
// 'pause', 'count' (contagem 3-2-1 ao continuar) e 'over'.

let screenAtual = null;   // 'pause' | 'over' | null (jogando)

// Mostra uma tela ('pause' | 'over') ou nenhuma (null)
function showScreen(nome) {
    screenAtual = nome;
    $('ov').style.display = nome ? 'flex' : 'none';

    document.querySelectorAll('.scr').forEach(e => {
        e.classList.toggle('on', e.id === 's-' + nome);
    });

    // foco no botão principal da tela (acessibilidade / teclado)
    const principal = nome && document.querySelector('#s-' + nome + ' .big');
    if (principal) principal.focus({ preventScroll: true });
}

function pauseGame() {
    if (st !== 'play') return;
    st = 'pause';
    Musica.pausa(true);
    showScreen('pause');
}

let contagemId = 0;

// Contagem 3-2-1 na tela; só segue se o estado continuar sendo `esperado`
function contagem(esperado, depois) {
    const id = ++contagemId, m = $('msg');
    let n = 3;

    clearTimeout(say.t);

    const passo = () => {
        if (id !== contagemId || st !== esperado) return;   // cancelado (pausou, reiniciou etc.)

        if (n === 0) {
            m.style.opacity = 0;
            depois();
            return;
        }

        m.textContent = n--;
        m.style.color = '#fff';
        m.style.opacity = 1;
        setTimeout(passo, 700);
    };

    passo();
}

// Continua depois da pausa (dá tempo de reposicionar os dedos)
function resumeGame() {
    if (st !== 'pause') return;

    st = 'count';
    Musica.pausa(false);
    showScreen(null);
    contagem('count', () => { st = 'play'; });
}

// Começa (ou recomeça) uma partida com contagem; o cenário já rola durante a contagem
function comecar() {
    reset();
    st = 'ready';
    showScreen(null);
    contagem('ready', start);
}

function irParaMenu() {
    contagemId++;
    location.href = 'index.html';
}

// ---- ligações dos botões ----
$('p-resume').onclick = resumeGame;
$('p-restart').onclick = comecar;
$('o-again').onclick = comecar;
$('p-menu').onclick = irParaMenu;
$('o-menu').onclick = irParaMenu;
$('pause').onclick = pauseGame;

document.querySelectorAll('.snd').forEach(b => { b.onclick = toggleMute; });

// Pausa automática ao trocar de aba ou perder o foco da janela
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseGame(); });
addEventListener('blur', pauseGame);

// O navegador só libera o áudio depois de um gesto do jogador
const liberaAudio = () => Sfx.unlock();
addEventListener('keydown', liberaAudio, { once: true });
addEventListener('pointerdown', liberaAudio, { once: true });

// Preferência de som escolhida no menu
if (somMudo()) toggleMute();

// Ao abrir a página, a partida começa sozinha (a escolha de dificuldade já foi feita no menu)
comecar();
