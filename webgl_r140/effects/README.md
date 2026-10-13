# UnrealBloomPass con Three.js r140

Ejemplo basico sin modulos. Abrir `unreal-bloom.html` desde el servidor local del
proyecto (por ejemplo, ejecutando `server.bat` en la carpeta raiz).

## Que hace falta

Ademas de `three.min_r140.js`, el HTML carga estos scripts clasicos de la misma
release y en este orden:

1. `CopyShader.js`
2. `LuminosityHighPassShader.js`
3. `EffectComposer.js`
4. `RenderPass.js`
5. `ShaderPass.js`
6. `UnrealBloomPass.js`

En los scripts clasicos de r140, `EffectComposer.js` ya incluye las clases
`Pass` y `FullScreenQuad`; no hace falta cargar un `Pass.js` separado.

El cambio esencial respecto a un ejemplo normal es construir un compositor:

```js
var composer = new THREE.EffectComposer(renderer);
composer.addPass(new THREE.RenderPass(scene, camera));
composer.addPass(new THREE.UnrealBloomPass(resolution, 1.5, 0.4, 0.25));
```

En el bucle de dibujo se llama a `composer.render()` en lugar de
`renderer.render(scene, camera)`. Al redimensionar la ventana tambien hay que
actualizar el compositor con `composer.setSize(width, height)`.

Los archivos de `js/` proceden de la release oficial r140 de Three.js:
<https://github.com/mrdoob/three.js/tree/r140/examples/js>.
