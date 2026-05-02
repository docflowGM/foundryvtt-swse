import json
from pathlib import Path

TAGS = {
  'Apprentice Boon': ['jedi_knight','force','force_execution','use_the_force','ally_support','reaction','force_point_spend','resource_spend','teamwork','mentor_support','skill_use_the_force'],
  'Ataru': ['jedi_knight','lightsaber','melee','offense_melee','duelist','mobility','dexterity_synergy','finesse','damage_scaling','form_ataru'],
  'Call Weapon': ['jedi_knight','lightsaber','utility','free_action','action_economy','new_action','weapon_retrieval','weapon_readiness','use_the_force','form_support'],
  'Combat Trance': ['jedi_knight','force','force_power_battle_strike','offense_melee','accuracy','sustained_damage','stance','encounter_buff','melee_setup'],
  'Cover Your Tracks': ['jedi_knight','stealth','social','investigation_defense','gather_information_defense','concealment','identity_protection','watchman'],
  'Dark Deception': ['jedi_knight','force','anti_detection','deception','dark_side_masking','social','counter_divination','watchman'],
  'Defensive Circle': ['jedi_knight','force','battle_meditation','ally_support','team_defense','reflex_defense','swift_action','formation_play','controller','support'],
  'Difficult to Sense': ['jedi_knight','force','anti_detection','use_the_force','reroll','counter_divination','stealth_force','watchman'],
  'Direct': ['jedi_knight','force','ally_support','force_power_recovery','standard_action','resource_transfer','teamwork','support','new_action'],
  'Djem So': ['jedi_knight','lightsaber','melee','offense_melee','reaction','counterattack','force_point_spend','riposte_style','form_djem_so','striker'],
  'Echoes in the Force': ['jedi_knight','force','farseeing','information','investigation','divination','lore','out_of_combat','utility'],
  'Force Fortification': ['jedi_knight','force','defense','critical_hit_negation','reaction','force_point_spend','survivability','durability'],
  'Force Revive': ['jedi_knight','force','battle_meditation','ally_support','reaction','second_wind','healing','rescue','support','force_point_spend'],
  'Force Treatment': ['jedi_knight','force','healing','medicine','skill_treat_injury','skill_substitution','use_the_force','out_of_combat','support','new_option'],
  'Force Veil': ['jedi_knight','force','anti_detection','concealment','stealth_force','watchman','counter_divination','travel_utility'],
  'Force Warning': ['jedi_knight','force','initiative','ambush_defense','surprise_round','ally_support','teamwork','reaction_speed','controller','support'],
  'Greater Weapon Focus (lightsabers)': ['jedi_knight','lightsaber','melee','offense_melee','accuracy','feat_chain','weapon_specific','striker'],
  'Greater Weapon Specialization (lightsabers)': ['jedi_knight','lightsaber','melee','offense_melee','damage','feat_chain','weapon_specific','striker'],
  'Healing Boost': ['jedi_knight','force','healing','vital_transfer','healing_scaling','support','force_capacity','ally_support'],
  'Impart Knowledge': ['jedi_knight','knowledge','ally_support','reaction','aid_another','teamwork','skill_knowledge','support'],
  'Improved Healing Boost': ['jedi_knight','force','healing','vital_transfer','healing_scaling','support','ally_support','feat_chain'],
  'Improved Lightsaber Throw': ['jedi_knight','lightsaber','offense_ranged','line_attack','standard_action','force_point_spend','multi_target','weapon_specific','new_action','striker'],
  'Improved Quick Draw (lightsabers)': ['jedi_knight','lightsaber','surprise_round','initiative','action_economy','weapon_readiness','free_action','opening_strike','striker'],
  'Improved Redirect': ['jedi_knight','lightsaber','ranged_defense','reaction','redirect_shot','action_economy','deflect_support','counterattack','feat_chain'],
  'Improved Riposte': ['jedi_knight','lightsaber','melee_defense','reaction','riposte','action_economy','block_support','counterattack','feat_chain'],
  'Improved Sentinel Strike': ['jedi_knight','watchman','offense_melee','precision','sentinel_strike','damage_scaling','feat_chain','striker'],
  "Improved Sentinel's Gambit": ['jedi_knight','watchman','ambush','setup','sentinel_gambit','uses_per_encounter','controller','feat_chain'],
  'Improvised Weapon Master': ['jedi_knight','melee','improvised_weapon','versatility','weapon_flexibility','striker','utility'],
  'Insight of the Force': ['jedi_knight','force','use_the_force','knowledge','skill_substitution','skill_knowledge','lore','utility','scholar'],
  "Jar'Kai": ['jedi_knight','lightsaber','dual_wield','melee_defense','reflex_defense','lightsaber_defense','form_jar_kai','duelist'],
  'Jedi Battle Commander': ['jedi_knight','force','battle_meditation','ally_support','attack_support','leader','teamwork','support'],
  'Jedi Network': ['jedi_knight','social','contacts','investigation','resources','safehouse','information','healing_support','out_of_combat','utility'],
  'Jedi Quarry': ['jedi_knight','melee','mobility','swift_action','target_marking','pursuit','speed','hunter','striker'],
  'Juyo': ['jedi_knight','lightsaber','melee','offense_melee','reroll','force_point_spend','single_target','form_juyo','striker','critical_setup'],
  'Lightsaber Form Savant': ['jedi_knight','force','lightsaber_form','force_power_recovery','swift_action','action_economy','resource_recovery','build_enabler'],
  'Lightsaber Specialist': ['jedi_knight','lightsaber','block','deflect','use_the_force','accuracy','weapon_specific','defense','build_enabler'],
  'Makashi': ['jedi_knight','lightsaber','melee_defense','reflex_defense','duelist','single_weapon','form_makashi','defender'],
  'Master Advisor': ['jedi_knight','ally_support','force_point_grant','skilled_advisor','teamwork','support','resource_grant','leader'],
  'Masterwork Lightsaber': ['jedi_knight','lightsaber','crafting','modification','equipment','weapon_specific','build_enabler','utility'],
  'Mobile Attack (lightsabers)': ['jedi_knight','lightsaber','dual_wield','mobility','free_action','action_economy','full_attack','hit_and_run','striker'],
  'Multiattack Proficiency (lightsabers)': ['jedi_knight','lightsaber','dual_wield','full_attack','accuracy','offense_melee','weapon_specific','striker'],
  'Niman': ['jedi_knight','lightsaber','defense','reflex_defense','will_defense','form_niman','balanced_style','defender'],
  'Perfect Attunement': ['jedi_knight','lightsaber','force_point_spend','damage_scaling','accuracy','weapon_specific','burst_damage','striker'],
  'Prepared for Danger': ['jedi_knight','force','farseeing','resource_recovery','swift_action','force_power_recovery','preparedness','utility'],
  'Quick Modification': ['jedi_knight','lightsaber','crafting','modification','equipment','weapon_specific','utility','out_of_combat'],
  'Rebuke the Dark': ['jedi_knight','force','anti_dark_side','rebuke','reroll','counter_force','defense','light_side'],
  'Scholarly Knowledge': ['jedi_knight','knowledge','skill_knowledge','swift_action','reroll','scholar','utility'],
  'Sense Deception': ['jedi_knight','force','social_defense','deception_defense','persuasion_defense','will_defense','use_the_force','insight'],
  'Severing Strike': ['jedi_knight','lightsaber','offense_melee','finisher','limb_sever','critical_moment','striker','weapon_specific'],
  'Share Force Secret': ['jedi_knight','force','ally_support','support','swift_action','share_ability','force_secret','teamwork','leader','new_action'],
  'Share Force Technique': ['jedi_knight','force','ally_support','support','swift_action','share_ability','force_technique','teamwork','leader','new_action'],
  'Share Talent': ['jedi_knight','ally_support','support','standard_action','force_point_spend','share_ability','teamwork','leader','new_action'],
  'Sheltering Stance': ['jedi_knight','lightsaber','ally_protection','block','deflect','reaction','bodyguard','defender','support'],
  'Shien': ['jedi_knight','lightsaber','ranged_offense','redirect_shot','accuracy','form_shien','counterattack','blaster_reflection','striker'],
  'Shii-Cho': ['jedi_knight','lightsaber','block','deflect','use_the_force','action_economy','defense','form_shii_cho','sustained_defense'],
  'Shoto Master': ['jedi_knight','lightsaber','dual_wield','weapon_handling','shoto','duelist','build_enabler','melee'],
  'Shoto Pin Block': ['jedi_knight','lightsaber','melee_control','block','reaction','shoto','immobilize','controller','defender'],
  'Slashing Charge': ['jedi_knight','lightsaber','charge','mobility','block','riposte','action_economy','offense_melee','striker'],
  'Sokan': ['jedi_knight','mobility','acrobatics','skill_acrobatics','tumble','positioning','form_sokan','movement_utility'],
  'Soothe': ['jedi_knight','force','healing','condition_track','vital_transfer','support','ally_support','self_cost'],
  'Soresu': ['jedi_knight','lightsaber','block','deflect','reroll','form_soresu','ranged_defense','melee_defense','defender'],
  'Taint of the Dark Side': ['jedi_knight','force','dark_side','force_power_access','new_option','encounter_use','conditional_opportunity','force_execution'],
  'Thrown Lightsaber Mastery': ['jedi_knight','lightsaber','offense_ranged','speed_reduction','control','weapon_specific','striker','debuff'],
  'Trakata': ['jedi_knight','lightsaber','deception','feint','swift_action','setup','duelist','social_combat','striker'],
  'Transfer Power': ['jedi_knight','force','ally_support','force_power_transfer','standard_action','resource_transfer','teamwork','support','new_action'],
  'Twin Weapon Mastery': ['jedi_knight','lightsaber','dual_wield','mobility','positioning','no_opportunity_attack','action_economy','striker'],
  'Twin Weapon Style': ['jedi_knight','lightsaber','dual_wield','standard_action','multi_target','offense_melee','new_action','striker'],
  'Unclouded Judgment': ['jedi_knight','force','mind_affecting_defense','reaction_defense','force_point_spend','anti_control','will_defense','light_side'],
  'Vaapad': ['jedi_knight','lightsaber','critical_range','offense_melee','form_vaapad','striker','burst_damage'],
  'Vigilance': ['jedi_knight','ally_support','adjacency','reflex_defense','swift_action','bodyguard','defender','support'],
  "Watchman's Advance": ['jedi_knight','watchman','surprise_round','mobility','ally_support','teamwork','ambush','action_economy','leader'],
}

path = Path('packs/talents.db')
lines = path.read_text(encoding='utf-8').splitlines()
out=[]
changed=0
for line in lines:
    if not line.strip():
        continue
    obj=json.loads(line)
    if obj.get('type')=='talent' and obj.get('system',{}).get('category')=='Jedi Knight':
        name=obj.get('name')
        if name in TAGS:
            obj['system']['tags']=TAGS[name]
            changed+=1
    out.append(json.dumps(obj, ensure_ascii=False, separators=(',',':')))
path.write_text('\n'.join(out)+'\n', encoding='utf-8')
print('changed', changed)
missing = [n for n in TAGS if n not in '\n'.join(lines)]
print('tag definitions', len(TAGS))
