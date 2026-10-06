const express = require('express');

const router =
  express.Router();


const {
  login,

  me,

  register,

  verifyRegistration,

  forgotPassword,

  resetPassword,

  approveUser,

  rejectUser,

  changeUserRole,

} = require('../controllers/authController');


const {
  authenticateToken,
} = require('../middleware/authMiddleware');


const {
  requireAdmin,
} = require('../middleware/adminMiddleware');


// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

router.post(
  '/login',
  login
);


// ============================================================
// REGISTRATION
// ============================================================

router.post(
  '/register',
  register
);


router.post(
  '/register/verify',
  verifyRegistration
);


// ============================================================
// PASSWORD RESET
// ============================================================

router.post(
  '/forgot-password',
  forgotPassword
);


router.post(
  '/reset-password',
  resetPassword
);


// ============================================================
// AUTHENTICATED ROUTES
// ============================================================

router.get(
  '/me',
  authenticateToken,
  me
);


// ============================================================
// ADMIN ONLY ROUTES
// ============================================================

// Approve a pending user
router.patch(
  '/users/:id/approve',
  authenticateToken,
  requireAdmin,
  approveUser
);


// Reject a pending user
router.patch(
  '/users/:id/reject',
  authenticateToken,
  requireAdmin,
  rejectUser
);


// Change STAFF <-> ADMIN
router.patch(
  '/users/:id/role',
  authenticateToken,
  requireAdmin,
  changeUserRole
);


module.exports =
  router;