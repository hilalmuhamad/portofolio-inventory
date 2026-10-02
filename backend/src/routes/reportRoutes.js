const express = require('express');

const { getReport, exportCsv } = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/transactions', getReport);
router.get('/transactions/export', exportCsv);

module.exports = router;
