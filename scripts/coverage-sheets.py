"""Assemble actual geometry captures. No model pixels are generated or replaced."""
from pathlib import Path
import json,os
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results/v11';BG='#eef2ee';INK='#203c34';MUTED='#557267';LINE='#cbd9d0'
def font(n,bold=False):
 candidates=[os.environ.get('MORPH_REVIEW_FONT',''),'/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf','C:/Windows/Fonts/'+('arialbd.ttf' if bold else 'arial.ttf'),'/System/Library/Fonts/Supplemental/Arial.ttf']
 for path in candidates:
  if path and Path(path).is_file():return ImageFont.truetype(path,n)
 try:return ImageFont.load_default(size=n)
 except TypeError:return ImageFont.load_default()
def header(canvas,title,subtitle):
 d=ImageDraw.Draw(canvas);d.text((36,25),title,font=font(32,True),fill=INK);d.text((36,75),subtitle,font=font(17),fill=MUTED)
def tile(canvas,path,box):
 im=Image.open(path).convert('RGB');im.thumbnail((box[2]-box[0],box[3]-box[1]));canvas.paste(im,(box[0]+((box[2]-box[0])-im.width)//2,box[1]+((box[3]-box[1])-im.height)//2))
def coverage():
 s=Image.new('RGB',(1660,1130),BG);header(s,'MORPH LAB 11 / COMPLETE GEOMETRY','Before: v10 offline Inspector. After: shared part geometry. Same blueprint, pose, camera and clay display.')
 records=json.loads((OUT/'preservation/report.json').read_text())['views'];labels={'mossback':'Mossback','glider':'Glider','tendril':'Tendril','fiend':'Fiend'};d=ImageDraw.Draw(s)
 for i,(id,label) in enumerate(labels.items()):
  x=30+(i%2)*820;y=130+(i//2)*470;d.rounded_rectangle((x,y,x+800,y+455),radius=10,outline=LINE,width=1);d.text((x+18,y+14),label,font=font(22,True),fill=INK)
  for j,stage in enumerate(['before','after']):
   r=next(r for r in records if r['id']==id and r['label']==stage);xx=x+16+j*395
   d.text((xx,y+48),('v10 Inspector' if stage=='before' else 'v11 Inspector')+' / '+str(r['excludedGenes'])+' omitted genes',font=font(15),fill=MUTED);tile(s,OUT/f'preservation/{id}-{stage}.png',(xx,y+76,xx+375,y+449))
 d.text((36,1088),'Actual CPU triangles. This compares inspection coverage, not the old Workshop or GPU material quality.',font=font(17),fill=MUTED);s.save(OUT/'v11-coverage-comparison.png')
def packing():
 report=json.loads((OUT/'packing/report.json').read_text())['records'];s=Image.new('RGB',(1710,1720),BG);header(s,'MORPH LAB 11 / EXPORT READBACK','Left: procedural source. Right: grouped GLB readback. Fixed camera and clay material for each pair.');d=ImageDraw.Draw(s)
 for i,r in enumerate(report):
  x=25+(i%2)*840;y=130+(i//2)*500;d.rounded_rectangle((x,y,x+820,y+482),radius=10,outline=LINE,width=1);d.text((x+16,y+14),r['label']+' / '+str(r['sourceMeshes'])+' to '+str(r['groupedMeshes'])+' meshes',font=font(22,True),fill=INK)
  for j,(filename,label) in enumerate([('source-2.png','Source geometry'),('grouped-2.png','Grouped GLB readback')]):
   xx=x+13+j*405;d.text((xx,y+48),label,font=font(16),fill=MUTED);tile(s,OUT/'packing'/r['id']/filename,(xx,y+75,xx+395,y+467))
 d.text((36,1660),'No vertices or triangles removed. No changed pixels in these paired CPU views. Not a GPU benchmark.',font=font(17),fill=MUTED);s.save(OUT/'v11-export-comparison.png')
coverage();packing();print('Actual-geometry comparison sheets saved.')
