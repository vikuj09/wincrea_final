const pool = require('../config/db');


// ============================================================
// GET CUSTOMERS
// ============================================================

async function getCustomers(req, res) {
    try {

        const [rows] = await pool.query(`
            SELECT
                id,
                name,
                phone,
                email,
                address,
                gst_number,
                created_at,
                updated_at
            FROM customers
            ORDER BY name ASC
        `);

        res.json(rows);

    } catch (error) {

        console.error(
            'Get customers error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to fetch customers'
        });
    }
}


// ============================================================
// CREATE CUSTOMER
// ============================================================

async function createCustomer(req, res) {

    try {

        const {
            name,
            phone,
            email,
            address,
            gstNumber
        } = req.body;

        if (
            !name ||
            !name.trim()
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Customer name is required'
            });
        }

        const [result] =
            await pool.query(
                `
                INSERT INTO customers
                    (
                        name,
                        phone,
                        email,
                        address,
                        gst_number
                    )
                VALUES (?, ?, ?, ?, ?)
                `,
                [
                    name.trim(),
                    phone || null,
                    email || null,
                    address || null,
                    gstNumber || null
                ]
            );

        res.status(201).json({
            success: true,
            id:
                result.insertId,
            message:
                'Customer created successfully'
        });

    } catch (error) {

        console.error(
            'Create customer error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to create customer'
        });
    }
}


// ============================================================
// UPDATE CUSTOMER
// ============================================================

async function updateCustomer(req, res) {

    try {

        const { id } =
            req.params;

        const {
            name,
            phone,
            email,
            address,
            gstNumber
        } = req.body;

        if (
            !name ||
            !name.trim()
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Customer name is required'
            });
        }

        const [result] =
            await pool.query(
                `
                UPDATE customers
                SET
                    name = ?,
                    phone = ?,
                    email = ?,
                    address = ?,
                    gst_number = ?
                WHERE id = ?
                `,
                [
                    name.trim(),
                    phone || null,
                    email || null,
                    address || null,
                    gstNumber || null,
                    id
                ]
            );

        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    'Customer not found'
            });
        }

        res.json({
            success: true,
            message:
                'Customer updated successfully'
        });

    } catch (error) {

        console.error(
            'Update customer error:',
            error
        );

        res.status(500).json({
            success: false,
            message:
                'Failed to update customer'
        });
    }
}


// ============================================================
// DELETE CUSTOMER
// ============================================================

async function deleteCustomer(req, res) {

    try {

        const { id } =
            req.params;

        const customerId =
            Number(id);

        if (
            !Number.isInteger(
                customerId
            ) ||
            customerId <= 0
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'Invalid customer ID'
            });
        }

        // ------------------------------------------------------
        // Check customer exists
        // ------------------------------------------------------

        const [
            customerRows
        ] = await pool.query(
            `
            SELECT
                id,
                name
            FROM customers
            WHERE id = ?
            LIMIT 1
            `,
            [customerId]
        );

        if (
            customerRows.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    'Customer not found'
            });
        }

        // ------------------------------------------------------
        // Check for Proforma Invoices
        // ------------------------------------------------------

        const [
            piRows
        ] = await pool.query(
            `
            SELECT
                COUNT(*) AS count
            FROM proforma_invoices
            WHERE customer_id = ?
            `,
            [customerId]
        );

        const piCount =
            Number(
                piRows[0]?.count || 0
            );

        if (piCount > 0) {

            return res.status(409).json({
                success: false,
                message:
                    `Cannot delete this customer because ${piCount} proforma invoice(s) are linked to it.`
            });
        }

        // ------------------------------------------------------
        // Check for transactions
        // ------------------------------------------------------

        const [
            transactionRows
        ] = await pool.query(
            `
            SELECT
                COUNT(*) AS count
            FROM transactions
            WHERE customer_id = ?
            `,
            [customerId]
        );

        const transactionCount =
            Number(
                transactionRows[0]?.count ||
                0
            );

        if (
            transactionCount > 0
        ) {

            return res.status(409).json({
                success: false,
                message:
                    `Cannot delete this customer because ${transactionCount} transaction(s) are linked to it.`
            });
        }

        // ------------------------------------------------------
        // Delete customer
        // ------------------------------------------------------

        const [result] =
            await pool.query(
                `
                DELETE FROM customers
                WHERE id = ?
                `,
                [customerId]
            );

        if (
            result.affectedRows === 0
        ) {

            return res.status(404).json({
                success: false,
                message:
                    'Customer not found'
            });
        }

        res.json({
            success: true,
            message:
                `Customer "${customerRows[0].name}" deleted successfully`
        });

    } catch (error) {

        console.error(
            'Delete customer error:',
            error
        );

        // ------------------------------------------------------
        // Foreign-key protection
        // ------------------------------------------------------

        if (
            error.code ===
            'ER_ROW_IS_REFERENCED_2'
        ) {

            return res.status(409).json({
                success: false,
                message:
                    'This customer cannot be deleted because related records exist.'
            });
        }

        res.status(500).json({
            success: false,
            message:
                'Failed to delete customer'
        });
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getCustomers,
    createCustomer,
    updateCustomer,
    deleteCustomer
};