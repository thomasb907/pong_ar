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
  RingGeometry,
  MeshBasicMaterial,
  PointLight,
  Group,
  DirectionalLight,
  ACESFilmicToneMapping,
  PMREMGenerator
} from 'three';

// XR Emulator
import { DevUI } from '@iwer/devui';
import { XRDevice, metaQuest3 } from 'iwer';

// XR
import { XRButton } from 'three/addons/webxr/XRButton.js';

import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

import { ZZFX, zzfx } from 'zzfx';

import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

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
import { color } from 'three/tsl';

// pong 
// Handle audio - from the first example
let audioContext = null;
let audioInitialized = false;
let hitTestSource = null;
let hitTestSourceRequested = false;

let speed_ball_x = 0.06;
let speed_ball_y = 0.05;
let speed_ball_z = 0.04;
const ball_size = 0.05;
const cube_size = 2;
const size_cube = 1;
const raquet_size_x = 0.2;
const raquet_size_y = 0.2;
let score = 0;
let targetVisible = true;
let targetRespawnTimeout = null;
let gameGroup = null; // Groupe pour contenir tous les éléments du jeu
let gameActive = false; // Flag pour savoir si le jeu est actif

const initAudio = () => {
  if (!audioInitialized) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioInitialized = true;
  }
};
// end pong 

// pong 

const mouse = new Vector2(1, 1);
const raycaster = new Raycaster();
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

// Variables pour la scène
let camera, scene, renderer;
let controller;
// pong 
let reticle;

const y_cube = 2.5;

const radius = 0.5;
const widthSegments = 6;
const heightSegments = 6;
const radiustop = 5;
const radiusbottom = 5;
const height_disk = 0.1;
const radius_seg = 36;

const space_boxgeometry = new BoxGeometry(cube_size, cube_size, cube_size);
const space_box_material = new MeshLambertMaterial({ side: BackSide });
const space_box = new Mesh(space_boxgeometry, space_box_material);

space_box.material.color.set
space_box.material.transparent = true;
space_box.material.opacity = 0.3;


const sphereGeometry = new SphereGeometry(
  radius, widthSegments, heightSegments);

const cylinderGeometry = new CylinderGeometry(
  radiustop, radiusbottom, height_disk, radius_seg);

const raquet_boxgeometry = new BoxGeometry(0.5, 0.5, 0.1);
const raquet_box_material = new MeshLambertMaterial();
const raquet = new Mesh(raquet_boxgeometry, raquet_box_material);

raquet.material.transparent = true;
raquet.material.opacity = 0.3;

//barette gauche
const barette_1_geometry = new BoxGeometry(0.1, y_cube, 0.1);
const barette_1_material = new MeshPhongMaterial({ color: 0x7f00ff });
const barette1 = new Mesh(barette_1_geometry, barette_1_material);
barette1.position.set(-1.21, 0, 0);


//barette droite
const barette2 = new Mesh(barette_1_geometry, barette_1_material);
barette2.position.set(1.21, 0, 0);

//barette haute
const barette_3_geometry = new BoxGeometry(y_cube, 0.1, 0.1);
const barette3 = new Mesh(barette_3_geometry, barette_1_material);
barette3.position.set(0, 1.21, 0);

//barette basse
const barette4 = new Mesh(barette_3_geometry, barette_1_material);
barette4.position.set(0, -1.21, 0);

renderer = new WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ball_material = new MeshNormalMaterial();
const ball = new Mesh(sphereGeometry, ball_material);
ball.scale.set(0.2, 0.2, 0.2);

const target_material = new MeshNormalMaterial();
const target_ball = new Mesh(cylinderGeometry, target_material);
target_ball.scale.set(0.05, 0.05, 0.05);
target_ball.rotateX(Math.PI / 2);
target_ball.position.z = -2.499;

// Fonction pour créer et positionner la cible
function create_target() {
  const x = (Math.random() - 0.5) * (cube_size * 0.8);
  const y = (Math.random() - 0.5) * (cube_size * 0.8);

  target_ball.position.x = x;
  target_ball.position.y = y;
  target_ball.position.z = -0.499; // Ajusté par rapport à la taille du cube

  targetVisible = true;
}

function hide_target() {
  target_ball.position.z = -3;
  targetVisible = false;

  // Programmer la réapparition de la cible après 3 secondes
  clearTimeout(targetRespawnTimeout);
  targetRespawnTimeout = setTimeout(() => {
    create_target();
  }, 3000);

  // Augmenter le score
  score += 10;
}

function playBounceSound() {
  ACESFilmicToneMapping
  if (audioInitialized) {
    zzfx(...[1, , 200, , .05, .2, 4, 2, , .5, , , , , , 6, , .1, .01]);
  }
}

// Initialiser le groupe de jeu
function initGameGroup() {
  // Créer un groupe pour contenir tous les éléments du jeu
  gameGroup = new Group();

  // Ajouter tous les éléments du jeu au groupe
  gameGroup.add(space_box);
  gameGroup.add(ball);
  gameGroup.add(raquet);
  gameGroup.add(target_ball);
  gameGroup.add(barette1);
  gameGroup.add(barette2);
  gameGroup.add(barette3);
  gameGroup.add(barette4);

  // Positionner les éléments relativement à leur place dans le cube
  ball.position.set(0, 0, 0);
  raquet.position.set(0, 0, 0.4);
  create_target();

  // Le groupe n'est pas visible par défaut
  gameGroup.visible = false;

  // Ajouter le groupe à la scène
  scene.add(gameGroup);
}

window.addEventListener('click', initAudio);
window.addEventListener('keydown', initAudio);
window.addEventListener('touchstart', initAudio);

// Main loop
function animate(t, frame) {
  const referenceSpace = renderer.xr.getReferenceSpace();
  const session = renderer.xr.getSession();

  if (frame) {
    if (hitTestSourceRequested === false) {
      session.requestReferenceSpace('viewer').then(function (referenceSpace) {
        session.requestHitTestSource({ space: referenceSpace }).then(function (source) {
          hitTestSource = source;
        });
      });

      session.addEventListener('end', function () {
        hitTestSourceRequested = false;
        hitTestSource = null;
      });

      hitTestSourceRequested = true;
    }

    if (hitTestSource) {
      const hitTestResults = frame.getHitTestResults(hitTestSource);

      if (hitTestResults.length) {
        const hit = hitTestResults[0];

        reticle.visible = true;
        reticle.matrix.fromArray(hit.getPose(referenceSpace).transform.matrix);
      } else {
        reticle.visible = false;
      }
    }
  }

  if (gameActive) {
    raycaster.setFromCamera(mouse, camera);

    const intersection = raycaster.intersectObject(space_box);
    if (intersection[0]) {
      raquet.position.x = intersection[0].point.x - gameGroup.position.x;
      raquet.position.y = intersection[0].point.y - gameGroup.position.y;
    }

    // Ball movement
    ball.position.x = ball.position.x + speed_ball_x;
    ball.position.y = ball.position.y + speed_ball_y;
    ball.position.z = ball.position.z + speed_ball_z; ACESFilmicToneMapping

    // Collision avec la raquette
    const is_in_x = ball.position.x + ball_size < raquet.position.x + raquet_size_x && ball.position.x - ball_size > raquet.position.x - raquet_size_x;
    const is_in_y = ball.position.y + ball_size < raquet.position.y + raquet_size_y && ball.position.y - ball_size > raquet.position.y - raquet_size_y;

    if (is_in_x && is_in_y && Math.abs(Math.abs(ball.position.z) - Math.abs(raquet.position.z)) < 0.2) {
      speed_ball_z = -speed_ball_z;
      playBounceSound();
    }



    if (ball.position.x + ball_size > size_cube || ball.position.x - ball_size < -size_cube) {
      speed_ball_x = -speed_ball_x;
      playBounceSound();
    }
    if (ball.position.y + ball_size > size_cube || ball.position.y - ball_size < -size_cube) {
      speed_ball_y = -speed_ball_y;
      playBounceSound();
    }
    if (ball.position.z + ball_size > size_cube || ball.position.z - ball_size < -size_cube) {
      speed_ball_z = -speed_ball_z;
      playBounceSound();
    }

    // Collision balle-cible
    if (targetVisible) {
      const ballToTarget = new Vector3(
        ball.position.x - target_ball.position.x,
        ball.position.y - target_ball.position.y,
        ball.position.z - target_ball.position.z
      );

      if (ballToTarget.length() < ball_size + 0.25) {
        hide_target();
      }
    }
  }

  renderer.render(scene, camera);
}

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

  const dirLight = new DirectionalLight(0xffffff, 3);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(- 1, 1.75, 1);
  dirLight.position.multiplyScalar(30);
  scene.add(dirLight);

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate); // requestAnimationFrame() replacement, compatible with XR 
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const environment = new RoomEnvironment();
  const pmremGenerator = new PMREMGenerator(renderer);

  scene.environment = pmremGenerator.fromScene(environment).texture;

  const xrButton = XRButton.createButton(renderer, { requiredFeatures: ['hit-test'] });
  xrButton.style.backgroundColor = 'skyblue';
  document.body.appendChild(xrButton);

  // Initialiser le groupe de jeu
  initGameGroup();



  const bloomPass = new UnrealBloomPass(new Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);

  // Gestion des entrées XR
  controller = renderer.xr.getController(0);

  reticle = new Mesh(
    new RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
    new MeshBasicMaterial()
  );
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  const onSelect = (event) => {
    if (reticle.visible) {
      // Extraire la position et l'orientation du reticle
      const matrix = new Array(16);
      reticle.matrix.toArray(matrix);

      // Extraire la position du reticle
      const position = new Vector3();
      position.setFromMatrixPosition(reticle.matrix);

      // Placer le groupe de jeu à la position du clic
      gameGroup.position.copy(position);

      // Activer et rendre visible le groupe de jeu
      gameGroup.visible = true;
      gameActive = true;

      // Réinitialiser la position de la balle au centre du cube
      ball.position.set(0, 0, 0);

      // Réinitialiser la position de la cible
      create_target();
    }
  };

  controller.addEventListener('select', onSelect);
  scene.add(controller);

  // Écouteur de redimensionnement
  window.addEventListener('resize', onWindowResize, false);
};

init();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth / window.innerHeight);
}