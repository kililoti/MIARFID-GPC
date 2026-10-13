

// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;

// Crear un Raycaster
const raycaster = new THREE.Raycaster();
var objectsToCheck;

var angulo = -0.01;
var speed = 0.1;
var p_pos = new THREE.Vector3(0,5.5,0);
var player_obj;

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
  near_plane = 1;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , near_plane, 10000 );
  camera.position.set( 50, 30, 30 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  window.addEventListener('resize', updateAspectRatio );
}


function loadScene() {

    // Crear y añadir un plano que actúe como suelo
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshBasicMaterial({color: 0x808080, side: THREE.DoubleSide});
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = Math.PI / 2; // Rotar el plano para que esté horizontal
    scene.add(plane);

    // Dimensiones del área de juego
    const planeSize = 100;
    const wallHeight = 10;
    const wallThickness = 2;

    // Material para los obstáculos (puedes ajustar el material si prefieres algo más visible)
    const wallMaterial = new THREE.MeshNormalMaterial();

    // Crear las paredes que rodean el área de juego

    // Pared frontal
    const frontWallGeometry = new THREE.BoxGeometry(planeSize, wallHeight, wallThickness);
    const frontWall = new THREE.Mesh(frontWallGeometry, wallMaterial);
    frontWall.position.set(0, wallHeight / 2, planeSize / 2); // Centrada en X, en el borde en Z
    scene.add(frontWall);

    // Pared trasera
    const backWallGeometry = new THREE.BoxGeometry(planeSize, wallHeight, wallThickness);
    const backWall = new THREE.Mesh(backWallGeometry, wallMaterial);
    backWall.position.set(0, wallHeight / 2, -planeSize / 2); // Centrada en X, en el borde opuesto en Z
    scene.add(backWall);

    // Pared izquierda
    const leftWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, planeSize);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-planeSize / 2, wallHeight / 2, 0); // Centrada en Z, en el borde en X
    scene.add(leftWall);

    // Pared derecha
    const rightWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, planeSize);
    const rightWall = new THREE.Mesh(rightWallGeometry, wallMaterial);
    rightWall.position.set(planeSize / 2, wallHeight / 2, 0); // Centrada en Z, en el borde opuesto en X
    scene.add(rightWall);

    // Crear un obstáculo adicional en una posición aleatoria (que no sea el centro)
    const obstacleSize = 15;
    const obstacleGeometry = new THREE.BoxGeometry(obstacleSize, wallHeight, obstacleSize);
    const obstacle = new THREE.Mesh(obstacleGeometry, wallMaterial);
    obstacle.position.x = Math.random() * (planeSize - obstacleSize) - (planeSize - obstacleSize) / 2;
    obstacle.position.z = Math.random() * (planeSize - obstacleSize) - (planeSize - obstacleSize) / 2;
    obstacle.position.y = wallHeight / 2;

    // Asegurarse de que no esté en la posición inicial (0, 0)
    if (Math.abs(obstacle.position.x) < 5 && Math.abs(obstacle.position.z) < 5) {
        obstacle.position.x += 10; // Moverlo fuera de la zona central
        obstacle.position.z += 10;
    }

    // Añadir el obstáculo a la escena
    scene.add(obstacle);

    // Creo un box que representa el personaje
    player_obj = new THREE.Mesh(new THREE.SphereGeometry(5,3 ,3), 
            new THREE.MeshBasicMaterial( {color: 0xff0000,wireframe:false }));
    scene.add(player_obj);

    // Obtener una lista de los objetos que no incluyen al jugador
    objectsToCheck = scene.children.filter(obj => obj !== player_obj);    

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

    // Calcular el vector de dirección de vista
    let velocity = new THREE.Vector3(Math.sin(angulo), 0, Math.cos(angulo));

    // Actualizar el ángulo basado en los controles de izquierda y derecha
    if (controls.moveLeft) angulo += 0.05;
    if (controls.moveRight) angulo -= 0.05;


    if (controls.moveForward) {
        // Configurar el rayo desde la posición actual del jugador y en la dirección de movimiento
        raycaster.set(p_pos, velocity);
        // Detectar intersecciones con objetos en la escena (por ejemplo, las paredes)
        const intersects = raycaster.intersectObjects(objectsToCheck, true);

        // Si no hay intersección, permitir el movimiento
        if (intersects.length === 0 || intersects[0].distance > controls.speed+near_plane+0.1) {
        // mueve el personaje
            p_pos.add(velocity.clone().multiplyScalar(controls.speed));
        }
        else{
            let bp = 1;
        }        
    }
    
    // actualizo la pos. del mesh que representa el jugador
    player_obj.position.set(p_pos.x, p_pos.y, p_pos.z);
    player_obj.rotation.y = angulo + Math.PI/2;

  
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

}

/*
// update the picking ray with the camera and pointer position
raycaster.setFromCamera( pointer, camera );

// calculate objects intersecting the picking ray
const intersects = raycaster.intersectObjects( scene.children );

for ( let i = 0; i < intersects.length; i ++ ) {

    intersects[ i ].object.material.color.set( 0xff0000 );

}
    */