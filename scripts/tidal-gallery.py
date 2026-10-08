"""Assemble untouched CPU renders into labeled evidence sheets.
Run npm run review:tidal -- --render first. Requires Pillow.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'test-results/v6-tidal-batch'
OUT = ROOT / 'test-results'
report = json.loads((SOURCE / 'report.json').read_text())
FONT = Path('/usr/share/fonts/truetype/dejavu')
def font(size, bold=False):
    try: return ImageFont.truetype(str(FONT / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), size)
    except OSError: return ImageFont.load_default()
BACKGROUND = '#f3f5f1'
INK = '#203b3d'
MUTED = '#5d7070'
CELL, MARGIN, GAP = 350, 26, 12
WIDTH = MARGIN*2 + CELL*4 + GAP*3
HEIGHT = 160 + (CELL+65)*4 + GAP*3 + 76
sheet = Image.new('RGB', (WIDTH, HEIGHT), BACKGROUND)
draw = ImageDraw.Draw(sheet)
draw.text((MARGIN,26), 'MORPH LAB / TIDE & SKY', font=font(29,True), fill=INK)
draw.text((MARGIN,76), '16 procedural source models', font=font(22), fill=INK)
draw.text((MARGIN,111), 'Actual shared geometry. CPU pigment preview. Not a GPU material or physics test.', font=font(16), fill=MUTED)
for i, row in enumerate(report['records']):
    x = MARGIN+(i%4)*(CELL+GAP); y = 160+(i//4)*(CELL+65+GAP)
    picture = Image.open(SOURCE / (row['id']+'-2.png')).convert('RGB').resize((CELL,CELL), Image.Resampling.LANCZOS)
    sheet.paste(picture,(x,y))
    draw.text((x+10,y+CELL+9),row['label'],font=font(20,True),fill=INK)
    draw.text((x+10,y+CELL+37),row['medium'].upper()+' / '+row['id'],font=font(13),fill=MUTED)
draw.text((MARGIN,HEIGHT-58),'Each tile is fitted separately. All phase frames for one model use one fixed camera scale.',font=font(15),fill=MUTED)
draw.text((MARGIN,HEIGHT-31),'Built from body nodes and editable parts. No imported models or animation clips.',font=font(15),fill=MUTED)
sheet.save(OUT / 'v6-model-library.png', optimize=True)
# The loops below use actual sampled meshes. The eight source frames cover 1.75 s.
# Motion has more than one frequency, so the GIF is a repeated sample, not a seamless clip.
selected=[('ribbondrift','Lateral body wave'),('moonbell','Bell pulse and arms'),('velvetmoth','Four-wing flutter'),('gyreseed','Rotating seed crown')]
frames=[]; cell=390; gap=12; margin=24; w=margin*2+cell*2+gap;h=100+2*(cell+48)+gap+55
for phase in range(8):
    frame=Image.new('RGB',(w,h),BACKGROUND);d=ImageDraw.Draw(frame)
    d.text((margin,20),'MORPH LAB / MOTION SAMPLES',font=font(24,True),fill=INK)
    d.text((margin,57),f'Actual CPU geometry  |  t = {phase/4:.2f} s  |  fixed camera per model',font=font(15),fill=MUTED)
    for i,(key,label) in enumerate(selected):
        x=margin+(i%2)*(cell+gap);y=100+(i//2)*(cell+48+gap)
        image=Image.open(SOURCE/(key+f'-{phase}.png')).convert('RGB').resize((cell,cell),Image.Resampling.LANCZOS)
        frame.paste(image,(x,y));d.text((x+8,y+cell+13),label,font=font(17,True),fill=INK)
    d.text((margin,h-31),'Eight sampled frames repeat. This is not a GPU or physics capture.',font=font(14),fill=MUTED)
    frames.append(frame)
frames[0].save(OUT/'v6-motion-samples.gif',save_all=True,append_images=frames[1:],duration=250,loop=0,optimize=False)
print('Created v6-model-library.png and v6-motion-samples.gif')
