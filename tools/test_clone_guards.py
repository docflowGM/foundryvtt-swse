#!/usr/bin/env python3
"""Mutation-based fail-closed tests for the Clone Wars local source state."""
import os,sys,copy,json,pathlib,tempfile,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
path=root/'data/canonical/droids/source-books/clone.json'
base=json.loads(path.read_text())
changed={
 'duplicate source identity':lambda x:x['sourceEntries'][1]['identity'].__setitem__('sourceEntryKey','CLONE-DROID-001'),
 'missing publication claim':lambda x:x['sourceEntries'].pop(),
 'runtime rules executed':lambda x:x['sourceEntries'][0]['rules'].__setitem__('mechanicalExecutionStatus','certified'),
 'mechanical certification leap':lambda x:x['sourceEntries'][0]['certification'].__setitem__('mechanicalStatus','certified'),
 'runtime certification leap':lambda x:x['sourceEntries'][0]['certification'].__setitem__('runtimeStatus','live-verified'),
 'attack permission leak':lambda x:x['sourceEntries'][0]['combat'].__setitem__('attackGroups',[{'attackId':'test','operationStatus':'certified-executable'}]),
 'vehicle gets droid HP':lambda x:x['sourceEntries'][33]['durability'].__setitem__('hitPoints',175),
 'squad gets individual attack':lambda x:x['sourceEntries'][13]['combat'].__setitem__('attackGroups',[{'attackId':'test','operationStatus':'source-only'}]),
 'printed model hero permission forged':lambda x:x['sourceEntries'][19]['pcConstruction'].__setitem__('heroEligibility','allowed'),
 'B1 page regression':lambda x:x['sourceEntries'][13]['publication'].__setitem__('printedPageStart',95),
 'FX6 continuation erased':lambda x:x['sourceEntries'][14]['publication'].__setitem__('printedPageEnd',160),
 'DD13 OCR price restored':lambda x:x['sourceEntries'][0]['economics'].__setitem__('newCredits',4950),
 'unqualified null':lambda x:x['sourceEntries'][0]['fieldStates'].pop('/abilities/con',None),
 'visual field overwritten':lambda x:x['sourceEntries'][0]['defenses'].__setitem__('reflex',98),
 'root group removed':lambda x:x['sourceEntries'][0].pop('rules'),
 'A-DSD continuation erased':lambda x:x['sourceEntries'][17]['publication'].__setitem__('printedPageEnd',188),
 'Ultra Droideka printed prohibition erased':lambda x:x['sourceEntries'][32]['pcConstruction'].pop('heroEligibility',None),
 'leg shield conditional source rule removed':lambda x:x['sourceEntries'][17]['rules'].__setitem__('conditionalMechanics',[]),
 'conditional source rule activated':lambda x:x['sourceEntries'][26]['rules']['conditionalMechanics'][0].__setitem__('executionStatus','certified-runtime'),
 'guessed execution effect ref':lambda x:x['sourceEntries'][26]['rules']['conditionalMechanics'][0].__setitem__('effectRef','FAKE-FOUND-RULE'),
 'duplicated second vehicle hit points':lambda x:x['sourceEntries'][34]['durability'].__setitem__('hitPoints',60),
 'instantiated uncertified weapon':lambda x:x['sourceEntries'][0]['combat'].__setitem__('attackGroups',[{'attackId':'test','operationStatus':'source-only','weaponComponentId':'fake'}]),
}
errors=[]
with tempfile.TemporaryDirectory(prefix='clone-guard-') as d:
 for name,fn in changed.items():
  x=copy.deepcopy(base);fn(x)
  file=pathlib.Path(d)/'mutant.json';file.write_text(json.dumps(x))
  env={**os.environ,'SWSE_CLONE_LEDGER':str(file),'SWSE_CLONE_VALIDATION':str(pathlib.Path(d)/'mutant-validation.json')}
  p=subprocess.run([sys.executable,str(root/'tools/validate_clone_local.py')],capture_output=True,text=True,env=env)
  if p.returncode==0:errors.append(name)
  else:print('BLOCKED',name)
print('RESULT',len(changed)-len(errors),'/',len(changed),'negative mutation tests passed')
if errors:print('FAILED:',errors);sys.exit(1)
