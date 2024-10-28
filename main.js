import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import getStarfield from "./src/getStarfield.js";
import { getFresnelMat } from "./src/getFresnelMat.js";

const w = window.innerWidth;
const h = window.innerHeight;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 0;
camera.position.y = 0;
camera.position.x = 10;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(w, h);
document.body.appendChild(renderer.domElement);
// THREE.ColorManagement.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;


new OrbitControls(camera, renderer.domElement);

const earthGroup = new THREE.Group();

earthGroup.rotation.z = -23.4 * Math.PI / 180;

scene.add(earthGroup);

const loader = new THREE.TextureLoader();

const geometry = new THREE.IcosahedronGeometry(1, 12);

const material = new THREE.MeshPhongMaterial({
  map: loader.load("./textures/00_earthmap1k.jpg"),
  specularMap: loader.load("./textures/02_earthspec1k.jpg"),
  bumpMap: loader.load("./textures/01_earthbump1k.jpg"),
  bumpScale: 0.04,
});


const earthMesh = new THREE.Mesh(geometry, material);
earthGroup.add(earthMesh);

const lightsMat = new THREE.MeshBasicMaterial({
  map: loader.load("./textures/03_earthlights1k.jpg"),
  blending: THREE.AdditiveBlending,
});

const lightsMesh = new THREE.Mesh(geometry, lightsMat);
earthGroup.add(lightsMesh);

const cloudsMat = new THREE.MeshStandardMaterial({
  map: loader.load("./textures/04_earthcloudmap.jpg"),
  transparent: true,
  opacity: 0.8,
  blending: THREE.AdditiveBlending,
  alphaMap: loader.load('./textures/05_earthcloudmaptrans.jpg'),
  // alphaTest: 0.3,
});

const cloudsMesh = new THREE.Mesh(geometry, cloudsMat);
cloudsMesh.scale.setScalar(1.003);
earthGroup.add(cloudsMesh);

const fresnelMat = getFresnelMat();
const glowMesh = new THREE.Mesh(geometry, fresnelMat);
glowMesh.scale.setScalar(1.01);
earthGroup.add(glowMesh);

const stars = getStarfield({ numStars: 2000 });
scene.add(stars);

const sunLight = new THREE.DirectionalLight(0xffffff, 2.0);
sunLight.position.set(-2, 0.5, 1.5);
scene.add(sunLight);

function animate() {
  requestAnimationFrame(animate);

  earthMesh.rotation.y += 0.002;
  lightsMesh.rotation.y += 0.002;
  cloudsMesh.rotation.y += 0.0023;
  glowMesh.rotation.y += 0.002;
  stars.rotation.y -= 0.0002;
  renderer.render(scene, camera);
}

animate();

function handleWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', handleWindowResize, false);


// Definir fatores de escala
const DISTANCE_SCALE = 1 / 10000000; // 1 unidade = 1.000.000 km
const SIZE_SCALE = 1 / 1000;         // Escala de tamanho para os NEOs

let t = 0;
const period = 1000;

const a = 5; // Semi-major axis (sma)
const e = 0.6; // Eccentricity
const i = THREE.MathUtils.degToRad(30); // Inclination in radians
const omega = THREE.MathUtils.degToRad(45); // Argument of perihelion
const raan = THREE.MathUtils.degToRad(60); // RAAN (longitude do nó ascendente)


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

// Criar a elipse visível
const ellipseGeometry = createEllipsePath(a, e, i, omega, raan);
const ellipseMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
const ellipse = new THREE.Line(ellipseGeometry, ellipseMaterial);
scene.add(ellipse);

// Criar um objeto para percorrer a elipse
const objectGeometry = new THREE.SphereGeometry(0.5, 32, 32);
const objectMaterial = new THREE.MeshPhysicalMaterial({ map: loader.load("/textures/moon_text.png") });
const moon = new THREE.Mesh(objectGeometry, objectMaterial);
scene.add(moon);

// Função de animação
function animateOrbit() {
  requestAnimationFrame(animateOrbit);
  moon.rotation.y += 0.01;
  // Atualizar a posição do objeto que percorre a órbita
  t += 1;
  const position = calculateOrbitPosition(t % period);
  moon.position.set(position.x, position.y, position.z);

  renderer.render(scene, camera);
}

animateOrbit();
