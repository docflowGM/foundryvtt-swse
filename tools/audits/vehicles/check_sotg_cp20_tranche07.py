#!/usr/bin/env python3
"""CP20 tranche 07: conflict-priority publication-fidelity closeout.

No source conflict is resolved by this audit. Missing historical row keys
remain KEY_NOT_STORED rather than automatically becoming source silence.
No physical mount, production import or runtime stock attack is authorized.
"""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator

parser=argparse.ArgumentParser()
parser.add_argument("--repo",type=Path,required=True)
parser.add_argument("--source-pdf",type=Path)
args=parser.parse_args()
root=args.repo.resolve()
d=root/"data/audits/vehicles"
def read(name):return json.loads((d/name).read_text(encoding="utf8"))
def blob(path):
    value=path.read_bytes()
    return hashlib.sha1(b"blob "+str(len(value)).encode()+b"\0"+value).hexdigest()

B=read("swse-sotg-cp20-tranche07-conflict-priority-source-fidelity-certificates.json")
S=read("swse-sotg-cp20-source-fidelity-tranche07-conflict-priority.schema.json")
L=read("swse-phase2b-sotg-cp16-per-entry-certification-ledger.json")
Q=read("swse-phase2b-sotg-cp17-strict-certification-work-queue.json")
O=read("swse-phase2c-sotg-cp18-evidence-observation-overlay.json")
T=read("swse-phase2b-sotg-cp19-tranche01-primary-source-review.json")
C=read("swse-sotg-cp20-controlled-source-corrections.json")
P=read("swse-phase2c-cp18-approved-two-layer-policy.json")
earlier=[read(f"swse-sotg-cp20-tranche{i:02d}-source-fidelity-certificates.json") for i in range(1,7)]
anchors=json.loads("{\"l\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json\",\"sha\":\"d08ca75b0b30e8b44896588edf3c5ce1cd335557\"},\"q\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp17-strict-certification-work-queue.json\",\"sha\":\"9c7df34eefa54f456721ee18c6ee684ec214dbf6\"},\"o\":{\"path\":\"data/audits/vehicles/swse-phase2c-sotg-cp18-evidence-observation-overlay.json\",\"sha\":\"18b5df47516543e0646377b9eef71e4ef272026d\"},\"t\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp19-tranche01-primary-source-review.json\",\"sha\":\"e21200f0f8604e16ff3ebbbbb63ea79c44252bf3\"},\"c\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-controlled-source-corrections.json\",\"sha\":\"eba65c4857d6fb79c5dc49a780dd2280dd59d89b\"},\"prior\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-tranche06-source-fidelity-certificates.json\",\"sha\":\"ff255cf013ff6cc23ee6dea2e8ef1cac6d13611d\"},\"s\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-source-fidelity-tranche06.schema.json\",\"sha\":\"873f2161b009c15db60bf6782d472d8068edbab7\"}}")

Draft202012Validator.check_schema(S)
validator=Draft202012Validator(S)
validator.validate(B)
assert P["decision"]=="APPROVED" and P["id"]==B["policyId"]=="SOTG-CP18-D01"
assert B["sha256"]==L["sourcePdfSha256"]==C["originalSourcePdfSha256"]
assert B["sha256"]=="e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0"
assert B["authorityBlobs"]==anchors
assert B["correctionPath"]=="data/audits/vehicles/swse-sotg-cp20-controlled-source-corrections.json"
assert B["tranche"]=={"queueFrom":1,"queueTo":15,"count":15}
assert B["counts"]=={"newSourceFidelityCertificates":15,"remainingSourceFidelityUncertified":0,"unchangedStrictMechanicalBacklog":100,"unchangedPriorPhysicalStrictCertificates":4,"brandNewPhysicalMountCertificates":0,"newAutomatedStockAttackPermissions":0,"provenanceRestoredWithoutMutatingOldLedger":0}
assert len(L["entries"])==len(O["entries"])==104
assert len(Q["workItems"])==100 and len(T["entries"])==15
assert C["originalLedgerChanged"] is False and C["productionDataChanged"] is False
assert C["physicalOrRuntimeGrants"]==0 and len(C["corrections"])==4
assert B["auditOnly"] is True and B["rawSourceLedgerImmutable"] is True
assert B["v06SchemaFrozen"] is False and B["productionChangesMade"] is False
for key,anchor in anchors.items():
    assert blob(root/anchor["path"])==anchor["sha"], "Immutable source blob changed: "+key
if args.source_pdf:
    h=hashlib.sha256()
    with args.source_pdf.open("rb") as fi:
        for chunk in iter(lambda:fi.read(1048576),b""):h.update(chunk)
    assert h.hexdigest()==B["sha256"],"Source PDF SHA256 mismatch"

previous=set()
for batchid,past in enumerate(earlier):
    start=16+batchid*15
    count=10 if batchid==5 else 15
    assert past["tranche"]=={"queueFrom":start,"queueTo":start+count-1,"count":count}
    for record in past["certificates"]:
        assert record["sourceEntryKey"] not in previous
        previous.add(record["sourceEntryKey"])
assert len(previous)==85

seen=set();groups=0;allpages=set();missingcount=0;conflicts=0
for idx,cert in enumerate(B["certificates"]):
    pos=idx+1
    work=Q["workItems"][idx]
    original=L["entries"][work["cp16LedgerIndex"]]
    observation=O["entries"][work["cp16LedgerIndex"]]
    review=T["entries"][idx]
    assert cert["certificateId"]==f"SOTG-SF-CP20-T07-{pos:03d}"
    assert cert["queuePosition"]==work["queuePosition"]==review["cp17QueuePosition"]==pos
    assert cert["cp16Index"]==work["cp16LedgerIndex"]==review["cp16LedgerIndex"]
    assert cert["sourceEntryKey"]==work["sourceEntryKey"]==original["sourceEntryKey"]==observation["sourceEntryKey"]==review["sourceEntryKey"]
    assert cert["sourceEntryKey"] not in previous and cert["sourceEntryKey"] not in seen
    seen.add(cert["sourceEntryKey"])
    assert cert["printedName"]==original["printedName"]
    assert cert["printedStartPage"]==original["printedStatblockStartPage"]==review["statblockStartPage"]
    assert cert["reviewedSourcePages"]==original["reviewedPDFPages"]
    allpages.update(original["reviewedPDFPages"])
    assert set(review["visualPdfPages"]).issubset(set(original["reviewedPDFPages"]))
    assert review["visualVerification"]=="RENDERED_ORIGINAL_SOURCE_PDF_PAGE_CLOSE_READ"
    assert review["cp19ReviewComplete"] is True and review["canonicalConflictResolved"] is False
    assert review["sourceFidelityCertified"] is False
    assert review["newPhysicalMountCertificateGranted"] is False and review["stockRuntimeAttackAuthorityGranted"] is False
    assert original["endPageReviewStatus"]=="PDF_VERIFIED"
    assert len(original["fieldGroups"])==19
    assert all(x in ("PDF_VERIFIED","SOURCE_SILENT_CONFIRMED","SOURCE_CONFLICT") for x in original["fieldGroups"].values())
    assert cert["originalFieldStates"]==original["fieldGroups"]==observation["fieldGroups"]
    conflict_fields=[k for k,v in original["fieldGroups"].items() if v=="SOURCE_CONFLICT"]
    assert conflict_fields==cert["publishedConflictFieldGroups"]==work["sourceConflictFieldGroups"]==review["earlierConflictFieldGroups"]
    assert bool(conflict_fields)==(pos<=12)
    assert cert["publishedFacts"]==original["printedFacts"]
    assert cert["configurationRuleEvidence"]==original["configurationAndRuleFindings"]
    assert cert["discrepancyEvidence"]==original.get("sourceEvidence")
    assert cert["cp19PublicationClaims"]==review["publicationClaims"]
    assert len(cert["cp19PublicationClaims"])>=2
    for claim in cert["cp19PublicationClaims"]:
        assert claim["printedPage"] in review["visualPdfPages"]
    assert cert["cp19ReviewFinding"]==review["finding"]
    assert cert["cp19RowPageProvenance"]==review["rowPageProvenance"]
    assert cert["cp19ReviewPointer"]=={
        "sourceEntryKey":review["sourceEntryKey"],
        "reviewDisposition":review["disposition"],
        "verifiedPdfPages":review["visualPdfPages"]
    }
    assert cert["printedContradictionRetained"]==(pos<=12 or pos==15)
    assert cert["conflictingPrintedValueAutomaticallySelected"] is False
    if pos<=12:assert cert["conflictOrGapDisposition"]=="PRINTED_CONFLICT_ALTERNATIVES_UNRESOLVED"
    elif pos<=14:assert cert["conflictOrGapDisposition"]=="HISTORICAL_MISSING_KEYS_RETAINED"
    else:assert cert["conflictOrGapDisposition"]=="NARRATIVE_TERMINOLOGY_CONFLICT_AND_MISSING_KEYS_RETAINED"
    conflicts+=int(cert["printedContradictionRetained"])
    assert cert["auditCorrectionIds"]==[]
    assert not any(x["sourceEntryKey"]==cert["sourceEntryKey"] for x in C["corrections"])
    assert cert["certificationState"]=="SOURCE_FIDELITY_CERTIFIED_AUDIT_ONLY"
    assert cert["physicalMountCertified"] is False and cert["foundryStockAttackTrusted"] is False
    assert cert["productionHydrationPermitted"] is False
    raw=original["mountAndFiringGroups"]
    assert cert["originalAttackGroupObservations"]==cert["certifiedAttackGroupObservations"]==raw
    assert len(raw)==len(observation["attackGroups"])==len(cert["sourceSilenceRowScope"])
    groups+=len(raw)
    gaps=[];missing_page_indices=[]
    for j,row in enumerate(raw):
        obs=observation["attackGroups"][j]
        scope=cert["sourceSilenceRowScope"][j]
        absent=[key for key in ("sourcePage","hardwareCount","firingArc","batteryCount") if key not in row]
        haspage="sourcePage" in row
        page=row.get("sourcePage",original["printedStatblockStartPage"])
        assert page in review["visualPdfPages"]
        assert scope["rowIndex"]==obs["sourceRowIndex"]==j
        assert scope["originalRowPageStored"]==haspage
        assert scope["supplementalSourcePageEvidence"]==(not haspage)
        assert scope["sourcePage"]==page
        assert scope["sourceSilent"]==[
            key for key in ("hardwareCount","firingArc","batteryCount")
            if row.get(key)=="SOURCE_SILENT_CONFIRMED"
        ]
        if not haspage:missing_page_indices.append(j)
        if absent:
            gaps.append({
                "rowIndex":j,"missingKeys":absent,
                "supplementalPrintedPage":page,
                "missingSourcePageInHistoricalRow":not haspage,
                "evidenceClass":"KEY_NOT_STORED_NOT_ASSUMED_SOURCE_SILENT"
            })
        missingcount+=len(absent)
        for key in ("hardwareCount","firingArc","batteryCount"):
            evidence=obs["observations"][key]
            if key in row:assert evidence["rawValue"]==row[key]
            else:assert evidence["state"]=="KEY_NOT_STORED" and "rawValue" not in evidence
    assert cert["legacyMissingRowKeys"]==gaps
    assert cert["cp19RowPageProvenance"]["historicalMissingRowSourcePageKeys"]==missing_page_indices
    assert cert["cp19RowPageProvenance"]["sourcePrintedStatblockStartPageIsNotRowPageProvenance"] is True
    if pos<=12:assert gaps==[]
    else:assert len(gaps)>0
    extras=[]
    if cert["printedContradictionRetained"]:
        extras.append({
            "status":"PUBLISHED_CONFLICT","printedPages":review["visualPdfPages"],
            "cp19Disposition":review["disposition"],"sourceWinnerSelected":False,
            "reason":review["finding"]
        })
    if gaps:
        extras.append({
            "status":"KEY_NOT_STORED","printedPages":review["visualPdfPages"],
            "missingHistoricalRowFieldCount":sum(len(x["missingKeys"]) for x in gaps),
            "sourceSilenceNotInferred":True
        })
    assert cert["unresolvedRuleScopeEvidence"]==[
        x for x in original["configurationAndRuleFindings"] if x["status"]!="PDF_VERIFIED"
    ]+extras
assert len(seen)==15 and len(previous|seen)==100
assert groups==47 and conflicts==13 and missingcount==17
assert sorted(allpages)==[59,61,63,65,72,99,100,101,104,105,110,116,117,139,141,142,143,152,153]
assert sum(bool(x["fullFieldCertified"] and x["fullWeaponMountReconciled"]) for x in L["entries"])==4

for key in ("physicalMountCertified","foundryStockAttackTrusted","productionHydrationPermitted"):
    test=copy.deepcopy(B);test["certificates"][0][key]=True
    assert not validator.is_valid(test), "Schema allowed illegal authority"
for key,value in (("certificationState","PHYSICAL_CERTIFIED"),("conflictingPrintedValueAutomaticallySelected",True)):
    test=copy.deepcopy(B);test["certificates"][0][key]=value
    assert not validator.is_valid(test), "Schema allowed arbitrary publication choice"

print("PASS CP20 T07: 15 source-fidelity audit certificates, conflict-priority queue 1-15")
print("PASS CP20 T07: 47 attack rows; 13 printed-conflict cases and 17 missing original row fields retained")
print("PASS CP20 T07: 100/100 publication-fidelity queue records; historical 4 strict certificates unchanged")
print("PASS CP20 T07: zero physical-mount, production hydration or runtime stock attack grants")
