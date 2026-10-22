import React from 'react';

interface TornEdgeProps {
  color?: string;
  position?: 'top' | 'bottom';
  className?: string;
}

/**
 * High-fidelity jagged torn paper / deckled grunge edge divider.
 * Matches the hand-torn paper aesthetic between Eskort's distinct colored sections.
 */
export const TornEdge: React.FC<TornEdgeProps> = ({
  color = '#1A1A1A',
  position = 'top',
  className = '',
}) => {
  // Ragged, irregular torn paper silhouette path across 1440px width
  const pathData =
    'M0,0 ' +
    'L32,7 L65,2 L98,8 L130,3 L162,9 L195,2 L230,8 L265,3 L298,9 L332,1 L365,7 L398,3 L432,9 L465,4 L500,8 L535,2 L570,7 L602,3 L638,9 L672,2 L705,7 L740,3 L775,8 L810,2 L845,7 L880,3 L915,8 L950,2 L985,8 L1020,3 L1055,8 L1090,2 L1125,7 L1160,3 L1195,8 L1230,2 L1265,7 L1300,3 L1335,8 L1370,2 L1405,7 L1440,3 ' +
    'L1440,24 L0,24 Z';

  const isTop = position === 'top';

  return (
    <div
      className={`w-full overflow-hidden leading-none pointer-events-none select-none z-10 ${className}`}
      style={{
        transform: isTop ? 'rotate(180deg)' : 'none',
        height: '18px',
        marginBottom: isTop ? '-1px' : 0,
        marginTop: !isTop ? '-1px' : 0,
      }}
    >
      <svg
        viewBox="0 0 1440 24"
        preserveAspectRatio="none"
        className="w-full h-full block"
        style={{ fill: color }}
      >
        <path d={pathData} />
      </svg>
    </div>
  );
};
