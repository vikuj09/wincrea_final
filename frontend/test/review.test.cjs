const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const parser = require('@babel/parser');

// Execute the actual component calculation with API-shaped fixtures.
function extract(file, name, type = 'VariableDeclarator') {
  const source = fs.readFileSync(path.join(__dirname, '../src', file), 'utf8');
  const ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] });
  let result;
  function walk(node) {
    if (!node || typeof node !== 'object' || result) return;
    if (node.type === type && node.id?.name === name) {
      const target = type === 'VariableDeclarator' ? node.init : node;
      result = source.slice(target.start, target.end); return;
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === 'object') walk(value);
    }
  }
  walk(ast); assert(result, name); return result;
}
const fixture = [{
  id: 1, transaction_type: 'OUTWARD', created_at: new Date().toISOString(),
  customer_id: 3, total_quantity: 65, total_rolls: 2,
  items: [
    { item_id: 11, product_id: 1, quantity: 25, roll_number: 'R1', sku: 'A' },
    { item_id: 12, product_id: 2, quantity: 40, roll_number: 'R2', sku: 'B' },
  ],
}];

test('analytics and ledger retain every transaction item without repeating invoice totals', async () => {
  const { transactionItems } = await import('../src/utils/transactions.js');
  const helpers = ['getTransactionType','getTransactionMeters','getTransactionProductId','getTransactionDate']
    .map(n => extract('pages/Analytics.jsx', n, 'FunctionDeclaration')).join('\n');
  const { buildLedgerEntries } = await import('../src/utils/ledger.js');
  const context = { transactions: fixture, adjustments: [], transactionItems, buildLedgerEntries, useMemo: f => f() };
  const analytics = vm.runInNewContext(helpers + '\n' + extract('pages/Analytics.jsx', 'analyticsLedger'), context);
  assert.equal(analytics.length, 2); assert.equal(analytics.reduce((n, row) => n + row.meters, 0), 65);
  const ledger = vm.runInNewContext(extract('pages/Ledger.jsx', 'ledgerEntries'), context);
  assert.equal(ledger.length, 2); assert.equal(ledger[1].sku, 'B'); assert.equal(ledger[1].quantity, 40);
});

test('customer dispatch history reads live transactions for the selected customer', async () => {
  const { transactionItems } = await import('../src/utils/transactions.js');
  const code = extract('pages/Customers.jsx', 'historyFor', 'FunctionDeclaration');
  const rows = vm.runInNewContext(code + '; historyFor(3);', { transactions: fixture, transactionItems });
  assert.equal(rows.length, 2); assert.equal(rows[0].meters, 25);
  assert.equal(vm.runInNewContext(code + '; historyFor(9);', { transactions: fixture, transactionItems }).length, 0);
});

test('dashboard trend sums transaction totals rather than absent item fields', () => {
  const data = vm.runInNewContext(extract('pages/Dashboard.jsx', 'trend'), {
    transactions: fixture, useMemo: f => f(), lastNDays: () => ['today'],
    isSameDay: () => true, formatDate: () => 'today',
  });
  assert.equal(data[0].Outward, 65);
});

test('partial returns remain selectable and use the server return allowance', async () => {
  const rolls = [{ id: 1, originalLength: 100, length: 20, remainingLength: 20, returnableQuantity: 40, status: 'AVAILABLE' },
    { id: 2, length: 0, returnableQuantity: 0, status: 'EMPTY' }];
  const data = vm.runInNewContext(extract('pages/Returns.jsx', 'dispatched'), { rolls, useMemo: f => f() });
  assert.equal(data.length, 1);
  let quantity;
  vm.runInNewContext(extract('pages/Returns.jsx', 'openReturn', 'FunctionDeclaration') + '; openReturn(roll);', {
    roll: rolls[0], setReturningRoll() {}, setQuantity: value => { quantity = value; }, setNote() {}, setError() {}, setSuccess() {},
  });
  assert.equal(quantity, '40');
});

test('printing escapes malicious names, colours, addresses and remarks', async () => {
  const { escapePrintData } = await import('../src/utils/escapePrintData.js');
  const payload = '<img src=x onerror="alert(1)">'; let html = '';
  const popup = { document: { open() {}, close() {}, write(value) { html += value; } } };
  const pi = { piNumber: 'PI-1', remarks: payload, items: [{ productName: payload, color: payload, quantity: 2, ratePerMeter: 10 }] };
  vm.runInNewContext(extract('pages/Suppliers.jsx', 'printPI', 'FunctionDeclaration') + '; printPI(pi, customer);', {
    escapePrintData, pi, customer: { name: payload, address: payload }, formatDate: () => '',
    window: { open: () => popup, location: { origin: 'https://example.invalid' } },
  });
  assert(!html.includes(payload)); assert(html.includes('&lt;img'));
  assert.equal(pi.remarks, payload, 'printing must not mutate stored data');
});

test('API helper attaches current token and preserves multipart content headers', async () => {
  const { apiFetch } = await import('../src/api/apiFetch.js');
  const originalFetch = global.fetch;
  global.localStorage = { getItem: () => 'fixture-token' };
  let options;
  global.fetch = async (_, value) => { options = value; return {}; };
  try {
    const body = new FormData(); body.set('file', 'fixture');
    await apiFetch('/api/inward/excel', { method: 'POST', body });
    assert.equal(options.headers.get('Authorization'), 'Bearer fixture-token');
    assert.equal(options.headers.get('Content-Type'), null);
    assert.equal(options.body, body);
  } finally { global.fetch = originalFetch; delete global.localStorage; }
});

test('clear-all sends confirmation and only clears inventory state after API success', async () => {
  const code = extract('context/AppContext.jsx', 'clearAll');
  for (const ok of [true, false]) {
    const cleared = []; let request;
    const context = {
      useCallback: f => f, API_BASE: '/api',
      fetch: async (url, options) => { request = { url, options }; return { ok, json: async () => ({ message: ok ? 'Cleared' : 'Deletion failed' }) }; },
      setCustomers() { assert.fail('Customers must be kept'); },
      setSuppliers() { assert.fail('Suppliers must be kept'); },
      setUsers() { assert.fail('Users must be kept'); },
    };
    for (const name of ['Products', 'Rolls', 'Transactions', 'PurchaseOrders', 'Adjustments', 'ProformaInvoices', 'Ledger']) {
      context[`set${name}`] = value => { assert.equal(value.length, 0); cleared.push(name); };
    }
    const clear = vm.runInNewContext(code, context);
    if (ok) { await clear('CLEAR'); assert.equal(cleared.length, 7); }
    else { await assert.rejects(clear('CLEAR'), /Deletion failed/); assert.equal(cleared.length, 0); }
    assert.equal(request.url, '/api/admin/clear-data');
    assert.equal(JSON.parse(request.options.body).confirmation, 'CLEAR');
  }
});

test('30-day outward total includes the boundary and excludes older, future and non-outward records', () => {
  const now = Date.parse('2026-11-23T12:00:00Z');
  const cutoff = now - 30 * 86400000;
  class FixedDate extends Date { static now() { return now; } }
  const movement = (time, type = 'OUTWARD', meters = 12.5) => ({
    transaction_type: type, created_at: new Date(time).toISOString(), total_quantity: String(meters), total_rolls: 2,
  });
  const transactions = [movement(cutoff), movement(now), movement(cutoff - 1), movement(now + 1),
    movement(now, 'RETURN'), movement(now, 'INWARD'), movement(now, 'DRAFT'),
    { transaction_type: 'OUTWARD', created_at: 'invalid', total_quantity: 999 },
    { transaction_type: 'OUTWARD', created_at: new Date(now).toISOString(), total_quantity: 5, items: [{}] }];
  const expression = extract('pages/Dashboard.jsx', 'last30DaysOut');
  const result = vm.runInNewContext(expression, { transactions, useMemo: f => f(), Date: FixedDate });
  assert.equal(result.meters, 30); assert.equal(result.rolls, 5);
  const empty = vm.runInNewContext(expression, { transactions: [], useMemo: f => f(), Date: FixedDate });
  assert.equal(empty.meters, 0); assert.equal(empty.rolls, 0);
});

test('outward metre range includes boundaries and composes with product and text filters', () => {
  const rangeError = extract('pages/Outward.jsx', 'meterFilterError');
  const expression = extract('pages/Outward.jsx', 'availableRolls');
  const context = {
    useMemo: f => f(), productId: 'All', query: '', minMeters: '', maxMeters: '',
    productMap: { 1: { sku: 'ESS-1' }, 2: { sku: 'PRE-2' } },
    rolls: [
      { id: 1, productId: 1, status: 'AVAILABLE', remainingLength: 20 },
      { id: 2, productId: 1, status: 'AVAILABLE', remainingLength: '25.50', originalLength: 80 },
      { id: 3, productId: 2, status: 'AVAILABLE', remainingLength: 30 },
      { id: 4, productId: 1, status: 'EMPTY', remainingLength: 25 },
      { id: 5, productId: 1, status: 'AVAILABLE', remainingLength: 0 },
    ],
  };
  function ids(options) {
    const ctx = { ...context, ...options };
    ctx.meterFilterError = vm.runInNewContext(rangeError, ctx);
    return Array.from(vm.runInNewContext(expression, ctx), roll => roll.id);
  }
  assert.deepEqual(ids({ minMeters: '20', maxMeters: '30' }), [1, 2, 3]);
  assert.deepEqual(ids({ minMeters: '25.5', maxMeters: '25.5' }), [2]);
  assert.deepEqual(ids({ minMeters: '25' }), [2, 3]);
  assert.deepEqual(ids({ maxMeters: '25.5' }), [1, 2]);
  assert.deepEqual(ids({ minMeters: '20', maxMeters: '30', productId: '1', query: 'ess' }), [1, 2]);
  assert.deepEqual(ids({ minMeters: '31', maxMeters: '20' }), []);
  assert.deepEqual(ids({ minMeters: '-1' }), []);
  assert.deepEqual(ids({}), [1, 2, 3]);
});

test('ledger normalizes SET and DECREASE adjustments and calculates signed movement', async () => {
  const { buildLedgerEntries } = await import('../src/utils/ledger.js');
  const entries = buildLedgerEntries(fixture, [
    { id: 1, adjustment_type: 'SET', previous_length: '50.5', new_length: '40', product_name: 'Linen', roll_number: 'R1' },
    { id: 2, adjustmentType: 'DECREASE', quantity: '2.5', previousLength: 40, newLength: 37.5 },
    { id: 3, adjustmentType: 'INCREASE', quantity: 3, previousLength: 37.5, newLength: 40.5 },
  ]);
  assert.equal(entries.length, 5);
  assert.equal(entries[0].stock_change, -25);
  assert.equal(entries[2].quantity, -10.5);
  assert.equal(entries[2].product_name, 'Linen');
  assert.equal(entries[3].quantity, -2.5);
  const totals = vm.runInNewContext(extract('pages/Ledger.jsx', 'totals'), { filtered: entries, useMemo: f => f() });
  assert.equal(totals.outward, 65); assert.equal(totals.net, -75);
});

test('ledger combines product search, type and inclusive local date filters', async () => {
  const { buildLedgerEntries, ledgerDate } = await import('../src/utils/ledger.js');
  const ledgerEntries = buildLedgerEntries([
    { ...fixture[0], created_at: new Date(2026, 10, 23, 0, 0).toISOString(), items: [{ item_id: 1, product_name: 'Blue Linen', quantity: 25 }] },
    { ...fixture[0], id: 2, transaction_type: 'RETURN', created_at: new Date(2026, 10, 23, 23, 59).toISOString(), items: [{ item_id: 2, product_name: 'Blue Linen', quantity: 5 }] },
    { ...fixture[0], id: 3, created_at: new Date(2026, 10, 22, 23, 59).toISOString(), items: [{ item_id: 3, product_name: 'Blue Linen', quantity: 99 }] },
  ], []);
  const context = { ledgerEntries, ledgerDate, useMemo: f => f(), query: ' linen ', typeFilter: 'All', fromDate: '2026-11-23', toDate: '2026-11-23', invalidRange: false };
  const expression = extract('pages/Ledger.jsx', 'filtered');
  const all = vm.runInNewContext(expression, context);
  assert.equal(all.length, 2); assert.equal(all[0].transaction_type, 'RETURN');
  const outward = vm.runInNewContext(expression, { ...context, typeFilter: 'OUTWARD' });
  assert.equal(outward.length, 1); assert.equal(outward[0].quantity, 25);
  assert.equal(vm.runInNewContext(expression, { ...context, invalidRange: true }).length, 0);
  assert.equal(vm.runInNewContext(expression, { ...context, query: 'absent' }).length, 0);
});
