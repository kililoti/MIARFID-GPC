// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;

var speed = 0.5;
var robot, base, brazo, antebrazo, mano;
var material;

var animando = false;
var tiempoAnimacion = 0;
var velocidadAnimacion = 0.1;

// interface gui
var interfaz = {
  giro_base: 0,
  giro_brazo: 0,
  giro_antebrazo_y: 0,
  giro_antebrazo_z: 0,
  giro_pinza: 0,
  separacion_pinza: 7.5,
  alambres: false,
  animacion : function () {
    animando = !animando;
    tiempoAnimacion = 0;
 }
};

var sliderGiroBase, sliderGiroBrazo;
var sliderAntebrazoY, sliderAntebrazoZ;
var sliderPinza, sliderSeparacion;

const controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    speed: 1.0
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
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 0.1, 10000 );
  camera.position.set( 400, 400, -300);

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

   // vista de planta
  cameraTop = new THREE.OrthographicCamera( -100, 100, 100,-100, 1, 1000 );
  cameraTop.position.set(0,500,0);
  cameraTop.lookAt( 0, 0, 0 );
  cameraTop.up.set( 0, 0, 1 ); // Debido a que la camara mira hacia abajo, el up tiene que se otro eje que no sea y
  cameraTop.updateProjectionMatrix();  

  // interface de usuario
  var gui = new dat.GUI();

  // Carpeta Tamaño
  var gui_control_robot = gui.addFolder('Control Robot');
  sliderGiroBase = gui_control_robot.add(interfaz, 'giro_base', -180, 180).name("Giro Base");
  sliderGiroBrazo = gui_control_robot.add(interfaz, 'giro_brazo', -45, 45).name("Giro Brazo");
  sliderAntebrazoY = gui_control_robot.add(interfaz, 'giro_antebrazo_y', -180, 180).name("Giro Antebrazo Y");
  sliderAntebrazoZ = gui_control_robot.add(interfaz, 'giro_antebrazo_z', -90, 90).name("Giro Antebrazo Z");
  sliderPinza = gui_control_robot.add(interfaz, 'giro_pinza', -40, 220).name("Giro Pinza");
  sliderSeparacion = gui_control_robot.add(interfaz, 'separacion_pinza', 0, 15).name("Separación Pinza");
  gui_control_robot.add(interfaz, 'alambres').name("Alambres");
  gui_control_robot.add(interfaz, 'animacion').name("Animación");
  gui_control_robot.open();

  window.addEventListener('resize', updateAspectRatio );
}


function loadScene()
{
    const textureLoader = new THREE.TextureLoader();
    
    material = new THREE.MeshNormalMaterial();      

    const textura_metal = textureLoader.load('images/metal_128.jpg');
    material_metal_lambert = new THREE.MeshLambertMaterial({map: textura_metal}); 
    material_metal_phong = new THREE.MeshPhongMaterial({map: textura_metal, color: 0xf5be27, shininess: 5000, reflectivity: 10000});
    material_pinzas = new THREE.MeshPhongMaterial({map: textura_metal, color: 0x000000, shininess: 5000, reflectivity: 10000});

    const cubeTextureLoader = new THREE.CubeTextureLoader();
    const textura_rotula = cubeTextureLoader.load([
        'images/posx.jpg', // Derecha (+X)
        'images/negx.jpg', // Izquierda (-X)
        'images/posy.jpg', // Arriba (+Y)
        'images/negy.jpg', // Abajo (-Y)
        'images/posz.jpg', // Delante (+Z)
        'images/negz.jpg'  // Detrás (-Z)
    ]);
    material_rotula = new THREE.MeshPhongMaterial({envMap: textura_rotula});

    //let material_toon = new THREE.MeshToonMaterial({color: 0xffff00});
    
    // Nodos contenedores
    robot = new THREE.Object3D();
    base = new THREE.Object3D();
    brazo = new THREE.Object3D();
    antebrazo = new THREE.Object3D();
    mano = new THREE.Object3D();

    robot.add(base);
    base.add(brazo);
    brazo.add(antebrazo);
    antebrazo.add(mano);

    // Base
    let geo_base = new THREE.CylinderGeometry(50, 50, 15, 32); // Radio y altura ajustados
    let modelo_base = new THREE.Mesh(geo_base,  material_metal_lambert);
    
    base.add(modelo_base);
    base.position.y += 10;

    let geo_eje = new THREE.CylinderGeometry(20, 20, 18, 32);
    let modelo_eje = new THREE.Mesh(geo_eje, material_metal_lambert);

    modelo_eje.rotation.z = Math.PI / 2;
    brazo.add(modelo_eje);
    brazo.position.y += 0;
  

    let geo_esparrago = new THREE.BoxGeometry(18, 120, 12);
    let modelo_esparrago = new THREE.Mesh(geo_esparrago, material_metal_lambert);

    modelo_esparrago.position.y +=60;
    brazo.add(modelo_esparrago);

    let geo_rotula = new THREE.SphereGeometry(20);
    let modelo_rotula = new THREE.Mesh(geo_rotula, material_rotula);

    modelo_rotula.position.y += 120;
    modelo_rotula.rotation.z = Math.PI /2;
    brazo.add(modelo_rotula);
  
    let geo_disco = new THREE.CylinderGeometry(22, 22, 6, 32);
    let modelo_disco = new THREE.Mesh(geo_disco, material_metal_phong);

    antebrazo.add(modelo_disco);
    antebrazo.position.y += 120;

    let geo_nervio = new THREE.BoxGeometry(4, 80, 4);
    let modelo_nervio = new THREE.Mesh(geo_nervio, material_metal_phong);
    let modelo_nervio2 = new THREE.Mesh(geo_nervio, material_metal_phong);
    let modelo_nervio3 = new THREE.Mesh(geo_nervio, material_metal_phong);
    let modelo_nervio4 = new THREE.Mesh(geo_nervio, material_metal_phong);

    modelo_nervio.position.x += 10;
    modelo_nervio.position.z += 10;
    modelo_nervio.position.y += 40;
    antebrazo.add(modelo_nervio);

    modelo_nervio2.position.x -= 10;
    modelo_nervio2.position.z -= 10;
    modelo_nervio2.position.y += 40;
    antebrazo.add(modelo_nervio2);

    modelo_nervio3.position.x -= 10;
    modelo_nervio3.position.z += 10;
    modelo_nervio3.position.y += 40;
    antebrazo.add(modelo_nervio3);

    modelo_nervio4.position.x += 10;
    modelo_nervio4.position.z -= 10;
    modelo_nervio4.position.y += 40;
    antebrazo.add(modelo_nervio4);


    let geo_mano = new THREE.CylinderGeometry(15, 15, 40, 32);
    let modelo_mano = new THREE.Mesh(geo_mano, material_metal_phong);

    modelo_mano.position.y += 80;
    modelo_mano.rotation.z = Math.PI /2;
    antebrazo.add(modelo_mano);


    var geometry = new THREE.BufferGeometry();

    var vertices = new Float32Array([
        0,  20,  0, //Cara 1
        0,  0,   0,
        19, 0,   0,
        19, 20,  0,
        
        0,  20,  -4, //Cara 2
        0,  0,   -4,
        19, 0,   -4,
        19, 20,  -4,

        38, 5, -2, //Cara punta 1
        38, 15, -2,

        38, 5, -4, //Cara punta 2
        38, 15, -4

    ]);

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(vertices, 3)
    );

    var indices = new Uint16Array([
        0, 1, 2, //Cara 1
        0, 2, 3,

        4, 6, 5, //Cara 2
        4, 7, 6,

        0, 5, 1, //Tapa trasera
        0, 4, 5,
        
        1, 5, 2, //Tapa inferior
        5, 6, 2,

        4, 0, 3, //Tapa superior
        4, 3, 7,

        3, 2, 9, //Cara punta 1
        9, 2, 8,

        7, 11, 6, //Cara punta 2
        11, 10, 6,

        11, 9, 8, //Tapa punta exterior
        11, 8, 10,

        6, 8, 2, //Tapa punta inferior
        6, 10, 8,

        7, 3, 9, //Tapa punta superior
        7, 9, 11       
    ]);

    geometry.setIndex(
        new THREE.BufferAttribute(indices, 1)
    );

    geometry.computeVertexNormals();

    var malla = new THREE.Mesh(
        geometry,
        material_pinzas
    );

    var malla2 = new THREE.Mesh(geometry, material_pinzas);

    malla.rotation.y = Math.PI / 2;
    malla.position.x += 12;
    mano.add(malla);

    malla2.rotation.y = Math.PI / 2;
    malla2.position.x -= 8;
    mano.add(malla2);

    // Crear el helper de ejes
    var axesHelper = new THREE.AxesHelper(0.5); // El parámetro es el tamaño de los ejes
    mano.add(axesHelper);

    mano.position.y += 72.5;

    scene.add(robot);

    // Añadir el piso a la escena
    const texture_piso = textureLoader.load('images/pisometalico_1024.jpg');
    texture_piso.wrapS = THREE.MirroredRepeatWrapping;  // Coord U
    texture_piso.wrapT = THREE.MirroredRepeatWrapping;  // Coord V
    // MirroredRepeatWrapping
    // RepeatWrapping
    // ClampToEdgeWrapping
    texture_piso.repeat.set(5, 5);  // Repetir la textura

    // Filtros de magnificación y minificación
    texture_piso.magFilter = THREE.LinearMipMapLinearFilter;  // Filtrado  para la magnificación
    texture_piso.minFilter = THREE.LinearMipMapLinearFilter;

    let material_phong = new THREE.MeshPhongMaterial({map: texture_piso});
    let geo_Piso = new THREE.PlaneGeometry(1000, 1000, 10, 10);
    let modelo_piso = new THREE.Mesh(geo_Piso, material_phong);
    modelo_piso.rotateOnAxis(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
    scene.add(modelo_piso);

    // Un CubeTexture no se proyecta directamente sobre las caras de un BoxGeometry mediante
    // envMap como si fuera una textura convencional, envMap se utiliza para reflejos. 
    // Para pintar cada pared del cubo con su imagen correspondiente,
    // lo más sencillo es usar seis materiales con map.
    const materiales_habitacion = [
        new THREE.MeshBasicMaterial({
            map: textureLoader.load('images/posx.jpg'),
            side: THREE.BackSide
        }),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load('images/negx.jpg'),
            side: THREE.BackSide
        }),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load('images/posy.jpg'),
            side: THREE.BackSide
        }),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load('images/negy.jpg'),
            side: THREE.BackSide
        }),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load('images/posz.jpg'),
            side: THREE.BackSide
        }),
        new THREE.MeshBasicMaterial({
            map: textureLoader.load('images/negz.jpg'),
            side: THREE.BackSide
        })
    ];
    let habitacion = new THREE.BoxGeometry(1000, 1000, 1000);
    let modelo_habitacion = new THREE.Mesh(habitacion, materiales_habitacion);
    scene.add(modelo_habitacion);

    // Luces
    const luzAmbiental = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(luzAmbiental);

    const luzDireccional = new THREE.DirectionalLight(0xffffff, 1);
    luzDireccional.position.set(100, 100, 100);
    scene.add(luzDireccional);

    const luzFocal = new THREE.SpotLight(0xffffff, 0.5);

    luzFocal.position.set(300, 400, 200);
    luzFocal.target.position.set(-1, 0, 0);

    luzFocal.angle = Math.PI / 3;
    luzFocal.penumbra = 0.3;
    luzFocal.distance = 5000; // 0 = Sin límite de distancia
    luzFocal.decay = 2;

    scene.add(luzFocal);

    const luzFocal2 = new THREE.SpotLight(0xffffff, 0.5);

    luzFocal2.position.set(0, 400, -200);
    luzFocal2.target.position.set(0, -20, 0);

    luzFocal2.angle = Math.PI / 3;
    luzFocal2.penumbra = 0.3;
    luzFocal2.distance = 5000; // 0 = Sin límite de distancia
    luzFocal2.decay = 2;

    scene.add(luzFocal2);

    // sombras
    // 1- habiltar sombras en el renderizador
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // Usar PCFSoftShadowMap para suavizar las sombras

    // 2- idem en la luz
    luzFocal.castShadow = true; //Por cada luz que genera una sombra, la máquina redibuja la escena para generar su shadowmap
    // Configurar el tamaño del mapa de sombras
    luzFocal.shadow.mapSize.width = 1024;  // Tamaño del mapa de sombras en ancho
    luzFocal.shadow.mapSize.height = 1024; // Tamaño del mapa de sombras en alto
    // Configurar la cámara de sombras (opcional para ajustar el área de sombras)
    luzFocal.shadow.camera.near = 0.5;
    luzFocal.shadow.camera.far = 1000;

    luzFocal2.castShadow = true;
    luzFocal2.shadow.mapSize.width = 1024;
    luzFocal2.shadow.mapSize.height = 1024;
    luzFocal2.shadow.camera.near = 0.5;
    luzFocal2.shadow.camera.far = 1000;

    //Sombras para los objetos
    modelo_piso.receiveShadow = true;
    modelo_base.castShadow = true;
    modelo_base.receiveShadow = true;
    modelo_eje.castShadow = true;
    modelo_eje.receiveShadow = true;
    modelo_esparrago.castShadow = true;
    modelo_esparrago.receiveShadow = true;
    modelo_rotula.castShadow = true;
    modelo_rotula.receiveShadow = true;
    modelo_disco.castShadow = true;
    modelo_disco.receiveShadow = true;
    modelo_nervio.castShadow = true;
    modelo_nervio.receiveShadow = true;
    modelo_nervio2.castShadow = true;
    modelo_nervio2.receiveShadow = true;
    modelo_nervio3.castShadow = true;
    modelo_nervio3.receiveShadow = true;
    modelo_nervio4.castShadow = true;
    modelo_nervio4.receiveShadow = true;
    modelo_mano.castShadow = true;
    modelo_mano.receiveShadow = true;
    malla.castShadow = true;
    malla.receiveShadow = true;
    malla2.castShadow = true;
    malla2.receiveShadow = true;
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

    if (controls.moveForward){
        base.position.z -= controls.speed;
    };
    if (controls.moveBackward){
        base.position.z += controls.speed;
    }
    if (controls.moveLeft){
        base.position.x -= controls.speed;
    }
    if (controls.moveRight){
        base.position.x += controls.speed;
    }

    base.rotation.y = interfaz.giro_base * Math.PI / 180;
    brazo.rotation.x = interfaz.giro_brazo * Math.PI / 180;
    antebrazo.rotation.y = interfaz.giro_antebrazo_y * Math.PI / 180;
    antebrazo.rotation.x = interfaz.giro_antebrazo_z * Math.PI / 180;
    mano.rotation.x = interfaz.giro_pinza * Math.PI / 180;
    mano.children[0].position.x = 4 + interfaz.separacion_pinza;
    mano.children[1].position.x = -0 - interfaz.separacion_pinza;

    material_metal_lambert.wireframe = interfaz.alambres;
    material_metal_phong.wireframe = interfaz.alambres;
    material_rotula.wireframe = interfaz.alambres;
    material_pinzas.wireframe = interfaz.alambres;

    if (animando) {
        tiempoAnimacion += velocidadAnimacion / 60;

        // Función oscilatoria que devuelve valores entre 0 y 1
        let t = (Math.sin(tiempoAnimacion) + 1) / 2;

        // Interpolar entre mínimo y máximo
        interfaz.giro_base = -180 + t * 360;
        interfaz.giro_brazo = -45 + t * 90;
        interfaz.giro_antebrazo_y = -180 + t * 360;
        interfaz.giro_antebrazo_z = -90 + t * 180;
        interfaz.giro_pinza = -40 + t * 100;
        interfaz.separacion_pinza = t * 15;

        sliderGiroBase.updateDisplay();
        sliderGiroBrazo.updateDisplay();
        sliderAntebrazoY.updateDisplay();
        sliderAntebrazoZ.updateDisplay();
        sliderPinza.updateDisplay();
        sliderSeparacion.updateDisplay();
    }
}

function render()
{
	requestAnimationFrame( render );
	update();

    renderer.autoClear = false;
    renderer.setViewport(0,0,window.innerWidth,window.innerHeight);
	renderer.setClearColor( new THREE.Color(0xa2a2f2) );
	renderer.clear();
	renderer.render( scene, camera );

    var ds = Math.min(window.innerHeight , window.innerWidth)/4; // Un cuarto de pantalla
    renderer.setViewport(0, window.innerHeight - ds, ds, ds);
	renderer.setScissor (0, window.innerHeight - ds, ds, ds);
	renderer.setScissorTest (true);
	renderer.setClearColor( new THREE.Color(0xafffff) );
	renderer.clear();	
	renderer.setScissorTest (false);
    renderer.render(scene, cameraTop);
}