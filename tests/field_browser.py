"""Release-file and real editor checks. No substituted engine or physics API."""

from pathlib import Path
import json, re, os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
MODELS = [
    'trailhound',
    'hillgrazer',
    'bristletusk',
    'reedhopper',
    'fieldmedic',
    'lamplighter',
    'archivist',
    'prospector',
    'waypostarcher',
    'caravancourier',
]
ACTIONS = ['readbook', 'writenote', 'lamplook', 'bowdraw', 'offer', 'restlean']
PARTS = [
    'beastleg',
    'brushtail',
    'worktool',
    'fieldlamp',
    'folio',
    'bowrig',
    'utilitybelt',
    'mantle',
]
checks = []


def check(label, value):
    if not value:
        raise AssertionError(label)
    checks.append(label)


def setvalue(f, s, v):
    f.locator(s).evaluate(
        '(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}',
        v,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
    )
    ctx = browser.new_context(
        offline=True, accept_downloads=True, viewport={'width': 1560, 'height': 1150}
    )
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    webgl = page.evaluate('!!document.createElement("canvas").getContext("webgl2")')
    direct = {'attempted': True, 'passed': False}
    try:
        page.goto((ROOT / 'dist/Morph-Lab-Review.html').as_uri(), timeout=15000)
        page.frames[-1].wait_for_function('window.foundationReview?.ready', timeout=10000)
        direct['passed'] = True
    except Exception as e:
        direct['reason'] = str(e).split('Call log:')[0].strip()
        page.close()
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content((ROOT / 'dist/Morph-Lab-Review.html').read_text(), timeout=30000)
    f = page.frames[-1]
    f.wait_for_function('window.foundationReview?.ready', timeout=30000)
    check(
        'Current release version is visible in the combined shell',
        '12.0.0' in page.locator('header').inner_text(),
    )
    check(
        '89 model sources and 24 foundations are present',
        f.locator('#model-select option').count() == 89
        and f.locator('#foundation-select option').count() == 24,
    )
    f.locator('#model-select').evaluate('e=>e.closest("details").open=true')
    before = f.evaluate('foundationReview.snapshot().candidate')
    f.locator('#review-collection').select_option('field')
    check(
        'Field filter contains exactly ten sources', f.locator('#model-select option').count() == 10
    )
    check(
        'Filter does not edit the candidate',
        f.evaluate('foundationReview.snapshot().candidate') == before,
    )
    for id in MODELS:
        f.locator('#model-select').select_option(id)
        f.locator('#review-pose').select_option('motion-cycle')
        setvalue(f, '#review-phase', 0.38)
        a = f.evaluate('foundationReview.audit()')
        check(
            id + ' renders every attachment gene',
            a['excludedGenes'] == 0 and a['technicalStatus'] != 'fail',
        )
        check(
            id + ' remains a ground recipe',
            f.evaluate('foundationReview.snapshot().candidate.motion.travel.medium') == 'ground',
        )
    f.locator('#foundation-select').select_option('fieldworker')
    check(
        'Equipped foundation keeps all three props',
        len(f.evaluate('foundationReview.snapshot().candidate.parts')) == 3,
    )
    f.locator('#model-select').evaluate('e=>e.closest("details").open=true')
    f.locator('#review-collection').select_option('field')
    f.locator('#model-select').select_option('archivist')
    f.locator('#review-pose').select_option('motion-cycle')
    for a in ACTIONS:
        f.locator('#review-human-action').select_option(a)
        setvalue(f, '#review-phase', 0.31)
        v = f.evaluate(
            'foundationReview.getGeometry().meshes.map(m=>Array.from(m.positions.slice(0,120)))'
        )
        setvalue(f, '#review-phase', 0.67)
        check(
            a + ' changes actual sampled geometry',
            v
            != f.evaluate(
                'foundationReview.getGeometry().meshes.map(m=>Array.from(m.positions.slice(0,120)))'
            ),
        )
    f.locator('#review-human-action').select_option('readbook')
    setvalue(f, '#review-phase', 0.38)
    f.locator('[data-review="fit"]').click()
    with page.expect_download() as d:
        f.locator('[data-review="library-audit"]').click()
    d.value.save_as(str(OUT / 'v9-browser-library.json'))
    audit = json.loads((OUT / 'v9-browser-library.json').read_text())
    check(
        'Coverage export reports 73 shared and no missing families',
        audit['counts']['sharedPartFamilies'] == 73 and len(audit['unsupportedFamilies']) == 0,
    )
    check('Coverage export never asserts GPU approval', audit['gpuVerified'] is False)
    check(
        'Library panel gives the exact review count',
        '89 of 89' in f.locator('#library-coverage').inner_text(),
    )
    with page.expect_download(timeout=90000) as d:
        f.locator('[data-review="pose-sheet"]').click()
    d.value.save_as(str(OUT / 'v9-reading-cycle.png'))
    check('Task sheet exports real geometry', (OUT / 'v9-reading-cycle.png').stat().st_size > 10000)
    f.locator('[data-decision="joints"]').select_option('accept')
    f.locator('#review-human-action').select_option('offer')
    check(
        'Changing the task clears manual approvals',
        f.locator('[data-decision="joints"]').input_value() == 'unreviewed',
    )
    f.locator('#review-human-action').select_option('readbook')
    setvalue(f, '#review-phase', 0.38)
    f.locator('[data-review="fit"]').click()
    f.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(OUT / 'v9-field-inspector.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    check(
        'Inspector fits mobile width',
        f.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    page.screenshot(path=str(OUT / 'v9-field-mobile.png'), full_page=True)
    # Workshop editor: same release modules, no renderer.
    raw = (ROOT / 'dist/runtime.html').read_text()
    imports = re.search(r'<script type="importmap">(.*?)</script>', raw, re.S).group(1)
    entry = (
        (ROOT / 'tests/ui-harness.html')
        .read_text()
        .split('<script type="module">')[1]
        .split('</script>')[0]
        .replace('../src/', 'morph/src/')
    )
    e = ctx.new_page()
    e.on('pageerror', lambda err: errors.append(str(err)))
    e.set_content(
        '<html><head><style>'
        + (ROOT / 'style.css').read_text()
        + '</style><script type="importmap">'
        + imports
        + '</script></head><body><div id="app"></div><script type="module">'
        + entry
        + '</script></body></html>'
    )
    e.wait_for_function('window.harness?.ready')
    state = lambda: e.evaluate('harness.store.state')
    tab = lambda s: e.locator('.inspector-tabs [data-tab="' + s + '"]').click()
    e.locator('[data-library="models"]').click()
    e.locator('#model-collection').select_option('field')
    check(
        'Workshop field filter has ten sources',
        e.locator('#model-library button:visible').count() == 10,
    )
    e.locator('#library-search').fill('civilian')
    check(
        'Text filter finds five civilian humanoids',
        e.locator('#model-library button:visible').count() == 5,
    )
    e.locator('#library-search').fill('humanoid')
    check(
        'Text filter finds six new humanoids',
        e.locator('#model-library button:visible').count() == 6,
    )
    e.locator('#library-search').fill('')
    for id in MODELS:
        e.locator('[data-preset="' + id + '"]').click()
        check(
            id + ' loads in the actual editor',
            state()['name'] == next(x['label'] for x in audit['models'] if x['id'] == id),
        )
    e.locator('[data-preset="archivist"]').click()
    tab('motion')
    for a in ACTIONS:
        e.locator('[data-action="human-action"][data-clip="' + a + '"]').click()
        check(a + ' is stored in the blueprint', state()['motion']['humanoid']['action'] == a)
    tab('surface')
    for material in ['shortcoat', 'woolcoat', 'repaircloth', 'checkcloth']:
        before = state()
        e.locator('[data-action="surface-preset"][data-preset="' + material + '"]').click()
        check(material + ' updates the surface', state()['appearance'] != before['appearance'])
    for micro in ['shortcoat', 'woolloops', 'canvasgrain']:
        e.locator('[data-surface-micro]').select_option(micro)
        check(micro + ' is retained', state()['appearance']['micro'] == micro)
    tab('anatomy')
    e.locator('[data-library="parts"]').click()
    for part in PARTS:
        before = state()
        e.locator('[data-action="add"][data-type="' + part + '"]').click()
        check(part + ' adds an editable gene', state()['parts'][-1]['type'] == part)
        e.locator('[data-action="undo"]').click()
        check(part + ' addition has one undo', state() == before)
    e.locator('[data-library="kits"]').click()
    for kit in ['fieldworker', 'fieldscholar', 'fieldarcher', 'fieldtraveler', 'fieldface']:
        before = state()
        e.locator('[data-kit="' + kit + '"]').click()
        check(kit + ' adds normal genes', len(state()['parts']) > len(before['parts']))
        e.locator('[data-action="undo"]').click()
        check(kit + ' is one undo transaction', state() == before)
    tab('mixer')
    e.locator('[data-mix-source="a"]').select_option('trailhound')
    e.locator('[data-mix-source="b"]').select_option('hillgrazer')
    setvalue(e, '[data-mix-channel="body"]', 0.65)
    check('Field sources are valid mixer inputs', state()['rig']['family'] == 'creature')
    e.locator('[data-mix-action="apply"]').click()
    check('Applied mix retains ground travel', state()['motion']['travel']['medium'] == 'ground')
    e.locator('[data-library="models"]').click()
    e.locator('#model-collection').select_option('field')
    e.screenshot(path=str(OUT / 'v9-field-workshop.png'), full_page=True)
    check('No uncaught application errors', not errors)
    result = {
        'suite': 'v9 Field & Settlement real editor and CPU review',
        'passed': len(checks),
        'checks': checks,
        'errors': errors,
        'directFileNavigation': direct,
        'webgl2Available': webgl,
        'engineTested': False,
        'physicsTested': False,
        'editorHarnessHasRenderer': False,
    }
    (OUT / 'v9-field-browser.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'checks'}, indent=2))
    browser.close()
