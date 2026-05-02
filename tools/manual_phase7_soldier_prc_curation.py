import json
from pathlib import Path

TARGET_CATEGORIES = {
    'Soldier','Elite Trooper','Ace Pilot','Officer','Bounty Hunter','Gunslinger','Crime Lord',
    'Master Privateer','Saboteur','Military Engineer','Melee Duelist','Gladiator','Infiltrator'
}

COMMON = {
    'Soldier':['soldier','martial'],
    'Elite Trooper':['elite_trooper','martial','prestige_class'],
    'Ace Pilot':['ace_pilot','prestige_class','pilot','vehicle','starship'],
    'Officer':['officer','leader','prestige_class'],
    'Bounty Hunter':['bounty_hunter','prestige_class','tracker'],
    'Gunslinger':['gunslinger','prestige_class','offense_ranged'],
    'Crime Lord':['crime_lord','prestige_class','leader','social'],
    'Master Privateer':['master_privateer','prestige_class','vehicle','starship','piracy'],
    'Saboteur':['saboteur','prestige_class','tech','demolitions'],
    'Military Engineer':['military_engineer','prestige_class','tech'],
    'Melee Duelist':['melee_duelist','prestige_class','duelist','offense_melee'],
    'Gladiator':['gladiator','prestige_class','offense_melee','showman'],
    'Infiltrator':['infiltrator','prestige_class','stealth'],
}


def add(tags,*vals):
    for v in vals:
        if v and v not in tags:
            tags.append(v)

def remove_noise(tags):
    bad={'jedi','light-side','dark-side'}
    return [t for t in tags if t not in bad]

def action_tags(text,tags):
    lt=text.lower()
    if 'free action' in lt: add(tags,'free_action','action_economy')
    if 'swift action' in lt: add(tags,'swift_action','action_economy')
    if 'move action' in lt: add(tags,'move_action')
    if 'standard action' in lt: add(tags,'standard_action')
    if 'full-round action' in lt or 'full round action' in lt: add(tags,'full_round_action')
    if 'reaction' in lt or 'immediate' in lt: add(tags,'reaction','action_economy')
    return tags

def skill_tags(text,tags):
    lt=text.lower()
    mapping={
      'acrobatics':'skill_acrobatics','athletics':'skill_athletics','climb':'skill_climb','endurance':'skill_endurance',
      'initiative':'skill_initiative','mechanics':'skill_mechanics','perception':'skill_perception','persuasion':'skill_persuasion',
      'pilot':'skill_pilot','ride':'skill_ride','stealth':'skill_stealth','survival':'skill_survival','treat injury':'skill_treat_injury',
      'use computer':'skill_use_computer','deception':'skill_deception','gather information':'skill_gather_information'
    }
    for k,v in mapping.items():
        if k in lt: add(tags,v,'skills')
    return tags

def weapon_tags(name,text,tags):
    lt=(name+' '+text).lower()
    if 'lightsaber' in lt: add(tags,'lightsaber','weapon_lightsaber')
    if 'pistol' in lt: add(tags,'weapon_pistol','offense_ranged')
    if 'rifle' in lt: add(tags,'weapon_rifle','offense_ranged')
    if 'heavy weapon' in lt or '(heavy)' in lt: add(tags,'weapon_heavy','offense_ranged')
    if 'advanced melee' in lt: add(tags,'weapon_advanced_melee','offense_melee')
    if 'exotic' in lt: add(tags,'weapon_exotic')
    if 'melee weapon' in lt: add(tags,'weapon_melee','offense_melee')
    if 'ranged attack' in lt or 'ranged weapon' in lt: add(tags,'offense_ranged')
    return tags

def soldier_tags(name,text):
    t=['soldier','martial']
    lower=(name+' '+text).lower()
    if any(k in lower for k in ['armor','armored','shield']): add(t,'defense','durability','armor_synergy')
    if any(k in lower for k in ['cover','draw fire','hard target','harm\'s way','ward','bodyguard']): add(t,'defense','protector','ally_support')
    if any(k in lower for k in ['squad','combined fire','command','coordinated','comrades','stick together','one for the team']): add(t,'leader','teamwork','ally_support')
    if any(k in lower for k in ['ambush','trap','perceptive ambusher','spring the trap']): add(t,'ambush','setup','skill_stealth','skill_perception')
    if any(k in lower for k in ['grapple','grab','strong grab']): add(t,'grapple','control','offense_melee')
    if any(k in lower for k in ['brawler','punch','cantina','dirty fighting','counterpunch','stunning strike','hammerblow']): add(t,'brawler','offense_melee','control')
    if any(k in lower for k in ['melee','bayonet','phalanx','impaling','unbalance strike','stinging assault']): add(t,'offense_melee')
    if any(k in lower for k in ['fire at will','trajectory','targeting','gun club','suppression','focused targeting']): add(t,'offense_ranged','accuracy')
    if any(k in lower for k in ['devastating','penetrating','crushing','smash','brute','ruthless','unrelenting']): add(t,'damage_scaling','burst_damage')
    if any(k in lower for k in ['indomitable','tough as nails','juggernaut','grit','determination']): add(t,'survivability','defense')
    if 'jet pack' in lower: add(t,'mobility','flight','vehicle')
    if 'demolition' in lower or 'make do' in lower: add(t,'demolitions','tech')
    return t

def category_specific(category,name,text):
    lower=(name+' '+text).lower()
    t=list(COMMON[category])
    if category=='Elite Trooper':
        if any(k in lower for k in ['armor','guard','take the hit','lifesaver','ward','shoulder to shoulder']): add(t,'defense','protector','ally_support')
        if any(k in lower for k in ['burst','attack','critical','yield','ignore armor','whirling death']): add(t,'offense_melee' if 'melee' in lower else 'offense_ranged','burst_damage')
        if any(k in lower for k in ['mandalorian']): add(t,'mandalorian','mobility' if 'advance' in lower else 'durability')
        if any(k in lower for k in ['reload','weapon shift','multiattack','weapon focus','specialization']): add(t,'action_economy','weapon_mastery')
    elif category=='Ace Pilot':
        add(t,'skill_pilot','vehicle_combat','dogfight')
        if any(k in lower for k in ['evasion','juke','small target','blind spot','close scrape','close cover']): add(t,'defense','mobility')
        if any(k in lower for k in ['attack run','gunner','great shot','all fire','hit','trigger','system hit','punch through']): add(t,'offense_ranged','accuracy','burst_damage')
        if any(k in lower for k in ['escort','wingman','squadron','regroup','interference']): add(t,'ally_support','teamwork','leader')
        if any(k in lower for k in ['outrun','lose pursuit','relentless pursuit','full throttle']): add(t,'mobility','chase')
    elif category=='Officer':
        add(t,'ally_support','teamwork','command')
        if any(k in lower for k in ['tactics','edge','deployment','outmaneuver']): add(t,'leader','battlefield_control','setup')
        if any(k in lower for k in ['withdrawal','stay in the fight','numbers','sacrifice']): add(t,'survivability','morale')
        if any(k in lower for k in ['recruit','legendary commander','grand leader']): add(t,'resources','social')
        if any(k in lower for k in ['fleet']): add(t,'starship','vehicle','leader')
    elif category=='Bounty Hunter':
        add(t,'pursuit','single_target')
        if any(k in lower for k in ['mark','target','tag','findsman','visions','foresight','omens']): add(t,'tracking','skill_survival','skill_perception','setup')
        if any(k in lower for k in ['fear','notorious','negotiator']): add(t,'social_control','fear','skill_persuasion')
        if any(k in lower for k in ['jedi hunter','force blank','telekinetic resistance','lightsaber evasion']): add(t,'anti_force','defense')
        if any(k in lower for k in ['precision fire','relentless']): add(t,'offense_ranged','precision_damage')
    elif category=='Gunslinger':
        add(t,'weapon_pistol','weapon_rifle','accuracy')
        if any(k in lower for k in ['shot','fire','draw','trigger','blast','hailfire','twin shot']): add(t,'offense_ranged')
        if any(k in lower for k in ['quick draw','shoot from the hip','snap shot','opportunity fire']): add(t,'action_economy','reaction')
        if any(k in lower for k in ['disarm','knockdown','debilitating','flank','deceptive']): add(t,'control','setup')
        if any(k in lower for k in ['mobile','dash']): add(t,'mobility','hit_and_run')
    elif category=='Crime Lord':
        add(t,'ally_support','social_control','fear')
        if any(k in lower for k in ['bodyguard','tactical withdrawal','tactical superiority']): add(t,'protector','teamwork')
        if any(k in lower for k in ['inspire','frighten','terrify','fear me']): add(t,'fear','morale')
        if any(k in lower for k in ['ally','minion','wealth','shelter','notoriety']): add(t,'resources','followers')
        if any(k in lower for k in ['urgency','impel']): add(t,'action_economy','leader')
    elif category=='Master Privateer':
        add(t,'offense_ranged','offense_melee','boarding')
        if any(k in lower for k in ['blade','boarder','alive']): add(t,'offense_melee','control')
        if any(k in lower for k in ['spacer','ion','privateer']): add(t,'vehicle','starship')
        if any(k in lower for k in ['frenzy','surge','bloodthirsty']): add(t,'burst_damage')
        if any(k in lower for k in ['reputation','attract privateer']): add(t,'followers','social')
    elif category=='Saboteur':
        add(t,'tech','demolitions','battlefield_control')
        if 'turret' in lower: add(t,'turret','new_action','setup')
        if any(k in lower for k in ['explosion','mine','self-destruct']): add(t,'area_damage','offense_ranged')
        if any(k in lower for k in ['jammer']): add(t,'droid_control','tech_control')
    elif category=='Military Engineer':
        add(t,'tech','skill_mechanics')
        if any(k in lower for k in ['explosive','breach','sabotage']): add(t,'demolitions','control')
        if any(k in lower for k in ['droid','vehicular','modifications','repairs']): add(t,'vehicle','droid','support')
        if any(k in lower for k in ['problem solver','tech savant']): add(t,'knowledge','skills')
    elif category=='Melee Duelist':
        add(t,'finesse','mobility')
        if any(k in lower for k in ['flourish','elegance','advantageous','single weapon','dual weapon']): add(t,'duelist','style')
        if any(k in lower for k in ['dirty tricks','out of nowhere']): add(t,'setup','stealth','control')
        if 'multiattack' in lower: add(t,'weapon_mastery','action_economy')
    elif category=='Gladiator':
        add(t,'fear','crowd_control')
        if any(k in lower for k in ['brutal','vendetta','unstoppable']): add(t,'burst_damage','survivability')
        if any(k in lower for k in ['lockdown','distracting','call out']): add(t,'control','marking')
        if 'exotic' in lower: add(t,'weapon_exotic','weapon_mastery')
    elif category=='Infiltrator':
        add(t,'skill_stealth','setup','precision_damage')
        if any(k in lower for k in ['concealed weapon','silent','creeping']): add(t,'stealth','ambush')
        if any(k in lower for k in ['stun','takedown']): add(t,'control','single_target')
        if 'always ready' in lower: add(t,'initiative','reaction')
    return t

p=Path('packs/talents.db')
out=[]
count=0
for line in p.read_text().splitlines():
    if not line.strip():
        continue
    o=json.loads(line)
    sys=o.get('system',{})
    cat=sys.get('category') or ''
    if cat in TARGET_CATEGORIES:
        desc=sys.get('description') or {}
        desc_val=desc if isinstance(desc,str) else (desc.get('value') or '')
        text=(sys.get('benefit') or '')+' '+desc_val+' '+(sys.get('prerequisites') or '')
        if cat=='Soldier':
            tags=soldier_tags(o['name'],text)
        else:
            tags=category_specific(cat,o['name'],text)
        action_tags(text,tags)
        skill_tags(text,tags)
        weapon_tags(o['name'],text,tags)
        if 'strength modifier' in text.lower(): add(tags,'ability_strength','strength_synergy')
        if 'dexterity modifier' in text.lower(): add(tags,'ability_dexterity','dexterity_synergy')
        if 'constitution modifier' in text.lower(): add(tags,'ability_constitution','constitution_synergy')
        if 'charisma modifier' in text.lower(): add(tags,'ability_charisma','charisma_synergy')
        if 'wisdom modifier' in text.lower(): add(tags,'ability_wisdom','wisdom_synergy')
        if 'intelligence modifier' in text.lower(): add(tags,'ability_intelligence','intelligence_synergy')
        if 'trained in' in text.lower(): add(tags,'prerequisite_sensitive')
        if 'force point' in text.lower(): add(tags,'resource_spend','force_point_spend')
        if 'reroll' in text.lower(): add(tags,'reroll')
        if 'damage' in text.lower(): add(tags,'damage_scaling')
        if 'gain a +2 bonus' in text.lower() or 'gain a +5 bonus' in text.lower(): add(tags,'accuracy' if 'attack' in text.lower() else 'utility_bonus')
        sys['tags']=remove_noise(tags)
        count+=1
        o['system']=sys
    out.append(json.dumps(o,separators=(',',':')))

p.write_text('\n'.join(out)+'\n')
print('curated',count)
