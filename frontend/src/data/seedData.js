// -----------------------------------------------------------------------------
// SEED DATA
// -----------------------------------------------------------------------------
// NOTE: This fresh session has no access to your live Google Sheet or the
// earlier prototype's actual seed values. The figures below are PLACEHOLDER,
// illustrative numbers only — structured to match your real sheet layout
// (INWARD / OUTWARD / BALANCE blocks per roll, series LS1111–LS1122, Wincrea
// Essential, WIDTH 320 CM) so the app is usable immediately. Replace them via
// Settings > Reset & Reseed, or by editing this file directly, once you have
// your real figures at hand.
// -----------------------------------------------------------------------------

const SERIES = ['LS1111', 'LS1112', 'LS1113', 'LS1114', 'LS1115', 'LS1116', 'LS1117', 'LS1118', 'LS1119', 'LS1120', 'LS1121', 'LS1122'];

export function buildProducts() {
  return SERIES.map((code, i) => ({
    id: `PRD-${code}`,
    sku: code,
    name: `Wincrea Essential ${code}`,
    collection: 'Wincrea Essential',
    width: '320 CM',
    color: PLACEHOLDER_COLORS[i % PLACEHOLDER_COLORS.length],
    composition: '100% Polyester Blackout',
    ratePerMeter: 210 + (i % 5) * 15,
    reorderLevel: 150 + (i % 4) * 50,
    category: i < 6 ? 'Blackout' : 'Sheer',
    createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
  }));
}

const PLACEHOLDER_COLORS = [
  'Ivory', 'Sand', 'Slate', 'Charcoal', 'Olive', 'Rust',
  'Dove Grey', 'Wheat', 'Graphite', 'Clay', 'Moss', 'Stone',
];

const RACKS = ['R1-A', 'R1-B', 'R2-A', 'R2-B', 'R3-A', 'R3-B'];
const STATUSES_WEIGHTED = [
  ...Array(80).fill('Available'),
  ...Array(8).fill('Reserved'),
  ...Array(6).fill('Hold'),
  ...Array(4).fill('Damaged'),
  ...Array(2).fill('Dispatched'),
];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randLength() {
  // typical roll lengths in this trade run 25-100m
  const bases = [25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100];
  return pick(bases);
}

export function buildRolls(products, suppliers) {
  const rolls = [];
  let seq = 1;
  products.forEach((p, pIdx) => {
    const rollCount = 6 + (pIdx % 5); // vary rolls per product
    for (let i = 0; i < rollCount; i++) {
      const daysBack = Math.floor(Math.random() * 160);
      const status = pick(STATUSES_WEIGHTED);
      rolls.push({
        id: `RL-${String(seq).padStart(6, '0')}`,
        productId: p.id,
        length: randLength(),
        batch: `B${String(pIdx + 1).padStart(2, '0')}${String(i + 1).padStart(2, '0')}`,
        rack: pick(RACKS),
        bin: `${1 + Math.floor(Math.random() * 12)}`,
        status,
        supplierId: pick(suppliers).id,
        inwardDate: new Date(Date.now() - daysBack * 86400000).toISOString(),
        holdReason: status === 'Hold' ? 'Quality re-check pending' : status === 'Damaged' ? 'Water mark on outer wrap' : null,
      });
      seq += 1;
    }
  });
  return rolls;
}

export function buildSuppliers() {
  return [
    { id: 'SUP-000001', name: 'Bansal Textile Mills', contact: 'Rakesh Bansal', phone: '98100-XXXXX', city: 'Panipat', gstin: 'PLACEHOLDER-GSTIN-1', leadTimeDays: 12 },
    { id: 'SUP-000002', name: 'Surat Weave Co.', contact: 'Mehul Shah', phone: '99250-XXXXX', city: 'Surat', gstin: 'PLACEHOLDER-GSTIN-2', leadTimeDays: 18 },
    { id: 'SUP-000003', name: 'Northline Fabrics', contact: 'Harpreet Singh', phone: '98720-XXXXX', city: 'Ludhiana', gstin: 'PLACEHOLDER-GSTIN-3', leadTimeDays: 9 },
  ];
}

export function buildCustomers() {
  return [
    { id: 'CUS-000001', name: 'Aroma Interiors', contact: 'Sana Kapoor', phone: '90000-XXXXX', city: 'Delhi', segment: 'Retail Showroom' },
    { id: 'CUS-000002', name: 'Comfort Home Furnishings', contact: 'Vikram Rao', phone: '90111-XXXXX', city: 'Gurugram', segment: 'Wholesale' },
    { id: 'CUS-000003', name: 'DecorNest', contact: 'Priya Menon', phone: '90222-XXXXX', city: 'Noida', segment: 'Retail Showroom' },
    { id: 'CUS-000004', name: 'Studio Drape', contact: 'Farhan Ali', phone: '90333-XXXXX', city: 'Delhi', segment: 'Interior Designer' },
  ];
}

/** Build a plausible 120-day ledger of inward/outward events consistent with rolls above. */
export function buildLedger(products, rolls, customers, suppliers) {
  const ledger = [];
  let seq = 1;

  // one INWARD entry per roll, at its inward date
  rolls.forEach((r) => {
    ledger.push({
      id: `LG-${String(seq).padStart(6, '0')}`,
      type: 'INWARD',
      timestamp: r.inwardDate,
      productId: r.productId,
      rollId: r.id,
      meters: r.length,
      refType: 'PO',
      refId: null,
      note: `Roll ${r.id} received`,
      party: suppliers.find((s) => s.id === r.supplierId)?.name || 'Supplier',
    });
    seq += 1;
  });

  // synthetic OUTWARD history for trend/forecast to have something real to compute on
  products.forEach((p) => {
    const events = 10 + Math.floor(Math.random() * 12);
    for (let i = 0; i < events; i++) {
      const daysBack = Math.floor(Math.random() * 90);
      const meters = randLength() * (0.4 + Math.random() * 0.8);
      ledger.push({
        id: `LG-${String(seq).padStart(6, '0')}`,
        type: 'OUTWARD',
        timestamp: new Date(Date.now() - daysBack * 86400000).toISOString(),
        productId: p.id,
        rollId: null,
        meters: Math.round(meters),
        refType: 'DISPATCH',
        refId: null,
        note: `Dispatch — ${p.sku}`,
        party: pick(customers).name,
      });
      seq += 1;
    }
  });

  return ledger.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

export function buildPurchaseOrders(products, suppliers) {
  const statuses = ['Draft', 'Approved', 'Ordered', 'Partially Received', 'Received'];
  return products.slice(0, 5).map((p, i) => ({
    id: `PO-${String(i + 1).padStart(6, '0')}`,
    supplierId: pick(suppliers).id,
    productId: p.id,
    quantityMeters: [200, 300, 250, 400, 180][i],
    receivedMeters: i === 4 ? [200, 300, 250, 400, 180][i] : i === 3 ? 220 : 0,
    status: statuses[i % statuses.length],
    createdAt: new Date(Date.now() - (30 - i * 4) * 86400000).toISOString(),
    expectedDate: new Date(Date.now() + (10 - i) * 86400000).toISOString(),
    rate: p.ratePerMeter,
  }));
}

export function buildSeed() {
  const products = buildProducts();
  const suppliers = buildSuppliers();
  const customers = buildCustomers();
  const rolls = buildRolls(products, suppliers);
  const ledger = buildLedger(products, rolls, customers, suppliers);
  const purchaseOrders = buildPurchaseOrders(products, suppliers);
  return { products, suppliers, customers, rolls, ledger, purchaseOrders };
}
