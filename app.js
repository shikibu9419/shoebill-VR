import 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r123/three.min.js';
import 'https://cdn.jsdelivr.net/npm/webvr-boilerplate@latest/build/webvr-manager.min.js';
import 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r123/examples/js/loaders/GLTFLoader.js';
import './threejs/VRControls.js';
import './threejs/VREffect.js';
import './webvr-boilerplate/webvr-polyfill.js';
import { VRButton } from './threejs/VRButton.js';
import { cloneGltf } from './cloneGLTF.js';
import { VRDesktopControls } from './VRDesktopControls.js';
import { SHOEBILL_COUNT, RADIUS } from './utils.js';
import * as kagome from './kagome.js'

let situation = kagome;

const GLTF_PATH = 'shoebill';

const mixers = [];
const controls = [];
let animations = {};
let textures = [];
const shoebills = [];
let clock, manager, scene, camera;

let light, lightHelper;

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
  camera.position.y = 100;

  // for VR
  const effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);
  manager = new WebVRManager(renderer, effect);

  // setup controls
  // const vrControls = new THREE.VRControls(camera, (str) => console.log(str))
  const desktopControls = new VRDesktopControls(camera, renderer.domElement);
  desktopControls.lookAt(0, 100, RADIUS);
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
      animations = gltf.animations.reduce((acc, cur) => ({ ...acc, [cur.name]: cur }), {});

      for (let i = 0; i < SHOEBILL_COUNT; i++) {
        const clone = cloneGltf(gltf);
        const copy = clone.scene;
        copy.scale.set(100, 100, 100);

        situation.shoebillPosition(copy, i);
        // copy.rotation.y = phi + Math.PI;

        copy.traverse((obj) => {
          if (obj.isMesh) setupShobillGlTF(obj);
        });

        mixers.push(new THREE.AnimationMixer(copy));

        shoebills.push(copy);
        scene.add(copy);
      }
      animate();
    },
    (error) => {
      // console.log('An error happened');
      // console.log(error);
    }
  );

  // setup light
  light = new THREE.SpotLight(0xFFFFFF, 1, RADIUS * 5, Math.PI / 5, 10, 0.8);
  light.target = camera;
  scene.add(light);

  // for debug
  const axis = new THREE.AxesHelper(1000);
  scene.add(axis);
  // lightHelper = new THREE.SpotLightHelper(light);
  // scene.add(lightHelper);

  clock = new THREE.Clock();

  render();
}

const animate = () => {
  const flying = animations.Shoebill_fly;
  const flyEnd = animations.Shoebill_fly_end;
  const animation = animations.Shoebill_walk;
  mixers.forEach(m => {
    const flyAction = m.clipAction(flying).setLoop(THREE.LoopOnce);
    const flyEndAction = m.clipAction(flyEnd).setLoop(THREE.LoopOnce);
    const action = m.clipAction(animation).setLoop(THREE.LoopRepeat);
    action.play();
    // // action.setLoop(THREE.LoopRepeat);
    // // action.clampWhenFinished = true;
    // // flyAction.crossFadeTo(flyEndAction, flying.duration).crossFadeTo(action, flyEnd.duration).play();
    // m.addEventListener('finished', (e) => {
    //   console.log(e)
    //   console.log(e.action._clip.name)
    //   const action = m.clipAction(animation);
    //   action.setDuration(3).play();
    // })
    // m.addEventListener('loop', (e) => {
    //   console.log(e)
    //   console.log(e.action._clip.name)
    // })
  })
}

const render = () => {
  const delta = clock.getDelta();

  if (controls.length) {
    Promise.all(controls.map(c => new Promise(() => c.update(delta))));
  }

  if (mixers.length) {
    Promise.all(mixers.map(m => new Promise(() => {
      m.update(delta);
      // console.log(m.time, m.timeScale, m)
    })));
  }

  if (shoebills.length) {
    Promise.all(shoebills.map((s) => new Promise(situation.shoebillMovement(s, delta))))
  }

  const cameraTargetPos = controls[0].targetPosition;
  light.position.set(-cameraTargetPos.x * 10, 100 + (100 - cameraTargetPos.y) * 10, -cameraTargetPos.z * 10);

  // lightHelper.update();

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

const updateOrientationControls = (e) => {
  if (!e.alpha) { return; }
  const control = new THREE.DeviceOrientationControls(camera, true);
  control.connect();
  control.update();
  window.removeEventListener('deviceorientation', updateOrientationControls, true);
}

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('deviceorientation', updateOrientationControls, true);