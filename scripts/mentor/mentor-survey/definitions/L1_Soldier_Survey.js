
import { buildSurveyDefinition } from '../definition-builder.js';
const survey = buildSurveyDefinition({ surveyId:'L1_Soldier', classId:'soldier', displayName:'Soldier', mentorKey:'default', archetypes:[
  { id:'heavy_weapons_specialist', name:'Heavy Weapons Specialist', notes:'Autofire-focused build that dominates space and pressures multiple enemies simultaneously.', mechanicalBias:{ burstDamage:3, areaDamage:3, accuracy:2, areaControl:2 }, roleBias:{ controller:2, striker:3 }, attributeBias:{ str:3, con:2, dex:1 } },
  { id:'armored_shock_trooper', name:'Tank', notes:'Heavy armor frontline build designed to absorb punishment and maintain offensive pressure.', mechanicalBias:{ damageReduction:2, armorMastery:3, meleeDamage:2 }, roleBias:{ bruiser:3, defender:3 }, attributeBias:{ str:3, con:3 } },
  { id:'precision_rifleman', name:'Infantry', notes:'Long-range accuracy-focused build emphasizing aimed shots and critical expansion.', mechanicalBias:{ singleTargetDamage:3, accuracy:3, critRange:2 }, roleBias:{ striker:3 }, attributeBias:{ dex:3, int:1, con:1 } },
  { id:'close_quarters_breacher', name:'Brawler', notes:'Short-range aggressive build specializing in tight-quarters combat and high burst damage.', mechanicalBias:{ singleTargetDamage:3, accuracy:2, evasion:1, areaDamage:2 }, roleBias:{ striker:3, bruiser:2 }, attributeBias:{ str:2, dex:2, con:2 } },
  { id:'battlefield_enforcer', name:'Sargent', notes:'Build focused on pushing enemies down the condition track and maintaining combat pressure.', mechanicalBias:{ conditionTrack:3, accuracy:2 }, roleBias:{ controller:3, bruiser:2 }, attributeBias:{ str:2, con:2, dex:2 } }
]});
export default survey;
