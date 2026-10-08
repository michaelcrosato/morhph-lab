"""Tide & Sky: real offline geometry, real editor controls, and packaged routing.
The editor harness intentionally has no GPU renderer or Rapier substitute.
"""

from pathlib import Path
import json, os, re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
MODELS = [
    'needleswimmer',
    'ribbondrift',
    'moonbell',
    'coilnautilus',
    'diskfin',
    'abyssangler',
    'rayskimmer',
    'paddleback',
    'sailwing',
    'glassdart',
    'velvetmoth',
    'skymedusa',
    'cavekite',
    'gyreseed',
    'windribbon',
    'lanternbeetle',
]
checks = []


def check(label, ok):
    if not ok:
        raise AssertionError(label)
    checks.append(label)


def set_value(frame, selector, value):
    frame.locator(selector).evaluate(
        '(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}',
        value,
    )


with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
    )
    ctx = browser.new_context(
        offline=True, accept_downloads=True, viewport={'width': 1560, 'height': 1100}
    )
    page = ctx.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    direct = {'attempted': True, 'passed': False}
    try:
        page.goto((ROOT / 'dist/Morph-Lab-Review.html').as_uri(), timeout=30000)
        page.frames[-1].wait_for_function('window.foundationReview?.ready', timeout=10000)
        direct['passed'] = True
    except Exception as e:
        direct['reason'] = str(e).split('Call log:')[0].strip()
        page.close()
        page = ctx.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content((ROOT / 'dist/Morph-Lab-Review.html').read_text(), timeout=30000)
    frame = page.frames[-1]
    frame.wait_for_function('window.foundationReview?.ready', timeout=30000)
    check(
        'Combined inspector includes 89 models and 24 foundations',
        frame.locator('#model-select option').count() == 89
        and frame.locator('#foundation-select option').count() == 24,
    )
    frame.locator('#model-select').evaluate('e=>e.closest("details").open=true')
    for i, id in enumerate(MODELS):
        frame.locator('#model-select').select_option(id)
        state = frame.evaluate('foundationReview.snapshot()')
        audit = frame.evaluate('foundationReview.audit()')
        check(
            id + ' loads the correct travel medium',
            state['candidate']['motion']['travel']['medium'] == ('water' if i < 8 else 'air'),
        )
        check(
            id + ' draws its attachment genes without omissions',
            audit['excludedGenes'] == 0 and audit['totals']['meshes'] > 1,
        )
    frame.locator('#model-select').select_option('moonbell')
    frame.locator('#review-pose').select_option('motion-cycle')
    set_value(frame, '#review-phase', 0.17)
    before = frame.evaluate(
        'Array.from(foundationReview.getGeometry().meshes[1].positions.slice(0,60))'
    )
    set_value(frame, '#review-phase', 0.39)
    check(
        'Changing phase deforms actual bell vertices',
        before
        != frame.evaluate(
            'Array.from(foundationReview.getGeometry().meshes[1].positions.slice(0,60))'
        ),
    )
    frame.locator('#review-shading').select_option('pattern')
    check(
        'Offline pigment mode changes the stored display setting',
        frame.evaluate('foundationReview.snapshot().settings.shading') == 'pattern',
    )
    frame.locator('[data-review="pin"]').click()
    frame.locator('[data-review="fit"]').click()
    check(
        'All four raised/multi-view masks contain the current geometry',
        all(
            x['coverage'] > 100 and x['clipped'] == 0
            for x in frame.evaluate('foundationReview.renderStats()')
        ),
    )
    with page.expect_download(timeout=90000) as d:
        frame.locator('[data-review="pose-sheet"]').click()
    d.value.save_as(str(OUT / 'v9-moonbell-cycle.png'))
    check(
        'Creature cycle sheet exports eight rendered phases',
        (OUT / 'v9-moonbell-cycle.png').stat().st_size > 10000,
    )
    with page.expect_download() as d:
        frame.locator('[data-review="report"]').click()
    d.value.save_as(str(OUT / 'v9-moonbell.review-report.json'))
    record = json.loads((OUT / 'v9-moonbell.review-report.json').read_text())
    check(
        'Audit export keeps travel, cycle and exact coverage',
        record['session']['candidate']['motion']['travel']['medium'] == 'water'
        and record['session']['settings']['pose'] == 'motion-cycle'
        and record['audit']['excludedGenes'] == 0,
    )
    # Packaging uses a single HTML file, not a link to a second local document.
    genome = frame.evaluate('foundationReview.snapshot().candidate')
    page.locator('[data-open-workspace="workshop"]').click()
    page.wait_for_function('document.documentElement.dataset.workspace==="workshop"')
    frame = page.frames[-1]
    frame.wait_for_selector('#startup-error', timeout=30000)
    check(
        'Offline workshop reports engine failure in-file',
        frame.locator('#startup-error').is_visible(),
    )
    check(
        'The exact swimmer blueprint reaches the workshop',
        frame.evaluate('window.__MORPH_WORKSPACE__.genome') == genome,
    )
    page.locator('[data-open-workspace="review"]').click()
    page.wait_for_function('document.documentElement.dataset.workspace==="review"')
    frame = page.frames[-1]
    frame.wait_for_function('window.foundationReview?.ready')
    check(
        'Returning to inspection preserves the swimmer and phase',
        frame.evaluate('foundationReview.snapshot().candidate') == genome
        and frame.evaluate('foundationReview.snapshot().settings.phase') == 0.39,
    )
    page.screenshot(path=str(OUT / 'v9-tidal-inspector-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    check(
        'Combined new-model review fits mobile width',
        page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        and frame.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    page.screenshot(path=str(OUT / 'v9-tidal-inspector-mobile.png'), full_page=True)
    # Controls test: real editor, explicitly no engine or rendering substitution.
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
    editor = ctx.new_page()
    editor.set_viewport_size({'width': 1500, 'height': 1100})
    editor.on('pageerror', lambda e: errors.append(str(e)))
    editor.set_content(html)
    editor.wait_for_function('window.harness?.ready')
    state = lambda: editor.evaluate('harness.store.state')
    tab = lambda name: editor.locator('.inspector-tabs [data-tab="' + name + '"]').click()
    editor.locator('[data-library="models"]').click()
    editor.locator('#library-search').fill('water')
    check(
        'Water search finds all eighteen swimmers',
        editor.locator('#model-library button:visible').count() == 18,
    )
    editor.locator('#library-search').fill('')
    editor.locator('#model-medium').select_option('air')
    check(
        'Air filter finds all sixteen fliers',
        editor.locator('#model-library button:visible').count() == 16,
    )
    editor.locator('#model-medium').select_option('all')
    editor.locator('#library-search').fill('')
    editor.locator('[data-preset="ribbondrift"]').click()
    tab('motion')
    check(
        'Motion panel has 37 state presets',
        editor.locator('[data-action="motion-preset"]').count() == 37,
    )
    old = state()
    editor.locator('[data-travel-medium]').select_option('air')
    check('Changing medium is a validated edit', state()['motion']['travel']['medium'] == 'air')
    editor.locator('[data-action="undo"]').click()
    check('Undo restores travel and all source settings', state() == old)
    set_value(editor, '[data-motion-group="travel"][data-motion-key="climb"]', 3.2)
    check('Vertical speed commits independently', state()['motion']['travel']['climb'] == 3.2)
    editor.locator('[data-body-wave]').select_option('vertical')
    set_value(editor, '[data-motion-group="bodyWave"][data-motion-key="amplitude"]', 0.42)
    check(
        'Body-wave type and amount survive validation',
        state()['motion']['bodyWave']['kind'] == 'vertical'
        and state()['motion']['bodyWave']['amplitude'] == 0.42,
    )
    editor.locator('[data-action="motion-preset"][data-clip="jet"]').click()
    check(
        'Motion preset does not silently change medium or body-wave policy',
        state()['motion']['weights']['jet'] == 1
        and state()['motion']['travel']['medium'] == 'water'
        and state()['motion']['bodyWave']['kind'] == 'vertical',
    )
    tab('surface')
    editor.locator('[data-action="surface-preset"][data-preset="plumage"]').click()
    check(
        'New material recipe sets generated pattern and microtexture',
        state()['appearance']['pattern'] == 'featherbarbs'
        and state()['appearance']['micro'] == 'feather',
    )
    tab('anatomy')
    editor.locator('[data-library="kits"]').click()
    old = state()
    editor.locator('[data-kit="fourwing"]').click()
    check(
        'Four-wing kit appends two editable mirrored genes',
        len(state()['parts']) == len(old['parts']) + 2 and state()['parts'][-1]['phase'] == 0.5,
    )
    editor.locator('[data-action="undo"]').click()
    check('One undo removes the complete new kit', state() == old)
    tab('mixer')
    editor.locator('[data-mix-source="a"]').select_option('moonbell')
    editor.locator('[data-mix-source="b"]').select_option('sailwing')
    set_value(editor, '[data-mix-channel="motion"]', 0.75)
    check(
        'Mixer motion channel selects air above midpoint',
        state()['motion']['travel']['medium'] == 'air',
    )
    editor.locator('[data-mix-action="apply"]').click()
    tab('motion')
    check(
        'Applied mix exposes retained travel settings',
        editor.locator('[data-travel-medium]').input_value() == 'air',
    )
    editor.evaluate('harness.view.travelControls("water")')
    check(
        'Water HUD gives vertical controls',
        'descend' in editor.locator('#habitat-controls').inner_text(),
    )
    check('No uncaught app errors occurred', not errors)
    result = {
        'suite': 'v9 Tide & Sky regression checks',
        'passed': len(checks),
        'checks': checks,
        'errors': errors,
        'offlineGeometry': True,
        'newModelCount': 16,
        'directFileNavigation': direct,
        'engineAndPhysicsVerified': False,
        'editorHarnessHasRenderer': False,
    }
    (OUT / 'v9-tidal-browser.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'checks'}, indent=2))
    browser.close()
