/*
 * Seminario practico: Tron Battle Grid
 *
 * Punto de partida copiado de js/base-sample.js (usado por ej-base.html).
 * Se han dejado tambien disponibles GLTFLoader y FBXLoader siguiendo
 * js/ej-loader.js y js/ej-loader-FBX.js, pero aqui no se carga ningun modelo:
 * esa parte se construira durante el seminario.
 */

// Variables globales basicas de cualquier ejemplo Three.js del curso.
var renderer, scene, camera;
var cameraControls;

// Nos servira mas adelante si incorporamos modelos animados.
var mixer = null;
var clock = new THREE.Clock();

init();
loadScene();
render();

function init()
{
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x000000));
  document.getElementById('container').appendChild(renderer.domElement);

  scene = new THREE.Scene();

  // Iluminacion basica incluida en la plantilla.
  var luzAmbiente = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(luzAmbiente);

  var luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
  luzDireccional.position.set(30, 50, 20);
  scene.add(luzDireccional);

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera(50, aspectRatio, 0.1, 1000);
  camera.position.set(10, 10, 10);

  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 0, 0);

  window.addEventListener('resize', updateAspectRatio);
}

function loadScene()
{
  // TODO: construir aqui el escenario, las motos y las luces.
  // Para cargar modelos podremos crear:
  //   var loaderGLTF = new THREE.GLTFLoader();
  //   var loaderFBX = new THREE.FBXLoader();
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update()
{
  cameraControls.update();

  // Preparado para una posible animacion FBX, sin resolverla en la plantilla.
  var delta = clock.getDelta();
  if (mixer !== null) mixer.update(delta);
}

function render()
{
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
}
