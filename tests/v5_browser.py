"""Real offline reviewer tests. Canvas pixels come from generated triangles.
This suite does not substitute or claim to exercise Three.js, WebGL2, or Rapier.
Run `npm run build:review` first. Python Playwright and Chromium are required.
"""

from pathlib import Path
import base64, json, os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
checks = []


def check(label, condition):
    if not condition:
        raise AssertionError(label)
    checks.append(label)


with sync_playwright() as p:
    launch = {'headless': True, 'args': ['--no-sandbox', '--disable-dev-shm-usage']}
    exe = os.environ.get('CHROMIUM_PATH') or (
        '/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None
    )
    if exe:
        launch['executable_path'] = exe
    browser = p.chromium.launch(**launch)
    context = browser.new_context(
        viewport={'width': 1560, 'height': 1100},
        device_scale_factor=1,
        accept_downloads=True,
        offline=True,
    )
    page = context.new_page()
    errors = []
    requests = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url))
    review_html = (
        (ROOT / 'dist/runtime.html')
        .read_text()
        .replace(
            '</head>', '<script>window.__MORPH_WORKSPACE__={workspace:"review"};</script></head>'
        )
    )
    page.set_content(review_html, timeout=30000)
    page.wait_for_function('window.foundationReview?.ready', timeout=30000)
    state = lambda: page.evaluate('foundationReview.snapshot()')
    audit = lambda: page.evaluate('foundationReview.audit()')
    report = lambda: page.evaluate('foundationReview.report()')
    action = lambda key: page.locator('[data-review="' + key + '"]').first.click()

    def change(selector, value):
        page.locator(selector).evaluate(
            '(el,v)=>{el.value=String(v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}',
            value,
        )

    def exported(action_key, filename):
        with page.expect_download(timeout=90000) as d:
            action(action_key)
        path = OUT / filename
        d.value.save_as(str(path))
        check(action_key + ' produces a nonempty download', path.stat().st_size > 20)
        return path

    def imported(action_key, path):
        action(action_key)
        page.locator('#review-file').set_input_files(str(path))
        page.wait_for_function(
            'document.querySelector("#review-toast").textContent==="Local file loaded."',
            timeout=30000,
        )

    initial = state()
    g = initial['candidate']
    check(
        'Offline review loads a defined schema 6 biped',
        g['version'] == 6 and g['rig']['bodyStyle'] == 'defined',
    )
    check(
        'Twenty-four foundation templates are present',
        page.locator('#foundation-select option').count() == 24,
    )
    check('89 model sources are retained', page.locator('#model-select option').count() == 89)
    check(
        'Shared geometry produces four visible view masks',
        len(page.locator('#review-views canvas').all()) == 4
        and all(x['coverage'] > 1000 for x in page.evaluate('foundationReview.renderStats()')),
    )
    check(
        'Initial geometry fits every camera',
        all(x['clipped'] == 0 for x in page.evaluate('foundationReview.renderStats()')),
    )
    check('Initial review uses 22 real semantic bones', audit()['totals']['skinBones'] == 22)
    check(
        'Initial technical pass does not approve quality',
        audit()['technicalStatus'] == 'pass' and state()['review']['status'] == 'not-approved',
    )
    check(
        'No engine download is requested',
        not any(u.startswith(('https://', 'http://')) for u in requests),
    )
    check(
        'Offline canvas has nonuniform real pixels',
        page.evaluate(
            '(()=>{const c=document.querySelector("#review-views canvas"),d=c.getContext("2d").getImageData(0,0,c.width,c.height).data;return new Set(d).size>20;})()'
        ),
    )
    original_frame = state()['frame']
    change('#shape-profile', 'tall')
    check(
        'Tall profile changes the candidate but not its source',
        state()['candidate']['rig']['proportions']['scale'] == 1.18 and state()['source'] == g,
    )
    check('Profile changes keep the pinned camera scale', state()['frame'] == original_frame)
    tall = state()['candidate']
    change('#shape-profile', 'heavy')
    change('#shape-profile', 'tall')
    check('Repeated profile changes do not accumulate deformation', state()['candidate'] == tall)
    change('#profile-amount', 0)
    check('Zero profile blend restores source exactly', state()['candidate'] == g)
    change('#profile-amount', 1)
    action('restore-source')
    check('Reset returns to the captured source', state()['candidate'] == g)
    page.locator('[data-decision="silhouette"]').select_option('accept')
    check(
        'Manual decisions can be recorded', state()['review']['decisions']['silhouette'] == 'accept'
    )
    change('#body-style', 'classic')
    check(
        'Construction edit invalidates manual decisions',
        state()['review']['decisions']['silhouette'] == 'unreviewed',
    )
    check(
        'Classic body has different geometry from defined', audit()['totals']['triangles'] != 40248
    )
    # A historical baseline remains a valid schema-5 classic recipe after loading.
    classic = state()['candidate']
    classic['name'] = 'Balanced biped'
    page.evaluate('(g)=>foundationReview.setSource(g)', classic)
    action('pin')
    change('#body-style', 'defined')
    change('#review-shading', 'clay')
    page.locator('[data-layout="compare"]').click()
    action('fit')
    check(
        'A/B layout includes candidate, baseline and mask difference',
        page.locator('#review-views canvas').count() == 3,
    )
    comparison = report()['comparison']
    check(
        'Changed construction has a measurable silhouette difference',
        0 < comparison['intersectionOverUnion'] < 1 and comparison['changedPixels'] > 0,
    )
    check('Difference is labelled as non-aesthetic', 'not a quality score' in comparison['note'])
    comparison_path = exported('compare-sheet', 'v9-model-comparison.png')
    comparison_record = exported('report', 'v9-model-comparison.review-report.json')
    check(
        'Comparison report retains both complete blueprints',
        json.loads(comparison_record.read_text())['session']['baseline']['rig']['bodyStyle']
        == 'classic',
    )
    page.screenshot(path=str(OUT / 'v9-comparison-ui.png'), full_page=True)
    action('pin')
    check('Pin removes all A/B differences', report()['comparison']['intersectionOverUnion'] == 1)
    # Use the actual candidate render as a local reference-image test fixture.
    uri = page.locator('#review-views canvas').first.evaluate('c=>c.toDataURL("image/png")')
    refpath = OUT / 'v9-reference-test.png'
    refpath.write_bytes(base64.b64decode(uri.split(',')[1]))
    page.locator('[data-layout="quad"]').click()
    for mode in ['normals', 'wire', 'material', 'stretch', 'silhouette', 'clay']:
        change('#review-shading', mode)
        check(
            mode + ' diagnostic mode draws the foundation',
            all(x['coverage'] > 500 for x in page.evaluate('foundationReview.renderStats()')),
        )
    for pose in ['t-pose', 'reach', 'twist', 'crouch', 'stride', 'wave', 'cast', 'sit', 'bind']:
        change('#review-pose', pose)
        check(
            pose + ' samples finite geometry', all(c['status'] != 'fail' for c in audit()['checks'])
        )
    change('#review-pose', 'twist')
    change('#review-phase', 1)
    check(
        'Twist produces measurable edge distortion',
        next(c for c in audit()['checks'] if c['key'] == 'stretch')['max'] > 1.1,
    )
    page.locator('#review-bones').check()
    page.locator('#review-labels').check()
    check(
        'Bone and socket overlays remain review settings',
        state()['settings']['bones'] and state()['settings']['labels'],
    )
    page.locator('#review-garment').uncheck()
    page.locator('#review-details').uncheck()
    check('Foundation isolation leaves only the body mesh', audit()['totals']['meshes'] == 1)
    page.locator('#review-garment').check()
    page.locator('#review-details').check()
    page.locator('#review-bones').uncheck()
    page.locator('#review-labels').uncheck()
    change('#review-pose', 'bind')
    change('#review-phase', 0.5)
    page.locator('#budget-target').select_option('crowd')
    check(
        'Crowd budget warns without changing geometry',
        audit()['technicalStatus'] == 'warning' and audit()['totals']['triangles'] == 40248,
    )
    page.locator('#budget-target').select_option('desktop')
    exported('sheet', 'v9-foundation-review.png')
    exported('pose-sheet', 'v9-pose-review.png')
    with page.expect_download(timeout=90000) as d:
        action('sweep')
    sweep_path = OUT / 'v9-proportion-sweep.json'
    d.value.save_as(str(sweep_path))
    sweep = json.loads(sweep_path.read_text())
    check(
        'Proportion sweep records all 22 independent range ends',
        len(sweep['records']) == 22 and len(set(x['parameter'] for x in sweep['records'])) == 11,
    )
    check(
        'Sweep does not change the candidate',
        sweep['source'] == report()['audit']['blueprintFingerprint'],
    )
    check('Sweep records its limited scope', 'not the full' in sweep['note'])
    for key in state()['review']['decisions']:
        page.locator('[data-decision="' + key + '"]').select_option('accept')
    check(
        'All manual decisions are required for reviewer acceptance',
        state()['review']['status'] == 'reviewer-accepted',
    )
    # This acceptance is synthetic test input, not delivered as a visual approval.
    page.locator('#review-notes').fill('TEST INPUT ONLY: <script>window.reviewInjection=1</script>')
    session_path = exported('save-session', 'v9-browser-session.review.json')
    before = state()
    change('#shape-profile', 'compact')
    imported('load-session', session_path)
    check('Review session restores both snapshots, settings and notes', state() == before)
    check('Imported note is inert text', page.evaluate('window.reviewInjection===undefined'))
    blueprint_path = exported('export-blueprint', 'v9-browser-candidate.morph.json')
    exported('obj', 'v9-browser-foundation.obj')
    candidate = state()['candidate']
    change('#shape-profile', 'heavy')
    imported('import-blueprint', blueprint_path)
    check(
        'Blueprint import restores a validated editable source', state()['candidate'] == candidate
    )
    # Static external reference import uses real OBJ parsing, not a mock loader.
    objpath = OUT / 'v9-static-reference.obj'
    objpath.write_text('v -.6 0 0\nv .6 0 0\nv .6 2.8 0\nv -.6 2.8 0\nf 1 2 3 4\n')
    imported('import-obj', objpath)
    check(
        'OBJ import selects explicit static comparison mode',
        state()['settings']['layout'] == 'compare'
        and report()['externalOBJ']['name'] == objpath.name,
    )
    check('OBJ import leaves the procedural source unchanged', state()['candidate'] == candidate)
    action('clear-obj')
    check('Static OBJ can be cleared', report()['externalOBJ'] is None)
    page.locator('[data-layout="reference"]').click()
    action('image')
    page.locator('#review-image').set_input_files(str(refpath))
    page.wait_for_function('foundationReview.report().reference!==null')
    check(
        'Local PNG reference is decoded in the offline browser',
        report()['reference']['width'] == 384,
    )
    page.locator('[data-reference="scale"]').evaluate(
        '(el)=>{el.value="1.3";el.dispatchEvent(new Event("input",{bubbles:true}));}'
    )
    page.wait_for_function('foundationReview.report().reference.alignment.scale===1.3')
    check('Image alignment is separate from the model', state()['candidate'] == candidate)
    page.screenshot(path=str(OUT / 'v9-reference-ui.png'), full_page=True)
    action('clear-image')
    check('Reference image can be cleared', report()['reference'] is None)
    # Validate creature scope, then return to the actual defined foundation.
    change('#foundation-select', 'walker')
    check(
        'Creature review includes original leg genes',
        audit()['totals']['meshes'] > 1
        and audit()['excludedGenes'] == 0
        and 'All active attachment' in audit()['coverage'],
    )
    check(
        'Humanoid-only pose and profile controls are disabled',
        page.locator('#review-pose option[value="reach"]').evaluate('e=>e.disabled')
        and page.locator('#shape-profile').is_disabled(),
    )
    change('#foundation-select', 'balanced')
    page.locator('[data-layout="quad"]').click()
    action('pin')
    action('fit')
    page.locator('#review-notes').fill(
        'Visual review pending. Check joint seams, limb shape, and game materials before asset approval.'
    )
    check(
        'New source has no retained synthetic approvals',
        state()['review']['status'] == 'not-approved',
    )
    page.locator('#proportion-fields summary').click()
    change('[data-review-proportion="arms"]', 1.1)
    check(
        'Direct proportion editing is validated and keeps the foldout open',
        state()['candidate']['rig']['proportions']['arms'] == 1.1
        and page.locator('#proportion-fields details').evaluate('e=>e.open'),
    )
    action('restore-source')
    action('pin')
    action('fit')
    page.evaluate(
        "document.querySelector('#review-toast').classList.remove('visible');document.querySelector('#proportion-fields details').open=false"
    )
    page.screenshot(path=str(OUT / 'v9-review-desktop.png'), full_page=True)
    check(
        'Desktop review has no horizontal page overflow',
        page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    page.set_viewport_size({'width': 390, 'height': 844})
    check(
        'Mobile review has no horizontal page overflow',
        page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    page.screenshot(path=str(OUT / 'v9-review-mobile.png'), full_page=True)
    probe = page.evaluate(
        '(()=>{try{return !!document.createElement("canvas").getContext("webgl2")}catch{return false}})()'
    )
    # Test the raw runtime CSS/import branch. The separate navigation suite
    # exercises the shipped combined file and actual workspace buttons.
    combined = review_html
    embedded = context.new_page()
    embedded.on('pageerror', lambda e: errors.append(str(e)))
    embedded.set_content(combined)
    embedded.wait_for_function('window.foundationReview?.ready', timeout=30000)
    check(
        'Embedded reviewer escapes the workshop height/overflow rule',
        embedded.evaluate(
            'getComputedStyle(document.querySelector("#app")).overflow==="visible"&&document.querySelector("#app").getBoundingClientRect().height>innerHeight'
        ),
    )
    check(
        'Embedded reviewer still renders real geometry',
        embedded.evaluate('foundationReview.renderStats().every(x=>x.coverage>500)'),
    )
    check(
        'Embedded reviewer has no horizontal overflow',
        embedded.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    embedded.close()
    check('Offline reviewer generated no uncaught browser errors', not errors)
    result = {
        'suite': 'v9 actual CPU geometry reviewer',
        'passed': len(checks),
        'checks': checks,
        'errors': errors,
        'offline': True,
        'network_engine_requests': len(
            [u for u in requests if u.startswith(('https://', 'http://'))]
        ),
        'webgl2_available': probe,
        'gpu_and_physics_verified': False,
        'approval_note': 'Any accepted checklist values were synthetic test inputs, not a model quality review.',
    }
    (OUT / 'v9-browser-report.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'checks'}, indent=2))
    browser.close()
