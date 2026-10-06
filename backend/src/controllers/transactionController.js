const pool = require('../config/db');


// ============================================================
// GET ALL TRANSACTIONS
// ============================================================

async function getTransactions(req, res) {
    try {

        const [rows] = await pool.query(`
            SELECT
                t.id,
                t.transaction_number,
                t.transaction_type,

                t.customer_id,
                c.name AS customer_name,

                t.supplier_id,
                s.name AS supplier_name,

                t.user_id,
                u.name AS user_name,

                t.notes,
                t.source_type,
                t.source_file,
                t.created_at,

                ti.id AS item_id,
                ti.roll_id,
                ti.quantity,

                r.roll_id AS roll_number,
                r.product_id,

                p.sku,
                p.name AS product_name,
                p.color

            FROM transactions t

            LEFT JOIN transaction_items ti
                ON ti.transaction_id = t.id

            LEFT JOIN rolls r
                ON r.id = ti.roll_id

            LEFT JOIN products p
                ON p.id = r.product_id

            LEFT JOIN customers c
                ON c.id = t.customer_id

            LEFT JOIN suppliers s
                ON s.id = t.supplier_id

            LEFT JOIN users u
                ON u.id = t.user_id

            ORDER BY
                t.created_at DESC,
                t.id DESC,
                ti.id ASC
        `);


        // ======================================================
        // GROUP ITEMS UNDER EACH TRANSACTION
        // ======================================================

        const transactionMap =
            new Map();


        for (const row of rows) {

            if (!transactionMap.has(row.id)) {

                transactionMap.set(
                    row.id,
                    {
                        id:
                            row.id,

                        transaction_number:
                            row.transaction_number,

                        transaction_type:
                            row.transaction_type,

                        customer_id:
                            row.customer_id,

                        customer_name:
                            row.customer_name,

                        supplier_id:
                            row.supplier_id,

                        supplier_name:
                            row.supplier_name,

                        user_id:
                            row.user_id,

                        user_name:
                            row.user_name,

                        notes:
                            row.notes,

                        source_type:
                            row.source_type ||
                            'MANUAL',

                        source_file:
                            row.source_file ||
                            null,

                        created_at:
                            row.created_at,

                        total_rolls:
                            0,

                        total_quantity:
                            0,

                        items: [],
                    }
                );

            }


            const transaction =
                transactionMap.get(
                    row.id
                );


            // --------------------------------------------------
            // Add item
            // --------------------------------------------------

            if (row.item_id) {

                const quantity =
                    Number(
                        row.quantity || 0
                    );


                transaction.total_rolls += 1;

                transaction.total_quantity +=
                    quantity;


                transaction.items.push({

                    item_id:
                        row.item_id,

                    roll_id:
                        row.roll_id,

                    quantity,

                    roll_number:
                        row.roll_number,

                    product_id:
                        row.product_id,

                    sku:
                        row.sku,

                    product_name:
                        row.product_name,

                    color:
                        row.color,

                });

            }

        }


        // ======================================================
        // CONVERT MAP TO ARRAY
        // ======================================================

        const transactions =
            Array.from(
                transactionMap.values()
            );


        // Convert totals to normal numbers
        transactions.forEach(
            (transaction) => {

                transaction.total_quantity =
                    Number(
                        transaction.total_quantity.toFixed(
                            2
                        )
                    );

            }
        );


        res.json(
            transactions
        );

    } catch (error) {

        console.error(
            'Get transactions error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch transactions',
        });
    }
}


// ============================================================
// GET SINGLE TRANSACTION
// ============================================================

async function getTransactionById(req, res) {

    try {

        const {
            id,
        } = req.params;


        const [rows] =
            await pool.query(
                `
                SELECT
                    t.id,
                    t.transaction_number,
                    t.transaction_type,

                    t.customer_id,
                    c.name AS customer_name,

                    t.supplier_id,
                    s.name AS supplier_name,

                    t.user_id,
                    u.name AS user_name,

                    t.notes,
                    t.source_type,
                    t.source_file,
                    t.created_at,

                    ti.id AS item_id,
                    ti.roll_id,
                    ti.quantity,

                    r.roll_id AS roll_number,
                    r.product_id,

                    p.sku,
                    p.name AS product_name,
                    p.color

                FROM transactions t

                LEFT JOIN transaction_items ti
                    ON ti.transaction_id = t.id

                LEFT JOIN rolls r
                    ON r.id = ti.roll_id

                LEFT JOIN products p
                    ON p.id = r.product_id

                LEFT JOIN customers c
                    ON c.id = t.customer_id

                LEFT JOIN suppliers s
                    ON s.id = t.supplier_id

                LEFT JOIN users u
                    ON u.id = t.user_id

                WHERE t.id = ?

                ORDER BY
                    ti.id ASC
                `,
                [id]
            );


        if (rows.length === 0) {

            return res.status(404).json({
                success: false,
                message:
                    'Transaction not found',
            });

        }


        const first =
            rows[0];


        const transaction = {

            id:
                first.id,

            transaction_number:
                first.transaction_number,

            transaction_type:
                first.transaction_type,

            customer_id:
                first.customer_id,

            customer_name:
                first.customer_name,

            supplier_id:
                first.supplier_id,

            supplier_name:
                first.supplier_name,

            user_id:
                first.user_id,

            user_name:
                first.user_name,

            notes:
                first.notes,

            source_type:
                first.source_type ||
                'MANUAL',

            source_file:
                first.source_file ||
                null,

            created_at:
                first.created_at,

            total_rolls:
                0,

            total_quantity:
                0,

            items: [],
        };


        for (const row of rows) {

            if (!row.item_id) {
                continue;
            }


            const quantity =
                Number(
                    row.quantity || 0
                );


            transaction.total_rolls += 1;

            transaction.total_quantity +=
                quantity;


            transaction.items.push({

                item_id:
                    row.item_id,

                roll_id:
                    row.roll_id,

                quantity,

                roll_number:
                    row.roll_number,

                product_id:
                    row.product_id,

                sku:
                    row.sku,

                product_name:
                    row.product_name,

                color:
                    row.color,

            });

        }


        transaction.total_quantity =
            Number(
                transaction.total_quantity.toFixed(
                    2
                )
            );


        res.json(
            transaction
        );

    } catch (error) {

        console.error(
            'Get transaction error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch transaction',
        });
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getTransactions,
    getTransactionById,
};