

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
  camera.position.set(5, 0.5, 0 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  window.addEventListener('resize', updateAspectRatio );
}


function loadScene()
{

    // Cargar la textura
    const textureLoader = new THREE.TextureLoader();
    const texture_sphere = textureLoader.load('images/wood512.jpg'); 
    
    const texture = textureLoader.load('images/r_256.jpg');
    // Modos de repetición
    texture.wrapS = THREE.RepeatWrapping;  // Coord U
    texture.wrapT = THREE.RepeatWrapping;  // Coord V
    // MirroredRepeatWrapping
    // RepeatWrapping
    // ClampToEdgeWrapping
    texture.repeat.set(20, 20);  // Repetir la textura

  // Filtros de magnificación y minificación
  texture.magFilter = THREE.LinearMipMapLinearFilter;  // Filtrado  para la magnificación
  texture.minFilter = THREE.LinearMipMapLinearFilter;  // Mipmap  para minificación    
  // NearestFilter
  // NearestMipMapNearestFilter
  // NearestMipMapLinearFilter
  // LinearFilter
  // LinearMipMapNearestFilter
  // LinearMipMapLinearFilter

    // Crear un plano de piso
    const planeGeometry = new THREE.PlaneGeometry(10, 10);
    const planeMaterial = new THREE.MeshPhongMaterial({ map: texture });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotar para que quede horizontal
    plane.position.y = -1.0; // Posicionar debajo de los objetos
    scene.add(plane);


    // Crear una esfera con MeshPhongMaterial usando la textura
    const phongMaterial = new THREE.MeshPhongMaterial({ map: texture_sphere });
    const spherePhong = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 32), phongMaterial);
   // scene.add(spherePhong);


  // Cargar las 6 texturas para las diferentes caras del cubo
  const texturePosX = textureLoader.load('images/positive_x.bmp');
  const textureNegX = textureLoader.load('images/negative_x.bmp');
  const texturePosY = textureLoader.load('images/positive_y.bmp');
  const textureNegY = textureLoader.load('images/negative_y.bmp');
  const texturePosZ = textureLoader.load('images/positive_z.bmp');
  const textureNegZ = textureLoader.load('images/negative_z.bmp');

  // Configurar una textura especifica
  texturePosX.wrapS = THREE.MirroredRepeatWrapping;  
  texturePosX.wrapT = THREE.MirroredRepeatWrapping;  
  texturePosX.repeat.set(5, 5); 

  // Crear los materiales para cada cara del cubo
  const materials = [
    new THREE.MeshBasicMaterial({ map: texturePosX }), // Cara positiva en X con espejado
    new THREE.MeshBasicMaterial({ map: textureNegX }), // Cara negativa en X
    new THREE.MeshBasicMaterial({ map: texturePosY }), // Cara positiva en Y
    new THREE.MeshBasicMaterial({ map: textureNegY }), // Cara negativa en Y
    new THREE.MeshBasicMaterial({ map: texturePosZ }), // Cara positiva en Z
    new THREE.MeshBasicMaterial({ map: textureNegZ })  // Cara negativa en Z
  ];

  // Crear la geometría del cubo
  const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
  // Crear el cubo con las 6 texturas asignadas
  const box = new THREE.Mesh(boxGeometry, materials);
  box.position.x = -2;

  // Añadir el cubo a la escena
  scene.add(box);





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