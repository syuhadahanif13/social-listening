const listeningService = require('../services/listeningService');

async function getTrends(req, res) {
  try {
    const trends = await listeningService.getTrends();
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
