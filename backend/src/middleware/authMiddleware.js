const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const JWT_SECRET =
    process.env.JWT_SECRET ||
    'window-creators-secret-change-this';


// ============================================================
// AUTHENTICATE TOKEN
// ============================================================

async function authenticateToken(
    req,
    res,
    next
) {

    try {

        const authHeader =
            req.headers.authorization;


        // ------------------------------------------------------
        // CHECK HEADER
        // ------------------------------------------------------

        if (!authHeader) {

            return res.status(401).json({
                success: false,
                message:
                    'Authentication required',
            });

        }


        const parts =
            authHeader.trim().split(/\s+/);


        if (
            parts.length !== 2 ||
            parts[0].toLowerCase() !== 'bearer'
        ) {

            return res.status(401).json({
                success: false,
                message:
                    'Invalid authorization header',
            });

        }


        const token =
            parts[1];


        // ------------------------------------------------------
        // VERIFY TOKEN
        // ------------------------------------------------------

        let decoded;

        try {

            decoded =
                jwt.verify(
                    token,
                    JWT_SECRET
                );

        } catch (error) {

            return res.status(401).json({
                success: false,
                message:
                    'Invalid or expired token',
            });

        }


        // ------------------------------------------------------
        // USER ID
        // ------------------------------------------------------

        const userId =
            Number(
                decoded?.userId
            );


        if (
            !Number.isInteger(
                userId
            ) ||
            userId <= 0
        ) {

            return res.status(401).json({
                success: false,
                message:
                    'Invalid token payload',
            });

        }


        // ------------------------------------------------------
        // LOAD CURRENT USER
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
                    email_verified
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [
                    userId,
                ]
            );


        if (
            rows.length === 0
        ) {

            return res.status(401).json({
                success: false,
                message:
                    'User account not found',
            });

        }


        const user =
            rows[0];


        // ------------------------------------------------------
        // ACTIVE
        // ------------------------------------------------------

        if (
            Number(
                user.is_active
            ) !== 1
        ) {

            return res.status(403).json({
                success: false,
                message:
                    'User account is inactive',
            });

        }


        // ------------------------------------------------------
        // EMAIL VERIFIED
        // ------------------------------------------------------

        if (
            user.email_verified !== null &&
            user.email_verified !== undefined &&
            Number(
                user.email_verified
            ) !== 1
        ) {

            return res.status(403).json({
                success: false,
                message:
                    'Email address is not verified',
            });

        }


        // ------------------------------------------------------
        // APPROVAL
        //
        // Existing old users with NULL approval_status are
        // treated as approved.
        // New registrations will be PENDING.
        // ------------------------------------------------------

        const approvalStatus =
            String(
                user.approval_status ||
                'APPROVED'
            ).toUpperCase();


        if (
            approvalStatus !==
            'APPROVED'
        ) {

            return res.status(403).json({
                success: false,
                message:
                    'User account is not approved',
            });

        }


        // ------------------------------------------------------
        // ATTACH USER
        // ------------------------------------------------------

        req.user = {

            userId:

                Number(
                    user.id
                ),

            id:

                Number(
                    user.id
                ),

            name:
                user.name,

            email:
                user.email,

            role:

                String(
                    user.role ||
                    'STAFF'
                ).toUpperCase(),

            isActive:

                Number(
                    user.is_active
                ) === 1,

            approvalStatus,

            emailVerified:

                user.email_verified === null ||
                user.email_verified === undefined
                    ? true
                    : Number(
                        user.email_verified
                    ) === 1,

        };


        next();

    } catch (error) {

        console.error(
            'Authentication middleware error:',
            error
        );


        return res.status(500).json({
            success: false,
            message:
                'Authentication check failed',
        });

    }
}


module.exports = {
    authenticateToken,
};