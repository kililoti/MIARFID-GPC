// ejemplo loader

var loader;
var renderer, scene, camera;
var cameraControls;
var stats;
var angulo = -0.01;
var mixer = null; // reproduce las animaciones del modelo
var accionSlime = null; // la animacion del slime (AnimationAction), para cambiar su velocidad

// VELOCIDAD ANIMACION- el slime se anima mas deprisa cuando se mueve
const VELOCIDAD_ANIM_QUIETO = 1; // 1 = velocidad normal del clip
const VELOCIDAD_ANIM_MOVIENDOSE = 3; // 2 = el doble de rapido

// 3- movimiento y camara en tercera persona (misma estructura que el proyecto Tron)
var slime = null; // grupo que contiene el modelo y se mueve por la escena
var tamano_slime = 1; // tamaño ACTUAL del slime: camara, velocidad, sombras... son proporcionales
var tamano_base = 1; // tamaño ORIGINAL del modelo: el escenario y los objetos se miden con el
var tamano_objetivo = 1; // tamaño hacia el que crece (tamano_slime lo alcanza poco a poco)
var cuerpo_slime = null; // grupo intermedio que se escala al crecer

// AURA- luz puntual que acompaña al slime e ilumina suavemente lo que tiene cerca
const AURA_COLOR = 0x9fffe0; // tono verdoso, a juego con el slime y el HUD
const AURA_INTENSIDAD = 0.6;
const AURA_ALCANCE = 5; // en tamaños de slime: hasta donde llega su luz
var luzAura = null;

// ANIMACION COMER- el slime se aplasta y rebota como una gelatina al comer
var estiramiento = 0; // deformacion actual (+ aplastado, - estirado)
var velocidadEstiramiento = 0; // con que rapidez cambia esa deformacion
var ultimoEmpujon = -1; // instante (s) del ultimo empujon al muelle
const INTERVALO_EMPUJON = 0.25; // tiempo minimo entre empujones: deja rebotar al muelle
var rotacion_frente = 0; // si el slime camina "de espaldas", pon Math.PI
var rotacion_visual = -0.01; // hacia donde mira el modelo (puede diferir de angulo)
const pos_slime = new THREE.Vector3();
const velocity = new THREE.Vector3(0, 0, 1); // direccion hacia la que mira el slime

var distancia_camara = 2.5; // en tamaños de slime
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

// Cámaras (Cambiar con tecla c)
//   'tercera' = cámara en tercera persona con resorte de Tron
//   'orbital' = cámara orbital libre con el raton
//   'seguimiento' = orbita alrededor del slime con el raton
const MODOS_CAMARA = ['tercera', 'orbital', 'seguimiento'];
var modo_camara = 'tercera';

// Estado de la camara de seguimiento
const cam_seguimiento = {
  yaw: 0, // giro horizontal alrededor del slime
  pitch: 0.5, // inclinacion
  zoom: 1,
  dist: 1,
  objetivo: new THREE.Vector3(), // punto al que mira (sigue al slime con suavizado)
  arrastre: null // posicion del raton mientras se arrastra
};
const DISTANCIA_SEGUIMIENTO = 3.5;
const _offsetSeguimiento = new THREE.Vector3();

const controls = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  rotateCameraLeft: false,
  rotateCameraRight: false,
  speed: 1.8, // tamaños de slime por segundo
  turnSpeed: 2.5 // radianes por segundo
};

document.addEventListener('keydown', (event) => {
  if (!juegoIniciado) return; // Hasta pulsar "Jugar", el slime no se mueve
  if (juegoTerminado) return; // El juego terminado, el slime ya no se mueve

  // La P pausa y despausa
  if (event.code === 'KeyP') {
    if (!event.repeat) alternarPausa();
    return;
  }
  if (juegoPausado) return;
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
  if (!juegoIniciado) return;
  if (juegoPausado) return;
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
    case 'KeyC':
      cambiarCamara();
      break;
    // La M silencia/activa todo el audio
    case 'KeyM':
      alternarSilencio();
      break;
    // La H activa/desactiva la flecha guia
    case 'KeyH':
      alternarFlecha();
      break;
    // La B activa/desactiva el efecto de Bloom
    case 'KeyB':
      alternarBloom();
      break;
    // Saltar directamente a un nivel
    case 'Digit1':
    case 'Digit2':
    case 'Digit3':
    case 'Digit4':
    case 'Digit5':
    case 'Digit6':
    case 'Digit7':
    case 'Digit8':
    case 'Digit9':
      saltarANivel(parseInt(event.code.charAt(5), 10) - 1);
      break;
  }
});

// Escenarios: Las medidas van en tamaños de slime
const ESCALAS = [
  {
    nombre: 'La hierba',
    radioSuelo: 14,
    altoBorde: 0.8, // grosor del borde de tierra
    colorSuelo: 0x5d8331,
    colorBorde: 0x5b3a22,
    repetirTextura: 6, // veces que se repite la textura sobre el suelo
    texturaSuelo: 'images/tasty_damacy/nivel1.jpg',
    umbral: 5, // tamaño necesario para pasar al siguiente nivel
    // Fondo del cilindro que rodea el suelo con una imagen panoramica por dentro
    fondo: 'images/tasty_damacy/fondo_nivel1.jpg',
    altoFondo: 0.8, // altura del cilindro respecto al radio del suelo
    colorCielo: 0xcfe8ff, // el cilindro esta abierto por arriba, este color se ve encima
    // Objetos del nivel: [tipo, cantidad, tamañoMin, tamañoMax]
    // Tamaño necesario para comer cada objeto = su tamaño / 0,425.
    // Los grandes van primero para que encuentren hueco al colocarse.
    catalogo: [
      ['maceta', 1, 4, 4],
      ['semilla', 30, 0.12, 0.18],
      ['hormiga', 20, 0.3, 0.4],
      ['piedra', 25, 0.15, 0.35],
      ['hierba', 12, 0.25, 0.5],
      ['flor', 12, 0.4, 0.7],
      ['setaRoja', 12, 0.7, 0.9],
      ['setaAzul', 12, 0.7, 0.9],
      ['lata', 1, 1.4, 1.4],
      ['botella', 1, 1.8, 1.8],
    ]
  },
  {
    nombre: 'El parque',
    radioSuelo: 120,
    altoBorde: 6,
    colorSuelo: 0x4c8a36,
    colorBorde: 0x4a2f1b,
    repetirTextura: 48,
    texturaSuelo: 'images/tasty_damacy/nivel2.jpg',
    umbral: 40,
    fondo: 'images/tasty_damacy/fondo_nivel2.jpg',
    altoFondo: 0.8,
    colorCielo: 0xcfe8ff,
    catalogo: [
      ['arbol3', 1, 22, 22],
      ['arbol2', 1, 20, 20],
      ['arbol1', 1, 18, 18],
      ['farola', 3, 17.5, 17.5],
      ['banco', 8, 7.8, 8.5],
      ['excalibur', 1, 7.5, 7.5],
      ['hombre', 10, 6.0, 7.0],
      ['mujer', 10, 5.5, 6.5],
      ['perro', 10, 3.2, 4.5],
      ['arbusto', 30, 3.5, 8.0],
      ['casa_calamardo', 1, 3.5, 3.5],
      ['casa_esponja', 1, 3.5, 3.5],
      ['casa_patricio', 1, 3.5, 3.5],
      ['maceta', 18, 2.5, 4.0],
      ['calamardo', 1, 2.0, 2.0],
      ['patricio', 1, 2.0, 2.0],
      ['esponja', 1, 2.0, 2.0],
      ['botella', 25, 1.7, 2.2],
      ['lata', 25, 1.0, 1.5]
    ]
  },
  {
    nombre: 'La ciudad',
    radioSuelo: 1200,
    altoBorde: 50,
    colorSuelo: 0x9a9a95,
    colorBorde: 0x5c5850,
    tamanoBaldosa: 120,
    texturaSuelo: 'images/tasty_damacy/nivel3.jpg',
    umbral: 300,
    fondo: 'images/tasty_damacy/fondo_nivel3.jpg',
    altoFondo: 0.8,
    colorCielo: 0xcfe8ff,
    catalogo: [
      ['torre3', 2, 120, 120],
      ['torre2', 3, 110, 110],
      ['torre1', 4, 100, 100],
      ['fuente', 4, 46, 50],
      ['casa4', 4, 44, 50],
      ['casa3', 6, 40, 45],
      ['casa2', 8, 36, 40],
      ['casa1', 8, 33, 37],
      ['tienda', 10, 30, 34],
      ['arbol3', 15, 27, 32],
      ['arbol2', 18, 22, 27],
      ['arbol1', 20, 18, 22],
      ['farola2', 25, 19, 22],
      ['farola', 30, 17.5, 20],
      ['coche2', 30, 9, 11],
      ['coche', 30, 8, 11],
      ['hombre', 30, 8.0, 9.0],
      ['mujer', 30, 7.5, 8.5],
      ['perro', 20, 4.2, 6.5]
    ]
  },
    {
    nombre: 'La naturaleza',
    radioSuelo: 8000,
    altoBorde: 400,
    colorSuelo: 0x5e8f3a,
    colorBorde: 0x4a3220,
    tamanoBaldosa: 960,
    texturaSuelo: 'images/tasty_damacy/nivel4.jpg',
    umbral: 4800,
    fondo: 'images/tasty_damacy/fondo_nivel4.jpg',
    altoFondo: 1,
    colorCielo: 0xcfe8ff,
    catalogo: [
      ['godzilla', 1, 1400, 1400],
      ['serafin', 1, 950, 950],
      ['hallucigenia', 1, 1200, 1200],
      ['golem', 1, 950, 950],
      ['monte3', 10, 650, 800],
      ['monte2', 14, 450, 650],
      ['monte1', 18, 300, 500],
      ['ciudad', 4, 260, 320],
      ['castillo', 15, 160, 210],
      ['bosque', 40, 160, 210],
      ['mamut', 8, 160, 210],
      ['molino2', 30, 100, 130],
      ['molino', 30, 100, 130]
    ]
  },
  {
    nombre: 'El espacio',
    // No tiene suelo, el slime flota en y = 0. Al llegar desaparecen
    // los suelos de todos los niveles anteriores. radioSuelo sigue marcando hasta
    // donde puede moverse el slime y donde se colocan los objetos.
    espacio: true,
    // Los objetos que queden de niveles anteriores también desaparecen
    borrarObjetosAnteriores: true,
    radioSuelo: 128000,
    altoBorde: 0,
    umbral: 55000,
    catalogo: [
      ['tierra', 1, 28000, 28000],
      ['luna', 1, 14000, 14000],
      ['asteroide1', 30, 1000, 5000],
      ['asteroide2', 30, 1000, 5000],
      ['asteroide3', 30, 1000, 5000],
      ['asteroide4', 30, 1000, 5000],
      ['ovni', 20, 2800, 3600],
      ['cohete', 20, 2800, 3600],
      ['robot', 20, 2800, 3600],
      ['satelite', 25, 1900, 2500],
      ['satelite2', 25, 1900, 2500],
      ['astronauta', 30, 1300, 1700]
    ]
  },
  {
    nombre: 'El sistema solar',
    espacio: true,
    sistemaSolar: true,
    borrarObjetosAnteriores: true,
    radioSuelo: 1000000,
    altoBorde: 0,
    umbral: 235200,
    //{ centro: true } = se coloca en el centro del nivel (el Sol)
    //{ orbita: x } = gira alrededor del centro
    catalogo: [
      ['sol',      1, 50000, 50000, { centro: true }],
      ['jupiter',  1, 30000, 30000, { orbita: 0.45 }],
      ['saturno',  1, 26000, 26000, { orbita: 0.60 }],
      ['urano',    1, 22000, 22000, { orbita: 0.74 }],
      ['neptuno',  1, 20000, 20000, { orbita: 0.87 }],
      ['tierra',   1, 16000, 16000, { orbita: 0.27 }],
      ['venus',    1, 14000, 14000, { orbita: 0.20 }],
      ['marte',    1, 12000, 12000, { orbita: 0.33 }],
      ['mercurio', 1, 10000, 10000, { orbita: 0.14 }],
      ['cometa', 80, 8000, 10000],
      ['asteroide1', 200, 2000, 6000],
      ['asteroide2', 200, 2000, 6000],
      ['asteroide3', 200, 2000, 6000],
      ['asteroide4', 200, 2000, 6000]
    ]
  }
];
var escala_actual = 0;

// Imagen de fondo de la escena.
// equirectangular: true = panoramica 360, rodea la escena
// equirectangular: false = imagen normal, se queda fija detras
const CIELOS = [
  { desdeNivel: 1, imagen: 'images/tasty_damacy/arcoiris_fondo.jpg', equirectangular: true },
  { desdeNivel: 5, imagen: 'images/tasty_damacy/fondo_nivel5.jpg', equirectangular: true },
  { desdeNivel: 6, imagen: 'images/tasty_damacy/fondo_nivel6.jpg', equirectangular: true }
];
var cieloActual = null;

//Luces
var luzSol, luzAmbiente;
const direccion_sol = new THREE.Vector3(30, 50, 20).normalize();
var suelos = [];

// Cambio de nmivel
const transicion = { activa: false, t: 0, duracion: 3.5 };
const DURACION_CRECER_SUELO = 1.7; // segundos que tarda el suelo nuevo en extenderse

// Minimapa, camara cenital ortografica en la esquina superior izquierda
var cameraTop, cameraStencil;
var stencilScene, hudBorderScene;
var alcance_hud = 20;
const centro_hud = new THREE.Vector3(0, 10, 0);

// Música, cuanto mayor el peso, mas probable
const CANCIONES = [
  { ruta: 'sounds/lonely_rolling_star.mp3', peso: 1 },
  { ruta: 'sounds/lets_fly_to_rio.mp3', peso: 1 },
];
const VOLUMEN_MUSICA = 0.2;
var cancionActual = null;
const VOLUMEN_EFECTOS = 0.5;

// Sonidos de comer, cuanto mayor el peso, mas probable
const SONIDOS_COMER = [
  { ruta: 'sounds/katamari_comer2.wav', peso: 100 },
  { ruta: 'sounds/mordisco.wav', peso: 50 },
  { ruta: 'sounds/tragar.wav', peso: 10 },
  { ruta: 'sounds/nom.wav', peso: 5 },
];

// Sonidos de choque y victoria
const RUTA_SONIDO_VICTORIA = 'sounds/katamari_victoria.wav';
const VOLUMEN_VICTORIA = 0.6;
var canalVictoria;

const SONIDOS_CHOQUE = [
  { ruta: 'sounds/katamari_no.wav', peso: 10 },
  { ruta: 'sounds/katamari_no2.wav', peso: 8 },
  { ruta: 'sounds/katamari_no3.wav', peso: 5 },
  { ruta: 'sounds/ouch.wav', peso: 1 },
];
const VOLUMEN_CHOQUE = 0.3;
const INTERVALO_CHOQUE = 0.6; // segundos minimos entre dos sonidos de choque
const FUERZA_TEMBLOR = 0.02; // nivel de movimiento de pantalla
var canalChoque;
var ultimoChoque = -10;
var temblor = 0;

// Marcador anillo bajo la cosa comestible mas grande que haya cerca
const DISTANCIA_RESALTE = 3; // hasta donde se buscan objetos en tamaños de slime
var anilloResalte;
var objetoResaltado = null;

// Flecha sobre el slime que apunta al mejor comida del radio
const DISTANCIA_FLECHA = 6; // en tamaños de slime: hasta donde busca
var flechaActiva = true;
var flecha;
var objetivoFlecha = null;
var chocandoAntes = false;
var chocandoAhora = false;

var oyente;
var musica;
var canalesComer = [];
const MAX_CANALES_COMER = 6; // como mucho, 6 sonidos de comida sonando simultáneamente
var silenciado = false;

// Modelos glTF de los objetos comestibles. Van antes de init() porque
// init() empieza a cargarlos y necesita que estas variables ya existan.
const MODELOS_OBJETOS = {
  // La hierba
  hormiga: { ruta: 'models/hormiga/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'Armature|Idle', animAndar: 'Armature|Walk' },
  piedra:   { ruta: 'models/piedra/scene.gltf', plantilla: null, animaciones: [] },
  setaRoja: { ruta: 'models/seta_roja/scene.gltf', plantilla: null, animaciones: []},
  setaAzul: { ruta: 'models/seta_azul/scene.gltf', plantilla: null, animaciones: []},
  hierba: { ruta: 'models/hierba/scene.gltf', plantilla: null, animaciones: []},
  flor: { ruta: 'models/flor/scene.gltf', plantilla: null, animaciones: []},
  lata: { ruta: 'models/lata/scene.gltf', plantilla: null, animaciones: []},
  botella: { ruta: 'models/botella/scene.gltf', plantilla: null, animaciones: []},

  // El parque
  esponja: { ruta: 'models/esponja/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'IDLE01', animAndar: 'RUN01'},
  patricio: { ruta: 'models/patricio/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'patrick_bind.dff|patrick_idlenorm_new.anm', animAndar: 'patrick_bind.dff|patrick_runnorm.anm'},
  calamardo: { ruta: 'models/calamardo/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'Take 001', animAndar: 'Take 001'},
  casa_esponja: { ruta: 'models/casa_esponja/scene.gltf', plantilla: null, animaciones: []},
  casa_patricio: { ruta: 'models/casa_patricio/scene.gltf', plantilla: null, animaciones: []},
  casa_calamardo: { ruta: 'models/casa_calamardo/scene.gltf', plantilla: null, animaciones: []},
  maceta: { ruta: 'models/maceta/scene.gltf', plantilla: null, animaciones: []},
  arbusto: { ruta: 'models/arbusto/scene.gltf', plantilla: null, animaciones: []},
  banco: { ruta: 'models/banco/scene.gltf', plantilla: null, animaciones: []},
  perro: { ruta: 'models/perro/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'Idle Small dog Anim', animAndar: 'Walk Animation-Animation|continous walk'},
  hombre: { ruta: 'models/hombre/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'Idle', animAndar: 'Walk'},
  mujer: { ruta: 'models/mujer/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'Idle', animAndar: 'Walk'},
  excalibur: { ruta: 'models/excalibur/scene.gltf', plantilla: null, animaciones: []},
  farola: { ruta: 'models/farola/scene.gltf', plantilla: null, animaciones: []},
  farola2: { ruta: 'models/farola2/scene.gltf', plantilla: null, animaciones: []},

  // La ciudad
  coche: { ruta: 'models/coche/scene.gltf', plantilla: null, animaciones: [], sinAnimaciones: true },
  coche2: { ruta: 'models/coche2/scene.gltf', plantilla: null, animaciones: [], sinAnimaciones: true },
  arbol1: { ruta: 'models/arbol1/scene.gltf', plantilla: null, animaciones: []},
  arbol2: { ruta: 'models/arbol2/scene.gltf', plantilla: null, animaciones: []},
  arbol3: { ruta: 'models/arbol3/scene.gltf', plantilla: null, animaciones: []},
  tienda: { ruta: 'models/tienda/scene.gltf', plantilla: null, animaciones: []},
  casa1: { ruta: 'models/casa1/scene.gltf', plantilla: null, animaciones: []},
  casa2: { ruta: 'models/casa2/scene.gltf', plantilla: null, animaciones: []},
  casa3: { ruta: 'models/casa3/scene.gltf', plantilla: null, animaciones: []},
  casa4: { ruta: 'models/casa4/scene.gltf', plantilla: null, animaciones: []},
  fuente: { ruta: 'models/fuente/scene.gltf', plantilla: null, animaciones: []},
  torre1: { ruta: 'models/torre1/scene.gltf', plantilla: null, animaciones: []},
  torre2: { ruta: 'models/torre2/scene.gltf', plantilla: null, animaciones: []},
  torre3: { ruta: 'models/torre3/scene.gltf', plantilla: null, animaciones: []},

  // La naturaleza
  molino: { ruta: 'models/molino/scene.gltf', plantilla: null, animaciones: []},
  molino2: { ruta: 'models/molino2/scene.gltf', plantilla: null, animaciones: []},
  mamut: { ruta: 'models/mamut/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'ColumbianMammoth_Idle', animAndar: 'CoumbianMammoth_WalkCycle'},
  bosque: { ruta: 'models/bosque/scene.gltf', plantilla: null, animaciones: []},
  castillo: { ruta: 'models/castillo/scene.gltf', plantilla: null, animaciones: []},
  ciudad: { ruta: 'models/ciudad/scene.gltf', plantilla: null, animaciones: []},
  monte1: { ruta: 'models/monte1/scene.gltf', plantilla: null, animaciones: []},
  monte2: { ruta: 'models/monte2/scene.gltf', plantilla: null, animaciones: []},
  monte3: { ruta: 'models/monte3/scene.gltf', plantilla: null, animaciones: []},
  godzilla: { ruta: 'models/godzilla/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'animation.godzilla.idle', animAndar: 'animation.godzilla.move'},
  serafin: { ruta: 'models/serafin/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'idle', animAndar: 'fly'},
  hallucigenia: { ruta: 'models/hallucigenia/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'animation.hallucigenia.move', animAndar: 'animation.hallucigenia.move'},
  golem: { ruta: 'models/golem/scene.gltf', plantilla: null, animaciones: [], animQuieto: 'ArmatureAction', animAndar: 'ArmatureAction'},

  // El espacio
  astronauta: { ruta: 'models/astronauta/scene.gltf', plantilla: null, animaciones: []},
  satelite: { ruta: 'models/satelite/scene.gltf', plantilla: null, animaciones: []},
  satelite2: { ruta: 'models/satelite2/scene.gltf', plantilla: null, animaciones: []},
  ovni: { ruta: 'models/ovni/scene.gltf', plantilla: null, animaciones: []},
  cohete: { ruta: 'models/cohete/scene.gltf', plantilla: null, animaciones: []},
  robot: { ruta: 'models/robot/scene.gltf', plantilla: null, animaciones: []},
  asteroide1: { ruta: 'models/asteroide1/scene.gltf', plantilla: null, animaciones: []},
  asteroide2: { ruta: 'models/asteroide2/scene.gltf', plantilla: null, animaciones: []},
  asteroide3: { ruta: 'models/asteroide3/scene.gltf', plantilla: null, animaciones: []},
  asteroide4: { ruta: 'models/asteroide4/scene.gltf', plantilla: null, animaciones: []},

  // El sistema solar
  cometa: { ruta: 'models/cometa/scene.gltf', plantilla: null, animaciones: []},
};
var promesaModelos = null;     // se cumple cuando todos los modelos estan cargados
var mixersObjetos = [];

const clock = new THREE.Clock();

var puntos = 0;

// El juego termina al comerse el Sol
var juegoTerminado = false;

// La partida empieza al pulsar "Jugar" en el menu de inicio
var juegoIniciado = false;

// Con la P se detiene todo: movimiento, objetos, animaciones y cronometro
var juegoPausado = false;
var pantallaPausa;
var apagon = 0; // Al comerse el Sol, las luces se apagan poco a poco
const ESPERA_PANTALLA_FINAL = 2.5; // segundos entre el bocado final y la pantalla de victoria
var tiempoJugado = 0; // segundos jugando de verdad
var hud = {};
var cacheHUD = {};
var temporizadorAviso = null;
var ultimoAvisoChoque = -10; // evita repetir "demasiado grande" en cada frame del choque

// Visualizador de cosas comidas en la esquina inferior derecha con el ultimo objeto comido girando.
// Es una escena aparte, con su propia camara y luces, que se dibuja encima de
// la principal con la misma tecnica (viewport + stencil) que el minimapa.
var escenaVisor, camaraVisor;
var pivoteVisor = null;
var etiquetaVisor;
var visorPendiente = null;
var ultimoCambioVisor = -10;
const INTERVALO_VISOR = 0.6; // tiempo minimo que se muestra cada modelo
const RADIO_VISOR = 0.75;

const NOMBRES_CAMARA = {
  tercera: 'Tercera persona',
  orbital: 'Orbital',
  seguimiento: 'Seguimiento'
};

// Bloom, brillo de cada nivel. De dia, un brilla menos, umbral alto para que solo destaquen los
// reflejos. En el espacio, mucho mas fuerte.
const BLOOM_DIA = { fuerza: 0.35, radio: 0.4, umbral: 0.9 };
const BLOOM_ESPACIO = { fuerza: 0.35, radio: 0.6, umbral: 0.8 };
var composer = null;
var bloomPass = null;
var bloomActivo = false;
var bloomObjetivo = null;

init();
render();


function init()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // bordes de sombra suavizados
  document.getElementById('container').appendChild( renderer.domElement );

  stats = new Stats();
  stats.showPanel(0); // FPS inicialmente. Picar para cambiar panel.
  document.getElementById('container').appendChild( stats.domElement );

  scene = new THREE.Scene();
  crearEntorno();
  actualizarCielo(0);

  // cargo el objeto
  loadObjGLTF();
  promesaModelos = cargarModelosObjetos(); // Modelos que se cargan a la vez que el slime

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 1000 );
  camera.layers.enable(1);
  camera.position.set( 10, 15, 20 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  crearMinimapa();
  crearControlesCamaraSeguimiento();
  crearAudio();
  crearHUD();
  crearMenuInicio();
  crearPantallaPausa();
  crearBloom();

  // Si se cambia de pestaña o de ventana en mitad de la partida, se pausa sola
  document.addEventListener('visibilitychange', function () {
    if (document.hidden && !juegoPausado) alternarPausa();
  });
  window.addEventListener('blur', function () {
    if (!juegoPausado) alternarPausa();
  });
  crearResalte();
  crearFlecha();
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
    let model = 'models/slime_gltf/scene.gltf';

    // Para cambiar tamaño del modelo. Conseguir su dimensión más grande y dividirla por ello, eso hace que quede entre 0-1 y tras ello, multiplicarlo por lo deseado. por ejemplo, 0.15 es un 15% del tamaño original.
    loader.load(model,
        // called when the resource is loaded
        function ( gltf ) {

            var object = gltf.scene;

            slime = new THREE.Group();
            cuerpo_slime = new THREE.Group();
            slime.add(cuerpo_slime);
            cuerpo_slime.add(object);
            scene.add(slime);

            luzAura = new THREE.PointLight(AURA_COLOR, AURA_INTENSIDAD, 1, 1);
            slime.add(luzAura);

            // El slime proyecta sombra sobre el suelo
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
            alcance_hud = maxDim * 6;
            cameraTop.left = -alcance_hud / 2;
            cameraTop.right = alcance_hud / 2;
            cameraTop.top = alcance_hud / 2;
            cameraTop.bottom = -alcance_hud / 2;
            cameraTop.near = maxDim * 0.1;
            cameraTop.far = maxDim * 10;
            cameraTop.updateProjectionMatrix();
            centro_hud.set(0, size.y + maxDim, 0);

            object.position.x -= center.x;
            object.position.z -= center.z;
            object.position.y -= box.min.y;
            tamano_slime = maxDim;
            tamano_base = maxDim;
            tamano_objetivo = maxDim;

            crearSuelo(0);
            configurarSombras();
            // Espera a que esten cargados los modelos de los objetos
            promesaModelos.then(function () {
                generarObjetos(0);
            });

            if (juegoIniciado) mostrarAviso('Nivel 1: ' + ESCALAS[0].nombre, '', 2500);

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

// Objetos comestibles y su colocacion
var objetos = [];

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

const MATERIALES = {
  semillas: ['#8a5a2b', '#c9a46a', '#4a3524'].map(function (c) {
    return new THREE.MeshStandardMaterial({ color: new THREE.Color(c).convertSRGBToLinear(), roughness: 0.6 });
  })
};

function cargarModelosObjetos()
{
  const cargador = new THREE.GLTFLoader();
  const nombres = Object.keys(MODELOS_OBJETOS);

  // Una promesa por modelo, Promise.all espera a que terminen todas
  return Promise.all(nombres.map(function (nombre) {
    const modelo = MODELOS_OBJETOS[nombre];
    return new Promise(function (resolver) {
      cargador.load(modelo.ruta, function (gltf) {
        modelo.plantilla = normalizarModelo(gltf.scene);
        // Algunos modelos traen animaciones que no se necesita, con sinAnimaciones: true se ignoran
        modelo.animaciones = modelo.sinAnimaciones ? [] : gltf.animations;
        console.log('Modelo cargado:', nombre, '- animaciones:',
                    gltf.animations.map(function (clip) { return clip.name; }));
        resolver();
      }, undefined, function () {
        console.error('No se pudo cargar el modelo:', modelo.ruta);
        resolver(); // seguir igualmente, ese tipo de objeto no aparecerá
      });
    });
  }));
}

function calcularCajaReal(objeto)
{
  objeto.updateMatrixWorld(true);
  const caja = new THREE.Box3();
  const v = new THREE.Vector3();

  objeto.traverse(function (n) {
    if (!n.isMesh) return;
    const posiciones = n.geometry.attributes.position;

    if (n.isSkinnedMesh) {
      n.skeleton.update();
      for (let i = 0; i < posiciones.count; i++) {
        v.fromBufferAttribute(posiciones, i);
        n.boneTransform(i, v);
        v.applyMatrix4(n.matrixWorld);
        caja.expandByPoint(v);
      }
    } else {
      if (n.geometry.boundingBox === null) n.geometry.computeBoundingBox();
      caja.union(n.geometry.boundingBox.clone().applyMatrix4(n.matrixWorld));
    }
  });
  return caja;
}

// Centra el modelo, lo apoya en y = 0 y lo escala a "unidades de objeto"
function normalizarModelo(escenaModelo)
{
  const caja = calcularCajaReal(escenaModelo);
  const tam = caja.getSize(new THREE.Vector3());
  const centro = caja.getCenter(new THREE.Vector3());
  const escala = 2 / Math.max(tam.x, tam.y, tam.z);

  escenaModelo.scale.multiplyScalar(escala);
  escenaModelo.position.set(-centro.x * escala, -caja.min.y * escala, -centro.z * escala);
  escenaModelo.traverse(function (n) {
    if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
  });

  // Lo mete en un grupo para que la normalizacion no se pierda al escalar la copia
  const plantilla = new THREE.Group();
  plantilla.add(escenaModelo);
  return plantilla;
}

// Añade al grupo una copia del modelo y, si tiene animaciones, la pone en marcha
function anadirCopiaModelo(grupo, nombre)
{
  const modelo = MODELOS_OBJETOS[nombre];
  if (!modelo.plantilla) return;

  // Los modelos animados necesitan SkeletonUtils.clone para que
  // cada copia tenga sus propias animaciones, con clone() normal compartirian animación
  const copia = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(modelo.plantilla) : modelo.plantilla.clone();
  grupo.add(copia);

  if (modelo.animaciones.length > 0) {
    const mixerCopia = new THREE.AnimationMixer(copia);

    // Busca la animación de estar quieto y la de andar por su nombre.
    // Si no se encuentran, usa la primera y la segunda de la lista.
    const clipQuieto = buscarClip(modelo.animaciones, modelo.animQuieto) || modelo.animaciones[0];
    const clipAndar = buscarClip(modelo.animaciones, modelo.animAndar) || modelo.animaciones[1] || clipQuieto;

    const quieto = mixerCopia.clipAction(clipQuieto);
    quieto.time = Math.random() * clipQuieto.duration; // No se mueven todas a la vez
    grupo.userData.mixer = mixerCopia;
    mixersObjetos.push(mixerCopia);

    // Si el modelo solo tiene una animacion, la reproduce
    if (clipAndar === clipQuieto) {
      quieto.play();
      return;
    }

    const andar = mixerCopia.clipAction(clipAndar);

    quieto.play();
    andar.play();
    quieto.setEffectiveWeight(1);
    andar.setEffectiveWeight(0);

    andar.time = Math.random() * clipAndar.duration;
    grupo.userData.acciones = { quieto: quieto, andar: andar };
  }
}

// Busca una animacion cuyo nombre tenga el texto indicado
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

// Constructor generico para cualquier modelo de MODELOS_OBJETOS:
function crearDesdeModelo(nombre)
{
  return function (grupo) {
    anadirCopiaModelo(grupo, nombre);
  };
}

// huella: radio que ocupa el objeto en el suelo. 
// Objetos altos y finos = huella pequeña
// bajos y anchos = cercana a 1
// alargados = intermedia.
// comerDesde: tamaño minimo del slime para comerla, aunque sea pequeña
// rotacionFrente: si camina de lado o hacia atras, prueba Math.PI / 2, -Math.PI / 2 o Math.PI
const TIPOS = {
  semilla: { nombre: 'Semilla', huella: 0.6, crear: crearSemilla },
  hormiga: { nombre: 'Hormiga', huella: 0.5, crear: crearHormiga, modelo: 'hormiga', comerDesde: 1.2, escalaVisor: 1,
             movil: { velocidad: 1.5, huye: true, rotacionFrente: Math.PI } },

  // objetos de la hierba
  piedra:    { nombre: 'Piedrecita', huella: 0.85, crear: crearDesdeModelo('piedra'),    modelo: 'piedra' },     // baja y redondeada
  hierba:    { nombre: 'Hierba',     huella: 0.6,  crear: crearDesdeModelo('hierba'),    modelo: 'hierba' },     // mata algo mas alta que ancha
  flor:      { nombre: 'Flor',       huella: 0.3,  crear: crearDesdeModelo('flor'),      modelo: 'flor' },       // alta, con tallo fino
  setaRoja:  { nombre: 'Seta roja',  huella: 0.6,  crear: crearDesdeModelo('setaRoja'),  modelo: 'setaRoja' },   // sombrero casi tan ancho como alta
  setaAzul:  { nombre: 'Seta azul',  huella: 0.6,  crear: crearDesdeModelo('setaAzul'),  modelo: 'setaAzul' },
  lata:      { nombre: 'Lata',       huella: 0.55, crear: crearDesdeModelo('lata'),      modelo: 'lata' },       // el doble de alta que de ancha
  botella:   { nombre: 'Botella',    huella: 0.35, crear: crearDesdeModelo('botella'),   modelo: 'botella' },    // alta y estrecha
  maceta:    { nombre: 'Maceta',     huella: 0.7,  crear: crearDesdeModelo('maceta'),    modelo: 'maceta' },     // casi tan ancha como alta

  // objetos del parque (nivel 2)
  arbusto:   { nombre: 'Arbusto',    huella: 0.85, crear: crearDesdeModelo('arbusto'),   modelo: 'arbusto' },    // mas ancho que alto
  perro:  { nombre: 'Perro',  huella: 0.5,  crear: crearDesdeModelo('perro'),  modelo: 'perro', movil: { velocidad: 2, huye: true, rotacionFrente: -Math.PI / 2 } },
  mujer:  { nombre: 'Mujer',  huella: 0.25, crear: crearDesdeModelo('mujer'),  modelo: 'mujer', movil: { velocidad: 1.2, huye: true, rotacionFrente: 0 } },
  hombre: { nombre: 'Hombre', huella: 0.25, crear: crearDesdeModelo('hombre'), modelo: 'hombre', movil: { velocidad: 1.2, huye: true, rotacionFrente: 0 } },
  excalibur: { nombre: 'Excalibur',  huella: 0.4,  crear: crearDesdeModelo('excalibur'), modelo: 'excalibur' },  // espada clavada en su roca
  banco:     { nombre: 'Banco',      huella: 0.6,  crear: crearDesdeModelo('banco'),     modelo: 'banco' },      // largo y poco profundo
  farola:    { nombre: 'Farola',     huella: 0.15, crear: crearDesdeModelo('farola'),    modelo: 'farola' },     // poste muy alto y fino
  farola2:   { nombre: 'Farola Moderna', huella: 0.15, crear: crearDesdeModelo('farola2'), modelo: 'farola2' },  // como la farola, algo mayor

  // objetos de la ciudad (nivel 3)
  coche:     { nombre: 'Coche',          huella: 0.5,  crear: crearDesdeModelo('coche'),  modelo: 'coche', movil: { velocidad: 1.2, huye: true, rotacionFrente: 0 } },    // largo, la mitad de ancho
  coche2:    { nombre: 'Coche',          huella: 0.5,  crear: crearDesdeModelo('coche2'), modelo: 'coche2', movil: { velocidad: 1.2, huye: true, rotacionFrente: 0 } },
  arbol1:    { nombre: 'Árbol',       huella: 0.4,  crear: crearDesdeModelo('arbol1'), modelo: 'arbol1' },   // alto: la huella es la copa
  arbol2:    { nombre: 'Árbol',          huella: 0.4,  crear: crearDesdeModelo('arbol2'), modelo: 'arbol2' },
  arbol3:    { nombre: 'Árbol',  huella: 0.4,  crear: crearDesdeModelo('arbol3'), modelo: 'arbol3' },
  tienda:     { nombre: 'Tienda',         huella: 0.75, crear: crearDesdeModelo('tienda'),  modelo: 'tienda' },    // casi tan anchas como altas
  casa1:     { nombre: 'Casa',           huella: 0.75, crear: crearDesdeModelo('casa1'),  modelo: 'casa1' },
  casa2:     { nombre: 'Casa',         huella: 0.75, crear: crearDesdeModelo('casa2'),  modelo: 'casa2' },
  casa3:     { nombre: 'Casa',    huella: 0.75, crear: crearDesdeModelo('casa3'),  modelo: 'casa3' },
  casa4:     { nombre: 'Casa',        huella: 0.75, crear: crearDesdeModelo('casa4'),  modelo: 'casa4' },
  torre1:    { nombre: 'Torre',          huella: 0.3,  crear: crearDesdeModelo('torre1'), modelo: 'torre1' },   // altas y estrechas
  torre2:    { nombre: 'Torre alta',     huella: 0.3,  crear: crearDesdeModelo('torre2'), modelo: 'torre2' },
  torre3:    { nombre: 'Rascacielos',    huella: 0.3,  crear: crearDesdeModelo('torre3'), modelo: 'torre3' },
  fuente:    { nombre: 'Fuente',         huella: 0.9,  crear: crearDesdeModelo('fuente'), modelo: 'fuente' },   // pilon ancho y bajo

  // Bob esponja
  esponja:        { nombre: 'Bob Esponja',          huella: 0.6,  crear: crearDesdeModelo('esponja'),        modelo: 'esponja', movil: { velocidad: 1.2, huye: true, rotacionFrente: 0 } },        // cuadrado: casi tan ancho como alto
  patricio:       { nombre: 'Patricio',             huella: 0.55, crear: crearDesdeModelo('patricio'),       modelo: 'patricio', movil: { velocidad: 1.2, huye: true, rotacionFrente: 0 } },       // estrella: brazos abiertos
  calamardo:      { nombre: 'Calamardo',            huella: 0.35, crear: crearDesdeModelo('calamardo'),      modelo: 'calamardo', movil: { velocidad: 1.2, huye: true, rotacionFrente: 0, seDetiene: false } },      // alto y estrecho. Solo tiene animacion de andar: no se para
  casa_esponja:   { nombre: 'Casa de Bob Esponja',  huella: 0.5,  crear: crearDesdeModelo('casa_esponja'),   modelo: 'casa_esponja' },   // la piña: mas alta que ancha
  casa_patricio:  { nombre: 'Casa de Patricio',     huella: 0.85, crear: crearDesdeModelo('casa_patricio'),  modelo: 'casa_patricio' },  // la roca: baja y ancha
  casa_calamardo: { nombre: 'Casa de Calamardo',    huella: 0.45, crear: crearDesdeModelo('casa_calamardo'), modelo: 'casa_calamardo' },  // la cabeza moai: alta

  // objetos de la naturaleza (nivel 4)
  molino:       { nombre: 'Molino',       huella: 0.4,  crear: crearDesdeModelo('molino'),       modelo: 'molino' },       // alto, con aspas
  molino2:      { nombre: 'Molino',       huella: 0.4,  crear: crearDesdeModelo('molino2'),      modelo: 'molino2' },
  mamut:        { nombre: 'Mamut',        huella: 0.5,  crear: crearDesdeModelo('mamut'),        modelo: 'mamut', movil: { velocidad: 1.2, huye: true, rotacionFrente: 0, seDetiene: false } },        // animal alargado
  bosque:       { nombre: 'Bosque',       huella: 0.85, crear: crearDesdeModelo('bosque'),       modelo: 'bosque' },       // grupo de arboles: ancho
  castillo:     { nombre: 'Castillo',     huella: 0.8,  crear: crearDesdeModelo('castillo'),     modelo: 'castillo' },     // ancho, con torres
  ciudad:       { nombre: 'Ciudad',       huella: 0.9,  crear: crearDesdeModelo('ciudad'),       modelo: 'ciudad' },       // muy ancha y baja
  monte1:       { nombre: 'Montaña',      huella: 0.9,  crear: crearDesdeModelo('monte1'),       modelo: 'monte1' },       // base muy ancha
  monte2:       { nombre: 'Montaña',      huella: 0.9,  crear: crearDesdeModelo('monte2'),       modelo: 'monte2' },
  monte3:       { nombre: 'Montaña',      huella: 0.9,  crear: crearDesdeModelo('monte3'),       modelo: 'monte3' },
  godzilla:     { nombre: 'Godzilla',     huella: 0.35, crear: crearDesdeModelo('godzilla'),     modelo: 'godzilla', movil: { velocidad: 0.8, huye: true, rotacionFrente: Math.PI } },     // alto, de pie
  serafin:      { nombre: 'Serafín',      huella: 0.5,  crear: crearDesdeModelo('serafin'),      modelo: 'serafin', movil: { velocidad: 1.2, huye: true, rotacionFrente: Math.PI } },      // con alas
  hallucigenia: { nombre: 'Hallucigenia', huella: 0.6,  crear: crearDesdeModelo('hallucigenia'), modelo: 'hallucigenia', movil: { velocidad: '0.2', huye: true, rotacionFrente: Math.PI, seDetiene: false } },
  golem: { nombre: 'Golem',  huella: 0.6,  crear: crearDesdeModelo('golem'), modelo: 'golem', movil: { velocidad: 0.6, huye: true, rotacionFrente: 0, seDetiene: false } },
  
  // objetos del espacio (nivel 5)
  // rotacionAleatoria: true = cada copia aparece girada al azar en los tres ejes, como si flotara sin gravedad
  // tumbo: radianes por segundo = ademas gira sin parar sobre un eje al azar
  astronauta: { nombre: 'Astronauta',  huella: 0.3,  crear: crearDesdeModelo('astronauta'), modelo: 'astronauta', rotacionAleatoria: true, movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },  // figura humana
  satelite:   { nombre: 'Satélite',    huella: 0.7,  crear: crearDesdeModelo('satelite'),   modelo: 'satelite',   rotacionAleatoria: true, movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },  // paneles extendidos
  satelite2:  { nombre: 'Satélite',    huella: 0.7,  crear: crearDesdeModelo('satelite2'),  modelo: 'satelite2',  rotacionAleatoria: true, movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },
  ovni:       { nombre: 'OVNI',        huella: 0.9,  crear: crearDesdeModelo('ovni'),       modelo: 'ovni', movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },        // platillo: ancho y plano (siempre horizontal)
  cohete:     { nombre: 'Cohete',      huella: 0.25, crear: crearDesdeModelo('cohete'),     modelo: 'cohete',     rotacionAleatoria: true, movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },  // alto y estrecho
  robot:      { nombre: 'Robot',       huella: 0.35, crear: crearDesdeModelo('robot'),      modelo: 'robot',      rotacionAleatoria: true, movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },  // humanoide
  asteroide1: { nombre: 'Asteroide',   huella: 0.85, crear: crearDesdeModelo('asteroide1'), modelo: 'asteroide1', rotacionAleatoria: true, tumbo: 0.3, movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },  // rocas casi redondas
  asteroide2: { nombre: 'Asteroide',   huella: 0.85, crear: crearDesdeModelo('asteroide2'), modelo: 'asteroide2', rotacionAleatoria: true, tumbo: 0.3, movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },
  asteroide3: { nombre: 'Asteroide',   huella: 0.85, crear: crearDesdeModelo('asteroide3'), modelo: 'asteroide3', rotacionAleatoria: true, tumbo: 0.3, movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },
  asteroide4: { nombre: 'Asteroide',   huella: 0.85, crear: crearDesdeModelo('asteroide4'), modelo: 'asteroide4', rotacionAleatoria: true, tumbo: 0.3, movil: { velocidad: 0.6, huye: false, rotacionFrente: 0, seDetiene: false } },

  // La Tierra y la Luna: esferas con textura que giran despacio sobre si mismas gira a radianes por segundo
  tierra: { nombre: 'Tierra', huella: 1, crear: crearEsferaTexturizada('tierra'), gira: 0.1 },
  luna:   { nombre: 'Luna',   huella: 1, crear: crearEsferaTexturizada('luna'),   gira: 0.05 },

  // Objetos del sistema solar (nivel 6), esferas con textura.
  sol:      { nombre: 'Sol',   huella: 1, crear: crearEsferaTexturizada('sol'),         gira: 0.02, final: true, luz: { color: 0xfff2d0, intensidad: 1.8 } },  // Final = comerlo termina el juego
  mercurio: { nombre: 'Mercurio', huella: 1, crear: crearEsferaTexturizada('mercurio'), gira: 0.05 },
  venus:    { nombre: 'Venus',    huella: 1, crear: crearEsferaTexturizada('venus'),    gira: 0.03 },
  marte:    { nombre: 'Marte',    huella: 1, crear: crearEsferaTexturizada('marte'),    gira: 0.1 },
  jupiter:  { nombre: 'Júpiter',  huella: 1, crear: crearEsferaTexturizada('jupiter'),  gira: 0.2 },
  saturno:  { nombre: 'Saturno',  huella: 1, crear: crearSaturno,                       gira: 0.18 },
  urano:    { nombre: 'Urano',    huella: 1, crear: crearEsferaTexturizada('urano'),    gira: 0.12 },
  neptuno:  { nombre: 'Neptuno',  huella: 1, crear: crearEsferaTexturizada('neptuno'),  gira: 0.12 },

  cometa: { nombre: 'Cometa', huella: 0.8, crear: crearDesdeModelo('cometa'), modelo: 'cometa', rotacionAleatoria: true, movil: { velocidad: 1, huye: false, rotacionFrente: Math.PI, seDetiene: false } }
};

// Los planetas y lunas = una esfera con una imagen como textura.
// La imagen debe ser un mapa del planeta en proyeccion equirectangular
const TEXTURAS_ESFERAS = {
  tierra: 'images/tasty_damacy/tierra.jpg',
  luna:   'images/tasty_damacy/luna.jpg',
  sol:      'images/tasty_damacy/sol.jpg',
  mercurio: 'images/tasty_damacy/mercurio.jpg',
  venus:    'images/tasty_damacy/venus.jpg',
  marte:    'images/tasty_damacy/marte.jpg',
  jupiter:  'images/tasty_damacy/jupiter.jpg',
  saturno:  'images/tasty_damacy/saturno.jpg',
  urano:    'images/tasty_damacy/urano.jpg',
  neptuno:  'images/tasty_damacy/neptuno.jpg',
  anilloSaturno: 'images/tasty_damacy/anillo_saturno.png'
};
var materialesEsferas = {};

function crearEsferaTexturizada(nombre)
{
  return function (grupo) {
    if (!materialesEsferas[nombre]) {
      const textura = new THREE.TextureLoader().load(TEXTURAS_ESFERAS[nombre], undefined, undefined, function () {
        console.error('No se pudo cargar la textura de', nombre + ':', TEXTURAS_ESFERAS[nombre]);
      });
      textura.encoding = THREE.sRGBEncoding;
      // El Sol emite luz: MeshBasicMaterial no se ve afectado por las
      // luces ni las sombras, asi que se ve siempre brillante
      materialesEsferas[nombre] = (nombre === 'sol')
        ? new THREE.MeshBasicMaterial({ map: textura, toneMapped: false })
        : new THREE.MeshStandardMaterial({ map: textura, roughness: 0.8, metalness: 0 });
    }

    const esfera = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 32), materialesEsferas[nombre]);
    esfera.position.y = 1;
    esfera.name = 'esfera';
    esfera.castShadow = true;
    esfera.receiveShadow = true;
    grupo.add(esfera);
  };
}

// Gira el contenido del grupo al azar en los tres ejes, alrededor de su centro.
function rotarAleatoriamente(grupo)
{
  const pivote = new THREE.Group();
  pivote.position.y = 1;
  while (grupo.children.length > 0) {
    const hijo = grupo.children[0];
    hijo.position.y -= 1;
    pivote.add(hijo);
  }
  pivote.rotation.set(rand(0, Math.PI * 2), rand(0, Math.PI * 2), rand(0, Math.PI * 2));
  pivote.name = 'pivoteGiro';
  grupo.add(pivote);
}

// Saturno, la esfera mas su anillo
function crearSaturno(grupo)
{
  crearEsferaTexturizada('saturno')(grupo);

  if (!materialesEsferas.anilloSaturno) {
    const textura = new THREE.TextureLoader().load(TEXTURAS_ESFERAS.anilloSaturno, undefined, undefined, function () {
      console.error('No se pudo cargar la textura del anillo:', TEXTURAS_ESFERAS.anilloSaturno);
    });
    textura.encoding = THREE.sRGBEncoding;
    materialesEsferas.anilloSaturno = new THREE.MeshStandardMaterial({
      map: textura, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 1
    });
  }

  const interior = 1.25, exterior = 2.2;
  const geometria = new THREE.RingGeometry(interior, exterior, 128, 1);
  const pos = geometria.attributes.position, uv = geometria.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(pos.getX(i), pos.getY(i));
    uv.setXY(i, (r - interior) / (exterior - interior), 0.5);
  }

  const anillo = new THREE.Mesh(geometria, materialesEsferas.anilloSaturno);
  anillo.rotation.x = -Math.PI / 2; // RingGeometry se crea en vertical, se gira

  const inclinacion = new THREE.Group(); // el anillo de Saturno esta inclinado
  inclinacion.position.y = 1; // a la altura del centro del planeta
  inclinacion.rotation.z = 0.45;
  inclinacion.add(anillo);
  grupo.add(inclinacion);
}

// SISTEMA SOLAR- los objetos con orbita giran alrededor del centro del nivel (el Sol).
const PERIODO_MERCURIO = 60;
function iniciarOrbita(objeto, fraccion, radioSuelo)
{
  const radio = fraccion * radioSuelo;
  const periodo = PERIODO_MERCURIO * Math.pow(fraccion / 0.14, 1.5);
  objeto.orbita = {
    radio: radio,
    angulo: rand(0, Math.PI * 2), // cada planeta empieza en un punto distinto
    velocidad: (Math.PI * 2) / periodo 
  };
  colocarEnOrbita(objeto);
}

function colocarEnOrbita(objeto)
{
  const o = objeto.orbita;
  objeto.grupo.position.x = Math.sin(o.angulo) * o.radio;
  objeto.grupo.position.z = Math.cos(o.angulo) * o.radio;
}

// Si el slime llega dentro del Sol, lo saca fuera de el
function apartarSlimeDe(x, z, radio)
{
  const dx = pos_slime.x - x, dz = pos_slime.z - z;
  let d = Math.hypot(dx, dz);
  const minimo = radio + tamano_slime * 1.5;
  if (d >= minimo) return;
  if (d < 0.000001) { pos_slime.x = x + minimo; pos_slime.z = z; return; }
  pos_slime.x = x + (dx / d) * minimo;
  pos_slime.z = z + (dz / d) * minimo;
}

// En el sistema solar la luz del sol viene del Sol: la direccion
// de la luz direccional apunta desde el slime hacia él
function actualizarDireccionSol()
{
  const sol = objetos.find(function (o) { return o.tipo === 'sol' && o.estado === 'activo'; });
  if (!sol) return;
  const dx = sol.grupo.position.x - pos_slime.x;
  const dz = sol.grupo.position.z - pos_slime.z;
  if (Math.hypot(dx, dz) < 0.000001) return;
  direccion_sol.set(dx, 0, dz).normalize();
  direccion_sol.y = 0.3;
  direccion_sol.normalize();
}

// Los objetos con "gira" rotan despacio sobre su eje
function actualizarGiros(delta)
{
  for (let i = 0; i < objetos.length; i++) {
    const objeto = objetos[i];
    if (objeto.estado !== 'activo') continue;

    // Giro continuo alrededor de un eje cualquiera
    if (objeto.tumbo) objeto.tumbo.pivote.rotateOnAxis(objeto.tumbo.eje, objeto.tumbo.velocidad * delta);

    // Los planetas avanzan por su orbita
    if (objeto.orbita) {
      objeto.orbita.angulo += objeto.orbita.velocidad * delta;
      colocarEnOrbita(objeto);
    }

    if (!objeto.def.gira) continue;
    const esfera = objeto.grupo.getObjectByName('esfera');
    if (esfera) esfera.rotation.y += objeto.def.gira * delta;
  }
}

function crearSemilla(grupo)
{
  const semilla = new THREE.Mesh(GEOMETRIAS.esfera, elegir(MATERIALES.semillas));
  semilla.position.y = 0.38;
  semilla.scale.set(0.55, 0.4, 1); // esfera plana y alargada
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

  (E.catalogo || []).forEach(function (entrada) {
    const tipo = entrada[0], cantidad = entrada[1], min = entrada[2], max = entrada[3];
    const opciones = entrada[4] || {};// colocacion especial para el nivel 6 (centro, orbita)
    const def = TIPOS[tipo];

    // Si el tipo usa un modelo que no se pudo cargar, lo salta
    if (def.modelo && !MODELOS_OBJETOS[def.modelo].plantilla) return;

    for (let k = 0; k < cantidad; k++) {
      const tam = rand(min, max) * tamano_base;
      const radio = tam * def.huella;

      let pos;
      if (opciones.centro) {
        pos = { x: 0, z: 0 };
        apartarSlimeDe(0, 0, radio);
      } else if (opciones.orbita) {
        pos = { x: 0, z: 0 };
      } else {
        pos = buscarPosicion(radioSuelo, radio);
      }
      if (!pos) continue; // no hay hueco libre lo salta

      const grupo = new THREE.Group();
      grupo.name = tipo;
      def.crear(grupo);

      // Los tipos con "luz" emiten luz desde su centro, ilumina
      // a cada planeta por la cara que mira hacia él.
      // distance 0 = alcance infinito, sin perder fuerza con la distancia.
      if (def.luz) {
        const luzObjeto = new THREE.PointLight(def.luz.color, def.luz.intensidad, 0, 1);
        luzObjeto.position.y = 1;
        grupo.add(luzObjeto);
      }
      if (def.rotacionAleatoria) rotarAleatoriamente(grupo);
      grupo.position.set(pos.x, 0, pos.z);
      grupo.rotation.y = rand(0, Math.PI * 2);
      grupo.scale.setScalar(tam);
      scene.add(grupo);

      // estado: 'activo' (en el suelo) o 'comiendo' (siendo absorbido por el slime)
      const nuevo = { tipo: tipo, def: def, tam: tam, radio: radio, escala: indice, grupo: grupo, estado: 'activo' };

      // Los tipos con "movil" llevan su propio estado de movimiento
      if (def.movil) {
        nuevo.movil = {
          dir: grupo.rotation.y, // direccion en la que camina (radianes)
          dirObjetivo: grupo.rotation.y, // direccion hacia la que quiere girar
          temporizador: rand(0, 3), // segundos hasta su proxima decision
          parada: false, // a veces se detiene
          velActual: 0 // velocidad actual
        };
      }
      // Los tipos con "tumbo" giran lentamente sin parar, cada uno sobre
      // un eje al azar y a su propia velocidad
      if (def.tumbo) {
        if (!grupo.getObjectByName('pivoteGiro')) rotarAleatoriamente(grupo);
        nuevo.tumbo = {
          pivote: grupo.getObjectByName('pivoteGiro'),
          eje: new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize(),
          velocidad: def.tumbo * rand(0.6, 1.4)
        };
      }
      if (opciones.orbita) iniciarOrbita(nuevo, opciones.orbita, radioSuelo);
      objetos.push(nuevo);
      creados++;
    }
  });
  console.log('Objetos creados en', E.nombre + ':', creados);
}

// Busca una posicion aleatoria del suelo que no este encima del slime
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

// Sonido y música
function crearAudio()
{
  oyente = new THREE.AudioListener();
  camera.add(oyente);

  const cargador = new THREE.AudioLoader();

  // Se elige una cancion al empezar y suena en bucle toda la partida
  musica = new THREE.Audio(oyente);
  musica.setVolume(VOLUMEN_MUSICA);
  elegirCancion();

  // Sonidos de comer con un buffer para tener varios sonidos
  SONIDOS_COMER.forEach(function (sonido) {
    cargador.load(sonido.ruta, function (buffer) {
      sonido.buffer = buffer;
    }, undefined, function () {
      console.error('No se pudo cargar el sonido:', sonido.ruta);
    });
  });

  // Empieza con unos pocos canales, si hacen falta mas, se crean
  for (let i = 0; i < 4; i++) crearCanalComer();

  // Sonido de choque, un solo canal (nunca suenan dos a la vez)
  // Sonido de victoria
  canalVictoria = new THREE.Audio(oyente);
  canalVictoria.setVolume(VOLUMEN_VICTORIA);
  cargador.load(RUTA_SONIDO_VICTORIA, function (buffer) {
    canalVictoria.setBuffer(buffer);
  }, undefined, function () {
    console.error('No se pudo cargar el sonido de victoria:', RUTA_SONIDO_VICTORIA);
  });

  canalChoque = new THREE.Audio(oyente);
  canalChoque.setVolume(VOLUMEN_CHOQUE);

  SONIDOS_CHOQUE.forEach(function (sonido) {
    cargador.load(sonido.ruta, function (buffer) {
      sonido.buffer = buffer;
    }, undefined, function () {
      console.error('No se pudo cargar el sonido de choque:', sonido.ruta);
    });
  });

  // Los navegadores no dejan reproducir sonido hasta que el usuario interactúa
  // con la página, con la primera tecla o click activa el audio y la música
  const activarAudio = function () {
    oyente.context.resume();
    if (musica.buffer && !musica.isPlaying) musica.play();
    document.removeEventListener('keydown', activarAudio);
    document.removeEventListener('pointerdown', activarAudio);
  };
  document.addEventListener('keydown', activarAudio);
  document.addEventListener('pointerdown', activarAudio);
}

// Elige una canción al azar segun su peso y la reproduce en bucle.
function elegirCancion()
{
  cancionActual = elegirConPeso(CANCIONES);

  new THREE.AudioLoader().load(cancionActual.ruta, function (buffer) {
    musica.setBuffer(buffer);
    musica.setLoop(true); // se repite durante toda la partida
    if (oyente.context.state === 'running') musica.play();
    console.log('Música:', cancionActual.ruta);
  }, undefined, function () {
    console.error('No se pudo cargar la musica:', cancionActual.ruta);
  });
}

// Eleccion aleatoria con pesos: se tira un numero entre 0 y la suma de los pesos
// y se ve en que elemento cae. Un elemento con peso 5 ocupa un tramo
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

  // Solo elege entre los sonidos que ya se han cargado
  const cargados = SONIDOS_COMER.filter(function (s) { return s.buffer; });
  if (cargados.length === 0) return;

  // Busca un canal que NO este sonando, en vez de coger el siguiente por turno,
  // así nunca se corta un sonido que todavia no ha terminado
  let canal = canalesComer.find(function (c) { return !c.isPlaying; });

  // Si todos están ocupados, crea uno nuevo (hasta el maximo)
  if (!canal && canalesComer.length < MAX_CANALES_COMER) canal = crearCanalComer();

  // Si se ha llegado al máximo,  no suena
  if (!canal) return;

  const sonido = elegirConPeso(cargados);
  canal.setBuffer(sonido.buffer);
  canal.setPlaybackRate(rand(0.92, 1.08));// variación de tono
  canal.play();
}

// Crea un canal (THREE.Audio) para los sonidos de comer y lo añade a la reserva.
// Cuando el sonido termina, Three.js pone isPlaying a false y el canal queda libre.
// Reproduce un sonido de choque elegido al azar según su peso
function reproducirSonidoChoque()
{
  if (!canalChoque) return;

  // Solo elegimos entre los sonidos que ya se han cargado
  const cargados = SONIDOS_CHOQUE.filter(function (s) { return s.buffer; });
  if (cargados.length === 0) return;

  const sonido = elegirConPeso(cargados);
  if (canalChoque.isPlaying) canalChoque.stop();
  canalChoque.setBuffer(sonido.buffer);
  canalChoque.setPlaybackRate(rand(0.9, 1.1));
  canalChoque.play();
}

// Movimiento aleatorio de la camara mientras dura el temblor del choque.
// Se aplica solo al dibujar y se deshace justo después.
function aplicarTemblor(camara, activo)
{
  if (activo) {
    const a = temblor * FUERZA_TEMBLOR * tamano_slime;
    camara.userData.desplazamientoTemblor = new THREE.Vector3(rand(-a, a), rand(-a, a), rand(-a, a));
    camara.position.add(camara.userData.desplazamientoTemblor);
  } else if (camara.userData.desplazamientoTemblor) {
    camara.position.sub(camara.userData.desplazamientoTemblor);
    camara.userData.desplazamientoTemblor = null;
  }
}

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

// HUD
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

    /* Firma del autor: siempre visible en la esquina inferior izquierda */
    .hud-autor {
      position: fixed; left: 12px; bottom: 10px; z-index: 70;
      font-family: 'Segoe UI', 'Trebuchet MS', sans-serif;
      font-size: 13px; color: #ffffff; opacity: 0.7;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);
      pointer-events: none;            /* no bloquea el raton (camara de seguimiento) */
      user-select: none;
    }

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

  // Modo de cámara activo
  hud.camara = document.createElement('div');
  hud.camara.className = 'hud-panel hud-camara';
  document.body.appendChild(hud.camara);
  mostrarModoCamara(false);

  // Firma
  const autor = document.createElement('div');
  autor.className = 'hud-autor';
  autor.textContent = 'Hecho por Francisco He Chi (kililoti)';
  document.body.appendChild(autor);
}

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

// Objeto final del nivel actual que aun no se ha comido
var objetivoNombreFinal = 'el Sol';
function buscarObjetoFinal()
{
  for (let i = 0; i < objetos.length; i++) {
    const o = objetos[i];
    if (o.def.final && o.escala === escala_actual && o.estado === 'activo') {
      objetivoNombreFinal = enMinuscula(o.def.nombre);
      return o;
    }
  }
  return null;
}

// "El Sol" -> "el Sol": solo la primera letra en minuscula, para usarlo dentro de una frase
function enMinuscula(texto)
{
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

// Numero grande con separador de miles (58.800)
function formatoNumero(n)
{
  return Math.round(n).toLocaleString('es-ES');
}

function actualizarHUD()
{
  const E = ESCALAS[escala_actual];
  const tamanoRelativo = tamano_slime / tamano_base; // 1 = tamaño inicial

  const inicioNivel = escala_actual > 0 ? ESCALAS[escala_actual - 1].umbral : 1;

  // Si en el nivel hay un objeto final (el Sol), el objetivo no es el
  // umbral sino comerselo: la barra llega al 100 % cuando ya puedes comertelo
  const objetivoFinal = buscarObjetoFinal();
  let meta = E.umbral;
  let textoObjetivo = ' - Objetivo ' + E.umbral.toFixed(2).replace('.', ',');
  if (juegoTerminado) {
    textoObjetivo = ' - ¡Te has comido ' + objetivoNombreFinal + '!';
  } else if (objetivoFinal) {
    meta = tamanoParaComer(objetivoFinal);
    textoObjetivo = esComestible(objetivoFinal)
      ? ' - ¡Ya puedes comerte ' + enMinuscula(objetivoFinal.def.nombre) + '!'
      : ' - Cómete ' + enMinuscula(objetivoFinal.def.nombre) + ' (necesitas ' + formatoNumero(meta) + ')';
  }

  const progreso = juegoTerminado ? 1 : THREE.MathUtils.clamp(Math.log(tamanoRelativo / inicioNivel) /
                                                              Math.log(meta / inicioNivel), 0, 1);

  fijarHUD('nivel', 'Nivel ' + (escala_actual + 1) + ': ' + E.nombre, function (v) { hud.nivel.textContent = v; });
  fijarHUD('barra', (progreso * 100).toFixed(1) + '%', function (v) { hud.barra.style.width = v; });
  fijarHUD('tamano', 'Tamaño ' + tamanoRelativo.toFixed(2).replace('.', ',') + textoObjetivo,
           function (v) { hud.tamano.textContent = v; });
  fijarHUD('puntos', puntos.toLocaleString('es-ES'), function (v) { hud.puntos.textContent = v; });
  fijarHUD('tiempo', formatoTiempo(tiempoJugado), function (v) { hud.tiempo.textContent = v; });
}

// Lista de bocados recientes
function anunciarBocado(nombre, puntosBocado)
{
  const fila = document.createElement('div');
  fila.className = 'hud-bocado';
  fila.textContent = nombre;
  const valor = document.createElement('b');
  valor.textContent = '+' + puntosBocado;
  fila.appendChild(valor);

  hud.bocados.prepend(fila); // el mas reciente, arriba
  while (hud.bocados.children.length > 5) { // como mucho 5 a la vez
    hud.bocados.lastChild.remove();
  }
  setTimeout(function () { fila.classList.add('saliendo'); }, 1500);
  setTimeout(function () { fila.remove(); }, 1900);
}

// Mensaje breve en el centro. tipo: '' (normal), 'peligro' (rojo) o 'info' (mas pequeño)
function mostrarAviso(texto, tipo, duracion)
{
  hud.aviso.textContent = texto;
  hud.aviso.className = 'hud-aviso visible ' + (tipo || '');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(function () {
    hud.aviso.classList.remove('visible');
  }, duracion || 1500);
}

// Mostrar la camara activa, si destacar es true, la etiqueta destella un momento
function mostrarModoCamara(destacar)
{
  hud.camara.textContent = 'Cámara: ' + NOMBRES_CAMARA[modo_camara] + ' · C para cambiar';
  if (destacar) {
    hud.camara.classList.add('cambio');
    setTimeout(function () { hud.camara.classList.remove('cambio'); }, 400);
  }
}

// Escena, camara, luces y etiqueta del visualizador de comidas
function crearVisor()
{
  escenaVisor = new THREE.Scene();
  escenaVisor.environment = scene.environment; // mismos reflejos que la escena principal

  camaraVisor = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
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
  etiquetaVisor.textContent = 'Nada'; // hasta el primer bocado el circulo esta vacio
  document.body.appendChild(etiquetaVisor);
}

// Se llama al comer. No cambia el modelo directamente, solo apunta cual
// es el ultimo objeto comido. actualizarVisor() lo mostrara cuando haya pasado
// el intervalo mínimo, así al comer muchas cosas seguidas el visor no parpadea
// y, aun asi, acaba mostrando siempre el último de verdad.
function mostrarEnVisor(objeto)
{
  visorPendiente = objeto.def;
}

// En cada fotograma gira el modelo y, si hay uno pendiente y ya ha
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

// Sustituye el modelo del visor por uno del tipo indicado.
// No reutilizamos el objeto comido, construye
// uno nuevo con el mismo constructor, que comparte geometrias y materiales.
function cambiarModeloVisor(def)
{
  if (pivoteVisor !== null) {
    quitarMixers(pivoteVisor);
    escenaVisor.remove(pivoteVisor);
  }

  const modelo = new THREE.Group();
  def.crear(modelo);

  // Lo centra y escala para que ocupe siempre lo mismo en el visor
  // Usa la ESFERA que envuelve al modelo, como el modelo gira, un objeto alargado ocupa
  // mas espacio al ponerse de frente o en diagonal que lo que dice su caja.
  // La esfera lo envuelve en cualquier orientacion, asi nunca se sale del circulo.
  const caja = calcularCajaReal(modelo);
  const esfera = caja.getBoundingSphere(new THREE.Sphere());
  const centro = esfera.center;
  const escala = RADIO_VISOR / esfera.radius * (def.escalaVisor || 1);
  modelo.scale.setScalar(escala);
  modelo.position.copy(centro).multiplyScalar(-escala);

  pivoteVisor = new THREE.Group();
  pivoteVisor.rotation.x = 0.25; //un poco inclinado para verlo mejor
  pivoteVisor.add(modelo);
  escenaVisor.add(pivoteVisor);

  etiquetaVisor.textContent = def.nombre;
}


// Colisiones y comer cosas:
// Las colisiones se calculan con circulos en el plano XZ. Cada objeto
// tiene un radio (su "huella") y el slime otro.
const FACTOR_COMESTIBLE = 0.85; // se puede comer lo que mida menos del 85 % del slime
const FACTOR_CRECIMIENTO = 0.4; // parte del "área" del objeto que se convierte en crecimiento
const DURACION_BOCADO = 0.35; // segundos que tarda un objeto en ser absorbido
var comidos = 0;
const _destinoBocado = new THREE.Vector3();

// Radio del slime = la mitad de su tamaño
function radioSlime()
{
  return tamano_slime * 0.5;
}

function esComestible(objeto)
{
  return (tamano_slime / tamano_base) >= tamanoParaComer(objeto);
}

// Tamaño del slime a partir del cual se puede comer un objeto. Se combinan dos reglas y se aplica la mas
// exigente:
//  - por su tamaño: el objeto debe medir menos del 85 % del radio del slime
//  - por su tipo: si tiene "comerDesde", el slime debe medir al menos eso
// "comerDesde" funciona como un mínimo, un objeto muy grande sigue
// necesitando que el slime sea lo bastante grande para el
function tamanoParaComer(objeto)
{
  const porTamano = objeto.tam / (0.5 * FACTOR_COMESTIBLE * tamano_base);

  if (objeto.def.comerDesde !== undefined) return Math.max(porTamano, objeto.def.comerDesde);
  return porTamano;
}

// Resaltado:
// un anillo en el suelo que marca el objeto mas grande que el slime
// puede comerse entre los que tiene cerca.
function crearResalte()
{
  anilloResalte = new THREE.Mesh(
    new THREE.RingGeometry(0.85, 1, 48),
    new THREE.MeshBasicMaterial({
      color: 0x8dffb5,
      transparent: true,
      opacity: 0.85,
      depthWrite: false, // no tapa nada de lo que se dibuje despues
      toneMapped: false,
      // Está en el mismo plano que el suelo, polygonOffset lo dibuja siempre por
      // encima (con mas prioridad que cualquiera de los suelos superpuestos)
      polygonOffset: true, polygonOffsetFactor: -10, polygonOffsetUnits: -20
    })
  );
  anilloResalte.rotation.x = -Math.PI / 2; // Se gira el RingGeometry que se crea en vertical
  anilloResalte.renderOrder = 1; // despues de los objetos opacos
  anilloResalte.visible = false;
  scene.add(anilloResalte);
}

// Busca el objeto de mayor tamaño en un alcance, si dos miden lo mismo, el mas cercano.
// La usan el resaltado (alcance corto) y la flecha (alcance largo).
function buscarMejorPresa(alcance)
{
  let mejor = null, mejorDistancia = Infinity;

  for (let i = 0; i < objetos.length; i++) {
    const objeto = objetos[i];
    if (objeto.estado !== 'activo' || !esComestible(objeto)) continue;

    // Distancia hasta el borde del objeto, no hasta su centro
    const distancia = Math.hypot(objeto.grupo.position.x - pos_slime.x,
                                 objeto.grupo.position.z - pos_slime.z) - objeto.radio;
    if (distancia > alcance) continue;

    if (mejor === null || objeto.tam > mejor.tam ||
        (objeto.tam === mejor.tam && distancia < mejorDistancia)) {
      mejor = objeto;
      mejorDistancia = distancia;
    }
  }

  return mejor;
}

function actualizarResalte()
{
  const mejor = buscarMejorPresa(DISTANCIA_RESALTE * tamano_slime);

  objetoResaltado = mejor;
  if (mejor === null) {
    anilloResalte.visible = false;
    return;
  }

  // El anillo sigue al objeto y se mueve suavemente para llamar la atención
  anilloResalte.visible = true;
  anilloResalte.position.set(mejor.grupo.position.x, 0, mejor.grupo.position.z);
  const latido = 1 + 0.08 * Math.sin(clock.elapsedTime * 6);
  anilloResalte.scale.setScalar((mejor.radio * 1.3 + tamano_slime * 0.05) * latido);
}

// Flecha flotante sobre el slime que apunta al objeto más grande de la zona.
function crearFlecha()
{
  const material = new THREE.MeshBasicMaterial({ color: 0xffd23f, toneMapped: false });

  flecha = new THREE.Group();

  const cuerpo = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 12), material);
  cuerpo.rotation.x = Math.PI / 2; // Rotar el cilindro que se crea en vertical
  cuerpo.position.z = -0.1;
  flecha.add(cuerpo);

  const punta = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 16), material);
  punta.rotation.x = Math.PI / 2; // la punta del cono pasa de +y a +z
  punta.position.z = 0.4;
  flecha.add(punta);

  flecha.visible = false;
  scene.add(flecha); // en la escena, no dentro del slime: asi no hereda su giro ni su animación al comer
}

// Activa o desactiva la flecha guía
function alternarFlecha()
{
  flechaActiva = !flechaActiva;
  if (!flechaActiva) flecha.visible = false;
  mostrarAviso(flechaActiva ? 'Flecha guía activada' : 'Flecha guía desactivada', 'info', 1000);
}

function actualizarFlecha(delta)
{
  // Desactivada = no se busca objetivo ni se muestra
  if (!flechaActiva) return;

  objetivoFlecha = buscarMejorPresa(DISTANCIA_FLECHA * tamano_slime);
  if (objetivoFlecha === null) {
    flecha.visible = false;
    return;
  }

  const dx = objetivoFlecha.grupo.position.x - pos_slime.x;
  const dz = objetivoFlecha.grupo.position.z - pos_slime.z;

  // Si ya esta prácticamente encima, la flecha se oculta
  if (Math.hypot(dx, dz) - objetivoFlecha.radio < tamano_slime * 0.5) {
    flecha.visible = false;
    return;
  }

  flecha.visible = true;

  // Flota sobre el slime, subiendo y bajando un poco
  const flotar = Math.sin(clock.elapsedTime * 3) * 0.05;
  flecha.position.set(pos_slime.x, tamano_slime * (1.1 + flotar), pos_slime.z);
  flecha.scale.setScalar(tamano_slime * 0.35);

  // Gira hacia el objetivo
  const angulo = Math.atan2(dx, dz);
  flecha.rotation.y = amortiguarAngulo(flecha.rotation.y, angulo, 10, delta);
}

function comprobarColisiones()
{
  const r = radioSlime() * 0.9; // un poco menos que el radio visual

  // Recordar si en el fotograma anterior ya estaba chocando
  chocandoAntes = chocandoAhora;
  chocandoAhora = false;

  for (let i = 0; i < objetos.length; i++) {
    const objeto = objetos[i];
    if (objeto.estado !== 'activo') continue;

    const dx = pos_slime.x - objeto.grupo.position.x;
    const dz = pos_slime.z - objeto.grupo.position.z;
    const distancia = Math.hypot(dx, dz);

    // Hay colisión si la distancia entre centros es menor que la suma de radios
    if (distancia >= r + objeto.radio) continue;

    if (esComestible(objeto)) {
      comer(objeto);
    } else {
      empujarFuera(objeto, dx, dz, distancia, r);
    }
  }
}

// Si el objeto demasiado grande, coloca el slime justo en el borde del objeto,
// en la direccion por la que llegaba, para que no pueda atravesarlo
function empujarFuera(objeto, dx, dz, distancia, r)
{
  if (distancia < 0.000001) { dx = 1; dz = 0; distancia = 1; }
  const minimo = r + objeto.radio;
  pos_slime.x = objeto.grupo.position.x + (dx / distancia) * minimo;
  pos_slime.z = objeto.grupo.position.z + (dz / distancia) * minimo;

  // efecto solo al EMPEZAR a chocar (no mientras sigue empujando contra
  // el objeto), como mucho una vez cada INTERVALO_CHOQUE segundos
  chocandoAhora = true;
  if (!chocandoAntes && clock.elapsedTime - ultimoChoque > INTERVALO_CHOQUE) {
    ultimoChoque = clock.elapsedTime;
    temblor = 1;
    reproducirSonidoChoque();
  }

  // aviso en el HUD, uno cada 1,5s max
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

  // El objeto pasa de ser hijo de la escena a ser hijo del slime. 
  // attach() conserva su posición en el mundo al cambiar de padre,
  // asi que a partir de ahora se mueve con el slime.
  slime.attach(objeto.grupo);
  objeto.posicionInicial = objeto.grupo.position.clone();
  objeto.escalaInicial = objeto.grupo.scale.x;

  // Crecicimiento, comer algo grande hace crecer más
  const radioActual = tamano_objetivo / 2;
  const radioNuevo = Math.sqrt(radioActual * radioActual + FACTOR_CRECIMIENTO * objeto.tam * objeto.tam);
  tamano_objetivo = radioNuevo * 2;

  // un sonido de comer elegido al azar segun su peso
  reproducirSonidoComer();

  // Animación de comer, el slime se aplasta y rebota.
  // Si vuelve a comer, la animación no se produce de vuelve hasta el intervalo
  if (clock.elapsedTime - ultimoEmpujon > INTERVALO_EMPUJON) {
    velocidadEstiramiento += 5.5;
    ultimoEmpujon = clock.elapsedTime;
  }

  // Puntos en el HUD proporcionales al tamaño del objeto
  var puntosBocado = Math.max(1, Math.round(100 * objeto.tam / tamano_base));
  puntos += puntosBocado;
  anunciarBocado(objeto.def.nombre, puntosBocado);
  mostrarEnVisor(objeto);

  comidos++;
  console.log('Comido:', objeto.def.nombre, '- total:', comidos,
              '- tamaño:', (tamano_objetivo / tamano_base).toFixed(2) + 'x');

  // Los objetos con "final: true" (el Sol) terminan la partida
  if (objeto.def.final) terminarJuego();
}

// MENU: pantalla de inicio (nombre, explicacion, controles y botones) y creditos.
function crearMenuInicio()
{
  const estilo = document.createElement('style');
  estilo.textContent = `
    /* Mientras se ve el menu, el HUD se oculta */
    body.en-menu .hud-panel, body.en-menu .hud-bocados, body.en-menu .hud-aviso { display: none; }

    .menu-fondo {
      position: fixed; inset: 0; z-index: 60;
      display: flex; align-items: center; justify-content: center; padding: 16px;
      background: radial-gradient(ellipse at center, rgba(20, 25, 45, 0.35), rgba(20, 25, 45, 0.85));
      font-family: 'Segoe UI', 'Trebuchet MS', sans-serif; color: #ffffff;
      transition: opacity 0.5s;
    }
    .menu-fondo.oculto { opacity: 0; pointer-events: none; }
    .menu-tarjeta {
      width: min(600px, 100%); max-height: 100%; overflow-y: auto;
      padding: 30px 38px; border-radius: 20px; text-align: center;
      background: rgba(25, 30, 45, 0.9); box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4);
    }
    .menu-titulo {
      font-size: clamp(44px, 8vw, 72px); font-weight: 800; line-height: 1; margin-bottom: 14px;
      color: #8dffb5; letter-spacing: -0.02em;
      text-shadow: 0 5px 0 #2f8f6a, 0 12px 30px rgba(0, 0, 0, 0.4);
    }
    .menu-texto { opacity: 0.85; line-height: 1.5; margin-bottom: 20px; }
    .menu-controles {
      display: grid; grid-template-columns: auto 1fr; gap: 8px 16px;
      text-align: left; max-width: 440px; margin: 0 auto 26px; font-size: 15px; align-items: center;
    }
    .menu-controles dt { text-align: right; white-space: nowrap; }
    .menu-controles dd { opacity: 0.8; }
    .menu-tarjeta kbd {
      display: inline-block; min-width: 24px; padding: 1px 7px; border-radius: 6px;
      background: rgba(255, 255, 255, 0.14); border-bottom: 3px solid rgba(255, 255, 255, 0.25);
      font-family: inherit; font-size: 13px; text-align: center;
    }
    .menu-botones { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
    .menu-boton {
      font-family: inherit; font-size: 20px; font-weight: 700; padding: 10px 34px;
      border: none; border-radius: 999px; cursor: pointer; transition: transform 0.1s;
    }
    .menu-boton:hover { transform: translateY(-2px); }
    .menu-boton.principal { background: #8dffb5; color: #1f2a36; }
    .menu-boton.secundario { background: rgba(255, 255, 255, 0.14); color: #ffffff; }
    .menu-creditos h2 { font-size: 36px; margin-bottom: 18px; color: #8dffb5; }
    .menu-creditos h3 { font-size: 17px; margin: 16px 0 6px; }
    /* padding: 0 quita la sangria izquierda que el navegador pone a las listas
       por defecto (unos 40px): sin ella, el texto queda centrado de verdad */
    .menu-creditos ul { list-style: none; padding: 0; text-align: center; opacity: 0.8; line-height: 1.6; margin-bottom: 6px; }
  `;
  document.head.appendChild(estilo);
  document.body.classList.add('en-menu');

  const fondo = document.createElement('div');
  fondo.className = 'menu-fondo';
  fondo.innerHTML =
    // Pantalla principal
    '<div class="menu-tarjeta menu-principal">' +
      '<div class="menu-titulo">Tasty Katamari</div>' +
      '<p class="menu-texto">Eres un slime con mucha hambre. Cómete todo lo que sea más pequeño que tú para crecer. ' +
        'Si algo te hace rebotar, significa que aún eres demasiado pequeño. Cada vez que alcanzas el tamaño necesario, ' +
        'el mundo se hace más grande y descubres un nivel nuevo. ¡A comer!</p>' +
      '<dl class="menu-controles">' +
        '<dt><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd></dt><dd>Moverte (también con las flechas)</dd>' +
        '<dt><kbd>C</kbd></dt><dd>Cambiar de cámara</dd>' +
        '<dt>Click izquierdo y derecho</dt><dd>Girar la cámara (modos cámara orbital y de seguimiento)</dd>' +
        '<dt>Rueda del ratón</dt><dd>Acercar o alejar la cámara</dd>' +
        '<dt><kbd>H</kbd></dt><dd>Mostrar u ocultar la flecha guía</dd>' +
        '<dt><kbd>B</kbd></dt><dd>Activar o desactivar el efecto de brillo</dd>' +
        '<dt><kbd>M</kbd></dt><dd>Activar o silenciar el sonido</dd>' +
        '<dt><kbd>P</kbd></dt><dd>Pausar o despausar el juego</dd>' +
      '</dl>' +
      '<div class="menu-botones">' +
        '<button class="menu-boton principal boton-jugar">Jugar</button>' +
        '<button class="menu-boton secundario boton-creditos">Créditos</button>' +
      '</div>' +
    '</div>' +
    // Créditos
    '<div class="menu-tarjeta menu-creditos" style="display: none">' +
      '<h2>Créditos</h2>' +
      '<h3>Desarrollo</h3><ul><li>Francisco He Chi</li></ul>' +
      '<h3>Modelos 3D</h3><ul>' +
        '<li>Slime: Slime, powers28 (Sketchfab, CC BY)</li>' +
        '<li>Hormiga: Ant_lowpoly, celso1.rochar (Sketchfab, CC BY)</li>' +
        '<li>Piedrecita: Rock, azzajess (Sketchfab, CC BY)</li>' +
        '<li>Hierba: Small_grass, Arigura (Sketchfab, CC BY)</li>' +
        '<li>Flor: Dandelion Low-Poly, Cianon (Sketchfab, CC BY)</li>' +
        '<li>Seta Roja: Mushroom Low- Poly, makinggamesdotcom (Sketchfab, CC BY)</li>' +
        '<li>Seta Azul: Low-Poly Mushroom 2, Saskia (Sketchfab, CC BY)</li>' +
        '<li>Lata: Soda Can crushed trash Low-poly, rzaletskyy (Sketchfab, CC BY)</li>' +
        '<li>Botella: Water bottle [Low Poly], Islide (Sketchfab, CC BY)</li>' +
        '<li>Maceta: Flower, luccacatalan (Sketchfab, CC BY)</li>' +
        '<li>Arbusto: Low Poly Bushes, Martin3DWork (Sketchfab, CC BY)</li>' +
        '<li>Bob Esponja: SpongeBob GameStation - SpongeBob, SMF Features Developed From Cheryl Hill (Sketchfab, CC BY)</li>' +
        '<li>Patricio: Patrick BFBB Animation Pack, SMF Features Developed From Cheryl Hill (Sketchfab, CC BY)</li>' +
        '<li>Calamardo: Squidward Tentacles, Super Tablé (Sketchfab, CC BY)</li>' +
        '<li>Casa de Bob Esponja: TSCP - SpongeBob House, SMF Features Developed From Cheryl Hill (Sketchfab, CC BY)</li>' +
        '<li>Casa de Patricio: TSCP - Patrick House, SMF Features Developed From Cheryl Hill (Sketchfab, CC BY)</li>' +
        '<li>Casa de Calamardo: TSCP - Squidward House, SMF Features Developed From Cheryl Hill (Sketchfab, CC BY)</li>' +
        '<li>Perro: Low poly Black dog, 𝔑𝔲𝔩𝔩𝔞 (Sketchfab, CC BY)</li>' +
        '<li>Mujer: Low-poly Woman, Razvan Savescu (Sketchfab, CC BY)</li>' +
        '<li>Hombre: Low-poly Man, Razvan Savescu (Sketchfab, CC BY)</li>' +
        '<li>Banco: Low-Poly Wooden Bench, nick.3dartist (Sketchfab, CC BY)</li>' +
        '<li>Excalibur: Excalibur, Luiza Moreira (Sketchfab, CC BY)</li>' +
        '<li>Farola: Lamppost, Lamorak (Sketchfab, CC BY)</li>' +
        '<li>Farola Moderna: Street Light, Algirdas Lalys (Sketchfab, CC BY)</li>' +
        '<li>Coche Amarillo: car low poly, andregualb (Sketchfab, CC BY)</li>' +
        '<li>Coche Morado: Low poly car, necifes (Sketchfab, CC BY)</li>' +
        '<li>Árbol 1: Lowpoly Tree, Anwar Ali (Sketchfab, CC BY)</li>' +
        '<li>Árbol 2: Lowpoly Tree, adam127 (Sketchfab, CC BY)</li>' +
        '<li>Árbol 3: Lowpoly Tree Game Asset, 3Dimentional (Sketchfab, CC BY)</li>' +
        '<li>Tienda: Low Poly Store Building, Zeeshan Khan (Sketchfab, CC BY)</li>' +
        '<li>Casa 1: Low Poly Building, A.S.D. (Sketchfab, CC BY)</li>' +
        '<li>Casa 2: Low Poly Building, Ahmed Galeb (Sketchfab, CC BY)</li>' +
        '<li>Casa 3: Low Poly Building, trystyrobot (Sketchfab, CC BY)</li>' +
        '<li>Casa 4: Low poly apartment building 3, assetfactory (Sketchfab, CC BY)</li>' +
        '<li>Fuente: Low-poly outdoor water fountain, pino (Sketchfab, CC BY)</li>' +
        '<li>Torre: Low Poly Skyscraper - Game-Ready Modular, AudimX Studio (Sketchfab, CC BY)</li>' +
        '<li>Torre Alta: SKYSCRAPER, mehmetserdartekin (Sketchfab, CC BY)</li>' +
        '<li>Rascacielos: Low Poly Skyscraper - Cartoon City Building, AudimX Studio (Sketchfab, CC BY)</li>' +
        '<li>Molino 1: Windmill ( Animated ), Adrian Hage (Sketchfab, CC BY)</li>' +
        '<li>Molino 2: windmill low poly, dlcampos1612 (Sketchfab, CC BY)</li>' +
        '<li>Mamut: Low poly Columbian mammoth (Mammuthus columbi), Natural History Museum of Los Angeles County (Sketchfab, CC BY)</li>' +
        '<li>Bosque: Forest Tile, amiutass (Sketchfab, CC BY)</li>' +
        '<li>Montaña 1: Low Poly mountain, lifekors (Sketchfab, CC BY)</li>' +
        '<li>Montaña 2: Low Poly mountain, lifekors (Sketchfab, CC BY)</li>' +
        '<li>Montaña 3: Low Poly Mountain Free, Poly Craftsman (Sketchfab, CC BY)</li>' +
        '<li>Castillo: Low Poly Castle, Yanez Designs (Sketchfab, CC BY)</li>' +
        '<li>Ciudad: City low-poly, long_toi (Sketchfab, CC BY)</li>' +
        '<li>Godzilla: Minecraft Godzilla Free With Animations, Wafflesaurus (Sketchfab, CC BY)</li>' +
        '<li>Hallucigenia: Hallucigenia from Attack On Titan, Ivon852 (Sketchfab, CC BY)</li>' +
        '<li>Serafín: Seraphim, CsDani50 (Sketchfab, CC BY)</li>' +
        '<li>Golem: Iron golem, PolyEden (Sketchfab, CC BY)</li>' +
        '<li>Satélite 1: Low poly Satellite, Green fish (Sketchfab, CC BY)</li>' +
        '<li>Satélite 2: Satellite - Low Poly, calebcram (Sketchfab, CC BY)</li>' +
        '<li>Astronauta: Low-poly Falling Astronaut - 3December, Šimon Ustal (Sketchfab, CC BY)</li>' +
        '<li>UFO: UFO, Graphfun (Sketchfab, CC BY)</li>' +
        '<li>Robot: Low-poly-ms-gundam-rx-78-2, haidarhakim (Sketchfab, CC BY)</li>' +
        '<li>Cohete: Rocket 🚀, lizlancaster (Sketchfab, CC BY)</li>' +
        '<li>Asteroide 1: Stylized lowpoly rock, Bull studios (Sketchfab, CC BY)</li>' +
        '<li>Asteroide 2: Stylized Rock2, Bull studios (Sketchfab, CC BY)</li>' +
        '<li>Asteroide 3: Low Poly Rock, xError1337 (Sketchfab, CC BY)</li>' +
        '<li>Asteroide 4: Low-Poly Rock, dvnc.tech (Sketchfab, CC BY)</li>' +
        '<li>Cometa: Low Poly FireBall / Boule de feu en Low Poly, Dzénetan Massart (Sketchfab, CC BY)</li>' +
      '</ul>' +
      '<h3>Música y sonidos</h3><ul>' +
        '<li>Lonely Rolling Star: Katamari Damacy REROLL</li>' +
        '<li>Lets Fly to Rio: Dynamedion</li>' +
        '<li>Sonidos recoger cosas: Katamari Damacy REROLL</li>' +
        '<li>Sonido mordisco: Nom Noise, TheDragonsSpark (freesound.org, CC BY)</li>' +
        '<li>Sonido Tragar: Nom_D_02.wav, PaulMorek (freesound.org, CC BY)</li>' +
        '<li>Sonido nom: nom !, chestnutjam (freesound.org, CC BY)</li>' +
        '<li>Sonidos choques: Katamari Damacy REROLL</li>' +
        '<li>Sonido ouch: Short Ouch, qubodup (freesound.org, CC BY)</li>' +
        '<li>Sonido victoria: Katamari Damacy REROLL</li>' +
      '</ul>' +
      '<h3>Texturas e imágenes</h3><ul><li>Suelos y fondos de niveles: magnific.com</li><li>Espacios y planetas: solarsystemscope.com</li></ul>' +
      '<h3>Librerías</h3><ul>' +
        '<li>Three.js r140</li>' +
        '<li>OrbitControls.js</li>' +
        '<li>GLTFLoader.js</li>' +
        '<li>dat.gui.min.js</li>' +
        '<li>SkeletonUtils.js</li>' +
        '<li>CopyShader.js</li>' +
        '<li>LuminosityHighPassShader.js</li>' +
        '<li>EffectComposer.js</li>' +
        '<li>RenderPass.js</li>' +
        '<li>ShaderPass.js</li>' +
        '<li>UnrealBloomPass.js</li>' +
        '<li>stats.js</li>' +
      '</ul>' +
      '<div class="menu-botones" style="margin-top: 22px">' +
        '<button class="menu-boton secundario boton-volver">Volver</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(fondo);

  const principal = fondo.querySelector('.menu-principal');
  const creditos = fondo.querySelector('.menu-creditos');

  fondo.querySelector('.boton-jugar').addEventListener('click', function () {
    empezarPartida(fondo);
  });
  fondo.querySelector('.boton-creditos').addEventListener('click', function () {
    principal.style.display = 'none';
    creditos.style.display = 'block';
  });
  fondo.querySelector('.boton-volver').addEventListener('click', function () {
    creditos.style.display = 'none';
    principal.style.display = 'block';
  });
}

// Pantalla de pausa y cambio entre pausa y juego
function crearPantallaPausa()
{
  const estilo = document.createElement('style');
  estilo.textContent = `
    .pantalla-pausa {
      position: fixed; inset: 0; z-index: 55;
      display: none; align-items: center; justify-content: center;
      background: rgba(10, 12, 25, 0.55);
      font-family: 'Segoe UI', 'Trebuchet MS', sans-serif; color: #ffffff;
    }
    .pantalla-pausa.visible { display: flex; }
    .pausa-tarjeta {
      padding: 26px 40px; border-radius: 18px; text-align: center;
      background: rgba(25, 30, 45, 0.9);
    }
    .pausa-tarjeta h2 { font-size: 40px; color: #8dffb5; margin-bottom: 6px; }
    .pausa-tarjeta p { opacity: 0.8; margin-bottom: 20px; }
    .pausa-tarjeta kbd {
      display: inline-block; min-width: 24px; padding: 1px 7px; border-radius: 6px;
      background: rgba(255, 255, 255, 0.14); border-bottom: 3px solid rgba(255, 255, 255, 0.25);
      font-family: inherit; font-size: 13px;
    }
    .pausa-boton {
      font-family: inherit; font-size: 20px; font-weight: 700; padding: 10px 34px;
      border: none; border-radius: 999px; background: #8dffb5; color: #1f2a36; cursor: pointer;
    }
  `;
  document.head.appendChild(estilo);

  pantallaPausa = document.createElement('div');
  pantallaPausa.className = 'pantalla-pausa';
  pantallaPausa.innerHTML =
    '<div class="pausa-tarjeta">' +
      '<h2>Pausa</h2>' +
      '<p>Pulsa <kbd>P</kbd> para continuar</p>' +
      '<button class="pausa-boton">Continuar</button>' +
    '</div>';
  document.body.appendChild(pantallaPausa);
  pantallaPausa.querySelector('.pausa-boton').addEventListener('click', alternarPausa);
}

function alternarPausa()
{
  // Solo se puede pausar durante la partida (no en el menu ni tras ganar)
  if (!juegoIniciado || juegoTerminado) return;

  juegoPausado = !juegoPausado;
  pantallaPausa.classList.toggle('visible', juegoPausado);

  if (juegoPausado) {
    // Soltar todas las teclas
    controls.moveForward = controls.moveBackward = false;
    controls.moveLeft = controls.moveRight = false;
    controls.rotateCameraLeft = controls.rotateCameraRight = false;
    if (musica && musica.isPlaying) musica.pause();// parar música
  } else {
    clock.getDelta(); // descartar el tiempo que ha pasado en pausa
    if (musica && musica.buffer && !musica.isPlaying) musica.play();
  }
}

function empezarPartida(fondo)
{
  juegoIniciado = true;
  document.body.classList.remove('en-menu');
  fondo.classList.add('oculto');
  setTimeout(function () { fondo.remove(); }, 600);
  mostrarAviso('Nivel 1: ' + ESCALAS[0].nombre, '', 2500);
}

// Fin de la partida: el slime se para, el tiempo se para, las luces
// se apagan y aparece la pantalla de victoria
function terminarJuego()
{
  if (juegoTerminado) return;
  juegoTerminado = true;

  // El slime deja de moverse
  controls.moveForward = controls.moveBackward = false;
  controls.moveLeft = controls.moveRight = false;

  mostrarAviso('¡Te has comido el Sol!', '', 2500);
  setTimeout(mostrarPantallaFinal, ESPERA_PANTALLA_FINAL * 1000);

  // Sonido de victoria
  if (canalVictoria && canalVictoria.buffer) canalVictoria.play();
}

// Apaga las luces en unos 2,5s
function actualizarApagon(delta)
{
  if (!juegoTerminado || apagon >= 1) return;
  apagon = Math.min(1, apagon + delta * 0.4);
  luzSol.intensity = 0.8 * (1 - apagon);
  luzAmbiente.intensity = 0.4 * (1 - 0.7 * apagon); // luz ambiental para seguir viendo al slime
}

function mostrarPantallaFinal()
{
  const estilo = document.createElement('style');
  estilo.textContent = `
    .pantalla-final {
      position: fixed; inset: 0; z-index: 50;
      display: flex; align-items: center; justify-content: center;
      background: rgba(10, 10, 25, 0.6);
      font-family: 'Segoe UI', 'Trebuchet MS', sans-serif; color: #ffffff;
      animation: final-entrar 0.6s ease-out;
    }
    @keyframes final-entrar { from { opacity: 0; } }
    .final-tarjeta {
      width: min(520px, 90vw); padding: 30px 36px; text-align: center;
      border-radius: 18px; background: rgba(25, 30, 45, 0.9);
    }
    .final-tarjeta h1 { font-size: 40px; margin-bottom: 8px; color: #ffd23f; }
    .final-tarjeta p { opacity: 0.8; margin-bottom: 20px; line-height: 1.4; }
    .final-datos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 24px; }
    .final-datos div { padding: 10px; border-radius: 12px; background: rgba(255, 255, 255, 0.08); }
    .final-datos strong { display: block; font-size: 24px; font-variant-numeric: tabular-nums; }
    .final-datos span { font-size: 13px; opacity: 0.75; }
    .final-boton {
      font-family: inherit; font-size: 20px; font-weight: 700; padding: 10px 34px;
      border: none; border-radius: 999px; background: #8dffb5; color: #1f2a36; cursor: pointer;
    }
    .final-boton:hover { filter: brightness(1.1); }
  `;
  document.head.appendChild(estilo);

  const pantalla = document.createElement('div');
  pantalla.className = 'pantalla-final';
  pantalla.innerHTML =
    '<div class="final-tarjeta">' +
      '<h1>¡Te has comido el Sol!</h1>' +
      '<p>¡Muchas gracias por jugar!</p>' +
      '<div class="final-datos">' +
        '<div><strong class="dato-tiempo"></strong><span>Tiempo</span></div>' +
        '<div><strong class="dato-puntos"></strong><span>Puntos</span></div>' +
        '<div><strong class="dato-bocados"></strong><span>Bocados</span></div>' +
        '<div><strong class="dato-tamano"></strong><span>Tamaño final</span></div>' +
      '</div>' +
      '<button class="final-boton">Jugar otra vez</button>' +
    '</div>';
  document.body.appendChild(pantalla);

  pantalla.querySelector('.dato-tiempo').textContent = formatoTiempo(tiempoJugado);
  pantalla.querySelector('.dato-puntos').textContent = puntos.toLocaleString('es-ES');
  pantalla.querySelector('.dato-bocados').textContent = comidos.toLocaleString('es-ES');
  pantalla.querySelector('.dato-tamano').textContent = Math.round(tamano_slime / tamano_base).toLocaleString('es-ES');

  // Volver a jugar = recargar la pagina
  pantalla.querySelector('.final-boton').addEventListener('click', function () {
    window.location.reload();
  });
}

// El tamaño actual se acerca lentamente al objetivo y todo lo que
// depende (modelo, camaras, sombras, minimapa) se recalcula
function actualizarCrecimiento(delta)
{
  tamano_slime = amortiguar(tamano_slime, tamano_objetivo, 5, delta);

  velocidadEstiramiento += (-120 * estiramiento - 9 * velocidadEstiramiento) * delta;
  estiramiento += velocidadEstiramiento * delta;
  var e = THREE.MathUtils.clamp(estiramiento, -0.3, 0.3);

  var escala = tamano_slime / tamano_base;
  cuerpo_slime.scale.set(escala * (1 + e * 0.6), escala * (1 - e), escala * (1 + e * 0.6));

  if (luzAura) {
    luzAura.distance = tamano_slime * AURA_ALCANCE;
    luzAura.position.set(0, tamano_slime * 0.8, 0);
  }

  camera.near = tamano_slime * 0.05;
  camera.far = tamano_slime * 100;
  camera.updateProjectionMatrix();

  configurarSombras();

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

// Comportamiento de los objetos que se mueven
//   - pasear: cada pocos segundos elige una dirección al azar y a veces se para
//   - huir: si el slime esta cerca y puede comerlo, corre en dirección contraria
const DISTANCIA_HUIDA = 3; // en tamaños del slime, a esta distancia empiezan a huir
const MULTIPLICADOR_HUIDA = 2.3; // al huir van 2,3 veces mas rapido que paseando

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

  // Velocidad proporcional a su tamaño
  const velocidadPaseo = config.velocidad * objeto.tam;
  let velocidad = velocidadPaseo;

  // Solo huye si el slime puede comerlo, si no, lo ignora
  const dx = p.x - pos_slime.x;
  const dz = p.z - pos_slime.z;
  const distanciaSlime = Math.hypot(dx, dz);
  const huyendo = config.huye && esComestible(objeto) && distanciaSlime < DISTANCIA_HUIDA * tamano_slime;

  m.temporizador -= delta;
  if (huyendo) {
    m.dirObjetivo = Math.atan2(dx, dz); // dirección contraria al slime
    velocidad *= MULTIPLICADOR_HUIDA;
    m.parada = false;
  } else if (m.temporizador <= 0) {
    // Nueva decisión al pasear: girar un poco al azar y, a veces, pararse
    m.dirObjetivo = m.dir + rand(-1.5, 1.5);
    m.temporizador = rand(1.5, 4);
    // Con "seDetiene: false", nunca se para (útil si su modelo solo tiene animación de andar)
    m.parada = config.seDetiene !== false && Math.random() < 0.25;
  }
  if (m.parada && !huyendo) velocidad = 0;

  // Cerca del borde, dar la vuelta hacia el centro
  const limite = suelos[objeto.escala].radio * 0.92 - objeto.radio;
  const distanciaCentro = Math.hypot(p.x, p.z);
  if (distanciaCentro > limite) m.dirObjetivo = Math.atan2(-p.x, -p.z);

  // Giro y velocidad suavizados
  m.dir = amortiguarAngulo(m.dir, m.dirObjetivo, huyendo ? 8 : 3, delta);
  m.velActual = amortiguar(m.velActual, velocidad, 6, delta);

  p.x += Math.sin(m.dir) * m.velActual * delta;
  p.z += Math.cos(m.dir) * m.velActual * delta;

  const nuevaDistancia = Math.hypot(p.x, p.z);
  if (nuevaDistancia > limite) {
    p.x *= limite / nuevaDistancia;
    p.z *= limite / nuevaDistancia;
  }

  objeto.grupo.rotation.y = m.dir + (config.rotacionFrente || 0);

  const acciones = objeto.grupo.userData.acciones;
  if (acciones) {
    const ritmo = THREE.MathUtils.clamp(m.velActual / velocidadPaseo, 0, MULTIPLICADOR_HUIDA);
    const pesoAndar = Math.min(ritmo, 1); 

    acciones.andar.setEffectiveWeight(pesoAndar);
    acciones.quieto.setEffectiveWeight(1 - pesoAndar);

    acciones.andar.setEffectiveTimeScale(Math.max(ritmo, 1));
  }
}

// El objeto comido va hacia el interior del slime y se hace pequeño hasta desaparecer
function actualizarObjetos(delta)
{
  for (let i = objetos.length - 1; i >= 0; i--) {
    const objeto = objetos[i];

    // Desaparecer objetos al hacer transición
    if (objeto.estado === 'desvaneciendo') {
      objeto.t += delta;
      const d = Math.min(objeto.t / 1.2, 1);
      objeto.materiales.forEach(function (m) { m.opacity = 1 - d; });
      objeto.grupo.position.y = -d * objeto.tam * 0.5; // se hunden un poco en el suelo
      if (d >= 1) {
        quitarMixers(objeto.grupo);
        scene.remove(objeto.grupo);
        objeto.materiales.forEach(function (m) { m.dispose(); }); 
        objetos.splice(i, 1);
      }
      continue;
    }

    if (objeto.estado !== 'comiendo') continue;

    objeto.t += delta;
    const k = Math.min(objeto.t / DURACION_BOCADO, 1);
    const suave = k * k; // empieza despacio y acelera

    // Termina en el centro del slime
    _destinoBocado.set(0, tamano_slime * 0.35, 0);
    objeto.grupo.position.lerpVectors(objeto.posicionInicial, _destinoBocado, suave);
    objeto.grupo.scale.setScalar(Math.max(0.0001, objeto.escalaInicial * (1 - suave)));

    if (k >= 1) {
      quitarMixers(objeto.grupo); // su animación deja de actualizarse
      slime.remove(objeto.grupo);
      objetos.splice(i, 1);
    }
  }
}

// Crea el suelo de un nivel, un disco plano con un borde de tierra.
function crearSuelo(indice)
{
  const E = ESCALAS[indice];
  const radio = E.radioSuelo * tamano_base;
  const alto = E.altoBorde * tamano_base;

  // El espacio no tiene suelo ni fondo
  if (E.espacio) {
    const vacio = new THREE.Group();
    vacio.name = 'suelo_' + indice;
    scene.add(vacio);
    suelos[indice] = { grupo: vacio, radio: radio, escalaInicial: 1, t: 1, fondoDesvaneciendo: null };
    return;
  }

  // Los suelos del nivel anterior aparecen dentro del nuevo nivel. Para que no parpadeen al
  // superponerse, polygonOffset mueve un poco.
  const prioridad = ESCALAS.length - 1 - indice;
  const materialSuelo = new THREE.MeshStandardMaterial({
    color: E.colorSuelo, roughness: 1,
    polygonOffset: true, polygonOffsetFactor: -2 * prioridad, polygonOffsetUnits: -4 * prioridad
  });

  // Textura del suelo
  if (E.texturaSuelo) {
    const textura = new THREE.TextureLoader().load(E.texturaSuelo);
    textura.encoding = THREE.sRGBEncoding;
    textura.wrapS = textura.wrapT = THREE.MirroredRepeatWrapping;
    const repeticiones = E.tamanoBaldosa ? (2 * E.radioSuelo) / E.tamanoBaldosa : E.repetirTextura;
    textura.repeat.set(repeticiones, repeticiones);
    textura.magFilter = THREE.LinearMipMapLinearFilter;
    textura.minFilter = THREE.LinearMipMapLinearFilter; 
    materialSuelo.map = textura;
    materialSuelo.color.set(0xffffff);
  }

  const superficie = new THREE.Mesh(new THREE.CircleGeometry(radio, 96), materialSuelo);
  superficie.rotation.x = -Math.PI / 2; // Girar el suelo vertical
  superficie.name = 'superficie';
  superficie.receiveShadow = true; // El suelo recibe la sombras

  // Cilindro sin tapas (openEnded), un poco mas estrecho por abajo
  const materialBorde = new THREE.MeshStandardMaterial({ color: E.colorBorde, roughness: 1 });
  const borde = new THREE.Mesh(
    new THREE.CylinderGeometry(radio, radio * 0.92, alto, 96, 1, true),
    materialBorde
  );
  borde.position.y = -alto / 2;
  borde.name = 'borde';

  const grupo = new THREE.Group();
  grupo.name = 'suelo_' + indice;
  grupo.add(superficie, borde);

  // Añadir el cilindro al nivel
  const fondo = crearFondoCilindro(indice);
  if (fondo) grupo.add(fondo);
  scene.add(grupo);

  // Al transicionar, el suelo de un nivel nuevo empieza del tamaño del anterior y
  // crece hasta el suyo (actualizarSuelos)
  const escalaInicial = indice === 0 ? 1 : ESCALAS[indice - 1].radioSuelo / E.radioSuelo;
  grupo.scale.set(escalaInicial, 1, escalaInicial);

  suelos[indice] = { grupo: grupo, radio: radio, escalaInicial: escalaInicial,
                     t: indice === 0 ? 1 : 0, fondoDesvaneciendo: null };
  console.log('Escenario creado:', E.nombre, '- radio', radio.toFixed(2));
}

// Crear el cilindro del nivel
function crearFondoCilindro(indice)
{
  const E = ESCALAS[indice];
  if (!E.fondo) return null;

  const radio = E.radioSuelo * tamano_base * 1.00;
  const alto = E.radioSuelo * tamano_base * E.altoFondo;
  const base = -E.altoBorde * tamano_base;
  const altoTotal = alto - base;

  const geometria = new THREE.CylinderGeometry(radio, radio, altoTotal, 96, 1, true);
  geometria.scale(-1, 1, 1);

  const textura = new THREE.TextureLoader().load(E.fondo, function (imagen) {
    // Repetir la imagen alrededor del cilindro
    const proporcion = imagen.image.width / imagen.image.height;
    const perimetro = 2 * Math.PI * radio;
    textura.repeat.x = Math.max(1, Math.round(perimetro / (altoTotal * proporcion)));
  }, undefined, function () {
    console.error('No se pudo cargar el fondo:', E.fondo);
  });
  textura.encoding = THREE.sRGBEncoding;
  textura.wrapS = THREE.MirroredRepeatWrapping;

  // MeshBasicMaterial = no le afecta las luces ni las sombras.
  const material = new THREE.MeshBasicMaterial({ map: textura, toneMapped: false });

  const cilindro = new THREE.Mesh(geometria, material);
  cilindro.position.y = base + altoTotal / 2;
  cilindro.name = 'fondo';

  // Capa 1, la ve la camara principal pero no la cenital, asi en el minimapa
  // no aparece como un anillo alrededor del nivel
  cilindro.layers.set(1);

  // Color del cielo que se ve por encima del cilindro
  if (E.colorCielo !== undefined) renderer.setClearColor(new THREE.Color(E.colorCielo));

  return cilindro;
}

// Cambio de nivel
function comprobarCambioNivel()
{
  const E = ESCALAS[escala_actual];
  const esUltimo = escala_actual >= ESCALAS.length - 1;
  if (transicion.activa || esUltimo) return;

  if (tamano_objetivo / tamano_base >= E.umbral) iniciarTransicion(escala_actual + 1);
}

// Saltar niveles con números
function saltarANivel(destino)
{
  if (slime === null) return;
  if (destino >= ESCALAS.length) {
    mostrarAviso('El nivel ' + (destino + 1) + ' no existe', 'peligro', 1200);
    return;
  }
  if (destino <= escala_actual) {
    mostrarAviso('Solo se puede saltar hacia delante', 'info', 1200);
    return;
  }

  while (escala_actual < destino) {
    const tamanoNuevo = ESCALAS[escala_actual].umbral * tamano_base;
    tamano_objetivo = tamanoNuevo;
    tamano_slime = tamanoNuevo;
    iniciarTransicion(escala_actual + 1);
  }
}

function iniciarTransicion(nueva)
{
  const anterior = escala_actual;
  escala_actual = nueva;

  // Suelo y fondo del nivel nuevo, que crece alrededor del actual
  crearSuelo(nueva);

  // Objetos del nivel nuevo
  generarObjetos(nueva);

  // Eliminar cosas pequeñas del nivel anterior
  objetos.forEach(function (objeto) {
    if (objeto.estado !== 'activo') return;
    const muyAntiguo = objeto.escala <= nueva - 2;
    const diminuto = objeto.escala === nueva - 1 && objeto.tam < tamano_slime * 0.25;
    if (muyAntiguo || diminuto) desvanecerObjeto(objeto);
  });

  // El fondo del nivel anterior desaparece
  const fondoAnterior = suelos[anterior].grupo.getObjectByName('fondo');
  if (fondoAnterior) {
    fondoAnterior.material.transparent = true;
    suelos[anterior].fondoDesvaneciendo = { malla: fondoAnterior, t: 0 };
  }

  // Al llegar al espacio, desaparecen todos los suelos
  // anteriores (y, si el nivel lo indica, todos los objetos anteriores)
  if (ESCALAS[nueva].espacio) {
    for (let k = 0; k < nueva; k++) desvanecerSuelo(k);
    if (ESCALAS[nueva].borrarObjetosAnteriores) {
      objetos.forEach(function (objeto) {
        if (objeto.estado === 'activo' && objeto.escala < nueva) desvanecerObjeto(objeto);
      });
    }
  }

  // Animación de cámara y aviso
  transicion.activa = true;
  transicion.t = 0;
  mostrarAviso('Nivel ' + (nueva + 1) + ': ' + ESCALAS[nueva].nombre, '', 3000);

  // Si el nivel nuevo usa otra imagen de cielo, se cambia
  actualizarCielo(nueva);

  // Cambiar el nivel de bloom
  aplicarBloomNivel(nueva);
}

// Buscar la imagen de CIELOS que corresponde a un nivel
function cieloParaNivel(indice)
{
  let elegido = null;
  for (let i = 0; i < CIELOS.length; i++) {
    if (CIELOS[i].desdeNivel <= indice + 1) elegido = CIELOS[i];
  }
  return elegido;
}

// BLOOM con postprocesados:

function crearBloom()
{
  if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass || !THREE.ShaderPass) {
    console.warn('BLOOM: faltan los scripts de efectos en el HTML; el juego sigue sin brillo');
    return;
  }

  composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, camera));

  bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    BLOOM_DIA.fuerza, BLOOM_DIA.radio, BLOOM_DIA.umbral
  );
  composer.addPass(bloomPass);

  const correccion = THREE.GammaCorrectionShader || {
    uniforms: { tDiffuse: { value: null } },
    vertexShader:
      'varying vec2 vUv;\n' +
      'void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader:
      'uniform sampler2D tDiffuse;\n' +
      'varying vec2 vUv;\n' +
      'void main() { gl_FragColor = LinearTosRGB(texture2D(tDiffuse, vUv)); }'
  };
  composer.addPass(new THREE.ShaderPass(correccion));

  aplicarBloomNivel(escala_actual);
}

// Elegir el brillo del nivel
function aplicarBloomNivel(indice)
{
  const E = ESCALAS[indice];
  bloomObjetivo = E.bloom || (E.espacio ? BLOOM_ESPACIO : BLOOM_DIA);
}

function actualizarBloom(delta)
{
  if (!bloomPass || !bloomObjetivo) return;
  bloomPass.strength = amortiguar(bloomPass.strength, bloomObjetivo.fuerza, 1.5, delta);
  bloomPass.radius = amortiguar(bloomPass.radius, bloomObjetivo.radio, 1.5, delta);
  bloomPass.threshold = amortiguar(bloomPass.threshold, bloomObjetivo.umbral, 1.5, delta);
}

function alternarBloom()
{
  if (!composer) {
    mostrarAviso('Efecto de brillo no disponible', 'info', 1200);
    return;
  }
  bloomActivo = !bloomActivo;
  mostrarAviso(bloomActivo ? 'Brillo activado' : 'Brillo desactivado', 'info', 1000);
}

function actualizarCielo(indice)
{
  const cielo = cieloParaNivel(indice);
  if (!cielo || cielo === cieloActual) return;
  cieloActual = cielo;

  new THREE.TextureLoader().load(cielo.imagen, function (textura) {
    textura.encoding = THREE.sRGBEncoding;
    if (cielo.equirectangular) textura.mapping = THREE.EquirectangularReflectionMapping;

    // Liberar la imagen del cielo anterior
    if (scene.background && scene.background.isTexture) scene.background.dispose();
    scene.background = textura;
  }, undefined, function () {
    console.error('No se pudo cargar el cielo:', cielo.imagen);
  });
}

// Preparar un suelo (disco, borde y fondo) para desaparecer
function desvanecerSuelo(indice)
{
  const suelo = suelos[indice];
  if (!suelo || suelo.desvaneciendo || suelo.eliminado) return;

  suelo.fondoDesvaneciendo = null;
  const materiales = [];
  suelo.grupo.traverse(function (n) {
    if (!n.isMesh) return;
    n.material.transparent = true;
    n.material.needsUpdate = true;
    materiales.push(n.material);
  });
  suelo.desvaneciendo = { t: 0, materiales: materiales };
}

// Preparar un objeto para desaparecer.
function desvanecerObjeto(objeto)
{
  objeto.estado = 'desvaneciendo';
  objeto.t = 0;
  objeto.materiales = [];
  objeto.grupo.traverse(function (n) {
    if (!n.isMesh) return;
    const clonar = function (m) {
      const copia = m.clone();
      copia.transparent = true;
      objeto.materiales.push(copia);
      return copia;
    };
    n.material = Array.isArray(n.material) ? n.material.map(clonar) : clonar(n.material);
  });
}

function actualizarTransicion(delta)
{
  // Duración de la animacion de camara
  if (transicion.activa) {
    transicion.t += delta;
    if (transicion.t >= transicion.duracion) transicion.activa = false;
  }

  suelos.forEach(function (suelo) {
    // Suelos que estan desapareciendo (con su borde y su fondo)
    if (suelo.desvaneciendo) {
      const v = suelo.desvaneciendo;
      v.t += delta;
      const d = Math.min(v.t / 2, 1); // 2 segundos
      v.materiales.forEach(function (m) { m.opacity = 1 - d; });
      if (d >= 1) {
        scene.remove(suelo.grupo);
        suelo.grupo.traverse(function (n) {
          if (!n.isMesh) return;
          n.geometry.dispose();
          if (n.material.map) n.material.map.dispose();
          n.material.dispose();
        });
        suelo.desvaneciendo = null;
        suelo.eliminado = true;
      }
      return;
    }
    if (suelo.eliminado) return;

    // Suelos que están creciendo
    if (suelo.t < 1) {
      suelo.t = Math.min(suelo.t + delta / DURACION_CRECER_SUELO, 1);
      const e = suelo.escalaInicial + (1 - suelo.escalaInicial) * suavizar(suelo.t);
      suelo.grupo.scale.set(e, 1, e);
    }
    // Fondos que se estan desapareciendo
    const f = suelo.fondoDesvaneciendo;
    if (f) {
      f.t += delta;
      const d = Math.min(f.t / 1.5, 1);
      f.malla.material.opacity = 1 - d;
      if (d >= 1) {
        suelo.grupo.remove(f.malla);
        f.malla.geometry.dispose();
        f.malla.material.map.dispose();
        f.malla.material.dispose();
        suelo.fondoDesvaneciendo = null;
      }
    }
  });
}

// Curva de la "revelacion", la distancia de la cámara se multiplica por un
// factor que sube y vuelve a 1 en forma de campana (alejarse, mirar, volver)
function factorRevelacion()
{
  if (!transicion.activa) return 1;
  const k = suavizar(transicion.t / transicion.duracion);
  return 1 + 1.5 * Math.sin(Math.PI * k);
}

// Curva suave de 0 a 1 (empieza y termina despacio)
function suavizar(t)
{
  t = THREE.MathUtils.clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

// Evita que el slime salga del suelo de la escala actual
function limitarAlSuelo(posicion)
{
  const suelo = suelos[escala_actual];
  if (!suelo) return;

  const limite = suelo.radio - tamano_slime * 0.5;
  const distancia = Math.hypot(posicion.x, posicion.z);
  if (distancia > limite) {
    posicion.x *= limite / distancia;
    posicion.z *= limite / distancia;
  }
}

// Iluminación
function crearLuces()
{
  luzAmbiente = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(luzAmbiente);

  luzSol = new THREE.DirectionalLight(0xfff4e0, 0.8); // blanco ligeramente cálido
  luzSol.position.copy(direccion_sol).multiplyScalar(50);
  luzSol.castShadow = true;
  luzSol.shadow.mapSize.set(2048, 2048); // resolución del mapa de sombras
  luzSol.shadow.bias = -0.0005; // evita artefactos de sombras
  scene.add(luzSol);
  scene.add(luzSol.target); // el target tambien debe estar en la escena
}


function configurarSombras()
{
  const camaraSombra = luzSol.shadow.camera;
  const extension = tamano_slime * 12; // zona con sombra
  camaraSombra.left = -extension;
  camaraSombra.right = extension;
  camaraSombra.top = extension;
  camaraSombra.bottom = -extension;
  camaraSombra.near = tamano_slime * 0.1;
  camaraSombra.far = tamano_slime * 40;
  camaraSombra.updateProjectionMatrix();
  luzSol.shadow.normalBias = tamano_slime * 0.01;
}

// El sol se coloca siempre en la misma direccion respecto al slime
function actualizarLuz()
{
  // la luz viene del Sol en el espacio
  if (ESCALAS[escala_actual].sistemaSolar) actualizarDireccionSol();

  luzSol.target.position.copy(slime.position);
  luzSol.position.copy(slime.position).addScaledVector(direccion_sol, tamano_slime * 20);
}

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

// Cámara cenital ortografica para el minimapa del HUD
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
  // Cámara mirando hacia abajo
  cameraTop.up.set(0, 0, -1);

  cameraStencil = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  cameraStencil.position.z = 2;

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
      color: new THREE.Color(0x8dffb5).convertSRGBToLinear(),
      toneMapped: false,
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

function configurarStencilHUD(activo, escenaObjetivo)
{
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
  if (composer) composer.setSize(window.innerWidth, window.innerHeight);   // BLOOM
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update()
{
    stats.update();

    var delta = Math.min(clock.getDelta(), 0.05);

    if (slime === null) {
        cameraControls.update();
        return;
    }

    // Cuando se pausa, no se actualiza nada, la escena se sigue dibujando, pero congelada
    if (juegoPausado) return;

    var mirarAtras = false;

    if (modo_camara === 'seguimiento') {
        // Movimiento relativo a la cámara
        moverRelativoACamara(delta);
    } else {
        // A/D giran, W/S avanzan y retroceden
        // Al ir hacia atras en la camara en tercera persona el slime mira hacia la
        // cámara, asi que se invierte el giro.
        var yendoAtras = controls.moveBackward && !controls.moveForward;
        var sentidoGiro = (modo_camara === 'tercera' && yendoAtras) ? -1 : 1;
        if (controls.moveLeft) angulo += controls.turnSpeed * delta * sentidoGiro;
        if (controls.moveRight) angulo -= controls.turnSpeed * delta * sentidoGiro;

        velocity.set(Math.sin(angulo), 0, Math.cos(angulo));

        var avance = controls.speed * tamano_slime * delta;
        if (controls.moveForward) pos_slime.addScaledVector(velocity, avance);
        if (controls.moveBackward) pos_slime.addScaledVector(velocity, -avance * 0.6);

        // Al ir hacia atras, el modelo se da la vuelta y camina de frente hacia
        // la camara
        mirarAtras = controls.moveBackward && !controls.moveForward;
    }

    limitarAlSuelo(pos_slime);

    // Los objetos con vida pasean y huyen
    actualizarSeresVivos(delta);
    actualizarGiros(delta); // giros sobre si mismos y órbitas

    // Comer lo que es mas pequeño y chocar con lo que es más grande
    comprobarColisiones();

    // Marcar el objeto comestible más grande que hay cerca
    actualizarResalte();

    // Una flecha que punta al objeto comestible más grande de la zona
    actualizarFlecha(delta);

    // Choques
    temblor = Math.max(0, temblor - delta / 0.35);

    // Crecimiento
    actualizarCrecimiento(delta);

    // Transición
    comprobarCambioNivel();
    actualizarTransicion(delta);

    // HUD
    if (juegoIniciado && !juegoTerminado) tiempoJugado += delta;
    actualizarHUD();
    actualizarApagon(delta); // Apagar luces al final de la partida
    actualizarBloom(delta); // Bloom

    // Visualizador de comida
    actualizarVisor(delta);

    slime.position.copy(pos_slime);

    var rotacionObjetivo = angulo + (mirarAtras ? Math.PI : 0);
    var diferencia = Math.atan2(Math.sin(rotacionObjetivo - rotacion_visual),
                                Math.cos(rotacionObjetivo - rotacion_visual));
    rotacion_visual += diferencia * (1 - Math.exp(-10 * delta));
    slime.rotation.y = rotacion_visual + rotacion_frente;

    if (modo_camara === 'orbital') {
        cameraControls.update();
    } else if (modo_camara === 'seguimiento') {
        updateCameraSeguimiento(delta);
    } else {
        updateCamera(delta);
    }

    // Luces
    actualizarLuz();

    // Animacion de los objetos comidos
    actualizarObjetos(delta);

    if (accionSlime != null) {
        var moviendose = controls.moveForward || controls.moveBackward ||
                         controls.moveLeft || controls.moveRight;
        var velocidadAnim = moviendose ? VELOCIDAD_ANIM_MOVIENDOSE : VELOCIDAD_ANIM_QUIETO;
        accionSlime.timeScale = amortiguar(accionSlime.timeScale, velocidadAnim, 5, delta);
    }

    if (mixer != null) mixer.update(delta);

    // Animaciones de objetos
    for (let i = 0; i < mixersObjetos.length; i++) mixersObjetos[i].update(delta);
}

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

// Cámara en tercera persona con posición y punto de mirada elasticos.
function updateCamera(delta)
{
  // Detras del slime (en sentido contrario a donde mira) y algo por encima
  // TRANSICION- durante el cambio de nivel la camara se aleja y vuelve
  const revelacion = factorRevelacion();
  posicion_objetivo_camara
    .copy(slime.position)
    .addScaledVector(velocity, -distancia_camara * tamano_slime * revelacion);
  posicion_objetivo_camara.y += altura_camara * tamano_slime * revelacion;

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


// Cámara de seguimiento
// Su posición se calcula en coordenadas esféricas alrededor del punto objetivo:
//   x = objetivo.x + sin(yaw) * cos(pitch) * dist
//   y = objetivo.y + sin(pitch) * dist
//   z = objetivo.z + cos(yaw) * cos(pitch) * dist
function crearControlesCamaraSeguimiento()
{
  const lienzo = renderer.domElement;

  // Arrastrar con el raton
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

// Al entrar en este modo calcular yaw, pitch y distancia a partir de donde
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

  var distObjetivo = DISTANCIA_SEGUIMIENTO * tamano_slime * cam_seguimiento.zoom * factorRevelacion();
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

// Movimiento relativo a la camara
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

  // Temblor al chocar
  aplicarTemblor(camera, temblor > 0);
  // Bloom
  if (bloomActivo && composer) composer.render();
  else renderer.render( scene, camera );
  aplicarTemblor(camera, false);

  // Minimapa
  const lado = Math.min(window.innerWidth, window.innerHeight) / 3.5;
  const margen = 18;
  const x = margen;
  const alto_stats = 48;
  const y = window.innerHeight - lado - margen - alto_stats;

  renderer.setViewport(x, y, lado, lado);
  renderer.setScissor(x, y, lado, lado);
  renderer.setScissorTest(true);

  const gl = renderer.getContext();
  gl.stencilMask(0xff);
  gl.clearStencil(0);
  renderer.clear(false, true, true);

  renderer.render(stencilScene, cameraStencil);

  configurarStencilHUD(true);
  const cieloGuardado = scene.background;
  scene.background = null;
  renderer.render(scene, cameraTop);
  scene.background = cieloGuardado;
  configurarStencilHUD(false);

  renderer.clearDepth();
  renderer.render(hudBorderScene, cameraStencil);

  // Visualizador de comida
  {
    const xv = window.innerWidth - lado - margen;
    const yv = margen;
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

    fijarHUD('visorPos', lado + ',' + margen, function () {
      etiquetaVisor.style.right = (margen + lado / 2) + 'px';
      etiquetaVisor.style.bottom = (margen + lado - 16) + 'px';
    });
  }

  renderer.setScissorTest(false);
}