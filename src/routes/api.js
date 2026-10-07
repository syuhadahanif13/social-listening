const express = require('express');
const router = express.Router();

const { isDbConnected, poolConfig } = require('../config/database');
const listeningController = require('../controllers/listeningController');
const mentionsController = require('../controllers/mentionsController');
const trendsController = require('../controllers/trendsController');

// Health and System Status
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Raja Emas Indonesia - Social Listening API',
    database: {
      connected: isDbConnected(),
      host: poolConfig.host,
      database: poolConfig.database
    },
    apify: {
      actor: process.env.APIFY_ACTOR || 'trendsmcp/social-listening-mcp',
      configured: Boolean(process.env.APIFY_TOKEN)
    },
    brand: process.env.BRAND_NAME || 'Raja Emas Indonesia'
  });
});

// Brand information
router.get('/brands', (req, res) => {
  res.json({
    success: true,
    brands: [
      {
        id: 1,
        name: process.env.BRAND_NAME || 'Raja Emas Indonesia',
        keywords: (process.env.BRAND_KEYWORDS || '').split(',').map(k => k.trim())
      }
    ]
  });
});

// Social Mentions & Sentiment
router.get('/mentions', mentionsController.getMentions);
router.get('/sentiment/stats', mentionsController.getSentimentStats);

// Trends & Normalization
router.get('/trends', trendsController.getTrends);

// Listening Jobs
router.post('/listening/trigger', listeningController.triggerListening);
router.get('/listening/history', listeningController.getHistory);

module.exports = router;
