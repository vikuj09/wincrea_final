const test = require('node:test');
const assert = require('node:assert/strict');

test('repeat orders combine products and do not carry historical roll IDs or rates into a new order', async () => {
  const { repeatRequirements } = await import('../src/utils/userWorkspace.js');
  assert.deepEqual(repeatRequirements({ items: [
    { product_id: 5, sku: 'FAB-5', quantity: '25.5', roll_id: 8, rate: 99 },
    { product_id: 5, sku: 'FAB-5', quantity: '30', roll_id: 9 },
    { product_id: 6, sku: 'FAB-6', quantity: 10, roll_id: 10 },
    { product_id: null, quantity: 50 },
  ] }), [
    { productId: 5, sku: 'FAB-5', meters: 55.5, rolls: 2 },
    { productId: 6, sku: 'FAB-6', meters: 10, rolls: 1 },
  ]);
  assert.deepEqual(repeatRequirements({}), []);
});

test('pending tasks contain only the signed-in user’s drafts in oldest-first order', async () => {
  const { myDrafts } = await import('../src/utils/userWorkspace.js');
  const invoices = [
    { id: 1, createdBy: 7, status: 'CONFIRMED', createdAt: '2026-01-01' },
    { id: 2, createdBy: 8, status: 'DRAFT', createdAt: '2026-01-02' },
    { id: 3, createdBy: '7', status: 'DRAFT', createdAt: '2026-02-01' },
    { id: 4, createdBy: 7, status: 'DRAFT', createdAt: '2026-01-03' },
    { id: 5, createdBy: 7, status: 'CANCELLED', createdAt: '2026-01-04' },
  ];
  assert.deepEqual(myDrafts(invoices, 7).map(pi => pi.id), [4, 3]);
  assert.deepEqual(myDrafts(invoices, null), []);
});

test('saved workspaces isolate users and pages, survive reload, and reject corrupt data', async () => {
  const { workspaceKey, readWorkspace } = await import('../src/utils/userWorkspace.js');
  const data = new Map();
  const storage = { getItem: key => data.get(key) ?? null };
  const key = workspaceKey(7, 'filters:Outward');
  const preset = [{ name: 'Short rolls', values: { minMeters: '10', maxMeters: '20' } }];
  data.set(key, JSON.stringify(preset));
  assert.deepEqual(readWorkspace(storage, key), preset);
  assert.deepEqual(readWorkspace(storage, workspaceKey(8, 'filters:Outward')), []);
  assert.deepEqual(readWorkspace(storage, workspaceKey(7, 'filters:Ledger')), []);
  data.set(key, '{}');
  assert.throws(() => readWorkspace(storage, key));
  data.set(key, '{broken');
  assert.throws(() => readWorkspace(storage, key));
});
