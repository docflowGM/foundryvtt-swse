#!/usr/bin/env python3
from pathlib import Path
import fitz
from PIL import Image,ImageOps,ImageDraw
R=Path(__file__).resolve().parents[1]
books={
 'goi':('Galaxy of Intrigue.pdf',[72,73,74,75,208]),
 'unknown':('SW_Saga_The_Unknown_Regions.pdf',[43,44,45,46,47]),
 'scum':('SAGA EDITION - Scum and Villainy.pdf',[96,156,157,216]),
 'sotg':('SAGA EDITION - Starships of the Galaxy.pdf',[78,79]),
}
for key,(pdf,pages) in books.items():
 dest=R/'work'/f'{key}_pdf_review';dest.mkdir(parents=True,exist_ok=True)
 doc=fitz.open('/mnt/data/'+pdf)
 thumbs=[]
 for p in pages:
  path=dest/f'printed_p{p}.png'
  # printed page p maps to PDF index p (cover is p0)
  if not path.exists():
   pix=doc[p].get_pixmap(matrix=fitz.Matrix(1.65,1.65),alpha=False)
   pix.save(str(path))
  img=Image.open(path).convert('RGB'); img.thumbnail((900,1350))
  cell=Image.new('RGB',(930,1380),'#f2f2f2');cell.paste(img,((930-img.width)//2,24))
  ImageDraw.Draw(cell).text((16,5),f'{key} printed p{p}',fill='black')
  thumbs.append(cell)
 for start in range(0,len(thumbs),4):
  chosen=thumbs[start:start+4];mw=930*len(chosen)
  montage=Image.new('RGB',(mw,1380),'white')
  for j,img in enumerate(chosen):montage.paste(img,(930*j,0))
  montage.save(dest/f'montage_{start//4+1}.jpg',quality=84)
 print(key,'printed pages:',pages)
 doc.close()
