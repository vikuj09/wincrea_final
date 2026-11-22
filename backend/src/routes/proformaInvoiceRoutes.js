const express = require('express');

const router =
  express.Router();

const {
  getProformaInvoices,
  getProformaInvoiceById,
  createProformaInvoice,
  confirmProformaInvoice,
  cancelProformaInvoice,
  updateProformaInvoiceRates,
} =
  require('../controllers/proformaInvoiceController');

const { authenticateToken } = require('../middleware/authMiddleware');
router.patch('/:id/rates', authenticateToken, updateProformaInvoiceRates);


router.get(
  '/',
  getProformaInvoices
);


router.get(
  '/:id',
  getProformaInvoiceById
);


router.post(
  '/',
  createProformaInvoice
);


router.post(
  '/:id/confirm',
  confirmProformaInvoice
);


router.put(
  '/:id/cancel',
  cancelProformaInvoice
);


module.exports =
  router;
