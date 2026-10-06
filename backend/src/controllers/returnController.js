const pool = require('../config/db');

async function returnRoll(req, res) {
  const connection = await pool.getConnection();

  try {
    const {
      userId,
      rollId,
      quantity,
      notes,
    } = req.body;

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
      await connection.rollback();

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
          t.customer_id
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
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          'No outward transaction found for this roll',
      });
    }

    const customerId =
      outwardTransactions[0].customer_id;

    if (!customerId) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message:
          'Customer not found for the original outward transaction',
      });
    }

    // ==========================================================
    // VALIDATE RETURN QUANTITY
    // ==========================================================

    const maximumReturn =
      originalLength - currentRemaining;

    if (
      returnQuantity >
      maximumReturn
    ) {
      await connection.rollback();

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

    const [lastTransactions] =
      await connection.query(
        `
        SELECT transaction_number
        FROM transactions
        WHERE transaction_type = 'RETURN'
        ORDER BY id DESC
        LIMIT 1
        `
      );

    let nextNumber = 1;

    if (lastTransactions.length > 0) {
      const match =
        String(
          lastTransactions[0]
            .transaction_number
        ).match(/(\d+)$/);

      if (match) {
        nextNumber =
          Number(match[1]) + 1;
      }
    }

    const transactionNumber =
      `RET-${String(nextNumber).padStart(5, '0')}`;

    // ==========================================================
    // CREATE RETURN TRANSACTION
    // ==========================================================

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

    await connection.rollback();

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

    connection.release();

  }
}

module.exports = {
  returnRoll,
};