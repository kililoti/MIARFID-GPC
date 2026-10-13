
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


createWorld();
render();


function createWorld()
{
	// Mundo Fisico
  	world = new CANNON.World(); //Crea el mundo
   	world.gravity.set(0,-9.8,0); //Gravedad


    // Suelo
    // visual
	const suelo = new THREE.Mesh( new THREE.PlaneGeometry(10,10,1,1), new THREE.MeshPhongMaterial());
	suelo.rotation.x = -Math.PI/2;
	suelo.position.y = -0.25;
    suelo.receiveShadow = true
	scene.add( suelo);
    // fisico
    // en cannon un plane es un plano infinito
    const groundShape = new CANNON.Plane();
    const ground = new CANNON.Body({ mass: 0, material: groundMaterial }); //Masa 0 es igual a infinito y no se mueve
    ground.addShape(groundShape);
	ground.position.y = -0.25;
    ground.quaternion.setFromAxisAngle(new CANNON.Vec3(1,0,0),-Math.PI/2);
    world.addBody(ground);
    // relacion entre fisico y visual
    suelo.body = ground;

    // Esfera - Visual (Three.js)
    const sphereMesh = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 32), // Radio 1, con detalles finos
        new THREE.MeshPhongMaterial()
    );
    sphereMesh.position.set(-1, 3, 0); // Posición inicial
    sphereMesh.castShadow = true;
    scene.add(sphereMesh);
    // Esfera - Física (Cannon.js)
    const sphereShape = new CANNON.Sphere(1); // Radio 1
    const sphereBody = new CANNON.Body({ mass: 1, material:sphereMaterial });
    sphereBody.addShape(sphereShape);
    sphereBody.position.copy(sphereMesh.position); // Sincronizar posición inicial
    world.addBody(sphereBody);
    // Relación física-visual
    sphereMesh.body = sphereBody;

    // Crear un `ContactMaterial` para definir la interacción entre la esfera y el suelo
    // Cuando chocan esos dos tipos de materiales, se les aplica esos parámetros
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
	camera = new THREE.PerspectiveCamera( 75, aspectRatio , 0.1, 100 );
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
    light1.position.set(0, 10, 5)
    light1.angle = Math.PI / 4
    light1.penumbra = 0.5
    light1.castShadow = true
    light1.shadow.mapSize.width = 1024
    light1.shadow.mapSize.height = 1024
    light1.shadow.camera.near = 0.5
    light1.shadow.camera.far = 20
    scene.add(light1)
    
    const light2 = new THREE.SpotLight(0xffffff, 0.5)
    light2.position.set(-2.5, 5, 5)
    light2.angle = Math.PI / 4
    light2.penumbra = 0.5
    light2.castShadow = true
    light2.shadow.mapSize.width = 1024
    light2.shadow.mapSize.height = 1024
    light2.shadow.camera.near = 0.5
    light2.shadow.camera.far = 20
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

/**
 * Update & render
 */
function render()
{
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );
}