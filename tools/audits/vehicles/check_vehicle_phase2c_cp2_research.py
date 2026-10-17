#!/usr/bin/env python3
"""Research-only count/approval sentinel. No Foundry dependencies."""
import argparse,json,pathlib

def main():
 p=argparse.ArgumentParser();p.add_argument('--repo-root',default='.')
 a=p.parse_args();root=pathlib.Path(a.repo_root)
 j=json.loads((root/'data/audits/vehicles/swse-phase2c-cp2-crossbook-research.json').read_text())
 assert j['mode']=='RESEARCH_ONLY_DO_NOT_APPLY_POLICY_OR_PRODUCTION_PATCH'
 assert sum(x['sourceReviewed'] for x in j['books'])==316
 assert sum(x['attackGroupRows'] for x in j['books'])==700
 assert sum(x['discoveryCases'] for x in j['books'])==618
 assert sum(x['publishedConflictsRecorded'] or 0 for x in j['books'])==30
 assert len(j['proposedDecisions'])==3
 assert all(x['implementationStatus']=='AWAITING_USER_APPROVAL' for x in j['proposedDecisions'])
 assert len({x['id'] for x in j['proposedDecisions']})==3
 assert j['aggregate']['strictMechanicalCertificatesKnown']==4
 assert j['aggregate']['schemaFrozen'] is False
 checked=0
 for row in j['books']:
  path=row['discoveryManifestPath']
  if path and row['discoveryGitBlobSHA']=='INCLUDED_IN_PRIOR_COMMITTED_PHASE2B_PACKAGE':
   q=json.loads((root/path).read_text())
   assert len(q['discoveries'])==row['discoveryCases'],(path,row['discoveryCases'])
   checked+=1
 cp1=json.loads((root/'data/audits/vehicles/swse-phase2c-cp1-evidence-semantics-pressure.json').read_text())
 assert cp1['fixtureCount']==len(cp1['pressureFixtures'])
 print(f'PASS: 316 source claims; 700 attack groups; 618 discovery cases; 30 conflicts outside SotG; {checked} local book discovery manifests; 3 unapproved policy proposals.')
 print('Limitations: GitHub-only manifest counts are connector-verified, not locally replayed. Not runtime regression or Phase3 authorization.')
if __name__=='__main__': main()