"""Browser checks for the real editor modules, without substituting engine APIs.
The harness has no renderer. These checks do not prove Three.js or Rapier works.
"""

from pathlib import Path
import json, re, os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
checks = []


def check(name, ok):
    if not ok:
        raise AssertionError(name)
    checks.append(name)


def harness_html():
    built = (ROOT / 'dist/runtime.html').read_text()
    imports = re.search(r'<script type="importmap">(.*?)</script>', built, re.S).group(1)
    entry = (
        (ROOT / 'tests/ui-harness.html')
        .read_text()
        .split('<script type="module">')[1]
        .split('</script>')[0]
        .replace('../src/', 'morph/src/')
    )
    return (
        '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'
        + (ROOT / 'style.css').read_text()
        + '</style><script type="importmap">'
        + imports
        + '</script></head><body><div id="app"></div><script type="module">'
        + entry
        + '</script></body></html>'
    )


with sync_playwright() as p:
    launch = {
        'headless': True,
        'args': [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--enable-unsafe-swiftshader',
            '--use-gl=angle',
            '--use-angle=swiftshader',
        ],
    }
    binary = os.environ.get('CHROMIUM_PATH') or (
        '/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else None
    )
    if binary:
        launch['executable_path'] = binary
    browser = p.chromium.launch(**launch)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.set_content(harness_html())
    page.wait_for_function('window.harness?.ready', timeout=15000)
    state = lambda: page.evaluate('harness.store.state')
    tab = lambda name: page.locator(f'.inspector-tabs [data-tab="{name}"]').click()

    def drag(selector, value):
        page.locator(selector).evaluate(
            '(el,v)=>{el.value=String(v);el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}));}',
            value,
        )

    def action(name):
        page.locator(f'[data-action="{name}"]').first.click()

    check(
        'Schema 6 boots with the humanoid foundation',
        state()['version'] == 6 and state()['rig']['family'] == 'humanoid',
    )
    check('Five inspector tabs are available', page.locator('.inspector-tabs button').count() == 5)
    page.locator('[data-library="models"]').click()
    check('89 model presets are available', page.locator('#model-library button').count() == 89)
    page.locator('#library-search').fill('humanoid')
    check(
        'Humanoid search returns 27 models',
        page.locator('#model-library button:visible').count() == 27,
    )
    for model in [
        'wayfarer',
        'warden',
        'ranger',
        'goblin',
        'ogre',
        'revenant',
        'golem',
        'fiend',
        'arcanist',
    ]:
        page.locator(f'[data-preset="{model}"]').click()
        check(
            model + ' loads a humanoid blueprint',
            state()['rig']['family'] == 'humanoid' and len(state()['nodes']) == 4,
        )
    page.locator('#library-search').fill('')
    page.locator('#model-library [data-preset="wayfarer"]').click()
    tab('actor')
    check(
        'Actor inspector shows the skeleton contract',
        '22 named bones' in page.locator('#inspector-content').inner_text(),
    )
    old = state()
    page.locator('[data-rig-field="bodyStyle"]').select_option('defined')
    check(
        'Defined body style rebuilds canonical humanoid nodes',
        state()['rig']['bodyStyle'] == 'defined' and state()['nodes'] != old['nodes'],
    )
    action('undo')
    check('Body construction has a full undo step', state() == old)
    check('Eleven proportion controls are exposed', page.locator('[data-proportion]').count() == 11)
    before = state()
    undo = page.evaluate('harness.store.past.length')
    drag('[data-proportion="arms"]', 1.25)
    check(
        'Arm proportion is validated and persistent', state()['rig']['proportions']['arms'] == 1.25
    )
    check(
        'Proportion edit commits one undo transaction',
        page.evaluate('harness.store.past.length') == undo + 1,
    )
    action('undo')
    check('Undo restores the whole humanoid blueprint', state() == before)
    action('redo')
    check('Redo restores the proportion', state()['rig']['proportions']['arms'] == 1.25)
    drag('[data-proportion="scale"]', 1.15)
    check('Overall scale changes the canonical body nodes', state()['nodes'] != before['nodes'])
    page.locator('[data-rig-field="outfit"]').select_option('armor')
    check('Outfit selection persists', state()['rig']['outfit'] == 'armor')
    page.locator('[data-rig-field="headStyle"]').select_option('hood')
    check('Head cover selection persists', state()['rig']['headStyle'] == 'hood')
    page.locator('[data-rig-field="handStyle"]').select_option('claws')
    check('Hand style selection persists', state()['rig']['handStyle'] == 'claws')
    page.locator('[data-toggle="rigGuides"]').check()
    check('Skeleton diagnostic option is routed', page.evaluate('harness.editor.options.rigGuides'))
    page.locator('[data-actor-role]').select_option('brute')
    check(
        'Role recipe changes health and behavior metadata',
        state()['actor']['health'] == 240 and state()['actor']['role'] == 'brute',
    )
    page.locator('[data-actor-field="faction"]').select_option('neutral')
    check('Faction can be edited independently', state()['actor']['faction'] == 'neutral')
    page.locator('summary').filter(has_text='Role tuning').click()
    drag('[data-actor-number="speed"]', 1.1)
    check('Speed multiplier persists', state()['actor']['speed'] == 1.1)
    page.locator('[data-generator="count"]').fill('4')
    page.locator('[data-generator="seed"]').fill('7021')
    drag('[data-generator="variation"]', 0.35)
    source = state()
    action('generate-roster')
    check(
        'Roster creates the selected actor count', page.locator('.roster-list button').count() == 4
    )
    check('Generating a roster does not change the source', state() == source)
    roster = page.evaluate('harness.editor.roster')
    action('generate-roster')
    check('Same settings reproduce the roster', page.evaluate('harness.editor.roster') == roster)
    page.locator('.roster-list button').nth(2).click()
    check(
        'Roster entry loads as an editable blueprint', state() == roster['actors'][2]['blueprint']
    )
    with page.expect_download() as d:
        action('export-actor')
    actor_path = OUT / 'browser-export.actor.json'
    d.value.save_as(str(actor_path))
    exported = json.loads(actor_path.read_text())
    check(
        'Actor export contains a complete blueprint',
        exported['format'] == 'morph-lab-actor' and exported['blueprint'] == state(),
    )
    with page.expect_download() as d:
        action('export-roster')
    roster_path = OUT / 'browser-export.roster.json'
    d.value.save_as(str(roster_path))
    check(
        'Roster export contains all entries',
        len(json.loads(roster_path.read_text())['actors']) == 4,
    )
    tab('motion')
    check(
        '36 action choices include no-action',
        page.locator('[data-action="human-action"]').count() == 36,
    )
    page.locator('[data-action="human-action"][data-clip="wave"]').click()
    check(
        'Wave selects a looping action',
        state()['motion']['humanoid']['action'] == 'wave'
        and state()['motion']['humanoid']['repeat'],
    )
    check(
        'Action selection asks the runtime to replay',
        'human-replay' in page.evaluate('harness.actions'),
    )
    page.locator('[data-action="human-action"][data-clip="attack"]').click()
    check('Melee swing defaults to one-shot', not state()['motion']['humanoid']['repeat'])
    drag('[data-human-number="actionWeight"]', 0.65)
    check(
        'Action blending changes persistent settings',
        state()['motion']['humanoid']['actionWeight'] == 0.65,
    )
    page.locator('[data-human-field="mask"]').select_option('upper')
    check('Upper-body mask persists', state()['motion']['humanoid']['mask'] == 'upper')
    page.locator('[data-human-field="style"]').select_option('heavy')
    check('Gait style persists', state()['motion']['humanoid']['style'] == 'heavy')
    action('human-replay')
    check(
        'Replay routes to runtime callback',
        page.evaluate('harness.actions').count('human-replay') >= 3,
    )
    page.locator('[data-action="motion-preset"][data-clip="walk"]').click()
    check(
        'Base locomotion edits do not erase the action',
        state()['motion']['weights']['walk'] == 1
        and state()['motion']['humanoid']['action'] == 'attack',
    )
    page.locator('[data-library="parts"]').click()
    page.locator('[data-action="add"][data-type="horn"]').click()
    tab('anatomy')
    check(
        'Humanoids retain the original monster part library', state()['parts'][-1]['type'] == 'horn'
    )
    page.locator('[data-part-socket]').select_option('hand')
    drag('[data-socket-offset="1"]', 0.15)
    check(
        'Hand socket and offset persist',
        state()['parts'][-1]['socket'] == 'hand'
        and state()['parts'][-1]['socketOffset'][1] == 0.15,
    )
    prev_nodes = len(state()['nodes'])
    page.locator('[data-action="add"][data-type="body"]').click()
    check(
        'Free body-node edits are blocked on humanoids',
        len(state()['nodes']) == prev_nodes and 'rig-owned' in page.locator('#toast').inner_text(),
    )
    page.locator('[data-action="add"][data-type="leg"]').click()
    tab('actor')
    check(
        'Incompatible creature legs are retained with a warning',
        'retained but inactive' in page.locator('#inspector-content').inner_text(),
    )
    # Prove the joint-placement path uses the same validated store.
    page.evaluate(
        "harness.editor.arm('antenna');harness.editor.placeAtSocket('hand',-1,[.2,.8,.1])"
    )
    check(
        'Joint placement preserves selected side and socket',
        state()['parts'][-1]['socket'] == 'hand' and state()['parts'][-1]['anchor'][0] < 0,
    )
    tab('mixer')
    page.locator('[data-mix-source="a"]').select_option('fiend')
    page.locator('[data-mix-source="b"]').select_option('mossback')
    page.locator('[data-mix-topology]').select_option('a')
    check(
        'Explicit humanoid topology survives a creature mix', state()['rig']['family'] == 'humanoid'
    )
    check(
        'Mixer reports the rig boundary', 'Rig family' in page.locator('#mix-status').inner_text()
    )
    page.locator('[data-mix-action="apply"]').click()
    check('Mixed humanoid remains editable', state()['rig']['family'] == 'humanoid')
    # Import actor and roster using the normal import handler.
    page.locator('#import-file').set_input_files(str(actor_path))
    page.wait_for_function(
        '(g)=>JSON.stringify(harness.store.state)===JSON.stringify(g)', arg=exported['blueprint']
    )
    check('Actor import restores the exported blueprint', state() == exported['blueprint'])
    page.locator('#import-file').set_input_files(str(roster_path))
    page.wait_for_function('harness.view.tab==="actor"')
    check(
        'Roster import populates the Actor inspector',
        page.locator('.roster-list button').count() == 4,
    )
    # New content workflows use the same real editor modules and store.
    page.locator('#library-search').fill('')
    page.locator('[data-library="models"]').click()
    for model in [
        'duelist',
        'outrider',
        'artisan',
        'pilgrim',
        'grovekeeper',
        'oracle',
        'jackal',
        'clockwork',
        'crownstag',
        'myconid',
        'shardback',
        'billrunner',
        'boglurker',
        'sunmanta',
        'rootweaver',
        'ironmaw',
    ]:
        page.locator(f'[data-preset="{model}"]').click()
        check(model + ' loads the v4 preset', state()['version'] == 6 and len(state()['parts']) > 0)
    page.locator('#model-library [data-preset="wayfarer"]').click()
    page.locator('[data-library="kits"]').click()
    check(
        'Thirty-one grouped kits are visible',
        page.locator('[data-action="apply-kit"]').count() == 31,
    )
    before = state()
    undo = page.evaluate('harness.store.past.length')
    page.locator('[data-kit="guard"]').click()
    check('Guard kit adds three editable genes', len(state()['parts']) == 3)
    check(
        'Guard kit sets right hand and left forearm sockets',
        state()['parts'][0]['socket'] == 'hand'
        and state()['parts'][0]['anchor'][0] < 0
        and state()['parts'][1]['socket'] == 'forearm',
    )
    check('Kit adds one undo step', page.evaluate('harness.store.past.length') == undo + 1)
    action('undo')
    check('Undo removes the complete kit', state() == before)
    action('redo')
    check('Redo restores the complete kit', len(state()['parts']) == 3)
    tab('anatomy')
    page.evaluate('harness.editor.select(harness.store.state.parts[0].id)')
    check(
        'Part material exposes seven choices',
        page.locator('[data-part-material] option').count() == 7,
    )
    page.locator('[data-part-material]').select_option('bone')
    check('Independent part material persists', state()['parts'][0]['material'] == 'bone')
    check(
        'New shape labels are descriptive',
        'Saber' in page.locator('[data-field="variant"]').inner_text(),
    )
    page.locator('[data-field="variant"]').select_option('1')
    check('Saber shape persists', state()['parts'][0]['variant'] == 1)
    action('undo')
    check(
        'Variant undo retains independent material',
        state()['parts'][0]['variant'] == 0 and state()['parts'][0]['material'] == 'bone',
    )
    page.locator('#library-search').fill('crystal')
    check('Kit search filters by recipe content', page.locator('.kit-card:visible').count() == 2)
    page.locator('#library-search').fill('')
    page.locator('[data-library="models"]').click()
    page.locator('[data-preset="sprout"]').click()
    page.locator('[data-library="kits"]').click()
    check(
        'Humanoid equipment kits are disabled on creatures',
        page.locator('[data-kit="guard"]').is_disabled(),
    )
    page.locator('[data-kit="botanical"]').click()
    check(
        'Universal botanical kit works on a one-node creature',
        all(x['host'] == 'core' for x in state()['parts']),
    )
    page.locator('[data-library="models"]').click()
    page.locator('#model-library [data-preset="wayfarer"]').click()
    page.locator('[data-library="parts"]').click()
    check(
        '73 attachment families plus body are listed',
        page.locator('[data-action="add"]').count() == 74,
    )
    for part in [
        'ear',
        'antler',
        'beak',
        'muzzle',
        'crystal',
        'foliage',
        'blade',
        'shield',
        'staff',
        'pack',
        'pauldron',
        'banner',
    ]:
        page.locator(f'[data-action="add"][data-type="{part}"]').click()
        check(
            part + ' attaches through the normal editor command',
            state()['parts'][-1]['type'] == part,
        )
    tab('motion')
    for clip in ['backpedal', 'strafe', 'prowl', 'trot']:
        page.locator(f'[data-action="motion-preset"][data-clip="{clip}"]').click()
        check(clip + ' is a selectable motion state', state()['motion']['weights'][clip] == 1)
    for clip in [
        'bow',
        'kneel',
        'pray',
        'inspect',
        'interact',
        'carry',
        'push',
        'work',
        'thrust',
        'kick',
        'dodge',
        'roar',
    ]:
        page.locator(f'[data-action="human-action"][data-clip="{clip}"]').click()
        check(clip + ' is a selectable action', state()['motion']['humanoid']['action'] == clip)
    check(
        'All seven humanoid gait styles are listed',
        page.locator('[data-human-field="style"] option').count() == 7,
    )
    page.locator('[data-human-field="style"]').select_option('nimble')
    check('Nimble style persists', state()['motion']['humanoid']['style'] == 'nimble')
    tab('surface')
    check(
        '46 skin patterns are exposed',
        page.locator('[data-layer-field="pattern"]').first.locator('option').count() == 46,
    )
    check('31 microtextures are exposed', page.locator('[data-surface-micro] option').count() == 31)
    check(
        '46 material recipes are exposed',
        page.locator('[data-action="surface-preset"]').count() == 46,
    )
    for recipe in [
        'linen',
        'leather',
        'iron',
        'bronze',
        'bark',
        'porcelain',
        'biofiber',
        'circuit',
    ]:
        page.locator(f'[data-action="surface-preset"][data-preset="{recipe}"]').click()
        check(
            recipe + ' material recipe commits',
            state()['appearance']['micro']
            in ['weave', 'leather', 'brushed', 'pitted', 'bark', 'pores', 'hex'],
        )
    for pattern in [
        'rosettes',
        'mottled',
        'veins',
        'weave',
        'lattice',
        'woodgrain',
        'circuit',
        'patches',
    ]:
        page.locator('[data-layer-field="pattern"]').first.select_option(pattern)
        check(pattern + ' pigment pattern persists', state()['appearance']['pattern'] == pattern)
    for micro in ['weave', 'brushed', 'bark', 'pitted', 'hex', 'leather']:
        page.locator('[data-surface-micro]').select_option(micro)
        check(micro + ' microtexture persists', state()['appearance']['micro'] == micro)
    tab('mixer')
    page.locator('[data-mix-source="a"]').select_option('grovekeeper')
    page.locator('[data-mix-source="b"]').select_option('clockwork')
    page.locator('[data-mix-topology]').select_option('a')
    check(
        'Expansion models work as mixer sources',
        state()['rig']['family'] == 'humanoid' and len(state()['parts']) > 0,
    )
    with page.expect_download() as download:
        page.locator('[data-mix-action="export"]').click()
    mix_path = OUT / 'browser-v4.morphmix.json'
    download.value.save_as(str(mix_path))
    check(
        'Mixer export contains v6 blueprints',
        json.loads(mix_path.read_text())['sources']['a']['version'] == 6,
    )
    page.locator('[data-mix-action="apply"]').click()
    tab('actor')
    page.locator('[data-generator="count"]').fill('3')
    action('generate-roster')
    check(
        'Roster generation accepts mixed equipment and materials',
        len(page.evaluate('harness.editor.roster.actors')) == 3,
    )
    # Leave a useful library view for the explicitly labelled harness screenshot.
    page.locator('[data-library="kits"]').click()
    # Add an explicit label; the screenshot must not imply a tested 3D renderer.
    page.evaluate(
        "const badge=document.createElement('p');badge.textContent='EDITOR TEST HARNESS · 3D RENDERER NOT LOADED';badge.style='position:absolute;top:48%;left:10%;width:80%;text-align:center;color:#748677;font:12px monospace;letter-spacing:1px';document.querySelector('#viewport').append(badge)"
    )
    page.locator('.inspector-scroll').evaluate('el=>el.scrollTop=0')
    page.locator('#kit-library').evaluate('el=>el.scrollTop=0')
    page.evaluate("document.querySelector('#toast').classList.remove('visible')")
    page.screenshot(path=str(OUT / 'v9-editor-desktop.png'))
    check(
        'Desktop layout has no page-wide horizontal overflow',
        page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    page.set_viewport_size({'width': 390, 'height': 844})
    check(
        'Mobile layout has no page-wide horizontal overflow',
        page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),
    )
    check(
        'Mobile library tabs are separate rows',
        page.evaluate(
            "(()=>{const b=[...document.querySelectorAll('.library-tabs button')].map(e=>e.getBoundingClientRect());return b[0].bottom<=b[1].top+1&&b[1].bottom<=b[2].top+1;})()"
        ),
    )
    page.screenshot(path=str(OUT / 'v9-editor-mobile.png'), full_page=True)
    webgl = page.evaluate(
        "(()=>{const c=document.createElement('canvas');try{const gl=c.getContext('webgl2');return gl?{available:true,version:gl.getParameter(gl.VERSION)}:{available:false}}catch(e){return {available:false,error:e.message}}})()"
    )
    check('Editor produced no uncaught browser errors', len(errors) == 0)
    report = {
        'suite': 'v9 editor regression harness (no Three.js or Rapier)',
        'passed': len(checks),
        'checks': checks,
        'errors': errors,
        'webgl2_probe': webgl,
    }
    (OUT / 'v9-editor-report.json').write_text(json.dumps(report, indent=2))
    print(json.dumps({'passed': len(checks), 'errors': errors, 'webgl2_probe': webgl}, indent=2))
    browser.close()
