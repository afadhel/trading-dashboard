import React from 'react';
import { TimeframeData } from '../types';

interface TimeframeCategorizedViewProps {
    symbol: string;
    timeframeAnalysis: {
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
    } | null;
    isLoading?: boolean;
}

const TimeframeCategorizedView: React.FC<TimeframeCategorizedViewProps> = ({
    symbol,
    timeframeAnalysis,
    isLoading
}) => {
    if (isLoading) {
        return (
            <div className="bg-slate-800 rounded-lg p-6">
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
            </div>
        );
    }

    if (!timeframeAnalysis) {
        return (
            <div className="bg-slate-800 rounded-lg p-6">
                <div className="text-center text-gray-400 py-8">
                    <p>No timeframe analysis available for {symbol}</p>
                    <p className="text-sm mt-2">Select a symbol with recent signals to view analysis</p>
                </div>
            </div>
        );
    }

    const { short_term, long_term, overall } = timeframeAnalysis;

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'BULLISH': return 'text-green-400';
            case 'BEARISH': return 'text-red-400';
            default: return 'text-yellow-400';
        }
    };

    const getScoreColor = (score: number) => {
        if (score > 0) return 'text-green-400';
        if (score < 0) return 'text-red-400';
        return 'text-gray-400';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'UP': return 'bg-green-500';
            case 'DOWN': return 'bg-red-500';
            case 'INACTIVE': return 'bg-gray-500';
            default: return 'bg-gray-500';
        }
    };

    const renderTimeframeGroup = (
        title: string,
        data: { count: number; bullish: number; bearish: number; inactive: number; net_score: number; timeframes: TimeframeData[] },
        bgColor: string
    ) => (
        <div className={`${bgColor} rounded-lg p-4`}>
            <h3 className="text-lg font-semibold text-white mb-3">{title}</h3>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                    <div className="text-2xl font-bold text-white">{data.count}</div>
                    <div className="text-sm text-gray-300">Total TFs</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{data.bullish}</div>
                    <div className="text-sm text-gray-300">Bullish</div>
                </div>
                <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{data.bearish}</div>
                    <div className="text-sm text-gray-300">Bearish</div>
                </div>
                <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(data.net_score)}`}>
                        {data.net_score > 0 ? '+' : ''}{data.net_score}
                    </div>
                    <div className="text-sm text-gray-300">Net Score</div>
                </div>
            </div>

            {/* Progress Bar */}
            {data.count > 0 && (
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-1">
                        <span>Bullish vs Bearish</span>
                        <span>{Math.round((data.bullish / (data.bullish + data.bearish || 1)) * 100)}% Bull</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                        <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ 
                                width: `${(data.bullish / (data.bullish + data.bearish || 1)) * 100}%` 
                            }}
                        ></div>
                    </div>
                </div>
            )}

            {/* Individual Timeframes */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {data.timeframes.map((tf, index) => (
                    <div key={index} className="bg-slate-900 rounded p-2 text-sm">
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-white">{tf.period}</span>
                            <div className={`w-3 h-3 rounded-full ${getStatusColor(tf.status)}`}></div>
                        </div>
                        <div className="text-xs text-gray-400">{tf.category}</div>
                        <div className={`text-xs font-medium ${
                            tf.status === 'UP' ? 'text-green-400' : 
                            tf.status === 'DOWN' ? 'text-red-400' : 'text-gray-400'
                        }`}>
                            {tf.status}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Overall Summary */}
            <div className="bg-slate-700 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Overall Analysis - {symbol}</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                        <div className="text-3xl font-bold text-white">{overall.total_count}</div>
                        <div className="text-sm text-gray-300">Total Timeframes</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-3xl font-bold ${getScoreColor(overall.overall_net_score)}`}>
                            {overall.overall_net_score > 0 ? '+' : ''}{overall.overall_net_score}
                        </div>
                        <div className="text-sm text-gray-300">Net Score</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400">{overall.alignment_percentage}%</div>
                        <div className="text-sm text-gray-300">Alignment</div>
                    </div>
                    <div className="text-center">
                        <div className={`text-2xl font-bold ${getTrendColor(overall.dominant_trend)}`}>
                            {overall.dominant_trend}
                        </div>
                        <div className="text-sm text-gray-300">Trend</div>
                    </div>
                </div>

                {/* Overall Alignment Bar */}
                <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-300 mb-2">
                        <span>Timeframe Alignment</span>
                        <span>{overall.total_bullish} Bull | {overall.total_bearish} Bear | {overall.total_inactive} Inactive</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-3">
                        <div className="h-3 rounded-full flex">
                            <div 
                                className="bg-green-500 h-3 rounded-l-full"
                                style={{ 
                                    width: `${(overall.total_bullish / overall.total_count) * 100}%` 
                                }}
                            ></div>
                            <div 
                                className="bg-red-500 h-3"
                                style={{ 
                                    width: `${(overall.total_bearish / overall.total_count) * 100}%` 
                                }}
                            ></div>
                            <div 
                                className="bg-gray-500 h-3 rounded-r-full"
                                style={{ 
                                    width: `${(overall.total_inactive / overall.total_count) * 100}%` 
                                }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Confidence Indicator */}
                <div className="text-center">
                    <div className="text-sm text-gray-300 mb-1">Confidence Level</div>
                    <div className="inline-flex items-center space-x-2">
                        {overall.alignment_percentage >= 80 && (
                            <span className="text-green-400 text-lg">🟢 High</span>
                        )}
                        {overall.alignment_percentage >= 60 && overall.alignment_percentage < 80 && (
                            <span className="text-yellow-400 text-lg">🟡 Medium</span>
                        )}
                        {overall.alignment_percentage < 60 && (
                            <span className="text-red-400 text-lg">🔴 Low</span>
                        )}
                        <span className="text-gray-400">({overall.alignment_percentage}% aligned)</span>
                    </div>
                </div>
            </div>

            {/* Short-term Analysis */}
            {renderTimeframeGroup('Short-term Analysis (≤2 hours)', short_term, 'bg-slate-800')}

            {/* Long-term Analysis */}
            {renderTimeframeGroup('Long-term Analysis (>2 hours)', long_term, 'bg-slate-800')}

            {/* Detailed Breakdown Toggle */}
            <div className="bg-slate-800 rounded-lg p-4">
                <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-white font-medium">
                        <span>📊 Detailed Analysis</span>
                        <span className="transition group-open:rotate-180">▼</span>
                    </summary>
                    <div className="mt-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <h4 className="text-white font-medium mb-2">Short-term Sentiment</h4>
                                <div className="text-sm text-gray-300">
                                    <p>• {short_term.count} timeframes tracked</p>
                                    <p>• {short_term.bullish > short_term.bearish ? 'Bullish' : short_term.bearish > short_term.bullish ? 'Bearish' : 'Neutral'} bias</p>
                                    <p>• {Math.round((short_term.bullish / (short_term.count || 1)) * 100)}% bullish alignment</p>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-white font-medium mb-2">Long-term Sentiment</h4>
                                <div className="text-sm text-gray-300">
                                    <p>• {long_term.count} timeframes tracked</p>
                                    <p>• {long_term.bullish > long_term.bearish ? 'Bullish' : long_term.bearish > long_term.bullish ? 'Bearish' : 'Neutral'} bias</p>
                                    <p>• {Math.round((long_term.bullish / (long_term.count || 1)) * 100)}% bullish alignment</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    );
};

export default TimeframeCategorizedView; 