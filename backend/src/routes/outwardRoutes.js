const express = require('express');

const router = express.Router();

const {
  createOutwardDraft,
} = require('../controllers/outwardController');


// ============================================================
// CREATE OUTWARD DRAFT
//
// POST /api/outward
//
// Creates a DRAFT PI only.
// Stock is NOT deducted here.
// ============================================================

router.post(
  '/',
  createOutwardDraft
);


module.exports = router;