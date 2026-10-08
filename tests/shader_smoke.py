"""Compile and draw the actual pigment GLSL in a raw WebGL2 context.
This verifies these shader functions, not Three.js material integration.
"""
from pathlib import Path
import json, os, subprocess
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
shaders=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as s from './src/creature/shaders.js';console.log(JSON.stringify(s));"],cwd=ROOT,text=True))
fragment='#version 300 es\nprecision highp float;\nin vec2 uv;out vec4 color;uniform vec4 layers[4];uniform vec4 warps;\n'+shaders['SKIN_NOISE_GLSL']+shaders['SKIN_PATTERN_GLSL']+'\nvoid main(){float p=layeredPigment(vec3(uv*4.0,uv.y),layers,warps,1.37);color=vec4(vec3(.1+p*.8),1.0);}'
vertex='#version 300 es\nout vec2 uv;void main(){vec2 pos=vec2((gl_VertexID==1)?3.0:-1.0,(gl_VertexID==2)?3.0:-1.0);uv=pos*.5+.5;gl_Position=vec4(pos,0.,1.);}'
with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']}
    if os.environ.get('CHROMIUM_PATH'):launch['executable_path']=os.environ['CHROMIUM_PATH']
    elif Path('/usr/bin/chromium').exists():launch['executable_path']='/usr/bin/chromium'
    browser=p.chromium.launch(**launch);page=browser.new_page();page.set_content('<canvas id="shader" width="64" height="64"></canvas>')
    result=page.evaluate('''({vertex,fragment})=>{
      const canvas=document.querySelector('#shader'),gl=canvas.getContext('webgl2',{preserveDrawingBuffer:true});
      if(!gl)return {webgl2:false,status:'blocked',reason:'WebGL2 is unavailable in the test browser.'};
      const compile=(type,code)=>{const shader=gl.createShader(type);gl.shaderSource(shader,code);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));return shader;};
      const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment),program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));gl.useProgram(program);
      const u=gl.getUniformLocation(program,'layers[0]'),w=gl.getUniformLocation(program,'warps');gl.uniform4f(w,.45,.45,.45,.45);gl.viewport(0,0,64,64);const patterns=[];
      for(let kind=0;kind<34;kind++){
        gl.uniform4fv(u,new Float32Array([kind,5,1,0,0,5,0,0,0,5,0,0,0,5,0,0]));gl.drawArrays(gl.TRIANGLES,0,3);gl.finish();
        const pixels=new Uint8Array(64*64*4);gl.readPixels(0,0,64,64,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let min=255,max=0,sum=0;
        for(let i=0;i<pixels.length;i+=4){min=Math.min(min,pixels[i]);max=Math.max(max,pixels[i]);sum+=pixels[i];}
        if(kind>0&&max-min<4)throw new Error('Pattern '+kind+' has no visible variation.');
        if(gl.getError()!==gl.NO_ERROR)throw new Error('WebGL error after pattern '+kind);patterns.push({id:kind,min,max,mean:sum/4096});
      }
      gl.deleteProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);return {webgl2:true,vertexCompiled:true,fragmentCompiled:true,programLinked:true,patterns,version:gl.getParameter(gl.VERSION)};
    }''',{'vertex':vertex,'fragment':fragment})
    browser.close()
result.setdefault('status','passed')
result.update({'scope':'Raw WebGL2 pigment functions only','three_material_integration_tested':False,'rapier_tested':False})
(OUT/'v7-shader-report.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))

if not result.get('webgl2'):
    raise SystemExit(2)
