"""Assemble actual geometry renders. Requires Pillow, not a graphics engine.
Run npm run review:bloom -- --render and npm run swatches:bloom first.
No model pixels are drawn over or replaced with concept art.
"""

from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
SOURCE = OUT / 'v8-bloom-batch'
report = json.loads((SOURCE / 'report.json').read_text())
FONT = Path('/usr/share/fonts/truetype/dejavu')


def font(size, bold=False):
    try:
        return ImageFont.truetype(
            str(FONT / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')), size
        )
    except OSError:
        return ImageFont.load_default()


BG, INK, MUTED = '#f3f5f1', '#203b3d', '#5d7070'
notes = {
    'pebbleroller': 'Jointed legs / overlapping curved plates',
    'mossstrider': 'Tall legs / neck / sweeping whiskers',
    'crowngrazer': 'Six legs / flower crown / iris mouth',
    'duneauger': 'Long body / cup stems / iris mouth',
    'clapshell': 'Two hinged valves / cup stems',
    'lanternpolyp': 'Cup crown / open light basket',
    'bristleskate': 'Flat body / whiskers / split trunk',
    'suckerribbon': 'Four-body chain / sequenced cups',
    'bloomkite': 'Two petal tiers / float mode',
    'basketdrifter': 'Diamond cage / whiskers / curled trunk',
    'apiarist': 'Beaked mask / back cage / cup tool',
    'shrinesentinel': 'Slit visor / shoulder cages / plates',
    'marshforager': 'Trunk / whiskers / plated back',
    'thornenvoy': 'Petal crown / leaf mask / shoulder petals',
}
cell, gap, margin = 338, 18, 28
w = margin * 2 + cell * 4 + gap * 3
h = 178 + 4 * (cell + 78) + 3 * gap + 76
sheet = Image.new('RGB', (w, h), BG)
d = ImageDraw.Draw(sheet)
d.text((margin, 22), 'MORPH LAB / CARAPACE & BLOOM', font=font(32, True), fill=INK)
d.text(
    (margin, 72),
    '14 procedural models / 4 ground + 4 water + 2 air + 4 humanoids',
    font=font(22),
    fill=INK,
)
d.text(
    (margin, 112),
    'Actual body and attachment geometry. Every model uses editable part recipes.',
    font=font(17),
    fill=MUTED,
)
d.text(
    (margin, 140),
    'CPU vertex pigment preview, not a GPU material capture.',
    font=font(16),
    fill=MUTED,
)
for i, row in enumerate(report['records']):
    x, y = margin + i % 4 * (cell + gap), 178 + i // 4 * (cell + 78 + gap)
    im = (
        Image.open(SOURCE / (row['id'] + '-2.png'))
        .convert('RGB')
        .resize((cell, cell), Image.Resampling.LANCZOS)
    )
    sheet.paste(im, (x, y))
    d.text((x + 8, y + cell + 8), row['label'], font=font(20, True), fill=INK)
    d.text((x + 8, y + cell + 38), notes[row['id']], font=font(12), fill=MUTED)
    role = (
        'HUMANOID'
        if row['id'] in ['apiarist', 'shrinesentinel', 'marshforager', 'thornenvoy']
        else row['medium'].upper()
    )
    d.text((x + 8, y + cell + 58), role, font=font(11, True), fill=MUTED)
# Use the two unused grid positions for scope notes, not invented models.
for i, title, lines in [
    (
        14,
        'REUSABLE PARTS',
        [
            '10 new families / 30 shapes',
            'Ring, fan, and row arrays',
            'Independent phase and material',
            'Ordinary editable genes',
            'One array = one undo step',
        ],
    ),
    (
        15,
        'REVIEW SCOPE',
        [
            '112 actual geometry samples',
            '0 omitted new-model genes',
            'Humanoid joint mounts included',
            'Technical checks are not approval',
            'GPU and physics not verified',
        ],
    ),
]:
    x, y = margin + i % 4 * (cell + gap), 178 + i // 4 * (cell + 78 + gap)
    d.line((x + 14, y + 62, x + cell - 14, y + 62), fill='#c5d0cb', width=2)
    d.text((x + 14, y + 91), title, font=font(21, True), fill=INK)
    for j, line in enumerate(lines):
        d.text((x + 14, y + 142 + j * 36), line, font=font(14), fill=MUTED)
d.text(
    (margin, h - 51),
    'Each model is fitted separately. All sampled phases of one model share one camera scale.',
    font=font(15),
    fill=MUTED,
)
d.text(
    (margin, h - 27),
    'Procedural foundations, not finished production characters. No self-intersection or contact approval.',
    font=font(14),
    fill=MUTED,
)
sheet.save(OUT / 'v8-model-library.png', optimize=True)
selected = [
    ('pebbleroller', 'Ripple walk / jointed leg banks'),
    ('clapshell', 'Shell clap / hinged valves'),
    ('bloomkite', 'Bloom cycle / curling petals'),
    ('shrinesentinel', 'Salute / joint-mounted parts'),
]
frames = []
cell = 352
w = 28 * 2 + cell * 2 + 16
h = 112 + 2 * (cell + 52) + 16 + 64
for phase in range(8):
    frame = Image.new('RGB', (w, h), BG)
    d = ImageDraw.Draw(frame)
    d.text((28, 20), 'MORPH LAB / MOTION SAMPLES', font=font(25, True), fill=INK)
    d.text(
        (28, 62),
        f'Actual geometry / phase {phase / 8:.3f} / fixed frame per model',
        font=font(14),
        fill=MUTED,
    )
    d.text(
        (28, 86),
        'Creatures: 2-second window. Salute: one full 2.5-second action.',
        font=font(12),
        fill=MUTED,
    )
    for i, (key, label) in enumerate(selected):
        x, y = 28 + i % 2 * (cell + 16), 112 + i // 2 * (cell + 52 + 16)
        im = (
            Image.open(SOURCE / f'{key}-{phase}.png')
            .convert('RGB')
            .resize((cell, cell), Image.Resampling.LANCZOS)
        )
        frame.paste(im, (x, y))
        d.text((x + 8, y + cell + 14), label, font=font(16, True), fill=INK)
    d.text(
        (28, h - 46),
        'Eight frames repeat at a common display rate; not a seamless clip.',
        font=font(13),
        fill=MUTED,
    )
    d.text(
        (28, h - 25),
        'Movement, ground clearance, and prop contact are visual, not simulated here.',
        font=font(12),
        fill=MUTED,
    )
    frames.append(frame)
frames[0].save(
    OUT / 'v8-motion-samples.gif',
    save_all=True,
    append_images=frames[1:],
    duration=250,
    loop=0,
    optimize=False,
)
entries = json.loads((OUT / 'v8-swatches/report.json').read_text())
cell = 275
w = 28 * 2 + 4 * cell + 3 * 16
h = 150 + 2 * (cell + 115) + 16 + 58
sheet = Image.new('RGB', (w, h), BG)
d = ImageDraw.Draw(sheet)
d.text((28, 24), 'MORPH LAB / PROCEDURAL SURFACES', font=font(28, True), fill=INK)
d.text(
    (28, 71),
    'Eight new pigment fields with actual generated height textures.',
    font=font(18),
    fill=MUTED,
)
d.text(
    (28, 107),
    'Per-pixel CPU fields / one comparison palette and seed / no GPU material rendering',
    font=font(13),
    fill=MUTED,
)
for i, row in enumerate(entries):
    x, y = 28 + i % 4 * (cell + 16), 150 + i // 4 * (cell + 115 + 16)
    im = (
        Image.open(OUT / 'v8-swatches' / f'{row["id"]}.png')
        .convert('RGB')
        .resize((cell, cell), Image.Resampling.LANCZOS)
    )
    sheet.paste(im, (x, y))
    d.text((x + 5, y + cell + 6), row['label'], font=font(17, True), fill=INK)
    d.text((x + 5, y + cell + 31), row['pattern'], font=font(13), fill=MUTED)
    strip = (
        Image.open(OUT / 'v8-swatches' / f'{row["id"]}-height.png')
        .convert('RGB')
        .resize((48, 48), Image.Resampling.NEAREST)
    )
    sheet.paste(strip, (x + 5, y + cell + 53))
    d.text((x + 64, y + cell + 62), row['micro'] + ' / height', font=font(12), fill=MUTED)
d.text(
    (28, h - 31),
    'Relief, metalness, emission, and roughness need a separate GPU material check.',
    font=font(14),
    fill=MUTED,
)
sheet.save(OUT / 'v8-surface-atlas.png', optimize=True)
print('Created actual-model sheet, motion samples, and surface atlas.')
