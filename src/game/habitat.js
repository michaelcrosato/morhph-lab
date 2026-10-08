import * as THREE from 'three';
import {rng,TAU} from '../core/math.js';
import {makeTravelLevel} from '../core/travel-level.js';
import {makeLevel} from '../core/level.js';
import {disposeObject} from '../creature/surface.js';
function material(color,roughness=.8){return new THREE.MeshStandardMaterial({color,roughness});}
export class Habitat {
  constructor(seed=810,travel={medium:'ground'}){
    this.medium=travel.medium;this.level=this.medium==='ground'?makeLevel(seed):makeTravelLevel(seed,this.medium);this.root=new THREE.Group();this.solids=[];this.balls=new Map();this.spores=new Map();this.bursts=[];const r=rng(seed);
    const mesh=(g,m,pos=[0,0,0])=>{const o=new THREE.Mesh(g,m);o.position.fromArray(pos);o.receiveShadow=true;o.castShadow=true;this.root.add(o);return o;};
    mesh(new THREE.CylinderGeometry(22,22,.5,100),material(this.medium==='water'?'#528c98':this.medium==='air'?'#889ba1':'#829780'),[0,-.25,0]);mesh(new THREE.CylinderGeometry(22,21.4,.6,100),material('#697767'),[0,-.76,0]);
    const stone=material('#657775'),moss=material('#718578'),ballMat=material('#c69968',.55);
    for(const rock of this.level.rocks){
      const geo=new THREE.DodecahedronGeometry(1,1),p=geo.attributes.position;
      for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),w=1+Math.sin(x*13+y*7+z*19+rock.seed)*.08;p.setXYZ(i,x*rock.radius*w,y*rock.height*w,z*rock.radius*w);}geo.computeVertexNormals();
      const o=mesh(geo,rock.seed%2?stone:moss,[rock.x,rock.height*.63,rock.z]);this.solids.push({vertices:new Float32Array(p.array),position:o.position.toArray()});
    }
    for(const b of this.level.balls){const o=mesh(new THREE.IcosahedronGeometry(b.radius,2),ballMat,[b.x,b.radius+.12,b.z]);this.balls.set(b.id,o);}
    const ramp=this.level.ramp;const rampMesh=mesh(new THREE.BoxGeometry(ramp.width*2,ramp.height*2,ramp.depth*2),material('#a5b29a'),[ramp.x,ramp.y,ramp.z]);rampMesh.rotation.x=ramp.angle;
    const podMaterial=new THREE.MeshStandardMaterial({color:'#f5c971',emissive:'#d88d22',emissiveIntensity:.4,roughness:.32});
    const stemMat=material('#446857');
    for(const s of this.level.spores){
      const group=new THREE.Group();group.position.set(s.x,s.y,s.z);group.userData.baseY=s.y;this.root.add(group);
      const gem=new THREE.Mesh(new THREE.IcosahedronGeometry(.22,1),podMaterial);gem.castShadow=true;group.add(gem);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.37,.016,6,36),podMaterial);ring.rotation.x=Math.PI/2;ring.position.y=-.12;group.add(ring);
      for(let i=0;i<3;i++){const a=i/3*TAU,leaf=new THREE.Mesh(new THREE.SphereGeometry(1,10,6),stemMat);leaf.scale.set(.08,.04,.25);leaf.position.set(Math.sin(a)*.15,-.27,Math.cos(a)*.15);leaf.rotation.y=a;group.add(leaf);}
      this.spores.set(s.id,group);
    }
    if(this.medium==='ground'){
    // A deterministic instanced meadow: 360 tapered triangular grass blades.
    const grassGeo=new THREE.BufferGeometry();grassGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.045,0,0,.045,0,0,.055,.48,.03],3));grassGeo.computeVertexNormals();
    const grass=new THREE.InstancedMesh(grassGeo,new THREE.MeshStandardMaterial({color:'#536f54',side:THREE.DoubleSide,roughness:1}),360),dummy=new THREE.Object3D();
    for(let i=0;i<360;i++){const a=r()*TAU,rad=3+r()*18;dummy.position.set(Math.cos(a)*rad,.01,Math.sin(a)*rad);dummy.rotation.y=r()*TAU;dummy.scale.setScalar(.55+r()*1.2);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}grass.receiveShadow=true;this.root.add(grass);
    // Fungal silhouettes are lathed from code, not image cards or imported assets.
    const capGeo=new THREE.LatheGeometry([new THREE.Vector2(0,.46),new THREE.Vector2(.15,.44),new THREE.Vector2(.42,.3),new THREE.Vector2(.5,.14),new THREE.Vector2(.42,.06),new THREE.Vector2(.10,.08)],18);
    const capMat=material('#b3be95'),stalkGeo=new THREE.CylinderGeometry(.10,.16,.7,10);
    for(let i=0;i<13;i++){const a=r()*TAU,rad=16+r()*4,x=Math.cos(a)*rad,z=Math.sin(a)*rad;mesh(stalkGeo,stemMat,[x,.35,z]);mesh(capGeo,capMat,[x,.66,z]);}
    }else{
      const water=this.medium==='water',reed=material(water?'#286a70':'#c3d3d5'),trim=new THREE.MeshBasicMaterial({color:water?'#89e0db':'#e9d3a0',transparent:true,opacity:.48});
      // Rings show the legal travel volume. They are visual boundaries only.
      for(const y of [1.4,6.2,11]){const rim=mesh(new THREE.TorusGeometry(19.5,.022,6,100),trim,[0,y,0]);rim.rotation.x=Math.PI/2;}
      for(let i=0;i<26;i++){const a=i/26*TAU,rad=14+r()*5,h=1+r()*2.5,x=Math.cos(a)*rad,z=Math.sin(a)*rad;
        if(water){const stalk=mesh(new THREE.CylinderGeometry(.025,.10,h,6),reed,[x,h*.5,z]);stalk.rotation.z=Math.sin(a)*.18;for(let k=1;k<4;k++){const leaf=mesh(new THREE.SphereGeometry(1,8,6),reed,[x+.13*Math.sin(k),h*k/4,z],[1,1,1]);leaf.scale.set(.11,.36,.04);leaf.rotation.z=k*.9;}}
        else{const cloud=mesh(new THREE.IcosahedronGeometry(1,1),reed,[x,7+r()*4,z]);cloud.scale.set(1.4,.45,.75);cloud.castShadow=false;}
      }
      if(water){const surface=mesh(new THREE.CircleGeometry(21.8,96),new THREE.MeshStandardMaterial({color:'#6cbabe',transparent:true,opacity:.14,side:THREE.DoubleSide,depthWrite:false,roughness:.3}),[0,11.5,0]);surface.rotation.x=-Math.PI/2;surface.castShadow=false;}
    }
    this.root.visible=false;
  }
  collect(id){const s=this.spores.get(id);if(!s||!s.visible)return;s.visible=false;const mat=new THREE.MeshBasicMaterial({color:'#ffe0a0',transparent:true,opacity:1});const ring=new THREE.Mesh(new THREE.TorusGeometry(.35,.025,6,36),mat);ring.rotation.x=Math.PI/2;ring.position.copy(s.position);this.root.add(ring);this.bursts.push({mesh:ring,age:0});}
  update(time,dt,simulation){
    for(const [id,group] of this.spores){group.position.y=(group.userData.baseY??.55)+Math.sin(time*2+Number(id.slice(5)))*.07;group.children[0].rotation.y=time*.55;}
    for(const [id,o] of this.balls){const body=simulation?.dynamic.get(id);if(body){const p=body.translation(),q=body.rotation();o.position.set(p.x,p.y,p.z);o.quaternion.set(q.x,q.y,q.z,q.w);}}
    this.bursts=this.bursts.filter(b=>{b.age+=dt;b.mesh.scale.setScalar(1+b.age*5);b.mesh.material.opacity=Math.max(0,1-b.age*1.7);if(b.age>.65){disposeObject(b.mesh);return false;}return true;});
  }
  dispose(){disposeObject(this.root);}
}
