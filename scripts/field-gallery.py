"""Assemble actual generated geometry evidence. No concept art or substituted pixels."""

from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
SRC = OUT / 'v9-field-batch'
REPORT = json.loads((SRC / 'report.json').read_text())
records = REPORT['records']


def font(n, bold=False):
    try:
        return ImageFont.truetype(
            '/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold' if bold else '') + '.ttf', n
        )
    except OSError:
        return ImageFont.load_default()


BG = '#f1f4ee'
INK = '#203c36'
MUTED = '#53665e'
notes = {
    'trailhound': 'Four paws / muzzle / brush tail',
    'hillgrazer': 'Long neck / hooves / antlers',
    'bristletusk': 'Heavy front / tusks / short legs',
    'reedhopper': 'Broad body / rear legs / web feet',
    'fieldmedic': 'Supply cases / offer gesture',
    'lamplighter': 'Caged lamp / inspection pose',
    'archivist': 'Opening book / reading pose',
    'prospector': 'Pick / framed pack / work strike',
    'waypostarcher': 'Long bow / back quiver / draw',
    'caravancourier': 'Map scroll / pack / note pose',
}
cell = 348
gap = 14
margin = 26
w = margin * 2 + 5 * cell + 4 * gap
h = 126 + 2 * (cell + 83) + gap + 68
sheet = Image.new('RGB', (w, h), BG)
d = ImageDraw.Draw(sheet)
d.text((margin, 22), 'MORPH LAB 09 / FIELD & SETTLEMENT', font=font(30, True), fill=INK)
d.text(
    (margin, 67),
    'Coverage-led additions: familiar land animals and daily-use NPC equipment.',
    font=font(19),
    fill=MUTED,
)
for i, r in enumerate(records):
    x = margin + i % 5 * (cell + gap)
    y = 126 + i // 5 * (cell + 83 + gap)
    im = (
        Image.open(SRC / (r['id'] + '-3.png'))
        .convert('RGB')
        .resize((cell, cell), Image.Resampling.LANCZOS)
    )
    sheet.paste(im, (x, y))
    d.text((x + 4, y + cell + 13), r['label'], font=font(22, True), fill=INK)
    d.text((x + 4, y + cell + 45), notes[r['id']], font=font(14), fill=MUTED)
d.text(
    (margin, h - 49),
    'Actual CPU geometry at phase 0.375. Each model is fitted separately. Jointed style; not a production-quality approval.',
    font=font(17),
    fill=MUTED,
)
d.text(
    (margin, h - 26),
    'Shared procedural parts and vertex pigment. GPU shading, physics, and two-hand constraints are not verified by this sheet.',
    font=font(16),
    fill=MUTED,
)
sheet.save(OUT / 'v9-model-gallery.png')
# Four normalized action cycles; one fixed camera frame for every phase of each model.
ids = ['trailhound', 'lamplighter', 'archivist', 'waypostarcher']
label = {r['id']: r['label'] for r in records}
frames = []
size = 340
for phase in range(8):
    im = Image.new('RGB', (size * 2 + 54, size * 2 + 155), BG)
    d = ImageDraw.Draw(im)
    d.text((18, 14), 'MORPH LAB / SAMPLED TASK CYCLES', font=font(22, True), fill=INK)
    for j, id in enumerate(ids):
        x = 18 + j % 2 * (size + 18)
        y = 54 + j // 2 * (size + 44)
        tile = (
            Image.open(SRC / (id + '-' + str(phase) + '.png'))
            .convert('RGB')
            .resize((size, size), Image.Resampling.LANCZOS)
        )
        im.paste(tile, (x, y))
        d.text((x + 4, y + size + 8), label[id], font=font(18, True), fill=INK)
    d.text(
        (18, im.height - 26),
        'Eight normalized phases / actual geometry / not a real-time game capture',
        font=font(15),
        fill=MUTED,
    )
    frames.append(im)
frames[0].save(
    OUT / 'v9-task-motion.gif',
    save_all=True,
    append_images=frames[1:],
    duration=190,
    loop=0,
    disposal=2,
)
# Four materials: per-pixel pigment and actual generated height map.
sw = OUT / 'v9-swatches'
surfaces = json.loads((sw / 'report.json').read_text())
w = 1300
h = 595
im = Image.new('RGB', (w, h), BG)
d = ImageDraw.Draw(im)
d.text((25, 20), 'FIELD SURFACES / PROCEDURAL PIGMENT + HEIGHT', font=font(26, True), fill=INK)
for i, s in enumerate(surfaces):
    x = 25 + i * 317
    im.paste(Image.open(sw / (s['id'] + '.png')).convert('RGB').resize((292, 292)), (x, 75))
    im.paste(Image.open(sw / (s['id'] + '-height.png')).convert('RGB').resize((126, 126)), (x, 384))
    d.text((x + 138, 394), 'Height map', font=font(17, True), fill=INK)
    d.text((x + 138, 424), s['micro'], font=font(15), fill=MUTED)
    d.text((x, 527), s['label'], font=font(18, True), fill=INK)
d.text(
    (25, 566),
    'CPU pigment sampled per pixel. Height textures are generated data. No GPU, physical hair, or cloth simulation is shown.',
    font=font(15),
    fill=MUTED,
)
im.save(OUT / 'v9-surface-atlas.png')
# Eight new modular families, three actual shapes each. Shared scale per family.
a = OUT / 'v9-part-atlas'
rr = json.loads((a / 'report.json').read_text())['rows']
types = [
    'beastleg',
    'brushtail',
    'worktool',
    'fieldlamp',
    'folio',
    'bowrig',
    'utilitybelt',
    'mantle',
]
cell = 230
im = Image.new('RGB', (1470, 1110), BG)
d = ImageDraw.Draw(im)
d.text((26, 22), 'EIGHT NEW PART FAMILIES / THREE SHAPES EACH', font=font(28, True), fill=INK)
for i, t in enumerate(types):
    ox = 26 + (i % 2) * 727
    oy = 80 + (i // 2) * 250
    d.text((ox, oy), t, font=font(17, True), fill=INK)
    for v in range(3):
        row = next(r for r in rr if r['type'] == t and r['variant'] == v)
        x = ox + v * 235
        tile = Image.open(a / (t + '-' + str(v) + '.png')).convert('RGB').resize((205, 205))
        im.paste(tile, (x, oy + 23))
        d.text((x, oy + 225), row['label'], font=font(14), fill=MUTED)
d.text(
    (26, 1080),
    'Actual shared geometry. The same part data feeds the Inspector and the Three.js adapter. No imported models or texture files.',
    font=font(16),
    fill=MUTED,
)
im.save(OUT / 'v9-part-options.png')
print('Created model, motion, surface, and part sheets from generated source images.')
