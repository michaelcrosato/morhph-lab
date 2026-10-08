import {sampleReviewPigment} from './pigment.js';
import {normalize,cross,dot} from './math.js';
import {stretchData,compareMasks} from './audit.js';
export const VIEWS={front:{label:'Front · +Z',yaw:0,pitch:0},right:{label:'Right · +X',yaw:Math.PI/2,pitch:0},back:{label:'Back · −Z',yaw:Math.PI,pitch:0},quarter:{label:'Three-quarter',yaw:.7,pitch:.18},flight:{label:'Raised three-quarter',yaw:.72,pitch:.60},top:{label:'Top · +Y',yaw:0,pitch:Math.PI/2}};
export const SHADINGS=['clay','silhouette','normals','wire','material','pattern','stretch'];
export function fitFrame(snapshots){const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(const s of snapshots)for(let k=0;k<3;k++){min[k]=Math.min(min[k],s.bounds.min[k]);max[k]=Math.max(max[k],s.bounds.max[k]);}const extent=max.map((v,i)=>v-min[i]),center=min.map((v,i)=>(v+max[i])/2);return {center,span:Math.max(extent[1],Math.hypot(extent[0],extent[2]),.1)*1.22};}
export function projection(frame,view,width,height){const v=typeof view==='string'?VIEWS[view]:view;if(!v)throw new Error('Unknown camera.');const back=[Math.sin(v.yaw)*Math.cos(v.pitch),Math.sin(v.pitch),Math.cos(v.yaw)*Math.cos(v.pitch)],right=[Math.cos(v.yaw),0,-Math.sin(v.yaw)],up=cross(back,right),scale=Math.min(width,height)/frame.span;return p=>{const d=p.map((x,i)=>x-frame.center[i]);return [width/2+dot(d,right)*scale,height/2-dot(d,up)*scale,dot(d,back)];};}
/** Deterministic CPU depth-buffer renderer for geometry review. It does NOT
 * emulate the Three material pipeline. Material mode displays flat pigment. */
export function rasterize(snapshot,{width=384,height=384,view='front',frame=fitFrame([snapshot]),shading='clay'}={}){
  if(!SHADINGS.includes(shading)||!Number.isInteger(width)||!Number.isInteger(height)||width<16||height<16||width>2048||height>2048)throw new Error('Invalid review render settings.');
  const pixels=new Uint8ClampedArray(width*height*4),depth=new Float32Array(width*height).fill(-Infinity),mask=new Uint8Array(width*height),project=projection(frame,view,width,height);
  const background=[230,234,232];for(let i=0;i<pixels.length;i+=4){pixels[i]=background[0];pixels[i+1]=background[1];pixels[i+2]=background[2];pixels[i+3]=255;}
  const light=normalize([-.5,.8,1]),fill=normalize([.8,.3,-.5]);let fragments=0,outsideVertices=0;
  for(const mesh of snapshot.meshes){
    const n=mesh.positions.length/3,points=new Float32Array(n*3),colors=new Float32Array(n*3),base=['material','pattern'].includes(shading)?mesh.color||[162,179,173]:[172,186,180];
    let heat=null;if(shading==='stretch'){mesh._stretch??=stretchData(mesh);heat=mesh._stretch.heat;}
    for(let i=0;i<n;i++){
      const screen=project(mesh.positions.subarray(i*3,i*3+3));if(screen[0]<0||screen[0]>=width||screen[1]<0||screen[1]>=height)outsideVertices++;points.set(screen,i*3);const normal=mesh.normals.subarray(i*3,i*3+3);
      let color=shading==='pattern'&&['skin','membrane'].includes(mesh.material)?sampleReviewPigment(snapshot.blueprint.appearance,mesh.pigmentPositions?.subarray(i*3,i*3+3)||mesh.restPositions?.subarray(i*3,i*3+3)||mesh.positions.subarray(i*3,i*3+3),base):base;
      if(shading==='normals')color=Array.from(normal,x=>(x*.5+.5)*255);
      else if(shading==='stretch'){const h=Math.max(0,Math.min(1,((heat?.[i]||1)-1)/1.5));color=h<.5?[42+350*h,132+60*h,151-200*h]:[217,162-(h-.5)*240,51-(h-.5)*40];}
      else if(shading==='silhouette')color=[35,48,52];
      if(!['normals','silhouette','stretch'].includes(shading)){const brightness=.38+.54*Math.max(0,dot(normal,light))+.12*Math.max(0,dot(normal,fill));color=color.map(x=>Math.min(255,x*brightness));}
      colors.set(color,i*3);
    }
    const ind=mesh.indices;
    for(let t=0;t<ind.length;t+=3){
      const ia=ind[t]*3,ib=ind[t+1]*3,ic=ind[t+2]*3,ax=points[ia],ay=points[ia+1],bx=points[ib],by=points[ib+1],cx=points[ic],cy=points[ic+1];
      const den=(by-cy)*(ax-cx)+(cx-bx)*(ay-cy);if(!Number.isFinite(den)||Math.abs(den)<1e-8)continue;
      const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(width-1,Math.ceil(Math.max(ax,bx,cx))),y0=Math.max(0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(height-1,Math.ceil(Math.max(ay,by,cy)));
      if(x1<x0||y1<y0)continue;
      const d1x=(by-cy)/den,d1y=(cx-bx)/den,d2x=(cy-ay)/den,d2y=(ax-cx)/den;
      for(let y=y0;y<=y1;y++){
        let w1=d1x*(x0+.5-cx)+d1y*(y+.5-cy),w2=d2x*(x0+.5-cx)+d2y*(y+.5-cy);
        for(let x=x0;x<=x1;x++,w1+=d1x,w2+=d2x){const w3=1-w1-w2;if(w1<-.00001||w2<-.00001||w3<-.00001)continue;const z=w1*points[ia+2]+w2*points[ib+2]+w3*points[ic+2],id=y*width+x;if(z<=depth[id])continue;depth[id]=z;mask[id]=1;const p=id*4;fragments++;
          const wire=shading==='wire'&&Math.min(w1,w2,w3)<.05;
          for(let k=0;k<3;k++)pixels[p+k]=wire?42:w1*colors[ia+k]+w2*colors[ib+k]+w3*colors[ic+k];
        }
      }
    }
  }
  let clipped=0;for(let x=0;x<width;x++)clipped+=mask[x]+mask[(height-1)*width+x];for(let y=1;y<height-1;y++)clipped+=mask[y*width]+mask[y*width+width-1];
  return {pixels,mask,width,height,fragments,clipped:clipped||outsideVertices,outsideVertices};
}
export function differenceImage(a,b){if(a.width!==b.width||a.height!==b.height)throw new Error('Image dimensions must match.');const metric=compareMasks(a.mask,b.mask),pixels=new Uint8ClampedArray(a.pixels.length);for(let i=0;i<a.mask.length;i++){const x=!!a.mask[i],y=!!b.mask[i],color=x&&y?[91,110,113]:x?[36,153,178]:y?[226,124,69]:[230,234,232];pixels.set([...color,255],i*4);}return {...a,pixels,metric};}
export function drawRender(canvas,result,{snapshot=null,frame=null,view='front',bones=false,labels=false}={}){
  canvas.width=result.width;canvas.height=result.height;const ctx=canvas.getContext('2d');ctx.putImageData(new ImageData(result.pixels,result.width,result.height),0,0);
  if(!snapshot||!frame)return;const project=projection(frame,view,result.width,result.height);
  // Center line and ground reference do not change the comparison mask.
  ctx.save();ctx.strokeStyle='rgba(43,66,69,.16)';ctx.lineWidth=1;ctx.setLineDash([4,5]);const p=project([0,0,0]);ctx.beginPath();ctx.moveTo(0,p[1]);ctx.lineTo(canvas.width,p[1]);ctx.stroke();ctx.setLineDash([]);
  if(bones){ctx.strokeStyle='#cd673c';ctx.lineWidth=1.6;for(const b of snapshot.bones){const a=project(b.a),c=project(b.b);ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(c[0],c[1]);ctx.stroke();ctx.fillStyle='#f4d4a7';ctx.beginPath();ctx.arc(c[0],c[1],2.5,0,Math.PI*2);ctx.fill();}}
  if(labels){ctx.font='10px sans-serif';ctx.fillStyle='#23333b';for(const s of snapshot.sockets.filter(s=>/^(head|pelvis|hand|foot|chest)/.test(s.name))){const q=project(s.point);ctx.fillText(s.name,q[0]+5,q[1]-5);}}
  ctx.restore();
}
