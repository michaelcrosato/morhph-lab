/** Real pinned Three.js adapter tests. Not GPU rendering or Rapier gameplay.
 * This file must fail to load when Three.js is missing; no substitute is used. */
import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';
import {preset} from '../src/core/genome.js';import {CLASSIC_PARTS} from '../src/core/classic-catalog.js';
import {createMaterials,updateMaterials} from '../src/creature/materials.js';import {tidalPartFactory} from '../src/creature/tidal-parts.js';
import {compileTidalPart,sampleTidalPart} from '../src/core/tidal-geometry.js';import {disposeObject} from '../src/creature/surface.js';
test('actual engine is r181',()=>assert.equal(THREE.REVISION,'181'));
for(const type of Object.keys(CLASSIC_PARTS))for(let variant=0;variant<3;variant++)test(type+'/'+variant+': real Three adapter uses shared vertex buffers and materials',()=>{
 const g=preset('mossback'),materials=createMaterials(g),p={type,variant,size:.8,length:1.2,flex:.8,phase:.17,side:1,mirrorSide:1,twist:.1,bend:.2,material:'inherit'},runtime=tidalPartFactory(p,{materials}),plan=compileTidalPart(p);
 try{assert.ok(runtime.group instanceof THREE.Group);for(const time of [0,.31,1.7,.31]){const pose={layers:{flex:.8,gaze:1,blink:1,jaw:1},jaw:.3,speed:0};runtime.update(time,0,pose);const expected=sampleTidalPart(plan,time,pose);for(const [i,mesh] of runtime.group.children.entries()){assert.ok(mesh.isMesh);assert.deepEqual(mesh.geometry.attributes.position.array,expected[i].positions);assert.deepEqual(mesh.geometry.attributes.normal.array,expected[i].normals);assert.deepEqual(mesh.geometry.index.array,expected[i].indices);}}
  if(type==='leg'){const joints={hip:[.3,.5,.2],knee:[.5,-.1,.1],foot:[.6,-.7,.4],footYaw:.2};runtime.setLegPose(joints);const expected=sampleTidalPart(plan,0,{walker:joints});for(const [i,mesh] of runtime.group.children.entries())assert.deepEqual(mesh.geometry.attributes.position.array,expected[i].positions);}
  const geometries=runtime.group.children.map(m=>m.geometry);g.appearance.color='#102030';updateMaterials(materials,g);runtime.refreshMaterials();for(const [i,mesh] of runtime.group.children.entries()){assert.equal(mesh.geometry,geometries[i]);const material=materials[plan.components[i].material];assert.ok(mesh.material.color.equals(material.color));assert.equal(mesh.material.onBeforeCompile,material.onBeforeCompile);assert.equal(mesh.material.side,THREE.DoubleSide);}
 }finally{disposeObject(runtime.group,Object.values(materials).filter(x=>x?.isMaterial));}
});
