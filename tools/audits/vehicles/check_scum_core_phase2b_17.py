#!/usr/bin/env python3
"""Focus validator for Scum and Villainy book closure + first six Core ship source reviews.
Checks source evidence metadata/bookkeeping, NOT independent production/mechanical certification.
"""
import argparse,hashlib,json,sys,zipfile
from pathlib import Path
EXPECTED={
 'scum-and-villainy':{
  'book':'Scum and Villainy','phase':'book-source-closure','reviewed':11,'total':11,'weapons':21,'conflicts':1,'discovery':32,
  'roster':[('sav-c-wing-ugly-fighter',66),('sav-clutch-ugly-fighter',67),('sav-corellian-engineering-corporation-yt-1250-transport',64),('sav-corellian-engineering-corporation-yt-1930-transport',66),('sav-corelliaspace-gymsnor-3-light-freighter',62),('sav-errant-venture',128),('sav-kaloth-style-battlecruiser',126),('sav-kazellis-corporation-light-freighter',62),('sav-surronian-conqueror-class-assault-ship',64),('sav-x-tie-ugly-fighter',67),('sav-y164-thalassian-slave-transport',127)],
  'extraCandidate':'Tenloss Corporation Hornet-class Interceptor'
 },
 'core-rulebook':{
  'book':'Core Rulebook','phase':'cp1-source-review','reviewed':6,'total':10,'weapons':15,'conflicts':2,'discovery':23,
  'roster':[('core-arc-170-starfighter',180),('core-corellian-yt-1300-transport',182),('core-droid-tri-fighter',181),('core-eta-2-actis-interceptor',180),('core-imperial-i-class-star-destroyer',183),('core-incom-t-65b-x-wing-starfighter',178),('core-koensayr-y-wing-starfighter',178),('core-tie-fighter',179),('core-tie-interceptor',179),('core-vulture-class-droid-starfighter',180)]
 }
}
PHASE1_SHA='21f2178eb6a610d3b52ecdc8549f93724c77fbc4'
HEAD='49fabf107f287b8147a59b75a9dd09e49ed7426f'

def require(v,msg):
 if not v:raise AssertionError(msg)
def read_json(p):return json.loads(p.read_text())
def pdf_check(pdf,expected,book):
 if not pdf:return
 p=Path(pdf)
 require(p.is_file(),f'Missing {book} source PDF: {p}')
 digest=hashlib.sha256(p.read_bytes()).hexdigest()
 require(digest==expected,f'{book} source PDF sha256 mismatch {digest}')
def check(root,phase1=None,pdfs=None):
 out=[]
 for slug,e in EXPECTED.items():
  phase=e['phase'];base=root/'data/audits/vehicles'
  paths=[base/f'swse-phase2b-{slug}-{phase}-ledger.json',base/f'swse-phase2b-{slug}-{phase}-mount-backlog.json',base/f'swse-phase2c-{slug}-{phase}-schema-discovery.json']
  for p in paths:require(p.is_file(),f'Missing {p}')
  j,m,d=map(read_json,paths)
  require(j['sourceBook']==e['book']==m['sourceBook']==d['sourceBook'],f'{slug}: book mismatch')
  require(j['sourcePdfSha256']==m['sourcePdfSha256'],f'{slug}: source digest mismatch')
  require(j['phase1ProvenanceBlobSha']==PHASE1_SHA and j['branchHeadAtInitialization']==HEAD,f'{slug}: baseline mismatch')
  require(d['mode']=='DISCOVERY_ONLY_NOT_PRODUCTION' and d['schemaFrozen'] is False,f'{slug}: discovery applied to production')
  actual=[(x['sourceEntryKey'],x['printedStatblockStartPage']) for x in j['entries']]
  require(actual==e['roster'],f'{slug}: phase1 identity/order/page drift')
  require(all(x['phase1PdfPhysicalPage']==x['printedStatblockStartPage']+1 for x in j['entries']),f'{slug}: page physical ordinal')
  reviewed=[x for x in j['entries'] if x['endPageReviewStatus']=='PDF_VERIFIED'];pending=[x for x in j['entries'] if x['endPageReviewStatus']=='NOT_REVIEWED']
  require(len(reviewed)==e['reviewed'] and len(pending)==e['total']-e['reviewed'],f'{slug}: review totals')
  require([x['sourceEntryKey'] for x in reviewed]==[x['sourceEntryKey'] for x in j['entries'][:len(reviewed)]] if slug=='core-rulebook' else len(reviewed)==11,f'{slug}: checkpoint order')
  require(all(not x['fullFieldCertified'] and not x['fullWeaponMountReconciled'] for x in j['entries']),f'{slug}: claimed unsupported strict certifications')
  require(all(x['sourceEvidence']['pdfVisualCheckForThisCheckpoint'] and x['sourceEvidence']['pdfSha256']==j['sourcePdfSha256'] for x in reviewed),f'{slug}: source evidence missing')
  require(all(x['sourceEvidence']['printedPages'][0]==x['printedStatblockStartPage'] for x in reviewed),f'{slug}: printed page drift')
  require(all(x['fieldGroups']['defenses']=='PDF_VERIFIED' for x in reviewed),f'{slug}: defense evidence')
  require(all(x['fieldGroups']['defenses']=='NOT_REVIEWED' for x in pending),f'{slug}: pending fields wrongly marked')
  require(all(x['mountAndFiringGroups']==[] for x in pending),f'{slug}: pending mount group leak')
  require(all(not x['fullFieldCertified'] for x in reviewed),f'{slug}: strict false')
  require(sum(len(x['mountAndFiringGroups']) for x in reviewed)==e['weapons'],f'{slug}: attack group total')
  require(sum(len(x.get('sourceConflicts',[])) for x in reviewed)==e['conflicts'],f'{slug}: source conflicts lost')
  require(len(m['records'])==e['reviewed'] and [x['sourceEntryKey'] for x in m['records']]==[x['sourceEntryKey'] for x in reviewed],f'{slug}: mount records mismatch')
  require(all(not x['strictCertified'] for x in m['records']),f'{slug}: false strict mount flags')
  require(all(len(x['weaponAttackGroups'])==len(v['mountAndFiringGroups']) for x,v in zip(m['records'],reviewed)),f'{slug}: mount attack rows mismatch')
  require(all(r['firingArc']=='SOURCE_SILENT_CONFIRMED' for x in m['records'] for r in x['weaponAttackGroups']),f'{slug}: invented firing arc')
  require(len(d['discoveries'])==e['discovery'] and d['counts']['discoveryCases']==e['discovery'],f'{slug}: discovery count')
  require(all(z['requiresFollowup'] for z in d['discoveries']),f'{slug}: discovery needs followup')
  require(len({z['id'] for z in d['discoveries']})==len(d['discoveries']),f'{slug}: duplicate discovery ids')
  require(j['counts']['publicationShipClaims']==e['total'] and j['counts']['primaryPdfCloseReads']==e['reviewed'] and j['counts']['attackGroupRowsReviewed']==e['weapons'] and j['counts']['sourceConflictRecordCount']==e['conflicts'] and j['counts']['strictFullFieldAndPhysicalWeaponMountCertificates']==0,f'{slug}: bad counts')
  if e.get('extraCandidate'):
   candidates=d['additionalStatblockIdentityCandidates'];require(len(candidates)==1 and candidates[0]['printedName']==e['extraCandidate'] and candidates[0]['printedPage']==125,f'{slug}: Hornet omission candidate missing')
   require(candidates[0]['printedName'] not in [x['printedName'] for x in j['entries']],f'{slug}: census candidate silently added')
  else:require(not d.get('additionalStatblockIdentityCandidates'),f'{slug}: unexpected unreviewed candidate')
  if pdfs:pdf_check(pdfs.get(slug),j['sourcePdfSha256'],e['book'])
  out.append((slug,j,m,d))
 if phase1:
  j=read_json(Path(phase1))
  require(isinstance(j.get('books'),list),'Phase1 provenance has no books')
  for slug,l,_,_ in out:
   book=next((b for b in j['books'] if b['book']==l['sourceBook']),None)
   require(book is not None,slug+' missing in full Phase1')
   require([(q['sourceEntryKey'],q['printedStatblockPage']) for q in book['entries']]==EXPECTED[slug]['roster'],slug+' full Phase1 roster mismatch')
 return out

def archive_check(zipfile_path,root):
 pkg=Path(zipfile_path);require(pkg.is_file(),f'missing zip {pkg}')
 expected=sorted(str(p.relative_to(root)) for p in root.rglob('*') if p.is_file())
 with zipfile.ZipFile(pkg) as z:
  names=sorted(z.namelist())
  require(names==expected,f'ZIP changed files mismatch: expected {expected}, got {names}')
  require(z.testzip() is None,'ZIP CRC error')
  for name in names:require(z.read(name)==(root/name).read_bytes(),f'ZIP byte mismatch {name}')
 require(len(expected)==10,f'Expected exactly 10 repo-relative changed files, got {len(expected)}')
 return len(expected)

def main():
 p=argparse.ArgumentParser();p.add_argument('--repo-root',default='.');p.add_argument('--sav-pdf');p.add_argument('--core-pdf');p.add_argument('--zip-file');p.add_argument('--phase1');a=p.parse_args()
 root=Path(a.repo_root).resolve()
 result=check(root,phase1=a.phase1,pdfs={'scum-and-villainy':a.sav_pdf,'core-rulebook':a.core_pdf})
 files=archive_check(a.zip_file,root) if a.zip_file else None
 print('PASS: Scum and Villainy 11/11; Core Rulebook CP1 6/10; 17/17 requested source reviews; overall 299/316 fixed Phase1 claims; 17 Phase1 claims remain.')
 print('PASS: 36 visually inventoried attack-group rows; 55 discovery-only cases; 3 printed conflicts; 1 independently observed source census omission candidate (Hornet).')
 print('PASS: Phase1 roster projections frozen; all 17 strict certificates remain false; four Core records explicitly NOT_REVIEWED.')
 if files:print(f'PASS: {files} repo-relative files in ZIP; byte and CRC checks passed.')
 print('SCOPE: No production/runtime regression or physical weapon mount/arc certification; PDF page visual review is documented, not programmatically re-proven.')
 if not a.phase1:print('SCOPE: Full Phase1 blob not supplied locally; verified Github Phase1 roster projections are embedded in this validator. Supply --phase1 for full local roster cross-check.')
if __name__=='__main__':
 try:main()
 except Exception as ex:print('FAIL:',ex,file=sys.stderr);sys.exit(1)
