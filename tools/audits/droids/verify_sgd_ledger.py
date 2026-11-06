#!/usr/bin/env python3
"""Read-only SGD publication-ledger acceptance; not a Foundry runtime certificate."""
import copy
import json
import sys
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[3]
AUDIT = ROOT / 'data/audits/droids'
SCHEMA = json.loads((AUDIT / 'universal-droid-source-entry.schema.json').read_text())
RECORDS = json.loads((ROOT / 'data/canonical/droids/source-books/sgd.json').read_text())['sourceEntries']
CENSUS = json.loads((AUDIT / 'droid-publication-census.json').read_text())
BACKLOG = json.loads((AUDIT / 'sgd-review-backlog.json').read_text())


def ptr(path):
    return '/' + '/'.join(str(x).replace('~', '~0').replace('/', '~1') for x in path)


def leaves(value, path=()):
    if isinstance(value, dict):
        for k, v in value.items():
            if not path and k == 'fieldStates':
                continue
            yield from leaves(v, path + (k,))
    elif isinstance(value, list):
        if not value:
            yield ptr(path), value
        for i, v in enumerate(value):
            yield from leaves(v, path + (i,))
    else:
        yield ptr(path), value


def validate(record, sprint=False):
    errors = [f'{e.json_path}: {e.message}' for e in Draft202012Validator(SCHEMA).iter_errors(record)]
    if errors:
        return errors
    states, seen = record.get('fieldStates', {}), set()
    for path, value in leaves(record):
        seen.add(path)
        if value is None and states.get(path) not in ('not-stated', 'not-applicable', 'explicitly-none', 'unclear-source'):
            errors.append(f'{path}: null lacks source state')
        if value == [] and states.get(path) != 'explicitly-none':
            errors.append(f'{path}: empty array lacks explicitly-none proof')
        if value is not None and not isinstance(value, (dict, list)) and states.get(path) in ('not-stated', 'not-applicable', 'explicitly-none', 'unclear-source'):
            errors.append(f'{path}: nonnull value contradicts absence state')
    for path, state in states.items():
        if state in ('explicitly-none', 'source-verified') and path not in seen:
            errors.append(f'{path}: state claims omitted source proof')
    if not sprint:
        return errors
    if record['certification']['mechanicalStatus'] != 'partial' or record['certification']['runtimeStatus'] != 'not-tested':
        errors.append('Certification/runtime state unexpectedly promoted')
    if record['abilities'].get('con', 'MISSING') is not None or states.get('/abilities/con') != 'explicitly-none':
        errors.append('CON null contract broken')
    systems = record['systems'].get('installed') or []
    if not systems or not record['progression'].get('classes') or not record['movement'].get('locomotionSystems'):
        errors.append('Source components/classes/movement not structured')
    ids = [c['instanceId'] for c in systems]
    if len(ids) != len(set(ids)):
        errors.append('Duplicate component identity')
    if any(c.get('isFactoryInstalled') is True or c.get('isActiveByDefault') is True for c in systems):
        errors.append('Unproven factory/activation defaults')
    for loc in record.get('anatomy', {}).get('physicalLocations', []) or []:
        if any(cid not in ids for cid in loc.get('installedComponentIds', []) or []):
            errors.append('Orphan physical location')
    for move in record['movement']['locomotionSystems']:
        if move.get('componentInstanceId') and move['componentInstanceId'] not in ids:
            errors.append('Orphan locomotion')
    for attack in record['combat'].get('attackGroups', []) or []:
        if attack.get('operationStatus') != 'source-only' or attack.get('weaponComponentId') or attack.get('vehicleAttackGroupKey'):
            errors.append('Source-only weapon promoted to executable or mounted')
    return errors


def main():
    issues = []
    census = {x['listingId']: x for x in CENSUS['listings'] if x['bookId'] == 'SGD'}
    backlog = {x['listingId']: x for x in BACKLOG['models']}
    if len(RECORDS) != 46 or len(census) != 46:
        issues.append('SGD census cardinality drift')
    for idx, record in enumerate(RECORDS):
        key = f'SGD-DROID-{idx + 1:03d}'
        if record['identity']['sourceEntryKey'] != key:
            issues.append(f'{key}: source identity drift')
        for msg in validate(record, 30 <= idx < 45):
            issues.append(f'{key}: {msg}')
        if 30 <= idx < 45:
            pg = 128 + 2 * (idx - 30)
            c, b = census.get(key), backlog.get(key)
            if not c or not b or c['name'] != record['identity']['printedName'] or c['printedPageStart'] != pg or b['printedPage'] != pg or record['publication']['printedPageStart'] != pg:
                issues.append(f'{key}: source census/name/page mismatch')
    motion = {
        30: lambda r: any(x.get('restricted') == 'exclusive' for x in r['movement']['locomotionSystems']),
        37: lambda r: r['movement']['locomotionSystems'][0].get('starshipSpeedSquares') == 4,
        40: lambda r: r['movement']['locomotionSystems'][0].get('speedSquares') == 0,
        44: lambda r: any(x.get('mode') == 'hovering' and x.get('restricted') == 'limited' for x in r['movement']['locomotionSystems']),
    }
    for idx, fn in motion.items():
        if not fn(RECORDS[idx]):
            issues.append(f'SGD-DROID-{idx + 1:03d}: movement safety mismatch')
    for idx, claim in [(31, 'SGD-032-MIMIC-EFFECT-CONFLICT'), (38, 'SGD-039-CUTTING-LASER-ACTION-CONFLICT'), (40, 'SGD-041-STUBBORN-TARGET-CONFLICT')]:
        if not any(x.get('issueId') == claim and x.get('resolutionStatus') == 'unresolved' for x in RECORDS[idx]['exceptions'].get('sourceContradictions', [])):
            issues.append(f'{claim}: source contradiction dropped or guessed resolved')
    bad = []
    original = RECORDS[30]
    mutant = copy.deepcopy(original)
    mutant['fieldStates'].pop('/abilities/con', None)
    bad.append(('null-state evidence', mutant))
    mutant = copy.deepcopy(original)
    mutant['combat']['attackGroups'][0]['operationStatus'] = 'certified-executable'
    bad.append(('untrusted attack', mutant))
    mutant = copy.deepcopy(original)
    mutant['systems']['installed'][0]['isActiveByDefault'] = True
    bad.append(('fabricated activation', mutant))
    mutant = copy.deepcopy(original)
    mutant['progression']['classes'] = []
    bad.append(('unproven empty classes', mutant))
    mutant = copy.deepcopy(original)
    mutant['anatomy']['physicalLocations'][0]['installedComponentIds'] = ['UNKNOWN-COMPONENT']
    bad.append(('orphan physical location', mutant))
    for name, record in bad:
        if not validate(record, True):
            issues.append(f'Negative fixture accepted: {name}')
    if issues:
        for issue in issues[:50]:
            print('FAIL:', issue)
        print(f'FAIL: {len(issues)} issues')
        return 1
    print('PASS: 46/46 Draft 2020-12 source records and null/empty semantics')
    print('PASS: SGD 031-045 census, movement, components, untrusted-attack gates')
    print('PASS: 3 retained source conflicts, 5/5 negative fixtures')
    print('NOTE: source structure only; whole-record mechanical certification and runtime remain separate')
    return 0


if __name__ == '__main__':
    sys.exit(main())
