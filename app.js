import 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r123/three.min.js';
import 'https://cdn.jsdelivr.net/npm/webvr-boilerplate@latest/build/webvr-manager.min.js';
import 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r123/examples/js/loaders/GLTFLoader.js';
import './threejs/VRControls.js';
import './threejs/VREffect.js';
import './webvr-boilerplate/webvr-polyfill.js';
import { VRButton } from './threejs/VRButton.js';
import { cloneGltf } from './cloneGLTF.js';
import { VRDesktopControls } from './VRDesktopControls.js';
import { getRandomInt, SHOEBILL_COUNT, RADIUS } from './utils.js';
import * as kagome from './kagome.js'

let situation = kagome;

const GLTF_PATH = 'shoebill';

const mixers = [];
const controls = [];
let animations = {};
let textures = [];
const shoebills = [];
const flyings = [];
const landings = [];
let clock, renderer, manager, scene, camera, gltf, light;
let totalTime = 0;
let eventsCount = 1;

const init = async () => {
  // setup renderer
  renderer = new THREE.WebGLRenderer({
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
    (origin) => {
      gltf = origin;

      animations = gltf.animations.reduce((acc, cur) => ({ ...acc, [cur.name]: cur }), {});

      for (let i = 0; i < SHOEBILL_COUNT; i++) {
        const copy = cloneGltf(gltf);
        copy.scale.set(100, 100, 100);

        situation.shoebillPosition(copy, i);
        // copy.rotation.y = phi + Math.PI;

        copy.traverse((obj) => {
          if (obj.isMesh) setupShobillGLTF(obj);
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
  light = new THREE.SpotLight(0xFFFFFF, 2, RADIUS * 5, Math.PI / 5, 10, 0.8);
  light.target = camera;
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xFFFFFF, 0.3));

  // var size = 10000;
  // var step = 100;

  // var gridHelper = new THREE.GridHelper(size, step);
  // scene.add(gridHelper);

  clock = new THREE.Clock();

  onResize();
  render();
}

const animate = () => {
  const animation = animations.Shoebill_walk;
  mixers.forEach(m => {
    const action = m.clipAction(animation).setLoop(THREE.LoopRepeat);
    action.play();
  })
}

const addShoebill = () => {
  if (!gltf) {
    return;
  }

  const flyAway = !getRandomInt(10);

  const copy = cloneGltf(gltf);
  const scale = getRandomInt(20) + 80;
  copy.scale.set(scale, scale, scale);

  let radius = getRandomInt(RADIUS * 4) + RADIUS;
  const theta = 2 * Math.PI * (Math.random());

  copy.rotation.y = theta + Math.PI;
  copy.position.setFromCylindricalCoords(1000, theta, 200);

  copy.flyAway = flyAway;
  copy.destination = { radius, theta };

  copy.traverse((obj) => {
    if (obj.isMesh) setupShobillGLTF(obj);
  });

  const mixer = new THREE.AnimationMixer(copy);
  const animation = animations.Shoebill_fly;
  const flyEnd = animations.Shoebill_fly_end;
  const idle = animations.Shoebill_idle;
  const action = mixer.clipAction(animation).setLoop(THREE.LoopRepeat);
  mixer.clipAction(flyEnd).setLoop(THREE.LoopOnce);
  mixer.clipAction(idle).setLoop(THREE.LoopRepeat);
  action.play();

  mixers.push(mixer);
  flyings.push(copy);
  scene.add(copy);
}

const render = () => {
  const delta = clock.getDelta();
  totalTime += delta;
  const fps = !delta ? 100 : 1 / delta;

  if (totalTime > 10 * eventsCount && fps > 40) {
    addShoebill();
    eventsCount++;
  }

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
  if (flyings.length) {
    Promise.all(flyings.map((s, index) => new Promise(() => {
      const r = Math.sqrt(Math.pow(s.position.x, 2) + Math.pow(s.position.z, 2));

      if (s.flyAway) {
        if (r > 1100) {
          s.clear();
          flyings.splice(index, 1);
        }
        s.position.add(new THREE.Vector3(-50 * delta * Math.sin(s.destination.theta), 0, -50 * delta * Math.cos(s.destination.theta)))
        return;
      }

      if (r - s.destination.radius > 50) {
        s.position.setFromCylindricalCoords(r - delta * 50, s.destination.theta, 200);
      } else {
        const mixer = mixers.find(m => m._root.uuid === s.uuid);
        const newAction = mixer.existingAction(animations.Shoebill_fly_end);
        mixer.existingAction(animations.Shoebill_fly).crossFadeTo(newAction, 1);
        newAction.play();
        flyings.splice(index, 1);
        landings.push(s);
      }
    })))
  }
  if (landings.length) {
    Promise.all(landings.map((s, index) => new Promise(() => {
      const newY = s.position.y - delta * 50;
      if (newY >= 0) {
        s.position.y = newY;
      } else {
        s.position.y = 0;
        const mixer = mixers.find(m => m._root.uuid === s.uuid);
        const oldAction = mixer.existingAction(animations.Shoebill_fly_end);
        const newAction = mixer.existingAction(animations.Shoebill_idle);
        oldAction.crossFadeTo(newAction, 3);
        newAction.play();
        landings.splice(index, 1);
      }
    })))
  }

  const cameraTargetPos = controls[0].targetPosition;
  light.position.set(-cameraTargetPos.x * 10, 100 + (100 - cameraTargetPos.y) * 10, -cameraTargetPos.z * 10);

  requestAnimationFrame(render);

  manager.render(scene, camera);
}

const setupShobillGLTF = (obj) => {
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
window.addEventListener('resize', onResize);

function onResize() {
  // サイズを取得
  const width = window.innerWidth;
  const height = window.innerHeight;

  // レンダラーのサイズを調整する
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);

  // カメラのアスペクト比を正す
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}