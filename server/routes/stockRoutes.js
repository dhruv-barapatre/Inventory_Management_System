const express = require('express');
const router = express.Router();
const { adjustStock, getAuditLogs } = require('../controllers/stockController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/adjust', adjustStock);
router.get('/history', getAuditLogs);

module.exports = router;
