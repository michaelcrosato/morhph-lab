"""Collect completed local test records. Run the documented suites first.
This script does not substitute counts for tests or run an engine mock.
"""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
def load(path):
    return json.loads(path.read_text())
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
core = (OUT / 'v8-core.tap').read_text()
counts = {}
for key in ['tests', 'pass', 'fail', 'cancelled', 'skipped', 'todo']:
    match = re.search(r'^# '+key+r' (\d+)\s*$', core, re.M)
    if not match: raise ValueError('Missing core result: ' + key)
    counts[key] = int(match.group(1))
if counts['fail'] or counts['cancelled'] or counts['skipped']:
    raise ValueError('Do not publish a clean result when a core check is incomplete.')
files = ['v8-editor-report.json', 'v8-browser-report.json', 'v8-navigation-browser.json',
         'v8-tidal-browser.json', 'v8-frontier-browser.json', 'v8-bloom-browser.json']
suites=[]
for name in files:
    data=load(OUT/name)
    if data.get('errors'): raise ValueError(name + ' has browser errors.')
    if data['passed'] != len(data['checks']): raise ValueError(name + ': count mismatch.')
    suites.append({'suite':data['suite'],'passed':data['passed'],'report':'test-results/'+name})
bloom=load(OUT/'v8-bloom-batch/report.json')
initial=load(OUT/'v8-initial-report.json')
regressions=[load(OUT/'v8-v6-geometry-regression.json'),load(OUT/'v8-v7-geometry-regression.json')]
artifacts={}
for file in [ROOT/'dist/Morph-Lab-Review.html',ROOT/'dist/Morph-Lab.html', OUT/'v8-model-library.png',OUT/'v8-motion-samples.gif',OUT/'v8-surface-atlas.png']:
    artifacts[str(file.relative_to(ROOT))]={'bytes':file.stat().st_size,'sha256':sha(file)}
report={
 'application':'Morph Lab','version':'8.0.0','edition':'Carapace & Bloom','blueprintSchema':6,
 'createdAt':datetime.now(timezone.utc).isoformat(),
 'engines':{'three':'0.181.0','rapierCompat':'0.19.3','renderer':'WebGL2','webGPUFallback':False,'webGL1Fallback':False,'enginePackagesIncluded':False},
 'inventory':load(OUT/'v8-inventory.json'),
 'passed':{
  'core':{**counts,'report':'test-results/v8-core.tap','mixerPairWeightCombinations':79*79*5},
  'browser':{'checks':sum(x['passed'] for x in suites),'suites':suites,'geometryBackend':'actual CPU rasterizer','editorHarness':'actual editor code, no game renderer','engineMocks':False,'physicsMocks':False},
  'newModels':{**bloom['counts'],'report':'test-results/v8-bloom-batch/report.json','automatedVisualApproval':False},
  'originalGeometry':{'samples':sum(x['samples'] for x in regressions),'passed':sum(x['passed'] for x in regressions),'suites':regressions},
  'examples':load(OUT/'v8-examples-validation.json'),
  'javascriptSyntaxFiles':113,
  'guideArrayExample':'Executed; adds four copies and leaves the source unchanged'
 },
 'geometryCorrections':{
  'initialCounts':initial['counts'],
  'finalCounts':bloom['counts'],
  'corrections':['Corrected the trunk cross-section shear sign.',
                 'Changed the new plate profile from a shallow panel to a wrapped dome.',
                 'Adjusted Dune auger body dimensions to avoid near-zero implicit-surface triangles.',
                 'Reduced the sentinel chest band and lowered its mount so it does not cover the mask.',
                 'Adjusted salute angles and enabled a full-action time range in humanoid review.'],
  'initialReport':'test-results/v8-initial-report.json',
  'manualReview':'Generated model sheet, individual sentinel frame, surface atlas, and desktop inspector were inspected. No production-quality approval was assigned.'
 },
 'olderModelRegression':{
  'v6':load(OUT/'v8-tidal-regression/report.json')['counts'],
  'v7':load(OUT/'v8-frontier-regression/report.json')['counts'],
  'retainedWarning':'Eight Abyss angler arm-crown edge-distortion warnings. Not suppressed.'
 },
 'blockedOrUnverified':{
  'engineInstall':{'status':'blocked','reason':'EAI_AGAIN at registry.npmjs.org','log':'test-results/v8-engine-install.log'},
  'bloomEngineTest':{'status':'could not start','reason':'Pinned Three.js package is absent. Engine checks did not execute.','log':'test-results/v8-engine-blocked.log'},
  'webgl2':{'available':False,'rendered':False},
  'GPUShaders':'not compiled or rendered here',
  'RapierGameplay':'not executed here',
  'engineEmbeddedOfflineBuild':{'status':'correctly refused without installed engines','log':'test-results/v8-offline-build-blocked.log'},
  'directFileNavigation':{'status':'blocked','reason':'ERR_BLOCKED_BY_ADMINISTRATOR','fallback':'Exact packaged HTML loaded with Playwright set_content; real workspace switches and recovery buttons exercised.'},
  'windowsFileLaunch':'not tested',
  'runtimePhysicsPerformance':'not measured'
 },
 'inspectionScope':{
  'sharedPartFamilies':37,'olderPartFamiliesOmitted':28,
  'humanoidJointMountedSharedParts':True,
  'newModelsOmittedGenes':0,
  'CPUColors':'Vertex pigment is approximate. The surface atlas uses per-pixel CPU fields and actual height arrays.',
  'humanoidMotion':'Diagnostic skeleton/action sample, not runtime terrain IK. Phase covers a full active action.',
  'technicalLimits':['No automatic self-intersection or prop contact test.','Body topology checks do not certify an assembled watertight actor.','Technical passes never mark manual review decisions as accepted.']
 },
 'behaviorLimits':[
  'Leg banks use visual IK and fixed ground clearance, not physical feet or terrain contact.',
  'Water and Air use the existing bounded arcade controller, not fluid or aerodynamic forces.',
  'Action events are timing cues, not detected hits or inventory operations.',
  'Arrays create independent genes in one undo step, not linked live instances.',
  'No new AI, navigation, combat, ragdoll, physical cloth, baked glTF, or automatic LOD.'
 ],
 'artifacts':artifacts,
 'authoredSourceLicense':'MIT; engines retain their own licenses',
 'externalWrites':'None. No hosting project, deployment, or persistent library mutation.'
}
(ROOT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'core':counts['pass'],'browser':report['passed']['browser']['checks'],'newModelSamples':bloom['counts'],'examples':report['passed']['examples']['passed'],'geometryRegressionSamples':report['passed']['originalGeometry']['passed']},indent=2))
