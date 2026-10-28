const express = require('express');
const { createAccount, getBalance } = require('../controllers/accountController');
const { addTransaction, getTransactions } = require('../controllers/transactionController');

const router = express.Router();

router.post('/', createAccount);
router.get('/:id/balance', getBalance);
router.post('/:id/transactions', addTransaction);
router.get('/:id/transactions', getTransactions);

module.exports = router;
