"""Actual combined HTML, shared geometry, editor controls, and grouped downloads.
No substitute WebGL or physics implementation is used.
"""
from pathlib import Path
import json,re,os,hashlib,struct,zipfile
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/v11/browser';OUT.mkdir(parents=True,exist_ok=True);checks=[]
PARTS=['leg','eye','horn','tail','fin','mouth','wing','tentacle','antenna','shell','mandible','crest','clubtail','frill','claw','gill']
def check(label,value):
 if not value:raise AssertionError(label)
 checks.append(label)
def number(f,selector,value):f.locator(selector).evaluate('(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}',value)
def glb_json(raw):
 magic,version,n=struct.unpack_from('<III',raw,0)
 if (magic,version,n)!=(0x46546c67,2,len(raw)):raise ValueError('Bad GLB header')
 n=struct.unpack_from('<I',raw,12)[0];return json.loads(raw[20:20+n])
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
 ctx=browser.new_context(offline=True,accept_downloads=True,viewport={'width':1560,'height':1100});page=ctx.new_page();errors=[];requests=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
 html=(ROOT/'dist/Morph-Lab-Review.html').read_text();page.set_content(html,timeout=30000);f=page.frames[-1];f.wait_for_function('window.foundationReview?.ready',timeout=30000)
 check('Version 12 in combined shell','12.0.0' in page.locator('header').inner_text());check('All 89 presets retained',f.locator('#model-select option').count()==89)
 f.locator('#model-select').evaluate('e=>e.closest("details").open=true');before=f.evaluate('foundationReview.snapshot()');f.locator('#review-collection').select_option('classic');check('Completed-originals filter contains 24 sources',f.locator('#model-select option').count()==24);check('Filter leaves source and reviews unchanged',f.evaluate('foundationReview.snapshot()')==before)
 ids=f.locator('#model-select option').evaluate_all('es=>es.map(e=>e.value)')
 for id in ids:
  f.locator('#model-select').select_option(id);f.locator('#review-pose').select_option('motion-cycle');number(f,'#review-phase',.375);a=f.evaluate('foundationReview.audit()')
  check(id+' complete real geometry',a['excludedGenes']==0 and a['totals']['meshes']>1)
  check(id+' no failed technical checks',a['technicalStatus']!='fail')
  check(id+' visible fixed-view pixels',all(x['coverage']>150 for x in f.evaluate('foundationReview.renderStats()')))
 f.locator('#model-select').select_option('mossback');f.locator('#review-pose').select_option('motion-cycle');number(f,'#review-phase',.25);a=f.evaluate('foundationReview.getGeometry().meshes.filter(m=>m.name.includes("/leg/")).map(m=>Array.from(m.positions))');number(f,'#review-phase',.625)
 check('Shared original legs actually animate',a!=f.evaluate('foundationReview.getGeometry().meshes.filter(m=>m.name.includes("/leg/")).map(m=>Array.from(m.positions))'))
 f.locator('[data-review="fit"]').click();f.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(OUT/'v11-complete-desktop.png'),full_page=True)
 check('Desktop has no horizontal overflow',f.evaluate('document.documentElement.scrollWidth<=innerWidth+1'))
 before=f.evaluate('foundationReview.snapshot()');f.locator('[data-review="delivery"]').first.click();check('Original complete model export enabled',not f.locator('#delivery-build').is_disabled());check('Material grouping is default in UI',f.locator('#delivery-layout').input_value()=='material')
 f.locator('#delivery-mode').select_option('motion');f.locator('#delivery-build').click();f.wait_for_selector('#delivery-result:not([hidden])',timeout=90000)
 check('Summary reports original and final meshes','26 → 8 meshes' in f.locator('#delivery-summary').inner_text())
 with page.expect_download(timeout=30000) as dl:f.locator('#delivery-zip').click()
 path=OUT/'mossback-grouped.asset.zip';dl.value.save_as(str(path))
 with zipfile.ZipFile(path) as z:
  check('Grouped ZIP passes CRC',z.testzip() is None);m=json.loads(z.read('manifest.json'));audit=json.loads(z.read('audit.json'));g=glb_json(z.read('model.glb'))
  check('Grouped manifest conserves vertices and triangles',m['packing']['verticesRemoved']==0 and m['packing']['trianglesRemoved']==0 and m['packing']['changesShape'] is False)
  check('Every source component has a stored range',sum(len(n['extras']['sourceRanges']) for n in g['nodes'] if 'mesh' in n)==26)
  check('All original genes exported',m['geometry']['allActiveGenesIncluded'] is True and m['geometry']['allGenesIncluded'] is True)
  check('All sampled frames internally checked',audit['internalGLBRoundTrip']['checkedSamples']==9)
  check('File hashes are correct',all(hashlib.sha256(z.read(x['name'])).hexdigest()==x['sha256'] for x in m['files']))
  check('Source blueprint preserved',json.loads(z.read('source.morph.json'))==before['candidate'])
 check('Export leaves all session state unchanged',f.evaluate('foundationReview.snapshot()')==before)
 page.screenshot(path=str(OUT/'v11-grouped-export.png'),full_page=True)
 f.locator('#delivery-layout').select_option('separate');check('Layout change clears stale result',not f.locator('#delivery-result').is_visible());f.locator('#delivery-mode').select_option('static');f.locator('#delivery-build').click();f.wait_for_selector('#delivery-result:not([hidden])',timeout=90000)
 check('Separate option keeps 26 meshes','26 → 26 meshes' in f.locator('#delivery-summary').inner_text())
 f.locator('#asset-delivery [data-tool-close]').click();f.locator('#review-collection').select_option('all');f.locator('#model-select').select_option('wayfarer')
 # Use the public import API with a valid blueprint. Inactive genes stay in source.
 f.evaluate('''(()=>{const g=foundationReview.snapshot().candidate;g.parts.push({id:'inactive-walker',type:'leg',host:g.nodes[0].id,anchor:[1,0,0],size:1,length:1,bend:0,twist:0,phase:0,flex:1,variant:0,mirror:true,presence:1,material:'inherit'});foundationReview.setSource(g);})()''')
 a=f.evaluate('foundationReview.audit()');check('Humanoid inactive leg is not marked missing',a['excludedGenes']==0);check('Inactive humanoid leg is named in audit',any(x['id']=='inactive-walker' for x in a['inactiveGenes']));check('Inspector discloses inactive genes','inactive gene' in f.locator('#coverage-note').inner_text())
 f.locator('[data-review="delivery"]').first.click();f.locator('#delivery-build').click();f.wait_for_selector('#delivery-result:not([hidden])',timeout=90000)
 with page.expect_download() as dl:f.locator('#delivery-zip').click()
 path=OUT/'inactive-source.asset.zip';dl.value.save_as(str(path))
 with zipfile.ZipFile(path) as z:
  m=json.loads(z.read('manifest.json'));check('Manifest does not claim inactive geometry was emitted',m['geometry']['allActiveGenesIncluded'] and not m['geometry']['allGenesIncluded']);check('Inactive gene retained in exported blueprint',any(x['id']=='inactive-walker' for x in json.loads(z.read('source.morph.json'))['parts']))
 f.locator('#asset-delivery [data-tool-close]').click();f.locator('#model-select').select_option('mossback');f.locator('[data-review="fit"]').click();page.set_viewport_size({'width':390,'height':844});check('Mobile has no horizontal overflow',f.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));f.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(OUT/'v11-complete-mobile.png'),full_page=True)
 # Load a synthetic old approval through the actual file control. It must not survive.
 page.set_viewport_size({'width':1560,'height':1100});old=f.evaluate('foundationReview.snapshot()');old.pop('implementation',None);old['review']['decisions']={k:'accept' for k in old['review']['decisions']};old['review']['fingerprint']=f.evaluate('foundationReview.audit().blueprintFingerprint');old['review']['notes']='Retain this note after the geometry-version change.';legacy=OUT/'legacy-approved.review.json';legacy.write_text(json.dumps(old))
 f.locator('[data-review="load-session"]').click();f.locator('#review-file').set_input_files(str(legacy));f.wait_for_function('foundationReview.snapshot().review.notes.includes("Retain this note")')
 restored=f.evaluate('foundationReview.snapshot()');check('Old approval is reset on file import',restored['review']['status']=='not-approved' and all(v=='unreviewed' for v in restored['review']['decisions'].values()));check('Old camera, model and baseline survive migration',restored['frame']==old['frame'] and restored['candidate']==old['candidate'] and restored['baseline']==old['baseline']);check('Version reset is visible without losing notes',f.locator('#approval-reset').is_visible() and 'implementation' in f.locator('#approval-reset').inner_text() and restored['review']['notes']==old['review']['notes']);check('Migrated review records the current implementation',restored['implementation']=='morph-lab-shared-geometry-11')
 with page.expect_download() as dl:f.locator('[data-review="save-session"]').first.click()
 target=OUT/'migrated.review.json';dl.value.save_as(str(target));check('Saved migrated review remains unapproved',json.loads(target.read_text())['review']['status']=='not-approved')
 check('No network needed by inspection and delivery',not any(u.startswith(('http:','https:')) for u in requests))
 # Existing editor modules through their actual controls. No game renderer.
 raw=(ROOT/'dist/runtime.html').read_text();imports=re.search(r'<script type="importmap">(.*?)</script>',raw,re.S).group(1);entry=(ROOT/'tests/ui-harness.html').read_text().split('<script type="module">')[1].split('</script>')[0].replace('../src/','morph/src/')
 e=ctx.new_page();e.on('pageerror',lambda err:errors.append(str(err)));e.set_content('<html><head><style>'+(ROOT/'style.css').read_text()+'</style><script type="importmap">'+imports+'</script></head><body><div id="app"></div><script type="module">'+entry+'</script></body></html>');e.wait_for_function('window.harness?.ready');e.locator('[data-library="parts"]').click()
 for t in PARTS:
  before=e.evaluate('harness.store.state');e.locator('[data-action="add"][data-type="'+t+'"]').click();check(t+' still adds through real editor',e.evaluate('harness.store.state.parts.at(-1).type')==t);e.locator('[data-action="undo"]').click();check(t+' one-step undo preserves source',e.evaluate('harness.store.state')==before)
 check('No uncaught application errors',not errors)
 report={'suite':'v11 complete geometry and material packing browser checks','passed':len(checks),'checks':checks,'errors':errors,'offline':True,'actualCPUGeometry':True,'editorHasRenderer':False,'gpuTested':False,'physicsTested':False,'entry':'Exact combined HTML via set_content','htmlSHA256':hashlib.sha256(html.encode()).hexdigest()};(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:v for k,v in report.items() if k!='checks'},indent=2));browser.close()
