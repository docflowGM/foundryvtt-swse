#!/usr/bin/env python3
"""Record printed p220 evidence against the upstream census repeat claim.
No GitHub writes. Fail closed against already-corrected local source evidence.
"""
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1]
L=R/'data/canonical/droids/source-books/gaw.json'
E=R/'data/audits/droids/gaw-field-evidence.json'
l=json.loads(L.read_text());e=json.loads(E.read_text())
r=l['sourceEntries'][19];ev=e['records'][19]
assert r['identity']['sourceEntryKey']=='GAW-DROID-020'
assert ev['samePublicationPresentations']==[{'printedPage':220,'pdfPage1Based':221,'status':'SECOND_PRESENTATION_NOT_NEW_IDENTITY'}]
assert (R/'work/gaw_pdf_review/printed_p220.png').is_file()
del ev['samePublicationPresentations']
ev['censusPresentationDiscrepancy']={'censusAssertion':'p220 repeats the GAW B1-Series Battle Droid Squad statblock',
 'pdfPrintedPageChecked':220,'pdfPage1Based':221,
 'observed':'p220 contains named organic character statblocks for Commander Zolghast and Braxus Lyn, not a B1 droid squad statblock',
 'decision':'CENSUS_REPEAT_CLAIM_REJECTED_FOR_THIS_PAGE; GAW-DROID-020 remains a single publication identity grounded at p217',
 'sourceImage':'work/gaw_pdf_review/printed_p220.png'}
r['text'].setdefault('sourceWarnings',[]).append('Read-only census claims an alternate squad statblock on p220, but the rendered printed p220 contains other NPCs. No second presentation assigned. Source record at p217 remains valid.')
E.write_text(json.dumps(e,indent=2,ensure_ascii=False)+'\n')
L.write_text(json.dumps(l,indent=2,ensure_ascii=False)+'\n')
print('GAW-DROID-020: corrected unverified census duplicate at p220; retained p217 as unique claim.')
