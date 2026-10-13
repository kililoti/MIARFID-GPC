
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
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 0.1, 1000 );
  camera.position.set( 40, 25, 5 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  window.addEventListener('resize', updateAspectRatio );
}


function loadScene() {
    let material = new THREE.MeshNormalMaterial(); // Material básico para visualizar las caras
    let escalera = new THREE.Object3D(); // Nodo contenedor para la escalera

    let numEscalones = 10; // Número de escalones de la escalera
    let anchoEscalón = 1, altoEscalón = 0.5, profundidadEscalón = 3; // Tamaños de cada escalón

    for (let i = 0; i < numEscalones; i++) {
        // Crear la geometría de cada escalón (caja)
        let geometriaEscalón = new THREE.BoxGeometry(anchoEscalón, altoEscalón, profundidadEscalón);
        let escalón = new THREE.Mesh(geometriaEscalón, material);

        // Posicionar el escalón en X y en Y para que suba como una escalera
        escalón.position.set(i * (anchoEscalón / 2), i * altoEscalón, 0); 
        
        // Añadir el escalón al nodo escalera
        escalera.add(escalón);
    }

    // Añadir la escalera completa a la escena
    scene.add(escalera);

    // Añadir un piso para referencia
    let geometriaPiso = new THREE.PlaneGeometry(20, 20);
    let piso = new THREE.Mesh(geometriaPiso, material);
    piso.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    scene.add(piso);
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