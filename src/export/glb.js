/** Minimal glTF 2.0 binary writer. No renderer or DOM dependency.
 * Scope: indexed triangle meshes, linear vertex colors, metallic/roughness
 * materials, and sampled POSITION/NORMAL morph animation. Not a general importer.
 */
const encoder = new TextEncoder();
const WIDTH = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4};
const ALIGN = n => (n + 3) & ~3;
export class GLBWriter {
  constructor(name = 'Morph Lab asset') {
    this.json = {asset:{version:'2.0',generator:'Morph Lab 11.0.0 / portable CPU geometry'},scene:0,
      scenes:[{name,nodes:[0]}],nodes:[{name,children:[]}],meshes:[],materials:[],accessors:[],bufferViews:[],buffers:[]};
    this.chunks = []; this.byteLength = 0;
  }
  accessor(array, type, {target, bounds=false, name} = {}) {
    const width = WIDTH[type];
    if(!width || !ArrayBuffer.isView(array) || !array.length || array.length % width) throw new Error('Invalid accessor shape.');
    const componentType = array instanceof Float32Array ? 5126 : array instanceof Uint32Array ? 5125 : array instanceof Uint16Array ? 5123 : null;
    if(!componentType) throw new Error('Unsupported accessor component type.');
    const min=Array(width).fill(Infinity),max=Array(width).fill(-Infinity);
    for(let i=0;i<array.length;i++) {const n=array[i];if(!Number.isFinite(n)) throw new Error('Non-finite binary data.');const k=i%width;min[k]=Math.min(min[k],n);max[k]=Math.max(max[k],n);}
    const offset=ALIGN(this.byteLength),view={buffer:0,byteOffset:offset,byteLength:array.byteLength};
    if(target) view.target=target;
    const bufferView=this.json.bufferViews.push(view)-1;
    // Copy the view only. Buffer offsets must not copy unrelated source data.
    this.chunks.push({offset,bytes:new Uint8Array(array.buffer,array.byteOffset,array.byteLength).slice()});
    this.byteLength=offset+array.byteLength;
    const accessor={bufferView,byteOffset:0,componentType,count:array.length/width,type};
    if(bounds) Object.assign(accessor,{min,max});
    if(name) accessor.name=name;
    return this.json.accessors.push(accessor)-1;
  }
  finish(maxBytes=64*1024*1024) {
    if(!this.json.meshes.length) throw new Error('Cannot export an empty GLB.');
    const binLength=ALIGN(this.byteLength);this.json.buffers=[{byteLength:binLength}];
    const text=encoder.encode(JSON.stringify(this.json)),jsonLength=ALIGN(text.length),length=12+8+jsonLength+8+binLength;
    if(length>maxBytes) throw new Error(`GLB exceeds the ${Math.floor(maxBytes/1048576)} MiB limit. Use fewer samples.`);
    const bytes=new Uint8Array(length),view=new DataView(bytes.buffer);
    view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,length,true);
    view.setUint32(12,jsonLength,true);view.setUint32(16,0x4e4f534a,true);bytes.fill(32,20,20+jsonLength);bytes.set(text,20);
    const binHeader=20+jsonLength,binStart=binHeader+8;
    view.setUint32(binHeader,binLength,true);view.setUint32(binHeader+4,0x004e4942,true);
    for(const c of this.chunks) bytes.set(c.bytes,binStart+c.offset);
    return bytes;
  }
}
/** Strict reader for files emitted by this writer, used for independent round trips.
 * External arbitrary GLB files are not accepted by the application UI. */
export function readDeliveryGLB(input) {
  const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
  if(bytes.byteLength<28||bytes.byteLength>64*1024*1024) throw new Error('Invalid GLB size.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(view.getUint32(0,true)!==0x46546c67||view.getUint32(4,true)!==2||view.getUint32(8,true)!==bytes.byteLength) throw new Error('Invalid GLB header.');
  const len=view.getUint32(12,true);
  if(len%4||view.getUint32(16,true)!==0x4e4f534a||len+28>bytes.length) throw new Error('Invalid GLB JSON chunk.');
  const json=JSON.parse(new TextDecoder().decode(bytes.subarray(20,20+len))),at=20+len,bl=view.getUint32(at,true);
  if(view.getUint32(at+4,true)!==0x004e4942||bl%4||at+8+bl!==bytes.length||json.buffers?.length!==1||json.buffers[0].uri||json.buffers[0].byteLength!==bl) throw new Error('Invalid GLB binary chunk.');
  const binary=bytes.subarray(at+8),constructors={5126:Float32Array,5123:Uint16Array,5125:Uint32Array};
  function accessor(index) {
    const a=json.accessors?.[index],b=json.bufferViews?.[a?.bufferView],C=constructors[a?.componentType],w=WIDTH[a?.type];
    if(!a||!b||!C||!w||b.buffer!==0||b.byteStride||a.sparse||!Number.isInteger(a.count)||a.count<1) throw new Error('Unsupported delivery accessor.');
    const start=(b.byteOffset||0)+(a.byteOffset||0),size=a.count*w*C.BYTES_PER_ELEMENT;
    if(start<0||start%C.BYTES_PER_ELEMENT||size>b.byteLength||(a.byteOffset||0)+size>b.byteLength||start+size>binary.length) throw new Error('Accessor outside binary buffer.');
    return new C(Uint8Array.from(binary.subarray(start,start+size)).buffer);
  }
  return {json,binary,accessor};
}
/** Decode one sampled animation pose. This is a test/inspection utility, not a
 * general-purpose glTF player. Every emitted animation channel targets weights. */
export function deliveryPose(glb, time=0) {
  const file=glb.accessor?glb:readDeliveryGLB(glb),{json,accessor}=file,weights=new Map();
  if(!Number.isFinite(time)) throw new Error('Animation time must be finite.');
  const animation=json.animations?.[0];
  for(const channel of animation?.channels||[]) {
    const s=animation.samplers[channel.sampler],times=accessor(s.input),values=accessor(s.output),count=values.length/times.length;
    let lo=0;while(lo<times.length-1&&times[lo+1]<=time)lo++;
    const hi=Math.min(times.length-1,lo+1),t=hi===lo?0:Math.max(0,Math.min(1,(time-times[lo])/(times[hi]-times[lo])));
    weights.set(channel.target.node,Array.from({length:count},(_,k)=>values[lo*count+k]*(1-t)+values[hi*count+k]*t));
  }
  const meshes=[];
  for(let ni=0;ni<json.nodes.length;ni++) {const node=json.nodes[ni];if(node.mesh===undefined)continue;
    const m=json.meshes[node.mesh],w=weights.get(ni)||node.weights||m.weights||[];
    for(const p of m.primitives) {
      const positions=accessor(p.attributes.POSITION),normals=accessor(p.attributes.NORMAL);
      for(let j=0;j<(p.targets?.length||0);j++) if(w[j]) {const d=accessor(p.targets[j].POSITION),n=accessor(p.targets[j].NORMAL);for(let i=0;i<positions.length;i++){positions[i]+=d[i]*w[j];normals[i]+=n[i]*w[j];}}
      for(let i=0;i<normals.length;i+=3){const l=Math.hypot(normals[i],normals[i+1],normals[i+2])||1;normals[i]/=l;normals[i+1]/=l;normals[i+2]/=l;}
      meshes.push({name:node.name,positions,normals,indices:accessor(p.indices),colors:accessor(p.attributes.COLOR_0),material:p.material});
    }
  }
  return meshes;
}
