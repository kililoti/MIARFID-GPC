// ejemplo loader

var loader;
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var mixer = null;
const clock = new THREE.Clock();



init();
render();


function init()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();

  // cargo el objeto y las animaciones
  loadModelAndAnimations();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 5, 10000 );
  camera.position.set( 300, 600, 700);

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(50, 50, 50);
  scene.add(light);
  
  // O también una luz ambiental para afectar a todos los objetos de manera uniforme
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  

  window.addEventListener('resize', updateAspectRatio );
}


let actions = {};
// Array para almacenar los nombres de las animaciones
let animationNames = [];
// Índice actual de la animación
let currentAnimationIndex = 0;


function loadModelAndAnimations() {
    const loader = new THREE.FBXLoader();

    // Cargar modelo base
//    loader.load('models/remy/remy.fbx', function (object) {
    //loader.load('models/millan/Ty.fbx', function (object) {
//    loader.load('models/Gargamel/Walking (1).fbx', function (object)
    loader.load('models/slime/slime.fbx', function (object) {
        scene.add(object);
        object.position.set(0, 0, 0);

        mixer = new THREE.AnimationMixer(object);

        // Ajustar materiales
        object.traverse(function (child) {
            if (child.isMesh) {
                child.material.transparent = false;
                child.material.opacity = 1.0;
            }
        });

        // Cargar y aplicar animaciones
        //const animations = ['models/remy/Walking.fbx', 'models/remy/Fast Run.fbx','models/remy/Big Jump.fbx'];
        const animations = ['models/millan/Walking.fbx','models/millan/Stand To Roll.fbx'];
        animations.forEach(function (animFile, index) {
            loader.load(animFile, function (animData) {
                // Extraer el nombre del archivo sin la ruta ni la extensión .fbx
                const name = animFile.split('/').pop().split('.').slice(0, -1).join('.');
                const action = mixer.clipAction(animData.animations[0]);
                actions[name] = action; // Guardar la acción con el nombre del archivo
                animationNames[index] = name; // Almacenar nombre de animación en el array
                
                if (index === 0) { // Iniciar la primera animación
                    action.play();
                }                                
            });
        });

    }, undefined, function (error) {
        console.error(error);
    });
}

function changeAnimation(direction) {
    // Detener la animación actual
    actions[animationNames[currentAnimationIndex]].stop();

    // Actualizar el índice según la dirección de cambio
    if (direction === 'next') {
        currentAnimationIndex = (currentAnimationIndex + 1) % animationNames.length;
    } else if (direction === 'prev') {
        currentAnimationIndex = (currentAnimationIndex - 1 + animationNames.length) % animationNames.length;
    }

    // Reproducir la nueva animación
    actions[animationNames[currentAnimationIndex]].play();
}

document.addEventListener('keydown', function(event) {
    if (event.key === 'PageDown') {
        changeAnimation('next');
    } else if (event.key === 'PageUp') {
        changeAnimation('prev');
    }
});

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
    const delta = clock.getDelta();
    if (mixer!=null) mixer.update(delta);

}

function render()
{
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );
}

