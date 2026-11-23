// Motor: renderizador, câmera e luzes

// Seleciona elementos HTML pelo ID
const $ = id => document.getElementById(id);

// Cena
const scene = new THREE.Scene();

scene.background = new THREE.Color(0x8fd3ff);
scene.fog = new THREE.Fog(0x8fd3ff, 25, 75);

// Câmera
const cam = new THREE.PerspectiveCamera(
    60,
    1,
    0.1,
    100
);

cam.position.set(0, 4, 7);

// Renderizador
const ren = new THREE.WebGLRenderer({
    antialias: true
});

ren.setPixelRatio(Math.min(devicePixelRatio, 2));

document.body.prepend(ren.domElement);

// Luz ambiente
scene.add(
    new THREE.HemisphereLight(
        0xffffff,
        0xa8a090,
        0.95
    )
);

// Luz direcional
const dl = new THREE.DirectionalLight(
    0xffffff,
    0.6
);

dl.position.set(3, 8, 5);
scene.add(dl);

// Redimensionamento da tela
function resize() {
    ren.setSize(innerWidth, innerHeight);

    cam.aspect = innerWidth / innerHeight;
    cam.updateProjectionMatrix();
}

addEventListener("resize", resize);
resize();

// Função para criar malhas 3D
const M = (g, c) =>
    new THREE.Mesh(
        g,
        new THREE.MeshLambertMaterial({
            color: c
        })
    );

// Construtor de grupos 3D
const G = THREE.Group;

