// ejemplo loader

var loader;
var renderer, scene, camera;
var cameraControls;
var angulo = 0;
var hm_data = null , hm_height,hm_width;

// parametros del heighmap
const scaleFactorY = 0.5;
const scaleFactorXZ = 10.0;
const scaleFactorDiffuseMap = 10;


const clock = new THREE.Clock();

// camara en primera persona

// Controles de primera persona
const controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    speed: 1.1
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
    }
});

// Movimiento de la cámara
function updateCamera() {
    // basico:
    //if (controls.moveForward) camera.position.z -= controls.speed;
    //if (controls.moveBackward) camera.position.z += controls.speed;
    //if (controls.moveLeft) camera.position.x -= controls.speed;
    //if (controls.moveRight) camera.position.x += controls.speed;

    // mejorado 1
    // Actualizar el ángulo basado en los controles de izquierda y derecha
    if (controls.moveLeft) angulo += 0.1;
    if (controls.moveRight) angulo -= 0.1;

    // Calcular el vector de dirección de vista
    let viewDir = new THREE.Vector3(Math.sin(angulo), 0, Math.cos(angulo));

    // Mover la cámara hacia adelante o hacia atrás
    if (controls.moveForward) {
        camera.position.add(viewDir.clone().multiplyScalar(controls.speed));
    }
    if (controls.moveBackward) {
        camera.position.add(viewDir.clone().multiplyScalar(-controls.speed));
    }

    // Ajustar la posición de la cámara en función del heightmap
    const H = hm_altura(camera.position.x, camera.position.z);
    camera.position.y = H + 3;

    // Calcular el punto de destino sumando el viewDir a la posición de la cámara
    const target = new THREE.Vector3().addVectors(camera.position, viewDir);

    // Hacer que la cámara mire hacia el punto de destino
    camera.lookAt(target);
 

}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}


function hm_altura( X, Z)
{
  if(hm_data==null)
    return 0;

  // X = (i-height/2) * scaleFactorXZ;
  // Z = (j-width/2) * scaleFactorXZ;
  const i = clamp(Math.floor(X/scaleFactorXZ + hm_height/2) , 0,hm_height-1);
  const j = clamp(Math.floor(Z/scaleFactorXZ + hm_width/2) , 0 ,hm_width-1);
  const index = i * hm_width + j;
  return hm_data[index];

}


init();
render();


function init()
{
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setClearColor( new THREE.Color(0xFFFFFF) );
  document.getElementById('container').appendChild( renderer.domElement );

  scene = new THREE.Scene();


  loadScene();

  var aspectRatio = window.innerWidth / window.innerHeight;
  camera = new THREE.PerspectiveCamera( 50, aspectRatio , 1, 100000 );
  camera.position.set( 100, 150, 200 );
  
  // camara orbit
  cameraControls = new THREE.OrbitControls( camera, renderer.domElement );
  cameraControls.target.set( 0, 0, 0 );
  // camara en primera persona



  const light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(50, 50, 50);
  scene.add(light);
  
  // O también una luz ambiental para afectar a todos los objetos de manera uniforme
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);
  

  window.addEventListener('resize', updateAspectRatio );
}


function getImagePixelData(image) {
  // Crea un elemento canvas
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  // Ajusta el tamaño del canvas al tamaño de la imagen
  canvas.width = image.width;
  canvas.height = image.height;

  // Dibuja la imagen en el canvas
  context.drawImage(image, 0, 0, image.width, image.height);

  // Obtiene los datos de los píxeles
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  // imageData.data contiene los datos de píxeles en un formato RGBA
  return imageData.data;
}


function loadScene()
{
    // ------------------------------------------
    // PARÁMETROS DEL TERRENO
    // ------------------------------------------

    const width = 500;
    const height = 500;

    // Distancia entre vértices
    const scaleFactorXZ = 20.0;

    // Altura máxima
    const scaleFactorY = 50.0;

    // Altura a partir de la cual queremos verde
    const alturaVerde = 20.0;


    // ------------------------------------------
    // CREAR GEOMETRÍA
    // ------------------------------------------

    const geometry = new THREE.BufferGeometry();

    const numVertices = width * height;

    const vertices = new Float32Array(numVertices * 3);

    const colors = new Float32Array(numVertices * 3);

    const indices = [];


    // ------------------------------------------
    // CREAR TRIÁNGULOS
    // ------------------------------------------

    for (let i = 0; i < height - 1; i++)
    {
        for (let j = 0; j < width - 1; j++)
        {
            // v0----v1
            // |     |
            // v3----v2

            const v0 = i * width + j;
            const v1 = (i + 1) * width + j;
            const v2 = (i + 1) * width + (j + 1);
            const v3 = i * width + (j + 1);

            // Primer triángulo
            indices.push(v0);
            indices.push(v2);
            indices.push(v1);

            // Segundo triángulo
            indices.push(v0);
            indices.push(v3);
            indices.push(v2);
        }
    }

    geometry.setIndex(indices);


    // ------------------------------------------
    // CREAR ALTURAS ALEATORIAS
    // ------------------------------------------

    hm_data = new Float32Array(numVertices);

    hm_width = width;
    hm_height = height;


    for (let i = 0; i < height; i++)
    {
        for (let j = 0; j < width; j++)
        {
            const index = i * width + j;


            // ----------------------------------
            // POSICIÓN X Y Z
            // ----------------------------------

            const x = (i - height / 2) * scaleFactorXZ;
            const z = (j - width / 2) * scaleFactorXZ;


            // ----------------------------------
            // ALTURA
            // ----------------------------------

            // Generamos una altura pseudoaleatoria
            // usando varias ondas para que
            // parezcan montañas.

/*             let altura =
                Math.sin(i * 0.10) *
                Math.cos(j * 0.10);

            altura +=
                0.5 *
                Math.sin(i * 0.25) *
                Math.cos(j * 0.20);

            // Pasamos de [-1,1] a [0,1]
            altura = (altura + 1) / 2;

            // Altura final
            altura *= scaleFactorY; */

            let altura = Math.random() * scaleFactorY;


            // ----------------------------------
            // GUARDAR VÉRTICES
            // ----------------------------------

            vertices[index * 3 + 0] = x;
            vertices[index * 3 + 1] = altura;
            vertices[index * 3 + 2] = z;


            // Guardamos la altura para
            // poder usarla después con la cámara
            hm_data[index] = altura;


            // ----------------------------------
            // COLOR SEGÚN ALTURA
            // ----------------------------------

            if (altura < alturaVerde)
            {
                // Marrón
                colors[index * 3 + 0] = 0.76;
                colors[index * 3 + 1] = 0.6;
                colors[index * 3 + 2] = 0.41;
            }
            else
            {
                // Verde
                colors[index * 3 + 0] = 0.13;
                colors[index * 3 + 1] = 0.54;
                colors[index * 3 + 2] = 0.13;
            }
        }
    }


    // ------------------------------------------
    // AÑADIR ATRIBUTOS
    // ------------------------------------------

    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(vertices, 3)
    );

    geometry.setAttribute(
        'color',
        new THREE.BufferAttribute(colors, 3)
    );


    // Necesario para que la iluminación
    // de la superficie sea correcta
    geometry.computeVertexNormals();


    // ------------------------------------------
    // MATERIAL
    // ------------------------------------------

    const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide
    });


    // ------------------------------------------
    // CREAR TERRENO
    // ------------------------------------------

    const terrain = new THREE.Mesh(
        geometry,
        material
    );

    scene.add(terrain);


    // ------------------------------------------
    // EJES
    // ------------------------------------------

    const axesHelper = new THREE.AxesHelper(100);
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
    // Cambios para actualizar la camara segun mvto del raton
    cameraControls.update();

    // camara en primera persona
    //updateCamera();

}

function render()
{
	requestAnimationFrame( render );
	update();
	renderer.render( scene, camera );
}

