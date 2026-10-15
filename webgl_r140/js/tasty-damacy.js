// ejemplo loader

var loader;
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var mixer = null;      // reproduce las animaciones del modelo

const clock = new THREE.Clock();

init();
render();


function init()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  renderer.outputEncoding = THREE.sRGBEncoding;          // salida en sRGB: colores correctos
  renderer.toneMapping = THREE.ACESFilmicToneMapping;     // brillos más suaves
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();
  crearEntorno();                                         // reflejos para los materiales PBR

  // cargo el objeto
  loadObjGLTF();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 1000 );
  camera.position.set( 10, 15, 20 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  const light = new THREE.PointLight(0xffffff, 1, 50000000);
  light.position.set(50, 50, 50);
  scene.add(light);
  
  // O también una luz ambiental para afectar a todos los objetos de manera uniforme
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);
  

  window.addEventListener('resize', updateAspectRatio );
}

function loadObjGLTF()
{
    // Instantiate a loader
    loader = new THREE.GLTFLoader();

    // Optional: Provide a DRACOLoader instance to decode compressed mesh data
    //THREE.DRACOLoader.setDecoderPath( '/examples/js/libs/draco' );
    //loader.setDRACOLoader( new THREE.DRACOLoader() );
        // resource URL
        //'models/Buggy/glTF/Buggy.gltf',
        //'models/x-wing/scene.gltf',

    // Load a glTF resource
    //let model = 'models/duck/rubber_duck_toy_4k.gltf';
    //let model = 'models/police-car/scene.gltf';
    //let model = 'models/nave-espacial/nava_espacial_0907082510_refine.glb';
    //let model = 'models/angrybird/scene.gltf';
    //let model = 'models/steampunk/scene.gltf';
    //let model = 'models/cuchillos/scene.gltf';
    //let model = 'models/tree/scene.gltf';
    //let model = 'models/gar/scene.gltf';
    //let model = 'models/sombrero/fishermans_hat_4k.gltf';
    //let model = 'models/rata/street_rat_4k.gltf';
    let model = 'models/slime_gltf/scene.gltf';   // slime de Sketchfab (scene.bin y textures/ en la misma carpeta)

    // Para cambiar tamaño del modelo. Conseguir su dimensión más grande y dividirla por ello, eso hace que quede entre 0-1 y tras ello, multiplicarlo por lo deseado. por ejemplo, 0.15 es un 15% del tamaño original.
    loader.load(model,
        // called when the resource is loaded
        function ( gltf ) {

            var object = gltf.scene;
            scene.add(object);            

            // Animaciones: un AnimationMixer reproduce los clips del modelo
            console.log('Animaciones:', gltf.animations);
            if (gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(object);
                mixer.clipAction(gltf.animations[0]).play();
            }

            gltf.animations; // Array<THREE.AnimationClip>
            gltf.scene; // THREE.Scene
            gltf.scenes; // Array<THREE.Scene>
            gltf.cameras; // Array<THREE.Camera>
            gltf.asset; // Object


            // Vamos a ajustar la camara al tamaño del mesh que cargamos.

            // Calcular el bounding box del objeto
            var box = new THREE.Box3().setFromObject(object);

            // Obtener el tamaño del bounding box
            var size = new THREE.Vector3();
            box.getSize(size);

            // Obtener el centro del bounding box
            var center = new THREE.Vector3();
            box.getCenter(center);

            // Ajustar la posición de la cámara basándonos en el tamaño del objeto
            var maxDim = Math.max(size.x, size.y, size.z);
            var fov = camera.fov * (Math.PI / 180); // Convertir FOV a radianes
            var cameraDistance = maxDim / (2 * Math.tan(fov / 2));

            // Ajustar la posición de la cámara y sus planos near y far
            camera.position.set(center.x, center.y + cameraDistance, center.z + cameraDistance);
            camera.near = cameraDistance / 10; // Ajustar near
            camera.far = cameraDistance * 10;  // Ajustar far
            camera.updateProjectionMatrix();

            // Ajustar el target de la cámara al centro del objeto
            cameraControls.target.copy(center);
            cameraControls.update();            


        },
        // called while loading is progressing
        function ( xhr ) {

            console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

        },
        // called when loading has errors
        function ( error ) {

            console.log( 'An error happened' );

        }
    );  

}

// Mapa de entorno: un pequeño "estudio" (cielo degradado y dos paneles de luz)
// procesado con PMREMGenerator. Los materiales PBR lo usan para los reflejos,
// que es lo que da al slime el aspecto brillante y húmedo.
function crearEntorno()
{
  const estudio = new THREE.Scene();

  const geoCielo = new THREE.SphereGeometry( 10, 32, 16 );
  const pos = geoCielo.attributes.position;
  const colores = [];
  const arriba = new THREE.Color( 0.75, 0.85, 1.0 ), abajo = new THREE.Color( 0.12, 0.14, 0.18 ), c = new THREE.Color();
  for ( let i = 0; i < pos.count; i++ ) {
    c.copy( abajo ).lerp( arriba, THREE.MathUtils.clamp( pos.getY( i ) / 10 * 0.5 + 0.5, 0, 1 ) );
    colores.push( c.r, c.g, c.b );
  }
  geoCielo.setAttribute( 'color', new THREE.Float32BufferAttribute( colores, 3 ) );
  estudio.add( new THREE.Mesh( geoCielo, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }) ) );

  // Paneles muy brillantes (valores > 1) que se reflejan como "ventanas" de luz
  const panel = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
  panel.color.setScalar( 6 );
  const p1 = new THREE.Mesh( new THREE.PlaneGeometry( 5, 3 ), panel );
  p1.position.set( 4, 6, 5 );
  p1.lookAt( 0, 0, 0 );
  estudio.add( p1 );
  const panelSuave = panel.clone();
  panelSuave.color.setScalar( 2 );
  const p2 = new THREE.Mesh( new THREE.PlaneGeometry( 4, 4 ), panelSuave );
  p2.position.set( -6, 3, -4 );
  p2.lookAt( 0, 0, 0 );
  estudio.add( p2 );

  const pmrem = new THREE.PMREMGenerator( renderer );
  scene.environment = pmrem.fromScene( estudio, 0.02 ).texture;
  pmrem.dispose();
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

    // Avanzar la animación según el tiempo transcurrido
    const delta = clock.getDelta();
    if (mixer != null) mixer.update(delta);
}

function render()
{
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );
}