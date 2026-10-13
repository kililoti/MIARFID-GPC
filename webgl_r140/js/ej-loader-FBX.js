// =========================================================
// VARIABLES GLOBALES
// =========================================================

var loader;
var renderer, scene, camera;
var cameraControls;
var angulo = -0.01;
var mixer = null;

const clock = new THREE.Clock();


// =========================================================
// INICIO
// =========================================================

init();
render();


// =========================================================
// INIT
// =========================================================

function init()
{
    // -----------------------------------------------------
    // RENDERER
    // -----------------------------------------------------

    renderer = new THREE.WebGLRenderer({
        antialias: true
    });

    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );

    renderer.setPixelRatio(
        window.devicePixelRatio
    );

    renderer.setClearColor(
        new THREE.Color(0xFFFFFF)
    );

    // Gestión de color
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Tone mapping
    renderer.toneMapping =
        THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1.0;


    document
        .getElementById('container')
        .appendChild(renderer.domElement);


    // -----------------------------------------------------
    // ESCENA
    // -----------------------------------------------------

    scene = new THREE.Scene();


    // =====================================================
    // LUCES
    // =====================================================

    // Luz ambiental
    const ambientLight =
        new THREE.AmbientLight(
            0xffffff,
            1.5
        );

    scene.add(ambientLight);


    // Luz direccional
    const light =
        new THREE.DirectionalLight(
            0xffffff,
            0.5
        );

    light.position.set(
        5,
        10,
        5
    );

    scene.add(light);


    // =====================================================
    // CARGAR OBJETO
    // =====================================================

    loadObjFBX();


    // =====================================================
    // CÁMARA
    // =====================================================

    var aspectRatio =
        window.innerWidth /
        window.innerHeight;

    camera =
        new THREE.PerspectiveCamera(
            50,
            aspectRatio,
            1,
            1000
        );

    camera.position.set(
        100,
        150,
        200
    );


    // =====================================================
    // CONTROLES
    // =====================================================

    cameraControls =
        new THREE.OrbitControls(
            camera,
            renderer.domElement
        );

    cameraControls.target.set(
        0,
        0,
        0
    );

    cameraControls.update();


    // =====================================================
    // RESIZE
    // =====================================================

    window.addEventListener(
        'resize',
        updateAspectRatio
    );
}


// =========================================================
// CARGAR FBX + TEXTURAS
// =========================================================

function loadObjFBX()
{
    // -----------------------------------------------------
    // FBX LOADER
    // -----------------------------------------------------

    const loader =
        new THREE.FBXLoader();

    const model =
        'models/slime/slime.fbx';


    // -----------------------------------------------------
    // TEXTURE LOADER
    // -----------------------------------------------------

    const textureLoader =
        new THREE.TextureLoader();


    // =====================================================
    // ALBEDO
    // =====================================================

    const albedoTexture =
        textureLoader.load(

            'models/slime/textures/slime_albedo.jpeg',

            function ()
            {
                console.log(
                    'Albedo cargada correctamente'
                );
            },

            undefined,

            function (error)
            {
                console.error(
                    'Error cargando albedo:',
                    error
                );
            }
        );

    albedoTexture.colorSpace =
        THREE.SRGBColorSpace;


    // =====================================================
    // ROUGHNESS
    // =====================================================

    const roughnessTexture =
        textureLoader.load(

            'models/slime/textures/slime_roughness.jpeg',

            function ()
            {
                console.log(
                    'Roughness cargada correctamente'
                );
            },

            undefined,

            function (error)
            {
                console.error(
                    'Error cargando roughness:',
                    error
                );
            }
        );


    // =====================================================
    // OPACITY
    // =====================================================

    const opacityTexture =
        textureLoader.load(

            'models/slime/textures/slime_opacity.jpeg',

            function ()
            {
                console.log(
                    'Opacity cargada correctamente'
                );
            },

            undefined,

            function (error)
            {
                console.error(
                    'Error cargando opacity:',
                    error
                );
            }
        );


    // =====================================================
    // CARGAR FBX
    // =====================================================

    loader.load(

        model,

        function (object)
        {
            console.log(
                'FBX cargado correctamente'
            );

            console.log(
                'Animaciones:',
                object.animations
            );


            // =================================================
            // MATERIALES
            // =================================================

            object.traverse(
                function (child)
                {
                    if (child.isMesh)
                    {
                        child.material =
                            new THREE.MeshStandardMaterial({

                                // ---------------------------------
                                // COLOR / ALBEDO
                                // ---------------------------------

                                map: albedoTexture,


                                // ---------------------------------
                                // ROUGHNESS
                                // ---------------------------------

                                // De momento NO usamos
                                // roughnessMap porque puede generar
                                // reflejos excesivamente blancos.

                                roughness: 0.5,

                                metalness: 0.0,


                                // ---------------------------------
                                // TRANSPARENCIA
                                // ---------------------------------

                                alphaMap:
                                    opacityTexture,

                                transparent: true,

                                alphaTest: 0.05,


                                // ---------------------------------
                                // CARAS
                                // ---------------------------------

                                side:
                                    THREE.DoubleSide
                            });


                        child.material.needsUpdate =
                            true;
                    }
                }
            );


            // =================================================
            // ESCALA
            // =================================================

            object.scale.setScalar(5);


            // =================================================
            // POSICIÓN
            // =================================================

            object.position.set(
                0,
                0,
                0
            );


            // =================================================
            // ANIMACIÓN
            // =================================================

            if (
                object.animations &&
                object.animations.length > 0
            )
            {
                mixer =
                    new THREE.AnimationMixer(
                        object
                    );


                const action =
                    mixer.clipAction(
                        object.animations[0]
                    );


                action.play();
            }


            // =================================================
            // AÑADIR A ESCENA
            // =================================================

            scene.add(object);
        },


        undefined,


        function (error)
        {
            console.error(
                'Error cargando FBX:',
                error
            );
        }
    );
}


// =========================================================
// RESIZE
// =========================================================

function updateAspectRatio()
{
    renderer.setSize(
        window.innerWidth,
        window.innerHeight
    );


    camera.aspect =
        window.innerWidth /
        window.innerHeight;


    camera.updateProjectionMatrix();
}


// =========================================================
// UPDATE
// =========================================================

function update()
{
    cameraControls.update();


    const delta =
        clock.getDelta();


    if (mixer != null)
    {
        mixer.update(delta);
    }
}


// =========================================================
// RENDER
// =========================================================

function render()
{
    requestAnimationFrame(
        render
    );


    update();


    renderer.render(
        scene,
        camera
    );
}