

// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var cameraTop;

// 1-inicializa 
init();
// 2-Crea una escena
loadScene();
// 3-renderiza
render();

function init()
{
    renderer = new THREE.WebGLRenderer({
    antialias: true,
    //stencil: true // Activar el stencil buffer
  });

  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 10000 ); // FOV, AspectRatio, NearView, FarView
  camera.position.set( 50, 30, 30 );

  // vista de planta
  cameraTop = new THREE.OrthographicCamera( -50, 50, 50,-50, 1, 1000 );
  cameraTop.position.set(0,500,0);
  cameraTop.lookAt( 0, 0, 0 );
  cameraTop.up.set( 0, 0, 1 ); // Debido a que la camara mira hacia abajo, el up tiene que se otro eje que no sea y
  cameraTop.updateProjectionMatrix();  


  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  window.addEventListener('resize', updateAspectRatio );


  /*
  stencilScene = new THREE.Scene(); // Escena separada para el círculo
  const circleGeometry = new THREE.CircleGeometry(20, 32); 
  const stencilMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); 
  const stencilCircle = new THREE.Mesh(circleGeometry, stencilMaterial);
  stencilCircle.position.set(-30, 0, 30); 
  stencilCircle.rotation.x = -Math.PI / 2;
  stencilScene.add(stencilCircle); // Agregar círculo solo a la nueva escena
  */
  
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
    var ds = Math.min(window.innerHeight , window.innerWidth)/4; // Un cuarto de pantalla
    renderer.setViewport(0,0,ds,ds);
	renderer.setScissor (0, 0, ds, ds);
	renderer.setScissorTest (true);
	renderer.setClearColor( new THREE.Color(0xaffff) );
	renderer.clear();	
	renderer.setScissorTest (false);
    renderer.render(scene, cameraTop);


    //HUD Circular en el minimapa
    /*
    // Paso 1: Dibujar la escena normalmente
    renderer.autoClear = false;
    renderer.setClearColor( new THREE.Color(0xff00ff) );
    renderer.clear(true, true, true); // Limpiar color, profundidad y stencil
    renderer.render(scene, camera);

    // Acceder al contexto WebGL
    const gl = renderer.getContext();

    // Paso 2: Configurar el stencil buffer
    // Limpiar el stencil buffer antes de usarlo
    gl.clear(gl.STENCIL_BUFFER_BIT);
    // Habilitar el stencil test
    gl.enable(gl.STENCIL_TEST);
    // Configurar el stencil buffer para escribir 1 en las áreas donde se va a dibujar
    gl.stencilFunc(gl.ALWAYS, 1, 0xFF); // Siempre pasa
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE); // Reemplazar con 1 cuando se dibuje

    // Deshabilitar la escritura en el color y el z-buffer para dibujar solo en el stencil
    renderer.autoClear = false;
    renderer.clearDepth(); // Limpiar el z-buffer si es necesario
    gl.colorMask(false, false, false, false); // Deshabilitar escritura de colores
    gl.depthMask(false); // Deshabilitar escritura en el z-buffer

    // Paso 3: Dibujar un círculo para la máscara en el stencil buffer
    renderer.render(stencilScene, cameraTop);

    

    // Paso 4: Configurar el stencil para renderizar solo en el área circular
    gl.colorMask(true, true, true, true); // Habilitar la escritura de colores
    gl.depthMask(true); // Habilitar la escritura en el z-buffer

    gl.stencilFunc(gl.EQUAL, 1, 0xFF); // Dibujar solo donde el stencil es 1
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP); // Mantener el stencil buffer intacto

    // Paso 5: Dibujar la escena usando la cámara superior solo dentro del área circular
    renderer.render(scene, cameraTop);

    // Paso 6: Deshabilitar el stencil test para los próximos renderizados
    gl.disable(gl.STENCIL_TEST);
    */


}