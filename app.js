import 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r123/three.min.js';
import 'https://cdn.jsdelivr.net/npm/webvr-boilerplate@latest/build/webvr-manager.min.js';
import 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r123/examples/js/loaders/GLTFLoader.js';
import './threejs/VRControls.js';
import './threejs/VREffect.js';
import './webvr-boilerplate/webvr-polyfill.js';
import { VRButton } from './threejs/VRButton.js';
import VRDesktopControls from './VRDesktopControls.js';

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('deviceorientation', updateOrientationControls, true);

let camera = null;
let controls;
const RADIUS = 150

function updateOrientationControls(e) {
  if (!e.alpha) { return; }
  controls = new THREE.DeviceOrientationControls(camera, true);
  controls.connect();
  controls.update();
  window.removeEventListener('deviceorientation', updateOrientationControls, true);
}

function init() {
  // レンダラーを作成
  const renderer = new THREE.WebGLRenderer({
    canvas: document.querySelector('#canvas'),
  });
  // ウィンドウサイズ設定
  const width = document.getElementById('main_canvas').getBoundingClientRect().width;
  const height = document.getElementById('main_canvas').getBoundingClientRect().height;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  document.body.appendChild(VRButton.createButton(renderer))
  // const polyfill = new WebVRPolyfill();
//   console.log(window.devicePixelRatio);
//   console.log(width + ', ' + height);

  // immediately use the texture for material creation
  // const material = new THREE.MeshBasicMaterial( { map: texture } );

  // console.log(texture, material)

  // console.log(THREE.ShaderChunk.specularmap_fragment)

  let mixer;
  let clock = new THREE.Clock();

  // シーンを作成
  const scene = new THREE.Scene();

  // カメラを作成
  camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
  camera.position.x = 0;
  camera.position.y = 100;
  // camera.rotation.y = 180;
  // camera.lookAt(0)
  // const cameraContainer = new THREE.Object3D();

  // // カメラをコンテナに追加
  // cameraContainer.add(camera);

  // // カメラ用コンテナをsceneに追加
  // scene.add(cameraContainer);

  // // コンテナに対して座標を設定することでカメラの座標を変更可能
  // cameraContainer.position.x = 150;
  // cameraContainer.position.y = 200;

  // const controls = new THREE.OrbitControls(camera, renderer.domElement);
  // controls.movementSpeed = 1000;
  // controls.lookSpeed = 0.1;
  // const vrControls = new THREE.VRControls(camera, (str) => console.log(str))
  const orbitControls = new VRDesktopControls(camera, renderer.domElement)
  // controls = orbitControls
  // controls.addEventListener( 'lock', function () {
  //   console.log('locked')
  // } );

  // controls.addEventListener( 'unlock', function () {
  //   console.log('unlocked')
  // } );

  // document.addEventListener( 'click', function () {
  //   controls.lock();
  // }, false );
  orbitControls.lookAt(RADIUS, 100, 0)

  var effect = new THREE.VREffect(renderer);
  effect.setSize(window.innerWidth, window.innerHeight);

  const manager = new WebVRManager(renderer, effect);

  // Load GLTF or GLB
  const loader = new THREE.GLTFLoader();
  const url = 'shoebill/scene.gltf';
  // const loader = new THREE.FBXLoader();
  // const url = 'fbx/Shoebill_model.FBX';
  
  let model = null;
  loader.load(
    url,
    function (gltf) {
      console.log(gltf)
      const count = 4;
      // const copy = gltf;
      // copy.scale.set(1, 1, 1);

      // model = gltf.scene;
      // console.log(model)
      for (let i = 0; i < count; i++) {
        // model.name = 'model_with_cloth';
        const clone = cloneGltf(gltf);
        const copy = clone.scene;
        copy.scale.set(100, 100, 100);
        // console.log(copy)
        copy.rotation.y = - 2 * Math.PI / count * i - Math.PI / 2;
        console.log(i, copy.rotation.y)
        // copy.position.set(RADIUS, 0, 0);
        copy.position.set(RADIUS * Math.cos(2 * Math.PI / count * i), 0, RADIUS * Math.sin(2 * Math.PI / count * i));

        // let texture = null
        // texture = new THREE.TextureLoader().load('textures/body_diffuse.png');
        // texture.outputEncoding = THREE.sRGBEncoding;
        //   console.log(texture)

        const textures = [
          // 'fbx/shoebill_bump.png',
          // 'fbx/shoebill_spec.png',
          // 'fbx/shoebill_sub.png',
          // 'fbx/shoebill_diff.png',
          'shoebill/textures/body_diffuse.png',
          'shoebill/textures/wing_diffuse.png',
          'shoebill/textures/eyes_specularGlossiness.png',
          'shoebill/textures/feather_specularGlossiness.png',
          'shoebill/textures/material_specularGlossiness.png',
          'shoebill/textures/peck_specularGlossiness.png',
          'shoebill/textures/tongue_specularGlossiness.png',
          'shoebill/textures/wing_specularGlossiness.png'
        ].map(s => {
          const t = new THREE.TextureLoader().load(s)
          t.outputEncoding = THREE.sRGBEncoding
          return t
        })
        // console.log(textures)

        copy.traverse((obj) => {
          if (obj.isMesh) {
            const material = obj.material
            textures.forEach(t => {
              material.specularMap = t
              material.glossinessMap = t
            })
            if (material.name === 'eyelens') {
              // obj.material.visible = false
              obj.material.opacity = 0.5
              obj.material.transparent = true
            }
            // material.forEach(mat => {
            //   mat.bumpMap = textures[0]
            //   mat.specularMap = textures[1]
            //   mat.map = textures[2]
            //   mat.normalMap = textures[3]
            // })
            // console.log(material)

            // texture = new THREE.TextureLoader().load('textures/body_diffuse.png');
            // texture.outputEncoding = THREE.sRGBEncoding;
            // material.map = texture

            // texture = new THREE.TextureLoader().load('textures/wing_diffuse.png');
            // texture.outputEncoding = THREE.sRGBEncoding;
            // material.map = texture

            // const shader = new THREE.ShaderMaterial({
            //   fragmentShader: document.getElementById('fragmentShader').textContent,
            //   uniforms: {
            //     specular: { value: material.specular },
            //     specularMap: { value: material.specularMap },
            //     glossiness: { value: material.glossiness },
            //     glossinessMap: { value: material.glossinessMap },
            //   }
            // })

            // console.log(shader)
          }
        })

        // // Animation Mixerインスタンスを生成
        // mixer = new THREE.AnimationMixer(copy);

        // //Animation Actionを生成
        // const animation = gltf.animations.find(a => a.name === 'Shoebill_idle')
        // // console.log(animation)
        // let action = mixer.clipAction(animation);

        // //ループ設定
        // action.setLoop(THREE.LoopRepeat);

        // //アニメーションの最後のフレームでアニメーションが終了
        // action.clampWhenFinished = true;

        // //アニメーションを再生
        // action.play();
        // console.log(copy)
        scene.add(copy);
      }
    },
    function (error) {
      console.log('An error happened');
      console.log(error);
    }
  );
  renderer.outputEncoding = THREE.sRGBEncoding;
  // renderer.gammaOutput = true;
  // renderer.gammaFactor = 2.2;

  const light = new THREE.AmbientLight(0xFFFFFF, 1.0);
  scene.add(light);
  // // 平行光源
  // const light = new THREE.DirectionalLight(0xFFFFFF);
  // // light.intensity = 2; // 光の強さを倍に
  // light.position.set(1, 1, 1);
  // // シーンに追加
  // scene.add(light);

  const axis = new THREE.AxesHelper(1000);
  scene.add(axis)

  // renderer.xr.enabled = true;

  // 初回実行
  tick();

  function tick() {
    const r = 400;
    // vrControls.update();
    orbitControls.update(clock.getDelta());
    // pointerLockUpdate(orbitControls, clock.getDelta())

    // if (model != null) {
    //   console.log(model);
    // }
    // renderer.render(scene, camera);
    // camera.lookAt(200, 0, 0)

    requestAnimationFrame(tick);

    // camera.lookAt(r * Math.sin(2 * Math.PI / 360 * i), r * Math.cos(2 * Math.PI / 360 * i) + r, 0)
    // i++;
    // console.log(i)
    // camera.lookAt(0)

    if(mixer) {
      mixer.update(clock.getDelta());
    }

    manager.render(scene, camera)
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
