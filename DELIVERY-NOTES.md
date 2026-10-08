> Historical release note. For v11, read `COMPLETE-COVERAGE-GUIDE.md` and `verification.json`.

# Version 10 delivery notes

Built locally from the delivered version-9 source archive. Earlier delivery files were not changed. No hosting deployment, account change, asset purchase, or model download was made.

Use `dist/Morph-Lab-Review.html` for Inspect-first startup. Both workspaces remain in each combined HTML. Inspect and asset exports are local. Workshop and full runtime diagnostics need pinned engines and WebGL2.

Read `DELIVERY-GUIDE.md` and `verification.json` for this release. Older content guides describe earlier asset packs. The regression suites retain some v9 filenames, but the reports listed in the version-10 verification file were rerun against the current source and build.

The source archive omits large regenerated sample binaries and prior release image batches. Run `npm run examples:delivery` to recreate delivery packages and source-pose fixtures. The separate sample-asset archive contains the six generated GLBs with their source blueprints, manifests, and audits. No font or engine files are included.

The actual combined HTML was tested through the browser's content-loading path. Direct file navigation was blocked by policy. No direct Windows file launch, GPU shader rendering, Rapier gameplay, engine-embedded build, or target-game import was approved. Blocked checks are retained in the local diagnostic report.
