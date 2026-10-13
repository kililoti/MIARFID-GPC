
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


function loadScene()
{
    let material = new THREE.MeshNormalMaterial();          
        
    // Crear un nodo contenedor para la flecha
    let flecha = new THREE.Object3D();

    // Crear el cuerpo de la flecha (cilindro)
    let geometriaCilindro = new THREE.CylinderGeometry(1, 1, 10, 32); // Radio y altura ajustados
    let cilindro = new THREE.Mesh(geometriaCilindro, material);
    
    scene.add(cilindro);

    cilindro.position.y = 5; // Posicionar el cilindro sobre el origen

    
    cilindro.position.y = 5; // Posicionar el cilindro sobre el origen
    flecha.add(cilindro); // Añadir el cilindro al nodo flecha

    // Crear la punta de la flecha (cono)
    let geometriaCono = new THREE.ConeGeometry(2, 4, 32); // Radio base y altura ajustados
    let cono = new THREE.Mesh(geometriaCono, material);
    cono.position.y = 10; // Posicionar el cono en la parte superior del cilindro
    flecha.add(cono); // Añadir el cono al nodo flecha
  
    // Añadir la flecha a la escena
    scene.add(flecha);

    // Añadir el piso a la escena
    let geometriaPiso = new THREE.PlaneGeometry(10, 10, 10, 10);
    let piso = new THREE.Mesh(geometriaPiso,material);
    piso.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2) ;
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