const express = require('express');

const router = express.Router();

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
    createShareLink
);

// Get links created by the logged-in user
router.get(
    '/mine',
    getMyShareLinks
);

// Disable an existing share link
router.delete(
    '/:id',
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