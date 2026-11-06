#!/usr/bin/env python3
"""CP20 T05: independent audit-only source-fidelity certification gate."""
import argparse
import copy
import hashlib
import json
from pathlib import Path
from jsonschema import Draft202012Validator

p=argparse.ArgumentParser()
p.add_argument("--repo",type=Path,required=True)
p.add_argument("--source-pdf",type=Path)
args=p.parse_args()
root=args.repo.resolve()
d=root/"data"/"audits"/"vehicles"

def read(name):
    return json.loads((d/name).read_text(encoding="utf8"))

def blob(path):
    content=path.read_bytes()
    return hashlib.sha1(b"blob "+str(len(content)).encode()+b"\0"+content).hexdigest()

B=read("swse-sotg-cp20-tranche05-source-fidelity-certificates.json")
S=read("swse-sotg-cp20-source-fidelity-tranche05.schema.json")
L=read("swse-phase2b-sotg-cp16-per-entry-certification-ledger.json")
Q=read("swse-phase2b-sotg-cp17-strict-certification-work-queue.json")
O=read("swse-phase2c-sotg-cp18-evidence-observation-overlay.json")
T=read("swse-phase2b-sotg-cp19-tranche06-primary-source-review.json")
C=read("swse-sotg-cp20-controlled-source-corrections.json")
P=read("swse-phase2c-cp18-approved-two-layer-policy.json")
PR=[read(f"swse-sotg-cp20-tranche{i:02d}-source-fidelity-certificates.json") for i in range(1,5)]
expected_blobs=json.loads("{\"l\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json\",\"sha\":\"d08ca75b0b30e8b44896588edf3c5ce1cd335557\"},\"q\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp17-strict-certification-work-queue.json\",\"sha\":\"9c7df34eefa54f456721ee18c6ee684ec214dbf6\"},\"o\":{\"path\":\"data/audits/vehicles/swse-phase2c-sotg-cp18-evidence-observation-overlay.json\",\"sha\":\"18b5df47516543e0646377b9eef71e4ef272026d\"},\"t\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp19-tranche06-primary-source-review.json\",\"sha\":\"e5c92e09837ae7edb0f3d8292debaa9fc97364c5\"},\"c\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-controlled-source-corrections.json\",\"sha\":\"eba65c4857d6fb79c5dc49a780dd2280dd59d89b\"},\"prior\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-tranche04-source-fidelity-certificates.json\",\"sha\":\"7d660f044d85482cf3635ac1051a352f5e1aebe4\"},\"s\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-source-fidelity-tranche04.schema.json\",\"sha\":\"79ec172eed3c5c8ee066482214d5f1c363146002\"}}")
expected_issues=json.loads("{\"79\":[{\"status\":\"PROVENANCE_CLASSIFICATION_PENDING\",\"sourceEntryKey\":\"sotg-sienar-fleet-systems-tie-in-fighter\",\"printedPage\":142,\"printedEvidence\":\"The TIE/In capabilities prose explicitly says the starfighter is not equipped with a hyperdrive; its statblock contains no printed Hyperdrive field.\",\"historicalFieldState\":\"SOURCE_SILENT_CONFIRMED\",\"sourceCorrectionCandidateState\":\"PROVENANCE_CLASSIFICATION_CANDIDATE_NOT_APPLIED\",\"disposition\":\"Retain CP16 statblock-field silence and separately identify explicit prose absence; do not fabricate a literal Hyperdrive None line, production value or implied weapon configuration.\"}]}")
Draft202012Validator.check_schema(S)
v=Draft202012Validator(S)
v.validate(B)
assert P["decision"]=="APPROVED"
assert P["id"]==B["policyId"]=="SOTG-CP18-D01"
assert len(L["entries"])==len(O["entries"])==104
assert len(Q["workItems"])==100 and len(T["entries"])==15
assert T["queueRange"]==[76,90]
assert C["originalLedgerChanged"] is False and C["productionDataChanged"] is False
assert C["physicalOrRuntimeGrants"]==0
assert B["sha256"]==L["sourcePdfSha256"]==C["originalSourcePdfSha256"]
assert B["sha256"]=="e4db33bea7d6c0cdd359870a6fc4f5a546ee9cefb25f964cd0e16a2c94e18bb0"
assert B["tranche"]=={"queueFrom":76,"queueTo":90,"count":15}
assert B["authorityBlobs"]==expected_blobs
assert B["correctionPath"]=="data/audits/vehicles/swse-sotg-cp20-controlled-source-corrections.json"
assert B["counts"]=={
    "newSourceFidelityCertificates":15,
    "remainingSourceFidelityUncertified":25,
    "unchangedStrictMechanicalBacklog":100,
    "unchangedPriorPhysicalStrictCertificates":4,
    "brandNewPhysicalMountCertificates":0,
    "newAutomatedStockAttackPermissions":0,
    "provenanceRestoredWithoutMutatingOldLedger":0
}
assert B["auditOnly"] is True and B["rawSourceLedgerImmutable"] is True
assert B["v06SchemaFrozen"] is False and B["productionChangesMade"] is False
for k,record in expected_blobs.items():
    assert blob(root/record["path"])==record["sha"], "Pinned Git blob changed: "+k
if args.source_pdf:
    h=hashlib.sha256()
    with args.source_pdf.open("rb") as fin:
        for blk in iter(lambda:fin.read(1048576),b""):
            h.update(blk)
    assert h.hexdigest()==B["sha256"], "PDF identity mismatch"
previous=set()
for i,old in enumerate(PR,1):
    assert old["tranche"]["queueFrom"]==16+(i-1)*15
    assert old["tranche"]["queueTo"]==30+(i-1)*15
    assert len(old["certificates"])==15
    for row in old["certificates"]:
        assert row["sourceEntryKey"] not in previous
        previous.add(row["sourceEntryKey"])
assert len(previous)==60
seen=set()
attack_rows=0
all_pages=set()
missing_row_pages=0
reviewed_extra_pages={}
for i,cert in enumerate(B["certificates"]):
    pos=76+i
    work=Q["workItems"][pos-1]
    raw=L["entries"][work["cp16LedgerIndex"]]
    view=O["entries"][work["cp16LedgerIndex"]]
    review=T["entries"][i]
    assert work["queuePosition"]==review["queuePosition"]==cert["queuePosition"]==pos
    assert cert["certificateId"]==f"SOTG-SF-CP20-T05-{i+1:03d}"
    assert cert["sourceEntryKey"]==work["sourceEntryKey"]==raw["sourceEntryKey"]==view["sourceEntryKey"]==review["sourceEntryKey"]
    assert cert["sourceEntryKey"] not in previous and cert["sourceEntryKey"] not in seen
    seen.add(cert["sourceEntryKey"])
    assert cert["cp16Index"]==work["cp16LedgerIndex"]
    assert cert["printedName"]==raw["printedName"]
    assert cert["printedStartPage"]==raw["printedStatblockStartPage"]==review["printedStatblockStartPage"]
    assert cert["reviewedSourcePages"]==raw["reviewedPDFPages"]
    assert review["reviewStatus"]=="ORIGINAL_MATCHING_SHA256_PDF_VISUAL_CLOSE_READ"
    assert review["printedStatblockStartPage"] in review["reviewedPrintedPages"]
    extras=[z for z in review["reviewedPrintedPages"] if z not in raw["reviewedPDFPages"]]
    assert extras==([143] if pos==81 else []), "Unexplained CP19 extra context page"
    reviewed_extra_pages[pos]=extras
    all_pages.update(raw["reviewedPDFPages"])
    assert raw["endPageReviewStatus"]=="PDF_VERIFIED"
    assert len(raw["fieldGroups"])==19
    assert all(x in ("PDF_VERIFIED","SOURCE_SILENT_CONFIRMED") for x in raw["fieldGroups"].values())
    assert work["sourceConflictFieldGroups"]==review["sourceConflictFieldGroups"]==[]
    assert cert["originalFieldStates"]==raw["fieldGroups"]==view["fieldGroups"]
    assert cert["publishedFacts"]==raw["printedFacts"]
    assert cert["configurationRuleEvidence"]==raw["configurationAndRuleFindings"]
    assert cert["discrepancyEvidence"]==raw["sourceEvidence"]
    assert cert["cp19ReviewPointer"]=={
        "sourceEntryKey":review["sourceEntryKey"],
        "reviewDisposition":review["category"],
        "verifiedPdfPages":review["reviewedPrintedPages"]
    }
    original_issues=[z for z in raw["configurationAndRuleFindings"] if z["status"]!="PDF_VERIFIED"]
    assert cert["unresolvedRuleScopeEvidence"]==original_issues+expected_issues.get(str(pos),[])
    candidates=review["correctionCandidates"]
    assert len(candidates)==(1 if pos==79 else 0)
    if pos==79:
        assert candidates[0]["field"]=="hyperdrive"
        assert candidates[0]["status"]=="PROVENANCE_CLASSIFICATION_CANDIDATE_NOT_APPLIED"
        assert cert["originalFieldStates"]["hyperdrive"]=="SOURCE_SILENT_CONFIRMED"
        assert "hyperdrive" not in cert["publishedFacts"]
    assert review["sourceFidelityCertificateGranted"] is False
    assert review["newStrictPhysicalMountCertificateGranted"] is False
    assert review["operationalStockAttackAuthorityGranted"] is False
    assert cert["certificationState"]=="SOURCE_FIDELITY_CERTIFIED_AUDIT_ONLY"
    assert cert["physicalMountCertified"] is False
    assert cert["foundryStockAttackTrusted"] is False
    assert cert["productionHydrationPermitted"] is False
    original=raw["mountAndFiringGroups"]
    assert cert["originalAttackGroupObservations"]==original
    assert cert["certifiedAttackGroupObservations"]==original, "Unapproved projected correction"
    assert cert["auditCorrectionIds"]==[]
    assert not any(z["sourceEntryKey"]==raw["sourceEntryKey"] for z in C["corrections"])
    assert len(original)==len(view["attackGroups"])==len(review["sourceAttackGroups"])==len(cert["sourceSilenceRowScope"])
    attack_rows+=len(original)
    for j,group in enumerate(original):
        has_page="sourcePage" in group
        page=group.get("sourcePage",raw["printedStatblockStartPage"])
        assert page in raw["reviewedPDFPages"]
        evidence=cert["sourceSilenceRowScope"][j]
        assert evidence["rowIndex"]==j
        assert evidence["originalRowPageStored"]==has_page
        assert evidence["sourcePage"]==page
        assert evidence["supplementalSourcePageEvidence"]== (not has_page)
        assert evidence["sourceSilent"]==[
            k for k in ("hardwareCount","firingArc","batteryCount")
            if group.get(k)=="SOURCE_SILENT_CONFIRMED"
        ]
        missing_row_pages+=int(not has_page)
        assert review["sourceAttackGroups"][j]["cp16RowIndex"]==j
        assert review["sourceAttackGroups"][j]["originalRow"]==group
        obs=view["attackGroups"][j]
        assert obs["sourceRowIndex"]==j
        for k in ("hardwareCount","firingArc","batteryCount"):
            state=obs["observations"][k]
            if k in group:
                assert state["rawValue"]==group[k]
            else:
                assert state["state"]=="KEY_NOT_STORED"
                assert "rawValue" not in state
assert len(seen)==15 and len(seen|previous)==75
assert attack_rows==38
assert missing_row_pages==0
assert sorted(all_pages)==[136,137,138,140,142,144,145,146,147,148,149,150,151,152]
assert reviewed_extra_pages[81]==[143]
assert all(not xs for pos,xs in reviewed_extra_pages.items() if pos!=81)
assert sum(bool(x["fullFieldCertified"] and x["fullWeaponMountReconciled"]) for x in L["entries"])==4
for kind in ("runtime","mount","hydration","state","source","invent_hardware"):
    forged=copy.deepcopy(B)
    if kind=="runtime": forged["certificates"][0]["foundryStockAttackTrusted"]=True
    if kind=="mount": forged["certificates"][0]["physicalMountCertified"]=True
    if kind=="hydration": forged["certificates"][0]["productionHydrationPermitted"]=True
    if kind=="state": forged["certificates"][0]["certificationState"]="PHYSICAL_CERTIFIED"
    if kind=="source": forged["sha256"]="a different book"
    if kind=="invent_hardware": forged["certificates"][0]["certifiedAttackGroupObservations"][0]["hardwareCount"]=50
    if kind!="invent_hardware": assert not v.is_valid(forged), "Schema allowed authority escalation: "+kind
    else: assert forged["certificates"][0]["certifiedAttackGroupObservations"] != L["entries"][Q["workItems"][75]["cp16LedgerIndex"]]["mountAndFiringGroups"], "Test failed to mutate evidence"
print("PASS CP20 T05: 15 source-fidelity certificates, queue 76-90, 38 original attack rows")
print("PASS CP20 T05: 75/100 cumulative; 25 source-fidelity certificates remain")
print("PASS CP20 T05: TIE/In printed prose absence not fabricated as statblock field")
print("PASS CP20 T05: TIE Interceptor p143 supplemental CP19 context only; source pages unchanged")
print("PASS CP20 T05: CP16-CP19 immutable Git blobs, no new mechanical or Foundry runtime rights")
