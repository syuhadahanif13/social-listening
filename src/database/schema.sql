-- Database Schema for Social Listening
-- Database: rei_listening

CREATE TABLE IF NOT EXISTS brands (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  keywords TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS social_mentions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT DEFAULT 1,
  platform VARCHAR(50) NOT NULL,
  post_id VARCHAR(255) NOT NULL,
  author VARCHAR(255),
  title TEXT,
  content TEXT NOT NULL,
  url VARCHAR(1000),
  sentiment_label ENUM('positive', 'neutral', 'negative') DEFAULT 'neutral',
  sentiment_score DECIMAL(5, 4) DEFAULT 0.0000,
  engagement_likes INT DEFAULT 0,
  engagement_comments INT DEFAULT 0,
  engagement_shares INT DEFAULT 0,
  engagement_views INT DEFAULT 0,
  published_at DATETIME NULL,
  raw_data JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_brand_id (brand_id),
  INDEX idx_platform (platform),
  INDEX idx_sentiment (sentiment_label),
  INDEX idx_published (published_at),
  UNIQUE KEY uniq_platform_post (platform, post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS trend_metrics (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  brand_id INT DEFAULT 1,
  keyword VARCHAR(255) NOT NULL,
  source VARCHAR(100) NOT NULL,
  normalized_score DECIMAL(6, 2) DEFAULT 0.00,
  growth_pct DECIMAL(6, 2) DEFAULT 0.00,
  period VARCHAR(50) DEFAULT '7D',
  snapshot_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_brand (brand_id),
  INDEX idx_source_keyword (source, keyword, snapshot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS listening_jobs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  job_type VARCHAR(50) DEFAULT 'scheduled',
  status ENUM('pending', 'running', 'completed', 'failed') DEFAULT 'pending',
  mentions_collected INT DEFAULT 0,
  trends_collected INT DEFAULT 0,
  error_message TEXT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default brand if not exists
INSERT IGNORE INTO brands (id, name, keywords) 
VALUES (1, 'Raja Emas Indonesia', 'Raja Emas Indonesia, raja emas, rajaemas, jual beli emas raja emas, toko mas raja emas indonesia');
