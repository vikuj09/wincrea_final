const express = require('express');

const router = express.Router();

const {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrderStatus,
  receivePurchaseOrder,
} = require('../controllers/purchaseOrderController');


router.get('/', getPurchaseOrders);

router.get('/:id', getPurchaseOrderById);

router.post('/', createPurchaseOrder);

router.put('/:id/status', updatePurchaseOrderStatus);

router.post('/:id/receive', receivePurchaseOrder);


module.exports = router;