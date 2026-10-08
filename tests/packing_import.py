"""Independent grouped GLB readback. Uses NumPy and trimesh, not the exporter reader.
Source pose fixtures come from the procedural compiler before material grouping.
This checks transfer, not GPU playback or Khronos conformance.
"""

import hashlib
import io
import json
import struct
import zipfile
from pathlib import Path

import numpy as np
import trimesh

ROOT = Path(__file__).resolve().parents[1]
# Written by scripts/packing-samples.mjs: report.json plus one directory per model id.
BASE = ROOT / 'test-results/packing'
if not (BASE / 'report.json').exists():
    raise SystemExit('Missing ' + str(BASE / 'report.json') + '. Run scripts/packing-samples.mjs.')
checks = []
records = []


def check(name, result):
    if not result:
        raise AssertionError(name)
    checks.append(name)


def read_glb(raw):
    magic, version, length = struct.unpack_from('<III', raw, 0)
    if (magic, version, length) != (0x46546C67, 2, len(raw)):
        raise ValueError('Invalid GLB header')
    n, kind = struct.unpack_from('<II', raw, 12)
    if kind != 0x4E4F534A:
        raise ValueError('Missing JSON chunk')
    j = json.loads(raw[20 : 20 + n])
    at = 20 + n
    n, kind = struct.unpack_from('<II', raw, at)
    binary = raw[at + 8 : at + 8 + n]
    if kind != 0x004E4942 or len(binary) != n:
        raise ValueError('Missing binary chunk')

    def accessor(index):
        a = j['accessors'][index]
        v = j['bufferViews'][a['bufferView']]
        width = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        dtype = np.dtype({5126: '<f4', 5123: '<u2', 5125: '<u4'}[a['componentType']])
        offset = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return (
            np.ndarray(
                (a['count'], width),
                dtype=dtype,
                buffer=binary,
                offset=offset,
                strides=(v.get('byteStride', width * dtype.itemsize), dtype.itemsize),
            )
            .copy()
            .reshape(-1)
        )

    return j, accessor


for item in json.loads((BASE / 'report.json').read_text())['records']:
    id = item['id']
    d = BASE / id
    raw = (d / 'model.glb').read_bytes()
    j, a = read_glb(raw)
    sj, sa = read_glb((d / 'separate.glb').read_bytes())
    manifest = json.loads((d / 'manifest.json').read_text())
    check(
        id + ' grouped primitive count',
        len(j['meshes']) == item['groupedMeshes'] < item['sourceMeshes'],
    )
    scene = trimesh.load(io.BytesIO(raw), file_type='glb', force='scene', process=False)
    assert isinstance(scene, trimesh.Scene), type(scene)
    check(id + ' trimesh loads all material groups', len(scene.geometry) == item['groupedMeshes'])
    check(
        id + ' independent triangle count',
        sum(len(m.faces) for m in scene.geometry.values()) == item['triangles'],
    )
    check(
        id + ' imported geometry is finite',
        all(np.isfinite(m.vertices).all() for m in scene.geometry.values()),
    )
    check(
        id + ' materials survive independent import',
        all(getattr(m.visual, 'material', None) is not None for m in scene.geometry.values()),
    )
    originals = {m['name']: m['primitives'][0] for m in sj['meshes']}
    mapped = []
    for node in j['nodes']:
        if 'mesh' not in node:
            continue
        p = j['meshes'][node['mesh']]['primitives'][0]
        for r in node['extras']['sourceRanges']:
            old = originals[r['name']]
            mapped.append(r['name'])
            start = r['firstVertex'] * 3
            end = start + r['vertexCount'] * 3
            for attr in ['POSITION', 'NORMAL', 'COLOR_0']:
                check(
                    id + ' ' + r['name'] + ' exact ' + attr,
                    np.array_equal(
                        a(p['attributes'][attr])[start:end], sa(old['attributes'][attr])
                    ),
                )
            check(
                id + ' ' + r['name'] + ' exact triangles',
                np.array_equal(
                    a(p['indices'])[r['firstIndex'] : r['firstIndex'] + r['indexCount']]
                    - r['firstVertex'],
                    sa(old['indices']),
                ),
            )
    check(
        id + ' each source component mapped exactly once',
        len(mapped) == len(set(mapped)) == len(originals) and set(mapped) == set(originals),
    )
    error_max = 0
    fixtures = json.loads((d / 'fixtures.json').read_text())
    for f in fixtures:
        weights = {}
        for animation in j.get('animations', []):
            for channel in animation['channels']:
                s = animation['samplers'][channel['sampler']]
                ts = a(s['input'])
                vs = a(s['output']).reshape(len(ts), -1)
                t = f['timeSeconds']
                lo = max(0, min(len(ts) - 1, int(np.searchsorted(ts, t, side='right') - 1)))
                hi = min(len(ts) - 1, lo + 1)
                fraction = 0 if hi == lo else np.clip((t - ts[lo]) / (ts[hi] - ts[lo]), 0, 1)
                weights[channel['target']['node']] = vs[lo] * (1 - fraction) + vs[hi] * fraction
        decoded = {}
        for ni, node in enumerate(j['nodes']):
            if 'mesh' not in node:
                continue
            m = j['meshes'][node['mesh']]
            p = m['primitives'][0]
            pos = a(p['attributes']['POSITION']).astype(np.float64)
            w = weights.get(ni, m.get('weights', []))
            for ti, target in enumerate(p.get('targets', [])):
                pos += a(target['POSITION']).astype(np.float64) * w[ti]
            for r in node['extras']['sourceRanges']:
                decoded[r['name']] = pos[
                    r['firstVertex'] * 3 : (r['firstVertex'] + r['vertexCount']) * 3
                ]
        expected = np.fromfile(d / f['file'], dtype='<f4')
        actual = np.concatenate([decoded[x['name']] for x in f['meshes']])
        error = float(np.max(np.abs(expected - actual)))
        error_max = max(error_max, error)
        check(id + ' independent source pose ' + str(f['phase']), error < 1e-5)
    with zipfile.ZipFile(d / 'asset.zip') as z:
        check(id + ' ZIP CRC', z.testzip() is None)
        check(id + ' ZIP GLB matches', z.read('model.glb') == raw)
        check(
            id + ' package file hashes',
            all(
                hashlib.sha256(z.read(x['name'])).hexdigest() == x['sha256']
                and len(z.read(x['name'])) == x['bytes']
                for x in manifest['files']
            ),
        )
    records.append(
        {
            'id': id,
            'meshes': item['groupedMeshes'],
            'triangles': item['triangles'],
            'poses': len(fixtures),
            'maxPositionErrorMetres': error_max,
        }
    )
report = {
    'suite': 'Independent material-grouped GLB imports, ranges and motion',
    'checks': len(checks),
    'passed': len(checks),
    'failures': 0,
    'source': 'Fresh procedural source buffers before grouping',
    'staticImporter': 'trimesh ' + str(trimesh.__version__),
    'animationDecoder': 'Independent Python / NumPy',
    'models': records,
    'gpuTested': False,
    'physicsTested': False,
    'khronosValidatorRun': False,
    'blenderTested': False,
    'unityTested': False,
    'unrealTested': False,
}
(BASE / 'import-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
