

// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var cubo;


// interface gui
var controls = {
  escala_x: 1,
  angulo_x: 0,
  color: "#f0f0ff", // valor inicial para el color
  opcion_si_no: false, // valor booleano
  opciones: 'Opción 1' // valor inicial de opciones
};



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

  // interface de usuario
  var gui = new dat.GUI();

  // Carpeta Tamaño
  var gui_size = gui.addFolder('Tamaño');
  gui_size.add(controls, 'escala_x', 1, 5).name("Escala X");
  gui_size.open();

  // Carpeta Orientación
  var gui_rot = gui.addFolder('Orientacion');
  gui_rot.add(controls, 'angulo_x', 0, 360).name("Angulo X");
  gui_rot.open();

  // Carpeta Varios
  var gui_varios = gui.addFolder('Varios');

  // Control de tipo color
  gui_varios.addColor(controls, 'color').name("Color");

  // Control tipo booleano (Sí/No)
  gui_varios.add(controls, 'opcion_si_no').name("Sí o No");

  // Control tipo selector de opciones
  gui_varios.add(controls, 'opciones', ['Opción 1', 'Opción 2', 'Opción 3']).name("Opciones");

  gui_varios.open();


  window.addEventListener('resize', updateAspectRatio );
}


function loadScene()
{
	// Añade el objeto grafico a la escena
    let material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Verde
    cubo = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    scene.add(cubo);
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

  // actualizo segun los controles
  cubo.scale.x = controls.escala_x;
  cubo.rotation.x = controls.angulo_x / 180 * Math.PI;
  cubo.material.color.set(controls.color);  

}

function render()
{
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );
}