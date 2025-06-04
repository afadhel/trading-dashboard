import React from 'react';

interface TrendScoreDisplayProps {
  score: number;
  previousScore?: number;
  size?: 'small' | 'medium' | 'large';
  showDescription?: boolean;
  showChange?: boolean;
}

// Valid RHINO scores and their configurations
const SCORE_CONFIG = {
  '-8': {
    color: 'text-red-500',
    bgColor: 'bg-red-500',
    emoji: '🔴',
    description: 'EXTREME BEAR: All 8 timeframes bearish',
    strength: 'EXTREME'
  },
  '-7': {
    color: 'text-orange-500',
    bgColor: 'bg-orange-500',
    emoji: '🟠',
    description: 'STRONG BEAR: 7 bearish, 1 bullish',
    strength: 'STRONG'
  },
  '-6': {
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500',
    emoji: '🟡',
    description: 'BEARISH: 6 bearish, 2 bullish',
    strength: 'MODERATE'
  },
  '-5': {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400',
    emoji: '🟡',
    description: 'BEARISH or UPCOMING REVERSAL: 5 bearish, 3 bullish',
    strength: 'MODERATE'
  },
  '0': {
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    emoji: '⚪',
    description: 'NEUTRAL, REVERSAL, or PULLBACK: 4 bearish, 4 bullish',
    strength: 'NEUTRAL'
  },
  '5': {
    color: 'text-lime-400',
    bgColor: 'bg-lime-400',
    emoji: '🟢',
    description: 'BULLISH or UPCOMING REVERSAL: 3 bearish, 5 bullish',
    strength: 'MODERATE'
  },
  '6': {
    color: 'text-green-400',
    bgColor: 'bg-green-400',
    emoji: '🟢',
    description: 'BULLISH: 2 bearish, 6 bullish',
    strength: 'MODERATE'
  },
  '7': {
    color: 'text-green-500',
    bgColor: 'bg-green-500',
    emoji: '🟢',
    description: 'STRONG BULL: 1 bearish, 7 bullish',
    strength: 'STRONG'
  },
  '8': {
    color: 'text-green-600',
    bgColor: 'bg-green-600',
    emoji: '🟢',
    description: 'EXTREME BULL: All 8 timeframes bullish',
    strength: 'EXTREME'
  }
};

const TrendScoreDisplay: React.FC<TrendScoreDisplayProps> = ({
  score,
  previousScore,
  size = 'medium',
  showDescription = false,
  showChange = false
}) => {
  // Validate that score is a valid RHINO score
  const validScores = [-8, -7, -6, -5, 0, 5, 6, 7, 8];
  if (!validScores.includes(score)) {
    return (
      <div className="text-red-500 text-sm">
        Invalid score: {score}
      </div>
    );
  }

  const config = SCORE_CONFIG[score.toString() as keyof typeof SCORE_CONFIG];
  const hasChanged = previousScore !== undefined && previousScore !== score;
  const isUpward = hasChanged && score > (previousScore || 0);
  const isDownward = hasChanged && score < (previousScore || 0);

  // Size configurations
  const sizeClasses = {
    small: {
      score: 'text-lg font-bold',
      container: 'px-2 py-1',
      emoji: 'text-sm'
    },
    medium: {
      score: 'text-2xl font-bold',
      container: 'px-3 py-2',
      emoji: 'text-lg'
    },
    large: {
      score: 'text-4xl font-bold',
      container: 'px-4 py-3',
      emoji: 'text-2xl'
    }
  };

  const sizeClass = sizeClasses[size];

  return (
    <div className="space-y-2">
      {/* Main Score Display */}
      <div className={`inline-flex items-center space-x-2 rounded-lg ${sizeClass.container} bg-slate-800 border border-slate-700`}>
        <span className={sizeClass.emoji}>{config.emoji}</span>
        <span className={`${config.color} ${sizeClass.score}`}>
          {score > 0 ? '+' : ''}{score}
        </span>
        {showChange && hasChanged && (
          <span className={`text-sm ${isUpward ? 'text-green-400' : isDownward ? 'text-red-400' : 'text-gray-400'}`}>
            {isUpward ? '↗' : isDownward ? '↘' : '→'}
          </span>
        )}
      </div>

      {/* Score Change */}
      {showChange && hasChanged && (
        <div className="text-xs text-gray-400">
          {previousScore !== undefined && (
            <span>
              {previousScore > 0 ? '+' : ''}{previousScore} → {score > 0 ? '+' : ''}{score}
              <span className={`ml-1 ${isUpward ? 'text-green-400' : 'text-red-400'}`}>
                ({isUpward ? '+' : ''}{score - previousScore})
              </span>
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {showDescription && (
        <div className="text-sm text-gray-300 max-w-xs">
          {config.description}
        </div>
      )}

      {/* Strength Indicator */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-gray-500">Strength:</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          config.strength === 'EXTREME' ? 'bg-purple-900 text-purple-300' :
          config.strength === 'STRONG' ? 'bg-blue-900 text-blue-300' :
          config.strength === 'MODERATE' ? 'bg-yellow-900 text-yellow-300' :
          'bg-gray-900 text-gray-300'
        }`}>
          {config.strength}
        </span>
      </div>
    </div>
  );
};

export default TrendScoreDisplay; 