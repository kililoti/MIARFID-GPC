

// Variables globales que van siempre
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var cubo;
var ctx;
var textCanvas;


// interface gui
var controls = {
  escala_x: 1,
  angulo_x: 0,
  color: "#f0f0ff", // valor inicial para el color
  opcion_si_no: false, // valor booleano
  opciones: 'Opción 1' // valor inicial de opciones
};



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

    // Configurar el canvas de texto
    textCanvas = document.getElementById("text_canvas");
    ctx = textCanvas.getContext("2d");
    // quiero que tenga las mismas dimensiones que el canvas del three.js
    textCanvas.width = window.innerWidth;
    textCanvas.height = window.innerHeight;  


  scene = new THREE.Scene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 0.1, 100 );
  camera.position.set( 1, 1.5, 2 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  // interface de usuario
  var gui = new dat.GUI();

  // Carpeta Tamaño
  var gui_size = gui.addFolder('Tamaño');
  gui_size.add(controls, 'escala_x', 1, 5).name("Escala X");
  gui_size.open();

  // Carpeta Orientación
  var gui_rot = gui.addFolder('Orientacion');
  gui_rot.add(controls, 'angulo_x', 0, 360).name("Angulo X");
  gui_rot.open();

  // Carpeta Varios
  var gui_varios = gui.addFolder('Varios');

  // Control de tipo color
  gui_varios.addColor(controls, 'color').name("Color");

  // Control tipo booleano (Sí/No)
  gui_varios.add(controls, 'opcion_si_no').name("Sí o No");

  // Control tipo selector de opciones
  gui_varios.add(controls, 'opciones', ['Opción 1', 'Opción 2', 'Opción 3']).name("Opciones");

  gui_varios.open();


  window.addEventListener('resize', updateAspectRatio );
}


function loadScene()
{
	// Añade el objeto grafico a la escena
    let material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Verde
    cubo = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
    scene.add(cubo);
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

  // actualizo segun los controles
  cubo.scale.x = controls.escala_x;
  cubo.rotation.x = controls.angulo_x / 180 * Math.PI;
  cubo.material.color.set(controls.color);  

}


 // Función para proyectar vértices 3D a 2D
 function projectVertexTo2D(vertex, camera) {
    var vector = vertex.clone(); 
    vector.project(camera); // Proyectar el vector a coordenadas de pantalla
    // Convertir las coordenadas normalizadas (-1 a 1) a coordenadas de píxeles
    var x = (vector.x * 0.5 + 0.5) * textCanvas.width;
    var y = (-vector.y * 0.5 + 0.5) * textCanvas.height;
    return { x: x, y: y };
}

function render(time)
{
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );

    // texto superpuesto
    ctx.clearRect(0, 0, textCanvas.width, textCanvas.height); // Limpiar el canvas antes de redibujar
    ctx.font = "24px Arial";
    ctx.fillStyle = "black";
    ctx.fillText("Tiempo Transcurrido: " + (time/1000).toFixed(1    ), 50, 50);    


    // Dibujar los números de los vértices proyectados en el canvas de texto
    // Obtener los 8 vértices del cubo
    var positionAttribute = cubo.geometry.attributes.position;

    //  positionAttribute.count = 24, porque hay vertices repetidos, me quedo con los primeros 8

    for (let i = 0; i < 8; i++) {
        // Obtener la posición del vértice
        var vertex = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
        vertex.applyMatrix4(cubo.matrixWorld); // Aplicar las transformaciones del cubo

        // Proyectar el vértice actual a 2D
        var projected = projectVertexTo2D(vertex, camera);

        // Dibujar el número del vértice en la posición 2D proyectada
        ctx.fillText(i + 1, projected.x, projected.y);
    }
}