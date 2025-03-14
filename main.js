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
  Vector2,
  MeshLambertMaterial,
  BackSide,
  Raycaster,
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

import {
  OrbitControls
} from 'three/addons/controls/OrbitControls.js';

import {
  GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';

// Variables globales pour le casse-briques
let bricks = [];
const BRICK_ROWS = 4;
const BRICK_COLS = 6;
const BRICK_WIDTH = 0.3;
const BRICK_HEIGHT = 0.15;
const BRICK_DEPTH = 0.05;
const BRICK_GAP = 0.05;
let gameInitialized = false; // Pour suivre si le premier clic a été fait

// Pong variables
let audioContext = null;
let audioInitialized = false;
let hitTestSource = null;
let hitTestSourceRequested = false;

let speed_ball_x = 0.04;
let speed_ball_y = 0.03;
let speed_ball_z = 0;  // En 2D, on n'utilise pas Z pour le mouvement
const ball_size = 0.05;
const cube_size = 2;
const paddle_width = 0.5;  // Renommé de raquet_size_x
const paddle_height = 0.1; // Renommé et réduit
let score = 0;
let gameGroup = null;
let gameActive = false;
let gameOver = false;
let lives = 3;

// Fonction audio
const initAudio = () => {
  if (!audioInitialized) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    audioInitialized = true;
  }
};

const mouse = new Vector2(1, 1);
const raycaster = new Raycaster();

// Fonction setupXR reste identique...
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
let reticle;

const y_cube = 2.5;
const game_depth = 0.5; // Profondeur du jeu (épaisseur du "cadre")

// Géométries et matériaux
const space_boxgeometry = new BoxGeometry(cube_size, cube_size, game_depth);
const space_box_material = new MeshLambertMaterial({ side: BackSide });
const space_box = new Mesh(space_boxgeometry, space_box_material);

space_box.material.transparent = true;
space_box.material.opacity = 0.3;

const sphereGeometry = new SphereGeometry(ball_size, 16, 16);

// Paddle (renommé de raquet)
const paddleGeometry = new BoxGeometry(paddle_width, paddle_height, 0.05);
const paddleMaterial = new MeshLambertMaterial({ color: 0x0088ff });
const paddle = new Mesh(paddleGeometry, paddleMaterial);

// Barettes pour créer le cadre du jeu
const barette_1_geometry = new BoxGeometry(0.1, y_cube, 0.1);
const barette_1_material = new MeshPhongMaterial({ color: 0x7f00ff });
const barette1 = new Mesh(barette_1_geometry, barette_1_material);
barette1.position.set(-1.21, 0, 0);

const barette2 = new Mesh(barette_1_geometry, barette_1_material);
barette2.position.set(1.21, 0, 0);

const barette_3_geometry = new BoxGeometry(y_cube, 0.1, 0.1);
const barette3 = new Mesh(barette_3_geometry, barette_1_material);
barette3.position.set(0, 1.21, 0);

const ball_material = new MeshNormalMaterial();
const ball = new Mesh(sphereGeometry, ball_material);

// Création des briques
function createBricks() {
  // Nettoyer les briques existantes
  bricks.forEach(brick => {
    gameGroup.remove(brick);
  });
  bricks = [];

  const totalWidth = BRICK_COLS * (BRICK_WIDTH + BRICK_GAP) - BRICK_GAP;
  const totalHeight = BRICK_ROWS * (BRICK_HEIGHT + BRICK_GAP) - BRICK_GAP;

  const startX = -totalWidth / 2;
  const startY = cube_size / 2 - totalHeight - 0.2; // Placer en haut avec un peu d'espace

  const colors = [0xff0000, 0xff7700, 0xffff00, 0x00ff00, 0x0077ff];

  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLS; col++) {
      const brickGeometry = new BoxGeometry(BRICK_WIDTH, BRICK_HEIGHT, BRICK_DEPTH);
      const brickMaterial = new MeshPhongMaterial({ color: colors[row % colors.length] });
      const brick = new Mesh(brickGeometry, brickMaterial);

      brick.position.x = startX + col * (BRICK_WIDTH + BRICK_GAP) + BRICK_WIDTH / 2;
      brick.position.y = startY + row * (BRICK_HEIGHT + BRICK_GAP) + BRICK_HEIGHT / 2;
      brick.position.z = -game_depth / 4; // Légèrement en profondeur

      bricks.push(brick);
      gameGroup.add(brick);
    }
  }
}

// Réinitialiser la balle
function resetBall() {
  ball.position.set(0, -0.5, 0);

  // Direction aléatoire mais toujours vers le haut
  const angle = (Math.random() * Math.PI / 4) + Math.PI / 4; // entre 45° et 135°
  speed_ball_x = 0.04 * Math.cos(angle);
  speed_ball_y = 0.04 * Math.sin(angle);

  if (Math.random() > 0.5) speed_ball_x = -speed_ball_x; // Aléatoirement à gauche ou droite
}

function playBounceSound() {
  if (audioInitialized) {
    zzfx(...[1, , 200, , .05, .2, 4, 2, , .5, , , , , , 6, , .1, .01]);
  }
}

function playBrickHitSound() {
  if (audioInitialized) {
    zzfx(...[2, , 300, .01, , .3, 3, 2, , , , , , , , , .1, .5, .02]);
  }
}

// Initialiser le groupe de jeu
function initGameGroup() {
  // Créer un groupe pour contenir tous les éléments du jeu
  gameGroup = new Group();

  // Ajouter tous les éléments du jeu au groupe
  gameGroup.add(space_box);
  gameGroup.add(ball);
  gameGroup.add(paddle);
  gameGroup.add(barette1);
  gameGroup.add(barette2);
  gameGroup.add(barette3);

  // Positionner les éléments
  resetBall();
  paddle.position.set(0, -1, 0); // Paddle en bas

  // Créer les briques
  createBricks();

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

        // Si le jeu est déjà initialisé, utiliser les résultats de hit test pour déplacer le paddle
        if (gameInitialized && gameActive) {
          const matrix = new Array(16);
          reticle.matrix.toArray(matrix);

          // Extraire la position du reticle
          const position = new Vector3();
          position.setFromMatrixPosition(reticle.matrix);

          // Calculer la position relative au gameGroup
          const relativeX = position.x - gameGroup.position.x;

          // Limiter le paddle aux bords du jeu
          const paddleLimit = cube_size / 2 - paddle_width / 2 - 0.1;
          paddle.position.x = Math.max(-paddleLimit, Math.min(paddleLimit, relativeX));
        }
      } else {
        reticle.visible = false;
      }
    }
  }

  if (gameActive && !gameOver) {
    // Mouvement de la balle
    ball.position.x += speed_ball_x;
    ball.position.y += speed_ball_y;

    // Vérifier les collisions avec les murs latéraux
    if (ball.position.x + ball_size > cube_size / 2 - 0.1 || ball.position.x - ball_size < -cube_size / 2 + 0.1) {
      speed_ball_x = -speed_ball_x;
      playBounceSound();
    }

    // Vérifier la collision avec le mur supérieur
    if (ball.position.y + ball_size > cube_size / 2 - 0.1) {
      speed_ball_y = -speed_ball_y;
      playBounceSound();
    }

    // Vérifier si la balle tombe en bas (perte de vie)
    if (ball.position.y - ball_size < -cube_size / 2 + 0.1) {
      lives--;
      if (lives <= 0) {
        gameOver = true;
      } else {
        resetBall();
      }
    }

    // Collision avec le paddle
    const paddleTop = paddle.position.y + paddle_height / 2;
    const paddleBottom = paddle.position.y - paddle_height / 2;
    const paddleLeft = paddle.position.x - paddle_width / 2;
    const paddleRight = paddle.position.x + paddle_width / 2;

    if (ball.position.x >= paddleLeft && ball.position.x <= paddleRight &&
      ball.position.y - ball_size <= paddleTop && ball.position.y - ball_size >= paddleBottom - 0.03) {

      // Rebond avec changement d'angle selon la position sur le paddle
      const paddleCenter = paddle.position.x;
      const impact = (ball.position.x - paddleCenter) / (paddle_width / 2);

      speed_ball_y = -Math.abs(speed_ball_y); // Toujours rebondir vers le haut
      speed_ball_x = 0.04 * impact; // -1 à gauche, 1 à droite

      playBounceSound();
    }

    // Collision avec les briques
    for (let i = bricks.length - 1; i >= 0; i--) {
      const brick = bricks[i];

      const brickLeft = brick.position.x - BRICK_WIDTH / 2;
      const brickRight = brick.position.x + BRICK_WIDTH / 2;
      const brickTop = brick.position.y + BRICK_HEIGHT / 2;
      const brickBottom = brick.position.y - BRICK_HEIGHT / 2;

      if (ball.position.x + ball_size > brickLeft && ball.position.x - ball_size < brickRight &&
        ball.position.y + ball_size > brickBottom && ball.position.y - ball_size < brickTop) {

        // Déterminer de quel côté la collision a eu lieu
        const dx = ball.position.x - brick.position.x;
        const dy = ball.position.y - brick.position.y;

        // Collision horizontale ou verticale?
        if (Math.abs(dx) / BRICK_WIDTH > Math.abs(dy) / BRICK_HEIGHT) {
          speed_ball_x = -speed_ball_x;
        } else {
          speed_ball_y = -speed_ball_y;
        }

        // Supprimer la brique
        gameGroup.remove(brick);
        bricks.splice(i, 1);
        score += 10;

        playBrickHitSound();

        // Vérifier la victoire
        if (bricks.length === 0) {
          // Niveau terminé
          setTimeout(() => {
            createBricks();  // Créer un nouveau niveau
            resetBall();
          }, 1000);
        }

        break; // Sortir de la boucle après avoir détecté une collision
      }
    }
  }

  renderer.render(scene, camera);
}

const init = () => {
  scene = new Scene();
  scene.background = new Color(0x000000);

  const aspect = window.innerWidth / window.innerHeight;
  camera = new PerspectiveCamera(75, aspect, 0.1, 10);
  camera.position.set(0, 1.6, 2);

  const light = new AmbientLight(0xffffff, 1.0);
  scene.add(light);

  const hemiLight = new HemisphereLight(0xffffff, 0xbbbbff, 3);
  hemiLight.position.set(0.5, 1, 0.25);
  scene.add(hemiLight);

  const dirLight = new DirectionalLight(0xffffff, 3);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-1, 1.75, 1);
  dirLight.position.multiplyScalar(30);
  scene.add(dirLight);

  renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
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
      if (!gameInitialized) {
        // Premier clic - place le jeu
        const matrix = new Array(16);
        reticle.matrix.toArray(matrix);

        const position = new Vector3();
        position.setFromMatrixPosition(reticle.matrix);

        gameGroup.position.copy(position);
        gameGroup.visible = true;
        gameActive = true;
        gameInitialized = true;

        resetBall();
        createBricks();
      }
      // Pour les clics suivants, le mouvement du paddle est déjà géré dans l'animate()
    }
  };

  controller.addEventListener('select', onSelect);
  scene.add(controller);

  window.addEventListener('resize', onWindowResize, false);
};

init();

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}