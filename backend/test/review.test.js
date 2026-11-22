const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
process.env.JWT_SECRET = 'isolated-test-secret';
const pool = {};
const dbPath = require.resolve('../src/config/db');
require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: pool };
const app = require('../src/server');
const jwt = require('jsonwebtoken');

function request(method, url, body = {}, token) {
  return new Promise((resolve, reject) => {
    const req = new http.IncomingMessage(null);
    req.method = method; req.url = url; req.body = body;
    req.headers = token ? { authorization: `Bearer ${token}` } : {};
    const res = new http.ServerResponse(req);
    res.json = data => { resolve({ status: res.statusCode, data }); return res; };
    app.handle(req, res, reject);
  });
}
function response() {
  return { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(data) { this.data = data; return this; } };
}

test('private routes reject anonymous requests; public sharing remains accessible', async () => {
  pool.query = async () => { throw new Error('Anonymous private requests must not query DB'); };
  for (const route of ['users', 'customers', 'suppliers', 'products', 'rolls', 'inward', 'outward', 'return', 'adjustments', 'transactions', 'purchase-orders', 'proforma-invoices', 'share']) {
    const result = await request('POST', `/api/${route}`, { role: 'ADMIN' });
    assert.equal(result.status, 401, route);
  }
  pool.query = async () => [[]];
  assert.equal((await request('GET', '/api/share/public/unknown')).status, 404);
  assert.equal((await request('GET', '/api/health')).status, 200);
});

test('STAFF cannot manage users and share revocation is restricted by owner', async () => {
  const token = jwt.sign({ userId: 8 }, process.env.JWT_SECRET);
  let update;
  pool.query = async (sql, params) => {
    if (sql.includes('FROM users')) return [[{ id: 8, role: 'STAFF', is_active: 1, email_verified: 1, approval_status: 'APPROVED' }]];
    update = { sql, params }; return [{ affectedRows: 0 }];
  };
  assert.equal((await request('POST', '/api/users', { role: 'ADMIN' }, token)).status, 403);
  assert.equal((await request('DELETE', '/api/share/23', {}, token)).status, 404);
  assert.match(update.sql, /created_by = \?/);
  assert.deepEqual(update.params, [23, 8, 'STAFF']);
});

test('share creation uses verified identity, and mine accepts a valid session', async () => {
  const token = jwt.sign({ userId: 8 }, process.env.JWT_SECRET);
  let parameters;
  pool.query = async (sql, params) => {
    if (sql.includes('FROM users')) return [[{ id: 8, role: 'STAFF', is_active: 1, email_verified: 1, approval_status: 'APPROVED' }]];
    if (sql.includes('INSERT')) { parameters = params; return [{ insertId: 1 }]; }
    return [[]];
  };
  assert.equal((await request('POST', '/api/share', { resourceType: 'ROLLS' }, token)).status, 201);
  assert.equal(parameters[3], 8);
  assert.equal((await request('GET', '/api/share/mine', {}, token)).status, 200);
});

test('returns reject damaged stock and repeated returns; accept remaining dispatched quantity', async () => {
  const { returnRoll } = require('../src/controllers/returnController');
  let returned = 0, inserted = [], updates = [], rollRemaining = 0;
  pool.getConnection = async () => ({
    beginTransaction: async () => {}, commit: async () => {}, rollback: async () => {}, release() {},
    query: async (sql, params) => {
      if (sql.includes('FROM rolls')) return [[{ id: 1, original_length: 100, remaining_length: rollRemaining }]];
      if (sql.includes('AS returned_quantity')) return [[{ returned_quantity: returned }]];
      if (sql.includes('SELECT') && sql.includes('OUTWARD')) return [[{ id: 20, customer_id: 3, quantity: 60 }]];
      if (sql.includes('INSERT INTO transactions')) { inserted = params; return [{ insertId: 25 }]; }
      if (sql.includes('UPDATE rolls')) updates.push(params);
      return [{ affectedRows: 1 }];
    },
  });
  async function attempt(quantity) {
    const res = response();
    await returnRoll({ user: { userId: 8 }, body: { rollId: 1, userId: 999, quantity } }, res);
    return res;
  }
  assert.equal((await attempt(100)).statusCode, 400);
  assert.equal(updates.length, 0);
  assert.equal((await attempt(20)).statusCode, 201);
  assert.equal(inserted[2], 8, 'audit actor comes from session');
  returned = 20; rollRemaining = 20;
  assert.equal((await attempt(41)).statusCode, 400);
  assert.equal((await attempt(40)).statusCode, 201);
});

test('document numbers remain unique for concurrent inserts without reading last number', async () => {
  const { temporaryNumber, finalizeNumber } = require('../src/utils/documentNumbers');
  const temporary = Array.from({ length: 50 }, () => temporaryNumber('IN'));
  assert.equal(new Set(temporary).size, 50);
  const connection = { query: async sql => { assert.match(sql, /^UPDATE/); } };
  const numbers = await Promise.all(Array.from({ length: 50 }, (_, n) => finalizeNumber(connection, 'transaction', n + 100, 'IN')));
  assert.equal(new Set(numbers).size, 50);
  assert.equal(numbers[0], 'IN-00100');
});

test('DB acquisition failures produce handled responses', async () => {
  pool.getConnection = async () => { throw new Error('Fixture database unavailable'); };
  const res = response();
  await require('../src/controllers/returnController').returnRoll({ body: {}, user: { userId: 8 } }, res);
  assert.equal(res.statusCode, 500);
});

test('TLS supports inline CA without disabling verification', () => {
  const { databaseTLS } = require('../src/config/tls');
  assert.deepEqual(databaseTLS({ DB_SSL_CA: 'line1\\nline2' }), { ca: 'line1\nline2', rejectUnauthorized: true });
  assert.equal(databaseTLS({ DB_SSL: 'false' }), undefined);
});

test('customer details are written and returned without dropping form fields', async () => {
  const controller = require('../src/controllers/customerController');
  let captured;
  pool.query = async (sql, params) => { captured = { sql, params }; return [{ insertId: 9, affectedRows: 1 }]; };
  const body = { name: 'Fixture customer', phone: '123', contact: 'Contact person', city: 'Pune', segment: 'Wholesale' };
  let res = response();
  await controller.createCustomer({ body }, res);
  assert.equal(res.statusCode, 201);
  assert.deepEqual(captured.params.slice(-3), ['Contact person', 'Pune', 'Wholesale']);
  res = response();
  await controller.updateCustomer({ params: { id: 9 }, body }, res);
  assert.deepEqual(captured.params.slice(-4), ['Contact person', 'Pune', 'Wholesale', 9]);
  await controller.getCustomers({}, response());
  assert.match(captured.sql, /contact, city, segment/);
});

test('inventory query includes physical metadata and remaining return allowance', async () => {
  let query;
  pool.query = async sql => { query = sql; return [[]]; };
  await require('../src/controllers/rollController').getRolls({}, response());
  for (const field of ['r.batch', 'r.rack', 'r.bin', 'r.supplier_id', 'r.inward_date', 'AS returnable_quantity']) {
    assert(query.includes(field), field);
  }
});

test('clear-data requires an admin session and explicit confirmation', async () => {
  assert.equal((await request('POST', '/api/admin/clear-data', { confirmation: 'CLEAR' })).status, 401);
  let role = 'STAFF';
  pool.query = async () => [[{ id: 8, role, is_active: 1, email_verified: 1, approval_status: 'APPROVED' }]];
  const token = jwt.sign({ userId: 8 }, process.env.JWT_SECRET);
  assert.equal((await request('POST', '/api/admin/clear-data', { confirmation: 'CLEAR' }, token)).status, 403);
  role = 'ADMIN';
  pool.getConnection = async () => { throw new Error('No connection without confirmation'); };
  assert.equal((await request('POST', '/api/admin/clear-data', {}, token)).status, 400);
});

test('clear-data preserves contact/account tables and rolls back every delete on failure', async () => {
  const { clearInventoryData } = require('../src/controllers/dataController');
  const operational = ['proforma_invoice_items', 'proforma_invoices', 'purchase_order_items', 'purchase_orders',
    'transaction_items', 'inventory_adjustments', 'transactions', 'rolls', 'products', 'import_batches', 'share_links'];
  const retained = ['customers', 'suppliers', 'users', 'email_otps'];
  for (const fail of [false, true]) {
    const rows = Object.fromEntries([...operational, ...retained].map(name => [name, 3]));
    const before = { ...rows }; let committed = false, released = false, snapshot;
    pool.getConnection = async () => ({
      beginTransaction: async () => { snapshot = { ...rows }; },
      query: async sql => {
        const table = sql.match(/^DELETE FROM `([a-z_]+)`$/)?.[1];
        assert(operational.includes(table), 'only allowlisted tables may be deleted');
        if (table === 'transactions') assert.equal(rows.proforma_invoices, 0);
        if (table === 'rolls') { assert.equal(rows.transaction_items, 0); assert.equal(rows.inventory_adjustments, 0); }
        if (fail && table === 'rolls') throw Object.assign(new Error('Fixture deletion failure'), { code: 'FIXTURE' });
        const count = rows[table]; rows[table] = 0; return [{ affectedRows: count }];
      },
      commit: async () => { committed = true; },
      rollback: async () => { Object.assign(rows, snapshot); },
      release: () => { released = true; },
    });
    const res = response();
    await clearInventoryData({ body: { confirmation: 'CLEAR' } }, res);
    assert(released);
    if (fail) { assert.equal(res.statusCode, 500); assert.deepEqual(rows, before); assert(!committed); }
    else { assert.equal(res.statusCode, 200); assert(committed); for (const table of operational) assert.equal(rows[table], 0); }
    for (const table of retained) assert.equal(rows[table], 3);
  }
});

test('PI rates can be saved only while the locked invoice is still a draft', async () => {
  const { updateProformaInvoiceRates } = require('../src/controllers/proformaInvoiceController');
  for (const status of ['DRAFT', 'CONFIRMED', 'CANCELLED']) {
    let writes = 0, committed = false, rolledBack = false, released = false;
    pool.getConnection = async () => ({
      beginTransaction: async () => {},
      query: async sql => {
        if (sql.includes('SELECT id, status')) {
          assert.match(sql, /FOR UPDATE/);
          return [[{ id: 1, status }]];
        }
        if (sql.startsWith('SELECT')) return [[{ id: 2 }]];
        writes++; return [{ affectedRows: 1 }];
      },
      commit: async () => { committed = true; },
      rollback: async () => { rolledBack = true; },
      release: () => { released = true; },
    });
    const res = response();
    await updateProformaInvoiceRates({ params: { id: 1 }, body: { items: [{ id: 2, ratePerMeter: 450 }] } }, res);
    assert(released);
    if (status === 'DRAFT') { assert.equal(res.statusCode, 200); assert(committed); assert.equal(writes, 2); }
    else { assert.equal(res.statusCode, 409); assert.equal(writes, 0); assert(rolledBack); assert(!committed); }
  }
});
