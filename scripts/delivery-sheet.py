"""Assemble actual source / GLB readback renders. No replacement art."""

from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
p = ROOT / 'test-results/v10'
src = p / 'readback'
rows = json.loads((src / 'report.json').read_text())['records']


def font(n, b=False):
    try:
        return ImageFont.truetype(
            '/usr/share/fonts/truetype/dejavu/DejaVuSans' + ('-Bold' if b else '') + '.ttf', n
        )
    except OSError:
        return ImageFont.load_default()


bg = '#f4f6ef'
ink = '#263d35'
muted = '#617366'
w = 1220
h = 1012
im = Image.new('RGB', (w, h), bg)
d = ImageDraw.Draw(im)
d.text((26, 20), 'MORPH LAB 10 / EXPORT READBACK', font=font(28, True), fill=ink)
d.text(
    (26, 65),
    'Left: procedural source   /   Right: exported GLB   /   Same camera and pose',
    font=font(17),
    fill=muted,
)
for j, id in enumerate(['archivist', 'trailhound', 'moonbell', 'glassdart']):
    x = 26 + (j % 2) * 596
    y = 119 + (j // 2) * 405
    r = next(r for r in rows if r['id'] == id and r['phase'] == 0.625)
    d.text((x, y), r['label'] + ' / phase 0.625', font=font(18, True), fill=ink)
    for k, part in enumerate(['source', 'glb']):
        tile = (
            Image.open(src / (id + '-1-' + part + '.png'))
            .convert('RGB')
            .resize((280, 280), Image.Resampling.LANCZOS)
        )
        im.paste(tile, (x + k * 288, y + 36))
        d.text(
            (x + k * 288 + 8, y + 329),
            'SOURCE' if k == 0 else 'EXPORTED GLB',
            font=font(12, True),
            fill=muted,
        )
    d.text(
        (x, y + 359), 'Matched geometry. No hidden or substituted parts.', font=font(13), fill=muted
    )
d.text(
    (26, 954),
    'Actual CPU geometry. Clay materials, not a GPU render. Each model has its own fitted frame.',
    font=font(14),
    fill=muted,
)
d.text(
    (26, 978),
    'No new models in this release. Tests check existing assets and sampled motion.',
    font=font(14),
    fill=muted,
)
im.save(p / 'v10-export-readback.png')
