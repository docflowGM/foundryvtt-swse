#!/usr/bin/env python3
"""CP20 tranche 06, 10 SotG source-fidelity certificates; audit only."""
import argparse, json, copy, hashlib
from pathlib import Path
from jsonschema import Draft202012Validator
p=argparse.ArgumentParser()
p.add_argument("--repo",type=Path,required=True)
p.add_argument("--source-pdf",type=Path)
args=p.parse_args(); root=args.repo.resolve(); d=root/"data/audits/vehicles"
def load(name):return json.loads((d/name).read_text(encoding="utf8"))
def blob(path):
    content=path.read_bytes()
    return hashlib.sha1(b"blob "+str(len(content)).encode()+b"\0"+content).hexdigest()
B=load("swse-sotg-cp20-tranche06-source-fidelity-certificates.json")
S=load("swse-sotg-cp20-source-fidelity-tranche06.schema.json")
L=load("swse-phase2b-sotg-cp16-per-entry-certification-ledger.json")
Q=load("swse-phase2b-sotg-cp17-strict-certification-work-queue.json")
O=load("swse-phase2c-sotg-cp18-evidence-observation-overlay.json")
T=load("swse-phase2b-sotg-cp19-tranche07-primary-source-review.json")
C=load("swse-sotg-cp20-controlled-source-corrections.json")
P=load("swse-phase2c-cp18-approved-two-layer-policy.json")
previous=[load(f"swse-sotg-cp20-tranche{i:02d}-source-fidelity-certificates.json") for i in range(1,6)]
anchors=json.loads("{\"l\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp16-per-entry-certification-ledger.json\",\"sha\":\"d08ca75b0b30e8b44896588edf3c5ce1cd335557\"},\"q\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp17-strict-certification-work-queue.json\",\"sha\":\"9c7df34eefa54f456721ee18c6ee684ec214dbf6\"},\"o\":{\"path\":\"data/audits/vehicles/swse-phase2c-sotg-cp18-evidence-observation-overlay.json\",\"sha\":\"18b5df47516543e0646377b9eef71e4ef272026d\"},\"t\":{\"path\":\"data/audits/vehicles/swse-phase2b-sotg-cp19-tranche07-primary-source-review.json\",\"sha\":\"16b5f2666b2eba32fca329c2f831a0785a7b4c7b\"},\"c\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-controlled-source-corrections.json\",\"sha\":\"eba65c4857d6fb79c5dc49a780dd2280dd59d89b\"},\"prior\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-tranche05-source-fidelity-certificates.json\",\"sha\":\"1a7d20e2ebaee67ea3836a4d29d2f5ebcb5ed448\"},\"s\":{\"path\":\"data/audits/vehicles/swse-sotg-cp20-source-fidelity-tranche05.schema.json\",\"sha\":\"fdbe9de5b81d05e69fc872e1e9a4d9a873cea216\"}}")
Draft202012Validator.check_schema(S)
validator=Draft202012Validator(S);validator.validate(B)
assert P["decision"]=="APPROVED" and P["id"]==B["policyId"]=="SOTG-CP18-D01"
assert B["sha256"]==L["sourcePdfSha256"]==C["originalSourcePdfSha256"]
assert B["tranche"]=={"queueFrom":91,"queueTo":100,"count":10}
assert B["authorityBlobs"]==anchors
assert len(L["entries"])==len(O["entries"])==104 and len(Q["workItems"])==100 and len(T["entries"])==10
assert C["originalLedgerChanged"] is False and C["productionDataChanged"] is False and C["physicalOrRuntimeGrants"]==0
assert B["auditOnly"] is True and B["rawSourceLedgerImmutable"] is True
assert B["v06SchemaFrozen"] is False and B["productionChangesMade"] is False
assert B["counts"]=={"newSourceFidelityCertificates":10,"remainingSourceFidelityUncertified":15,"unchangedStrictMechanicalBacklog":100,"unchangedPriorPhysicalStrictCertificates":4,"brandNewPhysicalMountCertificates":0,"newAutomatedStockAttackPermissions":0,"provenanceRestoredWithoutMutatingOldLedger":0}
for key,anchor in anchors.items(): assert blob(root/anchor["path"])==anchor["sha"], "Wrong blob: "+key
if args.source_pdf:
    h=hashlib.sha256()
    with args.source_pdf.open("rb") as fi:
        for chunk in iter(lambda:fi.read(1048576),b""):h.update(chunk)
    assert h.hexdigest()==B["sha256"],"Source PDF changed"
prior=set()
for i,x in enumerate(previous):
    assert x["tranche"]=={"queueFrom":16+i*15,"queueTo":30+i*15,"count":15}
    for c in x["certificates"]:
        assert c["sourceEntryKey"] not in prior
        prior.add(c["sourceEntryKey"])
assert len(prior)==75
seen=set();groups=0;pages=set()
for index,c in enumerate(B["certificates"]):
    pos=index+91; q=Q["workItems"][pos-1]; ledger=L["entries"][q["cp16LedgerIndex"]]; obs=O["entries"][q["cp16LedgerIndex"]]; review=T["entries"][index]
    assert q["queuePosition"]==c["queuePosition"]==review["queuePosition"]==pos
    assert c["certificateId"]==f"SOTG-SF-CP20-T06-{index+1:03d}"
    assert c["sourceEntryKey"]==q["sourceEntryKey"]==ledger["sourceEntryKey"]==obs["sourceEntryKey"]==review["sourceEntryKey"]
    assert c["sourceEntryKey"] not in prior and c["sourceEntryKey"] not in seen
    seen.add(c["sourceEntryKey"])
    assert c["cp16Index"]==q["cp16LedgerIndex"]
    assert c["printedName"]==ledger["printedName"]
    assert c["printedStartPage"]==ledger["printedStatblockStartPage"]==review["printedStatblockStartPage"]
    assert c["reviewedSourcePages"]==ledger["reviewedPDFPages"]
    assert review["reviewStatus"]=="ORIGINAL_MATCHING_SHA256_PDF_VISUAL_CLOSE_READ"
    assert not set(review["reviewedPrintedPages"])-set(ledger["reviewedPDFPages"])
    assert q["sourceConflictFieldGroups"]==review["sourceConflictFieldGroups"]==[]
    assert ledger["endPageReviewStatus"]=="PDF_VERIFIED"
    assert len(ledger["fieldGroups"])==19
    assert all(v in ("PDF_VERIFIED","SOURCE_SILENT_CONFIRMED") for v in ledger["fieldGroups"].values())
    assert c["originalFieldStates"]==ledger["fieldGroups"]==obs["fieldGroups"]
    assert c["publishedFacts"]==ledger["printedFacts"]
    assert c["configurationRuleEvidence"]==ledger["configurationAndRuleFindings"]
    assert c["discrepancyEvidence"]==ledger["sourceEvidence"]
    assert c["cp19ReviewPointer"]=={"sourceEntryKey":review["sourceEntryKey"],"reviewDisposition":review["category"],"verifiedPdfPages":review["reviewedPrintedPages"]}
    assert c["unresolvedRuleScopeEvidence"]==[x for x in ledger["configurationAndRuleFindings"] if x["status"]!="PDF_VERIFIED"]
    assert review["correctionCandidates"]==[] and c["auditCorrectionIds"]==[]
    assert not any(x["sourceEntryKey"]==c["sourceEntryKey"] for x in C["corrections"])
    assert review["sourceFidelityCertificateGranted"] is False
    assert review["newStrictPhysicalMountCertificateGranted"] is False
    assert review["operationalStockAttackAuthorityGranted"] is False
    assert c["certificationState"]=="SOURCE_FIDELITY_CERTIFIED_AUDIT_ONLY"
    assert c["physicalMountCertified"] is False and c["foundryStockAttackTrusted"] is False and c["productionHydrationPermitted"] is False
    original=ledger["mountAndFiringGroups"]
    assert c["originalAttackGroupObservations"]==c["certifiedAttackGroupObservations"]==original
    assert len(original)==len(obs["attackGroups"])==len(review["sourceAttackGroups"])==len(c["sourceSilenceRowScope"])
    pages.update(ledger["reviewedPDFPages"]);groups+=len(original)
    for j,row in enumerate(original):
        cp19row=review["sourceAttackGroups"][j];cp18row=obs["attackGroups"][j];rs=c["sourceSilenceRowScope"][j]
        assert cp19row["cp16RowIndex"]==cp18row["sourceRowIndex"]==rs["rowIndex"]==j
        assert cp19row["originalRow"]==row
        assert "sourcePage" in row and rs["originalRowPageStored"] is True
        assert rs["supplementalSourcePageEvidence"] is False and rs["sourcePage"]==row["sourcePage"]
        assert rs["sourcePage"] in ledger["reviewedPDFPages"]
        assert rs["sourceSilent"]==[k for k in ("hardwareCount","firingArc","batteryCount") if row.get(k)=="SOURCE_SILENT_CONFIRMED"]
        for key in ("hardwareCount","firingArc","batteryCount"):
            val=cp18row["observations"][key]
            if key in row: assert val["rawValue"]==row[key]
            else: assert val["state"]=="KEY_NOT_STORED" and "rawValue" not in val
assert len(seen)==10 and len(prior|seen)==85 and groups==18
assert sorted(pages)==[102,153,154,155,156,157,158,159,160]
assert sum(bool(x["fullFieldCertified"] and x["fullWeaponMountReconciled"]) for x in L["entries"])==4
for key in ("foundryStockAttackTrusted","physicalMountCertified","productionHydrationPermitted"):
    fake=copy.deepcopy(B);fake["certificates"][0][key]=True
    assert not validator.is_valid(fake),"Authority forged: "+key
print("PASS CP20 T06: 10 source-fidelity certificates, queue 91-100, 18 attack rows")
print("PASS CP20 T06: 85/100 source-fidelity; 15 conflict-priority positions remain")
print("PASS CP20 T06: immutable historical authority, zero physical-mount/runtime grants")
