"""Independent GLB inspection. Trimesh checks static imports. NumPy decodes the
standard morph-weight animation and compares every vertex with original source samples.
This is not Khronos conformance validation or target-game GPU verification.
"""

from pathlib import Path
import json, struct, hashlib, zipfile, io
import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results/v10'
BASE = OUT / 'samples'
records = []
checks = []


def check(name, value):
    if not value:
        raise AssertionError(name)
    checks.append(name)


for item in json.loads((BASE / 'index.json').read_text()):
    id = item['id']
    directory = BASE / id
    raw = (directory / 'model.glb').read_bytes()
    magic, version, length = struct.unpack_from('<III', raw, 0)
    check(id + ' header and length', (magic, version, length) == (0x46546C67, 2, len(raw)))
    json_length, kind = struct.unpack_from('<II', raw, 12)
    j = json.loads(raw[20 : 20 + json_length])
    at = 20 + json_length
    bin_length, bin_kind = struct.unpack_from('<II', raw, at)
    b = raw[at + 8 :]
    check(
        id + ' chunks aligned',
        json_length % 4 == 0
        and bin_length % 4 == 0
        and bin_kind == 0x004E4942
        and bin_length == len(b),
    )
    widths = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}
    types = {5126: '<f4', 5123: '<u2', 5125: '<u4'}

    def accessor(n):
        a = j['accessors'][n]
        v = j['bufferViews'][a['bufferView']]
        offset = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return np.frombuffer(
            b, dtype=types[a['componentType']], count=a['count'] * widths[a['type']], offset=offset
        ).copy()

    scene = trimesh.load(io.BytesIO(raw), file_type='glb', force='scene', process=False)
    check(id + ' loads in independent trimesh', len(scene.geometry) == item['meshes'])
    check(
        id + ' independent triangle count',
        sum(len(m.faces) for m in scene.geometry.values()) == item['triangles'],
    )
    check(
        id + ' finite independent geometry',
        all(np.isfinite(m.vertices).all() for m in scene.geometry.values()),
    )
    check(
        id + ' PBR materials imported',
        all(getattr(m.visual, 'material', None) is not None for m in scene.geometry.values()),
    )
    max_error = 0.0
    for fixture in item['fixtures']:
        weights = {}
        for anim in j.get('animations', []):
            for c in anim['channels']:
                s = anim['samplers'][c['sampler']]
                ts = accessor(s['input'])
                values = accessor(s['output']).reshape(len(ts), -1)
                time = fixture['time']
                lo = max(0, min(len(ts) - 1, int(np.searchsorted(ts, time, side='right') - 1)))
                hi = min(len(ts) - 1, lo + 1)
                t = 0 if hi == lo else np.clip((time - ts[lo]) / (ts[hi] - ts[lo]), 0, 1)
                weights[c['target']['node']] = values[lo] * (1 - t) + values[hi] * t
        decoded = []
        for ni, node in enumerate(j['nodes']):
            if 'mesh' not in node:
                continue
            mesh = j['meshes'][node['mesh']]
            w = weights.get(ni, mesh.get('weights', []))
            for p in mesh['primitives']:
                pos = accessor(p['attributes']['POSITION']).astype(np.float64)
                for ti, target in enumerate(p.get('targets', [])):
                    pos += accessor(target['POSITION']).astype(np.float64) * w[ti]
                decoded.append(pos)
        expected = np.frombuffer((directory / fixture['file']).read_bytes(), dtype='<f4')
        actual = np.concatenate(decoded)
        error = float(np.max(np.abs(expected - actual)))
        max_error = max(max_error, error)
        check(id + ' source pose ' + str(fixture['phase']), error < 3e-6)
    with zipfile.ZipFile(directory / (id + '.asset.zip')) as z:
        check(id + ' ZIP CRC', z.testzip() is None)
        m = json.loads(z.read('manifest.json'))
        check(id + ' ZIP model matches independent GLB', z.read('model.glb') == raw)
        check(
            id + ' SHA256 records match',
            all(
                hashlib.sha256(z.read(f['name'])).hexdigest() == f['sha256']
                and len(z.read(f['name'])) == f['bytes']
                for f in m['files']
            ),
        )
    records.append(
        {
            'preset': id,
            'mode': item['mode'],
            'triangles': item['triangles'],
            'meshes': item['meshes'],
            'posesChecked': len(item['fixtures']),
            'maxVertexErrorMetres': max_error,
            'staticImporter': 'trimesh ' + trimesh.__version__,
        }
    )
report = {
    'suite': 'Independent GLB static import and morph animation readback',
    'passed': len(checks),
    'checks': checks,
    'models': records,
    'khronosValidatorRun': False,
    'blenderTested': False,
    'unityTested': False,
    'unrealTested': False,
    'gpuTested': False,
    'physicsTested': False,
}
(OUT / 'independent-import.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps({k: v for k, v in report.items() if k != 'checks'}, indent=2))
