

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
    // Crear una esfera con MeshBasicMaterial
    const basicMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const sphereBasic = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), basicMaterial);
    sphereBasic.position.x = -2; // Posicionar la esfera a la izquierda
    scene.add(sphereBasic);

    // Crear una esfera con MeshLambertMaterial
    const lambertMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const sphereLambert = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), lambertMaterial);
    sphereLambert.position.x = 0; // Posicionar la esfera en el centro
    scene.add(sphereLambert);

    // Crear una esfera con MeshPhongMaterial
    const phongMaterial = new THREE.MeshPhongMaterial({ color: 0x00ff00 });
    const spherePhong = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), phongMaterial);
    spherePhong.position.x = 2; // Posicionar la esfera a la derecha
    scene.add(spherePhong);

    // Añadir luz ambiental
    const ambientLight = new THREE.AmbientLight(0x101010); // luz tenue
    scene.add(ambientLight);


    // Añadir luz puntual
    const pointLight = new THREE.PointLight(0xffffff, 1, 100); // color, intensidad, distancia
    pointLight.position.set(0, 5, 0); // Posicionar la luz puntual
    scene.add(pointLight);

    
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