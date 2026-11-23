// Texturas procedurais: tudo desenhado em <canvas>, sem nenhuma imagem externa.
// TX.mat('nome:variante') devolve um material (com cache). A "escala" da textura em metros
// fica em material.userData.tm = [largura_m, altura_m]; o Batch (scenery.js) usa isso para
// manter a mesma densidade de pixels em qualquer cubo, sem esticar a imagem.

const TX = (() => {
    const cache = {};

    // ---------- utilidades ----------
    const rng = s => () => {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
    const P = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
    const css = (c, k = 1, a = 1) => {
        if (typeof c === 'string') c = P(c);
        return `rgba(${Math.min(255, c[0] * k) | 0},${Math.min(255, c[1] * k) | 0},${Math.min(255, c[2] * k) | 0},${a})`;
    };
    const pick = (a, r) => a[r() * a.length | 0];

    // canvas com transformação em metros: o.m(c => ...) desenha em unidades de 1 m
    function mk(w, h, mw, mh) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const x = c.getContext('2d', { willReadFrequently: true });   // lê pixels (granulação): canvas em CPU é bem mais rápido
        const o = { c, x, w, h, mw, mh, sx: w / mw, sy: h / mh };
        o.m = fn => { x.save(); x.scale(o.sx, o.sy); fn(x); x.restore(); };
        o.text = (s, mx, my, S, col) => {
            x.save(); x.scale(o.sx, o.sy); x.translate(mx, my); x.scale(S / 100, S / 100);
            x.font = 'bold 100px Arial, Helvetica, sans-serif';
            x.fillStyle = col; x.textAlign = 'center'; x.textBaseline = 'middle';
            x.fillText(s, 0, 0); x.restore();
        };
        return o;
    }

    // ruído por pixel (granulação)
    function grain(o, amt, r) {
        const id = o.x.getImageData(0, 0, o.w, o.h), d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            const n = (r() - .5) * amt;
            d[i] += n; d[i + 1] += n; d[i + 2] += n;
        }
        o.x.putImageData(id, 0, 0);
    }

    // manchas suaves (sujeira, desbotamento), repetidas nas bordas para a textura emendar
    function blotches(o, n, r0, r1, amax, col, r) {
        const x = o.x;
        for (let i = 0; i < n; i++) {
            const bx = r() * o.w, by = r() * o.h, rad = r0 + r() * (r1 - r0), a = amax * (.4 + r() * .6);
            for (const ox of [-o.w, 0, o.w]) for (const oy of [-o.h, 0, o.h]) {
                const X = bx + ox, Y = by + oy;
                if (X + rad < 0 || X - rad > o.w || Y + rad < 0 || Y - rad > o.h) continue;
                const g = x.createRadialGradient(X, Y, 0, X, Y, rad);
                g.addColorStop(0, css(col, 1, a)); g.addColorStop(1, css(col, 1, 0));
                x.fillStyle = g; x.fillRect(X - rad, Y - rad, rad * 2, rad * 2);
            }
        }
    }

    // escorridos de chuva / sujeira vertical
    function streaks(o, n, r, col, a, len) {
        const x = o.x;
        for (let i = 0; i < n; i++) {
            const px = r() * o.w, py = r() * o.h, w = 1 + r() * 3, l = len * (.4 + r() * .6);
            const g = x.createLinearGradient(0, py, 0, py + l);
            g.addColorStop(0, css(col, 1, a * (.4 + r() * .6))); g.addColorStop(1, css(col, 1, 0));
            x.fillStyle = g; x.fillRect(px, py, w, l);
        }
    }

    // ---------- janelas (usadas em prédios e casas) ----------
    function glass(o, x, y, w, h, st, r) {
        o.m(c => {
            const g = c.createLinearGradient(0, y, 0, y + h);
            if (st === 'lit') { g.addColorStop(0, '#ffe6a0'); g.addColorStop(1, '#e9b95c'); }
            else if (st === 'dark') { g.addColorStop(0, '#3b4d60'); g.addColorStop(1, '#1e2935'); }
            else { g.addColorStop(0, '#b5d6ec'); g.addColorStop(.55, '#7da6c4'); g.addColorStop(1, '#46667f'); }
            c.fillStyle = g; c.fillRect(x, y, w, h);
            if (st === 'curtain') {
                c.fillStyle = css(pick(['#e8dcc0', '#d9a8a8', '#a8c8a8', '#c8b8d8'], r), 1, .93);
                c.fillRect(x, y, w * .45, h * .85); c.fillRect(x + w * .55, y, w * .45, h * .85);
                c.fillStyle = 'rgba(0,0,0,.08)';
                for (let k = 0; k < 6; k++) c.fillRect(x + k * w * .09, y, w * .02, h * .85);
            }
            if (st === 'blind') {
                c.fillStyle = 'rgba(235,230,215,.92)';
                const bh = h * (.35 + r() * .5);
                for (let yy = y; yy < y + bh; yy += .09) c.fillRect(x, yy, w, .06);
            }
            if (st === 'lit') { c.fillStyle = 'rgba(90,60,30,.35)'; c.fillRect(x + w * .1, y + h * .65, w * .35, h * .35); }
            if (st === 'reflect' || st === 'blind') {
                c.fillStyle = 'rgba(255,255,255,.18)';
                c.beginPath(); c.moveTo(x, y + h * .6); c.lineTo(x + w * .55, y); c.lineTo(x + w * .8, y); c.lineTo(x, y + h * .95); c.fill();
            }
            c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(x, y, w, .07); c.fillRect(x, y, .05, h);
        });
    }

    function win(o, x, y, w, h, st, r, fc, sill = true) {
        o.m(c => { c.fillStyle = fc; c.fillRect(x - .07, y - .07, w + .14, h + .14); });
        glass(o, x, y, w, h, st, r);
        o.m(c => {
            c.fillStyle = fc;
            c.fillRect(x + w / 2 - .03, y, .06, h);
            c.fillRect(x, y + h * .3 - .025, w, .05);
            if (!sill) return;
            c.fillStyle = '#dcd8cf'; c.fillRect(x - .14, y + h + .07, w + .28, .08);
            const g = c.createLinearGradient(0, y + h + .15, 0, y + h + .5);
            g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = g; c.fillRect(x - .14, y + h + .15, w + .28, .35);
        });
    }

    const STATES = ['reflect', 'reflect', 'reflect', 'lit', 'curtain', 'curtain', 'blind', 'dark'];

    // ---------- geradores ----------
    const APT = [
        { wall: '#d8c8a6', frame: '#f1efe8' }, { wall: '#b9bdc1', frame: '#2e3338' },
        { wall: '#e5c8b8', frame: '#f6f3ee' }, { wall: '#aebfcb', frame: '#eef0f0' },
        { wall: '#ecebe3', frame: '#3b4046' }
    ];
    const SHOPS = [
        { n: 'HORTIFRUTI', wall: '#ece4cc', sign: '#2e8b3d', tx: '#ffffff', aw: ['#2e8b3d', '#f4f4ee'], it: 'fruit' },
        { n: 'PADARIA', wall: '#f1dcc0', sign: '#7a4322', tx: '#ffe3b0', aw: ['#d9832b', '#f6efe2'], it: 'bread' },
        { n: 'FARMÁCIA', wall: '#eef0ee', sign: '#1f9a55', tx: '#ffffff', aw: null, it: 'meds', cross: 1 },
        { n: 'MERCADO', wall: '#f2e6d2', sign: '#c42f2f', tx: '#ffffff', aw: ['#c42f2f', '#f6f0e6'], it: 'boxes' },
        { n: 'ACADEMIA', wall: '#cdd3da', sign: '#1d3763', tx: '#ffd23f', aw: null, it: 'gym' },
        { n: 'SUCOS', wall: '#fbe9cb', sign: '#f08a1c', tx: '#ffffff', aw: ['#f5c518', '#f8f4ea'], it: 'juice' },
        { lobby: 1, wall: '#e3d8c3' }, { garage: 1, wall: '#dcd5c6' }
    ];
    const CASAS = [
        { wall: '#efe2c6', trim: '#ffffff', sh: '#2f6b4f', door: '#7a4a2a', base: '#9a8f7e' },
        { wall: '#d9e3ea', trim: '#ffffff', sh: '#365f8a', door: '#2e5a86', base: '#8b9096' },
        { wall: '#f0d5bf', trim: '#fff7ee', sh: '#7a3b2a', door: '#4a3426', base: '#9d8068' },
        { wall: '#e6eed8', trim: '#ffffff', sh: '#5a6b3a', door: '#8a3a2e', base: '#8f9380' }
    ];

    function items(o, kind, x0, x1, yb, r) {
        const FR = ['#d83a2a', '#f2a31b', '#7bbf3a', '#e9d23a', '#b02a6f'];
        const BX = ['#d9442e', '#2f7fc1', '#f2b52a', '#3fa34d', '#f0f0e8'];
        o.m(c => {
            for (const sy of [yb, yb - .75]) {
                c.fillStyle = 'rgba(50,38,26,.85)'; c.fillRect(x0, sy, x1 - x0, .06);
                const step = kind === 'gym' ? .55 : .3;
                for (let x = x0 + .2; x < x1 - .2; x += step) {
                    if (kind === 'fruit') {
                        c.fillStyle = '#8a5a30'; c.fillRect(x - .16, sy - .13, .32, .13);
                        c.fillStyle = pick(FR, r); c.beginPath(); c.arc(x - .06, sy - .17, .1, 0, 7); c.arc(x + .08, sy - .16, .1, 0, 7); c.fill();
                    } else if (kind === 'bread') {
                        c.fillStyle = pick(['#c98a47', '#b8742f', '#dba868'], r); c.beginPath(); c.ellipse(x, sy - .08, .17, .08, 0, 0, 7); c.fill();
                        c.fillStyle = 'rgba(255,230,180,.45)'; c.fillRect(x - .1, sy - .13, .2, .03);
                    } else if (kind === 'meds') {
                        c.fillStyle = '#f6f6f2'; c.fillRect(x - .08, sy - .26, .16, .26);
                        c.fillStyle = pick(['#1f9a55', '#2f7fc1', '#d9442e'], r); c.fillRect(x - .08, sy - .16, .16, .05);
                    } else if (kind === 'boxes') {
                        c.fillStyle = pick(BX, r); c.fillRect(x - .11, sy - .3, .22, .3);
                        c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x - .11, sy - .2, .22, .07);
                    } else if (kind === 'gym') {
                        c.fillStyle = '#22262a'; c.fillRect(x - .22, sy - .1, .44, .035);
                        c.beginPath(); c.arc(x - .22, sy - .09, .075, 0, 7); c.arc(x + .22, sy - .09, .075, 0, 7); c.fill();
                    } else {
                        c.fillStyle = pick(['#f5a623', '#7bbf3a', '#d83a2a', '#f4e04a'], r); c.fillRect(x - .06, sy - .2, .12, .2);
                        c.fillStyle = '#fff'; c.fillRect(x - .07, sy - .22, .14, .03);
                    }
                }
            }
        });
    }

    const GEN = {
        asphalt() {
            const o = mk(512, 512, 8, 8), x = o.x, r = rng(11);
            x.fillStyle = '#474a4f'; x.fillRect(0, 0, 512, 512);
            blotches(o, 70, 30, 100, .09, [15, 15, 18], r);
            blotches(o, 50, 30, 90, .07, [140, 140, 140], r);
            // trilhas de pneu polidas no centro das pistas (-2.2, 0 e 2.2 m)
            for (const cx of [115, 256, 397]) {
                const g = x.createLinearGradient(cx - 40, 0, cx + 40, 0);
                g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, 'rgba(0,0,0,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
                x.fillStyle = g; x.fillRect(cx - 40, 0, 80, 512);
            }
            x.fillStyle = 'rgba(20,20,22,.14)'; x.fillRect(60, 300, 80, 120); x.fillRect(330, 60, 110, 70);   // remendos
            for (let i = 0; i < 7000; i++) {
                const v = 70 + r() * 100 | 0, s = 1 + r() * 1.6;
                x.fillStyle = `rgba(${v},${v},${v + 3},${.25 + r() * .5})`; x.fillRect(r() * 512, r() * 512, s, s);
            }
            x.strokeStyle = 'rgba(10,10,10,.55)'; x.lineWidth = 1.2;
            for (let i = 0; i < 7; i++) {
                let px = r() * 512, py = r() * 512;
                x.beginPath(); x.moveTo(px, py);
                for (let k = 0; k < 12; k++) { px += (r() - .5) * 26; py += r() * 22; x.lineTo(px, py); }
                x.stroke();
            }
            x.fillStyle = 'rgba(235,235,225,.88)'; x.fillRect(19, 0, 9, 512); x.fillRect(484, 0, 9, 512);   // linhas de borda
            for (let i = 0; i < 700; i++) {   // tinta desgastada
                const lx = r() < .5 ? 17 + r() * 13 : 482 + r() * 13, s = 1 + r() * 3;
                x.fillStyle = 'rgba(71,74,79,.75)'; x.fillRect(lx, r() * 512, s, s);
            }
            grain(o, 18, r); return o;
        },
        sidewalk() {
            const o = mk(512, 512, 4, 4), x = o.x, r = rng(21);
            for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
                const v = 176 + (r() - .5) * 22;
                x.fillStyle = `rgb(${v},${v - 2},${v - 8})`; x.fillRect(i * 128, j * 128, 128, 128);
            }
            blotches(o, 50, 20, 70, .08, [60, 55, 45], r);
            blotches(o, 30, 20, 60, .06, [240, 240, 230], r);
            for (let k = 0; k < 4; k++) {   // juntas de dilatação
                x.fillStyle = 'rgba(60,58,52,.85)'; x.fillRect(k * 128, 0, 3, 512); x.fillRect(0, k * 128, 512, 3);
                x.fillStyle = 'rgba(255,255,255,.18)'; x.fillRect(k * 128 + 3, 0, 1, 512); x.fillRect(0, k * 128 + 3, 512, 1);
            }
            x.strokeStyle = 'rgba(50,48,44,.5)'; x.lineWidth = 1;
            for (let i = 0; i < 6; i++) {
                let px = 8 + r() * 112 + (r() * 4 | 0) * 128, py = 8 + r() * 112 + (r() * 4 | 0) * 128;
                x.beginPath(); x.moveTo(px, py);
                for (let k = 0; k < 6; k++) { px += (r() - .5) * 18; py += (r() - .3) * 14; x.lineTo(px, py); }
                x.stroke();
            }
            for (let i = 0; i < 40; i++) { x.fillStyle = 'rgba(70,66,60,.55)'; x.beginPath(); x.arc(r() * 512, r() * 512, 1.5 + r() * 2, 0, 7); x.fill(); }
            grain(o, 16, r); return o;
        },
        concrete(h) {
            const o = mk(256, 256, 2, 2), x = o.x, r = rng(31 + h.length + P(h)[0]);
            x.fillStyle = h; x.fillRect(0, 0, 256, 256);
            blotches(o, 40, 15, 60, .10, [50, 50, 50], r);
            blotches(o, 30, 15, 60, .08, [255, 255, 255], r);
            streaks(o, 30, r, [40, 40, 40], .12, 120);
            for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(0,0,0,${.1 + r() * .2})`; x.fillRect(r() * 256, r() * 256, 1.5, 1.5); }
            grain(o, 18, r); return o;
        },
        grass() {
            const o = mk(256, 256, 3, 3), x = o.x, r = rng(5);
            x.fillStyle = '#5d9a3a'; x.fillRect(0, 0, 256, 256);
            blotches(o, 40, 20, 60, .18, [40, 90, 30], r);
            blotches(o, 30, 20, 50, .14, [130, 180, 70], r);
            const cols = ['#497f2b', '#6fb043', '#3d7324', '#85c254', '#5a9a35'];
            for (let i = 0; i < 2600; i++) {
                const px = r() * 256, py = r() * 256, a = -Math.PI / 2 + (r() - .5), l = 3 + r() * 6;
                x.strokeStyle = pick(cols, r); x.lineWidth = 1;
                for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) {
                    const X = px + ox, Y = py + oy;
                    if (X < -8 || X > 264 || Y < -8 || Y > 264) continue;
                    x.beginPath(); x.moveTo(X, Y); x.lineTo(X + Math.cos(a) * l, Y + Math.sin(a) * l); x.stroke();
                }
            }
            grain(o, 14, r); return o;
        },
        brick(k) {
            const B = { r: ['#a24a35', '#8f3f2c', '#b3583c', '#7c3526'], o: ['#c0693f', '#b45a32', '#cf7a4c', '#a84f2c'], b: ['#6e4a3c', '#5b3b30', '#7f574a', '#4c322a'] }[k];
            const o = mk(512, 512, 2, 2), x = o.x, r = rng(41 + k.charCodeAt(0));
            x.fillStyle = '#bdb7aa'; x.fillRect(0, 0, 512, 512);
            const bw = 51.2, bh = 512 / 28;
            for (let j = 0; j < 28; j++) {
                const off = (j % 2) * bw / 2;
                for (let i = -1; i < 11; i++) {
                    const bx = i * bw + off + 1, by = j * bh + 1;
                    x.fillStyle = pick(B, r); x.fillRect(bx, by, bw - 2, bh - 2);
                    x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(bx, by, bw - 2, 2);
                    x.fillStyle = 'rgba(0,0,0,.10)'; x.fillRect(bx, by + bh - 4, bw - 2, 2);
                }
            }
            blotches(o, 30, 20, 70, .10, [30, 20, 15], r);
            streaks(o, 30, r, [30, 25, 20], .14, 160);
            grain(o, 22, r); return o;
        },
        plaster(h) {
            const o = mk(256, 256, 3, 3), x = o.x, r = rng(51 + P(h)[1]);
            x.fillStyle = h; x.fillRect(0, 0, 256, 256);
            blotches(o, 35, 20, 70, .07, [80, 70, 50], r);
            blotches(o, 25, 20, 70, .07, [255, 255, 255], r);
            streaks(o, 22, r, [70, 60, 50], .10, 150);
            grain(o, 12, r); return o;
        },
        roof(k) {
            const c0 = { t: '#b8552f', g: '#585d66', b: '#6a4535' }[k];
            const o = mk(256, 256, 2, 2), x = o.x, r = rng(61 + k.charCodeAt(0));
            x.fillStyle = '#1c1512'; x.fillRect(0, 0, 256, 256);
            for (let j = 0; j < 8; j++) {
                const off = (j % 2) * 16;
                for (let i = -1; i < 9; i++) {
                    const X = i * 32 + off, Y = j * 32;
                    x.fillStyle = css(c0, 1 + (r() - .5) * .3); x.fillRect(X, Y, 31, 32);
                    const g = x.createLinearGradient(0, Y, 0, Y + 32);
                    g.addColorStop(0, 'rgba(255,255,255,.10)'); g.addColorStop(.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)');
                    x.fillStyle = g; x.fillRect(X, Y, 31, 32);
                    x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(X + 14, Y, 3, 32);
                }
            }
            blotches(o, 25, 20, 60, .12, [40, 60, 30], r);
            grain(o, 14, r); return o;
        },
        wood(h) {
            const o = mk(256, 256, 1.5, 1.5), x = o.x, r = rng(71 + P(h)[0]);
            for (let j = 0; j < 4; j++) {
                x.fillStyle = css(h, .88 + r() * .24); x.fillRect(0, j * 64, 256, 63);
                for (let k = 0; k < 45; k++) {
                    const y = j * 64 + r() * 62;
                    x.strokeStyle = `rgba(40,20,5,${.08 + r() * .12})`; x.lineWidth = .8 + r();
                    x.beginPath(); x.moveTo(0, y); x.bezierCurveTo(80, y + (r() - .5) * 5, 170, y + (r() - .5) * 5, 256, y + (r() - .5) * 3); x.stroke();
                }
                x.fillStyle = 'rgba(25,12,3,.7)'; x.fillRect(0, j * 64 + 62, 256, 2);
            }
            grain(o, 14, r); return o;
        },
        // casca de árvore: cristas verticais irregulares, fendas escuras, líquen claro e musgo
        bark() {
            const o = mk(256, 256, 1, 1), x = o.x, r = rng(81);
            x.fillStyle = '#6a5441'; x.fillRect(0, 0, 256, 256);
            // placas longitudinais de tons diferentes
            for (let i = 0; i < 26; i++) {
                const bx = i * 10 + r() * 4, w = 5 + r() * 7, sh = .75 + r() * .5;
                x.fillStyle = css('#6a5441', sh);
                for (let y = 0; y < 256; y += 22 + r() * 30) {
                    const l = 24 + r() * 50;
                    x.fillRect(bx + (r() - .5) * 2, y, w, l);
                }
            }
            // fendas escuras (sinuosas, tileáveis na vertical)
            for (let i = 0; i < 34; i++) {
                const bx = r() * 256;
                x.strokeStyle = `rgba(20,12,6,${.45 + r() * .4})`; x.lineWidth = 1 + r() * 2.2;
                x.beginPath(); x.moveTo(bx, 0);
                for (let y = 0; y <= 256; y += 16) x.lineTo(bx + Math.sin(y * .05 + i) * 3 + (r() - .5) * 2, y);
                x.stroke();
            }
            // realce de luz nas cristas
            for (let i = 0; i < 24; i++) { x.fillStyle = 'rgba(200,170,140,.10)'; x.fillRect(r() * 256, 0, 1.5, 256); }
            blotches(o, 20, 20, 50, .16, [150, 170, 120], r);    // musgo
            blotches(o, 14, 10, 30, .14, [200, 200, 185], r);    // líquen
            grain(o, 24, r); return o;
        },
        // folhagem recortada (alpha): uma "moita" arredondada de folhas pequenas que esmaece nas bordas,
        // para que cada cubo da copa não pareça um cubo. k = 0 verde, 1 verde claro, 2 ipê amarelo.
        // Usada com box(..., { fit: true }): a textura cobre a face inteira, qualquer que seja o tamanho.
        foliage(k) {
            k = +k;
            const o = mk(256, 256, 1, 1), x = o.x, r = rng(90 + k);
            const LEAF = [['#22481c', '#2c6322', '#3b7a2d', '#51983a', '#6fb349'],
            ['#33632a', '#468a35', '#5f9f40', '#80c050', '#a0d46c'],
            ['#27521f', '#386f29', '#52903a', '#6fac48', '#43702a']][k];
            const FLOW = ['#f7d21e', '#ffe14d', '#f5c518', '#ffeb7a'];
            const dens = (px, py) => { const d = Math.hypot(px - 128, py - 128) / 126; return d >= 1 ? 0 : 1 - Math.pow(d, 2.4); };
            // camadas: folhas escuras primeiro (fundo), claras por cima
            const n = k === 2 ? 900 : 2000;
            const todas = [];
            for (let i = 0; i < n; i++) {
                const px = r() * 256, py = r() * 256;
                if (r() > dens(px, py)) continue;
                todas.push([px, py, r() * 6.3, 5 + r() * 5, r()]);
            }
            todas.sort((p, q) => p[4] - q[4]);
            for (const [px, py, a, len, t] of todas) {
                x.save(); x.translate(px, py); x.rotate(a);
                x.fillStyle = LEAF[Math.min(4, (t * 5 + (128 - py) / 600) | 0)] || LEAF[4];
                x.beginPath(); x.ellipse(0, 0, len, len * .45, 0, 0, 7); x.fill();
                x.strokeStyle = 'rgba(0,0,0,.22)'; x.lineWidth = .7;
                x.beginPath(); x.moveTo(-len, 0); x.lineTo(len, 0); x.stroke();
                x.restore();
            }
            if (k === 2) {   // flores do ipê: cachos amarelos, mais densos no meio
                for (let i = 0; i < 700; i++) {
                    const px = r() * 256, py = r() * 256;
                    if (r() > dens(px, py) * .8) continue;
                    x.fillStyle = FLOW[r() * 4 | 0]; x.beginPath(); x.arc(px, py, 3 + r() * 3, 0, 7); x.fill();
                }
            }
            // sombreamento: bordas e parte de baixo mais escuras (só onde há folha)
            x.globalCompositeOperation = 'source-atop';
            const g = x.createRadialGradient(128, 110, 30, 128, 128, 130);
            g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.38)');
            x.fillStyle = g; x.fillRect(0, 0, 256, 256);
            const g2 = x.createLinearGradient(0, 0, 0, 256);
            g2.addColorStop(0, 'rgba(255,255,255,.10)'); g2.addColorStop(1, 'rgba(0,0,0,.22)');
            x.fillStyle = g2; x.fillRect(0, 0, 256, 256);
            x.globalCompositeOperation = 'source-over';
            o.opts = { alphaTest: .4, side: THREE.DoubleSide };
            return o;
        },
        // sombra suave sob a copa
        sombra() {
            const o = mk(128, 128, 1, 1), x = o.x;
            const g = x.createRadialGradient(64, 64, 4, 64, 64, 62);
            g.addColorStop(0, 'rgba(0,0,0,.38)'); g.addColorStop(.6, 'rgba(0,0,0,.2)'); g.addColorStop(1, 'rgba(0,0,0,0)');
            x.fillStyle = g; x.fillRect(0, 0, 128, 128);
            o.opts = { transparent: true, depthWrite: false };
            return o;
        },
        leaf(k) {
            const pal = [['#2f6a25', '#3f8230', '#57a03d', '#7cc255'], ['#3f7f2e', '#52994a', '#6db85a', '#98d97a']][+k];
            const o = mk(256, 256, 2, 2), x = o.x, r = rng(91 + +k);
            x.fillStyle = '#1f4a1a'; x.fillRect(0, 0, 256, 256);
            for (let i = 0; i < 3800; i++) {
                x.fillStyle = pick(pal, r);
                x.beginPath(); x.ellipse(r() * 256, r() * 256, 2 + r() * 3, 1.5 + r() * 2.5, r() * 3, 0, 7); x.fill();
            }
            grain(o, 12, r); return o;
        },
        metal(h) {
            const o = mk(128, 128, 1, 1), x = o.x, r = rng(101 + P(h)[2]);
            x.fillStyle = h; x.fillRect(0, 0, 128, 128);
            for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},.06)`; x.fillRect(r() * 128, 0, 1 + r() * 2, 128); }
            grain(o, 14, r); return o;
        },

        // ----- fachada de apartamento: módulo de 12 x 6 m (4 janelas x 2 andares) -----
        apt(k) {
            const pal = APT[+k], o = mk(1024, 512, 12, 6), r = rng(120 + +k);
            o.m(c => { c.fillStyle = pal.wall; c.fillRect(0, 0, 12, 6); });
            blotches(o, 40, 30, 120, .06, [60, 50, 40], r);
            for (let j = 0; j < 2; j++) {
                const cy = j * 3;
                o.m(c => { c.fillStyle = css(pal.wall, .88); c.fillRect(0, cy + 2.84, 12, .16); });
                for (let i = 0; i < 4; i++) {
                    const cx = i * 3, bal = r() < .38, st = pick(STATES, r);
                    const wh = bal ? 1.95 : 1.55, wy = cy + (bal ? .6 : .8);
                    win(o, cx + .75, wy, 1.5, wh, st, r, pal.frame, !bal);
                    if (bal) {
                        o.m(c => {
                            c.fillStyle = '#cfcac0'; c.fillRect(cx + .2, cy + 2.72, 2.6, .28);
                            c.fillStyle = '#2b2f34';
                            c.fillRect(cx + .25, cy + 1.85, 2.5, .05); c.fillRect(cx + .25, cy + 2.72, 2.5, .03);
                            for (let x = cx + .3; x < cx + 2.75; x += .13) c.fillRect(x, cy + 1.87, .025, .85);
                            if (r() < .5) { c.fillStyle = '#3f8a3a'; c.beginPath(); c.arc(cx + 2.4, cy + 2.62, .2, 0, 7); c.arc(cx + 2.2, cy + 2.55, .16, 0, 7); c.fill(); }
                            for (const yy of (cy + 3.0) >= 6 ? [0] : [cy + 3.0]) {
                                const g = c.createLinearGradient(0, yy, 0, yy + .4);
                                g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
                                c.fillStyle = g; c.fillRect(cx + .2, yy, 2.6, .4);
                            }
                        });
                    } else if (r() < .22) {
                        o.m(c => {
                            c.fillStyle = '#e8e8e4'; c.fillRect(cx + 2.3, cy + 1.0, .6, .42);
                            c.fillStyle = 'rgba(0,0,0,.3)'; for (let g = 0; g < 3; g++) c.fillRect(cx + 2.34, cy + 1.08 + g * .08, .52, .03);
                            c.fillStyle = 'rgba(0,0,0,.35)'; c.fillRect(cx + 2.3, cy + 1.4, .6, .03);
                        });
                    }
                }
            }
            streaks(o, 40, r, [50, 45, 40], .12, 100);
            grain(o, 10, r); return o;
        },

        // ----- térreo comercial/residencial: módulo de 12 x 4 m -----
        shop(k) {
            const S = SHOPS[+k], o = mk(1024, 512, 12, 4), r = rng(200 + +k);
            o.m(c => { c.fillStyle = S.wall; c.fillRect(0, 0, 12, 4); });
            blotches(o, 25, 30, 100, .06, [70, 60, 45], r);
            o.m(c => { c.fillStyle = '#4a4a4a'; c.fillRect(0, 3.7, 12, .3); c.fillStyle = 'rgba(255,255,255,.1)'; c.fillRect(0, 3.7, 12, .04); });
            if (S.lobby) {
                o.m(c => {
                    c.fillStyle = '#8d8579'; c.fillRect(0, 2.6, 12, 1.1);
                    for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, 2.6 + i * .18, 12, .02); }
                    c.fillStyle = '#2b3036'; c.fillRect(4.85, 1.3, 2.3, 2.4);
                });
                glass(o, 4.95, 1.4, 2.1, 2.3, 'reflect', r);
                o.m(c => {
                    c.fillStyle = '#2b3036'; c.fillRect(5.97, 1.4, .06, 2.3);
                    c.fillStyle = '#d8d8d8'; c.fillRect(5.8, 2.4, .05, .5); c.fillRect(6.15, 2.4, .05, .5);
                    c.fillStyle = '#b9b5ab'; c.fillRect(4.2, .85, 3.6, .25);
                    const g = c.createLinearGradient(0, 1.1, 0, 1.6); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
                    c.fillStyle = g; c.fillRect(4.2, 1.1, 3.6, .5);
                    c.fillStyle = '#6b4a30'; c.fillRect(3.6, 3.3, .8, .4); c.fillRect(7.6, 3.3, .8, .4);
                    c.fillStyle = '#3f8a3a'; c.beginPath(); c.arc(4, 3.15, .38, 0, 7); c.arc(8, 3.15, .38, 0, 7); c.fill();
                });
                o.text('142', 6, .5, .4, '#4a4540');
                win(o, 1.3, 1.1, 1.6, 1.4, pick(STATES, r), r, '#f1efe8');
                win(o, 9.1, 1.1, 1.6, 1.4, pick(STATES, r), r, '#f1efe8');
            } else if (S.garage) {
                o.m(c => {
                    for (const gx of [.8, 6.8]) {
                        c.fillStyle = '#34383c'; c.fillRect(gx - .1, 1.1, 4.6, 2.7);
                        c.fillStyle = '#cfd2d4'; c.fillRect(gx, 1.2, 4.4, 2.6);
                        for (let y = 1.2; y < 3.8; y += .12) { c.fillStyle = 'rgba(0,0,0,.2)'; c.fillRect(gx, y, 4.4, .03); }
                        c.fillStyle = 'rgba(255,255,255,.2)'; c.fillRect(gx + .3, 1.2, .5, 2.6);
                    }
                    c.fillStyle = '#f2c230'; c.fillRect(5.4, .4, 1.2, .5);
                });
                o.text('GARAGEM', 6, .65, .28, '#222');
            } else {
                o.m(c => {
                    c.fillStyle = css(S.wall, .88); c.fillRect(0, 0, .45, 4); c.fillRect(11.55, 0, .45, 4);
                    c.fillStyle = S.sign; c.fillRect(.6, .12, 10.8, .92);
                    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = .04; c.strokeRect(.72, .24, 10.56, .68);
                });
                o.text(S.n, 6, .62, .62, S.tx);
                if (S.cross) o.m(c => { c.fillStyle = '#fff'; for (const cx of [1.45, 10.55]) { c.fillRect(cx - .1, .3, .2, .6); c.fillRect(cx - .3, .5, .6, .2); } });
                const wx = .8, wy = 1.95, ww = 5.9, wh = 1.7;
                o.m(c => {
                    c.fillStyle = '#2a2e33'; c.fillRect(wx - .1, wy - .1, ww + .2, wh + .2);
                    const g = c.createLinearGradient(0, wy, 0, wy + wh); g.addColorStop(0, '#7d93a3'); g.addColorStop(1, '#34444f');
                    c.fillStyle = g; c.fillRect(wx, wy, ww, wh);
                });
                items(o, S.it, wx + .1, wx + ww - .1, wy + wh - .15, r);
                o.m(c => {
                    c.fillStyle = 'rgba(255,255,255,.16)';
                    c.beginPath(); c.moveTo(wx, wy + wh); c.lineTo(wx + 1.8, wy); c.lineTo(wx + 2.6, wy); c.lineTo(wx + .8, wy + wh); c.fill();
                    c.beginPath(); c.moveTo(wx + 3.2, wy + wh); c.lineTo(wx + 4.6, wy); c.lineTo(wx + 5, wy); c.lineTo(wx + 3.7, wy + wh); c.fill();
                    c.fillStyle = '#2a2e33'; c.fillRect(wx + ww / 2 - .04, wy, .08, wh);
                    // porta de vidro
                    c.fillRect(7.3, 1.7, 1.6, 2.0);
                    const g = c.createLinearGradient(0, 1.85, 0, 3.7); g.addColorStop(0, '#8fb0c6'); g.addColorStop(1, '#3d5666');
                    c.fillStyle = g; c.fillRect(7.45, 1.85, 1.3, 1.85);
                    c.fillStyle = '#d8d8d8'; c.fillRect(8.5, 2.7, .06, .5);
                    c.fillStyle = '#d9442e'; c.fillRect(7.7, 2.0, .8, .22);
                });
                o.text('ABERTO', 8.1, 2.11, .14, '#fff');
                win(o, 9.5, 2.0, 1.8, 1.6, 'reflect', r, '#2a2e33', false);
                if (S.aw) o.m(c => {
                    const n = 16, sw = 11.2 / n;
                    for (let i = 0; i < n; i++) {
                        c.fillStyle = S.aw[i % 2]; c.fillRect(.4 + i * sw, 1.05, sw, .7);
                        c.beginPath(); c.moveTo(.4 + i * sw, 1.75); c.lineTo(.4 + (i + 1) * sw, 1.75); c.lineTo(.4 + (i + .5) * sw, 1.95); c.fill();
                    }
                    let g = c.createLinearGradient(0, 1.05, 0, 1.95); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.25)');
                    c.fillStyle = g; c.fillRect(.4, 1.05, 11.2, .9);
                    g = c.createLinearGradient(0, 1.95, 0, 2.5); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
                    c.fillStyle = g; c.fillRect(.4, 1.95, 11.2, .55);
                });
            }
            o.m(c => { const g = c.createLinearGradient(0, 3.4, 0, 4); g.addColorStop(0, 'rgba(40,30,20,0)'); g.addColorStop(1, 'rgba(40,30,20,.28)'); c.fillStyle = g; c.fillRect(0, 3.4, 12, .6); });
            streaks(o, 20, r, [50, 45, 40], .10, 80);
            grain(o, 10, r); return o;
        },

        // ----- frente de casa: 8 x 3,2 m -----
        casa(k) {
            const S = CASAS[+k], o = mk(512, 256, 8, 3.2), r = rng(300 + +k);
            o.m(c => {
                c.fillStyle = S.wall; c.fillRect(0, 0, 8, 3.2);
                c.fillStyle = S.base; c.fillRect(0, 2.8, 8, .4);
                c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, 2.8, 8, .03);
            });
            blotches(o, 15, 20, 70, .06, [80, 70, 50], r);
            for (const wx of [.7, 3.0]) {
                const wy = .85, ww = 1.8, wh = 1.35;
                o.m(c => {   // venezianas
                    for (const sx of [wx - .52, wx + ww + .07]) {
                        c.fillStyle = S.sh; c.fillRect(sx, wy - .05, .45, wh + .1);
                        for (let y = wy; y < wy + wh; y += .08) { c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(sx + .04, y, .37, .025); }
                    }
                });
                win(o, wx, wy, ww, wh, pick(STATES, r), r, S.trim);
            }
            o.m(c => {   // porta
                c.fillStyle = S.trim; c.fillRect(5.3, .6, 1.4, 2.2);
                c.fillStyle = S.door; c.fillRect(5.4, .7, 1.2, 2.1);
                c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(5.5, 1.5, .4, .55); c.fillRect(6.1, 1.5, .4, .55); c.fillRect(5.5, 2.2, .4, .5); c.fillRect(6.1, 2.2, .4, .5);
                c.fillStyle = css('#a8c8dc'); c.fillRect(5.55, .8, 1.0, .55);
                c.fillStyle = '#e8c84a'; c.fillRect(6.4, 1.8, .07, .07);
                c.fillStyle = '#fff3b0'; c.fillRect(7.1, 1.1, .16, .24);     // luminária
                c.fillStyle = '#fff'; c.fillRect(7.0, 1.7, .35, .22);
            });
            o.text('87', 7.17, 1.81, .16, '#333');
            o.m(c => { const g = c.createLinearGradient(0, 0, 0, .35); g.addColorStop(0, 'rgba(0,0,0,.4)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 8, .35); });
            streaks(o, 10, r, [50, 45, 40], .12, 70);
            grain(o, 10, r); return o;
        },

        // ----- sobrado geminado: 8 x 7 m -----
        sobrado(k) {
            k = +k;
            const o = mk(512, 512, 8, 7), r = rng(400 + k), wall = k ? '#a4523b' : '#e3d4bc', trim = '#f4efe6';
            o.m(c => {
                c.fillStyle = wall; c.fillRect(0, 0, 8, 7);
                if (k) {
                    c.fillStyle = 'rgba(235,225,205,.55)';
                    for (let y = 0, j = 0; y < 7; y += .14, j++) {
                        c.fillRect(0, y, 8, .025);
                        for (let x = (j % 2) * .2; x < 8; x += .4) c.fillRect(x, y, .025, .14);
                    }
                }
                c.fillStyle = '#cfcabf'; c.fillRect(0, 3.45, 8, .2);
                c.fillStyle = '#3a3d40'; c.fillRect(.5, 4.45, 3.95, 2.55);          // garagem
                c.fillStyle = '#d4d6d6'; c.fillRect(.6, 4.55, 3.75, 2.45);
                for (let y = 4.55; y < 7; y += .12) { c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(.6, y, 3.75, .03); }
                c.fillStyle = trim; c.fillRect(5.1, 4.6, 1.4, 2.4);                  // porta
                c.fillStyle = '#5a3a24'; c.fillRect(5.2, 4.7, 1.2, 2.3);
                c.fillStyle = '#a8c8dc'; c.fillRect(5.3, 4.8, .9, .6);
                c.fillStyle = '#e8c84a'; c.fillRect(6.2, 5.9, .07, .07);
                c.fillStyle = '#2a2e33'; c.fillRect(6.85, 4.95, .85, 1.1);           // janela com grade
                c.fillStyle = '#7da6c4'; c.fillRect(6.9, 5.0, .75, 1.0);
                c.fillStyle = '#2a2e33'; for (let x = 6.95; x < 7.65; x += .14) c.fillRect(x, 5.0, .03, 1.0);
            });
            win(o, .9, 1.0, 2.6, 2.4, pick(['reflect', 'lit', 'curtain'], r), r, trim, false);
            o.m(c => {   // sacada
                c.fillStyle = '#cfcabf'; c.fillRect(.3, 3.45, 3.9, .2);
                c.fillStyle = '#2b2f34'; c.fillRect(.4, 2.55, 3.7, .05);
                for (let x = .45; x < 4.1; x += .13) c.fillRect(x, 2.6, .025, .85);
                const g = c.createLinearGradient(0, 3.65, 0, 4.1); g.addColorStop(0, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
                c.fillStyle = g; c.fillRect(.3, 3.65, 3.9, .45);
            });
            win(o, 4.9, 1.3, 2.2, 1.7, pick(STATES, r), r, trim);
            o.m(c => { const g = c.createLinearGradient(0, 0, 0, .35); g.addColorStop(0, 'rgba(0,0,0,.4)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 8, .35); });
            streaks(o, 14, r, [50, 45, 40], .12, 120);
            grain(o, 10, r); return o;
        }
    };

    // ---------- API ----------
    const tex = o => {
        const t = new THREE.CanvasTexture(o.c);
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = ren.capabilities.getMaxAnisotropy();
        return t;
    };
    function mat(name) {
        if (cache[name]) return cache[name];
        const i = name.indexOf(':'), g = i < 0 ? name : name.slice(0, i), a = i < 0 ? undefined : name.slice(i + 1);
        const o = GEN[g](a);
        const m = new THREE.MeshLambertMaterial(Object.assign({ map: tex(o) }, o.opts));   // opts: alphaTest/transparent...
        m.userData.tm = [o.mw, o.mh];
        return cache[name] = m;
    }
    function col(hex) {
        const key = 'c' + hex;
        if (cache[key]) return cache[key];
        const m = new THREE.MeshLambertMaterial({ color: hex });
        m.userData.tm = [1, 1];
        return cache[key] = m;
    }
    function glow(hex) {
        const key = 'g' + hex;
        if (cache[key]) return cache[key];
        const m = new THREE.MeshBasicMaterial({ color: hex });
        m.userData.tm = [1, 1];
        return cache[key] = m;
    }

    return {
        mat, col, glow, rng, pick,
        casaWall: k => CASAS[k].wall,
        PLASTER: ['#e8dcc4', '#f0ebe0', '#e9d8a6', '#e2b9a0', '#b8cbd6', '#c6d8b8', '#cfcfca'],
        N_APT: APT.length, N_SHOP: SHOPS.length, N_CASA: CASAS.length
    };
})();
