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
  camera.position.set( 8, 8, 8 );

  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );

  window.addEventListener('resize', updateAspectRatio );
}


function loadScene()
{
  var geometry = new THREE.BufferGeometry();

  var size = 10;
  var segments = 100;

  // Parámetros de la función
  var a = 1;
  var b = 1;

  var vertices = [];
  var indices = [];


  // CREAR VÉRTICES
  for (var iy = 0; iy <= segments; iy++)
  {
    var y = -size / 2 + (iy / segments) * size;

    for (var ix = 0; ix <= segments; ix++)
    {
      var x = -size / 2 + (ix / segments) * size;

      // z = sin(sqrt(a*x² + b*y²))
      var z = Math.sin(
        Math.sqrt(
          a * x * x + b * y * y
        )
      );

      // Three.js: X, Y, Z
      vertices.push(x, z, y);
    }
  }


  // CREAR TRIÁNGULOS
  for (var iy = 0; iy < segments; iy++)
  {
    for (var ix = 0; ix < segments; ix++)
    {
      var a = iy * (segments + 1) + ix;
      var b = a + 1;
      var c = a + (segments + 1);
      var d = c + 1;

      indices.push(a, c, b);
      indices.push(b, c, d);
    }
  }


  // AÑADIR VÉRTICES
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  // AÑADIR ÍNDICES
  geometry.setIndex(indices);

  // Calcular normales
  geometry.computeVertexNormals();


  // MATERIAL
  var material = new THREE.MeshNormalMaterial({
    side: THREE.DoubleSide
  });


  // MALLA
  var malla = new THREE.Mesh(geometry, material);

  scene.add(malla);


  // EJES
  var axesHelper = new THREE.AxesHelper(5);
  scene.add(axesHelper);
}


function updateAspectRatio()
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}


function update()
{
  // Cambios para actualizar la cámara según movimiento del ratón
  cameraControls.update();
}


function render()
{
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
}