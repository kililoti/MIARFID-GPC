

// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;

// 1-inicializa 
init();
// 2-Crea una escena
loadScene();
// 3-renderiza
render();

function init()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 0.1, 100 );
  camera.position.set( 1, 1.5, 2 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  window.addEventListener('resize', updateAspectRatio );
}


function loadScene()
{
  // Instancia la geometría
  var geometry = new THREE.BufferGeometry();

  // Define los vértices 
  var vertices = new Float32Array([
      // Cara 1
      0,  1.5,  0,  // Vértice superior (pico de la pirámide)
      1,  0,  1,    // Esquina 1 de la base
      1,  0, -1,    // Esquina 2 de la base
      // Cara 2
      0,  1.5,  0,
      1,  0, -1,
      -1,  0, -1,
      // Cara 3
      0,  1.5,  0,
      -1,  0, -1,
      -1,  0,  1,
      // Cara 4
      0,  1.5,  0,
      -1,  0,  1,
      1,  0,  1,
      // Base 1
      1,  0,  1,
      -1,  0,  1,
      -1,  0, -1,
      // Base 2
      1,  0,  1,
      -1,  0, -1,
      1,  0, -1
  ]);

  // Añadir los vértices al objeto de geometría
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

  // No necesitamos definir los índices en este caso porque cada grupo de 3 vértices forma una cara

  // Array de colores por cara, repetido para cada vértice
  var colors = new Float32Array([
      // Cara 1
      1, 0, 0,  // rojo
      1, 0, 0,  // rojo
      1, 0, 0,  // rojo
      // Cara 2
      0, 1, 0,  // verde
      0, 1, 0,  // verde
      0, 1, 0,  // verde
      // Cara 3
      0, 0, 1,  // azul
      0, 0, 1,  // azul
      0, 0, 1,  // azul
      // Cara 4
      1, 1, 0,  // amarillo
      1, 1, 0,  // amarillo
      1, 1, 0,  // amarillo
      // Base 1
      0, 1, 1,  // cian
      0, 1, 1,  // cian
      0, 1, 1,  // cian
      // Base 2
      0, 1, 1,  // cian
      0, 1, 1,  // cian
      0, 1, 1   // cian
  ]);

  // Añadir los colores al objeto de geometría
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  // Crear el material de la malla que soporta colores por vértice
  var material = new THREE.MeshBasicMaterial({
      vertexColors: true // Habilitar colores por vértice
  });

  /* ejemplo con normales
    material = new THREE.MeshNormalMaterial();
    // Calcula las normales de los vértices para iluminación correcta
    geometry.computeVertexNormals(); 
    */


  // Crear el objeto malla
  var malla = new THREE.Mesh(geometry, material);
  scene.add(malla);

    // Crear el helper de ejes
    var axesHelper = new THREE.AxesHelper(0.5); // El parámetro es el tamaño de los ejes
    scene.add(axesHelper);

}


function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

function update()
{
  // Cambios para actualizar la camara segun mvto del raton
  cameraControls.update();
}

function render()
{
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );
}