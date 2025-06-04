-- Enhanced RHINO Trading Dashboard Database Schema
-- Supports dynamic symbol discovery, stale data cleanup, and timeframe categorization

-- Create extension for UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Symbols table - dynamically populated from webhooks
CREATE TABLE symbols (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) NOT NULL UNIQUE,
    display_name VARCHAR(50),
    exchange VARCHAR(20),
    asset_type VARCHAR(20) DEFAULT 'crypto',
    is_active BOOLEAN DEFAULT true,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Timeframe categories for analysis grouping
CREATE TABLE timeframe_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_name VARCHAR(20) NOT NULL UNIQUE,
    description TEXT,
    min_minutes INTEGER, -- minimum minutes for this category
    max_minutes INTEGER, -- maximum minutes for this category
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced timeframes table with categorization
CREATE TABLE timeframes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tf_key VARCHAR(10) NOT NULL, -- tf1, tf2, tf3, etc.
    period VARCHAR(10) NOT NULL, -- 60, 240, D, W, M, etc.
    display_name VARCHAR(20),
    minutes INTEGER, -- converted minutes for sorting
    category_id UUID REFERENCES timeframe_categories(id),
    is_short_term BOOLEAN GENERATED ALWAYS AS (minutes <= 120) STORED, -- 2 hours or less
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tf_key, period)
);

-- Signals table - enhanced with better indexing and valid score constraint
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol_id UUID NOT NULL REFERENCES symbols(id),
    signal_type VARCHAR(50) NOT NULL, -- SCORE_CHANGE, ALL_ALIGNED, etc.
    trend_score INTEGER NOT NULL CHECK (trend_score IN (-8, -7, -6, -5, 0, 5, 6, 7, 8)), -- Only valid RHINO scores
    previous_score INTEGER CHECK (previous_score IN (-8, -7, -6, -5, 0, 5, 6, 7, 8)),
    price DECIMAL(20, 8) NOT NULL,
    pattern VARCHAR(50), -- EXTREME_BULL, MAJORITY_BEARISH, etc.
    trend_direction VARCHAR(10), -- UP, DOWN, NEUTRAL
    total_active_timeframes INTEGER,
    uptrend_count INTEGER,
    downtrend_count INTEGER,
    alignment_ratio VARCHAR(10), -- 8/8, 7/8, etc.
    score_description TEXT,
    chart_timeframe VARCHAR(10),
    raw_data JSONB, -- store complete webhook payload
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Signal timeframes table - enhanced with category tracking
CREATE TABLE signal_timeframes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
    tf_key VARCHAR(10) NOT NULL, -- tf1, tf2, tf3, etc.
    period VARCHAR(10) NOT NULL, -- 60, 240, D, W, M, etc.
    status VARCHAR(10) NOT NULL, -- UP, DOWN, INACTIVE
    support_level DECIMAL(20, 8),
    resistance_level DECIMAL(20, 8),
    is_short_term BOOLEAN, -- derived from timeframes table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Current state table - enhanced with categorized summaries
CREATE TABLE current_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol_id UUID NOT NULL REFERENCES symbols(id) UNIQUE,
    latest_signal_id UUID REFERENCES signals(id),
    current_score INTEGER CHECK (current_score IN (-8, -7, -6, -5, 0, 5, 6, 7, 8)),
    current_price DECIMAL(20, 8),
    trend_direction VARCHAR(10),
    total_active_timeframes INTEGER,
    uptrend_count INTEGER,
    downtrend_count INTEGER,
    
    -- Short-term timeframes summary (≤2 hours)
    short_term_count INTEGER DEFAULT 0,
    short_term_bullish INTEGER DEFAULT 0,
    short_term_bearish INTEGER DEFAULT 0,
    short_term_score INTEGER DEFAULT 0,
    
    -- Long-term timeframes summary (>2 hours)
    long_term_count INTEGER DEFAULT 0,
    long_term_bullish INTEGER DEFAULT 0,
    long_term_bearish INTEGER DEFAULT 0,
    long_term_score INTEGER DEFAULT 0,
    
    -- Overall averages
    avg_timeframe_alignment DECIMAL(5,2), -- percentage alignment
    trend_strength VARCHAR(20), -- WEAK, MODERATE, STRONG, EXTREME
    confidence_score DECIMAL(5,2), -- 0-100 confidence based on alignment
    
    last_score_change TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance metrics table - enhanced with category analysis
CREATE TABLE signal_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol_id UUID NOT NULL REFERENCES symbols(id),
    signal_id UUID NOT NULL REFERENCES signals(id),
    entry_price DECIMAL(20, 8),
    entry_score INTEGER CHECK (entry_score IN (-8, -7, -6, -5, 0, 5, 6, 7, 8)),
    exit_price DECIMAL(20, 8),
    exit_score INTEGER CHECK (exit_score IN (-8, -7, -6, -5, 0, 5, 6, 7, 8)),
    duration_minutes INTEGER,
    pnl_percentage DECIMAL(10, 4),
    signal_type VARCHAR(50),
    short_term_accuracy DECIMAL(5,2), -- accuracy of short-term predictions
    long_term_accuracy DECIMAL(5,2), -- accuracy of long-term predictions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Symbol analytics for tracking activity
CREATE TABLE symbol_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol_id UUID NOT NULL REFERENCES symbols(id),
    date DATE NOT NULL,
    signal_count INTEGER DEFAULT 0,
    avg_score DECIMAL(5,2),
    score_volatility DECIMAL(5,2), -- standard deviation of scores
    price_change_percent DECIMAL(10,4),
    max_score INTEGER CHECK (max_score IN (-8, -7, -6, -5, 0, 5, 6, 7, 8)),
    min_score INTEGER CHECK (min_score IN (-8, -7, -6, -5, 0, 5, 6, 7, 8)),
    dominant_trend VARCHAR(10), -- UP, DOWN, NEUTRAL for the day
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol_id, date)
);

-- Indexes for performance
CREATE INDEX idx_signals_symbol_created ON signals(symbol_id, created_at DESC);
CREATE INDEX idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX idx_signals_trend_score ON signals(trend_score);
CREATE INDEX idx_signal_timeframes_signal_id ON signal_timeframes(signal_id);
CREATE INDEX idx_signal_timeframes_short_term ON signal_timeframes(is_short_term);
CREATE INDEX idx_current_states_symbol ON current_states(symbol_id);
CREATE INDEX idx_symbols_active ON symbols(is_active) WHERE is_active = true;
CREATE INDEX idx_symbols_last_seen ON symbols(last_seen DESC);
CREATE INDEX idx_timeframes_category ON timeframes(category_id);
CREATE INDEX idx_timeframes_short_term ON timeframes(is_short_term);

-- Insert timeframe categories
INSERT INTO timeframe_categories (category_name, description, min_minutes, max_minutes, sort_order) VALUES
    ('ultra_short', 'Ultra Short-term (≤15 minutes)', 1, 15, 1),
    ('short', 'Short-term (16 minutes - 2 hours)', 16, 120, 2),
    ('medium', 'Medium-term (2 hours - 1 day)', 121, 1440, 3),
    ('long', 'Long-term (1 day - 1 week)', 1441, 10080, 4),
    ('ultra_long', 'Ultra Long-term (>1 week)', 10081, 999999, 5);

-- Enhanced function to update current_states with categorization
CREATE OR REPLACE FUNCTION update_current_state_enhanced()
RETURNS TRIGGER AS $$
DECLARE
    short_count INTEGER := 0;
    short_bull INTEGER := 0;
    short_bear INTEGER := 0;
    long_count INTEGER := 0;
    long_bull INTEGER := 0;
    long_bear INTEGER := 0;
    alignment_pct DECIMAL(5,2);
    strength VARCHAR(20);
    confidence DECIMAL(5,2);
BEGIN
    -- Calculate short-term and long-term summaries
    SELECT 
        COUNT(*) FILTER (WHERE tf.is_short_term = true),
        COUNT(*) FILTER (WHERE tf.is_short_term = true AND stf.status = 'UP'),
        COUNT(*) FILTER (WHERE tf.is_short_term = true AND stf.status = 'DOWN'),
        COUNT(*) FILTER (WHERE tf.is_short_term = false),
        COUNT(*) FILTER (WHERE tf.is_short_term = false AND stf.status = 'UP'),
        COUNT(*) FILTER (WHERE tf.is_short_term = false AND stf.status = 'DOWN')
    INTO short_count, short_bull, short_bear, long_count, long_bull, long_bear
    FROM signal_timeframes stf
    LEFT JOIN timeframes tf ON stf.tf_key = tf.tf_key AND stf.period = tf.period
    WHERE stf.signal_id = NEW.id AND stf.status != 'INACTIVE';
    
    -- Calculate alignment percentage
    alignment_pct := CASE 
        WHEN NEW.total_active_timeframes > 0 
        THEN (GREATEST(NEW.uptrend_count, NEW.downtrend_count)::DECIMAL / NEW.total_active_timeframes) * 100
        ELSE 0 
    END;
    
    -- Determine trend strength based on valid RHINO scores
    strength := CASE 
        WHEN ABS(NEW.trend_score) = 8 THEN 'EXTREME'
        WHEN ABS(NEW.trend_score) = 7 THEN 'STRONG' 
        WHEN ABS(NEW.trend_score) IN (5, 6) THEN 'MODERATE'
        WHEN NEW.trend_score = 0 THEN 'NEUTRAL'
        ELSE 'WEAK'
    END;
    
    -- Calculate confidence score based on alignment and timeframe diversity
    confidence := CASE
        WHEN alignment_pct >= 90 AND short_count > 0 AND long_count > 0 THEN 95
        WHEN alignment_pct >= 80 AND short_count > 0 AND long_count > 0 THEN 85
        WHEN alignment_pct >= 70 THEN 75
        WHEN alignment_pct >= 60 THEN 65
        ELSE 50
    END;

    INSERT INTO current_states (
        symbol_id, latest_signal_id, current_score, current_price, trend_direction,
        total_active_timeframes, uptrend_count, downtrend_count,
        short_term_count, short_term_bullish, short_term_bearish, short_term_score,
        long_term_count, long_term_bullish, long_term_bearish, long_term_score,
        avg_timeframe_alignment, trend_strength, confidence_score,
        last_score_change, updated_at
    ) VALUES (
        NEW.symbol_id, NEW.id, NEW.trend_score, NEW.price, NEW.trend_direction,
        NEW.total_active_timeframes, NEW.uptrend_count, NEW.downtrend_count,
        short_count, short_bull, short_bear, (short_bull - short_bear),
        long_count, long_bull, long_bear, (long_bull - long_bear),
        alignment_pct, strength, confidence,
        NEW.created_at, CURRENT_TIMESTAMP
    )
    ON CONFLICT (symbol_id) 
    DO UPDATE SET
        latest_signal_id = NEW.id,
        current_score = NEW.trend_score,
        current_price = NEW.price,
        trend_direction = NEW.trend_direction,
        total_active_timeframes = NEW.total_active_timeframes,
        uptrend_count = NEW.uptrend_count,
        downtrend_count = NEW.downtrend_count,
        short_term_count = short_count,
        short_term_bullish = short_bull,
        short_term_bearish = short_bear,
        short_term_score = (short_bull - short_bear),
        long_term_count = long_count,
        long_term_bullish = long_bull,
        long_term_bearish = long_bear,
        long_term_score = (long_bull - long_bear),
        avg_timeframe_alignment = alignment_pct,
        trend_strength = strength,
        confidence_score = confidence,
        last_score_change = CASE 
            WHEN current_states.current_score != NEW.trend_score 
            THEN NEW.created_at 
            ELSE current_states.last_score_change 
        END,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update symbol last_seen timestamp
CREATE OR REPLACE FUNCTION update_symbol_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE symbols 
    SET last_seen = CURRENT_TIMESTAMP, 
        updated_at = CURRENT_TIMESTAMP,
        is_active = true
    WHERE id = NEW.symbol_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup stale symbols (30+ days inactive)
CREATE OR REPLACE FUNCTION cleanup_stale_symbols()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Mark symbols as inactive if no signals for 30 days
    UPDATE symbols 
    SET is_active = false, updated_at = CURRENT_TIMESTAMP
    WHERE last_seen < CURRENT_TIMESTAMP - INTERVAL '30 days' 
    AND is_active = true;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Optional: Delete very old data (signals older than 90 days)
    DELETE FROM signals 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '90 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS trigger_update_current_state ON signals;
CREATE TRIGGER trigger_update_current_state
    AFTER INSERT ON signals
    FOR EACH ROW
    EXECUTE FUNCTION update_current_state_enhanced();

CREATE TRIGGER trigger_update_symbol_last_seen
    AFTER INSERT ON signals
    FOR EACH ROW
    EXECUTE FUNCTION update_symbol_last_seen();

-- Views for easier querying
CREATE VIEW active_symbols_summary AS
SELECT 
    s.symbol,
    s.display_name,
    s.last_seen,
    cs.current_score,
    cs.current_price,
    cs.trend_direction,
    cs.trend_strength,
    cs.confidence_score,
    cs.short_term_score,
    cs.long_term_score,
    cs.avg_timeframe_alignment,
    CASE 
        WHEN cs.short_term_count > 0 AND cs.long_term_count > 0 THEN 'DIVERSE'
        WHEN cs.short_term_count > 0 THEN 'SHORT_TERM_ONLY'  
        WHEN cs.long_term_count > 0 THEN 'LONG_TERM_ONLY'
        ELSE 'NO_DATA'
    END as timeframe_coverage
FROM symbols s
JOIN current_states cs ON s.id = cs.symbol_id
WHERE s.is_active = true
ORDER BY s.last_seen DESC;

CREATE VIEW timeframe_category_summary AS
SELECT 
    tc.category_name,
    tc.description,
    COUNT(tf.id) as timeframe_count,
    ARRAY_AGG(tf.period ORDER BY tf.minutes) as periods
FROM timeframe_categories tc
LEFT JOIN timeframes tf ON tc.id = tf.category_id
GROUP BY tc.id, tc.category_name, tc.description, tc.sort_order
ORDER BY tc.sort_order; 