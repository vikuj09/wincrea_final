const pool = require('../config/db');

// ============================================================
// GET ALL ROLLS
// ============================================================

const getRolls = async (req, res) => {
    try {
        const [rolls] = await pool.query(`
           SELECT
    r.id,
    r.roll_id,
    r.product_id,
    r.original_length,
    r.remaining_length,
    r.status,
    r.created_at,
    r.updated_at,

    outward.quantity AS outward_quantity,
    outward.customer_id,
    outward.customer_name,
    outward.dispatched_at

FROM rolls r

LEFT JOIN (
    SELECT
        ti.roll_id,
        ti.quantity,
        t.customer_id,
        c.name AS customer_name,
        t.created_at AS dispatched_at

    FROM transaction_items ti

    INNER JOIN transactions t
        ON t.id = ti.transaction_id

    LEFT JOIN customers c
        ON c.id = t.customer_id

    WHERE t.transaction_type = 'OUTWARD'

      AND t.id = (
          SELECT MAX(t2.id)
          FROM transaction_items ti2

          INNER JOIN transactions t2
              ON t2.id = ti2.transaction_id

          WHERE ti2.roll_id = ti.roll_id
            AND t2.transaction_type = 'OUTWARD'
      )

) outward
    ON outward.roll_id = r.id

ORDER BY r.id DESC;
        `);

        res.json(rolls);

    } catch (error) {
        console.error(
            'Error fetching rolls:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch rolls'
        });
    }
};


// ============================================================
// GET ROLLS FOR ONE PRODUCT
// ============================================================

const getRollsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const [rolls] = await pool.query(`
            SELECT
                r.id,
                r.roll_id,
                r.product_id,
                r.original_length,
                r.remaining_length,
                r.status,
                r.created_at,
                r.updated_at,

                p.sku,
                p.name AS product_name,
                p.color

            FROM rolls r

            INNER JOIN products p
                ON r.product_id = p.id

            WHERE r.product_id = ?

            ORDER BY r.created_at DESC
        `, [productId]);

        res.json(rolls);

    } catch (error) {
        console.error(
            'Error fetching product rolls:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch product rolls'
        });
    }
};


// ============================================================
// CREATE ROLL
// ============================================================

const createRoll = async (req, res) => {
    try {
        const {
            rollId,
            productId,
            originalLength,
            remainingLength
        } = req.body;

        if (
            !rollId ||
            !productId ||
            originalLength === undefined
        ) {
            return res.status(400).json({
                success: false,
                message:
                    'rollId, productId and originalLength are required'
            });
        }

        const remaining =
            remainingLength !== undefined
                ? Number(remainingLength)
                : Number(originalLength);

        const [result] = await pool.query(
            `
            INSERT INTO rolls
                (
                    roll_id,
                    product_id,
                    original_length,
                    remaining_length,
                    status
                )
            VALUES (?, ?, ?, ?, 'AVAILABLE')
            `,
            [
                rollId,
                productId,
                Number(originalLength),
                remaining
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Roll created successfully',
            id: result.insertId
        });

    } catch (error) {
        console.error(
            'Error creating roll:',
            error
        );

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'Roll ID already exists'
            });
        }

        if (error.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({
                success: false,
                message: 'Product does not exist'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create roll'
        });
    }
};


module.exports = {
    getRolls,
    getRollsByProduct,
    createRoll
};