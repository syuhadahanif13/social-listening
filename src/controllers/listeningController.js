const listeningService = require('../services/listeningService');

async function triggerListening(req, res) {
  try {
    const brand = req.body.brand || process.env.BRAND_NAME || 'Raja Emas Indonesia';
    const result = await listeningService.executeListeningCycle(brand, true);
    return res.json({
      success: true,
      message: `Listening cycle completed successfully for ${brand}`,
      result
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to run listening cycle',
      error: error.message
    });
  }
}

async function getHistory(req, res) {
  try {
    const history = await listeningService.getListeningHistory();
    return res.json({
      success: true,
      history
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  triggerListening,
  getHistory
};
