> Current version: schema 4. Read [CONTENT-GUIDE.md](CONTENT-GUIDE.md) for the new content modules and [HUMANOID-GUIDE.md](HUMANOID-GUIDE.md) for the humanoid foundation.

# Extend the system

## Add a part family

Add metadata to `src/core/catalog.js`. The same catalog controls the library and validation. Supply a label, category, description, default anchor, size, length, and mirror flag. Add an SVG icon in `src/ui/icons.js`.

Add a factory to `src/creature/extra-parts.js` or a new file. Register it in `defaultRegistry()`. Duplicate types and missing factories throw an error. A factory has this contract:

```js
function newPart(part, {materials, geometries}) {
  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometries.sphere, materials.skin);
  group.add(mesh);
  group.scale.set(part.size, part.size * part.length, part.size);
  return {
    group,
    update(time, speed, pose) {
      const amplitude = part.flex * pose.layers.flex;
      mesh.position.y = 0.2 + Math.sin(time * 2 + part.phase * Math.PI * 2)
        * 0.04 * amplitude;
    }
  };
}
```

This fragment belongs in a module that imports Three.js. Local +Y points out from the skin. The assembler applies anchor position, normal orientation, twist, and a small common bend. Do not apply those transforms twice. `part.size` already includes presence in the expanded runtime gene. Use `part.variant` for one of the three shape choices. Use `part.bend` for extra family-specific curvature.

Reuse the geometry kit and supplied materials. New geometry belongs to the Creature. Do not dispose a shared kit geometry during update. For deformed buffers, update normals and bounds when required. Keep update free of DOM, storage, and physics calls.

Add the type to `types.d.ts`, make a sample blueprint, and extend the engine tests. Custom saved type names are invalid until the catalog and factory exist in the receiving build.

## Add a model

For humanoids, add the recipe to `core/humanoid-presets.js` and metadata to `HUMANOID_MODELS`. Derive structural nodes with `syncHumanoidBody()` and validate. The following path is for creature models.

Add a plain blueprint recipe to `core/presets.js` and its label to `PRESET_MODELS`. Start from a base model and create parts with `createPart`. Always call `validateGenome` on the result. Do not add a special-case renderer or physics object for one model.

Use stable sibling node IDs and a consistent hierarchy across related models. The mixer matches structural paths, not biological names. Update the example generator and add a source-pair test.

## Add a motion state

Add a state to `MOTION_CLIPS` in `core/motion.js`. Supply each scalar channel used by the existing states: rate, stride, lift, stance, bob, sway, pitch, flap, tail, jaw, tuck, and lateral stride. Keep a nonzero stance window below 1 for moving states. The UI builds its controls from this registry.

Update the type declaration and tests. A new secondary gain also needs a `MOTION_LAYERS` entry, a default gain, and an implementation in one or more part factories. A UI slider without a runtime consumer does not add behavior.

## Add a pigment pattern

Append an ID to `PATTERNS` in `core/surfaces.js`. Do not reorder existing IDs without checking the shader mapping. Implement the same ID in `skinPattern` in `creature/shaders.js`. Keep output finite and within the expected 0 to 1 range.

Update types, the raw shader test, and the real-engine browser test. The material has a fixed four-layer array. More layers require coordinated changes to validation, the mixer, shader uniforms, UI, types, limits, and tests.

For a new microtexture, implement a deterministic RGBA generator in `generateMicroTexture`. Keep the allowed texture dimensions bounded. A height texture affects bump shading, not silhouette or collision.

## Use the mixer outside the editor

Call `mixGenomes(a, b, settings, frozen)` with validated blueprints. It validates inputs again and returns `{genome, notes, stats}`. Retain and show notes: a valid result can still require graph repair or pruning.

Use `createMixRecipe` to save the full configuration. Use `parseMixRecipe` on imported JSON instead of trusting object fields. The engine does not need the UI or localStorage for these operations.

## Required checks after a change

Run `npm test` for data and geometry algorithms. Run `npm run test:engine` with the real dependencies for geometry, materials, animation, and physics integration. Run `npm run test:ui` for the editor. Run shader and full-browser tests on a WebGL2 machine. Check a rendered creature, not just a blank editor layout.

The current delivery does not certify the unrun engine and GPU checks. Keep those checks as release gates when using this foundation in another game.
