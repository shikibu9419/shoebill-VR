import 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r123/three.min.js';
import 'https://cdn.jsdelivr.net/npm/webvr-boilerplate@latest/build/webvr-manager.min.js';
import 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r123/examples/js/loaders/GLTFLoader.js';
import './threejs/VRControls.js';
import './threejs/VREffect.js';
import './webvr-boilerplate/webvr-polyfill.js';
import { VRButton } from './threejs/VRButton.js';
import { cloneGltf } from './cloneGLTF.js';
import { VRDesktopControls } from './VRDesktopControls.js';

const RADIUS = 150
const SHOEBILL_COUNT = 6;
const GLTF_PATH = 'shoebill';

const mixers = [];
const controls = [];
let textures = [];
let clock, manager, scene, camera;

let lightHelper;

const init = async () => {
  // setup renderer
  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#canvas'),
  });
  const width = document.getElementById('canvas-wrapper').getBoundingClientRect().width;
  const height = document.getElementById('canvas-wrapper').getBoundingClientRect().height;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.xr.enabled = true;

  // add VRButton
  document.body.appendChild(VRButton.createButton(renderer));

  // setup scene
  scene = new THREE.Scene();

  // setup camera
  camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  camera.position.x = 0;
  camera.position.y = 100;

  // for VR
  const effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);
  manager = new WebVRManager(renderer, effect);

  // setup controls
  // const vrControls = new THREE.VRControls(camera, (str) => console.log(str))
  const desktopControls = new VRDesktopControls(camera, renderer.domElement);
  desktopControls.lookAt(RADIUS, 100, 0);
  controls.push(desktopControls);

  // preload textures
  textures = await Promise.all([
    `${GLTF_PATH}/textures/body_diffuse.png`,
    `${GLTF_PATH}/textures/wing_diffuse.png`,
    `${GLTF_PATH}/textures/eyes_specularGlossiness.png`,
    `${GLTF_PATH}/textures/feather_specularGlossiness.png`,
    `${GLTF_PATH}/textures/material_specularGlossiness.png`,
    `${GLTF_PATH}/textures/peck_specularGlossiness.png`,
    `${GLTF_PATH}/textures/tongue_specularGlossiness.png`,
    `${GLTF_PATH}/textures/wing_specularGlossiness.png`
  ].map(s => {
    const t = new THREE.TextureLoader().load(s);
    t.outputEncoding = THREE.sRGBEncoding;
    return t;
  }));

  // Load GLTF File
  const loader = new THREE.GLTFLoader();
  loader.load(
    `${GLTF_PATH}/scene.gltf`,
    (gltf) => {
      for (let i = 0; i < SHOEBILL_COUNT; i++) {
        const clone = cloneGltf(gltf);
        const copy = clone.scene;
        copy.scale.set(100, 100, 100);

        copy.position.set(RADIUS * Math.cos(2 * Math.PI / SHOEBILL_COUNT * i), 0, RADIUS * Math.sin(2 * Math.PI / SHOEBILL_COUNT * i));
        copy.rotation.y = - 2 * Math.PI / SHOEBILL_COUNT * i - Math.PI / 2;

        copy.traverse((obj) => {
          if (obj.isMesh) setupShobillGlTF(obj);
        });

        // setup animation
        const mixer = new THREE.AnimationMixer(copy);
        const animation = clone.animations.find(a => a.name === 'Shoebill_idle');
        const action = mixer.clipAction(animation);
        action.setLoop(THREE.LoopRepeat);
        action.clampWhenFinished = true;
        action.play();

        mixers.push(mixer);

        scene.add(copy);
      }
    },
    (error) => {
      // console.log('An error happened');
      // console.log(error);
    }
  );

  // setup light
  const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.1);
  scene.add(ambientLight);
  // スポットライト光源を作成
  // new THREE.SpotLight(色, 光の強さ, 距離, 照射角, ボケ具合, 減衰率)
  const light = new THREE.SpotLight(0xFFFFFF, 3, RADIUS * 2, Math.PI / 5, 10, 0.5);
  light.position.set(0, 100, -10);
  light.target = camera;
  scene.add(light);
  lightHelper = new THREE.SpotLightHelper(light);
  scene.add(lightHelper);

  // for debug
  const axis = new THREE.AxesHelper(1000);
  scene.add(axis);

  clock = new THREE.Clock();
  render();
}

const render = () => {
  const delta = clock.getDelta();

  if (controls.length) {
    Promise.all(controls.map(c => new Promise(() => c.update(delta))));
  }

  if (mixers.length) {
    Promise.all(mixers.map(m => new Promise(() => m.update(delta))));
  }

  // ヘルパーを更新
  lightHelper.update();

  requestAnimationFrame(render);

  manager.render(scene, camera);
}

const setupShobillGlTF = (obj) => {
  const material = obj.material;
  textures.forEach(t => {
    material.specularMap = t;
    material.glossinessMap = t;
  })
  if (material.name === 'eyelens') {
    material.opacity = 0.5;
    material.transparent = true;
  }
}

// const updateOrientationControls = (e) => {
//   if (!e.alpha) { return; }
//   const control = new THREE.DeviceOrientationControls(camera, true);
//   control.connect();
//   control.update();
//   window.removeEventListener('deviceorientation', updateOrientationControls, true);
// }

window.addEventListener('DOMContentLoaded', init);
// window.addEventListener('deviceorientation', updateOrientationControls, true);