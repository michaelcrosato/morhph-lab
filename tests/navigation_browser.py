"""Exercise the shipped combined file and real workspace buttons.
No engine mocks. Offline workshop failure is expected and tested as recovery.
The app runs with set_content because local file navigation is blocked in CI.
"""

import json
from pathlib import Path

from playwright.sync_api import sync_playwright

from browser_support import RELEASE, launch_chromium, release_html, suite_dir, write_report

SUITE = Path(__file__).stem
OUT = suite_dir(SUITE)
# A routed stand-in origin for the ?workshop entry; the shipped file is served unchanged.
RELEASE_ORIGIN = 'http://morph-lab.test/'
checks = []


def check(label, condition):
    if not condition:
        raise AssertionError(label)
    checks.append(label)


with sync_playwright() as p:
    browser = launch_chromium(p)
    ctx = browser.new_context(
        offline=True, accept_downloads=True, viewport={'width': 1440, 'height': 1000}
    )
    # A packaged handoff must not depend on file-origin storage permissions.
    ctx.add_init_script(
        "Object.defineProperty(window,'sessionStorage',{get(){throw new Error('Test: storage blocked');}})"
    )
    page = ctx.new_page()
    errors = []
    requests = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url))
    page.set_content(release_html('review'), timeout=30000)

    def current(mode):
        page.wait_for_function(
            '(mode)=>document.documentElement.dataset.workspace===mode', arg=mode
        )
        f = page.frames[-1]
        if mode == 'review':
            f.wait_for_function('window.foundationReview?.ready', timeout=30000)
        else:
            f.wait_for_selector('#startup-error', timeout=30000)
        return f

    f = current('review')
    check(
        'Shipped review entry opens the real CPU inspector',
        f.evaluate('foundationReview.snapshot().candidate.rig.family') == 'humanoid',
    )
    check(
        'Inspector renders visible geometry',
        f.evaluate('foundationReview.renderStats().every(x=>x.coverage>500)'),
    )
    check(
        'Inspector does not request the external engines',
        not any(u.startswith(('https:', 'http:')) for u in requests),
    )
    check('Only one workspace frame exists', len(page.frames) == 2)
    check(
        'Browser storage is blocked in this test',
        f.evaluate('(()=>{try{sessionStorage;return false}catch{return true}})()'),
    )
    f.locator('#foundation-select').select_option('heavy')
    f.locator('#review-notes').fill('Navigation regression: keep this source, baseline, and note.')
    f.locator('[data-decision="silhouette"]').select_option('accept')
    f.locator('[data-layout="compare"]').click()
    f.locator('#review-pose').select_option('reach')
    before = f.evaluate('foundationReview.snapshot()')
    f.locator('#review-workshop-link').click()
    f = current('workshop')
    check(
        'The reported Workshop link opens the embedded workshop entry',
        f.evaluate('window.__MORPH_WORKSPACE__.workspace') == 'workshop',
    )
    check('The outer document never navigates to another file', page.url == 'about:blank')
    check(
        'No request for a missing HTML file was made',
        not any(u.startswith('file:') or '.html' in u for u in requests),
    )
    check(
        'The workshop receives the edited candidate',
        f.evaluate('window.__MORPH_WORKSPACE__.genome') == before['candidate'],
    )
    check(
        'Engine requests start only after Workshop is selected',
        any('three@0.181.0' in u for u in requests)
        and any('rapier3d-compat@0.19.3' in u for u in requests),
    )
    check(
        'Offline engine failure has an in-app recovery screen',
        'still use the inspector offline' in f.locator('#startup-error').inner_text(),
    )
    check(
        'Error details do not print embedded source code',
        'data:' not in f.locator('#startup-error-detail').inner_text()
        and len(f.locator('#startup-error-detail').inner_text()) <= 500,
    )
    check(
        'The old inspector frame is removed',
        len(page.frames) == 2 and not f.evaluate('!!window.foundationReview'),
    )
    page.screenshot(path=str(OUT / 'workshop-offline.png'), full_page=True)
    f.locator('#startup-inspect').click()
    f = current('review')
    after = f.evaluate('foundationReview.snapshot()')
    check('Return to Inspect restores the candidate', after['candidate'] == before['candidate'])
    check(
        'Return restores the source and baseline',
        after['source'] == before['source'] and after['baseline'] == before['baseline'],
    )
    check('Return restores review notes', after['review']['notes'] == before['review']['notes'])
    check(
        'Return restores review decisions for an unchanged blueprint',
        after['review']['decisions'] == before['review']['decisions'],
    )
    check(
        'Return restores the camera and pose settings',
        after['settings'] == before['settings'] and after['frame'] == before['frame'],
    )
    check(
        'Restored notes are visible in the editor',
        f.locator('#review-notes').input_value() == before['review']['notes'],
    )
    with page.expect_download() as pending:
        f.locator('[data-review="export-blueprint"]').click()
    export = OUT / 'restored.morph.json'
    pending.value.save_as(str(export))
    check(
        'Restored blueprint export is valid and unchanged',
        json.loads(export.read_text()) == before['candidate'],
    )
    # The lower Open in workshop button must use the same path as the header link.
    f.locator('button[data-review="workshop"]').click()
    f = current('workshop')
    check(
        'Open in workshop button uses the embedded route',
        f.evaluate('window.__MORPH_WORKSPACE__.genome') == before['candidate'],
    )
    page.locator('[data-open-workspace="review"]').click()
    f = current('review')
    check(
        'Persistent toolbar recovers from engine failure',
        f.evaluate('foundationReview.snapshot().candidate') == before['candidate'],
    )
    page.locator('[data-open-workspace="workshop"]').click()
    f = current('workshop')
    check(
        'Persistent Workshop toolbar uses the same embedded route',
        len(page.frames) == 2 and page.url == 'about:blank',
    )
    page.locator('[data-open-workspace="review"]').click()
    f = current('review')
    page.evaluate(
        "window.postMessage({type:'morph-lab:workspace',workspace:'workshop',payload:{}},'*')"
    )
    page.wait_for_timeout(80)
    check(
        'Messages from outside the active workspace are ignored',
        page.evaluate('document.documentElement.dataset.workspace') == 'review',
    )
    page.screenshot(path=str(OUT / 'inspector.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 844})
    check(
        'The combined layout fits a mobile viewport',
        page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        and f.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    page.screenshot(path=str(OUT / 'mobile.png'), full_page=True)
    # Morph-Lab.html?workshop opens Workshop first and still contains the entire inspector.
    # Serve the exact shipped bytes from a routed origin: file:// navigation may be blocked.
    other = ctx.new_page()
    other.on('pageerror', lambda e: errors.append(str(e)))
    shipped = RELEASE.read_text()
    other.route(
        RELEASE_ORIGIN + '**', lambda route: route.fulfill(body=shipped, content_type='text/html')
    )
    other.goto(RELEASE_ORIGIN + 'Morph-Lab.html?workshop', timeout=30000)
    other.frames[-1].wait_for_selector('#startup-error', timeout=30000)
    first_workspace = other.evaluate('document.documentElement.dataset.workspace')
    other.locator('[data-open-workspace="review"]').click()
    other.wait_for_function('document.documentElement.dataset.workspace==="review"')
    other.frames[-1].wait_for_function('window.foundationReview?.ready', timeout=30000)
    check(
        'The ?workshop entry opens Workshop and also contains a working offline inspector',
        first_workspace == 'workshop'
        and other.frames[-1].evaluate('foundationReview.renderStats().every(x=>x.coverage>500)'),
    )
    check('No uncaught browser errors occurred', not errors)
    result = {
        'suite': 'Combined-workspace navigation',
        'passed': len(checks),
        'checks': checks,
        'uncaughtErrors': errors,
        'offline': True,
        'entryMethod': (
            'Playwright set_content with the shipped HTML set to start in Inspect; the '
            '?workshop entry is the unchanged file served from a routed http origin'
        ),
        'fileNavigationTested': False,
        'fileNavigationLimitation': (
            'Direct file navigation can be blocked by the test environment '
            '(ERR_BLOCKED_BY_ADMINISTRATOR), so this suite does not use it. In-file switches '
            'were exercised through the real buttons.'
        ),
        'engineMocks': False,
        'engineFailureRecoveryTested': True,
        'fullWebGL2WorkshopTested': False,
        'rapierTested': False,
    }
    write_report(SUITE, result)
    print(json.dumps({k: v for k, v in result.items() if k != 'checks'}, indent=2))
    browser.close()
