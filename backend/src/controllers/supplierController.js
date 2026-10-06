const pool = require('../config/db');


// ============================================================
// GET SUPPLIERS
// ============================================================

async function getSuppliers(req, res) {

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
            FROM suppliers
            ORDER BY name ASC
        `);

        res.json(rows);

    } catch (error) {

        console.error(
            'Get suppliers error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to fetch suppliers'
        });
    }
}


// ============================================================
// CREATE SUPPLIER
// ============================================================

async function createSupplier(req, res) {

    try {

        const {
            name,
            phone,
            email,
            address,
            gstNumber
        } = req.body;


        if (!name || !name.trim()) {

            return res.status(400).json({
                success: false,
                message: 'Supplier name is required'
            });
        }


        const [result] = await pool.query(
            `
            INSERT INTO suppliers
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
            id: result.insertId,
            message: 'Supplier created successfully'
        });

    } catch (error) {

        console.error(
            'Create supplier error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to create supplier'
        });
    }
}


// ============================================================
// UPDATE SUPPLIER
// ============================================================

async function updateSupplier(req, res) {

    try {

        const { id } = req.params;

        const {
            name,
            phone,
            email,
            address,
            gstNumber
        } = req.body;


        if (!name || !name.trim()) {

            return res.status(400).json({
                success: false,
                message: 'Supplier name is required'
            });
        }


        const [result] = await pool.query(
            `
            UPDATE suppliers
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


        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }


        res.json({
            success: true,
            message: 'Supplier updated successfully'
        });

    } catch (error) {

        console.error(
            'Update supplier error:',
            error
        );

        res.status(500).json({
            success: false,
            message: 'Failed to update supplier'
        });
    }
}


// ============================================================
// DELETE SUPPLIER
//
// Safety:
// - Supplier must exist
// - Cannot delete if rolls are linked to supplier
// - Cannot delete if transactions are linked to supplier
// - Cannot delete if purchase orders are linked to supplier
// ============================================================

async function deleteSupplier(req, res) {

    try {

        const { id } = req.params;


        if (!id || !Number.isInteger(Number(id))) {

            return res.status(400).json({
                success: false,
                message: 'Invalid supplier id'
            });
        }


        // ------------------------------------------------------
        // CHECK SUPPLIER EXISTS
        // ------------------------------------------------------

        const [supplierRows] = await pool.query(
            `
            SELECT
                id,
                name
            FROM suppliers
            WHERE id = ?
            `,
            [id]
        );


        if (supplierRows.length === 0) {

            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }


        const supplierName =
            supplierRows[0].name;


        // ------------------------------------------------------
        // CHECK ROLLS
        // ------------------------------------------------------

        const [rollRows] = await pool.query(
            `
            SELECT COUNT(*) AS count
            FROM rolls
            WHERE supplier_id = ?
            `,
            [id]
        );


        const rollCount =
            Number(
                rollRows[0]?.count || 0
            );


        if (rollCount > 0) {

            return res.status(409).json({
                success: false,
                message:
                    `Cannot delete ${supplierName}. ` +
                    `${rollCount} roll(s) are linked to this supplier. ` +
                    'Historical inventory records must be preserved.'
            });
        }


        // ------------------------------------------------------
        // CHECK TRANSACTIONS
        // ------------------------------------------------------

        const [transactionRows] =
            await pool.query(
                `
                SELECT COUNT(*) AS count
                FROM transactions
                WHERE supplier_id = ?
                `,
                [id]
            );


        const transactionCount =
            Number(
                transactionRows[0]?.count || 0
            );


        if (transactionCount > 0) {

            return res.status(409).json({
                success: false,
                message:
                    `Cannot delete ${supplierName}. ` +
                    `${transactionCount} transaction(s) are linked to this supplier. ` +
                    'Historical transaction records must be preserved.'
            });
        }


        // ------------------------------------------------------
        // CHECK PURCHASE ORDERS
        // ------------------------------------------------------

        const [purchaseOrderRows] =
            await pool.query(
                `
                SELECT COUNT(*) AS count
                FROM purchase_orders
                WHERE supplier_id = ?
                `,
                [id]
            );


        const purchaseOrderCount =
            Number(
                purchaseOrderRows[0]?.count || 0
            );


        if (purchaseOrderCount > 0) {

            return res.status(409).json({
                success: false,
                message:
                    `Cannot delete ${supplierName}. ` +
                    `${purchaseOrderCount} purchase order(s) are linked to this supplier. ` +
                    'Historical purchasing records must be preserved.'
            });
        }


        // ------------------------------------------------------
        // DELETE
        // ------------------------------------------------------

        const [result] =
            await pool.query(
                `
                DELETE FROM suppliers
                WHERE id = ?
                `,
                [id]
            );


        if (result.affectedRows === 0) {

            return res.status(404).json({
                success: false,
                message: 'Supplier not found'
            });
        }


        res.json({
            success: true,
            message:
                'Supplier deleted successfully'
        });

    } catch (error) {

        console.error(
            'Delete supplier error:',
            error
        );


        // ------------------------------------------------------
        // MYSQL FOREIGN KEY PROTECTION
        // ------------------------------------------------------

        if (
            error.code ===
            'ER_ROW_IS_REFERENCED_2'
        ) {

            return res.status(409).json({
                success: false,
                message:
                    'Cannot delete this supplier because historical records are linked to it.'
            });
        }


        res.status(500).json({
            success: false,
            message:
                'Failed to delete supplier'
        });
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier
};