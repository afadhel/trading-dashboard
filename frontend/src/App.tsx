import React, { useState, useEffect } from 'react';
import TrendScoreDisplay from './components/TrendScoreDisplay.tsx';
import TimeframeCategorizedView from './components/TimeframeCategorizedView.tsx';
import { EnhancedSymbolData, TimeframeAnalysis } from './types';
import { ApiService } from './services/api.ts';

// Create API service instance
const apiService = new ApiService();

// Valid RHINO scores
const VALID_SCORES = [-8, -7, -6, -5, 0, 5, 6, 7, 8];

function App() {
  const [symbols, setSymbols] = useState<EnhancedSymbolData[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [timeframeAnalysis, setTimeframeAnalysis] = useState<TimeframeAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Load symbols on component mount
  useEffect(() => {
    loadSymbols();
    // Set up WebSocket connection
    try {
      apiService.connectWebSocket().then(() => {
        setIsConnected(true);
        // Set up message handlers
        apiService.onMessage('signal_update', (data) => {
          loadSymbols(); // Refresh symbols when new signal arrives
          if (selectedSymbol && selectedSymbol === data.symbol) {
            loadTimeframeAnalysis(selectedSymbol); // Refresh analysis for selected symbol
          }
        });
        
        apiService.onMessage('disconnect', () => {
          setIsConnected(false);
        });
      }).catch((error) => {
        console.error('WebSocket connection failed:', error);
        setIsConnected(false);
      });
    } catch (error) {
      console.error('WebSocket setup failed:', error);
    }

    return () => {
      apiService.disconnectWebSocket();
    };
  }, []);

  // Load timeframe analysis when symbol changes
  useEffect(() => {
    if (selectedSymbol) {
      loadTimeframeAnalysis(selectedSymbol);
    }
  }, [selectedSymbol]);

  const loadSymbols = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const states = await apiService.getCurrentStates();
      
      if (states && Array.isArray(states)) {
        // Filter symbols with valid scores only and convert to EnhancedSymbolData
        const validSymbols: EnhancedSymbolData[] = states
          .filter((symbol) => VALID_SCORES.includes(symbol.current_score))
          .map((symbol) => ({
            ...symbol,
            // Add enhanced fields with defaults if not present
            confidence_score: (symbol as any).confidence_score || 0,
            timeframe_coverage: (symbol as any).timeframe_coverage || 'NO_DATA'
          }));
        
        setSymbols(validSymbols);
        
        // Select first symbol if none selected
        if (!selectedSymbol && validSymbols.length > 0) {
          setSelectedSymbol(validSymbols[0].symbol);
        }
      } else {
        setError('Invalid response format');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const loadTimeframeAnalysis = async (symbol: string) => {
    try {
      setIsAnalysisLoading(true);
      // For now, create a mock timeframe analysis since the method doesn't exist
      // You can implement this in the API service later
      const mockAnalysis: TimeframeAnalysis = {
        short_term: {
          count: 0,
          bullish: 0,
          bearish: 0,
          inactive: 0,
          net_score: 0,
          timeframes: []
        },
        long_term: {
          count: 0,
          bullish: 0,
          bearish: 0,
          inactive: 0,
          net_score: 0,
          timeframes: []
        },
        overall: {
          total_count: 0,
          total_bullish: 0,
          total_bearish: 0,
          total_inactive: 0,
          overall_net_score: 0,
          alignment_percentage: 0,
          dominant_trend: 'NEUTRAL'
        }
      };
      setTimeframeAnalysis(mockAnalysis);
    } catch (err) {
      console.error('Failed to load timeframe analysis:', err);
      setTimeframeAnalysis(null);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const selectedSymbolData = symbols.find(s => s.symbol === selectedSymbol);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-white">Loading RHINO Trading Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadSymbols}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold">🦏 RHINO Trading Dashboard</h1>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-400">
            {symbols.length} Active Symbols
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Symbol Selector */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4">Active Symbols</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {symbols.map((symbol) => (
                  <button
                    key={symbol.symbol}
                    onClick={() => setSelectedSymbol(symbol.symbol)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedSymbol === symbol.symbol
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 hover:bg-slate-600 text-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{symbol.symbol}</div>
                        <div className="text-xs text-gray-400">{symbol.display_name}</div>
                      </div>
                      <div className="text-right">
                        <TrendScoreDisplay 
                          score={symbol.current_score} 
                          size="small" 
                        />
                        <div className="text-xs text-gray-400 mt-1">
                          {symbol.confidence_score ? `${symbol.confidence_score}% conf` : ''}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {selectedSymbolData && (
              <>
                {/* Selected Symbol Overview */}
                <div className="bg-slate-800 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedSymbolData.symbol}</h2>
                      <p className="text-gray-400">{selectedSymbolData.display_name}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${selectedSymbolData.current_price?.toFixed(8) || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-400">
                        Updated {new Date(selectedSymbolData.updated_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <TrendScoreDisplay 
                        score={selectedSymbolData.current_score}
                        size="large"
                        showDescription={true}
                      />
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-400">
                        {selectedSymbolData.uptrend_count}/{selectedSymbolData.total_active_timeframes}
                      </div>
                      <div className="text-sm text-gray-400">Bullish Timeframes</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedSymbolData.avg_timeframe_alignment?.toFixed(1)}% Alignment
                      </div>
                    </div>

                    <div className="text-center">
                      <div className={`text-3xl font-bold ${
                        selectedSymbolData.trend_direction === 'UP' ? 'text-green-400' :
                        selectedSymbolData.trend_direction === 'DOWN' ? 'text-red-400' :
                        'text-gray-400'
                      }`}>
                        {selectedSymbolData.trend_direction === 'UP' ? '↗️' :
                         selectedSymbolData.trend_direction === 'DOWN' ? '↘️' : '↔️'}
                      </div>
                      <div className="text-sm text-gray-400">
                        {selectedSymbolData.trend_direction === 'UP' ? 'Bullish' :
                         selectedSymbolData.trend_direction === 'DOWN' ? 'Bearish' : 'Neutral'}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {selectedSymbolData.trend_strength}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeframe Analysis */}
                <TimeframeCategorizedView
                  symbol={selectedSymbolData.symbol}
                  timeframeAnalysis={timeframeAnalysis}
                  isLoading={isAnalysisLoading}
                />
              </>
            )}

            {/* No Symbol Selected */}
            {!selectedSymbolData && symbols.length > 0 && (
              <div className="bg-slate-800 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">🦏</div>
                <h3 className="text-xl font-semibold mb-2">Select a Symbol</h3>
                <p className="text-gray-400">Choose a symbol from the left panel to view detailed analysis</p>
              </div>
            )}

            {/* No Symbols Available */}
            {symbols.length === 0 && (
              <div className="bg-slate-800 rounded-lg p-12 text-center">
                <div className="text-6xl mb-4">📊</div>
                <h3 className="text-xl font-semibold mb-2">No Active Symbols</h3>
                <p className="text-gray-400 mb-4">
                  No symbols with valid RHINO scores found. Make sure your Pine Script is sending webhooks.
                </p>
                <button
                  onClick={loadSymbols}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 