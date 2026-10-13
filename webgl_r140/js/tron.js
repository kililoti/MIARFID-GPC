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

const largo_arena= 100;
const alto_pared = 20;

// 2-light cycle
var pos_cycle= new THREE.Vector3(0, 0, 0);
var light_cycle= null;

var angulo= 0;
var velocity= new THREE.Vector3(0, 0, 0);

const controls= {
  moveLeft: false,
  moveRight: false,
  speed: 0.5
};

// 3-cámara
var distancia_camara= 7;
var altura_camara= 2.5;
var desfase_lookat_y= 1.95;

// 4-colisiones
constraycaster = new THREE.Raycaster();
varobjectsToCheck = [];
varjuegoTerminado = false;

document.addEventListener('keydown', (event) => {
  if(event.code === 'ArrowLeft' || event.code=== 'KeyA')
    controls.moveLeft = true;
  if(event.code === 'ArrowRight' || event.code === 'KeyD')
    controls.moveRight = true;
});

document.addEventListener('keyup', (event) => {
  if(event.code === 'ArrowLeft' || event.code === 'KeyA')
    controls.moveLeft= false;
  if(event.code === 'ArrowRight' || event.code === 'KeyD')
    controls.moveRight = false;
});

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
  //camera.position.set(10, 10, 10);
  
  camera.position.set(
    largo_arena/ 2 + 10,
    45,
    largo_arena/ 2 + 10
  );

  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  //cameraControls.target.set(0, 0, 0);
  cameraControls.target.set(0, 4, 0);
  cameraControls.enableKeys = false;
  cameraControls.enabled= false;



  window.addEventListener('resize', updateAspectRatio);
}

function loadScene()
{
  // TODO: construir aqui el escenario, las motos y las luces.
  // Para cargar modelos podremos crear:
  //   var loaderGLTF = new THREE.GLTFLoader();
  //   var loaderFBX = new THREE.FBXLoader();

  var geometriaSuelo= new THREE.PlaneGeometry(
    largo_arena + 50,
    largo_arena + 50
  );

  var materialSuelo= new THREE.MeshBasicMaterial({
    color: 0x101820,
    side: THREE.DoubleSide
  });

  var suelo = new THREE.Mesh(geometriaSuelo, materialSuelo);
  suelo.rotation.x = -Math.PI/ 2;
  scene.add(suelo);

  var geometriaPared = new THREE.CylinderGeometry(
    largo_arena/ 2,
    largo_arena / 2 -10,
    alto_pared,
    64, 1, true
  );

  var materialPared = new THREE.MeshBasicMaterial({
    color: 0x003344,
    side: THREE.DoubleSide
  });

  var pared = new THREE.Mesh(geometriaPared, materialPared);
  pared.position.y = alto_pared / 2;
  objectsToCheck.push(pared);
  scene.add(pared);

  var geometriaFoco= new THREE.BoxGeometry(1.6, 0.5, 0.8);
  var materialFoco= new THREE.MeshBasicMaterial({ color: 0xccffff });
  var radioFocos= 48;
  var alturaFocos= 18;

  for(var grados = 0; grados < 360; grados += 15) {
    var a = THREE.MathUtils.degToRad(grados);
    var foco = new THREE.Mesh(geometriaFoco, materialFoco);
    foco.position.set(
    Math.cos(a) * radioFocos,
    alturaFocos,
    Math.sin(a) * radioFocos
    );

    foco.lookAt(0, alturaFocos, 0);
    scene.add(foco);
  }

  loadLightCycle();
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update()
{
  if(light_cycle=== null) //Se coloca esto para asegurarse de que no se cargue antes de que se haya cargado la moto. Si hay varios modelos, se puede poner un contador o apuntarse estados
    return;

  cameraControls.update();

  // Preparado para una posible animacion FBX, sin resolverla en la plantilla.
  var delta = clock.getDelta();
  if (mixer !== null) mixer.update(delta);

  if (controls.moveLeft)  angulo += 0.05;
  if (controls.moveRight) angulo-= 0.05;

  //Se le añade el Math.PI/2 para girar el modelo, ya que el modelo originalmente está hecho en el sentido x
  light_cycle.rotation.y = angulo + Math.PI/ 2;

  velocity.set(
    Math.sin(angulo),
    0,
    Math.cos(angulo)
  );

  if(juegoTerminado)
    return;
    var origenRayo= pos_cycle.clone();
    origenRayo.y += 0.5;
    raycaster.set(origenRayo, velocity);
    var intersects= raycaster.intersectObjects(
    objectsToCheck,
    true
  );

  if(
    intersects.length > 0 &&
    intersects[0].distance<= controls.speed + 0.5
    ) {
    juegoTerminado = true;
    alert('Perdiste');
    return;
  }

  pos_cycle.addScaledVector(velocity, controls.speed);
  light_cycle.position.copy(pos_cycle);

  updateCamera();
}

function render()
{
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
}

function loadLightCycle() {
  var loader = new THREE.GLTFLoader();

  loader.load(
    'models/tron/scene.gltf',
    function(gltf) { //De forma asincrona carga el modelo, lo coloca en la posición y le da una escala. Tras ello lo añade a la escena.
      light_cycle = gltf.scene;
      light_cycle.position.copy(pos_cycle);
      light_cycle.scale.set(0.5, 0.5, 0.5);
      scene.add(light_cycle);
    },
    undefined,
    function(error) {
      console.error('No se pudo cargar el light cycle', error);
    }
  );
}

function updateCamera() {
  var newPosition = new THREE.Vector3().addVectors( //Posicion de la camara = posicion de la moto - dirección de movimiento de la motot (para estar destrás de la moto en vez de arriba)
    light_cycle.position,
    velocity.clone().multiplyScalar(-distancia_camara)
  );

  //Se coloca la camara un poco movida para dar sensacion de profundidad
  camera.position.set(
    newPosition.x-2,
    newPosition.y+ altura_camara,
    newPosition.z-2
  );

  var objetivo = light_cycle.position.clone();
  objetivo.y += desfase_lookat_y;
  camera.lookAt(objetivo);
}