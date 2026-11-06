#!/usr/bin/env python3
"""Prepare GitHub-safe checkpoint: source facts + SHA anchors, not book OCR passages."""
from pathlib import Path
import json,shutil,hashlib
SRC=Path(__file__).resolve().parents[1]
OUT=SRC/'work/git-publish'
if OUT.exists():shutil.rmtree(OUT)
OUT.mkdir(parents=True)
removed=[]
for head in ['data','docs','tools']:
 for p in (SRC/head).rglob('*'):
  if not p.is_file() or '__pycache__' in p.parts or p.suffix=='.pyc':continue
  rel=p.relative_to(SRC);t=OUT/rel;t.parent.mkdir(parents=True,exist_ok=True)
  if p.name.endswith('-field-evidence.json'):
   v=json.loads(p.read_text())
   for r in v.get('records',[]):
    for k in ('ocrTextExcerpt','statblockText'):
     if k in r:
      removed.append((str(rel),r.get('sourceEntryKey'),k,len(r[k])))
      del r[k]
   t.write_text(json.dumps(v,ensure_ascii=False,indent=2)+'\n')
  else:shutil.copyfile(p,t)
# Local scratch lifecycle is intentionally not a repo work plan.
for p in OUT.glob('docs/audits/droids/*local-state.json'):
 v=json.loads(p.read_text());v['publishedAuditScope']='selected-field-source-review-only';p.write_text(json.dumps(v,indent=2)+'\n')
(OUT/'docs/audits/droids/GIT_CHECKPOINT11_README.md').write_text('''# Droid publication source-review checkpoint 11\n\n**234/234 publication source identities, 234/234 selected-PDF reviews; 3,615 selected checks. 0/234 mechanical certifications.**\n\n**Scope:** Audit-only draft source records. No V13 Foundry actor/compendium mutations, attack grants, mount permissions, legal-character-creation grants, or official schema promotion. Existing equipment/feat/talent/runtime authority remains controlling.\n\nPublished field-evidence records retain primary-source filenames, pages, line anchors, SHA256 text-window hashes and manually reviewed fields. **Long verbatim `ocrTextExcerpt` and `statblockText` passages are omitted from this public-repository copy**; the reviewer must use the independently held printed books/PDFs for full text. The local checkpoint ZIP retained by the project owner contains the unabridged private evidence.\n\nSource-only draft book ledgers are under `data/canonical/droids/source-books/`. They are not production packs or certified source-mechanical definitions. The 14-book census includes one rules-only book (Jedi Academy, zero statblock claims). Three SotG droid starfighters are vehicle-primary; do not attach ship weapons or HP to droid actors.\n\n## Review status\n\n- Source review: complete for all 234 publication claims.\n- Detailed mechanics, equipments/weapon mounts, feats/talents and PC construction: **not certified for any claim**.\n- Upstream official JSON Schema validation: outstanding.\n- Foundry V13 execution certification: outstanding.\n- Semantic local validations: completed on the original review workspace; repo sanitization retains numbers and hashes but removes raw book passages.\n- Full historical mutation-suite rerun: not certified complete; four final-book negative tests 24/24 passed.\n\nFor methods, limitations and per-book counters see `docs/audits/droids/droid-source-review-final.md`.\n''')
(OUT/'docs/audits/droids/CHECKPOINT11_SUMMARY.md').write_text('''# SWSE Droid Source Review — Checkpoint 11\n\nThis path contains the **source-review audit overlay** for the SWSE Foundry V13 / V2 migration.\n\n- 13 books with droid statblock identities, plus Jedi Academy Training Manual (rules-only).\n- 234/234 published claim IDs drafted and selected fields visually checked (3,615 comparisons).\n- 0/234 mechanically certified; 0/14 fully mechanically certified books.\n\n**Do not use these files as certified Foundry compendiums or a V2 rules engine.**\n\nSee `docs/audits/droids/GIT_CHECKPOINT11_README.md` for the privacy/copyright-sanitized evidence policy and the outstanding certification gates.\n''')
paths=sorted([p for p in OUT.rglob('*') if p.is_file()]);total=sum(p.stat().st_size for p in paths)
manifest='\n'.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(OUT).as_posix()}' for p in paths)+'\n'
(OUT/'docs/audits/droids/checkpoint11-sha256sums.txt').write_text(manifest)
print(json.dumps({'gitPublishFiles':len(paths)+1,'totalBytes':total,'verbatimBookPassagesRemoved':len(removed),'passageCharsRemoved':sum(a[3] for a in removed)},indent=2))
# One JSON array, broken into safe line segments, so a connected authenticated GitHub tool can copy the expanded files.
payload=json.dumps([[p.relative_to(OUT).as_posix(),p.read_text()] for p in sorted(OUT.rglob('*')) if p.is_file()],ensure_ascii=True,separators=(',',':'))
chunk=4096
bridge=Path('/mnt/data/swse_git_stage_expanded_source_b64less.txt')
bridge.write_text('\n'.join(payload[i:i+chunk] for i in range(0,len(payload),chunk))+'\n')
print(json.dumps({'bridgeChars':len(payload),'bridgeLines':(len(payload)+chunk-1)//chunk,'bridgePath':str(bridge)},indent=2))
