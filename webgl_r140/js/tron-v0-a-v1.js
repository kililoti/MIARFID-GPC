/*
 * Seminario practico: Tron Battle Grid
 *
 * Version V0 para el seminario de texturas.
 * Cada material usa chess.png como textura provisional para el ejercicio.
 */

var renderer, scene, camera;
var cameraControls;
var cameraTop, cameraStencil;
var stencilScene, hudBorderScene;
const objetivo_camera_top = new THREE.Vector3();

// POSTPROCESADO- compositor de la vista principal.
var composer;

var mixer = null;
var clock = new THREE.Clock();

// 1- escenario
// Medidas principales de la arena.
const largo_arena = 100;
const alto_pared = 4.5;
const alto_pared_grande = 9;
const alcance_hud = largo_arena + 50;
var cartel_central = null;

// 2- light cycle
var pos_cycle = new THREE.Vector3(0, 0, 0);
var light_cycle = null;

// FINAL- segundo jugador controlado por una IA basica.
const posicion_inicial_ia = new THREE.Vector3(-18, 0, -18);
const pos_cycle_ia = posicion_inicial_ia.clone();
const velocity_ia = new THREE.Vector3(0, 0, 1);
const origen_rayo_ia = new THREE.Vector3();
const direccion_izquierda_ia = new THREE.Vector3();
const direccion_derecha_ia = new THREE.Vector3();
const raycaster_ia = new THREE.Raycaster();
const velocidad_ia = 0.38;
const distancia_deteccion_ia = 5;
const giro_ia = 0.06;
let angulo_ia = 0;
let direccion_giro_ia = 1;
let frames_giro_ia = 0;
let moto_ia = null;

// 3- movimiento y camara en tercera persona
// Copiado y pegado de js/thirdperson.js.
// vamos a reusar el angulo y la velocidad del personaje
var angulo = 0;
var velocity  = new THREE.Vector3(0, 0, 0);

// FINAL- inclinacion visual al girar.
const inclinacion_maxima = THREE.MathUtils.degToRad(18);
const rapidez_inclinacion = 10;
let inclinacion_actual = 0;

// FINAL- estado temporal de choque y reincorporacion.
const duracion_choque = 1.25;
const velocidad_giro_choque = 18;
const eje_choque = new THREE.Vector3();
let tiempo_choque = 0;
let en_choque = false;

// FINAL- salto con cinematica basica.
const gravedad = -18;
const impulso_salto = 8;
let velocidad_vertical = 0;
let en_suelo = true;

// FINAL- deteccion de la altura y pendiente del suelo.
const objetosSuelo = [];
const raycaster_suelo = new THREE.Raycaster();
const origen_rayo_suelo = new THREE.Vector3();
const direccion_rayo_suelo = new THREE.Vector3(0, -1, 0);
const normal_suelo = new THREE.Vector3();
const matriz_normal_suelo = new THREE.Matrix3();
const altura_rayo_suelo = 20;
const pendiente_maxima = 0.3;
const altura_maxima_escalon = 0.5;
let velocidad_vertical_ia = 0;
let en_suelo_ia = true;

// 3- movimiento y camara en tercera persona
// Ponemos este modo a true para ajustar la camara y a false para jugar.
var modo_tunear_camara = false;
var distancia_camara = 7;
var altura_camara = 2.5;
var desfase_lookat_y = 1.95;

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

// PAUSA- la escena sigue dibujandose, pero el juego deja de actualizarse.
var juego_pausado = false;

// 4- colisiones
// Copiado y pegado LITERAL de js/s3-colisiones.js.
const raycaster = new THREE.Raycaster();
var objectsToCheck = [];
var objectsToCheckIA = [];

const controls = {
  moveForward: false,
  moveBackward: false,
  moveLeft: false,
  moveRight: false,
  lookAtDown: false,
  lookAtUp: false,
  speed: 0.2
};

// 3- movimiento y camara en tercera persona
// Copiado y pegado LITERAL de js/thirdperson.js.
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
    // 3- movimiento y camara en tercera persona
    // Teclas agregadas para tunear el desfase vertical del lookAt.
    case 'KeyQ':
      controls.lookAtDown = true;
      break;
    case 'KeyE':
      controls.lookAtUp = true;
      break;
    // FINAL- la barra espaciadora inicia el salto.
    case 'Space':
      event.preventDefault();
      saltar();
      break;
    // PAUSA- la tecla P alterna pausa y camara orbital.
    case 'KeyP':
      if (!event.repeat)
        cambiarPausa();
      break;
  }
});

// 3- movimiento y camara en tercera persona
// Copiado y pegado LITERAL de js/thirdperson.js.
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
    // 3- movimiento y camara en tercera persona
    // Teclas agregadas para tunear el desfase vertical del lookAt.
    case 'KeyQ':
      controls.lookAtDown = false;
      break;
    case 'KeyE':
      controls.lookAtUp = false;
      break;
    // DEBUG- cambio de camara.
    case 'KeyC':
      if (!juego_pausado)
        cambiarCamara();
      break;
  }
});

// FINAL- solo se puede iniciar otro salto despues de volver al suelo.
function saltar()
{
  if (light_cycle === null || en_choque || !en_suelo)
    return;

  velocidad_vertical = impulso_salto;
  en_suelo = false;
}

// Lanza un rayo vertical solamente contra los objetos registrados como suelo.
// Ademas de la altura devuelve la pendiente como desnivel por unidad horizontal:
// 0 es horizontal y 0.1 equivale aproximadamente a una pendiente del 10%.
function detectarSuelo(posicion)
{
  origen_rayo_suelo.copy(posicion);
  origen_rayo_suelo.y += altura_rayo_suelo;
  raycaster_suelo.set(origen_rayo_suelo, direccion_rayo_suelo);
  raycaster_suelo.far = altura_rayo_suelo * 2;

  var impactos = raycaster_suelo.intersectObjects(objetosSuelo, true);
  if (impactos.length === 0)
    return null;

  // Los impactos llegan ordenados desde el mas alto. Ignoramos puentes y
  // otras superficies que esten demasiado por encima de la moto, pero
  // seguimos buscando para poder encontrar el suelo situado debajo.
  var impacto = null;
  for (var i = 0; i < impactos.length; i++) {
    if (impactos[i].point.y <= posicion.y + altura_maxima_escalon) {
      impacto = impactos[i];
      break;
    }
  }

  if (impacto === null)
    return null;

  normal_suelo.copy(impacto.face.normal);
  matriz_normal_suelo.getNormalMatrix(impacto.object.matrixWorld);
  normal_suelo.applyNormalMatrix(matriz_normal_suelo).normalize();

  // La normal puede llegar invertida si el material se ve por ambos lados.
  if (normal_suelo.y < 0)
    normal_suelo.negate();

  return {
    altura: impacto.point.y,
    pendiente: Math.sqrt(
      normal_suelo.x * normal_suelo.x +
      normal_suelo.z * normal_suelo.z
    ) / Math.max(normal_suelo.y, 0.0001)
  };
}

function actualizarAlturaJugador(delta)
{
  var sueloDetectado = detectarSuelo(pos_cycle);
  var sueloTransitable = sueloDetectado !== null &&
    sueloDetectado.pendiente <= pendiente_maxima;

  if (en_suelo && sueloTransitable) {
    pos_cycle.y = sueloDetectado.altura;
    velocidad_vertical = 0;
    return;
  }

  if (en_suelo)
    en_suelo = false;

  velocidad_vertical += gravedad * delta;
  pos_cycle.y += velocidad_vertical * delta;

  // Al caer aterrizamos sobre la primera superficie transitable encontrada.
  if (
    velocidad_vertical <= 0 &&
    sueloTransitable &&
    pos_cycle.y <= sueloDetectado.altura
  ) {
    pos_cycle.y = sueloDetectado.altura;
    velocidad_vertical = 0;
    en_suelo = true;
  }
}

function actualizarAlturaIA(delta)
{
  var sueloDetectado = detectarSuelo(pos_cycle_ia);
  var sueloTransitable = sueloDetectado !== null &&
    sueloDetectado.pendiente <= pendiente_maxima;

  if (en_suelo_ia && sueloTransitable) {
    pos_cycle_ia.y = sueloDetectado.altura;
    velocidad_vertical_ia = 0;
    return;
  }

  if (en_suelo_ia)
    en_suelo_ia = false;

  velocidad_vertical_ia += gravedad * delta;
  pos_cycle_ia.y += velocidad_vertical_ia * delta;

  if (
    velocidad_vertical_ia <= 0 &&
    sueloTransitable &&
    pos_cycle_ia.y <= sueloDetectado.altura
  ) {
    pos_cycle_ia.y = sueloDetectado.altura;
    velocidad_vertical_ia = 0;
    en_suelo_ia = true;
  }
}


// 5- halo 
// Cada tramo vertical usa seis vertices, como en la version original.
const MAX_VERTICES = 1200;
const vertices = new Float32Array(MAX_VERTICES* 3);
// TEXTURA HALO- cada vertice necesita tambien dos coordenadas UV.
const uvs_halo = new Float32Array(MAX_VERTICES * 2);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute(
    'position',
    new THREE.BufferAttribute(vertices, 3)
);
geometry.setAttribute(
    'uv',
    new THREE.BufferAttribute(uvs_halo, 2)
);
geometry.setDrawRange(0, 0);
let nVertices = 0;
let verticesUsados = 0;

// TEXTURA HALO- la imagen se repite cada cuatro unidades de recorrido.
const largo_textura_halo = 4;
let u_halo = 0;

// 5- halo
const dl = 0.1;
const altura_halo = 0.7;
const ancho_halo_hud = 0.35;
// El halo nace cerca de la parte trasera de la moto, no desde su centro.
const distancia_halo = 1.0;
const ultima_pos_halo = new THREE.Vector3();
const ultima_pos_cycle_halo = pos_cycle.clone();
const pos_halo = new THREE.Vector3();
let haloIniciado = false;

// EJERCICIO TEXTURAS- reemplazar y configurar esta textura provisional.
const textura_halo_azul = new THREE.TextureLoader().load('images/haz-azul.png');
textura_halo_azul.encoding = THREE.sRGBEncoding;

const material_halo = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: textura_halo_azul,
    side: THREE.DoubleSide,
    opacity: 1,
    depthWrite: false,
    transparent: true
});
const halo = new THREE.Mesh(geometry, material_halo);

// FINAL- la IA tiene un buffer y un halo independientes.
const vertices_halo_ia = new Float32Array(MAX_VERTICES * 3);
const uvs_halo_ia = new Float32Array(MAX_VERTICES * 2);
const geometry_halo_ia = new THREE.BufferGeometry();
geometry_halo_ia.setAttribute(
    'position',
    new THREE.BufferAttribute(vertices_halo_ia, 3)
);
geometry_halo_ia.setAttribute(
    'uv',
    new THREE.BufferAttribute(uvs_halo_ia, 2)
);
geometry_halo_ia.setDrawRange(0, 0);

let nVertices_halo_ia = 0;
let verticesUsados_halo_ia = 0;
let u_halo_ia = 0;
const ultima_pos_halo_ia = pos_cycle_ia.clone();
const ultima_pos_cycle_halo_ia = pos_cycle_ia.clone();
const pos_halo_ia = new THREE.Vector3();
let halo_ia_iniciado = false;

// EJERCICIO TEXTURAS- reemplazar y configurar esta textura provisional.
const textura_halo_rojo = new THREE.TextureLoader().load('images/haz-rojo.png');
textura_halo_rojo.encoding = THREE.sRGBEncoding;

const material_halo_ia = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: textura_halo_rojo,
    side: THREE.DoubleSide,
    opacity: 1,
    depthWrite: false,
    transparent: true
});
const halo_ia = new THREE.Mesh(geometry_halo_ia, material_halo_ia);

// FINAL- copias horizontales visibles exclusivamente por la camara del HUD.
const geometry_halo_hud = new THREE.BufferGeometry();
geometry_halo_hud.setAttribute(
  'position',
  new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * 3), 3)
);
geometry_halo_hud.setDrawRange(0, 0);
let nVertices_halo_hud = 0;
let verticesUsados_halo_hud = 0;

const geometry_halo_ia_hud = new THREE.BufferGeometry();
geometry_halo_ia_hud.setAttribute(
  'position',
  new THREE.BufferAttribute(new Float32Array(MAX_VERTICES * 3), 3)
);
geometry_halo_ia_hud.setDrawRange(0, 0);
let nVertices_halo_ia_hud = 0;
let verticesUsados_halo_ia_hud = 0;

const halo_hud = new THREE.Mesh(
  geometry_halo_hud,
  new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  })
);
const halo_ia_hud = new THREE.Mesh(
  geometry_halo_ia_hud,
  new THREE.MeshBasicMaterial({
    color: 0xff3355,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthWrite: false
  })
);
halo_hud.layers.set(1);
halo_ia_hud.layers.set(1);


// esta funcion permite agregar un vertice nuevo en el geometrybuffer
// y le dice al 3js que tiene que recalcular las posiciones
function agregarVertice(x, y, z, u, v) {
    const pos = geometry.attributes.position;
    const uv = geometry.attributes.uv;
    pos.setXYZ(nVertices, x, y, z);
    uv.setXY(nVertices, u, v);
    nVertices = (nVertices + 1) % MAX_VERTICES;
    verticesUsados = Math.min(verticesUsados + 1, MAX_VERTICES);
    pos.needsUpdate = true;
    uv.needsUpdate = true;
}

// Mantiene los limites de la geometria dinamica sincronizados con sus vertices.
// Three.js usa la esfera para el frustum culling y el raycaster usa tanto la
// esfera como la caja antes de comprobar cada triangulo.
function actualizarLimitesHalo() {
    geometry.setDrawRange(0, verticesUsados);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
}
// luego solamente hay que hacer
// agregarVertice(10, 0, 20, 0, 0);
// agregarVertice(10, 5, 20, 0, 1); ...

function agregarTramoHalo(desde, hasta) {
    // TEXTURA HALO- U avanza con la distancia y V recorre la altura completa.
    const longitud = desde.distanceTo(hasta);
    const u_desde = u_halo;
    const u_hasta = u_desde + longitud / largo_textura_halo;

    agregarVertice(desde.x, desde.y, desde.z, u_desde, 0);
    agregarVertice(desde.x, desde.y + altura_halo, desde.z, u_desde, 1);
    agregarVertice(hasta.x, hasta.y, hasta.z, u_hasta, 0);

    agregarVertice(hasta.x, hasta.y, hasta.z, u_hasta, 0);
    agregarVertice(desde.x, desde.y + altura_halo, desde.z, u_desde, 1);
    agregarVertice(hasta.x, hasta.y + altura_halo, hasta.z, u_hasta, 1);

    u_halo = u_hasta;

    agregarTramoHaloHUD(desde, hasta, false);

    actualizarLimitesHalo();
}

function agregarTramoHaloHUD(desde, hasta, esIA)
{
  const dx = hasta.x - desde.x;
  const dz = hasta.z - desde.z;
  const longitud = Math.sqrt(dx * dx + dz * dz);

  if (longitud === 0)
    return;

  const mitad_ancho = ancho_halo_hud / 2;
  const px = -dz / longitud * mitad_ancho;
  const pz =  dx / longitud * mitad_ancho;
  const geometria = esIA ? geometry_halo_ia_hud : geometry_halo_hud;
  const atributo = geometria.attributes.position;
  let indice = esIA ? nVertices_halo_ia_hud : nVertices_halo_hud;

  function agregar(x, y, z) {
    atributo.setXYZ(indice, x, y, z);
    indice = (indice + 1) % MAX_VERTICES;
  }

  // Cinta horizontal: solo la camara cenital tiene habilitada su capa.
  agregar(desde.x + px, desde.y + altura_halo, desde.z + pz);
  agregar(desde.x - px, desde.y + altura_halo, desde.z - pz);
  agregar(hasta.x + px, hasta.y + altura_halo, hasta.z + pz);

  agregar(hasta.x + px, hasta.y + altura_halo, hasta.z + pz);
  agregar(desde.x - px, desde.y + altura_halo, desde.z - pz);
  agregar(hasta.x - px, hasta.y + altura_halo, hasta.z - pz);

  atributo.needsUpdate = true;

  if (esIA) {
    nVertices_halo_ia_hud = indice;
    verticesUsados_halo_ia_hud = Math.min(
      verticesUsados_halo_ia_hud + 6,
      MAX_VERTICES
    );
    geometria.setDrawRange(0, verticesUsados_halo_ia_hud);
  } else {
    nVertices_halo_hud = indice;
    verticesUsados_halo_hud = Math.min(
      verticesUsados_halo_hud + 6,
      MAX_VERTICES
    );
    geometria.setDrawRange(0, verticesUsados_halo_hud);
  }

  geometria.computeBoundingBox();
  geometria.computeBoundingSphere();
}

function resetearHaloHUD(esIA)
{
  const geometria = esIA ? geometry_halo_ia_hud : geometry_halo_hud;
  const atributo = geometria.attributes.position;
  atributo.array.fill(0);
  atributo.needsUpdate = true;
  geometria.setDrawRange(0, 0);
  geometria.boundingBox = null;
  geometria.boundingSphere = null;

  if (esIA) {
    nVertices_halo_ia_hud = 0;
    verticesUsados_halo_ia_hud = 0;
  } else {
    nVertices_halo_hud = 0;
    verticesUsados_halo_hud = 0;
  }
}

// FINAL- vacia tanto la parte visible como los limites usados por el
// frustum culling y el raycaster.
function resetearHalo()
{
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  pos.array.fill(0);
  pos.needsUpdate = true;
  uv.array.fill(0);
  uv.needsUpdate = true;

  nVertices = 0;
  verticesUsados = 0;
  u_halo = 0;
  geometry.setDrawRange(0, 0);
  geometry.boundingBox = null;
  geometry.boundingSphere = null;

  ultima_pos_halo.set(0, 0, 0);
  ultima_pos_cycle_halo.set(0, 0, 0);
  pos_halo.set(0, 0, 0);
  haloIniciado = false;
  resetearHaloHUD(false);
}

// FINAL- comienza una animacion corta de vuelco alrededor de la direccion
// en la que avanzaba la moto al chocar.
function iniciarChoque()
{
  eje_choque.copy(velocity).normalize();
  if (eje_choque.lengthSq() === 0)
    eje_choque.set(0, 0, 1);

  resetearHalo();
  tiempo_choque = 0;
  velocidad_vertical = 0;
  en_choque = true;
}

function reincorporarMoto()
{
  pos_cycle.set(0, 0, 0);
  angulo = 0;
  inclinacion_actual = 0;
  velocity.set(0, 0, 1);
  velocidad_vertical = 0;
  en_suelo = true;

  light_cycle.position.copy(pos_cycle);
  light_cycle.rotation.set(0, Math.PI / 2, 0);

  controls.moveLeft = false;
  controls.moveRight = false;

  velocidad_camara.set(0, 0, 0);
  velocidad_mirada_camara.set(0, 0, 0);
  camara_spring_iniciada = false;

  en_choque = false;
}

function actualizarChoque(delta)
{
  tiempo_choque += delta;
  light_cycle.rotateOnWorldAxis(
    eje_choque,
    velocidad_giro_choque * delta
  );

  if (tiempo_choque >= duracion_choque)
    reincorporarMoto();
}

// FINAL- inclina sobre el eje longitudinal local y vuelve suavemente al
// centro cuando se suelta la direccion.
function actualizarInclinacion(delta)
{
  let inclinacion_objetivo = 0;

  if (controls.moveLeft)
    inclinacion_objetivo = inclinacion_maxima;
  else if (controls.moveRight)
    inclinacion_objetivo = -inclinacion_maxima;

  const factor = 1 - Math.exp(-rapidez_inclinacion * delta);
  inclinacion_actual +=
    (inclinacion_objetivo - inclinacion_actual) * factor;

  // Primero orientamos la moto hacia delante y despues aplicamos el balanceo
  // alrededor de su propio eje, no alrededor de un eje fijo de la escena.
  light_cycle.rotation.set(0, angulo + Math.PI / 2, 0);
  light_cycle.rotateX(inclinacion_actual);
}

function agregarVerticeHaloIA(x, y, z, u, v)
{
  const pos = geometry_halo_ia.attributes.position;
  const uv = geometry_halo_ia.attributes.uv;
  pos.setXYZ(nVertices_halo_ia, x, y, z);
  uv.setXY(nVertices_halo_ia, u, v);
  nVertices_halo_ia = (nVertices_halo_ia + 1) % MAX_VERTICES;
  verticesUsados_halo_ia = Math.min(
    verticesUsados_halo_ia + 1,
    MAX_VERTICES
  );
  pos.needsUpdate = true;
  uv.needsUpdate = true;
}

function agregarTramoHaloIA(desde, hasta)
{
  const longitud = desde.distanceTo(hasta);
  const u_desde = u_halo_ia;
  const u_hasta = u_desde + longitud / largo_textura_halo;

  agregarVerticeHaloIA(desde.x, desde.y, desde.z, u_desde, 0);
  agregarVerticeHaloIA(
    desde.x, desde.y + altura_halo, desde.z,
    u_desde, 1
  );
  agregarVerticeHaloIA(hasta.x, hasta.y, hasta.z, u_hasta, 0);

  agregarVerticeHaloIA(hasta.x, hasta.y, hasta.z, u_hasta, 0);
  agregarVerticeHaloIA(
    desde.x, desde.y + altura_halo, desde.z,
    u_desde, 1
  );
  agregarVerticeHaloIA(
    hasta.x, hasta.y + altura_halo, hasta.z,
    u_hasta, 1
  );

  u_halo_ia = u_hasta;

  agregarTramoHaloHUD(desde, hasta, true);

  geometry_halo_ia.setDrawRange(0, verticesUsados_halo_ia);
  geometry_halo_ia.computeBoundingBox();
  geometry_halo_ia.computeBoundingSphere();
}

function resetearHaloIA()
{
  const pos = geometry_halo_ia.attributes.position;
  const uv = geometry_halo_ia.attributes.uv;
  pos.array.fill(0);
  pos.needsUpdate = true;
  uv.array.fill(0);
  uv.needsUpdate = true;

  nVertices_halo_ia = 0;
  verticesUsados_halo_ia = 0;
  u_halo_ia = 0;
  geometry_halo_ia.setDrawRange(0, 0);
  geometry_halo_ia.boundingBox = null;
  geometry_halo_ia.boundingSphere = null;

  ultima_pos_halo_ia.copy(posicion_inicial_ia);
  ultima_pos_cycle_halo_ia.copy(posicion_inicial_ia);
  pos_halo_ia.copy(posicion_inicial_ia);
  halo_ia_iniciado = false;
  resetearHaloHUD(true);
}

function distanciaLibreIA(direccion)
{
  origen_rayo_ia.copy(pos_cycle_ia);
  origen_rayo_ia.y += 0.5;
  raycaster_ia.set(origen_rayo_ia, direccion);

  const impactos = raycaster_ia.intersectObjects(objectsToCheckIA, true);
  return impactos.length > 0 ? impactos[0].distance : Infinity;
}

function reiniciarIA()
{
  resetearHaloIA();
  pos_cycle_ia.copy(posicion_inicial_ia);
  angulo_ia = 0;
  velocity_ia.set(0, 0, 1);
  frames_giro_ia = 0;
  velocidad_vertical_ia = 0;
  en_suelo_ia = true;

  if (moto_ia !== null) {
    moto_ia.position.copy(pos_cycle_ia);
    moto_ia.rotation.set(0, Math.PI / 2, 0);
  }
}

// FINAL- tres sensores sencillos: frente, diagonal izquierda y diagonal
// derecha. Cuando hay peligro, la IA conserva el giro unos cuantos frames
// para no cambiar de decision continuamente.
function actualizarIA(delta)
{
  if (moto_ia === null)
    return;

  velocity_ia.set(Math.sin(angulo_ia), 0, Math.cos(angulo_ia));
  let distancia_frente = distanciaLibreIA(velocity_ia);

  if (frames_giro_ia === 0 && distancia_frente < distancia_deteccion_ia) {
    direccion_izquierda_ia.set(
      Math.sin(angulo_ia + Math.PI / 4),
      0,
      Math.cos(angulo_ia + Math.PI / 4)
    );
    direccion_derecha_ia.set(
      Math.sin(angulo_ia - Math.PI / 4),
      0,
      Math.cos(angulo_ia - Math.PI / 4)
    );

    direccion_giro_ia =
      distanciaLibreIA(direccion_izquierda_ia) >=
      distanciaLibreIA(direccion_derecha_ia) ? 1 : -1;
    frames_giro_ia = 18;
  }

  if (frames_giro_ia > 0) {
    angulo_ia += direccion_giro_ia * giro_ia;
    frames_giro_ia--;
    velocity_ia.set(Math.sin(angulo_ia), 0, Math.cos(angulo_ia));
    distancia_frente = distanciaLibreIA(velocity_ia);
  }

  if (distancia_frente <= velocidad_ia + 0.4) {
    reiniciarIA();
    return;
  }

  if (!halo_ia_iniciado) {
    ultima_pos_halo_ia
      .copy(pos_cycle_ia)
      .addScaledVector(velocity_ia, -distancia_halo);
    ultima_pos_cycle_halo_ia.copy(pos_cycle_ia);
    halo_ia_iniciado = true;
  }

  pos_cycle_ia.addScaledVector(velocity_ia, velocidad_ia);
  actualizarAlturaIA(delta);

  if (pos_cycle_ia.distanceTo(ultima_pos_cycle_halo_ia) >= dl) {
    pos_halo_ia
      .copy(pos_cycle_ia)
      .addScaledVector(velocity_ia, -distancia_halo);
    agregarTramoHaloIA(ultima_pos_halo_ia, pos_halo_ia);
    ultima_pos_halo_ia.copy(pos_halo_ia);
    ultima_pos_cycle_halo_ia.copy(pos_cycle_ia);
  }

  moto_ia.position.copy(pos_cycle_ia);
  moto_ia.rotation.set(0, angulo_ia + Math.PI / 2, 0);
}

function colorearMotoIA(modelo)
{
  modelo.traverse(function(objeto) {
    if (!objeto.isMesh)
      return;

    if (Array.isArray(objeto.material))
      objeto.material = objeto.material.map(function(material) {
        return material.clone();
      });
    else
      objeto.material = objeto.material.clone();

    const materiales = Array.isArray(objeto.material)
      ? objeto.material
      : [objeto.material];

    materiales.forEach(function(material) {
      if (material.name.indexOf('Main_Body') !== -1 && material.color)
        material.color.set(0xff3355);
    });
  });
}

init();
loadScene();
render();

function init()
{
  renderer = new THREE.WebGLRenderer({
    antialias: true,
    stencil: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(new THREE.Color(0x000000));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;
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
  // 1 - Camara adaptada al escenario
  camera.position.set(
    largo_arena / 2 + 10,
    45,
    largo_arena / 2 + 10
  );

  // FINAL- camara cenital ortografica para el HUD.
  cameraTop = new THREE.OrthographicCamera(
    -alcance_hud / 2,
    alcance_hud / 2,
    alcance_hud / 2,
    -alcance_hud / 2,
    1,
    200
  );
  cameraTop.up.set(0, 0, -1);
  cameraTop.layers.enable(1);

  // Escenas auxiliares que escriben la mascara circular y su borde.
  cameraStencil = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  cameraStencil.position.z = 2;

  stencilScene = new THREE.Scene();
  const mascara = new THREE.Mesh(
    new THREE.CircleGeometry(0.94, 64),
    new THREE.MeshBasicMaterial({
      colorWrite: false,
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

  cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
  cameraControls.target.set(0, 4, 0);
  cameraControls.enableKeys = false;

  // 3- movimiento y camara en tercera persona
  // La camara pasa a estar controlada por updateCamera().
  cameraControls.enabled = false;

  // POSTPROCESADO- el pipeline ya funciona con un RenderPass.
  var renderPass = new THREE.RenderPass(scene, camera);
  composer = new THREE.EffectComposer(renderer);
  composer.addPass(renderPass);

  window.addEventListener('resize', updateAspectRatio);
}

// Crea una segunda geometria formada solamente por las aristas visibles del
// mesh. EdgesGeometry analiza los triangulos de cualquier BufferGeometry y
// conserva las uniones cuyo angulo supera 25 grados. LineSegments dibuja el
// resultado sobre el objeto original; al ser su hijo, hereda automaticamente
// su posicion, rotacion y escala. La geometria original no se modifica.
function agregarBordes(mesh, colorBorde)
{
  var geometriaBordes = new THREE.EdgesGeometry(mesh.geometry, 25);
  var materialBordes = new THREE.LineBasicMaterial({
    color: colorBorde
  });
  var bordes = new THREE.LineSegments(geometriaBordes, materialBordes);

  // Los bordes son solamente visuales y no deben alterar los rayos usados
  // para las colisiones.
  bordes.raycast = function() {};
  mesh.add(bordes);
  return bordes;
}

// EJERCICIO TEXTURAS- el cilindro de fondo comienza con chess.png.
function crearSkyboxCilindrico()
{
  var texturaSkybox = new THREE.TextureLoader().load(
    'images/chess.png'
  );
  texturaSkybox.encoding = THREE.sRGBEncoding;

  var geometriaSkybox = new THREE.CylinderGeometry(
    55, 55, 250, 64, 1, true
  );
  var materialSkybox = new THREE.MeshBasicMaterial({
    map: texturaSkybox,
    side: THREE.BackSide,
    depthWrite: false
  });
  var skybox = new THREE.Mesh(geometriaSkybox, materialSkybox);
  skybox.position.y = 125;
  scene.add(skybox);
}

function loadScene()
{
  // 1 - ESCENARIO

  crearSkyboxCilindrico();

  // 5- halo
  scene.add(halo);
  scene.add(halo_ia);
  scene.add(halo_hud);
  scene.add(halo_ia_hud);

  // Suelo: PlaneGeometry se crea en vertical, por eso lo giramos 90 grados.
  var geometriaSuelo = new THREE.PlaneGeometry(
    largo_arena + 50,
    largo_arena + 50
  );

  // EJERCICIO TEXTURAS- reemplazar y configurar esta textura provisional.
  var texturaSuelo = new THREE.TextureLoader().load(
    'images/GridFloor01_DIFF_baseColor.png'
  );
  texturaSuelo.wrapS = THREE.MirroredRepeatWrapping;
  texturaSuelo.wrapT = THREE.MirroredRepeatWrapping;
  texturaSuelo.repeat.set(20, 20);

  texturaSuelo.encoding = THREE.sRGBEncoding;

  var materialSuelo = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texturaSuelo,
    side: THREE.DoubleSide
  });
  var suelo = new THREE.Mesh(geometriaSuelo, materialSuelo);
  suelo.rotation.x = -Math.PI / 2;
  scene.add(suelo);
  suelo.updateMatrixWorld(true);
  objetosSuelo.push(suelo);

  // Pared poligonal: 18 posiciones separadas por 2 PI / 18.
  var paredesArena = new THREE.Group();
  var lucesPared = new THREE.Group();
  var lucesInferiores = new THREE.Group();
  var materialPared = new THREE.MeshBasicMaterial({ color: 0x020a10 });
  var materialParedGrande = new THREE.MeshBasicMaterial({ color: 0x030e15 });
  var materialFoco = new THREE.MeshBasicMaterial({ color: 0xccffff });

  // EJERCICIO TEXTURAS- reemplazar y configurar esta textura provisional.
  var texturaBarrera = new THREE.TextureLoader().load(
    'images/Arena_Wall_Barrier_baseColor.png'
  );
  texturaBarrera.wrapS = THREE.RepeatWrapping;
  texturaBarrera.wrapT = THREE.RepeatWrapping;
  texturaBarrera.encoding = THREE.sRGBEncoding;
  texturaBarrera.repeat.set(50, 1);

  var materialLuzInferior = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texturaBarrera,
    side: THREE.DoubleSide
  });

  var cantidadTramos = 18;
  var pasoAngular = Math.PI * 2 / cantidadTramos;
  var radioPared = largo_arena / 2 - 2;
  var anchoPared = 2 * radioPared * Math.tan(pasoAngular / 2);
  var profundidadPared = 3;
  var anchoParedGrande = anchoPared + 2;
  var profundidadParedGrande = 6;
  var radioParedGrande = radioPared - 3.5;

  function crearGeometriaPared(ancho, alto, profundidad) {
    var recorteEsquina = 0.8;
    var perfil = new THREE.Shape();

    perfil.moveTo(-ancho / 2, 0);
    perfil.lineTo(-ancho / 2, alto - recorteEsquina);
    perfil.lineTo(-ancho / 2 + recorteEsquina, alto);
    perfil.lineTo(ancho / 2 - recorteEsquina, alto);
    perfil.lineTo(ancho / 2, alto - recorteEsquina);
    perfil.lineTo(ancho / 2, 0);
    perfil.closePath();

    var geometria = new THREE.ExtrudeGeometry(perfil, {
      depth: profundidad,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.15,
      bevelSegments: 1
    });
    geometria.center();
    return geometria;
  }

  function crearGeometriaPuerta(ancho, alto, profundidad) {
    var anchoHueco = ancho - 6;
    var altoHueco = 5.5;
    var recorteExterior = 1;
    var recorteInterior = 0.8;
    var perfil = new THREE.Shape();

    // Un solo perfil en U: dos columnas y el dintel dejan libre el paso.
    perfil.moveTo(-ancho / 2, 0);
    perfil.lineTo(-ancho / 2, alto - recorteExterior);
    perfil.lineTo(-ancho / 2 + recorteExterior, alto);
    perfil.lineTo(ancho / 2 - recorteExterior, alto);
    perfil.lineTo(ancho / 2, alto - recorteExterior);
    perfil.lineTo(ancho / 2, 0);
    perfil.lineTo(anchoHueco / 2, 0);
    perfil.lineTo(anchoHueco / 2, altoHueco - recorteInterior);
    perfil.lineTo(anchoHueco / 2 - recorteInterior, altoHueco);
    perfil.lineTo(-anchoHueco / 2 + recorteInterior, altoHueco);
    perfil.lineTo(-anchoHueco / 2, altoHueco - recorteInterior);
    perfil.lineTo(-anchoHueco / 2, 0);
    perfil.closePath();

    var geometria = new THREE.ExtrudeGeometry(perfil, {
      depth: profundidad,
      steps: 1,
      bevelEnabled: true,
      bevelThickness: 0.15,
      bevelSize: 0.15,
      bevelSegments: 1
    });
    geometria.center();
    return geometria;
  }

  var geometriaPared = crearGeometriaPared(
    anchoPared,
    alto_pared,
    profundidadPared
  );
  var geometriaParedGrande = crearGeometriaPared(
    anchoParedGrande,
    alto_pared_grande,
    profundidadParedGrande
  );
  var geometriaFoco = new THREE.BoxGeometry(1.6, 0.5, 0.8);
  var altoLuzInferior = 1.2;
  var geometriaLuzInferior = new THREE.PlaneGeometry(
    anchoPared - 0.5,
    altoLuzInferior
  );

  for (var tramo = 0; tramo < cantidadTramos; tramo++) {
    var anguloPared = pasoAngular / 2 + tramo * pasoAngular;
    var esSuperior = tramo >= 3 && tramo <= 5;
    var esInferior = tramo >= 12 && tramo <= 14;
    var esGrande = esSuperior || esInferior;

    // Este lugar lo ocupa la puerta y no lleva luz inferior.
    if (tramo === 0) {
      continue;
    }

    var radioTramo = esGrande ? radioParedGrande : radioPared;
    var alturaTramo = esGrande ? alto_pared_grande : alto_pared;
    var geometriaTramo = esGrande ? geometriaParedGrande : geometriaPared;
    var materialTramo = esGrande ? materialParedGrande : materialPared;

    var pared = new THREE.Mesh(geometriaTramo, materialTramo);
    pared.position.set(
      Math.cos(anguloPared) * radioTramo,
      alturaTramo / 2,
      Math.sin(anguloPared) * radioTramo
    );
    pared.lookAt(0, alturaTramo / 2, 0);
    agregarBordes(pared, 0xaaffff);
    paredesArena.add(pared);

    // Un quad por tramo, a ras del suelo y por dentro de la pared.
    var profundidadTramo = esGrande
      ? profundidadParedGrande
      : profundidadPared;
    var radioLuzInferior = radioTramo - profundidadTramo / 2 - 0.2;
    var luzInferior = new THREE.Mesh(
      geometriaLuzInferior,
      materialLuzInferior
    );
    luzInferior.position.set(
      Math.cos(anguloPared) * radioLuzInferior,
      altoLuzInferior / 2,
      Math.sin(anguloPared) * radioLuzInferior
    );
    luzInferior.lookAt(0, altoLuzInferior / 2, 0);
    lucesInferiores.add(luzInferior);

    // Solamente los tres bloques superiores y los tres inferiores llevan luz.
    if (esGrande) {
      var radioFoco = radioTramo - profundidadParedGrande / 2 - 0.5;
      var alturaFoco = alto_pared_grande * 0.65;
      var separacionFocos = anchoParedGrande / 5;

      for (var numeroFoco = 0; numeroFoco < 4; numeroFoco++) {
        var foco = new THREE.Mesh(geometriaFoco, materialFoco);
        var desplazamientoFoco = (numeroFoco - 1.5) * separacionFocos;

        foco.position.set(
          Math.cos(anguloPared) * radioFoco
            - Math.sin(anguloPared) * desplazamientoFoco,
          alturaFoco,
          Math.sin(anguloPared) * radioFoco
            + Math.cos(anguloPared) * desplazamientoFoco
        );
        foco.lookAt(0, alturaFoco, 0);
        lucesPared.add(foco);
      }
    }
  }

  // La puerta ocupa un tramo y se construye como una unica pieza extruida.
  var anchoPuerta = anchoPared;
  var altoPuerta = 7.5;
  var profundidadPuerta = 4;
  var geometriaPuerta = crearGeometriaPuerta(
    anchoPuerta,
    altoPuerta,
    profundidadPuerta
  );
  var puerta = new THREE.Mesh(geometriaPuerta, materialParedGrande);
  var anguloPuerta = pasoAngular / 2;
  puerta.position.set(
    Math.cos(anguloPuerta) * radioPared,
    altoPuerta / 2,
    Math.sin(anguloPuerta) * radioPared
  );
  puerta.lookAt(0, altoPuerta / 2, 0);
  agregarBordes(puerta, 0xaaffff);
  paredesArena.add(puerta);

  scene.add(paredesArena);
  scene.add(lucesPared);
  scene.add(lucesInferiores);

  // Limite invisible de la arena. Conservamos el cilindro completo para las
  // colisiones, pero las paredes extruidas siguen siendo la representacion
  // visible. Al no tener ninguna abertura, tambien bloquea la puerta.
  var altoLimiteArena = 20;
  var geometriaLimiteArena = new THREE.CylinderGeometry(
    radioPared,
    radioPared,
    altoLimiteArena,
    64,
    1,
    true
  );
  var materialLimiteArena = new THREE.MeshBasicMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    colorWrite: false
  });
  var limiteArena = new THREE.Mesh(
    geometriaLimiteArena,
    materialLimiteArena
  );
  limiteArena.position.y = altoLimiteArena / 2;
  scene.add(limiteArena);

  // 4- colisiones de ambos jugadores.
  objectsToCheck.push(limiteArena, paredesArena, halo, halo_ia);
  objectsToCheckIA.push(limiteArena, paredesArena, halo, halo_ia);

  // Estructura central programatica de prueba.
  crearEstructuraCentral();
  crearPiezaExtrudida();
  crearPlataformaCentral();
  crearCaminoElevado();
  crearCartelCentral();

  // 2- light cycle
  loadLightCycle();
}

// FINAL- portal central inspirado en las estructuras del escenario de Tron.
function crearEstructuraCentral()
{
  var perfil = new THREE.Shape();

  // Contorno exterior de la viga y del soporte derecho.
  perfil.moveTo(-15, 10.5);
  perfil.lineTo(-12, 12);
  perfil.lineTo(12, 12);
  perfil.lineTo(15, 10.5);
  perfil.lineTo(10, 8.8);
  perfil.lineTo(7, 7.8);
  perfil.lineTo(5.5, 5);
  perfil.lineTo(5.5, 0);

  // El contorno vuelve por el hueco central y el soporte izquierdo.
  perfil.lineTo(3.5, 0);
  perfil.lineTo(3.5, 4);
  perfil.lineTo(5, 6.8);
  perfil.lineTo(6.5, 8.5);
  perfil.lineTo(-6.5, 8.5);
  perfil.lineTo(-5, 6.8);
  perfil.lineTo(-3.5, 4);
  perfil.lineTo(-3.5, 0);
  perfil.lineTo(-5.5, 0);
  perfil.lineTo(-5.5, 5);
  perfil.lineTo(-7, 7.8);
  perfil.lineTo(-10, 8.8);
  perfil.closePath();

  var profundidad = 16;
  var geometria = new THREE.ExtrudeGeometry(perfil, {
    depth: profundidad,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.25,
    bevelSize: 0.25,
    bevelSegments: 2
  });

  var material = new THREE.MeshBasicMaterial({ color: 0x030911 });
  var estructura = new THREE.Mesh(geometria, material);
  estructura.position.z = -profundidad / 2;
  agregarBordes(estructura, 0xaaffff);

  var modeloEstructura = new THREE.Group();
  modeloEstructura.add(estructura);

  // La puerta marca el angulo cero. Las cuatro estructuras quedan fuera de
  // la arena, a 45, 135, 225 y 315 grados.
  var estructurasCentrales = new THREE.Group();
  var radioEstructuras = largo_arena / 2 + 8;

  for (var numeroEstructura = 0; numeroEstructura < 4; numeroEstructura++) {
    var anguloEstructura = Math.PI / 4 + numeroEstructura * Math.PI / 2;
    var copiaEstructura = modeloEstructura.clone(true);

    copiaEstructura.position.set(
      Math.cos(anguloEstructura) * radioEstructuras,
      0,
      Math.sin(anguloEstructura) * radioEstructuras
    );
    copiaEstructura.lookAt(0, 0, 0);
    copiaEstructura.rotateY(Math.PI / 2);
    copiaEstructura.scale.x = 1.2;
    estructurasCentrales.add(copiaEstructura);
  }

  scene.add(estructurasCentrales);
}

// FINAL- pieza de prueba construida a partir de un perfil de siete puntos.
function crearPiezaExtrudida()
{
  var perfil = new THREE.Shape();

  // Los puntos siguen la numeracion del dibujo, comenzando abajo a la
  // izquierda y recorriendo el contorno en sentido antihorario.
  perfil.moveTo(-7, 0);       // 1
  perfil.lineTo(6, 0);        // 2
  perfil.lineTo(9.5, 12);     // 3
  perfil.lineTo(9.2, 15);     // 4
  perfil.lineTo(1, 15);       // 5
  perfil.lineTo(1, 13.5);     // 6
  perfil.lineTo(-7, 7.5);     // 7
  perfil.closePath();

  var profundidad = 5;
  var geometria = new THREE.ExtrudeGeometry(perfil, {
    depth: profundidad,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 1
  });

  // El perfil es asimetrico y la extrusion se genera desde z = 0. Centramos
  // ambos ejes horizontales para que las rotaciones y escalas usen el centro
  // real de la pieza como pivote, sin levantarla del suelo.
  geometria.computeBoundingBox();
  var centroX = (
    geometria.boundingBox.min.x + geometria.boundingBox.max.x
  ) / 2;
  var centroZ = (
    geometria.boundingBox.min.z + geometria.boundingBox.max.z
  ) / 2;
  geometria.translate(-centroX, 0, -centroZ);

  var material = new THREE.MeshBasicMaterial({ color: 0x040b13 });
  var pieza = new THREE.Mesh(geometria, material);
  agregarBordes(pieza, 0xaaffff);

  // Dejamos libre el sector de la puerta (angulo cero) y ocupamos los otros
  // tres puntos cardinales. En cada uno colocamos tres piezas lado a lado.
  var grupoPiezas = new THREE.Group();
  var radioPiezas = largo_arena / 2 + 6;
  var separacionPiezas = 16;

  for (var sector = 1; sector <= 3; sector++) {
    var anguloSector = sector * Math.PI / 2;

    for (var numeroPieza = 0; numeroPieza < 3; numeroPieza++) {
      var desplazamiento = (numeroPieza - 1) * separacionPiezas;
      var copiaPieza = pieza.clone(true);

      copiaPieza.position.set(
        Math.cos(anguloSector) * radioPiezas
          - Math.sin(anguloSector) * desplazamiento,
        0,
        Math.sin(anguloSector) * radioPiezas
          + Math.cos(anguloSector) * desplazamiento
      );
      copiaPieza.lookAt(0, 0, 0);
      copiaPieza.rotateY(Math.PI / 2);
      copiaPieza.scale.z = 2.4;
      grupoPiezas.add(copiaPieza);
    }
  }

  scene.add(grupoPiezas);
}

// FINAL- plataforma central: tronco de piramide construido manualmente.
// Tiene cuatro caras laterales, una tapa superior y queda abierto por abajo.
function crearPlataformaCentral()
{
  var semiladoInferior = (largo_arena / 5) / Math.sqrt(2);
  var semiladoSuperior = (largo_arena / 10) / Math.sqrt(2);
  var alturaPlataforma = 1.5;

  // GEOMETRIA PLATAFORMA- duplicamos los vertices de cada lateral para que
  // las cuatro caras puedan usar independientemente todo el rango UV 0..1.
  function crearGeometriaPlataforma()
  {
    var posiciones = [];
    var uvs = [];
    var grupos = [];
    var abajo = [
      new THREE.Vector3(-semiladoInferior, 0, -semiladoInferior),
      new THREE.Vector3( semiladoInferior, 0, -semiladoInferior),
      new THREE.Vector3( semiladoInferior, 0,  semiladoInferior),
      new THREE.Vector3(-semiladoInferior, 0,  semiladoInferior)
    ];
    var arriba = [
      new THREE.Vector3(-semiladoSuperior, alturaPlataforma, -semiladoSuperior),
      new THREE.Vector3( semiladoSuperior, alturaPlataforma, -semiladoSuperior),
      new THREE.Vector3( semiladoSuperior, alturaPlataforma,  semiladoSuperior),
      new THREE.Vector3(-semiladoSuperior, alturaPlataforma,  semiladoSuperior)
    ];

    function agregarVerticePlataforma(punto, u, v) {
      posiciones.push(punto.x, punto.y, punto.z);
      uvs.push(u, v);
    }

    for (var cara = 0; cara < 4; cara++) {
      var siguiente = (cara + 1) % 4;

      // El centro es un rectangulo perfecto: sus dos triangulos reciben la
      // textura completa sin deformacion trapezoidal.
      var abajoIzquierda = new THREE.Vector3().lerpVectors(
        abajo[cara], abajo[siguiente], 0.25
      );
      var abajoDerecha = new THREE.Vector3().lerpVectors(
        abajo[cara], abajo[siguiente], 0.75
      );
      var inicioTextura = posiciones.length / 3;

      agregarVerticePlataforma(abajoIzquierda,    0, 0);
      agregarVerticePlataforma(abajoDerecha,      1, 0);
      agregarVerticePlataforma(arriba[cara],      0, 1);

      agregarVerticePlataforma(abajoDerecha,      1, 0);
      agregarVerticePlataforma(arriba[siguiente], 1, 1);
      agregarVerticePlataforma(arriba[cara],      0, 1);
      grupos.push({ inicio: inicioTextura, cantidad: 6, material: 0 });

      // Dos triangulos completan las esquinas del trapecio. Sus tres vertices
      // usan UV (0,0), por lo que toman el color base y alfa de ese texel.
      var inicioEsquinas = posiciones.length / 3;
      agregarVerticePlataforma(abajo[cara],      0, 0);
      agregarVerticePlataforma(abajoIzquierda,   0, 0);
      agregarVerticePlataforma(arriba[cara],     0, 0);

      agregarVerticePlataforma(abajoDerecha,     0, 0);
      agregarVerticePlataforma(abajo[siguiente], 0, 0);
      agregarVerticePlataforma(arriba[siguiente],0, 0);
      grupos.push({ inicio: inicioEsquinas, cantidad: 6, material: 0 });
    }

    var inicioTapa = posiciones.length / 3;

    agregarVerticePlataforma(arriba[0], 0, 0);
    agregarVerticePlataforma(arriba[3], 0, 1);
    agregarVerticePlataforma(arriba[1], 1, 0);

    agregarVerticePlataforma(arriba[1], 1, 0);
    agregarVerticePlataforma(arriba[3], 0, 1);
    agregarVerticePlataforma(arriba[2], 1, 1);
    grupos.push({ inicio: inicioTapa, cantidad: 6, material: 1 });

    var geometria = new THREE.BufferGeometry();
    geometria.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(posiciones, 3)
    );
    geometria.setAttribute(
      'uv',
      new THREE.Float32BufferAttribute(uvs, 2)
    );
    geometria.computeVertexNormals();

    grupos.forEach(function(grupo) {
      geometria.addGroup(grupo.inicio, grupo.cantidad, grupo.material);
    });

    return geometria;
  }

  var geometriaPlataforma = crearGeometriaPlataforma();

  // EJERCICIO TEXTURAS- reemplazar esta textura provisional.
  var texturaPlataforma = new THREE.TextureLoader().load(
    'images/chess.png'
  );
  texturaPlataforma.encoding = THREE.sRGBEncoding;

  var materialPlataformaOscuro = new THREE.MeshBasicMaterial({
    color: 0x2a6666,
    side: THREE.DoubleSide
  });
  var materialFlechas = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texturaPlataforma,
    side: THREE.DoubleSide
  });

  var plataforma = new THREE.Mesh(
    geometriaPlataforma,
    [materialFlechas, materialPlataformaOscuro]
  );

  agregarBordes(plataforma, 0xaaffff);
  scene.add(plataforma);

  // El raycaster necesita la matriz definitiva para transformar correctamente
  // la normal inclinada de cada cara al espacio del mundo.
  plataforma.updateMatrixWorld(true);
  objetosSuelo.push(plataforma);
}

// FINAL- camino elevado construido como una cinta de BufferGeometry.
// Sube suavemente, mantiene la altura, recorre media circunferencia y baja
// por el lado opuesto de la arena.
function crearCaminoElevado()
{
  var puntos = [];
  var anchoCamino = 5;
  var alturaCamino = 2;
  var radioInicio = 18;
  var radioFinPendiente = 29;
  var radioCurva = 35;
  var anguloEntrada = -Math.PI / 2;
  var anguloSalida = Math.PI / 2;

  function interpolacionSuave(t) {
    return t * t * (3 - 2 * t);
  }

  function agregarPunto(radio, angulo, altura) {
    puntos.push(new THREE.Vector3(
      Math.cos(angulo) * radio,
      altura,
      Math.sin(angulo) * radio
    ));
  }

  // Rampa de entrada.
  var cantidadPendiente = 24;
  for (var i = 0; i <= cantidadPendiente; i++) {
    var t = i / cantidadPendiente;
    agregarPunto(
      THREE.MathUtils.lerp(radioInicio, radioFinPendiente, t),
      anguloEntrada,
      alturaCamino * interpolacionSuave(t)
    );
  }

  // Tramo recto ya elevado hasta acercarse al limite de la arena.
  var cantidadRecta = 12;
  for (var j = 1; j <= cantidadRecta; j++) {
    var tRecta = j / cantidadRecta;
    agregarPunto(
      THREE.MathUtils.lerp(radioFinPendiente, radioCurva, tRecta),
      anguloEntrada,
      alturaCamino
    );
  }

  // Media circunferencia, algo separada de la pared exterior.
  var cantidadCurva = 80;
  var recorridoCurva = Math.PI;
  for (var k = 1; k <= cantidadCurva; k++) {
    var tCurva = k / cantidadCurva;
    agregarPunto(
      radioCurva,
      anguloEntrada - recorridoCurva * tCurva,
      alturaCamino
    );
  }

  // Recta elevada de salida.
  for (var l = 1; l <= cantidadRecta; l++) {
    var tSalidaRecta = l / cantidadRecta;
    agregarPunto(
      THREE.MathUtils.lerp(radioCurva, radioFinPendiente, tSalidaRecta),
      anguloSalida,
      alturaCamino
    );
  }

  // Rampa de bajada.
  for (var m = 1; m <= cantidadPendiente; m++) {
    var tBajada = m / cantidadPendiente;
    agregarPunto(
      THREE.MathUtils.lerp(radioFinPendiente, radioInicio, tBajada),
      anguloSalida,
      alturaCamino * (1 - interpolacionSuave(tBajada))
    );
  }

  var vertices = [];
  var uvs = [];
  var indices = [];
  var distanciaAcumulada = 0;

  for (var punto = 0; punto < puntos.length; punto++) {
    var anterior = puntos[Math.max(0, punto - 1)];
    var siguiente = puntos[Math.min(puntos.length - 1, punto + 1)];
    var tangenteX = siguiente.x - anterior.x;
    var tangenteZ = siguiente.z - anterior.z;
    var largoTangente = Math.sqrt(
      tangenteX * tangenteX + tangenteZ * tangenteZ
    );
    tangenteX /= largoTangente;
    tangenteZ /= largoTangente;

    var lateralX = -tangenteZ * anchoCamino / 2;
    var lateralZ = tangenteX * anchoCamino / 2;
    var centro = puntos[punto];

    if (punto > 0)
      distanciaAcumulada += centro.distanceTo(puntos[punto - 1]);

    vertices.push(
      centro.x + lateralX, centro.y, centro.z + lateralZ,
      centro.x - lateralX, centro.y, centro.z - lateralZ
    );
    uvs.push(
      0, distanciaAcumulada / anchoCamino,
      1, distanciaAcumulada / anchoCamino
    );
  }

  for (var tramo = 0; tramo < puntos.length - 1; tramo++) {
    var izquierdaActual = tramo * 2;
    var derechaActual = izquierdaActual + 1;
    var izquierdaSiguiente = izquierdaActual + 2;
    var derechaSiguiente = izquierdaActual + 3;

    indices.push(
      izquierdaActual, izquierdaSiguiente, derechaActual,
      derechaActual, izquierdaSiguiente, derechaSiguiente
    );
  }

  var geometriaCamino = new THREE.BufferGeometry();
  geometriaCamino.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );
  geometriaCamino.setAttribute(
    'uv',
    new THREE.Float32BufferAttribute(uvs, 2)
  );
  geometriaCamino.setIndex(indices);
  geometriaCamino.computeVertexNormals();
  geometriaCamino.computeBoundingBox();
  geometriaCamino.computeBoundingSphere();

  var materialCamino = new THREE.MeshBasicMaterial({
    color: 0x7040ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.5,
    depthWrite: false
  });
  var camino = new THREE.Mesh(geometriaCamino, materialCamino);
  agregarBordes(camino, 0xaaffff);
  scene.add(camino);
  camino.updateMatrixWorld(true);
  objetosSuelo.push(camino);
}

// FINAL- soporte circular para el futuro cartel animado. El ultimo parametro
// de CylinderGeometry deja la geometria abierta, sin tapas superior e inferior.
function crearCartelCentral()
{
  var radioCartel = largo_arena / 15;
  var altoCartel = 4;
  var geometriaCartel = new THREE.CylinderGeometry(
    radioCartel,
    radioCartel,
    altoCartel,
    64,
    1,
    true
  );

  // EJERCICIO TEXTURAS- reemplazar y configurar esta textura provisional.
  var texturaCartel = new THREE.TextureLoader().load('images/chess.png');
  texturaCartel.encoding = THREE.sRGBEncoding;

  var materialCartel = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    map: texturaCartel,
    side: THREE.DoubleSide,
    opacity: 1,
    depthWrite: false
  });

  cartel_central = new THREE.Mesh(geometriaCartel, materialCartel);
  cartel_central.position.set(0, 6, 0);
  scene.add(cartel_central);
}

// 2- light cycle
function loadLightCycle()
{
  var loader = new THREE.GLTFLoader();

  loader.load(
    'models/tron/scene.gltf',
    function(gltf) {
      light_cycle = gltf.scene;
      light_cycle.position.copy(pos_cycle);
      light_cycle.scale.set(0.5, 0.5, 0.5); // Ajusta la escala según sea necesario

      moto_ia = gltf.scene.clone(true);
      colorearMotoIA(moto_ia);
      moto_ia.position.copy(pos_cycle_ia);
      moto_ia.rotation.y = Math.PI / 2;
      moto_ia.scale.copy(light_cycle.scale);

      scene.add(light_cycle);
      scene.add(moto_ia);

      // El jugador puede chocar con la moto de IA y la IA puede detectar al
      // jugador. Cada lista excluye la propia moto para evitar autocolision.
      objectsToCheck.push(moto_ia);
      objectsToCheckIA.push(light_cycle);
    },
    undefined,
    function(error) {
      console.error('No se pudo cargar el light cycle', error);
    }
  );
}

function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

// FINAL- integra un resorte amortiguado para cualquier posicion Vector3.
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
  posicion_objetivo_camara
    .copy(light_cycle.position)
    .addScaledVector(velocity, -distancia_camara);

  posicion_objetivo_camara.x -= 2;
  posicion_objetivo_camara.y += altura_camara;
  posicion_objetivo_camara.z -= 2;

  mirada_objetivo_camara.copy(light_cycle.position);
  mirada_objetivo_camara.y += desfase_lookat_y;

  // La primera posicion se inicializa sin recorrer toda la arena desde la
  // camara usada mientras se cargaba el modelo.
  if (!camara_spring_iniciada) {
    camera.position.copy(posicion_objetivo_camara);
    mirada_actual_camara.copy(mirada_objetivo_camara);
    velocidad_camara.set(0, 0, 0);
    velocidad_mirada_camara.set(0, 0, 0);
    camara_spring_iniciada = true;
  } else {
    actualizarResorte(
      camera.position,
      velocidad_camara,
      posicion_objetivo_camara,
      delta
    );
    actualizarResorte(
      mirada_actual_camara,
      velocidad_mirada_camara,
      mirada_objetivo_camara,
      delta
    );
  }

  camera.lookAt(mirada_actual_camara);
}

// DEBUG- alterna entre la camara orbital y la camara en tercera persona.
function cambiarCamara()
{
  camara_orbital = !camara_orbital;
  cameraControls.enabled = camara_orbital;

  if (camara_orbital && light_cycle !== null) {
    cameraControls.target.copy(light_cycle.position);
    cameraControls.update();
  } else if (light_cycle !== null) {
    // Volvemos suavemente desde la posicion orbital, pero descartamos la
    // velocidad anterior del resorte para evitar un tiron.
    velocidad_camara.set(0, 0, 0);
    velocidad_mirada_camara.set(0, 0, 0);
    mirada_actual_camara.copy(cameraControls.target);
    camara_spring_iniciada = true;
  }

  console.log(camara_orbital ? 'Camara orbital' : 'Camara en tercera persona');
}

// PAUSA- al pausar habilitamos OrbitControls; al continuar recuperamos la
// camara en tercera persona. El render sigue activo para poder mover la vista.
function cambiarPausa()
{
  juego_pausado = !juego_pausado;

  if (juego_pausado !== camara_orbital)
    cambiarCamara();

  // Evita conservar una tecla de movimiento pulsada al cambiar de estado.
  controls.moveForward = false;
  controls.moveBackward = false;
  controls.moveLeft = false;
  controls.moveRight = false;
  controls.lookAtDown = false;
  controls.lookAtUp = false;

  console.log(juego_pausado ? 'Juego pausado' : 'Juego reanudado');
}

// 3- movimiento y camara en tercera persona
// En este modo las mismas teclas ajustan los parametros de la camara.
function tunearCamara()
{
  var cambio = false;

  if (controls.moveForward) {
    distancia_camara -= 0.05;
    cambio = true;
  }
  if (controls.moveBackward) {
    distancia_camara += 0.05;
    cambio = true;
  }
  if (controls.moveLeft) {
    altura_camara -= 0.05;
    cambio = true;
  }
  if (controls.moveRight) {
    altura_camara += 0.05;
    cambio = true;
  }
  if (controls.lookAtDown) {
    desfase_lookat_y -= 0.05;
    cambio = true;
  }
  if (controls.lookAtUp) {
    desfase_lookat_y += 0.05;
    cambio = true;
  }

  distancia_camara = Math.max(1, distancia_camara);

  if (cambio) {
    console.log(
      'Camara - distancia:', distancia_camara.toFixed(2),
      'altura:', altura_camara.toFixed(2),
      'lookAt Y:', desfase_lookat_y.toFixed(2)
    );
  }
}

function update()
{
  // Limitamos el delta para evitar saltos bruscos al volver a la pestaña.
  var delta = Math.min(clock.getDelta(), 0.05);

  // PAUSA- solo se actualiza la camara orbital; motos, animaciones y fisica
  // permanecen congeladas hasta volver a pulsar la barra espaciadora.
  if (juego_pausado) {
    cameraControls.update();
    return;
  }

  // CARTEL- rotacion continua alrededor de su eje vertical.
  if (cartel_central !== null)
    cartel_central.rotation.y += 0.5 * delta;

  // 3- movimiento y camara en tercera persona
  // Copiado y pegado del movimiento de update() en js/thirdperson.js.
  // Adaptaciones: p_personaje es light_cycle, se usa pos_cycle y se omite
  // solamente el ajuste de altura que dependia del heightmap.
  if (light_cycle === null)
    return;

  // La IA sigue jugando incluso durante la animacion de choque del jugador.
  actualizarIA(delta);

  // Durante el choque la moto solo vuelca. Al terminar, se reincorpora y la
  // siguiente vuelta del render loop retoma el juego normal.
  if (en_choque) {
    actualizarChoque(delta);

    if (camara_orbital)
      cameraControls.update();
    else
      updateCamera(delta);

    if (mixer !== null) mixer.update(delta);
    return;
  }

  // 3- movimiento y camara en tercera persona
  // Durante el ajuste, las teclas tunean la camara en vez de mover la moto.
  if (modo_tunear_camara) {
    tunearCamara();
  } else {
    if (controls.moveLeft) angulo += 0.05;
    if (controls.moveRight) angulo -= 0.05;
  }

  actualizarInclinacion(delta);

  velocity.set(Math.sin(angulo), 0, Math.cos(angulo));

  if (!modo_tunear_camara) {
    // 4- colisiones
    // Copiado y pegado de update() en js/s3-colisiones.js.
    // Unica adaptacion: p_pos pasa a ser pos_cycle.
    var origenRayo = pos_cycle.clone();
    origenRayo.y += 0.5;

    raycaster.set(origenRayo, velocity);
    var intersects = raycaster.intersectObjects(objectsToCheck, true);

    // La moto avanza siempre a velocidad constante. Al tocar una pared o el
    // halo comienza la animacion de vuelco y luego se reincorpora.
    if (intersects.length > 0 && intersects[0].distance <= controls.speed + 0.5) {
      iniciarChoque();
      return;
    }

    pos_cycle.addScaledVector(velocity, controls.speed);
  }

  // La altura ya no esta fijada en cero: se obtiene con un rayo vertical.
  // Si no hay suelo debajo, la misma cinematica del salto deja caer la moto.
  actualizarAlturaJugador(delta);

  // Inicializamos el halo despues de conocer la altura real del suelo.
  if (!haloIniciado) {
    ultima_pos_halo.copy(pos_cycle).addScaledVector(velocity, -distancia_halo);
    ultima_pos_cycle_halo.copy(pos_cycle);
    haloIniciado = true;
  }

  // 5- halo
  // Medimos el avance con el centro de la moto, pero construimos la pared
  // desde su parte trasera y dejamos una separacion de seguridad.
  if (pos_cycle.distanceTo(ultima_pos_cycle_halo) >= dl) {
    pos_halo.copy(pos_cycle).addScaledVector(velocity, -distancia_halo);
    agregarTramoHalo(ultima_pos_halo, pos_halo);
    ultima_pos_halo.copy(pos_halo);
    ultima_pos_cycle_halo.copy(pos_cycle);
  }

  light_cycle.position.copy(pos_cycle);

  // DEBUG- actualizamos solamente la camara que esta activa.
  if (camara_orbital) {
    cameraControls.update();
  } else {
    updateCamera(delta);
  }

  if (mixer !== null) mixer.update(delta);
}

function updateCameraTop()
{
  // El cartel empieza en y = 8.5; al situarnos por debajo no aparece en HUD.
  cameraTop.position.set(0, 8, 0);
  objetivo_camera_top.set(0, 0, 0);
  cameraTop.lookAt(objetivo_camera_top);
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

function render()
{
  requestAnimationFrame(render);
  update();
  updateCameraTop();

  // Vista principal.
  renderer.autoClear = false;
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000);
  renderer.clear(true, true, true);

  // BLOOM- afecta solo a la vista principal. El HUD se dibuja despues.
  composer.render();

  // HUD circular en la esquina superior derecha.
  const lado = Math.min(window.innerWidth, window.innerHeight) / 3.5;
  const margen = 18;
  const x = window.innerWidth - lado - margen;
  const y = window.innerHeight - lado - margen;

  renderer.setViewport(x, y, lado, lado);
  renderer.setScissor(x, y, lado, lado);
  renderer.setScissorTest(true);

  // Limpiamos profundidad y stencil solo dentro del viewport del HUD.
  const gl = renderer.getContext();
  gl.stencilMask(0xff);
  gl.clearStencil(0);
  renderer.clear(false, true, true);

  // Primero escribimos el circulo en el stencil sin dibujar color.
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
