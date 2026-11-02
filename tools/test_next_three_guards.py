#!/usr/bin/env python3
"""In-memory negative mutation tests. Never mutate canonical files on disk."""
import json,copy
from pathlib import Path
from validate_next_three_local import run,R

def test(book,mutator,label):
 original=json.loads((R/f'data/canonical/droids/source-books/{book}.json').read_text())
 mutated=copy.deepcopy(original);mutator(mutated['sourceEntries'])
 try:run(book,ledger=mutated)
 except (AssertionError,KeyError,TypeError,ValueError):return True
 raise AssertionError('GUARD FAILED: '+book+' '+label)

tests={
 'core':[
 ('activate unreviewed attack',lambda a:a[5]['combat'].update(attackGroups=[{'attackId':'unverified','operationStatus':'certified-executable'}])),
 ('promote mechanical cert',lambda a:a[0]['certification'].update(mechanicalStatus='certified')),
 ('promote runtime',lambda a:a[0]['certification'].update(runtimeStatus='live-verified')),
 ('B1 hero override',lambda a:a[3]['pcConstruction'].update(heroEligibility='allowed')),
 ('B2 hero override',lambda a:a[4]['pcConstruction'].update(heroEligibility='prohibited')),
 ('wrong Droideka challenge',lambda a:a[5]['challenge'].update(challengeLevel=6)),
 ('wrong Dwarf challenge',lambda a:a[6]['challenge'].update(challengeLevel=0)),
 ('remove census correction',lambda a:a[5]['exceptions'].update(transcriptionWarnings=[])),
 ('turn named R2 into factory',lambda a:a[11]['identity'].update(namedIndividual=False)),
 ('fabricate feat',lambda a:a[2]['progression'].update(feats=[{'traitId':'fake','enabledInRuntime':True}])),
 ('no-CON state lost',lambda a:a[0]['fieldStates'].pop('/abilities/con')),
 ('drop evidence-reflected value',lambda a:a[0]['abilities'].update(str=10)),
 ],
 'legacy':[
 ('invent LV8 explicit degree',lambda a:a[7]['classification'].update(publishedDegree=4)),
 ('remove LV8 contextual heading',lambda a:a[7]['classification'].pop('contextualDegreeHeading')),
 ('remove LV8 uncertainty state',lambda a:a[7]['fieldStates'].pop('/classification/publishedDegree')),
 ('invent live blaster options',lambda a:a[9]['combat'].update(attackGroups=[{'attackId':'phantom','operationStatus':'certified-executable'}])),
 ('invent a feat runtime',lambda a:a[8]['progression'].update(feats=[{'traitId':'bad','enabledInRuntime':True}])),
 ('allow prohibited PI',lambda a:a[0]['pcConstruction'].update(heroEligibility='allowed')),
 ('prohibit allowed Aggressor',lambda a:a[8]['pcConstruction'].update(heroEligibility='prohibited')),
 ('strip citation',lambda a:a[2]['rules']['conditionalMechanics'][0].pop('source')),
 ('turn source action live',lambda a:a[2]['rules']['conditionalMechanics'][0].update(executionStatus='certified-runtime')),
 ('duplicate identity',lambda a:a[4]['identity'].update(sourceEntryKey=a[3]['identity']['sourceEntryKey'])),
 ('alter verified HP',lambda a:a[11]['durability'].update(hitPoints=100)),
 ('alter source authority',lambda a:a[3]['classification'].update(primaryActorAuthority='vehicle')),
 ],
 'force':[
 ('auto-allow IT-O',lambda a:a[6]['pcConstruction'].update(heroEligibility='allowed')),
 ('remove reprogramming condition',lambda a:a[6]['pcConstruction'].pop('heroEligibilityCondition')),
 ('wrong Junk defense',lambda a:a[3]['defenses'].update(reflex=13)),
 ('invent junk degree',lambda a:a[3]['classification'].update(publishedDegree=4)),
 ('invent Brute degree',lambda a:a[4]['classification'].update(publishedDegree=4)),
 ('invent Behemoth degree',lambda a:a[5]['classification'].update(publishedDegree=4)),
 ('confuse new vs used price',lambda a:a[2]['economics'].update(usedCredits=25000)),
 ('genericize PROXY',lambda a:a[8]['identity'].update(namedIndividual=False)),
 ('grant PROXY executable Force action',lambda a:a[8]['rules'].update(mechanicalExecutionStatus='certified')),
 ('infer R1 weapon mount',lambda a:a[9]['combat'].update(attackGroups=[{'attackId':'free','operationStatus':'certified-executable'}])),
 ('grant droid universal force feat',lambda a:a[8]['progression'].update(feats=[{'traitId':'force-sensitivity','enabledInRuntime':True}])),
 ('remove CON state',lambda a:a[0]['fieldStates'].pop('/abilities/con')),
 ],
}
if __name__=='__main__':
 for book,cases in tests.items():
  for title,fn in cases:test(book,fn,title)
  print(book.upper(),len(cases),'/',len(cases),'negative tests passed')
 print('ALL',sum(map(len,tests.values())),'negative tests PASSED')
