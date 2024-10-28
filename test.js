import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

import getStarfield from "./src/getStarfield.js";


const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 10;
camera.position.y = 10;

const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85);
composer.addPass(bloomPass);

new OrbitControls(camera, renderer.domElement);

const DISTANCE_SCALE = 1 / 1000000;
const SIZE_SCALE = 1 / 10000;


let sunSize = 1.11 * 696340 * SIZE_SCALE;

// Criar o Sol
const sunGeometry = new THREE.SphereGeometry(sunSize/100, 32, 32);
const sunTexture = new THREE.TextureLoader().load("./textures/sun_text.webp"); 
const sunMaterial = new THREE.MeshStandardMaterial({
    map: sunTexture,
    emissive: 0xffffff, // Cor da luz emitida
    emissiveIntensity: 2.5, // Intensidade da luz emitida
});
const sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);



let t = 0;
const period = 1000;

const a = 14111156 * DISTANCE_SCALE; // Semi-major axis (sma)
const e = 0.016708; // Eccentricity
const i = THREE.MathUtils.degToRad(7.155); // Inclination in radians
const omega = THREE.MathUtils.degToRad(-11.26064); // Argument of perihelion
const raan = THREE.MathUtils.degToRad(23.439281	); // RAAN (longitude do nó ascendente)


// Função para criar a geometria da elipse
function createEllipsePath(a, e, i, omega, raan) {
    const points = [];
    const segments = 100; // Número de segmentos para desenhar a elipse

    for (let t = 0; t <= segments; t++) {
        const M = (2 * Math.PI / segments) * t; // Mean anomaly para cada segmento

        // Aproximação simples da Anomalia excêntrica E
        const E = M + e * Math.sin(M);

        // Verdadeira anomalia
        const trueAnomaly = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));

        // Distância do objeto ao centro focal
        const r = a * (1 - e * Math.cos(E));

        // Coordenadas no plano orbital
        const x_orbit = r * Math.cos(trueAnomaly);
        const y_orbit = r * Math.sin(trueAnomaly);

        // Rotacionar a órbita pelos ângulos de omega, inclinação e RAAN
        const x_rot = x_orbit * (Math.cos(raan) * Math.cos(omega) - Math.sin(raan) * Math.sin(omega) * Math.cos(i)) -
            y_orbit * (Math.cos(raan) * Math.sin(omega) + Math.sin(raan) * Math.cos(omega) * Math.cos(i));

        const y_rot = x_orbit * (Math.sin(raan) * Math.cos(omega) + Math.cos(raan) * Math.sin(omega) * Math.cos(i)) -
            y_orbit * (Math.sin(raan) * Math.sin(omega) - Math.cos(raan) * Math.cos(omega) * Math.cos(i));

        const z_rot = x_orbit * Math.sin(i) * Math.sin(omega) + y_orbit * Math.sin(i) * Math.cos(omega);

        points.push(new THREE.Vector3(x_rot, y_rot, z_rot));
    }

    // Criar a geometria a partir dos pontos calculados
    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);

    return orbitGeometry;
}

// Função para calcular a posição ao longo da órbita
function calculateOrbitPosition(t) {
    const M = (2 * Math.PI * t) / period; // Anomalia média com base no tempo
    const E = M + e * Math.sin(M); // Aproximação de Kepler para E
    const trueAnomaly = 2 * Math.atan(Math.sqrt((1 + e) / (1 - e)) * Math.tan(E / 2));

    const r = a * (1 - e * Math.cos(E)); // Distância do objeto ao centro focal
    const x_orbit = r * Math.cos(trueAnomaly);
    const y_orbit = r * Math.sin(trueAnomaly);

    // Aplicar as rotações com base em omega, inclinação e RAAN
    const x_rot = x_orbit * (Math.cos(raan) * Math.cos(omega) - Math.sin(raan) * Math.sin(omega) * Math.cos(i)) -
        y_orbit * (Math.cos(raan) * Math.sin(omega) + Math.sin(raan) * Math.cos(omega) * Math.cos(i));

    const y_rot = x_orbit * (Math.sin(raan) * Math.cos(omega) + Math.cos(raan) * Math.sin(omega) * Math.cos(i)) -
        y_orbit * (Math.sin(raan) * Math.sin(omega) - Math.cos(raan) * Math.cos(omega) * Math.cos(i));

    const z_rot = x_orbit * Math.sin(i) * Math.sin(omega) + y_orbit * Math.sin(i) * Math.cos(omega);

    return { x: x_rot, y: y_rot, z: z_rot };
}

let size = 1.63 * 6371 * SIZE_SCALE;
// Criar a elipse visível
const ellipseGeometry = createEllipsePath(a, e, i, omega, raan);
const ellipseMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const ellipse = new THREE.Line(ellipseGeometry, ellipseMaterial);
scene.add(ellipse);

function createExo() {
    const planetGeometry = new THREE.SphereGeometry(size, 32, 32);
    const planetMaterial = new THREE.MeshStandardMaterial({
        map: new THREE.TextureLoader().load("./textures/kepler-452b.jpg"),
        metalness: 0.5,
        roughness: 0.7,
    });

    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    scene.add(planetMesh);

    return planetMesh;

}

const planetMesh = createExo();

// Adicionar uma luz direcional que simula a luz do sol
const sunLight = new THREE.DirectionalLight(0xffffff, 2.5);
sunLight.position.set(5, 5, 5);
scene.add(sunLight);

// Estrelas de fundo
const stars = getStarfield({ numStars: 10000 });
scene.add(stars);


// Função de animação
function animate() {
    requestAnimationFrame(animate);

    // Atualizar a posição do planeta
    t += 0.5;
    const position = calculateOrbitPosition(t % period);
    planetMesh.position.set(position.x, position.y, position.z);
    planetMesh.rotation.y += 0.01;


    composer.render();
}

animate();

// Manter a cena responsiva
function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight); // Ajustar o composer ao redimensionar
}
window.addEventListener('resize', handleWindowResize, false);