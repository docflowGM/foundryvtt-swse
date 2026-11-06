#!/usr/bin/env python3
"""CP21: validate the 15 explicitly owner-approved SotG exceptions.

Read-only audit/effective rules. No physical hardware trust or Foundry pack
mutation. All CP16-CP20 source evidence must stay byte-for-byte immutable.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator
from sotg_cp21_effective_projection import project_effective_ship

p=argparse.ArgumentParser()
p.add_argument("--repo",type=Path,required=True)
p.add_argument("--source-pdf",type=Path)
args=p.parse_args()
root=args.repo.resolve()
d=root/"data/audits/vehicles"

def read(name):return json.loads((d/name).read_text(encoding="utf8"))
def blob(path):
    v=path.read_bytes()
    return hashlib.sha1(b"blob "+str(len(v)).encode()+b"\0"+v).hexdigest()
def expect(condition,why):
    assert condition,why

M=read("swse-sotg-cp21-owner-approved-adjudications.json")
S=read("swse-sotg-cp21-owner-approved-adjudications.schema.json")
L=read("swse-phase2b-sotg-cp16-per-entry-certification-ledger.json")
Q=read("swse-phase2b-sotg-cp17-strict-certification-work-queue.json")
T=read("swse-phase2b-sotg-cp19-tranche01-primary-source-review.json")
C=read("swse-sotg-cp20-tranche07-conflict-priority-source-fidelity-certificates.json")
P=read("swse-phase2c-cp18-approved-two-layer-policy.json")
Draft202012Validator.check_schema(S)
schema_validator=Draft202012Validator(S)
schema_validator.validate(M)

expect(M["policyId"]==P["id"]=="SOTG-CP18-D01","Wrong policy")
expect(P["decision"]=="APPROVED","Policy not approved")
expect(M["sourcePdfSha256"]==L["sourcePdfSha256"]=="e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0","Source PDF changed")
expect(M["sourceParentHead"]=="9df36a630df24ff7315e218220158343de79816e","Changed pinned CP20 closeout")
expect(M["ownerApproval"]=="USER_APPROVED_ALL_15_RECOMMENDATIONS_2026-10-20","No owner approval")
expect(M["ownerApprovalScope"]=="EFFECTIVE_RULE_ADJUDICATION_AND_PROVENANCE_ONLY_NOT_PHYSICAL_MOUNT_OR_RUNTIME_TRUST","Authority scope escalated")
expect(M["immutableHistoricalSource"] is True,"Historical evidence mutation requested")
expect(M["physicalMountCertificatesGranted"]==0 and M["stockAttackPermissionsGranted"]==0 and M["foundryProductionChanges"] is False,"Unapproved runtime authority")

anchors={
 "ledger":("data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json","d08ca75b0b30e8b44896588edf3c5ce1cd335557"),
 "queue":("data/audits/vehicles/swse-phase2b-sotg-cp17-strict-certification-work-queue.json","9c7df34eefa54f456721ee18c6ee684ec214dbf6"),
 "review":("data/audits/vehicles/swse-phase2b-sotg-cp19-tranche01-primary-source-review.json","e21200f0f8604e16ff3ebbbbb63ea79c44252bf3"),
 "certificates":("data/audits/vehicles/swse-sotg-cp20-tranche07-conflict-priority-source-fidelity-certificates.json","86a3ed4f98fd4a5ab15430ababdcd3834d6580f4"),
}
expect(M["authorityBlobs"]=={k:{"path":path,"sha":sha} for k,(path,sha) in anchors.items()},"Source pointers changed")
for key,(path,sha) in anchors.items():
    expect(blob(root/path)==sha,"Pinned authority blob mismatch: "+key)
if args.source_pdf:
    h=hashlib.sha256()
    with args.source_pdf.open("rb") as fi:
        for block in iter(lambda:fi.read(1048576),b""):h.update(block)
    expect(h.hexdigest()==M["sourcePdfSha256"],"Original source PDF changed")

expect(len(L["entries"])==104 and len(Q["workItems"])==100,"Core source population changed")
expect(len(T["entries"])==len(C["certificates"])==len(M["approvedDecisions"])==15,"Decision population changed")

field_allowlist={
 1:[("/skills/initiative",8,12)],
 2:[],
 3:[("/defenses/flatFootedReflex",47,14)],
 4:[("/specialDefensesOrRules/gravityWell/statblockAreaSquares","4x4","3x3")],
 5:[("/skills/initiative",8,2)],
 6:[("/initiative",10,6)],
 7:[],8:[],9:[],
 10:[("/sensesPerception",5,6)],
 11:[("/initiative",7,4)],
 12:[("/payload","12 proton torpedoes","12 heavy proton torpedoes")],
 13:[],14:[],15:[]
}
weapon_allowlist={
 1:[],2:[],3:[],
 4:[(1,"areaPrintedWeaponRow",True,"4x4 starship squares","3x3 starship squares")],
 5:[],6:[],7:[],8:[],9:[],10:[],11:[],
 12:[(1,"weaponLabel",True,"proton torpedoes","heavy proton torpedoes")],
 13:[],14:[],
 15:[(0,"hardwareCount",False,None,1)]
}
policy_allowlist=[
 "ADVANCED_TEMPLATE_GENERATOR",
 "DETAILED_WEAPON_ROW_AUTHORITY",
 "VEHICLE_DEFENSE_FORMULA",
 "OFFICIAL_ERRATA_GRAVITY_WELL",
 "JUNKER_TEMPLATE_INITIATIVE",
 "K_WING_SHIELDBUSTER_ALIAS",
 "MARAUDER_TRACTOR_OPERATOR_MODEL",
 "VISCOUNT_SIZE_ROLE_SPLIT",
 "ECLIPSE_AXIAL_SUPERLASER_ATTACK",
 "THETA_PERCEPTION_STOCK_CREW",
 "TIE_BOMBER_ARMAMENT_VARIANTS",
 "XJ3_HEAVY_PROTON_TORPEDO_LOADOUT",
 "ARC170_LEGACY_PROVENANCE",
 "A_WING_VARIANTS_AND_JAMMER",
 "BAUDO_SINGLE_CANNON_OPERATOR_SCOPE"
]
seen=set()
source_alternatives=0
missing_rows=0
for index,decision in enumerate(M["approvedDecisions"]):
    position=index+1
    work=Q["workItems"][index]
    source=L["entries"][work["cp16LedgerIndex"]]
    review=T["entries"][index]
    certificate=C["certificates"][index]
    expect(decision["order"]==position and decision["decisionId"]==f"SOTG-CP21-D{position:02d}","Decisions out of order")
    expect(work["queuePosition"]==review["cp17QueuePosition"]==certificate["queuePosition"]==position,"Source order mismatch")
    expect(decision["sourceEntryKey"]==work["sourceEntryKey"]==source["sourceEntryKey"]==review["sourceEntryKey"]==certificate["sourceEntryKey"],"Source identity mismatch")
    expect(decision["sourceEntryKey"] not in seen,"Duplicate approved ship")
    seen.add(decision["sourceEntryKey"])
    expect(decision["cp16Index"]==work["cp16LedgerIndex"] and decision["printedName"]==source["printedName"],"Name/index mismatch")
    expect(decision["printedStartPage"]==source["printedStatblockStartPage"]==review["statblockStartPage"],"Printed page mismatch")
    expect(decision["approvedBy"]=="REPOSITORY_OWNER_EXPLICIT_CHAT_APPROVAL_2026-10-20","Unapproved decision")
    expect(decision["approvalState"]=="APPROVED","Owner approval not retained")
    expect(decision["effectiveProjectionState"]=="APPROVED_AUDIT_CONSUMABLE_NOT_RUNTIME_GRANTED","Runtime trust attempted")
    expect(decision["physicalMountCertificateGranted"] is False and decision["foundryAutomatedAttackGranted"] is False and decision["productionHydrationPermitted"] is False,"Permission escalation")
    expect(decision["cp19Disposition"]==review["disposition"],"CP19 disposition changed")
    expect(decision["printedAlternatives"]==review["publicationClaims"]==certificate["cp19PublicationClaims"],"Source alternatives changed")
    expect(len(decision["printedAlternatives"])>=2,"Missing printed alternatives")
    expect(decision["originalFieldGroups"]==source["fieldGroups"]==certificate["originalFieldStates"],"Source field states changed")
    expect(decision["unresolvedCanonicalScopes"]==([review["disposition"]] if review["canonicalConflictResolved"] is False else []),"Printed conflict scope hidden")
    expect(review["canonicalConflictResolved"] is False,"Cannot change printed source without errata")
    expect(decision["policies"] and len(decision["policies"])==1,"Must have one typed approved policy")
    expect(decision["policies"][0]["code"]==policy_allowlist[index],"Wrong policy mapping")
    expect(decision["policies"][0]["runtimePermission"] is False,"Runtime policy not allowed")
    selected=[(o["path"],o["originalValue"],o["newValue"]) for o in decision["fieldOverrides"]]
    expect(selected==field_allowlist[position],"Unexpected effective stat override")
    selected_weapons=[(o["rowIndex"],o["field"],o["originalPresent"],o.get("originalValue"),o["newValue"]) for o in decision["attackGroupOverrides"]]
    expect(selected_weapons==weapon_allowlist[position],"Unexpected physical/weapon field override")
    reconstructed=[]
    for rowidx,row in enumerate(source["mountAndFiringGroups"]):
        for k in ("sourcePage","hardwareCount","firingArc","batteryCount"):
            if k not in row:
                reconstructed.append({"rowIndex":rowidx,"field":k,"sourcePage":source["printedStatblockStartPage"],"provenance":"KEY_NOT_STORED"})
    expect(decision["legacyMissingRowKeys"]==reconstructed,"Historical missing-key provenance silently changed")
    missing_rows+=len(reconstructed)
    original=copy.deepcopy(source)
    result=project_effective_ship(source,decision)
    expect(source==original,"Projection mutated canonical published source")
    expect(result["originalPrintedFacts"]==source["printedFacts"],"Printed facts were lost")
    expect(result["originalAttackGroups"]==source["mountAndFiringGroups"],"Original rows were lost")
    expect(result["physicalMountCertified"] is False and result["foundryStockAttackTrusted"] is False,"Proposed rules generated runtime access")
    expect(result["productionHydrationPermitted"] is False,"Read-only implementation became a pack writer")
    expect(result["printedAlternatives"]==review["publicationClaims"],"Projection dropped opposing source values")
    source_alternatives+=len(result["printedAlternatives"])

# Case-by-case accepted interpretations. These are policy/read-only instructions,
# NOT permission to run unresolved mount, geometry, or crew actions.
details=[x["policies"][0]["detail"] for x in M["approvedDecisions"]]
expect(details[0]["derivedDex"]==32 and details[0]["printedExampleDex"]==33 and details[0]["derivedInitiative"]==12,"Advanced template decision")
expect(details[1]["groupIndices"]==[3,4] and details[1]["attackBonuses"]==[14,12],"Recusant decision")
expect(details[2]["approvedFlatFooted"]==14,"Pellaeon decision")
expect(details[3]["areaStarshipSquares"]=="3x3" and details[3]["attackVsReflex"]==10 and details[3]["independentAttackPermissions"] is False,"Errata/Interdictor decision")
expect(details[4]["templatePenalty"]==-5 and details[4]["applyPenaltyExactlyOnce"] is True,"Junker decision")
expect(details[5]["scope"]=="THIS_SOURCE_ENTRY_ONLY" and details[5]["printedPayloadCount"]==6 and details[5]["attackWeaponFamily"]=="shieldbuster torpedoes" and details[5]["mutuallyExclusive"] is True,"K-wing decision")
expect(details[6]["operatorCount"]==3 and details[6]["physicalMountCount"]=="UNRESOLVED","Marauder decision")
expect(details[7]["printedSizeClass"]=="Colossal (station)" and details[7]["effectiveRole"]=="MOBILE_WARSHIP" and details[7]["ammoTypeEquivalence"]=="UNRESOLVED" and details[7]["heavyWeaponAutoAmmoAllowed"] is False,"Viscount decision")
expect(details[8]["baseAttackBonus"]==15 and details[8]["penaltyAgainstSmallerThanColossalCruiser"]==-20 and details[8]["conditionalAttackBonus"]==-5,"Eclipse decision")
expect(details[9]["effectiveStockPerception"]==6 and details[9]["recomputeWhenOperatorChanges"] is True,"Theta decision")
expect(details[10]["stockTwoForwardLaserCannons"] is True and details[10]["stockConcussionMissiles"]==16 and details[10]["ordnanceAlternativesNotCumulative"] is True and details[10]["alternativeTorpedoesNotInstalledInStock"] is True,"TIE Bomber decision")
expect(details[11]["launcherCount"]==3 and details[11]["ammoPerLauncher"]==4 and details[11]["totalAmmo"]==12 and details[11]["damage"]=="10d10x2" and details[11]["shipSpecific"] is True,"XJ3 decision")
expect(details[12]["groupRoles"]==["gunner","gunner","pilot"] and details[12]["missingKeysMustRemainAbsent"] is True,"ARC-170 decision")
expect(details[13]["jammer"]["damageAttack"] is False and details[13]["earlyConfiguration"]["missiles"] is False and details[13]["laterStockConfiguration"]["missiles"] is True,"A-wing decision")
expect(details[14]["installedCannonCount"]==1 and details[14]["crewCount"]==1 and details[14]["automaticSimultaneousPilotGunnerAttacks"] is False,"Baudo decision")
expect(missing_rows==17,"Missing historical row counts changed")
expect(len(seen)==15 and source_alternatives>=30,"Incomplete approved sources")

for bad_key in ("physicalMountCertificateGranted","foundryAutomatedAttackGranted","productionHydrationPermitted"):
    forged=copy.deepcopy(M);forged["approvedDecisions"][0][bad_key]=True
    expect(not schema_validator.is_valid(forged),"Schema allowed authority forgery: "+bad_key)
for key,value in (("approvalState","DRAFT"),("effectiveProjectionState","LIVE_RUNTIME_TRUST")):
    forged=copy.deepcopy(M);forged["approvedDecisions"][0][key]=value
    expect(not schema_validator.is_valid(forged),"Schema allowed approval-state forgery")
forged=copy.deepcopy(M);forged["approvedDecisions"][0]["fieldOverrides"][0]["path"]="/abilities/dex"
try:
    project_effective_ship(L["entries"][Q["workItems"][0]["cp16LedgerIndex"]],forged["approvedDecisions"][0])
    raise AssertionError("Projection accepted unknown field pointer")
except ValueError:
    pass
forged=copy.deepcopy(M);forged["approvedDecisions"][0]["fieldOverrides"][0]["originalValue"]=999
try:
    project_effective_ship(L["entries"][Q["workItems"][0]["cp16LedgerIndex"]],forged["approvedDecisions"][0])
    raise AssertionError("Projection accepted falsified source preimage")
except ValueError:
    pass

print("PASS CP21: all 15 owner-approved SotG exception decisions in source queue order")
print("PASS CP21: approved effective-rule projection checked against immutable CP16, CP17, CP19, CP20 blobs")
print("PASS CP21: official errata area 3x3, ship-specific interpretations, 17 legacy key gaps retained")
print("PASS CP21: no printed record rewrites, weapon automation, production hydration or physical-mount grant")
