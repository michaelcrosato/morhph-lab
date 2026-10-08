> Historical release note. For v11, read `COMPLETE-COVERAGE-GUIDE.md` and `verification.json`.

# Morph Lab v5.0.1 — Workshop navigation fix

## Cause

The previous inspector replaced `Morph-Lab-v5-Review.html` with `Morph-Lab-v5.html` in the current path. The Workshop header was an ordinary link. The lower workshop button also used this filename replacement. With only the inspector present, either route could request a missing file. The header link also did not save the edited candidate before leaving.

## Change

The release HTML now contains both workspaces. A small launcher loads the active workspace from the included HTML with `iframe.srcdoc`. Switching uses a message from the active child window. The browser does not navigate to a second HTML file. Other windows cannot issue these commands. The old frame is removed on a switch.

The launcher saves the current blueprint and review record in memory. Returning to Inspect restores the source, candidate, baseline, camera, pose settings, notes, and decisions. Decisions reset when the returned blueprint has changed. Reference images and external OBJ data are not included in that record. Load them again after a switch. Export a session before closing or refreshing the file.

Both `dist/Morph-Lab.html` and `dist/Morph-Lab-Review.html` contain the complete application code. They differ only in the starting workspace. `dist/runtime.html` is an unwrapped artifact for engine and editor tests. The public file `Morph-Lab-v5.0.1.html` starts in Inspect.

The source entry pages also contain both branches. Source-mode navigation preserves the current filename and changes only the workspace query parameter. It keeps the original fail-safe for blocked session storage.

Startup errors now provide a return to Inspect. Long embedded module URLs are removed from the displayed error.

## Unchanged requirements

The inspector works offline with Canvas 2D. The delivered workshop is the CDN edition. It requires internet access to the pinned Three.js 0.181.0 and Rapier 3D compat 0.19.3 packages, and a WebGL2-capable browser. The engines are not embedded in this delivery. An offline engine build still requires `npm install` and `npm run build -- --offline`.

No models, materials, animation formulas, physics rules, or blueprint schema were changed.

## Checks for this patch

- 444 Node tests passed: 425 existing tests and 19 new navigation and handoff tests.
- 27 new browser checks passed. They use the exact combined release HTML and the real Workshop links and buttons. They check same-document switching, model and record transfer, removal of old frames, failed engine loading, recovery, mobile width, and blueprint export. Browser storage was blocked in this test to confirm that packaged switching does not require it.
- 71 existing CPU inspector browser checks passed with actual generated geometry.
- 147 existing editor browser checks passed without a renderer.

The browser loaded the release file through Playwright `set_content`. Direct local-file navigation is blocked in this test environment with `ERR_BLOCKED_BY_ADMINISTRATOR`. A Windows double-click launch was not tested. The in-document switches were tested, not replaced by mocked navigation.

No engine mocks were used in the new navigation test. It deliberately ran offline and tested the expected engine-download failure. WebGL2 rendering and Rapier gameplay were not verified. These checks do not establish full-game readiness.

## Source commands

```sh
npm test
npm run build -- --cdn
npm run test:navigation-ui
npm run test:review-ui
npm run test:ui
```

Python Playwright and Chromium are required for browser tests. Set `CHROMIUM_PATH` when the executable is not at `/usr/bin/chromium`.
