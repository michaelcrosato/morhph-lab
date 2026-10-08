import { PART_ARRAY_LAYOUTS, DEFAULT_PART_ARRAY } from '../core/part-arrays.js';
export function renderPartArrays(part, values = DEFAULT_PART_ARRAY) {
  const s = { ...DEFAULT_PART_ARRAY, ...values },
    options = (items, value) =>
      Object.entries(items)
        .map(
          ([id, label]) =>
            `<option value="${id}" ${id === value ? 'selected' : ''}>${label}</option>`,
        )
        .join('');
  return `<details class="part-array-panel"><summary>Part arrays</summary><p class="fine-copy">Keep this part and add independent copies. Count includes the source. One addition uses one undo step. Turn Mirror off for rings and fans.</p>
  <label class="select-row">Layout<select data-array-setting="layout" aria-label="Array layout">${options(PART_ARRAY_LAYOUTS, s.layout)}</select></label>
  <label class="select-row">Axis<select data-array-setting="axis" aria-label="Array axis">${options({ x: 'X / side', y: 'Y / up', z: 'Z / forward' }, s.axis)}</select></label>
  <label class="select-row">Total parts<input data-array-setting="count" aria-label="Array count" type="number" min="2" max="8" step="1" value="${s.count}"></label>
  <label class="select-row">Fan arc, degrees<input data-array-setting="span" aria-label="Array arc" type="number" min="5" max="330" step="5" value="${s.span}"></label>
  <label class="select-row">Row spacing, metres<input data-array-setting="spacing" aria-label="Array spacing" type="number" min=".02" max=".6" step=".02" value="${s.spacing}"></label>
  <label class="select-row">Phase step<input data-array-setting="phaseStep" aria-label="Array phase step" type="number" min="0" max="1" step=".05" value="${s.phaseStep}"></label>
  <p class="fine-copy">Ring and fan change anchor directions. Row changes local offsets. No array creates a linked rig or checks for part collisions.</p>
  <button class="quiet" data-action="apply-array">Add part array</button></details>`;
}
