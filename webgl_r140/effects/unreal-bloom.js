/*
 * Ejemplo basico de UnrealBloomPass con Three.js r140, sin modulos.
 * Los objetos se dibujan primero en RenderPass y el brillo se anade despues.
 */

var renderer, scene, camera, cameraControls;
var composer, bloomPass, grupo;

init();
loadScene();
render();

function init() {
	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setClearColor(0x020207);

	// UnrealBloomPass necesita tone mapping para obtener un resultado natural.
	renderer.toneMapping = THREE.ReinhardToneMapping;
	renderer.toneMappingExposure = 1;
	renderer.outputEncoding = THREE.sRGBEncoding;
	document.getElementById('container').appendChild(renderer.domElement);

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(
		50,
		window.innerWidth / window.innerHeight,
		0.1,
		100
	);
	camera.position.set(0, 2.5, 8);

	cameraControls = new THREE.OrbitControls(camera, renderer.domElement);
	cameraControls.target.set(0, 0.5, 0);
	cameraControls.enableDamping = true;

	// 1. Render normal de la escena.
	var renderPass = new THREE.RenderPass(scene, camera);

	// 2. Efecto bloom: resolucion, fuerza, radio y umbral.
	bloomPass = new THREE.UnrealBloomPass(
		new THREE.Vector2(window.innerWidth, window.innerHeight),
		1.5,
		0.4,
		0.25
	);

	// 3. El composer sustituye a renderer.render(scene, camera).
	composer = new THREE.EffectComposer(renderer);
	composer.addPass(renderPass);
	composer.addPass(bloomPass);

	connectControl('strength', 'strength');
	connectControl('radius', 'radius');
	connectControl('threshold', 'threshold');

	window.addEventListener('resize', updateAspectRatio);
}

function loadScene() {
	grupo = new THREE.Group();
	scene.add(grupo);

	// MeshBasicMaterial permite ver claramente el bloom sin depender de luces.
	var colores = [0x00ffff, 0xff2080, 0xffcc00];

	for (var i = 0; i < colores.length; i++) {
		var esfera = new THREE.Mesh(
			new THREE.SphereGeometry(0.65, 32, 16),
			new THREE.MeshBasicMaterial({ color: colores[i] })
		);
		esfera.position.x = (i - 1) * 2.2;
		grupo.add(esfera);
	}

	var aro = new THREE.Mesh(
		new THREE.TorusGeometry(2.9, 0.08, 16, 100),
		new THREE.MeshBasicMaterial({ color: 0x4080ff })
	);
	aro.rotation.x = Math.PI / 2;
	grupo.add(aro);

	// Referencia oscura: apenas supera el umbral y casi no produce halo.
	var suelo = new THREE.Mesh(
		new THREE.PlaneGeometry(14, 14),
		new THREE.MeshBasicMaterial({ color: 0x080810, side: THREE.DoubleSide })
	);
	suelo.rotation.x = -Math.PI / 2;
	suelo.position.y = -1.2;
	scene.add(suelo);
}

function connectControl(id, property) {
	var input = document.getElementById(id);
	var output = input.parentElement.querySelector('output');

	input.addEventListener('input', function () {
		bloomPass[property] = Number(input.value);
		output.value = input.value;
	});
}

function updateAspectRatio() {
	var width = window.innerWidth;
	var height = window.innerHeight;

	renderer.setSize(width, height);
	composer.setSize(width, height);
	camera.aspect = width / height;
	camera.updateProjectionMatrix();
}

function update() {
	cameraControls.update();
	grupo.rotation.y += 0.005;
}

function render() {
	requestAnimationFrame(render);
	update();
	composer.render();
}
