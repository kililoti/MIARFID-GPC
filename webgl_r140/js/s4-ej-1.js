
// Globales convenidas por threejs
const renderer = new THREE.WebGLRenderer();
let camera;
const scene = new THREE.Scene();
// Control de camara
let cameraControls;

// Monitor de recursos
const reloj = new THREE.Clock();
const stats = new Stats();

// Mundo fisico
let world;
const groundMaterial = new CANNON.Material("groundMaterial");
const sphereMaterial = new CANNON.Material("sphereMaterial");
const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x888888 }); // Color gris para las paredes
const cannonWallMaterial = new CANNON.Material(); // Material de Cannon.js para físicas
// Parámetros comunes para las paredes
const wallThickness = 1;
const wallHeight = 10;
const wallLength = 50; // Asume que la longitud es la misma que la del suelo
var boxBody;

createWorld();
render();



// Función para crear una pared
function createWall(x, y, z, rotationY) {

    // Visual
    const wallGeometry = new THREE.BoxGeometry(wallLength, wallHeight, wallThickness);
    const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
    wallMesh.position.set(x, y, z);
    wallMesh.rotation.y = rotationY;
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    scene.add(wallMesh);

    // Físico
    const wallShape = new CANNON.Box(new CANNON.Vec3(wallLength / 2, wallHeight / 2, wallThickness / 2));
    const wallBody = new CANNON.Body({ mass: 0, material: cannonWallMaterial });
    wallBody.addShape(wallShape);
    wallBody.position.set(x, y, z);
    wallBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), rotationY);
    world.addBody(wallBody);

    // Relación entre físico y visual
    wallMesh.body = wallBody;

    return wallMesh;
}




// Función para crear una esfera
function createSphere(radius, position, mass) {
    // Visual (Three.js)
    const sphereGeometry = new THREE.SphereGeometry(radius, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({ color: Math.random() * 0xffffff }); // Color aleatorio
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.position.copy(position);
    sphereMesh.castShadow = true;
    scene.add(sphereMesh);

    // Física (Cannon.js)
    const sphereShape = new CANNON.Sphere(radius);
    const sphereBody = new CANNON.Body({ mass: mass, material: sphereMaterial });
    sphereBody.addShape(sphereShape);
    sphereBody.position.copy(position);
    world.addBody(sphereBody);

    // Relación física-visual
    sphereMesh.body = sphereBody;

    return sphereMesh;
}


function createWorld()
{
	// Mundo Fisico
  	world = new CANNON.World(); 
   	world.gravity.set(0,-9.8,0); 


    // Suelo
    // visual
	const suelo = new THREE.Mesh( new THREE.PlaneGeometry(50,50,1,1), new THREE.MeshPhongMaterial());
	suelo.rotation.x = -Math.PI/2;
	suelo.position.y = -0.25;
    suelo.receiveShadow = true
	scene.add( suelo);
    // fisico
    // en cannon un plane es un plano infinito
    const groundShape = new CANNON.Plane();
    const ground = new CANNON.Body({ mass: 0, material: groundMaterial });
    ground.addShape(groundShape);
	ground.position.y = -0.25;
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.addBody(ground);
    // relacion entre fisico y visual
    suelo.body = ground;

    // Creación de las paredes
    createWall(0, wallHeight / 2, -wallLength / 2 + wallThickness / 2, 0); // Pared fondo
    createWall(0, wallHeight / 2, wallLength / 2 - wallThickness / 2, 0); // Pared frente
    createWall(-wallLength / 2 + wallThickness / 2, wallHeight / 2, 0, Math.PI / 2); // Pared izquierda
    createWall(wallLength / 2 - wallThickness / 2, wallHeight / 2, 0, Math.PI / 2); // Pared derecha


    // Definir el material y la geometría del box
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2); // Dimensiones del box
    const boxMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 }); // Rojo
    const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
    boxMesh.position.set(0, 1, 0); // Posición inicial
    boxMesh.castShadow = true;
    scene.add(boxMesh);

    // Crear el body para Cannon.js
    const boxShape = new CANNON.Box(new CANNON.Vec3(1, 1, 1)); // La mitad de las dimensiones del box
    boxBody = new CANNON.Body({ mass: 5 }); // Una masa no nula para que pueda moverse
    boxBody.addShape(boxShape);
    boxBody.position.copy(boxMesh.position);
    world.addBody(boxBody);

    // Relacionar el body con el mesh
    boxMesh.body = boxBody;



    // Crear esferas en posiciones aleatorias
    const numSpheres = 50; // Número de esferas a crear
    for (let i = 0; i < numSpheres; i++) {
        const radius = Math.random() * 0.5 + 0.5; // Radio entre 0.5 y 1
        const position = new THREE.Vector3(
            Math.random() * 10 - 5, 
            Math.random() * 5 + 2+ i,  
            Math.random() * 10 - 5  
        );
        const mass = radius * 5; // Masa proporcional al tamaño de la esfera
        createSphere(radius, position, mass);
    }

    // Material de contacto entre esferas (para Cannon.js)
    const sphereSphereContactMaterial = new CANNON.ContactMaterial(
        sphereMaterial,
        sphereMaterial, // Utilizar el mismo material por simplicidad
        {
            friction: 0.1,
            restitution: 0.7
        }
    );
    world.addContactMaterial(sphereSphereContactMaterial);

    // Crear un `ContactMaterial` para definir la interacción entre la esfera y el suelo
    const sphereGroundContactMaterial = new CANNON.ContactMaterial(
        groundMaterial,
        sphereMaterial,
        {
            friction: 0.4,         // Coeficiente de fricción
            restitution: 0.9       // Coeficiente de restitución (elasticidad)
        }
    );
    world.addContactMaterial(sphereGroundContactMaterial);    




    // Inicializar el motor de render
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setClearColor( new THREE.Color(0x000000) );
	document.getElementById( 'container' ).appendChild( renderer.domElement );

	// Reloj
	reloj.start();

	// Crear y situar la camara
	const aspectRatio = window.innerWidth / window.innerHeight;
	camera = new THREE.PerspectiveCamera( 75, aspectRatio , 1, 1500 );
	camera.position.set( 2,5,10 );
	camera.lookAt( new THREE.Vector3( 0,0,0 ) );
    
	// Control de camara
	cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
	cameraControls.target.set(0,0,0);

	// STATS --> stats.update() en update()
	
	stats.showPanel(0);	// FPS inicialmente. Picar para cambiar panel.
	document.getElementById( 'container' ).appendChild( stats.domElement );

	// Callbacks
	window.addEventListener('resize', updateAspectRatio );

	scene.add( new THREE.AxesHelper(5 ) );

    const light1 = new THREE.SpotLight(0xffffff, 0.5)
    light1.position.set(0, 150, 50)
    light1.angle = Math.PI / 4
    light1.penumbra = 0.5
    light1.castShadow = true
    light1.shadow.mapSize.width = 1024
    light1.shadow.mapSize.height = 1024
    light1.shadow.camera.near = 1
    light1.shadow.camera.far = 500
    scene.add(light1)
    
    const light2 = new THREE.SpotLight(0xffffff, 0.5)
    light2.position.set(85,50, 50)
    light2.angle = Math.PI / 4
    light2.penumbra = 0.5
    light2.castShadow = true
    light2.shadow.mapSize.width = 1024
    light2.shadow.mapSize.height = 1024
    light2.shadow.camera.near = 1
    light2.shadow.camera.far = 500
    scene.add(light2)    

    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Opcional, mejora la suavidad de las sombras


}

/**
 * Isotropía frente a redimension del canvas
 */
function updateAspectRatio()
{
	renderer.setSize(window.innerWidth, window.innerHeight);
	camera.aspect = window.innerWidth/window.innerHeight;
	camera.updateProjectionMatrix();
}

/**
 * Actualizacion segun pasa el tiempo
 */
function update()
{
	const segundos = reloj.getDelta();	// tiempo en segundos que ha pasado por si hace falte
	//world.fixedStep()					// recalcula el mundo a periodo fijo (60Hz)
    world.step(segundos);

    // Sincronizar el mesh visual con el cuerpo físico
    // Recorre todos los objetos en la escena
    scene.traverse(function(obj) {
        // Verifica si el objeto tiene una propiedad `body` (CANNON.Body)
        if (obj.body !== undefined) {
            // Sincroniza la posición y rotación del objeto visual con el cuerpo físico
            obj.position.copy(obj.body.position);
            obj.quaternion.copy(obj.body.quaternion);
        }
    });

	// Actualiza el monitor 
	stats.update();
}

function updatePosition(deltaX, deltaY, deltaZ) {
    boxBody.velocity.x += deltaX;
    boxBody.velocity.y += deltaY;
    boxBody.velocity.z += deltaZ;
}

document.addEventListener('keydown', (event) => {
    switch (event.key) {
        case 'ArrowUp':
            updatePosition(0, 0, -1); // Mover hacia adelante
            break;
        case 'ArrowDown':
            updatePosition(0, 0, 1); // Mover hacia atrás
            break;
        case 'ArrowLeft':
            updatePosition(-1, 0, 0); // Mover hacia la izquierda
            break;
        case 'ArrowRight':
            updatePosition(1, 0, 0); // Mover hacia la derecha
            break;
    }
});


/**
 * Update & render
 */
function render()
{
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );
}