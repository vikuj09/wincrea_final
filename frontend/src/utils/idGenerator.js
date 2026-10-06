let counters = {};

/**
 * Generates short, human-legible, sequential IDs per prefix, e.g. RL-000042.
 * Sequence is seeded from the highest existing ID so it survives reloads.
 */
export function seedCounter(prefix, existingIds = []) {
  const nums = existingIds
    .filter((id) => id && id.startsWith(prefix + '-'))
    .map((id) => parseInt(id.split('-')[1], 10))
    .filter((n) => !Number.isNaN(n));
  counters[prefix] = nums.length ? Math.max(...nums) : 0;
}

export function nextId(prefix) {
  counters[prefix] = (counters[prefix] || 0) + 1;
  return `${prefix}-${String(counters[prefix]).padStart(6, '0')}`;
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
