/**
 * Sentiment Analysis Engine for Indonesian & English Social Listening Data
 * Specifically optimized for consumer jewelry, gold trading, and customer service context.
 */

const POSITIVE_TERMS = [
  // Indonesian
  'bagus', 'terpercaya', 'amanah', 'puas', 'cepat', 'ramah', 'mantap', 'rekomendasi', 
  'terbaik', 'resmi', 'asli', 'murah', 'untung', 'tinggi', 'akurat', 'suka', 'keren', 
  'top', 'profesional', 'mudah', 'senang', 'terbantu', 'juara', 'nyaman', 'memuaskan',
  'bersaing', 'transparan', 'jempol', 'ok', 'oke', 'mantul', 'hebat', 'berkah',
  // English
  'good', 'great', 'best', 'trust', 'trusted', 'fast', 'friendly', 'recommend',
  'recommended', 'legit', 'authentic', 'profit', 'love', 'satisfied', 'excellent',
  'amazing', 'helpful', 'reliable', 'transparent'
];

const NEGATIVE_TERMS = [
  // Indonesian
  'penipuan', 'tipu', 'palsu', 'kecewa', 'lambat', 'rugi', 'mahal', 'buruk', 'jelek',
  'parah', 'bohong', 'rugi', 'hilang', 'rusak', 'kapok', 'potongan besar', 'curang',
  'marah', 'salah', 'tidak ramah', 'kasar', 'scam', 'waspada', 'hati-hati', 'mengecewakan',
  'payah', 'menyesal', 'bodong', 'rugi besar',
  // English
  'fake', 'scam', 'fraud', 'bad', 'worst', 'slow', 'loss', 'expensive', 'terrible',
  'disappointed', 'disappointing', 'rude', 'cheat', 'beware', 'warning', 'poor'
];

function analyzeSentiment(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0.0, label: 'neutral', positiveHits: [], negativeHits: [] };
  }

  const cleanText = text.toLowerCase();
  const words = cleanText.replace(/[^\w\s]/gi, ' ').split(/\s+/);

  const positiveHits = [];
  const negativeHits = [];

  for (const term of POSITIVE_TERMS) {
    if (term.includes(' ')) {
      if (cleanText.includes(term)) positiveHits.push(term);
    } else if (words.includes(term)) {
      positiveHits.push(term);
    }
  }

  for (const term of NEGATIVE_TERMS) {
    if (term.includes(' ')) {
      if (cleanText.includes(term)) negativeHits.push(term);
    } else if (words.includes(term)) {
      negativeHits.push(term);
    }
  }

  const posCount = positiveHits.length;
  const negCount = negativeHits.length;
  const total = posCount + negCount;

  let score = 0.0;
  let label = 'neutral';

  if (total > 0) {
    score = (posCount - negCount) / total; // between -1.0 and 1.0
    if (score > 0.15) {
      label = 'positive';
    } else if (score < -0.15) {
      label = 'negative';
    } else {
      label = 'neutral';
    }
  }

  return {
    score: parseFloat(score.toFixed(4)),
    label,
    positiveHits,
    negativeHits
  };
}

module.exports = {
  analyzeSentiment
};
