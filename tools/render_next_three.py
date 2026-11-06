import fitz
from PIL import Image,ImageOps,ImageDraw
from pathlib import Path
R=Path('/mnt/data/swse_droids_roll_work')
configs={
 'core':('Star Wars Saga Edition.pdf',[197,198,199,200,201,202,203,267,268]),
 'legacy':('Star Wars Saga Edition - Legacy Era Campaign Guide.pdf',list(range(69,78))),
 'force':('SAGA EDITION - Force Unleashed Campaign Guide.pdf',[103,104,105,106,107,195,196,197,198])
}
for book,(pdf,pages) in configs.items():
 d=fitz.open('/mnt/data/'+pdf)
 out=R/'work'/f'{book}_pdf_review';out.mkdir(parents=True,exist_ok=True)
 thumb=[]
 for p in pages:
  page=d[p]
  pix=page.get_pixmap(matrix=fitz.Matrix(1.7,1.7),alpha=False)
  path=out/f'printed_p{p}.png';pix.save(str(path))
  im=Image.open(path).convert('RGB'); im.thumbnail((830,1120))
  canvas=Image.new('RGB',(850,1165),'white');canvas.paste(im,((850-im.width)//2,30))
  ImageDraw.Draw(canvas).text((8,7),f'{book.upper()} printed p{p}',fill='black')
  thumb.append(canvas)
 for i in range(0,len(thumb),4):
  pack=thumb[i:i+4];m=Image.new('RGB',(850*2,1165*2),'#bbbbbb')
  for j,im in enumerate(pack):m.paste(im,((j%2)*850,(j//2)*1165))
  m.save(out/f'montage_{1+i//4}.jpg',quality=86)
 print(book,len(pages),'pages',len(thumb),'rendered')
