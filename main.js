"use strict";

// Import only what you need, to help your bundler optimize final code size using tree shaking
// see https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)

import {
  AmbientLight,
  BoxGeometry,
  Clock,
  Color,
  CylinderGeometry,
  HemisphereLight,
  Mesh,
  MeshNormalMaterial,
  MeshPhongMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  SphereGeometry,
  Vector3,
  MeshLambertMaterial,
  BackSide,
  Raycaster,
  Vector2,
  TextureLoader,
  PointLight
} from 'three';

// XR Emulator
import { DevUI } from '@iwer/devui';
import { XRDevice, metaQuest3 } from 'iwer';

// XR
import { XRButton } from 'three/addons/webxr/XRButton.js';

// If you prefer to import the whole library, with the THREE prefix, use the following line instead:
// import * as THREE from 'three'

// NOTE: three/addons alias is supported by Rollup: you can use it interchangeably with three/examples/jsm/  

// Importing Ammo can be tricky.
// Vite supports webassembly: https://vitejs.dev/guide/features.html#webassembly
// so in theory this should work:
//
// import ammoinit from 'three/addons/libs/ammo.wasm.js?init';
// ammoinit().then((AmmoLib) => {
//  Ammo = AmmoLib.exports.Ammo()
// })
//
// But the Ammo lib bundled with the THREE js examples does not seem to export modules properly.
// A solution is to treat this library as a standalone file and copy it using 'vite-plugin-static-copy'.
// See vite.config.js
// 
// Consider using alternatives like Oimo or cannon-es
import {
  OrbitControls
} from 'three/addons/controls/OrbitControls.js';

import {
  GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';

// pong 
// Handle audio - from the first example
let audioContext = null;
let audioInitialized = false;

const initAudio = () => {
  if (!audioInitialized) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioInitialized = true;
  }
};
// end pong 

// pong 
// Pour le son de rebond, si importé correctement
const playBounceSound = () => {
  if (audioInitialized) {
    // Si vous avez importé ZZFX, vous pouvez décommenter cette ligne:
    // zzfx(...[1,,200,,.05,.2,4,2,,.5,,,,,,6,,.1,.01]); 
    console.log("Bounce sound would play here");
  }
};
// end pong 

// Example of hard link to official repo for data, if needed
// const MODEL_PATH = 'https://raw.githubusercontent.com/mrdoob/three.js/r173/examples/models/gltf/LeePerrySmith/LeePerrySmith.glb';

async function setupXR(xrMode) {

  if (xrMode !== 'immersive-vr') return;

  // iwer setup: emulate vr session
  let nativeWebXRSupport = false;
  if (navigator.xr) {
    nativeWebXRSupport = await navigator.xr.isSessionSupported(xrMode);
  }

  if (!nativeWebXRSupport) {
    const xrDevice = new XRDevice(metaQuest3);
    xrDevice.installRuntime();
    xrDevice.fovy = (75 / 180) * Math.PI;
    xrDevice.ipd = 0;
    window.xrdevice = xrDevice;
    xrDevice.controllers.right.position.set(0.15649, 1.43474, -0.38368);
    xrDevice.controllers.right.quaternion.set(
      0.14766305685043335,
      0.02471366710960865,
      -0.0037767395842820406,
      0.9887216687202454,
    );
    xrDevice.controllers.left.position.set(-0.15649, 1.43474, -0.38368);
    xrDevice.controllers.left.quaternion.set(
      0.14766305685043335,
      0.02471366710960865,
      -0.0037767395842820406,
      0.9887216687202454,
    );
    new DevUI(xrDevice);
  }
}

await setupXR('immersive-ar');

// pong 
let speed_ball_x = 0.05;
let speed_ball_y = 0.05;
let speed_ball_z = 0.04;
const ball_size = 0.1;
const cube_size = 1; 
const raquet_size_x = 0.2; 
const raquet_size_y = 0.2;
let score = 0;
let targetVisible = true;
let targetRespawnTimeout = null;

const mouse = new Vector2(1, 1);
const raycaster = new Raycaster();

// end pong

// Variables pour la scène
let camera, scene, renderer;
let controller;
let ball, space_box;
// pong 

// Fonction pour créer et positionner la cible
const create_target = () => {
  // Générer une position aléatoire pour la cible à l'intérieur du cube
  const x = (Math.random() - 0.5) * (cube_size * 0.8);
  const y = (Math.random() - 0.5) * (cube_size * 0.8);
  const z = (Math.random() - 0.5) * (cube_size * 0.8);
  
  target.position.set(
    space_box.position.x + x,
    space_box.position.y + y,
    space_box.position.z + z
  );
  
  targetVisible = true;
};


const hide_target = () => {
  // Déplacer la cible hors du cube
  target.position.set(
    space_box.position.x + 10, // Position hors du cube
    space_box.position.y,
    space_box.position.z
  );
  
  targetVisible = false;
  
  // Programmer la réapparition de la cible après 3 secondes
  clearTimeout(targetRespawnTimeout);
  targetRespawnTimeout = setTimeout(() => {
    create_target();
  }, 3000);
  
  // Augmenter le score
  score += 10;
  updateScoreDisplay();
};

const setupScoreDisplay = () => {
  // Création du conteneur pour le score
  const scoreContainer = document.createElement('div');
  scoreContainer.style.position = 'absolute';
  scoreContainer.style.top = '20px';
  scoreContainer.style.left = '10px';
  scoreContainer.style.width = '100px';
  scoreContainer.style.height = '70px';
  scoreContainer.style.display = 'flex';
  scoreContainer.style.justifyContent = 'left';
  scoreContainer.style.alignItems = 'center';
  document.body.appendChild(scoreContainer);

  // Création du texte du score
  const scoreDiv = document.createElement('div');
  scoreDiv.style.color = 'white';
  scoreDiv.style.fontFamily = 'Arial, sans-serif';
  scoreDiv.style.fontSize = '17px';
  scoreDiv.style.fontWeight = 'bold';
  scoreDiv.style.padding = '0 7px';
  scoreDiv.style.textShadow = '1px 1px 2px black';
  scoreDiv.textContent = 'Score: 0';
  scoreContainer.appendChild(scoreDiv);

  return scoreDiv;
};

const updateScoreDisplay = () => {
  const scoreDiv = document.querySelector('div:contains("Score:")');
  if (scoreDiv) {
    scoreDiv.textContent = `Score: ${score}`;
  }
};
// end pong

const clock = new Clock();

// Main loop
const animate = () => {
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  //  pong
  // Mise à jour de la position de la balle
  if (ball) {
    ball.position.x += speed_ball_x;
    ball.position.y += speed_ball_y;
    ball.position.z += speed_ball_z;

    // Gestion des rebonds sur les parois du cube
    if (ball.position.x + ball_size > cube_size / 2 || ball.position.x - ball_size < -cube_size / 2) {
      speed_ball_x = -speed_ball_x;
      playBounceSound();
    }
    if (ball.position.y + ball_size > cube_size / 2 || ball.position.y - ball_size < -cube_size / 2) {
      speed_ball_y = -speed_ball_y;
      playBounceSound();
    }
    if (ball.position.z + ball_size > cube_size / 2 || ball.position.z - ball_size < -cube_size / 2) {
      speed_ball_z = -speed_ball_z;
      playBounceSound();
    }
    if (raquet) {
      const is_in_x = ball.position.x + ball_size > raquet.position.x - raquet_size_x && 
                      ball.position.x - ball_size < raquet.position.x + raquet_size_x;
      const is_in_y = ball.position.y + ball_size > raquet.position.y - raquet_size_y && 
                      ball.position.y - ball_size < raquet.position.y + raquet_size_y;
      
      const dist_z = Math.abs(ball.position.z - raquet.position.z);
      
      if (is_in_x && is_in_y && dist_z < 0.2) {
        speed_ball_z = -speed_ball_z;
      }
    }
    
    // Collision balle-cible
    if (targetVisible && target) {
      const ballToTarget = new Vector3(
        ball.position.x - target.position.x,
        ball.position.y - target.position.y,
        ball.position.z - target.position.z
      );
      
      if (ballToTarget.length() < ball_size + 0.05) {
        hide_target();
        playBounceSound();
      }
    }


  }
  // end pong

  renderer.render(scene, camera);
};

const init = () => {
  scene = new Scene();

  const aspect = window.innerWidth / window.innerHeight;
  camera = new PerspectiveCamera(75, aspect, 0.1, 10); // meters
  camera.position.set(0, 1.6, 2);

  const light = new AmbientLight(0xffffff, 1.0); // soft white light
  scene.add(light);

  const hemiLight = new HemisphereLight(0xffffff, 0xbbbbff, 3);
  hemiLight.position.set(0.5, 1, 0.25);
  scene.add(hemiLight);

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate); // requestAnimationFrame() replacement, compatible with XR 
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  const xrButton = XRButton.createButton(renderer, {});
  xrButton.style.backgroundColor = 'skyblue';
  document.body.appendChild(xrButton);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1.6, 0);
  controls.update();

  // pong
  // Création du cube transparent
  const space_boxgeometry = new BoxGeometry(cube_size, cube_size, cube_size);
  const space_box_material = new MeshLambertMaterial({
    side: BackSide,
    transparent: true,
    opacity: 0.2,
    color: 0x88ccff
  });
  space_box = new Mesh(space_boxgeometry, space_box_material);
  space_box.position.set(0, 1.6, 0); // Positionner le cube à hauteur de tête en AR
  scene.add(space_box);

  // Création de la balle
  const radius = 0.05;
  const widthSegments = 16;
  const heightSegments = 16;
  const sphereGeometry = new SphereGeometry(radius, widthSegments, heightSegments);
  const ball_material = new MeshNormalMaterial();
  ball = new Mesh(sphereGeometry, ball_material);
  ball.position.set(0, 1.6, 0); // Au centre du cube initialement
  scene.add(ball);

  // Création de la raquette 
  const raquet_boxgeometry = new BoxGeometry(raquet_size_x * 2, raquet_size_y * 2, 0.05);
  const raquet_box_material = new MeshLambertMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 0.7
  });
  raquet = new Mesh(raquet_boxgeometry, raquet_box_material);
  raquet.position.set(0, 1.6, space_box.position.z + cube_size / 2 - 0.1); // Position initiale
  scene.add(raquet);
  
  // Création de la cible 
  const radiustop = 0.05;
  const radiusbottom = 0.05;
  const height_disk = 0.01;
  const radius_seg = 16;
  const cylinderGeometry = new CylinderGeometry(
    radiustop, radiusbottom, height_disk, radius_seg);
  const target_material = new MeshNormalMaterial();
  target = new Mesh(cylinderGeometry, target_material);
  target.rotateX(Math.PI / 2);
  scene.add(target);
  create_target(); 
  // end pong

  // Gestion des entrées XR
  controller = renderer.xr.getController(0);

  // pong
  const onSelect = (event) => {
    
  };
  // end pong

  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // pong
   // Fonction pour gérer le mouvement de la raquette avec le contrôleur
   const updateRaquetPosition = () => {
    if (controller && raquet) {
      // En AR, utiliser la position du contrôleur pour diriger la raquette
      raquet.position.x = controller.position.x;
      raquet.position.y = controller.position.y;
      // Garder la raquette à une distance fixe devant l'utilisateur
      raquet.position.z = space_box.position.z + cube_size / 2 - 0.1;
    }
  };
  
  // Ajouter un écouteur pour mettre à jour la position de la raquette
  controller.addEventListener('connected', updateRaquetPosition);

  // pong
  // Initialiser l'audio sur les interactions utilisateur
  window.addEventListener('click', initAudio);
  window.addEventListener('keydown', initAudio);
  window.addEventListener('touchstart', initAudio);
  // end pong

  // Écouteur de redimensionnement
  window.addEventListener('resize', onWindowResize, false);

  // pong
  const scoreDiv = setupScoreDisplay();

  const updateScoreDisplay = () => {
    scoreDiv.textContent = `Score: ${score}`;
  };

  setInterval(updateScoreDisplay, 100);
  // end pong
};

init();

function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}