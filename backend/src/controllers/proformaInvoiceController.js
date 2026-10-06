const pool = require('../config/db');


// ============================================================
// GENERATE TEMPORARY PI NUMBER
// ============================================================

function generateTemporaryPINumber() {
  return `PI-TEMP-${Date.now()}-${Math.floor(
    Math.random() * 1000000
  )}`;
}


// ============================================================
// GET ALL PIs
// ============================================================

async function getProformaInvoices(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        pi.id,
        pi.pi_number,
        pi.customer_id,
        c.name AS customer_name,

        pi.status,
        pi.invoice_date,
        pi.remarks,

        pi.confirmed_at,
        pi.confirmed_by,
        confirmed_user.name AS confirmed_by_name,

        pi.transaction_id,
        t.transaction_number,

        pi.created_by,
        created_user.name AS created_by_name,

        pi.created_at,
        pi.updated_at,

        pii.id AS item_id,
        pii.roll_id,
        r.roll_id AS roll_number,

        pii.product_id,
        p.sku,
        p.name AS product_name,
        p.color,
        p.width_cm,

        pii.quantity,
        pii.rate_per_meter

      FROM proforma_invoices pi

      LEFT JOIN customers c
        ON c.id = pi.customer_id

      LEFT JOIN users confirmed_user
        ON confirmed_user.id = pi.confirmed_by

      LEFT JOIN users created_user
        ON created_user.id = pi.created_by

      LEFT JOIN transactions t
        ON t.id = pi.transaction_id

      LEFT JOIN proforma_invoice_items pii
        ON pii.proforma_invoice_id = pi.id

      LEFT JOIN rolls r
        ON r.id = pii.roll_id

      LEFT JOIN products p
        ON p.id = pii.product_id

      ORDER BY
        pi.created_at DESC,
        pi.id DESC
    `);

    const map = new Map();

    for (const row of rows) {
      if (!map.has(row.id)) {
        map.set(row.id, {
          id: row.id,
          piNumber: row.pi_number,

          customerId: row.customer_id,
          customerName: row.customer_name || '',

          status: row.status,
          invoiceDate: row.invoice_date,
          remarks: row.remarks || '',

          confirmedAt: row.confirmed_at,
          confirmedBy: row.confirmed_by,
          confirmedByName:
            row.confirmed_by_name || '',

          transactionId:
            row.transaction_id,

          transactionNumber:
            row.transaction_number || '',

          createdBy: row.created_by,
          createdByName:
            row.created_by_name || '',

          createdAt: row.created_at,
          updatedAt: row.updated_at,

          items: [],
        });
      }

      const pi = map.get(row.id);

      if (row.item_id) {
        pi.items.push({
          id: row.item_id,

          rollId: row.roll_id,
          rollNumber:
            row.roll_number || '',

          productId: row.product_id,

          sku: row.sku || '',
          productName:
            row.product_name || '',
          color: row.color || '',

          width: Number(
            row.width_cm || 0
          ),

          quantity: Number(
            row.quantity || 0
          ),

          ratePerMeter: Number(
            row.rate_per_meter || 0
          ),
        });
      }
    }

    res.json(
      Array.from(map.values())
    );
  } catch (error) {
    console.error(
      'Get proforma invoices error:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Failed to fetch proforma invoices',
    });
  }
}


// ============================================================
// GET SINGLE PI
// ============================================================

async function getProformaInvoiceById(
  req,
  res
) {
  try {
    const { id } = req.params;

    const [rows] = await pool.query(
      `
      SELECT
        pi.id,
        pi.pi_number,
        pi.customer_id,

        c.name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.address AS customer_address,
        c.gst_number AS customer_gst_number,

        pi.status,
        pi.invoice_date,
        pi.remarks,

        pi.confirmed_at,
        pi.confirmed_by,
        confirmed_user.name AS confirmed_by_name,

        pi.transaction_id,
        t.transaction_number,

        pi.created_by,
        created_user.name AS created_by_name,

        pi.created_at,
        pi.updated_at,

        pii.id AS item_id,
        pii.roll_id,

        r.roll_id AS roll_number,
        r.remaining_length,
        r.status AS roll_status,

        pii.product_id,

        p.sku,
        p.name AS product_name,
        p.color,
        p.width_cm,

        pii.quantity,
        pii.rate_per_meter

      FROM proforma_invoices pi

      LEFT JOIN customers c
        ON c.id = pi.customer_id

      LEFT JOIN users confirmed_user
        ON confirmed_user.id = pi.confirmed_by

      LEFT JOIN users created_user
        ON created_user.id = pi.created_by

      LEFT JOIN transactions t
        ON t.id = pi.transaction_id

      LEFT JOIN proforma_invoice_items pii
        ON pii.proforma_invoice_id = pi.id

      LEFT JOIN rolls r
        ON r.id = pii.roll_id

      LEFT JOIN products p
        ON p.id = pii.product_id

      WHERE pi.id = ?

      ORDER BY pii.id ASC
      `,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message:
          'Proforma invoice not found',
      });
    }

    const first = rows[0];

    const result = {
      id: first.id,

      piNumber:
        first.pi_number,

      customerId:
        first.customer_id,

      customerName:
        first.customer_name || '',

      customerPhone:
        first.customer_phone || '',

      customerEmail:
        first.customer_email || '',

      customerAddress:
        first.customer_address || '',

      customerGstNumber:
        first.customer_gst_number || '',

      status:
        first.status,

      invoiceDate:
        first.invoice_date,

      remarks:
        first.remarks || '',

      confirmedAt:
        first.confirmed_at,

      confirmedBy:
        first.confirmed_by,

      confirmedByName:
        first.confirmed_by_name || '',

      transactionId:
        first.transaction_id,

      transactionNumber:
        first.transaction_number || '',

      createdBy:
        first.created_by,

      createdByName:
        first.created_by_name || '',

      createdAt:
        first.created_at,

      updatedAt:
        first.updated_at,

      items: [],
    };

    for (const row of rows) {
      if (row.item_id) {
        result.items.push({
          id: row.item_id,

          rollId: row.roll_id,

          rollNumber:
            row.roll_number || '',

          remainingLength:
            Number(
              row.remaining_length || 0
            ),

          rollStatus:
            row.roll_status || '',

          productId:
            row.product_id,

          sku:
            row.sku || '',

          productName:
            row.product_name || '',

          color:
            row.color || '',

          width:
            Number(
              row.width_cm || 0
            ),

          quantity:
            Number(
              row.quantity || 0
            ),

          ratePerMeter:
            Number(
              row.rate_per_meter || 0
            ),
        });
      }
    }

    res.json(result);
  } catch (error) {
    console.error(
      'Get proforma invoice error:',
      error
    );

    res.status(500).json({
      success: false,
      message:
        'Failed to fetch proforma invoice',
    });
  }
}


// ============================================================
// CREATE DRAFT PI
//
// IMPORTANT:
// - Creates only a DRAFT
// - Does NOT deduct stock
// - Does NOT create OUTWARD transaction
// - Does NOT change roll status
//
// Whole-roll rule is validated here as well.
// ============================================================

async function createProformaInvoice(
  req,
  res
) {
  const connection =
    await pool.getConnection();

  try {
    const {
      customerId,
      invoiceDate,
      remarks,
      createdBy,
      items,
    } = req.body;

    // ----------------------------------------------------------
    // VALIDATION
    // ----------------------------------------------------------

    if (!customerId) {
      return res.status(400).json({
        success: false,
        message:
          'Customer is required',
      });
    }

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'At least one item is required',
      });
    }

    // ----------------------------------------------------------
    // DUPLICATE ROLL CHECK
    // ----------------------------------------------------------

    const seenRolls = new Set();

    for (const item of items) {
      const rollId = Number(
        item.rollId
      );

      if (
        !Number.isInteger(rollId) ||
        rollId <= 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid roll selected',
        });
      }

      if (seenRolls.has(rollId)) {
        return res.status(400).json({
          success: false,
          message:
            `Roll ${rollId} is selected more than once`,
        });
      }

      seenRolls.add(rollId);
    }

    await connection.beginTransaction();

    // ----------------------------------------------------------
    // CUSTOMER CHECK
    // ----------------------------------------------------------

    const [customerRows] =
      await connection.query(
        `
        SELECT id
        FROM customers
        WHERE id = ?
        LIMIT 1
        `,
        [customerId]
      );

    if (
      customerRows.length === 0
    ) {
      throw new Error(
        'Customer not found'
      );
    }

    // ----------------------------------------------------------
    // CREATE HEADER WITH TEMP NUMBER
    // ----------------------------------------------------------

    const tempPiNumber =
      generateTemporaryPINumber();

    const [piResult] =
      await connection.query(
        `
        INSERT INTO proforma_invoices (
          pi_number,
          customer_id,
          status,
          invoice_date,
          remarks,
          created_by
        )
        VALUES (?, ?, 'DRAFT', ?, ?, ?)
        `,
        [
          tempPiNumber,

          Number(
            customerId
          ),

          invoiceDate ||
            new Date()
              .toISOString()
              .slice(0, 10),

          remarks ||
            null,

          createdBy
            ? Number(createdBy)
            : null,
        ]
      );

    const piId =
      piResult.insertId;

    // ----------------------------------------------------------
    // FINAL PI NUMBER
    // ----------------------------------------------------------

    const piNumber =
      `PI-${String(piId).padStart(
        5,
        '0'
      )}`;

    await connection.query(
      `
      UPDATE proforma_invoices
      SET pi_number = ?
      WHERE id = ?
      `,
      [
        piNumber,
        piId,
      ]
    );

    // ----------------------------------------------------------
    // INSERT ITEMS
    // ----------------------------------------------------------

    for (const item of items) {
      const rollId =
        Number(item.rollId);

      const requestedQuantity =
        Number(item.quantity);

      const requestedProductId =
        Number(item.productId);

      if (
        !Number.isFinite(
          requestedQuantity
        ) ||
        requestedQuantity <= 0
      ) {
        throw new Error(
          `Invalid quantity for roll ${rollId}`
        );
      }

      // --------------------------------------------------------
      // LOCK ROLL
      // --------------------------------------------------------

      const [rollRows] =
        await connection.query(
          `
          SELECT
            id,
            roll_id,
            product_id,
            remaining_length,
            status
          FROM rolls
          WHERE id = ?
          FOR UPDATE
          `,
          [rollId]
        );

      if (
        rollRows.length === 0
      ) {
        throw new Error(
          `Roll ${rollId} not found`
        );
      }

      const roll =
        rollRows[0];

      // --------------------------------------------------------
      // AVAILABLE ONLY
      // --------------------------------------------------------

      if (
        roll.status !==
        'AVAILABLE'
      ) {
        throw new Error(
          `Roll ${
            roll.roll_id || roll.id
          } is not available`
        );
      }

      // --------------------------------------------------------
      // PRODUCT MATCH
      // --------------------------------------------------------

      if (
        Number(
          roll.product_id
        ) !== requestedProductId
      ) {
        throw new Error(
          `Product mismatch for roll ${
            roll.roll_id || roll.id
          }`
        );
      }

      const remainingLength =
        Number(
          roll.remaining_length
        );

      // --------------------------------------------------------
      // WHOLE ROLL ONLY
      // --------------------------------------------------------

      const difference =
        Math.abs(
          requestedQuantity -
            remainingLength
        );

      if (
        difference > 0.0001
      ) {
        throw new Error(
          `Roll ${
            roll.roll_id || roll.id
          } must be dispatched as a whole roll. Current remaining length is ${remainingLength} m`
        );
      }

      // --------------------------------------------------------
      // GET RATE FROM PRODUCT
      // --------------------------------------------------------

      const [productRows] =
        await connection.query(
          `
          SELECT
            id,
            rate_per_meter
          FROM products
          WHERE id = ?
          LIMIT 1
          `,
          [
            roll.product_id,
          ]
        );

      if (
        productRows.length === 0
      ) {
        throw new Error(
          `Product ${roll.product_id} not found`
        );
      }

      const ratePerMeter =
        Number(
          productRows[0]
            .rate_per_meter || 0
        );

      // --------------------------------------------------------
      // INSERT ITEM
      // --------------------------------------------------------

      await connection.query(
        `
        INSERT INTO proforma_invoice_items (
          proforma_invoice_id,
          roll_id,
          product_id,
          quantity,
          rate_per_meter
        )
        VALUES (?, ?, ?, ?, ?)
        `,
        [
          piId,

          roll.id,

          roll.product_id,

          remainingLength,

          ratePerMeter,
        ]
      );
    }

    // ----------------------------------------------------------
    // COMMIT
    // ----------------------------------------------------------

    await connection.commit();

    res.status(201).json({
      success: true,

      message:
        'Draft proforma invoice created successfully',

      id:
        Number(piId),

      piId:
        Number(piId),

      piNumber,

      status:
        'DRAFT',
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      'Create proforma invoice error:',
      error
    );

    res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to create proforma invoice',
    });
  } finally {
    connection.release();
  }
}


// ============================================================
// CONFIRM PI
//
// THIS IS THE ONLY STOCK-CHANGING PI ACTION.
//
// Confirmation does:
//
// 1. Lock PI
// 2. Verify DRAFT
// 3. Lock every roll
// 4. Verify every roll is still AVAILABLE
// 5. Verify quantity == CURRENT remaining_length
// 6. Create OUTWARD transaction
// 7. Set roll remaining_length = 0
// 8. Set roll status = EMPTY
// 9. Create transaction_items
// 10. Mark PI CONFIRMED
//
// Everything occurs inside ONE MySQL transaction.
// ============================================================

async function confirmProformaInvoice(
  req,
  res
) {
  const connection =
    await pool.getConnection();

  try {
    const { id } =
      req.params;

    const {
      userId,
      notes,
    } = req.body;

    await connection.beginTransaction();

    // ----------------------------------------------------------
    // VALIDATE USER
    // ----------------------------------------------------------

    if (userId) {
      const [userRows] =
        await connection.query(
          `
          SELECT id
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [userId]
        );

      if (
        userRows.length === 0
      ) {
        throw new Error(
          'Invalid confirming user'
        );
      }
    }

    // ----------------------------------------------------------
    // LOCK PI
    // ----------------------------------------------------------

    const [piRows] =
      await connection.query(
        `
        SELECT
          id,
          pi_number,
          customer_id,
          status
        FROM proforma_invoices
        WHERE id = ?
        FOR UPDATE
        `,
        [id]
      );

    if (
      piRows.length === 0
    ) {
      throw new Error(
        'Proforma invoice not found'
      );
    }

    const pi =
      piRows[0];

    // ----------------------------------------------------------
    // ONLY DRAFTS CAN BE CONFIRMED
    // ----------------------------------------------------------

    if (
      pi.status !==
      'DRAFT'
    ) {
      throw new Error(
        `PI ${pi.pi_number} is already ${pi.status}`
      );
    }

    // ----------------------------------------------------------
    // GET PI ITEMS
    // ----------------------------------------------------------

    const [items] =
      await connection.query(
        `
        SELECT
          id,
          roll_id,
          product_id,
          quantity
        FROM proforma_invoice_items
        WHERE proforma_invoice_id = ?
        ORDER BY id ASC
        `,
        [id]
      );

    if (
      items.length === 0
    ) {
      throw new Error(
        'PI has no items'
      );
    }

    // ----------------------------------------------------------
    // LOCK + VALIDATE EVERY ROLL
    // ----------------------------------------------------------

    const lockedRolls = [];

    for (const item of items) {
      const [rollRows] =
        await connection.query(
          `
          SELECT
            id,
            roll_id,
            product_id,
            original_length,
            remaining_length,
            status
          FROM rolls
          WHERE id = ?
          FOR UPDATE
          `,
          [item.roll_id]
        );

      if (
        rollRows.length === 0
      ) {
        throw new Error(
          `Roll ${item.roll_id} not found`
        );
      }

      const roll =
        rollRows[0];

      // --------------------------------------------------------
      // MUST STILL BE AVAILABLE
      // --------------------------------------------------------

      if (
        roll.status !==
        'AVAILABLE'
      ) {
        throw new Error(
          `Roll ${
            roll.roll_id || roll.id
          } is no longer available`
        );
      }

      // --------------------------------------------------------
      // PRODUCT MUST MATCH
      // --------------------------------------------------------

      if (
        Number(
          roll.product_id
        ) !==
        Number(
          item.product_id
        )
      ) {
        throw new Error(
          `Product mismatch for roll ${
            roll.roll_id || roll.id
          }`
        );
      }

      const quantity =
        Number(
          item.quantity
        );

      const remaining =
        Number(
          roll.remaining_length
        );

      // --------------------------------------------------------
      // VALID NUMBERS
      // --------------------------------------------------------

      if (
        !Number.isFinite(
          quantity
        ) ||
        quantity <= 0
      ) {
        throw new Error(
          `Invalid quantity for roll ${
            roll.roll_id || roll.id
          }`
        );
      }

      if (
        !Number.isFinite(
          remaining
        ) ||
        remaining <= 0
      ) {
        throw new Error(
          `Roll ${
            roll.roll_id || roll.id
          } has no remaining stock`
        );
      }

      // --------------------------------------------------------
      // WHOLE ROLL RULE
      //
      // This is the critical protection against:
      //
      // Draft created at 50m
      // Roll later becomes 30m
      // Confirming 50m
      //
      // OR any attempt to partially dispatch a roll.
      // --------------------------------------------------------

      const difference =
        Math.abs(
          quantity -
            remaining
        );

      if (
        difference > 0.0001
      ) {
        throw new Error(
          `Roll ${
            roll.roll_id || roll.id
          } changed after the draft was created. Draft quantity: ${quantity} m, current remaining length: ${remaining} m. The PI cannot be confirmed.`
        );
      }

      lockedRolls.push({
        ...roll,

        quantity,

        remaining,
      });
    }

    // ----------------------------------------------------------
    // GENERATE TRANSACTION NUMBER
    // ----------------------------------------------------------

    const [transactionRows] =
      await connection.query(`
        SELECT transaction_number
        FROM transactions
        WHERE transaction_type = 'OUTWARD'
        ORDER BY id DESC
        LIMIT 1
      `);

    let transactionNumber;

    if (
      transactionRows.length === 0
    ) {
      transactionNumber =
        'OUT-00001';
    } else {
      const last =
        String(
          transactionRows[0]
            .transaction_number || ''
        );

      const match =
        last.match(
          /OUT-(\d+)/
        );

      const next =
        match
          ? Number(
              match[1]
            ) + 1
          : 1;

      transactionNumber =
        `OUT-${String(
          next
        ).padStart(5, '0')}`;
    }

    // ----------------------------------------------------------
    // CREATE OUTWARD TRANSACTION
    // ----------------------------------------------------------

    const [transactionResult] =
      await connection.query(
        `
        INSERT INTO transactions (
          transaction_number,
          transaction_type,
          customer_id,
          supplier_id,
          user_id,
          notes
        )
        VALUES (
          ?,
          'OUTWARD',
          ?,
          NULL,
          ?,
          ?
        )
        `,
        [
          transactionNumber,

          pi.customer_id,

          userId
            ? Number(userId)
            : null,

          notes ||
            `Outward against ${pi.pi_number}`,
        ]
      );

    const transactionId =
      transactionResult.insertId;

    // ----------------------------------------------------------
    // DEDUCT ALL ROLLS
    // ----------------------------------------------------------

    let totalQuantity = 0;

    for (
      const roll of lockedRolls
    ) {
      // --------------------------------------------------------
      // Because quantity == remaining, this always becomes zero.
      // --------------------------------------------------------

      await connection.query(
        `
        UPDATE rolls
        SET
          remaining_length = 0,
          status = 'EMPTY',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        `,
        [roll.id]
      );

      // --------------------------------------------------------
      // CREATE TRANSACTION ITEM
      // --------------------------------------------------------

      await connection.query(
        `
        INSERT INTO transaction_items (
          transaction_id,
          roll_id,
          quantity
        )
        VALUES (?, ?, ?)
        `,
        [
          transactionId,

          roll.id,

          roll.quantity,
        ]
      );

      totalQuantity +=
        roll.quantity;
    }

    // ----------------------------------------------------------
    // CONFIRM PI
    // ----------------------------------------------------------

    await connection.query(
      `
      UPDATE proforma_invoices
      SET
        status = 'CONFIRMED',
        confirmed_at = CURRENT_TIMESTAMP,
        confirmed_by = ?,
        transaction_id = ?
      WHERE id = ?
      `,
      [
        userId
          ? Number(userId)
          : null,

        transactionId,

        id,
      ]
    );

    // ----------------------------------------------------------
    // COMMIT EVERYTHING
    // ----------------------------------------------------------

    await connection.commit();

    res.json({
      success: true,

      message:
        'Proforma invoice confirmed successfully',

      piId:
        Number(id),

      piNumber:
        pi.pi_number,

      status:
        'CONFIRMED',

      transactionId,

      transactionNumber,

      totalQuantity,
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      'Confirm proforma invoice error:',
      error
    );

    res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to confirm proforma invoice',
    });
  } finally {
    connection.release();
  }
}


// ============================================================
// CANCEL DRAFT PI
//
// Cancellation does NOT touch stock because stock was never
// deducted when the draft was created.
// ============================================================

async function cancelProformaInvoice(
  req,
  res
) {
  const connection =
    await pool.getConnection();

  try {
    const { id } =
      req.params;

    await connection.beginTransaction();

    const [rows] =
      await connection.query(
        `
        SELECT
          id,
          pi_number,
          status
        FROM proforma_invoices
        WHERE id = ?
        FOR UPDATE
        `,
        [id]
      );

    if (
      rows.length === 0
    ) {
      throw new Error(
        'Proforma invoice not found'
      );
    }

    const pi =
      rows[0];

    if (
      pi.status !==
      'DRAFT'
    ) {
      throw new Error(
        'Only draft proforma invoices can be cancelled'
      );
    }

    await connection.query(
      `
      UPDATE proforma_invoices
      SET status = 'CANCELLED'
      WHERE id = ?
      `,
      [id]
    );

    await connection.commit();

    res.json({
      success: true,

      message:
        'Proforma invoice cancelled',

      piId:
        Number(id),

      piNumber:
        pi.pi_number,

      status:
        'CANCELLED',
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      'Cancel proforma invoice error:',
      error
    );

    res.status(400).json({
      success: false,
      message:
        error.message ||
        'Failed to cancel proforma invoice',
    });
  } finally {
    connection.release();
  }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  getProformaInvoices,
  getProformaInvoiceById,
  createProformaInvoice,
  confirmProformaInvoice,
  cancelProformaInvoice,
};