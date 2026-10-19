/**
 * Sentiment Analysis Engine for Indonesian & English Social Listening Data
 * Specifically optimized for consumer jewelry, gold trading, Google Reviews, and customer service context.
 */

const NEGATIVE_PHRASES = [
  // Pelayanan & Sikap
  'tidak ramah', 'kurang ramah', 'gak ramah', 'ga ramah', 'nggak ramah',
  'tidak sopan', 'kurang sopan', 'gak sopan', 'tidak profesional', 'kurang profesional', 'gak profesional',
  'tidak transparan', 'kurang transparan', 'gak transparan', 'tidak jujur',
  'tidak sesuai', 'gak sesuai', 'kurang memuaskan', 'tidak memuaskan',
  'antri lama', 'nunggu lama', 'lama banget', 'lambat banget', 'pelayanan buruk',
  'pelayanan lama', 'pelayanan jelek', 'pelayanan lambat', 'pelayanan mengecewakan',

  // Harga & Transaksi Emas
  'potongan besar', 'potongan sadis', 'potongan gila', 'potongannya gila', 'potongan tinggi', 'potongannya sadis',
  'potongan gede', 'potongan banyak', 'turun drastis', 'kadar turun', 'kadarnya turun', 'dihargai rendah',
  'jatuh banget', 'harga anjlok', 'harga jatuh', 'jauh dibawah pasaran', 'murah banget', 'dihargai murah',
  'kadar rendah', 'dibilang rendah', 'dibilang palsu', 'timbangan curang', 'timbangan beda', 'timbangan gak sesuai',

  // Kekecewaan & Rating
  'kecewa berat', 'sangat kecewa', 'kecewa sekali', 'kapok', 'kapok jual', 'jangan kesini', 'jangan jual kesini',
  'bintang 1', 'bintang satu', 'bintang 2', 'bintang dua', 'rating jelek', 'rugi besar', 'rugi parah',
  'tipu-tipu', 'parah banget', 'parah abis'
];

const NEGATIVE_WORDS = [
  'penipuan', 'tipu', 'palsu', 'kecewa', 'lambat', 'rugi', 'mahal', 'buruk', 'jelek',
  'parah', 'bohong', 'hilang', 'rusak', 'curang', 'marah', 'kasar', 'scam', 'waspada',
  'hati-hati', 'mengecewakan', 'payah', 'menyesal', 'bodong', 'jutek', 'judes', 'ketus',
  'zonk', 'ngawur', 'ancur', 'hancur', 'cuek', 'berbelit', 'sadis', 'galak', 'licik',
  // English
  'fake', 'scam', 'fraud', 'bad', 'worst', 'slow', 'loss', 'expensive', 'terrible',
  'disappointed', 'disappointing', 'rude', 'cheat', 'beware', 'warning', 'poor'
];

const POSITIVE_PHRASES = [
  'sangat puas', 'sangat ramah', 'sangat bagus', 'sangat cepat', 'timbangan akurat',
  'potongan transparan', 'pelayanan ramah', 'pelayanan cepat', 'harga tinggi',
  'harga bersaing', 'harga terbaik', 'harga tertinggi', 'rekomendasi banget',
  'recommended banget', 'bintang 5', 'bintang lima'
];

const POSITIVE_WORDS = [
  'bagus', 'terpercaya', 'amanah', 'puas', 'cepat', 'ramah', 'mantap', 'rekomendasi', 
  'terbaik', 'resmi', 'asli', 'untung', 'akurat', 'suka', 'keren', 'profesional',
  'mudah', 'senang', 'terbantu', 'juara', 'nyaman', 'memuaskan', 'bersaing', 'transparan',
  'jempol', 'mantul', 'hebat', 'berkah',
  // English
  'good', 'great', 'best', 'trust', 'trusted', 'fast', 'friendly', 'recommend',
  'recommended', 'legit', 'authentic', 'profit', 'love', 'satisfied', 'excellent',
  'amazing', 'helpful', 'reliable', 'transparent'
];

const NEGATIONS = ['tidak', 'bukan', 'kurang', 'gak', 'ga', 'nggak', 'tak', 'jangan'];

/**
 * Analyzes text sentiment with phrase matching and negation detection
 * @param {string} text 
 * @param {number|null} rating optional star rating (1 to 5)
 */
function analyzeSentiment(text, rating = null) {
  // If star rating is explicitly provided (e.g. from Google Reviews)
  if (rating !== null && rating !== undefined) {
    const numRating = Number(rating);
    if (numRating <= 2) {
      return { score: -0.85, label: 'negative', positiveHits: [], negativeHits: [`rating_${numRating}_star`] };
    }
    if (numRating === 3) {
      return { score: 0.0, label: 'neutral', positiveHits: [], negativeHits: [] };
    }
    if (numRating >= 4 && (!text || text.length < 5)) {
      return { score: 0.85, label: 'positive', positiveHits: [`rating_${numRating}_star`], negativeHits: [] };
    }
  }

  if (!text || typeof text !== 'string') {
    return { score: 0.0, label: 'neutral', positiveHits: [], negativeHits: [] };
  }

  const cleanText = text.toLowerCase();
  const positiveHits = [];
  const negativeHits = [];

  // 1. Check multi-word negative & positive phrases
  for (const phrase of NEGATIVE_PHRASES) {
    if (cleanText.includes(phrase)) {
      negativeHits.push(phrase);
    }
  }

  for (const phrase of POSITIVE_PHRASES) {
    if (cleanText.includes(phrase)) {
      positiveHits.push(phrase);
    }
  }

  // 2. Tokenize words with negation window
  const words = cleanText.replace(/[^\w\s]/gi, ' ').split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const prev = i > 0 ? words[i - 1] : '';
    const isNegated = NEGATIONS.includes(prev);

    if (POSITIVE_WORDS.includes(w)) {
      if (isNegated) {
        negativeHits.push(`${prev} ${w}`);
      } else {
        // Only count if not already in a negative phrase
        if (!negativeHits.some(p => p.includes(w))) {
          positiveHits.push(w);
        }
      }
    } else if (NEGATIVE_WORDS.includes(w)) {
      if (!isNegated) {
        // Exception: 'surat hilang' / 'suratnya hilang' is a buyback category inquiry, not a negative complaint
        if (w === 'hilang' && (cleanText.includes('surat hilang') || cleanText.includes('suratnya hilang') || cleanText.includes('tanpa surat'))) {
          // Do not treat as negative
        } else if (!negativeHits.some(p => p.includes(w))) {
          negativeHits.push(w);
        }
      }
    }
  }

  const posCount = positiveHits.length;
  const negCount = negativeHits.length;
  const total = posCount + negCount;

  let score = 0.0;
  let label = 'neutral';

  if (total > 0) {
    score = (posCount - negCount) / total;
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
