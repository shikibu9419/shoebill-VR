import 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r123/three.min.js';
import 'https://cdn.jsdelivr.net/npm/webvr-boilerplate@latest/build/webvr-manager.min.js';
import 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r123/examples/js/loaders/GLTFLoader.js';
import 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r123/examples/js/controls/DeviceOrientationControls.js';
import './threejs/VRControls.js';
import './threejs/VREffect.js';
import './webvr-boilerplate/webvr-polyfill.js';
import { VRButton } from './threejs/VRButton.js';
import { cloneGltf } from './cloneGLTF.js';
import { VRDesktopControls } from './VRDesktopControls.js';
import { getRandomInt, SHOEBILL_COUNT, RADIUS } from './utils.js';
import * as kagome from './kagome.js'

let situation = kagome;
const EGGPLANT_PATH = 'eggplant';
const SHOEBILL_PATH = 'shoebill';

const bgm = document.getElementById('bgm');
bgm.loop = true;
bgm.volume = 0;

let initialized = false;
let idling = true;
let starting = true;
let firstPhi = 0;

const mixers = [];
const controls = [];
let animations = {};
let textures = [];
const eggplants = [];
const shoebills = [];
const flyings = [];
const landings = [];
let clock, renderer, manager, scene, camera, gltf, eggplant, light;
let totalTime = 0;
let eventsCount = 0;
let baseScale = 100;
let offSetRad = 0;

const updateLight = () => {
  if (!light) return;

  if (controls.length > 1) {
    const lightDirection = new THREE.Euler().setFromQuaternion(camera.quaternion)
    light.position.set(camera.position.x, camera.position.y, camera.position.z)
    light.setRotationFromEuler(lightDirection)
  } else {
    const cameraTargetPos = controls[0].targetPosition;
    light.position.set(-cameraTargetPos.x * 10, 100 + (100 - cameraTargetPos.y) * 10, -cameraTargetPos.z * 10);
  }
}

const main = async () => {
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
  const desktopControls = new VRDesktopControls(camera, renderer.domElement);
  desktopControls.lookAt(0, 100, RADIUS);
  controls.push(desktopControls);

  // preload textures
  textures = await Promise.all([
    `${SHOEBILL_PATH}/textures/body_diffuse.png`,
    `${SHOEBILL_PATH}/textures/wing_diffuse.png`,
    `${SHOEBILL_PATH}/textures/eyes_specularGlossiness.png`,
    `${SHOEBILL_PATH}/textures/feather_specularGlossiness.png`,
    `${SHOEBILL_PATH}/textures/material_specularGlossiness.png`,
    `${SHOEBILL_PATH}/textures/peck_specularGlossiness.png`,
    `${SHOEBILL_PATH}/textures/tongue_specularGlossiness.png`,
    `${SHOEBILL_PATH}/textures/wing_specularGlossiness.png`
  ].map(s => {
    const t = new THREE.TextureLoader().load(s);
    t.outputEncoding = THREE.sRGBEncoding;
    return t;
  }));

  // setup light
  light = new THREE.SpotLight(0xFFFFFF, 3, RADIUS * 5, Math.PI / 5, 10, 0.8);
  light.target = camera;
  scene.add(light);
  scene.add(new THREE.AmbientLight(0xFFFFFF, 0.3));
  updateLight();

  if (!getRandomInt(10)) {
    offSetRad = Math.PI / 2;
  }

  clock = new THREE.Clock();
  onResize();
  render();
}

const init = () => {
  if (initialized) return;

  initialized = true;
  document.getElementById('screen-loading').classList.add('active');

  // Load GLTF File
  const loader = new THREE.GLTFLoader();
  loader.load(`${EGGPLANT_PATH}/scene.gltf`, (origin) => {
    eggplant = origin;
  });
  loader.load(
    `${SHOEBILL_PATH}/scene.gltf`,
    (origin) => {
      document.getElementById('screen').classList.remove('active');

      gltf = origin;

      animations = gltf.animations.reduce((acc, cur) => ({ ...acc, [cur.name]: cur }), {});

      const copy = cloneGltf(gltf);
      copy.scale.set(baseScale, baseScale, baseScale);
      situation.shoebillPosition(copy, 0);

      copy.rotation.y += Math.PI / 2;

      copy.traverse((obj) => {
        if (obj.isMesh) setupShobillGLTF(obj);
      });

      const mixer = new THREE.AnimationMixer(copy);
      const action = mixer.clipAction(animations.Shoebill_idle).setLoop(THREE.LoopRepeat);
      const nextAction = mixer.clipAction(animations.Shoebill_walk).setLoop(THREE.LoopRepeat);
      action.play();

      mixer.addEventListener('loop', (_) => {
        if (!idling) return;

        idling = false;

        action.crossFadeTo(nextAction, 1);
        nextAction.play();

        new THREE.TextureLoader().load('assets/fujisan_shikaku.png', (t) => {
          t.minFilter = THREE.LinearFilter;
          scene.background = t;
        });

        start();
      });

      mixers.push(mixer);

      shoebills.push(copy);
      scene.add(copy);
    }
  );
}

const start = () => Promise.all([...Array(SHOEBILL_COUNT - 1).keys()].map(i =>
  new Promise(() => {
    const copy = cloneGltf(gltf);
    copy.scale.set(baseScale, baseScale, baseScale);

    situation.shoebillPosition(copy, i + 1);
    copy.rotation.y += offSetRad

    copy.traverse((obj) => {
      if (obj.isMesh) setupShobillGLTF(obj);
    });

    const mixer = new THREE.AnimationMixer(copy);
    const action = mixer.clipAction(animations.Shoebill_walk).setLoop(THREE.LoopRepeat);
    action.play();

    mixers.push(mixer);
    mixer.update(0.0001);

    shoebills.push(copy);
    scene.add(copy);
  })
));

const addEggplant = () => {
  if (!eggplant) {
    return;
  }

  const copy = cloneGltf(eggplant);
  const scale = getRandomInt(20) + 80;
  copy.scale.set(scale, scale, scale);

  let radius = getRandomInt(RADIUS * 4) + RADIUS;
  const theta = 2 * Math.PI * (Math.random());

  copy.rotation.y = theta + Math.PI;
  copy.position.setFromCylindricalCoords(radius, theta, 500);

  eggplants.push(copy);
  scene.add(copy);
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

  if (totalTime > 10 * eventsCount) {
    if (!starting && fps > 40) {
      addEggplant();
      addShoebill();
    }

    eventsCount++;
  }

  if (mixers.length) {
    Promise.all(mixers.map(m => m.update(delta)));
  }

  if (starting) {
    if (!idling) {
      const s = shoebills[0];
      const rad = delta * Math.PI / 10;
      firstPhi += rad;
      if (firstPhi > Math.PI / 2 - offSetRad) {
        s.rotation.y = Math.PI / 2 + offSetRad;
        starting = false;
        bgm.pause();
        bgm.volume = 1.0;
        bgm.currentTime = 0;
        bgm.play();
      } else {
        s.rotation.y -= rad;
      }
    }

    requestAnimationFrame(render);
    manager.render(scene, camera);
    return;
  }

  if (controls.length) {
    Promise.all(controls.map(c =>
      new Promise((resolve) => {
        c.update(delta);
        resolve();
      })
    )).then(() => updateLight());
  }

  if (eggplants.length) {
    Promise.all(eggplants.map((e) => new Promise(() => {
      const newY = Math.max(e.position.y - delta * 100, 0);
      e.position.setY(newY)
    })))
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

const onResize = () => {
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

const updateOrientationControls = (e) => {
  if (!e.alpha || !initialized) { return; }
  const control = new THREE.DeviceOrientationControls(camera, true);
  control.connect();
  control.update();
  controls.push(control);
  camera.lookAt(0, 100, RADIUS);
  window.removeEventListener('deviceorientation', updateOrientationControls, true);
}

const onHandleClick = () => {
  var count = 0;
  return () => {
    count++;
    if (count < 10) {
      console.log(`${count}...`)
    } else if (starting) {
      offSetRad = Math.PI / 2;
      console.log('EXTRA MODE START!!')
    }
  }
}

window.addEventListener('DOMContentLoaded', main);
window.addEventListener('resize', onResize);
window.addEventListener('deviceorientation', updateOrientationControls, true);
document.getElementById('screen').addEventListener('click', init);
document.getElementById('screen').onclick = function () { bgm.play() }
document.getElementById('canvas-wrapper').addEventListener('click', onHandleClick());