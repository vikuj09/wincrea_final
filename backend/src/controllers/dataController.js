const pool = require('../config/db');

// Children precede parents, including confirmed PIs that reference transactions.
// Account verification data stays with users. Never disable foreign-key checks.
const CLEAR_TABLES = [
  'proforma_invoice_items',
  'proforma_invoices',
  'purchase_order_items',
  'purchase_orders',
  'transaction_items',
  'inventory_adjustments',
  'transactions',
  'rolls',
  'products',
  'import_batches',
  'share_links',
];

async function clearInventoryData(req, res) {
  if (req.body?.confirmation !== 'CLEAR') {
    return res.status(400).json({ message: 'Type CLEAR to confirm deleting inventory and transaction data.' });
  }
  let connection;
  let committed = false;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const deleted = {};
    for (const table of CLEAR_TABLES) {
      // Table identifiers come only from the fixed allowlist above.
      const [result] = await connection.query(`DELETE FROM \`${table}\``);
      deleted[table] = result.affectedRows;
    }
    await connection.commit();
    committed = true;
    return res.json({
      success: true,
      message: 'Inventory and transaction data cleared. Customers, suppliers, and users were preserved.',
      deleted,
    });
  } catch (error) {
    if (connection && !committed) {
      try { await connection.rollback(); } catch (rollbackError) {
        console.error('Clear inventory rollback failed:', rollbackError.code);
      }
    }
    console.error('Clear inventory data failed:', error.code);
    return res.status(500).json({ message: 'Could not clear inventory data. Refresh and check the current data before retrying.' });
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { clearInventoryData };
