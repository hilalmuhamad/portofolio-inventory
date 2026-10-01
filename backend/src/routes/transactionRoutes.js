const express = require('express');

const {
  createTransaction,
  getTransactions,
  getTransactionById,
} = require('../controllers/transactionController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.post('/', createTransaction);
router.get('/', getTransactions);
router.get('/:id', getTransactionById);

module.exports = router;
