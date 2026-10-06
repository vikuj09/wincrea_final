const express = require('express');

const router = express.Router();

const {
    getTransactions,
    getTransactionById
} = require('../controllers/transactionController');

router.get(
    '/',
    getTransactions
);

router.get(
    '/:id',
    getTransactionById
);

module.exports = router;