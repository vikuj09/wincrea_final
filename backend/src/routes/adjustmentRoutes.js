const express = require('express');

const router = express.Router();

const {
  createAdjustment,
  getAdjustments,
  getAdjustmentById,
} = require('../controllers/adjustmentController');

router.get('/', getAdjustments);

router.get('/:id', getAdjustmentById);

router.post('/', createAdjustment);

module.exports = router;