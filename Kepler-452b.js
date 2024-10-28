
import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 5;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

new OrbitControls(camera, renderer.domElement);
const loader = new THREE.TextureLoader();


const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.5, 0.4, 0.85);
composer.addPass(bloomPass);

// Função para criar a estrela central
function createCentralStar() {
    const pointLight = new THREE.PointLight(0xffffff, 1, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const starGeometry = new THREE.SphereGeometry(0.5, 32, 32);
    const starMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00, emissiveIntensity: 1.5 });
    const star = new THREE.Mesh(starGeometry, starMaterial);
    scene.add(star);
}

// Chamar a função para criar a estrela central
createCentralStar();

// Função de animação
function animate() {
    requestAnimationFrame(animate);
    composer.render(); // Renderiza a cena usando o composer
}

// Iniciar a animação
animate();


function createExo() {
    const earthGroup = new THREE.Group();

    earthGroup.rotation.z = -23.4 * Math.PI / 180;

    scene.add(earthGroup);

    const geometry = new THREE.IcosahedronGeometry(1, 12);

    const material = new THREE.MeshPhongMaterial({
        map: loader.load("./textures/kepler-452b.jpg"),

        bumpScale: 0.04,
    });


    const earthMesh = new THREE.Mesh(geometry, material);
    earthGroup.add(earthMesh);

    const cloudsMat = new THREE.MeshStandardMaterial({
        map: loader.load("./textures/clouds1.png"),
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending,

    });

    const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
    cloudsMesh.scale.setScalar(1.003);
    earthGroup.add(cloudsMesh);


    const fresnelMat = getFresnelMat();
    const glowMesh = new THREE.Mesh(geometry, fresnelMat);
    glowMesh.scale.setScalar(1.01);
    earthGroup.add(glowMesh);


    const sunLight = new THREE.DirectionalLight(0xffffff, 6.0);
    sunLight.position.set(-2, 0.5, 1.5);
    scene.add(sunLight);

    function animate() {
        requestAnimationFrame(animate);
        cloudsMesh.rotation.y += 0.003;
        earthMesh.rotation.y += 0.002;
        glowMesh.rotation.y += 0.002;

        renderer.render(scene, camera);
    }

    animate();
}
createExo();


function createAndAnimateStars() {
    const stars = getStarfield({ numStars: 2000 });
    scene.add(stars);

    function animate() {
        requestAnimationFrame(animate);
        stars.rotation.y += 0.0002;

        renderer.render(scene, camera);
    }
    animate();
}

createAndAnimateStars();

function handleWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

handleWindowResize();

window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
});


