import json,re
from pathlib import Path

ROOT=Path('.')
PATH=ROOT/'packs'/'feats.db'

ABILITY_MAP = {
    'strength': 'ability_strength', 'str': 'ability_strength',
    'dexterity': 'ability_dexterity', 'dex': 'ability_dexterity',
    'constitution': 'ability_constitution', 'con': 'ability_constitution',
    'intelligence': 'ability_intelligence', 'int': 'ability_intelligence',
    'wisdom': 'ability_wisdom', 'wis': 'ability_wisdom',
    'charisma': 'ability_charisma', 'cha': 'ability_charisma',
}
SKILLS = {
    'acrobatics':'skill_acrobatics','athletics':'skill_athletics','climb':'skill_climb','jump':'skill_jump','swim':'skill_swim',
    'deception':'skill_deception','endurance':'skill_endurance','gather information':'skill_gather_information',
    'initiative':'skill_initiative','knowledge':'skill_knowledge','mechanics':'skill_mechanics','perception':'skill_perception',
    'persuasion':'skill_persuasion','pilot':'skill_pilot','ride':'skill_ride','stealth':'skill_stealth','survival':'skill_survival',
    'treat injury':'skill_treat_injury','use computer':'skill_use_computer','use the force':'skill_use_the_force','sleight of hand':'skill_sleight_of_hand'
}

EXACT = {
    'Jedi Heritage': ['racial','species_locked','species_twilek','force','force_training','force_multiplier','force_capacity','forecast_value','conditional_opportunity','species_opportunity'],
    'Force Training': ['force','force_training','force_capacity','force_powers','new_option','build_enabler','forecast_value'],
    'Skill Training': ['skill_training','skill_recovery','new_option','build_enabler','forecast_value','prereq_gateway'],
    'Power Attack': ['offense_melee','damage_scaling','feat_chain','prereq_gateway','strength_synergy','standard_action'],
    'Rapid Strike': ['offense_melee','lightsaber_compatible','damage_scaling','feat_chain','standard_action'],
    'Rapid Shot': ['offense_ranged','damage_scaling','feat_chain','standard_action'],
    'Point Blank Shot': ['offense_ranged','accuracy','damage_scaling','feat_chain'],
    'Point-Blank Shot': ['offense_ranged','accuracy','damage_scaling','feat_chain'],
    'Precise Shot': ['offense_ranged','accuracy','feat_chain','anti_cover'],
    'Quick Draw': ['action_economy','swift_action','draw_weapon','setup'],
    'Combat Reflexes': ['reaction','opportunity_attack','defense','control'],
    'Weapon Finesse': ['offense_melee','finesse','dexterity_synergy','accuracy'],
    'Dodge': ['defense','reflex_defense','survivability'],
    'Mobility': ['mobility','defense','anti_opportunity_attack'],
    'Running Attack': ['mobility','offense_ranged','offense_melee','move_action','standard_action','hit_and_run'],
    'Spring Attack': ['mobility','offense_melee','move_action','standard_action','hit_and_run'],
    'Whirlwind Attack': ['offense_melee','multi_target','full_round_action','crowd_control'],
    'Melee Defense': ['defense','melee_defense','survivability'],
    'Sniper': ['offense_ranged','sniping','accuracy','setup'],
    'Deadly Sniper': ['offense_ranged','sniping','damage_scaling'],
    'Return Fire': ['reaction','offense_ranged','counterattack','new_action'],
    'Heroic Surge': ['action_economy','resource_spend','extra_action','burst_turn'],
    'Extra Second Wind': ['survivability','recovery','second_wind'],
    'Improved Damage Threshold': ['defense','damage_threshold','survivability'],
    'Toughness': ['durability','survivability','hit_points'],
    'Burst Fire': ['offense_ranged','autofire','area_pressure'],
    'Autofire Assault': ['offense_ranged','autofire','area_pressure','full_attack_synergy'],
    'Autofire Sweep': ['offense_ranged','autofire','multi_target','area_pressure'],
    'Suppressive Fire': ['offense_ranged','control','area_pressure'],
    'Suppression Fire': ['offense_ranged','control','area_pressure'],
}

TREE_HINTS = {
    'military training': ['military','background_opportunity'],
    'team': ['teamwork','ally_support'],
    'martial arts': ['unarmed','offense_melee','feat_chain'],
}


def norm_tag(tag):
    return re.sub(r'[^a-z0-9]+','_',tag.strip().lower()).strip('_')


def add(tags,*items):
    for item in items:
        if not item: continue
        if isinstance(item,(list,tuple,set)):
            add(tags,*item)
        else:
            t=norm_tag(item)
            if t and t not in tags:
                tags.append(t)


def text_of(entry):
    system=entry.get('system') or {}
    desc=system.get('description')
    if isinstance(desc,dict):
        value=desc.get('value','')
    else:
        value=desc or ''
    prereq=system.get('requirements') or system.get('prerequisites') or ''
    return f"{entry.get('name','')}\n{value}\n{prereq}".lower()


def base_tags(entry):
    name=entry.get('name','')
    system=entry.get('system') or {}
    feat_type=(system.get('featType') or 'general').lower()
    tags=[]
    add(tags,'feat',feat_type)
    if feat_type=='species': add(tags,'racial','species_opportunity')
    if feat_type=='force': add(tags,'force')
    if feat_type=='team': add(tags,'teamwork','ally_support')
    if feat_type=='martial_arts': add(tags,'unarmed','offense_melee','feat_chain')
    txt=text_of(entry)
    lname=name.lower()

    # action economy
    if 'swift action' in txt: add(tags,'swift_action','action_economy')
    if 'move action' in txt: add(tags,'move_action','action_economy')
    if 'standard action' in txt: add(tags,'standard_action')
    if 'full-round' in txt or 'full round' in txt: add(tags,'full_round_action')
    if 'reaction' in txt or 'opportunity attack' in txt or 'attack of opportunity' in txt: add(tags,'reaction')
    if 'free action' in txt: add(tags,'free_action','action_economy')

    # abilities / skills
    for needle,tag in ABILITY_MAP.items():
        if re.search(rf'\b{re.escape(needle)}\b', txt): add(tags,tag)
    for needle,tag in SKILLS.items():
        if needle in txt: add(tags,tag,'skill_synergy')

    # force axes
    if 'use the force' in txt: add(tags,'use_the_force','force_execution')
    if 'force training' in txt: add(tags,'force_training','force_capacity')
    if 'force power' in txt or 'force powers' in txt: add(tags,'force_powers')
    if 'force point' in txt: add(tags,'force_point_spend','resource_spend')
    if 'dark side' in txt: add(tags,'dark_side')

    # weapons/styles
    if 'lightsaber' in txt: add(tags,'lightsaber','offense_melee')
    if 'pistol' in txt: add(tags,'weapon_pistol','offense_ranged')
    if 'rifle' in txt: add(tags,'weapon_rifle','offense_ranged')
    if 'heavy weapon' in txt: add(tags,'weapon_heavy','offense_ranged')
    if 'grenade' in txt or 'splash weapon' in txt: add(tags,'grenade','area_pressure','offense_ranged')
    if 'unarmed' in txt: add(tags,'unarmed','offense_melee')

    # combat role heuristics by name/text
    if any(k in lname for k in ['attack','strike','cleave','swing','charge','sniper','shot','barrage','blast','throw','crush','fire','assault','stab','wound']):
        add(tags,'offense')
    if any(k in lname for k in ['shot','rifle','pistol','autofire','barrage','sniper','gunnery','artillery','crossfire','spray','strafe','return fire']):
        add(tags,'offense_ranged')
    if any(k in lname for k in ['melee','grapple','charge','cleave','strike','bantha','throw','prone','trip','slam','crusher','finesse','haft','whirlwind']):
        add(tags,'offense_melee')
    if any(k in lname for k in ['dodge','defense','cover','resilience','resilient','reflex','fortitude','will','threshold','surge','resolve','toughness','harm’s way','harms way','stay up']):
        add(tags,'defense','survivability')
    if any(k in lname for k in ['mobility','running','spring','fleet','tumble','withdrawal','opportunistic retreat','burst of speed','turn and burn']):
        add(tags,'mobility')
    if any(k in lname for k in ['grapple','pin','trip','knock','stun','stagger','suppress','demoral','fright','hobbling','disabler','halt']):
        add(tags,'control')
    if any(k in lname for k in ['medic','surgery','first aid','wilderness first aid','surgical']):
        add(tags,'healing','support','skill_treat_injury')
    if any(k in lname for k in ['droid','tech','mechanic','cybernetic','implant','signature device','starship designer','vehicle systems']):
        add(tags,'tech','utility')
    if any(k in lname for k in ['leader','rapport','briber','silver tongue','fast talk','trustworthy','cut the red tape','informer','master of disguise','impersonate','intimidat','presence','friends in low places']):
        add(tags,'social')
    if any(k in lname for k in ['stealthy','sneak','low profile','reactive stealth','hidden','covert']):
        add(tags,'stealth')
    if any(k in lname for k in ['pilot','vehicular','starship','squadron','turn and burn','dogfight']):
        add(tags,'vehicle','skill_pilot')
    if any(k in lname for k in ['educated','knowledge','recall','logic','mission specialist','scavenger']):
        add(tags,'knowledge','utility')
    if any(k in lname for k in ['rage','furious','maniacal','powerful rage','dreadful rage','controlled rage','channel rage']):
        add(tags,'rage','resource_spend','offense_melee')

    # description heuristics
    if 'trained in one class skill' in txt: add(tags,'skill_training','new_option','build_enabler','prereq_gateway')
    if 'gain a bonus feat' in txt or 'bonus feat' in txt: add(tags,'bonus_feat','species_opportunity')
    if 'reroll' in txt: add(tags,'reroll')
    if 'ignore' in txt and 'damage reduction' in txt: add(tags,'armor_crack')
    if 'second wind' in txt: add(tags,'second_wind','recovery')
    if 'condition track' in txt: add(tags,'condition_track')
    if 'damage threshold' in txt: add(tags,'damage_threshold')
    if 'hit points' in txt: add(tags,'hit_points','durability')
    if 'prone' in txt or 'knocked prone' in txt: add(tags,'knock_prone','control')
    if 'grapple' in txt or 'grab' in txt or 'pin' in txt: add(tags,'grapple','control')
    if 'concealment' in txt or 'cover' in txt: add(tags,'cover_play')
    if 'charge' in txt: add(tags,'charge')
    if 'autofire' in txt: add(tags,'autofire','area_pressure')
    if 'splash' in txt or 'area' in txt and 'attack' in txt: add(tags,'multi_target')
    if 'allies' in txt or 'ally' in txt: add(tags,'ally_support')
    if 'vehicle' in txt or 'starship' in txt: add(tags,'vehicle')

    # prerequisites create gateways
    if 'prerequisite' in txt or 'requirements' in txt: add(tags,'prereq_gateway')

    add(tags, EXACT.get(name, []))

    # exact category/name families
    if 'training' in lname:
        for key,vals in TREE_HINTS.items():
            if key in lname: add(tags, vals)
    if 'proficiency' in lname:
        add(tags,'build_enabler')
        if 'armor' in lname: add(tags,'armor','defense')
        if 'weapon' in lname or 'exotic' in lname: add(tags,'weapon_access','offense')
    if 'weapon focus' in lname or 'weapon specialization' in lname:
        add(tags,'accuracy' if 'focus' in lname else 'damage_scaling','weapon_mastery')
    if 'dual weapon' in lname or 'two-weapon' in lname:
        add(tags,'dual_wield','offense_melee','action_economy')
    if 'martial arts' in lname or lname in [x.lower() for x in ['Echani Training','Hijkata Training','K\'tara Training','K\'thri Training','Stava Training','Tae-Jitsu Training','Teräs Käsi Training','Wrruushi Training']]:
        add(tags,'unarmed','offense_melee','martial_style')
    if 'military training' in lname:
        add(tags,'faction_training','species_opportunity')
    return sorted(dict.fromkeys(tags))


out=[]
for line in PATH.read_text(encoding='utf-8').splitlines():
    if not line.strip():
        continue
    obj=json.loads(line)
    obj.setdefault('system',{})['tags']=base_tags(obj)
    out.append(json.dumps(obj, ensure_ascii=False))
PATH.write_text('\n'.join(out)+'\n', encoding='utf-8')
print(f'updated {len(out)} feats')
