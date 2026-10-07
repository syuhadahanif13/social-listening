/**
 * Social Listening Orchestration Service
 * Coordinates data gathering, sentiment scoring, and database storage.
 */

const { getPool, isDbConnected } = require('../config/database');
const { fetchTrendsFromApify, generateNormalizedTrendData } = require('./apifyService');
const { analyzeSentiment } = require('./sentimentService');

// In-memory cache fallback for development or local inspection
let inMemoryMentions = [];
let inMemoryTrends = [];
let inMemoryJobs = [];

/**
 * Executes a full listening cycle for a brand
 */
async function executeListeningCycle(brandName = 'Raja Emas Indonesia', triggerNewRun = false) {
  console.log(`[ListeningService] Starting listening cycle for '${brandName}' (triggerNewRun: ${triggerNewRun})...`);
  const pool = isDbConnected() ? getPool() : null;

  let jobId = null;
  if (pool) {
    try {
      const [result] = await pool.query(
        `INSERT INTO listening_jobs (job_type, status) VALUES ('manual', 'running')`
      );
      jobId = result.insertId;
    } catch (e) {
      console.warn('[ListeningService] Could not log job start to DB:', e.message);
    }
  }

  try {
    // 1. Fetch data via Apify
    const trendResult = await fetchTrendsFromApify(brandName, '7D', triggerNewRun);
    const mentions = trendResult.mentions || [];
    const trends = trendResult.trends || [];

    // 2. Sentiment Scoring (respect Apify's sentiment, fallback to lexicon if missing)
    const processedMentions = mentions.map(item => {
      let label = item.sentiment_label;
      let score = item.sentiment_score;

      if (!label || label === 'unknown') {
        const analyzed = analyzeSentiment(item.content);
        label = analyzed.label;
        score = analyzed.score;
      }

      return {
        ...item,
        sentiment_label: label,
        sentiment_score: score !== undefined ? score : 0.0,
        brand_id: 1
      };
    });

    // 3. Save to MySQL or In-memory
    let savedMentions = 0;
    let savedTrends = 0;

    if (pool) {
      // Save Mentions
      for (const m of processedMentions) {
        try {
          await pool.query(
            `INSERT INTO social_mentions 
             (brand_id, platform, post_id, author, title, content, url, sentiment_label, sentiment_score, 
              engagement_likes, engagement_comments, engagement_shares, engagement_views, published_at, raw_data)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
               sentiment_label = VALUES(sentiment_label),
               sentiment_score = VALUES(sentiment_score),
               engagement_likes = VALUES(engagement_likes),
               engagement_comments = VALUES(engagement_comments),
               engagement_shares = VALUES(engagement_shares),
               engagement_views = VALUES(engagement_views)`,
            [
              m.brand_id,
              m.platform,
              m.post_id,
              m.author,
              m.title,
              m.content,
              m.url,
              m.sentiment_label,
              m.sentiment_score,
              m.engagement_likes || 0,
              m.engagement_comments || 0,
              m.engagement_shares || 0,
              m.engagement_views || 0,
              m.published_at ? new Date(m.published_at) : new Date(),
              JSON.stringify(m)
            ]
          );
          savedMentions++;
        } catch (dbErr) {
          console.warn('[ListeningService] Error inserting mention:', dbErr.message);
        }
      }

      // Save Trends
      const today = new Date().toISOString().slice(0, 10);
      for (const t of trends) {
        try {
          await pool.query(
            `INSERT INTO trend_metrics (brand_id, keyword, source, normalized_score, growth_pct, period, snapshot_date)
             VALUES (?, ?, ?, ?, ?, '7D', ?)`,
            [1, brandName, t.source, t.score, t.growth, today]
          );
          savedTrends++;
        } catch (dbErr) {
          console.warn('[ListeningService] Error inserting trend metric:', dbErr.message);
        }
      }

      // Update Job status
      if (jobId) {
        await pool.query(
          `UPDATE listening_jobs 
           SET status = 'completed', mentions_collected = ?, trends_collected = ?, completed_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [savedMentions, savedTrends, jobId]
        );
      }
    } else {
      // Memory update
      inMemoryMentions = [...processedMentions, ...inMemoryMentions].slice(0, 50);
      inMemoryTrends = trends;
      savedMentions = processedMentions.length;
      savedTrends = trends.length;
      inMemoryJobs.unshift({
        id: Date.now(),
        status: 'completed',
        mentions_collected: savedMentions,
        trends_collected: savedTrends,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      });
    }

    console.log(`[ListeningService] Listening cycle finished. Mentions: ${savedMentions}, Trends: ${savedTrends}`);
    return {
      success: true,
      mentions_collected: savedMentions,
      trends_collected: savedTrends,
      data: {
        mentions: processedMentions,
        trends
      }
    };
  } catch (error) {
    console.error('[ListeningService] Listening cycle error:', error.message);
    if (pool && jobId) {
      await pool.query(
        `UPDATE listening_jobs SET status = 'failed', error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [error.message, jobId]
      );
    }
    throw error;
  }
}

/**
 * Retrieves social mentions with filtering
 */
async function getMentions({ platform, sentiment, search, limit = 20, offset = 0 } = {}) {
  const pool = isDbConnected() ? getPool() : null;

  if (pool) {
    let sql = `SELECT * FROM social_mentions WHERE 1=1`;
    const params = [];

    if (platform && platform !== 'all') {
      sql += ` AND platform = ?`;
      params.push(platform);
    }
    if (sentiment && sentiment !== 'all') {
      sql += ` AND sentiment_label = ?`;
      params.push(sentiment);
    }
    if (search) {
      sql += ` AND (content LIKE ? OR author LIKE ? OR title LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ` ORDER BY published_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await pool.query(sql, params);
    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM social_mentions`);

    return {
      total: countResult[0]?.total || rows.length,
      items: rows
    };
  }

  // Memory fallback
  let items = [...inMemoryMentions];
  if (items.length === 0) {
    const sample = generateNormalizedTrendData('Raja Emas Indonesia');
    items = sample.mentions.map(m => ({
      ...m,
      ...analyzeSentiment(m.content),
      brand_id: 1
    }));
    inMemoryMentions = items;
  }

  if (platform && platform !== 'all') items = items.filter(i => i.platform === platform);
  if (sentiment && sentiment !== 'all') items = items.filter(i => i.sentiment_label === sentiment);
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(i => 
      (i.content && i.content.toLowerCase().includes(s)) ||
      (i.author && i.author.toLowerCase().includes(s)) ||
      (i.title && i.title.toLowerCase().includes(s))
    );
  }

  return {
    total: items.length,
    items: items.slice(offset, offset + limit)
  };
}

/**
 * Retrieves current trend metrics
 */
async function getTrends() {
  const pool = isDbConnected() ? getPool() : null;

  if (pool) {
    const [rows] = await pool.query(
      `SELECT source, normalized_score, growth_pct, snapshot_date 
       FROM trend_metrics 
       ORDER BY snapshot_date DESC, normalized_score DESC 
       LIMIT 10`
    );
    if (rows.length > 0) return rows;
  }

  if (inMemoryTrends.length > 0) return inMemoryTrends;
  const sample = generateNormalizedTrendData('Raja Emas Indonesia');
  inMemoryTrends = sample.trends;
  return inMemoryTrends;
}

/**
 * Retrieves sentiment breakdown summary
 */
async function getSentimentStats() {
  const pool = isDbConnected() ? getPool() : null;

  if (pool) {
    const [rows] = await pool.query(
      `SELECT sentiment_label, COUNT(*) as count, AVG(sentiment_score) as avg_score
       FROM social_mentions
       GROUP BY sentiment_label`
    );

    let positive = 0;
    let neutral = 0;
    let negative = 0;

    for (const r of rows) {
      if (r.sentiment_label === 'positive') positive = parseInt(r.count, 10);
      if (r.sentiment_label === 'neutral') neutral = parseInt(r.count, 10);
      if (r.sentiment_label === 'negative') negative = parseInt(r.count, 10);
    }

    const total = positive + neutral + negative;
    return {
      total,
      positive,
      neutral,
      negative,
      positive_pct: total ? Math.round((positive / total) * 100) : 0,
      neutral_pct: total ? Math.round((neutral / total) * 100) : 0,
      negative_pct: total ? Math.round((negative / total) * 100) : 0
    };
  }

  // Memory calculation
  const mentions = inMemoryMentions.length > 0 ? inMemoryMentions : (await getMentions()).items;
  let positive = 0, neutral = 0, negative = 0;
  for (const m of mentions) {
    if (m.sentiment_label === 'positive') positive++;
    else if (m.sentiment_label === 'negative') negative++;
    else neutral++;
  }
  const total = positive + neutral + negative;
  return {
    total,
    positive,
    neutral,
    negative,
    positive_pct: total ? Math.round((positive / total) * 100) : 0,
    neutral_pct: total ? Math.round((neutral / total) * 100) : 0,
    negative_pct: total ? Math.round((negative / total) * 100) : 0
  };
}

/**
 * Retrieves past listening execution jobs
 */
async function getListeningHistory() {
  const pool = isDbConnected() ? getPool() : null;
  if (pool) {
    const [rows] = await pool.query(
      `SELECT * FROM listening_jobs ORDER BY started_at DESC LIMIT 10`
    );
    return rows;
  }
  return inMemoryJobs;
}

module.exports = {
  executeListeningCycle,
  getMentions,
  getTrends,
  getSentimentStats,
  getListeningHistory
};
