// ejemplo loader

var loader;
var renderer, scene, camera;
var cameraControls;
var stats;
var angulo = -0.01;
var mixer = null;      // reproduce las animaciones del modelo
var accionSlime = null; // la animacion del slime (AnimationAction), para cambiar su velocidad

// VELOCIDAD ANIMACION- el slime se anima mas deprisa cuando se mueve
const VELOCIDAD_ANIM_QUIETO = 1;        // 1 = velocidad normal del clip
const VELOCIDAD_ANIM_MOVIENDOSE = 2;    // 2 = el doble de rapido

// 3- movimiento y camara en tercera persona (misma estructura que el proyecto Tron)
var slime = null;                              // grupo que contiene el modelo y se mueve por la escena
var tamano_slime = 1;                          // tamaño ACTUAL del slime: camara, velocidad, sombras... son proporcionales
var tamano_base = 1;                           // tamaño ORIGINAL del modelo: el escenario y los objetos se miden con el
var tamano_objetivo = 1;                       // tamaño hacia el que crece (tamano_slime lo alcanza poco a poco)
var cuerpo_slime = null;                       // grupo intermedio que se escala al crecer

// ANIMACION COMER- el slime se aplasta y rebota como una gelatina al comer
var estiramiento = 0;                          // deformacion actual (+ aplastado, - estirado)
var velocidadEstiramiento = 0;                 // con que rapidez cambia esa deformacion
var ultimoEmpujon = -1;                        // instante (s) del ultimo empujon al muelle
const INTERVALO_EMPUJON = 0.25;                // tiempo minimo entre empujones: deja rebotar al muelle
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

// CAMARAS- la tecla C recorre estos modos en orden:
//   'tercera'     -> camara en tercera persona con resorte (estilo Tron)
//   'orbital'     -> camara orbital libre con el raton (OrbitControls, para depurar)
//   'seguimiento' -> camara de seguimiento: orbita alrededor del slime con el raton
//                    y el movimiento pasa a ser relativo a la camara
const MODOS_CAMARA = ['tercera', 'orbital', 'seguimiento'];
var modo_camara = 'tercera';

// Estado de la camara de seguimiento
const cam_seguimiento = {
  yaw: 0,                 // giro horizontal alrededor del slime
  pitch: 0.5,             // inclinacion (radianes)
  zoom: 1,                // la rueda del raton lo cambia entre 0.6 y 1.8
  dist: 1,                // distancia actual (se suaviza hacia la objetivo)
  objetivo: new THREE.Vector3(),   // punto al que mira (sigue al slime con suavizado)
  arrastre: null          // posicion del raton mientras se arrastra
};
const DISTANCIA_SEGUIMIENTO = 3.5;       // en tamaños de slime
const _offsetSeguimiento = new THREE.Vector3();

const controls = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  rotateCameraLeft: false,     // Q / E: girar la camara de seguimiento con el teclado
  rotateCameraRight: false,
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
    case 'KeyQ':
      controls.rotateCameraLeft = true;
      break;
    case 'KeyE':
      controls.rotateCameraRight = true;
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
    case 'KeyQ':
      controls.rotateCameraLeft = false;
      break;
    case 'KeyE':
      controls.rotateCameraRight = false;
      break;
    // DEBUG- cambio de camara.
    case 'KeyC':
      cambiarCamara();
      break;
    // SONIDO- silenciar / activar todo el audio
    case 'KeyM':
      alternarSilencio();
      break;
  }
});

// ESCENARIOS- cada escala del mundo se describe con datos. Las medidas van en
// "tamaños de slime", asi el escenario se adapta a la escala del modelo cargado.
// De momento solo existe el primer nivel; los siguientes se añadiran a este array.
const ESCALAS = [
  {
    nombre: 'El rincón del jardín',
    radioSuelo: 14,            // radio del disco de suelo (en tamaños de slime)
    altoBorde: 0.8,            // grosor del borde de tierra
    colorSuelo: 0x5d8331,
    colorBorde: 0x5b3a22,
    repetirTextura: 6,         // veces que se repetira tu textura sobre el disco
    umbral: 2.5,               // tamaño (en tamaños de slime) necesario para pasar al siguiente nivel
    // FONDO- cilindro que rodea el suelo con una imagen panoramica por dentro
    fondo: 'images/tasty_damacy/fondo_cesped2.jpg',   // panoramica que se repite en horizontal
    altoFondo: 0.5,            // altura del cilindro respecto al radio del suelo
    colorCielo: 0xcfe8ff,      // el cilindro esta abierto por arriba: este color se ve encima
    // Objetos del nivel: [tipo, cantidad, tamañoMin, tamañoMax]
    // El tamaño es la mitad de su dimension mayor, en tamaños de slime
    catalogo: [
      ['semilla', 30, 0.12, 0.18],
      ['hormiga', 20, 0.3, 0.4],
      ['piedra', 25, 0.15, 0.35],      // PACK- modelos sacados del pack de naturaleza
      ['setaRoja', 12, 0.4, 0.7],
      ['setaAzul', 12, 0.4, 0.7]
    ]
  }
];
var escala_actual = 0;

// ILUMINACION- como en el proyecto Tron: una luz ambiental y una direccional (el sol).
// Aqui ademas el sol proyecta sombras y sigue al slime.
var luzSol, luzAmbiente;
const direccion_sol = new THREE.Vector3(30, 50, 20).normalize();  // misma direccion que en Tron
var suelos = [];               // un registro por escala: { grupo, radio }

// Minimapa: camara cenital ortografica en la esquina superior izquierda
var cameraTop, cameraStencil;
var stencilScene, hudBorderScene;
var alcance_hud = 20;                          // lado (en unidades del mundo) que abarca el minimapa
const centro_hud = new THREE.Vector3(0, 10, 0); // punto sobre el que se coloca la camara cenital

// SONIDO- configuracion y estado del audio. Va antes de init() porque crearAudio()
// se ejecuta dentro de init() y necesita que estas variables ya existan.
const RUTA_MUSICA = 'sounds/9-lonely-rolling-star.mp3';
const VOLUMEN_MUSICA = 0.025;
const VOLUMEN_EFECTOS = 0.2;

// Sonidos de comer con su peso: cuanto mayor el peso, mas probable.
const SONIDOS_COMER = [
  { ruta: 'sounds/katamari_comer2.wav', peso: 100 },
  { ruta: 'sounds/mordisco.wav', peso: 50 },
  { ruta: 'sounds/tragar.wav', peso: 10 },
  { ruta: 'sounds/nom.wav', peso: 5 },
];

var oyente;                    // AudioListener
var musica;                    // THREE.Audio de la musica de fondo
var canalesComer = [];         // reserva de Audio para que varios bocados puedan sonar a la vez
const MAX_CANALES_COMER = 6;  // como mucho, 6 bocados sonando simultaneamente
var silenciado = false;

// MODELOS- modelos glTF de los objetos comestibles. Van antes de init() porque
// init() empieza a cargarlos y necesita que estas variables ya existan.
const MODELOS_OBJETOS = {
  // animQuieto / animAndar: nombre (o parte del nombre) de cada animacion del modelo.
  // Mira en la consola la lista "animaciones" al cargar y ajustalos si no coinciden.
  hormiga: { ruta: 'models/hormiga/scene.gltf', plantilla: null, animaciones: [],
             animQuieto: 'Armature|Idle', animAndar: 'Armature|Walk' },

  // PACK- varios modelos dentro del MISMO archivo. En este pack cada pieza es un
  // nodo suelto, asi que:
  //   nodo: ['pieza1', 'pieza2']  -> se juntan esas piezas en un solo modelo
  //   variantes: ['a', 'b', 'c']  -> cada objeto usa una de ellas al azar
  // Al cargar, la consola muestra los grupos de piezas que hay en el pack.
  piedra:   { ruta: 'models/naturaleza/scene.gltf', plantilla: null, animaciones: [],
              variantes: ['Icosphere008_52', 'Icosphere009_53', 'Icosphere010_54'] },
  setaRoja: { ruta: 'models/naturaleza/scene.gltf', plantilla: null, animaciones: [],
              nodo: ['Circle064_14', 'Circle065_15'] },    // tallo + sombrero rojo
  setaAzul: { ruta: 'models/naturaleza/scene.gltf', plantilla: null, animaciones: [],
              nodo: ['Circle066_16', 'Circle079_17'] }     // tallo + sombrero azul
};
var promesaModelos = null;     // se cumple cuando todos los modelos estan cargados
var mixersObjetos = [];        // AnimationMixer de cada copia animada

const clock = new THREE.Clock();

// HUD- estado que muestra la interfaz
var puntos = 0;
var tiempoJugado = 0;          // segundos jugando de verdad (no cuenta la carga ni la pestaña oculta)
var hud = {};                  // referencias a los elementos HTML del HUD
var cacheHUD = {};             // ultimo valor escrito en cada elemento (para no reescribir si no cambia)
var temporizadorAviso = null;  // para ocultar el aviso central pasado un tiempo
var ultimoAvisoChoque = -10;   // evita repetir "demasiado grande" en cada fotograma del choque
// VISOR- circulo en la esquina inferior derecha con el ultimo objeto comido girando.
// Es una escena aparte, con su propia camara y luces, que se dibuja encima de
// la principal con la misma tecnica (viewport + stencil) que el minimapa.
var escenaVisor, camaraVisor;
var pivoteVisor = null;        // grupo que gira; dentro va el modelo del ultimo objeto comido
var etiquetaVisor;             // nombre del objeto, en HTML, sobre el circulo
var visorPendiente = null;     // tipo del ultimo objeto comido que aun no se ha mostrado
var ultimoCambioVisor = -10;   // instante (s) en que cambio por ultima vez el modelo
const INTERVALO_VISOR = 0.6;   // tiempo minimo que se muestra cada modelo
const RADIO_VISOR = 0.75;      // radio de la esfera en la que se encaja cada modelo (mas alto = mas grande)

const NOMBRES_CAMARA = {
  tercera: 'Tercera persona',
  orbital: 'Orbital',
  seguimiento: 'Seguimiento'
};

init();
render();


function init()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  renderer.outputEncoding = THREE.sRGBEncoding;          // salida en sRGB: colores correctos
  renderer.toneMapping = THREE.ACESFilmicToneMapping;     // brillos más suaves
  renderer.shadowMap.enabled = true;                      // SOMBRAS- activar el mapa de sombras
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;       // bordes de sombra suavizados
  document.getElementById('container').appendChild( renderer.domElement );

  stats = new Stats();
  stats.showPanel(0); // FPS inicialmente. Picar para cambiar panel.
  // Stats se coloca por defecto arriba a la izquierda (position fixed, top 0, left 0)
  document.getElementById('container').appendChild( stats.domElement );

  scene = new THREE.Scene();
  crearEntorno();                                         // reflejos para los materiales PBR

  // cargo el objeto
  loadObjGLTF();
  promesaModelos = cargarModelosObjetos();   // MODELOS- se cargan a la vez que el slime

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 1000 );
  camera.layers.enable(1);   // FONDO- la camara principal ve tambien la capa 1 (el cilindro)
  camera.position.set( 10, 15, 20 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  crearMinimapa();
  crearControlesCamaraSeguimiento();
  crearAudio();
  crearHUD();
  crearVisor();

  crearLuces();
  

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
            // Jerarquia:  slime (se mueve y gira)
            //               └─ cuerpo_slime (se escala al crecer)
            //                    └─ modelo glTF (centrado y apoyado en y = 0)
            // Escalamos el grupo intermedio y no el modelo porque el modelo esta
            // desplazado para centrarlo: al escalarlo se moveria de su sitio.
            slime = new THREE.Group();
            cuerpo_slime = new THREE.Group();
            slime.add(cuerpo_slime);
            cuerpo_slime.add(object);
            scene.add(slime);

            // SOMBRAS- el slime proyecta sombra sobre el suelo
            object.traverse(function (hijo) {
                if (hijo.isMesh) hijo.castShadow = true;
            });

            // Animaciones: un AnimationMixer reproduce los clips del modelo
            console.log('Animaciones:', gltf.animations);
            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(object);
                accionSlime = mixer.clipAction(gltf.animations[0]);
                accionSlime.timeScale = VELOCIDAD_ANIM_QUIETO;
                accionSlime.play();
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
            tamano_base = maxDim;
            tamano_objetivo = maxDim;

            // Escenario: suelo del primer nivel (su tamaño depende del slime)
            crearSuelo(0);
            configurarSombras();
            // OBJETOS- los comestibles del primer nivel. Esperamos a que esten
            // cargados los modelos de los objetos (por ejemplo, la hormiga)
            promesaModelos.then(function () {
                generarObjetos(0);
            });

            // HUD- presentamos el nivel con un aviso central
            mostrarAviso('Nivel 1: ' + ESCALAS[0].nombre, '', 2500);

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

// ---------------------------------------------------------------------------
// OBJETOS- definicion de los tipos de objetos comestibles y su colocacion
// ---------------------------------------------------------------------------
var objetos = [];   // registro de todos los objetos del mundo (para colisiones, comer...)

// Numero aleatorio entre a y b
function rand(a, b)
{
  return a + Math.random() * (b - a);
}

// Elemento aleatorio de una lista
function elegir(lista)
{
  return lista[Math.floor(Math.random() * lista.length)];
}

// Geometrias y materiales compartidos: todas las semillas usan la misma esfera y
// uno de estos tres materiales, en vez de crear uno nuevo por cada objeto
const GEOMETRIAS = {
  esfera: new THREE.SphereGeometry(1, 24, 16)
};
// Los colores en hexadecimal estan en sRGB; los pasamos a lineal porque el
// renderizador trabaja en lineal y codifica la salida en sRGB
const MATERIALES = {
  semillas: ['#8a5a2b', '#c9a46a', '#4a3524'].map(function (c) {
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: 0.6 });
  })
};

// Tabla de tipos: nombre visible, huella (radio de colision relativo a su tamaño)
// y funcion que construye su modelo
// ---------------------------------------------------------------------------
// MODELOS- objetos que usan un modelo glTF en vez de primitivas.
// Cada modelo se carga UNA vez (la "plantilla") y cada objeto del mundo es una
// copia. Al cargarlo se normaliza: centrado, apoyado en y = 0 y con su
// dimension mayor de tamaño 2, igual que los objetos hechos con primitivas,
// para que el sistema de tamaños del catalogo funcione igual con todos.
// ---------------------------------------------------------------------------
// (MODELOS_OBJETOS, promesaModelos y mixersObjetos estan declarados antes de init())

function cargarModelosObjetos()
{
  const cargador = new THREE.GLTFLoader();
  const nombres = Object.keys(MODELOS_OBJETOS);
  const archivos = {};   // PACK- ruta -> promesa de su glTF: cada archivo se carga UNA vez

  // Carga un archivo (o devuelve la carga que ya esta en marcha). Si el archivo
  // es un pack (alguno de sus modelos usa "nodo"), muestra los modelos que contiene.
  function cargarArchivo(ruta)
  {
    if (!archivos[ruta]) {
      archivos[ruta] = new Promise(function (resolver) {
        cargador.load(ruta, function (gltf) {
          const esPack = nombres.some(function (n) {
            const m = MODELOS_OBJETOS[n];
            return m.ruta === ruta && (m.nodo || m.variantes);
          });
          if (esPack) listarModelosDelPack(ruta, gltf.scene);
          resolver(gltf);
        }, undefined, function () {
          console.error('No se pudo cargar el modelo:', ruta);
          resolver(null);   // seguimos igualmente: sus tipos de objeto no apareceran
        });
      });
    }
    return archivos[ruta];
  }

  // Una promesa por modelo; Promise.all espera a que terminen todas
  return Promise.all(nombres.map(function (nombre) {
    const modelo = MODELOS_OBJETOS[nombre];
    return cargarArchivo(modelo.ruta).then(function (gltf) {
      if (!gltf) return;

      if (modelo.variantes) {
        // PACK- varias versiones del objeto: una plantilla por variante
        modelo.plantillas = [];
        modelo.variantes.forEach(function (variante) {
          const pieza = extraerNodo(gltf.scene, variante);
          if (pieza) modelo.plantillas.push(normalizarModelo(pieza));
        });
        if (modelo.plantillas.length === 0) return;
        modelo.plantilla = modelo.plantillas[0];
        modelo.animaciones = [];
        console.log('Modelo cargado:', nombre, '(' + modelo.plantillas.length + ' variantes del pack)');
      } else if (modelo.nodo) {
        // PACK- un modelo del archivo, formado por una o varias piezas (sin animaciones)
        const pieza = extraerNodo(gltf.scene, modelo.nodo);
        if (!pieza) return;
        modelo.plantilla = normalizarModelo(pieza);
        modelo.animaciones = [];
        console.log('Modelo cargado:', nombre, '(piezas del pack: ' + [].concat(modelo.nodo).join(', ') + ')');
      } else {
        // Archivo con un solo modelo: usamos la escena entera
        modelo.plantilla = normalizarModelo(gltf.scene);
        modelo.animaciones = gltf.animations;
        console.log('Modelo cargado:', nombre, '- animaciones:',
                    gltf.animations.map(function (clip) { return clip.name; }));
      }
    });
  }));
}

// PACK- saca un modelo del pack por su nombre, conservando su orientacion y escala.
// Los nodos padre del pack suelen llevar una rotacion (por ejemplo, de Z arriba a
// Y arriba) y una escala (centimetros a metros). Si lo sacaramos tal cual, perderia
// esas transformaciones y saldria tumbado o gigante; por eso le copiamos su
// transformacion final en el mundo (matrixWorld), que incluye la de todos sus padres.
// No modifica el pack original: trabaja sobre una copia.
//
// Si se le pasa una LISTA de nombres, junta todas esas piezas en un grupo. Como
// cada pieza conserva su transformacion del mundo, quedan en la misma posicion
// relativa que en el pack (el sombrero encima del tallo, etc.).
function extraerNodo(escenaGltf, nombres)
{
  escenaGltf.updateMatrixWorld(true);
  const lista = [].concat(nombres);   // admite un nombre suelto o una lista
  const grupo = new THREE.Group();

  for (let i = 0; i < lista.length; i++) {
    const nodo = escenaGltf.getObjectByName(lista[i]);
    if (!nodo) {
      console.error('No existe el nodo "' + lista[i] + '" en el pack. Mira la tabla de grupos en la consola.');
      return null;
    }
    const copia = nodo.clone();
    nodo.matrixWorld.decompose(copia.position, copia.quaternion, copia.scale);
    grupo.add(copia);
  }
  return grupo;
}

// PACK- muestra en la consola una tabla con los modelos que hay en el pack.
// Los packs de Sketchfab suelen tener varios nodos "envoltorio" con un solo
// hijo (Sketchfab_model > root > GLTF_SceneRootNode...): bajamos por ellos
// hasta el nodo que tiene varios hijos, que son los modelos del pack.
function listarModelosDelPack(ruta, escenaGltf)
{
  let contenedor = escenaGltf;
  while (contenedor.children.length === 1) contenedor = contenedor.children[0];

  escenaGltf.updateMatrixWorld(true);
  const piezas = contenedor.children;
  const cajas = piezas.map(function (p) { return calcularCajaReal(p); });

  // Agrupamos las piezas que se tocan (con un pequeño margen): en un pack las
  // piezas de un mismo modelo estan juntas y los modelos, separados entre si.
  // Usamos "union-find": cada pieza apunta a un representante de su grupo.
  const padre = piezas.map(function (p, i) { return i; });
  function raiz(i) { while (padre[i] !== i) i = padre[i]; return i; }
  const margen = 0.005;
  for (let a = 0; a < piezas.length; a++) {
    for (let b = a + 1; b < piezas.length; b++) {
      if (cajas[a].clone().expandByScalar(margen).intersectsBox(cajas[b])) padre[raiz(a)] = raiz(b);
    }
  }

  const grupos = {};
  piezas.forEach(function (p, i) {
    const r = raiz(i);
    if (!grupos[r]) grupos[r] = { piezas: [], colores: [], caja: new THREE.Box3() };
    grupos[r].piezas.push(p.name);
    grupos[r].caja.union(cajas[i]);
    p.traverse(function (o) {
      if (o.isMesh && o.material && o.material.color) {
        const hex = '#' + o.material.color.clone().convertLinearToSRGB().getHexString();
        if (grupos[r].colores.indexOf(hex) === -1) grupos[r].colores.push(hex);
      }
    });
  });

  const tabla = Object.keys(grupos).map(function (r) {
    const g = grupos[r];
    const tam = g.caja.getSize(new THREE.Vector3());
    return {
      piezas: g.piezas.join(', '),
      colores: g.colores.join(' '),
      ancho: tam.x.toFixed(2), alto: tam.y.toFixed(2), fondo: tam.z.toFixed(2)
    };
  });
  console.log('Grupos de piezas del pack', ruta + ' (cada fila suele ser un modelo):');
  console.table(tabla);
}


// MODELOS- caja envolvente REAL de un objeto.
// Box3.setFromObject() mide las mallas animadas (SkinnedMesh) en su pose
// original, sin aplicar los huesos. En muchos modelos el esqueleto lleva una
// escala propia (malla en centimetros, huesos que la reducen...), asi que esa
// medida no se parece al tamaño que se ve. Aqui calculamos donde queda de
// verdad cada vertice despues de aplicarle sus huesos.
function calcularCajaReal(objeto)
{
  objeto.updateMatrixWorld(true);              // posiciones de todos los nodos y huesos al dia
  const caja = new THREE.Box3();
  const v = new THREE.Vector3();

  objeto.traverse(function (n) {
    if (!n.isMesh) return;
    const posiciones = n.geometry.attributes.position;

    if (n.isSkinnedMesh) {
      n.skeleton.update();
      for (let i = 0; i < posiciones.count; i++) {
        v.fromBufferAttribute(posiciones, i);
        n.boneTransform(i, v);                 // aplica los huesos al vertice (espacio local de la malla)
        v.applyMatrix4(n.matrixWorld);         // y lo pasa a coordenadas del mundo
        caja.expandByPoint(v);
      }
    } else {
      // Malla normal: basta con su caja de geometria transformada
      if (n.geometry.boundingBox === null) n.geometry.computeBoundingBox();
      caja.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld));
    }
  });
  return caja;
}

// Centra el modelo, lo apoya en y = 0 y lo escala a "unidades de objeto"
function normalizarModelo(escenaModelo)
{
  const caja = calcularCajaReal(escenaModelo);   // con los huesos aplicados (ver la funcion)
  const tam = caja.getSize(new THREE.Vector3());
  const centro = caja.getCenter(new THREE.Vector3());
  const escala = 2 / Math.max(tam.x, tam.y, tam.z);

  escenaModelo.scale.multiplyScalar(escala);
  escenaModelo.position.set(-centro.x * escala, -caja.min.y * escala, -centro.z * escala);
  escenaModelo.traverse(function (n) {
    if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
  });

  // Lo metemos en un grupo para que la normalizacion no se pierda al escalar la copia
  const plantilla = new THREE.Group();
  plantilla.add(escenaModelo);
  return plantilla;
}

// Añade al grupo una copia del modelo y, si tiene animaciones, la pone en marcha
function anadirCopiaModelo(grupo, nombre)
{
  const modelo = MODELOS_OBJETOS[nombre];
  if (!modelo.plantilla) return;

  // Los modelos con esqueleto (animados) necesitan SkeletonUtils.clone para que
  // cada copia tenga sus propios huesos; con clone() normal compartirian esqueleto
  // PACK- si el modelo tiene variantes, cada copia usa una al azar
  const base = modelo.plantillas ? elegir(modelo.plantillas) : modelo.plantilla;
  const copia = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(base) : base.clone();
  grupo.add(copia);

  if (modelo.animaciones.length > 0) {
    const mixerCopia = new THREE.AnimationMixer(copia);

    // ANIMACIONES- buscamos la de estar quieto y la de andar por su nombre.
    // Si no se encuentran, usamos la primera y la segunda de la lista.
    const clipQuieto = buscarClip(modelo.animaciones, modelo.animQuieto) || modelo.animaciones[0];
    const clipAndar = buscarClip(modelo.animaciones, modelo.animAndar) || modelo.animaciones[1] || clipQuieto;

    const quieto = mixerCopia.clipAction(clipQuieto);
    quieto.time = Math.random() * clipQuieto.duration;   // desfasadas: no se mueven todas a la vez
    grupo.userData.mixer = mixerCopia;
    mixersObjetos.push(mixerCopia);

    // Si el modelo solo tiene una animacion, la reproducimos y ya esta
    if (clipAndar === clipQuieto) {
      quieto.play();
      return;
    }

    const andar = mixerCopia.clipAction(clipAndar);

    // Las dos suenan a la vez y se mezclan por PESOS: al empezar, solo se ve la
    // de quieto (peso 1) y la de andar no se nota (peso 0). moverSerVivo()
    // reparte los pesos segun la velocidad.
    quieto.play();
    andar.play();
    quieto.setEffectiveWeight(1);
    andar.setEffectiveWeight(0);

    andar.time = Math.random() * clipAndar.duration;
    grupo.userData.acciones = { quieto: quieto, andar: andar };
  }
}

// Busca una animacion cuyo nombre contenga el texto indicado (sin distinguir mayusculas)
function buscarClip(clips, texto)
{
  if (!texto) return null;
  texto = texto.toLowerCase();
  for (let i = 0; i < clips.length; i++) {
    if (clips[i].name.toLowerCase().indexOf(texto) !== -1) return clips[i];
  }
  return null;
}

// Deja de actualizar las animaciones de un grupo (al comerlo o quitarlo del visor)
function quitarMixers(grupo)
{
  grupo.traverse(function (n) {
    if (n.userData.mixer) {
      const i = mixersObjetos.indexOf(n.userData.mixer);
      if (i >= 0) mixersObjetos.splice(i, 1);
    }
  });
}

function crearHormiga(grupo)
{
  anadirCopiaModelo(grupo, 'hormiga');
}

// PACK- constructor generico para cualquier modelo de MODELOS_OBJETOS:
// devuelve una funcion que añade una copia del modelo indicado al grupo
function crearDesdeModelo(nombre)
{
  return function (grupo) {
    anadirCopiaModelo(grupo, nombre);
  };
}

const TIPOS = {
  semilla: { nombre: 'Semilla', huella: 0.8, crear: crearSemilla },
  // comerDesde: tamaño minimo del slime para comerla, aunque sea pequeña
  hormiga: { nombre: 'Hormiga', huella: 0.6, crear: crearHormiga, modelo: 'hormiga', comerDesde: 1.2, escalaVisor: 1,
             // VIDA- se mueve por el nivel y huye del slime cuando este puede comersela
             //   velocidad: medios cuerpos por segundo al pasear (al huir va mas rapido)
             //   rotacionFrente: si camina de lado o hacia atras, prueba Math.PI / 2, -Math.PI / 2 o Math.PI
             movil: { velocidad: 1.5, huye: true, rotacionFrente: Math.PI } },

  // PACK- modelos del pack de naturaleza
  piedra:   { nombre: 'Piedrecita', huella: 0.8, crear: crearDesdeModelo('piedra'),   modelo: 'piedra' },
  setaRoja: { nombre: 'Seta roja',  huella: 0.6, crear: crearDesdeModelo('setaRoja'), modelo: 'setaRoja' },
  setaAzul: { nombre: 'Seta azul',  huella: 0.6, crear: crearDesdeModelo('setaAzul'), modelo: 'setaAzul' }
};

// Cada constructor monta el objeto en "unidades de objeto": apoyado en y = 0 y con
// su dimension mayor de tamaño 2 (de -1 a 1). Despues el grupo se escala a su tamaño real.
function crearSemilla(grupo)
{
  const semilla = new THREE.Mesh(GEOMETRIAS.esfera, elegir(MATERIALES.semillas));
  semilla.position.y = 0.38;
  semilla.scale.set(0.55, 0.4, 1);     // esfera achatada y alargada: forma de pipa
  semilla.castShadow = true;
  semilla.receiveShadow = true;
  grupo.add(semilla);
}

// Recorre el catalogo de la escala y reparte sus objetos por el suelo
function generarObjetos(indice)
{
  const E = ESCALAS[indice];
  const radioSuelo = suelos[indice].radio;
  let creados = 0;

  E.catalogo.forEach(function (entrada) {
    const tipo = entrada[0], cantidad = entrada[1], min = entrada[2], max = entrada[3];
    const def = TIPOS[tipo];

    // MODELOS- si el tipo usa un modelo que no se pudo cargar, lo saltamos
    if (def.modelo && !MODELOS_OBJETOS[def.modelo].plantilla) return;

    for (let k = 0; k < cantidad; k++) {
      const tam = rand(min, max) * tamano_base;
      const radio = tam * def.huella;
      const pos = buscarPosicion(radioSuelo, radio);
      if (!pos) continue;   // no hay hueco libre: lo saltamos

      const grupo = new THREE.Group();
      grupo.name = tipo;
      def.crear(grupo);
      grupo.position.set(pos.x, 0, pos.z);
      grupo.rotation.y = rand(0, Math.PI * 2);
      grupo.scale.setScalar(tam);
      scene.add(grupo);

      // estado: 'activo' (en el suelo) o 'comiendo' (siendo absorbido por el slime)
      const nuevo = { tipo: tipo, def: def, tam: tam, radio: radio, escala: indice, grupo: grupo, estado: 'activo' };

      // VIDA- los tipos con "movil" llevan su propio estado de movimiento
      if (def.movil) {
        nuevo.movil = {
          dir: grupo.rotation.y,          // direccion en la que camina (radianes)
          dirObjetivo: grupo.rotation.y,  // direccion hacia la que quiere girar
          temporizador: rand(0, 3),       // segundos hasta su proxima decision
          parada: false,                  // a veces se detiene un rato
          velActual: 0                    // velocidad actual (se suaviza)
        };
      }
      objetos.push(nuevo);
      creados++;
    }
  });
  console.log('Objetos creados en', E.nombre + ':', creados);
}

// Busca una posicion aleatoria dentro del disco que no este encima del slime
// ni se solape con otro objeto. Si tras varios intentos no la encuentra, devuelve null.
function buscarPosicion(radioSuelo, radio)
{
  const maximo = radioSuelo - radio - tamano_slime * 0.5;
  for (let intento = 0; intento < 25; intento++) {
    // sqrt para repartir uniformemente por el area (si no, se amontonan en el centro)
    const d = Math.sqrt(Math.random()) * maximo;
    const a = rand(0, Math.PI * 2);
    const x = Math.sin(a) * d, z = Math.cos(a) * d;

    if (Math.hypot(x - pos_slime.x, z - pos_slime.z) < tamano_slime * 1.5 + radio) continue;

    const solapa = objetos.some(function (o) {
      const minimo = (o.radio + radio) * 1.05;
      return Math.hypot(o.grupo.position.x - x, o.grupo.position.z - z) < minimo;
    });
    if (!solapa) return { x: x, z: z };
  }
  return null;
}

// ---------------------------------------------------------------------------
// SONIDO Y MUSICA (sistema de audio de Three.js, basado en Web Audio)
//   AudioListener: los "oidos" de la escena; va pegado a la camara
//   Audio: un sonido no posicional (se oye igual este donde este)
//   AudioLoader: carga el archivo y lo decodifica en un buffer
// ---------------------------------------------------------------------------
// (las variables de audio estan declaradas al principio del archivo, antes de init())

function crearAudio()
{
  oyente = new THREE.AudioListener();
  camera.add(oyente);

  const cargador = new THREE.AudioLoader();

  // Musica de fondo en bucle
  musica = new THREE.Audio(oyente);
  cargador.load(RUTA_MUSICA, function (buffer) {
    musica.setBuffer(buffer);
    musica.setLoop(true);
    musica.setVolume(VOLUMEN_MUSICA);
    // Si el usuario ya ha interactuado, empieza ya; si no, empezara al pulsar algo
    if (oyente.context.state === 'running') musica.play();
  }, undefined, function () {
    console.error('No se pudo cargar la musica:', RUTA_MUSICA);
  });

  // Sonidos de comer: cargamos cada buffer una vez y lo reutilizamos
  SONIDOS_COMER.forEach(function (sonido) {
    cargador.load(sonido.ruta, function (buffer) {
      sonido.buffer = buffer;
    }, undefined, function () {
      console.error('No se pudo cargar el sonido:', sonido.ruta);
    });
  });

  // Empezamos con unos pocos canales; si hacen falta mas, se crean al vuelo
  for (let i = 0; i < 4; i++) crearCanalComer();

  // Los navegadores no dejan reproducir sonido hasta que el usuario interactua
  // con la pagina: con la primera tecla o clic activamos el audio y la musica
  const activarAudio = function () {
    oyente.context.resume();
    if (musica.buffer && !musica.isPlaying) musica.play();
    document.removeEventListener('keydown', activarAudio);
    document.removeEventListener('pointerdown', activarAudio);
  };
  document.addEventListener('keydown', activarAudio);
  document.addEventListener('pointerdown', activarAudio);
}

// Eleccion aleatoria con pesos: se tira un numero entre 0 y la suma de los pesos
// y se ve en el "tramo" de que elemento cae. Un elemento con peso 5 ocupa un tramo
// cinco veces mas largo que uno con peso 1, asi que sale cinco veces mas.
function elegirConPeso(lista)
{
  let total = 0;
  for (let i = 0; i < lista.length; i++) total += lista[i].peso;

  let tirada = Math.random() * total;
  for (let i = 0; i < lista.length; i++) {
    tirada -= lista[i].peso;
    if (tirada < 0) return lista[i];
  }
  return lista[lista.length - 1];
}

function reproducirSonidoComer()
{
  if (!oyente) return;

  // Solo elegimos entre los sonidos que ya se han cargado
  const cargados = SONIDOS_COMER.filter(function (s) { return s.buffer; });
  if (cargados.length === 0) return;

  // Buscamos un canal que NO este sonando, en vez de coger el siguiente por turno:
  // asi nunca se corta un sonido que todavia no ha terminado
  let canal = canalesComer.find(function (c) { return !c.isPlaying; });

  // Si todos estan ocupados, creamos uno nuevo (hasta el maximo)
  if (!canal && canalesComer.length < MAX_CANALES_COMER) canal = crearCanalComer();

  // Si se ha llegado al maximo, este bocado no suena: es preferible a cortar otro
  // (con tantos sonidos a la vez, uno mas no se notaria)
  if (!canal) return;

  const sonido = elegirConPeso(cargados);
  canal.setBuffer(sonido.buffer);
  canal.setPlaybackRate(rand(0.92, 1.08));   // ligera variacion de tono: no suena repetitivo
  canal.play();
}

// Crea un canal (THREE.Audio) para los sonidos de comer y lo añade a la reserva.
// Cuando el sonido termina, Three.js pone isPlaying a false y el canal queda libre.
function crearCanalComer()
{
  const canal = new THREE.Audio(oyente);
  canal.setVolume(VOLUMEN_EFECTOS);
  canalesComer.push(canal);
  return canal;
}

function alternarSilencio()
{
  if (!oyente) return;
  silenciado = !silenciado;
  oyente.setMasterVolume(silenciado ? 0 : 1);
  mostrarAviso(silenciado ? 'Sonido desactivado' : 'Sonido activado', 'info', 1000);
}

// ---------------------------------------------------------------------------
// HUD- interfaz en HTML y CSS superpuesta al canvas. Es mas facil de maquetar
// que texto en 3D, se ve nitido y no gasta GPU. Se crea desde aqui para no
// tener que tocar el HTML.
// ---------------------------------------------------------------------------
function crearHUD()
{
  const estilo = document.createElement('style');
  estilo.textContent = `
    .hud-panel {
      position: fixed;
      top: 12px;
      padding: 8px 16px 10px;
      border-radius: 14px;
      background: rgba(25, 30, 45, 0.72);
      color: #ffffff;
      font-family: 'Segoe UI', 'Trebuchet MS', sans-serif;
      pointer-events: none;            /* los clics pasan al canvas (camara con raton) */
      user-select: none;
      z-index: 20;
    }
    .hud-etiqueta { font-size: 13px; opacity: 0.75; }
    .hud-valor { font-size: 28px; font-weight: 700; font-variant-numeric: tabular-nums; line-height: 1.15; }
    .hud-centro { left: 50%; transform: translateX(-50%); width: min(420px, 45vw); text-align: center; }
    .hud-derecha { right: 12px; min-width: 140px; text-align: right; }
    .hud-nivel { font-size: 17px; font-weight: 600; }
    .hud-barra { height: 10px; margin: 7px 0 5px; border-radius: 5px; background: rgba(255,255,255,0.18); overflow: hidden; }
    .hud-barra > div { height: 100%; width: 0; border-radius: 5px; background: linear-gradient(90deg, #7fe3d3, #b6ff7a); transition: width 0.2s; }
    .hud-tamano { font-size: 13px; opacity: 0.8; font-variant-numeric: tabular-nums; }

    /* Lista de bocados: mensajes que aparecen y se desvanecen bajo el panel derecho */
    .hud-bocados {
      position: fixed; top: 150px; right: 12px; z-index: 20;
      display: flex; flex-direction: column; align-items: flex-end; gap: 5px;
      pointer-events: none; font-family: 'Segoe UI', 'Trebuchet MS', sans-serif;
    }
    .hud-bocado {
      padding: 4px 12px; border-radius: 999px;
      background: rgba(25, 30, 45, 0.72); color: #ffffff; font-size: 15px;
      animation: hud-entrar 0.25s ease-out;
      transition: opacity 0.4s, transform 0.4s;
    }
    .hud-bocado b { color: #b6ff7a; margin-left: 8px; }
    .hud-bocado.saliendo { opacity: 0; transform: translateX(20px); }
    @keyframes hud-entrar { from { opacity: 0; transform: translateX(30px); } }

    /* Aviso central: mensaje breve en el centro de la pantalla */
    .hud-aviso {
      position: fixed; top: 30%; left: 50%; z-index: 20;
      transform: translate(-50%, -50%) scale(0.8);
      color: #ffffff; font-family: 'Segoe UI', 'Trebuchet MS', sans-serif;
      font-size: 34px; font-weight: 700; white-space: nowrap;
      text-shadow: 0 3px 10px rgba(0, 0, 0, 0.6);
      opacity: 0; pointer-events: none;
      transition: opacity 0.3s, transform 0.3s;
    }
    .hud-aviso.visible { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    .hud-aviso.peligro { color: #ff7a7a; }
    .hud-aviso.info { font-size: 22px; font-weight: 600; }

    /* Modo de camara: etiqueta fija abajo en el centro */
    .hud-camara {
      top: auto; bottom: 12px; left: 50%; transform: translateX(-50%);
      padding: 6px 14px; font-size: 14px; white-space: nowrap;
      transition: background 0.3s;
    }
    .hud-camara.cambio { background: rgba(60, 140, 130, 0.9); }   /* destello al cambiar */
  `;
  document.head.appendChild(estilo);

  // Panel central: nivel, barra de progreso y tamaño
  const centro = document.createElement('div');
  centro.className = 'hud-panel hud-centro';
  centro.innerHTML = '<div class="hud-nivel"></div>' +
                     '<div class="hud-barra"><div></div></div>' +
                     '<div class="hud-tamano"></div>';
  document.body.appendChild(centro);

  // Panel derecho: tiempo jugado y, debajo, los puntos
  const derecha = document.createElement('div');
  derecha.className = 'hud-panel hud-derecha';
  derecha.innerHTML = '<div class="hud-etiqueta">Tiempo</div><div class="hud-valor hud-tiempo">0:00</div>' +
                      '<div class="hud-etiqueta">Puntos</div><div class="hud-valor hud-puntos">0</div>';
  document.body.appendChild(derecha);

  hud.nivel = centro.querySelector('.hud-nivel');
  hud.barra = centro.querySelector('.hud-barra > div');
  hud.tamano = centro.querySelector('.hud-tamano');
  hud.puntos = derecha.querySelector('.hud-puntos');
  hud.tiempo = derecha.querySelector('.hud-tiempo');

  // Lista de bocados
  hud.bocados = document.createElement('div');
  hud.bocados.className = 'hud-bocados';
  document.body.appendChild(hud.bocados);

  // Aviso central
  hud.aviso = document.createElement('div');
  hud.aviso.className = 'hud-aviso';
  document.body.appendChild(hud.aviso);

  // Modo de camara activo
  hud.camara = document.createElement('div');
  hud.camara.className = 'hud-panel hud-camara';
  document.body.appendChild(hud.camara);
  mostrarModoCamara(false);
}

// Escribe un valor en el HUD solo si ha cambiado: tocar el DOM en cada
// fotograma sin necesidad es lento
function fijarHUD(clave, valor, aplicar)
{
  if (cacheHUD[clave] === valor) return;
  cacheHUD[clave] = valor;
  aplicar(valor);
}

function formatoTiempo(segundos)
{
  const s = Math.floor(segundos);
  const minutos = Math.floor(s / 60);
  const resto = s % 60;
  return minutos + ':' + (resto < 10 ? '0' : '') + resto;
}

function actualizarHUD()
{
  const E = ESCALAS[escala_actual];
  const tamanoRelativo = tamano_slime / tamano_base;   // 1 = tamaño inicial

  // Progreso en escala logaritmica: crecer de 1 a 1,5 cuesta lo mismo en la
  // barra que de 2 a 3, que es como se siente al jugar (crecimiento "por area")
  const progreso = THREE.MathUtils.clamp(Math.log(tamanoRelativo) / Math.log(E.umbral), 0, 1);

  fijarHUD('nivel', 'Nivel ' + (escala_actual + 1) + ': ' + E.nombre, function (v) { hud.nivel.textContent = v; });
  fijarHUD('barra', (progreso * 100).toFixed(1) + '%', function (v) { hud.barra.style.width = v; });
  fijarHUD('tamano', 'Tamaño ' + tamanoRelativo.toFixed(2).replace('.', ',') +
                     ' · objetivo ' + E.umbral.toFixed(2).replace('.', ','),
           function (v) { hud.tamano.textContent = v; });
  fijarHUD('puntos', puntos.toLocaleString('es-ES'), function (v) { hud.puntos.textContent = v; });
  fijarHUD('tiempo', formatoTiempo(tiempoJugado), function (v) { hud.tiempo.textContent = v; });
}

// HUD- añade una linea a la lista de bocados ("Semilla +15") que desaparece sola
function anunciarBocado(nombre, puntosBocado)
{
  const fila = document.createElement('div');
  fila.className = 'hud-bocado';
  fila.textContent = nombre;
  const valor = document.createElement('b');
  valor.textContent = '+' + puntosBocado;
  fila.appendChild(valor);

  hud.bocados.prepend(fila);                       // el mas reciente, arriba
  while (hud.bocados.children.length > 5) {        // como mucho 5 a la vez
    hud.bocados.lastChild.remove();
  }
  setTimeout(function () { fila.classList.add('saliendo'); }, 1500);   // se desvanece...
  setTimeout(function () { fila.remove(); }, 1900);                    // ...y se elimina
}

// HUD- mensaje breve en el centro. tipo: '' (normal), 'peligro' (rojo) o 'info' (mas pequeño)
function mostrarAviso(texto, tipo, duracion)
{
  hud.aviso.textContent = texto;
  hud.aviso.className = 'hud-aviso visible ' + (tipo || '');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(function () {
    hud.aviso.classList.remove('visible');
  }, duracion || 1500);
}

// HUD- muestra la camara activa; si destacar es true, la etiqueta destella un momento
function mostrarModoCamara(destacar)
{
  hud.camara.textContent = 'Cámara: ' + NOMBRES_CAMARA[modo_camara] + ' · C para cambiar';
  if (destacar) {
    hud.camara.classList.add('cambio');
    setTimeout(function () { hud.camara.classList.remove('cambio'); }, 400);
  }
}

// VISOR- escena, camara, luces y etiqueta del visor del ultimo bocado
function crearVisor()
{
  escenaVisor = new THREE.Scene();
  escenaVisor.environment = scene.environment;    // mismos reflejos que la escena principal

  camaraVisor = new THREE.PerspectiveCamera(35, 1, 0.1, 100);   // aspecto 1: el visor es cuadrado
  camaraVisor.position.set(0, 0.9, 3.2);
  camaraVisor.lookAt(0, 0, 0);

  escenaVisor.add(new THREE.AmbientLight(0xffffff, 0.5));
  const luz = new THREE.DirectionalLight(0xffffff, 1.0);
  luz.position.set(2, 3, 2);
  escenaVisor.add(luz);

  // Nombre del objeto: una etiqueta HTML centrada sobre el borde superior del circulo
  const estilo = document.createElement('style');
  estilo.textContent = `
    .hud-visor-nombre {
      top: auto; transform: translateX(50%);
      padding: 4px 14px; font-size: 15px; font-weight: 600; white-space: nowrap;
    }
  `;
  document.head.appendChild(estilo);
  etiquetaVisor = document.createElement('div');
  etiquetaVisor.className = 'hud-panel hud-visor-nombre';
  etiquetaVisor.textContent = 'Nada todavía';      // hasta el primer bocado el circulo esta vacio
  document.body.appendChild(etiquetaVisor);
}

// VISOR- se llama al comer. No cambia el modelo directamente: solo apunta cual
// es el ultimo objeto comido. actualizarVisor() lo mostrara cuando haya pasado
// el intervalo minimo, asi al comer muchas cosas seguidas el visor no parpadea
// y, aun asi, acaba mostrando siempre el ultimo de verdad.
function mostrarEnVisor(objeto)
{
  visorPendiente = objeto.def;
}

// VISOR- en cada fotograma: gira el modelo y, si hay uno pendiente y ya ha
// pasado el intervalo minimo, lo muestra
function actualizarVisor(delta)
{
  if (pivoteVisor !== null) pivoteVisor.rotation.y += 1.2 * delta;

  if (visorPendiente !== null && clock.elapsedTime - ultimoCambioVisor >= INTERVALO_VISOR) {
    cambiarModeloVisor(visorPendiente);
    visorPendiente = null;
    ultimoCambioVisor = clock.elapsedTime;
  }
}

// VISOR- sustituye el modelo del visor por uno del tipo indicado.
// No reutilizamos el objeto comido (esta encogiendo dentro del slime): construimos
// uno nuevo con el mismo constructor, que comparte geometrias y materiales.
function cambiarModeloVisor(def)
{
  if (pivoteVisor !== null) {
    quitarMixers(pivoteVisor);    // MODELOS- la animacion del modelo anterior del visor
    escenaVisor.remove(pivoteVisor);
  }

  const modelo = new THREE.Group();
  def.crear(modelo);

  // Lo centramos y escalamos para que ocupe siempre lo mismo en el visor,
  // sea una semilla o una montaña. Usamos la ESFERA que envuelve al modelo y
  // no su caja: como el modelo gira, un objeto alargado (la hormiga) ocupa
  // mas espacio al ponerse de frente o en diagonal que lo que dice su caja.
  // La esfera lo envuelve en cualquier orientacion, asi nunca se sale del circulo.
  const caja = calcularCajaReal(modelo);
  const esfera = caja.getBoundingSphere(new THREE.Sphere());
  const centro = esfera.center;
  const escala = RADIO_VISOR / esfera.radius * (def.escalaVisor || 1);
  modelo.scale.setScalar(escala);
  modelo.position.copy(centro).multiplyScalar(-escala);

  pivoteVisor = new THREE.Group();
  pivoteVisor.rotation.x = 0.25;            // un poco inclinado para verlo mejor
  pivoteVisor.add(modelo);
  escenaVisor.add(pivoteVisor);

  etiquetaVisor.textContent = def.nombre;
}

// ---------------------------------------------------------------------------
// COLISIONES Y COMER
// Las colisiones se calculan con circulos en el plano XZ (el suelo): cada objeto
// tiene un radio (su "huella") y el slime otro. Es barato y suficiente para este
// juego, porque todo se mueve sobre el suelo.
// ---------------------------------------------------------------------------
const FACTOR_COMESTIBLE = 0.85;   // se puede comer lo que mida menos del 85 % del slime
const FACTOR_CRECIMIENTO = 0.4;   // parte del "area" del objeto que se convierte en crecimiento
const DURACION_BOCADO = 0.35;     // segundos que tarda un objeto en ser absorbido
var comidos = 0;
const _destinoBocado = new THREE.Vector3();

// Radio del slime: la mitad de su tamaño (tamano_slime es su dimension mayor)
function radioSlime()
{
  return tamano_slime * 0.5;
}

function esComestible(objeto)
{
  return (tamano_slime / tamano_base) >= tamanoParaComer(objeto);
}

// Tamaño del slime (el mismo que muestra el HUD: 1 = tamaño inicial) a partir
// del cual se puede comer un objeto. Se combinan dos reglas y se aplica la mas
// exigente:
//  - por su tamaño: el objeto debe medir menos del 85 % del radio del slime
//  - por su tipo: si tiene "comerDesde", el slime debe medir al menos eso
// Asi "comerDesde" funciona como un minimo, pero un objeto muy grande sigue
// necesitando que el slime sea lo bastante grande para el.
function tamanoParaComer(objeto)
{
  const porTamano = objeto.tam / (0.5 * FACTOR_COMESTIBLE * tamano_base);

  if (objeto.def.comerDesde !== undefined) return Math.max(porTamano, objeto.def.comerDesde);
  return porTamano;
}

function comprobarColisiones()
{
  const r = radioSlime() * 0.9;   // un poco menos que el radio visual: se ve mas natural

  for (let i = 0; i < objetos.length; i++) {
    const objeto = objetos[i];
    if (objeto.estado !== 'activo') continue;

    const dx = pos_slime.x - objeto.grupo.position.x;
    const dz = pos_slime.z - objeto.grupo.position.z;
    const distancia = Math.hypot(dx, dz);

    // Hay colision si la distancia entre centros es menor que la suma de radios
    if (distancia >= r + objeto.radio) continue;

    if (esComestible(objeto)) {
      comer(objeto);
    } else {
      empujarFuera(objeto, dx, dz, distancia, r);
    }
  }
}

// Objeto demasiado grande: colocamos el slime justo en el borde del objeto,
// en la direccion por la que llegaba, para que no pueda atravesarlo
function empujarFuera(objeto, dx, dz, distancia, r)
{
  if (distancia < 0.000001) { dx = 1; dz = 0; distancia = 1; }
  const minimo = r + objeto.radio;
  pos_slime.x = objeto.grupo.position.x + (dx / distancia) * minimo;
  pos_slime.z = objeto.grupo.position.z + (dz / distancia) * minimo;

  // HUD- aviso, como mucho uno cada 1,5 s (el choque dura varios fotogramas)
  if (clock.elapsedTime - ultimoAvisoChoque > 1.5) {
    mostrarAviso(objeto.def.nombre + ': necesitas tamaño ' +
                 tamanoParaComer(objeto).toFixed(2).replace('.', ','), 'peligro');
    ultimoAvisoChoque = clock.elapsedTime;
  }
}

function comer(objeto)
{
  objeto.estado = 'comiendo';
  objeto.t = 0;

  // Cambio en el grafo de escena: el objeto pasa de ser hijo de la escena a ser
  // hijo del slime. attach() conserva su posicion en el mundo al cambiar de padre,
  // asi que a partir de ahora se mueve con el slime.
  slime.attach(objeto.grupo);
  objeto.posicionInicial = objeto.grupo.position.clone();
  objeto.escalaInicial = objeto.grupo.scale.x;

  // CRECIMIENTO- el slime crece "por area": su radio al cuadrado aumenta en
  // proporcion al tamaño al cuadrado de lo que come. Comer algo grande se nota
  // mucho; comer migajas cuando ya eres enorme, apenas.
  const radioActual = tamano_objetivo / 2;
  const radioNuevo = Math.sqrt(radioActual * radioActual + FACTOR_CRECIMIENTO * objeto.tam * objeto.tam);
  tamano_objetivo = radioNuevo * 2;

  // SONIDO- un sonido de comer elegido al azar segun su peso
  reproducirSonidoComer();

  // ANIMACION COMER- un "empujon" al muelle: el slime se aplasta y rebota.
  // Si acaba de recibir otro, este bocado no empuja: asi el muelle tiene tiempo
  // de rebotar y, comiendo sin parar, el slime "mastica" con un ritmo regular
  // en lugar de quedarse aplastado.
  if (clock.elapsedTime - ultimoEmpujon > INTERVALO_EMPUJON) {
    velocidadEstiramiento += 5.5;
    ultimoEmpujon = clock.elapsedTime;
  }

  // HUD- puntos proporcionales al tamaño del objeto (una semilla da 12-18)
  var puntosBocado = Math.max(1, Math.round(100 * objeto.tam / tamano_base));
  puntos += puntosBocado;
  anunciarBocado(objeto.def.nombre, puntosBocado);
  mostrarEnVisor(objeto);

  comidos++;
  console.log('Comido:', objeto.def.nombre, '- total:', comidos,
              '- tamaño:', (tamano_objetivo / tamano_base).toFixed(2) + 'x');
}

// CRECIMIENTO- el tamaño actual se acerca suavemente al objetivo y todo lo que
// depende de el (modelo, camaras, sombras, minimapa) se recalcula
function actualizarCrecimiento(delta)
{
  tamano_slime = amortiguar(tamano_slime, tamano_objetivo, 5, delta);

  // ANIMACION COMER- muelle amortiguado (igual que la camara con resorte):
  // la rigidez (120) lo devuelve a su forma y la amortiguacion (9) frena el rebote
  velocidadEstiramiento += (-120 * estiramiento - 9 * velocidadEstiramiento) * delta;
  estiramiento += velocidadEstiramiento * delta;
  var e = THREE.MathUtils.clamp(estiramiento, -0.3, 0.3);

  // Escala por el crecimiento y deformacion por la animacion. Al aplastarse
  // (y menor) se ensancha (x, z mayores), como si conservara su volumen.
  var escala = tamano_slime / tamano_base;
  cuerpo_slime.scale.set(escala * (1 + e * 0.6), escala * (1 - e), escala * (1 + e * 0.6));

  // Planos de recorte de la camara principal proporcionales al tamaño
  camera.near = tamano_slime * 0.05;
  camera.far = tamano_slime * 100;
  camera.updateProjectionMatrix();

  // Zona de sombras alrededor del slime
  configurarSombras();

  // El minimapa abarca siempre 6 tamaños de slime alrededor de el
  alcance_hud = tamano_slime * 6;
  cameraTop.left = -alcance_hud / 2;
  cameraTop.right = alcance_hud / 2;
  cameraTop.top = alcance_hud / 2;
  cameraTop.bottom = -alcance_hud / 2;
  cameraTop.near = tamano_slime * 0.1;
  cameraTop.far = tamano_slime * 10;
  cameraTop.updateProjectionMatrix();
  centro_hud.y = tamano_slime * 2;
}

// ---------------------------------------------------------------------------
// VIDA- comportamiento de los objetos que se mueven solos (hormigas...).
// Cada uno tiene dos modos:
//   - pasear: cada pocos segundos elige una direccion al azar y a veces se para
//   - huir: si el slime esta cerca Y puede comerselo, corre en direccion contraria
// Es una "maquina de estados" muy sencilla, la base de la IA de muchos juegos.
// ---------------------------------------------------------------------------
const DISTANCIA_HUIDA = 3;        // en tamaños del slime: a esta distancia empiezan a huir
const MULTIPLICADOR_HUIDA = 2.5;  // al huir van 2,5 veces mas rapido que paseando

function actualizarSeresVivos(delta)
{
  for (let i = 0; i < objetos.length; i++) {
    const objeto = objetos[i];
    if (objeto.estado === 'activo' && objeto.movil) moverSerVivo(objeto, delta);
  }
}

function moverSerVivo(objeto, delta)
{
  const m = objeto.movil;
  const config = objeto.def.movil;
  const p = objeto.grupo.position;

  // Velocidad proporcional a su tamaño: una hormiga grande da pasos mas largos
  const velocidadPaseo = config.velocidad * objeto.tam;
  let velocidad = velocidadPaseo;

  // ¿Esta en peligro? Solo huye si el slime puede comerselo: si no, lo ignora
  const dx = p.x - pos_slime.x;
  const dz = p.z - pos_slime.z;
  const distanciaSlime = Math.hypot(dx, dz);
  const huyendo = config.huye && esComestible(objeto) && distanciaSlime < DISTANCIA_HUIDA * tamano_slime;

  m.temporizador -= delta;
  if (huyendo) {
    m.dirObjetivo = Math.atan2(dx, dz);      // direccion contraria al slime
    velocidad *= MULTIPLICADOR_HUIDA;
    m.parada = false;
  } else if (m.temporizador <= 0) {
    // Nueva decision al pasear: girar un poco al azar y, a veces, pararse
    m.dirObjetivo = m.dir + rand(-1.5, 1.5);
    m.temporizador = rand(1.5, 4);
    m.parada = Math.random() < 0.25;
  }
  if (m.parada && !huyendo) velocidad = 0;

  // No salir del suelo: cerca del borde, da la vuelta hacia el centro
  const limite = suelos[objeto.escala].radio * 0.92 - objeto.radio;
  const distanciaCentro = Math.hypot(p.x, p.z);
  if (distanciaCentro > limite) m.dirObjetivo = Math.atan2(-p.x, -p.z);

  // Giro y velocidad suavizados: no cambian de golpe
  m.dir = amortiguarAngulo(m.dir, m.dirObjetivo, huyendo ? 8 : 3, delta);
  m.velActual = amortiguar(m.velActual, velocidad, 6, delta);

  p.x += Math.sin(m.dir) * m.velActual * delta;
  p.z += Math.cos(m.dir) * m.velActual * delta;

  // Por si acaso (por ejemplo, al huir pegada al borde): nunca fuera del suelo
  const nuevaDistancia = Math.hypot(p.x, p.z);
  if (nuevaDistancia > limite) {
    p.x *= limite / nuevaDistancia;
    p.z *= limite / nuevaDistancia;
  }

  objeto.grupo.rotation.y = m.dir + (config.rotacionFrente || 0);

  // ANIMACIONES- mezcla entre "quieto" y "andar" segun su velocidad.
  // ritmo = 0 parada, 1 paseando, hasta 2,5 huyendo
  const acciones = objeto.grupo.userData.acciones;
  if (acciones) {
    const ritmo = THREE.MathUtils.clamp(m.velActual / velocidadPaseo, 0, MULTIPLICADOR_HUIDA);
    const pesoAndar = Math.min(ritmo, 1);          // de parada a paseando pasa de quieto a andar

    acciones.andar.setEffectiveWeight(pesoAndar);
    acciones.quieto.setEffectiveWeight(1 - pesoAndar);

    // Al huir, la animacion de andar va mas deprisa (patas a toda prisa),
    // pero nunca baja de la velocidad normal: asi no "patina" al arrancar
    acciones.andar.setEffectiveTimeScale(Math.max(ritmo, 1));
  }
}

// El objeto viaja hacia el interior del slime y encoge hasta desaparecer.
// Como el slime es translucido, se ve como se hunde dentro de el.
function actualizarObjetos(delta)
{
  // Recorremos al reves porque eliminamos elementos del array mientras lo recorremos
  for (let i = objetos.length - 1; i >= 0; i--) {
    const objeto = objetos[i];
    if (objeto.estado !== 'comiendo') continue;

    objeto.t += delta;
    const k = Math.min(objeto.t / DURACION_BOCADO, 1);
    const suave = k * k;   // empieza despacio y acelera: parece que lo "succiona"

    // Destino en coordenadas locales del slime: su centro, algo por encima del suelo
    _destinoBocado.set(0, tamano_slime * 0.35, 0);
    objeto.grupo.position.lerpVectors(objeto.posicionInicial, _destinoBocado, suave);
    objeto.grupo.scale.setScalar(Math.max(0.0001, objeto.escalaInicial * (1 - suave)));

    if (k >= 1) {
      // No hacemos dispose() de la geometria ni del material porque son compartidos
      // con los demas objetos del mismo tipo
      quitarMixers(objeto.grupo);   // MODELOS- su animacion deja de actualizarse
      slime.remove(objeto.grupo);
      objetos.splice(i, 1);
    }
  }
}

// ESCENARIOS- crea el suelo de una escala: un disco plano con un borde de tierra,
// para que el nivel se vea como una "isla" (asi luego la siguiente escala podra
// aparecer alrededor y la anterior quedara como una pequeña parte de ella).
//
//   grupo (se añade a la escena)
//    ├─ superficie: disco plano (CircleGeometry) en y = 0
//    └─ borde: cilindro abierto bajo el disco
function crearSuelo(indice)
{
  const E = ESCALAS[indice];
  const radio = E.radioSuelo * tamano_base;
  const alto = E.altoBorde * tamano_base;

  const materialSuelo = new THREE.MeshStandardMaterial({ color: E.colorSuelo, roughness: 1 });

  // CircleGeometry reparte las UV de 0 a 1 sobre todo el disco, por eso hay que
  // repetir la textura para que no quede estirada.

  const textura = new THREE.TextureLoader().load('images/tasty_damacy/cesped.jpg');
  textura.encoding = THREE.sRGBEncoding;
  textura.wrapS = textura.wrapT = THREE.MirroredRepeatWrapping;
  textura.repeat.set(E.repetirTextura, E.repetirTextura);
  textura.magFilter = THREE.LinearMipMapLinearFilter;  // Filtrado  para la magnificación
  textura.minFilter = THREE.LinearMipMapLinearFilter; 
  materialSuelo.map = textura;
  materialSuelo.color.set(0xffffff);   // blanco = la textura con sus colores originales

  const superficie = new THREE.Mesh(new THREE.CircleGeometry(radio, 96), materialSuelo);
  superficie.rotation.x = -Math.PI / 2;    // el disco se crea en vertical: lo tumbamos
  superficie.name = 'superficie';
  superficie.receiveShadow = true;           // SOMBRAS- el suelo recibe la sombra del slime

  // Borde: cilindro sin tapas (openEnded), un poco mas estrecho por abajo
  const materialBorde = new THREE.MeshStandardMaterial({ color: E.colorBorde, roughness: 1 });
  const borde = new THREE.Mesh(
    new THREE.CylinderGeometry(radio, radio * 0.92, alto, 96, 1, true),
    materialBorde
  );
  borde.position.y = -alto / 2;            // su parte de arriba coincide con el disco
  borde.name = 'borde';

  const grupo = new THREE.Group();
  grupo.name = 'suelo_' + indice;
  grupo.add(superficie, borde);

  // FONDO- el cilindro panoramico forma parte del nivel
  const fondo = crearFondoCilindro(indice);
  if (fondo) grupo.add(fondo);
  scene.add(grupo);

  suelos[indice] = { grupo: grupo, radio: radio };
  console.log('Escenario creado:', E.nombre, '- radio', radio.toFixed(2));
}

// FONDO- cilindro abierto que rodea el suelo con la imagen por dentro.
// Forma parte del nivel (va dentro del grupo del suelo), asi que cuando haya
// varios niveles cada uno tendra el suyo y desaparecera con el.
function crearFondoCilindro(indice)
{
  const E = ESCALAS[indice];
  if (!E.fondo) return null;

  const radio = E.radioSuelo * tamano_base * 1.02;     // un pelin fuera del borde del suelo
  const alto = E.radioSuelo * tamano_base * E.altoFondo;
  const base = -E.altoBorde * tamano_base;              // empieza bajo el borde: sin huecos
  const altoTotal = alto - base;

  // Cilindro sin tapas (openEnded). Lo invertimos en X para que la imagen se vea
  // por dentro y sin quedar en espejo (el mismo truco que usan las panoramicas de Three.js)
  const geometria = new THREE.CylinderGeometry(radio, radio, altoTotal, 96, 1, true);
  geometria.scale(-1, 1, 1);

  const textura = new THREE.TextureLoader().load(E.fondo, function (imagen) {
    // Repetimos la imagen alrededor del cilindro las veces necesarias para que
    // conserve su proporcion (si no, quedaria muy estirada en horizontal)
    const proporcion = imagen.image.width / imagen.image.height;
    const perimetro = 2 * Math.PI * radio;
    textura.repeat.x = Math.max(1, Math.round(perimetro / (altoTotal * proporcion)));
  }, undefined, function () {
    console.error('No se pudo cargar el fondo:', E.fondo);
  });
  textura.encoding = THREE.sRGBEncoding;
  textura.wrapS = THREE.RepeatWrapping;

  // MeshBasicMaterial: no le afectan las luces ni las sombras, es un decorado.
  // toneMapped false para que la imagen se vea con sus colores originales.
  const material = new THREE.MeshBasicMaterial({ map: textura, toneMapped: false });

  const cilindro = new THREE.Mesh(geometria, material);
  cilindro.position.y = base + altoTotal / 2;
  cilindro.name = 'fondo';

  // Capa 1: la ve la camara principal pero no la cenital, asi en el minimapa
  // no aparece como un anillo alrededor del nivel
  cilindro.layers.set(1);

  // Color del cielo que se ve por encima del cilindro
  if (E.colorCielo !== undefined) renderer.setClearColor(new THREE.Color(E.colorCielo));

  return cilindro;
}

// Impide que el slime salga del suelo de la escala actual
function limitarAlSuelo(posicion)
{
  const suelo = suelos[escala_actual];
  if (!suelo) return;

  const limite = suelo.radio - tamano_slime * 0.5;    // margen: medio slime
  const distancia = Math.hypot(posicion.x, posicion.z);
  if (distancia > limite) {
    posicion.x *= limite / distancia;
    posicion.z *= limite / distancia;
  }
}

// ILUMINACION- basada en el proyecto Tron (AmbientLight + DirectionalLight).
// La ambiental ilumina todo por igual para que las zonas en sombra no queden negras;
// la direccional hace de sol: da volumen y es la que proyecta las sombras.
function crearLuces()
{
  luzAmbiente = new THREE.AmbientLight(0xffffff, 0.4);   // algo menor que en Tron: el entorno PBR ya aporta luz
  scene.add(luzAmbiente);

  luzSol = new THREE.DirectionalLight(0xfff4e0, 0.8);    // blanco ligeramente calido
  luzSol.position.copy(direccion_sol).multiplyScalar(50);
  luzSol.castShadow = true;
  luzSol.shadow.mapSize.set(2048, 2048);                 // resolucion del mapa de sombras
  luzSol.shadow.bias = -0.0005;                          // evita el "acne" (rayas) de sombra
  scene.add(luzSol);
  scene.add(luzSol.target);                              // el target tambien debe estar en la escena
}

// La sombra de una DirectionalLight se calcula con una camara ortografica.
// Su tamaño se ajusta al slime: una zona pequeña alrededor de el da sombras
// mucho mas nitidas que cubrir todo el nivel con la misma resolucion.
function configurarSombras()
{
  const camaraSombra = luzSol.shadow.camera;
  const extension = tamano_slime * 4;          // zona con sombra: 8 tamaños de slime de lado
  camaraSombra.left = -extension;
  camaraSombra.right = extension;
  camaraSombra.top = extension;
  camaraSombra.bottom = -extension;
  camaraSombra.near = tamano_slime * 0.1;
  camaraSombra.far = tamano_slime * 40;
  camaraSombra.updateProjectionMatrix();
  luzSol.shadow.normalBias = tamano_slime * 0.01;   // evita el acne en superficies curvas
}

// El sol se coloca siempre en la misma direccion respecto al slime (la luz no
// cambia de angulo), pero desplazado con el para que su sombra no salga del mapa.
function actualizarLuz()
{
  luzSol.target.position.copy(slime.position);
  luzSol.position.copy(slime.position).addScaledVector(direccion_sol, tamano_slime * 20);
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
function configurarStencilHUD(activo, escenaObjetivo)
{
  // Por defecto la escena principal; el visor le pasa su propia escena
  escenaObjetivo = escenaObjetivo || scene;
  escenaObjetivo.traverse(function(objeto) {
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

    var mirarAtras = false;

    if (modo_camara === 'seguimiento') {
        // Movimiento relativo a la camara: W se aleja de la
        // camara, S se acerca y A/D van de lado. El slime gira hacia donde va.
        moverRelativoACamara(delta);
    } else {
        // 3- movimiento: A/D giran, W/S avanzan y retroceden
        // Al ir hacia atras en la camara en tercera persona el slime mira hacia la
        // camara, asi que invertimos el giro: D siempre gira hacia la derecha de la
        // pantalla y A hacia la izquierda, mire hacia donde mire el modelo.
        var yendoAtras = controls.moveBackward && !controls.moveForward;
        var sentidoGiro = (modo_camara === 'tercera' && yendoAtras) ? -1 : 1;
        if (controls.moveLeft) angulo += controls.turnSpeed * delta * sentidoGiro;
        if (controls.moveRight) angulo -= controls.turnSpeed * delta * sentidoGiro;

        velocity.set(Math.sin(angulo), 0, Math.cos(angulo));

        var avance = controls.speed * tamano_slime * delta;
        if (controls.moveForward) pos_slime.addScaledVector(velocity, avance);
        if (controls.moveBackward) pos_slime.addScaledVector(velocity, -avance * 0.6);

        // Al ir hacia atras (S), el modelo se da la vuelta y camina de frente hacia
        // la camara. La camara sigue usando "angulo", asi que no da la vuelta con el.
        mirarAtras = controls.moveBackward && !controls.moveForward;
    }

    limitarAlSuelo(pos_slime);

    // VIDA- los objetos con vida pasean y huyen
    actualizarSeresVivos(delta);

    // COLISIONES- comer lo que es mas pequeño y chocar con lo que es mas grande
    comprobarColisiones();

    // CRECIMIENTO- aplicar el tamaño actual al modelo y a todo lo que depende de el
    actualizarCrecimiento(delta);

    // HUD- contamos el tiempo de juego y actualizamos la interfaz
    tiempoJugado += delta;
    actualizarHUD();

    // VISOR- gira el modelo y lo cambia (como mucho cada INTERVALO_VISOR segundos)
    actualizarVisor(delta);

    slime.position.copy(pos_slime);

    var rotacionObjetivo = angulo + (mirarAtras ? Math.PI : 0);
    // Giro suave por el camino mas corto (atan2 evita dar la vuelta larga)
    var diferencia = Math.atan2(Math.sin(rotacionObjetivo - rotacion_visual),
                                Math.cos(rotacionObjetivo - rotacion_visual));
    rotacion_visual += diferencia * (1 - Math.exp(-10 * delta));
    slime.rotation.y = rotacion_visual + rotacion_frente;

    // DEBUG- actualizamos solamente la camara que esta activa.
    if (modo_camara === 'orbital') {
        cameraControls.update();
    } else if (modo_camara === 'seguimiento') {
        updateCameraSeguimiento(delta);
    } else {
        updateCamera(delta);
    }

    // Avanzar la animación según el tiempo transcurrido
    // ILUMINACION- el sol acompaña al slime para que su sombra siempre sea nitida
    actualizarLuz();

    // COMER- animacion de los objetos que estan siendo absorbidos
    actualizarObjetos(delta);

    // VELOCIDAD ANIMACION- mas rapida si se esta moviendo. Se suaviza con
    // amortiguar() para que el cambio de ritmo no sea brusco.
    if (accionSlime != null) {
        var moviendose = controls.moveForward || controls.moveBackward ||
                         controls.moveLeft || controls.moveRight;
        var velocidadAnim = moviendose ? VELOCIDAD_ANIM_MOVIENDOSE : VELOCIDAD_ANIM_QUIETO;
        accionSlime.timeScale = amortiguar(accionSlime.timeScale, velocidadAnim, 5, delta);
    }

    if (mixer != null) mixer.update(delta);

    // MODELOS- animaciones de los objetos con modelo animado (hormigas...)
    for (let i = 0; i < mixersObjetos.length; i++) mixersObjetos[i].update(delta);
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

  // Punto al que miraba la camara anterior, para que la siguiente empiece sin tirones
  var miradaAnterior = new THREE.Vector3();
  if (modo_camara === 'orbital') miradaAnterior.copy(cameraControls.target);
  else if (modo_camara === 'seguimiento') miradaAnterior.copy(cam_seguimiento.objetivo);
  else miradaAnterior.copy(mirada_actual_camara);

  // Siguiente modo de la lista (al llegar al final vuelve al primero)
  var indice = MODOS_CAMARA.indexOf(modo_camara);
  modo_camara = MODOS_CAMARA[(indice + 1) % MODOS_CAMARA.length];
  cameraControls.enabled = (modo_camara === 'orbital');

  if (modo_camara === 'orbital') {
    cameraControls.target.copy(slime.position);
    cameraControls.update();
  } else if (modo_camara === 'seguimiento') {
    iniciarCamaraSeguimiento(miradaAnterior);
  } else {
    // Volvemos suavemente desde la posicion anterior, sin tirones
    velocidad_camara.set(0, 0, 0);
    velocidad_mirada_camara.set(0, 0, 0);
    mirada_actual_camara.copy(miradaAnterior);
  }

  mostrarModoCamara(true);
}


// ---------------------------------------------------------------------------
// CAMARA DE SEGUIMIENTO- orbita en tercera persona controlada por el usuario.
// Su posicion se calcula en coordenadas esfericas alrededor del punto objetivo:
//   x = objetivo.x + sin(yaw) * cos(pitch) * dist
//   y = objetivo.y + sin(pitch) * dist
//   z = objetivo.z + cos(yaw) * cos(pitch) * dist
// ---------------------------------------------------------------------------
function crearControlesCamaraSeguimiento()
{
  const lienzo = renderer.domElement;

  // Arrastrar con el raton: gira la camara alrededor del slime
  lienzo.addEventListener('pointerdown', function (e) {
    if (modo_camara !== 'seguimiento') return;
    cam_seguimiento.arrastre = { x: e.clientX, y: e.clientY };
    lienzo.setPointerCapture(e.pointerId);
  });
  lienzo.addEventListener('pointermove', function (e) {
    if (modo_camara !== 'seguimiento' || !cam_seguimiento.arrastre) return;
    cam_seguimiento.yaw -= (e.clientX - cam_seguimiento.arrastre.x) * 0.006;
    cam_seguimiento.pitch = THREE.MathUtils.clamp(cam_seguimiento.pitch + (e.clientY - cam_seguimiento.arrastre.y) * 0.004, 0.12, 1.3);
    cam_seguimiento.arrastre.x = e.clientX;
    cam_seguimiento.arrastre.y = e.clientY;
  });
  const soltar = function () { cam_seguimiento.arrastre = null; };
  lienzo.addEventListener('pointerup', soltar);
  lienzo.addEventListener('pointercancel', soltar);

  // Rueda: acercar o alejar
  lienzo.addEventListener('wheel', function (e) {
    if (modo_camara !== 'seguimiento') return;
    e.preventDefault();
    cam_seguimiento.zoom = THREE.MathUtils.clamp(cam_seguimiento.zoom * Math.exp(e.deltaY * 0.001), 0.6, 1.8);
  }, { passive: false });
}

// Al entrar en este modo calculamos yaw, pitch y distancia a partir de donde
// esta la camara ahora, para que el cambio no dé un salto
function iniciarCamaraSeguimiento(miradaAnterior)
{
  cam_seguimiento.objetivo.copy(miradaAnterior);
  _offsetSeguimiento.copy(camera.position).sub(cam_seguimiento.objetivo);
  cam_seguimiento.dist = Math.max(_offsetSeguimiento.length(), tamano_slime * 0.5);
  cam_seguimiento.yaw = Math.atan2(_offsetSeguimiento.x, _offsetSeguimiento.z);
  cam_seguimiento.pitch = THREE.MathUtils.clamp(Math.asin(_offsetSeguimiento.y / cam_seguimiento.dist), 0.12, 1.3);
  cam_seguimiento.arrastre = null;
}

// Interpolacion exponencial: independiente de los FPS
// Igual que amortiguar() pero para angulos: gira por el camino mas corto
// (de 170º a -170º gira 20º, no 340º)
function amortiguarAngulo(actual, objetivo, rapidez, delta)
{
  const diferencia = Math.atan2(Math.sin(objetivo - actual), Math.cos(objetivo - actual));
  return actual + diferencia * (1 - Math.exp(-rapidez * delta));
}

function amortiguar(actual, objetivo, rapidez, delta)
{
  return actual + (objetivo - actual) * (1 - Math.exp(-rapidez * delta));
}

function updateCameraSeguimiento(delta)
{
  // Q / E giran la camara con el teclado
  if (controls.rotateCameraLeft) cam_seguimiento.yaw += 1.8 * delta;
  if (controls.rotateCameraRight) cam_seguimiento.yaw -= 1.8 * delta;

  // La distancia y el punto de mira siguen a su valor ideal con suavizado
  var distObjetivo = DISTANCIA_SEGUIMIENTO * tamano_slime * cam_seguimiento.zoom;
  cam_seguimiento.dist = amortiguar(cam_seguimiento.dist, distObjetivo, 2.5, delta);
  cam_seguimiento.objetivo.x = amortiguar(cam_seguimiento.objetivo.x, slime.position.x, 10, delta);
  cam_seguimiento.objetivo.y = amortiguar(cam_seguimiento.objetivo.y, slime.position.y + tamano_slime * 0.55, 6, delta);
  cam_seguimiento.objetivo.z = amortiguar(cam_seguimiento.objetivo.z, slime.position.z, 10, delta);

  var cp = Math.cos(cam_seguimiento.pitch);
  camera.position.set(
    cam_seguimiento.objetivo.x + Math.sin(cam_seguimiento.yaw) * cp * cam_seguimiento.dist,
    cam_seguimiento.objetivo.y + Math.sin(cam_seguimiento.pitch) * cam_seguimiento.dist,
    cam_seguimiento.objetivo.z + Math.cos(cam_seguimiento.yaw) * cp * cam_seguimiento.dist
  );
  camera.lookAt(cam_seguimiento.objetivo);
}

// Movimiento relativo a la camara: "adelante" es la direccion en la que mira la
// camara (proyectada en el suelo) y "derecha" su perpendicular
function moverRelativoACamara(delta)
{
  var adelante = 0, lado = 0;
  if (controls.moveForward) adelante += 1;
  if (controls.moveBackward) adelante -= 1;
  if (controls.moveRight) lado += 1;
  if (controls.moveLeft) lado -= 1;

  var sy = Math.sin(cam_seguimiento.yaw), cy = Math.cos(cam_seguimiento.yaw);
  var dx = -sy * adelante + cy * lado;
  var dz = -cy * adelante - sy * lado;
  var largo = Math.hypot(dx, dz);
  if (largo === 0) return;
  dx /= largo;
  dz /= largo;

  pos_slime.x += dx * controls.speed * tamano_slime * delta;
  pos_slime.z += dz * controls.speed * tamano_slime * delta;

  // El slime se orienta hacia donde se mueve. Actualizamos "angulo" y "velocity"
  // para que, al volver a la camara en tercera persona, esta se coloque detras.
  var objetivo = Math.atan2(dx, dz);
  angulo += Math.atan2(Math.sin(objetivo - angulo), Math.cos(objetivo - angulo)) * (1 - Math.exp(-10 * delta));
  velocity.set(Math.sin(angulo), 0, Math.cos(angulo));
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
  const alto_stats = 48;                              // el contador de FPS ocupa la esquina: bajamos el minimapa
  const y = window.innerHeight - lado - margen - alto_stats;

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

  // VISOR- circulo en la esquina inferior derecha, visible desde el inicio
  // (vacio hasta el primer bocado). Mismos pasos que el minimapa: mascara
  // circular, escena del visor y aro.
  {
    const xv = window.innerWidth - lado - margen;
    const yv = margen;                                // en WebGL, y se mide desde abajo

    renderer.setViewport(xv, yv, lado, lado);
    renderer.setScissor(xv, yv, lado, lado);

    gl.stencilMask(0xff);
    renderer.clear(false, true, true);
    renderer.render(stencilScene, cameraStencil);

    configurarStencilHUD(true, escenaVisor);
    renderer.render(escenaVisor, camaraVisor);
    configurarStencilHUD(false, escenaVisor);

    renderer.clearDepth();
    renderer.render(hudBorderScene, cameraStencil);

    // La etiqueta HTML se coloca centrada sobre el borde superior del circulo
    // (en CSS, bottom se mide desde abajo igual que el viewport)
    fijarHUD('visorPos', lado + ',' + margen, function () {
      etiquetaVisor.style.right = (margen + lado / 2) + 'px';
      etiquetaVisor.style.bottom = (margen + lado - 16) + 'px';
    });
  }

  renderer.setScissorTest(false);
}