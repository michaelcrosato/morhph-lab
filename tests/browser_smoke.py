"""Full engine/browser smoke test. NOT executed in the delivery environment.
Prerequisites: npm install; npm run dev; Python Playwright with Chromium.
Runs the real application over HTTP, never substitutes an engine mock.
"""

import json
import math
import os
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('MORPH_URL', 'http://localhost:3000')
OUT = Path(os.environ.get('TEST_OUTPUT', 'test-results'))
OUT.mkdir(parents=True, exist_ok=True)
checks, errors, console_errors = [], [], []


def check(label, condition):
    assert condition, label
    checks.append(label)


with sync_playwright() as p:
    options = {'headless': True}
    if os.environ.get('CHROMIUM_PATH'):
        options['executable_path'] = os.environ['CHROMIUM_PATH']
    elif Path('/usr/bin/chromium').exists():
        options['executable_path'] = '/usr/bin/chromium'
    # Optional software rendering for CI, not an alteration of browser policies.
    if os.environ.get('MORPH_SOFTWARE_GL') == '1':
        options['args'] = [
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-unsafe-swiftshader',
        ]
    browser = p.chromium.launch(**options)
    page = browser.new_page(viewport={'width': 1440, 'height': 960}, device_scale_factor=1)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    try:
        page.goto(BASE, wait_until='domcontentloaded')
        page.wait_for_function('window.morphLab?.ready', timeout=90000)
        page.wait_for_timeout(1200)
        versions = page.evaluate('morphLab.versions()')
        check(
            'Exact engines and actual WebGL2 context',
            versions == {'three': '181', 'rapier': '0.19.3', 'webgl2': True},
        )
        check(
            'Initial creature has finite position',
            all(math.isfinite(v) for v in page.evaluate('morphLab.snapshot().position')),
        )
        page.locator('[data-action="add"][data-type="fin"]').click()
        page.wait_for_function("morphLab.snapshot().genome.parts.some(p=>p.type==='fin')")
        page.wait_for_timeout(500)
        check(
            'Live appendage rebuild renders',
            page.evaluate('morphLab.snapshot().renderer.geometries') > 0,
        )
        page.locator('[data-action="library-tab"][data-library="models"]').click()
        models = page.locator('#model-library [data-preset]').evaluate_all(
            "els=>els.map(e=>({id:e.dataset.preset,label:e.querySelector('strong').childNodes[0].textContent.trim()}))"
        )
        check('Full v4 model catalog is loaded', len(models) == 37)
        for item in models:
            model, label = item['id'], item['label']
            page.locator(f'#model-library [data-preset="{model}"]').click()
            page.wait_for_function('(name)=>morphLab.snapshot().genome.name===name', arg=label)
            page.wait_for_timeout(400)
            check(
                model + ' model renders with allocated geometry',
                page.evaluate('morphLab.snapshot().renderer.geometries') > 0,
            )
        page.locator('#model-library [data-preset="duelist"]').click()
        page.locator('.inspector-tabs [data-tab="motion"]').click()
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
            page.wait_for_timeout(300)
            check(
                clip + ' reaches the running humanoid renderer',
                page.evaluate('morphLab.snapshot().genome.motion.humanoid.action') == clip,
            )
        page.locator('.inspector-tabs [data-tab="surface"]').click()
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
            page.wait_for_timeout(200)
            check(
                pattern + ' reaches the running skin shader',
                page.evaluate('morphLab.snapshot().genome.appearance.pattern') == pattern,
            )
        page.screenshot(path=str(OUT / 'full-engine-v4-duelist.png'))
        page.locator('#model-library [data-preset="wayfarer"]').click()
        page.locator('[data-library="kits"]').click()
        page.locator('[data-kit="guard"]').click()
        page.wait_for_timeout(400)
        check(
            'Guard equipment kit reaches the renderer',
            len(page.evaluate('morphLab.snapshot().genome.parts')) == 3,
        )
        page.locator('[data-library="models"]').click()
        page.locator('[data-action="inspector"][data-tab="mixer"]').click()
        page.locator('[data-mix-source="a"]').select_option('carapace')
        page.locator('[data-mix-source="b"]').select_option('glider')
        page.locator('[data-mix-master]').evaluate(
            'el=>{el.value="0.4";el.dispatchEvent(new Event("input",{bubbles:true}));}'
        )
        page.locator('[data-mix-action="apply"]').click()
        page.wait_for_timeout(500)
        check(
            'Mixed creature reaches the renderer',
            page.evaluate('morphLab.snapshot().genome.name') == 'Carapace × Glider',
        )
        page.locator('[data-action="preview-toggle"]').click()
        check('Actual preview clock pauses', page.evaluate('morphLab.preview().playing') is False)
        page.locator('#motion-seek').evaluate(
            'el=>{el.value="4.25";el.dispatchEvent(new Event("input",{bubbles:true}));}'
        )
        page.wait_for_timeout(150)
        check(
            'Actual preview clock seeks',
            abs(page.evaluate('morphLab.preview().time') - 4.25) < 0.01,
        )
        page.locator('[data-action="preview-toggle"]').click()
        page.locator('[data-action="inspector"][data-tab="anatomy"]').click()
        counts = []
        for iteration in range(3):
            for name in ['sprout', 'skitter', 'mossback']:
                page.locator(f'[data-action="preset"][data-preset="{name}"]').click()
                page.wait_for_function(
                    '(name)=>morphLab.snapshot().genome.name.toLowerCase()===name', arg=name
                )
                page.wait_for_timeout(500)
            counts.append(page.evaluate('morphLab.snapshot().renderer'))
        check(
            'Repeated rebuilds do not accumulate rendered resources',
            counts[-1]['geometries'] <= counts[0]['geometries'] + 2
            and counts[-1]['textures'] <= counts[0]['textures'] + 1,
        )
        page.screenshot(path=str(OUT / 'full-engine-workshop.png'))
        page.locator('[data-action="test"]').first.click()
        page.wait_for_function("morphLab.snapshot().mode==='habitat'")
        page.wait_for_timeout(800)
        before = page.evaluate('morphLab.snapshot().position')
        page.keyboard.down('KeyW')
        page.wait_for_timeout(1600)
        page.keyboard.up('KeyW')
        after = page.evaluate('morphLab.snapshot().position')
        check(
            'Real habitat movement changes position',
            math.hypot(after[0] - before[0], after[2] - before[2]) > 0.15,
        )
        check('Habitat pose remains finite', all(math.isfinite(v) for v in after))
        page.keyboard.press('Space')
        page.wait_for_timeout(250)
        page.screenshot(path=str(OUT / 'full-engine-habitat.png'))
        page.keyboard.press('Escape')
        page.wait_for_function("morphLab.snapshot().mode==='editor'")
        check(
            'Exiting habitat preserves edited blueprint',
            page.evaluate('morphLab.snapshot().genome.name') == 'Mossback',
        )
        check('No browser JavaScript exceptions', not errors)
        check(
            'No GPU shader compile/link errors',
            not any(
                'WebGLProgram' in e or 'Shader Error' in e or 'VALIDATE_STATUS' in e
                for e in console_errors
            ),
        )
        report = {
            'suite': 'full-engine-browser',
            'passed': len(checks),
            'checks': checks,
            'pageErrors': errors,
            'consoleErrors': console_errors,
            'versions': versions,
        }
        (OUT / 'full-engine-report.json').write_text(json.dumps(report, indent=2))
        print(json.dumps(report, indent=2))
    except Exception as error:
        report = {
            'suite': 'full-engine-browser',
            'status': 'failed',
            'passedBeforeFailure': len(checks),
            'checks': checks,
            'failure': str(error),
            'pageErrors': errors,
            'consoleErrors': console_errors,
        }
        (OUT / 'full-engine-report.json').write_text(json.dumps(report, indent=2))
        raise
    finally:
        browser.close()
