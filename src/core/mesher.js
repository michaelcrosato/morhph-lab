import {field,fieldNormal} from './anatomy.js';
import {sub,cross,dot} from './math.js';
const TETS=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]];
const CORNERS=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]];
/** Smooth-union ellipsoids -> an indexed, smooth-shaded marching-tetrahedra mesh.
 * Adaptive voxel spacing bounds work even for large imported creatures. */
export function compileBodySurface(nodes,quality=1){
  if(!nodes.length || !Number.isFinite(quality) || quality<.5 || quality>2)throw new Error('Mesher requires body nodes and quality between 0.5 and 2.');
  const min=[0,1,2].map(a=>Math.min(...nodes.map(n=>n.center[a]-n.radii[a]-(nodes.length>1?.28*n.radii[a]/Math.min(...n.radii):0)))-.10);
  const max=[0,1,2].map(a=>Math.max(...nodes.map(n=>n.center[a]+n.radii[a]+(nodes.length>1?.28*n.radii[a]/Math.min(...n.radii):0)))+.10);
  const extent=max.map((v,i)=>v-min[i]);
  const step=Math.max(.105/quality,Math.cbrt(extent[0]*extent[1]*extent[2]/(43000*quality)));
  const size=extent.map(v=>Math.ceil(v/step)+1),[nx,ny,nz]=size;
  const values=new Float32Array(nx*ny*nz), index=(x,y,z)=>x+nx*(y+ny*z);
  for(let z=0;z<nz;z++)for(let y=0;y<ny;y++)for(let x=0;x<nx;x++)values[index(x,y,z)]=field([min[0]+x*step,min[1]+y*step,min[2]+z*step],nodes);
  const positions=[],normals=[],uvs=[],indices=[],edgeCache=new Map();
  function edge(a,b,ids,points,vals){
    const idA=ids[a],idB=ids[b],key=idA<idB?idA+','+idB:idB+','+idA;
    if(edgeCache.has(key))return edgeCache.get(key);
    const t=vals[a]/(vals[a]-vals[b]),p=points[a].map((v,i)=>v+(points[b][i]-v)*t),n=fieldNormal(p,nodes);
    const id=positions.length/3;positions.push(...p);normals.push(...n);uvs.push(p[0]*.4,p[2]*.4);edgeCache.set(key,id);return id;
  }
  function triangle(a,b,c){
    const p=positions.slice(a*3,a*3+3),q=positions.slice(b*3,b*3+3),r=positions.slice(c*3,c*3+3),n=normals.slice(a*3,a*3+3);
    if(dot(cross(sub(q,p),sub(r,p)),n)<0)indices.push(a,c,b);else indices.push(a,b,c);
  }
  for(let z=0;z<nz-1;z++)for(let y=0;y<ny-1;y++)for(let x=0;x<nx-1;x++){
    const ids=CORNERS.map(c=>index(x+c[0],y+c[1],z+c[2])),vals=ids.map(id=>values[id]);
    if(vals.every(v=>v>=0)||vals.every(v=>v<0))continue;
    const points=CORNERS.map(c=>[min[0]+(x+c[0])*step,min[1]+(y+c[1])*step,min[2]+(z+c[2])*step]);
    for(const tet of TETS){
      const inside=tet.filter(i=>vals[i]<0),outside=tet.filter(i=>vals[i]>=0);
      if(!inside.length||!outside.length)continue;
      if(inside.length===1||outside.length===1){const a=(inside.length===1?inside:outside)[0],others=inside.length===1?outside:inside;triangle(...others.map(b=>edge(a,b,ids,points,vals)));}
      else{const [a,b]=inside,[c,d]=outside,p=edge(a,c,ids,points,vals),q=edge(a,d,ids,points,vals),r=edge(b,c,ids,points,vals),s=edge(b,d,ids,points,vals);triangle(p,q,r);triangle(q,s,r);}
    }
  }
  return {positions:new Float32Array(positions),normals:new Float32Array(normals),uvs:new Float32Array(uvs),indices:new Uint32Array(indices),voxelStep:step,cells:(nx-1)*(ny-1)*(nz-1)};
}
