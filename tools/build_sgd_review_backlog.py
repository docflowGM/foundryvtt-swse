#!/usr/bin/env python3
"""Local review queue; never promotes OCR claims to certified facts."""
import json,hashlib
from pathlib import Path
R=Path(__file__).resolve().parents[1]
a=json.loads((R/'data/canonical/droids/source-books/sgd.json').read_text())['sourceEntries']
e=json.loads((R/'data/audits/droids/sgd-field-evidence.json').read_text())['records']
visual=json.loads((R/'data/audits/droids/sgd-visual-field-review.json').read_text())
vp={x['sourceEntryKey']:x for x in visual['items']}
rows=[]
for rec,ev in zip(a,e):
 id=rec['identity']['sourceEntryKey']; assert id==ev['sourceEntryKey']
 has_numeric=id in vp
 status='SELECTED_FIELDS_PDF_VERIFIED' if has_numeric else 'LAYOUT_ONLY_NO_FIELD_CERT' if ev['pdfVisualLayoutChecked'] else 'OCR_ONLY'
 rows.append({'listingId':id,'name':rec['identity']['printedName'],'printedPage':ev['printedPage'],
 'pdfPage1Based':ev['pdfPage1Based'],'reviewStatus':status,'visualNumericFieldsVerified':vp.get(id,{}).get('verifiedFieldCount',0),
 'sourceStatblockFormat':rec['classification']['sourceStatblockFormat'],
 'draftAttackExpressions':len(rec['combat'].get('attackGroups',[])),
 'draftFeatPhrases':len(rec['progression'].get('feats',[])),
 'draftTalentPhrases':len(rec['progression'].get('talents',[])),
 'ocrWarnings':ev['warnings'],
 'pendingIndependentChecks':['PDF page layout '+('and full field review' if status!='OCR_ONLY' else 'and mechanical fields'),
 'exact feat/talent provenance','component and weapon mounts','conditional mechanics','PC eligibility and permissions']})
assert len(rows)==46
counts={s:sum(x['reviewStatus']==s for x in rows) for s in ('SELECTED_FIELDS_PDF_VERIFIED','LAYOUT_ONLY_NO_FIELD_CERT','OCR_ONLY')}
assert sum(counts.values())==46 and counts['SELECTED_FIELDS_PDF_VERIFIED']==len(vp)
sourcePdf=Path("/mnt/data/SW Saga - Scavenger's Guide to Droids (optimized).pdf")
sha=hashlib.file_digest(sourcePdf.open('rb'),'sha256').hexdigest() if sourcePdf.exists() else None
out={'schema':'swse.droid.sgd.review-backlog/0.1','status':'LOCAL_ONLY_NONCERTIFIED',
 'sourceBook':'SGD','sourcePdfName':sourcePdf.name,'sourcePdfSha256':sha,
 'nextPrintPageNotYetVisuallyInspected':next((x['printedPage'] for x in rows if x['reviewStatus']=='OCR_ONLY'),None),
 'categories':counts,'models':rows}
path=R/'data/audits/droids/sgd-review-backlog.json'
path.write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
print('Review backlog:',counts,'next uninspected printed page',out['nextPrintPageNotYetVisuallyInspected'],'pdf_sha256',sha)
