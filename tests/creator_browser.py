"""Exercise the actual packaged creator and its downloads, with engines offline.
No renderer, storage, or physics APIs are replaced. Origin storage is unavailable
under set_content; persistence faults and successful writes are covered in core tests.
"""

import json
import struct
import zipfile
from pathlib import Path

from playwright.sync_api import sync_playwright

from browser_support import launch_chromium, release_html, release_sha256, suite_dir, write_report

SUITE = Path(__file__).stem
OUT = suite_dir(SUITE)
checks = []
errors = []


def check(label, value):
    if not value:
        raise AssertionError(label)
    checks.append(label)
    print(len(checks), label, flush=True)


def number(f, sel, value):
    f.locator(sel).evaluate(
        '(e,v)=>{e.value=String(v);e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}',
        value,
    )


with sync_playwright() as p:
    browser = launch_chromium(p)
    ctx = browser.new_context(
        offline=True, accept_downloads=True, viewport={'width': 1480, 'height': 1500}
    )
    page = ctx.new_page()
    requests = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: requests.append(r.url))
    html = release_html('creator')
    page.set_content(html, timeout=30000)

    def current(mode):
        page.wait_for_function(
            '(m)=>document.documentElement.dataset.workspace===m', arg=mode, timeout=30000
        )
        f = page.frames[-1]
        if mode == 'creator':
            f.wait_for_function('window.monsterCreator?.ready', timeout=30000)
        elif mode == 'review':
            f.wait_for_function('window.foundationReview?.ready', timeout=30000)
        else:
            f.wait_for_selector('#startup-error', timeout=30000)
        return f

    f = current('creator')

    def wait():
        f.wait_for_function(
            'document.querySelector("#app").getAttribute("aria-busy")!=="true"', timeout=90000
        )

    def click(sel):
        f.locator(sel).first.click()
        if sel not in ['[data-create="inspect"]', '[data-create="workshop"]']:
            wait()

    def snapshot():
        return f.evaluate('monsterCreator.snapshot()')

    def model():
        return snapshot()['session']['current']['genome']

    def status():
        return f.evaluate('monsterCreator.status()')

    def dl(sel, name):
        with page.expect_download(timeout=90000) as d:
            click(sel)
        path = OUT / name
        d.value.save_as(str(path))
        return path

    def load(id):
        f.locator('#creator-preset').select_option(id)
        click('[data-create="load-preset"]')

    check(
        'Creator is the default workspace',
        page.evaluate('document.documentElement.dataset.workspace') == 'creator',
    )
    check('All 89 source recipes are available', f.locator('#creator-preset option').count() == 89)
    check(
        'Actual procedural triangles are visible',
        status()['counts']['triangles'] > 10000 and status()['pixels'] > 5000,
    )
    check(
        'Missing engine never blocks creation',
        not f.locator('#startup-error').count()
        and f.locator('[data-create="random"]').is_enabled(),
    )
    check(
        'Saved list starts empty; no concept-art placeholders',
        status()['saved'] == 0 and f.locator('.discovery-card').count() == 0,
    )
    check(
        'The default page does not load Rapier',
        not any('rapier' in u and u.startswith('https:') for u in requests),
    )
    check(
        'Desktop has no horizontal overflow',
        f.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    initial = model()
    f.locator('#creator-new-seed').uncheck()
    number(f, '#creator-seed', 4221)
    click('[data-create="random"]')
    random = model()
    check(
        'Randomize creates a new valid creature',
        random != initial and random['rig']['family'] == 'creature',
    )
    click('[data-create="undo"]')
    check('Undo restores original', model() == initial)
    click('[data-create="random"]')
    check('Same source and seed repeat exactly', model() == random)
    click('[data-create="save"]')
    check('Save adds one real snapshot', status()['saved'] == 1)
    first = snapshot()['collection']['items'][0]
    id1 = first['id']
    check('Saved snapshot equals visible model', first['genome'] == random)
    click('[data-create="save"]')
    check('Exact duplicate is not added twice', status()['saved'] == 1)
    click('[data-create="variation"]')
    check(
        'Variation branches without changing saved parent',
        model() != random and snapshot()['collection']['items'][0] == first,
    )
    child = model()
    click('[data-create="save"]')
    check('A branch can be kept separately', status()['saved'] == 2)
    id2 = snapshot()['collection']['items'][1]['id']
    click('[data-use-discovery="' + id1 + '"]')
    check('Load restores complete saved snapshot', model() == random)
    click('[data-favorite-discovery="' + id1 + '"]')
    click('[data-create="favorites"]')
    check('Favorites filter shows only marked discovery', f.locator('.discovery-card').count() == 1)
    click('[data-create="favorites"]')
    f.locator('#saved-search').fill('name that is not saved')
    check(
        'Search filters without deleting discoveries',
        f.locator('.discovery-card').count() == 0 and status()['saved'] == 2,
    )
    f.locator('#saved-search').fill('')
    # Each individual roll must leave unrelated traits untouched in the real controls.
    for trait in ['body', 'head', 'parts', 'surface', 'pigment', 'motion']:
        before = model()
        click('[data-roll-trait="' + trait + '"]')
        after = model()
        check(
            'Trait roll ' + trait + ' completes without error',
            status()['history']['undo'] > 0 and f.locator('[data-create="random"]').is_enabled(),
        )
        if trait in ['surface', 'pigment', 'motion']:
            check(
                trait + ' keeps structure and seed',
                all(after[k] == before[k] for k in ['nodes', 'rig', 'parts', 'seed']),
            )
        click('[data-create="undo"]')
        check(trait + ' roll is one undo step', model() == before)
    click('[data-lock-trait="head"]')
    check(
        'Attachment lock discloses body dependency',
        'hold the body' in f.locator('#creator-lock-note').inner_text(),
    )
    check(
        'Body roll is disabled while host-dependent parts are locked',
        f.locator('[data-roll-trait="body"]').is_disabled(),
    )
    before = model()
    click('[data-create="random"]')
    after = model()
    check(
        'Locked head keeps body IDs and dimensions',
        after['nodes'] == before['nodes'] and after['rig'] == before['rig'],
    )
    check('Locked roll uses original geometry seed', after['seed'] == before['seed'])
    click('[data-create="undo"]')
    click('[data-lock-trait="head"]')
    # Fixed-parent batch does not alter current or saved entries before a choice.
    before = model()
    kept = snapshot()['collection']
    click('[data-create="batch"]')
    check(
        'Six candidates are actual rendered images',
        f.locator('[data-candidate]').count() == 6
        and f.locator('[data-candidate] img').evaluate_all(
            'es=>es.every(e=>e.src.startsWith("data:image/png")&&e.complete)'
        ),
    )
    check(
        'Batch generation leaves source and saves unchanged',
        model() == before and snapshot()['collection'] == kept,
    )
    click('[data-candidate="2"]')
    chosen = model()
    check('Candidate can become the next parent', chosen != before)
    click('[data-create="save"]')
    check('Chosen branch can be saved', status()['saved'] == 3)
    click('[data-create="clear-batch"]')
    # A and B use library snapshots, not mutable selection references.
    click('[data-parent-discovery="' + id1 + '"][data-slot="a"]')
    click('[data-parent-discovery="' + id2 + '"][data-slot="b"]')
    parents = snapshot()['session']['sources']
    check('Both saved parents load independently', parents['a'] == random and parents['b'] == child)
    base = model()
    history = status()['history']['undo']
    number(f, '#creator-blend', 0.25)
    page.wait_for_timeout(500)
    check(
        'Blend slider opens an uncommitted preview',
        status()['preview'] and status()['history']['undo'] == history,
    )
    firstmix = model()
    number(f, '#creator-blend', 0.8)
    page.wait_for_timeout(500)
    number(f, '#creator-blend', 0.25)
    page.wait_for_timeout(500)
    check(
        'Slider recomputes from fixed snapshots',
        model() == firstmix and snapshot()['session']['sources'] == parents,
    )
    click('[data-create="cancel"]')
    check(
        'Cancel restores the previous current creature',
        model() == base and status()['history']['undo'] == history,
    )
    click('[data-create="mix"]')
    click('[data-create="apply"]')
    check(
        'Keep mix creates one undo step',
        not status()['preview'] and status()['history']['undo'] == history + 1,
    )
    mixed = model()
    click('[data-create="undo"]')
    check('One Undo removes complete mix', model() == base)
    click('[data-create="redo"]')
    check('Redo restores complete mix', model() == mixed)
    click('[data-create="save"]')
    collection = snapshot()['collection']
    check(
        'Mix does not change either original save',
        collection['items'][0]['genome'] == first['genome']
        and collection['items'][1]['genome'] == child,
    )
    # Rename, persist portable source and prove import/readback through real buttons.
    f.locator('#creature-name').fill('My discovery')
    f.locator('#creature-name').press('Tab')
    check(
        'Rename is visible in blueprint and recipe',
        model()['name'] == 'My discovery'
        and snapshot()['session']['current']['recipe']['result']['name'] == 'My discovery',
    )
    blueprint = dl('[data-create="export-blueprint"]', 'current.morph.json')
    check('Blueprint download matches visible source', json.loads(blueprint.read_text()) == model())
    recipe = dl('[data-create="export-recipe"]', 'current.discovery.json')
    check(
        'Roll/mix recipe includes both complete source snapshots',
        all(
            k in json.loads(recipe.read_text())
            for k in ['sources', 'frozen', 'channels', 'locks', 'result']
        ),
    )
    savedmodel = model()
    load('moonbell')
    click('[data-create="import-blueprint"]')
    f.locator('#creator-file').set_input_files(str(recipe))
    wait()
    check('Recipe import reconstructs exact named result', model() == savedmodel)
    # Reject malformed input without replacing current or collection.
    bad = OUT / 'invalid.json'
    bad.write_text('{"format":"morph-lab-discoveries","version":1,"items":[{"id":"x"}]}')
    before = snapshot()
    click('[data-create="import-collection"]')
    f.locator('#creator-file').set_input_files(str(bad))
    wait()
    check('Invalid collection import retains all data', snapshot() == before)
    collectionfile = dl('[data-create="export-collection"]', 'discoveries.json')
    check(
        'Backup contains all saved blueprints',
        json.loads(collectionfile.read_text()) == snapshot()['collection'],
    )
    count = status()['saved']
    click('[data-create="import-collection"]')
    f.locator('#creator-file').set_input_files(str(collectionfile))
    wait()
    check('Reimport deduplicates existing collection', status()['saved'] == count)
    # Deletion uses confirmation; parent A remains available afterward.
    click('[data-remove-discovery="' + id1 + '"]')
    f.locator('#cancel-remove').click()
    check('Cancel removal retains discovery', status()['saved'] == count)
    click('[data-remove-discovery="' + id1 + '"]')
    f.locator('#confirm-remove').click()
    check(
        'Confirmed deletion keeps current and parent snapshots',
        status()['saved'] == count - 1
        and snapshot()['session']['sources'] == parents
        and model() == savedmodel,
    )
    click('[data-create="import-collection"]')
    f.locator('#creator-file').set_input_files(str(collectionfile))
    wait()
    check('Backup restores removed discovery', status()['saved'] == count)
    # The existing actual GLB exporter is usable directly from creator.
    load('moonbell')
    before = snapshot()
    click('[data-create="export-glb"]')
    f.locator('#delivery-build').click()
    f.wait_for_selector('#delivery-result:not([hidden])', timeout=90000)
    with page.expect_download(timeout=30000) as d:
        f.locator('#delivery-zip').click()
    zpath = OUT / 'creator-moonbell.asset.zip'
    d.value.save_as(str(zpath))
    with zipfile.ZipFile(zpath) as z:
        raw = z.read('model.glb')
        check(
            'Creator exports actual valid GLB header and ZIP CRC',
            struct.unpack_from('<II', raw) == (0x46546C67, 2) and z.testzip() is None,
        )
        check(
            'Asset source retains visible creator genome',
            json.loads(z.read('source.morph.json')) == before['session']['current']['genome'],
        )
    check('Asset export does not alter creator state', snapshot() == before)
    f.locator('#asset-delivery [data-tool-close]').click()
    # Display controls use real geometry pixels, not a static thumbnail.
    phasehash = f.locator('#creator-canvas').evaluate('c=>c.toDataURL()')
    number(f, '#creator-phase', 0.75)
    page.wait_for_timeout(350)
    check(
        'Motion phase changes real geometry pixels',
        f.locator('#creator-canvas').evaluate('c=>c.toDataURL()') != phasehash,
    )
    color = f.locator('#creator-canvas').evaluate('c=>c.toDataURL()')
    click('[data-shading="clay"]')
    page.wait_for_timeout(250)
    check(
        'Clay display changes rendered pixels',
        f.locator('#creator-canvas').evaluate('c=>c.toDataURL()') != color,
    )
    click('[data-shading="pattern"]')
    click('[data-create="play"]')
    page.wait_for_timeout(500)
    check(
        'Play control enters playback',
        f.locator('#creator-play').get_attribute('aria-pressed') == 'true',
    )
    click('[data-create="play"]')
    click('[data-create="turntable"]')
    page.wait_for_timeout(500)
    click('[data-create="turntable"]')
    click('[data-create="fit"]')
    click('[data-create="retry-gpu"]')
    check(
        'Unavailable graphics preserves all editing controls',
        status()['backend'] == 'cpu'
        and f.locator('[data-create="random"]').is_enabled()
        and not f.locator('#startup-error').count(),
    )
    # Preserve source, collection, mix parents and locked settings across all workspaces.
    before = snapshot()
    click('[data-create="inspect"]')
    f = current('review')
    check(
        'Inspect receives current creature',
        f.evaluate('foundationReview.snapshot().candidate')
        == before['session']['current']['genome'],
    )
    f.locator('#review-notes').fill('Keep this review note.')
    page.locator('[data-open-workspace="creator"]').click()
    f = current('creator')
    check('Creator and collection survive Inspect round trip', snapshot() == before)
    click('[data-create="workshop"]')
    f = current('workshop')
    check('Offline Workshop error has Creator recovery', f.locator('#startup-creator').is_visible())
    check(
        'Workshop receives current snapshot',
        f.evaluate('window.__MORPH_WORKSPACE__.genome') == before['session']['current']['genome'],
    )
    f.locator('#startup-creator').click()
    f = current('creator')
    check('Engine failure does not lose saved discoveries', snapshot() == before)
    check(
        'Workspace changes stay in one document',
        page.url == 'about:blank' and len(page.frames) == 2,
    )
    page.locator('[data-open-workspace="review"]').click()
    f = current('review')
    check(
        'Review notes survive Creator and failed Workshop',
        f.locator('#review-notes').input_value() == 'Keep this review note.',
    )
    page.locator('[data-open-workspace="creator"]').click()
    f = current('creator')
    # Separate page can restore collection from the actual backup even with storage blocked.
    fresh = ctx.new_page()
    fresh.set_content(html)
    ff = fresh.frames[-1]
    ff.wait_for_function('window.monsterCreator?.ready', timeout=30000)
    check(
        'No unrequested fake default saves in fresh document',
        ff.evaluate('monsterCreator.status().saved') == 0,
    )
    ff.locator('[data-create="import-collection"]').click()
    ff.locator('#creator-file').set_input_files(str(collectionfile))
    ff.wait_for_function('monsterCreator.status().saved>0', timeout=30000)
    check(
        'Export/import works between separate documents',
        ff.evaluate('monsterCreator.snapshot().collection')
        == json.loads(collectionfile.read_text()),
    )
    fresh.close()
    # Screenshot contains actual runtime geometry and saved thumbnails.
    for id in ['moonbell', 'glassdart', 'trailhound']:
        load(id)
        click('[data-create="save"]')
    load('mossback')
    page.wait_for_timeout(5000)
    f.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(OUT / 'creator-desktop.png'), full_page=True)
    page.set_viewport_size({'width': 390, 'height': 900})
    page.wait_for_timeout(400)
    check(
        'Mobile creator fits viewport',
        f.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
        and page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    f.evaluate('window.scrollTo(0,0)')
    page.screenshot(path=str(OUT / 'creator-mobile.png'), full_page=True)
    check(
        'Saved thumbnails are actual generated PNGs',
        f.locator('.discovery-card img').evaluate_all(
            'es=>es.every(e=>e.src.startsWith("data:image/png")&&e.complete)'
        ),
    )
    check('No uncaught errors', not errors)
    report = {
        'suite': 'Creator: saved snapshots, mixing, exports and workspace recovery',
        'passed': len(checks),
        'checks': checks,
        'errors': errors,
        'htmlSHA256': release_sha256(),
        'rendering': 'Actual CPU geometry',
        'gpuTested': False,
        'physicsTested': False,
        'originStorageInBrowser': 'Unavailable under set_content; no mock storage used',
        'navigation': 'Exact packaged HTML via set_content; no Windows file navigation',
    }
    write_report(SUITE, report)
    print(json.dumps({k: v for k, v in report.items() if k != 'checks'}, indent=2))
    browser.close()
