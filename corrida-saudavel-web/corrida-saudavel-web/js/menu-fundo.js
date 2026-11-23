// Fundo 3D do menu: a mesma rua do jogo (textures.js + scenery.js + world.js), rolando devagar.
// É carregado por último e só depois que a página apareceu; se a internet (Three.js) ou algum
// arquivo falhar, o menu continua funcionando com o céu em degradê do CSS.

(function () {
    const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    const ARQUIVOS = [THREE_CDN, 'js/engine.js', 'js/textures.js', 'js/scenery.js', 'js/world.js'];

    // carrega em ordem (um de cada vez)
    function carrega(i) {
        if (i === ARQUIVOS.length) { inicia(); return; }

        const s = document.createElement('script');
        s.src = ARQUIVOS[i];
        s.onload = () => carrega(i + 1);
        s.onerror = () => console.warn('Fundo 3D indisponível (' + ARQUIVOS[i] + '); usando o céu do CSS.');
        document.body.appendChild(s);
    }

    // céu: degradê azul + nuvens macias desenhadas em canvas
    function desenhaCeu() {
        const c = document.createElement('canvas');
        c.width = 1024; c.height = 512;
        const x = c.getContext('2d');

        const g = x.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#2f8fe6'); g.addColorStop(.55, '#8ccdf7'); g.addColorStop(.8, '#d3ecfc');
        x.fillStyle = g; x.fillRect(0, 0, 1024, 512);

        const nuvem = (cx, cy, s) => {
            for (const [dx, dy, r] of [[0, 0, 46], [52, -14, 56], [108, 0, 48], [58, 12, 52], [-40, 14, 34], [150, 14, 32]]) {
                const rg = x.createRadialGradient(cx + dx * s, cy + dy * s, 0, cx + dx * s, cy + dy * s, r * s);
                rg.addColorStop(0, 'rgba(255,255,255,.95)'); rg.addColorStop(.7, 'rgba(255,255,255,.75)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
                x.fillStyle = rg; x.fillRect(cx + (dx - r) * s, cy + (dy - r) * s, r * 2 * s, r * 2 * s);
            }
        };
        nuvem(150, 120, 1.1); nuvem(640, 70, .9); nuvem(860, 170, 1.2); nuvem(380, 200, .7);

        return new THREE.CanvasTexture(c);
    }

    function inicia() {
        try {
            scene.background = desenhaCeu();
            scene.fog = new THREE.Fog(0xcfe9fc, 40, 115);

            cam.fov = 66;
            cam.far = 170;
            resize();   // do engine.js: atualiza tamanho e matriz da câmera

            const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
            let t0 = 0, alvo = 0, mx = 0;

            // leve paralaxe com o mouse
            addEventListener('pointermove', e => { alvo = (e.clientX / innerWidth - .5) * 2; });

            function frame(t) {
                requestAnimationFrame(frame);

                const dt = Math.min((t - t0) / 1000 || 0, .05);
                t0 = t;

                if (document.hidden) return;

                const v = reduz ? 0 : 9;   // velocidade em que a rua passa (m/s)

                for (const d of dashes) {
                    d.position.z += v * dt;
                    if (d.position.z > 10) d.position.z -= 120;
                }

                for (const b of blds) {
                    b.position.z += v * dt;
                    if (b.position.z > 12) b.position.z -= BLEN;
                }

                mx += (alvo - mx) * Math.min(1, dt * 3);

                cam.position.set(mx * .9, 2.4 + Math.sin(t / 900) * .04, 9);
                cam.lookAt(mx * .3, 1.5, -30);

                ren.render(scene, cam);
            }

            requestAnimationFrame(frame);
            ren.domElement.classList.add('pronto');   // aparece com fade
        } catch (e) {
            console.warn('Fundo 3D desativado:', e);
        }
    }

    // espera a página pintar antes de gerar texturas/cenário (isso leva ~1 s)
    addEventListener('load', () => setTimeout(() => carrega(0), 60));
})();
