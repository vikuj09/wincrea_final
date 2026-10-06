const pool = require('../config/db');

const VALID_CATEGORIES = ['ESSENTIAL', 'PREMIUM'];

/* =========================================================
   GET ALL PRODUCTS
========================================================= */
const getProducts = async (req, res) => {
    try {
        const [products] = await pool.query(`
            SELECT
                p.id,
                p.sku,
                p.name,
                p.category,
                p.color,
                p.width_cm,
                p.rate_per_meter,
                p.reorder_level,

                COALESCE(
                    SUM(
                        CASE
                            WHEN r.remaining_length > 0
                            THEN r.remaining_length
                            ELSE 0
                        END
                    ),
                    0
                ) AS stock,

                COUNT(
                    CASE
                        WHEN r.remaining_length > 0
                        THEN r.id
                    END
                ) AS rolls

            FROM products p

            LEFT JOIN rolls r
                ON p.id = r.product_id

            GROUP BY
                p.id,
                p.sku,
                p.name,
                p.category,
                p.color,
                p.width_cm,
                p.rate_per_meter,
                p.reorder_level

            ORDER BY p.sku;
        `);

        res.json(products);

    } catch (error) {
        console.error('Error fetching products:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch products'
        });
    }
};


/* =========================================================
   ADD PRODUCT
========================================================= */
const addProduct = async (req, res) => {
    try {
        const {
            sku,
            name,
            category,
            color,
            width,
            ratePerMeter,
            reorderLevel
        } = req.body;

        if (!sku || !name) {
            return res.status(400).json({
                success: false,
                message: 'SKU and name are required'
            });
        }

        const normalizedCategory = String(
            category || 'ESSENTIAL'
        ).toUpperCase();

        if (!VALID_CATEGORIES.includes(normalizedCategory)) {
            return res.status(400).json({
                success: false,
                message: 'Category must be ESSENTIAL or PREMIUM'
            });
        }

        const [result] = await pool.query(
            `
            INSERT INTO products
                (
                    sku,
                    name,
                    category,
                    color,
                    width_cm,
                    rate_per_meter,
                    reorder_level
                )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                sku.trim(),
                name.trim(),
                normalizedCategory,
                color || null,
                width || null,
                ratePerMeter || 0,
                reorderLevel || 0
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Product created successfully',
            id: result.insertId
        });

    } catch (error) {
        console.error('Error creating product:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'SKU already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create product'
        });
    }
};


/* =========================================================
   UPDATE PRODUCT
========================================================= */
const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            sku,
            name,
            category,
            color,
            width,
            ratePerMeter,
            reorderLevel
        } = req.body;

        if (!sku || !name) {
            return res.status(400).json({
                success: false,
                message: 'SKU and name are required'
            });
        }

        const normalizedCategory = String(
            category || 'ESSENTIAL'
        ).toUpperCase();

        if (!VALID_CATEGORIES.includes(normalizedCategory)) {
            return res.status(400).json({
                success: false,
                message: 'Category must be ESSENTIAL or PREMIUM'
            });
        }

        const [result] = await pool.query(
            `
            UPDATE products
            SET
                sku = ?,
                name = ?,
                category = ?,
                color = ?,
                width_cm = ?,
                rate_per_meter = ?,
                reorder_level = ?
            WHERE id = ?
            `,
            [
                sku.trim(),
                name.trim(),
                normalizedCategory,
                color || null,
                width || null,
                ratePerMeter || 0,
                reorderLevel || 0,
                id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        res.json({
            success: true,
            message: 'Product updated successfully'
        });

    } catch (error) {
        console.error('Error updating product:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                message: 'SKU already exists'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to update product'
        });
    }
};


module.exports = {
    getProducts,
    addProduct,
    updateProduct
};