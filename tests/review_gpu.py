"""Full WebGL2 runtime capture test. Requires an engine-embedded build.
No mocks, and no success-on-skip path. Also run the separate Rapier tests.
"""
import base64,json,os
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
info=json.loads((ROOT/'dist/build-info.json').read_text())
if info['edition']!='offline':raise RuntimeError('Run npm install and npm run build -- --offline before this GPU test.')
with sync_playwright() as p:
    launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
    binary=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None)
    if binary:launch['executable_path']=binary
    browser=p.chromium.launch(**launch);page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.set_content((ROOT/'dist/runtime.html').read_text());page.wait_for_function('window.morphLab?.ready',timeout=45000)
    versions=page.evaluate('morphLab.versions()');assert versions=={'three':'181','rapier':'0.19.3','webgl2':True},versions
    before=page.evaluate('morphLab.snapshot().genome')
    capture=page.evaluate('morphLab.captureRuntimeReview({size:256,time:.8})')
    assert all(v['triangles']>0 and v['drawCalls']>0 for v in capture['manifest']['views'])
    assert capture['manifest']['blueprint']==before
    assert page.evaluate('morphLab.snapshot().genome')==before
    again=page.evaluate('morphLab.captureRuntimeReview({size:256,time:.8})');assert capture['image']==again['image']
    assert page.evaluate('async uri=>{const image=await createImageBitmap(await(await fetch(uri)).blob()),c=document.createElement("canvas");c.width=image.width;c.height=image.height;const ctx=c.getContext("2d");ctx.drawImage(image,0,0);return new Set(ctx.getImageData(0,0,c.width,c.height).data).size>40}',capture['image'])
    (OUT/'v5-runtime-review.png').write_bytes(base64.b64decode(capture['image'].split(',')[1]))
    (OUT/'v5-runtime-review.json').write_text(json.dumps(capture['manifest'],indent=2))
    assert not errors,errors
    print(json.dumps({'status':'passed','versions':versions,'views':4,'imageRepeatable':True,'physicsTested':False}));browser.close()
