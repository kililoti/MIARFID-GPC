

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

    // Crear el loader para el cubemap
    // OJO QUE HAY DIFERENCIAS DE CONVENCION CON EL QUAKE, y por eso hay que ir probando el orden y quizar girar manualmente 
    // con el paint alguna imagen
    const cubeTextureLoader = new THREE.CubeTextureLoader();
    cubemap = cubeTextureLoader.load([
        'images/quake/SkyBox1/phobos_lf.jpg', 
        'images/quake/SkyBox1/phobos_rt.jpg', 
        'images/quake/SkyBox1/phobos_up.jpg', 
        'images/quake/SkyBox1/phobos_dn.jpg', 
        'images/quake/SkyBox1/phobos_ft.jpg',  
        'images/quake/SkyBox1/phobos_bk.jpg' 
    ], 
        function (texture) {
            console.log('Cubemap cargado correctamente.');
        }, 
        undefined, 
        function (error) {
            console.error('Error al cargar el cubemap', error);
        }
    );
    
    // Crear un skybox: un gran cubo invertido
    // Cargar las seis texturas individualmente para el skybox
    const textureLoader = new THREE.TextureLoader();    
    const materials = [
        new THREE.MeshBasicMaterial({ map: textureLoader.load('images/quake/SkyBox1/phobos_lf.jpg'), side: THREE.BackSide }), 
        new THREE.MeshBasicMaterial({ map: textureLoader.load('images/quake/SkyBox1/phobos_rt.jpg'), side: THREE.BackSide }), 
        new THREE.MeshBasicMaterial({ map: textureLoader.load('images/quake/SkyBox1/phobos_up.jpg'), side: THREE.BackSide }), 
        new THREE.MeshBasicMaterial({ map: textureLoader.load('images/quake/SkyBox1/phobos_dn.jpg'), side: THREE.BackSide }), 
        new THREE.MeshBasicMaterial({ map: textureLoader.load('images/quake/SkyBox1/phobos_ft.jpg'), side: THREE.BackSide }), 
        new THREE.MeshBasicMaterial({ map: textureLoader.load('images/quake/SkyBox1/phobos_bk.jpg'), side: THREE.BackSide })  
    ];


    const skyboxGeometry = new THREE.BoxGeometry(100, 100, 100); // Un cubo grande
    const skybox = new THREE.Mesh(skyboxGeometry, materials);

    scene.add(skybox);

    // Crear una esfera con un material reflectante
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const reflectiveMaterial = new THREE.MeshPhongMaterial({
        envMap: cubemap // Usar el cubemap como entorno reflectante
    });
    const sphere = new THREE.Mesh(sphereGeometry, reflectiveMaterial);
    sphere.position.x = 0; // Posicionar la esfera
    scene.add(sphere);

    // Añadir luz ambiental
    const ambientLight = new THREE.AmbientLight(0x505050); // luz tenue
    scene.add(ambientLight);
    

    // Añadir luz direccional
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Añadir luz de foco (spotlight)
    const spotLight = new THREE.SpotLight(0xffffff, 1);
    spotLight.position.set(5, 5, 5);
    spotLight.target.position.set(0, 0, 0);
    spotLight.angle = Math.PI / 6;
    spotLight.penumbra = 0.2;
    spotLight.distance = 15;
    spotLight.decay = 2;
    scene.add(spotLight);
    scene.add(spotLight.target);
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