import React from 'react';
import { TimeframeData } from '../types';

interface TimeframeMatrixProps {
  timeframes: TimeframeData[];
  className?: string;
}

const TimeframeMatrix: React.FC<TimeframeMatrixProps> = ({ 
  timeframes, 
  className = '' 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'UP':
        return 'bg-green-500 text-white';
      case 'DOWN':
        return 'bg-red-500 text-white';
      case 'INACTIVE':
        return 'bg-gray-600 text-gray-300';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'UP':
        return '▲';
      case 'DOWN':
        return '▼';
      case 'INACTIVE':
        return '—';
      default:
        return '?';
    }
  };

  // Sort timeframes by period (assuming they have a natural order)
  const sortedTimeframes = [...timeframes].sort((a, b) => {
    const periodOrder: { [key: string]: number } = {
      '1': 1, '3': 3, '5': 5, '15': 15, '30': 30, '60': 60,
      '240': 240, '480': 480, 'D': 1440, 'W': 10080, 'M': 43200,
      '3M': 129600, '6M': 259200, '12M': 518400
    };
    return (periodOrder[a.period] || 0) - (periodOrder[b.period] || 0);
  });

  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Timeframe Analysis</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        {sortedTimeframes.map((tf) => (
          <div
            key={`${tf.tf_key}-${tf.period}`}
            className={`
              ${getStatusColor(tf.status)}
              rounded-lg p-3 text-center transition-all duration-300
              hover:scale-105 cursor-default
            `}
            title={`${tf.period} - ${tf.status}`}
          >
            <div className="text-lg font-bold">
              {getStatusIcon(tf.status)}
            </div>
            <div className="text-xs font-medium mt-1">
              {tf.period}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-center space-x-6 text-xs">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-green-500 rounded"></div>
            <span className="text-gray-300">Bullish ▲</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-red-500 rounded"></div>
            <span className="text-gray-300">Bearish ▼</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-gray-600 rounded"></div>
            <span className="text-gray-300">Inactive —</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex justify-between text-sm">
          <div className="text-green-400">
            Bullish: {timeframes.filter(tf => tf.status === 'UP').length}
          </div>
          <div className="text-red-400">
            Bearish: {timeframes.filter(tf => tf.status === 'DOWN').length}
          </div>
          <div className="text-gray-400">
            Inactive: {timeframes.filter(tf => tf.status === 'INACTIVE').length}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimeframeMatrix; 