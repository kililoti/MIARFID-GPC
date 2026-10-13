

// Variables globales que van siempre
var renderer, scene, camera;
var angulo = -0.01;
var cameraTop;

var angulo = -0.01;
var speed = 0.1;
var p_pos = new THREE.Vector3(0,3,0);

const controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    speed: 0.35
};

// Event listeners para controles
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
        case 'KeyF':
            first_person = !first_person;
            break;
    }
});



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
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 10000 );
  camera.position.set( 50, 30, 30 );

  // vista de planta
  cameraTop = new THREE.OrthographicCamera( -50, 50, 50,-50, 1, 1000 );
  cameraTop.position.set(0,500,0);
  cameraTop.lookAt( 0, 0, 0 );
  cameraTop.up.set( 0, 0, 1 );
  cameraTop.updateProjectionMatrix();  


  window.addEventListener('resize', updateAspectRatio );
}


function loadScene() {
    // Añadir un ayudante de ejes para visualizar el espacio 3D
    scene.add(new THREE.AxesHelper(15));

    // Crear y añadir un plano que actúe como suelo
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshBasicMaterial({color: 0x808080, side: THREE.DoubleSide});
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = Math.PI / 2; // Rotar el plano para que esté horizontal
    scene.add(plane);

    // Generar y añadir cubos como edificios
    for (let i = 0; i < 100; i++) {
        // Dimensiones aleatorias para los edificios
        const width = 3+ Math.random() * 5;
        const depth = 3+ Math.random() * 5;
        const height = Math.random() * 15 + 5; // Altura entre 5 y 20

        // Geometría y material para los edificios
        const boxGeometry = new THREE.BoxGeometry(width, height, depth);
        const boxMaterial = new THREE.MeshNormalMaterial();

        // Crear el mesh del edificio y posicionarlo
        const box = new THREE.Mesh(boxGeometry, boxMaterial);
        box.position.x = Math.random() * 100 - 50; // Posición aleatoria en X dentro del plano
        box.position.z = Math.random() * 100 - 50; // Posición aleatoria en Z dentro del plano
        box.position.y = height / 2; // Ajustar la posición en Y para que la base esté sobre el suelo

        // Añadir el edificio a la escena
        scene.add(box);
    }

    player_obj = new THREE.Mesh(new THREE.SphereGeometry(7, 3, 3), new THREE.MeshBasicMaterial());
    scene.add(player_obj);
    player_obj.visible = false;
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

    // Calcular el vector de dirección de vista
    let velocity = new THREE.Vector3(Math.sin(angulo), 0, Math.cos(angulo));

    // Actualizar el ángulo basado en los controles de izquierda y derecha
    if (controls.moveLeft) angulo += 0.05;
    if (controls.moveRight) angulo -= 0.05;

    // mueve el personaje
    if (controls.moveForward) {
        p_pos.add(velocity.clone().multiplyScalar(controls.speed));
    }

    // camara en primera persona
    camera.position.set(p_pos.x, p_pos.y, p_pos.z);
    // y mirando hacia adelante
    camera.lookAt(new THREE.Vector3().addVectors(p_pos, velocity.multiplyScalar(25)));
  
}

function render()
{
	requestAnimationFrame( render );
	update();

    // vista 3d perspectiva
    renderer.autoClear = false;
    renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
	renderer.setClearColor( new THREE.Color(0xa2a2f2) );
	renderer.clear();
	renderer.render( scene, camera );

    // vista de arriba
    var ds = Math.min(window.innerHeight , window.innerWidth)/4;
    renderer.setViewport(0,0,ds,ds);
	renderer.setScissor (0, 0, ds, ds);
	renderer.setScissorTest (true);
	renderer.setClearColor( new THREE.Color(0xaffff) );
	renderer.clear();	
	renderer.setScissorTest (false);
    renderer.render(scene, cameraTop);




}