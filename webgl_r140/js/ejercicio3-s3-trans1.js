

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
  camera.position.set( 5, 10, 20 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  window.addEventListener('resize', updateAspectRatio );
}


function loadScene() {
    caja1 = new THREE.Mesh(new THREE.BoxGeometry(5,1,3), new THREE.MeshNormalMaterial());
    scene.add(caja1);

    bisagra = new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,5), new THREE.MeshNormalMaterial())
    bisagra.position.x = 2.5;
    bisagra.position.y = 0.5;
    caja1.add(bisagra)

    caja2 = new THREE.Mesh(new THREE.BoxGeometry(1,5,3), new THREE.MeshNormalMaterial());
    caja2.position.y = 2.5;
    caja2.position.x = 0.5;
    bisagra.add(caja2);

    caja3 = new THREE.Mesh(new THREE.BoxGeometry(5,1,3), new THREE.MeshNormalMaterial());
    caja3.position.y = 3;
    caja3.position.x = 3;
    caja2.add(caja3);



    scene.add( new THREE.AxesHelper(15 ) );

}


function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

var time = 0;
function update()
{
    time += 0.01;
  // Cambios para actualizar la camara segun mvto del raton
  cameraControls.update();
  bisagra.rotation.z = time;
  //caja1.position.x = time;
  //caja2.rotation.z = time;
  
}

function render()
{
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );
}