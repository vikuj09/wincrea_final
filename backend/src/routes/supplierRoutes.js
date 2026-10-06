const express = require('express');

const router = express.Router();

const {
    getSuppliers,
    createSupplier,
    updateSupplier,
    deleteSupplier,
} = require('../controllers/supplierController');


router.get(
    '/',
    getSuppliers
);


router.post(
    '/',
    createSupplier
);


router.put(
    '/:id',
    updateSupplier
);


router.delete(
    '/:id',
    deleteSupplier
);


module.exports = router;