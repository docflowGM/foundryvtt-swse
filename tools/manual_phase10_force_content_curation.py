import json, sqlite3
from pathlib import Path

ROOT = Path('/tmp/swse_work/foundryvtt-swse')

POWER_TAGS = {
'Vital Transfer':['force_power','healing','support','touch','standard_action','force_execution','skill_treat_injury','life_transfer'],
'Farseeing':['force_power','utility','divination','intel','perception','standard_action','ritual_like'],
'Force Lightning':['force_power','offense_force','damage','dark_side','lightning','single_target','standard_action','force_execution'],
'Force Cloak':['force_power','stealth','concealment','invisibility','self_buff','standard_action','mobility'],
'Force Disarm':['force_power','control','telekinetic','disarm','single_target','standard_action','weapon_denial'],
'Surge':['force_power','mobility','self_buff','swift_action','action_economy','extra_move','movement_boost'],
'Force Track':['force_power','tracking','survival','intel','divination','standard_action'],
'Move Object':['force_power','telekinetic','control','offense_force','forced_movement','utility','standard_action','single_target'],
'Rebuke':['force_power','anti_force','control','daze','single_target','standard_action','force_execution'],
'Force Slam':['force_power','offense_force','area','telekinetic','forced_movement','knockdown','standard_action'],
'Force Defense':['force_power','defense','anti_force','self_buff','reaction','utf_defense'],
'Force Scream':['force_power','offense_force','area','sonic','debuff','standard_action','dark_side'],
'Malacia':['force_power','control','condition_track','debuff','single_target','standard_action','telepathic'],
'Battle Meditation':['force_power','ally_support','leader','team_buff','standard_action','battlefield_control'],
'Force Weapon':['force_power','offense_melee','weapon_buff','self_buff','swift_action','lightsaber','melee_buff'],
'Drain Life':['force_power','offense_force','healing','dark_side','single_target','standard_action','life_drain'],
'Force Stun':['force_power','control','stun','single_target','standard_action','telepathic'],
'Sever Force (Lesser)':['force_power','anti_force','control','single_target','standard_action','force_denial'],
'Force Storm':['force_power','offense_force','area','lightning','dark_side','standard_action','burst'],
'Sever Force':['force_power','anti_force','control','single_target','standard_action','force_denial','high_tier'],
'Force Body':['force_power','survivability','damage_mitigation','self_buff','swift_action','vital'],
'Negate Energy':['force_power','defense','reaction','energy_defense','anti_blaster','survivability'],
'Force Sense':['force_power','perception','awareness','anti_stealth','utility','standard_action'],
'Battlemind':['force_power','self_buff','offense_melee','offense_ranged','accuracy','damage_buff','swift_action'],
'Force Thrust':['force_power','offense_force','telekinetic','forced_movement','single_target','standard_action'],
'Drain Energy':['force_power','anti_droid','anti_vehicle','offense_force','single_target','standard_action','ionic'],
'Inspire':['force_power','ally_support','team_buff','morale','standard_action','leader'],
'Force Strike':['force_power','offense_force','single_target','telekinetic','standard_action','damage'],
'Mind Trick':['force_power','social','control','mind_affecting','single_target','standard_action','deception'],
'Battle Strike':['force_power','offense_melee','self_buff','damage_buff','swift_action','melee_buff'],
'Ballistakinesis':['force_power','offense_ranged','control','weapon_buff','standard_action','blaster_synergy'],
'Blind':['force_power','control','debuff','single_target','standard_action','vision_denial'],
'Combustion':['force_power','offense_force','damage','fire','single_target','standard_action'],
'Convection':['force_power','offense_force','area','fire','hazard','standard_action'],
'Corruption':['force_power','offense_force','dark_side','ongoing_damage','debuff','single_target','standard_action'],
'Crucitorn':['force_power','offense_force','dark_side','pain','control','single_target','standard_action'],
'Dark Rage':['force_power','offense_melee','self_buff','dark_side','damage_buff','swift_action','risk_reward'],
'Dark Transfer':['force_power','healing','dark_side','support','touch','standard_action','resource_cost'],
'Detonate':['force_power','offense_force','area','explosive','standard_action','object_interaction'],
'Energy Resistance':['force_power','defense','energy_defense','ally_support','self_buff','standard_action'],
'Enlighten':['force_power','utility','knowledge','intel','perception','standard_action','investigation'],
'Fear':['force_power','control','mind_affecting','debuff','area','standard_action','dark_side'],
'Fold Space':['force_power','mobility','teleport','utility','standard_action','positioning'],
'Force Blast':['force_power','offense_force','area','telekinetic','push','standard_action'],
'Force Light':['force_power','anti_dark_side','support','area','standard_action','purification'],
'Force Shield':['force_power','defense','shielding','self_buff','standard_action','survivability'],
'Force Whirlwind':['force_power','control','forced_movement','lift','single_target','standard_action'],
'Hatred':['force_power','dark_side','self_buff','force_point_recovery','swift_action','resource_recovery'],
'Inertia':['force_power','defense','damage_mitigation','fall_protection','self_buff','reaction'],
'Intercept':['force_power','defense','reaction','ranged_defense','projectile_intercept','telekinetic'],
'Ionize':['force_power','anti_droid','anti_vehicle','ionic','single_target','standard_action','control'],
'Kinetic Combat':['force_power','offense_melee','weapon_buff','telekinetic','self_buff','swift_action','lightsaber_adjacent'],
'Levitate':['force_power','mobility','vertical_movement','utility','standard_action'],
'Lightning Burst':['force_power','offense_force','area','lightning','standard_action','dark_side'],
'Memory Walk':['force_power','intel','investigation','telepathic','mind_probe','standard_action','single_target'],
'Mind Shard':['force_power','offense_force','telepathic','single_target','debuff','standard_action'],
'Morichro':['force_power','control','single_target','save_or_sleep','dark_side','standard_action'],
'Obscure':['force_power','stealth','concealment','ally_support','area','standard_action'],
'Phase':['force_power','mobility','defense','escape','self_buff','standard_action','intangibility'],
'Plant Surge':['force_power','control','terrain','area','standard_action','nature'],
'Prescience':['force_power','awareness','defense','initiative','self_buff','swift_action'],
'Rend':['force_power','offense_force','telekinetic','single_target','damage','standard_action','armor_break'],
'Repulse':['force_power','offense_force','area','telekinetic','push','standard_action','battlefield_control'],
'Resist Force':['force_power','defense','anti_force','reaction','utf_defense','survivability'],
'Shatterpoint':['force_power','offense_melee','offense_ranged','critical_setup','swift_action','damage_spike'],
'Slow':['force_power','control','debuff','single_target','speed_reduction','standard_action'],
'Stagger':['force_power','control','debuff','single_target','action_denial','standard_action'],
'Technometry':['force_power','tech','droid','device_control','utility','standard_action','skill_use_computer'],
'Thought Bomb':['force_power','offense_force','area','dark_side','mind_affecting','standard_action','burst'],
'Valor':['force_power','ally_support','team_buff','morale','defense','standard_action'],
'Wound':['force_power','offense_force','damage','single_target','dark_side','standard_action'],
}

TECH_TAGS = {
'Improved Battle Strike':['force_technique','offense_melee','melee_buff','damage_scaling','force_execution'],
'Improved Shatterpoint':['force_technique','critical_setup','damage_spike','offense_melee','offense_ranged'],
'Force Point Recovery':['force_technique','resource_recovery','force_point_recovery','sustain'],
'Force Power Mastery':['force_technique','force_power_reuse','sustain','signature_power'],
'Detoxify Poison':['force_technique','healing','support','condition_removal','poison_counter'],
'Improved Phase':['force_technique','mobility','escape','intangibility','defense'],
'Improved Force Slam':['force_technique','area','telekinetic','knockdown','control'],
'Extended Force Thrust':['force_technique','forced_movement','range_extension','control'],
'Improved Force Stun':['force_technique','control','stun','debuff'],
'Improved Lightning Burst':['force_technique','area','lightning','damage_scaling','dark_side'],
'Improved Detonate':['force_technique','area','explosive','object_interaction','damage_scaling'],
'Improved Force Thrust':['force_technique','telekinetic','forced_movement','damage_scaling'],
'Dominate Mind':['force_technique','control','mind_affecting','social','hard_control'],
'Improved Dark Transfer':['force_technique','healing','dark_side','support','resource_trade'],
'Improved Sense Surroundings':['force_technique','awareness','perception','anti_stealth','initiative'],
'Improved Mind Trick':['force_technique','social','control','mind_affecting','deception'],
'Improved Telepathy':['force_technique','intel','communication','mind_probe','utility'],
'Improved Resist Force':['force_technique','anti_force','defense','survivability'],
'Advanced Vital Transfer':['force_technique','healing','support','life_transfer','burst_heal'],
'Extended Force Grip':['force_technique','control','single_target','range_extension','sustain'],
'Improved Malacia':['force_technique','condition_track','debuff','control'],
'Improved Force Disarm':['force_technique','disarm','control','weapon_denial'],
'Improved Plant Surge':['force_technique','terrain','control','area','nature'],
'Improved Thought Bomb':['force_technique','area','dark_side','mind_affecting','burst'],
'Improved Force Trance':['force_technique','recovery','utility','rest_efficiency'],
'Improved Technometry':['force_technique','tech','droid','device_control','slicing'],
'Improved Vital Transfer':['force_technique','healing','support','burst_heal'],
'Improved Valor':['force_technique','ally_support','team_buff','morale'],
'Improved Repulse':['force_technique','area','telekinetic','battlefield_control','push'],
'Improved Obscure':['force_technique','stealth','concealment','ally_support'],
'Improved Sense Force':['force_technique','awareness','divination','anti_force','perception'],
'Improved Dark Rage':['force_technique','offense_melee','dark_side','damage_scaling','risk_reward'],
'Improved Fold Space':['force_technique','mobility','teleport','range_extension','positioning'],
'Extended Move Object':['force_technique','telekinetic','range_extension','utility','control'],
'Improved Force Light':['force_technique','anti_dark_side','support','purification'],
'Improved Force Shield':['force_technique','defense','shielding','survivability'],
'Improved Force Storm':['force_technique','area','lightning','dark_side','damage_scaling'],
'Extended Blind':['force_technique','control','debuff','duration_extension'],
'Improved Cloak':['force_technique','stealth','invisibility','mobility'],
'Improved Move Light Object':['force_technique','telekinetic','fine_control','utility'],
'Improved Ionize':['force_technique','anti_droid','anti_vehicle','ionic','control'],
'Extended Force Disarm':['force_technique','disarm','range_extension','control'],
'Improved Levitate':['force_technique','mobility','vertical_movement','utility'],
'Improved Rend':['force_technique','telekinetic','single_target','damage_scaling','armor_break'],
'Improved Force Lightning':['force_technique','lightning','single_target','dark_side','damage_scaling'],
'Language Absorption':['force_technique','social','intel','utility','language'],
'Improved Crucitorn':['force_technique','pain','control','dark_side','debuff'],
'Improved Ballistakinesis':['force_technique','offense_ranged','blaster_synergy','weapon_buff'],
'Cure Disease':['force_technique','healing','support','condition_removal','disease_counter'],
'Improved Force Grip':['force_technique','control','single_target','sustain','telekinetic'],
'Improved Rebuke':['force_technique','anti_force','control','daze'],
'Improved Stagger':['force_technique','action_denial','control','single_target'],
'Improved Cryokinesis':['force_technique','cold','offense_force','control','damage_scaling'],
'Improved Energy Resistance':['force_technique','defense','energy_defense','support'],
'Improved Convection':['force_technique','fire','area','hazard','damage_scaling'],
'Improved Enlighten':['force_technique','knowledge','intel','investigation','utility'],
'Improved Kinetic Combat':['force_technique','offense_melee','telekinetic','weapon_buff','sustain'],
}

SECRET_TAGS = {
'Debilitating Power':['force_secret','debuff','condition_track','power_upgrade','control'],
'Remote Power':['force_secret','range_extension','power_upgrade','utility'],
'Distant Power':['force_secret','range_extension','power_upgrade','sniping'],
'Corrupted Power':['force_secret','dark_side','damage_scaling','power_upgrade','corruption'],
'Quicken Power':['force_secret','swift_action','action_economy','power_upgrade'],
'Linked Power':['force_secret','combo','power_upgrade','multi_cast','action_economy'],
'Pure Power':['force_secret','light_side','power_upgrade','purification'],
'Devastating Power':['force_secret','damage_scaling','power_upgrade','burst'],
'Mentor':['force_secret','ally_support','teaching','support','utility'],
'Unconditional Power':['force_secret','reliability','power_upgrade','consistency'],
'Multitarget Power':['force_secret','multi_target','area','power_upgrade'],
'Enlarged Power':['force_secret','area','range_extension','power_upgrade'],
'Extend Power':['force_secret','duration_extension','sustain','power_upgrade'],
'Holocron Loremaster':['force_secret','knowledge','utility','lore','holocron'],
'Shaped Power':['force_secret','area_control','precision','power_upgrade'],
}

SHIP_TAGS = {
'Pilot the Ship':['starship_action','pilot','mobility','standard_action','vehicle'],
'Attack Run':['starship_action','pilot','offense_ranged','accuracy','approach','vehicle'],
'Evasive Action':['starship_action','pilot','defense','mobility','standard_action','vehicle'],
'Starship Dodge (Reaction)':['starship_action','pilot','defense','reaction','vehicle'],
'Ram':['starship_action','pilot','offense_melee','collision','risk_reward','vehicle'],
'Flying Ace Maneuver':['starship_action','pilot','mobility','stunt','vehicle','showcase'],
'Fire Weapon':['starship_action','gunner','offense_ranged','standard_action','vehicle'],
'Aim (Starship)':['starship_action','gunner','accuracy','standard_action','setup','vehicle'],
'Concentrate Fire':['starship_action','gunner','offense_ranged','damage_scaling','teamwork','vehicle'],
'Fire Linked Weapons':['starship_action','gunner','offense_ranged','burst','vehicle','linked_weapons'],
'Autofire (Starship)':['starship_action','gunner','area','offense_ranged','suppression','vehicle'],
'Jury-Rig (Starship)':['starship_action','engineer','repair','utility','emergency_fix','vehicle'],
'Repair Damage (Starship)':['starship_action','engineer','repair','healing','vehicle'],
'Boost Shields':['starship_action','engineer','defense','shielding','vehicle'],
'Divert Power':['starship_action','engineer','resource_management','utility','vehicle'],
'Recharge Shields (Engineer)':['starship_action','engineer','shielding','defense','vehicle'],
'Regulate Power Systems':['starship_action','engineer','resource_management','stability','vehicle'],
'Raise/Lower Shields':['starship_action','shields','defense','resource_management','vehicle'],
'Recharge Shields (Shields Operator)':['starship_action','shields','defense','shielding','vehicle'],
'Redirect Shields':['starship_action','shields','defense','positioning','shielding','vehicle'],
'Grant Tactical Advantage':['starship_action','commander','ally_support','leader','accuracy_support','vehicle'],
'Coordinate Attack':['starship_action','commander','ally_support','leader','offense_ranged','vehicle'],
'Order Crew':['starship_action','commander','leader','action_economy','ally_support','vehicle'],
'Inspire Crew':['starship_action','commander','morale','ally_support','leader','vehicle'],
'Sensor Lock':['starship_action','sensors','intel','accuracy_support','target_marking','vehicle'],
'Jam Sensors':['starship_action','sensors','control','debuff','intel_denial','vehicle'],
'Co-Pilot Assist':['starship_action','copilot','ally_support','pilot_support','vehicle'],
'Take the Helm':['starship_action','copilot','pilot','utility','vehicle'],
'Emergency Repairs':['starship_action','engineer','repair','emergency_fix','vehicle','survivability'],
'Perform Stunt':['starship_action','pilot','stunt','mobility','vehicle','showcase'],
}


def sort_tags(tags):
    seen=[]
    for t in tags:
        if t and t not in seen:
            seen.append(t)
    return seen

# force powers
p = ROOT/'packs'/'forcepowers.db'
out=[]
with p.open() as f:
    for line in f:
        o=json.loads(line)
        tags=POWER_TAGS.get(o['name'])
        if tags:
            o['system']['tags']=sort_tags(tags)
        out.append(json.dumps(o, ensure_ascii=False))
p.write_text('\n'.join(out)+'\n')

for fn,mapping in [('forcetechniques.db',TECH_TAGS),('forcesecrets.db',SECRET_TAGS)]:
    p=ROOT/'packs'/fn
    out=[]
    with p.open() as f:
        for line in f:
            o=json.loads(line)
            tags=mapping.get(o['name'])
            if tags:
                o['system']['tags']=sort_tags(tags)
            out.append(json.dumps(o, ensure_ascii=False))
    p.write_text('\n'.join(out)+'\n')

# sqlite ship combat actions
sp=ROOT/'packs'/'ship-combat-actions.db'
conn=sqlite3.connect(sp)
cur=conn.cursor()
rows=cur.execute('select _id,name,system from items').fetchall()
for _id,name,system in rows:
    s=json.loads(system)
    tags=SHIP_TAGS.get(name)
    if tags:
        s['tags']=sort_tags(tags)
        cur.execute('update items set system=? where _id=?', (json.dumps(s, ensure_ascii=False), _id))
conn.commit(); conn.close()

print('Updated force powers:', len(POWER_TAGS))
print('Updated force techniques:', len(TECH_TAGS))
print('Updated force secrets:', len(SECRET_TAGS))
print('Updated ship combat actions:', len(SHIP_TAGS))
