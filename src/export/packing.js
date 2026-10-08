/** Lossless delivery layout. No vertex weld, decimation, or source mutation.
 * Materials must match exactly. Preserve authored normals, colors, triangle order
 * within each source mesh, and a range map back to every source component.
 */
export function compilePacking(meshes, mode = 'separate') {
  if (!['separate', 'material'].includes(mode)) throw new Error('Unknown export mesh layout.');
  const groups = new Map(),
    names = new Set();
  for (const [index, m] of meshes.entries()) {
    if (names.has(m.name)) throw new Error('Duplicate source mesh name.');
    names.add(m.name);
    const key = mode === 'material' ? m.material : m.name;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(index);
  }
  const batches = [...groups].map(([key, list]) => {
    let vertexOffset = 0,
      indexOffset = 0;
    const ranges = list.map(index => {
      const m = meshes[index],
        r = {
          index,
          name: m.name,
          material: m.material,
          firstVertex: vertexOffset,
          vertexCount: m.positions.length / 3,
          firstIndex: indexOffset,
          indexCount: m.indices.length,
        };
      vertexOffset += r.vertexCount;
      indexOffset += r.indexCount;
      return r;
    });
    const indices = new Uint32Array(indexOffset);
    for (const r of ranges) {
      const m = meshes[r.index];
      for (let k = 0; k < m.indices.length; k++)
        indices[r.firstIndex + k] = m.indices[k] + r.firstVertex;
    }
    return {
      name: mode === 'material' ? 'material/' + key : key,
      material: meshes[list[0]].material,
      vertexCount: vertexOffset,
      indices,
      ranges,
    };
  });
  return { mode, sourceMeshes: meshes.length, batches };
}
export function packMeshes(plan, meshes, colorForMesh = null) {
  if (meshes.length !== plan.sourceMeshes) throw new Error('Packing source mesh count changed.');
  return plan.batches.map(batch => {
    const positions = new Float32Array(batch.vertexCount * 3),
      normals = new Float32Array(positions.length),
      vertexColors = colorForMesh ? new Float32Array(positions.length) : null;
    for (const r of batch.ranges) {
      const m = meshes[r.index];
      if (
        !m ||
        m.name !== r.name ||
        m.material !== r.material ||
        m.positions.length !== r.vertexCount * 3 ||
        m.indices.length !== r.indexCount
      )
        throw new Error('Packing source topology changed.');
      for (let k = 0; k < m.indices.length; k++)
        if (batch.indices[r.firstIndex + k] !== m.indices[k] + r.firstVertex)
          throw new Error('Packing source index order changed.');
      positions.set(m.positions, r.firstVertex * 3);
      normals.set(m.normals, r.firstVertex * 3);
      if (vertexColors) {
        const c = colorForMesh(m);
        if (c.length !== m.positions.length) throw new Error('Packing color length changed.');
        vertexColors.set(c, r.firstVertex * 3);
      }
    }
    return {
      name: batch.name,
      material: batch.material,
      positions,
      normals,
      indices: batch.indices,
      vertexColors,
      sourceRanges: batch.ranges.map(({ index, ...range }) => range),
    };
  });
}
export function packingReport(plan) {
  return {
    mode: plan.mode,
    sourceMeshes: plan.sourceMeshes,
    exportMeshes: plan.batches.length,
    meshesRemoved: plan.sourceMeshes - plan.batches.length,
    verticesRemoved: 0,
    trianglesRemoved: 0,
    changesShape: false,
    changesSampledAnimation: false,
    sourceRanges: plan.batches.map(b => ({
      name: b.name,
      material: b.material,
      ranges: b.ranges.map(({ index, ...r }) => r),
    })),
    note: 'Material grouping changes node names and granularity. Keep Separate meshes when individual components must remain addressable. This is not mesh simplification or a frame-rate measurement.',
  };
}
