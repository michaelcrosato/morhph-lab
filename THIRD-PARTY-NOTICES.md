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

The delivered single-file prototype is the CDN edition and refers to these packages rather than redistributing their code. Source archive dependencies are retrieved by `npm install`. An offline build embeds locally installed engine code and copies available license/notice files into the HTML. Preserve those notices and the accompanying files when redistributing that edition. Check the installed package licenses and any additional notice requirements for your intended distribution.

No third-party graphical assets, fonts, texture packs, animated clips or audio files are used. Optional development-only Playwright is not included as a runtime dependency.

## Foundation Studio

The v5 review renderer, primitive generator, inspection modules, and PNG writer are authored project code under the project MIT license. The offline review HTML does not include or load Three.js or Rapier engine code. The full game HTML remains the CDN edition described above.

Reference images and OBJ files that a user imports keep their own rights and licenses. They are not supplied as project assets. Reference bytes are not uploaded to a server or embedded in review sessions.
