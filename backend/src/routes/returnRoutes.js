const express = require('express');

const router = express.Router();

const {
  returnRoll,
} = require('../controllers/returnController');

router.post(
  '/',
  returnRoll
);

module.exports = router;