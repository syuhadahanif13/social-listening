const listeningService = require('../services/listeningService');

async function getMentions(req, res) {
  try {
    const { platform, sentiment, search, timeRange, period, limit, offset } = req.query;
    const data = await listeningService.getMentions({
      platform,
      sentiment,
      search,
      timeRange: timeRange || period || '7d',
      limit: limit ? parseInt(limit, 10) : 20,
      offset: offset ? parseInt(offset, 10) : 0
    });

    return res.json({
      success: true,
      ...data
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

async function getSentimentStats(req, res) {
  try {
    const { timeRange, period } = req.query;
    const stats = await listeningService.getSentimentStats(timeRange || period || '7d');
    return res.json({
      success: true,
      stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  getMentions,
  getSentimentStats
};
