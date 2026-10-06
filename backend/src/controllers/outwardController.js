const db = require('../config/db');

// ------------------------------------------------------------
// Generate a temporary PI number.
// We initially insert a temporary unique value, get the new ID,
// then change it to PI-00001, PI-00002, etc.
// This avoids MAX(id)+1 race conditions during insertion.
// ------------------------------------------------------------
function temporaryPiNumber() {
  return `PI-TEMP-${Date.now()}-${Math.floor(
    Math.random() * 1000000
  )}`;
}

// ------------------------------------------------------------
// POST /api/outward
//
// NEW WORKFLOW:
//
// Outward page
//      ↓
// Create DRAFT PI
//      ↓
// NO stock deduction
// NO OUTWARD transaction
// NO roll status change
//      ↓
// Suppliers & PI
//      ↓
// Confirm PI
//
// The confirmation/deduction is handled by
// proformaInvoiceController.confirmProformaInvoice
// ------------------------------------------------------------
exports.createOutwardDraft = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const {
      customerId,
      userId,
      createdBy,
      invoiceDate,
      remarks,
      notes,
      items,
    } = req.body;

    // ----------------------------------------------------------
    // Basic validation
    // ----------------------------------------------------------

    if (!customerId) {
      return res.status(400).json({
        message: 'Customer is required.',
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: 'At least one roll is required.',
      });
    }

    const finalCreatedBy =
      createdBy ||
      userId ||
      null;

    // ----------------------------------------------------------
    // Validate customer
    // ----------------------------------------------------------

    const [customers] = await connection.query(
      `
        SELECT id, name
        FROM customers
        WHERE id = ?
        LIMIT 1
      `,
      [customerId]
    );

    if (customers.length === 0) {
      return res.status(404).json({
        message: 'Customer not found.',
      });
    }

    // ----------------------------------------------------------
    // Validate user if supplied
    // ----------------------------------------------------------

    if (finalCreatedBy) {
      const [users] = await connection.query(
        `
          SELECT id
          FROM users
          WHERE id = ?
          LIMIT 1
        `,
        [finalCreatedBy]
      );

      if (users.length === 0) {
        return res.status(400).json({
          message: 'Invalid user.',
        });
      }
    }

    // ----------------------------------------------------------
    // Normalize + validate item list
    // ----------------------------------------------------------

    const normalizedItems = [];

    const seenRollIds = new Set();

    for (const item of items) {
      const rollId = Number(
        item.rollId ??
          item.roll_id
      );

      const requestedQuantity = Number(
        item.quantity ??
          item.qty ??
          0
      );

      const productId = Number(
        item.productId ??
          item.product_id
      );

      if (
        !Number.isInteger(rollId) ||
        rollId <= 0
      ) {
        return res.status(400).json({
          message: 'Invalid roll selected.',
        });
      }

      if (seenRollIds.has(rollId)) {
        return res.status(400).json({
          message: `Roll ${rollId} is selected more than once.`,
        });
      }

      seenRollIds.add(rollId);

      if (
        !Number.isFinite(
          requestedQuantity
        ) ||
        requestedQuantity <= 0
      ) {
        return res.status(400).json({
          message: `Invalid quantity for roll ${rollId}.`,
        });
      }

      if (
        !Number.isInteger(productId) ||
        productId <= 0
      ) {
        return res.status(400).json({
          message: `Invalid product for roll ${rollId}.`,
        });
      }

      normalizedItems.push({
        rollId,
        requestedQuantity,
        productId,
      });
    }

    // ----------------------------------------------------------
    // Start transaction
    // ----------------------------------------------------------

    await connection.beginTransaction();

    // ----------------------------------------------------------
    // Validate all rolls while locked.
    //
    // IMPORTANT:
    // We DO NOT modify them.
    //
    // Since your business rule is "whole roll or nothing",
    // requested quantity MUST equal the roll's CURRENT
    // remaining_length.
    // ----------------------------------------------------------

    const finalItems = [];

    for (const item of normalizedItems) {
      const [rows] = await connection.query(
        `
          SELECT
            r.id,
            r.roll_id,
            r.product_id,
            r.remaining_length,
            r.status,

            p.sku,
            p.name AS product_name,
            p.color,
            p.width_cm,
            p.rate_per_meter

          FROM rolls r

          LEFT JOIN products p
            ON p.id = r.product_id

          WHERE r.id = ?

          FOR UPDATE
        `,
        [item.rollId]
      );

      if (rows.length === 0) {
        throw new Error(
          `Roll ${item.rollId} not found.`
        );
      }

      const roll = rows[0];

      // --------------------------------------------------------
      // Status must be available
      // --------------------------------------------------------

      if (
        roll.status !== 'AVAILABLE'
      ) {
        throw new Error(
          `Roll ${
            roll.roll_id || roll.id
          } is not available.`
        );
      }

      // --------------------------------------------------------
      // Remaining length must be positive
      // --------------------------------------------------------

      const remainingLength = Number(
        roll.remaining_length
      );

      if (
        !Number.isFinite(
          remainingLength
        ) ||
        remainingLength <= 0
      ) {
        throw new Error(
          `Roll ${
            roll.roll_id || roll.id
          } has no remaining stock.`
        );
      }

      // --------------------------------------------------------
      // The product must match the selected product
      // --------------------------------------------------------

      if (
        Number(roll.product_id) !==
        Number(item.productId)
      ) {
        throw new Error(
          `Product mismatch for roll ${
            roll.roll_id || roll.id
          }.`
        );
      }

      // --------------------------------------------------------
      // WHOLE ROLL RULE
      //
      // Do not allow partial quantities.
      // --------------------------------------------------------

      const difference =
        Math.abs(
          item.requestedQuantity -
            remainingLength
        );

      if (difference > 0.0001) {
        throw new Error(
          `Roll ${
            roll.roll_id || roll.id
          } must be dispatched as a whole roll. Current remaining length is ${remainingLength} m.`
        );
      }

      // --------------------------------------------------------
      // Rate
      //
      // Always prefer the product's current rate from DB.
      // --------------------------------------------------------

      const ratePerMeter =
        Number(
          roll.rate_per_meter
        ) || 0;

      finalItems.push({
        rollId: Number(roll.id),
        productId: Number(
          roll.product_id
        ),
        rollNumber:
          roll.roll_id,
        quantity:
          remainingLength,
        ratePerMeter,
        sku: roll.sku,
        productName:
          roll.product_name,
        color: roll.color,
        widthCm:
          roll.width_cm,
      });
    }

    // ----------------------------------------------------------
    // Create DRAFT PI
    //
    // NO stock changes happen here.
    // ----------------------------------------------------------

    const tempPiNumber =
      temporaryPiNumber();

    const finalInvoiceDate =
      invoiceDate ||
      new Date()
        .toISOString()
        .slice(0, 10);

    const finalRemarks =
      remarks ||
      notes ||
      null;

    const [piInsert] =
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
          VALUES (
            ?,
            ?,
            'DRAFT',
            ?,
            ?,
            ?
          )
        `,
        [
          tempPiNumber,
          customerId,
          finalInvoiceDate,
          finalRemarks,
          finalCreatedBy,
        ]
      );

    const piId =
      piInsert.insertId;

    // ----------------------------------------------------------
    // Convert temporary PI number to final number
    //
    // Example:
    // PI-00001
    // PI-00002
    // PI-00003
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
      [piNumber, piId]
    );

    // ----------------------------------------------------------
    // Insert PI items
    // ----------------------------------------------------------

    for (const item of finalItems) {
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
          item.rollId,
          item.productId,
          item.quantity,
          item.ratePerMeter,
        ]
      );
    }

    // ----------------------------------------------------------
    // IMPORTANT:
    //
    // There is deliberately NO:
    //
    // UPDATE rolls ...
    //
    // and NO:
    //
    // INSERT INTO transactions ...
    //
    // because this is only a draft.
    // ----------------------------------------------------------

    await connection.commit();

    // ----------------------------------------------------------
    // Calculate summary
    // ----------------------------------------------------------

    const totalMeters =
      finalItems.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity),
        0
      );

    const subtotal =
      finalItems.reduce(
        (sum, item) =>
          sum +
          Number(item.quantity) *
            Number(
              item.ratePerMeter
            ),
        0
      );

    res.status(201).json({
      message:
        'Outward order created as DRAFT PI. Stock has not been deducted.',
      piId,
      piNumber,
      status: 'DRAFT',
      customerId: Number(
        customerId
      ),
      customerName:
        customers[0].name,
      invoiceDate:
        finalInvoiceDate,
      totalRolls:
        finalItems.length,
      totalMeters,
      subtotal,
      items: finalItems.map(
        (item) => ({
          rollId: item.rollId,
          rollNumber:
            item.rollNumber,
          productId:
            item.productId,
          sku: item.sku,
          productName:
            item.productName,
          color: item.color,
          widthCm:
            item.widthCm,
          quantity:
            item.quantity,
          ratePerMeter:
            item.ratePerMeter,
        })
      ),
    });
  } catch (error) {
    await connection.rollback();

    console.error(
      'CREATE OUTWARD DRAFT ERROR:',
      error
    );

    res.status(500).json({
      message:
        error.message ||
        'Failed to create outward draft.',
    });
  } finally {
    connection.release();
  }
};