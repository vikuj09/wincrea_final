const bcrypt = require('bcryptjs');
const pool = require('../config/db');


// ============================================================
// HELPERS
// ============================================================

function normalizeEmail(email) {
    return String(
        email || ''
    )
        .trim()
        .toLowerCase();
}


function normalizeRole(role) {
    return String(
        role || 'STAFF'
    )
        .trim()
        .toUpperCase();
}


// ============================================================
// GET ALL USERS
// ============================================================

async function getUsers(req, res) {

    try {

        const [rows] =
            await pool.query(`
                SELECT
                    id,
                    name,
                    email,
                    role,
                    is_active,
                    approval_status,
                    email_verified,
                    approved_at,
                    approved_by,
                    rejection_reason,
                    created_at,
                    updated_at
                FROM users
                ORDER BY
                    CASE
                        WHEN approval_status = 'PENDING'
                        THEN 0
                        WHEN approval_status = 'APPROVED'
                        THEN 1
                        ELSE 2
                    END,
                    id ASC
            `);


        res.json(rows);

    } catch (error) {

        console.error(
            'Get users error:',
            error
        );


        res.status(500).json({

            success:
                false,

            message:
                'Failed to fetch users',

        });
    }
}


// ============================================================
// GET USER BY ID
// ============================================================

async function getUserById(
    req,
    res
) {

    try {

        const {
            id,
        } = req.params;


        const [rows] =
            await pool.query(
                `
                SELECT
                    id,
                    name,
                    email,
                    role,
                    is_active,
                    approval_status,
                    email_verified,
                    approved_at,
                    approved_by,
                    rejection_reason,
                    created_at,
                    updated_at
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [
                    id,
                ]
            );


        if (
            rows.length === 0
        ) {

            return res.status(404).json({

                success:
                    false,

                message:
                    'User not found',

            });
        }


        res.json(
            rows[0]
        );

    } catch (error) {

        console.error(
            'Get user error:',
            error
        );


        res.status(500).json({

            success:
                false,

            message:
                'Failed to fetch user',

        });
    }
}


// ============================================================
// CREATE USER
//
// This endpoint is intended for Admin-created users from
// Settings.
//
// Admin-created accounts are immediately APPROVED.
// Public registration uses authController.register() and
// ALWAYS creates STAFF + PENDING.
// ============================================================

async function createUser(
    req,
    res
) {

    try {

        const {
            name,
            email,
            password,
            role = 'STAFF',
            isActive = true,
        } = req.body;


        const cleanName =
            String(
                name || ''
            ).trim();


        const normalizedEmail =
            normalizeEmail(
                email
            );


        const normalizedRole =
            normalizeRole(
                role
            );


        // ------------------------------------------------------
        // VALIDATION
        // ------------------------------------------------------

        if (!cleanName) {

            return res.status(400).json({

                success:
                    false,

                message:
                    'Name is required',

            });
        }


        if (!normalizedEmail) {

            return res.status(400).json({

                success:
                    false,

                message:
                    'Email is required',

            });
        }


        if (
            !password ||
            password.length < 6
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    'Password must be at least 6 characters',

            });
        }


        if (
            normalizedRole !== 'ADMIN' &&
            normalizedRole !== 'STAFF'
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    'Invalid role',

            });
        }


        // ------------------------------------------------------
        // CHECK EMAIL
        // ------------------------------------------------------

        const [
            existing,
        ] =
            await pool.query(
                `
                SELECT id
                FROM users
                WHERE email = ?
                LIMIT 1
                `,
                [
                    normalizedEmail,
                ]
            );


        if (
            existing.length > 0
        ) {

            return res.status(409).json({

                success:
                    false,

                message:
                    'A user with this email already exists',

            });
        }


        // ------------------------------------------------------
        // HASH
        // ------------------------------------------------------

        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );


        // ------------------------------------------------------
        // INSERT
        // ------------------------------------------------------

        const [
            result,
        ] =
            await pool.query(
                `
                INSERT INTO users
                    (
                        name,
                        email,
                        password_hash,
                        role,
                        is_active,
                        approval_status,
                        email_verified,
                        approved_at,
                        approved_by,
                        rejection_reason
                    )
                VALUES
                    (
                        ?,
                        ?,
                        ?,
                        ?,
                        ?,
                        'APPROVED',
                        TRUE,
                        NOW(),
                        ?,
                        NULL
                    )
                `,
                [

                    cleanName,

                    normalizedEmail,

                    passwordHash,

                    normalizedRole,

                    isActive
                        ? 1
                        : 0,

                    req.user?.userId ||
                        null,

                ]
            );


        // ------------------------------------------------------
        // RETURN
        // ------------------------------------------------------

        const [
            rows,
        ] =
            await pool.query(
                `
                SELECT
                    id,
                    name,
                    email,
                    role,
                    is_active,
                    approval_status,
                    email_verified,
                    approved_at,
                    approved_by,
                    rejection_reason,
                    created_at,
                    updated_at
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [
                    result.insertId,
                ]
            );


        return res.status(201).json({

            success:
                true,

            message:
                'User created successfully',

            user:
                rows[0],

        });

    } catch (error) {

        console.error(
            'Create user error:',
            error
        );


        if (
            error.code ===
            'ER_DUP_ENTRY'
        ) {

            return res.status(409).json({

                success:
                    false,

                message:
                    'A user with this email already exists',

            });
        }


        return res.status(500).json({

            success:
                false,

            message:
                'Failed to create user',

        });
    }
}


// ============================================================
// UPDATE USER
// ============================================================

async function updateUser(
    req,
    res
) {

    try {

        const {
            id,
        } = req.params;


        const {
            name,
            email,
            password,
            role,
            isActive,
        } = req.body;


        // ------------------------------------------------------
        // FIND USER
        // ------------------------------------------------------

        const [
            existingRows,
        ] =
            await pool.query(
                `
                SELECT
                    id,
                    role,
                    is_active,
                    approval_status
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [
                    id,
                ]
            );


        if (
            existingRows.length === 0
        ) {

            return res.status(404).json({

                success:
                    false,

                message:
                    'User not found',

            });
        }


        const existing =
            existingRows[0];


        const fields = [];
        const values = [];


        // ------------------------------------------------------
        // NAME
        // ------------------------------------------------------

        if (
            name !== undefined
        ) {

            const cleanName =
                String(
                    name
                ).trim();


            if (!cleanName) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        'Name cannot be empty',

                });
            }


            fields.push(
                'name = ?'
            );

            values.push(
                cleanName
            );
        }


        // ------------------------------------------------------
        // EMAIL
        // ------------------------------------------------------

        if (
            email !== undefined
        ) {

            const normalizedEmail =
                normalizeEmail(
                    email
                );


            if (!normalizedEmail) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        'Email cannot be empty',

                });
            }


            const [
                emailCheck,
            ] =
                await pool.query(
                    `
                    SELECT id
                    FROM users
                    WHERE
                        email = ?
                        AND id <> ?
                    LIMIT 1
                    `,
                    [
                        normalizedEmail,
                        id,
                    ]
                );


            if (
                emailCheck.length > 0
            ) {

                return res.status(409).json({

                    success:
                        false,

                    message:
                        'Another user already uses this email',

                });
            }


            fields.push(
                'email = ?'
            );

            values.push(
                normalizedEmail
            );
        }


        // ------------------------------------------------------
        // ROLE
        // ------------------------------------------------------

        if (
            role !== undefined
        ) {

            const normalizedRole =
                normalizeRole(
                    role
                );


            if (
                normalizedRole !== 'ADMIN' &&
                normalizedRole !== 'STAFF'
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        'Invalid role',

                });
            }


            // Prevent removing the last active Admin.
            if (
                existing.role === 'ADMIN' &&
                normalizedRole === 'STAFF'
            ) {

                const [
                    adminRows,
                ] =
                    await pool.query(
                        `
                        SELECT
                            COUNT(*) AS count
                        FROM users
                        WHERE
                            role = 'ADMIN'
                            AND is_active = 1
                            AND (
                                approval_status IS NULL
                                OR approval_status = 'APPROVED'
                            )
                        `
                    );


                if (
                    Number(
                        adminRows[0].count
                    ) <= 1
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            'The last active Admin cannot be demoted',

                    });
                }
            }


            fields.push(
                'role = ?'
            );

            values.push(
                normalizedRole
            );
        }


        // ------------------------------------------------------
        // ACTIVE STATUS
        // ------------------------------------------------------

        if (
            isActive !== undefined
        ) {

            // Prevent disabling the last Admin.
            if (
                existing.role === 'ADMIN' &&
                !isActive
            ) {

                const [
                    adminRows,
                ] =
                    await pool.query(
                        `
                        SELECT
                            COUNT(*) AS count
                        FROM users
                        WHERE
                            role = 'ADMIN'
                            AND is_active = 1
                            AND (
                                approval_status IS NULL
                                OR approval_status = 'APPROVED'
                            )
                        `
                    );


                if (
                    Number(
                        adminRows[0].count
                    ) <= 1
                ) {

                    return res.status(400).json({

                        success:
                            false,

                        message:
                            'The last active Admin cannot be deactivated',

                    });
                }
            }


            fields.push(
                'is_active = ?'
            );

            values.push(
                isActive
                    ? 1
                    : 0
            );
        }


        // ------------------------------------------------------
        // PASSWORD
        // ------------------------------------------------------

        if (
            password !== undefined &&
            password !== ''
        ) {

            if (
                password.length < 6
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        'Password must be at least 6 characters',

                });
            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            fields.push(
                'password_hash = ?'
            );

            values.push(
                passwordHash
            );
        }


        // ------------------------------------------------------
        // NOTHING
        // ------------------------------------------------------

        if (
            fields.length === 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    'No changes supplied',

            });
        }


        values.push(
            id
        );


        // ------------------------------------------------------
        // UPDATE
        // ------------------------------------------------------

        await pool.query(
            `
            UPDATE users
            SET ${fields.join(', ')}
            WHERE id = ?
            `,
            values
        );


        // ------------------------------------------------------
        // RETURN
        // ------------------------------------------------------

        const [
            rows,
        ] =
            await pool.query(
                `
                SELECT
                    id,
                    name,
                    email,
                    role,
                    is_active,
                    approval_status,
                    email_verified,
                    approved_at,
                    approved_by,
                    rejection_reason,
                    created_at,
                    updated_at
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [
                    id,
                ]
            );


        return res.json({

            success:
                true,

            message:
                'User updated successfully',

            user:
                rows[0],

        });

    } catch (error) {

        console.error(
            'Update user error:',
            error
        );


        if (
            error.code ===
            'ER_DUP_ENTRY'
        ) {

            return res.status(409).json({

                success:
                    false,

                message:
                    'Another user already uses this email',

            });
        }


        return res.status(500).json({

            success:
                false,

            message:
                'Failed to update user',

        });
    }
}


// ============================================================
// DELETE USER
// ============================================================

async function deleteUser(
    req,
    res
) {

    try {

        const {
            id,
        } = req.params;


        const userId =
            Number(
                id
            );


        if (
            !Number.isInteger(
                userId
            ) ||
            userId <= 0
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    'Invalid user id',

            });
        }


        // ------------------------------------------------------
        // FIND USER
        // ------------------------------------------------------

        const [
            userRows,
        ] =
            await pool.query(
                `
                SELECT
                    id,
                    role,
                    is_active
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [
                    userId,
                ]
            );


        if (
            userRows.length ===
            0
        ) {

            return res.status(404).json({

                success:
                    false,

                message:
                    'User not found',

            });
        }


        const user =
            userRows[0];


        // ------------------------------------------------------
        // PREVENT SELF DELETE
        // ------------------------------------------------------

        if (
            Number(
                req.user?.userId
            ) === userId
        ) {

            return res.status(400).json({

                success:
                    false,

                message:
                    'You cannot delete your own account.',

            });
        }


        // ------------------------------------------------------
        // LAST ADMIN
        // ------------------------------------------------------

        if (
            user.role === 'ADMIN'
        ) {

            const [
                admins,
            ] =
                await pool.query(
                    `
                    SELECT
                        COUNT(*) AS count
                    FROM users
                    WHERE
                        role = 'ADMIN'
                        AND is_active = 1
                        AND (
                            approval_status IS NULL
                            OR approval_status = 'APPROVED'
                        )
                    `
                );


            if (
                Number(
                    admins[0].count
                ) <= 1
            ) {

                return res.status(400).json({

                    success:
                        false,

                    message:
                        'The last active Admin cannot be deleted',

                });
            }
        }


        // ------------------------------------------------------
        // DELETE
        // ------------------------------------------------------

        await pool.query(
            `
            DELETE FROM users
            WHERE id = ?
            `,
            [
                userId,
            ]
        );


        return res.json({

            success:
                true,

            message:
                'User deleted successfully',

        });

    } catch (error) {

        console.error(
            'Delete user error:',
            error
        );


        return res.status(500).json({

            success:
                false,

            message:
                'Failed to delete user',

        });
    }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
};