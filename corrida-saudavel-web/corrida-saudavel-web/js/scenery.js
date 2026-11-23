// Cenário: construtor de cubos + objetos (prédios, casas, postes, bancos, árvores...).
// Cada objeto é feito de caixas (cubos esticados) com texturas de js/textures.js.
// O Batch junta todas as caixas que usam o mesmo material em UMA malha, então o cenário
// inteiro custa poucas chamadas de desenho.
//
// Convenção dos objetos: eles são escritos para o lado DIREITO da rua (x > 0, a rua fica em x = 0
// e a calçada termina em x = 8). O lado esquerdo é o mesmo código girado 180°.

const SWK = 0.15;   // altura da calçada

class Batch {
    constructor() {
        this.buckets = new Map();
        this.base = new THREE.Matrix4();
        this.stack = [];
        this._v = new THREE.Vector3();
        this._n = new THREE.Vector3();
    }

    // empilha uma transformação (posição + giro em Y) para tudo que for desenhado em seguida
    push(x, y, z, ry) {
        this.stack.push(this.base.clone());
        this.base.multiply(new THREE.Matrix4().makeTranslation(x, y, z))
            .multiply(new THREE.Matrix4().makeRotationY(ry || 0));
    }
    pop() { this.base = this.stack.pop(); }

    bucket(mat) {
        let b = this.buckets.get(mat);
        if (!b) { b = { pos: [], nor: [], uv: [] }; this.buckets.set(mat, b); }
        return b;
    }

    // face: 4 cantos (bl, br, tr, tl) já em coordenadas locais; u e v em metros
    _face(mat, M, c, n, du, dv, ou, ov) {
        const b = this.bucket(mat), tm = mat.userData.tm;
        const U = this._fit ? 1 : du / tm[0], V = this._fit ? 1 : dv / tm[1];
        const uv = [[ou, ov], [ou + U, ov], [ou + U, ov + V], [ou, ov + V]];
        const nn = this._n.set(n[0], n[1], n[2]).transformDirection(M);
        for (const i of [0, 1, 2, 0, 2, 3]) {
            const v = this._v.set(c[i][0], c[i][1], c[i][2]).applyMatrix4(M);
            b.pos.push(v.x, v.y, v.z); b.nor.push(nn.x, nn.y, nn.z); b.uv.push(uv[i][0], uv[i][1]);
        }
    }

    // caixa de tamanho [w,h,d]; pos = [x, y(base), z(centro)]; mats = material único ou {px,nx,py,ny,pz,nz,all}
    // O lado da rua é o "nx". Faces sem material não são geradas.
    // o = { rx, ry, rz (giro em torno do centro), ou, ov (deslocamento da textura),
    //       fit (a textura cobre cada face inteira, sem repetir) }
    box(mats, [w, h, d], [x, y, z], o = {}) {
        this._fit = !!o.fit;
        const M = this.base.clone()
            .multiply(new THREE.Matrix4().makeTranslation(x, y + h / 2, z))
            .multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(o.rx || 0, o.ry || 0, o.rz || 0, 'YXZ')));
        const hw = w / 2, hh = h / 2, hd = d / 2, ou = o.ou || 0, ov = o.ov || 0;
        const get = f => mats.isMaterial ? (f === 'ny' ? null : mats) : (mats[f] || mats.all && f !== 'ny' && mats.all || null);
        let m;
        if (m = get('px')) this._face(m, M, [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd]], [1, 0, 0], d, h, ou, ov);
        if (m = get('nx')) this._face(m, M, [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd]], [-1, 0, 0], d, h, ou, ov);
        if (m = get('py')) this._face(m, M, [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd]], [0, 1, 0], w, d, ou, ov);
        if (m = get('ny')) this._face(m, M, [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd]], [0, -1, 0], w, d, ou, ov);
        if (m = get('pz')) this._face(m, M, [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd]], [0, 0, 1], w, h, ou, ov);
        if (m = get('nz')) this._face(m, M, [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd]], [0, 0, -1], w, h, ou, ov);
    }

    // empena triangular (parede do telhado de duas águas) voltada para +z (side=1) ou -z (side=-1)
    gable(mat, w, h, [x, y, z], side) {
        const M = this.base.clone(), tm = mat.userData.tm, hw = w / 2;
        const pts = side > 0 ? [[-hw, 0], [hw, 0], [0, h]] : [[hw, 0], [-hw, 0], [0, h]];
        const b = this.bucket(mat), nn = this._n.set(0, 0, side).transformDirection(M);
        for (const p of pts) {
            const v = this._v.set(x + p[0], y + p[1], z).applyMatrix4(M);
            b.pos.push(v.x, v.y, v.z); b.nor.push(nn.x, nn.y, nn.z);
            b.uv.push((p[0] + hw) / tm[0], p[1] / tm[1]);
        }
    }

    // transforma os buckets em malhas dentro do grupo
    finish(group) {
        for (const [mat, b] of this.buckets) {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
            g.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
            g.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
            const mesh = new THREE.Mesh(g, mat);
            if (mat.transparent) mesh.renderOrder = 1;      // sombras translúcidas depois do resto
            group.add(mesh);
        }
        this.buckets.clear();
    }
}

// ---------------------------------------------------------------- mobiliário urbano

function poste(b, x, z) {
    const m = TX.mat('metal:#33403b'), c = TX.mat('concrete:#b9b6ae'), g = TX.glow('#fff4c2');
    b.box(c, [.5, .3, .5], [x, SWK, z]);
    b.box(m, [.26, .6, .26], [x, SWK + .3, z]);
    b.box(m, [.14, 6.0, .14], [x, SWK + .9, z]);
    b.box(m, [1.9, .1, .1], [x - .85, 6.95, z]);                 // braço em direção à rua
    b.box(m, [.8, .14, .34], [x - 1.7, 6.82, z]);                 // luminária
    b.box({ ny: g }, [.66, .02, .26], [x - 1.7, 6.81, z]);
    b.box(m, [.34, .22, .34], [x, 1.5, z]);                       // caixa de fiação
}

function banco(b, x, z) {
    const wd = TX.mat('wood:#9a6b3f'), mt = TX.mat('metal:#2b2f2d');
    b.push(x, SWK, z, -Math.PI / 2);                              // encosto do lado dos prédios, assento para a rua
    for (const s of [-.8, .8]) {
        b.box(mt, [.08, .45, .5], [s, 0, 0]);                     // laterais de ferro
        b.box(mt, [.08, .12, .56], [s, .5, 0]);                   // braço
        b.box(mt, [.06, .6, .05], [s, .45, -.24]);
    }
    for (let i = 0; i < 4; i++) b.box({ all: wd }, [1.8, .05, .1], [0, .45, -.18 + i * .12]);
    for (let i = 0; i < 3; i++) b.box({ all: wd }, [1.8, .1, .04], [0, .62 + i * .14, -.26], { rx: .12 });
    b.pop();
}

function lixeira(b, x, z) {
    const m = TX.mat('metal:#3a5f4a'), d = TX.mat('metal:#22292a');
    b.box(m, [.5, .85, .5], [x, SWK, z]);
    b.box(d, [.56, .08, .56], [x, SWK + .85, z]);
    b.box({ nx: d, pz: d, nz: d }, [.05, .12, .3], [x - .26, SWK + .4, z]);
}

function hidrante(b, x, z) {
    const r = TX.col('#c72f2a'), w = TX.col('#e8e4da');
    b.box(r, [.3, .65, .3], [x, SWK, z]);
    b.box(w, [.36, .08, .36], [x, SWK + .65, z]);
    b.box(r, [.5, .12, .14], [x, SWK + .35, z]);
}

// Árvore: base alargada com raízes, tronco afilado e levemente inclinado (casca texturizada),
// galhos principais que se dividem em galhos menores, e uma copa feita de muitos cubos de
// folhagem recortada (textura com alpha) girados ao acaso, para a silhueta ficar irregular
// como a de uma copa de verdade. Espécies: 0 folhosa redonda, 1 oval/alta, 2 ipê amarelo.
// o = { y: altura do chão, sp: espécie, pit: false para não desenhar canteiro }
function arvore(b, rr, x, z, o = {}) {
    const y0 = o.y === undefined ? SWK : o.y;
    const sp = o.sp === undefined ? (rr() < .12 ? 2 : rr() < .5 ? 0 : 1) : o.sp;
    const bark = TX.mat('bark'), main = TX.mat('foliage:' + sp), dark = TX.mat('foliage:0');
    const sxz = [1, .85, 1.15][sp], sy = [1, 1.25, .85][sp];

    // canteiro de terra com borda de concreto (só nas calçadas)
    if (o.pit !== false) {
        const cc = TX.mat('concrete:#b4b1a8');
        b.box(TX.col('#3f3226'), [1.2, .05, 1.2], [x, SWK, z]);
        for (const [dx, dz, w, d] of [[-.6, 0, .08, 1.28], [.6, 0, .08, 1.28], [0, -.6, 1.28, .08], [0, .6, 1.28, .08]])
            b.box(cc, [w, .1, d], [x + dx, SWK, z + dz]);
    }
    // sombra suave projetada no chão (a luz vem de +x/+z, então a sombra cai um pouco para -x/-z)
    b.box({ py: TX.mat('sombra') }, [4.2 * sxz, 0, 4.2 * sxz], [x - .5, y0 + .015 + (o.pit === false ? 0 : 0), z - .5]);

    // raízes aparentes e base alargada
    for (let i = 0; i < 5; i++) {
        const a = i * 1.26 + rr() * .5;
        b.box(bark, [.55, .13, .15], [x + Math.cos(a) * .3, y0 - .02, z - Math.sin(a) * .3], { ry: a, rz: (rr() - .5) * .25 });
    }
    b.box(bark, [.6, .4, .6], [x, y0 - .02, z], { ry: rr() * 3 });

    // tronco: 4 segmentos que afinam e se desviam um pouco
    const H = (2.4 + rr() * .6) * sy, nseg = 4, lean = rr() * 6.3;
    let tx = x, tz = z, ty = y0 + .25;
    for (let i = 0; i < nseg; i++) {
        const w = .4 - i * .045, h = H / nseg;
        b.box(bark, [w, h + .08, w], [tx, ty, tz], { ry: rr() * .5 });
        ty += h; tx += Math.cos(lean) * .04; tz -= Math.sin(lean) * .04;
    }

    // galho: caixa comprida entre dois pontos; devolve a ponta
    const galho = (px, py, pz, phi, el, L, th) => {
        const dx = Math.cos(phi) * Math.cos(el), dy = Math.sin(el), dz = -Math.sin(phi) * Math.cos(el);
        b.box(bark, [L, th, th], [px + dx * L / 2, py + dy * L / 2 - th / 2, pz + dz * L / 2], { ry: phi, rz: el });
        return [px + dx * L, py + dy * L, pz + dz * L];
    };

    const tips = [], nb = 3 + (rr() * 2 | 0);
    for (let i = 0; i < nb; i++) {
        const phi = i * (6.283 / nb) + rr() * .7;
        const el = Math.min(1.25, (.75 + rr() * .4) * (sp === 1 ? 1.2 : sp === 2 ? .85 : 1));
        const E = galho(tx, ty - .1, tz, phi, el, (1.1 + rr() * .5) * sxz, .17);
        tips.push(E);
        for (let k = 0; k < 2; k++) {                                   // ramificação
            const p2 = phi + (k ? 1 : -1) * (.5 + rr() * .6), e2 = Math.min(1.3, el - .1 + rr() * .3);
            tips.push(galho(E[0], E[1], E[2], p2, e2, (.7 + rr() * .4) * sxz, .09));
        }
    }
    tips.push([tx, ty + 1.1 * sy, tz]);                                 // topo da copa

    // copa: aglomerados de cubos de folhagem recortada
    for (const t of tips) {
        const n = 4 + (rr() * 2 | 0);
        for (let k = 0; k < n; k++) {
            const s = 1.1 + rr() * .8;      // cada cubo é uma "moita" arredondada (a textura esmaece nas bordas)
            b.box({ all: rr() < .28 ? dark : main }, [s, s * .85, s],
                [t[0] + (rr() - .5) * 1.3 * sxz, t[1] + (rr() - .25) * 1.0 - s * .42, t[2] + (rr() - .5) * 1.3 * sxz],
                { rx: (rr() - .5) * 2.4, ry: rr() * 3.1, rz: (rr() - .5) * 2.4, fit: true });
        }
    }
}

function cerca(b, rr, x, z0, len, gz, wallMat) {
    const cap = TX.mat('concrete:#cfcbc2'), mt = TX.mat('metal:#262a2a'), gate = 1.4;
    const seg = (a, e) => {
        if (e - a < .15) return;
        const mid = (a + e) / 2;
        b.box(wallMat, [.22, .7, e - a], [x, -.05, mid]);
        b.box(cap, [.3, .06, e - a], [x, .65, mid]);
        b.box(mt, [.05, .05, e - a], [x, 1.35, mid]);
        for (let zz = a + .12; zz < e - .05; zz += .2) b.box(mt, [.03, .65, .03], [x, .71, zz]);
    };
    seg(z0, gz - gate / 2); seg(gz + gate / 2, z0 + len);
    const pil = z => { b.box(wallMat, [.4, 1.5, .4], [x, -.05, z]); b.box(cap, [.5, .08, .5], [x, 1.45, z]); };
    for (let z = z0 + .2; z < z0 + len; z += 2.6) if (Math.abs(z - gz) > gate / 2 + .3) pil(z);
    pil(gz - gate / 2 - .2); pil(gz + gate / 2 + .2); pil(z0 + len - .2);
    // portão
    b.box(mt, [.05, .05, gate], [x, .3, gz]); b.box(mt, [.05, .05, gate], [x, 1.2, gz]);
    for (let zz = gz - gate / 2 + .08; zz < gz + gate / 2; zz += .14) b.box(mt, [.03, 1.0, .03], [x, .25, zz]);
    // caixa de correio
    b.box(TX.col('#c9a227'), [.22, .3, .3], [x - .2, 1.0, gz + gate / 2 + .2]);
}

function arbusto(b, rr, x, z, s) {
    b.box(TX.mat('leaf:1'), [s, s * .75, s], [x, 0, z], { ry: rr() * 3 });
}

// ---------------------------------------------------------------- edificações

// prédio de apartamentos: térreo (loja/portaria/garagem) + andares + terraço
function apartamento(b, rr, x0, z0, w, floors, k, sk, depth) {
    const gh = 4, uh = floors * 3, H = gh + uh;
    const wall = rr() < .5 ? TX.mat('plaster:' + TX.pick(TX.PLASTER, rr)) : TX.mat('brick:' + TX.pick(['r', 'o', 'b'], rr));
    const conc = TX.mat('concrete:#a4a39e'), roof = TX.mat('concrete:#6d6e70');
    const cx = x0 + depth / 2, cz = z0 + w / 2;
    b.box({ nx: TX.mat('shop:' + sk), pz: wall, nz: wall }, [depth, gh, w], [cx, 0, cz]);
    b.box({ nx: TX.mat('apt:' + k), pz: wall, nz: wall, py: roof }, [depth, uh, w], [cx, gh, cz]);
    b.box(conc, [depth + .3, .22, w + .1], [cx - .15, gh - .11, cz]);          // cornija entre térreo e andares
    // platibanda
    b.box(conc, [.3, .9, w], [x0 + .15, H, cz]);
    b.box(conc, [.3, .9, w], [x0 + depth - .15, H, cz]);
    b.box(conc, [depth, .9, .3], [cx, H, z0 + .15]);
    b.box(conc, [depth, .9, .3], [cx, H, z0 + w - .15]);
    b.box(conc, [depth + .1, .08, w + .1], [cx, H + .9, cz]);                  // pingadeira
    // caixa d'água sobre pernas
    const tx = x0 + depth * .6, tz = z0 + w * .3, mt = TX.mat('metal:#33403b');
    for (const [dx, dz] of [[-.8, -.8], [.8, -.8], [-.8, .8], [.8, .8]]) b.box(mt, [.15, .9, .15], [tx + dx, H, tz + dz]);
    b.box(TX.mat('metal:#8099b0'), [2.2, 1.7, 2.2], [tx, H + .9, tz]);
    b.box(TX.mat('metal:#5f7488'), [2.3, .1, 2.3], [tx, H + 2.6, tz]);
    // casa de máquinas, ar-condicionado e antena
    b.box({ nx: wall, pz: wall, nz: wall, px: wall, py: conc }, [3, 2.6, 3], [x0 + depth * .3, H, z0 + w * .72]);
    b.box(TX.mat('metal:#d9dcdc'), [.9, .7, .7], [x0 + depth * .75, H, z0 + w * .78]);
    b.box(TX.mat('metal:#d9dcdc'), [.9, .7, .7], [x0 + depth * .75, H, z0 + w * .55]);
    b.box(mt, [.06, 3.2, .06], [x0 + depth * .5, H, z0 + w * .5]);
    b.box(mt, [.06, .06, 1.2], [x0 + depth * .5, H + 2.7, z0 + w * .5]);
    return H;
}

// casa térrea com telhado de duas águas, cerca, portão, jardim
function casa(b, rr, z0) {
    const k = rr() * TX.N_CASA | 0, front = TX.mat('casa:' + k), plain = TX.mat('plaster:' + TX.casaWall(k));
    const xf = 11.7, D = 7, zc = z0 + 5, cx = xf + D / 2, doorZ = z0 + 7;
    const conc = TX.mat('concrete:#b4b1a8'), roof = TX.mat('roof:' + TX.pick(['t', 't', 'g', 'b'], rr));
    b.box({ nx: front, px: plain, pz: plain, nz: plain }, [D, 3.2, 8], [cx, 0, zc]);
    // telhado: duas lajes inclinadas, cumeeira e empenas
    const th = .454, H = 3.2 + D / 2 * th, ov = .45, run = D / 2 + ov, len = run / Math.cos(Math.atan(th));
    const ang = Math.atan(th), yc = (H + (H - run * th)) / 2;
    b.box(roof, [len, .14, 8.8], [cx - run / 2, yc - .07, zc], { rz: ang });
    b.box(roof, [len, .14, 8.8], [cx + run / 2, yc - .07, zc], { rz: -ang });
    b.box(TX.mat('roof:g'), [.34, .16, 8.9], [cx, H - .06, zc]);
    b.gable(plain, D, H - 3.2, [cx, 3.2, zc + 4], 1);
    b.gable(plain, D, H - 3.2, [cx, 3.2, zc - 4], -1);
    b.box(TX.mat('brick:r'), [.6, 1.7, .6], [cx + 1.5, 3.8, zc + 1.6]);          // chaminé
    b.box(conc, [.8, .08, .8], [cx + 1.5, 5.5, zc + 1.6]);
    // varanda sobre a porta + degrau + calçadinha
    b.box(conc, [1.6, .1, 1.9], [xf - .8, 2.75, doorZ]);
    for (const dz of [-.8, .8]) b.box(TX.mat('metal:#f1efe8'), [.08, 2.75, .08], [xf - 1.5, 0, doorZ + dz]);
    b.box(conc, [.5, .12, 1.6], [xf - .25, 0, doorZ]);
    b.box(TX.mat('sidewalk'), [xf - 8.3, .04, 1.2], [(xf + 8.2) / 2 - .25, 0, doorZ]);
    // jardim
    arbusto(b, rr, xf - .5, z0 + 2.2, .9); arbusto(b, rr, xf - .5, z0 + 4.2, .8); arbusto(b, rr, xf - .5, z0 + 8.6, .9);
    if (rr() < .6) arvore(b, rr, 9.8, z0 + 2.2 + rr() * 1.5, { y: -.05, pit: false });
    // cerca da frente e muro lateral
    cerca(b, rr, 8.3, z0, 10, doorZ, TX.mat('plaster:' + TX.casaWall(k)));
    b.box({ pz: plain, nz: plain, py: conc }, [10.5, 2.0, .2], [13.5, 0, z0]);
}

// sobrado geminado de 2 andares com sacada e garagem
function sobrado(b, rr, z0) {
    const k = rr() * 2 | 0, front = TX.mat('sobrado:' + k);
    const side = k ? TX.mat('brick:o') : TX.mat('plaster:#e3d4bc'), conc = TX.mat('concrete:#a4a39e'), roof = TX.mat('concrete:#6d6e70');
    const xf = 8.6, D = 10, cx = xf + D / 2, cz = z0 + 4;
    b.box({ nx: front, pz: side, nz: side, py: roof }, [D, 7, 8], [cx, 0, cz]);
    b.box(conc, [.3, .5, 8], [xf + .15, 7, cz]);
    b.box(conc, [.3, .5, 8], [xf + D - .15, 7, cz]);
    b.box(conc, [D, .5, .3], [cx, 7, z0 + .15]);
    b.box(conc, [D, .5, .3], [cx, 7, z0 + 7.85]);
    b.box(conc, [.8, .1, 3.9], [xf - .4, 3.45, z0 + 2.4]);                       // laje da sacada
    b.box(conc, [.6, .12, 1.5], [xf - .3, 0, z0 + 5.65]);                        // degrau da porta
    b.box(TX.mat('metal:#8099b0'), [1.8, 1.4, 1.8], [xf + 6, 7, z0 + 5.5]);       // caixa d'água
}

// ---------------------------------------------------------------- composição

function sorteiaLotes(rr) {
    for (let t = 0; t < 400; t++) {
        const a = []; let s = 0;
        while (s < CHUNK_L) { const c = [12, 10, 8][rr() * 3 | 0]; a.push(c); s += c; }
        if (s === CHUNK_L) return a;
    }
    return [10, 10, 10, 10];
}

// Um lado da rua (local, lado direito). off desloca o mobiliário para os dois lados não ficarem espelhados.
function ladoDaRua(b, rr, off) {
    const z = v => (v + off) % CHUNK_L;
    // calçada, meio-fio e grama
    b.box({ nx: TX.mat('concrete:#c9c6bd'), py: TX.mat('concrete:#c9c6bd') }, [.25, SWK, CHUNK_L], [4.125, 0, CHUNK_L / 2]);
    b.box({ py: TX.mat('sidewalk') }, [3.75, SWK, CHUNK_L], [6.125, 0, CHUNK_L / 2]);
    b.box({ py: TX.mat('grass') }, [70, 0, CHUNK_L], [43, -.05, CHUNK_L / 2]);
    // lotes
    let zl = 0;
    for (const w of sorteiaLotes(rr)) {
        if (w === 12) apartamento(b, rr, 8, zl, 12, 2 * (1 + (rr() * 3 | 0)), rr() * TX.N_APT | 0, rr() * TX.N_SHOP | 0, 12);
        else if (w === 10) casa(b, rr, zl);
        else sobrado(b, rr, zl);
        zl += w;
    }
    // prédios altos ao fundo (aparecem entre as casas, perdidos na neblina)
    for (const z0 of [2 + rr() * 3, 24 + rr() * 3])
        apartamento(b, rr, 24 + rr() * 6, z0, 12, 2 * (4 + (rr() * 4 | 0)), rr() * TX.N_APT | 0, rr() * 2 + 6 | 0, 14);
    // mobiliário urbano
    for (const v of [6, 26]) poste(b, 4.75, z(v));
    for (const v of [16, 36]) arvore(b, rr, 5.9, z(v));
    banco(b, 7.0, z(11));
    lixeira(b, 7.3, z(14));
    hidrante(b, 7.4, z(2.5));
}

function montaChunk(ci) {
    const b = new Batch(), g = new THREE.Group();
    // pista (comum aos dois lados)
    b.box({ py: TX.mat('asphalt') }, [8, 0, CHUNK_L], [0, 0, CHUNK_L / 2]);
    // faixa de pedestres
    const fx = TX.col('#e9e9e1');
    for (let i = 0; i < 8; i++) b.box(fx, [.5, .012, 3.2], [-3.5 + i + .25, .004, 31]);
    for (let s = 0; s < 2; s++) {
        b.push(0, 0, s ? CHUNK_L : 0, s ? Math.PI : 0);
        ladoDaRua(b, TX.rng(7000 + ci * 17 + s * 101), s ? 10 : 0);
        b.pop();
    }
    b.finish(g);
    return g;
}
