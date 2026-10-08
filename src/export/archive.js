/** Deterministic ZIP (STORE) and SHA-256. No network, Node, or secure-context API.
 * ZIP64, compression, imported archives, and executable entries are not supported.
 */
const utf8=new TextEncoder();
const table=Uint32Array.from({length:256},(_,n)=>{let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;return c>>>0;});
export function crc32(bytes){let c=0xffffffff;for(const x of bytes)c=table[(c^x)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
export function archive(entries,maxBytes=80*1024*1024){
  if(!Array.isArray(entries)||!entries.length||entries.length>100)throw new Error('Archive requires 1–100 entries.');
  const seen=new Set();let offset=0;const files=[];
  for(const item of entries){const name=item.name;
    if(typeof name!=='string'||name.length>100||!name.match(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/)||name.includes('..')||seen.has(name))throw new Error('Unsafe or duplicate archive filename.');seen.add(name);
    const bytes=typeof item.data==='string'?utf8.encode(item.data):item.data;
    if(!(bytes instanceof Uint8Array))throw new Error('Archive data must be text or bytes.');
    const path=utf8.encode(name),crc=crc32(bytes);files.push({path,bytes,crc,offset});offset+=30+path.length+bytes.length;
  }
  const centralStart=offset,centralSize=files.reduce((n,f)=>n+46+f.path.length,0),total=offset+centralSize+22;
  if(total>maxBytes)throw new Error('Archive exceeds its size limit.');
  const out=new Uint8Array(total),v=new DataView(out.buffer),u16=(at,n)=>v.setUint16(at,n,true),u32=(at,n)=>v.setUint32(at,n,true);
  for(const f of files){const p=f.offset;u32(p,0x04034b50);u16(p+4,20);u16(p+6,0x800);u16(p+8,0);u16(p+10,0);u16(p+12,33);u32(p+14,f.crc);u32(p+18,f.bytes.length);u32(p+22,f.bytes.length);u16(p+26,f.path.length);out.set(f.path,p+30);out.set(f.bytes,p+30+f.path.length);
    const c=offset;u32(c,0x02014b50);u16(c+4,20);u16(c+6,20);u16(c+8,0x800);u16(c+10,0);u16(c+12,0);u16(c+14,33);u32(c+16,f.crc);u32(c+20,f.bytes.length);u32(c+24,f.bytes.length);u16(c+28,f.path.length);u32(c+42,p);out.set(f.path,c+46);offset+=46+f.path.length;
  }
  u32(offset,0x06054b50);u16(offset+8,files.length);u16(offset+10,files.length);u32(offset+12,centralSize);u32(offset+16,centralStart);return out;
}
const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const rotr=(x,n)=>(x>>>n)|(x<<(32-n));
export function sha256(input){const bytes=typeof input==='string'?utf8.encode(input):input;if(!(bytes instanceof Uint8Array))throw new Error('SHA-256 input must be text or bytes.');
  const n=Math.ceil((bytes.length+9)/64)*64,padded=new Uint8Array(n);padded.set(bytes);padded[bytes.length]=128;const view=new DataView(padded.buffer),bits=bytes.length*8;view.setUint32(n-8,Math.floor(bits/4294967296));view.setUint32(n-4,bits>>>0);
  const H=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]),w=new Uint32Array(64);
  for(let p=0;p<n;p+=64){for(let i=0;i<16;i++)w[i]=view.getUint32(p+i*4);for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rotr(x,7)^rotr(x,18)^(x>>>3))+w[i-7]+(rotr(y,17)^rotr(y,19)^(y>>>10)))>>>0;}
    let [a,b,c,d,e,f,g,h]=H;for(let i=0;i<64;i++){const t1=(h+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+K[i]+w[i])>>>0,t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;h=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}
    for(const [i,x] of [a,b,c,d,e,f,g,h].entries())H[i]=(H[i]+x)>>>0;
  }return [...H].map(x=>x.toString(16).padStart(8,'0')).join('');
}
export function safeAssetName(name){let s=String(name||'asset').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').slice(0,64)||'asset';if(/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(s))s='asset-'+s;return s;}
