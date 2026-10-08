# Third-party components and references

Morph Lab's authored code is MIT-licensed. Third-party engines keep their own licenses; the project's license does not relicense those dependencies.

## Three.js

- Pinned package: `three@0.181.0` (r181).
- License: MIT. Copyright belongs to the Three.js authors.
- Official project: https://github.com/mrdoob/three.js/tree/r181
- License: https://github.com/mrdoob/three.js/blob/r181/LICENSE
- WebGLRenderer reference: https://threejs.org/docs/pages/WebGLRenderer.html

## Rapier

- Pinned package: `@dimforge/rapier3d-compat@0.19.3`.
- License: Apache-2.0. Copyright belongs to the Rapier contributors / Dimforge.
- Official JavaScript bindings: https://github.com/dimforge/rapier.js
- Official physics project: https://github.com/dimforge/rapier
- JavaScript guide: https://rapier.rs/docs/user_guides/javascript/getting_started_js/
- World API: https://rapier.rs/javascript3d/classes/World.html

## Distribution

The release is one file, `dist/Morph-Lab.html`, containing Create, Inspect and Advanced workshop. Both editions include the project license text.

- **CDN edition** (`npm run build`; the committed release) contains no engine code. It refers to the pinned packages and loads them from jsDelivr only when they are needed: Three.js for Create's optional GPU view, and Three.js and Rapier for the Advanced workshop and the full engine check in System checks. Create, Inspect and asset export run on authored code alone.
- **Offline edition** (`npm run build:offline`) embeds the engines installed by `npm install` and copies their license and notice files into the HTML. Preserve those notices when redistributing it.

Check the installed package licenses and any additional notice requirements for your intended distribution.

## Authored components

The CPU renderer, geometry, texture and motion generators, inspection modules, PNG writer, and GLB and ZIP writers are authored project code under the project MIT license.

No third-party graphical assets, fonts, texture packs, animation clips or audio files are used. Development-only test tools such as Playwright are not runtime dependencies.

Reference images and OBJ files that a user imports keep their own rights and licenses. They are not supplied as project assets. Reference bytes are not uploaded to a server or embedded in review sessions.
