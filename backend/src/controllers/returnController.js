const { temporaryNumber, finalizeNumber } = require('../utils/documentNumbers');
const pool = require('../config/db');

async function returnRoll(req, res) {
  let connection;
  try {
    connection = await pool.getConnection();
    const {
      userId,
      rollId,
      quantity,
      notes,
    } = { ...req.body, userId: req.user.userId, createdBy: req.user.userId };

    // ==========================================================
    // VALIDATION
    // ==========================================================

    if (!userId || !rollId || !quantity) {
      return res.status(400).json({
        success: false,
        message:
          'userId, rollId and quantity are required',
      });
    }

    const returnQuantity = Number(quantity);

    if (
      !Number.isFinite(returnQuantity) ||
      returnQuantity <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          'Quantity must be greater than 0',
      });
    }

    await connection.beginTransaction();

    // ==========================================================
    // GET ROLL
    // ==========================================================

    const [rolls] = await connection.query(
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
      [rollId]
    );

    if (rolls.length === 0) {
      if (connection) await connection.rollback();

      return res.status(404).json({
        success: false,
        message: 'Roll not found',
      });
    }

    const roll = rolls[0];

    const originalLength =
      Number(roll.original_length);

    const currentRemaining =
      Number(roll.remaining_length);

    // ==========================================================
    // FIND ORIGINAL OUTWARD TRANSACTION
    // ==========================================================

    const [outwardTransactions] =
      await connection.query(
        `
        SELECT
          t.id,
          t.customer_id,
          ti.quantity
        FROM transactions t
        INNER JOIN transaction_items ti
          ON ti.transaction_id = t.id
        WHERE
          ti.roll_id = ?
          AND t.transaction_type = 'OUTWARD'
        ORDER BY t.id DESC
        LIMIT 1
        `,
        [roll.id]
      );

    if (
      outwardTransactions.length === 0
    ) {
      if (connection) await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          'No outward transaction found for this roll',
      });
    }

    const customerId =
      outwardTransactions[0].customer_id;

    if (!customerId) {
      if (connection) await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          'Customer not found for the original outward transaction',
      });
    }

    // ==========================================================
    // VALIDATE RETURN QUANTITY
    // ==========================================================

    const outward = outwardTransactions[0];
    const [returns] = await connection.query(`
      SELECT COALESCE(SUM(ti.quantity), 0) AS returned_quantity
      FROM transaction_items ti
      JOIN transactions t ON t.id = ti.transaction_id
      WHERE ti.roll_id = ? AND t.transaction_type = 'RETURN' AND t.id > ?
    `, [roll.id, outward.id]);
    const maximumReturn = Math.max(0, Math.min(
      Number(outward.quantity) - Number(returns[0].returned_quantity),
      originalLength - currentRemaining
    ));

    if (
      returnQuantity >
      maximumReturn
    ) {
      if (connection) await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          `Return exceeds dispatched quantity. ` +
          `Maximum return: ${maximumReturn} m`,
      });
    }

    // ==========================================================
    // CALCULATE NEW REMAINING LENGTH
    // ==========================================================

    const newRemaining =
      currentRemaining +
      returnQuantity;

    const newStatus =
      newRemaining > 0
        ? 'AVAILABLE'
        : 'EMPTY';

    // ==========================================================
    // UPDATE ROLL
    // ==========================================================

    await connection.query(
      `
      UPDATE rolls
      SET
        remaining_length = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        newRemaining,
        newStatus,
        roll.id,
      ]
    );

    // ==========================================================
    // CREATE TRANSACTION NUMBER
    // ==========================================================

    let transactionNumber = temporaryNumber('RET');

    const [transactionResult] =
      await connection.query(
        `
        INSERT INTO transactions
        (
          transaction_number,
          transaction_type,
          customer_id,
          supplier_id,
          user_id,
          notes
        )
        VALUES
        (?, 'RETURN', ?, NULL, ?, ?)
        `,
        [
          transactionNumber,
          customerId,
          userId,
          notes || null,
        ]
      );

    const transactionId =
      transactionResult.insertId;
    transactionNumber = await finalizeNumber(connection, 'transaction', transactionId, 'RET');

    // ==========================================================
    // CREATE TRANSACTION ITEM
    // ==========================================================

    await connection.query(
      `
      INSERT INTO transaction_items
      (
        transaction_id,
        roll_id,
        quantity
      )
      VALUES (?, ?, ?)
      `,
      [
        transactionId,
        roll.id,
        returnQuantity,
      ]
    );

    // ==========================================================
    // COMMIT
    // ==========================================================

    await connection.commit();

    return res.status(201).json({
      success: true,

      message:
        'Roll returned successfully',

      transactionId,

      transactionNumber,

      customerId,

      roll: {
        id: roll.id,

        rollId:
          roll.roll_id,

        previousRemaining:
          currentRemaining,

        returned:
          returnQuantity,

        newRemaining,

        status:
          newStatus,
      },
    });

  } catch (error) {

    if (connection) await connection.rollback();

    console.error(
      'Return roll error:',
      error
    );

    return res.status(500).json({
      success: false,
      message:
        'Failed to process return',
      error:
        error.message,
    });

  } finally {

    if (connection) connection.release();

  }
}

module.exports = {
  returnRoll,
};