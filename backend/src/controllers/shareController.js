const crypto = require('crypto');
const pool = require('../config/db');


// ============================================================
// CREATE SHARE LINK
// ============================================================

async function createShareLink(req, res) {
    try {

        const {
            resourceType,
            expiresInDays,
        } = req.body;


        // ------------------------------------------------------
        // VALIDATE RESOURCE
        // ------------------------------------------------------

        if (
            resourceType !== 'PRODUCTS' &&
            resourceType !== 'ROLLS'
        ) {

            return res.status(400).json({
                success: false,
                message:
                    'resourceType must be PRODUCTS or ROLLS.',
            });
        }


        // ------------------------------------------------------
        // EXPIRY
        // ------------------------------------------------------

        let expiresAt = null;

        if (
            expiresInDays !== null &&
            expiresInDays !== undefined &&
            expiresInDays !== ''
        ) {

            const days =
                Number(
                    expiresInDays
                );


            if (
                !Number.isInteger(days) ||
                days <= 0
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        'expiresInDays must be a positive integer.',
                });
            }


            expiresAt =
                new Date(
                    Date.now() +
                    days *
                    24 *
                    60 *
                    60 *
                    1000
                );
        }


        // ------------------------------------------------------
        // RANDOM TOKEN
        // ------------------------------------------------------

        const token =
            crypto
                .randomBytes(32)
                .toString('hex');


        // ------------------------------------------------------
        // USER
        // ------------------------------------------------------

        const createdBy =
            req.user?.id
                ? Number(
                    req.user.id
                )
                : null;


        // ------------------------------------------------------
        // INSERT
        // ------------------------------------------------------

        const [
            result,
        ] =
            await pool.query(
                `
                INSERT INTO share_links
                    (
                        token,
                        resource_type,
                        expires_at,
                        is_active,
                        created_by
                    )
                VALUES
                    (?, ?, ?, TRUE, ?)
                `,
                [
                    token,
                    resourceType,
                    expiresAt,
                    createdBy,
                ]
            );


        return res.status(201).json({

            success:
                true,

            id:
                result.insertId,

            token,

            resourceType,

            expiresAt,

        });

    } catch (error) {

        console.error(
            'Create share link error:',
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                'Failed to create share link.',

        });
    }
}


// ============================================================
// GET PUBLIC SHARED DATA
// ============================================================

async function getSharedData(req, res) {

    try {

        const {
            token,
        } = req.params;


        if (
            !token ||
            typeof token !== 'string'
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    'Share token is required.',

            });
        }


        // ------------------------------------------------------
        // LOOKUP TOKEN
        // ------------------------------------------------------

        const [
            shareRows,
        ] =
            await pool.query(
                `
                SELECT
                    id,
                    token,
                    resource_type,
                    expires_at,
                    is_active
                FROM share_links
                WHERE token = ?
                LIMIT 1
                `,
                [
                    token,
                ]
            );


        if (
            shareRows.length ===
            0
        ) {

            return res.status(404).json({

                success:
                    false,

                message:
                    'Share link not found.',

            });
        }


        const share =
            shareRows[0];


        // ------------------------------------------------------
        // ACTIVE
        // ------------------------------------------------------

        if (
            !Boolean(
                share.is_active
            )
        ) {

            return res.status(403).json({

                success:
                    false,

                message:
                    'This share link has been disabled.',

            });
        }


        // ------------------------------------------------------
        // EXPIRATION
        // ------------------------------------------------------

        if (
            share.expires_at &&
            new Date(
                share.expires_at
            ).getTime() <=
                Date.now()
        ) {

            return res.status(410).json({

                success:
                    false,

                message:
                    'This share link has expired.',

            });
        }


        // ======================================================
        // PRODUCT MASTER
        // ======================================================

        if (
            share.resource_type ===
            'PRODUCTS'
        ) {

            const [
                rows,
            ] =
                await pool.query(
                    `
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
                        ON r.product_id = p.id

                    GROUP BY
                        p.id,
                        p.sku,
                        p.name,
                        p.category,
                        p.color,
                        p.width_cm,
                        p.rate_per_meter,
                        p.reorder_level

                    ORDER BY
                        p.sku ASC
                    `
                );


            return res.json({

                success:
                    true,

                resourceType:
                    'PRODUCTS',

                data:
                    rows,

            });
        }


        // ======================================================
        // ROLL INVENTORY
        // ======================================================

        if (
            share.resource_type ===
            'ROLLS'
        ) {

            const [
                rows,
            ] =
                await pool.query(
                    `
                    SELECT
                        r.id,

                        r.roll_id,

                        r.product_id,

                        r.original_length,

                        r.remaining_length,

                        r.status,

                        r.batch,

                        r.rack,

                        r.bin,

                        r.supplier_id,

                        r.inward_date,

                        r.created_at,

                        p.sku,

                        p.name AS product_name,

                        p.category,

                        p.color,

                        p.width_cm

                    FROM rolls r

                    LEFT JOIN products p
                        ON p.id = r.product_id

                    ORDER BY
                        r.created_at DESC,
                        r.id DESC
                    `
                );


            return res.json({

                success:
                    true,

                resourceType:
                    'ROLLS',

                data:
                    rows,

            });
        }


        // ------------------------------------------------------
        // INVALID RESOURCE
        // ------------------------------------------------------

        return res.status(400).json({

            success:
                false,

            message:
                'Invalid shared resource.',

        });

    } catch (error) {

        console.error(
            'Get shared data error:',
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                'Failed to load shared data.',

        });
    }
}


// ============================================================
// DISABLE SHARE LINK
// ============================================================

async function disableShareLink(req, res) {

    try {

        const {
            id,
        } = req.params;


        const shareId =
            Number(
                id
            );


        if (
            !Number.isInteger(
                shareId
            ) ||
            shareId <= 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    'Invalid share link id.',

            });
        }


        const [
            result,
        ] =
            await pool.query(
                `
                UPDATE share_links
                SET
                    is_active = FALSE
                WHERE id = ?
                `,
                [
                    shareId,
                ]
            );


        if (
            result.affectedRows ===
            0
        ) {

            return res.status(404).json({

                success:
                    false,

                message:
                    'Share link not found.',

            });
        }


        return res.json({

            success:
                true,

            message:
                'Share link disabled.',

        });

    } catch (error) {

        console.error(
            'Disable share link error:',
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                'Failed to disable share link.',

        });
    }
}


// ============================================================
// GET MY SHARE LINKS
//
// Useful later for showing existing links in the UI.
// ============================================================

async function getMyShareLinks(req, res) {

    try {

        const createdBy =
            req.user?.id
                ? Number(
                    req.user.id
                )
                : null;


        if (!createdBy) {

            return res.status(401).json({

                success:
                    false,

                message:
                    'Authentication required.',

            });
        }


        const [
            rows,
        ] =
            await pool.query(
                `
                SELECT
                    id,
                    token,
                    resource_type,
                    expires_at,
                    is_active,
                    created_at
                FROM share_links
                WHERE created_by = ?
                ORDER BY created_at DESC
                `,
                [
                    createdBy,
                ]
            );


        return res.json({

            success:
                true,

            data:
                rows,

        });

    } catch (error) {

        console.error(
            'Get share links error:',
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                'Failed to fetch share links.',

        });
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    createShareLink,
    getSharedData,
    disableShareLink,
    getMyShareLinks,
};