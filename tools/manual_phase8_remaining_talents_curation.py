import json,re
from pathlib import Path

ROOT = Path('/tmp/swsework/foundryvtt-swse')
PACK = ROOT / 'packs' / 'talents.db'

TARGET_CATEGORIES = {
    'Force Adept': ['force','force_execution','force_capacity','force_training','mystic','controller'],
    'Sith Apprentice': ['force','dark_side','force_execution','controller','striker'],
    'Pathfinder': ['mobility','survival','recon','cover','positioning'],
    'Shaper': ['biotech','crafting','healing','support','ability_enhancement'],
    'Improviser': ['tech','gear','jury_rig','utility','control'],
    'Vanguard': ['ranged_support','recon','targeting','cover','teamwork'],
    'Outlaw': ['duelist','striker','mobility','opportunist','survivability'],
    'Medic': ['healing','support','treat_injury','survivability','teamwork'],
    'Corporate Agent': ['social','leader','deception','persuasion','control'],
    'Independent Droid': ['droid','self_repair','tech','durability','utility'],
    'Enforcer': ['nonlethal','control','pursuit','law_enforcement','ranged_support'],
    'Charlatan': ['deception','social','control','stealth','opportunist'],
    'Assassin': ['stealth','striker','precision_damage','sniping','mobility'],
    'Imperial Knight': ['force','lightsaber','imperial','leader','defense'],
}

TREE_TAGS = {
    'de95d37c72b1c4cd': ['dark_side','force','dark_side_mastery','force_multiplier','forecast_value'],
    '6629c34384c4ca53': ['support','guardian_spirit','ally_support','healing','new_option'],
    '2a1838832f6146e2': ['lightsaber_polearm','melee_defense','deflect','block','duelist'],
    'd20682671d035cef': ['knowledge','investigation','social_network','resources','social'],
    '8955568285ba4115': ['force','spirit','survivability','new_option','ritual'],
    '6ac3416fb6aada56': ['force','telepathy','telekinesis','controller','skill_substitution'],
    '0a61ab9ece844326': ['cortosis','anti_lightsaber','melee_defense','duelist'],
    'ad16f3e5f4f7441b': ['witchcraft','spellcasting','ranged_control','exotic_weapon'],
    'ed899f9f41fc1391': ['beast_companion','survival','nature','support'],
    '899038f739294c81': ['force','telekinesis','offense_ranged','standard_action','new_action'],
    '25d99948c9cb41ad': ['pilot','vehicle','mobility','survivability'],
    'd3661aa9906bdc79': ['force','resilience','recovery','will_defense','resource_recovery'],
    'acb91d3803eb4fcd': ['deception','social_defense','survivability'],
    'ba726f623e42f849': ['unarmed','melee_defense','counterattack','martial_arts','duelist'],
    '8e44e56069274319': ['biotech','cloning','crafting','science'],
    'a47ed82a822e3962': ['investigation','perception','tracking','tech'],
    '9d826906ad8945b0': ['recon','ambush_defense','initiative','mobility'],
    'f5c62e2e81f648aa': ['force','stealth','concealment','standard_action','new_action'],
    'd6b4331c0e31f7e3': ['force','senses','pilot','precognition','initiative'],
    'b15586b9c9554cf8': ['perception','social','outsider'],
    '001a438135e03588': ['light_side','force','healing','survivability','resource_recovery'],
    'e35ee41362604227': ['balance','force','survivability','will_defense'],
    '01e443d93e47f9c4': ['alchemy','crafting','empowerment'],
    '01cb1ca2a10640b3': ['leader','ally_support','teamwork','tactics'],
    '13776eed744d410c': ['warrior','awareness','weapon_training'],
    'f8e7edab5f234e27': ['light_side','freedom','ally_support','defense'],
    'd203a51d6d0a4c65': ['offense_ranged','sniping','controller','targeting'],
    '4509306f66d744bf': ['force','white_current','immersion','controller'],
    'c6eee4889411411b': ['vahl','weapon_empowerment','force','melee_support'],
    '04a6f32128cc4b98': ['skills','critical_success','skill_mastery'],
    'cec49bc60d1646b1': ['tech','power_systems','droid','vehicle'],
    '4da769d7c5f44232': ['stealth','concealment','dark_side'],
    'c1be604242cb328f': ['fear','social_control','dark_side'],
    'db1b30c2163d0650': ['controller','manipulation','positioning','deception'],
    '0ffc37dac946477d': ['planning','leader','setup','forecast_value'],
    'cfd358ef61fb47bd': ['spellcasting','illusion','deception'],
    'e6a9c40b900847bd': ['fear','leader','social_control'],
    '3a785c985eae4d00': ['ally_support','reaction','ambush_defense'],
    '8375b9b26b679901': ['social','charm','deception'],
    '67fdd8dce9abd6c1': ['control','restrain','entangle'],
    '73814706c00849c6': ['targeting','ranged_support','setup'],
    'e6e3fc102bb54b20': ['sensors','perception','detection'],
    '11f99465ba4847e2': ['survivability','defense','reaction'],
    'bfc1356c66c74783': ['smashball','charge','teamwork','mobility'],
    '38d7c18ce4664c66': ['crafting','engineering','tech'],
    'abc3466390fe4050': ['unarmed','counterattack','reaction','martial_arts'],
    '5f355ad4093d2bf8': ['pilot','escort','ally_support'],
    '10c843cef8ce2798': ['force','force_meld','teamwork'],
    'dcac793cc9fe42a7': ['balance','will_defense','survivability'],
    '72d32ebcbb607314': ['leader','ally_support','morale'],
    '00cb74839a524276': ['knowledge_creatures','poison','survival'],
    'd29a7261c1be4b83': ['illusion','force','deception'],
    'd8a71a6c5b2b7581': ['implant','biotech','gear'],
    '96ef43a3054dcb58': ['dark_side','force','resource_spend'],
    '9a5efe5d0e9b43a1': ['force','tyia','meditation','defense'],
    'a212850887fe41da': ['droid','healing','medical'],
    'dca33c0215264a02': ['trap','control','battlefield'],
    '67b59e020c1660eb': ['striker','precision_damage','offense_melee'],
    'da7b731a3e434a7a': ['manipulation','positioning','controller'],
    'd5b60c4f058c4085': ['exotic_weapon','melee_defense','block'],
    'f3881205595248d4': ['illumination','light_side','force_item'],
    'ca65ba0c33cd4c7d': ['kata','martial_arts','mobility','melee'],
    '46d03bab0cf74a14': ['beast_companion','mount','survival'],
    '96c390430d7a4975': ['veteran','survivability','awareness'],
    '7c6d007b549c4a4a': ['cheap_shot','deception','opportunist'],
    '0b5857edbcf049a2': ['guidance','social','support'],
    'c7a4e66f46044c7a': ['ride','mount','mobility'],
    'db1964d1e1d14b5a': ['force','delay','control'],
    '754907ded50d4f46': ['stealth','concealment','force'],
    '8a61bf426391431b': ['weapon_empowerment','force_item'],
    'feb08c2834a447ab': ['diplomacy','social_defense','leader'],
    'a7ad797b01114925': ['martial_arts','mobility','melee'],
    '427213bd55e04e27': ['fear','panic','control'],
    '9253ace716c3e966': ['commander','leader','ally_support'],
    'fc978e442f544dbe': ['defense','steady','melee'],
    'dad3c0da191748c1': ['visions','precognition','force'],
    '9688ed3500084dca': ['droid','sensors','durability','defense'],
    'ad499981ddb8450e': ['healing','transfer','support'],
    '37f3554a2f30425a': ['beast_companion','mount','survival'],
    'e99cfa9db8493573': ['healing','force','jedi_healer'],
    'a67faf2ae089ab5d': ['sith_alchemy','crafting','dark_side'],
    'c1cf52502cf74435': ['stability','repair','support'],
    '3e807e87cac844ba': ['danger_sense','perception','initiative'],
    'd2535361d1b146cd': ['dark_side','defense','bodyguard'],
    '798ed0945cbdac1c': ['bodyguard','defense','ally_support'],
    'c4e48efaad1f49af': ['droid','durability','strength_enhancement'],
}

KEYWORDS = [
    (r'\bstealth\b', ['stealth','skill_stealth']),
    (r'\bdeception\b|feign|distraction|harmless|innocuous', ['deception','social_control']),
    (r'\bpersua', ['persuasion','social']),
    (r'\buse the force\b', ['use_the_force','force_execution']),
    (r'\bforce point\b', ['force_point_spend','resource_spend']),
    (r'\bforce power\b', ['force_power_synergy','force_capacity']),
    (r'\blightsaber\b', ['lightsaber','offense_melee']),
    (r'\bunarmed\b|teras kasi|teräs käsi|jab', ['unarmed','martial_arts','offense_melee']),
    (r'\bpilot\b|starship|vehicle', ['pilot','vehicle']),
    (r'\bshield\b', ['shield','defense']),
    (r'\bblock\b', ['block','melee_defense']),
    (r'\bdeflect\b', ['deflect','ranged_defense']),
    (r'\bheal|treat injury|medical', ['healing','support']),
    (r'\bknowledge\b|lore|investigat|detective', ['knowledge','investigation']),
    (r'\bmove action\b', ['move_action']),
    (r'\bswift action\b', ['swift_action','action_economy']),
    (r'\bstandard action\b', ['standard_action','new_action']),
    (r'\breaction\b|as an immediate', ['reaction','action_economy']),
    (r'\bcover\b', ['cover','defense']),
    (r'\bcompanion\b|akk dog|beast', ['beast_companion']),
    (r'\bdroid\b', ['droid']),
    (r'\brepair\b', ['repair','tech']),
    (r'\bpoison\b', ['poison']),
    (r'\btrapwire|tripwire|mine|explosive', ['trap','control']),
    (r'\bcritical\b', ['critical_hit']),
    (r'\branged attack\b|attack roll against.*fortitude', ['offense_ranged']),
    (r'\bmelee attack\b|melee damage', ['offense_melee']),
]

def slug(s):
    return re.sub(r'[^a-z0-9_]+','_',s.lower()).strip('_')

def desc_text(o):
    vals=[]
    for key in ('benefit','description','prerequisites'):
        v=o['system'].get(key)
        if isinstance(v,dict): v=v.get('value','')
        if isinstance(v,str): vals.append(v)
    return ' '.join(vals).lower()

def add(tags,*items):
    for item in items:
        if isinstance(item,(list,tuple,set)):
            add(tags,*item)
        elif item:
            tags.add(slug(item))

rows=[]
count=0
with PACK.open(encoding='utf-8') as f:
    for line in f:
        o=json.loads(line)
        cat=o['system'].get('category') or '<none>'
        tid=o['system'].get('treeId')
        should = cat in TARGET_CATEGORIES or cat=='<none>'
        if should:
            tags=set(slug(t) for t in (o['system'].get('tags') or []))
            before=set(tags)
            if cat in TARGET_CATEGORIES: add(tags,TARGET_CATEGORIES[cat], f'category_{cat}')
            if cat=='<none>': add(tags,'uncategorized_talent')
            if tid in TREE_TAGS: add(tags,TREE_TAGS[tid], f'tree_{tid}')
            text=(o.get('name','')+' '+desc_text(o)).lower()
            for pat,vals in KEYWORDS:
                if re.search(pat,text): add(tags,vals)
            name=o.get('name','')
            # name-specific nudges
            if 'weapon specialization (lightsabers)' in name.lower(): add(tags,['lightsaber','weapon_specialization','offense_melee','damage_scaling'])
            if 'swift power' in name.lower(): add(tags,['swift_action','action_economy','force_power_synergy'])
            if 'guardian spirit' in name.lower(): add(tags,['guardian_spirit','new_option','ally_support'])
            if 'force meld' in name.lower(): add(tags,['force_meld','teamwork','support'])
            if 'repair self' in name.lower(): add(tags,['self_repair','healing','survivability'])
            if 'soft reset' in name.lower(): add(tags,['recovery','resource_recovery'])
            if 'just a droid' in name.lower(): add(tags,['social_defense','deception'])
            if 'modification specialist' in name.lower(): add(tags,['crafting','modification'])
            if 'medical droid' in name.lower(): add(tags,['medical','healing','support'])
            if 'observant' in name.lower() or 'heightened awareness' in name.lower(): add(tags,['perception','awareness'])
            if 'animal companion' in name.lower() or 'akk dog master' in name.lower(): add(tags,['beast_companion','mount'])
            if 'allure' in name.lower() or 'voices' in name.lower(): add(tags,['social','mind_affecting'])
            if 'buried presence' in name.lower() or 'cloak of shadows' in name.lower(): add(tags,['stealth','concealment'])
            if 'telekinetic' in name.lower(): add(tags,['telekinesis','force'])
            if 'illusion' in name.lower() or 'masquerade' in name.lower() or 'delusion' in name.lower(): add(tags,['illusion','deception','controller'])
            if 'spynet' in name.lower() or 'electronic trail' in name.lower(): add(tags,['investigation','network','intel'])
            if 'commander' in name.lower() or 'bolster' in name.lower() or 'inspired' in name.lower(): add(tags,['leader','ally_support','morale'])
            if 'sniping' in name.lower() or 'draw a bead' in name.lower() or 'precision shot' in name.lower(): add(tags,['sniping','offense_ranged','precision_damage'])
            o['system']['tags']=sorted(tags)
            if tags!=before: count +=1
        rows.append(json.dumps(o, ensure_ascii=False))
PACK.write_text('\n'.join(rows)+'\n', encoding='utf-8')
print('updated',count,'target rows')
