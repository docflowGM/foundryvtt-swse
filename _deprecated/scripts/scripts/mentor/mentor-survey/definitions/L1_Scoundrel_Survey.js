import { buildSurveyDefinition } from '../definition-builder.js';

const answer = (d) => d;

const branchQuestion = {
  id: 'q5_identity_statement',
  text: 'Which one sounds most like you?',
  branchOn: 'q1_operator_type',
  branches: {
    pirate: [
      answer({ id:'pirate_1', label:"If it flies, floats, or pays, I can work with it.", detailRailTitle:'Will Work for the Right Price', detailRailText:'You trust nerve, motion, and whatever keeps the credits flowing.', detailTags:['Pilot','Profit','Flexibility','Nerve'], biases:{ skillBias:['pilot','deception'], prestigeBias:['master_privateer','ace_pilot'], featBias:['vehicle','mobility'], talentBias:['pilot','mobility'] } }),
      answer({ id:'pirate_2', label:"A good crew's worth more than a clean conscience.", detailRailTitle:'Crew Over Conscience', detailRailText:'You value loyalty, survival, and a crew that gets paid together.', detailTags:['Loyalty','Leadership','Profit','Survival'], biases:{ skillBias:['persuasion','gatherInformation'], prestigeBias:['crime_lord','master_privateer'], featBias:['social','support'], talentBias:['leadership','crew'] } }),
      answer({ id:'pirate_3', label:"The stars don't care about the law, and neither do I.", detailRailTitle:'Above the Law', detailRailText:'You trust freedom, speed, and staying one jump ahead of people with badges.', detailTags:['Freedom','Pilot','Defiance','Mobility'], biases:{ skillBias:['pilot','initiative'], prestigeBias:['outlaw','ace_pilot'], featBias:['vehicle','initiative'], talentBias:['pilot','escape'] } }),
      answer({ id:'pirate_4', label:'You call it theft. I call it redistribution with style.', detailRailTitle:'Redistribution with Style', detailRailText:'You treat swagger, timing, and profit like parts of the same trick.', detailTags:['Swagger','Deception','Profit','Reputation'], biases:{ skillBias:['deception','persuasion'], prestigeBias:['charlatan','master_privateer'], featBias:['social','utility'], talentBias:['deception','style'] } })
    ],
    trickster: [
      answer({ id:'trickster_1', label:'The best con is the one they thank you for.', detailRailTitle:'Thanked for the Con', detailRailText:'You trust misdirection, charm, and letting the mark do half the work for you.', detailTags:['Deception','Persuasion','Style','Timing'], biases:{ skillBias:['deception','persuasion'], prestigeBias:['charlatan'], featBias:['social','deception'], talentBias:['deception','manipulation'] } }),
      answer({ id:'trickster_2', label:"If they're looking at my hands, they're missing the real trick.", detailRailTitle:'Misdirection First', detailRailText:'You rely on distraction, sleight, and keeping the real move out of sight.', detailTags:['Deception','Stealth','Timing','Control'], biases:{ skillBias:['deception','stealth'], prestigeBias:['charlatan','outlaw'], featBias:['deception','stealth'], talentBias:['infiltration','deception'] } }),
      answer({ id:'trickster_3', label:'A lie only needs to live long enough to pay.', detailRailTitle:'Lies That Pay', detailRailText:'You do not need the lie forever. You just need it until the credits clear.', detailTags:['Deception','Profit','Nerve','Opportunism'], biases:{ skillBias:['deception','gatherInformation'], prestigeBias:['charlatan','crime_lord'], featBias:['deception','utility'], talentBias:['deception','schemes'] } }),
      answer({ id:'trickster_4', label:"I don't need muscle. I need timing.", detailRailTitle:'Timing Beats Muscle', detailRailText:'You trust timing, angle, and the small opening other people miss.', detailTags:['Timing','Initiative','Deception','Precision'], biases:{ skillBias:['initiative','deception'], prestigeBias:['charlatan','assassin'], featBias:['initiative','precision'], talentBias:['timing','precision'] } })
    ],
    gunslinger: [
      answer({ id:'gunslinger_1', label:"I've got the fastest draw in the Outer Rim.", detailRailTitle:'Fastest Draw', detailRailText:'You trust speed, nerve, and ending trouble before anyone else gets their say.', detailTags:['Initiative','Precision','Swagger','Quickdraw'], biases:{ skillBias:['initiative','perception'], prestigeBias:['gunslinger'], featBias:['initiative','ranged','accuracy'], talentBias:['precision','quickdraw','ranged'] } }),
      answer({ id:'gunslinger_2', label:'Fast hands settle slow arguments.', detailRailTitle:'Fast Hands', detailRailText:'You believe hesitation kills more people than bad aim.', detailTags:['Initiative','Nerve','Precision','Aggression'], biases:{ skillBias:['initiative','perception'], prestigeBias:['gunslinger'], featBias:['initiative','ranged'], talentBias:['quickdraw','precision'] } }),
      answer({ id:'gunslinger_3', label:"If I've drawn, I've already decided.", detailRailTitle:'Decision Made', detailRailText:'You reach for the blaster because the moment is over, not because it is beginning.', detailTags:['Precision','Confidence','Threat','Finality'], biases:{ skillBias:['initiative','perception'], prestigeBias:['gunslinger','assassin'], featBias:['ranged','accuracy'], talentBias:['precision','finisher'] } }),
      answer({ id:'gunslinger_4', label:'You can bluff all day. I prefer cleaner math.', detailRailTitle:'Cleaner Math', detailRailText:'You trust aim, timing, and the kind of certainty that comes from a clean shot.', detailTags:['Precision','Perception','Simplicity','Accuracy'], biases:{ skillBias:['perception','initiative'], prestigeBias:['gunslinger'], featBias:['accuracy','ranged'], talentBias:['precision','ranged'] } })
    ],
    con_man: [
      answer({ id:'conman_1', label:'People hear what they want. I just help.', detailRailTitle:'Tell Them What They Want', detailRailText:'You know most people want to believe something. You just make it easy for them.', detailTags:['Persuasion','Deception','Reading People','Profit'], biases:{ skillBias:['persuasion','deception','gatherInformation'], prestigeBias:['charlatan','crime_lord'], featBias:['social','utility'], talentBias:['manipulation','social'] } }),
      answer({ id:'conman_2', label:'Trust is the easiest thing in the galaxy to counterfeit.', detailRailTitle:'Counterfeit Trust', detailRailText:'You treat trust like any other commodity: useful, portable, and easy to fake if you know how.', detailTags:['Deception','Persuasion','Leverage','Confidence'], biases:{ skillBias:['deception','persuasion'], prestigeBias:['charlatan'], featBias:['social','deception'], talentBias:['deception','confidence'] } }),
      answer({ id:'conman_3', label:"A polished smile opens doors that blasters can't.", detailRailTitle:'Smile Opens Doors', detailRailText:'You trust charm, polish, and the kind of presence that gets people to open the door for you.', detailTags:['Persuasion','Style','Influence','Access'], biases:{ skillBias:['persuasion','gatherInformation'], prestigeBias:['charlatan','crime_lord'], featBias:['social','utility'], talentBias:['presence','influence'] } }),
      answer({ id:'conman_4', label:"If they remember me, I did it wrong.", detailRailTitle:'Leave No Trace', detailRailText:'You prefer clean work, forgettable faces, and no stories worth repeating.', detailTags:['Stealth','Deception','Precision','Escape'], biases:{ skillBias:['stealth','deception'], prestigeBias:['assassin','charlatan'], featBias:['stealth','utility'], talentBias:['infiltration','deception'] } })
    ],
    saboteur: [
      answer({ id:'saboteur_1', label:'Everything breaks if you know where to press.', detailRailTitle:'Know Where to Press', detailRailText:'You see every system as a weak point waiting for the right hands.', detailTags:['Mechanics','Precision','Systems','Disruption'], biases:{ skillBias:['mechanics','knowledge'], prestigeBias:['military_engineer'], featBias:['utility','technical'], talentBias:['sabotage','systems'] } }),
      answer({ id:'saboteur_2', label:"The trick ain't the blast. It's the timing.", detailRailTitle:'Timing the Blast', detailRailText:'You care less about the boom than the exact second it matters.', detailTags:['Mechanics','Initiative','Timing','Destruction'], biases:{ skillBias:['mechanics','initiative'], prestigeBias:['military_engineer','assassin'], featBias:['technical','initiative'], talentBias:['timing','sabotage'] } }),
      answer({ id:'saboteur_3', label:"I don't fight fair. I fight smart.", detailRailTitle:'Fight Smart', detailRailText:'You trust tools, traps, and whatever makes the other side regret walking in.', detailTags:['Use Computer','Mechanics','Utility','Control'], biases:{ skillBias:['useComputer','mechanics'], prestigeBias:['military_engineer','outlaw'], featBias:['technical','utility'], talentBias:['sabotage','control'] } }),
      answer({ id:'saboteur_4', label:"If the whole place goes dark, that was probably me.", detailRailTitle:'Probably Me', detailRailText:'You do not need the spotlight. You just need the lights off.', detailTags:['Use Computer','Systems','Sabotage','Chaos'], biases:{ skillBias:['useComputer','knowledge','mechanics'], prestigeBias:['military_engineer'], featBias:['technical','utility'], talentBias:['systems','sabotage'] } })
    ]
  }
};

const survey = buildSurveyDefinition({
  surveyId: 'L1_Scoundrel',
  classId: 'scoundrel',
  displayName: 'Scoundrel',
  mentorKey: 'Scoundrel',
  archetypes: [
    { id:'opportunistic_precision_striker', name:'Pirate', notes:'You live by speed, nerve, opportunism, and whatever keeps the credits flowing.', mechanicalBias:{ deadlyPrecision:3, singleTargetDamage:2, accuracy:2 }, roleBias:{ striker:2, skirmisher:1 }, attributeBias:{ dex:2, cha:1, int:1 } },
    { id:'debilitating_trickster', name:'Trickster', notes:'You win by timing, deception, and making people believe the wrong thing at the worst possible moment.', mechanicalBias:{ conditionTrack:2, socialManipulation:2, skillUtility:1 }, roleBias:{ controller:2, utility:1 }, attributeBias:{ dex:1, cha:2, int:1 } },
    { id:'gunslinger_duelist', name:'Gunslinger', notes:'You trust fast hands, quick reads, and ending trouble before it gets a second shot.', mechanicalBias:{ accuracy:3, critRange:2, singleTargetDamage:2 }, roleBias:{ striker:3 }, attributeBias:{ dex:3, cha:1 } },
    { id:'social_manipulator', name:'Con-Man', notes:'You work people, read tells, and know how to turn trust into profit.', mechanicalBias:{ socialManipulation:3, skillUtility:2, networkInfluence:1 }, roleBias:{ utility:2, controller:1 }, attributeBias:{ cha:3, int:1 } },
    { id:'saboteur_technician', name:'Saboteur', notes:'You break systems, crack devices, and ruin plans with the right tool in the right place.', mechanicalBias:{ hackingSkills:3, skillUtility:3, areaControl:2 }, roleBias:{ controller:2, utility:2 }, attributeBias:{ int:3, dex:1 } }
  ],
  questions: [
    {
      id: 'q1_operator_type',
      text: 'What kind of scoundrel are you?',
      options: [
        answer({ id:'pirate', label:'Pirate', detailRailTitle:'Pirate', detailRailText:'You live by speed, nerve, opportunism, and whatever keeps the credits flowing.', detailTags:['Pilot','Initiative','Swagger','Freedom'], archetypeHint:'opportunistic_precision_striker', biases:{ skillBias:['pilot','initiative','deception'], prestigeBias:['master_privateer','ace_pilot','outlaw'] } }),
        answer({ id:'trickster', label:'Trickster', detailRailTitle:'Trickster', detailRailText:'You win by timing, deception, and making people believe the wrong thing at the worst possible moment.', detailTags:['Deception','Timing','Misdirection','Nerve'], archetypeHint:'debilitating_trickster', biases:{ skillBias:['deception','gatherInformation','stealth'], prestigeBias:['charlatan','crime_lord','outlaw'] } }),
        answer({ id:'gunslinger', label:'Gunslinger', detailRailTitle:'Gunslinger', detailRailText:'You trust fast hands, quick reads, and ending trouble before it gets a second shot.', detailTags:['Initiative','Perception','Precision','Nerve'], archetypeHint:'gunslinger_duelist', biases:{ skillBias:['initiative','perception','stealth'], prestigeBias:['gunslinger','assassin','outlaw'] } }),
        answer({ id:'con_man', label:'Con-Man', detailRailTitle:'Con-Man', detailRailText:'You work people, read tells, and know how to turn trust into profit.', detailTags:['Persuasion','Deception','Information','Leverage'], archetypeHint:'social_manipulator', biases:{ skillBias:['deception','persuasion','gatherInformation'], prestigeBias:['charlatan','crime_lord'] } }),
        answer({ id:'saboteur', label:'Saboteur', detailRailTitle:'Saboteur', detailRailText:'You break systems, crack devices, and ruin plans with the right tool in the right place.', detailTags:['Mechanics','Use Computer','Disruption','Precision'], archetypeHint:'saboteur_technician', biases:{ skillBias:['mechanics','useComputer','knowledge'], prestigeBias:['military_engineer','assassin','outlaw'] } })
      ]
    },
    {
      id: 'q2_first_instinct',
      text: "When the blaster bolts start flying, what's your first instinct?",
      options: [
        answer({ id:'keep_moving', label:'Keep moving', detailRailTitle:'Keep Moving', detailRailText:"If they can't pin you down, they can't finish the job.", detailTags:['Acrobatics','Initiative','Mobility','Survival'], biases:{ skillBias:['acrobatics','initiative'], featBias:['mobility','initiative','evasive'], talentBias:['skirmish','positioning'] } }),
        answer({ id:'stay_out_of_sight', label:'Stay out of sight', detailRailTitle:'Stay Out of Sight', detailRailText:'Best way to stay alive is not to be the easiest thing to shoot.', detailTags:['Stealth','Deception','Perception','Evasion'], biases:{ skillBias:['stealth','deception','perception'], featBias:['stealth','ambush','evasive'], talentBias:['infiltration','concealment'] } }),
        answer({ id:'drop_the_right_target', label:'Drop the right target', detailRailTitle:'Drop the Right Target', detailRailText:"You don't waste effort. You pick the one that matters and end the problem there.", detailTags:['Initiative','Perception','Precision','Target Selection'], biases:{ skillBias:['initiative','perception'], prestigeBias:['gunslinger','assassin'], featBias:['precision','initiative','ranged_support'], talentBias:['striker','target_focus'] } }),
        answer({ id:'talk_your_way_through_it', label:'Talk your way through it', detailRailTitle:'Talk Your Way Through It', detailRailText:"Sometimes the best escape route is whatever comes out of your mouth next.", detailTags:['Persuasion','Deception','Gather Information','Nerve'], biases:{ skillBias:['persuasion','deception','gatherInformation'], featBias:['social','deceptive','utility'], talentBias:['manipulation','control'] } }),
        answer({ id:'let_the_gear_do_the_work', label:'Let the gear do the work', detailRailTitle:'Let the Gear Do the Work', detailRailText:"If you packed right, the answer's already in your bag.", detailTags:['Mechanics','Use Computer','Knowledge','Preparation'], biases:{ skillBias:['mechanics','useComputer','knowledge'], prestigeBias:['military_engineer'], featBias:['utility','gear','technical'], talentBias:['sabotage','tools','technical'] } })
      ]
    },
    {
      id: 'q3_work_taught_you',
      text: 'What kind of work taught you the most?',
      options: [
        answer({ id:'smuggling_runs', label:'Smuggling runs', detailRailTitle:'Smuggling Runs', detailRailText:"You learned how to stay moving, keep your mouth shut, and get valuable things past people who said you couldn't.", detailTags:['Pilot','Deception','Initiative','Nerve'], biases:{ skillBias:['pilot','deception','initiative'], prestigeBias:['master_privateer','ace_pilot','outlaw'] } }),
        answer({ id:'slicing_jobs', label:'Slicing jobs', detailRailTitle:'Slicing Jobs', detailRailText:'You learned that locked systems just mean somebody else built the door.', detailTags:['Use Computer','Mechanics','Knowledge','Access'], biases:{ skillBias:['useComputer','mechanics','knowledge'], prestigeBias:['military_engineer'] } }),
        answer({ id:'street_hustles', label:'Street hustles', detailRailTitle:'Street Hustles', detailRailText:'You learned how to read marks, work crowds, and turn talk into money.', detailTags:['Deception','Persuasion','Gather Information','Survival'], biases:{ skillBias:['deception','persuasion','gatherInformation'], prestigeBias:['charlatan','crime_lord'] } }),
        answer({ id:'bounty_work', label:'Bounty work', detailRailTitle:'Bounty Work', detailRailText:"You learned how to find people who don't want to be found and make sure they stop running.", detailTags:['Perception','Initiative','Stealth','Pursuit'], biases:{ skillBias:['perception','initiative','stealth'], prestigeBias:['assassin','gunslinger','outlaw'] } }),
        answer({ id:'salvage_ops', label:'Salvage ops', detailRailTitle:'Salvage Ops', detailRailText:'You learned how to pull value out of wreckage and keep working with whatever was still standing.', detailTags:['Mechanics','Pilot','Knowledge','Resourcefulness'], biases:{ skillBias:['mechanics','pilot','knowledge'], prestigeBias:['military_engineer','master_privateer'] } }),
        answer({ id:'card_tables', label:'Card tables', detailRailTitle:'Card Tables', detailRailText:'You learned that people tell the truth with their eyes long before they do it with their mouths.', detailTags:['Deception','Persuasion','Gather Information','Reading People'], biases:{ skillBias:['deception','persuasion','gatherInformation'], prestigeBias:['charlatan','crime_lord'] } }),
        answer({ id:'demolition_work', label:'Demolition work', detailRailTitle:'Demolition Work', detailRailText:"You learned that the trick ain't making something explode. It's knowing exactly when it should.", detailTags:['Mechanics','Knowledge','Initiative','Destruction'], biases:{ skillBias:['mechanics','knowledge','initiative'], prestigeBias:['military_engineer'] } })
      ]
    },
    {
      id: 'q4_payday',
      text: 'What sort of payday are you angling for after this?',
      options: [
        answer({ id:'ace_pilot', label:"I'm the best pilot in the galaxy", detailRailTitle:'Ace Pilot', detailRailText:'You want speed, control, and a cockpit where nobody can keep up with you.', detailTags:['Pilot','Speed','Control','Swagger'], biases:{ skillBias:['pilot','initiative'], prestigeBias:['ace_pilot'] } }),
        answer({ id:'crime_lord', label:"The real money isn't doing jobs", detailRailTitle:'Crime Lord', detailRailText:"You don't want to keep taking orders. You want to own the people giving them.", detailTags:['Control','Influence','Underworld','Power'], biases:{ skillBias:['deception','persuasion','gatherInformation'], prestigeBias:['crime_lord'] } }),
        answer({ id:'master_privateer', label:'I like fast ships and easy money', detailRailTitle:'Master Privateer', detailRailText:'You want the stars, the score, and the kind of freedom that comes with a fast engine and a bad reputation.', detailTags:['Pilot','Enterprise','Mobility','Profit'], biases:{ skillBias:['pilot','initiative','deception'], prestigeBias:['master_privateer'] } }),
        answer({ id:'assassin', label:"I'm not proud of what I do, but it pays the bills.", detailRailTitle:'Assassin', detailRailText:"You don't romanticize the work. You just finish it clean and collect.", detailTags:['Stealth','Precision','Perception','Efficiency'], biases:{ skillBias:['stealth','perception','initiative'], prestigeBias:['assassin'] } }),
        answer({ id:'outlaw', label:'Rules are made to be broken', detailRailTitle:'Outlaw', detailRailText:"You don't bend the rules. You make a point of stepping over them.", detailTags:['Defiance','Survival','Nerve','Freedom'], biases:{ skillBias:['deception','initiative','stealth'], prestigeBias:['outlaw'] } }),
        answer({ id:'charlatan', label:"If you ain't cheatin', you ain't tryin'.", detailRailTitle:'Charlatan', detailRailText:"You believe fair play is just what people say when they're losing.", detailTags:['Deception','Persuasion','Style','Opportunism'], biases:{ skillBias:['deception','persuasion','gatherInformation'], prestigeBias:['charlatan'] } }),
        answer({ id:'military_engineer', label:'Machines, computers, weapons, all the same to me.', detailRailTitle:'Military Engineer', detailRailText:'To you, every machine is just a problem waiting for the right hands.', detailTags:['Mechanics','Use Computer','Knowledge','Systems'], biases:{ skillBias:['mechanics','useComputer','knowledge'], prestigeBias:['military_engineer'] } }),
        answer({ id:'gunslinger_prestige', label:"I've got the fastest draw in the Outer Rim", detailRailTitle:'Gunslinger', detailRailText:'You trust fast hands, a clean read, and ending trouble before the other fool finishes thinking.', detailTags:['Initiative','Precision','Nerve','Quickdraw'], biases:{ skillBias:['initiative','perception'], prestigeBias:['gunslinger'] } })
      ]
    },
    branchQuestion
  ]
});

export default survey;
