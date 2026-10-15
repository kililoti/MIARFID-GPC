// ejemplo loader

var loader;
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var mixer = null;      // reproduce las animaciones del modelo

// 3- movimiento y camara en tercera persona (misma estructura que el proyecto Tron)
var slime = null;                              // grupo que contiene el modelo y se mueve por la escena
var tamano_slime = 1;                          // tamaño del modelo: el resto de medidas son proporcionales
var rotacion_frente = 0;                       // si el slime camina "de espaldas", pon Math.PI
var rotacion_visual = -0.01;                   // hacia donde mira el modelo (puede diferir de angulo)
const pos_slime = new THREE.Vector3();
const velocity = new THREE.Vector3(0, 0, 1);   // direccion hacia la que mira el slime

var distancia_camara = 2.5;                    // en tamaños de slime
var altura_camara = 1.2;
var desfase_lookat_y = 0.4;

// FINAL- spring camera. La rigidez atrae la camara hacia su posicion ideal y
// la amortiguacion frena su velocidad para que no oscile indefinidamente.
const rigidez_camara = 50;
const amortiguacion_camara = 14;
const velocidad_camara = new THREE.Vector3();
const velocidad_mirada_camara = new THREE.Vector3();
const posicion_objetivo_camara = new THREE.Vector3();
const mirada_objetivo_camara = new THREE.Vector3();
const mirada_actual_camara = new THREE.Vector3();
const aceleracion_camara = new THREE.Vector3();
let camara_spring_iniciada = false;

// DEBUG- permite cambiar entre tercera persona y camara orbital con la tecla C.
var camara_orbital = false;

const controls = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  speed: 1.5,          // tamaños de slime por segundo
  turnSpeed: 2.5       // radianes por segundo
};

document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      controls.moveForward = true;
      break;
    case 'ArrowDown':
    case 'KeyS':
      controls.moveBackward = true;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      controls.moveLeft = true;
      break;
    case 'ArrowRight':
    case 'KeyD':
      controls.moveRight = true;
      break;
  }
});

document.addEventListener('keyup', (event) => {
  switch (event.code) {
    case 'ArrowUp':
    case 'KeyW':
      controls.moveForward = false;
      break;
    case 'ArrowDown':
    case 'KeyS':
      controls.moveBackward = false;
      break;
    case 'ArrowLeft':
    case 'KeyA':
      controls.moveLeft = false;
      break;
    case 'ArrowRight':
    case 'KeyD':
      controls.moveRight = false;
      break;
    // DEBUG- cambio de camara.
    case 'KeyC':
      cambiarCamara();
      break;
  }
});

// Minimapa: camara cenital ortografica en la esquina superior izquierda
var cameraTop, cameraStencil;
var stencilScene, hudBorderScene;
var alcance_hud = 20;                          // lado (en unidades del mundo) que abarca el minimapa
const centro_hud = new THREE.Vector3(0, 10, 0); // punto sobre el que se coloca la camara cenital

const clock = new THREE.Clock();

init();
render();


function init()
{
    renderer = new THREE.WebGLRenderer();
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.setClearColor( new THREE.Color(0xFFFFFF) );
    renderer.outputEncoding = THREE.sRGBEncoding;          // salida en sRGB: colores correctos
    renderer.toneMapping = THREE.ACESFilmicToneMapping;     // brillos más suaves
    document.getElementById('container').appendChild( renderer.domElement );

    stats = new Stats();
    stats.showPanel(0); // FPS inicialmente. Picar para cambiar panel.
    document.getElementById('container').appendChild( stats.domElement );

    scene = new THREE.Scene();
    crearEntorno();                                         // reflejos para los materiales PBR

    // cargo el objeto
    loadObjGLTF();

    var aspectRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 1000 );
    camera.position.set( 10, 15, 20 );

    cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
    cameraControls.target.set( 0, 0, 0 );

    crearMinimapa();

    const light = new THREE.PointLight(0xffffff, 1, 50000000);
    light.position.set(50, 50, 50);
    scene.add(light);
    
    // O también una luz ambiental para afectar a todos los objetos de manera uniforme
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    window.addEventListener('resize', updateAspectRatio );
}

function loadObjGLTF()
{
    // Instantiate a loader
    loader = new THREE.GLTFLoader();

    // Optional: Provide a DRACOLoader instance to decode compressed mesh data
    //THREE.DRACOLoader.setDecoderPath( '/examples/js/libs/draco' );
    //loader.setDRACOLoader( new THREE.DRACOLoader() );
        // resource URL
        //'models/Buggy/glTF/Buggy.gltf',
        //'models/x-wing/scene.gltf',

    // Load a glTF resource
    //let model = 'models/duck/rubber_duck_toy_4k.gltf';
    //let model = 'models/police-car/scene.gltf';
    //let model = 'models/nave-espacial/nava_espacial_0907082510_refine.glb';
    //let model = 'models/angrybird/scene.gltf';
    //let model = 'models/steampunk/scene.gltf';
    //let model = 'models/cuchillos/scene.gltf';
    //let model = 'models/tree/scene.gltf';
    //let model = 'models/gar/scene.gltf';
    //let model = 'models/sombrero/fishermans_hat_4k.gltf';
    //let model = 'models/rata/street_rat_4k.gltf';
    let model = 'models/slime_gltf/scene.gltf';   // slime de Sketchfab (scene.bin y textures/ en la misma carpeta)

    // Para cambiar tamaño del modelo. Conseguir su dimensión más grande y dividirla por ello, eso hace que quede entre 0-1 y tras ello, multiplicarlo por lo deseado. por ejemplo, 0.15 es un 15% del tamaño original.
    loader.load(model,
        // called when the resource is loaded
        function ( gltf ) {

            var object = gltf.scene;

            // El modelo va dentro de un grupo: movemos y giramos el grupo, y el
            // modelo queda centrado dentro de él (más abajo)
            slime = new THREE.Group();
            slime.add(object);
            scene.add(slime);

            // Animaciones: un AnimationMixer reproduce los clips del modelo
            console.log('Animaciones:', gltf.animations);
            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(object);
                mixer.clipAction(gltf.animations[0]).play();
            }

            gltf.animations; // Array<THREE.AnimationClip>
            gltf.scene; // THREE.Scene
            gltf.scenes; // Array<THREE.Scene>
            gltf.cameras; // Array<THREE.Camera>
            gltf.asset; // Object


            // Vamos a ajustar la camara al tamaño del mesh que cargamos.

            // Calcular el bounding box del objeto
            var box = new THREE.Box3().setFromObject(object);

            // Obtener el tamaño del bounding box
            var size = new THREE.Vector3();
            box.getSize(size);

            // Obtener el centro del bounding box
            var center = new THREE.Vector3();
            box.getCenter(center);

            // Ajustar la posición de la cámara basándonos en el tamaño del objeto
            var maxDim = Math.max(size.x, size.y, size.z);
            var fov = camera.fov * (Math.PI / 180); // Convertir FOV a radianes
            var cameraDistance = maxDim / (2 * Math.tan(fov / 2));

            // Ajustar la posición de la cámara y sus planos near y far
            camera.position.set(center.x, center.y + cameraDistance, center.z + cameraDistance);
            camera.near = cameraDistance / 10; // Ajustar near
            camera.far = cameraDistance * 60;  // Ajustar far (lejos, para ver el suelo)
            camera.updateProjectionMatrix();

            // Ajustar el target de la cámara al centro del objeto
            cameraControls.target.copy(center);
            cameraControls.update();            

            // Ajustar la camara cenital al tamaño del modelo
            alcance_hud = maxDim * 6;      // abarca los alrededores del slime
            cameraTop.left = -alcance_hud / 2;
            cameraTop.right = alcance_hud / 2;
            cameraTop.top = alcance_hud / 2;
            cameraTop.bottom = -alcance_hud / 2;
            cameraTop.near = maxDim * 0.1;
            cameraTop.far = maxDim * 10;
            cameraTop.updateProjectionMatrix();
            centro_hud.set(0, size.y + maxDim, 0); // por encima del modelo (ya apoyado en y = 0)

            // Centramos el modelo dentro de su grupo y lo apoyamos en y = 0
            object.position.x -= center.x;
            object.position.z -= center.z;
            object.position.y -= box.min.y;
            tamano_slime = maxDim;

            // Suelo con rejilla: sin una referencia no se notaria que el slime avanza
            var suelo = new THREE.GridHelper(maxDim * 60, 60, 0x90a4ae, 0xb0bec5);
            scene.add(suelo);

            // A partir de ahora manda la camara en tercera persona
            cameraControls.enabled = false;


        },
        // called while loading is progressing
        function ( xhr ) {

            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

        },
        // called when loading has errors
        function ( error ) {

            console.log( 'An error happened' );

        }
    );  

}

// Mapa de entorno: un pequeño "estudio" (cielo degradado y dos paneles de luz)
// procesado con PMREMGenerator. Los materiales PBR lo usan para los reflejos,
// que es lo que da al slime el aspecto brillante y húmedo.
function crearEntorno()
{
  const estudio = new THREE.Scene();

  const geoCielo = new THREE.SphereGeometry( 10, 32, 16 );
  const pos = geoCielo.attributes.position;
  const colores = [];
  const arriba = new THREE.Color( 0.75, 0.85, 1.0 ), abajo = new THREE.Color( 0.12, 0.14, 0.18 ), c = new THREE.Color();
  for ( let i = 0; i < pos.count; i++ ) {
    c.copy( abajo ).lerp( arriba, THREE.MathUtils.clamp( pos.getY( i ) / 10 * 0.5 + 0.5, 0, 1 ) );
    colores.push( c.r, c.g, c.b );
  }
  geoCielo.setAttribute( 'color', new THREE.Float32BufferAttribute( colores, 3 ) );
  estudio.add( new THREE.Mesh( geoCielo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }) ) );

  // Paneles muy brillantes (valores > 1) que se reflejan como "ventanas" de luz
  const panel = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  panel.color.setScalar( 6 );
  const p1 = new THREE.Mesh( new THREE.PlaneGeometry( 5, 3 ), panel );
  p1.position.set( 4, 6, 5 );
  p1.lookAt( 0, 0, 0 );
  estudio.add( p1 );
  const panelSuave = panel.clone();
  panelSuave.color.setScalar( 2 );
  const p2 = new THREE.Mesh( new THREE.PlaneGeometry( 4, 4 ), panelSuave );
  p2.position.set( -6, 3, -4 );
  p2.lookAt( 0, 0, 0 );
  estudio.add( p2 );

  const pmrem = new THREE.PMREMGenerator( renderer );
  scene.environment = pmrem.fromScene( estudio, 0.02 ).texture;
  pmrem.dispose();
}

// FINAL- camara cenital ortografica para el HUD (igual que en el proyecto Tron)
function crearMinimapa()
{
  cameraTop = new THREE.OrthographicCamera(
    -alcance_hud / 2,
    alcance_hud / 2,
    alcance_hud / 2,
    -alcance_hud / 2,
    0.1,
    200
  );
  // Con la camara mirando hacia abajo, "arriba" en el minimapa es -z
  cameraTop.up.set(0, 0, -1);

  // Escenas auxiliares que escriben la mascara circular y su borde.
  cameraStencil = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  cameraStencil.position.z = 2;

  // La mascara escribe 1 en el stencil y, a diferencia de Tron, tambien pinta
  // un fondo oscuro para que el minimapa se distinga del fondo blanco de la escena.
  stencilScene = new THREE.Scene();
  const mascara = new THREE.Mesh(
    new THREE.CircleGeometry(0.94, 64),
    new THREE.MeshBasicMaterial({
      color: 0x1f2a36,
      depthWrite: false,
      depthTest: false,
      stencilWrite: true,
      stencilRef: 1,
      stencilFunc: THREE.AlwaysStencilFunc,
      stencilFail: THREE.ReplaceStencilOp,
      stencilZFail: THREE.ReplaceStencilOp,
      stencilZPass: THREE.ReplaceStencilOp
    })
  );
  stencilScene.add(mascara);

  hudBorderScene = new THREE.Scene();
  const borde = new THREE.Mesh(
    new THREE.RingGeometry(0.92, 0.99, 64),
    new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      depthTest: false,
      depthWrite: false
    })
  );
  hudBorderScene.add(borde);
}

function updateCameraTop()
{
  // El minimapa se centra en el slime
  if (slime !== null) {
    centro_hud.x = slime.position.x;
    centro_hud.z = slime.position.z;
  }
  cameraTop.position.copy(centro_hud);
  cameraTop.lookAt(centro_hud.x, 0, centro_hud.z);
}

// Activa temporalmente la comparacion contra el stencil en todos los
// materiales de la escena. Se desactiva inmediatamente despues del HUD para
// no afectar la vista principal del siguiente frame.
function configurarStencilHUD(activo)
{
  scene.traverse(function(objeto) {
    if (!objeto.material)
      return;

    const materiales = Array.isArray(objeto.material)
      ? objeto.material
      : [objeto.material];

    materiales.forEach(function(material) {
      material.stencilWrite = activo;

      if (activo) {
        material.stencilRef = 1;
        material.stencilFunc = THREE.EqualStencilFunc;
        material.stencilFuncMask = 0xff;
        material.stencilWriteMask = 0x00;
        material.stencilFail = THREE.KeepStencilOp;
        material.stencilZFail = THREE.KeepStencilOp;
        material.stencilZPass = THREE.KeepStencilOp;
      } else {
        material.stencilWriteMask = 0xff;
      }
    });
  });
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update()
{
    stats.update();

    // Limitamos el delta para evitar saltos bruscos al volver a la pestaña.
    var delta = Math.min(clock.getDelta(), 0.05);

    // Mientras el modelo carga, solo funciona la camara orbital
    if (slime === null) {
        cameraControls.update();
        return;
    }

    // 3- movimiento: A/D giran, W/S avanzan y retroceden
    if (controls.moveLeft) angulo += controls.turnSpeed * delta;
    if (controls.moveRight) angulo -= controls.turnSpeed * delta;

    velocity.set(Math.sin(angulo), 0, Math.cos(angulo));

    var avance = controls.speed * tamano_slime * delta;
    if (controls.moveForward) pos_slime.addScaledVector(velocity, avance);
    if (controls.moveBackward) pos_slime.addScaledVector(velocity, -avance * 0.6);

    slime.position.copy(pos_slime);

    // Al ir hacia atras (S), el modelo se da la vuelta y camina de frente hacia
    // la camara. La camara sigue usando "angulo", asi que no da la vuelta con el.
    var mirarAtras = controls.moveBackward && !controls.moveForward;
    var rotacionObjetivo = angulo + (mirarAtras ? Math.PI : 0);
    // Giro suave por el camino mas corto (atan2 evita dar la vuelta larga)
    var diferencia = Math.atan2(Math.sin(rotacionObjetivo - rotacion_visual),
                                Math.cos(rotacionObjetivo - rotacion_visual));
    rotacion_visual += diferencia * (1 - Math.exp(-10 * delta));
    slime.rotation.y = rotacion_visual + rotacion_frente;

    // DEBUG- actualizamos solamente la camara que esta activa.
    if (camara_orbital) {
        cameraControls.update();
    } else {
        updateCamera(delta);
    }

    // Avanzar la animación según el tiempo transcurrido
    if (mixer != null) mixer.update(delta);


}

// Muelle amortiguado: el valor actual persigue al objetivo de forma elastica
function actualizarResorte(actual, velocidadActual, objetivo, delta)
{
  aceleracion_camara
    .copy(objetivo)
    .sub(actual)
    .multiplyScalar(rigidez_camara)
    .addScaledVector(velocidadActual, -amortiguacion_camara);

  velocidadActual.addScaledVector(aceleracion_camara, delta);
  actual.addScaledVector(velocidadActual, delta);
}

// FINAL- camara en tercera persona con posicion y punto de mirada elasticos.
function updateCamera(delta)
{
  // Detras del slime (en sentido contrario a donde mira) y algo por encima
  posicion_objetivo_camara
    .copy(slime.position)
    .addScaledVector(velocity, -distancia_camara * tamano_slime);
  posicion_objetivo_camara.y += altura_camara * tamano_slime;

  mirada_objetivo_camara.copy(slime.position);
  mirada_objetivo_camara.y += desfase_lookat_y * tamano_slime;

  // La primera vez colocamos la camara directamente, sin animacion
  if (!camara_spring_iniciada) {
    camera.position.copy(posicion_objetivo_camara);
    mirada_actual_camara.copy(mirada_objetivo_camara);
    velocidad_camara.set(0, 0, 0);
    velocidad_mirada_camara.set(0, 0, 0);
    camara_spring_iniciada = true;
  } else {
    actualizarResorte(camera.position, velocidad_camara, posicion_objetivo_camara, delta);
    actualizarResorte(mirada_actual_camara, velocidad_mirada_camara, mirada_objetivo_camara, delta);
  }

  camera.lookAt(mirada_actual_camara);
}

// DEBUG- alterna entre la camara orbital y la camara en tercera persona.
function cambiarCamara()
{
  if (slime === null) return;
  camara_orbital = !camara_orbital;
  cameraControls.enabled = camara_orbital;

  if (camara_orbital) {
    cameraControls.target.copy(slime.position);
    cameraControls.update();
  } else {
    // Volvemos suavemente desde la posicion orbital, sin tirones
    velocidad_camara.set(0, 0, 0);
    velocidad_mirada_camara.set(0, 0, 0);
    mirada_actual_camara.copy(cameraControls.target);
  }

  console.log(camara_orbital ? 'Camara orbital' : 'Camara en tercera persona');
}

function render()
{
  requestAnimationFrame( render );
  update();
  updateCameraTop();

  // Vista principal.
  renderer.autoClear = false;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.clear(true, true, true);
  renderer.render( scene, camera );

  // HUD circular en la esquina superior izquierda.
  const lado = Math.min(window.innerWidth, window.innerHeight) / 3.5;
  const margen = 18;
  const x = margen;                                   // esquina izquierda
  const y = window.innerHeight - lado - margen;

  renderer.setViewport(x, y, lado, lado);
  renderer.setScissor(x, y, lado, lado);
  renderer.setScissorTest(true);

  // Limpiamos profundidad y stencil solo dentro del viewport del HUD.
  const gl = renderer.getContext();
  gl.stencilMask(0xff);
  gl.clearStencil(0);
  renderer.clear(false, true, true);

  // Primero escribimos el circulo en el stencil (y su fondo oscuro).
  renderer.render(stencilScene, cameraStencil);

  // Luego la vista cenital solo pasa donde el stencil vale 1.
  configurarStencilHUD(true);
  renderer.render(scene, cameraTop);
  configurarStencilHUD(false);

  // Un aro cian hace legible el limite del minimapa.
  renderer.clearDepth();
  renderer.render(hudBorderScene, cameraStencil);

  renderer.setScissorTest(false);
}