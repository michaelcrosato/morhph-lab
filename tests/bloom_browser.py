"""Actual offline geometry and actual editor controls. No mock physics or renderer."""

from pathlib import Path
import json, re, os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
MODELS = [
    'pebbleroller',
    'mossstrider',
    'crowngrazer',
    'duneauger',
    'clapshell',
    'lanternpolyp',
    'bristleskate',
    'suckerribbon',
    'bloomkite',
    'basketdrifter',
    'apiarist',
    'shrinesentinel',
    'marshforager',
    'thornenvoy',
]
checks = []


def check(label, ok):
    if not ok:
        raise AssertionError(label)
    checks.append(label)


def value(frame, selector, v):
    frame.locator(selector).evaluate(
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
    webgl = page.evaluate(
        '(()=>{try{const g=document.createElement("canvas").getContext("webgl2");return {available:!!g,version:g?g.getParameter(g.VERSION):null};}catch(e){return {available:false,error:e.message}}})()'
    )
    direct = {'attempted': True, 'passed': False}
    try:
        page.goto((ROOT / 'dist/Morph-Lab-Review.html').as_uri(), timeout=20000)
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
        'Combined inspector has 89 models and 24 foundations',
        f.locator('#model-select option').count() == 89
        and f.locator('#foundation-select option').count() == 24,
    )
    f.locator('#model-select').evaluate('e=>e.closest("details").open=true')
    before = f.evaluate('foundationReview.snapshot().candidate')
    for group, count in [('bloom', 14), ('frontier', 12), ('water', 18), ('air', 16), ('all', 89)]:
        f.locator('#review-collection').select_option(group)
        check(
            group + ' inspection filter count', f.locator('#model-select option').count() == count
        )
    check(
        'Source filters do not edit the candidate',
        f.evaluate('foundationReview.snapshot().candidate') == before,
    )
    for i, id in enumerate(MODELS):
        f.locator('#model-select').select_option(id)
        s = f.evaluate('foundationReview.snapshot()')
        a = f.evaluate('foundationReview.audit()')
        expected = 'water' if 4 <= i < 8 else 'air' if 8 <= i < 10 else 'ground'
        check(
            id + ' has the selected medium',
            s['candidate']['motion']['travel']['medium'] == expected,
        )
        check(
            id + ' renders all genes without omission',
            a['excludedGenes'] == 0
            and a['totals']['meshes'] > 1
            and a['technicalStatus'] != 'fail',
        )
    f.locator('#model-select').select_option('shrinesentinel')
    check(
        'Humanoid action controls are visible offline',
        f.locator('#review-human-controls').is_visible(),
    )
    f.locator('#review-pose').select_option('motion-cycle')
    check(
        'Humanoid motion-cycle is selectable',
        f.evaluate('foundationReview.snapshot().settings.pose') == 'motion-cycle',
    )
    check(
        'Offline inspector exposes all 36 humanoid action choices',
        f.locator('#review-human-action option').count() == 36,
    )
    for action in ['salute', 'beckon', 'shiver', 'stretch', 'overhead', 'sweep']:
        f.locator('#review-human-action').select_option(action)
        value(f, '#review-phase', 0.37)
        a = f.evaluate('foundationReview.getGeometry().meshes.map(m=>Array.from(m.positions))')
        value(f, '#review-phase', 0.63)
        check(
            action + ' changes real joint-mounted geometry',
            a
            != f.evaluate('foundationReview.getGeometry().meshes.map(m=>Array.from(m.positions))'),
        )
        check(
            action + ' edits the stored recipe',
            f.evaluate('foundationReview.snapshot().candidate.motion.humanoid.action') == action,
        )
    f.locator('#review-human-action').select_option('overhead')
    value(f, '#review-phase', 0.9)
    check(
        'Humanoid action review covers the full duration, not only two seconds',
        abs(f.evaluate('foundationReview.getGeometry().sampleTimeSeconds') - 2.52) < 0.001,
    )
    with page.expect_download(timeout=90000) as d:
        f.locator('[data-review="pose-sheet"]').click()
    d.value.save_as(str(OUT / 'v9-overhead-cycle.png'))
    check(
        'Humanoid action-cycle sheet exports eight real frames',
        (OUT / 'v9-overhead-cycle.png').stat().st_size > 10000,
    )
    check(
        'Audit includes the exact action sample time',
        abs(f.evaluate('foundationReview.audit().timeSeconds') - 2.52) < 0.001,
    )
    f.locator('[data-decision="joints"]').select_option('accept')
    f.locator('#review-human-mask').select_option('full')
    check(
        'Changing an action mask resets manual review decisions',
        f.evaluate('foundationReview.snapshot().review.decisions.joints') == 'unreviewed',
    )
    check(
        'Selected full-body mask persists',
        f.evaluate('foundationReview.snapshot().candidate.motion.humanoid.mask') == 'full',
    )
    f.locator('#model-select').select_option('clapshell')
    check(
        'Humanoid-only controls hide on creatures',
        not f.locator('#review-human-controls').is_visible(),
    )
    f.locator('#review-pose').select_option('motion-cycle')
    value(f, '#review-phase', 0.17)
    a = f.evaluate('foundationReview.getGeometry().meshes.map(m=>Array.from(m.positions))')
    value(f, '#review-phase', 0.39)
    check(
        'Shell valve hinges change actual vertices',
        a != f.evaluate('foundationReview.getGeometry().meshes.map(m=>Array.from(m.positions))'),
    )
    f.locator('#review-shading').select_option('pattern')
    f.locator('[data-review="pin"]').click()
    f.locator('[data-review="fit"]').click()
    check(
        'All four render masks contain unclipped geometry',
        all(
            x['coverage'] > 100 and x['clipped'] == 0
            for x in f.evaluate('foundationReview.renderStats()')
        ),
    )
    with page.expect_download(timeout=90000) as d:
        f.locator('[data-review="pose-sheet"]').click()
    d.value.save_as(str(OUT / 'v9-shell-cycle.png'))
    check(
        'Pose sheet exports actual rendered frames',
        (OUT / 'v9-shell-cycle.png').stat().st_size > 10000,
    )
    with page.expect_download() as d:
        f.locator('[data-review="report"]').click()
    d.value.save_as(str(OUT / 'v9-shell.review-report.json'))
    r = json.loads((OUT / 'v9-shell.review-report.json').read_text())
    check(
        'Audit export retains the blueprint and exact coverage',
        r['audit']['excludedGenes'] == 0 and r['session']['candidate']['name'] == 'Clap shell',
    )
    genome = f.evaluate('foundationReview.snapshot().candidate')
    page.locator('[data-open-workspace="workshop"]').click()
    page.wait_for_function('document.documentElement.dataset.workspace==="workshop"')
    f = page.frames[-1]
    f.wait_for_selector('#startup-error', timeout=30000)
    check(
        'Offline engine failure stays inside the combined file',
        f.locator('#startup-error').is_visible(),
    )
    check(
        'Workspace transfer keeps the exact model',
        f.evaluate('window.__MORPH_WORKSPACE__.genome') == genome,
    )
    page.locator('[data-open-workspace="review"]').click()
    page.wait_for_function('document.documentElement.dataset.workspace==="review"')
    f = page.frames[-1]
    f.wait_for_function('window.foundationReview?.ready')
    check(
        'Return to Inspect retains the model and phase',
        f.evaluate('foundationReview.snapshot().candidate') == genome
        and f.evaluate('foundationReview.snapshot().settings.phase') == 0.39,
    )
    f.locator('#model-select').evaluate('e=>e.closest("details").open=true')
    f.locator('#model-select').select_option('shrinesentinel')
    f.locator('#review-human-action').select_option('salute')
    value(f, '#review-phase', 0.5)
    f.locator('[data-review="fit"]').click()
    f.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(OUT / 'v9-inspector-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    check(
        'Combined inspector has no horizontal mobile overflow',
        page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        and f.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    page.screenshot(path=str(OUT / 'v9-inspector-mobile.png'), full_page=True)
    # Real editor harness, without a GPU renderer. It uses the release module bytes.
    built = (ROOT / 'dist/runtime.html').read_text()
    imports = re.search(r'<script type="importmap">(.*?)</script>', built, re.S).group(1)
    entry = (
        (ROOT / 'tests/ui-harness.html')
        .read_text()
        .split('<script type="module">')[1]
        .split('</script>')[0]
        .replace('../src/', 'morph/src/')
    )
    html = (
        '<html><head><style>'
        + (ROOT / 'style.css').read_text()
        + '</style><script type="importmap">'
        + imports
        + '</script></head><body><div id="app"></div><script type="module">'
        + entry
        + '</script></body></html>'
    )
    e = ctx.new_page()
    e.set_viewport_size({'width': 1500, 'height': 1100})
    e.on('pageerror', lambda x: errors.append(str(x)))
    e.set_content(html)
    e.wait_for_function('window.harness?.ready')
    state = lambda: e.evaluate('harness.store.state')
    tab = lambda name: e.locator('.inspector-tabs [data-tab="' + name + '"]').click()
    e.locator('[data-library="models"]').click()
    before = state()
    e.locator('#model-collection').select_option('bloom')
    check(
        'Workshop content filter exposes 14 new models',
        e.locator('#model-library button:visible').count() == 14,
    )
    for medium, count in [('ground', 8), ('water', 4), ('air', 2)]:
        e.locator('#model-medium').select_option(medium)
        check(
            medium + ' and pack filters combine',
            e.locator('#model-library button:visible').count() == count,
        )
    e.locator('#library-search').fill('basket')
    check(
        'Text and category filters combine', e.locator('#model-library button:visible').count() == 1
    )
    check('Filters keep the source unchanged', state() == before)
    e.locator('#library-search').fill('')
    e.locator('#model-medium').select_option('all')
    e.locator('[data-preset="pebbleroller"]').click()
    tab('motion')
    check(
        'Motion panel has 37 state presets',
        e.locator('[data-action="motion-preset"]').count() == 37,
    )
    for clip in ['ripplewalk', 'shellclap', 'bloomcycle', 'siphonreach', 'padcrawl', 'sensorscan']:
        e.locator('[data-action="motion-preset"][data-clip="' + clip + '"]').click()
        check(clip + ' stores its motion weight', state()['motion']['weights'][clip] == 1)
    check(
        'New motion recipes do not silently change travel',
        state()['motion']['travel']['medium'] == 'ground',
    )
    tab('surface')
    check(
        'All 46 pigment patterns appear',
        e.locator('[data-layer-field="pattern"]').first.locator('option').count() == 46,
    )
    check('All 31 microtextures appear', e.locator('[data-surface-micro] option').count() == 31)
    for material in [
        'scutearmor',
        'petalwax',
        'pollendust',
        'saddlehide',
        'fieldcloth',
        'oxidized',
        'mazeenamel',
        'growthshell',
    ]:
        before = state()
        e.locator('[data-action="surface-preset"][data-preset="' + material + '"]').click()
        check(
            material + ' is a validated surface edit',
            state()['appearance']['pattern']
            == dict(
                scutearmor='scuteedges',
                petalwax='petalveins',
                pollendust='pollen',
                saddlehide='saddle',
                fieldcloth='stitchgrid',
                oxidized='oxidation',
                mazeenamel='maze',
                growthshell='growthbands',
            )[material],
        )
    for micro in ['scutes', 'petalgrain', 'suction', 'ribcloth', 'gravel', 'hammered']:
        e.locator('[data-surface-micro]').select_option(micro)
        check(micro + ' height map is retained', state()['appearance']['micro'] == micro)
    tab('anatomy')
    e.locator('[data-library="parts"]').click()
    e.locator('#library-search').fill('')
    for part in [
        'legbank',
        'plateband',
        'petalcrown',
        'valvepair',
        'tubecluster',
        'irismouth',
        'latticecage',
        'whiskerfan',
        'trunk',
        'faceplate',
    ]:
        before = state()
        e.locator('[data-action="add"][data-type="' + part + '"]').click()
        check(
            part + ' adds a normal editable gene',
            state()['parts'][-1]['type'] == part
            and len(state()['parts']) == len(before['parts']) + 1,
        )
        e.locator('[data-action="undo"]').click()
    # Start an array from an unpaired trunk, whose anchor is not on the Y axis.
    e.locator('[data-action="add"][data-type="trunk"]').click()
    tab('anatomy')
    e.locator('.part-array-panel summary').click()
    old = state()
    history = e.evaluate('harness.store.past.length')
    value(e, '[data-array-setting="count"]', 4)
    value(e, '[data-array-setting="phaseStep"]', 0.2)
    e.locator('[data-action="apply-array"]').click()
    check(
        'Ring array creates three independent copies',
        len(state()['parts']) == len(old['parts']) + 3,
    )
    check(
        'One array produces one history entry',
        e.evaluate('harness.store.past.length') == history + 1,
    )
    check('Array phases are separated', len(set(p['phase'] for p in state()['parts'][-3:])) == 3)
    e.locator('[data-action="undo"]').click()
    check('One undo restores the complete pre-array source', state() == old)
    e.locator('[data-action="redo"]').click()
    check('Redo restores the full array', len(state()['parts']) == len(old['parts']) + 3)
    # Invalid requests must leave both the current model and its history unchanged.
    e.locator('.part-array-panel summary').click()
    value(e, '[data-array-setting="layout"]', 'row')
    value(e, '[data-array-setting="count"]', 8)
    value(e, '[data-array-setting="spacing"]', 0.6)
    before = state()
    history = e.evaluate('harness.store.past.length')
    e.locator('[data-action="apply-array"]').click()
    check(
        'Out-of-range row fails atomically',
        state() == before and e.evaluate('harness.store.past.length') == history,
    )
    check(
        'Array failure shows a useful message', 'offset' in e.locator('#toast').inner_text().lower()
    )
    e.locator('[data-library="kits"]').click()
    before = state()
    e.locator('[data-kit="basket"]').click()
    check('New kit adds normal genes', len(state()['parts']) == len(before['parts']) + 2)
    e.locator('[data-action="undo"]').click()
    check('One undo removes a new kit', state() == before)
    e.locator('[data-library="models"]').click()
    e.locator('[data-preset="apiarist"]').click()
    tab('motion')
    for action in ['salute', 'beckon', 'shiver', 'stretch', 'overhead', 'sweep']:
        e.locator('[data-action="human-action"][data-clip="' + action + '"]').click()
        check(
            action + ' is available in the Workshop action layer',
            state()['motion']['humanoid']['action'] == action,
        )
    tab('mixer')
    e.locator('[data-mix-source="a"]').select_option('bloomkite')
    e.locator('[data-mix-source="b"]').select_option('clapshell')
    value(e, '[data-mix-channel="motion"]', 0.75)
    check(
        'New sources mix with their travel settings',
        state()['motion']['travel']['medium'] == 'water',
    )
    e.locator('[data-mix-action="apply"]').click()
    check('No uncaught application errors occurred', not errors)
    result = {
        'suite': 'v9 Carapace & Bloom browser checks',
        'passed': len(checks),
        'checks': checks,
        'errors': errors,
        'offlineGeometry': True,
        'newModelCount': 14,
        'directFileNavigation': direct,
        'webgl2Probe': webgl,
        'engineAndPhysicsVerified': False,
        'editorHarnessHasRenderer': False,
    }
    (OUT / 'v9-bloom-browser.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'checks'}, indent=2))
    browser.close()
