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

    const loader = new THREE.TextureLoader();
    loader.load('images/Heightmap256.jpg', function(texture) {
    loader.load('images/grass.png', function(diffuseTexture) {

      // esta textura es la difusa, por ejemplo pasto o rocas
      diffuseTexture.wrapS = THREE.MirroredRepeatWrapping;
      diffuseTexture.wrapT = THREE.MirroredRepeatWrapping;
      
      // y esta es la textura del hmap
      const width = texture.image.width;
      const height = texture.image.height;      
      const geometry = new THREE.BufferGeometry();
      const numVertices = width*height;
      const vertices = new Float32Array(numVertices * 3); 
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const coords_uv = new Float32Array(numVertices * 2); 
      geometry.setAttribute('uv', new THREE.BufferAttribute(coords_uv, 2));
      const indices = [];

      for (let i = 0; i < height-1; i++) {
        for (let j = 0; j < width-1; j++) {
          // v0----v1
          // |     |
          // v3----v2
          const v0 = i * width + j;
          const v1 = (i+1) * width + j;
          const v2 = (i+1) * width + (j+1);
          const v3 = i * width + (j+1);
          
          // face 1
          indices.push(v0);
          indices.push(v2);
          indices.push(v1);

          // face 2
          indices.push(v0);
          indices.push(v3);
          indices.push(v2);
        }
      }
      geometry.setIndex(indices);
            
      const material = new THREE.MeshBasicMaterial({ map: diffuseTexture , wireframe: false});
      const terrain = new THREE.Mesh(geometry, material);
      const data  = getImagePixelData(texture.image);

      // almaceno todo esto para poder recuperar la altura de cualquier punto de la escena
      hm_data = new Float32Array(numVertices); 
      hm_width = width;
      hm_height =  height;

      for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const index = i * width + j;
            const pixelIndex = index * 4; // Cada píxel tiene 4 componentes (RGBA)
            const brightness = data[pixelIndex] * 0.299 + data[pixelIndex + 1] * 0.587 + data[pixelIndex + 2] * 0.114; // Calcula la luminosidad aproximada

            // posicion
            vertices[index*3+0] = (i-height/2) * scaleFactorXZ;
            vertices[index*3+2] = (j-width/2) * scaleFactorXZ;
            hm_data[index] = vertices[index*3+1] = brightness * scaleFactorY; // Ajusta la posición altura basada en la luminosidad

            // coordenadas uv
            coords_uv[index*2+0] = i/height*scaleFactorDiffuseMap;
            coords_uv[index*2+1] = j/width*scaleFactorDiffuseMap;

            

        }
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.computeVertexNormals(); 

    scene.add(terrain);
    })      // carga textura difusa
    });     // carga textura del heightmap
  
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

