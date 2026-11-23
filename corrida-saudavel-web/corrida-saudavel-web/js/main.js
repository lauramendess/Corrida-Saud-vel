// Laço principal (update + render)
function frame(t) {
    requestAnimationFrame(frame);

    const dt = Math.min((t - t0) / 1000 || 0, 0.05);
    t0 = t;

    const run = st === 'play';
    // velocidade do cenário: jogando = velocidade do jogo; início = 8; fim = 2; pausa/contagem = parado
    const v = run
        ? speed
        : st === 'ready'
            ? 8
            : st === 'over'
                ? 2
                : 0;

    // Atualização da partida
    if (run) {
        speed = Math.min(
            CFG.SPEED_MAX,
            speed + dt * CFG.SPEED_ACCEL
        );

        dist += speed * dt;
        tickLevel();
        Musica.ritmo(difficulty());

        // Movimento entre as pistas
        px += (lanes[lane] - px) * Math.min(1, dt * 12);

        // Física do pulo
        vy -= 24 * dt;
        py = Math.max(0, py + vy * dt);

        if (py === 0 && vy < 0) {
            vy = 0;
        }

        // Geração de alimentos
        spawnT -= dt;

        if (spawnT <= 0) {
            spawn();
            spawnT = (8 + Math.random() * 6) / speed;
        }

        // Movimento e colisão dos alimentos
        for (let i = items.length - 1; i >= 0; i--) {
            const f = items[i];

            f.position.z += v * dt;
            f.rotation.y += dt * 2.5;

            // Verifica se o personagem coletou o alimento
            if (
                f.position.z > -0.7 &&
                f.position.z < 0.7 &&
                Math.abs(f.position.x - px) < 0.9 &&
                py < 0.9
            ) {
                scene.remove(f);
                items.splice(i, 1);
                eat(f);

                if (st !== 'play') {
                    break;
                }
            } else if (f.position.z > 6) {
                // Remove alimentos que passaram pelo jogador
                scene.remove(f);
                items.splice(i, 1);
            }
        }
    }

    // Movimento das marcações da pista
    for (const d of dashes) {
        d.position.z += v * dt;

        if (d.position.z > 10) {
            d.position.z -= 120;
        }
    }

    // Movimento das construções
    for (const b of blds) {
        b.position.z += v * dt;

        if (b.position.z > 12) {
            b.position.z -= BLEN;
        }
    }

    // Peso suavizado e animação do personagem (js/player.js)
    vf += (fat - vf) * Math.min(1, dt * 6);
    animaPersonagem(dt, v, run, py, vf);

    // Posição e inclinação do personagem
    P.position.set(px, py, 0);
    P.rotation.z = (px - lanes[lane]) * 0.15;

    // Animação ao perder
    if (st === 'over') {
        P.rotation.z = Math.min(
            1.4,
            P.rotation.z + dt * 3
        );
    }

    // Redução gradual do efeito de tremor
    shake = Math.max(0, shake - dt);

    // Posicionamento da câmera
    cam.position.set(
        px * 0.5 + (Math.random() - 0.5) * shake * 0.4,
        4 + py * 0.3,
        7
    );

    cam.lookAt(
        px * 0.3,
        1,
        -5
    );

    // Renderização da cena 3D
    ren.render(scene, cam);
}

requestAnimationFrame(frame);
