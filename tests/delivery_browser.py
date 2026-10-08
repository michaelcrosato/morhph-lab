"""Use the exact combined HTML, real CPU geometry, real download buttons, and actual capability checks.
No engine or WebGL substitute. Engine failure in the offline context must be reported as blocked.
"""

from pathlib import Path
import json, os, zipfile, hashlib, struct
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/v11/regression-delivery'
OUT.mkdir(parents=True, exist_ok=True)
checks = []


def check(label, condition):
    if not condition:
        raise AssertionError(label)
    checks.append(label)


def load_model(f, id):
    f.locator('#model-select').evaluate('e=>e.closest("details").open=true')
    f.locator('#review-collection').select_option('all')
    f.locator('#model-select').select_option(id)


def download(page, f, selector, target):
    with page.expect_download(timeout=90000) as d:
        f.locator(selector).click()
    path = OUT / target
    d.value.save_as(str(path))
    return path


with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
        headless=True,
        args=['--no-sandbox', '--disable-dev-shm-usage'],
    )
    ctx = browser.new_context(
        offline=True, accept_downloads=True, viewport={'width': 1540, 'height': 1120}
    )
    page = ctx.new_page()
    errors = []
    requests = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url))
    page.set_content((ROOT / 'dist/Morph-Lab-Review.html').read_text(), timeout=30000)
    f = page.frames[-1]
    f.wait_for_function('window.foundationReview?.ready', timeout=30000)
    check('Current shell is version 12', '12.0.0' in page.locator('header').inner_text())
    check('All 89 models remain', f.locator('#model-select option').count() == 89)
    check(
        'No engine requests during offline startup',
        not any(x.startswith(('http:', 'https:')) for x in requests),
    )
    check(
        'CPU meshes render', f.evaluate('foundationReview.renderStats().every(x=>x.coverage>500)')
    )
    load_model(f, 'moonbell')
    before = f.evaluate('foundationReview.snapshot()')
    f.locator('[data-review="delivery"]').first.click()
    check('Delivery opens as a modal', f.locator('#asset-delivery').evaluate('e=>e.open'))
    check('Supported source is eligible', not f.locator('#delivery-build').is_disabled())
    check(
        'Limits are explicit',
        'not a reusable skeleton' in f.locator('#asset-delivery').inner_text(),
    )
    f.locator('#delivery-mode').select_option('motion')
    check(
        'Motion controls show and static controls hide',
        f.locator('#delivery-frames').is_visible() and not f.locator('#delivery-pose').is_visible(),
    )
    check('Default uses eight morph targets', f.locator('#delivery-frames').input_value() == '9')
    f.locator('#delivery-build').click()
    f.wait_for_selector('#delivery-result:not([hidden])', timeout=90000)
    check(
        'Build produces a nonempty summary',
        'MiB' in f.locator('#delivery-summary').inner_text()
        and 'undefined' not in f.locator('#delivery-summary').inner_text(),
    )
    check(
        'Open endpoints are reported',
        'Endpoints differ' in f.locator('#delivery-loop').inner_text(),
    )
    page.screenshot(path=str(OUT / 'v10-delivery-desktop.png'), full_page=True)
    zpath = download(page, f, '#delivery-zip', 'browser-moonbell.asset.zip')
    gpath = download(page, f, '#delivery-glb', 'browser-moonbell.glb')
    with zipfile.ZipFile(zpath) as z:
        check('Archive passes CRC verification', z.testzip() is None)
        check(
            'Archive includes five documented files',
            set(z.namelist())
            == {'model.glb', 'source.morph.json', 'audit.json', 'manifest.json', 'README.txt'},
        )
        manifest = json.loads(z.read('manifest.json'))
        audit = json.loads(z.read('audit.json'))
        check(
            'GLB button and ZIP contain identical bytes', z.read('model.glb') == gpath.read_bytes()
        )
        check(
            'Every listed SHA-256 and length matches',
            all(
                hashlib.sha256(z.read(x['name'])).hexdigest() == x['sha256']
                and len(z.read(x['name'])) == x['bytes']
                for x in manifest['files']
            ),
        )
        check(
            'Source is exactly the captured candidate',
            json.loads(z.read('source.morph.json')) == before['candidate'],
        )
        check('Nine poses are audited', len(audit['frames']) == 9)
        check(
            'No GPU or visual approval is claimed',
            audit['gpuVerified'] is False and manifest['checks']['visualApproval'] is False,
        )
    check(
        'Download is actual GLB v2',
        struct.unpack('<III', gpath.read_bytes()[:12]) == (0x46546C67, 2, gpath.stat().st_size),
    )
    check(
        'Export did not alter session or manual decisions',
        f.evaluate('foundationReview.snapshot()') == before,
    )
    f.locator('#delivery-frames').select_option('17')
    check('Changed settings hide stale output', not f.locator('#delivery-result').is_visible())
    # Cancel synchronously from the progress boundary; the actual Cancel button aborts the actual job.
    f.evaluate(
        """(()=>{const p=document.querySelector('#delivery-progress'),c=document.querySelector('#delivery-cancel');const o=new MutationObserver(()=>{if(!c.hidden){o.disconnect();c.click();}});o.observe(c,{attributes:true,attributeFilter:['hidden']});})()"""
    )
    f.locator('#delivery-build').click()
    f.wait_for_function(
        'document.querySelector("#delivery-status").textContent.includes("cancelled")',
        timeout=30000,
    )
    check('Cancel leaves no result', not f.locator('#delivery-result').is_visible())
    check('Cancel restores build controls', not f.locator('#delivery-build').is_disabled())
    f.locator('#asset-delivery [data-tool-close]').click()
    check('Close removes the dialog', f.locator('#asset-delivery').count() == 0)
    load_model(f, 'mossback')
    before_missing = f.evaluate('foundationReview.snapshot()')
    f.locator('[data-review="delivery"]').first.click()
    check(
        'Original model now permits complete geometry export',
        not f.locator('#delivery-build').is_disabled(),
    )
    check(
        'Complete source reports active geometry coverage',
        'all active' in f.locator('#delivery-coverage').inner_text(),
    )
    source = download(page, f, '#delivery-source', 'browser-blocked-source.json')
    check(
        'Original model exports its complete unchanged blueprint',
        json.loads(source.read_text()) == before_missing['candidate'],
    )
    f.locator('#asset-delivery [data-tool-close]').click()
    load_model(f, 'archivist')
    f.locator('[data-review="delivery"]').first.click()
    f.locator('#delivery-target').select_option('crowd')
    f.locator('#delivery-build').click()
    f.wait_for_function(
        'document.querySelector("#delivery-status").textContent.includes("warnings")', timeout=60000
    )
    check('Budget warnings need acknowledgement', not f.locator('#delivery-result').is_visible())
    f.locator('#delivery-warnings').check()
    f.locator('#delivery-build').click()
    f.wait_for_selector('#delivery-result:not([hidden])', timeout=60000)
    check(
        'Acknowledged warning is retained', 'warning' in f.locator('#delivery-status').inner_text()
    )
    check(
        'Static export is not described as animated',
        'No animation' in f.locator('#delivery-loop').inner_text(),
    )
    page.set_viewport_size({'width': 390, 'height': 844})
    check(
        'Delivery dialog fits a phone width',
        f.locator('#asset-delivery').evaluate(
            'e=>e.getBoundingClientRect().right<=innerWidth && e.scrollWidth<=e.clientWidth+1'
        ),
    )
    page.screenshot(path=str(OUT / 'v10-delivery-mobile.png'), full_page=True)
    f.locator('#asset-delivery [data-tool-close]').click()
    page.set_viewport_size({'width': 1540, 'height': 1120})
    f.locator('[data-review="system-checks"]').click()
    check('System panel opens offline', f.locator('#system-checks').evaluate('e=>e.open'))
    f.locator('#system-local').click()
    f.wait_for_function('!document.querySelector("#system-download").disabled', timeout=30000)
    local = json.loads(
        download(page, f, '#system-download', 'browser-system-local.json').read_text()
    )
    check('Browser report has local scope', local['scope'] == 'local')
    check(
        'Actual WebAssembly compiles',
        next(x for x in local['checks'] if x['id'] == 'wasm')['status'] == 'pass',
    )
    webgl = next(x for x in local['checks'] if x['id'] == 'webgl2')['status'] == 'pass'
    check('Unavailable WebGL2 is not reported as passed', webgl or local['status'] == 'blocked')
    check(
        'No file paths or model data in the report',
        'candidate' not in local and 'pathname' not in local['environment'],
    )
    f.locator('#system-full').click()
    f.wait_for_function('!document.querySelector("#system-download").disabled', timeout=90000)
    full = json.loads(download(page, f, '#system-download', 'browser-system-full.json').read_text())
    check('Offline engine report is blocked', full['status'] == 'blocked')
    check(
        'Engine load failure is explicit',
        all(
            next(x for x in full['checks'] if x['id'] == id)['status'] == 'blocked'
            for id in ['three-load', 'rapier-load']
        ),
    )
    check(
        'All three physical controllers remain unverified without Rapier',
        all(
            next(x for x in full['checks'] if x['id'] == 'physics-' + medium)['status'] == 'blocked'
            for medium in ['ground', 'water', 'air']
        ),
    )
    check(
        'Model render remains unverified without engines',
        next(x for x in full['checks'] if x['id'] == 'three-render')['status'] == 'blocked',
    )
    page.screenshot(path=str(OUT / 'v10-system-checks.png'), full_page=True)
    f.locator('#system-checks [data-tool-close]').click()
    saved = f.evaluate('foundationReview.snapshot()')
    f.locator('#review-workshop-link').click()
    page.wait_for_function('document.documentElement.dataset.workspace==="workshop"')
    f = page.frames[-1]
    f.wait_for_selector('#startup-error', timeout=30000)
    check(
        'Offline Workshop has a diagnostic entry', f.locator('#startup-system-checks').is_visible()
    )
    f.locator('#startup-system-checks').click()
    check('Startup error opens real diagnostics', f.locator('#system-checks').evaluate('e=>e.open'))
    f.locator('#system-checks [data-tool-close]').click()
    f.locator('#startup-inspect').click()
    page.wait_for_function('document.documentElement.dataset.workspace==="review"')
    f = page.frames[-1]
    f.wait_for_function('window.foundationReview?.ready', timeout=30000)
    check(
        'Return from failed Workshop retains source and edits',
        f.evaluate('foundationReview.snapshot()') == saved,
    )
    check('No uncaught application errors', not errors)
    report = {
        'suite': 'v11 regression asset delivery and diagnostic UI',
        'passed': len(checks),
        'checks': checks,
        'webgl2Available': webgl,
        'engineRenderingTested': False,
        'physicsTested': False,
        'errors': errors,
        'htmlSHA256': hashlib.sha256(
            (ROOT / 'dist/Morph-Lab-Review.html').read_bytes()
        ).hexdigest(),
    }
    (OUT / 'browser-report.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'checks'}, indent=2))
    browser.close()
