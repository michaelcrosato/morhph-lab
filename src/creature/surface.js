import * as THREE from 'three';
import {compileBodySurface} from '../core/mesher.js';
/** Thin Three adapter over the engine-independent meshing algorithm. */
export function buildBodySurface(nodes,quality=1){
  const data=compileBodySurface(nodes,quality),g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(data.positions,3));
  g.setAttribute('normal',new THREE.BufferAttribute(data.normals,3));
  g.setAttribute('uv',new THREE.BufferAttribute(data.uvs,2));
  g.setIndex(new THREE.BufferAttribute(data.indices,1));
  g.computeBoundingSphere();g.computeBoundingBox();
  g.userData={voxelStep:data.voxelStep,cells:data.cells};return g;
}
/** Variable-radius tube, independent of imported meshes or animation clips. */
export function sweptTube(path,radius,segments=24,radial=12){
  const pos=[],uv=[],ind=[],a=new THREE.Vector3(),b=new THREE.Vector3(),tangent=new THREE.Vector3(),normal=new THREE.Vector3(),binormal=new THREE.Vector3();
  for(let i=0;i<=segments;i++){
    const t=i/segments,p=path(t),r=radius(t);a.fromArray(path(Math.max(0,t-.002)));b.fromArray(path(Math.min(1,t+.002)));tangent.subVectors(b,a).normalize();
    normal.crossVectors(tangent,Math.abs(tangent.z)<.9?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0)).normalize();binormal.crossVectors(tangent,normal).normalize();
    for(let j=0;j<=radial;j++){const angle=j/radial*Math.PI*2,c=Math.cos(angle)*r,s=Math.sin(angle)*r;pos.push(p[0]+normal.x*c+binormal.x*s,p[1]+normal.y*c+binormal.y*s,p[2]+normal.z*c+binormal.z*s);uv.push(j/radial,t);}
  }
  for(let i=0;i<segments;i++)for(let j=0;j<radial;j++){const a=i*(radial+1)+j,b=a+radial+1;ind.push(a,a+1,b,a+1,b+1,b);}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ind);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
export function disposeObject(root,extraMaterials=[],extraGeometry=[]){
  const gs=new Set(extraGeometry),ms=new Set(extraMaterials),ts=new Set();
  root.traverse(o=>{if(o.geometry)gs.add(o.geometry);for(const m of (Array.isArray(o.material)?o.material:[o.material]))if(m)ms.add(m);});
  for(const m of ms)for(const value of Object.values(m))if(value?.isTexture)ts.add(value);
  for(const g of gs)g.dispose();for(const t of ts)t.dispose();for(const m of ms)m.dispose();root.removeFromParent();
}
