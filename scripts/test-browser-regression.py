"""Run every offline browser suite against the current dist/ build and summarise the results.

Requires Python Playwright and Chromium ($CHROMIUM_PATH, else Playwright's bundled build).
No npm engines, test doubles, or network needed. Each suite writes its own report to
test-results/browser/<suite>.json; this script adds <suite>.log files and summary.json.
Pass suite names to run a subset, e.g. `python3 scripts/test-browser-regression.py editor_browser`.
"""

import hashlib
import json
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results' / 'browser'
RELEASE = ROOT / 'dist' / 'Morph-Lab.html'
TIMEOUT_SECONDS = 600
SUITES = [
    'editor_browser',
    'inspector_browser',
    'navigation_browser',
    'tidal_browser',
    'frontier_browser',
    'bloom_browser',
    'field_browser',
    'delivery_browser',
    'coverage_browser',
    'creator_browser',
]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_suite(suite):
    report_path = OUT / (suite + '.json')
    log_path = OUT / (suite + '.log')
    # A report left over from an earlier run must never count for this one.
    report_path.unlink(missing_ok=True)
    started = time.monotonic()
    with log_path.open('w') as log:
        try:
            exit_code = subprocess.run(
                [sys.executable, 'tests/' + suite + '.py'],
                cwd=ROOT,
                stdout=log,
                stderr=subprocess.STDOUT,
                timeout=TIMEOUT_SECONDS,
            ).returncode
        except subprocess.TimeoutExpired:
            log.write(f'\nTimed out after {TIMEOUT_SECONDS} seconds.\n')
            exit_code = -1
    record = {
        'suite': suite,
        'exitCode': exit_code,
        'passed': 0,
        'seconds': round(time.monotonic() - started, 2),
        'log': str(log_path.relative_to(ROOT)),
    }
    if exit_code == 0:
        if report_path.exists():
            record['passed'] = json.loads(report_path.read_text())['passed']
            record['report'] = str(report_path.relative_to(ROOT))
        else:
            record['exitCode'] = 1
            record['error'] = 'The suite exited cleanly but wrote no report.'
    return record


def main(selected):
    unknown = sorted(set(selected) - set(SUITES))
    if unknown:
        raise SystemExit('Unknown suite(s): ' + ', '.join(unknown))
    OUT.mkdir(parents=True, exist_ok=True)
    before = sha256(RELEASE)
    results = []
    for suite in selected or SUITES:
        record = run_suite(suite)
        results.append(record)
        status = 'ok' if record['exitCode'] == 0 else f'FAILED (exit {record["exitCode"]})'
        print(
            f'{suite:<20} {record["passed"]:>4} checks {record["seconds"]:>7.1f}s  {status}',
            flush=True,
        )
    after = sha256(RELEASE)
    failures = [x['suite'] for x in results if x['exitCode'] != 0]
    summary = {
        'suites': results,
        'passed': sum(x['passed'] for x in results),
        'failures': len(failures),
        'failedSuites': failures,
        'seconds': round(sum(x['seconds'] for x in results), 2),
        'htmlSHA256Before': before,
        'htmlSHA256After': after,
        'sameBuildForAllSuites': before == after,
        'gpuTested': False,
        'physicsTested': False,
    }
    (OUT / 'summary.json').write_text(json.dumps(summary, indent=2) + '\n')
    print(
        f'{len(results)} suites, {summary["passed"]} checks passed, {len(failures)} failed, '
        f'{summary["seconds"]:.1f}s. Summary: {(OUT / "summary.json").relative_to(ROOT)}'
    )
    if before != after:
        print('dist/Morph-Lab.html changed during the run; results do not describe one build.')
    return 0 if not failures and before == after else 1


if __name__ == '__main__':
    raise SystemExit(main(sys.argv[1:]))
