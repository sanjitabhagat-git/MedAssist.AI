const express = require('express');
const { analyzeSymptoms, chatSupport } = require('../controllers/aiController');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/analyze', requireRole('patient'), analyzeSymptoms);
router.post('/chat', requireRole('patient'), chatSupport);

module.exports = router;
