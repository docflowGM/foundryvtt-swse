import json
from pathlib import Path

PACK = Path('packs/talents.db')

BASE = {
    'talent', 'non_force', 'force', 'jedi', 'talent_chain'
}

TAGS = {
'Force Intuition': ['skill_initiative','initiative','use_the_force','force_execution','awareness','perception_support','skill_substitution','reaction_speed','build_enabler'],
'Recall': ['force_training','force_capacity','force_recovery','resource_recovery','forecast_value','force_suite','multiplier'],
'Defensive Acuity': ['lightsaber','offense_melee','defense','fight_defensively','block','deflect','use_the_force','conditional_opportunity','duelist','swiftless'],
'Resilience': ['durability','condition_track','condition_recovery','full_round_action','activated','self_heal','survivability','new_action'],
'Immovable': ['defense','anti_forced_movement','battlefield_control','swift_action','activated','stability','counterplay'],
'Visionary Defense': ['farseeing','force_power_consumption','defense','ally_support','reaction','use_the_force','melee_defense','ranged_defense','force_execution','protective'],
'Mobile Combatant': ['mobility','offense_melee','pursuit','positioning','adjacency','anti_withdraw','controller'],
'Dampen Presence': ['social','stealth','memory_alteration','swift_action','activated','use_the_force','deception','infiltration','mind_affecting'],
'Gradual Resistance': ['defense','force_defense','anti_force','dark_side_defense','survivability','conditional_opportunity','adaptive_resistance'],
'Visionary Attack': ['farseeing','force_power_consumption','ally_support','offense_melee','offense_ranged','reaction','use_the_force','accuracy','reroll_support','force_execution'],
'Exposing Strike': ['lightsaber','offense_melee','flat_footed','debuff','force_point_spend','resource_spend','setup','striker'],
'Dark Retaliation': ['dark_side_counter','reaction','force_power_use','force_offense','force_defense','force_point_spend','resource_spend','counterplay'],
'Dark Side Scourge': ['offense_melee','lightsaber','dark_side_hunter','species_opportunity','charisma_scaling','bonus_damage','striker'],
"Consular's Wisdom": ['ally_support','will_defense','mind_affecting_defense','wisdom_scaling','swift_action','support','protective'],
'Resist the Dark Side': ['defense','force_defense','dark_side_defense','anti_force','survivability','will_defense','reflex_defense','fortitude_defense'],
'Skilled Advisor': ['skills','skill_support','ally_support','full_round_action','social','mind_affecting','support','resource_spend','force_point_spend'],
"Improved Consular's Vitality": ['healing','temporary_hit_points','ally_support','action_economy','free_action','conditional_opportunity','charisma_scaling','support'],
'Steel Resolve': ['offense_melee','defense','will_defense','standard_action','tradeoff','insight_bonus','duelist','survivability'],
'Weapon Specialization': ['offense_melee','offense_ranged','weapon_specific','damage_bonus','striker','scaling'],
'Precise Redirect': ['deflect','redirect_shot','reaction','offense_ranged','damage_bonus','conditional_opportunity','blaster_counter'],
'Acrobatic Recovery': ['mobility','skill_acrobatics','anti_prone','defense','survivability','skill_support','passive'],
'Renew Vision': ['farseeing','force_recovery','force_capacity','swift_action','resource_recovery','forecast_value'],
'Deflect': ['defense','ranged_defense','reaction','use_the_force','lightsaber','blaster_counter','protective','build_enabler'],
'Close Maneuvering': ['mobility','swift_action','positioning','anti_opportunity_attack','duelist','controller','target_lock'],
'Persistent Haze': ['force_haze','stealth','concealment','defense','team_stealth','conditional_opportunity','persistence'],
'Adept Negotiator': ['social','persuasion','condition_track','debuff','standard_action','mind_affecting','will_target','controller','new_action'],
'Precision': ['lightsaber','offense_melee','control','speed_reduction','standard_action','controller','duelist','striker'],
'Cortosis Gauntlet Block': ['block','defense','reaction','anti_lightsaber','item_synergy','weapon_specific','counterplay','duelist'],
'Clear Mind': ['use_the_force','anti_detection','reroll','force_defense','awareness','counterplay','passive'],
'Reap Retribution': ['anti_force','force_defense','offense_bonus','revenge','conditional_opportunity','striker'],
'Block': ['defense','melee_defense','reaction','use_the_force','lightsaber','protective','build_enabler'],
'Redirect Shot': ['deflect','redirect_shot','reaction','offense_ranged','accuracy','counterattack','blaster_counter','new_action'],
'Battle Meditation': ['ally_support','attack_bonus','full_round_action','force_point_spend','resource_spend','leadership','support','battlefield_aura','new_action'],
'Dark Side Bane': ['force_offense','dark_side_hunter','charisma_scaling','bonus_damage','offense_force','striker'],
'Master Negotiator': ['social','persuasion','condition_track','debuff','mind_affecting','controller','multiplier','conditional_opportunity'],
'Elusive Target': ['defense','ranged_defense','mobility','anti_focus_fire','survivability','positioning'],
'Adversary Lore': ['use_the_force','knowledge','debuff','setup','standard_action','controller','awareness','new_action'],
'WatchCircle Initiate': ['farseeing','reaction','use_the_force','force_power_consumption','awareness','build_enabler'],
'Force of Will': ['will_defense','defense','ally_support','swift_action','force_point_spend','resource_spend','support','mind_affecting_defense'],
'Riposte': ['block','reaction','counterattack','offense_melee','lightsaber','duelist','once_per_encounter','new_action'],
"Consular's Vitality": ['healing','temporary_hit_points','ally_support','swift_action','charisma_scaling','support','protective'],
'Cleanse Mind': ['mind_affecting_removal','condition_removal','ally_support','swift_action','support','protective','debuff_clear'],
'Sentinel Strike': ['offense_melee','offense_force','lightsaber','flat_footed','bonus_damage','striker','precision'],
'Know Weakness': ['adversary_lore','ally_support','bonus_damage','setup','controller','multiplier','team_damage'],
'Force Persuasion': ['social','persuasion','use_the_force','skill_substitution','charisma_scaling','trained_skill_gain','build_enabler'],
'Improved Battle Meditation': ['battle_meditation','ally_support','action_economy','swift_action','attack_bonus','debuff','battlefield_aura','support'],
"Sentinel's Observation": ['offense_melee','offense_ranged','accuracy','concealment_synergy','stealth','precision','striker'],
"Sentinel's Gambit": ['dark_side_hunter','flat_footed','debuff','swift_action','setup','offense_melee','offense_force','controller'],
'Shoto Focus': ['lightsaber','dual_wield','offense_melee','accuracy','weapon_specific','duelist','jar_kai_support'],
'Lightsaber Throw': ['lightsaber','offense_ranged','standard_action','new_action','weapon_specific','accuracy','force_flavored'],
'Collective Visions': ['farseeing','ally_support','aid_another','reaction','use_the_force','teamwork','support'],
'Guiding Strikes': ['lightsaber','ally_support','offense_melee','accuracy_support','swift_action','teamwork','support','setup'],
'Dark Side Sense': ['awareness','use_the_force','dark_side_detection','reroll','anti_dark_side','investigation'],
'Lightsaber Defense': ['lightsaber','defense','reflex_defense','swift_action','duelist','survivability','protective'],
'Master of the Great Hunt': ['lightsaber','offense_melee','beast_hunter','dark_side_hunter','accuracy','bonus_damage','striker'],
'Force Haze': ['stealth','concealment','team_stealth','standard_action','force_point_spend','resource_spend','control','defense','new_action'],
'Guardian Strike': ['lightsaber','offense_melee','marking','debuff','protection','tank','controller'],
'Forceful Warrior': ['lightsaber','critical_hit','force_point_recovery','resource_recovery','striker','forecast_value'],
'Entreat Aid': ['skills','ally_support','aid_another','swift_action','force_point_spend','resource_spend','support','skill_support'],
'Unseen Eyes': ['force_haze','stealth','team_stealth','perception','damage_bonus','ally_support','concealment_synergy','striker_support'],
'Aggressive Negotiator': ['social','persuasion','lightsaber','skill_support','conditional_opportunity','take_10','hybrid'],
}

# normalize all tags to lower-case snake case

def norm(tags):
    out=[]
    seen=set()
    for t in BASE.union(set(tags)):
        x=t.strip().lower().replace(' ','_').replace('-','_').replace("'",'')
        while '__' in x:
            x=x.replace('__','_')
        if x and x not in seen:
            seen.add(x)
            out.append(x)
    return sorted(out)

lines = PACK.read_text().splitlines()
out=[]
count=0
for line in lines:
    obj=json.loads(line)
    if obj.get('type')=='talent' and obj.get('system',{}).get('category')=='Jedi':
        name=obj['name']
        if name in TAGS:
            obj['system']['tags']=norm(TAGS[name])
            count += 1
    out.append(json.dumps(obj, ensure_ascii=False))
PACK.write_text('\n'.join(out)+'\n')
print(f'Curated {count} Jedi talents')
missing=[n for n in TAGS if n not in [json.loads(l)['name'] for l in lines if json.loads(l).get('system',{}).get('category')=='Jedi']]
if missing:
    print('Missing:', missing)
