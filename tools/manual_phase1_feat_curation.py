import json, os

OVERRIDES = {
    # Species feats
    'Unwavering Focus': ['species_locked','species_zabrak','racial','defense','will','mental_resilience','mind_affecting_resistance','social_defense','passive','species_opportunity'],
    'Increased Resistance': ['species_locked','species_gamorrean','racial','defense','fortitude','durability','retaliation_window','conditional_opportunity','passive'],
    'Primitive Warrior': ['species_locked','species_gamorrean','racial','offense_melee','simple_weapons','weapon_simple','damage_bonus','martial','striker','passive'],
    'Pitiless Warrior': ['species_locked','species_trandoshan','racial','durability','temporary_hp','on_kill','snowball','striker','melee_preferred','conditional_opportunity'],
    'Scion of Dorin': ['species_locked','species_kel_dor','racial','defense','fortitude','hazard_resistance','environmental','survival','passive'],
    'Confident Success': ['species_locked','species_bothan','racial','social','information_gathering','skill_gather_information','resource_gain','force_points','investigation','conditional_opportunity'],
    'Strong Bellow': ['species_locked','species_ithorian','racial','special_ability_upgrade','bellow','condition_track','resource_efficiency','multiplier','control','species_opportunity'],
    'Quick Comeback': ['species_locked','species_gamorrean','racial','condition_track','recovery','durability','resilience','passive'],
    'Ample Foraging': ['species_locked','species_ewok','racial','support','fortitude','survival','skill_survival','camping','ally_support','passive'],
    'Sharp Senses': ['species_locked','species_mon_calamari','racial','awareness','perception','skill_perception','force_point_synergy','skill_check_boost','passive'],
    'Wroshyr Rage': ['species_locked','species_wookiee','racial','rage','temporary_hp','durability','offense_melee','conditional_opportunity'],
    'Binary Mind': ['species_locked','species_cerean','racial','defense','will','mind_affecting_resistance','anti_control','mental_resilience','passive'],
    'Justice Seeker': ['species_locked','species_kel_dor','racial','offense_melee','offense_ranged','damage_bonus','vengeance','ally_trigger','striker','conditional_opportunity'],
    'Veteran Spacer': ['species_locked','species_duros','racial','pilot','astrogation','use_computer','skill_use_computer','space','vehicle_utility','passive'],
    'Keen Scent': ['species_locked','species_ewok','racial','awareness','detection','scent','perception_support','stealth_counter','multiplier'],
    'Resurgent Vitality': ['species_locked','species_wookiee','racial','second_wind','healing','durability','recovery','multiplier'],
    'Perfect Intuition': ['species_locked','species_cerean','racial','initiative','skill_initiative','reroll','action_economy','mobility','passive'],
    'Perfect Swimmer': ['species_locked','species_gungan','racial','skill_swim','aquatic','mobility','reroll','environmental','passive'],
    'Flawless Pilot': ['species_locked','species_duros','racial','pilot','skill_pilot','reroll','vehicle_offense','vehicle_mobility','passive'],
    'Survivor of Ryloth': ['species_locked','species_twilek','racial','survival','skill_survival','environmental','hazard_resistance','passive'],
    'Disarming Charm': ['species_locked','species_sullustan','racial','social','persuasion_followup','attitude','skill_persuasion','charisma_synergy','passive'],
    'Mind of Reason': ['species_locked','species_cerean','racial','knowledge','mental_skills','wisdom_substitution','skill_substitution','multiplier','build_enabler'],
    'Inborn Resilience': ['species_locked','species_zabrak','racial','defense','reflex','fortitude','will','defense_reallocation','build_customization','passive'],
    'Devastating Bellow': ['species_locked','species_ithorian','racial','bellow','special_ability_upgrade','offense_area','damage_bonus','control','species_opportunity'],
    'Warrior Heritage': ['species_locked','species_gungan','racial','weapon_specific','atlatl','cesta','will','defense','ranged','passive'],
    'Lasting Influence': ['species_locked','species_bothan','racial','social','persuasion','skill_persuasion','stacking_bonus','followup','passive'],
    'Fringe Benefits': ['species_locked','species_rodian','racial','economy','black_market','shopping','resource_efficiency','utility','campaign_value'],
    'Mon Calamari Shipwright': ['species_locked','species_mon_calamari','racial','starship','repair','reroute_power','vehicle_utility','action_economy','tech','passive'],
    'Regenerative Healing': ['species_locked','species_trandoshan','racial','second_wind','healing','durability','regeneration','sustained_survivability','multiplier'],
    'Instinctive Perception': ['species_locked','species_zabrak','racial','perception','skill_perception','force_points','resource_gain','reroll_floor','awareness'],
    'Master Tracker': ['species_locked','species_rodian','racial','tracking','survival','skill_survival','force_point_synergy','hunter','passive'],
    "Hunter's Instincts": ['species_locked','species_rodian','racial','perception','skill_perception','reroll','awareness','hunter','passive'],
    'Jedi Heritage': ['species_locked','species_twilek','racial','force_training','force_multiplier','force_capacity','conditional_opportunity','forecast_value','species_opportunity','force_build_enabler'],
    'Bothan Will': ['species_locked','species_bothan','racial','will','defense','mental_resilience','anti_control','conditional_opportunity','passive'],
    'Fast Swimmer': ['species_locked','species_mon_calamari','racial','aquatic','mobility','swim_speed','movement_speed','passive'],
    'Bowcaster Marksman': ['species_locked','species_wookiee','racial','offense_ranged','weapon_bowcaster','damage_bonus','force_point_synergy','striker','weapon_specific'],
    "Spacer's Surge": ['species_locked','species_duros','racial','pilot','skill_pilot','natural_20','force_points','resource_gain','vehicle_specialist'],
    'Shrewd Bargainer': ['species_locked','species_quarren','racial','social','persuasion','will_debuff','anti_insight','charisma_support','controller'],
    'Deep Sight': ['species_locked','species_quarren','racial','darkvision','awareness','stealth_counter','ignore_concealment','environmental','passive'],
    'Thick Skin': ['species_locked','species_trandoshan','racial','fortitude','defense','durability','passive','species_opportunity'],
    'Darkness Dweller': ['species_locked','species_sullustan','racial','stealth_counter','awareness','anti_stealth','proximity_aura','controller','passive'],
    'Imperceptible Liar': ['species_locked','species_twilek','racial','deception','skill_deception','social','force_point_synergy','charisma_support','passive'],
    'Clawed Subspecies': ['species_locked','species_quarren','racial','unarmed','natural_weapon','offense_melee','striker','weapon_substitute','passive'],
    'Read the Winds': ['species_locked','species_kel_dor','racial','awareness','detection','hidden_enemy_counter','perception_support','passive'],
    'Sure Climber': ['species_locked','species_sullustan','racial','climb_speed','mobility','movement_mode','verticality','passive'],
    'Gungan Weapon Master': ['species_locked','species_gungan','racial','weapon_specific','atlatl','cesta','offense_ranged','force_point_synergy','damage_or_accuracy_support'],
    'Nature Specialist': ['species_locked','species_ithorian','racial','knowledge_life_sciences','skill_knowledge_life_sciences','force_point_synergy','knowledge','scholar','passive'],
    'Forest Stalker': ['species_locked','species_ewok','racial','stealth','skill_stealth','reroll','mobility','scout','passive'],

    # Force feats
    'Forceful Strike': ['force','force_stun','force_execution','condition_track','force_point_spend','controller','debuff','prereq_force_stun','conditional_opportunity'],
    'Fast Surge': ['force','second_wind','free_action','action_economy','survivability','new_action','durability','combat_reset'],
    'Saber Throw': ['force','lightsaber','offense_ranged','use_the_force','new_action','standard_action','weapon_specific','force_execution','duelist'],
    'Unstoppable Force': ['force','defense','fortitude','will','anti_force','anti_control','passive','duelist_survival'],
    'Forceful Throw': ['force','move_object','force_execution','control','offense_force','prereq_move_object','multiplier','telekinesis'],
    'Forceful Will': ['force','will','defense','mind_affecting_resistance','reroll','anti_control','passive'],
    'Force Regimen Mastery': ['force','force_regimen','force_capacity','wisdom_scaling','multiplier','long_rest_resource','build_enabler'],
    'Forceful Saber Throw': ['force','saber_throw','force_execution','offense_ranged','prereq_saber_throw','multiplier','lightsaber'],
    'Force Focus': ['force','force_execution','force_power_specialization','multiplier','power_specific','accuracy_or_dc_support','build_specialization'],
    'Forceful Grip': ['force','force_grip','force_execution','control','debuff','prereq_force_grip','multiplier'],
    'Force Boon': ['force','force_points','resource_pool','resource_gain','forecast_value','build_enabler','passive'],
    'Forceful Recovery': ['force','force_training','force_power_recovery','second_wind','resource_recovery','multiplier','forecast_value'],
    'Keen Force Mind': ['force','mind_affecting','force_execution','control','deception_counter','power_specialization','multiplier'],
    'Forceful Slam': ['force','force_slam','force_execution','offense_force','area_or_blast_support','prereq_force_slam','multiplier'],
    'Redirect Shot': ['force','deflect','redirect','reaction','offense_ranged','defense','new_action','prereq_deflect','lightsaber'],
    'Strong in the Force': ['force','force_points','resource_efficiency','multiplier','burst','forecast_value','passive'],
    'Crush': ['offense_melee','grapple','pin','damage_bonus','conditional_opportunity','striker','prereq_pin'],
    'Forceful Telekinesis': ['force','move_object','condition_track','force_point_spend','controller','debuff','telekinesis','forecast_value'],
    'Force Training': ['force','force_training','force_capacity','force_powers','new_option','build_enabler','forecast_value','prereq_force_build'],
    'Intuitive Initiative': ['force','initiative','use_the_force','reroll','action_economy','mobility','passive'],
    'Forceful Blast': ['grenades','offense_ranged','forced_movement','control','battlefield_control','conditional_opportunity','area_weapon'],
    'Forceful Weapon': ['force','battle_strike','force_execution','offense_melee','damage_or_accuracy_support','prereq_battle_strike','multiplier'],
    'Forceful Warrior': ['force','offense_melee','attack_bonus','while_force_active','conditional_opportunity','duelist','striker'],
    'Force Sensitivity': ['force','use_the_force','build_enabler','new_option','force_talents','gateway','forecast_value','prereq_force_build'],
    'Forceful Stun': ['force','force_stun','force_execution','controller','debuff','prereq_force_stun','multiplier'],
    'Forceful Vitality': ['force','endurance','skill_endurance','durability','reroll','survivability','passive'],
}

# small cleanup for canonical style
for v in OVERRIDES.values():
    # normalize ordering / uniqueness while preserving order
    seen=set(); out=[]
    for t in v:
        t=t.lower().replace(' ','_').replace('-','_')
        if t not in seen:
            seen.add(t); out.append(t)
    v[:] = out

path='packs/feats.db'
out=[]
count=0
with open(path) as f:
    for line in f:
        if not line.strip():
            continue
        o=json.loads(line)
        name=o.get('name')
        if name in OVERRIDES:
            o.setdefault('system',{})['tags']=OVERRIDES[name]
            count+=1
        out.append(o)
with open(path,'w') as f:
    for o in out:
        f.write(json.dumps(o, ensure_ascii=False)+'\n')
print('curated',count,'feat entries')
