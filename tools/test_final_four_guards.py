#!/usr/bin/env python3
"""Mutation tests that catch unsafe promotion of source data."""
from validate_final_four_local import run,TOTAL
import copy,json
from pathlib import Path
R=Path(__file__).resolve().parents[1]
passed=0
for book in TOTAL:
 base=json.loads((R/f'data/canonical/droids/source-books/{book}.json').read_text())
 # Each mutation must be rejected; avoid rerunning expensive hashing.
 mods=[('certified',lambda d:d['sourceEntries'][0]['certification'].__setitem__('mechanicalStatus','certified')),
       ('runtime-enabled',lambda d:d['sourceEntries'][0]['rules'].__setitem__('mechanicalExecutionStatus','certified')),
       ('unauthorized-attack',lambda d:d['sourceEntries'][0]['combat'].__setitem__('attackGroups',[{'attackId':'invented','operationStatus':'certified-executable'}])),
       ('lost-identity',lambda d:d['sourceEntries'][0]['identity'].__setitem__('sourceEntryKey','DUPLICATE')),
       ('missing-null-state',lambda d:d['sourceEntries'][0]['fieldStates'].clear())]
 if book=='sotg':mods.append(('vehicle-HP-leak',lambda d:d['sourceEntries'][0]['durability'].__setitem__('hitPoints',60)))
 if book=='goi':mods.append(('NR1100-hero-leak',lambda d:d['sourceEntries'][1]['pcConstruction'].__setitem__('heroEligibility','allowed')))
 if book=='unknown':mods.append(('F1-OCR-damage',lambda d:d['sourceEntries'][2]['durability'].__setitem__('hitPoints',32)))
 if book=='scum':mods.append(('invented-permission',lambda d:d['sourceEntries'][3]['pcConstruction'].__setitem__('heroEligibility','allowed')))
 for name,fn in mods:
  d=copy.deepcopy(base);fn(d)
  try:run(book,ledger=d)
  except (AssertionError,KeyError):passed+=1
  else:raise AssertionError(f'Unsafe mutation accepted: {book}/{name}')
 print(book, len(mods),'negative regression mutations PASS')
print('TOTAL',passed,'/',sum(5+(1 if b in ['sotg','goi','unknown','scum'] else 0) for b in TOTAL),'PASS')
