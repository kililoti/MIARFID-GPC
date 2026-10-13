

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


function loadScene() {
    // Instancia la geometría
    var geometry = new THREE.BufferGeometry();

    // Define los vértices
    var vertices = new Float32Array([
        0,  1.5,  0,   // Vértice superior (pico de la pirámide)
        1,  0,  1,    // Esquina frontal derecha de la base
        1,  0, -1,    // Esquina trasera derecha de la base
        -1, 0, -1,    // Esquina trasera izquierda de la base
        -1, 0,  1     // Esquina frontal izquierda de la base
    ]);

    // Añadir los vértices al objeto de geometría
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    // Define los índices
    var indices = new Uint16Array([
        0, 1, 2,   // Cara frontal
        0, 2, 3,   // Cara derecha
        0, 3, 4,   // Cara trasera
        0, 4, 1,   // Cara izquierda
        1, 4, 3,   // Base (primer triángulo)
        1, 3, 2    // Base (segundo triángulo)
    ]);

    // Añadir los índices a la geometría
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // Array de colores por vértice
    var colors = new Float32Array([
        1, 0, 0,    // Rojo para el pico
        0, 1, 0,    // Verde para la esquina frontal derecha
        0, 0, 1,    // Azul para la esquina trasera derecha
        1, 1, 0,    // Amarillo para la esquina trasera izquierda
        1, 0, 1     // Magenta para la esquina frontal izquierda
    ]);

    // Añadir los colores al objeto de geometría
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Crear el material de la malla que soporta colores por vértice
    var material = new THREE.MeshBasicMaterial({
        vertexColors: true, // Habilitar colores por vértice
        wireframe: false    // Mostrar como sólido, cambiar a true para ver el wireframe
    });

    // ejemplo con normales
    material = new THREE.MeshNormalMaterial();
    // Calcula las normales de los vértices para iluminación correcta
    geometry.computeVertexNormals(); 


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