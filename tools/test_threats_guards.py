#!/usr/bin/env python3
"""Negative mutation tests for Threats source-only and identity boundaries."""
import copy,json,os,pathlib,subprocess,sys,tempfile
R=pathlib.Path(__file__).resolve().parents[1]
source=R/'data/canonical/droids/source-books/threats.json'
orig=json.loads(source.read_text())
check=R/'tools/validate_threats_local.py'
def case(label,mutate):
 altered=copy.deepcopy(orig);mutate(altered)
 with tempfile.TemporaryDirectory(prefix='threats-negative-') as d:
  path=pathlib.Path(d)/'ledger.json';out=pathlib.Path(d)/'report.json'
  path.write_text(json.dumps(altered))
  env={**os.environ,'SWSE_THREATS_LEDGER':str(path),'SWSE_THREATS_VALIDATION':str(out)}
  p=subprocess.run([sys.executable,str(check)],capture_output=True,text=True,env=env)
  if p.returncode==0:raise AssertionError('NEGATIVE TEST FAILED: '+label)
  result=json.loads(out.read_text())
  if not result['errors']:raise AssertionError('No cause of failure reported: '+label)
  print('PASS negative:',label)
# Must reject every mutation. Tests may be extended without changing book.
case('duplicate source ID',lambda x:x['sourceEntries'][1]['identity'].update(sourceEntryKey='THREATS-DROID-001'))
case('incorrect publication source',lambda x:x['sourceEntries'][0]['publication'].update(bookId='SGD'))
case('mechanical certification without provenance',lambda x:x['sourceEntries'][0]['certification'].update(mechanicalStatus='certified'))
case('runtime certification without a live Foundry test',lambda x:x['sourceEntries'][0]['certification'].update(runtimeStatus='live-verified'))
case('unreviewed model given hero rights',lambda x:x['sourceEntries'][6]['pcConstruction'].update(heroEligibility='allowed'))
case('explicit hero ban inverted',lambda x:x['sourceEntries'][0]['pcConstruction'].update(heroEligibility='allowed'))
case('hero creation route invented',lambda x:x['sourceEntries'][2]['pcConstruction'].update(creationRoute='stock-model'))
case('Guri downgraded from named individual',lambda x:x['sourceEntries'][21]['identity'].update(namedIndividual=False))
case('generic replica downgraded from replica species',lambda x:x['sourceEntries'][20]['classification'].update(ruleEntityNature='standard-droid'))
case('replica species trait reference silently deleted',lambda x:x['sourceEntries'][20]['rules'].update(globalRuleReferences=[]))
case('printed defense value silently changed',lambda x:x['sourceEntries'][2]['defenses'].update(reflex=99))
case('SD6 DR assigned to incorrect schema group',lambda x:(x['sourceEntries'][26]['durability'].update(damageReduction=3),x['sourceEntries'][26]['defenses'].pop('damageReduction')))
case('conditional source rule made executable',lambda x:x['sourceEntries'][0]['rules']['conditionalMechanics'][0].update(executionStatus='certified-runtime'))
case('guessed attack mount',lambda x:x['sourceEntries'][0]['combat'].update(attackGroups=[{'attackId':'fake','operationStatus':'certified-executable','weaponComponentId':'fake'}]))
case('invented vehicle authority',lambda x:x['sourceEntries'][0]['vehicleLink'].update(vehicleSourceKey='fake'))
case('unsupported null without fieldStates',lambda x:x['sourceEntries'][0]['abilities'].update(con=None))
case('PDF review source checksum drift',lambda x:x['sourceEntries'][0]['certification'].update(identityStatus='unreviewed'))
print('ALL',17,'THREATS negative guard tests PASS')
