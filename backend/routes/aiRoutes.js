const express = require('express');
const router = express.Router();
const { generateSummary, generateTitle } = require('../controllers/aiController');
const { protectRoutes } = require('../middleware/authMiddleware');

router.post('/generate-summary', protectRoutes, generateSummary);
router.post('/generate-title', protectRoutes, generateTitle);



module.exports = router;