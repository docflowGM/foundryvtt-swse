import re
CFG={
'CORE':('Core Rulebook_djvu.txt',[18637,18706,18777,18837,18884,18968,19032,19082,19147,19224,19301,25872,25942]),
'LEGACY':('Legacy Era Campaign Guide_djvu.txt',[6089,6175,6244,6328,6399,6479,6524,6622,6688,6780,6861,6953]),
'FORCE':('Force Unleashed Campaign Guide_djvu.txt',[9835,9933,10059,10173,10206,10243,19621,19732,19802,19876,19978])}
for book,(file,anchor) in CFG.items():
 lines=open('/mnt/data/'+file,errors='replace').read().splitlines()
 print('\n###',book)
 for i,a in enumerate(anchor,1):
  x=lines[a-1:a+58]
  keep=[s.strip() for s in x if re.search(r'^(?:Medium|Large|Small|Tiny|Diminutive|Huge|Gargantuan) droid|^(?:Init |Defenses Ref|hp |Speed |Abilities Str|Availability |Immune|Feats |Systems )',s.strip(),re.I)]
  print(f'{i:02d} '+' <> '.join(keep[:8]))
