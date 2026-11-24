#!/usr/bin/env python3
"""Read-only cross-book definition and influence verification for Force V2.

Usage:
  python tools/audits/verify-force-v2-bookwise.py \
    --package-dir docs/audits/force-v2/bookwise-v2.9 \
    --json-out /tmp/force-v2-crossbook-verification.json

Requires: pip install jsonschema
This certifies schema/identity/link integrity, NOT printed RAW or Foundry behavior.
"""
import argparse
import collections
import json
from pathlib import Path
import sys

try:
    from jsonschema import Draft202012Validator, FormatChecker
except ImportError as exc:
    raise SystemExit('Missing dependency: pip install jsonschema') from exc

DEFINITIONS = [
    'REVALIDATED_Core_Definitions_for_v2.9.json',
    'REVALIDATED_Starships_Definitions_for_v2.9.json',
    'REVALIDATED_KOTOR_Definitions_for_v2.9.json',
    'REVALIDATED_ForceUnleashed_Definitions_for_v2.9.json',
    'REVALIDATED_CloneWars_Definitions_for_v2.9.json',
    'REVALIDATED_JATM_Definitions_for_v2.9.json',
    'SWSE_Force_V2_Legacy_Era_Book_7_Canonical_Definitions_and_DC_Tables_v0.1.json',
]
INFLUENCES = [
    'REVALIDATED_Core_Influences_for_v2.9.json',
    'REVALIDATED_Starships_Influences_for_v2.9.json',
    'REVALIDATED_KOTOR_Influences_for_v2.9.json',
    'REVALIDATED_ForceUnleashed_Influences_for_v2.9.json',
    'REVALIDATED_CloneWars_Influences_for_v2.9.json',
    'REVALIDATED_JATM_Influences_for_v2.9.json',
    'SWSE_Force_V2_Legacy_Era_Book_7_Cross_Domain_Influence_Graph_v0.1.json',
]
FORCE_DOMAINS = {'force-power', 'lightsaber-form-power', 'force-technique',
                 'force-secret', 'force-regimen', 'starship-maneuver',
                 'unleashed-overlay'}
EXPECTED_COLLISIONS = {
    'force storm': {'fucg/force-power/force-storm',
                    'jatm/force-power/force-storm'},
    'improved force storm': {'fucg/force-technique/improved-force-storm',
                             'jatm/force-technique/improved-force-storm'},
    'intercept': {'jatm/force-power/intercept',
                  'sotg/starship-maneuver/intercept'},
}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--package-dir', type=Path,
                        default=Path('docs/audits/force-v2/bookwise-v2.9'))
    parser.add_argument('--json-out', type=Path, default=None)
    parser.add_argument('--strict-ready', action='store_true',
                        help='Fail when certification blockers remain (expected for current package).')
    args = parser.parse_args()
    base = args.package_dir
    ds = json.loads((base / 'SWSE_Force_V2_Bookwise_Extensible_Definition_Schema_v2.9.json').read_text())
    es = json.loads((base / 'SWSE_Force_V2_Cross_Domain_Influence_Graph_Schema_v2.9.json').read_text())
    checks = []
    failures = []
    definitions = []
    influences = []
    unresolved = []
    for name in DEFINITIONS:
        data = json.loads((base / name).read_text())
        errors = sorted(Draft202012Validator(ds, format_checker=FormatChecker()).iter_errors(data),
                        key=lambda e: (list(map(str, e.absolute_path)), e.message))
        if errors:
            failures += [f'{name}: {"/".join(map(str, e.absolute_path))}: {e.message}'
                         for e in errors]
        checks.append({'file': name, 'schema': 'definition-v2.9', 'valid': not errors,
                       'count': len(data.get('definitions', []))})
        definitions.extend(data.get('definitions', []))
        for item in data.get('unresolvedSourceInterpretations', []):
            unresolved.append({'bookFile': name, 'id': item.get('id'),
                               'severity': item.get('severity'), 'issue': item.get('issue')})
    for name in INFLUENCES:
        data = json.loads((base / name).read_text())
        errors = sorted(Draft202012Validator(es, format_checker=FormatChecker()).iter_errors(data),
                        key=lambda e: (list(map(str, e.absolute_path)), e.message))
        if errors:
            failures += [f'{name}: {"/".join(map(str, e.absolute_path))}: {e.message}'
                         for e in errors]
        checks.append({'file': name, 'schema': 'influence-v2.9', 'valid': not errors,
                       'count': len(data.get('edges', []))})
        influences.extend(data.get('edges', []))
    def_ids = [x['definitionId'] for x in definitions]
    edge_ids = [e['ruleId'] for e in influences]
    known = set(def_ids)
    for label, seq in [('definitionId', def_ids), ('ruleId', edge_ids)]:
        bad = [(k, n) for k, n in collections.Counter(seq).items() if n > 1]
        if bad: failures.append(f'Duplicate {label}: {bad}')
    for edge in influences:
        source = edge['sourceDefinitionId']
        domain = edge['sourceDomain']
        if domain in FORCE_DOMAINS and source not in known:
            failures.append(f'Unresolved Force-domain source: {edge["ruleId"]} -> {source}')
        for target in edge.get('targetSelector', {}).get('definitionIds', []):
            if target not in known and any(f'/{d}/' in target for d in FORCE_DOMAINS):
                failures.append(f'Unresolved Force-domain target: {edge["ruleId"]} -> {target}')
    title_groups = collections.defaultdict(set)
    for x in definitions:
        title_groups[x['printedName'].casefold()].add(x['definitionId'])
    collisions = {name: sorted(ids) for name, ids in title_groups.items() if len(ids) > 1}
    for name, ids in collisions.items():
        if set(ids) != EXPECTED_COLLISIONS.get(name):
            failures.append(f'Unexpected shared title {name}: {ids}')
    for name, ids in EXPECTED_COLLISIONS.items():
        if set(collisions.get(name, [])) != ids:
            failures.append(f'Expected source collision missing/changed: {name}')
    for x in definitions:
        if not x['source']['printedPage']:
            failures.append('Missing printed page: ' + x['definitionId'])
    power_instances = [x for x in definitions if x['domain'] in ('force-power', 'lightsaber-form-power')]
    copy_policy = collections.Counter((x['source']['bookId'], x['acquisition']['repeatable'])
                                      for x in power_instances)
    inconsistent = [x['definitionId'] for x in power_instances
                    if x['acquisition']['method'] == 'force-training-suite'
                    and not x['acquisition']['repeatable']]
    blockers = [x for x in unresolved if x['severity'] == 'blocks-full-automation']
    readiness = collections.Counter(x['automationReadiness'] for x in definitions)
    stale_jatm_note = [x for x in unresolved if x['id'] == 'JATM-RAWPOL-001'
                       and 'active form gate' in x['issue'].lower()]
    if len(definitions) != 212 or len(influences) != 178:
        failures.append(f'Historical package size drift: definitions={len(definitions)}, edges={len(influences)}')
    report = {
        'auditType': 'force-v2-seven-book-crossbook-offline-verification',
        'classification': 'structure-and-links-only; not Foundry execution or exhaustiveness',
        'schemaVersion': '2.9.0',
        'definitions': len(definitions), 'edges': len(influences),
        'domains': dict(sorted(collections.Counter(x['domain'] for x in definitions).items())),
        'readiness': dict(sorted(readiness.items())),
        'definitionSourceStatus': dict(sorted(collections.Counter(x['sourceStatus'] for x in definitions).items())),
        'shapeChecks': checks,
        'definitionIdsUnique': len(known) == len(definitions),
        'ruleIdsUnique': len(set(edge_ids)) == len(influences),
        'expectedPrintedNameCollisions': collisions,
        'externalInfluenceSourcesCount': len(set(e['sourceDefinitionId'] for e in influences
                                                 if e['sourceDefinitionId'] not in known)),
        'externalInfluenceSourcesNote': 'Cross-domain talent, feat, equipment and rule IDs are not in the seven-book definition registry; these remain unverified against live SSOT.',
        'forceTrainingSuitePowers': len([x for x in power_instances if x['acquisition']['method']=='force-training-suite']),
        'forceTrainingFalseRepeatableCount': len(inconsistent),
        'forceTrainingFalseRepeatableIds': inconsistent,
        'copyPolicyByBook': [{'book': book, 'repeatable': flag, 'count': n} for (book,flag),n in sorted(copy_policy.items())],
        'blockingEditorialIssues': len(blockers),
        'blockingEditorialIds': [x['id'] for x in blockers],
        'totalEditorialIssues': len(unresolved),
        'staleJatmEditorialIssue': bool(stale_jatm_note),
        'findings': [
            {'id':'FVC-001','severity':'blocks-implementation-contract','subject':'31 Force Training power definitions mark acquisition.repeatable false; Core printed p95 allows multiple copies of same Power. Do not use per-item flag as suite-copy legality.'},
            {'id':'FVC-002','severity':'editorial-drift','subject':'JATM-RAWPOL-001 still describes a proposed active-form gate even though the rolling v2.8 correction and JATM p29 establish talent ownership only.'},
            {'id':'FVC-003','severity':'blocks-runtime-certification','subject':'Live SSOT ownership of external feat/talent/equipment/rule graph sources and targets not certified by this offline package.'},
            {'id':'FVC-004','severity':'blocks-implementation-contract','subject':f'{len(blockers)} editorial issues across book packages explicitly block full automation, whereas only {readiness.get("blocked-on-ruling",0)} individual definitions mark blocked-on-ruling. Different granularities must be reconciled into a single truthful release gate.'},
        ],
        'structuralFailures': failures,
        'structurallyValid': not failures,
        'implementationReady': False,
        'runtimeCertified': False,
        'sourceCorpusExhaustive': False,
    }
    serial = json.dumps(report, indent=2, ensure_ascii=False) + '\n'
    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(serial)
    else:
        print(serial)
    if failures:
        print('SCHEMA/IDENTITY FAILURES: '+str(len(failures)), file=sys.stderr)
        return 1
    if args.strict_ready:
        print('BLOCKED: implementation-ready certification not achieved', file=sys.stderr)
        return 2
    print('PASS: seven-book offline structural / identity checks only', file=sys.stderr)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
