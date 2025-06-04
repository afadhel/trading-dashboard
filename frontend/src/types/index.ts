// Core trading data types
export interface TimeframeData {
  tf_key: string;
  period: string;
  status: 'UP' | 'DOWN' | 'INACTIVE';
  support_level?: number;
  resistance_level?: number;
  display_name?: string;
  category?: string;
}

export interface SignalAlignment {
  total_active: number;
  uptrend_count: number;
  downtrend_count: number;
  alignment_ratio?: string;
  score_description?: string;
}

export interface TradingSignal {
  id: string;
  symbol: string;
  signal_type: string;
  trend_score: number;
  previous_score?: number;
  price: number;
  trend_direction: 'UP' | 'DOWN' | 'NEUTRAL';
  pattern?: string;
  timeframes: TimeframeData[];
  alignment: SignalAlignment;
  created_at: string;
}

export interface CurrentState {
  symbol: string;
  display_name: string;
  current_score: number;
  current_price: number;
  trend_direction: 'UP' | 'DOWN' | 'NEUTRAL';
  total_active_timeframes: number;
  uptrend_count: number;
  downtrend_count: number;
  last_score_change: string;
  updated_at: string;
  score_description?: string;
  pattern?: string;
  timeframes: TimeframeData[];
}

export interface Symbol {
  symbol: string;
  display_name: string;
  exchange?: string;
  asset_type?: string;
  created_at: string;
}

export interface TimeframeConfig {
  tf_key: string;
  period: string;
  display_name: string;
  minutes: number;
}

export interface PerformanceMetric {
  symbol: string;
  total_signals: number;
  bullish_signals: number;
  bearish_signals: number;
  neutral_signals: number;
  avg_signal_strength: number;
  max_score: number;
  min_score: number;
  active_days: number;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'signal_update' | 'initial_data' | 'error';
  data?: any;
  message?: string;
  timestamp: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Chart data types
export interface ChartDataPoint {
  timestamp: string;
  score: number;
  price: number;
  symbol: string;
}

// Dashboard state types
export interface DashboardState {
  symbols: CurrentState[];
  selectedSymbol: string | null;
  timeframes: TimeframeConfig[];
  isConnected: boolean;
  lastUpdate: string | null;
  loading: boolean;
  error: string | null;
}

// Score color configuration
export interface ScoreConfig {
  score: number;
  color: string;
  bgColor: string;
  description: string;
  emoji: string;
}

// Trend analysis types
export interface TrendAnalysis {
  symbol: string;
  current_score: number;
  score_change: number;
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: number;
  timeframe_alignment: number;
}

// New interfaces for enhanced timeframe analysis
export interface TimeframeAnalysis {
  short_term: {
    count: number;
    bullish: number;
    bearish: number;
    inactive: number;
    net_score: number;
    timeframes: TimeframeData[];
  };
  long_term: {
    count: number;
    bullish: number;
    bearish: number;
    inactive: number;
    net_score: number;
    timeframes: TimeframeData[];
  };
  overall: {
    total_count: number;
    total_bullish: number;
    total_bearish: number;
    total_inactive: number;
    overall_net_score: number;
    alignment_percentage: number;
    dominant_trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  };
}

export interface EnhancedSymbolData extends CurrentState {
  exchange?: string;
  asset_type?: string;
  last_seen?: string;
  confidence?: number;
  timeframe_coverage?: 'DIVERSE' | 'SHORT_TERM_ONLY' | 'LONG_TERM_ONLY' | 'NO_DATA';
  minutes_since_update?: number;
  
  // Enhanced categorization fields
  short_term_count?: number;
  short_term_bullish?: number;
  short_term_bearish?: number;
  short_term_score?: number;
  
  long_term_count?: number;
  long_term_bullish?: number;
  long_term_bearish?: number;
  long_term_score?: number;
  
  avg_timeframe_alignment?: number;
  trend_strength?: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';
  confidence_score?: number;
} 