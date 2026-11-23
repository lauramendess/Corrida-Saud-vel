// Personagem: um corredor articulado (quadril, tronco, cabeça, braços e pernas com cotovelo e joelho).
// Tudo é feito de formas simples do Three.js (cilindros, esferas e caixas) e é animado por
// animaPersonagem(), chamada a cada quadro pelo main.js.
//
// Convenções: o personagem corre em direção a -z (a câmera o vê de costas). Em todas as
// articulações, rotation.x POSITIVO leva o membro para a FRENTE (-z); o joelho dobra para trás
// e o cotovelo dobra para a frente.

const P = new G();

// ---------- materiais ----------
const mat = (cor, extra) =>
    new THREE.MeshLambertMaterial(Object.assign({ color: cor }, extra || {}));

// tecido da camisa: trama fina desenhada em canvas
function tecido(hex) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;

    const x = c.getContext('2d');
    x.fillStyle = hex;
    x.fillRect(0, 0, 64, 64);

    for (let i = 0; i < 64; i += 2) {
        x.fillStyle = 'rgba(255,255,255,.07)';
        x.fillRect(i, 0, 1, 64);
        x.fillStyle = 'rgba(0,0,0,.08)';
        x.fillRect(0, i, 64, 1);
    }

    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);

    return t;
}

// número nas costas da camisa (fundo transparente)
function numeroCostas() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;

    const x = c.getContext('2d');
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = '#ffffff';
    x.font = 'bold 20px Arial, sans-serif';
    x.fillText('SAUDÁVEL', 64, 26);
    x.font = 'bold 84px Arial, sans-serif';
    x.fillText('10', 64, 78);

    return new THREE.CanvasTexture(c);
}

const mPele = mat(0xe3a77f);
const mCabelo = mat(0x3a2316, { side: THREE.DoubleSide });
const mCamisa = mat(0xffffff, { map: tecido('#2f7fe0') });
const mBermuda = mat(0x1d1f24);
const mBranco = mat(0xf4f4f4);
const mTenis = mat(0x2d6fd6);
const mBone = mat(0xd93636, { side: THREE.DoubleSide });
const mOlho = mat(0x15110e);
const mBoca = mat(0xa8553a);

// ---------- peças ----------
// cilindro que "pendura" do ponto de articulação (a origem fica no topo)
function membro(rTopo, rBase, alt, material, pai, y = 0) {
    const g = new THREE.CylinderGeometry(rTopo, rBase, alt, 14);
    g.translate(0, -alt / 2, 0);

    const m = new THREE.Mesh(g, material);
    m.position.y = y;
    pai.add(m);

    return m;
}

function esfera(r, material, pai, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), material);
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    pai.add(m);

    return m;
}

function caixa(w, h, d, material, pai, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z);
    pai.add(m);

    return m;
}

// ---------- esqueleto ----------
const quadril = new G();          // articulação do quadril (sobe e desce ao correr)
P.add(quadril);

// pélvis / cintura da bermuda
const pelve = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.185, 0.2, 18), mBermuda);
pelve.scale.set(1, 1, 0.72);
pelve.position.y = 0.04;
quadril.add(pelve);

// tronco
const tronco = new G();
tronco.position.y = 0.12;
quadril.add(tronco);

// o que engorda junto (tronco + barriga + número)
const troncoCorpo = new G();
tronco.add(troncoCorpo);

const camisa = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.195, 0.54, 20), mCamisa);
camisa.scale.set(1, 1, 0.62);
camisa.position.y = 0.27;
troncoCorpo.add(camisa);

const barriga = esfera(0.17, mCamisa, troncoCorpo, 0, 0.14, -0.1, 1, 0.9, 0.7);
barriga.visible = false;

const costas = new THREE.Mesh(
    new THREE.PlaneGeometry(0.23, 0.23),
    new THREE.MeshLambertMaterial({ map: numeroCostas(), transparent: true })
);
costas.position.set(0, 0.32, 0.148);
troncoCorpo.add(costas);

// pescoço
membro(0.058, 0.062, 0.12, mPele, tronco, 0.63);

// cabeça
const cab = new G();
cab.position.y = 0.76;
tronco.add(cab);

esfera(0.125, mPele, cab, 0, 0, 0, 0.92, 1.1, 1.0);                       // crânio
esfera(0.026, mPele, cab, -0.118, -0.005, 0.0, 0.7, 1.2, 1);              // orelhas
esfera(0.026, mPele, cab, 0.118, -0.005, 0.0, 0.7, 1.2, 1);
esfera(0.016, mOlho, cab, -0.045, 0.025, -0.115);                         // olhos
esfera(0.016, mOlho, cab, 0.045, 0.025, -0.115);
caixa(0.05, 0.01, 0.01, mCabelo, cab, -0.045, 0.058, -0.118);             // sobrancelhas
caixa(0.05, 0.01, 0.01, mCabelo, cab, 0.045, 0.058, -0.118);
caixa(0.02, 0.04, 0.03, mPele, cab, 0, -0.012, -0.128);                   // nariz
caixa(0.05, 0.01, 0.01, mBoca, cab, 0, -0.065, -0.112);                   // boca

// cabelo: parte de trás e laterais, saindo por baixo do boné
const cabelo = new THREE.Mesh(
    new THREE.SphereGeometry(0.133, 18, 10, Math.PI * 1.9, Math.PI * 1.2, Math.PI * 0.35, Math.PI * 0.45),
    mCabelo
);
cabelo.scale.set(0.95, 1.1, 1.03);
cab.add(cabelo);

// boné para frente (a aba aponta para -z)
const bone = new THREE.Mesh(
    new THREE.SphereGeometry(0.142, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
    mBone
);
bone.scale.set(0.95, 0.95, 1.04);
bone.position.y = 0.035;
cab.add(bone);

const aba = caixa(0.17, 0.012, 0.1, mBone, cab, 0, 0.035, -0.17);
aba.rotation.x = 0.12;

// ---------- braços ----------
function criaBraco(lado) {
    const ombro = new G();
    ombro.position.set(lado * 0.285, 0.52, 0);
    tronco.add(ombro);

    esfera(0.08, mCamisa, ombro);                                     // ombro
    membro(0.058, 0.05, 0.3, mPele, ombro);                           // braço
    membro(0.082, 0.076, 0.15, mCamisa, ombro);                       // manga curta

    const cotovelo = new G();
    cotovelo.position.y = -0.3;
    ombro.add(cotovelo);

    esfera(0.05, mPele, cotovelo);
    membro(0.047, 0.036, 0.27, mPele, cotovelo);                      // antebraço
    membro(0.05, 0.05, 0.05, mBranco, cotovelo, -0.2);                // munhequeira
    esfera(0.05, mPele, cotovelo, 0, -0.31, 0, 1, 1.2, 1);            // mão

    return { ombro, cotovelo };
}

// ---------- pernas ----------
function criaPerna(lado) {
    const quad = new G();
    quad.position.set(lado * 0.1, 0, 0);
    quadril.add(quad);

    membro(0.095, 0.07, 0.5, mPele, quad);                            // coxa
    membro(0.108, 0.098, 0.29, mBermuda, quad);                       // perna da bermuda
    caixa(0.012, 0.27, 0.06, mBranco, quad, lado * 0.103, -0.15, 0);  // listra lateral

    const joelho = new G();
    joelho.position.y = -0.5;
    quad.add(joelho);

    esfera(0.068, mPele, joelho);
    membro(0.066, 0.047, 0.46, mPele, joelho);                        // canela
    membro(0.054, 0.05, 0.14, mBranco, joelho, -0.31);                // meia

    const tornozelo = new G();
    tornozelo.position.y = -0.46;
    joelho.add(tornozelo);

    caixa(0.115, 0.085, 0.27, mTenis, tornozelo, 0, -0.03, -0.06);    // tênis
    caixa(0.122, 0.03, 0.29, mBranco, tornozelo, 0, -0.082, -0.06);   // sola
    esfera(0.058, mTenis, tornozelo, 0, -0.04, -0.2, 1, 0.8, 1);      // bico
    caixa(0.06, 0.012, 0.09, mBranco, tornozelo, 0, 0.016, -0.1);     // cadarço

    return { quad, joelho };
}

const bracoE = criaBraco(-1);
const bracoD = criaBraco(1);
const pernaE = criaPerna(-1);
const pernaD = criaPerna(1);

// sombra no chão (acompanha o personagem, mas fica no chão quando ele pula)
const sombra = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 })
);
sombra.rotation.x = -Math.PI / 2;
sombra.position.y = 0.03;
scene.add(sombra);

scene.add(P);

// ---------- animação ----------
let fase = 0;     // fase do passo (avança com a velocidade)
let mov = 0;      // 0 = parado ... 1 = correndo
let ar = 0;       // 0 = no chão ... 1 = no ar (pulo)
let resp = 0;     // fase da respiração (parado)

const mistura = (a, b, t) => a + (b - a) * t;
const limita = (v, a, b) => Math.max(a, Math.min(b, v));

// dt: tempo do quadro | v: velocidade | run: jogando? | py: altura do pulo | vf: nível de peso suavizado
function animaPersonagem(dt, v, run, py, vf) {
    mov += ((run ? 1 : 0) - mov) * Math.min(1, dt * 8);
    ar += ((py > 0.05 ? 1 : 0) - ar) * Math.min(1, dt * 14);

    fase += dt * (5 + v * 0.4) * mov;
    resp += dt * 2.2;

    const s = Math.sin(fase), c = Math.cos(fase);
    const k = 0.65 + 0.45 * limita((v - 12) / 20, 0, 1);       // passada maior com a velocidade

    // cada parâmetro = mistura(parado, correndo, pulando)
    const mix = (parado, corre, pula) => mistura(mistura(parado, corre, mov), pula, ar);

    // pernas (esquerda e direita defasadas em meio ciclo)
    const quadE = s * 0.8 * k, quadD = -quadE;
    const joeE = 0.2 + 1.05 * Math.pow(Math.max(0, Math.cos(fase + 0.4)), 1.5);
    const joeD = 0.2 + 1.05 * Math.pow(Math.max(0, Math.cos(fase + Math.PI + 0.4)), 1.5);

    pernaE.quad.rotation.x = mix(0, quadE, 0.95);
    pernaD.quad.rotation.x = mix(0, quadD, -0.25);
    pernaE.joelho.rotation.x = -mix(0.03, joeE * k, 1.25);
    pernaD.joelho.rotation.x = -mix(0.03, joeD * k, 0.95);

    // braços: balançam ao contrário das pernas; no pulo sobem
    const bE = -quadE * 1.05, bD = -quadD * 1.05;

    bracoE.ombro.rotation.x = mix(0.04, bE, 2.3);
    bracoD.ombro.rotation.x = mix(0.04, bD, 2.3);
    bracoE.cotovelo.rotation.x = mix(0.25, Math.max(0.6, 1.15 + 0.35 * bE / 0.8), 0.35);
    bracoD.cotovelo.rotation.x = mix(0.25, Math.max(0.6, 1.15 + 0.35 * bD / 0.8), 0.35);
    bracoE.ombro.rotation.z = 0.05;
    bracoD.ombro.rotation.z = -0.05;

    // tronco inclinado para a frente, com leve giro; cabeça compensa para olhar à frente
    const inclina = -mix(0.02, 0.16 + 0.06 * k, 0.1);
    const giro = mix(0, s * 0.18 * k, 0);

    tronco.rotation.x = inclina;
    tronco.rotation.y = giro;
    tronco.rotation.z = mix(0, c * 0.03, 0);
    quadril.rotation.y = -giro * 0.5;

    cab.rotation.x = -inclina * 0.8;
    cab.rotation.y = -giro * 0.7;

    // sobe e desce: mais baixo no apoio, mais alto no voo
    quadril.position.y = 1.04 + 0.045 * Math.abs(s) * mov * (1 - ar) + Math.sin(resp) * 0.004 * (1 - mov);

    // peso: tronco, barriga, braços, pernas e cabeça engordam com o nível
    troncoCorpo.scale.set(1 + vf * 0.17, 1, 1 + vf * 0.22);
    pelve.scale.set(1 + vf * 0.15, 1, 0.72 * (1 + vf * 0.2));   // cintura acompanha

    barriga.visible = vf > 0.15;
    barriga.scale.set(0.35 + vf * 0.3, (0.35 + vf * 0.3) * 0.9, 0.3 + vf * 0.22);

    for (const [b, lado] of [[bracoE, -1], [bracoD, 1]]) {
        b.ombro.position.x = lado * (0.285 + vf * 0.05);
        b.ombro.scale.set(1 + vf * 0.1, 1, 1 + vf * 0.1);
    }

    for (const [p, lado] of [[pernaE, -1], [pernaD, 1]]) {
        p.quad.position.x = lado * (0.1 + vf * 0.03);
        p.quad.scale.set(1 + vf * 0.12, 1, 1 + vf * 0.12);
    }

    cab.scale.set(1 + vf * 0.06, 1 + vf * 0.04, 1 + vf * 0.06);

    // sombra
    sombra.position.x = P.position.x;
    sombra.scale.setScalar(Math.max(0.45, 1 - py * 0.25) * (1 + vf * 0.12));
    sombra.material.opacity = 0.28 * Math.max(0.35, 1 - py * 0.3);
}
