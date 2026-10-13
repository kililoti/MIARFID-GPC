

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
    // Crear una esfera
    const geometry = new THREE.SphereGeometry(1, 32, 32);
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.x = -1; // Posicionar el cubo un poco a la izquierda
    scene.add(sphere);

    // Crear un cubo
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.x = 1; // Posicionar el cubo un poco a la derecha
    scene.add(cube);    

    // Crear un plano de piso
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotar para que quede horizontal
    plane.position.y = -1.5; // Posicionar debajo de los objetos
    scene.add(plane);

    // Añadir luz ambiental
    const ambientLight = new THREE.AmbientLight(0x202020); // luz tenue
    //scene.add(ambientLight);

    // Añadir luz direccional
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    //scene.add(directionalLight);    

    // Añadir luz puntual
    const pointLight = new THREE.PointLight(0xffffff, 1, 100); // color, intensidad, distancia
    pointLight.position.set(0, -1, 0); // Posicionar la luz puntual
    //scene.add(pointLight);

    // Añadir luz de foco (spotlight)
    const spotLight = new THREE.SpotLight(0xffffff, 1); // color, intensidad
    spotLight.position.set(0, 5, 0); // Posicionar la luz de foco
    spotLight.target.position.set(-1, 0, 0); // Apuntar hacia el origen (o hacia cualquier objeto)

    // Ajustar las propiedades del cono
    spotLight.angle = Math.PI / 5; // Establecer un ángulo de 30 grados
    spotLight.penumbra = 0.2; // Borde suave en el cono
    spotLight.distance = 150; // Distancia a la que afecta la luz
    spotLight.decay = 2; // Atenuación con la distancia

    scene.add(spotLight);

    // sombras
    // 1- habiltar sombras en el renderizador
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // Usar PCFSoftShadowMap para suavizar las sombras
    // THREE.BasicShadowMap

    // 2- idem en la luz
    spotLight.castShadow = true; //Por cada luz que genera una sombra, la máquina redibuja la escena para generar su shadowmap
    // Configurar el tamaño del mapa de sombras
    spotLight.shadow.mapSize.width = 1024;  // Tamaño del mapa de sombras en ancho
    spotLight.shadow.mapSize.height = 1024; // Tamaño del mapa de sombras en alto
  // Configurar la cámara de sombras (opcional para ajustar el área de sombras)
  spotLight.shadow.camera.near = 0.5;
  spotLight.shadow.camera.far = 50;    

    cube.castShadow = true;  // El cubo proyectará sombras
    cube.receiveShadow = true;  // El cubo también puede recibir sombras
    plane.receiveShadow = true; // El piso recibirá sombras
    sphere.castShadow = true;
    sphere.receiveShadow = true;





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