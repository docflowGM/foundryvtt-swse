#!/usr/bin/env python3
from __future__ import annotations
import json
import re
from pathlib import Path
from typing import Iterable, List, Dict, Set, Tuple

ROOT = Path(__file__).resolve().parents[1]

SKILL_PATTERNS = {
    'acrobatics': [r'\bacrobatics\b'],
    'athletics': [r'\bathletics\b', r'\bclimb\b', r'\bswim\b'],
    'deception': [r'\bdeception\b', r'\bbluff\b'],
    'endurance': [r'\bendurance\b'],
    'gather_information': [r'\bgather information\b'],
    'initiative': [r'\binitiative\b'],
    'jump': [r'\bjump\b'],
    'knowledge': [r'\bknowledge\b'],
    'knowledge_tactics': [r'\bknowledge\s*\(tactics\)\b'],
    'knowledge_life_sciences': [r'\bknowledge\s*\(life sciences\)\b'],
    'knowledge_bureaucracy': [r'\bknowledge\s*\(bureaucracy\)\b'],
    'mechanics': [r'\bmechanics\b', r'\brepair\b'],
    'perception': [r'\bperception\b'],
    'persuasion': [r'\bpersuasion\b', r'\bdiplomacy\b'],
    'pilot': [r'\bpilot\b', r'\bpiloting\b'],
    'ride': [r'\bride\b'],
    'stealth': [r'\bstealth\b', r'\bhide\b', r'\bsneak\b'],
    'survival': [r'\bsurvival\b', r'\btrack\b'],
    'treat_injury': [r'\btreat injury\b', r'\bfirst aid\b', r'\bsurgery\b'],
    'use_computer': [r'\buse computer\b', r'\bhacking\b'],
    'use_the_force': [r'\buse the force\b'],
}

SPECIES_TO_TAG = {
    'twi\'lek': 'twilek',
    'miraluka': 'miraluka',
    'human': 'human',
    'droid': 'droid',
    'wookiee': 'wookiee',
    'bothan': 'bothan',
    'rodian': 'rodian',
    'trandoshan': 'trandoshan',
    'zabrak': 'zabrak',
    'duros': 'duros',
    'cerean': 'cerean',
    'kel dor': 'kel_dor',
    'nautolan': 'nautolan',
    'mon calamari': 'mon_calamari',
    'quarren': 'quarren',
}

CLASS_PATTERNS = {
    'jedi': [r'\bjedi\b'],
    'soldier': [r'\bsoldier\b'],
    'scout': [r'\bscout\b'],
    'scoundrel': [r'\bscoundrel\b'],
    'noble': [r'\bnoble\b'],
    'nonheroic': [r'\bnonheroic\b'],
}

TAG_ALIASES = {
    'feat_chain': 'feat-chain',
    'talent_chain': 'talent-chain',
    'action_economy': 'action-economy',
    'burst_damage': 'burst-damage',
    'damage_reduction': 'damage-reduction',
    'condition_removal': 'condition-removal',
    'force_offense': 'force-offense',
    'force_defense': 'force-defense',
    'force_support': 'force-support',
    'force_control': 'force-control',
    'non_force': 'non-force',
    'dark_side': 'dark-side',
    'light_side': 'light-side',
}

ACTION_PATTERNS = {
    'free_action': [r'\bfree action\b'],
    'swift_action': [r'\bswift action\b'],
    'move_action': [r'\bmove action\b'],
    'standard_action': [r'\bstandard action\b'],
    'full_round_action': [r'\bfull[- ]round action\b'],
    'reaction': [r'\breaction\b'],
    'immediate_action': [r'\bimmediate action\b'],
}

FORCE_WORDS = [r'\bforce\b', r'\buse the force\b', r'\bforce point\b']

def norm_tag(tag: str) -> str:
    t = str(tag or '').strip().lower()
    t = re.sub(r'[\s/]+', '_', t)
    t = t.replace('-', '_')
    t = re.sub(r'[^a-z0-9_()]+', '', t)
    t = re.sub(r'_+', '_', t).strip('_')
    return t


def load_species_names() -> Set[str]:
    species = set()
    p = ROOT / 'packs/species.db'
    if not p.exists():
        return species
    with p.open(encoding='utf-8') as fh:
        for line in fh:
            if not line.strip():
                continue
            obj = json.loads(line)
            name = obj.get('name')
            if name:
                species.add(name.lower())
    return species


def load_prestige_maps() -> Tuple[Dict[str, Set[str]], Dict[str, Set[str]], Dict[str, Set[str]]]:
    feat_map: Dict[str, Set[str]] = {}
    tree_map: Dict[str, Set[str]] = {}
    power_map: Dict[str, Set[str]] = {}
    path = ROOT / 'scripts/data/prestige-prerequisites.js'
    lines = path.read_text(encoding='utf-8').splitlines()
    current = None
    depth = 0
    block: List[str] = []
    for line in lines:
        if current is None:
            m = re.match(r"\s*'([^']+)':\s*\{", line)
            if m:
                current = m.group(1)
                depth = line.count('{') - line.count('}')
                block = [line]
        else:
            block.append(line)
            depth += line.count('{') - line.count('}')
            if depth <= 0:
                text = '\n'.join(block)
                for field, store in [('feats', feat_map), ('featsAny', feat_map), ('forcePowers', power_map)]:
                    for m in re.finditer(rf'{field}:\s*\[([^\]]*)\]', text, re.S):
                        entries = re.findall(r"'([^']+)'", m.group(1))
                        for entry in entries:
                            store.setdefault(entry.lower(), set()).add(current)
                for m in re.finditer(r'trees:\s*\[([^\]]*)\]', text, re.S):
                    entries = re.findall(r"'([^']+)'", m.group(1))
                    for entry in entries:
                        tree_map.setdefault(entry.lower(), set()).add(current)
                current = None
                block = []
    return feat_map, tree_map, power_map


SPECIES_NAMES = load_species_names()
PRESTIGE_FEATS, PRESTIGE_TREES, PRESTIGE_POWERS = load_prestige_maps()


def has_any(text: str, patterns: Iterable[str]) -> bool:
    return any(re.search(p, text, re.I) for p in patterns)


def add(tags: Set[str], *vals: str):
    for v in vals:
        if not v:
            continue
        tags.add(v)
        alias = TAG_ALIASES.get(v)
        if alias:
            tags.add(alias)


def add_skill_tags(tags: Set[str], text: str):
    for skill, patterns in SKILL_PATTERNS.items():
        if has_any(text, patterns):
            add(tags, f'skill_{skill}')
            if skill.startswith('knowledge'):
                add(tags, 'knowledge', 'ability_int', 'utility')
            if skill in {'mechanics', 'use_computer'}:
                add(tags, 'tech', 'ability_int', 'utility')
            if skill in {'persuasion', 'deception', 'gather_information'}:
                add(tags, 'social', 'ability_cha', 'utility')
            if skill in {'perception', 'survival'}:
                add(tags, 'awareness', 'ability_wis', 'utility')
            if skill == 'pilot':
                add(tags, 'pilot', 'mobility', 'ability_dex')
            if skill == 'stealth':
                add(tags, 'stealth', 'skirmisher', 'ability_dex')
            if skill == 'endurance':
                add(tags, 'ability_con', 'durability')
            if skill in {'acrobatics', 'athletics', 'jump', 'ride'}:
                add(tags, 'mobility')
            if skill == 'use_the_force':
                add(tags, 'force', 'use_the_force', 'force_execution', 'force_power_check')
            if skill == 'treat_injury':
                add(tags, 'healing', 'support', 'medicine')


def add_action_tags(tags: Set[str], text: str):
    found = False
    for tag, patterns in ACTION_PATTERNS.items():
        if has_any(text, patterns):
            add(tags, tag)
            found = True
    if found:
        add(tags, 'new_action')
    if any(t in tags for t in ['free_action', 'swift_action', 'reaction', 'immediate_action']):
        add(tags, 'action_economy')
    if has_any(text, [r'\bextra move action\b', r'\bextra swift action\b', r'\btake an additional action\b']):
        add(tags, 'action_economy', 'extra_action', 'new_action')


def add_species_and_class_tags(tags: Set[str], text: str, prereq: str = ''):
    full = f'{text} {prereq}'.lower()
    for species, slug in SPECIES_TO_TAG.items():
        if species in full:
            add(tags, 'racial', 'species_locked', f'species_{slug}', slug)
    for species_name in SPECIES_NAMES:
        if species_name in full:
            add(tags, 'racial', 'species_locked', f'species_{norm_tag(species_name)}')
    for cls, patterns in CLASS_PATTERNS.items():
        if has_any(full, patterns):
            add(tags, f'class_{cls}')


def infer_tags(name: str, text: str, item_type: str = 'feat', extra: dict | None = None) -> List[str]:
    extra = extra or {}
    lower = f'{name} {text}'.lower()
    tags: Set[str] = set()

    # Preserve broad type identity
    if item_type == 'feat':
        add(tags, 'feat')
    elif item_type == 'talent':
        add(tags, 'talent')
    elif item_type == 'power':
        add(tags, 'force_power', 'force')
    elif item_type == 'technique':
        add(tags, 'force_technique', 'force')
    elif item_type == 'secret':
        add(tags, 'force_secret', 'force')
    elif item_type == 'maneuver':
        add(tags, 'ship', 'maneuver', 'starship')

    # Existing broad force/non-force split
    if has_any(lower, FORCE_WORDS) or item_type in {'power', 'technique', 'secret'}:
        add(tags, 'force')
    else:
        add(tags, 'non_force')

    add_species_and_class_tags(tags, lower, extra.get('prereq', ''))
    add_skill_tags(tags, lower)
    add_action_tags(tags, lower)

    # Core combat domains
    if has_any(lower, [r'\bmelee\b', r'\blightsaber\b', r'\bunarmed\b', r'\bmartial arts\b', r'\bcharge\b', r'\bpower attack\b']):
        add(tags, 'offense_melee', 'melee', 'ability_str')
    if has_any(lower, [r'\branged\b', r'\bpistol\b', r'\brifle\b', r'\bblaster\b', r'\bsniper\b', r'\bgrenade\b', r'\blauncher\b', r'\bthrown\b']):
        add(tags, 'offense_ranged', 'ranged', 'ability_dex')
    if 'lightsaber' in lower:
        add(tags, 'lightsaber', 'offense_melee')
    if 'unarmed' in lower or 'martial arts' in lower:
        add(tags, 'unarmed', 'offense_melee')
    if has_any(lower, [r'\battack roll', r'\battack rolls\b', r'\bto attack\b', r'\bto hit\b', r'\baccuracy\b']):
        add(tags, 'accuracy')
    if has_any(lower, [r'\bdeal\b.*\bdamage', r'\bdamage rolls?\b', r'\bextra damage\b', r'\bbonus damage\b']):
        add(tags, 'sustained_damage')
    if has_any(lower, [r'\bcritical\b', r'\bcrit\b']):
        add(tags, 'crit_synergy')
    if has_any(lower, [r'\ball targets\b', r'\beach target\b', r'\barea\b', r'\bsplash\b', r'\bcone\b', r'\bblast\b']):
        add(tags, 'area_effect', 'controller')
    if has_any(lower, [r'\bcharge\b']):
        add(tags, 'charge', 'mobility')
    if has_any(lower, [r'\battack of opportunity\b', r'\bopportunity attack\b']):
        add(tags, 'reaction', 'positioning')

    # Defense / resilience
    if has_any(lower, [r'\bdefense\b', r'\breflex defense\b', r'\bfortitude defense\b', r'\bwill defense\b', r'\barmor class\b', r'\bac\b']):
        add(tags, 'defense')
    if has_any(lower, [r'\breflex\b']):
        add(tags, 'reflex', 'ability_dex')
    if has_any(lower, [r'\bfortitude\b']):
        add(tags, 'fortitude', 'ability_con')
    if has_any(lower, [r'\bwill\b']):
        add(tags, 'will', 'ability_wis')
    if has_any(lower, [r'\bhit points?\b', r'\bbonus hit points?\b']):
        add(tags, 'hit_points', 'durability', 'ability_con')
    if has_any(lower, [r'\bdamage threshold\b']):
        add(tags, 'damage_threshold', 'durability')
    if has_any(lower, [r'\bdamage reduction\b', r'\breduce damage\b', r'\bdr \d']):
        add(tags, 'damage_reduction', 'defense', 'durability')
    if has_any(lower, [r'\bsecond wind\b', r'\bcondition track\b', r'\bpersistent condition\b', r'\bcondition\b']):
        add(tags, 'condition_track', 'condition_removal')
    if has_any(lower, [r'\bblock\b']):
        add(tags, 'block', 'defense')
    if has_any(lower, [r'\bdeflect\b']):
        add(tags, 'deflect', 'defense')
    if has_any(lower, [r'\bcover\b', r'\bconcealment\b']):
        add(tags, 'cover', 'concealment', 'defense', 'positioning')

    # Mobility / positioning
    if has_any(lower, [r'\bmove\b', r'\bmovement\b', r'\bspeed\b', r'\bshift\b', r'\bwithdraw\b', r'\breposition\b']):
        add(tags, 'mobility', 'positioning')
    if has_any(lower, [r'\bjump\b']):
        add(tags, 'jump', 'mobility', 'ability_str')
    if has_any(lower, [r'\bpilot\b', r'\bstarship\b', r'\bvehicle\b']):
        add(tags, 'pilot', 'mobility')
    if has_any(lower, [r'\bstealth\b', r'\bhide\b', r'\bcamouflage\b', r'\bconcealed\b']):
        add(tags, 'stealth', 'skirmisher', 'positioning')

    # Social / support / utility
    if has_any(lower, [r'\bally\b', r'\ballies\b', r'\bgrant\b.*\bally', r'\bwithin .* squares of you\b']):
        add(tags, 'ally_support', 'support')
    if has_any(lower, [r'\bheal\b', r'\bhealing\b', r'\brecover hit points\b', r'\brestore vitality\b']):
        add(tags, 'healing', 'support', 'medicine')
    if has_any(lower, [r'\bleadership\b', r'\bcommand\b', r'\brally\b', r'\binspire\b']):
        add(tags, 'leadership', 'support', 'ability_cha')
    if has_any(lower, [r'\bbuff\b', r'\bgain a bonus\b', r'\bgrant a bonus\b']):
        add(tags, 'buff')
    if has_any(lower, [r'\bpenalty\b', r'\bdecrease\b', r'\bimpaired\b', r'\bstunned\b', r'\bimmobilized\b', r'\bknocked prone\b']):
        add(tags, 'debuff', 'control')
    if has_any(lower, [r'\bknowledge\b', r'\bawareness\b', r'\bsearch\b', r'\bdetect\b', r'\bsense\b']):
        add(tags, 'utility')

    # Force-specific
    if 'force training' in lower:
        add(tags, 'force_training', 'force_capacity', 'force_power_count')
    if has_any(lower, [r'\buse the force check\b', r'\butf check\b']):
        add(tags, 'force_execution', 'use_the_force', 'force_power_check')
    if has_any(lower, [r'\bextra force powers?\b', r'\badditional force powers?\b', r'\bhow many force powers\b', r'\bmore force powers\b']):
        add(tags, 'force_capacity', 'force_multiplier', 'force_power_count', 'multiplier')
    if has_any(lower, [r'\bdeal damage\b', r'\bforce lightning\b', r'\bforce grip\b']) and 'force' in lower:
        add(tags, 'force_offense', 'offense_ranged')
    if has_any(lower, [r'\bheal\b', r'\bprotect\b', r'\bbarrier\b']) and 'force' in lower:
        add(tags, 'force_support', 'force_defense')
    if has_any(lower, [r'\bmove object\b', r'\bimmobilize\b', r'\bpush\b', r'\bstun\b', r'\bmind trick\b']) and 'force' in lower:
        add(tags, 'force_control', 'controller')
    if 'dark side' in lower:
        add(tags, 'dark_side')
    if 'light side' in lower:
        add(tags, 'light_side')
    if has_any(lower, [r'\bforce point\b']):
        add(tags, 'force_point_spend', 'resource_spend')

    # Action creation / ability creation / scaling
    if has_any(lower, [r'\byou can\b', r'\bonce per encounter\b', r'\bonce per day\b', r'\bmay spend\b', r'\bcan spend\b']):
        add(tags, 'activated')
    if has_any(lower, [r'\bonce per encounter\b', r'\bonce per day\b', r'\bper encounter\b']):
        add(tags, 'encounter_resource', 'new_ability')
    if has_any(lower, [r'\badditional\b', r'\bincrease\b', r'\bdouble\b', r'\b50%\b', r'\bx your class level\b', r'\bretroactively\b', r'\bconsidered to be\b']):
        add(tags, 'multiplier', 'scaling')

    # Feat/talent chain hints
    if item_type == 'feat' and has_any(lower, [r'\bprerequisite\b', r'\brequires\b']) and extra.get('prereq'):
        add(tags, 'feat_chain')
    if item_type == 'talent' and extra.get('tree'):
        add(tags, 'talent_chain', f'talent_tree_{norm_tag(extra["tree"])}')

    # Prestige gateway hints from authoritative prerequisite file
    item_name_key = name.lower().strip()
    for prestige in sorted(PRESTIGE_FEATS.get(item_name_key, set())):
        add(tags, 'gateway', f'prereq_{norm_tag(prestige)}')
    if extra.get('tree'):
        for prestige in sorted(PRESTIGE_TREES.get(extra['tree'].lower(), set())):
            add(tags, 'gateway', f'prereq_{norm_tag(prestige)}')
    if item_type == 'power':
        for prestige in sorted(PRESTIGE_POWERS.get(item_name_key, set())):
            add(tags, 'gateway', f'prereq_{norm_tag(prestige)}')

    # Special high-context species opportunities
    if item_name_key == 'jedi heritage':
        add(tags, 'racial', 'species_locked', 'conditional_opportunity', 'force_training', 'force_capacity', 'force_multiplier', 'forecast_value', 'multiplier')
    if item_name_key == 'skill training':
        add(tags, 'skill_unlock', 'gateway', 'forecast_value', 'ability_int')
    if 'conditional bonus feat' in lower or 'bonus feat' in lower:
        add(tags, 'conditional_opportunity')

    # Ship / maneuver specialization
    if item_type == 'maneuver':
        add(tags, 'pilot', 'new_action')
        if has_any(lower, [r'\breaction\b', r'\binterrupt\b']):
            add(tags, 'reaction', 'action_economy')
        if has_any(lower, [r'\bevade\b', r'\bdodge\b', r'\bdefensive\b']):
            add(tags, 'defense', 'evasion')
        if has_any(lower, [r'\bpursuit\b', r'\bchase\b', r'\bpursue\b']):
            add(tags, 'mobility', 'pursuit')
        if has_any(lower, [r'\bally\b', r'\bwingman\b', r'\bsquadron\b']):
            add(tags, 'crew_support', 'support')
        if has_any(lower, [r'\bdogfight\b', r'\bformation\b', r'\bfiring arc\b']):
            add(tags, 'dogfighting', 'positioning')

    return sorted(tags)


def merge_tags(existing: Iterable[str], additions: Iterable[str]) -> List[str]:
    out: Set[str] = set()
    for tag in existing or []:
        if not tag:
            continue
        t = str(tag).strip()
        if not t:
            continue
        out.add(t)
        nt = norm_tag(t)
        if nt:
            out.add(nt)
        alias = TAG_ALIASES.get(nt)
        if alias:
            out.add(alias)
    for tag in additions:
        if not tag:
            continue
        out.add(tag)
        nt = norm_tag(tag)
        if nt:
            out.add(nt)
        alias = TAG_ALIASES.get(nt)
        if alias:
            out.add(alias)
    return sorted(out, key=lambda s: (s.lower(), s))


def update_jsonl(path: Path, item_type: str):
    lines = []
    with path.open(encoding='utf-8') as fh:
        for line in fh:
            if not line.strip():
                continue
            obj = json.loads(line)
            sys = obj.setdefault('system', {})
            parts = [obj.get('name', ''), sys.get('benefit', ''), sys.get('description', ''), sys.get('prerequisite', ''), sys.get('prerequisites', ''), sys.get('special', ''), sys.get('normalText', ''), sys.get('executionModel', ''), sys.get('abilityMeta', '')]
            tree = sys.get('treeId') or sys.get('category') or ''
            tags = infer_tags(obj.get('name', ''), ' '.join(str(p or '') for p in parts), item_type=item_type, extra={'prereq': str(sys.get('prerequisite') or sys.get('prerequisites') or ''), 'tree': str(tree or '')})
            sys['tags'] = merge_tags(sys.get('tags', []), tags)
            lines.append(json.dumps(obj, ensure_ascii=False))
    path.write_text('\n'.join(lines) + '\n', encoding='utf-8')
    print(f'updated {path} ({len(lines)} records)')


def update_force_json(path: Path, kind: str, list_key: str | None = None):
    data = json.loads(path.read_text(encoding='utf-8'))
    entries = data if list_key is None else data[list_key]
    count = 0
    for obj in entries:
        text = ' '.join(str(obj.get(k, '')) for k in ['name', 'description', 'effect', 'cost', 'alternativeCost'])
        if kind == 'power':
            text += ' ' + ' '.join(str(x) for x in obj.get('tags', []))
            meta = obj.get('meta', {})
            text += ' ' + ' '.join(str(meta.get(k, '')) for k in ['discipline', 'range', 'target', 'duration'])
            action_type = obj.get('actionType') or obj.get('action', {}).get('type', '')
            text += ' ' + str(action_type)
        tags = infer_tags(obj.get('name', ''), text, item_type=kind, extra={'prereq': ' '.join(obj.get('prerequisites', []) or [])})
        obj['tags'] = merge_tags(obj.get('tags', []), tags)
        count += 1
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'updated {path} ({count} records)')


def main():
    update_jsonl(ROOT / 'packs/feats.db', 'feat')
    update_jsonl(ROOT / 'packs/talents.db', 'talent')
    update_force_json(ROOT / 'data/force-powers.json', 'power')
    update_force_json(ROOT / 'data/force-techniques.json', 'technique', 'techniques')
    update_force_json(ROOT / 'data/force-secrets.json', 'secret', 'secrets')
    update_force_json(ROOT / 'data/source/starship-maneuvers.json', 'maneuver', 'entries')


if __name__ == '__main__':
    main()
