const express = require('express');

const router = express.Router();
const { authenticateToken } = require('../middleware/authMiddleware');

const {
    createShareLink,
    getSharedData,
    disableShareLink,
    getMyShareLinks,
} = require('../controllers/shareController');


// ============================================================
// AUTHENTICATED SHARE MANAGEMENT
// ============================================================

// Create a share link
router.post(
    '/',
    authenticateToken,
    createShareLink
);

// Get links created by the logged-in user
router.get(
    '/mine',
    authenticateToken,
    getMyShareLinks
);

// Disable an existing share link
router.delete(
    '/:id',
    authenticateToken,
    disableShareLink
);


// ============================================================
// PUBLIC SHARED DATA
// ============================================================

// IMPORTANT:
// This route should NOT use the normal authentication middleware.
router.get(
    '/public/:token',
    getSharedData
);


module.exports = router;