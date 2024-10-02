import * as THREE from "three";
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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
// THREE.ColorManagement.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;


const earthGroup = new THREE.Group();

earthGroup.rotation.z = -23.4 * Math.PI / 180;

scene.add(earthGroup);

new OrbitControls(camera, renderer.domElement);

const detail = 12;
const loader = new THREE.TextureLoader();

const geometry = new THREE.IcosahedronGeometry(1, detail);

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

const apiKey = 'toZH2jYEZZAK5I2MM2LiT7h7abwQ5HEB0SCHL4Ol';
const apiUrl = `https://api.nasa.gov/neo/rest/v1/feed?start_date=2024-10-02&end_date=2024-10-03&api_key=${apiKey}`;

// Definir fatores de escala
const DISTANCE_SCALE = 1 / 10000000; // 1 unidade = 1.000.000 km
const SIZE_SCALE = 1 / 1000;         // Escala de tamanho para os NEOs

fetch("http://api.nasa.gov/neo/rest/v1/neo/54480958?api_key=toZH2jYEZZAK5I2MM2LiT7h7abwQ5HEB0SCHL4Ol").then(response => response.json()).then(data => console.log(data));

fetch(apiUrl)
  .then(response => response.json())
  .then(data => {
    const neos = data.near_earth_objects['2024-10-02'];
    console.log(neos)

    neos.forEach(neo => {
      // Obter o diâmetro máximo estimado (em km) e escalá-lo
      const diameter = neo.estimated_diameter.kilometers.estimated_diameter_max * SIZE_SCALE;

      // Criar geometria para o NEO com o tamanho proporcional
      const geometry = new THREE.SphereGeometry(diameter * 1000, 32, 32);
      const material = new THREE.MeshPhysicalMaterial({ map: loader.load("./textures/Generic_Celestia_asteroid_texture.jpg") });
      const neoMesh = new THREE.Mesh(geometry, material);

      // Obter a distância mínima da Terra em quilômetros e escalá-la
      const distance = neo.close_approach_data[0].miss_distance.kilometers * DISTANCE_SCALE;

      // Posicionar o NEO em torno da Terra (no eixo X por simplicidade)
      // Você pode distribuir as posições em diferentes eixos para uma visualização mais interessante
      neoMesh.position.x = distance;
      neoMesh.position.y = Math.random() * 10 - 5; // Pequena variação no eixo Y
      neoMesh.position.z = Math.random() * 10 - 5; // Pequena variação no eixo Z

      scene.add(neoMesh);
    });
  })
  .catch(error => console.error('Error fetching NEO data:', error));

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
  
  // Parâmetros da órbita
 
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
  