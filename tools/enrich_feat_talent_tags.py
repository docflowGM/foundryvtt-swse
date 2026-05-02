from pathlib import Path
import json
import re

SURVEY_TAG_RULES = {
    'tracking': [r'track', r'hunt', r'pursuit', r'follow', r'stalk'],
    'precision': [r'precision', r'accurac', r'aim', r'sniper', r'careful shot', r'weak point', r'called shot'],
    'awareness': [r'perception', r'initiative', r'alert', r'aware', r'notice', r'sense'],
    'force_training': [r'force training', r'use the force', r'force point', r'force power', r'force-sensitive', r'force sensitivity'],
    'force_support': [r'heal', r'ally', r'protect', r'shield', r'barrier', r'grant .* bonus', r'restore'],
    'social': [r'persuasion', r'deception', r'diplomac', r'gather information', r'charisma', r'bluff', r'influence', r'negotiat'],
    'support': [r'ally', r'team', r'squad', r'command', r'morale', r'protect', r'heal', r'assist'],
    'leadership': [r'command', r'leadership', r'morale', r'ally', r'squad', r'team'],
    'mobility': [r'move', r'speed', r'charge', r'acrobat', r'jump', r'climb', r'mobility', r'evasion', r'avoid'],
    'technical': [r'mechanics', r'use computer', r'repair', r'droid', r'tech', r'computer', r'engineer', r'security system'],
    'utility': [r'knowledge', r'skill', r'versatil', r'utility', r'language', r'bonus trained'],
    'battlefield_control': [r'condition track', r'suppress', r'knock .* prone', r'push', r'stun', r'move .* step down'],
    'resilience': [r'fortitude', r'damage threshold', r'damage reduction', r'resist', r'tough', r'endurance', r'bonus hit points'],
    'durability': [r'hit points', r'damage threshold', r'bonus hit points', r'tough'],
    'defense': [r'reflex defense', r'fortitude defense', r'will defense', r'defense', r'deflect', r'block'],
    'unarmed': [r'unarmed', r'martial arts', r'grapple'],
    'melee': [r'melee', r'lightsaber', r'charge', r'power attack', r'weapon focus \(lightsabers\)', r'rapid strike'],
    'ranged': [r'ranged', r'blaster', r'rifle', r'pistol', r'autofire', r'point-blank', r'far shot'],
    'suppression': [r'autofire', r'suppress', r'area'],
    'heavy_weapons': [r'heavy weapon', r'autofire', r'launcher'],
    'initiative': [r'initiative'],
    'stealth': [r'stealth', r'hide', r'shadow', r'sneak', r'conceal'],
    'knowledge': [r'knowledge', r'lore', r'study', r'analysis'],
    'pilot': [r'pilot', r'starship', r'vehicle'],
}

NAME_RULES = {
    'force_training': [r'^force training$', r'^strong in the force$', r'^force sensitivity$'],
    'weapon_focus_lightsabers': [r'weapon focus \(lightsabers\)'],
    'weapon_focus_rifles': [r'weapon focus \(rifles\)'],
    'martial_arts': [r'martial arts'],
    'improved_defenses': [r'improved defenses'],
    'improved_damage_threshold': [r'improved damage threshold'],
    'leadership': [r'^leadership$'],
    'toughness': [r'^toughness$'],
    'point_blank_shot': [r'point-blank shot'],
    'far_shot': [r'^far shot$'],
    'precise_shot': [r'^precise shot$'],
    'power_attack': [r'^power attack$'],
    'combat_reflexes': [r'^combat reflexes$'],
    'deadeye': [r'^deadeye$']
}

DIRECT_ADD = {
    'feat': {'non-force': [r'^(?!.*force).*$']},
    'talent': {}
}

def normalize(tag):
    return re.sub(r'[^a-z0-9]+', '_', tag.strip().lower()).strip('_')

def enrich(path):
    out_lines = []
    for line in path.read_text(encoding='utf-8').splitlines():
        if not line.strip():
            continue
        data = json.loads(line)
        system = data.get('system', {})
        tags = {normalize(t) for t in system.get('tags', []) if str(t).strip()}
        name = str(data.get('name', ''))
        text = ' '.join([
            name,
            str(system.get('benefit', '')),
            str(system.get('prerequisite', '')),
            str(system.get('special', '')),
            str(system.get('normalText', '')),
            (str((system.get('description') or {}).get('value', '')) if isinstance(system.get('description'), dict) else str(system.get('description', ''))),
        ]).lower()
        for tag, patterns in SURVEY_TAG_RULES.items():
            if any(re.search(p, text, re.I) for p in patterns):
                tags.add(normalize(tag))
        for tag, patterns in NAME_RULES.items():
            if any(re.search(p, name, re.I) for p in patterns):
                tags.add(normalize(tag))
        # preserve hyphenated canonical tags alongside normalized survey aliases for exact matching in other systems
        expanded = set(tags)
        for t in list(tags):
            expanded.add(t.replace('_', '-'))
        system['tags'] = sorted(expanded)
        data['system'] = system
        out_lines.append(json.dumps(data, ensure_ascii=False, separators=(',', ':')))
    path.write_text('\n'.join(out_lines) + '\n', encoding='utf-8')

if __name__ == '__main__':
    enrich(Path('packs/feats.db'))
    enrich(Path('packs/talents.db'))
