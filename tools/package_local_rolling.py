#!/usr/bin/env python3
"""Package reproducible local-first SWSE droid source ledgers (no source PDFs)."""
from pathlib import Path
import hashlib,zipfile,json,shutil
R=Path(__file__).resolve().parents[1]
out=Path('/mnt/data/SWSE_Droid_Hydration_Rolling_Local.zip')
assert (R/'data/canonical/droids/source-books/threats.json').exists()
files=sorted([p for head in ['data','docs','tools'] for p in (R/head).rglob('*')
              if p.is_file() and '__pycache__' not in p.parts and p.suffix!='.pyc'],key=lambda x:str(x))
assert len(files)>=35,len(files)
manifest='\n'.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.relative_to(R).as_posix()}' for p in files+[R/'README_LOCAL.md'])+'\n'
(R/'SHA256SUMS.txt').write_text(manifest)
files+=[R/'README_LOCAL.md',R/'SHA256SUMS.txt']
# Retain previous user's rolling snapshot locally for rollback; do not include it in new archive.
if out.exists():
 a=R/'work/archives';a.mkdir(parents=True,exist_ok=True)
 old=a/'SWSE_Droid_Hydration_Checkpoint8.zip'
 if not old.exists():shutil.copy2(out,old)
with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for f in sorted(files):z.write(f,f.relative_to(R).as_posix())
with zipfile.ZipFile(out) as z:
 assert z.testzip() is None
 assert len(z.namelist())==len(files)
 assert all(x in z.namelist() for x in ['README_LOCAL.md','data/canonical/droids/source-books/sgd.json',
          'data/canonical/droids/source-books/clone.json','data/canonical/droids/source-books/threats.json'])
print(json.dumps({'path':str(out),'bytes':out.stat().st_size,'files':len(files),
 'zipSha256':hashlib.sha256(out.read_bytes()).hexdigest()},indent=2))
