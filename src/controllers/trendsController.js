const listeningService = require('../services/listeningService');

async function getTrends(req, res) {
  try {
    const { timeRange, period } = req.query;
    const trends = await listeningService.getTrends(timeRange || period || '7d');
    return res.json({
      success: true,
      trends
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getTrends
};
