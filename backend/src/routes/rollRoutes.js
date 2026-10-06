const express = require('express');

const router = express.Router();

const {
    getRolls,
    getRollsByProduct,
    createRoll
} = require('../controllers/rollController');


// GET all rolls
router.get('/', getRolls);


// GET rolls belonging to one product
router.get('/product/:productId', getRollsByProduct);


// CREATE a roll
router.post('/', createRoll);


module.exports = router;