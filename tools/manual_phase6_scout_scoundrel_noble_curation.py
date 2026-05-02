import json, re
from pathlib import Path

PACK = Path('packs/talents.db')
TARGETS = {'Scout','Scoundrel','Noble'}

SKILL_TAGS = {
    'acrobatics': 'skill_acrobatics',
    'athletics': 'skill_athletics',
    'climb': 'skill_climb',
    'deception': 'skill_deception',
    'endurance': 'skill_endurance',
    'gather information': 'skill_gather_information',
    'initiative': 'skill_initiative',
    'knowledge (galactic lore)': 'skill_knowledge_galactic_lore',
    'knowledge (life sciences)': 'skill_knowledge_life_sciences',
    'knowledge (social sciences)': 'skill_knowledge_social_sciences',
    'knowledge': 'skill_knowledge',
    'mechanics': 'skill_mechanics',
    'perception': 'skill_perception',
    'persuasion': 'skill_persuasion',
    'pilot': 'skill_pilot',
    'ride': 'skill_ride',
    'stealth': 'skill_stealth',
    'survival': 'skill_survival',
    'treat injury': 'skill_treat_injury',
    'use computer': 'skill_use_computer',
    'use the force': 'skill_use_the_force',
}

EXPLICIT = {
    'Noble Fencing Style': {'duelist','offense_melee','charisma_synergy','finesse','weapon_light_melee','lightsaber_optional'},
    'Friend or Foe': {'reaction','ranged_defense','retaliation','redirection','control'},
    'Unreadable': {'will_defense','social_defense','feint','deception','anti_social'},
    'Ignite Fervor': {'free_action','ally_support','damage_support','leader','setup'},
    'Dirty Tactics': {'standard_action','leader','ally_support','flanking','offense_melee','teamwork'},
    'Fearless Leader': {'swift_action','leader','ally_support','fear_immunity','will_defense'},
    'Lead by Example': {'leader','ally_support','offense_melee','offense_ranged','damage_support','accuracy_support'},
    'Protector Actions': {'follower','ally_support','defense','bodyguard','teamwork'},
    'Weaken Resolve': {'free_action','persuasion','fear','control','will_attack'},
    'Undying Loyalty': {'follower','durability','ally_support'},
    'Double Agent': {'initiative','deception','social_control','anti_targeting','setup'},
    'Wealth': {'economy','resources','utility'},
    'Transposing Strike': {'offense_melee','forced_movement','positioning','control'},
    'Educated': {'knowledge','skill_knowledge','utility'},
    'Inspire Zeal': {'leader','ally_support','condition_track','setup','damage_threshold'},
    'Beloved': {'leader','ally_support','social','teamwork','reaction'},
    'Misplaced Loyalty': {'swift_action','persuasion','control','anti_targeting','social_control'},
    'Influential Friends': {'contacts','information','resources','utility','social'},
    'Demoralizing Defense': {'reaction','offense_melee','control','fear','defense'},
    'Inspire Confidence': {'standard_action','leader','ally_support','accuracy_support','skill_support'},
    'Friendly Fire': {'ranged_defense','redirection','punish_miss','control'},
    'Trust': {'ally_support','extra_action','action_economy','standard_action','leader'},
    'Unwavering Ally': {'swift_action','ally_support','flat_footed_immunity','defense','dexterity_defense'},
    'Powerful Friends': {'contacts','resources','social','utility'},
    'Distant Command': {'leader','ally_support','range_extension'},
    'Born Leader': {'swift_action','leader','ally_support','accuracy_support'},
    'Know Your Enemy': {'swift_action','knowledge','information','analysis','setup'},
    'Protection': {'standard_action','persuasion','bodyguard','anti_targeting','ally_support'},
    'Spontaneous Skill': {'skill_flexibility','utility','trained_skill'},
    'Demand Surrender': {'persuasion','fear','social_control','standard_action'},
    'Personal Affront': {'social_control','taunt','anti_targeting','persuasion'},
    'Cast Suspicion': {'deception','social_control','enemy_disruption'},
    'Rally': {'healing','second_wind','ally_support','leader','swift_action'},
    'Distress to Discord': {'social_control','deception','area_control'},
    'Ambush': {'initiative','setup','offense_ranged','offense_melee'},
    'Coordinate': {'leader','ally_support','teamwork','action_economy'},
    'Lead From the Front': {'leader','offense_melee','offense_ranged','ally_support'},
    'Willpower': {'will_defense','mental_resilience','defense'},
    'Punishing Protection': {'bodyguard','retaliation','ally_support','offense_melee','offense_ranged'},
    'Instruction': {'skill_support','trained_skill','ally_support','utility'},
    'Enemy Tactics': {'knowledge','analysis','counter_tactics','defense'},
    'Reactionary Attack': {'reaction','offense_melee','offense_ranged','counterattack'},
    'Luck Favors the Bold': {'luck','reroll','offense_melee','offense_ranged'},
    'Inspire Haste': {'ally_support','speed','mobility','leader'},
    'Direct Fire': {'leader','ally_support','offense_ranged','damage_support','accuracy_support'},
    'Engineer': {'tech','skill_mechanics','vehicle','starship','utility'},
    'Castigate': {'social_control','fear','persuasion','debuff'},
    'Face the Foe': {'defense','taunt','bodyguard','offense_melee'},
    'True Betrayal': {'deception','social_control','enemy_disruption'},
    'Two-Faced': {'deception','social','information','double_life'},
    'Stolen Advantage': {'setup','enemy_disruption','advantage_theft'},
    'Leading Feint': {'feint','deception','ally_support','setup'},
    'Bolster Ally': {'ally_support','bonus_hp','durability','leader'},
    'Intimidating Defense': {'defense','fear','persuasion','retaliation'},
    'Known Dissident': {'social','contacts','anti_empire','reputation'},
    'Connections': {'contacts','resources','social','utility'},
    'Fluster': {'persuasion','social_control','debuff'},
    'Idealist': {'social','will_defense','morale'},
    'Assault Gambit': {'setup','ally_support','offense_melee','offense_ranged','leader'},
    'Seize the Moment': {'reaction','initiative','extra_attack','action_economy'},
    'Presence': {'social','leader','persuasion','charisma_synergy'},
    'Improved Weaken Resolve': {'fear','control','persuasion','upgrade'},
    'Feed Information': {'information','ally_support','analysis','ranged_support'},
    'Electronic Sabotage': {'tech','skill_use_computer','control','standard_action','security'},
    'Risk for Reward': {'reaction','counterattack','attack_of_opportunity','offense_melee','offense_ranged'},
    'Illicit Dealings': {'social','haggle','black_market','resources','skill_persuasion'},
    'Sudden Strike': {'striker','bonus_damage','skirmisher','precision_damage','offense_melee','offense_ranged'},
    'Personalized Modifications': {'tech','weapon_mod','standard_action','offense_melee','offense_ranged','damage_support'},
    'Strike and Run': {'reaction','mobility','hit_and_run','offense_melee','offense_ranged'},
    'Sneak Attack': {'precision_damage','striker','offense_melee','offense_ranged','flat_footed'},
    'Befuddle': {'swift_action','deception','mobility','anti_opportunity_attack','setup'},
    'Hesitate': {'standard_action','persuasion','control','speed_debuff','action_denial'},
    'Starship Raider': {'starship','offense_ranged','vehicle','pilot'},
    'Hidden Weapons': {'concealment','weapon_draw','flat_footed','surprise_attack'},
    'Make a Break for It': {'mobility','vehicle','pilot','anti_opportunity_attack'},
    'Hyperdriven': {'starship','luck','resources','vehicle','boost_check'},
    'Cramped Quarters Fighting': {'defense','cover','close_quarters'},
    'Electronic Forgery': {'tech','deception','skill_use_computer','forgery','social'},
    'Cheap Shot': {'attack_of_opportunity','offense_melee','offense_ranged','teamwork'},
    'Fast Repairs': {'tech','vehicle','repair','temporary_hp','skill_mechanics'},
    'Quick Fix': {'tech','repair','standard_action','skill_mechanics','utility'},
    'Walk the Line': {'standard_action','social_control','debuff','area_effect'},
    'Numbing Poison': {'poison','flat_footed','offense_melee','offense_ranged','setup'},
    'Thrive on Chaos': {'durability','bonus_hp','survivability','snowball'},
    'Trick Step': {'swift_action','initiative','control','positioning'},
    'Security Slicer': {'tech','security','skill_mechanics','skill_use_computer','utility'},
    "Fool's Luck": {'force_point_spend','luck','accuracy_support','defense','skill_support'},
    'Trace': {'tech','information','skill_use_computer','skill_gather_information'},
    'Ricochet Shot': {'offense_ranged','cover_bypass','trick_shot','setup'},
    'Lucky Shot': {'luck','reroll','offense_ranged','offense_melee'},
    'Art of Concealment': {'stealth','concealment','swift_action','smuggling'},
    'Modify Poison': {'poison','crafting','skill_knowledge_life_sciences','utility'},
    'Sow Confusion': {'standard_action','deception','area_control','social_control'},
    'Surprising Weapons': {'flat_footed','offense_melee','special_weapon','surprise_attack'},
    'Malkite Techniques': {'poison','standard_action','special_weapon','offense_melee'},
    'Curved Throw': {'swift_action','offense_ranged','cover_bypass','special_weapon'},
    'Dumb Luck': {'luck','survivability','reroll','defense'},
    'Skirmisher': {'mobility','bonus_damage','striker','offense_melee','offense_ranged'},
    'Slip By': {'mobility','anti_opportunity_attack','stealth','positioning'},
    'Gimmick': {'special_weapon','utility','trick_play'},
    'Gambler': {'luck','social','reroll','resources'},
    'Disruptive': {'control','attack_of_opportunity','enemy_disruption'},
    'Opportunistic Strike': {'attack_of_opportunity','offense_melee','offense_ranged','striker'},
    'Cunning Strategist': {'leader','analysis','setup','ally_support'},
    'Weakening Strike': {'offense_melee','condition_track','debuff','striker'},
    'Slippery Strike': {'offense_melee','mobility','hit_and_run','anti_opportunity_attack'},
    'Vindication': {'survivability','comeback','bonus_damage'},
    'Hit the Deck': {'reaction','ranged_defense','area_defense','mobility'},
    'Lucky Stop': {'luck','reaction','defense','negate_hit'},
    'Biotech Adept': {'biotech','tech','skill_treat_injury','utility'},
    'Virus': {'tech','skill_use_computer','debuff','control','security'},
    "Fortune's Favor": {'luck','ally_support','reroll','leader'},
    'Knack': {'skill_flexibility','utility','trained_skill'},
    'Find Openings': {'offense_melee','offense_ranged','accuracy_support','flat_footed'},
    'Veiled Biotech': {'biotech','stealth','concealment','utility'},
    'Surprise Strike': {'surprise_round','offense_melee','offense_ranged','precision_damage'},
    'Vicious Poison': {'poison','damage_over_time','offense_melee','offense_ranged'},
    'Master Slicer': {'tech','skill_use_computer','security','standard_action','utility'},
    'Better Lucky than Dead': {'luck','survivability','comeback'},
    'Unlikely Shot': {'offense_ranged','trick_shot','luck','cover_bypass'},
    'Bugbite': {'special_weapon','offense_ranged','striker'},
    'Advantageous Opening': {'setup','flat_footed','teamwork','offense_melee','offense_ranged'},
    'Lure Closer': {'control','forced_movement','positioning','deception'},
    'Undetectable Poison': {'poison','stealth','concealment','crafting'},
    'Seducer': {'social','persuasion','deception','charm'},
    'Hot Wire': {'tech','vehicle','pilot','skill_mechanics','utility'},
    'Improved Skirmisher': {'mobility','bonus_damage','striker','upgrade'},
    'Retribution': {'reaction','counterattack','durability','offense_melee','offense_ranged'},
    'Labyrinthine Mind': {'will_defense','mind_affecting_defense','defense'},
    'Uncanny Luck': {'luck','reroll','survivability','defense'},
    'Seize Object': {'disarm','forced_movement','special_weapon','reaction'},
    'Fast Talker': {'social','persuasion','deception','swift_action'},
    'No Escape': {'control','anti_mobility','offense_melee','offense_ranged'},
    'Stymie': {'reaction','debuff','action_denial','control'},
    'Avert Disaster': {'reaction','ally_support','defense','negate_damage'},
    'Dastardly Attack': {'precision_damage','debuff','offense_melee','offense_ranged'},
    'Stellar Warrior': {'starship','offense_ranged','pilot','vehicle'},
    'Spacehound': {'pilot','starship','astrogation','vehicle','skill_pilot'},
    'Unbalancing Adaptation': {'control','debuff','adaptation','enemy_disruption'},
    'Improved Stealth': {'stealth','reroll','pilot','starship'},
    'Surge': {'swift_action','mobility','speed'},
    'Vehicle Sneak': {'vehicle','starship','stealth','pilot'},
    'Hunker Down': {'standard_action','cover','defense','survivability'},
    'Aggressive Surge': {'free_action','charge','second_wind','offense_melee','mobility'},
    'Expert Tracker': {'survival','tracking','mobility','skill_survival'},
    'Weak Point': {'swift_action','damage_reduction_bypass','offense_melee','offense_ranged'},
    'Quick on Your Feet': {'reaction','mobility','speed'},
    'Blast Back': {'reaction','counterattack','area_defense','offense_melee','offense_ranged'},
    'Get Into Position': {'ally_support','mobility','follower'},
    'Evasion': {'area_defense','reflex_defense','survivability','vehicle'},
    'Guidance': {'swift_action','ally_support','mobility','terrain_ignore'},
    'Incognito': {'deception','stealth','reroll','disguise'},
    'Second Strike': {'free_action','offense_melee','offense_ranged','mobility','followup_attack'},
    'Long Stride': {'mobility','speed','armor_light'},
    'Hidden Attacker': {'stealth','sniping','swift_action','offense_ranged'},
    'Barter': {'social','haggle','reroll','resources','skill_persuasion'},
    'Hidden Eyes': {'perception','surveillance','awareness','stealth'},
    'Improved Surveillance': {'perception','surveillance','awareness','upgrade'},
    'Close-Combat Assault': {'offense_ranged','close_quarters','anti_adjacent_penalty'},
    'Hyperspace Savant': {'astrogation','starship','pilot','skill_use_computer'},
    'Ready and Willing': {'initiative','action_economy','reaction_speed'},
    'Keep it Together': {'survivability','morale','will_defense','ally_support'},
    'Traceless Tampering': {'tech','stealth','security','skill_mechanics','skill_use_computer'},
    'Reset Initiative': {'initiative','reroll','reaction_speed'},
    'Improved Initiative': {'initiative','reaction_speed'},
    'Swerve': {'reaction','vehicle','pilot','ranged_defense'},
    'Total Concealment': {'stealth','concealment','defense'},
    'Flee': {'mobility','withdraw','survivability','anti_opportunity_attack'},
    'Blend In': {'stealth','social','incognito','concealment'},
    'Intimate Knowledge': {'knowledge','analysis','setup','skill_knowledge'},
    'Spotter': {'ally_support','perception','awareness','offense_ranged'},
    'Keen Shot': {'offense_ranged','accuracy_support','sniping'},
    'Seek and Destroy': {'tracking','striker','offense_ranged','offense_melee'},
    'Deep-Space Gambit': {'starship','pilot','luck','vehicle'},
    'Advanced Intel': {'information','analysis','initiative','setup'},
    'Sidestep': {'reaction','mobility','melee_defense'},
    'Shadow Striker': {'stealth','striker','offense_melee','offense_ranged','precision_damage'},
    'Extreme Effort': {'endurance','survivability','push_limit'},
    'Uncanny Dodge II': {'defense','flat_footed_immunity','upgrade'},
    'Sprint': {'mobility','speed','full_round_action'},
    'Swift Strider': {'swift_action','mobility','speed'},
    'Hunt the Hunter': {'tracking','counter_tracker','survival','awareness'},
    'Fade Away': {'stealth','mobility','concealment','hit_and_run'},
    'Reconnaissance Actions': {'ally_support','information','teamwork','action_economy'},
    'Hidden Movement': {'stealth','mobility','anti_tracking'},
    'Fringe Savant': {'knowledge','social','resources','fringe'},
    'Defensive Protection': {'ally_support','bodyguard','defense'},
    'Uncanny Dodge I': {'defense','flat_footed_immunity'},
    'Jury-Rigger': {'tech','repair','skill_mechanics','improvisation'},
    'Adapt and Survive': {'survivability','adaptation','defense'},
    'Acute Senses': {'perception','awareness','skill_perception'},
    'Surveillance': {'perception','awareness','information'},
    'Hide in Plain Sight': {'stealth','concealment','signature_ability'},
    'Surefooted': {'mobility','terrain_ignore','acrobatics'},
    'Reconnaissance Team Leader': {'leader','ally_support','surveillance','teamwork'},
}


def norm(text):
    return re.sub(r'\s+', ' ', (text or '').lower())


def action_tags(text, tags):
    if 'as a free action' in text:
        tags.update({'action_economy','free_action'})
    if 'as a swift action' in text:
        tags.update({'action_economy','swift_action'})
    if 'as a move action' in text:
        tags.update({'move_action'})
    if 'as a standard action' in text:
        tags.update({'standard_action','new_action'})
    if 'as a full-round action' in text or 'full-round action' in text:
        tags.update({'full_round_action','new_action'})
    if 'as a reaction' in text or ' reaction,' in text or ' reaction ' in text:
        tags.update({'reaction','action_economy'})
    if 'once per encounter' in text:
        tags.add('encounter_power')
    if 'once per day' in text:
        tags.add('daily_power')


def common_tags(name, text, category):
    tags=set()
    if category=='Noble':
        tags.update({'noble','leader'})
    elif category=='Scoundrel':
        tags.update({'scoundrel'})
    elif category=='Scout':
        tags.update({'scout'})
    action_tags(text,tags)
    for key, tag in SKILL_TAGS.items():
        if key in text:
            tags.add(tag)
    if 'melee attack' in text or 'melee attacks' in text or 'melee weapon' in text:
        tags.add('offense_melee')
    if 'ranged attack' in text or 'ranged attacks' in text or 'ranged weapon' in text:
        tags.add('offense_ranged')
    if 'lightsaber' in text:
        tags.add('lightsaber')
    if 'vehicle' in text:
        tags.add('vehicle')
    if 'starship' in text:
        tags.add('starship')
    if 'cover' in text:
        tags.add('cover')
    if 'flat-footed' in text or 'flat footed' in text:
        tags.add('flat_footed')
    if 'line of sight' in text:
        tags.add('positioning')
    if 'damage threshold' in text:
        tags.add('damage_threshold')
    if 'condition track' in text:
        tags.add('condition_track')
    if 'second wind' in text:
        tags.add('second_wind')
    if 'force point' in text:
        tags.add('force_point_spend')
    if 'poison' in text:
        tags.add('poison')
    if 'follower' in text:
        tags.add('follower')
    if 'ally' in text or 'allies' in text:
        tags.add('ally_support')
    if 'reroll' in text:
        tags.add('reroll')
    if 'initiative' in text:
        tags.add('initiative')
    if 'stealth' in text:
        tags.add('stealth')
    if 'survival' in text or 'track' in text:
        tags.add('tracking' if 'track' in text else 'survival')
    if 'deception' in text or 'feint' in text:
        tags.add('deception')
    if 'persuasion' in text or 'attitude' in text or 'haggle' in text:
        tags.add('social')
    if 'mechanics' in text or 'computer' in text or 'electronic' in text or 'security' in text:
        tags.add('tech')
    if 'knowledge' in text:
        tags.add('knowledge')
    if 'perception' in text:
        tags.add('awareness')
    if 'move up to your speed' in text or 'speed increases' in text or 'move your speed' in text:
        tags.add('mobility')
    if 'cannot attack' in text or 'penalty' in text or 'flee' in text or 'flat-footed' in text:
        tags.add('control')
    if 'bonus on attack rolls' in text or 'damage rolls' in text or 'additional 1d6' in text:
        tags.add('accuracy_support' if 'ally' in text or 'allies' in text else 'damage_support')
    if 'reflex defense' in text or 'will defense' in text or 'fortitude defense' in text or 'cover bonus' in text:
        tags.add('defense')
    if 'temporary hit points' in text or 'bonus hit points' in text or 'toughness' in text:
        tags.add('durability')
    return tags

lines=[]
changed=0
for raw in PACK.read_text().splitlines():
    d=json.loads(raw)
    sys=d.get('system',{})
    cat=sys.get('category')
    if cat not in TARGETS:
        lines.append(raw)
        continue
    name=d['name']
    text=norm(sys.get('benefit') or sys.get('description',{}).get('value',''))
    tags=common_tags(name, text, cat)
    tags.update(EXPLICIT.get(name,set()))
    sys['tags']=sorted(tags)
    d['system']=sys
    lines.append(json.dumps(d,separators=(',',':')))
    changed+=1
PACK.write_text('\n'.join(lines)+'\n')
print(f'updated {changed} entries')
