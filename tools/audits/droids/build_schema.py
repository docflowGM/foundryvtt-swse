import json, pathlib, copy
ROOT=pathlib.Path(__file__).resolve().parents[3] / 'data/audits/droids'

DRAFT='swse.droid.universal-source/0.1-draft'

def scalar(t,desc):
    return {'type':[t,'null'],'description':desc}
def txt(desc): return scalar('string',desc)
def num(desc): return scalar('number',desc)
def integer(desc): return scalar('integer',desc)
def boolean(desc): return scalar('boolean',desc)
def choice(items,desc,nullable=True):return {'type':['string','null'] if nullable else 'string','enum':items+([None] if nullable else []),'description':desc}
def arr(item,desc):return {'type':['array','null'],'items':item,'description':desc}
def obj(props,desc,required=(),nullable=False):
    return {'type':['object','null'] if nullable else 'object','description':desc,'properties':props,'required':list(required),'additionalProperties':False}
def sarr(desc):return arr({'type':'string'},desc)
def lnk(desc):return txt(desc+' Never inferred from name alone.')

source=obj({
 'book':txt('Exact printed book title'), 'page':integer('Printed page number, not PDF index'),
 'textLine1Based':integer('One-based line in searchable source TXT'), 'pdfPage1Based':integer('One-based PDF page'),
 'citationLabel':txt('Citation to printed rule/record'), 'verifiedBy':choice(['txt','pdf-visual','errata','owner-adjudication'],'Verification level'),
 'sourceEntryKey':lnk('Publication-specific source identity')
},'Publication-specific source citation. No inferred page if unverified.',required=['book'])
rule=obj({
 'ruleId':txt('Stable, scoped rule identifier'), 'statement':txt('Source-mechanical claim; use own text when public distribution is intended'),
 'scope':txt('Exact model, size, host type or action condition'), 'source':source,
 'effectRef':lnk('Existing engine or registry effect identifier'),
 'executionStatus':choice(['source-only','pending-certification','certified-runtime','blocked-conflict'],'Certification is independent of source text'),
 'precedenceDecisionId':lnk('Owner-approved controlling decision (not automatically inferred)'),
 'competingClaims':arr(source,'Alternative conflicting published statements'),
},'Source-scoped rules claim with no automatic runtime execution.',required=['ruleId'])
component=obj({
 'instanceId':txt('Stable per-instance ID inside one record, not a manufacturer model key'),
 'name':txt('Published component name'),
 'componentCategory':choice(['appendage','locomotion','processor','sensor','communications','tools','armor','weapon','storage','accessory','power','control','other'],'Physical droid component family'),
 'source':source, 'catalogRef':lnk('Canonical equipment/droid-system authority reference'),
 'physicalLocationId':lnk('Physical location/attachment position; NEVER generic upgrade-slot count'),
 'mountRef':lnk('Exact equipment/weapon mount identity'),
 'count':integer('Only explicitly printed number of component instances; count does not grant actions'),
 'systemRules':arr(rule,'Model-specific installed behavior'),
 'isFactoryInstalled':boolean('True only if printed as factory-equipped; not assumed by a statblock example'),
 'isActiveByDefault':boolean('True/false only if source establishes activation default'),
 'notes':txt('Printed equipment/system context and unresolved mappings')
},'Installed physical droid-system item; never manufacture instances from generic text.',required=['instanceId','name'])

attack=obj({
 'attackId':txt('Local published attack-row identifier; not a physical weapon mount'),
 'raw':txt('Printed attack expression, including AND/OR'),
 'name':txt('Published attack label'), 'attackBonus':integer('Total printed bonus, not an additive bonus to BAB'),
 'damageExpression':txt('Printed damage exactly; not a generated weapon definition'),
 'damageType':txt('Published damage descriptor'),
 'actionType':txt('Published action type, if explicit'),
 'range':txt('Published range if provided'),
 'source':source,
 'weaponComponentId':lnk('Exact installed weapon instance ID if certified'),
 'vehicleAttackGroupKey':lnk('Vehicle firing-group key for published vehicle-format droid'),
 'condition':txt('Printed prerequisites/conditions; no inferred permission to execute'),
 'operationStatus':choice(['source-only','certified-installed','certified-executable'],'No stock attack unlocked by a printed row'),
},'One printed attack expression; contains no trusted Foundry attack rights.',required=['attackId'])

appliedTrait=obj({
 'traitId':txt('Canonical rules-profile trait ref or source-local ID'), 'name':txt('Published trait label'),
 'value':txt('Published value or text, when present'), 'source':source,
 'rulesRef':lnk('Existing droid/species/progression engine rule'),
 'scope':txt('Exact activation/classification condition'),
 'enabledInRuntime':boolean('True only after independent mechanic certification')
},'Source claim for a model/creation trait, not a second rules engine.',required=['traitId'])

locomotion=obj({
 'instanceId':txt('Per-instance locomotion system identity'), 'mode':txt('walking/wheeled/tracked/hovering/flying/etc exactly or normalized with printed raw'),
 'speedSquares':integer('Character-scale speed'), 'starshipSpeedSquares':integer('Starship-scale speed if printed'),
 'maxKmh':num('Published maximum speed km/h'), 'raw':txt('Printed movement line'),
 'restricted':choice(['exclusive','limited','other','none'],'Restricted locomotion classification only if printed'),
 'requiresAction':txt('Source-specific engage/disengage or alternative mode transition'),
 'usageCondition':txt('Published locomotion constraints'),
 'componentInstanceId':lnk('Link to installed component instance'),
 'source':source,'rules':arr(rule,'Model-specific move/hover/run/altitude rules')
},'Independent locomotion entry; multiple systems coexist without invented extra movement actions.',required=['instanceId'])

carry=obj({
 'amount':num('Printed capacity amount'), 'unit':txt('kg/tonnes/liters/etc as printed'),
 'context':txt('Internal vs external storage vs lift vs hold etc'),
 'source':source
},'Capacity is not equipment slot count, component mount count, or carrying strength.',required=[])

root_properties={
 'schemaVersion':{'const':DRAFT},
 'recordType':{'const':'droid-publication-source-entry'},
 'identity':obj({
  'sourceEntryKey':txt('Stable book-specific statblock identity; duplicates across books remain separate'),
  'printedName':txt('Name exactly as printed'),
  'droidFamilyKey':lnk('Underlying factory lineage, independently reconciled; null until proven'),
  'modelCode':txt('Printed model/series identity'), 'manufacturer':txt('Printed manufacturer, if stated'),
  'variantKey':lnk('Unique source-backed configuration/variant'),
  'baseModelSourceKey':lnk('Publication statblock for related model; never inferred from similar name'),
  'namedIndividual':boolean('True only for a printed individual named character'),
  'aliases':sarr('Alternate printed names; empty only if proven none'),
  'sourcePresentationIds':sarr('Linked protocol/source presentation refs; not duplicated entries'),
 },'Published source identity is immutable; not identical to canonical family or runtime actor.',required=['sourceEntryKey','printedName']),
 'publication':obj({
  'book':txt('Full printed book title'), 'bookId':txt('Census book code'),
  'printedPageStart':integer('Printed page where statblock starts'),
  'printedPageEnd':integer('Printed page where statblock ends'),
  'pdfPageStart1Based':integer('Source PDF page'), 'textLineAnchor1Based':integer('Searchable TXT source line'),
  'printedTypeLine':txt('Exact size/type/degree line'),
  'publicationKind':choice(['model','named-character','squad','vehicle-format-droid','other'],'One printed publication identity; droid squad not factory chassis'),
  'sourceViews':arr(obj({'viewId':txt('Alternate view identifier'), 'format':txt('Protocol or other printed format'), 'source':source},'One printed source representation',required=['viewId']),'Alternate protocol views as source evidence; not duplicated models'),
  'sourceRevision':txt('Official errata or printing when verified')
 },'Printed-source evidence; sourcebook specificity is preserved.',required=['book']),
 'classification':obj({
  'publishedDegree':integer('1-5 when printed; contextual heading is separate and must not be promoted'),
  'contextualDegreeHeading':integer('Nearest section heading, not automatically the printed model degree'),
  'size':choice(['Fine','Diminutive','Tiny','Small','Medium','Large','Huge','Gargantuan','Colossal'],'Published size'),
  'rawSize':txt('Printed size and type line'),
  'ruleEntityNature':choice(['standard-droid','replica-droid','shard-in-droid-shell','vehicle-format-droid','device-derived-droid','other'],'Rules identity; not inferred from printed class names'),
  'statblockFormat':choice(['droid-actor','vehicle','squad','character-template'],'Normalized publication presentation format'),
  'sourceStatblockFormat':txt('Raw census presentation (e.g. starship-scale-droid); do not discard original format identity'),
  'primaryActorAuthority':choice(['droid','vehicle','squad-aggregation'],'Use vehicle engine for autonomous vehicle droids'),
  'role':sarr('Published roles, not deduced from combat loadout'),
  'classTextRaw':txt('Published class line, without inferring Force/organic identity'),
 },'Droid species/body/degree, actor authority and printed formats are distinct.'),
 'challenge':obj({'challengeLevel':integer('Printed CL'), 'raw':txt('Raw CL line')},'Challenge is printed data, not a license for derived formula.'),
 'geometry':obj({
  'reachSquares':integer('Printed reach; limb count does not set it'),
  'fightingSpace':txt('Printed fighting-space expression'),
  'stabilityModifiers':arr(rule,'Size/extra-leg/other scoped stability rules'),
  'cover':txt('Printed enclosure or cover'), 'naturalWeaponContact':txt('Printed contact/appendage reach notes')
 },'Size, fighting space, reach and cover do not automatically derive from limb inventory.'),
 'abilities':obj({
  **{k:integer('Printed '+k.upper()+' score; null is NOT score zero. For no CON use fieldStates explicitly-none.') for k in ['str','dex','con','int','wis','cha']},
  'initiativePrinted':integer('Printed Initiative total, never additive feat bonus'),
  'perceptionPrinted':integer('Printed Perception total'),
  'skills':arr(obj({'name':txt('Skill name'), 'printedTotal':integer('Printed skill total'), 'raw':txt('Raw line'), 'source':source},'Published skill value',required=['name']),'Every skill actually printed'),
  'senses':arr(obj({'name':txt('Sense/sensor label'), 'detail':txt('Published constraints'), 'source':source},'Published sense',required=['name']),'Published senses; may be equipment or processor dependent'),
  'languages':arr(obj({'name':txt('Language'), 'understands':boolean('Understands published language'), 'speaks':boolean('Speaks published language'), 'raw':txt('Verbatim capability description')},'Understanding and speaking are separate capabilities',required=['name']),'Published language capabilities')
 },'Published scores, skills and senses, not derived mechanics or assumptions.'),
 'progression':obj({
  'classLineRaw':txt('Printed classes, levels, and slash ordering'),
  'nonheroicLevels':integer('Printed level count'),
  'classes':arr(obj({'className':txt('Printed class name'), 'level':integer('Level count')},'Class entry',required=['className']),'Source classes, not an eligibility proof'),
  'feats':arr(appliedTrait,'Printed feats and provenance'),
  'talents':arr(appliedTrait,'Printed talents and provenance'),
  'forcePoints':integer('Printed Force Points; not proof of unrestricted Force eligibility'),
  'darkSideScore':integer('Printed Dark Side Score'),
  'conditionalForceCapability':arr(rule,'Specific exemptions for Shard/special droid combat programming')
 },'Printed progression separate from new PC starting choices.'),
 'defenses':obj({
  'reflex':integer('Printed Reflex Defense'), 'flatFootedReflex':integer('Printed flat-footed Reflex'),
  'fortitude':integer('Printed Fortitude'), 'will':integer('Printed Will'),
  'armorBonus':integer('Printed armor contribution'), 'armorNote':txt('Printed chassis armor and loadout context'),
  'damageReduction':integer('Printed DR'), 'shieldRating':integer('Printed SR if any'),
  'immunities':arr(appliedTrait,'Source-scoped immunity claims, including exceptions'),
  'resistances':arr(appliedTrait,'Source-scoped resistance, e.g. extreme heat'),
  'vulnerabilities':arr(appliedTrait,'Source-scoped vulnerabilities'),
  'conditionalDefenseRules':arr(rule,'Conditional cover, shielding or other temporary defenses')
 },'Printed defenses, without silently calculating from feats or sensors.'),
 'durability':obj({
  'hitPoints':integer('Printed maximum HP'), 'damageThreshold':integer('Printed threshold'),
  'conditionTrack':txt('Published condition exception if any'),
  'repairRules':arr(rule,'Model-specific repair/maintenance healing'),
  'maintenanceProfileRef':lnk('Droid maintenance profile, replica exemption, Shard shell etc'),
  'destructionRules':arr(rule,'Specific self-destruct, detonator, or volatile power systems')
 },'Stock max values only. Current HP is never in immutable published source.'),
 'movement':obj({
  'locomotionSystems':arr(locomotion,'Independent installed locomotion systems and modes'),
  'speedLineRaw':txt('Full published Speed line'),
  'specialMovement':arr(rule,'Model-specific climb, run, leap, tether/hover etc'),
  'starshipMovementRef':lnk('Vehicle model source key if the record is vehicle format'),
 },'Printed speed and installed movement systems, not runtime activation state.'),
 'anatomy':obj({
  'bodyPlatformKind':choice(['ordinary-chassis','replica-humanoid','shard-shell','device-body','vehicle-hull','other'],'Body platform not necessarily creature identity'),
  'physicalLocations':arr(obj({
   'locationId':txt('Stable physical attachment/mount location'), 'name':txt('Location label'),
   'locationKind':txt('hand, tool arm, leg, internal bay etc'),
   'installedComponentIds':sarr('Component instance refs actually installed'),
   'capacity':integer('Only model-specific printed number, NOT universal slots')
  },'Physical location only; never a weapon/item modification-slot pool',required=['locationId']),'Only source-established distinct physical locations'),
  'manipulatorCount':integer('Printed functional manipulators, not inferred from walking legs'),
  'locomotionAppendageCount':integer('Printed locomotion limbs'),
  'integratedWeapons':sarr('Physical weapon component IDs, not duplicate weapon profiles'),
  'occupantProfileRef':lnk('Separate Shard or other mind/body occupant profile when applicable'),
  'bodyTraits':arr(appliedTrait,'Body-specific traits; do not assume ordinary droid universal package')
 },'Body/occupant separation; physical components can be many and have no generic pool.'),
 'processor':obj({
  'type':txt('Printed processor classification (basic/heuristic etc)'),
  'brainType':txt('Printed droid brain implementation'),
  'autonomy':choice(['independent','remote-controlled','limited-autonomy','conditional'],'Published controller autonomy'),
  'commandLink':arr(rule,'Network, remote-control, signal-loss and command rules'),
  'personality':txt('Published behavioral or narrative personality'),
  'memory':arr(rule,'Memory capacity/erase restrictions supported by printed source'),
  'processorInstanceId':lnk('Installed processor component instance'),
  'controlHostRef':lnk('Explicit controller reference'),
 },'Processor/controller separate from degree, body and skill.'),
 'programming':obj({
  'behaviorRestrictions':arr(rule,'Inhibition rules and source exceptions'),
  'defaultDuties':sarr('Published programmed tasks or role'),
  'languagesSoftware':arr(rule,'Language packages and translation constraints'),
  'activationTriggers':arr(rule,'Self-destruct or task activation conditions'),
  'reprogramming':arr(rule,'Model-specific PC/GM reprogramming limitations'),
 },'Published behavior; no inferred universal permission from missing restrictions.'),
 'combat':obj({
  'baseAttackBonusPrinted':integer('Published BAB'), 'grapplePrinted':integer('Published grapple total'),
  'attackGroups':arr(attack,'Published attacks only, not installed executable weapon rights'),
  'specialActions':arr(rule,'Published unusual attack options'),
  'firingDelegation':arr(rule,'Vehicle droid brain/crew gunnery rules; reuse vehicle engine'),
  'naturalAttacks':arr(rule,'Published natural/unarmed/manipulator rules'),
  'conditions':arr(rule,'Model-specific tactics, action, or condition modifiers')
 },'Attack expressions separate from physical mounts and trusted runtime attacks.'),
 'capacity':obj({
  'internalStorage':carry, 'externalCargo':carry, 'carryingCapacity':carry,
  'liftingCapacity':carry, 'payload':carry,
  'passengers':integer('Published passengers, only if applicable'),
  'consumables':txt('Published duration'),
  'specialCapacityRules':arr(rule,'Separate cargo/lift capacity modifiers and conditions')
 },'Weight capacity/storage NOT physical attachment slots or equipment upgrades.'),
 'systems':obj({
  'installed':arr(component,'Source-identified factory/presented installed components'),
  'factorySystems':sarr('Stable installed component IDs with factory evidence'),
  'systemPackageRef':lnk('Published chassis/starting package, not manufacturing recipe reconstruction'),
  'sourceSystemsRaw':txt('Original systems/possessions equipment text')
 },'Physical installed system instances; may be null if source provides no information.',nullable=True),
 'equipment':obj({
  'possessions':arr(obj({
    'entryId':txt('Local identity'), 'name':txt('Published item'),
    'itemRef':lnk('Existing Item equipment or weapon authority'),
    'quantity':integer('Printed quantity'), 'isIntegrated':boolean('Only source-proven integration'),
    'componentInstanceId':lnk('Same integrated weapon, not a second entity'),
    'factoryVsPresented':choice(['factory','example-loadout','named-individual','unknown'],'Source distinction')
  },'Possession and item upgrade authority separate from physical chassis',required=['entryId','name']),'Published possessions; [] means source explicitly says none'),
  'chassisArmorRef':lnk('Source armor identity under Armor authority'),
  'deviceToDroidSourceRef':lnk('Scum & Villainy Droidification source identity if applicable'),
 },'Droid-owned items reuse equipment store and its own upgrade slot rules.',nullable=True),
 'modifications':obj({
  'publishedNonFactoryChanges':arr(rule,'Identified installed additions/changes beyond factory baseline'),
  'availablePhysicalLocations':sarr('Only explicit per-model physical mount locations'),
  'droidModifications':arr(rule,'Approved component/droid-system modification facts, separate from equipment slots'),
  'itemUpgradeAuthorityRefs':sarr('External Item-domain V2 modification registry references'),
  'constraints':arr(rule,'Printed compatibility/cost/restriction predicates'),
 },'No universal numeric droid component-slot pool. Null does not mean modifications allowed.',nullable=True),
 'pcConstruction':obj({
  'heroEligibility':choice(['allowed','prohibited','conditional'],'Published permission only; lack of prohibition is not allowance'),
  'heroEligibilityCondition':txt('Published conditional reprogramming/GM permission'),
  'creationRoute':choice(['custom-degree','stock-model','stock-chassis','replica-trait-profile','shard-shell','device-droid','follower','not-applicable'],'Starting route never inferred from NPC class levels'),
  'pcIdentityKind':choice(['ordinary-droid','replica-droid','shard-in-droid-shell','device-derived-droid','other'],'Separate occupant person and body platform'),
  'startingProfileRef':lnk('Source-backed PC creation profile; separate from printed NPC example'),
  'startingSelections':arr(rule,'Selectable free systems/feats according to printed route'),
  'baseTraitPackageRef':lnk('Degree/chassis creation modifiers applied once'),
  'restrictions':arr(rule,'Creation restrictions; absence never means permitted')
 },'Creation rules are not NPC statblock inventory or runtime eligibility authorization.',nullable=True),
 'vehicleLink':obj({
  'vehicleSourceEntryKey':lnk('Exact canonical vehicle authority key; no independent vehicle stats here'),
  'relationKind':choice(['same-publication-actor','shared-model-family','alternate-view'],'Explicit droid/vehicle authority mapping'),
  'vehicleRulesRef':lnk('Existing vehicle combat/movement engine authority'),
  'droidTraitOverlayRefs':sarr('Droid-only traits applied to vehicle host after source certification'),
  'stockWeaponCertification':choice(['unreviewed','blocked','certified'],'Must not infer trusted weapons from droid identity')
 },'Vehicle-format droid links to vehicle SSOT; never duplicates vehicle statblock.',nullable=True),
 'economics':obj({
  'newCredits':integer('Published new market price'), 'usedCredits':integer('Published used price'),
  'estimatedValueCredits':integer('Published estimated/unsaleable appraisal'),
  'availability':txt('Published restriction/legal status'),
  'forSale':boolean('True only if source says purchasable; null does NOT imply yes'),
  'manufacturingCost':integer('Only explicitly published construction cost'),
  'maintenanceCost':integer('Only source backed'),
  'priceNotes':txt('Exact conditional costs; no guessed factor conversion')
 },'No inferred purchasability, price, cost multiplier or credit conversion.'),
 'text':obj({
  'shortSummary':txt('Derived concise, player-readable summary, never substitute canonical rules'),
  'publishedFlavor':txt('Source-excerpt provenance constrained by publishing rights'),
  'mechanicsNotes':txt('Source prose mechanical notes, source-verified vs derived distinguished'),
  'sourceWarnings':sarr('Printed tensions, OCR issues, duplicate presentations')
 },'Player-facing summary separated from verbatim rule authority.'),
 'exceptions':obj({
  'sourceContradictions':arr(obj({'issueId':txt('Conflict ID'), 'fieldPointers':sarr('Affected pointers'), 'statements':arr(source,'Printed conflict sources'), 'resolutionStatus':choice(['unresolved','approved-effective','errata'],'Adjudication, not silent correction')},'Contradiction retained',required=['issueId']),'Printed contradictions, including differing skill totals'),
  'unmappedFacts':arr(rule,'Facts without a certified typed destination; block mechanical certification'),
  'transcriptionWarnings':sarr('TXT/PDF interleaving, column artifacts'),
  'notes':txt('Other source constraints')
 },'Do not correct or erase source inconsistencies.'),
 'fieldStates':{'type':'object','description':'JSON pointer -> evidence state. For EVERY persisted null value store a state; null never grants absence/permission. Unreviewed paths should be omitted, not filled with null.','propertyNames':{'pattern':'^/'},'additionalProperties':{'enum':['not-stated','not-applicable','explicitly-none','unclear-source','not-yet-reviewed','source-verified']}},
 'rules':obj({
  'conditionalMechanics':arr(rule,'Printed local or source-specific rule claims'),
  'globalRuleReferences':sarr('Stable existing engine rules, not copies of generic formulas'),
  'controllingSourceDecisionId':txt('DROID-RULE-001 when applicable; other conflicts require owner/errata'),
  'mechanicalExecutionStatus':choice(['source-only','pending-certification','partially-certified','certified'],'Independent of source citation')
 },'No second V2 rules engine. All effects keyed to source and existing runtime authority.'),
 'certification':obj({
  'identityStatus':choice(['unreviewed','txt-indexed','pdf-reviewed','source-verified'],'Published identity review only',False),
  'mechanicalStatus':choice(['unreviewed','partial','blocked','certified'],'Independent complete field certification',False),
  'runtimeStatus':choice(['not-tested','mock-only','live-verified'],'Actual V13 runtime testing',False),
  'reviewNotes':txt('Blocking evidence and outstanding checks'),
  'reviewerEvidenceRefs':sarr('Source citations/approval receipts')
 },'Identity, mechanical fidelity and Foundry runtime have separate gates.',required=['identityStatus','mechanicalStatus','runtimeStatus'])
}

schema={'$schema':'https://json-schema.org/draft/2020-12/schema',
 '$id':'https://swse.local/schemas/universal-droid-source-entry-0.1-draft.schema.json',
 'title':'SWSE Universal Droid Publication Source Record — draft 0.1',
 'description':'Full canonical replacement source vocabulary for published SWSE droids. Not a Foundry actor instance. Sparse fields + evidence-qualified nulls, fail-closed for mechanics. Derived from audited 14-book census and universal vehicle source schema. Not yet owner frozen.',
 'type':'object','additionalProperties':False,
 'properties':root_properties,
 'required':list(root_properties)}

# Required identities/labels must be concrete rather than nullable.
for group,keys in [('identity',['sourceEntryKey','printedName']),('publication',['book']),('certification',['identityStatus','mechanicalStatus','runtimeStatus'])]:
 for key in keys:
  p=root_properties[group]['properties'][key]
  if isinstance(p.get('type'),list):p['type']=[t for t in p['type'] if t!='null']
  if 'enum' in p:p['enum']=[t for t in p['enum'] if t is not None]

# compact blank: a draft not a source fact; no claim of absence. Root groups remain uniform, with unknown fields omitted inside objects.
blank={k:({} if p.get('type')=='object' or isinstance(p.get('type'),list) and 'object' in p['type'] else None) for k,p in root_properties.items()}
blank['schemaVersion']=DRAFT;blank['recordType']='droid-publication-source-entry'
blank['identity']={'sourceEntryKey':'REPLACE_WITH_BOOK_SPECIFIC_KEY','printedName':'REPLACE_WITH_PRINTED_NAME'}
blank['publication']={'book':'REPLACE_WITH_PRINTED_SOURCEBOOK'}
blank['certification']={'identityStatus':'unreviewed','mechanicalStatus':'unreviewed','runtimeStatus':'not-tested'}
blank['fieldStates']={}
# Root placeholders never mean absence. Avoid nullable roots until source is audited.

# Reuse structurally identical sub-records as references, matching the vehicle
# schema's closed typed-object vocabulary rather than inlining the same rule 30 times.
definitions={
 'sourceCitation':source,'sourceRule':rule,'appliedTrait':appliedTrait,
 'componentInstance':component,'attackExpression':attack,'locomotionInstance':locomotion,'capacityQuantity':carry
}
def compact(node, owner=None):
 if isinstance(node,dict):
  for key,template in definitions.items():
   if key!=owner and node==template:return {'$ref':'#/$defs/'+key}
  return {k:compact(v,owner=owner) for k,v in node.items()}
 if isinstance(node,list):return [compact(x,owner=owner) for x in node]
 return node
schema['properties']=compact(schema['properties'])
schema['$defs']={key:compact(template,owner=key) for key,template in definitions.items()}

for filename,objj in [('universal-droid-source-entry.schema.json',schema),('universal-droid-source-entry.blank.json',blank)]:
 (ROOT/filename).write_text(json.dumps(objj,indent=2,ensure_ascii=False)+'\n')
print('schema properties:',len(root_properties),'schema bytes:',(ROOT/'universal-droid-source-entry.schema.json').stat().st_size)
