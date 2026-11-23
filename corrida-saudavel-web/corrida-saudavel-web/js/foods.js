// Alimentos (modelos 3D com primitivas)

// Alimentos saudáveis
const good = [
    // Maçã
    () => {
        const g = new G();

        const a = M(
            new THREE.SphereGeometry(0.4, 14, 12),
            0xe11d48
        );

        const l = M(
            new THREE.SphereGeometry(0.12, 8, 6),
            0x22c55e
        );

        l.position.set(0.1, 0.42, 0);
        l.scale.set(1.6, 0.5, 1);

        g.add(a, l);

        return g;
    },

    // Cenoura
    () => {
        const g = new G();

        const c = M(
            new THREE.ConeGeometry(0.22, 0.9, 10),
            0xf97316
        );

        const t = M(
            new THREE.SphereGeometry(0.14, 8, 6),
            0x16a34a
        );

        c.rotation.z = Math.PI;

        t.position.y = 0.5;
        t.scale.y = 0.7;

        g.add(c, t);
        g.rotation.z = 0.5;

        return g;
    },

    // Brócolis
    () => {
        const g = new G();

        const s = M(
            new THREE.CylinderGeometry(0.1, 0.14, 0.4, 8),
            0x84cc16
        );

        const h = M(
            new THREE.SphereGeometry(0.38, 12, 10),
            0x15803d
        );

        s.position.y = -0.3;
        h.position.y = 0.1;

        g.add(s, h);

        return g;
    },

    // Banana
    () => {
        const g = new G();

        const b = M(
            new THREE.TorusGeometry(
                0.35,
                0.1,
                8,
                14,
                Math.PI
            ),
            0xfacc15
        );

        b.rotation.z = Math.PI;
        b.position.y = 0.2;

        g.add(b);

        return g;
    }
];

// Alimentos não saudáveis
const bad = [
    // Hambúrguer
    () => {
        const g = new G();

        const c = (y, h, col) => {
            const m = M(
                new THREE.CylinderGeometry(0.42, 0.42, h, 14),
                col
            );

            m.position.y = y;
            g.add(m);
        };

        c(-0.15, 0.2, 0xe0a458);
        c(0, 0.15, 0x6b3e1e);
        c(0.1, 0.06, 0x22c55e);
        c(0.25, 0.25, 0xe0a458);

        return g;
    },

    // Donut
    () => {
        const g = new G();

        const t = M(
            new THREE.TorusGeometry(0.32, 0.16, 10, 16),
            0xf472b6
        );

        g.add(t);
        g.rotation.x = 1.1;

        return g;
    },

    // Refrigerante
    () => {
        const g = new G();

        const c = M(
            new THREE.CylinderGeometry(0.22, 0.17, 0.75, 12),
            0xdc2626
        );

        const w = M(
            new THREE.CylinderGeometry(0.23, 0.23, 0.2, 12),
            0xffffff
        );

        const s = M(
            new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6),
            0x111111
        );

        w.position.y = 0;
        s.position.set(0.05, 0.5, 0);

        g.add(c, w, s);

        return g;
    }
];

// Carnes grelhadas (saudáveis) e outros alimentos
good.push(
    // Espetinho de carne grelhada
    () => {
        const g = new G();

        const o = M(
            new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8),
            0xf3e9d2
        );

        const m = M(
            new THREE.SphereGeometry(0.3, 14, 12),
            0xb5651d
        );

        const gr = M(
            new THREE.BoxGeometry(0.5, 0.03, 0.06),
            0x5a2d0c
        );

        m.scale.set(1, 1.15, 0.9);
        m.position.y = 0.18;

        o.position.y = -0.3;
        gr.position.set(0, 0.3, 0.24);

        g.add(o, m, gr);
        g.rotation.z = 0.6;

        return g;
    },

    // Carne grelhada no prato
    () => {
        const g = new G();

        const s = M(
            new THREE.CylinderGeometry(0.46, 0.46, 0.14, 18),
            0xa0522d
        );

        s.scale.z = 0.75;
        g.add(s);

        for (const x of [-0.2, 0, 0.2]) {
            const l = M(
                new THREE.BoxGeometry(0.06, 0.02, 0.62),
                0x4a2511
            );

            l.position.set(x, 0.08, 0);
            l.rotation.y = 0.7;

            g.add(l);
        }

        g.rotation.x = 0.9;

        return g;
    }
);

// Batata frita (não saudável)
bad.push(
    () => {
        const g = new G();

        const c = M(
            new THREE.BoxGeometry(0.5, 0.4, 0.3),
            0xdc2626
        );

        c.position.y = -0.15;
        g.add(c);

        for (let i = -2; i <= 2; i++) {
            const f = M(
                new THREE.BoxGeometry(0.07, 0.5, 0.07),
                0xfacc15
            );

            f.position.set(
                i * 0.1,
                0.25 + (i % 2) * 0.06,
                0
            );

            f.rotation.z = i * 0.06;

            g.add(f);
        }

        return g;
    }
);