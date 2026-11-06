#!/usr/bin/env python3
"""Prove the local trust/identity guard fails against representative invalid data."""
from pathlib import Path
import json,os,tempfile,subprocess,sys
R=Path(__file__).resolve().parents[1]
original=json.loads((R/'data/canonical/droids/source-books/sgd.json').read_text())
evidence=R/'data/audits/droids/sgd-field-evidence.json'
validation=R/'tools/validate_sgd_local.py'

def run(d,expect_fail,label):
 with tempfile.TemporaryDirectory() as td:
  inp=Path(td)/'sgd.json';out=Path(td)/'qa.json'
  inp.write_text(json.dumps(d))
  env=dict(os.environ,SWSE_SGD_LEDGER=str(inp),SWSE_SGD_EVIDENCE=str(evidence),SWSE_SGD_VALIDATION=str(out))
  result=subprocess.run([sys.executable,str(validation)],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,text=True)
  qa=json.loads(out.read_text())
  success=(result.returncode==0 and qa['status']=='PASS')
  assert success != expect_fail,f'{label}: expected fail={expect_fail}, actual={qa["status"]} {qa["errors"][:3]}'
  print(label, 'rejected' if expect_fail else 'accepted',f'({len(qa["errors"])} errors)')
run(original,False,'Baseline')
cases={
 'Duplicate source ID': lambda x: x['sourceEntries'][1]['identity'].update(sourceEntryKey=x['sourceEntries'][0]['identity']['sourceEntryKey']),
 'Null without field state':lambda x: x['sourceEntries'][0]['fieldStates'].pop('/abilities/con'),
 'Vehicle HP duplication':lambda x: x['sourceEntries'][7]['durability'].update(hitPoints=40),
 'Executable attack leak':lambda x: x['sourceEntries'][8]['combat']['attackGroups'][0].update(operationStatus='certified-executable'),
 'Unknown hero eligibility':lambda x: x['sourceEntries'][0]['pcConstruction'].pop('heroEligibility'),
 'False mechanical certification':lambda x: x['sourceEntries'][0]['certification'].update(mechanicalStatus='certified'),
 'Unverified mount inference':lambda x: x['sourceEntries'][8]['combat']['attackGroups'][0].update(weaponComponentId='guessed-laser'),
 'Invented linked vehicle':lambda x: x['sourceEntries'][7]['vehicleLink'].update(vehicleSourceEntryKey='guessed'),
 'Defense OCR impossible value':lambda x: x['sourceEntries'][15]['defenses'].update(flatFootedReflex=111),
 'Visual numeric evidence tampered':lambda x: x['sourceEntries'][2]['defenses'].update(reflex=99),
 'Unstructured source contradiction':lambda x: x['sourceEntries'][25]['exceptions'].update(sourceContradictions=['degree mismatch']),
 'Unrecognized locomotion restriction':lambda x: x['sourceEntries'][44]['movement']['locomotionSystems'][1].update(restricted='automatic-hover'),
 'Forged rule provenance':lambda x: x['sourceEntries'][25]['rules']['conditionalMechanics'][0]['source'].update(sourceEntryKey='SGD-DROID-001'),
 'Missing visual evidence reference':lambda x: x['sourceEntries'][20]['certification'].update(reviewerEvidenceRefs=[]),
}
for label,fn in cases.items():
 d=json.loads(json.dumps(original));fn(d);run(d,True,label)
print(f'All {len(cases)} negative tests passed.')
