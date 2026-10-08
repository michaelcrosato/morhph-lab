import * as THREE from 'three';
import { appearanceLayers, generateMicroTexture, PATTERNS } from '../core/surfaces.js';
import { SKIN_NOISE_GLSL, SKIN_PATTERN_GLSL } from './shaders.js';
function makePore(seed, style) {
  const pore = new THREE.DataTexture(generateMicroTexture(seed, style), 128, 128, THREE.RGBAFormat);
  pore.wrapS = pore.wrapT = THREE.RepeatWrapping;
  pore.repeat.set(8, 8);
  pore.magFilter = THREE.LinearFilter;
  pore.minFilter = THREE.LinearMipmapLinearFilter;
  pore.generateMipmaps = true;
  pore.needsUpdate = true;
  return pore;
}
/** Four weighted object-space pigment layers. Uniform edits do not rebuild meshes. */
export function createMaterials(genome) {
  const uniforms = {
    uAccent: { value: new THREE.Color() },
    uSkinLayers: { value: Array.from({ length: 4 }, () => new THREE.Vector4()) },
    uSkinWarps: { value: new THREE.Vector4() },
    uSkinStrength: { value: 0.78 },
    uSeed: { value: 0 },
  };
  const skin = new THREE.MeshStandardMaterial();
  skin.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vSkinPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvSkinPosition = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vSkinPosition;uniform vec3 uAccent;uniform vec4 uSkinLayers[4];uniform vec4 uSkinWarps;uniform float uSkinStrength;uniform float uSeed;\n${SKIN_NOISE_GLSL}\n${SKIN_PATTERN_GLSL}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float pigment=layeredPigment(vSkinPosition,uSkinLayers,uSkinWarps,uSeed);
        float belly=(1.0-smoothstep(-.7,.35,vSkinPosition.y))*.14;
        diffuseColor.rgb=mix(diffuseColor.rgb,uAccent,clamp(pigment*uSkinStrength+belly,0.0,1.0));
        diffuseColor.rgb*=.96+.06*skinNoise(vSkinPosition*28.0+vec3(uSeed));
      `,
      );
  };
  skin.customProgramCacheKey = () => 'morph-skin-v8-forty-two-patterns';
  const standard = (color, roughness = 0.48, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const materials = {
    skin,
    bone: standard('#e7dcc0', 0.58),
    cloth: new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: 0.95,
      side: THREE.DoubleSide,
    }),
    metal: standard('#a9b1b6', 0.36, 0.85),
    accent: standard('#ffffff'),
    armor: standard('#ffffff', 0.36, 0.15),
    glow: standard('#ffffff', 0.3),
    horn: new THREE.MeshStandardMaterial({ color: '#f2e6c5', vertexColors: true, roughness: 0.38 }),
    dark: standard('#162c30', 0.3),
    eye: standard('#f5edcb', 0.22),
    iris: standard('#d2b45d', 0.28, 0.08),
    pupil: standard('#102328', 0.16),
    glint: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    membrane: new THREE.MeshStandardMaterial({ side: THREE.DoubleSide }),
    pore: null,
    uniforms,
    textureKey: null,
  };
  materials.membrane.onBeforeCompile = skin.onBeforeCompile;
  materials.membrane.customProgramCacheKey = skin.customProgramCacheKey;
  updateMaterials(materials, genome);
  return materials;
}
export function updateMaterials(m, genome) {
  const a = genome.appearance,
    layers = appearanceLayers(a),
    u = m.uniforms,
    key = a.textureSeed + ':' + a.micro;
  if (m.textureKey !== key) {
    const old = m.pore;
    m.pore = makePore(a.textureSeed, a.micro);
    m.textureKey = key;
    m.skin.bumpMap = m.pore;
    if (!old) m.skin.needsUpdate = true;
    old?.dispose();
  }
  m.skin.color.set(a.color);
  m.skin.roughness = a.roughness;
  m.skin.metalness = a.metalness;
  m.skin.bumpScale = a.relief;
  m.skin.emissive.set(a.accent);
  m.skin.emissiveIntensity = a.emission * 0.24;
  for (const name of ['accent', 'membrane', 'glow']) {
    m[name].color.set(a.accent);
    m[name].roughness = a.roughness;
    m[name].metalness = a.metalness * 0.5;
    m[name].emissive.set(a.accent);
    m[name].emissiveIntensity = name === 'glow' ? 0.35 + a.emission : a.emission * 0.2;
  }
  m.membrane.color.set(a.color).lerp(new THREE.Color(a.accent), 0.16);
  m.armor.color.set(a.color).lerp(new THREE.Color(a.accent), 0.22);
  m.armor.roughness = Math.max(0.2, a.roughness * 0.76);
  m.armor.metalness = Math.min(1, a.metalness + 0.12);
  m.bone.color.set(a.accent).lerp(new THREE.Color('#f0e7d0'), 0.8);
  m.cloth.color.set(a.accent);
  m.cloth.bumpMap = m.pore;
  m.cloth.bumpScale = Math.min(0.045, a.relief);
  m.cloth.needsUpdate = !m.cloth.userData.hasBump;
  m.cloth.userData.hasBump = true;
  m.metal.color.set(a.accent).lerp(new THREE.Color('#aeb7bd'), 0.72);
  m.metal.roughness = Math.max(0.23, a.roughness * 0.6);
  u.uAccent.value.set(a.accent);
  u.uSeed.value = ((a.textureSeed % 997) / 997) * 10;
  u.uSkinStrength.value = a.strength;
  for (let i = 0; i < 4; i++) {
    const l = layers[i];
    u.uSkinLayers.value[i].set(
      l ? PATTERNS.indexOf(l.pattern) : 0,
      l?.scale ?? 5,
      l?.weight ?? 0,
      l?.angle ?? 0,
    );
    u.uSkinWarps.value.setComponent(i, l?.warp ?? 0);
  }
}
