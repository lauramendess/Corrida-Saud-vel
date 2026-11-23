// Mundo: pista, calçadas, grama e todo o cenário lateral.
// O cenário é dividido em 4 "trechos" (chunks) de 40 m que rolam em direção à câmera e
// voltam para o fundo quando saem de vista (main.js move tudo que está em `blds`).
// Cada trecho é gerado por scenery.js a partir de cubos com texturas procedurais (textures.js).

const CHUNK_L = 40;                 // comprimento de um trecho (m)
const N_CHUNKS = 4;
const BLEN = CHUNK_L * N_CHUNKS;    // main.js usa BLEN para reciclar os trechos

const dashes = [];
const blds = [];

for (let i = 0; i < N_CHUNKS; i++) {
    const g = montaChunk(i);
    g.position.z = -32 - i * CHUNK_L;   // origem do trecho = ponto mais ao fundo; o conteúdo vai de z até z + 40
    scene.add(g);
    blds.push(g);
}

// Marcações da pista (tracejado entre as pistas)
for (const x of [-1.1, 1.1]) {
    for (let i = 0; i < 12; i++) {
        const d = M(new THREE.BoxGeometry(0.15, 0.02, 3), 0xffffff);
        d.position.set(x, 0.01, -i * 10);
        scene.add(d);
        dashes.push(d);
    }
}
