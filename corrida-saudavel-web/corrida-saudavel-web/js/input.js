// Controles: teclado e toque

// Movimentação entre as pistas
function move(d) {
    if (st !== 'play') return;

    lane = Math.max(
        0,
        Math.min(2, lane + d)
    );
}

// Pulo do personagem
function jump() {
    if (st === 'play' && py <= 0.01) {
        vy = 9;
        Sfx.jump();
    }
}

// Controles do teclado
addEventListener('keydown', e => {
    const k = e.key;

    // Enter/Espaço em um botão focado já ativa o botão: não tratar duas vezes
    const emBotao = document.activeElement && document.activeElement.tagName === 'BUTTON';

    if (st === 'play' && (k === ' ' || k.startsWith('Arrow'))) {
        e.preventDefault();
    }

    // Pausa (Esc ou P)
    if (k === 'Escape' || k === 'p' || k === 'P') {
        if (st === 'play') pauseGame();
        else if (st === 'pause') resumeGame();
        return;
    }

    if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        move(-1);
    } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        move(1);
    } else if (
        k === 'ArrowUp' ||
        k === 'w' ||
        k === 'W' ||
        k === ' '
    ) {
        jump();
    }

    // Ativar ou desativar o som
    if (k === 'm' || k === 'M') {
        toggleMute();
    }

    // Enter: continuar (pausa) ou jogar de novo (fim de jogo)
    if (k === 'Enter' && !emBotao) {
        if (screenAtual === 'pause') resumeGame();
        else if (screenAtual === 'over') comecar();
    }
});

// Registrar a posição inicial do toque
addEventListener(
    'touchstart',
    e => {
        sx = e.touches[0].clientX;
        sy = e.touches[0].clientY;
    },
    { passive: true }
);

// Detectar gestos na tela
addEventListener(
    'touchend',
    e => {
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;

        // Deslizar para os lados muda de pista
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
            move(dx > 0 ? 1 : -1);
        }

        // Deslizar para cima faz o personagem pular
        else if (dy < -30) {
            jump();
        }
    },
    { passive: true }
);

// Ativar ou desativar o som
function toggleMute() {
    const mudo = Sfx.toggle();

    $('mute').textContent = mudo ? '🔇' : '🔊';
    store.set('cs_mute', mudo ? '1' : '0');

    // mantém os botões de som das telas em sincronia
    document.querySelectorAll('.snd').forEach(b => {
        b.textContent = mudo ? '🔇 Som: desligado' : '🔊 Som: ligado';
    });
}

// Evento de clique no botão de som
$('mute').onclick = toggleMute;
