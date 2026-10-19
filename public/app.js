let searchTimeout = null;

// Determine backend API URL (direct when on api.rajaemas.id, or remote when hosted on Vercel)
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === 'api.rajaemas.id')
  ? ''
  : 'https://api.rajaemas.id';

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
});

async function initDashboard() {
  await Promise.all([
    checkHealth(),
    loadTrends(),
    loadSentimentStats(),
    loadMentions()
  ]);
}

async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const data = await res.json();
    const badge = document.getElementById('db-status-badge');

    if (badge) {
      if (data.database && data.database.connected) {
        badge.className = 'badge badge-connected';
        badge.innerHTML = '<span class="status-dot">●</span> DB: Connected';
      } else {
        badge.className = 'badge badge-info';
        badge.innerHTML = '<span class="status-dot">●</span> Engine: Hybrid Mode';
      }
    }

    const actorBadge = document.getElementById('actor-badge');
    if (actorBadge && data.apify && data.apify.actor) {
      actorBadge.innerText = `Apify: ${data.apify.actor}`;
    }
  } catch (e) {
    console.error('Health check failed', e);
  }
}

async function loadTrends() {
  const container = document.getElementById('trends-container');
  try {
    const res = await fetch(`${API_BASE}/api/trends`);
    const data = await res.json();
    const trends = data.trends || [];

    if (trends.length === 0) {
      container.innerHTML = '<div style="color: var(--text-secondary); padding: 20px;">Belum ada data tren terkumpul.</div>';
      return;
    }

    container.innerHTML = trends.map(t => {
      const sourceName = formatSourceName(t.source);
      const score = parseFloat(t.normalized_score || t.score || 0);
      const growth = parseFloat(t.growth_pct || t.growth || 0);
      const growthClass = growth >= 0 ? 'delta-positive' : 'delta-negative';
      const growthSign = growth >= 0 ? '+' : '';

      return `
        <div class="trend-item">
          <div class="trend-info">
            <span style="font-weight: 600;">${sourceName}</span>
            <span>
              <strong>${score} / 100</strong> 
              <span class="${growthClass}" style="margin-left: 8px; font-size: 12px;">(${growthSign}${growth}%)</span>
            </span>
          </div>
          <div class="trend-bar-bg">
            <div class="trend-bar-fill" style="width: ${score}%;"></div>
          </div>
        </div>
      `;
    }).join('');

    // Update top platform KPI
    if (trends.length > 0) {
      const sorted = [...trends].sort((a, b) => (b.normalized_score || b.score) - (a.normalized_score || a.score));
      document.getElementById('kpi-top-platform').innerText = formatSourceName(sorted[0].source);
      const g = sorted[0].growth_pct || sorted[0].growth || 0;
      document.getElementById('kpi-growth-rate').innerText = `${g >= 0 ? '+' : ''}${g}% Growth`;
    }
  } catch (e) {
    container.innerHTML = '<div style="color: var(--negative);">Gagal memuat tren.</div>';
  }
}

async function loadSentimentStats() {
  try {
    const res = await fetch(`${API_BASE}/api/sentiment/stats`);
    const data = await res.json();
    const stats = data.stats || { positive_pct: 0, neutral_pct: 0, negative_pct: 0, positive: 0, neutral: 0, negative: 0, total: 0 };

    document.getElementById('kpi-positive-pct').innerText = `${stats.positive_pct}%`;
    document.getElementById('kpi-neutral-pct').innerText = `${stats.neutral_pct}%`;
    document.getElementById('kpi-negative-pct').innerText = `${stats.negative_pct}%`;
    document.getElementById('kpi-total-mentions').innerText = stats.total.toLocaleString();

    document.getElementById('bar-pos').style.width = `${stats.positive_pct}%`;
    document.getElementById('bar-neu').style.width = `${stats.neutral_pct}%`;
    document.getElementById('bar-neg').style.width = `${stats.negative_pct}%`;

    document.getElementById('leg-pos-count').innerText = `${stats.positive} (${stats.positive_pct}%)`;
    document.getElementById('leg-neu-count').innerText = `${stats.neutral} (${stats.neutral_pct}%)`;
    document.getElementById('leg-neg-count').innerText = `${stats.negative} (${stats.negative_pct}%)`;
  } catch (e) {
    console.error('Failed to load sentiment stats', e);
  }
}

async function loadMentions() {
  const container = document.getElementById('mentions-list');
  const platform = document.getElementById('filter-platform').value;
  const sentiment = document.getElementById('filter-sentiment').value;
  const search = document.getElementById('filter-search').value;

  container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-secondary);"><span class="spinner"></span> Memuat mentions...</div>';

  const params = new URLSearchParams();
  if (platform !== 'all') params.append('platform', platform);
  if (sentiment !== 'all') params.append('sentiment', sentiment);
  if (search) params.append('search', search);

  try {
    const res = await fetch(`${API_BASE}/api/mentions?${params.toString()}`);
    const data = await res.json();
    const items = data.items || [];

    document.getElementById('mentions-counter').innerText = `Menampilkan ${items.length} dari ${data.total || items.length} mentions`;

    if (items.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--text-secondary);">Tidak ada mention yang cocok dengan filter.</div>';
      return;
    }

    container.innerHTML = items.map(m => {
      const sentClass = `sentiment-${m.sentiment_label || 'neutral'}`;
      const sentText = (m.sentiment_label || 'neutral').toUpperCase();
      const dateStr = m.published_at ? new Date(m.published_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Baru saja';

      return `
        <div class="mention-card">
          <div class="mention-top">
            <div class="mention-author">
              <span class="platform-tag">${m.platform}</span>
              <span>${m.author || 'Anonymous'}</span>
            </div>
            <div class="mention-sentiment ${sentClass}">${sentText} (${m.sentiment_score || '0.00'})</div>
          </div>
          ${m.title ? `<div class="mention-title">${escapeHtml(m.title)}</div>` : ''}
          <div class="mention-content">${escapeHtml(m.content)}</div>
          <div class="mention-footer">
            <div class="mention-stats">
              <span title="Views"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg> ${(m.engagement_views || 0).toLocaleString()}</span>
              <span title="Likes"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg> ${(m.engagement_likes || 0).toLocaleString()}</span>
              <span title="Comments"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> ${(m.engagement_comments || 0).toLocaleString()}</span>
              <span title="Shares"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg> ${(m.engagement_shares || 0).toLocaleString()}</span>
            </div>
            <div>
              <span style="margin-right: 12px;">${dateStr}</span>
              ${m.url ? `<a href="${m.url}" target="_blank" rel="noopener noreferrer" class="mention-link">Lihat Post &rarr;</a>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  } catch (e) {
    container.innerHTML = '<div style="color: var(--negative); padding: 20px;">Gagal mengambil data mentions.</div>';
  }
}

function handleSearch(e) {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    loadMentions();
  }, 400);
}

async function triggerScan() {
  const btn = document.getElementById('btn-scan');
  const icon = document.getElementById('scan-icon');
  const text = document.getElementById('scan-text');

  btn.disabled = true;
  icon.innerHTML = '<span class="spinner"></span>';
  text.innerText = 'Scanning...';

  try {
    const res = await fetch(`${API_BASE}/api/listening/trigger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brand: 'Raja Emas Indonesia' })
    });
    const result = await res.json();

    if (result.success) {
      await Promise.all([
        loadTrends(),
        loadSentimentStats(),
        loadMentions()
      ]);
    }
  } catch (e) {
    console.error('Trigger scan failed', e);
  } finally {
    btn.disabled = false;
    icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>';
    text.innerText = 'Scan Now';
  }
}

function formatSourceName(source) {
  const map = {
    'google_reviews': 'Google Reviews & Maps',
    'instagram': 'Instagram Posts & Comments',
    'tiktok': 'TikTok Mentions & Videos',
    'facebook': 'Facebook Posts & Comments',
    'youtube': 'YouTube Search Interest',
    'google_search': 'Google Search Volume',
    'google_news': 'Google News Coverage',
    'twitter_x': 'Twitter / X Trending',
    'reddit': 'Reddit Community Mentions',
    'news_sentiment': 'News Sentiment Index',
    'amazon': 'Marketplace Activity'
  };
  return map[source] || source.replace('_', ' ').toUpperCase();
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
