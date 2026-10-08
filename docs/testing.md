# Testing

Every command below runs from the repository root after `npm install`. Generated reports, renders, and logs go to `test-results/`, which is not committed.

## Quick reference

| Command | What it checks | Needs |
|---|---|---|
| `npm test` | Unit tests for blueprints, anatomy, mixing, motion, review, export, creator, and the frame clock (`tests/*.test.js`) | Node 22+ |
| `npm run test:engine` | Integration tests against the real pinned Three.js and Rapier packages (`tests/engine/*.test.js`) | `npm install` |
| `npm run test:examples` | Every file in `examples/` parses and validates, and matches what `npm run examples` would generate | Node |
| `npm run test:geometry` | Shared geometry still hashes exactly as the v6 and v7 fixtures in `tests/fixtures/` | Node |
| `npm run test:catalog` | All 89 models audited at eight motion phases, and a static GLB built for every model | Node |
| `npm run check` | `lint` plus all of the above | Node, ruff |
| `npm run test:ui` | Builds `dist/`, then runs every browser suite against the packaged HTML | Python 3, Playwright, Chromium |
| `npm run test:import` | Generates export samples and re-reads the GLB files independently (numpy/trimesh) | Python 3, numpy, trimesh |
| `npm run test:shaders` | Compiles the generated GLSL in a real WebGL2 context | Python 3, Playwright |
| `npm run test:gpu` | Builds the offline edition and renders the Workshop on the GPU | Python 3, Playwright, WebGL2 |
| `npm run lint` / `npm run format` | Prettier (JS/CSS/JSON) and ruff (Python) formatting, plus ruff's error checks | ruff on PATH |

`npm run check` is the pre-commit gate for changes that don't touch the UI. Run `npm run test:ui` as well when you change anything a user sees.

## Browser tests

The browser suites live in `tests/*_browser.py` and use Python Playwright with Chromium. `scripts/test-browser-regression.py` runs them all (that is what `npm run test:ui` calls) and writes a per-suite log and report plus `test-results/browser/summary.json`.

Setup:

```sh
python3 -m pip install playwright
python3 -m playwright install chromium
```

The suites use Playwright's bundled Chromium. Set `CHROMIUM_PATH` to use a different Chromium binary.

The suites load the exact packaged file, `dist/Morph-Lab.html`, and drive the real controls. They don't replace Three.js, Rapier, or browser storage with fakes. Two consequences:

- Rendering is checked through the CPU inspector and geometry readback. GPU appearance and Rapier gameplay are not, except by `npm run test:gpu` and `test:engine`.
- The CDN edition can't download the engines when the test machine is offline. The suites then check that the Workshop fails safely and recovers to Create or Inspect, rather than checking the Workshop itself.

| Suite | Covers |
|---|---|
| `editor_browser.py` | Workshop editor harness: parts, kits, actors, rosters, mixer export |
| `inspector_browser.py` | Inspector: review sessions, comparisons, references, proportion sweep |
| `navigation_browser.py` | Switching workspaces inside the single file, and state transfer between them |
| `tidal_browser.py`, `frontier_browser.py`, `bloom_browser.py`, `field_browser.py` | Each content pack's models in the inspector and editor |
| `delivery_browser.py` | Asset export panel: GLB and ZIP downloads, System checks |
| `coverage_browser.py` | Every model can be inspected and exported |
| `creator_browser.py` | Create: rolls, locks, saved discoveries, mixing, collection import/export, recovery |
| `browser_smoke.py` | Full-engine smoke test against a running `npm run dev` server (set `MORPH_URL`; not part of `test:ui`) |

## Import tests

`npm run test:import` first writes sample deliveries to `test-results/delivery/` and `test-results/packing/` with `scripts/delivery-samples.mjs` and `scripts/packing-samples.mjs`. Then `tests/delivery_import.py` and `tests/packing_import.py` decode the GLB files with numpy and trimesh, independently of the exporter, and compare them with the source pose data. Install the dependencies with `python3 -m pip install numpy trimesh`.

## Results

A blocked check is not a pass. When an engine can't be downloaded or WebGL2 is missing, the reports say so, and nothing there should be read as a rendered or simulated result. In the app, **System checks → Check engines + physics** runs the same engine checks on the machine that will use the Workshop; export that report when you need evidence from a specific machine.

## Regenerating fixtures

- `npm run examples` rewrites `examples/` from the presets and the generators in `scripts/examples/`. Commit the result together with the change that caused it; `test:examples` fails until you do.
- `node scripts/geometry-regression.mjs --baseline v6 /path/to/unmodified-v6-source` re-records a geometry fixture from an old source tree. Normal runs never rewrite fixtures.
