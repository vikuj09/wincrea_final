const { randomUUID } = require('crypto');

function temporaryNumber(prefix) {
  return `${prefix}-TMP-${randomUUID()}`;
}

// Database-generated IDs allocate numbers atomically across concurrent requests.
async function finalizeNumber(connection, kind, id, prefix) {
  const number = `${prefix}-${String(id).padStart(5, '0')}`;
  if (kind === 'transaction') {
    await connection.query('UPDATE transactions SET transaction_number = ? WHERE id = ?', [number, id]);
  } else if (kind === 'purchaseOrder') {
    await connection.query('UPDATE purchase_orders SET po_number = ? WHERE id = ?', [number, id]);
  } else {
    throw new Error('Unsupported document type');
  }
  return number;
}
module.exports = { temporaryNumber, finalizeNumber };
