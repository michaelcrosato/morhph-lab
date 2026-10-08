"""Strange Forms: real offline geometry, real editor controls, and packaged routing.
The editor harness intentionally has no GPU renderer or Rapier substitute.
"""
from pathlib import Path
import json, re, os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
MODELS=['comblantern','salpchain','starweaver','velvetslug','oarshrimp','twinjet','hoopglider','sievewisp','prismkite','screwdrifter','ductmanta','pleatdrake']
checks=[]
def check(label,ok):
    if not ok:raise AssertionError(label)
    checks.append(label)
def set_value(frame,selector,value):
    frame.locator(selector).evaluate('(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}',value)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
    ctx=browser.new_context(offline=True,accept_downloads=True,viewport={'width':1560,'height':1100});page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    direct={'attempted':True,'passed':False}
    try:
        page.goto((ROOT/'dist/Morph-Lab-Review.html').as_uri(),timeout=30000)
        page.frames[-1].wait_for_function('window.foundationReview?.ready',timeout=10000);direct['passed']=True
    except Exception as e:
        direct['reason']=str(e).split('Call log:')[0].strip();page.close();page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.set_content((ROOT/'dist/Morph-Lab-Review.html').read_text(),timeout=30000)
    frame=page.frames[-1];frame.wait_for_function('window.foundationReview?.ready',timeout=30000)
    check('Combined inspector includes 89 models and 24 foundations',frame.locator('#model-select option').count()==89 and frame.locator('#foundation-select option').count()==24)
    frame.locator('#model-select').evaluate('e=>e.closest("details").open=true')
    baseline=frame.evaluate('foundationReview.snapshot().candidate')
    for group,count in [('frontier',12),('water',18),('air',16),('all',89)]:
        frame.locator('#review-collection').select_option(group)
        check(group+' review source filter has the expected count',frame.locator('#model-select option').count()==count)
    check('Filtering inspection sources does not edit the blueprint',frame.evaluate('foundationReview.snapshot().candidate')==baseline)
    for i,id in enumerate(MODELS):
        frame.locator('#model-select').select_option(id)
        state=frame.evaluate('foundationReview.snapshot()');audit=frame.evaluate('foundationReview.audit()')
        check(id+' loads the correct travel medium',state['candidate']['motion']['travel']['medium']==('water' if i<6 else 'air'))
        check(id+' draws its attachment genes without omissions',audit['excludedGenes']==0 and audit['totals']['meshes']>1)
    frame.locator('#model-select').select_option('starweaver');frame.locator('#review-pose').select_option('motion-cycle');set_value(frame,'#review-phase',.17)
    before=frame.evaluate('foundationReview.getGeometry().meshes.map(m=>Array.from(m.positions))');set_value(frame,'#review-phase',.39)
    check('Changing phase deforms actual radial web vertices',before!=frame.evaluate('foundationReview.getGeometry().meshes.map(m=>Array.from(m.positions))'))
    check('Rendered canvas pixels are not uniform',frame.evaluate('(()=>{const c=document.querySelector("#review-views canvas"),a=c.getContext("2d").getImageData(0,0,c.width,c.height).data;return new Set(a).size>20;})()'))
    frame.locator('#review-shading').select_option('pattern');check('Offline pigment mode changes the stored display setting',frame.evaluate('foundationReview.snapshot().settings.shading')=='pattern')
    frame.locator('[data-review="pin"]').click();frame.locator('[data-review="fit"]').click();check('All four raised/multi-view masks contain the current geometry',all(x['coverage']>100 and x['clipped']==0 for x in frame.evaluate('foundationReview.renderStats()')))
    with page.expect_download(timeout=90000) as d:frame.locator('[data-review="pose-sheet"]').click()
    d.value.save_as(str(OUT/'v9-radial-cycle.png'));check('Creature cycle sheet exports eight rendered phases',(OUT/'v9-radial-cycle.png').stat().st_size>10000)
    with page.expect_download() as d:frame.locator('[data-review="report"]').click()
    d.value.save_as(str(OUT/'v9-starweaver.review-report.json'));record=json.loads((OUT/'v9-starweaver.review-report.json').read_text());check('Audit export keeps travel, cycle and exact coverage',record['session']['candidate']['motion']['travel']['medium']=='water' and record['session']['settings']['pose']=='motion-cycle' and record['audit']['excludedGenes']==0)
    # Packaging uses a single HTML file, not a link to a second local document.
    genome=frame.evaluate('foundationReview.snapshot().candidate');page.locator('[data-open-workspace="workshop"]').click();page.wait_for_function('document.documentElement.dataset.workspace==="workshop"');frame=page.frames[-1];frame.wait_for_selector('#startup-error',timeout=30000)
    check('Offline workshop reports engine failure in-file',frame.locator('#startup-error').is_visible())
    check('The exact swimmer blueprint reaches the workshop',frame.evaluate('window.__MORPH_WORKSPACE__.genome')==genome)
    page.locator('[data-open-workspace="review"]').click();page.wait_for_function('document.documentElement.dataset.workspace==="review"');frame=page.frames[-1];frame.wait_for_function('window.foundationReview?.ready')
    check('Returning to inspection preserves the swimmer and phase',frame.evaluate('foundationReview.snapshot().candidate')==genome and frame.evaluate('foundationReview.snapshot().settings.phase')==.39)
    page.screenshot(path=str(OUT/'v9-inspector-desktop.png'),full_page=True)
    page.set_viewport_size({'width':390,'height':844});check('Combined new-model review fits mobile width',page.evaluate('document.documentElement.scrollWidth<=innerWidth+1') and frame.evaluate('document.documentElement.scrollWidth<=innerWidth+1'));page.screenshot(path=str(OUT/'v9-inspector-mobile.png'),full_page=True)
    # Controls test: real editor, explicitly no engine or rendering substitution.
    built=(ROOT/'dist/runtime.html').read_text();imports=re.search(r'<script type="importmap">(.*?)</script>',built,re.S).group(1)
    entry=(ROOT/'tests/ui-harness.html').read_text().split('<script type="module">')[1].split('</script>')[0].replace('../src/','morph/src/')
    html='<html><head><style>'+(ROOT/'style.css').read_text()+'</style><script type="importmap">'+imports+'</script></head><body><div id="app"></div><script type="module">'+entry+'</script></body></html>'
    editor=ctx.new_page();editor.set_viewport_size({'width':1500,'height':1100});editor.on('pageerror',lambda e:errors.append(str(e)));editor.set_content(html);editor.wait_for_function('window.harness?.ready')
    state=lambda:editor.evaluate('harness.store.state')
    tab=lambda name:editor.locator('.inspector-tabs [data-tab="'+name+'"]').click()
    editor.locator('[data-library="models"]').click();editor.locator('#library-search').fill('water');check('Water search finds all eighteen swimmers',editor.locator('#model-library button:visible').count()==18)
    editor.locator('#library-search').fill('');editor.locator('#model-medium').select_option('air');check('Air filter finds all sixteen fliers',editor.locator('#model-library button:visible').count()==16)
    editor.locator('#model-medium').select_option('all');editor.locator('#library-search').fill('')
    old=state();editor.locator('#model-collection').select_option('frontier')
    check('New content pack filter shows twelve models',editor.locator('#model-library button:visible').count()==12)
    editor.locator('#model-medium').select_option('air');check('Pack and medium filters combine',editor.locator('#model-library button:visible').count()==6)
    editor.locator('#library-search').fill('duct');check('Pack, medium and text filters combine',editor.locator('#model-library button:visible').count()==1)
    check('Library filters do not change the actor',state()==old)
    editor.locator('#library-search').fill('');editor.locator('#model-medium').select_option('all');editor.locator('#model-collection').select_option('legacy')
    check('Earlier content filter retains 53 models',editor.locator('#model-library button:visible').count()==53)
    editor.locator('#model-collection').select_option('all');editor.locator('[data-preset="salpchain"]').click();tab('motion')
    check('Motion panel has 37 state presets',editor.locator('[data-action="motion-preset"]').count()==37)
    old=state();editor.locator('[data-travel-medium]').select_option('air');check('Changing medium is a validated edit',state()['motion']['travel']['medium']=='air');editor.locator('[data-action="undo"]').click();check('Undo restores travel and all source settings',state()==old)
    set_value(editor,'[data-motion-group="travel"][data-motion-key="climb"]',3.2);check('Vertical speed commits independently',state()['motion']['travel']['climb']==3.2)
    editor.locator('[data-body-wave]').select_option('vertical');set_value(editor,'[data-motion-group="bodyWave"][data-motion-key="amplitude"]',.42);check('Body-wave type and amount survive validation',state()['motion']['bodyWave']['kind']=='vertical' and state()['motion']['bodyWave']['amplitude']==.42)
    for clip in ['combbeat','chainpump','radialstroke','metachronal','canopy','corkscrew','turbines','concertina']:
        editor.locator('[data-action="motion-preset"][data-clip="'+clip+'"]').click()
        check(clip+' is a selectable validated motion recipe',state()['motion']['weights'][clip]==1)
    editor.locator('[data-action="motion-preset"][data-clip="chainpump"]').click();check('Motion preset does not silently change medium or body-wave policy',state()['motion']['weights']['chainpump']==1 and state()['motion']['travel']['medium']=='water' and state()['motion']['bodyWave']['kind']=='vertical')
    tab('surface');editor.locator('[data-action="surface-preset"][data-preset="combglass"]').click();check('New material recipe sets generated pattern and microtexture',state()['appearance']['pattern']=='combtracks' and state()['appearance']['micro']=='cilia')
    check('All 46 pigment patterns are listed',editor.locator('[data-layer-field="pattern"]').first.locator('option').count()==46)
    check('All 31 microtextures are listed',editor.locator('[data-surface-micro] option').count()==31)
    for micro in ['cilia','pleats','meshknit','chalk','tesserae','capillary']:
        editor.locator('[data-surface-micro]').select_option(micro);check(micro+' microtexture persists in the source',state()['appearance']['micro']==micro)
    tab('anatomy');editor.locator('[data-library="kits"]').click();old=state();editor.locator('[data-kit="annular"]').click();check('Annular kit appends two editable genes',len(state()['parts'])==len(old['parts'])+2 and state()['parts'][-2]['type']=='ringwing');editor.locator('[data-action="undo"]').click();check('One undo removes the complete new kit',state()==old)
    tab('mixer');editor.locator('[data-mix-source="a"]').select_option('starweaver');editor.locator('[data-mix-source="b"]').select_option('sievewisp');set_value(editor,'[data-mix-channel="motion"]',.75);check('Mixer motion channel selects air above midpoint',state()['motion']['travel']['medium']=='air')
    editor.locator('[data-mix-action="apply"]').click();tab('motion');check('Applied mix exposes retained travel settings',editor.locator('[data-travel-medium]').input_value()=='air')
    editor.evaluate('harness.view.travelControls("water")');check('Water HUD gives vertical controls', 'descend' in editor.locator('#habitat-controls').inner_text())
    check('No uncaught app errors occurred',not errors)
    result={'suite':'v9 Strange Forms browser checks','passed':len(checks),'checks':checks,'errors':errors,'offlineGeometry':True,'newModelCount':12,'directFileNavigation':direct,'engineAndPhysicsVerified':False,'editorHarnessHasRenderer':False}
    (OUT/'v9-frontier-browser.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k!='checks'},indent=2));browser.close()
