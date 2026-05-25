const express = require('express');
const { analyzeSymptoms, chatSupport } = require('../controllers/aiController');

const router = express.Router();

router.post('/analyze', analyzeSymptoms);
router.post('/chat', chatSupport);

module.exports = router;
