const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Resend } = require('resend');

const pool = require('../config/db');


const JWT_SECRET =
  process.env.JWT_SECRET ||
  'window-creators-secret-change-this';



// ============================================================
// EMAIL — BREVO
// ============================================================

const BREVO_API_URL =
  'https://api.brevo.com/v3/smtp/email';

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'WINCREA';

  if (!apiKey || !senderEmail) {
    throw new Error(
      'Brevo configuration missing. Check BREVO_API_KEY and BREVO_SENDER_EMAIL.'
    );
  }

  const response = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [
        {
          email: to,
        },
      ],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(20000),
  });

  const responseText = await response.text();

  let result = {};

  if (responseText) {
    try {
      result = JSON.parse(responseText);
    } catch {
      throw new Error(
        'Brevo returned an invalid response.'
      );
    }
  }

  if (!response.ok) {
    console.error('Brevo email error:', {
      statusCode: response.status,
      response: result,
    });

    throw new Error(
      `Brevo email failed (${response.status}): ${
        result.message || result.code || response.statusText
      }`
    );
  }

  console.log(
    'Brevo accepted email:',
    result.messageId || 'accepted'
  );

  return result;
}
// ============================================================
// HELPERS
// ============================================================

function normalizeEmail(
  email
) {
  return String(
    email || ''
  )
    .trim()
    .toLowerCase();
}


function clean(
  value
) {
  return String(
    value ?? ''
  ).trim();
}


function generateOtp() {

  return String(
    crypto.randomInt(
      100000,
      1000000
    )
  );
}


function hashOtp(
  otp
) {

  return crypto
    .createHash('sha256')
    .update(
      String(otp)
    )
    .digest('hex');
}


function getOtpExpiry() {

  return new Date(
    Date.now() +
    10 *
    60 *
    1000
  );
}

async function createOtp({
  email,
  userId = null,
  purpose,
}) {

  const otp =
    generateOtp();

  const otpHash =
    hashOtp(
      otp
    );

  const expiresAt =
    getOtpExpiry();


  // Invalidate old unused OTPs
  await pool.query(
    `
    UPDATE email_otps
    SET
      used_at = NOW()
    WHERE
      email = ?
      AND purpose = ?
      AND used_at IS NULL
    `,
    [
      email,
      purpose,
    ]
  );


  await pool.query(
    `
    INSERT INTO email_otps
      (
        user_id,
        email,
        otp_hash,
        purpose,
        expires_at
      )
    VALUES
      (?, ?, ?, ?, ?)
    `,
    [
      userId,
      email,
      otpHash,
      purpose,
      expiresAt,
    ]
  );


  return otp;
}


async function verifyOtp({
  email,
  otp,
  purpose,
}) {

  const [
    rows,
  ] =
    await pool.query(
      `
      SELECT
        id,
        user_id,
        otp_hash,
        expires_at,
        attempts,
        used_at
      FROM email_otps
      WHERE
        email = ?
        AND purpose = ?
        AND used_at IS NULL
      ORDER BY id DESC
      LIMIT 1
      `,
      [
        email,
        purpose,
      ]
    );


  if (
    rows.length === 0
  ) {

    throw new Error(
      'OTP not found or already used.'
    );
  }


  const record =
    rows[0];


  if (
    new Date(
      record.expires_at
    ).getTime() <
    Date.now()
  ) {

    throw new Error(
      'OTP has expired.'
    );
  }


  if (
    Number(
      record.attempts
    ) >= 5
  ) {

    throw new Error(
      'Too many incorrect OTP attempts.'
    );
  }


  const suppliedHash =
    hashOtp(
      otp
    );


  if (
    suppliedHash !==
    record.otp_hash
  ) {

    await pool.query(
      `
      UPDATE email_otps
      SET attempts = attempts + 1
      WHERE id = ?
      `,
      [
        record.id,
      ]
    );


    throw new Error(
      'Invalid OTP.'
    );
  }


  await pool.query(
    `
    UPDATE email_otps
    SET
      used_at = NOW()
    WHERE id = ?
    `,
    [
      record.id,
    ]
  );


  return record;
}


// ============================================================
// LOGIN
// ============================================================

async function login(
  req,
  res
) {

  try {

    const {
      email,
      password,
    } =
      req.body;


    const normalizedEmail =
      normalizeEmail(
        email
      );


    if (
      !normalizedEmail ||
      !password
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Email and password are required',

      });
    }


    const [
      rows,
    ] =
      await pool.query(
        `
        SELECT
          id,
          name,
          email,
          password_hash,
          role,
          is_active,
          approval_status,
          email_verified
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [
          normalizedEmail,
        ]
      );


    if (
      rows.length === 0
    ) {

      return res.status(
        401
      ).json({

        success:
          false,

        message:
          'Invalid email or password',

      });
    }


    const user =
      rows[0];


    // --------------------------------------------------------
    // EMAIL VERIFICATION
    // --------------------------------------------------------

    if (
      user.email_verified !== undefined &&
      !Number(
        user.email_verified
      )
    ) {

      return res.status(
        403
      ).json({

        success:
          false,

        code:
          'EMAIL_NOT_VERIFIED',

        message:
          'Please verify your email address first.',

      });
    }


    // --------------------------------------------------------
    // APPROVAL
    // --------------------------------------------------------

    const approvalStatus =
      String(
        user.approval_status ||
        'APPROVED'
      ).toUpperCase();


    if (
      approvalStatus ===
      'PENDING'
    ) {

      return res.status(
        403
      ).json({

        success:
          false,

        code:
          'PENDING_APPROVAL',

        message:
          'Your account is waiting for admin approval.',

      });
    }


    if (
      approvalStatus ===
      'REJECTED'
    ) {

      return res.status(
        403
      ).json({

        success:
          false,

        code:
          'ACCOUNT_REJECTED',

        message:
          'Your registration request was not approved.',

      });
    }


    // --------------------------------------------------------
    // ACTIVE
    // --------------------------------------------------------

    if (
      !Number(
        user.is_active
      )
    ) {

      return res.status(
        403
      ).json({

        success:
          false,

        message:
          'This user account is inactive',

      });
    }


    // --------------------------------------------------------
    // PASSWORD
    // --------------------------------------------------------

    const validPassword =
      await bcrypt.compare(
        password,
        user.password_hash
      );


    if (!validPassword) {

      return res.status(
        401
      ).json({

        success:
          false,

        message:
          'Invalid email or password',

      });
    }


    // --------------------------------------------------------
    // TOKEN
    // --------------------------------------------------------

    const token =
      jwt.sign(
        {
          userId:
            user.id,

          role:
            user.role,
        },
        JWT_SECRET,
        {
          expiresIn:
            '8h',
        }
      );


    // --------------------------------------------------------
    // RESPONSE
    // --------------------------------------------------------

    return res.json({

      success:
        true,

      token,

      user: {

        id:
          user.id,

        name:
          user.name,

        email:
          user.email,

        role:
          user.role,

        approvalStatus:
          approvalStatus,

      },

    });

  } catch (error) {

    console.error(
      'Login error:',
      error
    );


    return res.status(
      500
    ).json({

      success:
        false,

      message:
        'Login failed',

    });
  }
}


// ============================================================
// CURRENT USER
// ============================================================

async function me(
  req,
  res
) {

  try {

    const userId =
      req.user.userId;


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
          created_at,
          updated_at
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

      return res.status(
        404
      ).json({

        success:
          false,

        message:
          'User not found',

      });
    }


    const user =
      rows[0];


    if (
      !Number(
        user.is_active
      )
    ) {

      return res.status(
        403
      ).json({

        success:
          false,

        message:
          'User account is inactive',

      });
    }


    if (
      String(
        user.approval_status ||
        'APPROVED'
      ).toUpperCase() !==
      'APPROVED'
    ) {

      return res.status(
        403
      ).json({

        success:
          false,

        message:
          'User account is not approved.',

      });
    }


    return res.json({

      success:
        true,

      user,

    });

  } catch (error) {

    console.error(
      'Get current user error:',
      error
    );


    return res.status(
      500
    ).json({

      success:
        false,

      message:
        'Failed to fetch current user',

    });
  }
}


// ============================================================
// REGISTER
//
// Public endpoint.
//
// ALWAYS creates STAFF + PENDING.
// A public request can NEVER create ADMIN.
// ============================================================

async function register(
  req,
  res
) {

  try {

    const {
      name,
      email,
    } =
      req.body;


    const normalizedEmail =
      normalizeEmail(
        email
      );

    const cleanName =
      clean(
        name
      );


    if (
      !cleanName ||
      !normalizedEmail
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Name and Gmail address are required.',

      });
    }


    if (
      !normalizedEmail.endsWith(
        '@gmail.com'
      )
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Please use a Gmail address.',

      });
    }


    const [
      existingRows,
    ] =
      await pool.query(
        `
        SELECT
          id,
          approval_status,
          email_verified
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [
          normalizedEmail,
        ]
      );


    if (
      existingRows.length > 0
    ) {

      const existing =
        existingRows[0];


      const status =
        String(
          existing.approval_status ||
          ''
        ).toUpperCase();


      if (
        status ===
        'PENDING'
      ) {

        const otp =
          await createOtp({

            email:
              normalizedEmail,

            userId:
              existing.id,

            purpose:
              'REGISTRATION',

          });


        await sendEmail({

          to:
            normalizedEmail,

          subject:
            'WINCREA Email Verification OTP',

          html: `
            <h2>WINCREA Email Verification</h2>

            <p>Hello ${cleanName},</p>

            <p>
              Your verification OTP is:
            </p>

            <h1 style="letter-spacing:6px;">
              ${otp}
            </h1>

            <p>
              This OTP expires in 10 minutes.
            </p>
          `,

        });


        return res.json({

          success:
            true,

          code:
            'OTP_RESENT',

          message:
            'A new verification OTP has been sent to your Gmail.',

        });
      }


      return res.status(
        409
      ).json({

        success:
          false,

        message:
          'An account already exists with this email address.',

      });
    }


    // --------------------------------------------------------
    // GENERATE TEMPORARY PASSWORD HASH
    //
    // Password is set during registration completion.
    // --------------------------------------------------------

    const temporaryPassword =
      crypto
        .randomBytes(32)
        .toString('hex');


    const passwordHash =
      await bcrypt.hash(
        temporaryPassword,
        12
      );


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
            email_verified
          )
        VALUES
          (
            ?,
            ?,
            ?,
            'STAFF',
            TRUE,
            'PENDING',
            FALSE
          )
        `,
        [
          cleanName,
          normalizedEmail,
          passwordHash,
        ]
      );


    const userId =
      result.insertId;


    const otp =
      await createOtp({

        email:
          normalizedEmail,

        userId,

        purpose:
          'REGISTRATION',

      });


    await sendEmail({

      to:
        normalizedEmail,

      subject:
        'WINCREA Registration OTP',

      html: `
        <h2>WINCREA Registration</h2>

        <p>Hello ${cleanName},</p>

        <p>
          Use the following OTP to verify your Gmail address:
        </p>

        <h1 style="letter-spacing:6px;">
          ${otp}
        </h1>

        <p>
          This OTP expires in 10 minutes.
        </p>

        <p>
          After verification, your account will be sent
          to an administrator for approval.
        </p>
      `,

    });


    return res.status(
      201
    ).json({

      success:
        true,

      userId,

      code:
        'OTP_REQUIRED',

      message:
        'Registration started. Check your Gmail for the OTP.',

    });

  } catch (error) {

    console.error(
      'Registration error:',
      error
    );


    return res.status(
      500
    ).json({

      success:
        false,

      message:
        'Registration failed.',

    });
  }
}


// ============================================================
// COMPLETE REGISTRATION
// ============================================================

async function verifyRegistration(
  req,
  res
) {

  try {

    const {
      email,
      otp,
      password,
    } =
      req.body;


    const normalizedEmail =
      normalizeEmail(
        email
      );


    if (
      !normalizedEmail ||
      !otp ||
      !password
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Email, OTP and password are required.',

      });
    }


    if (
      password.length < 6
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Password must be at least 6 characters.',

      });
    }


    const otpRecord =
      await verifyOtp({

        email:
          normalizedEmail,

        otp:
          clean(
            otp
          ),

        purpose:
          'REGISTRATION',

      });


    const [
      rows,
    ] =
      await pool.query(
        `
        SELECT
          id,
          name,
          approval_status,
          email_verified
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [
          otpRecord.user_id,
        ]
      );


    if (
      rows.length === 0
    ) {

      throw new Error(
        'User account not found.'
      );
    }


    const user =
      rows[0];


    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );


    await pool.query(
      `
      UPDATE users
      SET
        password_hash = ?,
        email_verified = TRUE,
        approval_status = 'PENDING'
      WHERE id = ?
      `,
      [
        passwordHash,
        user.id,
      ]
    );


    return res.json({

      success:
        true,

      code:
        'PENDING_APPROVAL',

      message:
        'Email verified successfully. Your account is now waiting for admin approval.',

    });

  } catch (error) {

    console.error(
      'Registration verification error:',
      error
    );


    return res.status(
      400
    ).json({

      success:
        false,

      message:
        error.message ||
        'Registration verification failed.',

    });
  }
}


// ============================================================
// FORGOT PASSWORD
// ============================================================

async function forgotPassword(
  req,
  res
) {

  try {

    const email =
      normalizeEmail(
        req.body.email
      );


    if (!email) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Gmail address is required.',

      });
    }


    const [
      rows,
    ] =
      await pool.query(
        `
        SELECT
          id,
          name
        FROM users
        WHERE email = ?
        LIMIT 1
        `,
        [
          email,
        ]
      );


    // Don't reveal whether an account exists.
    if (
      rows.length === 0
    ) {

      return res.json({

        success:
          true,

        message:
          'If an account exists, a password-reset OTP has been sent.',

      });
    }


    const user =
      rows[0];


    const otp =
      await createOtp({

        email,

        userId:
          user.id,

        purpose:
          'PASSWORD_RESET',

      });


    await sendEmail({

      to:
        email,

      subject:
        'WINCREA Password Reset OTP',

      html: `
        <h2>WINCREA Password Reset</h2>

        <p>Hello ${user.name},</p>

        <p>
          Use the following OTP to reset your WINCREA password:
        </p>

        <h1 style="letter-spacing:6px;">
          ${otp}
        </h1>

        <p>
          This OTP expires in 10 minutes.
        </p>
      `,

    });


    return res.json({

      success:
        true,

      message:
        'If an account exists, a password-reset OTP has been sent.',

    });

  } catch (error) {

    console.error(
      'Forgot password error:',
      error
    );


    return res.status(
      500
    ).json({

      success:
        false,

      message:
        'Failed to process password reset.',

    });
  }
}


// ============================================================
// RESET PASSWORD
// ============================================================

async function resetPassword(
  req,
  res
) {

  try {

    const {
      email,
      otp,
      password,
    } =
      req.body;


    const normalizedEmail =
      normalizeEmail(
        email
      );


    if (
      !normalizedEmail ||
      !otp ||
      !password
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Email, OTP and new password are required.',

      });
    }


    if (
      password.length < 6
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Password must be at least 6 characters.',

      });
    }


    const otpRecord =
      await verifyOtp({

        email:
          normalizedEmail,

        otp:
          clean(
            otp
          ),

        purpose:
          'PASSWORD_RESET',

      });


    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );


    await pool.query(
      `
      UPDATE users
      SET
        password_hash = ?
      WHERE id = ?
        AND email = ?
      `,
      [
        passwordHash,
        otpRecord.user_id,
        normalizedEmail,
      ]
    );


    return res.json({

      success:
        true,

      message:
        'Password reset successfully. You can now log in.',

    });

  } catch (error) {

    console.error(
      'Reset password error:',
      error
    );


    return res.status(
      400
    ).json({

      success:
        false,

      message:
        error.message ||
        'Password reset failed.',

    });
  }
}


// ============================================================
// ADMIN APPROVE USER
// ============================================================

async function approveUser(
  req,
  res
) {

  try {

    const userId =
      Number(
        req.params.id
      );


    if (
      !Number.isInteger(
        userId
      ) ||
      userId <= 0
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Invalid user id.',

      });
    }


    // --------------------------------------------------------
    // GET USER
    // --------------------------------------------------------

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
          approval_status
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

      return res.status(
        404
      ).json({

        success:
          false,

        message:
          'User not found.',

      });
    }


    const user =
      rows[0];


    // --------------------------------------------------------
    // APPROVE
    // --------------------------------------------------------

    await pool.query(
      `
      UPDATE users
      SET
        approval_status = 'APPROVED',
        is_active = TRUE,
        approved_at = NOW(),
        approved_by = ?,
        rejection_reason = NULL
      WHERE id = ?
      `,
      [
        req.user.userId,
        userId,
      ]
    );


    // --------------------------------------------------------
    // EMAIL
    // --------------------------------------------------------

    await sendEmail({

      to:
        user.email,

      subject:
        'WINCREA Account Approved',

      html: `
        <h2>WINCREA Account Approved</h2>

        <p>Hello ${user.name},</p>

        <p>
          Your WINCREA account has been approved by the administrator.
        </p>

        <p>
          You can now log in using your registered Gmail address.
        </p>

        <p>
          Regards,<br/>
          WINCREA
        </p>
      `,

    });


    return res.json({

      success:
        true,

      message:
        'User approved successfully.',

    });

  } catch (error) {

    console.error(
      'Approve user error:',
      error
    );


    return res.status(
      500
    ).json({

      success:
        false,

      message:
        'Failed to approve user.',

    });
  }
}


// ============================================================
// ADMIN REJECT USER
// ============================================================

async function rejectUser(
  req,
  res
) {

  try {

    const userId =
      Number(
        req.params.id
      );


    const reason =
      clean(
        req.body.reason
      );


    if (
      !Number.isInteger(
        userId
      ) ||
      userId <= 0
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Invalid user id.',

      });
    }


    const [
      rows,
    ] =
      await pool.query(
        `
        SELECT
          id,
          name,
          email
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

      return res.status(
        404
      ).json({

        success:
          false,

        message:
          'User not found.',

      });
    }


    const user =
      rows[0];


    await pool.query(
      `
      UPDATE users
      SET
        approval_status = 'REJECTED',
        is_active = FALSE,
        rejection_reason = ?,
        approved_at = NULL,
        approved_by = NULL
      WHERE id = ?
      `,
      [
        reason ||
          null,
        userId,
      ]
    );


    await sendEmail({

      to:
        user.email,

      subject:
        'WINCREA Registration Request',

      html: `
        <h2>WINCREA Registration Request</h2>

        <p>Hello ${user.name},</p>

        <p>
          Your request to join WINCREA was not approved.
        </p>

        ${
          reason
            ? `
              <p>
                <strong>Reason:</strong>
                ${reason}
              </p>
            `
            : ''
        }

        <p>
          Please contact the administrator if you believe this was a mistake.
        </p>
      `,

    });


    return res.json({

      success:
        true,

      message:
        'User rejected successfully.',

    });

  } catch (error) {

    console.error(
      'Reject user error:',
      error
    );


    return res.status(
      500
    ).json({

      success:
        false,

      message:
        'Failed to reject user.',

    });
  }
}


// ============================================================
// ADMIN CHANGE ROLE
//
// Public registration cannot use this.
// Only authenticated Admin should be allowed.
// ============================================================

async function changeUserRole(
  req,
  res
) {

  try {

    const userId =
      Number(
        req.params.id
      );


    const role =
      clean(
        req.body.role
      ).toUpperCase();


    if (
      !Number.isInteger(
        userId
      ) ||
      userId <= 0
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Invalid user id.',

      });
    }


    if (
      role !== 'ADMIN' &&
      role !== 'STAFF'
    ) {

      return res.status(
        400
      ).json({

        success:
          false,

        message:
          'Role must be ADMIN or STAFF.',

      });
    }


    // --------------------------------------------------------
    // Prevent removing the last admin
    // --------------------------------------------------------

    const [
      targetRows,
    ] =
      await pool.query(
        `
        SELECT
          id,
          name,
          role
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [
          userId,
        ]
      );


    if (
      targetRows.length === 0
    ) {

      return res.status(
        404
      ).json({

        success:
          false,

        message:
          'User not found.',

      });
    }


    const target =
      targetRows[0];


    if (
      target.role === 'ADMIN' &&
      role === 'STAFF'
    ) {

      const [
        adminRows,
      ] =
        await pool.query(
          `
          SELECT COUNT(*) AS count
          FROM users
          WHERE
            role = 'ADMIN'
            AND is_active = TRUE
            AND approval_status = 'APPROVED'
          `
        );


      if (
        Number(
          adminRows[0].count
        ) <= 1
      ) {

        return res.status(
          400
        ).json({

          success:
            false,

          message:
            'The last active Admin cannot be demoted.',

        });
      }
    }


    await pool.query(
      `
      UPDATE users
      SET role = ?
      WHERE id = ?
      `,
      [
        role,
        userId,
      ]
    );


    return res.json({

      success:
        true,

      message:
        `User role changed to ${role}.`,

    });

  } catch (error) {

    console.error(
      'Change user role error:',
      error
    );


    return res.status(
      500
    ).json({

      success:
        false,

      message:
        'Failed to change user role.',

    });
  }
}


// ============================================================
// EXPORTS
// ============================================================

module.exports = {

  login,

  me,

  register,

  verifyRegistration,

  forgotPassword,

  resetPassword,

  approveUser,

  rejectUser,

  changeUserRole,

};