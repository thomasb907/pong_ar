"use strict";

// Import only what you need, to help your bundler optimize final code size using tree shaking
// see https://developer.mozilla.org/en-US/docs/Glossary/Tree_shaking)

import {
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  BoxGeometry,
  Mesh,
  MeshNormalMaterial,
  AmbientLight,
  SphereGeometry,
  Clock,
  MeshPhongMaterial,
  PointLight,
  Object3D,
  GridHelper,
  BackSide,
  TextureLoader,
  MeshLambertMaterial,
  Vector2,
  Raycaster,
  CylinderGeometry,
  Vector3
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
import { pass } from 'three/tsl';

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



// INSERT CODE HERE
let camera, scene, renderer;
let controller;
// my code 
const mouse = new Vector2(1, 1);
const raycaster = new Raycaster();

//safe code
const clock = new Clock();

// Main loop
const animate = () => {

  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  const intersection = raycaster.intersectObject(space_box);
  if (intersection[0]) {
    raquet.position.x = intersection[0].point.x
    raquet.position.y = intersection[0].point.y
    //raquet.position.z = intersection[0].point.z

  }
  //ball maj pos
  ball.position.x = ball.position.x + speed_ball_x;
  ball.position.y = ball.position.y + speed_ball_y;
  ball.position.z = ball.position.z + speed_ball_z;

  //ball raquet col
  const is_in_x = ball.position.x + ball_size < raquet.position.x + raquet_size_x && ball.position.x - ball_size > raquet.position.x - raquet_size_x;
  const is_in_y = ball.position.y + ball_size < raquet.position.y + raquet_size_y && ball.position.y - ball_size > raquet.position.y - raquet_size_y;

  if (is_in_x && is_in_y && Math.abs(Math.abs(ball.position.z) - Math.abs(raquet.position.z)) < 0.2) {
    speed_ball_z = - speed_ball_z
  }


  //rebondir

  if (ball.position.x + ball_size > 2.5 || ball.position.x - ball_size < -2.5) {
    speed_ball_x = - speed_ball_x;
    playBounceSound();
  }
  if (ball.position.y + ball_size > 2.5 || ball.position.y - ball_size < -2.5) {
    speed_ball_y = - speed_ball_y;
    playBounceSound();
  }
  if (ball.position.z + ball_size > 2.5 || ball.position.z - ball_size < -2.5) {
    speed_ball_z = - speed_ball_z;
    playBounceSound();
  }

  // Collision balle-cible améliorée
  if (targetVisible) {
    const ballToTarget = new Vector3(
      ball.position.x - target.position.x,
      ball.position.y - target.position.y,
      ball.position.z - target.position.z
    );

    if (ballToTarget.length() < ball_size + 0.25) {
      pass;
    }
  }



  renderer.render(scene, camera);
};


const init = () => {
  scene = new Scene();

  //code added

  let speed_ball_x = 0.08;
  let speed_ball_y = 0.08;
  let speed_ball_z = 0.06;
  const ball_size = 0.1;
  const raquet_size_x = 0.7;
  const raquet_size_y = 0.7;
  let score = 0;
  let targetVisible = true;
  let targetRespawnTimeout = null;

  const radius = 1;
  const widthSegments = 6;
  const heightSegments = 6;
  const sphereGeometry = new SphereGeometry(
    radius, widthSegments, heightSegments);

  const radiustop = 5;
  const radiusbottom = 5;
  const height_disk = 0.1;
  const radius_seg = 36;

  const cylinderGeometry = new CylinderGeometry(
    radiustop, radiusbottom, height_disk, radius_seg);


  //end code added

  const aspect = window.innerWidth / window.innerHeight;
  camera = new PerspectiveCamera(75, aspect, 0.1, 10); // meters
  camera.position.set(0, 1.6, 3);

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

  /*
  document.body.appendChild( XRButton.createButton( renderer, {
    'optionalFeatures': [ 'depth-sensing' ],
    'depthSensing': { 'usagePreference': [ 'gpu-optimized' ], 'dataFormatPreference': [] }
  } ) );
*/

  const xrButton = XRButton.createButton(renderer, {});
  xrButton.style.backgroundColor = 'skyblue';
  document.body.appendChild(xrButton);

  // oui

  const controls = new OrbitControls(camera, renderer.domElement);
  //controls.listenToKeyEvents(window); // optional
  controls.target.set(0, 1.6, 0);
  controls.update();

  // Handle input: see THREE.js webxr_ar_cones

  //other change
  const space_boxgeometry = new BoxGeometry(5, 5, 5);
  const space_box_material = new MeshLambertMaterial({ side: BackSide, map: texture });
  const space_box = new Mesh(space_boxgeometry, space_box_material);

  const raquet_boxgeometry = new BoxGeometry(1, 1, 0.1);
  const raquet_box_material = new MeshLambertMaterial();
  const raquet = new Mesh(raquet_boxgeometry, raquet_box_material);
  raquet.position.z = 1.5

  scene.add(space_box);
  scene.add(ball);
  scene.add(raquet);
  scene.add(target);

  ball.position.x = 0.2;
  ball.position.y = 0.2;
  ball.position.z = 0.2;


  //end code change

  const onSelect = (event) => {

    mouse.x = (event.onSelect.x / window.innerWidth) * 2 - 1;
    mouse.y = - (event.onSelect.y / window.innerHeight) * 2 + 1;

  }

  controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);


  window.addEventListener('resize', onWindowResize, false);

}

init();

//

/*
function loadData() {
  new GLTFLoader()
    .setPath('assets/models/')
    .load('test.glb', gltfReader);
}
 
 
function gltfReader(gltf) {
  let testModel = null;
 
  testModel = gltf.scene;
 
  if (testModel != null) {
    console.log("Model loaded:  " + testModel);
    scene.add(gltf.scene);
  } else {
    console.log("Load FAILED.  ");
  }
}
 
loadData();
*/


// camera.position.z = 3;




function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

}
