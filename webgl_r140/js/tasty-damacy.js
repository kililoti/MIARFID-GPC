// ejemplo loader

var loader;
var renderer, scene, camera;
var cameraControls;
var stats;
var angulo = -0.01;
var mixer = null;      // reproduce las animaciones del modelo

// 3- movimiento y camara en tercera persona (misma estructura que el proyecto Tron)
var slime = null;                              // grupo que contiene el modelo y se mueve por la escena
var tamano_slime = 1;                          // tamaño ACTUAL del slime: camara, velocidad, sombras... son proporcionales
var tamano_base = 1;                           // tamaño ORIGINAL del modelo: el escenario y los objetos se miden con el
var tamano_objetivo = 1;                       // tamaño hacia el que crece (tamano_slime lo alcanza poco a poco)
var cuerpo_slime = null;                       // grupo intermedio que se escala al crecer
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
    // Objetos del nivel: [tipo, cantidad, tamañoMin, tamañoMax]
    // El tamaño es la mitad de su dimension mayor, en tamaños de slime
    catalogo: [
      ['semilla', 3000, 0.12, 0.18]
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

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 1000 );
  camera.position.set( 10, 15, 20 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  crearMinimapa();
  crearControlesCamaraSeguimiento();

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
            tamano_base = maxDim;
            tamano_objetivo = maxDim;

            // Escenario: suelo del primer nivel (su tamaño depende del slime)
            crearSuelo(0);
            configurarSombras();
            generarObjetos(0);     // OBJETOS- los comestibles del primer nivel

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
const TIPOS = {
  semilla: { nombre: 'Semilla', huella: 0.8, crear: crearSemilla }
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
      objetos.push({ tipo: tipo, def: def, tam: tam, radio: radio, escala: indice, grupo: grupo, estado: 'activo' });
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
  return objeto.tam < radioSlime() * FACTOR_COMESTIBLE;
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

  comidos++;
  console.log('Comido:', objeto.def.nombre, '- total:', comidos,
              '- tamaño:', (tamano_objetivo / tamano_base).toFixed(2) + 'x');
}

// CRECIMIENTO- el tamaño actual se acerca suavemente al objetivo y todo lo que
// depende de el (modelo, camaras, sombras, minimapa) se recalcula
function actualizarCrecimiento(delta)
{
  tamano_slime = amortiguar(tamano_slime, tamano_objetivo, 5, delta);
  cuerpo_slime.scale.setScalar(tamano_slime / tamano_base);

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
  scene.add(grupo);

  suelos[indice] = { grupo: grupo, radio: radio };
  console.log('Escenario creado:', E.nombre, '- radio', radio.toFixed(2));
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

    // COLISIONES- comer lo que es mas pequeño y chocar con lo que es mas grande
    comprobarColisiones();

    // CRECIMIENTO- aplicar el tamaño actual al modelo y a todo lo que depende de el
    actualizarCrecimiento(delta);

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

  console.log('Camara:', modo_camara);
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

  renderer.setScissorTest(false);
}wwwww