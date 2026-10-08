"""Shared paths and helpers for the Python browser suites.

Every suite writes its report to test-results/browser/<suite>.json and any screenshots or
downloads to test-results/browser/<suite>/, where <suite> is the test file's stem. Suites
import this module by name: `python3 tests/<suite>.py` puts tests/ on sys.path.
"""

import hashlib
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'dist'
RELEASE = DIST / 'Morph-Lab.html'
OUT_ROOT = ROOT / 'test-results' / 'browser'
APP_VERSION = json.loads((ROOT / 'package.json').read_text())['version']
WORKSPACES = ('creator', 'review', 'workshop')
BROWSER_ARGS = ('--no-sandbox', '--disable-dev-shm-usage')
SWIFTSHADER_ARGS = ('--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader')


def suite_dir(name):
    """Create and return test-results/browser/<name>/ for screenshots and downloads."""
    path = OUT_ROOT / name
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_report(name, data):
    """Write test-results/browser/<name>.json and return its path."""
    OUT_ROOT.mkdir(parents=True, exist_ok=True)
    path = OUT_ROOT / (name + '.json')
    path.write_text(json.dumps(data, indent=2) + '\n')
    return path


def launch_chromium(playwright, extra_args=(), **kwargs):
    """Launch headless Chromium: $CHROMIUM_PATH when set, else Playwright's bundled build."""
    options = {
        'executable_path': os.environ.get('CHROMIUM_PATH') or None,
        'headless': True,
        'args': [*BROWSER_ARGS, *extra_args],
    }
    options.update(kwargs)
    return playwright.chromium.launch(**options)


def release_html(workspace='creator'):
    """The text of dist/Morph-Lab.html, set to open `workspace` first.

    The release picks its first workspace from ?creator / ?review / ?workshop, else from
    <html data-start>. set_content() pages have no query string, so swap the attribute.
    """
    if workspace not in WORKSPACES:
        raise ValueError('Unknown workspace: ' + workspace)
    html, swapped = re.subn(
        r'(<html\b[^>]*\bdata-start=")[a-z]+"',
        lambda match: match.group(1) + workspace + '"',
        RELEASE.read_text(),
        count=1,
    )
    if swapped != 1:
        raise AssertionError('dist/Morph-Lab.html has no <html data-start> attribute')
    return html


def release_url(workspace):
    """file:// URL of dist/Morph-Lab.html that opens `workspace` first."""
    if workspace not in WORKSPACES:
        raise ValueError('Unknown workspace: ' + workspace)
    return RELEASE.as_uri() + '?' + workspace


def release_sha256():
    return hashlib.sha256(RELEASE.read_bytes()).hexdigest()


def runtime_html():
    """dist/runtime.html: the unwrapped application document."""
    return (DIST / 'runtime.html').read_text()


def harness_html(quirks_mode=False):
    """The editor test harness (tests/ui-harness.html) on the release's bundled modules.

    The real editor modules load through dist/runtime.html's import map; there is no
    renderer and no engine. With quirks_mode=True the page has no doctype or viewport meta,
    which is how the Tide & Sky, Strange Forms, Bloom, Field and coverage suites load it.
    """
    importmap = re.search(r'<script type="importmap">(.*?)</script>', runtime_html(), re.S)
    if importmap is None:
        raise AssertionError('dist/runtime.html has no <script type="importmap">')
    entry = (
        (ROOT / 'tests/ui-harness.html')
        .read_text()
        .split('<script type="module">')[1]
        .split('</script>')[0]
        .replace('../src/', 'morph/src/')
    )
    viewport = '<meta name="viewport" content="width=device-width,initial-scale=1">'
    head = '<html><head>' if quirks_mode else '<!doctype html><html><head>' + viewport
    return (
        head
        + '<style>'
        + (ROOT / 'style.css').read_text()
        + '</style><script type="importmap">'
        + importmap.group(1)
        + '</script></head><body><div id="app"></div><script type="module">'
        + entry
        + '</script></body></html>'
    )
