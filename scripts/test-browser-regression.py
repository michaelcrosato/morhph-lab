"""Run real offline UI checks and collect reports under this release.
Requires Playwright and Chromium. No npm engines, test doubles, or network needed.
"""
from pathlib import Path
import subprocess,json,time,hashlib,shutil
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/v11/browser-regression';OUT.mkdir(parents=True,exist_ok=True)
suites=[('v4_browser','test-results/v9-editor-report.json'),('v5_browser','test-results/v9-browser-report.json'),('navigation_browser','test-results/v9-navigation-browser.json'),('tidal_browser','test-results/v9-tidal-browser.json'),('frontier_browser','test-results/v9-frontier-browser.json'),('bloom_browser','test-results/v9-bloom-browser.json'),('field_browser','test-results/v9-field-browser.json'),('delivery_browser','test-results/v11/regression-delivery/browser-report.json'),('coverage_browser','test-results/v11/browser/report.json')]
results=[];html=ROOT/'dist/Morph-Lab-Review.html';sha=hashlib.sha256(html.read_bytes()).hexdigest()
for test,report_path in suites:
 t=time.time()
 with (OUT/(test+'.log')).open('w') as f:
  try:p=subprocess.run(['python','tests/'+test+'.py'],cwd=ROOT,stdout=f,stderr=subprocess.STDOUT,timeout=300);code=p.returncode
  except subprocess.TimeoutExpired:code=-1
 record={'suite':test,'exitCode':code,'seconds':round(time.time()-t,2),'passed':0}
 if code==0:
  data=json.loads((ROOT/report_path).read_text());record['passed']=data['passed'];dest=OUT/(test+'.json');shutil.copyfile(ROOT/report_path,dest);record['report']=str(dest.relative_to(ROOT))
 results.append(record);(OUT/'status.json').write_text(json.dumps(results,indent=2)+'\n');print(test,code,flush=True)
current=hashlib.sha256(html.read_bytes()).hexdigest();result={'suites':results,'passed':sum(x['passed'] for x in results),'failures':sum(x['exitCode']!=0 for x in results),'htmlSHA256':sha,'sameBuildForAllSuites':current==sha,'gpuTested':False,'physicsTested':False};(OUT/'report.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2));raise SystemExit(0 if result['failures']==0 and current==sha else 1)
