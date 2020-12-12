import 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r123/three.min.js';
import 'https://cdn.jsdelivr.net/npm/webvr-boilerplate@latest/build/webvr-manager.min.js';
import 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r123/examples/js/loaders/GLTFLoader.js';
import './threejs/VRControls.js';
import './threejs/VREffect.js';
import './webvr-boilerplate/webvr-polyfill.js';
import { VRButton } from './threejs/VRButton.js';
import { VRDesktopControls } from './VRDesktopControls.js';

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('deviceorientation', updateOrientationControls, true);

let camera = null;
let controls;
const RADIUS = 150
const SHOEBILL_COUNT = 4;
const GLTF_PATH = 'shoebill';

function updateOrientationControls(e) {
  if (!e.alpha) { return; }
  controls = new THREE.DeviceOrientationControls(camera, true);
  controls.connect();
  controls.update();
  window.removeEventListener('deviceorientation', updateOrientationControls, true);
}

function init() {
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

  const mixers = [];
  let clock = new THREE.Clock();

  // setup scene
  const scene = new THREE.Scene();

  // setup camera
  camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  camera.position.x = 0;
  camera.position.y = 100;

  // const vrControls = new THREE.VRControls(camera, (str) => console.log(str))
  const desktopControls = new VRDesktopControls(camera, renderer.domElement);
  desktopControls.lookAt(RADIUS, 100, 0);

  const effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);
  const manager = new WebVRManager(renderer, effect);

  // preload textures
  const textures = [
    `${GLTF_PATH}/textures/body_diffuse.png`,
    `${GLTF_PATH}/textures/wing_diffuse.png`,
    `${GLTF_PATH}/textures/eyes_specularGlossiness.png`,
    `${GLTF_PATH}/textures/feather_specularGlossiness.png`,
    `${GLTF_PATH}/textures/material_specularGlossiness.png`,
    `${GLTF_PATH}/textures/peck_specularGlossiness.png`,
    `${GLTF_PATH}/textures/tongue_specularGlossiness.png`,
    `${GLTF_PATH}/textures/wing_specularGlossiness.png`
  ].map(s => {
    const t = new THREE.TextureLoader().load(s)
    t.outputEncoding = THREE.sRGBEncoding
    return t
  })

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
          if (obj.isMesh) {
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
      console.log('An error happened');
      console.log(error);
    }
  );

  // setup light
  const light = new THREE.AmbientLight(0xFFFFFF, 1.0);
  scene.add(light);

  // for debug
  const axis = new THREE.AxesHelper(1000);
  scene.add(axis);

  render();

  function render() {
    const delta = clock.getDelta();

    // vrControls.update();
    desktopControls.update(delta);

    requestAnimationFrame(render);

    if (mixers.length) {
      Promise.all(mixers.map(m => new Promise(() => m.update(delta))));
    }

    manager.render(scene, camera);
  }
}

const cloneGltf = (gltf) => {
  const clone = {
    animations: gltf.animations,
    scene: gltf.scene.clone(true)
  };

  const skinnedMeshes = {};

  gltf.scene.traverse(node => {
    if (node.isSkinnedMesh) {
      skinnedMeshes[node.name] = node;
    }
  });

  const cloneBones = {};
  const cloneSkinnedMeshes = {};

  clone.scene.traverse(node => {
    if (node.isBone) {
      cloneBones[node.name] = node;
    }

    if (node.isSkinnedMesh) {
      cloneSkinnedMeshes[node.name] = node;
    }
  });

  for (let name in skinnedMeshes) {
    const skinnedMesh = skinnedMeshes[name];
    const skeleton = skinnedMesh.skeleton;
    const cloneSkinnedMesh = cloneSkinnedMeshes[name];

    const orderedCloneBones = [];

    for (let i = 0; i < skeleton.bones.length; ++i) {
      const cloneBone = cloneBones[skeleton.bones[i].name];
      orderedCloneBones.push(cloneBone);
    }

    cloneSkinnedMesh.bind(
        new THREE.Skeleton(orderedCloneBones, skeleton.boneInverses),
        cloneSkinnedMesh.matrixWorld);
  }

  return clone;
}
