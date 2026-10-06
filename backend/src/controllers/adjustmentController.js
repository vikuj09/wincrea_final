const pool = require('../config/db');

async function createAdjustment(req, res) {
  const connection = await pool.getConnection();

  try {
    const {
      rollId,
      adjustmentType,
      quantity,
      reason,
      notes,
      userId,
    } = req.body;

    const numericRollId = Number(rollId);
    const numericQuantity = Number(quantity);
    const numericUserId = userId ? Number(userId) : null;

    if (!numericRollId) {
      return res.status(400).json({
        message: 'rollId is required',
      });
    }

    if (!['INCREASE', 'DECREASE', 'SET'].includes(adjustmentType)) {
      return res.status(400).json({
        message: 'Invalid adjustment type',
      });
    }

    if (!Number.isFinite(numericQuantity) || numericQuantity < 0) {
      return res.status(400).json({
        message: 'Quantity must be a valid non-negative number',
      });
    }

    if (
      !['DAMAGED', 'LOST', 'MEASUREMENT_CORRECTION', 'OTHER'].includes(
        reason
      )
    ) {
      return res.status(400).json({
        message: 'Invalid adjustment reason',
      });
    }

    await connection.beginTransaction();

    // Lock the roll while calculating the new quantity.
    const [rollRows] = await connection.query(
      `
        SELECT
          id,
          roll_id,
          remaining_length,
          original_length,
          status
        FROM rolls
        WHERE id = ?
        FOR UPDATE
      `,
      [numericRollId]
    );

    if (rollRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        message: 'Roll not found',
      });
    }

    const roll = rollRows[0];

    const previousLength = Number(roll.remaining_length || 0);

    let newLength;

    if (adjustmentType === 'INCREASE') {
      newLength = previousLength + numericQuantity;
    } else if (adjustmentType === 'DECREASE') {
      newLength = previousLength - numericQuantity;
    } else {
      // SET means quantity is the new exact remaining length.
      newLength = numericQuantity;
    }

    if (newLength < 0) {
      await connection.rollback();

      return res.status(400).json({
        message: 'Adjustment cannot make remaining length negative',
        currentLength: previousLength,
        requestedQuantity: numericQuantity,
      });
    }

    // Do not allow stock to exceed the original roll length.
    const originalLength = Number(roll.original_length || 0);

    if (originalLength > 0 && newLength > originalLength) {
      await connection.rollback();

      return res.status(400).json({
        message: 'Adjusted length cannot exceed original roll length',
        originalLength,
        newLength,
      });
    }

    // Update the roll.
    await connection.query(
      `
        UPDATE rolls
        SET
          remaining_length = ?,
          status = CASE
            WHEN ? = 0 THEN 'EMPTY'
            ELSE 'AVAILABLE'
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [newLength, newLength, numericRollId]
    );

    // Record the adjustment permanently.
    const [adjustmentResult] = await connection.query(
      `
        INSERT INTO inventory_adjustments (
          roll_id,
          adjustment_type,
          quantity,
          previous_length,
          new_length,
          reason,
          notes,
          user_id
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        numericRollId,
        adjustmentType,
        numericQuantity,
        previousLength,
        newLength,
        reason,
        notes || null,
        numericUserId,
      ]
    );

    await connection.commit();

    return res.status(201).json({
      message: 'Adjustment applied successfully',

      adjustment: {
        id: adjustmentResult.insertId,
        rollId: numericRollId,
        rollNumber: roll.roll_id,
        adjustmentType,
        quantity: numericQuantity,
        previousLength,
        newLength,
        reason,
        notes: notes || null,
        userId: numericUserId,
      },
    });
  } catch (error) {
    await connection.rollback();

    console.error('createAdjustment error:', error);

    return res.status(500).json({
      message: 'Failed to create adjustment',
      error: error.message,
    });
  } finally {
    connection.release();
  }
}


async function getAdjustments(req, res) {
  try {
    const [rows] = await pool.query(`
      SELECT
        ia.id,
        ia.roll_id,
        r.roll_id AS roll_number,

        r.product_id,
        p.sku,
        p.name AS product_name,

        ia.adjustment_type,
        ia.quantity,
        ia.previous_length,
        ia.new_length,
        ia.reason,
        ia.notes,

        ia.user_id,
        u.name AS user_name,

        ia.created_at

      FROM inventory_adjustments ia

      INNER JOIN rolls r
        ON r.id = ia.roll_id

      LEFT JOIN products p
        ON p.id = r.product_id

      LEFT JOIN users u
        ON u.id = ia.user_id

      ORDER BY ia.created_at DESC
    `);

    return res.json(rows);
  } catch (error) {
    console.error('getAdjustments error:', error);

    return res.status(500).json({
      message: 'Failed to fetch adjustments',
      error: error.message,
    });
  }
}


async function getAdjustmentById(req, res) {
  try {
    const adjustmentId = Number(req.params.id);

    if (!adjustmentId) {
      return res.status(400).json({
        message: 'Invalid adjustment ID',
      });
    }

    const [rows] = await pool.query(
      `
        SELECT
          ia.id,
          ia.roll_id,
          r.roll_id AS roll_number,

          r.product_id,
          p.sku,
          p.name AS product_name,

          ia.adjustment_type,
          ia.quantity,
          ia.previous_length,
          ia.new_length,
          ia.reason,
          ia.notes,

          ia.user_id,
          u.name AS user_name,

          ia.created_at

        FROM inventory_adjustments ia

        INNER JOIN rolls r
          ON r.id = ia.roll_id

        LEFT JOIN products p
          ON p.id = r.product_id

        LEFT JOIN users u
          ON u.id = ia.user_id

        WHERE ia.id = ?
      `,
      [adjustmentId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: 'Adjustment not found',
      });
    }

    return res.json(rows[0]);
  } catch (error) {
    console.error('getAdjustmentById error:', error);

    return res.status(500).json({
      message: 'Failed to fetch adjustment',
      error: error.message,
    });
  }
}


module.exports = {
  createAdjustment,
  getAdjustments,
  getAdjustmentById,
};