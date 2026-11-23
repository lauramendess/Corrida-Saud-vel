// Áudio gerado com a Web Audio API (sem arquivos externos):
//  - Sfx:    efeitos sonoros (comer, pular, subir de nível, fim de jogo)
//  - Musica: música de fundo em loop (bateria, baixo, acordes e melodia), que acelera com a dificuldade
// A tecla M ou o botão 🔊 silencia os dois.

const { Sfx, Musica } = (() => {
    let ac = null;
    let muted = false;

    // Cria ou reutiliza o contexto de áudio
    const ctx = () =>
        ac ||
        (ac = new (
            window.AudioContext ||
            window.webkitAudioContext
        )());

    // Gera um tom com frequência, duração, tipo e volume configuráveis
    const tone = (
        f1,
        f2,
        dur,
        type = "sine",
        vol = 0.15,
        delay = 0
    ) => {
        if (muted) return;

        try {
            const a = ctx();
            const o = a.createOscillator();
            const g = a.createGain();
            const t = a.currentTime + delay;

            o.type = type;

            o.frequency.setValueAtTime(f1, t);
            o.frequency.exponentialRampToValueAtTime(
                f2,
                t + dur
            );

            g.gain.setValueAtTime(vol, t);
            g.gain.exponentialRampToValueAtTime(
                0.001,
                t + dur
            );

            o.connect(g);
            g.connect(a.destination);

            o.start(t);
            o.stop(t + dur);
        } catch (e) {}
    };

    // ------------------------------------------------------------------ música
    // Loop de 4 compassos (Dó – Lá menor – Fá – Sol), 16 passos por compasso.
    const VOL_MUSICA = 0.2;       // volume normal
    const VOL_PAUSA = 0.05;       // volume enquanto o jogo está pausado

    const RAIZES = [48, 45, 41, 43];                       // baixo: C3, A2, F2, G2 (notas MIDI)
    const ACORDES = [[60, 64, 67], [57, 60, 64], [60, 65, 69], [59, 62, 67]];   // C, Am, F, G
    // melodia (nota MIDI por passo; 0 = pausa)
    const MELODIA = [
        [76, 0, 79, 0, 81, 79, 76, 0, 74, 0, 76, 0, 79, 0, 0, 0],
        [81, 0, 0, 79, 76, 0, 74, 0, 76, 0, 79, 0, 76, 0, 0, 0],
        [81, 0, 84, 0, 81, 0, 79, 0, 77, 0, 79, 0, 81, 0, 0, 0],
        [79, 0, 83, 0, 79, 0, 76, 0, 74, 0, 76, 74, 72, 0, 0, 0]
    ];
    // baixo: semitons acima da raiz por passo (null = pausa)
    const BAIXO = [0, null, 0, null, 12, null, 0, null, 0, null, 0, null, 12, null, 7, null];

    const hz = m => 440 * Math.pow(2, (m - 69) / 12);

    let mg = null;            // volume geral da música
    let eco = null;           // eco da melodia
    let ruido = null;         // buffer de ruído (caixa e chimbal)
    let timer = null;
    let tocando = false;      // o jogo quer música?
    let pausado = false;
    let passo = 0;
    let proximo = 0;
    let intensidade = 0;      // 0..1, vem da dificuldade

    const bpm = () => 116 + 26 * intensidade;
    const volAlvo = () => (muted ? 0 : pausado ? VOL_PAUSA : VOL_MUSICA);

    function prepara() {
        const a = ctx();
        if (mg) return a;

        mg = a.createGain();
        mg.gain.value = 0;
        mg.connect(a.destination);

        eco = a.createDelay(1);
        eco.delayTime.value = 0.3;
        const fb = a.createGain();
        fb.gain.value = 0.3;
        const eg = a.createGain();
        eg.gain.value = 0.35;
        eco.connect(fb);
        fb.connect(eco);
        eco.connect(eg);
        eg.connect(mg);

        ruido = a.createBuffer(1, a.sampleRate, a.sampleRate);
        const d = ruido.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

        return a;
    }

    // nota com envelope curto: tipo de onda, frequência, início, duração, volume e filtro opcional
    function nota(tipo, f, t, dur, vol, dest, corte) {
        const a = ac;
        const o = a.createOscillator();
        const g = a.createGain();

        o.type = tipo;
        o.frequency.value = f;

        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        let saida = g;
        if (corte) {
            const lp = a.createBiquadFilter();
            lp.type = 'lowpass';
            lp.frequency.value = corte;
            g.connect(lp);
            saida = lp;
        }

        o.connect(g);
        saida.connect(dest);
        o.start(t);
        o.stop(t + dur + 0.05);
    }

    function bumbo(t) {
        const a = ac, o = a.createOscillator(), g = a.createGain();
        o.frequency.setValueAtTime(150, t);
        o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
        g.gain.setValueAtTime(0.9, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g);
        g.connect(mg);
        o.start(t);
        o.stop(t + 0.2);
    }

    // ruído filtrado: caixa (passa-faixa) e chimbal (passa-alta)
    function chiado(t, dur, vol, tipo, freq) {
        const a = ac, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
        s.buffer = ruido;
        f.type = tipo;
        f.frequency.value = freq;
        g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        s.connect(f);
        f.connect(g);
        g.connect(mg);
        s.start(t, Math.random() * 0.5);
        s.stop(t + dur + 0.02);
    }

    function agenda(n, t) {
        const s = n % 16, c = Math.floor(n / 16) % 4;

        // bateria
        if (s % 4 === 0) bumbo(t);
        if (s === 4 || s === 12) chiado(t, 0.14, 0.45, 'bandpass', 1800);
        if (s % 2 === 0) chiado(t, 0.04, 0.12, 'highpass', 7000);
        if (intensidade > 0.3 && s % 2 === 1) chiado(t, 0.03, 0.07, 'highpass', 8000);
        if (s === 14) chiado(t, 0.12, 0.1, 'highpass', 6000);

        // baixo
        if (BAIXO[s] !== null) nota('triangle', hz(RAIZES[c] + BAIXO[s]), t, 0.2, 0.5, mg, 900);

        // acordes em contratempo
        if (s === 0 || s === 6 || s === 10) {
            for (const m of ACORDES[c]) nota('square', hz(m), t, 0.16, 0.05, mg, 2200);
        }

        // melodia (com eco)
        const m = MELODIA[c][s];
        if (m) {
            const dur = 60 / bpm() / 4 * 1.8;
            nota('square', hz(m), t, dur, 0.08, mg, 3000);
            nota('square', hz(m), t, dur, 0.05, eco, 3000);
        }
    }

    // agendador: marca as notas um pouco à frente do relógio do áudio
    function tick() {
        const a = ac;
        if (!a || a.state !== 'running') {      // o navegador ainda não liberou o áudio
            proximo = a ? a.currentTime + 0.1 : 0;
            return;
        }

        while (proximo < a.currentTime + 0.15) {
            agenda(passo, proximo);
            proximo += 60 / bpm() / 4;
            passo++;
        }
    }

    const ajustaVolume = tau => {
        if (mg) mg.gain.setTargetAtTime(volAlvo(), ac.currentTime, tau);
    };

    const Musica = {
        // começa a música do início
        play() {
            try {
                const a = prepara();
                tocando = true;
                pausado = false;
                intensidade = 0;
                passo = 0;
                proximo = a.currentTime + 0.1;
                ajustaVolume(0.4);
                if (!timer) timer = setInterval(tick, 25);
            } catch (e) {}
        },

        // para com fade-out
        stop() {
            tocando = false;
            try {
                if (mg) mg.gain.setTargetAtTime(0, ac.currentTime, 0.25);
            } catch (e) {}

            setTimeout(() => {
                if (!tocando && timer) {
                    clearInterval(timer);
                    timer = null;
                }
            }, 1500);
        },

        // abaixa o volume na pausa e volta ao normal depois
        pausa(sim) {
            pausado = sim;
            try { ajustaVolume(0.15); } catch (e) {}
        },

        // 0..1: quanto mais difícil o jogo, mais rápida e cheia a música
        ritmo(d) {
            intensidade = d < 0 ? 0 : d > 1 ? 1 : d;
        }
    };

    const Sfx = {
        // Ativa o áudio após a interação do usuário
        unlock() {
            try {
                ctx().resume();
            } catch (e) {}
        },

        // Liga ou desliga o som (efeitos e música)
        toggle() {
            muted = !muted;
            try { ajustaVolume(0.05); } catch (e) {}
            return muted;
        },

        // Som ao coletar alimento saudável
        good() {
            tone(520, 880, 0.12, "triangle");
            tone(880, 1320, 0.14, "triangle", 0.12, 0.08);
        },

        // Som ao coletar alimento não saudável
        bad() {
            tone(180, 70, 0.28, "sawtooth", 0.16);
        },

        // Som do salto
        jump() {
            tone(300, 600, 0.12, "square", 0.05);
        },

        // Som ao avançar de nível
        level() {
            tone(660, 990, 0.1, "triangle");
            tone(990, 1320, 0.14, "triangle", 0.12, 0.1);
        },

        // Som de fim de jogo
        over() {
            tone(400, 100, 0.7, "sawtooth", 0.16);
            tone(300, 60, 0.8, "square", 0.1, 0.15);
        }
    };

    return { Sfx, Musica };
})();
